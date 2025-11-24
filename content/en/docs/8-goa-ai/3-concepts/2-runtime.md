---
title: "Runtime Concepts"
linkTitle: "Runtime Concepts"
weight: 2
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
---

The Goa-AI runtime orchestrates the plan/execute/resume loop, enforces policies, manages state, and coordinates with engines, planners, tools, memory, hooks, and feature modules.

## Architecture Overview

| Layer | Responsibility |
| --- | --- |
| DSL + Codegen | Produce agent registries, tool specs/codecs, workflows, MCP adapters |
| Runtime Core | Orchestrates plan/start/resume loop, policy enforcement, hooks, memory, streaming |
| Workflow Engine Adapter | Temporal adapter implements `engine.Engine`; other engines can plug in |
| Feature Modules | Optional integrations (MCP, Pulse, Mongo stores, model providers) |

## High-Level Agentic Architecture

At runtime, Goa-AI organizes your system around a small set of composable constructs:

- **Agents**: Long-lived orchestrators identified by `agent.Ident` (for example, `service.chat`).  
  Each agent owns a planner, run policy, generated workflows, and tool registrations.

- **Runs**: A single execution of an agent.  
  Runs are identified by a `RunID` and tracked via `run.Context` and `run.Handle`, and are
  grouped by `SessionID` and `TurnID` to form conversations.

- **Toolsets & tools**: Named collections of capabilities, identified by `tools.Ident`
  (`service.toolset.tool`). Service-backed toolsets call APIs; agent-backed toolsets run
  other agents as tools.

- **Planners**: Your LLM-driven strategy layer implementing `PlanStart` / `PlanResume`.  
  Planners decide when to call tools versus answer directly; the runtime enforces caps and
  time budgets around those decisions.

- **Run tree & agent-as-tool**: When an agent calls another agent as a tool, the runtime
  starts a real child run with its own `RunID`. The parent `ToolResult` carries a `RunLink`
  (`*run.Handle`) pointing to the child, and a corresponding `AgentRunStarted` event is
  emitted in the parent run so UIs and debuggers can attach to the child stream on demand.

- **Streams & profiles**: Every run has its own stream of `stream.Event` values
  (assistant replies, planner thoughts, tool start/update/end, awaits, usage, workflow,
  and agent-run links). `stream.StreamProfile` selects which event kinds are visible for a
  given audience (chat UI, debug, metrics) and how child runs are projected:
  off, flattened, or linked.

This mental model lets you build complex agent graphs while keeping execution,
observability, and UI projections cleanly separated and easy to reason about.

## Quick Start

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/features/model"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, []model.Message{
        {Role: model.ConversationRoleUser, Content: "Summarize the latest status."},
    }, runtime.WithSessionID("session-1"))
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Content, etc.
}
```

## Client-Only vs Worker

Two roles use the runtime:

- **Client-only** (submit runs): Constructs a runtime with a client-capable engine and does not register agents. Use the generated `<agent>.NewClient(rt)` which carries the route (workflow + queue) registered by remote workers.
- **Worker** (execute runs): Constructs a runtime with a worker-capable engine, registers agents (with real planners), and lets the engine poll and execute workflows/activities.

### Client-Only Example

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
out, err := client.Run(ctx, msgs, runtime.WithSessionID("s1"))
```

