---
title: Set di strumenti
weight: 4
description: "Learn about toolset types, execution models, validation, retry hints, and tool catalogs in Goa-AI."
llm_optimized: true
aliases:
---

I set di strumenti sono raccolte di strumenti che gli agenti possono utilizzare. Goa-AI supporta diversi tipi di set di strumenti, ciascuno con diversi modelli di esecuzione e casi d'uso.

## Tipi di set di strumenti

### Set di strumenti di proprietà del servizio (supportati da metodi)

Dichiarati tramite `Toolset("name", func() { ... })`; gli strumenti possono `BindTo` metodi del servizio Goa o essere implementati da esecutori personalizzati.

- Codegen emette specifiche/tipi/codici per gli strumenti sotto `gen/<service>/toolsets/<toolset>/`
- Quando si usa il Registro interno degli strumenti, codegen emette anche `gen/<service>/toolsets/<toolset>/provider.go` per l'esecuzione lato servizio instradata dal registro
- Gli agenti che `Use` questi set di strumenti importano le specifiche del provider e ottengono costruttori di chiamate tipizzate e fabbriche di esecutori
- Le applicazioni registrano gli esecutori che decodificano gli argomenti tipizzati (tramite i codec forniti dal runtime), usano facoltativamente le trasformazioni, chiamano i client di servizio e restituiscono `ToolResult`

Se distribuisci il Registro interno degli strumenti per l'invocazione tra processi, il servizio proprietario esegue un loop provider che si sottoscrive a `toolset:<toolsetID>:requests` e pubblica i risultati su `result:<toolUseID>`. Vedi la documentazione del [Registro]({{< ref "/docs/2-goa-ai/registry.md" >}}) per lo snippet di cablaggio del provider.

### Set di strumenti implementati dagli agenti (Agent-as-Tool)

Definiti nel blocco `Export` di un agente e facoltativamente `Use`dagli altri agenti.

- La proprietà è ancora del servizio; l'agente è l'implementazione
- Codegen emette pacchetti di export lato fornitore sotto `gen/<service>/agents/<agent>/exports/<export>` con `NewRegistration` e costruttori di chiamate tipizzati
- Gli helper lato consumatore negli agenti che `Use` il toolset esportato delegano agli helper del fornitore mantenendo i metadati di routing centralizzati
- L'esecuzione avviene in linea; i payload sono passati come JSON canonico e decodificati solo al limite, se necessario per i prompt

### Set di strumenti MCP

Dichiarati tramite `Toolset(FromMCP(service, suite))` e referenziati tramite `Use(AssistantSuite)`.

- La registrazione generata imposta `DecodeInExecutor=true` in modo che il JSON grezzo sia passato all'esecutore MCP
- L'esecutore MCP decodifica utilizzando i propri codec
- I wrapper generati gestiscono schemi/encoder JSON e trasporti (HTTP/SSE/stdio) con tentativi e tracciamento

### Quando utilizzare BindTo rispetto alle implementazioni in linea

**Usare `BindTo` quando:**
- Lo strumento deve chiamare un metodo di servizio Goa esistente
- Si desidera generare trasformazioni tra i tipi di strumento e metodo
- Il metodo del servizio ha già la logica di business di cui si ha bisogno
- Si vuole riutilizzare la convalida e la gestione degli errori dal livello di servizio

```go
// Tool bound to existing service method
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Calls the Search method on the same service
})
```

**Usare le implementazioni inline quando:**
- Lo strumento ha una logica personalizzata non legata a un metodo del servizio
- È necessario orchestrare più chiamate al servizio
- Lo strumento è puramente computazionale (nessuna chiamata esterna)
- Si desidera il pieno controllo del flusso di esecuzione

```go
// Tool with custom executor implementation
Tool("summarize", "Summarize multiple documents", func() {
    Args(func() {
        Attribute("doc_ids", ArrayOf(String), "Document IDs to summarize")
        Required("doc_ids")
    })
    Return(func() {
        Attribute("summary", String, "Combined summary")
        Required("summary")
    })
    // No BindTo - implement in executor
})
```

