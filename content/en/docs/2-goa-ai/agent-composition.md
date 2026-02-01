---
title: Agent Composition
weight: 5
description: "Learn how to compose agents using agent-as-tool patterns, run trees, and streaming topology."
llm_optimized: true
aliases:
---

This guide demonstrates how to compose agents by treating one agent as a tool of another, and explains how Goa-AI models agent runs as a tree with streaming projections for different audiences.

## What You'll Build

- A planning agent that exports planning tools
- An orchestrator agent that uses the planning agent's tools
- Cross-process composition with inline execution

---

## Designing Composed Agents

Create `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var PlanRequest = Type("PlanRequest", func() {
    Attribute("goal", String, "Goal to plan for")
    Required("goal")
})

var PlanResult = Type("PlanResult", func() {
    Attribute("plan", String, "Generated plan")
    Required("plan")
})

var _ = Service("orchestrator", func() {
    // Planning agent that exports tools
    Agent("planner", "Planning agent", func() {
        Export("planning.tools", func() {
            Tool("create_plan", "Create a plan", func() {
                Args(PlanRequest)
                Return(PlanResult)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(5))
            TimeBudget("1m")
        })
    })
    
    // Orchestrator agent that uses planning tools
    Agent("orchestrator", "Orchestration agent", func() {
        Use(AgentToolset("orchestrator", "planner", "planning.tools"))
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

Generate code:

```bash
goa gen example.com/tutorial/design
```

---

## Implementing Planners

The generated code provides helpers for both agents. Wire them together:

```go
package main

import (
    "context"
    
    planner "example.com/tutorial/gen/orchestrator/agents/planner"
    orchestrator "example.com/tutorial/gen/orchestrator/agents/orchestrator"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Register planning agent
    if err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Register orchestrator agent (automatically uses planning tools)
    if err := orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Use orchestrator agent
    client := orchestrator.NewClient(rt)
    // ... run agent ...
}
```

**Key Concepts:**

- **Export**: Declares toolsets that other agents can use
- **AgentToolset**: References an exported toolset from another agent
- **Inline Execution**: From the caller's perspective, an agent-as-tool behaves like a normal tool call; the runtime runs the provider agent as a child run and aggregates its output into a single `ToolResult` (with a `RunLink` back to the child run)
- **Cross-Process**: Agents can execute on different workers while maintaining a coherent run tree; `child_run_linked` stream events and run handles link parent tool calls to child agent runs for streaming and observability

---

## Passthrough: Deterministic Tool Forwarding

For exported tools that should bypass the planner entirely and forward directly to a service method, use `Passthrough`. This is useful when:

- You want deterministic, predictable behavior (no LLM decision-making)
- The tool is a simple wrapper around an existing service method
- You need guaranteed latency without planner overhead

### When to Use Passthrough vs Normal Execution

| Scenario | Use Passthrough | Use Normal Execution |
|----------|-----------------|----------------------|
| Simple CRUD operations | ✓ | |
| Logging/audit tools | ✓ | |
| Tools requiring LLM reasoning | | ✓ |
| Multi-step workflows | | ✓ |
| Tools that may need retries with hints | | ✓ |

### DSL Declaration

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("level", String, "Log level", func() {
                Enum("debug", "info", "warn", "error")
            })
            Attribute("message", String, "Message to log")
            Required("level", "message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
            Required("logged")
        })
        // Bypass planner, forward directly to LoggingService.LogMessage
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### Runtime Behavior

When a consumer agent calls a passthrough tool:

1. The runtime receives the tool call from the consumer's planner
2. Instead of invoking the provider agent's planner, it directly calls the target service method
3. The result is returned to the consumer without any LLM processing

This provides:
- **Predictable latency**: No LLM inference delay
- **Deterministic behavior**: Same input always produces same output
- **Cost efficiency**: No token usage for simple operations

---

## Run Trees and Sessions

Goa-AI models execution as a **tree of runs and tools**:

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees" >}}

- **Run** – one execution of an agent:
  - Identified by a `RunID`
  - Described by `run.Context` (RunID, SessionID, TurnID, labels, caps)
  - Tracked durably via `runlog.Store` (append-only run event log; cursor-paginated)

- **Session** – a conversation or workflow spanning one or more runs:
  - `SessionID` groups related runs (e.g., multi-turn chat)
  - UIs typically render one session at a time

- **Run tree** – parent/child relationships between runs and tools:
  - Top-level agent run (e.g., `chat`)
  - Child agent runs (agent-as-tool, e.g., `ada`, `diagnostics`)
  - Service tools underneath those agents

The runtime maintains this tree using:

- `run.Handle` – a lightweight handle with `RunID`, `AgentID`, `ParentRunID`, `ParentToolCallID`
- Agent-as-tool helpers and toolset registrations that **always create real child runs** for nested agents (no hidden inline hacks)

---

## Agent-as-Tool and RunLink

When an agent uses another agent as a tool:

1. The runtime starts a **child run** for the provider agent with its own `RunID`
2. It tracks parent/child linkage in `run.Context`
3. It executes a full plan/execute/resume loop in the child

The parent tool result (`planner.ToolResult`) carries:

```go
RunLink *run.Handle
```

This `RunLink` allows:
- Planners to reason about the child run (e.g., for audit/logging)
- UIs to create nested "agent cards" keyed by the child run ID and render child events by filtering the session stream by `run_id`
- External tooling to navigate from a parent run to its children without guessing

---

## Session-Owned Streams

Goa-AI publishes client-facing `stream.Event` values into a single **session-owned stream**:

- `session/<session_id>`

That stream contains events across all runs for the session, including nested agent runs launched as tools. Each event carries both `run_id` and `session_id` so consumers can filter/group events by run.

Two events are critical for UIs:

- `child_run_linked`: links a parent tool call (`tool_call_id`) to the spawned child run (`child_run_id`)
- `run_stream_end`: explicit boundary marker meaning “no more stream-visible events will appear for this run”

Consumers subscribe **once per session** and close SSE/WebSocket when they observe `run_stream_end` for the run they’re currently attached to.

```go
import "goa.design/goa-ai/runtime/agent/stream"

