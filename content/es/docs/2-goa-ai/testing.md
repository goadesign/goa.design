---
title: Pruebas y resolución de problemas
weight: 9
description: "Learn how to test agents, planners, and tools, and troubleshoot common issues."
llm_optimized: true
---

Esta guía cubre estrategias de prueba para agentes Goa-AI y soluciones a problemas comunes.

## Agentes de pruebas

### Pruebas con el motor en memoria

El motor en memoria es ideal para pruebas porque
- No requiere dependencias externas (no Temporal)
- Se ejecuta de forma sincrónica para que el comportamiento de las pruebas sea predecible
- Proporciona información rápida durante el desarrollo

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

### Planificadores de pruebas con clientes modelo simulados

Aísla la lógica del planificador simulando el cliente modelo:

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

### Herramientas de prueba en aislamiento

Pruebe los ejecutores de herramientas independientemente del agente:

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

### Pistas de validación y reintento de la herramienta de pruebas

Compruebe que las herramientas devuelven los errores y sugerencias adecuados en caso de entrada no válida:

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

### Comprobación de la composición del agente

Probar escenarios de agente como herramienta:

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

## Solución de problemas

### Errores comunes

#### Error "registro cerrado

**Síntoma:**
```
error: registration closed: cannot register agent after runtime start
```

**Causa:** Intentando registrar un agente después de que el runtime haya empezado a procesar ejecuciones.

**Solución:** Registrar todos los agentes antes de iniciar cualquier ejecución:

```go
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then start runs
client := chat.NewClient(rt)
out, err := client.Run(ctx, messages, opts...)
```

#### Error "Falta ID de sesión

**Síntoma:**
```
error: missing session ID: session ID is required for run
```

**Causa:** Iniciar una ejecución sin proporcionar un ID de sesión.

**Solución:** Proporcionar siempre un ID de sesión como argumento posicional requerido:

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
out, err := client.Run(ctx, "session-123", messages)
```

**Consejo:** Para pruebas, utilice un ID de sesión fijo. Para producción, genere IDs de sesión únicos por conversación.

#### Errores de violación de políticas

**Síntoma:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Causa:** El agente excedió el límite configurado `MaxToolCalls`.

**Soluciones:**

1. **Aumentar el límite** si el caso de uso requiere legítimamente más llamadas a la herramienta:
```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **Mejorar la eficiencia del planificador** para utilizar menos llamadas a herramientas:
   - Operaciones por lotes siempre que sea posible
   - Utilizar llamadas a herramientas más específicas
   - Mejorar la ingeniería rápida

3. **Comprobar la existencia de bucles infinitos** en la lógica del planificador que llama repetidamente a la misma herramienta.

**Síntoma:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Causa:** Múltiples llamadas consecutivas a herramientas fallidas.

**Soluciones:**

1. **Corregir los errores de la herramienta subyacente** - comprobar los registros del ejecutor de la herramienta
2. **Mejorar las sugerencias de reintento** para que el planificador pueda autocorregirse
3. **Aumentar el límite** si se esperan fallos transitorios:
```go
RunPolicy(func() {
    DefaultCaps(MaxConsecutiveFailedToolCalls(5))
})
```

**Síntoma:**
```
error: policy violation: time budget exceeded (2m0s)
```

**Causa:** La ejecución del agente superó el `TimeBudget` configurado.

**Soluciones:**

1. **Aumentar el presupuesto** para operaciones de larga ejecución:
```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **Utilice `Timing` para un control más preciso**:
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. **Optimizar la ejecución de herramientas** para completar más rápido.

#### Error "herramienta desconocida

**Síntoma:**
```
error: unknown tool: orchestrator.helpers.search
```

**Causa:** El planificador solicitó una herramienta que no está registrada.

**Soluciones:**

1. **Verificar el registro del conjunto de herramientas** - asegúrese de que el conjunto de herramientas está registrado en el agente:
```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **Comprobar la ortografía del nombre de la herramienta** - los nombres de las herramientas distinguen entre mayúsculas y minúsculas y utilizan nombres cualificados.

3. **Regenerar código** tras cambios en DSL:
```bash
goa gen example.com/project/design
```

#### Error "carga no válida

**Síntoma:**
```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**Causa:** El LLM proporcionó una carga útil que no coincide con el esquema de la herramienta.

**Soluciones

1. **Devuelve una RetryHint** desde el ejecutor para que el planificador pueda autocorregirse:
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

2. **Mejorar las descripciones de las herramientas** para aclarar los tipos esperados.

3. **Añadir ejemplos** al DSL:
```go
Args(func() {
    Attribute("limit", Int, "Maximum results", func() {
        Example(10)
        Minimum(1)
        Maximum(100)
    })
})
```

### Consejos de depuración

#### Habilitar registro de depuración

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### Suscribirse a eventos para depuración

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

#### Inspeccionar especificaciones de herramientas en tiempo de ejecución

```go
// List all registered tools
for _, spec := range rt.ToolSpecsForAgent(chat.AgentID) {
    fmt.Printf("Tool: %s\n", spec.Name)
    fmt.Printf("  Description: %s\n", spec.Description)
    fmt.Printf("  Payload Schema: %s\n", spec.Payload.Schema)
}
```

---

## Próximos Pasos

- **[Referencia DSL](./dsl-reference/)** - Referencia completa de funciones DSL
- **[Tiempo de ejecución](./runtime/)** - Comprender la arquitectura del tiempo de ejecución
- **[Producción](./production/)** - Despliegue con Temporal y streaming UI