Per le implementazioni inline, si scrive direttamente la logica dell'esecutore:

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case specs.Summarize:
        args, _ := specs.UnmarshalSummarizePayload(call.Payload)
        // Custom logic: fetch multiple docs, combine, summarize
        summary := e.summarizeDocuments(ctx, args.DocIDs)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: &specs.SummarizeResult{Summary: summary},
        }), nil
    }
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("unknown tool"),
    }), nil
}
```

### Schemi ed esempi degli strumenti generati

Goa-AI considera la specifica dello strumento generata come il contratto canonico
visibile al modello. Per ogni payload di strumento, codegen deriva JSON Schema
dall'attributo Goa e precalcola le proiezioni richieste dagli adattatori dei
provider:

- lo schema annotato, inclusi gli esempi JSON Schema dichiarati alla radice e nei
  campi
- lo stesso schema con solo l'`example` radice rimosso
- il JSON grezzo dell'esempio radice dichiarato e l'oggetto di input di esempio
  già analizzato

Solo un `Example(...)` Goa di livello superiore dichiarato sul payload dello
strumento diventa un esempio di strumento di livello superiore esposto al
provider. Gli esempi sintetizzati da Goa possono restare annotazioni di schema
annidate, ma non vengono promossi a esempi nativi del provider.

Gli adattatori scelgono la proiezione adatta al contratto del provider. Le
chiamate di strumenti in stile OpenAI possono consumare direttamente le
annotazioni dello schema. Anthropic diretto e Bedrock Claude inviano gli esempi
analizzati come `input_examples` nativi usando lo schema senza l'esempio radice;
Bedrock trasporta i campi Anthropic tramite `additionalModelRequestFields` quando
lo richiede il relativo contratto beta.

Se l'applicazione instrada le richieste modello tramite un servizio di inferenza
o un proxy, quel confine deve trasportare queste proiezioni insieme come
`model.ToolInputContract` neutrale rispetto al provider. Il confine non deve
importare il `tools.TypeSpec` riservato al generatore, serializzare di nuovo
schemi già decodificati o sapere quale provider consuma quale proiezione.
Eliminare lo schema senza esempio radice o l'input di esempio analizzato
impedisce agli adattatori del provider di inviare `input_examples` nativi, anche
se la specifica generata era corretta.

### Bounded Tool Results

Some tools naturally return large lists, graphs, or time-series windows. You can mark these as **bounded views** so that services remain responsible for trimming while the runtime enforces and surfaces the contract.

#### The agent.Bounds Contract

The `agent.Bounds` type describes how a tool result has been bounded relative to the full underlying data set. For paged tools, providers put their private cursor in `NextCursor`; the runtime projects a continuation reference for model-visible outputs.

```go
tipo Bounds struct {
    Returned int // Numero di elementi nella vista delimitata
    Total *int // Totale al meglio prima del troncamento (opzionale)
    Truncated bool // Se sono stati applicati dei tappi (lunghezza, finestra, profondità)
    NextCursor *string // Cursor privato del provider quando esiste un'altra pagina
    RefinementHint string // Guida su come restringere la query quando è troncata
}
```

| Field | Description |
|-------|-------------|
| `Returned` | Count of items actually present in the result |
| `Total` | Best-effort count of total items before truncation (nil if unknown) |
| `Truncated` | True if any caps were applied (pagination, depth limits, size limits) |
| `NextCursor` | Provider-owned cursor for the next page; the runtime exposes a continuation reference to models |
| `RefinementHint` | Human-readable guidance for narrowing the query (e.g., "Add a date filter to reduce results") |

#### Service Responsibility for Trimming

The runtime does not compute subsets or truncation itself—**services are responsible for**:

1. **Applying truncation logic**: Pagination, result limits, depth caps, time windows
2. **Populating bounds metadata**: Setting `Returned`, `Total`, `Truncated` accurately
3. **Setting provider cursors**: Put the private provider cursor in `Bounds.NextCursor` when another page exists
4. **Providing refinement hints**: Guiding users/models on how to narrow queries when results are truncated

This design keeps truncation logic where domain knowledge lives (in services) while providing a uniform contract for the runtime, planners, and UIs to consume.

#### Declaring Bounded Tools

Use the DSL helper `BoundedResult()` inside a `Tool` definition:

```go
Tool("list_devices", "Elenco dei dispositivi con paginazione", func() {
    Args(func() {
        Attributo("site_id", String, "Identificatore del sito")
        Attributo("stato", Stringa, "Filtrare per stato", func() {
            Enum("online", "offline", "sconosciuto")
        })
        Attributo("limite", Int, "Risultati massimi", func() {
            Predefinito(50)
            Massimo(500)
        })
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Dispositivi corrispondenti")
        Attribute("returned", Int, "Conteggio dei dispositivi restituiti")
        Attributo("total", Int, "Totale dispositivi corrispondenti")
        Attributo("troncato", Booleano, "I risultati sono stati troncati")
        Attributo("refinement_hint", Stringa, "Come restringere i risultati")
        Richiesto("dispositivi", "restituiti")
    })
    BoundedResult()
    BindTo("DeviceService", "ListDevices")
})
```

#### Code Generation

When a tool is marked with `BoundedResult()`:

- The generated tool spec includes `tools.ToolSpec.Bounds`
- The generated JSON result schema includes the canonical bounded fields (`returned`, `total`,
  `truncated`, `refinement_hint`, and optional `next_cursor`)
- `tools.ToolSpec.Bounds` stores model-facing JSON names. If the DSL names a
  lower-camel Goa attribute such as `NextCursor("nextCursor")`, codegen emits
  `NextCursorField: "next_cursor"` so schemas, runtime projection, and result
  codecs use one spelling.
- For cursor-paged tools, model-visible `next_cursor` is a runtime continuation
  reference; provider cursors remain private runtime state.
- The semantic Go result type stays domain-specific; it does not need to
  duplicate those fields

```go
spec.Bounds = &tools.BoundsSpec{
    Paging: &tools.PagingSpec{
        CursorField:     "cursor",
        NextCursorField: "next_cursor",
    }
}
```

#### Implementing Bounded Tools

Bounded tools are a hard contract: services implement truncation and populate bounds metadata on every successful code path.

**Contract:**

- `Returned` and `Truncated` must always be set.
- `Returned == 0` means “empty result” → `Total == 0` and `Truncated == false`.

Services implement truncation and populate bounds metadata:

```go
func (s *DeviceService) ListDevices(ctx context.Context, p *ListDevicesPayload) (*ListDevicesResult, error) {
    // Interrogazione con limite + 1 per rilevare il troncamento
    devices, err := s.repo.QueryDevices(ctx, p.SiteID, p.Status, p.Limit+1)
    se err := nil {
        return nil, err
    }
    
    // Determinare se i risultati sono stati troncati
    troncato := len(dispositivi) > p.Limite
    if truncated {
        devices = devices[:p.Limit] // Taglia al limite richiesto
    }
    
    // Ottenere il conteggio totale (opzionale, può essere costoso)
    total, _ := s.repo.CountDevices(ctx, p.SiteID, p.Status)
    
    // Costruire un suggerimento di raffinatezza quando viene troncato
    var hint stringa
    se troncato {
        hint = "Aggiungere un filtro di stato o ridurre l'ambito del sito per vedere meno risultati"
    }
    
    return &ElencoDispositiviRisultato{
        Dispositivi: dispositivi,
        Restituito: len(dispositivi),
        Totale: &totale,
        Troncato: troncato,
        RefinementHint: hint,
    }, nil
}
```

#### Runtime Behavior

When a bounded tool executes:

1. The runtime validates that a successful bounded tool returned `planner.ToolResult.Bounds`
2. The runtime merges those bounds into emitted JSON using the model-facing JSON field names generated from `BoundedResult(...)`
3. When `Bounds.NextCursor` is present, the runtime emits the producing `tool_call_id` as the model-visible `next_cursor` continuation reference
4. Stream subscribers and finalizers access model-visible bounds for UI display, logging, or policy decisions

```go
// In un sottoscrittore di flusso
func handleToolEnd(event *stream.ToolEnd) {
    if event.Bounds != nil && event.Bounds.Truncated {
        log.Printf("Lo strumento %s ha restituito %d di %d risultati (troncati)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if event.Bounds.RefinementHint != "" {
            log.Printf("Suggerimento: %s", event.Bounds.RefinementHint)
        }
    }
}
```

#### When to Use BoundedResult

Use `BoundedResult()` for tools that:
- Return paginated lists (devices, users, records, logs)
- Query large datasets with result limits
- Apply depth or size caps to nested structures (graphs, trees)
- Return time-windowed data (metrics, events)

The bounded contract helps:
- **Models** understand that results may be incomplete and can request refinement
- **UIs** display truncation indicators and pagination controls
- **Policies** enforce size limits and detect runaway queries

### Campi iniettati

La funzione DSL `Inject` marca campi specifici del payload come "iniettati": valori di infrastruttura lato server che sono nascosti al LLM e che il codice generato popola prima dell'esecuzione dello strumento. Utile per ID di sessione, ambito per tenant/famiglia (household) e altri valori forniti a runtime o dal chiamante.

#### Come funziona Inject

Quando marchi un campo con `Inject`, la generazione del codice lo risolve verso una di due fonti determinate in fase di generazione:

1. **Nascosto al LLM**: il campo è escluso dallo schema JSON e dall'elenco dei campi obbligatori visibile al modello
2. **Validato in fase di design**: il campo deve essere una `String` obbligatoria sul payload effettivo dello strumento (l'`Args()` esplicito se fornito, altrimenti il payload del metodo associato)
3. **Basato sui metadati o su un'etichetta**: un nome il cui Goify corrisponde a uno dei cinque campi fissi di `runtime.ToolCallMeta` (`run_id`/`runId`, `session_id`/`sessionId`, `turn_id`/`turnId`, `tool_call_id`/`toolCallId`, `parent_tool_call_id`/`parentToolCallId`) è **basato sui metadati** e si compila come una lettura diretta di tali metadati. Ogni altro nome è **basato su un'etichetta**: si compila come una ricerca nelle etichette dell'esecuzione (la chiave dell'etichetta è il nome del design testuale), applicando al valore dell'etichetta la validazione dichiarata dal campo stesso (`Pattern`, `Length`, enum, ...). Un campo basato su etichetta non può essere dichiarato su uno strumento `BindTo`, perché il protocollo del registro usato dagli strumenti associati e serviti dal registro non trasporta etichette dell'esecuzione
4. **Popolamento da parte dell'executor**: entrambe le topologie di esecuzione (gli executor locali in-process e il provider servito dal registro) chiamano la *stessa* funzione generata `Inject<Tool>` tra la decodifica e l'esecuzione, così il popolamento non diverge mai in base a dove viene eseguito lo strumento

#### Dichiarazione DSL

```go
Tool("get_user_data", "Get data for current user", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String), "Query results")
        Required("data")
    })
    BindTo("UserService", "GetData")
    Inject("session_id")  // basato sui metadati: nascosto al LLM, popolato a runtime
})
```

I campi basati su etichetta funzionano allo stesso modo, ma non sono nomi di `runtime.ToolCallMeta`:

```go
Tool("lookup_household", "Lookup scoped to a household", func() {
    Args(func() {
        Attribute("household_id", String, "Household to scope the search to.", func() {
            Pattern("^[a-z0-9-]+$")
        })
        Attribute("query", String, "Search query.")
        Required("household_id", "query")
    })
    Inject("household_id")  // basato su etichetta: impostato tramite WithLabels("household_id", ...)
})
```

Il chiamante fornisce i valori delle etichette avviando l'esecuzione con `runtime.WithLabels(...)`:

```go
out, err := client.Run(ctx, sessionID, messages,
    runtime.WithLabels(map[string]string{"household_id": "house-42"}),
)
```

I campi basati su etichetta di un toolset contribuiscono anche a un elenco `RequiredLabels` generato, aggregato per agente. `Runtime.Start`/`StartOneShot` validano le etichette fornite dal chiamante rispetto a questo elenco **prima** di pianificare qualsiasi workflow o attività, fallendo immediatamente e indicando in un unico errore tutte le chiavi mancanti. Questo controllo è un no-op per un processo che dispone solo di un client `Runtime.ClientFor(route)` di gateway/orchestrazione (senza registrazione locale dell'agente); in quella topologia, un'etichetta mancante viene rilevata solo più tardi, a ogni chiamata di strumento.

#### Codice generato

Gli esecutori generati per gli strumenti associati a metodi chiamano una funzione `Inject<Tool>` generata per ogni strumento che inietta (nel file `inject.go` del toolset, accanto ai suoi codec), che copia i campi basati sui metadati da `runtime.ToolCallMeta` e i campi basati su etichetta dalle etichette dell'esecuzione sul payload tipizzato:

```go
p, err := specs.InjectGetUserData(toolArgs, meta, labels)
```

I nomi dei campi iniettati supportati **non** sono un elenco fisso: qualsiasi nome che corrisponda a un campo di `runtime.ToolCallMeta` è basato sui metadati, e ogni altro nome è basato su un'etichetta.

#### Decodifica dei payload negli executor personalizzati

I `ToolCallExecutor` scritti a mano (per strumenti senza `BindTo`, registrati direttamente presso il runtime) non hanno alcun punto di dispatch generato che chiami `Inject<Tool>` al posto loro. Decodifica il payload di questi strumenti con la funzione `Decode<Tool>` generata dal toolset, anziché con il codec di payload grezzo:

```go
p, err := specs.DecodeLookupHousehold(call.Payload, meta, call.Labels)
if err != nil {
    // gestisci il fallimento di decodifica o iniezione (etichetta mancante/non valida, ecc.)
}
```

`Decode<Tool>` compone `<Tool>PayloadCodec.FromJSON` con `Inject<Tool>` in un'unica chiamata, così l'iniezione non può mai essere saltata silenziosamente. Decodificare con il solo codec lascerebbe i campi iniettati al loro valore zero di Go senza alcun errore, poiché il loro tag di wire è `json:"-"` (nascosto al modello) e non c'è alcun segnale di "chiave mancante".

#### Popolamento a runtime tramite interceptor generati

Gli esecutori di servizio generati espongono anche hook di interceptor tipizzati, indipendenti da `Inject()`. Usali per derivare campi del payload del metodo dal contesto della richiesta o da altro stato di runtime, in aggiunta a (o al posto di) campi iniettati dichiarati nel design:

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("session ID not found in context")
    }

    switch p := payload.(type) {
    case *userservice.GetDataPayload:
        p.SessionID = sessionID
    }
    return nil
}

exec := usertools.NewChatUserToolsExec(
    usertools.WithClient(userClient),
    usertools.WithInterceptors(&SessionInterceptor{}),
)
```