// events come from the session stream
events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt := <-events:
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
    case err := <-errs:
        panic(err)
    }
}
```

---

## Stream Profiles

`stream.StreamProfile` describes what an audience sees. Each profile controls which event kinds are emitted by the subscriber.

### StreamProfile Structure

```go
type StreamProfile struct {
    Assistant          bool // assistant_reply
    Thoughts           bool // planner_thought
    ToolStart          bool // tool_start
    ToolUpdate         bool // tool_update
    ToolEnd            bool // tool_end
    AwaitClarification bool // await_clarification
    AwaitConfirmation  bool // await_confirmation
    AwaitQuestions     bool // await_questions
    AwaitExternalTools bool // await_external_tools
    ToolAuthorization  bool // tool_authorization
    Usage              bool // usage
    Workflow           bool // workflow
    ChildRuns          bool // child_run_linked (parent tool call → child run)
}
```

### Built-in Profiles

Goa-AI provides built-in profiles for common use cases:

- `stream.DefaultProfile()` emits all event kinds.
- `stream.UserChatProfile()` is suitable for end-user chat views.
- `stream.AgentDebugProfile()` is suitable for developer/debug views.
- `stream.MetricsProfile()` emits only `Usage` and `Workflow` events for telemetry pipelines.

In the session-owned streaming model, child runs do not require separate subscriptions. `child_run_linked` exists to let consumers build a run tree and attach child events to the correct UI card while still consuming a single `session/<session_id>` stream.

### Wiring Profiles to Subscribers

Apply profiles when creating stream subscribers:

```go
import "goa.design/goa-ai/runtime/agent/stream"

