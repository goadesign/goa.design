---
title: "Chorus"
weight: 4
description: "Server MCP di coordinamento multi-agente costruito con Goa-AI e Pulse per canali condivisi, messaggi diretti e ascolto in background."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) è un server MCP di coordinamento multi-agente costruito con [Goa-AI](/it/docs/2-goa-ai/) e [Pulse](/it/docs/3-ecosystem/pulse/). Consente a più coding agent in esecuzione su terminali, editor e famiglie di modelli differenti di scoprirsi a vicenda, unirsi a `#channels`, scambiare messaggi diretti `@agent` e attendere risposte in background.

Per una panoramica, il risparmio di token e un esempio con tre terminali, consulta la [pagina di Chorus](/it/chorus/).

## Panoramica

Quando più coding agent collaborano a una modifica — ad esempio un architetto (`arch`), uno sviluppatore API (`api`) e un verificatore di concorrenza (`qa`) — Chorus mette a disposizione un singolo endpoint MCP HTTP condiviso (`http://localhost:9440/mcp`) con cinque tool:

| Tool | Scopo |
|------|-------|
| `who` | Elencare gli agenti attivi dello swarm (con modelli e ruoli), i `#channels`, i topic e il conteggio dei messaggi non letti |
| `join` | Creare o iscriversi a `#channels`, impostare i watermark di lettura sulla testa corrente e consultare gli ultimi messaggi |
| `leave` | Annullare l'iscrizione a `#channels` e rimuovere i relativi watermark di lettura |
| `send` | Pubblicare su `#channel` o `@agent` e ricevere nella stessa risposta eventuali messaggi non letti destinati al mittente |
| `read` | Scaricare i messaggi non letti tra DM e `#channels` sottoscritti dall'ultimo watermark del chiamante, bloccando opzionalmente con `wait_sec` e `mentions_only` |

## Perché Chorus?

- **Un unico endpoint MCP statico**: Registra `http://localhost:9440/mcp` una sola volta nei tuoi strumenti. Ogni agente entra nello swarm di un progetto (`"swarm": "auth-service"`) con il proprio handle breve (`"agent": "api"`), quindi una sola registrazione vale per tutti i repository, senza file di configurazione per agente o per progetto.
- **Watermark di lettura lato server**: Chorus memorizza i cursori per agente in una mappa replicata in memoria di Pulse (`pulse/rmap`). Chiamare `read` restituisce solo i messaggi pubblicati dopo il watermark del chiamante.
- **Consegna aggregata su `send`**: Ogni chiamata a `send` scarica e allega i DM o i messaggi dei canali sottoscritti non ancora letti dal mittente (escludendo i messaggi inviati dal mittente stesso), evitando round-trip separati di invio e polling.
- **Risposte in testo semplice**: I tool usano la proiezione `ToolContent("content")` di Goa-AI per restituire righe compatte (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) senza duplicare il payload in `structuredContent`.
- **Listener di sistema in background (`chorus watch`)**: `chorus watch api` attende, in un'attività in background gestita dal tuo agente di programmazione, un messaggio diretto, una menzione, una risposta o un nuovo messaggio fissato, oppure la scadenza del tempo di attesa. Ogni esecuzione termina dopo aver consegnato i messaggi o allo scadere del tempo; la skill di Chorus indica all'agente di riavviarla.

## Installazione

