---
title: Herramientas
weight: 4
description: "Learn about toolset types, execution models, validation, retry hints, and tool catalogs in Goa-AI."
llm_optimized: true
aliases:
---

Los conjuntos de herramientas son colecciones de herramientas que los agentes pueden utilizar. Goa-AI soporta varios tipos de herramientas, cada una con diferentes modelos de ejecución y casos de uso.

## Tipos de herramientas

### Conjuntos de herramientas propios del servicio (basados en métodos)

Declaradas mediante `Toolset("name", func() { ... })`; las herramientas pueden `BindTo` métodos de servicio Goa o ser implementadas por ejecutores personalizados.

- Codegen emite especificaciones/tipos/codecs por herramienta en `gen/<service>/toolsets/<toolset>/`
- Los agentes que `Use` estos conjuntos de herramientas importan las especificaciones del proveedor y obtienen constructores de llamadas tipadas y fábricas de ejecutores
- Las aplicaciones registran ejecutores que decodifican argumentos tipados (a través de códecs proporcionados en tiempo de ejecución), opcionalmente utilizan transformaciones, llaman a clientes de servicios y devuelven `ToolResult`

### Conjuntos de herramientas implementadas en agentes (Agent-as-Tool)

Definido en un bloque `Export` del agente, y opcionalmente `Use`d por otros agentes.

- La propiedad sigue siendo del servicio; el agente es la implementación
- Codegen emite paquetes de exportación del proveedor bajo `gen/<service>/agents/<agent>/exports/<export>` con `NewRegistration` y constructores de llamadas tipados
- Los helpers del lado del consumidor en agentes que `Use` el conjunto de herramientas exportado delegan en los helpers del proveedor manteniendo centralizados los metadatos de enrutamiento
- La ejecución se produce en línea; las cargas útiles se pasan como JSON canónico y se descodifican sólo en el límite si es necesario para los avisos

### Herramientas MCP

Declarado mediante `MCPToolset(service, suite)` y referenciado mediante `Use(MCPToolset(...))`.

- Registro generado establece `DecodeInExecutor=true` por lo que JSON crudo se pasa a través del ejecutor MCP
- El ejecutor MCP decodifica utilizando sus propios códecs
- Las envolturas generadas manejan esquemas/codificadores JSON y transportes (HTTP/SSE/stdio) con reintentos y rastreo

### Cuándo usar BindTo vs Implementaciones Inline

**Utilizar `BindTo` cuando:**
- La herramienta debe llamar a un método de servicio Goa existente
- Desea transformaciones generadas entre los tipos de herramienta y método
- El método de servicio ya tiene la lógica de negocio que necesitas
- Desea reutilizar la validación y el manejo de errores de la capa de servicio

```go
// Tool bound to existing service method
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Calls the Search method on the same service
})
```

**Utilice implementaciones en línea cuando:**
- La herramienta tiene lógica personalizada no vinculada a un método de servicio
- Necesitas orquestar múltiples llamadas a servicios
- La herramienta es puramente computacional (sin llamadas externas)
- Desea un control total sobre el flujo de ejecución

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

Para implementaciones en línea, se escribe directamente la lógica del ejecutor:

