---
title: Test e risoluzione dei problemi
weight: 9
description: "Learn how to test agents, planners, and tools, and troubleshoot common issues."
llm_optimized: true
---

Questa guida illustra le strategie di test per gli agenti Goa-AI e le soluzioni ai problemi più comuni.

## Test degli agenti

### Test con il motore in memoria

Il motore in-memory è ideale per i test perché:
- Non richiede dipendenze esterne (no Temporal)
- Esegue in modo sincrono per un comportamento prevedibile nei test
- Fornisce un feedback rapido durante lo sviluppo

```go
func TestChatAgent(t *testing.T) {
    // Create runtime with in-memory engine (default)
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    
    // Register agent with test planner
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &TestPlanner{},
    })
    require.NoError(t, err)

    _, err = store.CreateSession(ctx, "test-session", time.Now().UTC())
    require.NoError(t, err)
    
    // Run agent
    client := chat.NewClient(rt)
    out, err := client.Run(
        ctx,
        "test-session",
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Hello"}},
        }},
    )
    require.NoError(t, err)
    
    // Assert on output
    assert.NotEmpty(t, out.RunID)
    assert.NotNil(t, out.Final)
}
```

### Test dei planner con provider fittizi

`model.Client` appartiene al framework e i test double dell'applicazione non
possono implementarlo. Implementare `model.Provider`, quindi costruire lo
stesso client validato usato in produzione:

```go
type FakeProvider struct {
    response *model.Response
}

func (p *FakeProvider) Complete(context.Context, *model.Request) (*model.Response, error) {
    return p.response, nil
}

func (p *FakeProvider) Stream(context.Context, *model.Request) (model.Streamer, error) {
    return nil, model.ErrStreamingUnsupported
}

func TestValidatedModelResponse(t *testing.T) {
    provider := &FakeProvider{response: &model.Response{
        Content: []model.Message{{
            Role: model.ConversationRoleAssistant,
            Parts: []model.Part{model.TextPart{Text: "Hello."}},
        }},
        StopReason: "stop",
    }}
    client, err := model.NewClient(provider)
    require.NoError(t, err)

    resp, err := client.Complete(context.Background(), &model.Request{
        Messages: []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Hello"}},
        }},
    })
    require.NoError(t, err)
    assert.Len(t, resp.Content, 1)
}
```

Nei test unitari del planner che non richiedono la validazione del modello,
iniettare direttamente input deterministici e richieste tipizzate. Usare un
provider fittizio quando il test deve provare validazione della richiesta,
decodifica dei payload, limiti dell'output o terminazione dello stream.