Gli interceptor registrati vengono eseguiti dopo la chiamata a `Inject<Tool>` generata, sul payload tipizzato già decodificato.

#### Quando usare Inject

Usa `Inject` per campi che:
- Sono richiesti dal servizio ma non dovrebbero essere scelti dal LLM
- Provengono dal contesto di runtime (sessione, ID di esecuzione/turno/chiamata) o da etichette dell'esecuzione fornite dal chiamante (tenant, famiglia, utente)
- Contengono valori sensibili (token di autenticazione, chiavi API)
- Sono aspetti infrastrutturali (ID di tracciamento, ID di correlazione)

---

## Execution Models

### Activity-Based Execution (Default)

Service-backed toolsets execute via Temporal activities (or equivalent in other engines):

1. Planner returns tool calls in `PlanResult` (payload is `json.RawMessage`)
2. Runtime schedules `ExecuteToolActivity` for each tool call
3. Activity decodes payload via generated codec for validation/hints
4. Calls the toolset registration's `Execute(ctx, planner.ToolRequest)` with canonical JSON
5. Re-encodes the result with the generated result codec

### Inline Execution (Agent-as-Tool)

Agent-as-tool toolsets execute inline from the planner's perspective while the runtime runs the provider agent as a real child run:

1. The runtime detects `Inline=true` on the toolset registration
2. It injects the `engine.WorkflowContext` into `ctx` so the toolset's `Execute` function can start the provider agent as a child workflow with its own `RunID`
3. It calls the toolset's `Execute(ctx, call)` with canonical JSON payload and tool metadata (including parent `RunID` and `ToolCallID`)
4. The generated agent-tool executor builds nested agent messages (system + user) from the tool payload and runs the provider agent as a child run
5. The nested agent executes a full plan/execute/resume loop in its own run; its `RunOutput` and tool events are aggregated into a parent `planner.ToolResult` that carries the result payload, aggregated telemetry, child `ChildrenCount`, and a `RunLink` pointing at the child run
6. Stream subscribers emit both `tool_start` / `tool_end` for the parent tool call and a `child_run_linked` link event so UIs can build nested agent cards while consuming a single session stream

