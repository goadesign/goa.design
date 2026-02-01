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

### Come questo semplifica i pianificatori e le interfacce utente

- **Pianificatori**: Ricevono la trascrizione corrente in `planner.PlanInput.Messages` e `planner.PlanResumeInput.Messages`. Possono decidere cosa fare basandosi esclusivamente sui messaggi, senza dover ricorrere a uno stato aggiuntivo.
- **UI**: Possono rendere la cronologia della chat, i nastri degli strumenti e le schede degli agenti dalla stessa trascrizione sottostante che persiste per il modello. Non sono necessarie strutture separate di "log degli strumenti".
- adattatori **Provider**: Non indovinano mai quali strumenti sono stati chiamati o quali risultati appartengono a un determinato punto; mappano semplicemente le parti della trascrizione → i blocchi dei provider.

---

## Registro di trascrizione

Il **transcript ledger** è un record preciso del fornitore che mantiene la cronologia delle conversazioni nel formato esatto richiesto dai fornitori di modelli. Assicura un replay deterministico e la fedeltà del fornitore senza far trapelare i tipi di SDK del fornitore nello stato del flusso di lavoro.

### Fedeltà del fornitore

I diversi fornitori di modelli (Bedrock, OpenAI, ecc.) hanno requisiti rigorosi per quanto riguarda l'ordine e la struttura dei messaggi. Il libro mastro fa rispettare questi vincoli:

| Requisiti del fornitore | Garanzia del libro mastro |
|---------------------|------------------|
| Il pensiero deve precedere l'uso dello strumento nei messaggi degli assistenti | Il ledger ordina le parti: pensiero → testo → uso dello strumento |
| I risultati dell'utensile devono seguire il corrispondente utilizzo dell'utensile | Il libro mastro correla il risultato dell'utensile tramite ToolUseID |
| Alternanza di messaggi (assistente → utente → assistente) | Ledger lava l'assistente prima di aggiungere i risultati dell'utente |

Per Bedrock in particolare, quando il pensiero è abilitato:
- I messaggi dell'assistente contenenti tool_use **devono** iniziare con un blocco di riflessione
- I messaggi utente con tool_result devono seguire immediatamente il messaggio assistente che dichiara il tool_use
- Il numero di risultati dello strumento non può superare il numero di utilizzi dello strumento precedente

### Requisiti di ordinamento

Il libro mastro memorizza i pezzi nell'ordine canonico richiesto dai fornitori:

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

Questo ordine è **sacro**: il libro mastro non riordina mai le parti e gli adattatori dei provider le ricodificano in blocchi specifici del provider nella stessa sequenza.

### Manutenzione automatica del libro mastro

Il runtime mantiene automaticamente il registro delle trascrizioni. Non è necessario gestirlo manualmente:

1. **Cattura eventi**: Durante l'avanzamento della corsa, il runtime conserva gli eventi di memoria (`EventThinking`, `EventAssistantMessage`, `EventToolCall`, `EventToolResult`) in modo da

2. **Ricostruzione del registro**: La funzione `BuildMessagesFromEvents` ricostruisce i messaggi pronti per il provider a partire dagli eventi memorizzati:

```go
// Reconstruct messages from persisted events
events := loadEventsFromStore(agentID, runID)
messages := transcript.BuildMessagesFromEvents(events)

// Messages are now in canonical provider order
// Ready to pass to model.Client.Complete() or Stream()
```

3. **Validazione**: Prima dell'invio ai provider, il runtime può convalidare la struttura del messaggio:

```go
// Validate Bedrock constraints when thinking is enabled
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    // Handle constraint violation
}
```

### API del libro mastro

Per casi d'uso avanzati, è possibile interagire direttamente con il libro mastro. Il libro mastro fornisce questi metodi chiave:

| Metodo | Descrizione |
|--------|-------------|
| `NewLedger()` | Crea un nuovo libro mastro vuoto |
| `AppendThinking(part)` | Aggiunge una parte pensante al messaggio dell'assistente corrente |
| `AppendText(text)` | Aggiunge un testo visibile al messaggio dell'assistente corrente |
| `DeclareToolUse(id, name, args)` | Dichiara l'invocazione di uno strumento nel messaggio assistente corrente |
| `FlushAssistant()` | Finalizza il messaggio assistente corrente e si prepara per l'input dell'utente |
| `AppendUserToolResults(results)` | Applica i risultati dello strumento come messaggio utente |
| `BuildMessages()` | Restituisce la trascrizione completa come `[]*model.Message` |

**Esempio di utilizzo:**

```go
import "goa.design/goa-ai/runtime/agent/transcript"

// Create a new ledger
l := transcript.NewLedger()

// Record assistant turn
l.AppendThinking(transcript.ThinkingPart{
    Text:      "Let me search for that...",
    Signature: "provider-sig",
    Index:     0,
    Final:     true,
})
l.AppendText("I'll search the database.")
l.DeclareToolUse("tu-1", "search_db", map[string]any{"query": "status"})
l.FlushAssistant()

// Record user tool results
l.AppendUserToolResults([]transcript.ToolResultSpec{{
    ToolUseID: "tu-1",
    Content:   map[string]any{"results": []string{"item1", "item2"}},
    IsError:   false,
}})

// Build provider-ready messages
messages := l.BuildMessages()
```

**Nota:** La maggior parte degli utenti non ha bisogno di interagire direttamente con il libro mastro. Il runtime mantiene automaticamente il libro mastro attraverso la cattura e la ricostruzione degli eventi. Utilizzare l'API del libro mastro solo per scenari avanzati, come pianificatori personalizzati o strumenti di debug.

### Perché è importante

- **Riproduzione deterministica**: Gli eventi memorizzati possono ricostruire l'esatta trascrizione per il debugging, l'auditing o la ripetizione di turni falliti
- **Magazzino agnostico dei fornitori**: Il libro mastro memorizza parti JSON-friendly senza dipendenze dall'SDK del provider
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
- È possibile ricostruire le trascrizioni da `memory.Store` in qualsiasi momento per richiamare i modelli, alimentare le UI o eseguire analisi offline

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
