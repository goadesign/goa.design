---
title: Ensembles d'outils
weight: 4
description: "Learn about toolset types, execution models, validation, retry hints, and tool catalogs in Goa-AI."
llm_optimized: true
aliases:
---

Les ensembles d'outils sont des collections d'outils que les agents peuvent utiliser. Goa-AI prend en charge plusieurs types d'ensembles d'outils, chacun ayant des modèles d'exécution et des cas d'utilisation différents.

## Types d'ensembles d'outils

### Ensembles d'outils appartenant à un service (soutenus par une méthode)

Déclarés via `Toolset("name", func() { ... })` ; les outils peuvent `BindTo` être des méthodes de service Goa ou être mis en œuvre par des exécuteurs personnalisés.

- Codegen émet des spécifications/types/codecs par outil sous `gen/<service>/toolsets/<toolset>/`
- Lorsqu'on utilise le registre d'outils interne, codegen émet aussi `gen/<service>/toolsets/<toolset>/provider.go` pour l'exécution côté service routée par le registre
- Les agents qui `Use` ces ensembles d'outils importent les spécifications du fournisseur et obtiennent des constructeurs d'appels typés et des usines d'exécution
- Les applications enregistrent des exécuteurs qui décodent les arguments typés (via des codecs fournis par le moteur d'exécution), utilisent éventuellement des transformations, appellent des clients de service et renvoient des `ToolResult`

Si vous déployez le registre d'outils interne pour l'invocation inter-processus, le service propriétaire exécute une boucle fournisseur qui s'abonne à `toolset:<toolsetID>:requests` et publie les résultats sur `result:<toolUseID>`. Voir la documentation du [Registre]({{< ref "/docs/2-goa-ai/registry.md" >}}) pour l'extrait de câblage du fournisseur.

### Ensembles d'outils mis en œuvre par l'agent (Agent-as-Tool)

Définis dans un bloc `Export` de l'agent et éventuellement `Use` mis en œuvre par d'autres agents.

- Le service reste propriétaire ; l'agent est l'implémentation
- Codegen émet des paquets d'export côté fournisseur sous `gen/<service>/agents/<agent>/exports/<export>` avec `NewRegistration` et des constructeurs d'appels typés
- Les aides côté consommateur dans les agents qui `Use` l'ensemble d'outils exportés délèguent aux aides côté fournisseur tout en gardant les métadonnées de routage centralisées
- L'exécution se fait en ligne ; les charges utiles sont transmises sous forme de JSON canonique et décodées uniquement à la frontière si cela est nécessaire pour les invites

### Jeux d'outils MCP

Déclarés via `MCPToolset(service, suite)` et référencés via `Use(MCPToolset(...))`.

- Les ensembles d'enregistrement générés `DecodeInExecutor=true` de sorte que le JSON brut est transmis à l'exécuteur MCP
- L'exécuteur MCP décode en utilisant ses propres codecs
- Les wrappers générés gèrent les schémas/encodeurs JSON et les transports (HTTP/SSE/stdio) avec les tentatives et le traçage

### Quand utiliser les implémentations BindTo ou Inline ?

**Utilisez `BindTo` quand:**
- L'outil doit appeler une méthode de service Goa existante
- Vous souhaitez générer des transformations entre les types d'outils et de méthodes
- La méthode de service possède déjà la logique métier dont vous avez besoin
- Vous souhaitez réutiliser la validation et la gestion des erreurs de la couche de service

```go
// Tool bound to existing service method
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Calls the Search method on the same service
})
```

**Utilisez les implémentations en ligne lorsque :**
- L'outil a une logique personnalisée qui n'est pas liée à une méthode de service
- Vous devez orchestrer plusieurs appels de service
- L'outil est purement informatique (pas d'appels externes)
- Vous voulez un contrôle total sur le flux d'exécution

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

