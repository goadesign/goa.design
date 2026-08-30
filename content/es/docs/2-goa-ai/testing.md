---
title: Pruebas y resolución de problemas
weight: 9
description: "Aprende a probar agentes, planners y herramientas, y a resolver problemas comunes."
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

### Pruebas de planificadores con proveedores simulados

`model.Client` pertenece al framework y las pruebas de la aplicación no pueden
implementarlo directamente. Implementa `model.Provider` y construye el mismo
cliente validado que se usa en producción:

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

En las pruebas unitarias del planificador que no necesiten validar la salida del
modelo, inyecta entradas deterministas y solicitudes de herramienta tipadas.
Usa un proveedor simulado cuando la prueba deba demostrar validación de
peticiones, decodificación del payload, límites de salida o terminación del
stream.

Los streams simulados deben emitir una secuencia completa y válida de chunks y
después devolver `io.EOF`; solo entonces `ValidatedStream.Response()` expone la
respuesta aceptada. Para probar el rechazo, devuelve una salida malformada y
comprueba el error de frontera. Las pruebas de completions generadas deben
comprobar `planner.OutputContractError` y una respuesta nil cuando la salida
viola el codec generado.

Las pruebas del limitador de velocidad y del historial basado en tokens
necesitan un proveedor simulado que también implemente un
`model.TokenCounter` exacto. Un proveedor sin conteo debe producir
`model.ErrTokenCountingUnsupported`, no una estimación.

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

### Pruebas de validación y recuperación de herramientas

Prueba el JSON externo malformado en la frontera del codec generado. Las
llamadas de herramienta inválidas emitidas por el modelo se rechazan antes de
que las reciban el planificador o el ejecutor:

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

Las pruebas directas del ejecutor deben crear un `planner.ToolRequest` válido
con el descriptor tipado generado, construir un `runtime.ToolCall` a partir del
nombre y los bytes canónicos, y asignar los identificadores de ejecución que
añadiría el runtime. Comprueba los fallos de dominio o proveedor mediante
`ToolResult.Failure.Kind`, `Failure.Error` y `Failure.Recovery`. Las pruebas del
planificador que reenvían una llamada validada del proveedor pueden usar
`planner.ToolRequestFromModelCall` para conservar su identificador de
correlación del proveedor.

### Pruebas de composición de agentes

Prueba escenarios de agente-como-herramienta:

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

### Pruebas del almacenamiento del runtime

Usa `runtime/agent/storage/inmem` para probar planificadores y workflows. Comprueba una implementación duradera de producción con el mismo contrato, incluidos estos casos:

- los inicios raíz, hijo y one-shot sin sesión guardan juntos sus metadatos y primeros registros;
- el inicio de un hijo guarda el vínculo con su padre en la misma operación;
- un reintento idéntico devuelve el identificador del registro original e indica que no se insertó otro;
- repetir un cambio de ciclo de vida con otro registro produce un conflicto, aunque no cambien el estado solicitado ni los demás campos;
- cambiar cualquier valor fijado por la primera escritura devuelve un conflicto;
- el primer motivo de cancelación es permanente y un motivo posterior diferente produce un conflicto;
- la suspensión guarda juntos el checkpoint, el estado suspendido y el registro correspondiente;
- la finalización guarda juntos el estado final y el registro correspondiente;
- una sesión terminada impide el trabajo del planificador y las herramientas, pero registra como cancelado un workflow ya aceptado;
- la purga falla mientras haya una ejecución activa y, una vez terminadas todas, elimina los metadatos, checkpoints y registros de la sesión terminada.

Estas pruebas deben ejercer las transacciones reales de la base de datos. Un mock que solo comprueba llamadas a métodos no demuestra que el estado y los registros se hagan visibles juntos.

Las pruebas de continuación deben aceptar `goa-ai.run-suspension.v7` y rechazar
todas las versiones anteriores antes de restaurar payloads o llamar al
planificador.

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
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
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

4. **Exime los registros de control estructurados de los presupuestos de recuperación y fallos** declarándolos `Bookkeeping()` en el DSL. Los marcadores de estado y declaraciones de transición pertenecen a esta categoría; los resultados de consulta cuyo éxito deba programar razonamiento posterior no. Un lote mixto creado por el modelo permanece atómico y se rechaza por completo si no caben sus llamadas presupuestadas. Usa solo `TerminalRun()` para un commit terminal; las herramientas terminales se convierten automáticamente en bookkeeping y pueden admitirse tras agotar el presupuesto de recuperación.

**Síntoma:**
```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**Causa:** El planificador emitió únicamente herramientas de bookkeeping. Sus llamadas y resultados permanecen en la transcripción del proveedor, pero los resultados correctos no activan otro `PlanResume` ni entran en los `ToolOutputs` tipados futuros. Por tanto, el mismo turno debe resolverse de forma terminal o quedar a la espera de entrada.

**Soluciones:**

1. **Termina en el mismo turno** con `TerminalRun()`, `FinalResponse` o `FinalToolResult` cuando el lote de bookkeeping ya sea terminal.
2. **Pausa explícitamente** con un handshake de espera/pausa si la ejecución está aguardando entrada humana o externa.
3. **Mueve el estado del siguiente turno a una entrada explícita del planificador** en lugar de depender de un resultado satisfactorio de bookkeeping para reanudar la planificación.

**Síntoma:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Causa:** Fallaron múltiples llamadas consecutivas a herramientas.

**Soluciones:**

1. **Corrige los errores subyacentes de la herramienta** - revisa los logs del ejecutor de la herramienta
2. **Corrige el contrato de fallo estructurado** para que `Failure.Recovery`
   indique al planificador la acción correcta y la evidencia exacta de corrección
3. **Aumenta el límite** si se esperan fallos transitorios:
```go
RunPolicy(func() {
    DefaultCaps(MaxRecoveryTurns(5))
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

1. **Prueba el codec generado** para que la frontera informe de los campos exactos:
```go
_, err := specs.SearchTool().Payload.FromJSON(
    rawjson.Message(`{"query":"example","limit":"ten"}`),
)
var validationErr *tools.ValidationError
require.ErrorAs(t, err, &validationErr)
assert.Equal(t, "invalid_field_type", validationErr.Issues()[0].Constraint)
```

Cuando un proveedor emite este payload, el cliente de modelo validado devuelve
`model.OutputValidationError`. El planificador/runtime lo expone como
`planner.OutputContractError` antes de ejecutar código del ejecutor o del
servicio. Usa `errors.As` para comprobar el error estructurado en la frontera
que estés probando; no se registra ningún `ToolFailure`.

Prueba `RecoveryCorrectCall` por separado con una llamada creada por el modelo
que supere la validación del esquema y cuyo ejecutor o frontera de dominio
devuelva un `ToolFailure` recuperable.

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
    storageinmem.New(),
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
rt := runtime.New(storageinmem.New(), runtime.WithStream(&DebugSink{}))
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