### Materializzatori di risultati

I toolset possono registrare un materializzatore di risultati tipizzato:

```go
reg := runtime.ToolsetRegistration{
    Name: "chat.ask_question",
    Execute: runtime.ToolCallExecutorFunc(func(
        ctx context.Context,
        meta *runtime.ToolCallMeta,
        call *planner.ToolRequest,
    ) (*runtime.ToolExecutionResult, error) {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("externally provided"),
        }), nil
    }),
    Specs: []tools.ToolSpec{specs.SpecAskQuestion},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        // Allegare qui sidecar deterministici solo lato server.
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

Contratto:

- `ResultMaterializer` viene eseguito sia sul **percorso di esecuzione normale** sia sul **percorso di attesa con risultati forniti esternamente**.
- Riceve il `planner.ToolRequest` tipizzato originale insieme al `planner.ToolResult` tipizzato, prima che il runtime codifichi il JSON per hook, confini del workflow o chiamanti.
- Usarlo per allegare `result.ServerData` oppure per normalizzare in modo deterministico la forma semantica del risultato.
- Deve restare puro e deterministico; quando viene eseguito nel codice del workflow non deve fare I/O.

Questo è il punto canonico in cui derivare sidecar destinati solo agli osservatori a partire dal payload originale dello strumento e dal risultato tipizzato, mantenendo tali sidecar invisibili ai provider di modelli.

---

## Executor-First Model

Generated service toolsets expose a single, generic constructor:

```go
New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)
```

Applications register an executor implementation for each consumed toolset. The executor decides how to run the tool (service client, MCP, nested agent, etc.) and receives explicit per-call metadata via `ToolCallMeta`.

**Executor Example:**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name:  call.Name,
                Error: planner.NewToolError("invalid payload"),
            }), nil
        }
        
        // Trasformazioni opzionali se emesse da codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name:  call.Name,
                Error: planner.ToolErrorFromError(err),
            }), nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: tr,
        }), nil
        
    default:
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("unknown tool"),
        }), nil
    }
}
```

