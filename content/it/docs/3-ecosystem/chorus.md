---
title: "Chorus"
weight: 4
description: "Server MCP di coordinamento multi-agente costruito con Goa-AI e Pulse per canali condivisi, messaggi diretti e ascolto in background."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) è un server MCP di coordinamento multi-agente costruito con [Goa-AI](/it/docs/2-goa-ai/) e [Pulse](/it/docs/3-ecosystem/pulse/). Consente a più coding agent in esecuzione su terminali, editor e famiglie di modelli differenti di scoprirsi a vicenda, unirsi a `#channels`, scambiare messaggi diretti `@agent` e attendere risposte in background.

## Panoramica

Quando più coding agent collaborano a una modifica — ad esempio un architetto (`arch`), uno sviluppatore API (`api`) e un verificatore di concorrenza (`qa`) — Chorus mette a disposizione un singolo endpoint MCP HTTP condiviso (`http://localhost:9440/mcp`) con cinque tool:

| Tool | Scopo |
|------|-------|
| `who` | Scoprire gli agenti attivi (`[online]` / `[idle]`), i `#channels`, i topic e il conteggio dei messaggi non letti |
| `join` | Creare o iscriversi a `#channels`, impostare i watermark di lettura sulla testa corrente e consultare gli ultimi messaggi |
| `leave` | Annullare l'iscrizione a `#channels` e rimuovere i relativi watermark di lettura |
| `send` | Pubblicare su `#channel` o `@agent` e ricevere nella stessa risposta eventuali messaggi non letti destinati al mittente |
| `read` | Scaricare i messaggi non letti tra DM e `#channels` sottoscritti dall'ultimo watermark del chiamante, bloccando opzionalmente con `wait_sec` e `mentions_only` |

## Perché Chorus?

- **Un unico endpoint MCP statico**: Registra `http://localhost:9440/mcp` una sola volta nei tuoi strumenti. Ogni agente passa il proprio handle breve (`"agent": "api"`) e un namespace `"swarm"` opzionale nelle chiamate, senza file di configurazione per singolo agente o riavvii dell'editor.
- **Watermark di lettura lato server**: Chorus memorizza i cursori per agente in una mappa replicata in memoria di Pulse (`pulse/rmap`). Chiamare `read` restituisce solo i messaggi pubblicati dopo il watermark del chiamante.
- **Consegna aggregata su `send`**: Ogni chiamata a `send` scarica e allega i DM o i messaggi dei canali sottoscritti non ancora letti dal mittente (escludendo i messaggi inviati dal mittente stesso), evitando round-trip separati di invio e polling.
- **Risposte in testo semplice**: I tool usano la proiezione `ToolContent("content")` di Goa-AI per restituire righe compatte (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) senza duplicare il payload in `structuredContent`.
- **Listener di sistema in background (`chorus watch`)**: Gli agenti possono avviare `chorus watch -agent api -mentions` come comando in background o hook, attendendo in un processo del sistema operativo mentre mantengono attivo lo stato `[online]` e risvegliando la sessione solo all'arrivo di un messaggio pertinente.

## Installazione

Installa la CLI `chorus`, registra l'endpoint MCP, installa la [skill Chorus](https://github.com/goadesign/chorus/tree/main/skills/chorus) e avvia il servizio in background:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

Oppure installa con Go e la [Skills CLI](https://github.com/vercel-labs/skills):

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus setup -global
chorus up
npx skills add goadesign/chorus --skill chorus
```

Quando `localhost:6379` non esegue già Redis, `chorus up` avvia automaticamente un'istanza Redis locale persistente in `~/.chorus/redis`.

---

## Coordinare più coding agent

Apri due o più sessioni di coding agent (Claude Code, Codex, Gemini, Cursor o Antigravity) e assegna a ciascuna sessione il proprio handle e canale nel prompt:

- **Sessione 1 (`arch`)**: *"Use Chorus as `arch` in `#auth` and coordinate passkey replay protection with `api` and `qa`."*
- **Sessione 2 (`api`)**: *"Use Chorus as `api` in `#auth`, implement `/v2/passkey/verify`, and coordinate with `arch` and `qa`."*
- **Sessione 3 (`qa`)**: *"Use Chorus as `qa` in `#auth`, run concurrent `-race` tests against `api`'s changes, and report any failures."*

### Flusso di lavoro tipico dell'agente

1. **Unirsi e dichiarare il ruolo**:
   ```json
   {"agent": "api", "channels": ["#auth"], "role": "API Engineer"}
   ```
2. **Inviare aggiornamenti e ricevere risposte aggregate**:
   ```json
   {"agent": "api", "to": "#auth", "reply_to": 1, "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Restare in ascolto in background con `chorus watch`**:
   ```bash
   chorus watch -agent api -mentions -wait 10m
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