Pour les implémentations en ligne, vous écrivez directement la logique de l'exécuteur :

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
    Returned int // Nombre d'éléments dans la vue délimitée
    Total *int // Total du meilleur effort avant la troncature (facultatif)
    Truncated bool // Si des caps ont été appliqués (longueur, fenêtre, profondeur)
    RefinementHint string // Conseils sur la manière de restreindre la requête lorsqu'elle est tronquée
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
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribut("site_id", String, "Identifiant du site")
        Attribut("status", String, "Filtrer par statut", func() {
            Enum("online", "offline", "unknown")
        })
        Attribut("limit", Int, "Maximum results", func() {
            Par défaut(50)
            Maximum(500)
        })
        Required("site_id")
    })
    Return(func() {
        Attribut("devices", ArrayOf(Device), "Appareils correspondants")
        Attribut("returned", Int, "Nombre d'appareils renvoyés")
        Attribut("total", Int, "Nombre total de dispositifs correspondants")
        Attribut("truncated", Boolean, "Résultats plafonnés")
        Attribut("refinement_hint", String, "Comment réduire les résultats")
        Required("devices", "returned", "truncated")
    })
    BoundedResult()
    BindTo("DeviceService", "ListDevices")
})
```

#### Code Generation

When a tool is marked with `BoundedResult()`:

- The generated tool spec includes `BoundedResult: true`
- Generated result types implement the `agent.BoundedResult` interface via `ResultBounds()`:

```go
// Mise en œuvre de l'interface générée
type ListDevicesResult struct {
    Dispositifs []*Device
    Returned int
    Total *int
    Tronqué bool
    RefinementHint string
}