---

## Tool Call Metadata

Tool executors receive explicit per-call metadata via `ToolCallMeta` rather than fishing values from `context.Context`. This provides direct access to run-scoped identifiers for correlation, telemetry, and parent/child relationships.

### ToolCallMeta Fields

| Field | Description |
|-------|-------------|
| `RunID` | Durable workflow execution identifier of the run that owns this tool call. Stable across retries; used to correlate runtime records and telemetry. |
| `SessionID` | Logically groups related runs (e.g., a chat conversation). Services typically index memory and search attributes by session. |
| `TurnID` | Identifies the conversational turn that produced this tool call. Event streams use it to order and group events. |
| `ToolCallID` | Uniquely identifies this tool invocation. Used to correlate start/update/end events and parent/child relationships. |
| `ParentToolCallID` | Identifier of the parent tool call when this invocation is a child (e.g., a tool launched by an agent-tool). UIs and subscribers use it to reconstruct the call tree. |

### Executor Signature

All tool executors receive `ToolCallMeta` as an explicit parameter:

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    // Accedere al contesto di esecuzione direttamente da meta
    log.Printf("Esecuzione dello strumento nella corsa %s, sessione %s, turno %s",
        meta.RunID, meta.SessionID, meta.TurnID)
    
    // Utilizza ToolCallID per la correlazione
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    rinviare span.End()
    
    // ... implementazione dello strumento
}
```

### Why Explicit Metadata?

The explicit metadata pattern provides several benefits:

- **Type safety**: Compile-time guarantees that required identifiers are available
- **Testability**: Easy to construct test metadata without mocking context
- **Clarity**: No hidden dependencies on context keys or middleware ordering
- **Correlation**: Direct access to parent/child relationships for nested agent-tool calls
- **Traceability**: Complete causal chain from user input to tool execution to final response

---

## Async & Durable Execution
 
Goa-AI uses **Temporal Activities** for all service-backed tool executions. This "async-first" architecture is implicit and requires no special DSL.
 
### Implicit Async
 
When a planner decides to call a tool, the runtime does not block the OS thread. Instead:
 
1. The runtime schedules a **Temporal Activity** for the tool call.
2. The agent workflow suspends execution (saving state).
3. The activity executes (on a local worker, remote worker, or even a different cluster).
4. When the activity completes, the workflow wakes up, restores state, and resumes with the result.
 
This means **every tool call** is automatically parallelizable, durable, and long-running. You do **not** need to configure `InterruptsAllowed` for this standard async behavior.
 
### Pause & Resume (Agent-Level)
 
`InterruptsAllowed(true)` is distinct: it allows the **Agent itself** to pause and wait for an arbitrary external signal (like a user's clarification) that is *not* tied to a currently running tool activity.
 
| Feature | Implicit Async | Pause & Resume |
| :--- | :--- | :--- |
| **Scope** | Single Tool Execution | Entire Agent Workflow |
| **Trigger** | Calling any service-backed tool | Missing arguments or Planner request |
| **Policy Required** | None (Default) | `InterruptsAllowed(true)` |
| **Use Case** | Slow API, Batch Job, processing | Human-in-the-loop, Clarification |
 
Ensure you verify that your use case requires *agent-level* pausing before enabling the policy; often, standard tool async is sufficient.
 
### Non-Blocking Planners
 
From the perspective of the **planner (LLM)**, the interaction feels synchronous: the model requests a tool, "pauses", and then "sees" the result in the next turn.
 
From the perspective of the **infrastructure**, it is fully asynchronous and non-blocking. This allows a single small agent worker to manage thousands of concurrent long-running agent executions without running out of threads or memory.
 
### Survival Across Restarts
 
Because execution is durable, you can restart your entire backend—including the agent workers—while tools are mid-execution. When the systems come back up:
 
- Pending tool activities will be picked up by workers.
- Completed tools will report results to their parent workflows.
- Agents will resume exactly where they left off.
 
This capability is essential for building robust, production-grade agentic systems that operate reliably in dynamic environments.

---

## Transforms

When a tool is bound to a Goa method via `BindTo`, code generation analyzes the tool Arg/Return and the method Payload/Result. If the shapes are compatible, Goa emits type-safe transform helpers:

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

Transforms are emitted under the toolset owner package (for example `gen/<service>/toolsets/<toolset>/transforms.go`) and use Goa's GoTransform to safely map fields. If a transform isn't emitted, write an explicit mapper in the executor.

---

## Tool Identity

Each toolset defines typed tool identifiers (`tools.Ident`) for all generated tools—including non-exported toolsets. Prefer these constants over ad-hoc strings:

```go
import searchspecs "example.com/assistant/gen/orchestrator/toolsets/search"