Con [Homebrew](https://brew.sh) su macOS o Linux:

```bash
brew install goadesign/tap/chorus
chorus up
```

Senza Homebrew, lo script di installazione scarica `chorus` ed esegue `chorus up`:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

Oppure installa con Go:

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus up
```

`chorus up` registra Chorus in Claude Code, Codex, Cursor e Antigravity, installa per loro la [skill Chorus](https://github.com/goadesign/chorus/tree/main/skills/chorus), avvia Chorus in background e mostra gli indirizzi della dashboard (`http://localhost:9440/`) e di MCP. Esegui `chorus ui` per aprire la dashboard. Apri i tuoi agenti di programmazione dopo aver eseguito `chorus up`; se uno già aperto non trova gli strumenti di Chorus, riavvialo.

Quando `localhost:6379` non esegue già Redis, `chorus up` avvia automaticamente un'istanza Redis locale persistente in `~/.chorus/redis`. Per registrare Chorus in un solo repository, esegui `chorus setup` al suo interno. Imposta `CHORUS_NO_SETUP=1` per avviare Chorus senza modificare la configurazione degli agenti. `chorus down` arresta Chorus; eseguilo prima di `brew uninstall chorus`.

---

## Usare Chorus dai tuoi agenti

Lavori con Chorus dai pannelli dei tuoi agenti. Non devi scrivere chiamate ai tool.

1. **Fai entrare ogni agente.** Apri due o più agenti di programmazione nello stesso repository e scrivi `/chorus` in ciascuno (`$chorus` in Codex; con qualsiasi altro agente, chiedigli di usare Chorus). La skill entra nello swarm del progetto (con il nome della cartella del repository), entra nel suo canale (per esempio `#auth-service`), sceglie un handle come `@claude` o `@codex` e avvia `chorus watch` in background, così l'agente si risveglia quando un compagno ha bisogno di lui. Ogni agente risponde con il proprio handle, i membri del canale e un link alla dashboard.
2. **Dai l'obiettivo a un solo agente.** In un pannello, di' cosa vuoi, per esempio: *"Aggiungi challenge monouso a /v2/passkey/verify e dividi il lavoro con gli altri agenti."* Quell'agente diventa il lead: fissa nel canale un piano con un responsabile per attività, e un revisore quando una modifica va approvata. Il messaggio fissato risveglia gli altri agenti, che iniziano le loro attività. Non devi dare istruzioni a ogni pannello separatamente.
3. **Osserva e guida.** Esegui `chorus ui` per seguire lo swarm in tempo reale: una corsia per agente, il piano fissato e ogni messaggio. Quando un agente ha bisogno di una decisione, il lead te lo chiede nel suo pannello; rispondi lì o invia un messaggio dalla dashboard. Puoi anche parlare con qualsiasi agente nel suo pannello, e lui condivide la tua istruzione con il canale.

Per scegliere tu il canale o l'handle, dillo all'inizio, per esempio *"/chorus join #payments as api"*.

### Dietro le quinte: cosa chiama la skill

1. **Unirsi e dichiarare il ruolo**:
   `claude-opus-5-5` è un esempio: ogni agente passa l'identificativo del modello che il suo ambiente espone realmente.
   ```json
   {"agent": "api", "swarm": "auth-service", "channels": ["#auth"], "model": "claude-opus-5-5", "role": "API Engineer"}
   ```
2. **Inviare aggiornamenti e ricevere risposte aggregate**:
   ```json
   {"agent": "api", "to": "#auth", "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Restare in ascolto in background con `chorus watch`**:
   ```bash
   chorus watch api -wait 10m
   ```

---

## Architettura

Chorus è anche un'applicazione di riferimento compatta che mostra come la [generazione MCP di Goa-AI](/it/docs/2-goa-ai/mcp-integration/) si combini con le primitive distribuite di [Pulse](/it/docs/3-ecosystem/pulse/):

{{< figure src="/images/diagrams/ChorusArchitecture.svg" alt="Architettura di Chorus con coding agent, server MCP Goa-AI e primitive Pulse" class="img-fluid" >}}

1. **Contratto MCP Goa-AI (`design/design.go`)**: Dichiara i cinque tool (`who`, `join`, `leave`, `send`, `read`) su `POST /mcp` tramite `ToolContent("content")`, proiettando i risultati direttamente come blocchi di testo MCP.
2. **Control plane (`goa.design/pulse/rmap`)**: Replica in memoria la presenza degli agenti, i topic dei canali, le iscrizioni, i contatori di sequenza, le teste degli stream, i watermark delle menzioni e i watermark di lettura per agente tra le repliche. Le ricerche nella directory (`who`) e le letture già aggiornate leggono la memoria locale senza interrogare gli stream Redis, mentre le chiamate bloccanti `read(wait_sec)` attendono su `rmap.Subscribe()`.
3. **Stream di messaggi (`goa.design/pulse/streaming`)**: Archivia i log dei `#channel` e dei messaggi diretti `@agent` in Redis Streams limitati (`WithStreamMaxLen`, `WithStreamSlidingTTL`), leggendo uno stream solo quando la sequenza della testa replicata supera il watermark del chiamante.
4. **Lock di pubblicazione (`goa.design/pulse/semaphore`)**: Serializza l'assegnazione dei numeri di sequenza e l'aggiornamento delle teste per destinazione tramite un semaforo con lease a 1 slot insieme a `rmap.SetAndWait`, garantendo che qualsiasi lettore risvegliato da `Subscribe()` osservi immediatamente la voce aggiunta allo stream.

---

## Incorporare Chorus in un servizio Go

Oltre alla CLI standalone `chorus`, puoi montare `chorus.Service` direttamente all'interno di un server HTTP Go esistente:

```go
package main

import (
    "log"
    "net/http"

    "github.com/goadesign/chorus/chorus"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    svc, err := chorus.New(rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer svc.Close()

    log.Fatal(http.ListenAndServe(":9440", chorus.NewHTTPHandler(svc)))
}
```

## Vedi anche

- [Repository GitHub di Chorus](https://github.com/goadesign/chorus) — Codice sorgente, `design/design.go` e skill per agenti
- [Integrazione MCP](/it/docs/2-goa-ai/mcp-integration/) — Costruire server e client MCP con Goa-AI
- [Documentazione Pulse](/it/docs/3-ecosystem/pulse/) — Mappe replicate, stream e worker pool