I test diretti dei pianificatori forniscono `PrepareMessages` e verificano che
gli errori di preparazione vengano restituiti. Per provare che il runtime applica
la policy una sola volta e rifiuta un errore ignorato, usare il runtime reale;
vedi il [contratto di preparazione](../runtime/#preparing-conversation-messages).

I provider fittizi per lo streaming devono emettere una sequenza completa e
valida, poi restituire `io.EOF`; solo allora
`ValidatedStream.Response()` espone la risposta accettata. I test delle
completion generate devono verificare `planner.OutputContractError` e una
risposta nil quando l'output viola il codec generato.

### Strumenti di test in isolamento

Testare gli esecutori degli strumenti indipendentemente dall'agente:

```go
func TestSearchToolExecutor(t *testing.T) {
    // Create executor with mock dependencies
    mockSearchService := &MockSearchService{
        results: []string{"doc1", "doc2", "doc3"},
    }
    executor := &SearchExecutor{searchService: mockSearchService}
    
    // Create test tool call
    meta := &runtime.ToolCallMeta{
        RunID:      "test-run",
        SessionID:  "test-session",
        TurnID:     "test-turn",
        ToolCallID: "call-1",
    }
    
    request, err := planner.NewToolRequest(specs.SearchTool(), &specs.SearchPayload{
        Query: "test",
        Limit: 5,
    })
    require.NoError(t, err)

    // Executors run after validation and execution-ID assignment. Build the
    // runtime call from the valid bytes produced by the generated descriptor.
    call := &runtime.ToolCall{
        Name:       request.Name,
        Payload:    request.Payload,
        RunID:      meta.RunID,
        SessionID:  meta.SessionID,
        TurnID:     meta.TurnID,
        ToolCallID: meta.ToolCallID,
    }
    
    // Execute tool
    result, err := executor.Execute(context.Background(), meta, call)
    require.NoError(t, err)
    require.NotNil(t, result.ToolResult)
    
    // Assert on result
    assert.Nil(t, result.ToolResult.Failure)
    assert.NotNil(t, result.ToolResult.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.ToolResult.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Test della validazione e del recupero degli strumenti

Testare il JSON esterno malformato al confine del codec generato. Le chiamate
del modello non valide vengono rifiutate prima di raggiungere planner o
executor:

```go
func TestSearchPayloadRequiresQuery(t *testing.T) {
    _, err := specs.SearchTool().Payload.FromJSON(
        rawjson.Message(`{"limit":5}`),
    )
    require.Error(t, err)

    var validationErr *tools.ValidationError
    require.ErrorAs(t, err, &validationErr)
    assert.Equal(t, "query", validationErr.Issues()[0].Field)
}
```

I test diretti degli executor devono creare un `planner.ToolRequest` valido
con il descrittore tipizzato generato, quindi costruire un `runtime.ToolCall`
usando nome e payload canonico e assegnare gli ID di esecuzione che il runtime
aggiungerebbe. Verificare gli errori di dominio o del provider tramite
`ToolResult.Failure.Kind`, `Failure.Error` e `Failure.Recovery`.

### Verifica della composizione dell'agente

Testare gli scenari dell'agente come strumento:

```go
func TestAgentComposition(t *testing.T) {
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    
    // Register provider agent
    err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    })
    require.NoError(t, err)
    
    // Register consumer agent that uses provider's tools
    err = orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    })
    require.NoError(t, err)

    _, err = store.CreateSession(ctx, "test-session", time.Now().UTC())
    require.NoError(t, err)
    
    // Run orchestrator - it should invoke planner agent as a tool
    client := orchestrator.NewClient(rt)
    out, err := client.Run(
        ctx,
        "test-session",
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Create a plan for X"}},
        }},
    )
    require.NoError(t, err)
    
    // Verify child run was created
    assert.Greater(t, out.ChildrenCount, 0)
}
```

### Test dell’archiviazione del runtime

Usa `runtime/agent/storage/inmem` per i test di pianificatori e workflow. Verifica un’implementazione di produzione duratura rispetto allo stesso contratto, inclusi questi casi:

- gli avvii radice, figlio e one-shot senza sessione salvano insieme i metadati e i primi record;
- le nuove chiamate a `StartChildRun` e `StartOneShotChildRun` richiedono un padre attivo e salvano il collegamento al padre nella stessa operazione dell'avvio del figlio;
- un retry identico di uno di questi avvii già accettati resta valido dopo l'arresto del padre, mentre un retry modificato o un nuovo figlio vengono rifiutati;
- un nuovo tentativo identico restituisce l’identificatore del record originale e segnala che non è stato inserito un nuovo record;
- ripetere un cambiamento del ciclo di vita con un record diverso produce un conflitto, anche quando stato e altri campi non cambiano;
- cambiare un valore fissato dalla prima scrittura restituisce un conflitto;
- una chiamata esplicita a `CancelRun` accettata da un workflow attivo salva
  insieme il primo motivo e il record `storage.CancellationRecordType`
  corrispondente; il suo tipo serializzato è `runtime.cancellation_intent`. Un
  retry identico riesce e un motivo successivo diverso produce un conflitto;
- l'avvio di un'esecuzione con una sessione già terminata salva
  `session_ended` con il record terminale annullato e senza alcun record
  `storage.CancellationRecordType`;
- un annullamento avviato dal motore lascia vuoto il motivo salvato e non ha un
  record `storage.CancellationRecordType`, mentre il record terminale contiene
  `engine_canceled`;
- la sospensione salva insieme checkpoint, stato sospeso e record corrispondente;
- il completamento salva insieme stato finale e record corrispondente;
- l'avvio di una continuazione richiede un'esecuzione precedente sospesa che
  esista e abbia la stessa sessione, lo stesso agente e la stessa esecuzione padre;
- una continuazione non corrispondente non scrive né l'avvio del successore né
  un collegamento al padre, mentre un successore accettato conserva
  `PredecessorRunID` in `RunStarted`, non in `RunMeta`;
- una sessione terminata impedisce il lavoro di pianificatore e strumenti, ma registra come annullato un workflow già accettato;
- l’eliminazione fallisce mentre è attiva un’esecuzione e, al termine di tutte le esecuzioni, rimuove metadati, checkpoint e record della sessione terminata.

Questi test dello storage devono eseguire le transazioni reali del database. Un
mock che controlla solo le chiamate ai metodi non può dimostrare che stato e
record diventino visibili insieme.

Verifica separatamente l'adattatore Temporal: la chiusura di un workflow padre
deve terminare il workflow figlio.

Verifica separatamente i comandi espliciti del runtime per consegnare il
completamento:

- `EnsureRunCompletion` salva il risultato mancante di un'esecuzione attiva e
  convalida e riconsegna un risultato già salvato senza cambiarlo;
- il collegamento di un figlio viene consegnato prima del suo evento finale,
  mentre `EnsureChildRunLink` consegna soltanto l'esatto collegamento salvato;
- una sessione attiva senza `Runtime.WithStream` non riesce, mentre una sessione
  appena rilevata come terminata conserva il risultato salvato e ne sopprime la
  consegna;
- `LoadSessionStatus` restituisce lo stato corrente della sessione, mentre
  `EnsureRunCompletion` usa il `SessionStatus` restituito insieme alla scrittura
  del record finale o al suo tentativo identico e conserva quello stato durante
  i tentativi di consegna allo stream;
- un evento accettato mentre la sessione è attiva resta da consegnare se la
  sessione termina durante quella chiamata di consegna;
- un workflow ancora attivo nel motore restituisce `ErrRunCompletionNotReady`,
  mentre dati malformati o contraddittori del motore o dello storage
  restituiscono `ErrRunCompletionCorrupt`.

Verifica separatamente il codec degli hook: i decoder di `RunStarted`,
`RunSuspended`, `RunCompleted` e `ChildRunLinked` devono rifiutare `null`, i
campi sconosciuti e un secondo valore JSON finale.

I test delle continuazioni devono accettare `goa-ai.run-suspension.v8` e
rifiutare tutte le versioni precedenti prima di ripristinare i payload o
chiamare il planner.
Per un piano di recupero che attende un input, verificare che la continuazione
conservi tutte le alternative annunciate, non solo lo strumento fallito.
Verificare inoltre che la definizione attuale dell'agente e la policy di
esecuzione rifiutino gli strumenti rimossi, in conflitto o negati prima della
pianificazione; le scelte salvate non concedono autorizzazioni permanenti.
Conservare test positivi per le alternative consentite, le continuazioni delle
query incompiute, la correzione forzata limitata agli strumenti terminali e la
sintesi senza strumenti. Questi test di contratto provano quali azioni sono
lecite, non la qualità della scelta di un modello reale.

---

## Risoluzione dei problemi

### Errori comuni

#### Errore "registrazione chiusa

**Sintomo:**
```
error: registration closed: cannot register agent after runtime start
```

**Causa:** Tentativo di registrare un agente dopo che il runtime ha iniziato l'elaborazione delle esecuzioni.

**Soluzione:** Registrare tutti gli agenti prima di avviare qualsiasi esecuzione:

```go
store := storageinmem.New()
rt := runtime.New(store)

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then create a session and start runs
client := chat.NewClient(rt)
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages, opts...)
```

#### Errore "ID sessione mancante

**Sintomo:**
```
error: missing session ID: session ID is required for run
```

**Causa:** Avvio di un'esecuzione senza fornire un ID di sessione.

**Soluzione:** Fornire sempre un ID di sessione come argomento posizionale richiesto:

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages)
```