```go
func (e *Executor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    switch call.Name {
    case specs.Summarize:
        args, _ := specs.UnmarshalSummarizePayload(call.Payload)
        // Custom logic: fetch multiple docs, combine, summarize
        summary := e.summarizeDocuments(ctx, args.DocIDs)
        return &planner.ToolResult{
            Name:   call.Name,
            Result: &specs.SummarizeResult{Summary: summary},
        }, nil
    }
    return nil, fmt.Errorf("unknown tool: %s", call.Name)
}

### Bounded Tool Results

Some tools naturally return large lists, graphs, or time-series windows. You can mark these as **bounded views** so that services remain responsible for trimming while the runtime enforces and surfaces the contract.

#### The agent.Bounds Contract

The `agent.Bounds` type is a small, provider-agnostic contract that describes how a tool result has been bounded relative to the full underlying data set:

```go
type Bounds struct {
    Devuelto int // Número de elementos en la vista delimitada
    Total *int // Total antes de truncar (opcional)
    Truncado bool // Si se aplicó algún tope (longitud, ventana, profundidad)
    RefinementHint string // Orientación sobre cómo acotar la consulta cuando se trunca
}
```

| Field | Description |
|-------|-------------|
| `Returned` | Count of items actually present in the result |
| `Total` | Best-effort count of total items before truncation (nil if unknown) |
| `Truncated` | True if any caps were applied (pagination, depth limits, size limits) |
| `RefinementHint` | Human-readable guidance for narrowing the query (e.g., "Add a date filter to reduce results") |

#### Service Responsibility for Trimming

The runtime does not compute subsets or truncation itself—**services are responsible for**:

1. **Applying truncation logic**: Pagination, result limits, depth caps, time windows
2. **Populating bounds metadata**: Setting `Returned`, `Total`, `Truncated` accurately
3. **Providing refinement hints**: Guiding users/models on how to narrow queries when results are truncated

This design keeps truncation logic where domain knowledge lives (in services) while providing a uniform contract for the runtime, planners, and UIs to consume.

#### Declaring Bounded Tools

Use the DSL helper `BoundedResult()` inside a `Tool` definition:

```go
Tool("list_devices", "Listar dispositivos con paginación", func() {
    Args(func() {
        Attribute("site_id", String, "Identificador del sitio")
        Attribute("status", String, "Filtrar por estado", func() {
            Enum("online", "offline", "unknown")
        })
        Atributo("limit", Int, "Máximo de resultados", func() {
            Por defecto(50)
            Máximo(500)
        })
        Obligatorio("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Dispositivos coincidentes")
        Attribute("returned", Int, "Número de dispositivos devueltos")
        Atributo("total", Int, "Total de dispositivos coincidentes")
        Attribute("truncated", Boolean, "Los resultados se han limitado")
        Attribute("refinement_hint", String, "Cómo limitar los resultados")
        Obligatorio("dispositivos", "devueltos")
    })
    BoundedResult()
    BindTo("DeviceService", "ListDevices")
})
```

#### Code Generation

When a tool is marked with `BoundedResult()`:

- The generated tool spec includes `BoundedResult: true`
- The generated result alias type includes a `Bounds *agent.Bounds` field
- Generated result types implement the `agent.BoundedResult` interface:

```go
// Implementación de la interfaz generada
type ListDevicesResult struct {
    Dispositivos []*Device
    Devuelto int
    Total *int
    Truncado bool
    RefinementHint cadena
}

