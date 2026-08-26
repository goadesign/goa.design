---
title: Memoria e sessioni
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

Questa guida tratta del modello di trascrizione di Goa-AI, della persistenza della memoria e di come modellare conversazioni a più turni e flussi di lavoro di lunga durata.

## Perché le trascrizioni sono importanti

Goa-AI considera la **trascrizione** come l'unica fonte di verità per un'esecuzione: una sequenza ordinata di messaggi e interazioni con gli strumenti sufficiente per:

- Ricostruire i payload del provider (Bedrock/OpenAI) per ogni chiamata al modello
- Guidare i pianificatori (compresi i tentativi e la riparazione degli strumenti)
- Alimentare le interfacce utente con uno storico accurato

Poiché la trascrizione è autorevole, non è necessario gestirla a mano:
- Elenchi separati di chiamate precedenti allo strumento e di risultati dello strumento
- Strutture di "stato di conversazione" ad hoc
- Copie per turno dei messaggi precedenti dell'utente/assistente

Si persiste e si passa solo **la trascrizione**; Goa-AI e i suoi adattatori di provider ricostruiscono tutto ciò di cui hanno bisogno.

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

Gli adattatori dei modelli non conservano stato tra una chiamata e l'altra. Ogni
`model.Request` deve contenere la trascrizione completa pronta per il provider;
un identificatore di run non induce l'adattatore a caricare i messaggi
precedenti. I client pubblici dei modelli validano richiesta e risposta
completa prima che il codice del planner possa osservarle.

### Compressione della cronologia

La policy `History(...)` di un agente può riassumere i turni meno recenti
mantenendo una coda esatta e limitata. I valori `CompressAt...` stabiliscono
quando avviare il riepilogo; i valori `KeepMax...` stabiliscono quali turni
completi più recenti restano invariati. Il runtime non tronca mai un turno.