**Suggerimento:** Per i test, utilizzare un ID di sessione fisso. Per la produzione, generare ID di sessione unici per ogni conversazione.

#### Errori di violazione dei criteri

**Sintomo:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Cause:** L'agente ha superato il limite configurato `MaxToolCalls` per gli strumenti *con budget*. Gli strumenti dichiarati `Bookkeeping()` non consumano questo cap.

**Soluzioni:**

1. **Aumentare il limite** se il caso d'uso richiede legittimamente più chiamate allo strumento:
```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **Migliorare l'efficienza del pianificatore** per utilizzare meno chiamate agli strumenti:
   - Operazioni in batch, se possibile
   - Utilizzare chiamate di utensili più specifiche
   - Migliorare la tempestività della progettazione

3. **Controllare i loop infiniti** nella logica del pianificatore che richiama ripetutamente lo stesso strumento.

4. **Esentare i record di controllo strutturati dai budget di retrieval e di errori** dichiarandoli `Bookkeeping()` nel DSL. Marker di stato e dichiarazioni di transizione appartengono a questa categoria; i risultati di lookup il cui successo deve pianificare altro ragionamento no. Un batch misto prodotto dal modello resta atomico ed è rifiutato interamente se le chiamate con budget non rientrano. Per un commit terminale usa solo `TerminalRun()`: gli strumenti terminali diventano automaticamente bookkeeping e possono essere ammessi dopo l'esaurimento del budget.

**Sintomo:**
```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**Causa:** Il planner ha emesso solo strumenti di bookkeeping. Chiamate e risultati restano nella trascrizione del provider, ma i risultati riusciti non attivano un altro `PlanResume` e non entrano nei futuri `ToolOutputs` tipizzati. Lo stesso turno deve quindi risolversi in modo terminale oppure attendere input.

**Soluzioni:**