func (r *ListDevicesResult) ResultBounds() *agent.Bounds {
    return &agente.Límites{
        Devuelto: r.Devuelto
        Total: r.Total,
        Truncado: r.Truncado,
        RefinementHint: r.RefinementHint,
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
    // Consulta con límite + 1 para detectar truncamiento
    devices, err := s.repo.QueryDevices(ctx, p.SiteID, p.Status, p.Limit+1)
    if err != nil {
        return nil, err
    }
    
    // Determina si los resultados fueron truncados
    truncado := len(dispositivos) > p.Límite
    if truncado {
        dispositivos = dispositivos[:p.Límite] // Recortar hasta el límite solicitado
    }
    
    // Obtener el recuento total (opcional, puede ser costoso)
    total, _ := s.repo.CountDevices(ctx, p.SiteID, p.Status)
    
    // Construir pista de refinamiento cuando se trunca
    var hint cadena
    si truncado {
        hint = "Añada un filtro de estado o reduzca el ámbito del sitio para ver menos resultados"
    }
    
    return &ListDevicesResultado{
        Dispositivos: dispositivos,
        Devuelto: len(dispositivos),
        Total: &total,
        Truncado: truncado,
        RefinementHint: hint,
    }, nil
}
```

#### Runtime Behavior

When a bounded tool executes:

1. The runtime decodes the result and checks for `agent.BoundedResult` implementation
2. If the result implements the interface, `ResultBounds()` extracts bounds metadata
3. Bounds are attached to `planner.ToolResult.Bounds`
4. Stream subscribers and finalizers can access bounds for UI display, logging, or policy decisions

```go
// En un suscriptor de flujo
func handleToolEnd(event *stream.ToolEndEvent) {
    if evento.Límites != nil && evento.Límites.Truncado {
        log.Printf("La herramienta %s devolvió %d de %d resultados (truncados)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if evento.Límites.SugerenciaRefinamiento != "" {
            log.Printf("Sugerencia: %s", evento.Sugerencia.Refinamiento)
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

### Injected Fields

The `Inject` DSL function marks specific payload fields as "injected"—server-side infrastructure values that are hidden from the LLM but required by the service method. This is useful for session IDs, user context, authentication tokens, and other runtime-provided values.

#### How Inject Works

When you mark a field with `Inject`:

1. **Hidden from LLM**: The field is excluded from the JSON schema sent to the model provider
2. **Generated setter**: Codegen emits a setter method on the payload struct
3. **Runtime population**: You populate the field via a `ToolInterceptor` before execution

#### DSL Declaration

```go
Tool("get_user_data", "Obtener datos del usuario actual", func() {
    Args(func() {
        Attribute("session_id", String, "ID de sesión actual")
        Attribute("query", String, "Consulta de datos")
        Requerido("session_id", "consulta")
    })
    Return(func() {
        Attribute("data", ArrayOf(String), "Resultados de la consulta")
        Requerido("datos")
    })
    BindTo("UserService", "GetData")
    Inject("session_id") // Oculto en LLM, rellenado en tiempo de ejecución
})
```

#### Generated Code

Codegen produces a setter method for each injected field:

```go
// Carga útil generada struct
type GetUserDataPayload struct {
    Cadena SessionID `json:"session_id"`
    Cadena de consulta `json:"query"`
}

// Setter generado para el campo inyectado
func (p *GetUserDataPayload) SetSessionID(v string) {
    p.SessionID = v
}
```

#### Runtime Population via ToolInterceptor

Use a `ToolInterceptor` to populate injected fields before tool execution:

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    // Extrae la sesión del contexto (establecida por el middleware de autenticación)
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("no se ha encontrado el ID de sesión en el contexto")
    }
    
    // Rellenar el campo inyectado usando el setter generado
    switch llamada.Nombre {
    case specs.GetUserData:
        payload, _ := specs.UnmarshalGetUserDataPayload(call.Payload)
        payload.SetSessionID(sessionID)
        call.Payload, _ = json.Marshal(payload)
    }
    return nil
}

// Registrar interceptor con runtime
rt := runtime.New(runtime.WithToolInterceptor(&SessionInterceptor{}))
```

#### When to Use Inject

Use `Inject` for fields that:
- Are required by the service but shouldn't be chosen by the LLM
- Come from runtime context (session, user, tenant, request ID)
- Contain sensitive values (auth tokens, API keys)
- Are infrastructure concerns (tracing IDs, correlation IDs)

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
6. Stream subscribers emit both `tool_start` / `tool_end` for the parent tool call and an `agent_run_started` link event so UIs and debuggers can attach to the child run's stream on demand

---

## Executor-First Model

Generated service toolsets expose a single, generic constructor:

```go
New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)
```

Applications register an executor implementation for each consumed toolset. The executor decides how to run the tool (service client, MCP, nested agent, etc.) and receives explicit per-call metadata via `ToolCallMeta`.

**Executor Example:**

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    switch llamada.Nombre {
    case "orquestador.perfiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error: planner.NewToolError("carga no válida"),
            }, nil
        }
        
        // Transformaciones opcionales si las emite codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return planner.ToolResult{
                Error: planner.ToolErrorFromError(err),
            }, nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return planner.ToolResult{Carga: tr}, nil
        
    por defecto:
        return planner.ToolResult{
            Error: planner.NewToolError("herramienta desconocida"),
        }, nil
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
func Ejecutar(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    // Accede al contexto de ejecución directamente desde meta
    log.Printf("Ejecutando herramienta en run %s, session %s, turno %s",
        meta.RunID, meta.SessionID, meta.TurnID)
    
    // Utilizar ToolCallID para la correlación
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    defer span.End()
    
    // ... implementación de la herramienta
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

// Utilizar una constante generada en lugar de cadenas/cast ad-hoc
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

```ir
type RetryHint struct {
    Razón RetryReason
    Herramienta tools.Ident
    RestrictToTool bool
    MissingFields []cadena
    ExampleInput mapa[cadena]cualquiera
    PriorInput mapa[cadena]cualquiera
    ClarifyingQuestion cadena
    Mensaje cadena
}
```

Common `RetryReason` values:
- `invalid_arguments` – payload failed validation (schema/type)
- `missing_fields` – required fields are missing
- `malformed_response` – tool returned data that could not be decoded
- `timeout`, `rate_limited`, `tool_unavailable` – execution/infra issues

**ToolResult** carries errors and hints:

```go
type ToolResult struct {
    Nombre herramientas.Ident
    Resultado any
    Error *ToolError
    RetryHint *RetryHint
    Telemetría *telemetry.ToolTelemetry
    ToolCallID cadena
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
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (*planner.ToolResult, error) {
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        return &planner.ToolResult{
            Nombre: call.Nombre,
            Error: planner.NewToolError("carga no válida"),
            RetryHint: &planner.RetryHint{
                Reason: planner.RetryReasonInvalidArguments,
                Tool: call.Name,
                RestrictToTool: true,
                Mensaje:       "La carga útil no coincide con el esquema esperado",
            },
        }, nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return &planner.ToolResult{
            Nombre: llamada.Nombre,
            Error: planner.ToolErrorFromError(err),
        }, nil
    }

    return &planner.ToolResult{Nombre: llamada.Nombre, Resultado: res}, nil
}
```

**Example Planner Logic:**

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolResults) == 0 {
        return &planner.PlanResult{}, nil
    }

    last := in.ToolResults[len(in.ToolResults)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            return &planner.PlanResult{
                Esperar: &planner.Esperar{
                    Aclaración: &planner.AwaitClarification{
                        ID               "fix-" + string(hint.Tool),
                        Question: hint.ClarifyingQuestion,
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
agentes := rt.ListAgents() // []agente.Ident
toolsets := rt.ListToolsets() // []cadena

spec, ok := rt.ToolSpec(toolID) // single ToolSpec
schemas, ok := rt.ToolSchema(toolID) // esquemas de carga/resultado
specs := rt.ToolSpecsForAgent(chat.AgentID) // []ToolSpec para un agente
```

Where `toolID` is a typed `tools.Ident` constant from a generated specs or agenttools package.

### Typed Sidecars and Artifacts

Some tools need to return **rich artifacts** (full time series, topology graphs, large result sets) that are useful for UIs and audits but too heavy for model providers. Goa-AI models these as **typed sidecars** (also called artifacts):

#### Model-Facing vs Sidecar Data

The key distinction is what data flows where:

| Data Type | Sent to Model | Stored/Streamed | Purpose |
|-----------|---------------|-----------------|---------|
| **Model-facing result** | ✓ | ✓ | Bounded summary the LLM reasons about |
| **Sidecar/Artifact** | ✗ | ✓ | Full-fidelity data for UIs, audits, downstream consumers |

This separation lets you:
- Keep model context windows bounded and focused
- Provide rich visualizations (charts, graphs, tables) without bloating LLM prompts
- Attach provenance and audit data that models don't need to see
- Stream large datasets to UIs while the model works with summaries

#### Declaring Artifacts in DSL

Use the `Artifact(kind, schema)` function inside a `Tool` definition:

```ir
Tool("get_time_series", "Obtener datos de series temporales", func() {
    Args(func() {
        Attribute("device_id", String, "Identificador del dispositivo")
        Attribute("start_time", String, "Hora de inicio (RFC3339)")
        Attribute("end_time", String, "Hora de finalización (RFC3339)")
        Obligatorio("device_id", "start_time", "end_time")
    })
    // Resultado orientado al modelo: resumen acotado
    Return(func() {
        Attribute("summary", String, "Resumen del modelo")
        Attribute("count", Int, "Número de puntos de datos")
        Attribute("min_value", Float64, "Valor mínimo en el rango")
        Attribute("max_value", Float64, "Valor máximo del intervalo")
        Obligatorio("summary", "count")
    })
    // Sidecar: datos completos para las interfaces de usuario
    Artifact("series_tiempo", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Datos completos de series temporales")
        Atributo("metadatos", MapOf(String, String), "Metadatos adicionales")
        Obligatorio("data_points")
    })
})
```

The `kind` parameter (e.g., `"time_series"`) identifies the artifact type so UIs can dispatch appropriate renderers.

#### Generated Specs and Helpers

In the specs packages, each `tools.ToolSpec` entry includes:
- `Payload tools.TypeSpec` – tool input schema
- `Result tools.TypeSpec` – model-facing output schema
- `Sidecar *tools.TypeSpec` (optional) – artifact schema

Goa-AI generates typed helpers for working with sidecars:

```go
// Obtener artefacto de un resultado de herramienta
func GetGetTimeSeriesSidecar(res *planner.ToolResult) (*GetTimeSeriesSidecar, error)

// Adjuntar artefacto a un resultado de herramienta
func SetGetTimeSeriesSidecar(res *planner.ToolResult, sc *GetTimeSeriesSidecar) error
```

#### Runtime Usage Patterns

**In tool executors**, attach artifacts to results:

```go
func (e *Executor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)
    
    // Obtener datos completos
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return &planner.ToolResult{Error: planner.ToolErrorFromError(err)}, nil
    }
    
    // Construir resultado de modelo acotado
    result := &specs.GetTimeSeriesResult{
        Resumen: fmt.Sprintf("Recuperados %d puntos de datos de %s a %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count: len(datoscompletos.puntos),
        MinValue: fullData.Min,
        MaxValue: fullData.Max,
    }
    
    // Construir artefacto de fidelidad completa para UIs
    artefacto := &specs.GetTimeSeriesSidecar{
        PuntosDatos: fullData.Puntos,
        Metadatos: fullData.Metadata,
    }
    
    // Adjuntar artefacto al resultado
    toolResult := &planner.ToolResult{
        Nombre: llamada.Nombre,
        Resultado: resultado,
    }
    specs.SetGetTimeSeriesSidecar(toolResult, artifact)
    
    return toolResultado, nil
}
```

**In stream subscribers or UI handlers**, access artifacts:

```go
func handleToolEnd(event *stream.ToolEndEvent) {
    // Los artefactos están disponibles en el evento
    for _, artefacto := rango evento.Artefactos {
        switch artefacto.tipo {
        case "series_tiempo":
            // Renderizar gráfico de series temporales
            renderTimeSeriesChart(artefacto.Datos)
        case "topología":
            // Renderizar gráfico de red
            renderTopologyGraph(artefacto.Datos)
        }
    }
}
```

#### Artifact Structure

The `planner.Artifact` type carries:

```go
type Artefacto struct {
    Kind string // Tipo lógico (por ejemplo, "time_series", "chart_data")
    Data any // Carga útil serializable en JSON
    SourceTool tools.Ident // Herramienta que produjo este artefacto
    RunLink *run.Handle // Enlace a la ejecución del agente anidado (para el agente como herramienta)
}
```

#### Cuándo usar artefactos

Utilice artefactos cuando:
- Los resultados de la herramienta incluyen datos demasiado grandes para el contexto del modelo (series temporales, registros, tablas grandes)
- Las interfaces de usuario necesitan datos estructurados para su visualización (tablas, gráficos, mapas)
- Se desea separar lo que razona el modelo de lo que ven los usuarios
- Los sistemas posteriores necesitan datos completos, mientras que el modelo trabaja con resúmenes

Evite los artefactos cuando:
- El resultado completo encaja cómodamente en el contexto del modelo
- No hay ninguna interfaz de usuario o consumidor que necesite los datos completos
- El resultado delimitado ya contiene todo lo necesario

---

## Mejores prácticas

- **Poner las validaciones en el diseño, no en los planificadores** - Usar el DSL de atributos de Goa (`Required`, `MinLength`, `Enum`, etc.)
- **Devolver ToolError + RetryHint de los ejecutores** - Preferir errores estructurados en lugar de pánicos o simples devoluciones `error`
- **Mantenga las sugerencias concisas pero procesables** - Céntrese en los campos que faltan/no son válidos, una breve pregunta aclaratoria y un pequeño mapa `ExampleInput`
- **Enseñe a los planificadores a leer las sugerencias** - Convierta la gestión de `RetryHint` en una parte esencial de su planificador
- **Evitar la revalidación dentro de los servicios** - Goa-AI asume que la validación ocurre en el límite de la herramienta

---

## Próximos pasos

- **[Composición de agentes](./agent-composition.md)** - Construir sistemas complejos con patrones de agentes como herramientas
- **[Integración MCP](./mcp-integration.md)** - Conectar con servidores de herramientas externos
- **[Tiempo de ejecución](./runtime.md)** - Comprender el flujo de ejecución de herramientas
