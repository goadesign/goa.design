---
title: Toolsets
weight: 4
description: "Learn about toolset types, execution models, validation, retry hints, and tool catalogs in Goa-AI."
llm_optimized: true
aliases:
---

Toolsets are collections of tools that agents can use. Goa-AI supports several toolset types, each with different execution models and use cases.

## Toolset Types

### Service-Owned Toolsets (Method-Backed)

Declared via `Toolset("name", func() { ... })`; tools may `BindTo` Goa service methods or be implemented by custom executors.

- Codegen emits per-toolset specs/types/codecs/transforms under `gen/<service>/toolsets/<toolset>/`
- When using the Internal Tool Registry, codegen also emits `gen/<service>/toolsets/<toolset>/provider.go` for registry-routed, service-side execution
- Agents that `Use` these toolsets import the provider specs and get typed call builders and executor factories
- Applications register executors that decode typed args (via runtime-provided codecs), optionally use transforms, call service clients, and return `ToolResult`

If you deploy the Internal Tool Registry for cross-process invocation, the owning service runs a provider loop that subscribes to `toolset:<toolsetID>:requests` and publishes results to `result:<toolUseID>`. See the [Registry docs]({{< ref "/docs/2-goa-ai/registry.md" >}}) for the provider wiring snippet.

### Agent-Implemented Toolsets (Agent-as-Tool)

Defined in an agent `Export` block, and optionally `Use`d by other agents.

- Ownership still lives with the service; the agent is the implementation
- Codegen emits provider-side export packages under `gen/<service>/agents/<agent>/exports/<export>` with `NewRegistration` and typed call builders
- Consumer-side helpers in agents that `Use` the exported toolset delegate to provider helpers while keeping routing metadata centralized
- Execution happens inline; payloads are passed as canonical JSON and decoded only at the boundary if needed for prompts

### MCP Toolsets

Declared via `Toolset(FromMCP(service, suite))` for Goa-backed MCP suites, or
`Toolset("name", FromExternalMCP(service, suite), func() { ... })` for external
MCP servers with inline tool schemas.

- Generated registration sets `DecodeInExecutor=true` so raw JSON is passed through to the MCP executor
- MCP executor decodes using its own codecs
- Generated wrappers handle JSON schemas/encoders and transports (HTTP/SSE/stdio) with retries and tracing

### When to Use BindTo vs Inline Implementations

**Use `BindTo` when:**
- The tool should call an existing Goa service method
- You want generated transforms between tool and method types
- The service method already has the business logic you need
- You want to reuse validation and error handling from the service layer

```go
// Tool bound to existing service method
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Calls the Search method on the same service
})
```

**Use inline implementations when:**
- The tool has custom logic not tied to a service method
- You need to orchestrate multiple service calls
- The tool is purely computational (no external calls)
- You want full control over the execution flow

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

For inline implementations, you write the executor logic directly:

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

### Bounded Tool Results

Some tools naturally return large lists, graphs, or time-series windows. You can mark these as **bounded views** so that services remain responsible for trimming while the runtime enforces and surfaces the contract.

#### The agent.Bounds Contract

The `agent.Bounds` type is a small, provider-agnostic contract that describes how a tool result has been bounded relative to the full underlying data set:

```go
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied (length, window, depth)
    RefinementHint string // Guidance on how to narrow the query when truncated
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
2. **Populating runtime bounds metadata**: Setting `planner.ToolResult.Bounds`
3. **Providing refinement hints**: Guiding users/models on how to narrow queries when results are truncated

This design keeps truncation logic where domain knowledge lives (in services) while providing a uniform contract for the runtime, planners, and UIs to consume.

#### Declaring Bounded Tools

Use the DSL helper `BoundedResult()` inside a `Tool` definition:

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Opaque pagination cursor")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Matching devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
    BindTo("DeviceService", "ListDevices")
})
```

#### Code Generation

When a tool is marked with `BoundedResult()`:

- The generated tool spec includes `tools.ToolSpec.Bounds`
- The generated JSON result schema includes the canonical bounded fields (`returned`, `total`,
  `truncated`, `refinement_hint`, and optional `next_cursor`)
- The semantic Go result type stays domain-specific; it does not need to duplicate those fields

For method-backed `BindTo` tools, the bound service method result still needs to
carry the canonical bounded fields so the generated executor can build
`planner.ToolResult.Bounds` before runtime projection.

```go
spec.Bounds = &tools.BoundsSpec{
    Paging: &tools.PagingSpec{
        CursorField:     "cursor",
        NextCursorField: "next_cursor",
    },
}
```

