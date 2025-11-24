---
title: "Toolsets"
linkTitle: "Toolsets"
weight: 3
description: "Learn about toolset types, execution models, and composition patterns."
---

Toolsets are collections of tools that agents can use. Goa-AI supports several toolset types, each with different execution models and use cases.

## Toolset Types

### Service-Owned Toolsets (Method-Backed)

Declared via `Toolset("name", func() { ... })`; tools may `BindTo` Goa service methods or be implemented by custom executors.

- Codegen emits per-toolset specs/types/codecs under `gen/<service>/tools/<toolset>/`
- Agents that `Use` these toolsets import the provider specs and get typed call builders and executor factories
- Applications register executors that decode typed args (via runtime-provided codecs), optionally use transforms, call service clients, and return `ToolResult`

### Agent-Implemented Toolsets (Agent-as-Tool)

Defined in an agent `Export` block, and optionally `Use`d by other agents.

- Ownership still lives with the service; the agent is the implementation
- Codegen emits provider-side `agenttools/<toolset>` helpers with `NewRegistration` and typed call builders
- Consumer-side helpers in agents that `Use` the exported toolset delegate to provider helpers while keeping routing metadata centralized
- Execution happens inline; payloads are passed as canonical JSON and decoded only at the boundary if needed for prompts

### MCP Toolsets

Declared via `MCPToolset(service, suite)` and referenced via `Use(MCPToolset(...))`.

- Generated registration sets `DecodeInExecutor=true` so raw JSON is passed through to the MCP executor
- MCP executor decodes using its own codecs
- Generated wrappers handle JSON schemas/encoders and transports (HTTP/SSE/stdio) with retries and tracing

## Execution Models

### Activity-Based Execution (Default)

Service-backed toolsets execute via Temporal activities (or equivalent in other engines):

1. Planner returns tool calls in `PlanResult` (payload is `json.RawMessage`)
2. Runtime schedules `ExecuteToolActivity` for each tool call
3. Activity decodes payload via generated codec for validation/hints
4. Calls the toolset registration's `Execute(ctx, planner.ToolRequest)` with canonical JSON
5. Re-encodes the result with the generated result codec

### Inline Execution (Agent-as-Tool)

Agent-as-tool toolsets execute inline from the planner's perspective while the runtime
runs the provider agent as a real child run:

1. The runtime detects `Inline=true` on the toolset registration.
2. It injects the `engine.WorkflowContext` into `ctx` so the toolset's `Execute` function
   can start the provider agent as a child workflow with its own `RunID`.
3. It calls the toolset's `Execute(ctx, call)` with canonical JSON payload and tool
   metadata (including parent `RunID` and `ToolCallID`).
4. The generated agent-tool executor builds nested agent messages (system + user) from
   the tool payload and runs the provider agent as a child run using runtime helpers.
5. The nested agent executes a full plan/execute/resume loop in its own run; its
   `RunOutput` and tool events are aggregated into a parent `planner.ToolResult` that
   carries the result payload, aggregated telemetry, child `ChildrenCount`, and a
   `RunLink` pointing at the child run.
6. Stream subscribers emit both `tool_start` / `tool_end` for the parent tool call and
   an `agent_run_started` link event so UIs and debuggers can attach to the child run's
   stream on demand.

## Executor-First Model

Generated service toolsets expose a single, generic constructor:

```go
New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)
```

Applications register an executor implementation for each consumed toolset. The executor decides how to run the tool (service client, MCP, nested agent, etc.) and receives explicit per-call metadata via `ToolCallMeta`.

### Executor Example

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error: planner.NewToolError("invalid payload"),
            }, nil
        }
        
        // Optional transforms if emitted by codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return planner.ToolResult{
                Error: planner.ToolErrorFromError(err),
            }, nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return planner.ToolResult{Payload: tr}, nil
        
    default:
        return planner.ToolResult{
            Error: planner.NewToolError("unknown tool"),
        }, nil
    }
}
```

## Transforms

When a tool is bound to a Goa method via `BindTo`, code generation analyzes the tool Arg/Return and the method Payload/Result. If the shapes are compatible, Goa emits type-safe transform helpers:

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

Transforms are emitted under `gen/<service>/agents/<agent>/specs/<toolset>/transforms.go` and use Goa's GoTransform to safely map fields. If a transform isn't emitted, write an explicit mapper in the executor.

## Tool Identity

Each toolset defines typed tool identifiers (`tools.Ident`) for all generated tools—including non-exported toolsets. Prefer these constants over ad-hoc strings:

```go
import chattools "example.com/assistant/gen/orchestrator/agents/chat/agenttools/search"

// Use a generated constant instead of ad-hoc strings/casts
spec, _ := rt.ToolSpec(chattools.Search)
schemas, _ := rt.ToolSchema(chattools.Search)
```

For exported toolsets (agent-as-tool), Goa-AI also generates **agenttools**
packages with:

- typed tool IDs,
- alias payload/result types,
- codecs,
- and helper builders (for example, `New<Search>Call`).

Use these helpers in planners and runtime/introspection code to avoid stringly
typed IDs and keep your tool references aligned with the design.

## Decode & Validation Semantics

Goa-AI uses a **canonical JSON** contract for tool payloads:

- **Planners**: Always pass `json.RawMessage` in `ToolRequest.Payload`. Planners do not need to decode tool arguments into typed structs.
- **Runtime**: Handles all schema-aware decoding. It decodes JSON payloads into typed structs for validation, retry hints, and agent-as-tool prompt rendering.
- **Executors**: Receive the canonical JSON. They can use generated codecs to decode into typed structs for implementation logic.

Strict validation remains at the service boundary (Goa service). Validation errors returned by services can be mapped to `RetryHint` if you choose to surface recoverable guidance to planners.

## Next Steps

- Learn about [MCP Integration](../4-mcp-integration.md) for external tool suites
- Explore [Agent Composition](../../4-tutorials/2-agent-composition/) for agent-as-tool patterns
- Read the [Runtime Concepts](../2-runtime/) to understand tool execution flow