// Usare una costante generata invece di stringhe/cast ad hoc
spec, _ := rt.ToolSpec(searchspecs.Search)
schemas, _ := rt.ToolSchema(searchspecs.Search)
```

For exported toolsets (agent-as-tool), Goa-AI generates export packages under `gen/<service>/agents/<agent>/exports/<export>` with:
- Typed tool IDs
- Alias payload/result types
- Codecs
- Helper builders (e.g., `New<Search>Call`)

---

## Tool Validation and Retry Hints

Goa-AI combines **Goa's design-time validations** with a **structured tool error model** to give LLM planners a powerful way to **repair invalid tool calls automatically**.

### Core Types: ToolError and RetryHint

**ToolError** (alias to `runtime/agent/toolerrors.ToolError`):
- `Message string` – human-readable summary
- `Cause *ToolError` – optional nested cause (preserves chains across retries and agent-as-tool hops)
- Constructors: `planner.NewToolError(msg)`, `planner.NewToolErrorWithCause(msg, cause)`, `planner.ToolErrorFromError(err)`, `planner.ToolErrorf(format, args...)`

**RetryHint** – planner-side hint used by the runtime and policy engine:

```go
type RetryHint struct {
    Motivo RetryReason
    Strumento tools.Ident
    RestrictToTool bool
    Campi mancanti []stringa
    ExampleInput map[string]any
    PriorInput map[string]any
    Stringa ClarifyingQuestion
    Messaggio stringa
}
```

Common `RetryReason` values:
- `invalid_arguments` – payload failed validation (schema/type)
- `missing_fields` – required fields are missing
- `malformed_response` – tool returned data that could not be decoded
- `timeout`, `rate_limited`, `tool_unavailable` – execution/infra issues

**ToolResult** carries errors and hints:

```go
tipo ToolResult struct {
    Nome tools.Ident
    Risultato qualsiasi
    Errore *ErroreStrumenti
    Suggerimento di riprova *RetryHint
    Telemetria *telemetria.ToolTelemetry
    ToolCallID stringa
    ChildrenCount int
    RunLink *run.Handle
}
```

### Auto-Repairing Invalid Tool Calls

The recommended pattern:

1. **Design tools with strong payload schemas** (Goa design)
2. **Let executors/tools surface validation failures** as `ToolError` + `RetryHint` instead of panicking or hiding errors
3. **Teach your planner** to inspect `ToolResult.Error` and `ToolResult.RetryHint`, repair the payload when possible, and retry the tool call if appropriate

**Example Executor:**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:         planner.RetryReasonInvalidArguments,
                Tool:           call.Name,
                RestrictToTool: true,
                Message:        "Payload did not match the expected schema.",
            },
        }), nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: res}), nil
}
```

