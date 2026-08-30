---
title: Memoria e sessioni
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

Questa guida tratta del modello di trascrizione di Goa-AI, della persistenza della memoria e di come modellare conversazioni a più turni e flussi di lavoro di lunga durata.

## Perché le trascrizioni sono importanti
Goa-AI considera la **trascrizione** la fonte di verità per la conversazione visibile al modello: una sequenza ordinata di messaggi e interazioni con strumenti sufficiente per:

- Ricostruire i payload del provider per ogni chiamata al modello
- Guidare i pianificatori, inclusi nuovi tentativi e riparazione degli strumenti
- Fornire alle interfacce una cronologia accurata

Poiché la trascrizione è autorevole per l’input del modello, non è necessario gestire manualmente:

- elenchi separati di chiamate e risultati precedenti
- strutture ad hoc per lo stato della conversazione
- copie per turno dei messaggi precedenti

Per la cronologia della conversazione, salva e passa **solo la trascrizione**; Goa-AI e gli adattatori ricostruiscono l’input del provider. Stato dell’esecuzione, annullamento, checkpoint e record immutabili appartengono all’archivio separato del runtime descritto sotto.

---
## Messaggi e parti

Al confine del modello, Goa-AI utilizza i valori `model.Message` per rappresentare la trascrizione. Ogni messaggio ha un ruolo (`user`, `assistant`) e un elenco ordinato di **parti**:

| Tipo di parte | Descrizione |
|-----------|-------------|
| `ThinkingPart` | Contenuto del ragionamento del fornitore (testo in chiaro + firma o byte redatti). Non è rivolto all'utente; è usato per la verifica/riproduzione e per le interfacce utente opzionali di "ragionamento". |
| `TextPart` | Testo visibile all'utente (domande, risposte, spiegazioni). |
| `ImagePart` | Multimodal image content (bytes or URL/metadata) for providers that support images. |
| `DocumentPart` | Document content (text/bytes/URI/chunks) attached to messages for providers that support document parts. |
| `CitationsPart` | Structured citations metadata produced by providers (for UI display / audit). |
| `ToolUsePart` | Chiamata allo strumento avviata dall'assistente con `ID`, `Name` (ID strumento canonico) e `Input` (carico utile JSON). |
| `ToolResultPart` | Risultato dell'utente/strumento correlato a un uso precedente dello strumento tramite `ToolUseID` e `Content` (payload JSON). |
| `CacheCheckpointPart` | Marker for prompt cache boundaries (provider-dependent, not user-facing). |

**L'ordine è sacro:**
- Il messaggio di un assistente che utilizza uno strumento è tipicamente simile a: `ThinkingPart` (se presente), poi `TextPart` opzionale, poi uno o più `ToolUsePart`
- Un messaggio di risultato utente/strumento contiene tipicamente uno o più `ToolResultPart` che fanno riferimento a precedenti ID di utilizzo dello strumento, oltre a contenuto opzionale dell'utente (`TextPart`, `ImagePart`, `DocumentPart`)

Gli adattatori dei provider di Goa-AI (ad esempio, Bedrock Converse) ricodificano queste parti in blocchi specifici del provider **senza riordino**.

---

## Il contratto di trascrizione

Il contratto di trascrizione di alto livello in Goa-AI è:

1. L'applicazione (o il runtime) **presenta ogni evento** per un'esecuzione in ordine: pensiero dell'assistente, testo, tool_use (ID + args), tool_result dell'utente (tool_use_id + content), messaggi successivi dell'assistente e così via
2. Prima di ogni chiamata al modello, il chiamante fornisce l'intera trascrizione** di quella sessione come `[]*model.Message`, con l'ultimo elemento che è il nuovo delta (testo dell'utente o risultato dello strumento)
3. Goa-AI ricodifica la trascrizione nel formato di chat del provider nello stesso ordine

Non esiste un'API separata per la "cronologia degli strumenti"; la trascrizione è la cronologia.

### Come questo semplifica i pianificatori e le interfacce utente

- **Pianificatori**: Ricevono la trascrizione corrente in `planner.PlanInput.Messages` e `planner.PlanResumeInput.Messages`. Possono decidere cosa fare basandosi esclusivamente sui messaggi, senza dover ricorrere a uno stato aggiuntivo.
- **UI**: Possono rendere la cronologia della chat, i nastri degli strumenti e le schede degli agenti dalla stessa trascrizione sottostante che persiste per il modello. Non sono necessarie strutture separate di "log degli strumenti".
- adattatori **Provider**: Non indovinano mai quali strumenti sono stati chiamati o quali risultati appartengono a un determinato punto; mappano semplicemente le parti della trascrizione → i blocchi dei provider.

---

## Riproduzione della trascrizione del runtime

Il runtime salva aggiunte canoniche di `model.Message` nei record ordinati
dell’esecuzione. `transcript_messages_seeded` contiene i messaggi presenti
prima dell’avvio dell’esecuzione; `transcript_messages_appended` contiene i
messaggi accettati durante l’esecuzione. I record iniziali ricostruiscono
l’input del modello, ma non vengono pubblicati come una nuova risposta
dell’assistente.

Usa la funzione pubblica di riproduzione quando il recupero o l’ispezione
richiede l’esatta sequenza di messaggi pronta per il provider:

```go
import "goa.design/goa-ai/runtime/agent/transcript"

messages, err := transcript.BuildMessagesFromRunLog(ctx, runtimeStore, runID)
if err != nil {
    return err
}
```

`BuildMessagesFromRunLog` scorre le pagine di
`storage.Store.ListRunRecords` e riproduce solo i record canonici della
trascrizione nel loro ordine di archiviazione. Se i record sono già caricati,
`ReplayRunLogEvents` esegue la stessa proiezione. Gli adattatori del provider
mantengono l’ordine delle parti; `ValidatePlannerTranscript` e
`ValidateBedrock` consentono di verificare una trascrizione al confine
appropriato.

Questi record servono al recupero e all’ispezione dei workflow. Non sostituiscono
la trascrizione di proprietà del prodotto usata per cronologia chat,
valutazioni, ricerca, conservazione o eliminazione dei dati dei clienti.

---

## Sessioni, corse e trascrizioni

Goa-AI separa lo stato della conversazione in tre livelli:

- **Sessione** (`SessionID`) - una conversazione o un flusso di lavoro nel tempo:
  - ad esempio, una sessione di chat, un ticket di riparazione, un'attività di ricerca
  - Più esecuzioni possono appartenere alla stessa sessione

- **Esecuzione** (`RunID`) - un'esecuzione di un agente:
  - Ogni chiamata a un client agente (`Run`/`Start`) crea un'esecuzione
  - Le esecuzioni hanno stato, fasi ed etichette

- **Transcript** - la cronologia completa dei messaggi e delle interazioni con gli strumenti per un'esecuzione:
  - Rappresentata come `[]*model.Message`
  - Persistito tramite `memory.Store` come eventi ordinati in memoria

### SessionID e TurnID in pratica

Quando si chiama un agente:

```go
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "chat-session-123", time.Now().UTC()); err != nil {
    panic(err)
}
rt := runtime.New(store)
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: Raggruppa tutte le corse per una conversazione; spesso viene utilizzato come chiave di ricerca nei runtime records e nei dashboard
- `TurnID`: Raggruppa gli eventi per un singolo utente → interazione con l'assistente; opzionale ma utile per le interfacce utente e i log

Le sessioni terminano esplicitamente (ad esempio quando si elimina una conversazione). Una volta terminata una sessione, non devono iniziare nuove run sotto di essa.

---

## Memoria del prodotto e archiviazione del runtime

Goa-AI separa due tipi di dati duraturi perché hanno proprietari diversi:

- **La memoria del prodotto** contiene la trascrizione e i dati applicativi derivati. Il prodotto decide cosa conservare, mostrare, cercare o eliminare.
- **L’archiviazione del runtime** contiene lo stato necessario a Goa-AI per eseguire e continuare le esecuzioni: stato della sessione, metadati, checkpoint privati e record immutabili.

Per esempio, un servizio chat conserva conversazione, valutazioni e campi di ricerca nel proprio database. L’archivio del runtime registra che `run-42` è iniziata, quale esecuzione figlia ha avviato, se è stato richiesto l’annullamento e come è terminata. Non diventa il database delle trascrizioni.

### Archivio della memoria (`memory.Store`)

Conserva messaggi, chiamate e risultati degli strumenti, note e ragionamento del pianificatore. Da questi eventi si ricostruiscono `model.Transcript` e messaggi del provider. Il prodotto possiede questi dati visibili al modello.

### Archivio del runtime (`storage.Store`)

L’host fornisce una sola implementazione di `storage.Store`, proprietaria di tutte le scritture per:

- ambito e stato attivo, terminato o eliminato della sessione
- identità, parentela, etichette, decisione iniziale e stato corrente dell’esecuzione
- byte privati necessari a continuare un’esecuzione sospesa
- record ordinati e immutabili usati per ispezione e provenienza dei prompt

Il runtime richiede questa dipendenza:

```go
store := newRuntimeStore()
rt := runtime.New(store, runtime.WithEngine(eng))
```

In un’applicazione a processo singolo, `store` può essere un adattatore locale. In un sistema distribuito, un servizio possiede il database ed espone metodi tipizzati; i worker implementano `storage.Store` chiamando quel servizio. Servizi distinti non scrivono direttamente nelle stesse raccolte.

---

## Salvare insieme cambiamenti di ciclo di vita e record

Ogni metodo salva stato e record corrispondente nella stessa operazione:

- `StartRootRun` salva metadati radice e primo record.
- `StartChildRun` salva collegamento al padre, metadati del figlio e primo record.
- `StartOneShotRun` salva un’esecuzione senza sessione e il primo record.
- `RecordRunCancellation` salva il primo motivo di annullamento e il record.
- `RecordRunSuspension` salva checkpoint privato, stato sospeso e record.
- `RecordRunTerminal` salva stato finale e record.

Così non può esistere un’esecuzione completata senza record finale, né un checkpoint salvato mentre l’esecuzione appare ancora attiva. I record ordinari usano `AppendRunRecord`; `ListRunRecords` e `ListSessionRunRecords` li leggono tramite un cursor restituito senza modifiche.

### Nuovi tentativi esatti

Le activity possono essere ripetute. Una ripetizione esatta riesce e restituisce l’identificatore originale: identità, ora, etichette, chiave e payload, checkpoint, stato e motivo devono essere identici. Qualsiasi differenza produce un conflitto; l’archivio non indovina né sovrascrive. Il primo motivo di annullamento è permanente.

Per ogni avvio, annullamento, sospensione e completamento, lo storage ricorda
anche il record esatto scelto dalla prima scrittura riuscita. Ripetere il
cambiamento del ciclo di vita con un record diverso produce un conflitto, anche
quando lo stato e gli altri campi del ciclo di vita coincidono.

### Ordine di avvio

Il motore accetta il workflow radice prima della scrittura. Non esiste uno stato `pending` prima dell’ammissione. La prima activity chiama `StartRootRun`: con sessione attiva salva un’esecuzione in corso; se la sessione è terminata, salva un’esecuzione annullata e si ferma prima di pianificatore e strumenti.

I figli usano `StartChildRun`, così collegamento e avvio sono visibili insieme. Il lavoro senza sessione usa `StartOneShotRun`: conserva metadati e record normali senza creare una sessione. Il risultato restituisce sempre la decisione iniziale, anche dopo il completamento.

---

## Ciclo di vita ed eliminazione delle sessioni

L’applicazione host crea, termina e rimuove le sessioni; i worker non lo fanno. Crea prima del lavoro con sessione, termina quando non deve iniziare nuovo lavoro e rimuove definitivamente solo dopo la conclusione di tutte le esecuzioni.

- **Terminare** impedisce nuovo lavoro, consentendo alle esecuzioni attive di salvare i record finali.
- **Eliminare** rimuove sessione, esecuzioni, checkpoint e record dopo la conclusione. L’ID resta inutilizzabile.

`runtime/agent/storage/inmem` espone `CreateSession`, `EndSession` e `PurgeSession` per esempi e test. In produzione li implementa il servizio proprietario del database. Le versioni dei prompt derivano dai record `prompt_rendered` e dai collegamenti padre-figlio; non esiste una seconda lista che possa divergere.

---

## Migrazione dagli archivi separati

Sono rimossi `session.Store`, `runlog.Store`, `runtime.WithSessionStore`, `runtime.WithRunEventStore`, i metodi runtime `CreateSession`, `EndSession` e `PurgeSession`, e i package `features/session/mongo` e `features/runlog/mongo`.

Implementa un unico `runtime/agent/storage.Store` e passalo come primo argomento di `runtime.New`. Sposta l’amministrazione delle sessioni nel servizio host proprietario dei dati. I worker remoti lo chiamano tramite API tipizzata, senza importarne l’adattatore database.

Prima che il nuovo runtime scriva, i dati esistenti devono rispettare il
contratto dello storage integrato. Metadati, checkpoint e record devono
supportare le operazioni del ciclo di vita descritte sopra, e i vecchi writer
degli storage separati non devono sovrapporsi ai nuovi. L’applicazione host
sceglie la procedura di conversione e ripristino per il proprio database e
ambiente, quindi distribuisce insieme il proprietario e tutti i worker.

## Modelli comuni

### Sessioni di chat

- Utilizzare un `SessionID` per sessione di chat
- Avviare una nuova esecuzione per ogni turno dell’utente o attività
- Conservare la trascrizione del prodotto nel servizio di chat; usare i record del runtime per stato, continuazione e ispezione

### Flussi di lavoro di lunga durata

- Usare una esecuzione per ogni workflow accettato dal motore
- Quando un’esecuzione richiede un input esterno, il workflow termina; la risposta avvia una nuova esecuzione nella stessa sessione usando il checkpoint salvato
- Usare `SessionID` per raggruppare flussi di lavoro correlati (ad esempio, per ticket o incidente)
- Affidarsi agli eventi `run.Phase` e `RunCompleted` per il monitoraggio dello stato

### Ricerca e cruscotti

- Pagina `storage.Store` per `RunID` nelle interfacce di audit e debug
- Caricamento delle trascrizioni da `memory.Store` su richiesta per le corse selezionate

---

## Migliori pratiche

- **Correlare sempre i risultati degli strumenti**: Assicurarsi che le implementazioni degli strumenti e i pianificatori conservino gli ID tool_use e mappino i risultati degli strumenti al corretto `ToolUsePart` tramite `ToolResultPart.ToolUseID`

- **Utilizzare schemi forti e descrittivi**: Tipi, descrizioni ed esempi ricchi di `Args` / `Return` nella progettazione di Goa producono carichi utili/risultati più chiari nella trascrizione

- **Lasciare che sia il runtime a gestire lo stato**: Evitare di mantenere array paralleli di "cronologia degli strumenti" o fette di "messaggi precedenti" nel pianificatore. Leggere da `PlanInput.Messages` / `PlanResumeInput.Messages` e affidarsi al runtime per aggiungere nuove parti

- **Persistere le trascrizioni una volta, riutilizzarle ovunque**: Qualunque sia lo store scelto, trattate la trascrizione come un'infrastruttura riutilizzabile: la stessa trascrizione supporta le chiamate al modello, l'interfaccia della chat, l'interfaccia di debug e l'analisi offline

- **Indicizzare i campi interrogati di frequente**: ID sessione, ID esecuzione, stato per query efficienti

- **Archiviare le vecchie trascrizioni**: Ridurre i costi di archiviazione archiviando le sessioni completate

---

## Prossimi passi

- **[Produzione](./production.md)** - Distribuzione con Temporal, UI in streaming e integrazione del modello
- **[Runtime](./runtime.md)** - Comprendere il ciclo piano/esecuzione
- **[Composizione di agenti](./agent-composition.md)** - Costruire grafi di agenti complessi