### Worker Example

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // worker-enabled engine
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// Start engine worker loop per engine's integration (for example, Temporal worker.Run()).
```

## Plan → Execute Tools → Resume (Loop)

1. The runtime starts a workflow for the agent (in-memory or Temporal) and records a new
   `run.Context` with `RunID`, `SessionID`, `TurnID`, labels, and policy caps.
2. It calls your planner's `PlanStart` with the current messages and run context.
3. It schedules tool calls returned by the planner (planner passes canonical JSON
   payloads; the runtime handles encoding/decoding using generated codecs).
4. It calls `PlanResume` with tool results; the loop repeats until the planner returns
   a final response or caps/time budgets are hit. As execution progresses, the run
   advances through `run.Phase` values (`prompted`, `planning`, `executing_tools`,
   `synthesizing`, terminal phases).
5. Hooks and stream subscribers emit events (planner thoughts, tool start/update/end,
   awaits, usage, workflow, agent-run links) and, when configured, persist transcript
   entries and run metadata.

## Policies and Caps

Enforced per planner turn:

- **Max tool calls**: Prevents runaway loops
- **Consecutive failures**: Aborts after N consecutive tool failures
- **Time budgets**: Wall-clock limits enforced by the runtime

Tools can be allowlisted/filtered by policy engines.

## Tool Execution

- **Native toolsets**: You write implementations; runtime handles decoding typed args using generated codecs
- **Agent-as-tool**: Generated agent-tool toolsets run provider agents as child runs
  (inline from the planner's perspective) and adapt their `RunOutput` into a
  `planner.ToolResult` with a `RunLink` handle back to the child run
- **MCP toolsets**: Runtime forwards canonical JSON to generated callers; callers handle transport

## Memory, Streaming, Telemetry

- **Hook bus** publishes structured hook events for the full agent lifecycle:
  run start/completion, phase changes, tool scheduling/results/updates, planner notes
  and thinking blocks, awaits, retry hints, and agent-as-tool links.
- **Memory stores** (`memory.Store`) subscribe and append durable memory events
  (user/assistant messages, tool calls, tool results, planner notes, thinking) per
  `(agentID, RunID)`.
- **Run stores** (`run.Store`) track run metadata (status, phases, labels, timestamps)
  for search and operational dashboards.
- **Stream sinks** (`stream.Sink`, for example Pulse or custom SSE/WebSocket) receive
  typed `stream.Event` values produced by the `stream.Subscriber`. A `StreamProfile`
  controls which event kinds are emitted and how child runs are projected (off,
  flattened, linked).
- **Telemetry**: OTEL-aware logging, metrics, and tracing instrument workflows and
  activities end to end.

## Engine Abstraction

- **In-memory**: Fast dev loop, no external deps
- **Temporal**: Durable execution, replay, retries, signals, workers; adapters wire activities and context propagation

## Run Contracts

- `SessionID` is required at run start. `Start` fails fast when `SessionID` is empty or whitespace
- Agents must be registered before the first run. The runtime rejects registration after the first run submission with `ErrRegistrationClosed` to keep engine workers deterministic
- Tool executors receive explicit per-call metadata (`ToolCallMeta`) rather than fishing values from `context.Context`
- Do not rely on implicit fallbacks; all domain identifiers (run, session, turn, correlation) must be passed explicitly

## Pause & Resume

Human-in-loop workflows can suspend and resume runs using the runtime's interrupt helpers:

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// Pause
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// Resume
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

Behind the scenes, pause/resume signals update the run store and emit `run_paused`/`run_resumed` hook events so UI layers stay in sync.

## Hooks, Memory, and Streaming

The runtime publishes structured events to a hook bus. Default subscribers include:

- **Memory subscriber** – writes tool calls, tool results, planner notes, thinking blocks,
  and assistant responses to the configured `memory.Store`
- **Stream subscriber** – maps hook events into typed `stream.Event` values
  (`AssistantReply`, `PlannerThought`, `ToolStart`, `ToolUpdate`, `ToolEnd`,
  `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`,
  `AgentRunStarted`) and forwards them to the configured `stream.Sink`

Custom subscribers can register via `Hooks.Register` to emit analytics, trigger approval workflows, etc.

## Planner Contract

Planners implement:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contains tool calls, final response, annotations, and optional `RetryHint`. The runtime enforces caps, schedules tool activities, and feeds tool results back into `PlanResume` until a final response is produced.

## Feature Modules

- `features/mcp/*` – MCP suite DSL/codegen/runtime callers (HTTP/SSE/stdio)
- `features/memory/mongo` – durable memory store
- `features/run/mongo` – run metadata store + search repositories
- `features/stream/pulse` – Pulse sink/subscriber helpers
- `features/model/{bedrock,openai}` – model client adapters for planners

Each module is optional; services import the ones they need and either pass the resulting
clients into `runtime.New` via functional options (for example, `runtime.WithMemoryStore`,
`runtime.WithRunStore`, `runtime.WithStream`) or wire them directly into their planners.

## Next Steps

- Learn about [Toolsets](../3-toolsets/) to understand tool execution models
- Explore [MCP Integration](../4-mcp-integration.md) for external tool suites
- Read the [Real-World Patterns](../../5-real-world/) for production deployments