**Example Planner Logic:**

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolOutputs) == 0 {
        return &planner.PlanResult{}, nil
    }

    last := in.ToolOutputs[len(in.ToolOutputs)-1]
    se last.Error := nil && last.RetryHint := nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            return &planner.PlanResult{
                Attesa: &planner.Await{
                    Chiarimento: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Domanda: hint.ClarifyingQuestion,
                        MissingFields: hint.MissingFields,
                        RestrictToTool: hint.Tool,
                        ExampleInput: hint.ExampleInput,
                        ClarifyingPrompt: hint.Message,
                    },
                },
            }, nil
        }
    }

    return &planner.PlanResult{/* FinalResponse, next ToolCalls, ... */}, nil
}
```

---

## Tool Catalogs and Schemas

Goa-AI agents generate a **single, authoritative catalog of tools** from your Goa designs. This catalog powers:
- Planner tool advertisement (which tools the model can call)
- UI discovery (tool lists, categories, schemas)
- External orchestrators (MCP, custom frontends) that need machine-readable specs

### Generated Specs and tool_schemas.json

For each agent, Goa-AI emits a **specs package** and a **JSON catalog**:

**Specs packages (`gen/<service>/agents/<agent>/specs/...`):**
- `types.go` – payload/result Go structs
- `codecs.go` – JSON codecs (encode/decode typed payloads/results)
- `specs.go` – `[]tools.ToolSpec` entries with canonical tool ID, payload/result schemas, hints

**JSON catalog (`tool_schemas.json`):**

Location: `gen/<service>/agents/<agent>/specs/tool_schemas.json`

Contains one entry per tool with:
- `id` – canonical tool ID (`"<service>.<toolset>.<tool>"`)
- `service`, `toolset`, `title`, `description`, `tags`
- `payload.schema` and `result.schema` (JSON Schema)

This JSON file is ideal for feeding schemas to LLM providers, building UI forms/editors, and offline documentation tooling.

### Runtime Introspection APIs

At runtime, you do not need to read `tool_schemas.json` from disk. The runtime exposes an introspection API:

```go
agents := rt.ListAgents() // []agent.Ident
toolset := rt.ListToolsets() // []stringa

spec, ok := rt.ToolSpec(toolID) // singolo ToolSpec
schemas, ok := rt.ToolSchema(toolID) // schemi di payload/risultato
specs := rt.ToolSpecsForAgent(chat.AgentID) // []ToolSpec per un agente
```

Where `toolID` is a typed `tools.Ident` constant from a generated specs or agenttools package.

### Server Data e artefatti UI

Alcuni tool devono restituire **output ricco orientato agli osservatori** (serie temporali complete, grafi di topologia, grandi set di risultati) utile per UI e audit, ma troppo pesante per i provider di modelli. Goa-AI modella tutto l'output non rivolto al modello come **server-data**. I server-data opzionali possono essere proiettati in **artefatti UI**.

#### Risultato per il modello vs server-data

La distinzione principale e dove scorrono i dati:

| Tipo di dato | Inviato al modello | Salvato/streaming | Scopo |
|-----------|---------------|-----------------|---------|
| **Risultato per il modello** | ✓ | ✓ | Riassunto delimitato su cui ragiona il LLM |
| **Server-data opzionale (artefatti UI)** | ✗ | ✓ | Dati ad alta fedelta per UI, audit e consumer a valle |
| **Server-data always-on** | ✗ | ✓ | Metadati solo server per persistenza/telemetria (mai come output UI opzionale) |

Questa separazione permette di:
- Mantenere la finestra di contesto del modello delimitata e focalizzata
- Fornire visualizzazioni ricche (grafici, tabelle, mappe) senza gonfiare i prompt del LLM
- Allegare dati di provenance e audit che il modello non deve vedere
- Streammare grandi dataset alle UI mentre il modello lavora su riassunti

#### Dichiarare ServerData nel DSL

Usa `ServerData(kind, schema)` dentro la definizione di `Tool`:

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    // Model-facing result: bounded summary
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    // Server-data: full-fidelity data for observers (e.g., UIs)
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    }, func() {
        AudienceTimeline()
    })
})
```