// Create a subscriber with the user chat profile
chatSub, err := stream.NewSubscriberWithProfile(chatSink, stream.UserChatProfile())
if err != nil {
    return err
}

// Create a subscriber with the debug profile
debugSub, err := stream.NewSubscriberWithProfile(debugSink, stream.AgentDebugProfile())
if err != nil {
    return err
}

// Create a subscriber with the metrics profile
metricsSub, err := stream.NewSubscriberWithProfile(metricsSink, stream.MetricsProfile())
if err != nil {
    return err
}
```

### Creating Custom Profiles

For specialized needs, create custom profiles by setting individual fields:

```go
// Custom profile: tools and workflow only, no thoughts or assistant replies
toolsOnlyProfile := stream.StreamProfile{
    ToolStart:   true,
    ToolUpdate:  true,
    ToolEnd:     true,
    Workflow:    true,
    ChildRuns:   true,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Profile Selection Guidelines

| Audience | Recommended Profile | Rationale |
|----------|---------------------|-----------|
| End-user chat UI | `UserChatProfile()` | Clean structure with expandable agent cards |
| Admin/debug console | `AgentDebugProfile()` | Full visibility into tools, awaits, and workflow phases |
| Metrics/billing | `MetricsProfile()` | Minimal events for aggregation |
| Audit logging | `DefaultProfile()` | Complete record with run-scoped correlation fields |
| Real-time dashboards | Custom (workflow + usage) | Status and cost tracking only |

---

## Validation Errors and Retry Hints

Tool calls often fail due to missing fields, invalid enum values, or wrong JSON shapes.
Goa‑AI surfaces these failures as **structured retry hints** so planners and UIs can
ask precise follow‑up questions without parsing error strings.

### Where Retry Hints Come From

Goa‑AI produces `RetryHint` from validation failures in two places:

1. **Decode‑time (tool codecs)**  
   Generated tool codecs validate tool input JSON before execution. When validation
   fails, the error carries structured field issues (missing fields, constraints, allowed
   values) which the runtime converts into a `RetryHint`.

2. **Execution‑time (tool providers / services)**  
   When a tool provider calls a bound service method, the method may return a Goa
   validation error (e.g., missing required fields or invalid lengths). Providers should
   include structured field issues in the tool result error so consumers can build the
   same `RetryHint` deterministically.

### Practical Effect

- UIs can render “missing fields” prompts and show example payloads.
- Planners can ask a single, targeted clarifying question and retry with correct input.

Applications choose the profile when wiring sinks and bridges (e.g., Pulse, SSE, WebSocket) so:
- Chat UIs stay clean and structured (nested agent cards driven by `child_run_linked`)
- Debug consoles can see full event detail with the same session stream
- Metrics pipelines see just enough to aggregate usage and statuses

---

## Designing UIs with Run Trees

Given the run tree + streaming model, a typical chat UI can:

1. Subscribe to the session stream (`session/<session_id>`) using a user chat profile.
2. Track the active run you’re attached to (`active_run_id`) and render:
   - Assistant replies (`assistant_reply`)
   - Tool lifecycle (`tool_start`/`tool_update`/`tool_end`)
   - Child run links (`child_run_linked`) as nested **Agent Cards** keyed by `child_run_id`
3. For each card, render the child run’s own timeline by filtering the same session stream by `run_id == child_run_id` (no additional subscriptions).
4. Close SSE/WebSocket when you observe `run_stream_end` for `active_run_id`.

The key idea: **execution topology (run tree) is preserved by IDs and link events**, and streaming is a single ordered log per session that you project into UI lanes/cards by filtering on `run_id`.

---

## Next Steps

- **[MCP Integration](./mcp-integration.md)** - Connect to external tool servers
- **[Memory & Sessions](./memory-sessions.md)** - Manage state with transcripts and memory stores
- **[Production](./production.md)** - Deploy with Temporal and streaming UI
