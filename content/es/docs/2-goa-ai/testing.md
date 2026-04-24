---
title: Pruebas y resolución de problemas
weight: 9
description: "Learn how to test agents, planners, and tools, and troubleshoot common issues."
llm_optimized: true
---

Esta guía cubre estrategias de prueba para agentes Goa-AI y soluciones a problemas comunes.

## Pruebas de agentes

### Pruebas con el motor en memoria

El motor en memoria es ideal para pruebas porque:
- No requiere dependencias externas (sin Temporal)
- Se ejecuta de forma síncrona para un comportamiento predecible en las pruebas
- Proporciona retroalimentación rápida durante el desarrollo

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

    _, err = rt.CreateSession(ctx, "test-session")
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

### Pruebas de planificadores con clientes de modelo simulados

Aísla la lógica del planificador simulando el cliente del modelo:

```go
type MockModelClient struct {
    responses []model.Message
    callCount int
}

func (m *MockModelClient) Complete(ctx context.Context, req *model.Request) (*model.Response, error) {
    if m.callCount >= len(m.responses) {
        return nil, fmt.Errorf("no more mock responses")
    }
    resp := &model.Response{
        Content: []model.Message{m.responses[m.callCount]},
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
        responses: []model.Message{
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
    }
    
    result, err := planner.PlanStart(context.Background(), input)
    require.NoError(t, err)
    
    // Assert planner returned tool calls
    assert.NotNil(t, result.ToolCalls)
    assert.Len(t, result.ToolCalls, 1)
    assert.Equal(t, "search", string(result.ToolCalls[0].Name))
}
```

### Pruebas de herramientas de forma aislada

Prueba los ejecutores de herramientas de forma independiente del agente:

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
    require.NotNil(t, result.ToolResult)
    
    // Assert on result
    assert.Nil(t, result.ToolResult.Error)
    assert.NotNil(t, result.ToolResult.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.ToolResult.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Pruebas de validación y sugerencias de reintento de herramientas

Verifica que las herramientas devuelven los errores y sugerencias adecuados ante una entrada no válida:

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
    require.NotNil(t, result.ToolResult)
    
    // Should return ToolError with RetryHint
    assert.NotNil(t, result.ToolResult.Error)
    assert.NotNil(t, result.ToolResult.RetryHint)
    assert.Equal(t, planner.RetryReasonMissingFields, result.ToolResult.RetryHint.Reason)
    assert.Contains(t, result.ToolResult.RetryHint.MissingFields, "query")
}
```

### Pruebas de composición de agentes

Prueba escenarios de agente-como-herramienta:

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

    _, err = rt.CreateSession(ctx, "test-session")
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

## Resolución de problemas

### Errores comunes

#### Error "registration closed"

**Síntoma:**
```
error: registration closed: cannot register agent after runtime start
```

**Causa:** Intentar registrar un agente después de que el runtime haya comenzado a procesar ejecuciones.

**Solución:** Registra todos los agentes antes de iniciar cualquier ejecución:

```go
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then create a session and start runs
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages, opts...)
```

#### Error "missing session ID"

**Síntoma:**
```
error: missing session ID: session ID is required for run
```

**Causa:** Iniciar una ejecución sin proporcionar un ID de sesión.

**Solución:** Proporciona siempre un ID de sesión como argumento posicional requerido:

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
if _, err := rt.CreateSession(ctx, "session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages)
```

**Consejo:** Para pruebas, utiliza un ID de sesión fijo. En producción, genera IDs de sesión únicos por conversación.

#### Errores de violación de políticas

**Síntoma:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Causa:** El agente superó el límite `MaxToolCalls` configurado para las herramientas *con presupuesto*. Las herramientas declaradas `Bookkeeping()` no consumen este límite.

**Soluciones:**