func (r *ListDevicesResult) ResultBounds() *agent.Bounds {
    return &agent.Bounds{
        Returned : r.Returned,
        Total : r.Total,
        Truncated : r.Truncated,
        RefinementHint : r.RefinementHint,
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
    // Interrogation avec limite + 1 pour détecter la troncature
    devices, err := s.repo.QueryDevices(ctx, p.SiteID, p.Status, p.Limit+1)
    if err != nil {
        return nil, err
    }
    
    // Déterminer si les résultats ont été tronqués
    tronqué := len(devices) > p.Limit
    if truncated {
        devices = devices[:p.Limit] // Ajuster à la limite demandée
    }
    
    // Obtenir le décompte total (optionnel, peut être coûteux)
    total, _ := s.repo.CountDevices(ctx, p.SiteID, p.Status)
    
    // Construction d'un indice de raffinement en cas de troncature
    var hint string
    si tronqué {
        hint = "Ajouter un filtre d'état ou réduire l'étendue du site pour voir moins de résultats"
    }
    
    return &ListDevicesResult{
        Appareils : appareils,
        Returned : len(devices),
        Total : &total,
        Truncated : tronqué,
        RefinementHint : hint,
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
// Dans un abonné au flux
func handleToolEnd(event *stream.ToolEndEvent) {
    if event.Bounds != nil && event.Bounds.Truncated {
        log.Printf("Tool %s returned %d of %d results (truncated)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if event.Bounds.RefinementHint != "" {
            log.Printf("Indice : %s", event.Bounds.RefinementHint)
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
Tool("get_user_data", "Get data for current user", func() {
    Args(func() {
        Attribut("session_id", String, "Current session ID")
        Attribut("query", Chaîne, "Requête de données")
        Required("session_id", "query")
    })
    Return(func() {
        Attribut("data", ArrayOf(String), "Résultats de la requête")
        Requis("data")
    })
    BindTo("UserService", "GetData")
    Inject("session_id") // Caché dans le LLM, rempli au moment de l'exécution
})
```

#### Generated Code

Codegen produces a setter method for each injected field:

```go
// Structure de la charge utile générée
type GetUserDataPayload struct {
    SessionID string `json:"session_id"`
    Query string `json:"query"`
}

// Setter généré pour le champ injecté
func (p *GetUserDataPayload) SetSessionID(v string) {
    p.SessionID = v
}
```

#### Runtime Population via ToolInterceptor

Use a `ToolInterceptor` to populate injected fields before tool execution:

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    // Extrait la session du contexte (définie par votre middleware d'authentification)
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("session ID not found in context")
    }
    
    // Remplir le champ injecté en utilisant le setter généré
    switch call.Name {
    case specs.GetUserData :
        payload, _ := specs.UnmarshalGetUserDataPayload(call.Payload)
        payload.SetSessionID(sessionID)
        call.Payload, _ = json.Marshal(payload)
    }
    return nil
}

// Enregistrer l'intercepteur avec le runtime
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
6. Stream subscribers emit both `tool_start` / `tool_end` for the parent tool call and a `child_run_linked` link event so UIs can build nested agent cards while consuming a single session stream

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
    switch call.Name {
    case "orchestrator.profiles.upsert" :
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error : planner.NewToolError("invalid payload"),
            }, nil
        }
        
        // Transformations optionnelles si elles sont émises par codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return planner.ToolResult{
                Error : planner.ToolErrorFromError(err),
            }, nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return planner.ToolResult{Payload : tr}, nil
        
    par défaut :
        return planner.ToolResult{
            Error : planner.NewToolError("outil inconnu"),
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
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    // Accède au contexte d'exécution directement à partir de meta
    log.Printf("Executing tool in run %s, session %s, turn %s",
        meta.RunID, meta.SessionID, meta.TurnID)
    
    // Utiliser ToolCallID pour la corrélation
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    defer span.End()
    
    // ... implémentation de l'outil
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

// Utilisation d'une constante générée au lieu de chaînes/cast ad-hoc
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
    Raison RetryReason
    Outil tools.Ident
    RestrictToTool bool
    MissingFields []string
    ExampleInput map[string]any
    PriorInput map[string]any
    ClarifyingQuestion string
    Message string
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
    Nom tools.Ident
    Result any
    Erreur *ToolError
    RetryHint *RetryHint
    Telemetry *telemetry.ToolTelemetry
    ToolCallID string
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
            Name : call.Name,
            Error : planner.NewToolError("invalid payload"),
            RetryHint : &planner.RetryHint{
                Reason : planner.RetryReasonInvalidArguments,
                Tool : call.Name,
                RestrictToTool : true,
                Message :       "La charge utile ne correspond pas au schéma attendu",
            },
        }, nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return &planner.ToolResult{
            Name : call.Name,
            Error : planner.ToolErrorFromError(err),
        }, nil
    }

    return &planner.ToolResult{Name : call.Name, Result : res}, nil
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
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments :
            return &planner.PlanResult{
                Attente : &planner.Await{
                    Clarification : &planner.AwaitClarification{
                        ID :               "fix-" + string(hint.Tool),
                        Question : hint.ClarifyingQuestion,
                        MissingFields : hint.MissingFields,
                        RestrictToTool : hint.Tool,
                        ExampleInput : hint.ExampleInput,
                        ClarifyingPrompt : hint.Message,
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
toolsets := rt.ListToolsets() // []string

spec, ok := rt.ToolSpec(toolID) // single ToolSpec
schemas, ok := rt.ToolSchema(toolID) // schémas de charge utile/résultat
specs := rt.ToolSpecsForAgent(chat.AgentID) // []ToolSpec pour un agent
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

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribut("device_id", String, "Identifiant de l'appareil")
        Attribut("start_time", Chaîne, "Horodatage de départ (RFC3339)")
        Attribut("end_time", Chaîne, "Horodatage de fin (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    // Résultat orienté modèle : résumé délimité
    Return(func() {
        Attribut("summary", String, "Résumé du modèle")
        Attribut("count", Int, "Nombre de points de données")
        Attribut("min_value", Float64, "Valeur minimale dans l'intervalle")
        Attribut("max_value", Float64, "Valeur maximale dans l'intervalle")
        Required("summary", "count")
    })
    // Sidecar : données de fidélité pour les interfaces utilisateur
    Artifact("time_series", func() {
        Attribut("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribut("metadata", MapOf(String, String), "Métadonnées supplémentaires")
        Required("data_points")
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
// Obtention d'un artefact à partir d'un résultat d'outil
func GetGetTimeSeriesSidecar(res *planner.ToolResult) (*GetTimeSeriesSidecar, error)

// Attacher un artefact à un résultat d'outil
func SetGetTimeSeriesSidecar(res *planner.ToolResult, sc *GetTimeSeriesSidecar) error
```

#### Runtime Usage Patterns

**In tool executors**, attach artifacts to results:

```go
func (e *Executor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)
    
    // Récupération des données complètes
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return &planner.ToolResult{Error : planner.ToolErrorFromError(err)}, nil
    }
    
    // Construction d'un résultat délimité orienté vers le modèle
    result := &specs.GetTimeSeriesResult{
        Résumé : fmt.Sprintf("Récupéré %d points de données de %s à %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count : len(fullData.Points),
        MinValue : fullData.Min,
        MaxValue : fullData.Max,
    }
    
    // Construction d'un artefact de fidélité pour les interfaces utilisateur
    artefact := &specs.GetTimeSeriesSidecar{
        DataPoints : fullData.Points,
        Metadata : fullData.Metadata,
    }
    
    // Attachement de l'artefact au résultat
    toolResult := &planner.ToolResult{
        Name : call.Name,
        Result : result,
    }
    specs.SetGetTimeSeriesSidecar(toolResult, artefact)
    
    return toolResult, nil
}
```

**In stream subscribers or UI handlers**, access artifacts:

```go
func handleToolEnd(event *stream.ToolEndEvent) {
    // Les artefacts sont disponibles sur l'événement
    for _, artifact := range event.Artifacts {
        switch artefact.Kind {
        case "time_series" :
            // Rendu d'un graphique de série temporelle
            renderTimeSeriesChart(artifact.Data)
        case "topology" :
            // Rendu d'un graphique de réseau
            renderTopologyGraph(artifact.Data)
        }
    }
}
```

#### Artifact Structure

The `planner.Artifact` type carries:

```go
type Artifact struct {
    Kind string // Type logique (par exemple, "time_series", "chart_data")
    Data any // Charge utile sérialisable en JSON
    SourceTool tools.Ident // Outil qui a produit cet artefact
    RunLink *run.Handle // Lien vers l'exécution de l'agent imbriqué (pour l'agent en tant qu'outil)
}
```

#### Quand utiliser les artefacts

Utilisez les artefacts dans les cas suivants
- Les résultats de l'outil comprennent des données trop volumineuses pour le contexte du modèle (séries temporelles, journaux, grands tableaux)
- Les interfaces utilisateur ont besoin de données structurées pour la visualisation (diagrammes, graphiques, cartes)
- Vous souhaitez séparer ce que le modèle explique de ce que les utilisateurs voient
- Les systèmes en aval ont besoin de données complètes alors que le modèle fonctionne avec des résumés

Évitez les artefacts lorsque :
- Le résultat complet s'intègre aisément dans le contexte du modèle
- Il n'y a pas d'interface utilisateur ou de consommateur en aval qui ait besoin des données complètes
- Le résultat délimité contient déjà tout ce qui est nécessaire

---

## Meilleures pratiques

- **Placez les validations dans la conception, pas dans les planificateurs** - Utilisez le DSL d'attributs de Goa (`Required`, `MinLength`, `Enum`, etc.)
- **Renvoyez ToolError + RetryHint aux exécuteurs** - Préférez les erreurs structurées aux paniques ou aux simples retours `error`
- **Gardez les indications concises mais exploitables** - Concentrez-vous sur les champs manquants/invalides, une courte question de clarification et une petite carte `ExampleInput`
- **Apprenez aux planificateurs à lire les indices** - Faites de la gestion des `RetryHint` un élément de premier ordre de votre planificateur
- **Évitez la revalidation à l'intérieur des services** - Goa-AI suppose que la validation a lieu à la frontière de l'outil

---

## Prochaines étapes

- **[Composition d'agents](./agent-composition.md)** - Construire des systèmes complexes avec des modèles d'agents en tant qu'outils
- **[Intégration MCP](./mcp-integration.md)** - Se connecter à des serveurs d'outils externes
- **[Runtime](./runtime.md)** - Comprendre le flux d'exécution de l'outil