1. **Concludi nello stesso turno** con `TerminalRun()`, `FinalResponse` o `FinalToolResult` quando il batch bookkeeping è già terminale.
2. **Metti esplicitamente in pausa** con una handshake di attesa/pausa se il run sta aspettando input umano o esterno.
3. **Sposta lo stato del turno successivo in un input esplicito del planner** invece di dipendere da un risultato bookkeeping riuscito per riprendere la pianificazione.

**Sintomo:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Causa:** Più chiamate consecutive allo strumento non sono andate a buon fine.

**Soluzioni:**

1. **Correggere gli errori dello strumento sottostante** - controllare i log dell'esecutore dello strumento
2. **Correggere il contratto strutturato dell'errore** affinché `Failure.Recovery` fornisca al planner l'azione corretta e prove esatte per la correzione
3. **Aumentare il limite** se si prevedono fallimenti transitori:
```go
RunPolicy(func() {
    DefaultCaps(MaxRecoveryTurns(5))
})
```

**Sintomo:**
```
error: policy violation: time budget exceeded (2m0s)
```

**Causa:** L'esecuzione dell'agente ha superato il valore configurato `TimeBudget`.

**Soluzioni:**

1. **Aumentare il budget** per le operazioni di lunga durata:
```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **Usare `Timing` per un controllo a grana fine**:
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. **Ottimizzare l'esecuzione degli strumenti** per completarli più velocemente.

#### Errore "strumento sconosciuto

**Sintomo:**
```
error: unknown tool: orchestrator.helpers.search
```

**Causa:** Il pianificatore ha richiesto uno strumento non registrato.

**Soluzioni:**

1. **Verificare la registrazione del set di strumenti** - assicurarsi che il set di strumenti sia registrato presso l'agente:
```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **Controllo dell'ortografia dei nomi degli strumenti** - i nomi degli strumenti sono sensibili alle maiuscole e minuscole e utilizzano nomi qualificati.

3. **Regenerare il codice** dopo le modifiche al DSL:
```bash
goa gen example.com/project/design
```

#### Errore "carico utile non valido

**Sintomo:**
```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**Causa:** L'LLM ha fornito un payload che non corrisponde allo schema dello strumento.

**Soluzioni:**

1. **Testare il codec generato** affinché il confine riporti problemi precisi
dei campi:
```go
_, err := specs.SearchTool().Payload.FromJSON(
    rawjson.Message(`{"query":"example","limit":"ten"}`),
)
var validationErr *tools.ValidationError
require.ErrorAs(t, err, &validationErr)
assert.Equal(t, "invalid_field_type", validationErr.Issues()[0].Constraint)
```

Quando un provider emette questo payload, il client del modello validato
restituisce `model.OutputValidationError`. Il planner/runtime lo espone come
`planner.OutputContractError` prima che venga eseguito il codice
dell'executor o del servizio. Usare `errors.As` per verificare l'errore
strutturato al confine del test; non viene registrato alcun `ToolFailure`.

Testare `RecoveryCorrectCall` separatamente con una chiamata prodotta dal
modello che supera la validazione dello schema e il cui executor o confine di
dominio restituisce un `ToolFailure` recuperabile.

2. **Migliorare le descrizioni degli strumenti** per chiarire i tipi previsti.

3. **Aggiungere esempi** al DSL:
```go
Args(func() {
    Attribute("limit", Int, "Maximum results", func() {
        Example(10)
        Minimum(1)
        Maximum(100)
    })
})
```

### Suggerimenti per il debug

#### Abilitare la registrazione del debug

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    storageinmem.New(),
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### Sottoscrivere gli eventi per il debug

```go
type DebugSink struct{}

func (s *DebugSink) Send(ctx context.Context, event stream.Event) error {
    fmt.Printf("[%s] %s run=%s session=%s payload=%v\n",
        time.Now().Format(time.RFC3339),
        event.Type(),
        event.RunID(),
        event.SessionID(),
        event.Payload(),
    )
    return nil
}

func (s *DebugSink) Close(ctx context.Context) error { return nil }

// Wire the sink into the runtime to observe all stream events.
rt := runtime.New(storageinmem.New(), runtime.WithStream(&DebugSink{}))
```

#### Ispezionare le specifiche dello strumento in fase di esecuzione

```go
// List all registered tools
for _, spec := range rt.ToolSpecsForAgent(chat.AgentID) {
    fmt.Printf("Tool: %s\n", spec.Name)
    fmt.Printf("  Description: %s\n", spec.Description)
    fmt.Printf("  Payload Schema: %s\n", spec.Payload.Schema)
}
```

---

## Passi successivi

- **[Riferimento DSL](./dsl-reference/)** - Riferimenti completi alle funzioni DSL
- **[Runtime](./runtime/)** - Comprendere l'architettura di runtime
- **[Produzione](./production/)** - Distribuzione con UI temporale e streaming