Il parametro `kind` (ad esempio `"atlas.time_series"`) identifica il tipo di server-data cosi le UI possono instradare il renderer corretto.
L'audience dichiara l'intento di routing:

- `AudienceTimeline()` per payload orientati a osservatori in timeline/UI.
- `AudienceEvidence()` per provenienza o evidenza di audit.
- `AudienceInternal()` per payload di composizione solo lato server.

Usa `FromMethodResultField("field_name")` con strumenti `BindTo(...)` quando
il payload server-data viene proiettato da un campo del risultato del metodo di
servizio collegato.

#### Specs e helper generati

Nei package specs, ogni entry `tools.ToolSpec` include:
- `Payload tools.TypeSpec` – schema di input del tool
- `Result tools.TypeSpec` – schema di output orientato al modello
- `ServerData []*tools.ServerDataSpec` – payload solo-server emessi insieme al risultato

Le entry server-data includono schemi e codec generati, cosi i subscriber
possono decodificare byte JSON canonici senza inviarli ai provider di modelli.

#### Pattern d'uso runtime

**Negli esecutori dei tool**, allega JSON canonico server-data al risultato:

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)

    // Fetch full data
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    // Build bounded model-facing result
    result := &specs.GetTimeSeriesResult{
        Summary:  fmt.Sprintf("Retrieved %d data points from %s to %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count:    len(fullData.Points),
        MinValue: fullData.Min,
        MaxValue: fullData.Max,
    }

    // Build full-fidelity server-data for UIs
    // Generated server-data codecs are named from the tool and kind, for example:
    // specs.GetTimeSeriesAtlasTimeSeriesServerDataCodec.ToJSON(...)
    serverData, err := buildCanonicalServerData("atlas.time_series", fullData)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name:   call.Name,
        Result: result,
        ServerData: serverData,
    }), nil
}
```

I tool basati su metodi possono anche allegare server-data tramite provider
generati e result materializer. Un materializer e deterministico e viene
eseguito sia nel percorso normale sia nel percorso await con risultato fornito
dall'esterno:

```go
reg := runtime.ToolsetRegistration{
    Name:  "orchestrator.metrics",
    Specs: []tools.ToolSpec{specs.SpecGetTimeSeries},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        if len(result.ServerData) != 0 {
            return nil
        }
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

**Nei subscriber stream o handler UI**, leggi `ServerData` dagli eventi tool end
o dai run log e decodificalo con i codec generati per i kind dichiarati:

```go
func handleToolEnd(event stream.ToolEnd) {
    if len(event.Data.ServerData) == 0 {
        return
    }
    data, err := decodeTimeSeriesServerData(event.Data.ServerData)
    if err != nil {
        log.Printf("invalid server-data: %v", err)
        return
    }
    renderTimeSeriesChart(data.DataPoints)
}
```

#### Quando usare ServerData

Utilizzare server-data quando:
- I risultati dello strumento includono dati troppo grandi per il contesto del modello (serie temporali, log, tabelle di grandi dimensioni)
- Le interfacce utente hanno bisogno di dati strutturati per la visualizzazione (grafici, diagrammi, mappe)
- Si vuole separare ciò che il modello ragiona da ciò che gli utenti vedono
- I sistemi a valle hanno bisogno di dati a piena fedeltà, mentre il modello lavora con sintesi

Evitare server-data quando:
- Il risultato completo si inserisce comodamente nel contesto del modello
- Non c'è un'interfaccia utente o un utente a valle che abbia bisogno dei dati completi
- Il risultato delimitato contiene già tutto ciò che serve

---

## Migliori pratiche

- **Inserire le convalide nella progettazione, non nei progettisti** - Usare il DSL degli attributi di Goa (`Required`, `MinLength`, `Enum`, ecc.)
- **Restituire ToolError + RetryHint dagli esecutori** - Preferire gli errori strutturati ai panici o ai semplici ritorni `error`
- **Mantenere i suggerimenti concisi ma perseguibili** - Concentrarsi sui campi mancanti/invalidi, su una breve domanda chiarificatrice e su una piccola mappa `ExampleInput`
- **Insegnare ai pianificatori a leggere i suggerimenti** - Rendere la gestione di `RetryHint` una parte di prima classe del vostro pianificatore
- **Evitare la riconvalida all'interno dei servizi** - Goa-AI presume che la convalida avvenga al confine con lo strumento

---

## Prossimi passi

- **[Composizione di agenti](./agent-composition.md)** - Costruire sistemi complessi con modelli di agenti come strumenti
- **[Integrazione MCP](./mcp-integration.md)** - Connettersi a server di strumenti esterni
- **[Runtime](./runtime.md)** - Comprendere il flusso di esecuzione degli strumenti