#### Implementing Bounded Tools

Bounded tools are a hard contract: services implement truncation and populate bounds metadata on every successful code path.

**Contract:**

- `Bounds.Returned` and `Bounds.Truncated` must always be set on successful bounded tool results.
- `Bounds.Total`, `Bounds.NextCursor`, and `Bounds.RefinementHint` are optional and should only be set when known.

Executors implement truncation and populate bounds metadata:

```go
func (e *DeviceExecutor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := specs.UnmarshalListDevicesPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("invalid payload"),
        }), nil
    }

    devices, total, nextCursor, truncated, err := e.repo.QueryDevices(ctx, args.SiteID, args.Cursor)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name: call.Name,
        Result: &ListDevicesResult{
            Devices: devices,
        },
        Bounds: &agent.Bounds{
            Returned:       len(devices),
            Total:          ptr(total),
            Truncated:      truncated,
            NextCursor:     nextCursor,
            RefinementHint: "Add a status filter or reduce the site scope to see fewer results",
        },
    }), nil
}
```

#### Runtime Behavior

When a bounded tool executes:

1. The runtime validates that a successful bounded tool returned `planner.ToolResult.Bounds`
2. The runtime merges those bounds into the emitted JSON using field names from `BoundedResult(...)`
3. Bounds remain attached to `planner.ToolResult.Bounds`
4. Stream subscribers and finalizers can access bounds for UI display, logging, or policy decisions

```go
// In a stream subscriber
func handleToolEnd(event *stream.ToolEndEvent) {
    if event.Bounds != nil && event.Bounds.Truncated {
        log.Printf("Tool %s returned %d of %d results (truncated)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if event.Bounds.RefinementHint != "" {
            log.Printf("Hint: %s", event.Bounds.RefinementHint)
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
2. **Validated at design time**: The bound method payload must expose the field as a required `String`
3. **Executor population**: Generated service executors copy supported values from `runtime.ToolCallMeta` before optional interceptor hooks run

#### DSL Declaration

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
    Inject("session_id")  // Hidden from LLM, populated at runtime
})
```

#### Generated Code

Generated method-backed executors copy injected fields from `runtime.ToolCallMeta`
onto the typed method payload before invoking the service client:

```go
p := specs.InitGetUserDataMethodPayload(toolArgs)
p.SessionID = meta.SessionID
```

Supported injected field names are fixed: `run_id`, `session_id`, `turn_id`,
`tool_call_id`, and `parent_tool_call_id`.

#### Runtime Population via Generated Interceptors

Generated service executors also expose typed interceptor hooks. Use them to
derive method payload fields from request context or other runtime state:

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

### Result Materializers

Toolsets may register a typed result materializer:

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
        // Attach deterministic, server-only sidecars here.
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

Contract:

- `ResultMaterializer` runs on both the **normal execution path** and the **externally provided-result await path**.
- It receives the original typed `planner.ToolRequest` plus the typed `planner.ToolResult`, before the runtime encodes JSON for hooks, workflow boundaries, or callers.
- Use it to attach `result.ServerData` or to normalize the semantic result shape in a deterministic way.
- Keep it pure and deterministic; when it runs inside workflow code it must not perform I/O.

This is the canonical place to derive observer-only sidecars from the original tool payload and the typed result while keeping those sidecars invisible to model providers.

---

## Executor-First Model

Generated service toolsets expose registration helpers that accept
`runtime.ToolCallExecutor` implementations for the toolsets an agent uses.

```go
if err := chat.RegisterUsedToolsets(ctx, rt,
    chat.WithSearchExecutor(searchExec),
    chat.WithProfilesExecutor(profileExec),
); err != nil {
    return err
}
```

Applications register an executor implementation for each consumed local
toolset. The executor decides how to run the tool (service client, custom
function, registry caller, etc.) and receives explicit per-call metadata via
`ToolCallMeta`.

**Executor Example:**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name: call.Name,
                Error: planner.NewToolError("invalid payload"),
            }), nil
        }
        
        // Optional transforms if emitted by codegen
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
    // Access run context directly from meta
    log.Printf("Executing tool in run %s, session %s, turn %s", 
        meta.RunID, meta.SessionID, meta.TurnID)
    
    // Use ToolCallID for correlation
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    defer span.End()
    
    typedResult := buildTypedResult()
    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: typedResult}), nil
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

