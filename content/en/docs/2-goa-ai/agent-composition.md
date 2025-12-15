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
- **Cross-Process**: Agents can execute on different workers while maintaining a coherent run tree; `AgentRunStarted` events and run handles link parent tool calls to child agent runs for streaming and observability

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
  - Tracked durably via `run.Record` (status, timestamps, labels)

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
- UIs to create nested "agent cards" that can subscribe to the child run's stream
- External tooling to navigate from a parent run to its children without guessing

---

## Per-Run Streams

Each run has its **own stream** of `stream.Event` values:

- `AssistantReply`, `PlannerThought`
- `ToolStart`, `ToolUpdate`, `ToolEnd`
- `AwaitClarification`, `AwaitExternalTools`
- `Usage`, `Workflow`
- `AgentRunStarted` (link from parent tool → child run)

Consumers subscribe per run:

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* handle */ }
defer stop()
```

This avoids global firehoses and lets UIs:
- Attach one connection per run (e.g., per chat session)
- Decide when to "drill into" child agents by subscribing to their runs using `AgentRunStarted` metadata (`ChildRunID`, `ChildAgentID`)

---

## Stream Profiles and Child Policies

`stream.StreamProfile` describes what an audience sees. Each profile controls:

- Which event kinds are included (`Assistant`, `Thoughts`, `ToolStart`, `ToolUpdate`, `ToolEnd`, `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`, `AgentRuns`)
- How child runs are projected via `ChildStreamPolicy`

### StreamProfile Structure

```go
type StreamProfile struct {
    Assistant          bool              // Assistant reply events
    Thoughts           bool              // Planner thinking/reasoning events
    ToolStart          bool              // Tool invocation start events
    ToolUpdate         bool              // Tool progress update events
    ToolEnd            bool              // Tool completion events
    AwaitClarification bool              // Human clarification requests
    AwaitExternalTools bool              // External tool execution requests
    Usage              bool              // Token usage events
    Workflow           bool              // Run lifecycle events
    AgentRuns          bool              // Agent-as-tool link events
    ChildPolicy        ChildStreamPolicy // How child runs are projected
}
```

### ChildStreamPolicy Options

The `ChildStreamPolicy` controls how nested agent runs appear in the stream:

| Policy | Constant | Behavior |
|--------|----------|----------|
| **Off** | `ChildStreamPolicyOff` | Child runs are hidden from this audience; only parent tool calls and results are visible. Best for metrics pipelines that don't need nested detail. |
| **Flatten** | `ChildStreamPolicyFlatten` | Child events are projected into the parent run stream, creating a debug-style "firehose" view. Useful for operational debugging where you want all events in one stream. |
| **Linked** | `ChildStreamPolicyLinked` | Parent emits `AgentRunStarted` link events; child events remain on their own streams. UIs can subscribe to child streams on demand. Best for structured chat interfaces. |

### Built-in Profiles

Goa-AI provides three built-in profiles for common use cases:

**`stream.UserChatProfile()`** – End-user chat interfaces

```go
// Returns a profile suitable for end-user chat views
func UserChatProfile() StreamProfile {
    return StreamProfile{
        Assistant:          true,
        Thoughts:           true,
        ToolStart:          true,
        ToolUpdate:         true,
        ToolEnd:            true,
        AwaitClarification: true,
        AwaitExternalTools: true,
        Usage:              true,
        Workflow:           true,
        AgentRuns:          true,
        ChildPolicy:        ChildStreamPolicyLinked,
    }
}
```

- Emits all event types for rich UI rendering
- Uses **Linked** child policy so UIs can render nested "agent cards" and subscribe to child streams on demand
- Keeps the main chat lane clean while allowing drill-down into nested agents

**`stream.AgentDebugProfile()`** – Operational debugging

```go
// Returns a verbose profile for debugging views
func AgentDebugProfile() StreamProfile {
    p := DefaultProfile()
    p.ChildPolicy = ChildStreamPolicyFlatten
    return p
}
```

- Emits all event types like `UserChatProfile`
- Uses **Flatten** child policy to project all child events into the parent stream
- Still emits `AgentRunStarted` links for correlation
- Ideal for debug consoles and troubleshooting tools

**`stream.MetricsProfile()`** – Telemetry pipelines

```go
// Returns a profile for metrics/telemetry pipelines
func MetricsProfile() StreamProfile {
    return StreamProfile{
        Usage:       true,
        Workflow:    true,
        ChildPolicy: ChildStreamPolicyOff,
    }
}
```

- Emits only `Usage` and `Workflow` events
- Uses **Off** child policy to hide nested runs entirely
- Minimal overhead for cost tracking and performance monitoring

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
    ChildPolicy: stream.ChildStreamPolicyLinked,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

// Custom profile: flatten child runs but skip thoughts
flatNoThoughts := stream.StreamProfile{
    Assistant:          true,
    ToolStart:          true,
    ToolUpdate:         true,
    ToolEnd:            true,
    AwaitClarification: true,
    AwaitExternalTools: true,
    Usage:              true,
    Workflow:           true,
    AgentRuns:          true,
    ChildPolicy:        stream.ChildStreamPolicyFlatten,
}

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Profile Selection Guidelines

| Audience | Recommended Profile | Rationale |
|----------|---------------------|-----------|
| End-user chat UI | `UserChatProfile()` | Clean structure with expandable agent cards |
| Admin/debug console | `AgentDebugProfile()` | Full visibility with flattened child events |
| Metrics/billing | `MetricsProfile()` | Minimal events for aggregation |
| Audit logging | Custom (all events, linked) | Complete record with structured hierarchy |
| Real-time dashboards | Custom (workflow + usage) | Status and cost tracking only |

Applications choose the profile when wiring sinks and bridges (e.g., Pulse, SSE, WebSocket) so:
- Chat UIs stay clean and structured (linked child runs, agent cards)
- Debug consoles can see full nested event streams
- Metrics pipelines see just enough to aggregate usage and statuses

---

## Designing UIs with Run Trees

Given the run tree + streaming model, a typical chat UI can:

1. Subscribe to the **root chat run** with a user chat profile
2. Render:
   - Assistant replies
   - Tool rows for top-level tools
   - "Agent run started" events as nested **Agent Cards**
3. When the user expands a card:
   - Subscribe to the child run using `ChildRunID`
   - Render that agent's own timeline (thoughts, tools, awaits) inside the card
   - Keep the main chat lane clean

Debug tools can subscribe with a debug profile to see:
- Flattened child events
- Explicit parent/child metadata
- Full run trees for troubleshooting

The key idea: **execution topology (run tree) is always preserved**, and streaming is just a set of projections over that tree for different audiences.

---

## Next Steps

- **[MCP Integration](./mcp-integration.md)** - Connect to external tool servers
- **[Memory & Sessions](./memory-sessions.md)** - Manage state with transcripts and memory stores
- **[Production](./production.md)** - Deploy with Temporal and streaming UI
