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
    rt := runtime.New()
    ctx := context.Background()
    
    // Register agent with test planner
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &TestPlanner{},
    })
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

### Test dei pianificatori con i client del modello Mock

Isolare la logica del pianificatore prendendo in giro il client del modello:

```go
type MockModelClient struct {
    responses []*model.Message
    callCount int
}

func (m *MockModelClient) Generate(ctx context.Context, req *model.Request) (*model.Response, error) {
    if m.callCount >= len(m.responses) {
        return nil, fmt.Errorf("no more mock responses")
    }
    resp := &model.Response{
        Message: m.responses[m.callCount],
    }
    m.callCount++
    return resp, nil
}

func (m *MockModelClient) Stream(ctx context.Context, req *model.Request) (model.Streamer, error) {
    // Return a mock streamer for streaming tests
    return &MockStreamer{response: m.responses[m.callCount]}, nil
}

func TestPlannerWithMockClient(t *testing.T) {
    mockClient := &MockModelClient{
        responses: []*model.Message{
            {
                Role: model.ConversationRoleAssistant,
                Parts: []model.Part{
                    model.TextPart{Text: "I'll search for that."},
                    model.ToolUsePart{
                        ID:    "call-1",
                        Name:  "search",
                        Input: json.RawMessage(`{"query": "test"}`),
                    },
                },
            },
        },
    }
    
    planner := &MyPlanner{client: mockClient}
    
    input := &planner.PlanInput{
        Messages: []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Search for test"}},
        }},
        Tools: []tools.ToolSpec{/* ... */},
    }
    
    result, err := planner.PlanStart(context.Background(), input)
    require.NoError(t, err)
    
    // Assert planner returned tool calls
    assert.NotNil(t, result.ToolCalls)
    assert.Len(t, result.ToolCalls, 1)
    assert.Equal(t, "search", string(result.ToolCalls[0].Name))
}
```

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
    
    call := &planner.ToolRequest{
        Name:    specs.Search,
        Payload: json.RawMessage(`{"query": "test", "limit": 5}`),
    }
    
    // Execute tool
    result, err := executor.Execute(context.Background(), meta, call)
    require.NoError(t, err)
    
    // Assert on result
    assert.Nil(t, result.Error)
    assert.NotNil(t, result.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Convalida degli strumenti di test e suggerimenti per i tentativi di risposta

Verificare che gli strumenti restituiscano errori e suggerimenti corretti in caso di input non validi:

```go
func TestToolValidationReturnsHint(t *testing.T) {
    executor := &SearchExecutor{}
    
    // Invalid payload - missing required field
    call := &planner.ToolRequest{
        Name:    specs.Search,
        Payload: json.RawMessage(`{"limit": 5}`), // missing "query"
    }
    
    result, err := executor.Execute(context.Background(), &runtime.ToolCallMeta{}, call)
    require.NoError(t, err) // Executor should not return error
    
    // Should return ToolError with RetryHint
    assert.NotNil(t, result.Error)
    assert.NotNil(t, result.RetryHint)
    assert.Equal(t, planner.RetryReasonMissingFields, result.RetryHint.Reason)
    assert.Contains(t, result.RetryHint.MissingFields, "query")
}
```

### Verifica della composizione dell'agente

Testare gli scenari dell'agente come strumento:

```go
func TestAgentComposition(t *testing.T) {
    rt := runtime.New()
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
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then start runs
client := chat.NewClient(rt)
out, err := client.Run(ctx, messages, opts...)
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
out, err := client.Run(ctx, "session-123", messages)
```

**Suggerimento:** Per i test, utilizzare un ID di sessione fisso. Per la produzione, generare ID di sessione unici per ogni conversazione.

#### Errori di violazione dei criteri

**Sintomo:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Cause:** L'agente ha superato il limite configurato `MaxToolCalls`.

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

**Sintomo:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Causa:** Più chiamate consecutive allo strumento non sono andate a buon fine.

**Soluzioni:**

1. **Correggere gli errori dello strumento sottostante** - controllare i log dell'esecutore dello strumento
2. **Migliorare i suggerimenti per i tentativi** in modo che il pianificatore possa autocorreggersi
3. **Aumentare il limite** se si prevedono fallimenti transitori:
```go
RunPolicy(func() {
    DefaultCaps(MaxConsecutiveFailedToolCalls(5))
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

1. **Restituire un RetryHint** dall'esecutore in modo che il pianificatore possa autocorreggersi:
```go
if err != nil {
    return &planner.ToolResult{
        Error: planner.NewToolError("invalid payload"),
        RetryHint: &planner.RetryHint{
            Reason:       planner.RetryReasonInvalidArguments,
            Tool:         call.Name,
            ExampleInput: map[string]any{"query": "example", "limit": 10},
            Message:      "limit must be an integer",
        },
    }, nil
}
```

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
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### Sottoscrivere gli eventi per il debug

```go
type DebugSink struct{}

func (s *DebugSink) Receive(event stream.Event) error {
    fmt.Printf("[%s] %T: %+v\n", time.Now().Format(time.RFC3339), event, event)
    return nil
}

// Subscribe to run events
stop, err := rt.SubscribeRun(ctx, runID, &DebugSink{})
defer stop()
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