// Use a generated constant instead of ad-hoc strings/casts
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
    Reason             RetryReason
    Tool               tools.Ident
    RestrictToTool     bool
    MissingFields      []string
    ExampleInput       map[string]any
    PriorInput         map[string]any
    ClarifyingQuestion string
    Message            string
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
    Name          tools.Ident
    Result        any
    Error         *ToolError
    RetryHint     *RetryHint
    Telemetry     *telemetry.ToolTelemetry
    ToolCallID    string
    ChildrenCount int
    RunLink       *run.Handle
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
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Payload did not match the expected schema.",
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
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            return &planner.PlanResult{
                Await: &planner.Await{
                    Clarification: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Question:         hint.ClarifyingQuestion,
                        MissingFields:    hint.MissingFields,
                        RestrictToTool:   hint.Tool,
                        ExampleInput:     hint.ExampleInput,
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
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // single ToolSpec
schemas, ok := rt.ToolSchema(toolID)           // payload/result schemas
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // []ToolSpec for one agent
```

Where `toolID` is a typed `tools.Ident` constant from a generated specs or agenttools package.

### Server Data

Some tools need to return rich observer-facing output - full time series,
topology graphs, large result sets, evidence references - that is useful for UIs
and audit systems but too heavy for model providers. Goa-AI models that
non-model output as **server-data**.

#### Model-Facing vs Server Data

The key distinction is what data flows where:

| Data Type | Sent to Model | Stored/Streamed | Purpose |
|-----------|---------------|-----------------|---------|
| **Model-facing result** | ✓ | ✓ | Bounded summary the LLM reasons about |
| **Timeline server-data** | ✗ | ✓ | Observer-facing data for UIs, timelines, charts, maps, and tables |
| **Evidence server-data** | ✗ | ✓ | Provenance references or audit evidence |
| **Internal server-data** | ✗ | Depends on consumer | Tool-composition attachments or server-only metadata |

This separation lets you:
- Keep model context windows bounded and focused
- Provide rich visualizations (charts, graphs, tables) without bloating LLM prompts
- Attach provenance and audit data that models don't need to see
- Stream large datasets to UIs while the model works with summaries

#### Declaring ServerData in DSL

Use the `ServerData(kind, schema)` function inside a `Tool` definition:

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

The `kind` parameter (e.g., `"atlas.time_series"`) identifies the server-data kind so UIs can dispatch appropriate renderers.
The audience declares routing intent:

- `AudienceTimeline()` for observer-facing timeline/UI payloads.
- `AudienceEvidence()` for provenance or audit evidence.
- `AudienceInternal()` for server-only composition payloads.

Use `FromMethodResultField("field_name")` with `BindTo(...)` tools when the
server-data payload is projected from a field on the bound service method result.

#### Generated Specs and Helpers

In the specs packages, each `tools.ToolSpec` entry includes:
- `Payload tools.TypeSpec` – tool input schema
- `Result tools.TypeSpec` – model-facing output schema
- `ServerData []*tools.ServerDataSpec` – server-only payloads emitted alongside the result

Server-data entries include generated schemas and codecs so subscribers can
decode canonical JSON bytes without sending those bytes to model providers.

#### Runtime Usage Patterns

**In tool executors**, attach canonical server-data JSON to the tool result:

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

Method-backed tools can also attach server-data through generated providers and
result materializers. A materializer is deterministic and runs on both normal
execution and externally provided-result await paths:

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

**In stream subscribers or UI handlers**, read `ServerData` from tool end events
or run logs and decode it with the generated codecs for the declared kinds:

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

#### When to Use ServerData

Use server-data when:
- Tool results include data too large for model context (time series, logs, large tables)
- UIs need structured data for visualization (charts, graphs, maps)
- You want to separate what the model reasons about from what users see
- Downstream systems need full-fidelity data while the model works with summaries

Avoid server-data when:
- The full result fits comfortably in model context
- There's no UI or downstream consumer that needs the full data
- The bounded result already contains everything needed

---

## Best Practices

- **Put validations in the design, not in planners** – Use Goa's attribute DSL (`Required`, `MinLength`, `Enum`, etc.)
- **Return ToolError + RetryHint from executors** – Prefer structured errors over panics or plain `error` returns
- **Keep hints concise but actionable** – Focus on which fields are missing/invalid, a short clarifying question, and a small `ExampleInput` map
- **Teach planners to read hints** – Make `RetryHint` handling a first-class part of your planner
- **Avoid re-validating inside services** – Goa-AI assumes validation happens at the tool boundary

---

## Next Steps

- **[Agent Composition](./agent-composition.md)** - Build complex systems with agent-as-tool patterns
- **[MCP Integration](./mcp-integration.md)** - Connect to external tool servers
- **[Runtime](./runtime.md)** - Understand tool execution flow
