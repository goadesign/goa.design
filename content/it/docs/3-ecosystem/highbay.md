---
title: "Highbay"
weight: 5
description: "Sviluppa e verifica API, server MCP e workflow IA separando i ruoli dei tuoi coding agent: conferma le scelte aperte nel browser, genera il 70% del codice Go non di test (nel servizio di riferimento Orders) ed esegui test indipendenti prima del merge."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) offre ai coding agent che usi già un flusso strutturato per API, server MCP e workflow IA. Ogni servizio condivide un'unica struttura di progetto (`design/`, `gen/`, `cmd/`, `internal/`, `eval/`), regole di architettura integrate per autenticazione, tracing OpenTelemetry e log con buffer ([Clue](/it/docs/3-ecosystem/clue/)), code Redis Streams e worker pool ([Pulse](/it/docs/3-ecosystem/pulse/)) e workflow durevoli, unite alla generazione deterministica di [Goa](/it/docs/1-goa/) e [Goa-AI](/it/docs/2-goa-ai/). Confermi le scelte di prodotto e autonomia aperte nello Studio del browser, un agente implementa gli handler sulle interfacce Go generate, un secondo agente scrive i test di scenario in una copia Git separata e Highbay verifica entrambi i commit prima della tua approvazione e del merge.

Per esplorare il walkthrough completo della piattaforma incidenti `ops-copilot`, visita la [pagina Highbay](/it/highbay/).

## Installazione

Highbay funziona su macOS o Linux e utilizza **Go 1.27.3+**, **Git 2.45+** (con `user.name` e `user.email` configurati) e **Docker** (usato da `check_project` per compilare ed eseguire i test unitari del builder in container Linux).

Installa `highbay` e registra i tuoi coding agent con Homebrew, `npx` o `go install`:

```bash
# macOS o Linux (Homebrew)
brew install goadesign/tap/highbay
highbay up

# Linux o macOS (Node.js 18+)
npx @goadesign/highbay up

# Oppure con Go 1.27.3+
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

`highbay up` registra il server MCP `highbay stdio` e la skill `/highbay` (`$highbay` in Codex) nei coding agent rilevati (Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI e VS Code) e avvia [Chorus](/it/docs/3-ecosystem/chorus/) quando è installato. Esegui `highbay update` in qualsiasi momento per aggiornare sul posto binario, skill, registrazioni MCP e companion Herdr, oppure `highbay setup -global` per registrare MCP e skill senza avviare Chorus. Highbay è presente anche sull'Official MCP Registry (`io.github.goadesign/highbay`), Glama, Serverdex e come plugin di Claude Code (`/plugin marketplace add goadesign/highbay`). Ricarica il tuo coding agent o avvia una nuova sessione se era già aperto durante il setup.

Quando esiste la cartella di configurazione di [Herdr](https://herdr.dev) (`$HERDR_APP_HOME` o `~/.config/herdr-app`), il setup installa anche il companion flottante Highbay in `mods/highbay/` e assegna **Command+Option+Shift+H** (`⌥⌘⇧H`) su macOS se la scorciatoia è libera.

## Avviare un progetto {#blank-and-example}

Esegui `highbay` nella cartella del progetto per aprire lo Studio nel browser. In una cartella vuota, lo Studio presenta un unico compositore (`Describe what you want to build`), avvia il coding agent scelto come `guide`, pubblica la richiesta nel pannello **Team conversation** di Chorus, inizializza il workspace iniziale e apre la prima Change Card in **Agree** appena è pronta.

Se hai già una sessione attiva nel tuo editor o terminale, invoca direttamente `/highbay` (`$highbay` in Codex):

```text
/highbay Crea una piattaforma incidenti multi-tenant con tool MCP per i log dei pod e i rollback con approvazione di reperibilità.
```

La prima chiamata MCP di Highbay avvia o si collega al server locale del progetto, registra la sessione corrente come `guide` e chiama `open_views` per aprire lo Studio. Usa **+ New change** nell'intestazione dello Studio per far preparare al guide una nuova Change Card in parallelo mantenendo intatte le modifiche non salvate sulle altre schede.

Quando la cartella non è ancora inizializzata, il tuo agente chiama `init_project(dir: ".")` (ricavando `example.com/<cartella>` se non hai specificato un module path Go; il primo setup richiede un paio di minuti mentre i moduli Go vengono scaricati e compilati):

- **Nuovo workspace (`worked_example: false`, predefinito)**: `init_project` e `highbay init` creano una struttura a due moduli Go (`<module>` e `<module>/eval`) con Goa, Goa-AI, Model e Story fissati in `go.mod` e un controllo di avvio in `eval/`, pronta per la tua `Story` e `design/`.
- **Esempio eseguibile (`worked_example: true` / `-example`)**: Passa `-example` da CLI o chiedi `worked_example: true` per esplorare prima un agente Goa-AI completo con tool, flusso `Story` e suite di valutazione scriptata:

```bash
highbay init -dir ./demo-shop -module example.com/shop -example
```

- **Repository Goa esistenti**: Adottare Highbay in un repository Goa o Goa-AI esistente richiede almeno un commit Git e una suite `<module>/eval` nel formato Highbay oppure un programma di test registrato con `highbay verification set` (quando è configurata una suite salvata, Highbay la esegue a ogni modifica senza avviare un test writer); vedi [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). `highbay gen` e `generate_code` supportano design Goa HTTP, JSON-RPC e MCP; i design con trasporto gRPC sono rifiutati perché la finalizzazione `protoc` non è inclusa.

{{< highbay-views >}}

## Ruoli e layout dello Studio {#workflow}

Quando un singolo coding agent scrive sia l'applicazione sia i test che la controllano, le domande di prodotto lasciate aperte vengono risolte in silenzio e codificate in entrambi i lati. Highbay separa questi compiti in workspace e credenziali MCP distinti, mentre lo Studio affianca la fase attiva (**Agree**, **Architecture**, **Build**, **Verify**, **Approve**) al pannello fisso **Team conversation** di Chorus e a un cassetto integrato **Terminal**:

| Partecipante | Connessione | Responsabilità |
|--------------|-------------|----------------|
| **Tu** | Studio nel browser (`/views`) | Confermare le domande aperte sulla Change Card, chiedere revisioni mirate al guide in **Team conversation**, ispezionare l'architettura, avviare le build, osservare o rispondere nei terminali dei ruoli, approvare e fare merge |
| **Guide** | MCP `highbay` (ruolo `guide`) | Inizializza cartelle vuote, valuta flussi `Story` e design Goa in `.highbay-draft`, risponde in Chorus e propone o rivede Change Card |
| **Test Writer** | MCP `highbay` (copia `.highbay-tests`) | Scrive un test di scenario per ogni flusso `Story` completato in `eval/` dalla Change Card confermata senza modificare il codice del servizio |
| **Builder** | MCP `highbay` (copia `.highbay-build`) | Esegue `generate_code` per scrivere `design/` e `gen/`, implementa gli handler, controlla in un container Linux e richiede la verifica |
| **Server Highbay** | Processo locale per progetto | Applica i permessi per ruolo, compila e accetta le suite `eval/`, compila i binari candidati fissati per digest, esegue la verifica e registra le approvazioni |

## Perché la generazione di codice conta per i coding agent {#codegen}

Scrivere a mano router HTTP, handler JSON-RPC, server MCP, validazione delle richieste e schemi JSON dei tool consuma token su codice ripetitivo e lascia che le convenzioni cambino a ogni turno. Highbay rende la generazione parte della build concordata separando ciascun responsabile:

- **`gen/` del servizio (`generate_code`)**: Quando il builder esegue `generate_code`, Highbay scrive il `design/` concordato della build aperta in `.highbay-build` ed esegue i generatori Goa e Goa-AI fissati nel progetto per sostituire il `gen/` candidato. Produce così handler, client tipizzati, codec e validazione strutturale per i trasporti HTTP, JSON-RPC e MCP dichiarati, insieme agli schemi JSON dei tool Goa-AI, binding ai metodi, campi iniettati lato server, conferme obbligatorie e `AGENTS_QUICKSTART.md` nella radice del modulo (salvo disattivazione). Goa genera il 70% del codice Go non di test nel servizio di riferimento `Orders` con zero token di output del modello; il consumo complessivo dipende dal contesto, dalle iterazioni e dalla revisione richiesti.
- **Contesto iniziale focalizzato**: Le modifiche partono da `design/` e dalle interfacce Go generate rilevanti senza caricare ogni file di trasporto e schema nel prompt.
- **Forma generata uniforme tra modelli**: Rigenerare `gen/` da un unico compilatore mantiene coerente il codice di trasporto, validazione e schemi dei tool con Claude, Codex o Gemini.
- **Controlli del compilatore e del server tra i ruoli**: Dare un nuovo tipo di risultato a un metodo e rigenerare fa fallire `go build` sugli handler che restituiscono ancora il vecchio tipo, mentre le chiamate tool non valide prodotte dal modello vengono rifiutate a runtime. Separatamente, Highbay scrive i flussi `Story` richiesti in `eval/design/story_tests.go` quando prepara o controlla l'incarico del test writer, genera il runner Go in `eval/gen/`, compila il programma di test per verificarne l'elenco degli scenari e rifiuta in `verify_change` qualsiasi commit il cui `design/` diverga dalla revisione concordata.

Per approfondire il flusso design-first con agenti, consulta [Sviluppare con un coding agent](/it/docs/ai-development/).

## Cinque checkpoint (`CP1` a `CP5`) {#checkpoints}

Ogni anteprima di architettura, commit di test accettato, copia live, esecuzione di verifica e approvazione è vincolata a un digest esatto `request_revision` della Change Card:

1. **`CP1`: Concordare una Change Card**: Il tuo agente valuta una `Story` (`github.com/goadesign/highbay/story/dsl`) nella propria copia `.highbay-draft` e propone una Change Card con riepilogo della modifica, domande di prodotto aperte, esempi concreti di accettazione e comportamenti preservati. Rispondi alle domande, chiedi revisioni in **Team conversation** quando le tue risposte cambiano la bozza e confermi la scheda in **Agree**.
2. **`CP2`: Anteprima dell'architettura**: Ispeziona i container C4, le policy degli agenti Goa-AI e i guardrail dei tool dichiarati dal design Goa e [Model](/it/docs/3-ecosystem/model/) in **Architecture**, oppure fai clic su **Ask Guide** su un container per discuterne in **Team conversation**.
3. **`CP3`: Provare i prompt dal vivo (opzionale)**: Quando il servizio include un agente Goa-AI e configuri una chiave provider o un gateway, il builder può avviare una copia live del commit candidato e testare override dei prompt in **Live target** prima del commit.
4. **`CP4`: Verificare il candidato**: Highbay compila e controlla il modulo `eval/` del test writer sul branch `highbay/tests-<n>` prima di accettare quel commit di test, poi compila il commit candidato del builder ed esegue contro di esso il commit di test accettato in **Verify** (nessuna chiave API modello è richiesta a meno che la suite `eval/` non chiami un provider live). Se uno scenario fallisce, **Message Builder** apre il compositore indirizzato a `builder` con i riferimenti dell'esecuzione. Quando un operatore configura un valutatore separato con test holdout, Highbay mostra l'esito di ogni holdout con un nome anonimo e omette nome dello scenario, controlli e diagnostica dai report visibili al builder (`Report.ForBuilders()`; il test writer non può inviare holdout).
5. **`CP5`: Approvare e fare merge**: Esamina il report degli scenari superati in **Approve**, registra la tua approvazione (con verifica opzionale del digest del binario di rilascio quando la promozione è configurata) e fai clic su **Merge into current branch** per unire i commit verificati di codice e test nel tuo branch locale.

## Terminali live, pannelli Herdr e worker in background {#herdr}

In **Build** scegli inline coding agent e modello per ciascun ruolo worker (le scelte vengono ricordate per progetto). Quando sono installate più famiglie di coding agent (ad esempio Claude Code e Codex), Highbay preferisce famiglie diverse per builder e test writer; anche una singola CLI installata può coprire entrambi i ruoli:

| Modalità worker | Quando viene usata | Come funziona |
|-----------------|--------------------|---------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) e [Chorus](/it/docs/3-ecosystem/chorus/) (`chorus up`) sono disponibili | Adotta il pannello attivo del tuo agente quando compatibile, esegue `builder` e `test_writer` in PTY gestiti, invia i messaggi Chorus a **Team conversation** e permette di osservare il terminale di ogni ruolo in sola lettura nel cassetto **Terminal** dello Studio (passando a **Type in terminal** quando un ruolo attende risposta). Premi **⌥⌘⇧H** su macOS per aprire il companion Highbay. |
| **Worker in background** | Herdr non è installato o non è in esecuzione | Esegue `builder` e `test_writer` come processi CLI non interattivi supervisionati dal server senza richiedere Herdr o Chorus dopo la conferma in **Build**. |

## Architettura e confini dei processi {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Architettura Highbay con Guide Agent, Browser Studio, Highbay Server, Test Writer, Builder e Verifier" class="img-fluid" >}}

1. **DSL portabile `Story` (`github.com/goadesign/highbay/story/dsl`)**: Dichiara attori, flussi (`StartsWith`, `Step`, `Outcome`) e domande aperte `Question` in Go accanto a `design/`. Ogni flusso completato richiede un test di scenario corrispondente in `eval/` perché una build sia valida (Highbay verifica che ogni scenario richiesto sia dichiarato e lo esegue; non giudica se le asserzioni interne al test siano sufficienti).
2. **Generazione Goa e Goa-AI (`generate_code`)**: Highbay materializza il `design/` concordato in `.highbay-build` ed esegue atomicamente i generatori Goa e Goa-AI fissati così nessun agente modifica `gen/` a mano.
3. **Accettazione del modulo di test (`internal/testwriter`)**: Prima che i test contino, Highbay rigenera la tabella dei test Story, verifica che nulla fuori da `eval/` sia cambiato, compila il binario di test e registra il commit accettato su `highbay/tests-<n>`.
4. **Verifica candidata ed esecuzione locale (`verify/candidate`)**: Le credenziali per ruolo limitano ciò che ciascun ruolo può invocare in Highbay, così solo tu puoi confermare una Change Card, registrare l'approvazione o fare merge. Agenti, valutazione del design, binari candidati e suite `eval/` vengono eseguiti come normali gruppi di processi locali sotto il tuo utente con il tuo accesso a file e rete, mentre `check_project` esegue compilazione e test unitari in container Docker locali.

## Vedi anche

- [Repository GitHub di Highbay](https://github.com/goadesign/highbay): Codice sorgente, `HOW_IT_WORKS.md`, `REFERENCE.md` e `story/dsl`
- [Pagina Highbay](/it/highbay/): Percorso interattivo nello Studio e panoramica delle funzionalità
- [Documentazione Chorus](/it/docs/3-ecosystem/chorus/): Coordinamento multi-agente `#channel` e `@agent` usato in **Team conversation**
- [Sviluppare con un coding agent](/it/docs/ai-development/): Flusso guidato dal contratto con Goa e Goa-AI
