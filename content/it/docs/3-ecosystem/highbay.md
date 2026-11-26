---
title: "Highbay"
weight: 5
description: "Control plane multi-agente guidato dai contratti per Goa e Goa-AI che separa intento, scrittura dei test, implementazione e verifica."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) è un control plane locale per sviluppare, verificare ed evolvere servizi [Goa](/it/docs/1-goa/) e [Goa-AI](/it/docs/2-goa-ai/) con agenti di programmazione. Organizza gli agenti che usi già in ruoli separati attorno a un unico contratto compilato, esegue una verifica indipendente prima dell'approvazione e unisce i commit approvati nel tuo branch locale dal browser.

Per seguire visivamente una modifica attraverso i vari ruoli, visita la [pagina Highbay](/it/highbay/).

## Panoramica {#workflow}

Quando un singolo coding agent scrive sia l'applicazione sia i test che la valutano, i punti ciechi vengono condivisi e il codice manuale di trasporto o validazione diverge nel tempo. Highbay unisce la separazione dei ruoli alla generazione deterministica di Goa e Goa-AI:

| Partecipante | Connessione | Responsabilità |
|--------------|-------------|----------------|
| **Tu** | Pagina nel browser | Confermare la Change Card, ispezionare l'architettura, avviare le build, approvare le verifiche superate e fare merge nel branch locale |
| **Guide** | MCP `highbay` (ruolo `guide`) | La sessione attiva del tuo agente; inizializza cartelle vuote, scrive flussi `Story` e design Goa, e propone o rivede Change Card |
| **Test Writer** | MCP `highbay` (copia `.highbay-tests`) | Scrive un test di scenario per ogni flusso `Story` completato in `eval/` senza toccare il codice applicativo |
| **Builder** | MCP `highbay` (copia `.highbay-build`) | Esegue `generate_code` per scrivere `design/` e `gen/`, implementa la logica di dominio, verifica in un container Linux e richiede la verifica |
| **Server Highbay** | Processo locale per progetto | Applica i permessi per ruolo, controlla e accetta le suite `eval/`, compila i binari candidati e registra le approvazioni |

## Cinque checkpoint (`CP1`–`CP5`) {#checkpoints}

Ogni anteprima, suite di test accettata, live target, esecuzione di verifica e approvazione è vincolata a un digest esatto `request_revision` della Change Card:

1. **`CP1` — Confermare una Change Card**: L'agente valuta una `Story` (`github.com/goadesign/highbay/story/dsl`) nella propria bozza isolata e propone una Change Card in linguaggio chiaro (riepilogo, domande di prodotto aperte, esempi concreti di accettazione e comportamenti preservati). Rispondi e confermi nel browser.
2. **`CP2` — Anteprima dell'architettura**: Ispeziona il diagramma C4 derivato dal design Goa e [Model](/it/docs/3-ecosystem/model/) in **Architecture** prima di avviare i worker.
3. **`CP3` — Provare i prompt dal vivo (opzionale)**: Se il servizio include un agente Goa-AI e configuri una chiave provider o un model gateway, il builder può avviare una copia live del commit candidato e provare override dei prompt prima del commit.
4. **`CP4` — Verifica indipendente**: Highbay ricompila e controlla il report `eval/` del test writer sul branch `highbay/tests-<n>` prima di accettarlo, poi compila il commit del builder ed esegue contro di esso quella suite `eval/` accettata (nessuna chiave API è richiesta a meno che la suite `eval/` non chiami un provider live). Per i valutatori configurati dall'operatore, nomi, controlli e log degli scenari holdout sono omessi dai report destinati al builder tramite `Report.ForBuilders()` (il test writer non può inviare holdout).
5. **`CP5` — Approvare e fare merge**: Esamina i risultati in **Approve**, registra l'approvazione e premi **Merge into current branch** per unire i commit verificati nel tuo branch locale.

{{< highbay-views >}}

## Installazione

Highbay funziona su macOS o Linux e richiede **Go 1.27.3+**, **Git 2.45+** (con `user.name` e `user.email` configurati) e **Docker** (usato da `check_project` per compilare e testare il lavoro del builder in container Linux).

