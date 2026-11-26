---
title: "Highbay"
weight: 5
description: "Sviluppa e verifica servizi Go e agenti IA separando i ruoli dei tuoi coding agent: conferma i casi limite nel browser, genera interfacce con Goa e Goa-AI ed esegui test di scenario indipendenti prima del merge."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) sviluppa e verifica servizi [Goa](/it/docs/1-goa/) e agenti [Goa-AI](/it/docs/2-goa-ai/) con i coding agent che usi già, separando chi scrive il servizio da chi scrive i test di scenario da cui dipende l’approvazione. Tu confermi le scelte di prodotto aperte nel browser, un agente implementa il servizio sulle interfacce generate da Goa, un secondo agente scrive i test di scenario in un workspace separato e Highbay esegue quei test accettati sul commit candidato prima della tua approvazione e del merge.

Per provare il confronto interattivo sull'esempio dei rimborsi fino a `$50`, visita la [pagina Highbay](/it/highbay/).

## Installazione

Highbay funziona su macOS o Linux e richiede **Go 1.27.3+**, **Git 2.45+** (con `user.name` e `user.email` configurati) e **Docker** (usato da `check_project` per compilare ed eseguire i test unitari del builder in container Linux).

Installa il binario `hbay` e registra i tuoi coding agent:

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` registra il server MCP `hbay stdio` e la skill `/highbay` (`$highbay` in Codex) nei coding agent rilevati — Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI e VS Code — e avvia [Chorus](/it/docs/3-ecosystem/chorus/) quando è installato. Usa `hbay setup -global` per registrare MCP e skill senza avviare Chorus. Ricarica il tuo coding agent o avvia una nuova sessione se era già aperto durante il setup.

Quando esiste la cartella di configurazione di [Herdr](https://herdr.dev) (`$HERDR_APP_HOME` o `~/.config/herdr-app`), il setup installa anche il companion flottante Highbay in `mods/highbay/` e assegna **Command–Option–Shift–H** (`⌥⌘⇧H`) su macOS se la scorciatoia è libera.

---

## Avviare un progetto {#blank-and-example}

Apri una cartella nel tuo coding agent e invoca `/highbay` (`$highbay` in Codex):

```text
/highbay — crea un assistente per i rimborsi: fino a $50 danno credito immediato; gli importi superiori attendono un responsabile.
```

La prima chiamata MCP di Highbay avvia o si collega al server locale del progetto, registra la sessione corrente come `guide` e chiama `open_views` per aprire la pagina nel browser.

Quando la cartella non è ancora inizializzata, il tuo agente chiama `init_project(dir: ".")` (ricavando `example.com/<cartella>` se non hai specificato un module path Go; il primo setup richiede un paio di minuti mentre i moduli Go vengono scaricati e compilati):

- **Nuovo workspace (`worked_example: false`, predefinito)**: `init_project` e `hbay init` inizializzano una struttura a due moduli Go (`<module>` e `<module>/eval`) con Goa, Goa-AI, Model e Story fissati in `go.mod` e un controllo di avvio in `eval/`, pronta per la tua `Story` e `design/`.
- **Esempio eseguibile (`worked_example: true` / `-example`)**: Passa `-example` da CLI o chiedi `worked_example: true` quando vuoi esplorare prima un agente Goa-AI completo con tool, flusso `Story` e suite di valutazione scriptata:

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Repository Goa esistenti**: Adottare Highbay in un repository Goa o Goa-AI esistente richiede almeno un commit Git e una suite `<module>/eval` nel formato Highbay oppure un programma di test registrato con `hbay verification set` (quando è configurata una suite salvata, Highbay la esegue a ogni modifica senza avviare un test writer); vedi [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). Nota che `hbay gen` e `generate_code` supportano design Goa HTTP, JSON-RPC e MCP; i design con trasporto gRPC sono rifiutati oggi perché la finalizzazione `protoc` non è inclusa.

{{< highbay-views >}}

---

## Ruoli e responsabilità {#workflow}

Quando un singolo coding agent scrive sia l'applicazione sia i test che la controllano, le domande di prodotto lasciate aperte vengono risolte in silenzio e codificate in entrambi i lati. Highbay separa questi compiti in workspace e credenziali MCP distinti:

| Partecipante | Connessione | Responsabilità |
|--------------|-------------|----------------|
| **Tu** | Pagina nel browser | Rispondere alle domande aperte sulla Change Card, ispezionare l'anteprima dell'architettura, avviare le build, registrare l'approvazione e fare merge nel branch locale |
| **Guide** | MCP `highbay` (ruolo `guide`) | La sessione attiva del tuo agente; inizializza cartelle vuote, scrive flussi `Story` e design Goa, e propone o rivede Change Card |
| **Test Writer** | MCP `highbay` (copia `.highbay-tests`) | Scrive un test di scenario per ogni flusso `Story` completato in `eval/` dalla Change Card confermata senza modificare il codice del servizio |
| **Builder** | MCP `highbay` (copia `.highbay-build`) | Esegue `generate_code` per scrivere `design/` e `gen/`, implementa la logica di business, controlla in un container Linux e richiede la verifica |
| **Server Highbay** | Processo locale per progetto | Applica i permessi per ruolo, compila e accetta le suite `eval/`, compila i binari candidati fissati per digest, esegue la verifica e registra le approvazioni |

---

## Perché la generazione di codice conta per i coding agent {#codegen}

Lasciare che un coding agent scriva a mano router HTTP, handler JSON-RPC, server MCP, logica di validazione e schemi JSON dei tool consuma token di output per codice ripetitivo, gonfia il contesto di input nelle modifiche successive e introduce differenze strutturali da una funzionalità all'altra. Highbay affianca alla separazione dei ruoli la generazione deterministica di Goa e Goa-AI:

- **Zero token di output LLM spesi per scrivere `gen/`**: Quando il builder invoca `generate_code`, Highbay scrive il `design/` confermato in `.highbay-build` ed esegue i compilatori Goa e Goa-AI fissati nel progetto per sostituire `gen/` — server HTTP, JSON-RPC e MCP, client tipizzati, codec, validazione strutturale, specifiche OpenAPI, schemi JSON dei tool Goa-AI, guardrail `Inject` e `Confirmation` e `AGENTS_QUICKSTART.md`. Il risparmio complessivo di token dipende dal contesto, dalle iterazioni e dalla revisione richiesti dalla modifica.
- **Contesto più compatto a ogni modifica**: Invece di caricare nel prompt tutti i file generati di trasporto e schema, builder e test writer leggono il pacchetto compatto `design/` e le interfacce Go generate.
- **Struttura uniforme tra turni e famiglie di modelli**: Rigenerare `gen/` con un unico compilatore mantiene coerenti formati di errore, validazione e schemi dei tool sia con Claude sia con Codex o Gemini.
- **Allineamento verificato dal compilatore tra i ruoli**: Aggiornare un campo del payload o un flusso `Story` rigenera insieme le interfacce di servizio in `gen/` e la tabella degli scenari in `eval/gen/`, trasformando firme non allineate o scenari mancanti in errori immediati di `go build` — e `verify_change` rifiuta i commit il cui `design/` diverge dall'accordo confermato.

Per approfondire il flusso design-first con agenti, consulta [Sviluppare con un coding agent](/it/docs/ai-development/).

---

## Cinque checkpoint (`CP1`–`CP5`) {#checkpoints}

Ogni anteprima di architettura, commit di test accettato, copia live, esecuzione di verifica e approvazione è vincolata a un digest esatto `request_revision` della Change Card:

1. **`CP1` — Concordare una Change Card**: Il tuo agente valuta una `Story` (`github.com/goadesign/highbay/story/dsl`) nella propria bozza isolata e propone una Change Card con riepilogo della modifica, domande di prodotto aperte, esempi concreti di accettazione e comportamenti preservati. Rispondi alle domande e confermi la scheda nel browser.
2. **`CP2` — Anteprima dell'architettura**: Ispeziona i container C4, le policy degli agenti Goa-AI e i guardrail dei tool dichiarati dal design Goa e [Model](/it/docs/3-ecosystem/model/) in **Architecture** prima di avviare i worker.
3. **`CP3` — Provare i prompt dal vivo (opzionale)**: Quando il servizio include un agente Goa-AI e configuri una chiave provider o un gateway, il builder può avviare una copia live del commit candidato e testare override dei prompt prima del commit.
4. **`CP4` — Verifica indipendente**: Highbay compila e controlla il modulo `eval/` del test writer sul branch `highbay/tests-<n>` prima di accettare quel commit di test, poi compila il commit candidato del builder ed esegue contro di esso il commit di test accettato (nessuna chiave API modello è richiesta a meno che la suite `eval/` non chiami un provider live). Quando un operatore configura un valutatore separato con test holdout, Highbay mostra l'esito di ogni holdout con un nome anonimo e omette nome dello scenario, controlli e diagnostica dai report visibili al builder (`Report.ForBuilders()`; il test writer non può inviare holdout).
5. **`CP5` — Approvare e fare merge**: Esamina il report degli scenari in **Approve**, registra la tua approvazione (con verifica opzionale del digest del binario di rilascio quando la promozione è configurata) e fai clic su **Merge into current branch** per unire i commit verificati di codice e test nel tuo branch locale.

---

## Pannelli affiancati in Herdr o worker in background {#herdr}

Nella vista **Build** scegli inline coding agent e modello per ciascun ruolo worker (le scelte vengono ricordate per progetto). Quando sono installate più famiglie di coding agent (ad esempio Claude Code e Codex), Highbay preferisce famiglie diverse per builder e test writer; anche una singola CLI installata può coprire entrambi i ruoli:

| Modalità worker | Quando viene usata | Come funziona |
|-----------------|--------------------|---------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) e [Chorus](/it/docs/3-ecosystem/chorus/) (`chorus up`) sono disponibili | Adotta il pannello attivo del tuo agente quando compatibile, apre `builder` e `test_writer` al suo fianco durante **Build** e chiude automaticamente i pannelli worker dopo merge o annullamento. Premi **⌥⌘⇧H** su macOS per aprire il companion Highbay. |
| **Worker in background** | Herdr non è installato o non è in esecuzione | Esegue `builder` e `test_writer` come processi CLI non interattivi supervisionati dal server senza richiedere Herdr o Chorus dopo la conferma in **Build**. |

---

## Architettura e confini dei processi {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Architettura Highbay con Guide Agent, Browser Page, Highbay Server, Test Writer, Builder e Verifier" class="img-fluid" >}}

1. **DSL portabile `Story` (`github.com/goadesign/highbay/story/dsl`)**: Dichiara attori, flussi (`StartsWith`, `Step`, `Outcome`) e domande aperte `Question` in Go accanto a `design/`. Ogni flusso completato richiede un test di scenario corrispondente in `eval/` perché una build sia valida (Highbay verifica che ogni scenario richiesto sia dichiarato e lo esegue; non giudica se le asserzioni interne al test siano sufficienti).
2. **Generazione Goa e Goa-AI (`generate_code`)**: Highbay materializza il `design/` concordato in `.highbay-build` ed esegue atomicamente i generatori Goa e Goa-AI fissati così nessun agente modifica `gen/` a mano.
3. **Accettazione del modulo di test (`internal/testwriter`)**: Prima che i test contino, Highbay rigenera la tabella dei test Story, verifica che nulla fuori da `eval/` sia cambiato, compila il binario di test e registra il commit accettato su `highbay/tests-<n>`.
4. **Verifica candidata ed esecuzione locale (`verify/candidate`)**: Le credenziali per ruolo limitano ciò che ciascun ruolo può invocare in Highbay — solo tu puoi confermare una Change Card, registrare l'approvazione o fare merge. Agenti, valutazione del design, binari candidati e suite `eval/` vengono eseguiti come normali gruppi di processi locali sotto il tuo utente con il tuo accesso a file e rete, mentre `check_project` esegue compilazione e test unitari in container Docker locali.

## Vedi anche

- [Repository GitHub di Highbay](https://github.com/goadesign/highbay) — Codice sorgente, `HOW_IT_WORKS.md`, `REFERENCE.md` e `story/dsl`
- [Pagina Highbay](/it/highbay/) — Confronto interattivo e percorso nelle quattro viste del browser
- [Documentazione Chorus](/it/docs/3-ecosystem/chorus/) — Coordinamento multi-agente `#channel` e `@agent` usato dai pannelli Herdr
- [Sviluppare con un coding agent](/it/docs/ai-development/) — Flusso design-first con Goa e Goa-AI
