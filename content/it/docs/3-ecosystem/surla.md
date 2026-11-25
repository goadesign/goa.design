---
title: "Surla"
weight: 5
description: "Control plane multi-agente guidato dai contratti per Goa e Goa-AI che separa intento, scrittura dei test, implementazione e verifica."
llm_optimized: true
---

[Surla](https://github.com/goadesign/surla) è un control plane locale per sviluppare, verificare ed evolvere servizi [Goa](/it/docs/1-goa/) e [Goa-AI](/it/docs/2-goa-ai/) con agenti di programmazione. Organizza gli agenti che usi già in ruoli separati attorno a un unico contratto compilato, esegue una verifica indipendente prima dell'approvazione e unisce i commit approvati nel tuo branch locale dal browser.

Per seguire visivamente una modifica attraverso i vari ruoli, visita la [pagina Surla](/it/surla/).

## Panoramica {#workflow}

Quando un singolo coding agent scrive sia l'applicazione sia i test che la valutano, i punti ciechi vengono condivisi e il codice manuale di trasporto o validazione diverge nel tempo. Surla unisce la separazione dei ruoli alla generazione deterministica di Goa e Goa-AI:

| Partecipante | Connessione | Responsabilità |
|--------------|-------------|----------------|
| **Tu** | Pagina nel browser | Confermare la Change Card, ispezionare l'architettura, avviare le build, approvare le verifiche superate e fare merge nel branch locale |
| **Guide** | MCP `surla` (ruolo `guide`) | La sessione attiva del tuo agente; inizializza cartelle vuote, scrive flussi `Story` e design Goa, e propone o rivede Change Card |
| **Test Writer** | MCP `surla` (copia `.surla-tests`) | Scrive un test di scenario per ogni flusso `Story` completato in `eval/` senza toccare il codice applicativo |
| **Builder** | MCP `surla` (copia `.surla-build`) | Esegue `generate_code` per scrivere `design/` e `gen/`, implementa la logica di dominio, verifica in un container Linux e richiede la verifica |
| **Server Surla** | Processo locale per progetto | Applica i permessi per ruolo, controlla e accetta le suite `eval/`, compila i binari candidati e registra le approvazioni |

## Cinque checkpoint (`CP1`–`CP5`) {#checkpoints}

Ogni anteprima, suite di test accettata, live target, esecuzione di verifica e approvazione è vincolata a un digest esatto `request_revision` della Change Card:

1. **`CP1` — Confermare una Change Card**: L'agente valuta una `Story` (`github.com/goadesign/surla/story/dsl`) nella propria bozza isolata e propone una Change Card in linguaggio chiaro (riepilogo, domande di prodotto aperte, esempi concreti di accettazione e comportamenti preservati). Rispondi e confermi nel browser.
2. **`CP2` — Anteprima dell'architettura**: Ispeziona il diagramma C4 derivato dal design Goa e [Model](/it/docs/3-ecosystem/model/) in **Architecture** prima di avviare i worker.
3. **`CP3` — Provare i prompt dal vivo (opzionale)**: Se il servizio include un agente Goa-AI e configuri una chiave provider o un model gateway, il builder può avviare una copia live del commit candidato e provare override dei prompt prima del commit.
4. **`CP4` — Verifica indipendente**: Surla ricompila e controlla il report `eval/` del test writer sul branch `surla/tests-<n>` prima di accettarlo, poi compila il commit del builder ed esegue contro di esso la suite accettata (con un modello scriptato deterministico per impostazione predefinita, senza chiave API). Gli scenari holdout vengono filtrati tramite `Report.ForBuilders()`.
5. **`CP5` — Approvare e fare merge**: Esamina i risultati in **Approve**, registra l'approvazione e premi **Merge into current branch** per unire i commit verificati nel tuo branch locale.

## Installazione

Surla funziona su macOS o Linux e richiede **Go 1.27+**, **Git 2.45+** (con `user.name` e `user.email` configurati) e **Docker** (usato da `check_project` per compilare e testare il lavoro del builder in container Linux).

Installa il binario `surla` e registra i tuoi coding agent:

```bash
go install github.com/goadesign/surla/cmd/surla@latest
surla up
```

`surla up` registra il server MCP `surla stdio` e la skill `/surla` (`$surla` in Codex) nei client rilevati — Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI e VS Code — e avvia [Chorus](/it/docs/3-ecosystem/chorus/) se installato. Usa `surla setup -global` per registrare solo MCP e skill senza avviare Chorus.

Quando esiste la cartella di configurazione di Herdr (`$HERDR_APP_HOME` o `~/.config/herdr-app`), il setup installa anche il companion flottante Surla in `mods/surla/` e assegna **Command–Option–Shift–S** (`⌥⌘⇧S`) su macOS se la scorciatoia è libera.

---

## Avviare un progetto: guscio pulito per impostazione predefinita {#blank-and-example}

Apri una cartella vuota o un repository Goa esistente nel tuo agente e invoca `/surla` (`$surla` in Codex):

```text
/surla — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

In una cartella non ancora inizializzata, l'agente chiama `init_project(dir: ".")` (ricavando `example.com/<cartella>` se non hai indicato un module path):

- **Guscio pulito predefinito (`example: false`)**: `init_project` e `surla init` creano una struttura neutrale a due moduli Go (`<module>` e `<module>/eval`) con Goa, Goa-AI, Model e Story fissati in `go.mod`, zero endpoint o agenti demo e uno scenario neutrale di avvio in `eval/`. La prima Change Card descrive solo il tuo prodotto.
- **Esempio eseguibile opzionale (`example: true` / `-example`)**: Se vuoi esplorare prima un esempio completo con agente Goa-AI, tool, flusso `Story` e suite scriptata, passa `-example` da CLI o chiedi `example: true`:

```bash
surla init -dir ./demo-shop -module example.com/shop -example
```

---

## Pannelli affiancati in Herdr o worker in background {#herdr}

Nella vista **Build** scegli inline coding agent, modello e permessi per ciascun ruolo:

| Modalità worker | Quando viene usata | Come funziona |
|-----------------|--------------------|---------------|
| **Herdr + Chorus** | `herdr-core`, `herdr-app` e Chorus (`chorus up`) sono disponibili | Collega il pannello attivo del tuo agente, apre `builder` e `test_writer` al suo fianco durante **Build** e li chiude dopo merge o annullamento. Premi **⌥⌘⇧S** su macOS per aprire il companion Surla. |
| **Worker in background** | Herdr non è installato o non è in uso | Avvia `builder` e `test_writer` come processi CLI non interattivi supervisionati dal server dopo la conferma in **Build**, senza richiedere Herdr o Chorus. |

---

## Architettura e confini di fiducia {#architecture}

{{< figure src="/images/diagrams/SurlaArchitecture.svg" alt="Architettura Surla con Guide Agent, Browser Page, Surla Server, Test Writer, Builder e Verifier" class="img-fluid" >}}

1. **DSL portabile `Story` (`github.com/goadesign/surla/story/dsl`)**: Dichiara attori, flussi (`StartsWith`, `Step`, `Outcome`) e domande aperte `Question` in Go accanto a `design/`. Ogni flusso completato richiede un test di scenario in `eval/`.
2. **Generazione Goa e Goa-AI (`generate_code`)**: Scrive il `design/` concordato in `.surla-build` ed esegue i generatori fissati senza modifiche manuali a `gen/`.
3. **Accettazione dei test (`internal/testwriter`)**: Rigenera la tabella dei test Story, verifica che nulla fuori da `eval/` sia cambiato, compila il binario di test e registra `surla/tests-<n>`.
4. **Verifica e processi (`verify/candidate`)**: Le credenziali per ruolo separano i permessi MCP e nascondono gli scenari holdout al builder; valutazione del design, binari candidati ed `eval/` girano come gruppi di processi locali con il tuo utente, mentre `check_project` usa container Docker locali.

## Vedi anche

- [Repository GitHub di Surla](https://github.com/goadesign/surla) — Codice sorgente, `HOW_IT_WORKS.md`, `REFERENCE.md` e `story/dsl`
- [Pagina Surla](/it/surla/) — Percorso completo di una modifica attraverso i tre ruoli
- [Documentazione Chorus](/it/docs/3-ecosystem/chorus/) — Coordinamento multi-agente usato dai pannelli Herdr
- [Sviluppare con un coding agent](/it/docs/ai-development/) — Flusso design-first con Goa e Goa-AI