Installa il binario `hbay` e registra i tuoi coding agent:

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` registra il server MCP `hbay stdio` e la skill `/highbay` (`$highbay` in Codex) nei client rilevati — Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI e VS Code — e avvia [Chorus](/it/docs/3-ecosystem/chorus/) se installato. Usa `hbay setup -global` per registrare solo MCP e skill senza avviare Chorus.

Quando esiste la cartella di configurazione di Herdr (`$HERDR_APP_HOME` o `~/.config/herdr-app`), il setup installa anche il companion flottante Highbay in `mods/highbay/` e assegna **Command–Option–Shift–H** (`⌥⌘⇧H`) su macOS se la scorciatoia è libera.

---

## Avviare un progetto {#blank-and-example}

Apri una cartella vuota nel tuo agente e invoca `/highbay` (`$highbay` in Codex):

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

In una cartella non ancora inizializzata, l'agente chiama `init_project(dir: ".")` (ricavando `example.com/<cartella>` se non hai indicato un module path):

- **Nuovo workspace (`worked_example: false`, predefinito)**: `init_project` e `hbay init` inizializzano una struttura a due moduli Go (`<module>` e `<module>/eval`) con Goa, Goa-AI, Model e Story fissati in `go.mod` e uno scenario di avvio in `eval/`, pronta per la tua `Story` e `design/`.
- **Esempio eseguibile (`worked_example: true` / `-example`)**: Passa `-example` da CLI o chiedi `worked_example: true` quando vuoi esplorare prima un esempio completo con agente Goa-AI, tool, flusso `Story` e suite scriptata:

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Repository Goa esistenti**: Adottare Highbay in un repository esistente richiede un commit Git iniziale e una suite `<module>/eval` nel formato Highbay oppure impostazioni di verifica salvate (`hbay verification set`); vedi [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds).

---

## Pannelli affiancati in Herdr o worker in background {#herdr}

Nella vista **Build** scegli inline coding agent, modello e permessi per ciascun ruolo:

| Modalità worker | Quando viene usata | Come funziona |
|-----------------|--------------------|---------------|
| **Herdr + Chorus** | `herdr-core`, `herdr-app` e Chorus (`chorus up`) sono disponibili | Collega il pannello attivo del tuo agente, apre `builder` e `test_writer` al suo fianco durante **Build** e li chiude dopo merge o annullamento. Premi **⌥⌘⇧H** su macOS per aprire il companion Highbay. |
| **Worker in background** | Herdr non è installato o non è in uso | Avvia `builder` e `test_writer` come processi CLI non interattivi supervisionati dal server dopo la conferma in **Build**, senza richiedere Herdr o Chorus. |

---

## Architettura e confini di fiducia {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Architettura Highbay con Guide Agent, Browser Page, Highbay Server, Test Writer, Builder e Verifier" class="img-fluid" >}}

1. **DSL portabile `Story` (`github.com/goadesign/highbay/story/dsl`)**: Dichiara attori, flussi (`StartsWith`, `Step`, `Outcome`) e domande aperte `Question` in Go accanto a `design/`. Ogni flusso completato richiede un test di scenario in `eval/`.
2. **Generazione Goa e Goa-AI (`generate_code`)**: Scrive il `design/` concordato in `.highbay-build` ed esegue i generatori fissati senza modifiche manuali a `gen/`.
3. **Accettazione dei test (`internal/testwriter`)**: Rigenera la tabella dei test Story, verifica che nulla fuori da `eval/` sia cambiato, compila il binario di test e registra `highbay/tests-<n>`.
4. **Verifica e processi (`verify/candidate`)**: Le credenziali per ruolo separano i permessi MCP; per i valutatori configurati, nomi, controlli e log degli scenari holdout vengono omessi dai report destinati al builder (il test writer non può inviare holdout). Agenti, valutazione del design, binari candidati ed `eval/` girano come normali processi locali con il tuo utente e possono leggere i file locali, mentre `check_project` usa container Docker locali.

## Vedi anche

- [Repository GitHub di Highbay](https://github.com/goadesign/highbay) — Codice sorgente, `HOW_IT_WORKS.md`, `REFERENCE.md` e `story/dsl`
- [Pagina Highbay](/it/highbay/) — Percorso completo di una modifica attraverso i tre ruoli
- [Documentazione Chorus](/it/docs/3-ecosystem/chorus/) — Coordinamento multi-agente usato dai pannelli Herdr
- [Sviluppare con un coding agent](/it/docs/ai-development/) — Flusso design-first con Goa e Goa-AI