La compressione richiede un `HistoryModel` configurato. I criteri basati sui
token richiedono inoltre il conteggio esatto fornito dal relativo client del
modello. Bedrock Runtime non può contare richieste con structured output e
alcuni modelli Claude correnti richiedono l'endpoint Mantle separato di AWS.
Vedere [Runtime → Policy della cronologia](../runtime/#history-policies) e
[Riferimento DSL → History](../dsl-reference/#history).

### Come questo semplifica i pianificatori e le interfacce utente

- **Pianificatori**: Ricevono la trascrizione corrente in `planner.PlanInput.Messages` e `planner.PlanResumeInput.Messages`. Possono decidere cosa fare basandosi esclusivamente sui messaggi, senza dover ricorrere a uno stato aggiuntivo.
- **UI**: Possono rendere la cronologia della chat, i nastri degli strumenti e le schede degli agenti dalla stessa trascrizione sottostante che persiste per il modello. Non sono necessarie strutture separate di "log degli strumenti".
- adattatori **Provider**: Non indovinano mai quali strumenti sono stati chiamati o quali risultati appartengono a un determinato punto; mappano semplicemente le parti della trascrizione → i blocchi dei provider.

---

## Replay della trascrizione dal run log

Il runtime salva le aggiunte alla trascrizione pronte per il provider come
eventi ordinati nel run log. Un evento contiene una slice di `model.Message`
codificata in JSON. Il replay accoda queste slice nell'ordine del run log: non
riordina le parti, non inventa messaggi mancanti e non espone un oggetto
trascrizione modificabile.

### Requisiti di ordinamento

I messaggi salvati mantengono l'ordine delle parti richiesto dai provider:

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

Gli adattatori ricodificano queste parti nei blocchi specifici del provider
senza cambiarne la sequenza.

### API pubblica di replay

Il package `runtime/agent/transcript` espone queste operazioni sul run log:

- `EncodeRunLogDelta(messages)` codifica in `rawjson.Message` i
  `[]*model.Message` aggiunti in un punto del run.
- `DecodeRunLogDelta(payload)` decodifica un payload di un evento di
  trascrizione e restituisce i messaggi salvati.
- `ReplayRunLogEvents(events)` riceve una slice già ordinata di
  `*runlog.Event`, ignora gli eventi che non sono seed o append della
  trascrizione e accoda i messaggi nell'ordine di input.
- `BuildMessagesFromRunLog(ctx, store, runID)` pagina un `runlog.Store` e
  restituisce la trascrizione completa e ordinata. Restituisce un errore se
  store o run ID mancano, se l'elenco o la decodifica falliscono oppure se il
  run non contiene eventi di trascrizione.

Nella maggior parte delle applicazioni il runtime scrive gli eventi e
`BuildMessagesFromRunLog` ricostruisce la cronologia pronta per il provider:

```go
messages, err := transcript.BuildMessagesFromRunLog(ctx, runEventStore, runID)
if err != nil {
    return err
}
```

Usare i validatori dopo aver costruito o riprodotto i messaggi:

```go
if err := transcript.ValidatePlannerTranscript(messages); err != nil {
    return err
}
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    return err
}
```

`ValidatePlannerTranscript(messages)` accetta `[]*model.Message` solo quando
ogni gruppo di chiamate dell'assistente è seguito immediatamente da un
messaggio utente con esattamente un risultato corrispondente per ogni ID.
`ValidateBedrock(messages, thinkingEnabled)` aggiunge la regola di Bedrock:
quando il thinking è abilitato, ogni messaggio dell'assistente con una chiamata
deve iniziare con `ThinkingPart`. Nessun validatore modifica i messaggi.

### Perché è importante

- **Riproduzione deterministica**: Gli eventi memorizzati possono ricostruire l'esatta trascrizione per il debugging, l'auditing o la ripetizione di turni falliti
- **Archiviazione indipendente dal provider**: i payload del run log contengono JSON di `model.Message` senza dipendenze dagli SDK dei provider
- **Piani semplificati**: I pianificatori ricevono messaggi ordinati correttamente senza gestire i vincoli dei provider
- **Validazione**: Cattura le violazioni dell'ordine prima che raggiungano il provider e causino errori criptici

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
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "chat-session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: Raggruppa tutte le corse per una conversazione; spesso viene utilizzato come chiave di ricerca nei log di esecuzione e nei dashboard
- `TurnID`: Raggruppa gli eventi per un singolo utente → interazione con l'assistente; opzionale ma utile per le interfacce utente e i log

Le sessioni terminano esplicitamente (ad esempio quando si elimina una conversazione). Una volta terminata una sessione, non devono iniziare nuove run sotto di essa.

---

## Memorizzazione della memoria vs. memorizzazione dell'esecuzione

I moduli funzionali di Goa-AI forniscono memorie complementari:

### Memory Store (`memory.Store`)

Conserva la cronologia degli eventi per ogni esecuzione:
- Messaggi dell'utente/assistente
- Chiamate allo strumento e risultati
- Note e pensieri del pianificatore

```go
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}
```

Tipi chiave:
- **`memory.Snapshot`** - vista immutabile della cronologia memorizzata di una corsa (`AgentID`, `RunID`, `Events []memory.Event`)
- **`memory.Event`** - singola voce persistente con `Type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`, `planner_note`), `thinking`, `Timestamp`, `Data` e `Labels`

### Run Log (`runlog.Store`)

Conserva il **log canonico, append-only** degli eventi di esecuzione. Il runtime aggiunge eventi hook durante l’esecuzione e i consumer paginano tramite cursor opaco per UI e diagnostica.

Per le attività planner di Temporal, `PlanActivityInput.ToolOutputs` contiene
riferimenti con il run ID della chiamata, il run ID del risultato e l'ID della
chiamata. L'attività usa questi riferimenti per caricare dal run log input,
risultato, server-data e metadati visibili al planner. I riferimenti evitano di
ripetere corpi completi al confine dell'attività; il checkpoint privato della
sospensione conserva comunque lo stato necessario alla continuazione.

Le chiamate hanno due identificatori distinti. `ModelToolCallID` è l'ID della
trascrizione del provider che associa una chiamata prodotta dal modello al suo
risultato visibile al modello. `ToolCallID` è l'ID di esecuzione del runtime
usato da attività, retry, record del run log ed eventi di stream. Una chiamata
prodotta dal modello e sospesa conserva entrambi: non sostituirli tra loro e non
derivarli dall'ordine dei run.

```go
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

`runlog.Page` contiene:
- `Events` (ordinati dal più vecchio al più recente)
- `NextCursor` (vuoto quando non ci sono altri eventi)

---

## Cablaggio Negozi

Con le implementazioni supportate da MongoDB:

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    memorymongoclient "goa.design/goa-ai/features/memory/mongo/clients/mongo"
    runlogmongo "goa.design/goa-ai/features/runlog/mongo"
    runlogmongoclient "goa.design/goa-ai/features/runlog/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memClient, err := memorymongoclient.New(memorymongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

memStore, err := memorymongo.NewStore(memClient)
if err != nil {
    log.Fatal(err)
}

runlogClient, err := runlogmongoclient.New(runlogmongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

runEventStore, err := runlogmongo.NewStore(runlogClient)
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunEventStore(runEventStore),
)
```

Una volta configurati:
- I subscriber predefiniti persistono memoria ed eventi di esecuzione automaticamente
- È possibile ricostruire in qualsiasi momento trascrizioni pronte per il provider da `runlog.Store`, per richiamare i modelli, alimentare le UI o svolgere analisi offline

---

## Archivi personalizzati

Implementare le interfacce `memory.Store` e `runlog.Store` per i backend personalizzati:

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run log store
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

---

## Modelli comuni

### Sessioni di chat

- Utilizzare un `SessionID` per sessione di chat
- Avviare una nuova sessione per turno dell'utente o per "attività"
- Persistere le trascrizioni per ogni sessione; utilizzare i metadati della sessione per ricucire la conversazione

### Flussi di lavoro di lunga durata

- Utilizzare una singola sessione per flusso di lavoro logico (potenzialmente con pausa/ripresa)
- Usare `SessionID` per raggruppare flussi di lavoro correlati (ad esempio, per ticket o incidente)
- Affidarsi agli eventi `run.Phase` e `RunCompleted` per il monitoraggio dello stato

### Ricerca e cruscotti

- Pagina `runlog.Store` per `RunID` per UI audit/debug
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