1. **Aumenta el límite** si el caso de uso requiere legítimamente más llamadas a herramientas:
```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **Mejora la eficiencia del planificador** para usar menos llamadas a herramientas:
   - Agrupa operaciones por lotes cuando sea posible
   - Utiliza llamadas a herramientas más específicas
   - Mejora la ingeniería de prompts

3. **Comprueba si hay bucles infinitos** en la lógica del planificador que llamen repetidamente a la misma herramienta.

4. **Exime del presupuesto las herramientas estructuradas de bookkeeping** declarándolas `Bookkeeping()` en el DSL. Las actualizaciones de estado, marcadores de progreso y herramientas de commit terminal suelen pertenecer a esta categoría; una vez exentas, nunca consumen `RemainingToolCalls` y siempre pueden ejecutarse. Combina `Bookkeeping()` con `TerminalRun()` para crear una herramienta de tipo "commit this run" con garantía de finalización incluso después de agotar el presupuesto de recuperación.

**Síntoma:**
```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**Causa:** El planificador emitió únicamente herramientas de bookkeeping, pero ninguno de esos resultados era apto para impulsar otro turno del planificador. Por defecto, los resultados satisfactorios de bookkeeping permanecen ocultos a futuros turnos `PlanResume`, por lo que el mismo turno debe resolverse de forma terminal / quedar a la espera de entrada, o producir un resultado de bookkeeping visible para el planificador.

**Soluciones:**

1. **Termina en el mismo turno** con `TerminalRun()`, `FinalResponse` o `FinalToolResult` cuando el lote de bookkeeping ya sea terminal.
2. **Pausa explícitamente** con un handshake de espera/pausa si la ejecución está aguardando entrada humana o externa.
3. **Marca el resultado de bookkeeping como `PlannerVisible()`** cuando contenga un estado canónico sobre el que el siguiente turno del planificador deba razonar, por ejemplo, una instantánea estructurada de progreso.
4. **No combines `PlannerVisible()` con `TerminalRun()`**. Usa `TerminalRun()` para una finalización atómica y `PlannerVisible()` para bookkeeping no terminal que deba reanudar la planificación.

**Síntoma:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Causa:** Fallaron múltiples llamadas consecutivas a herramientas.

**Soluciones:**

1. **Corrige los errores subyacentes de la herramienta** - revisa los logs del ejecutor de la herramienta
2. **Mejora las sugerencias de reintento** para que el planificador pueda autocorregirse
3. **Aumenta el límite** si se esperan fallos transitorios:
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

1. **Aumenta el presupuesto** para operaciones de larga duración:
```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **Usa `Timing` para un control más preciso**:
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. **Optimiza la ejecución de herramientas** para que finalicen más rápido.

#### Error "unknown tool"

**Síntoma:**
```
error: unknown tool: orchestrator.helpers.search
```

**Causa:** El planificador solicitó una herramienta que no está registrada.

**Soluciones:**

1. **Verifica el registro del toolset** - asegúrate de que el toolset esté registrado en el agente:
```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **Comprueba la ortografía del nombre de la herramienta** - los nombres de herramientas distinguen mayúsculas/minúsculas y utilizan nombres cualificados.

3. **Regenera el código** tras cambios en el DSL:
```bash
goa gen example.com/project/design
```

#### Error "invalid payload"

**Síntoma:**
```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**Causa:** El LLM proporcionó una carga útil que no coincide con el esquema de la herramienta.

**Soluciones:**

1. **Devuelve un RetryHint** desde el ejecutor para que el planificador pueda autocorregirse:
```go
if err != nil {
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("invalid payload"),
        RetryHint: &planner.RetryHint{
            Reason:       planner.RetryReasonInvalidArguments,
            Tool:         call.Name,
            ExampleInput: map[string]any{"query": "example", "limit": 10},
            Message:      "limit must be an integer",
        },
    }), nil
}
```

2. **Mejora las descripciones de las herramientas** para aclarar los tipos esperados.

3. **Añade ejemplos** al DSL:
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

#### Habilitar el registro de depuración

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### Suscribirse a eventos para depurar

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
rt := runtime.New(runtime.WithStream(&DebugSink{}))
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

## Próximos pasos

- **[Referencia del DSL](./dsl-reference/)** - Referencia completa de las funciones del DSL
- **[Runtime](./runtime/)** - Comprende la arquitectura del runtime
- **[Producción](./production/)** - Despliega con Temporal y UI en streaming
