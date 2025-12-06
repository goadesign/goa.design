---
title: "Runtime"
linkTitle: "Runtime"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
  - /en/docs/8-goa-ai/3-concepts/2-runtime/
  - /en/docs/8-goa-ai/3-concepts/9-policies-labels/
  - /en/docs/8-goa-ai/3-concepts/10-llm-integration/
  - /docs/8-goa-ai/3-concepts/2-runtime/
---

## Architecture Overview

The Goa-AI runtime orchestrates the plan/execute/resume loop, enforces policies, manages state, and coordinates with engines, planners, tools, memory, hooks, and feature modules.

| Layer | Responsibility |
| --- | --- |
| DSL + Codegen | Produce agent registries, tool specs/codecs, workflows, MCP adapters |
| Runtime Core | Orchestrates plan/start/resume loop, policy enforcement, hooks, memory, streaming |
| Workflow Engine Adapter | Temporal adapter implements `engine.Engine`; other engines can plug in |
| Feature Modules | Optional integrations (MCP, Pulse, Mongo stores, model providers) |

---

## High-Level Agentic Architecture

At runtime, Goa-AI organizes your system around a small set of composable constructs:

- **Agents**: Long-lived orchestrators identified by `agent.Ident` (for example, `service.chat`). Each agent owns a planner, run policy, generated workflows, and tool registrations.

- **Runs**: A single execution of an agent. Runs are identified by a `RunID` and tracked via `run.Context` and `run.Handle`, and are grouped by `SessionID` and `TurnID` to form conversations.

- **Toolsets & tools**: Named collections of capabilities, identified by `tools.Ident` (`service.toolset.tool`). Service-backed toolsets call APIs; agent-backed toolsets run other agents as tools.

- **Planners**: Your LLM-driven strategy layer implementing `PlanStart` / `PlanResume`. Planners decide when to call tools versus answer directly; the runtime enforces caps and time budgets around those decisions.

- **Run tree & agent-as-tool**: When an agent calls another agent as a tool, the runtime starts a real child run with its own `RunID`. The parent `ToolResult` carries a `RunLink` (`*run.Handle`) pointing to the child, and a corresponding `AgentRunStarted` event is emitted in the parent run so UIs and debuggers can attach to the child stream on demand.

- **Streams & profiles**: Every run has its own stream of `stream.Event` values (assistant replies, planner thoughts, tool start/update/end, awaits, usage, workflow, and agent-run links). `stream.StreamProfile` selects which event kinds are visible for a given audience (chat UI, debug, metrics) and how child runs are projected: off, flattened, or linked.

---

## Quick Start

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
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
    out, err := client.Run(ctx, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }}, runtime.WithSessionID("session-1"))
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

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

---

## Plan → Execute → Resume Loop

1. The runtime starts a workflow for the agent (in-memory or Temporal) and records a new `run.Context` with `RunID`, `SessionID`, `TurnID`, labels, and policy caps.
2. It calls your planner's `PlanStart` with the current messages and run context.
3. It schedules tool calls returned by the planner (planner passes canonical JSON payloads; the runtime handles encoding/decoding using generated codecs).
4. It calls `PlanResume` with tool results; the loop repeats until the planner returns a final response or caps/time budgets are hit. As execution progresses, the run advances through `run.Phase` values (`prompted`, `planning`, `executing_tools`, `synthesizing`, terminal phases).
5. Hooks and stream subscribers emit events (planner thoughts, tool start/update/end, awaits, usage, workflow, agent-run links) and, when configured, persist transcript entries and run metadata.

---

## Run Phases

As a run progresses through the plan/execute/resume loop, it transitions through a series of lifecycle phases. These phases provide fine-grained visibility into where a run is in its execution, enabling UIs to show high-level progress indicators.

### Phase Values

| Phase | Description |
| --- | --- |
| `prompted` | Input has been received and the run is about to begin planning |
| `planning` | The planner is deciding whether and how to call tools or answer directly |
| `executing_tools` | Tools (including nested agents) are currently executing |
| `synthesizing` | The planner is synthesizing a final answer without scheduling additional tools |
| `completed` | The run has completed successfully |
| `failed` | The run has failed |
| `canceled` | The run was canceled |

### Phase Transitions

A typical successful run follows this progression:

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

The runtime emits `RunPhaseChanged` hook events at each transition, allowing stream subscribers to track progress in real time.

### Phase vs Status

Phases are distinct from `run.Status`:

- **Status** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) is the coarse-grained lifecycle state stored in durable run metadata
- **Phase** provides finer-grained visibility into the execution loop, intended for streaming/UX surfaces

### RunPhaseChanged Events

The runtime emits `RunPhaseChanged` hook events whenever a run transitions between phases. Stream subscribers translate these events into `stream.Workflow` payloads for external consumers.

```go
// Hook event emitted by runtime
hooks.NewRunPhaseChangedEvent(runID, agentID, sessionID, run.PhasePlanning)

// Translated to stream event by subscriber
stream.Workflow{
    Data: WorkflowPayload{
        Phase: "planning",
    },
}
```

The `stream.Subscriber` maps `RunPhaseChanged` events to `EventWorkflow` stream events when the profile's `Workflow` flag is enabled. This allows UIs to display progress indicators like "Planning...", "Executing tools...", or "Synthesizing response..." based on the current phase.

---

## Policies, Caps, and Labels

### Design-Time RunPolicy

At design time, you configure per-agent policies with `RunPolicy`:

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

This becomes a `runtime.RunPolicy` attached to the agent's registration:

- **Caps**: `MaxToolCalls` – total tool calls per run. `MaxConsecutiveFailedToolCalls` – consecutive failures before abort.
- **Time budget**: `TimeBudget` – wall-clock budget for the run. `FinalizerGrace` (runtime-only) – optional reserved window for finalization.
- **Interrupts**: `InterruptsAllowed` – opt-in for pause/resume.
- **Missing fields behavior**: `OnMissingFields` – governs what happens when validation indicates missing fields.

### Runtime Policy Overrides

In some environments you may want to tighten or relax policies without changing the design. The `rt.OverridePolicy` API allows process-local policy adjustments:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Scope**: Overrides are local to the current runtime instance and affect only subsequent runs. They do not persist across process restarts or propagate to other workers.

**Overridable Fields**:

| Field | Description |
| --- | --- |
| `MaxToolCalls` | Maximum total tool calls per run |
| `MaxConsecutiveFailedToolCalls` | Consecutive failures before abort |
| `TimeBudget` | Wall-clock budget for the run |
| `FinalizerGrace` | Reserved window for finalization |
| `InterruptsAllowed` | Enable pause/resume capability |

Only non-zero fields are applied (and `InterruptsAllowed` when `true`). This allows selective overrides without affecting other policy settings.

**Use Cases**:
- Temporary backoffs during provider throttling
- A/B testing different policy configurations
- Development/debugging with relaxed constraints
- Per-tenant policy customization at runtime

### Labels and Policy Engines

Goa-AI integrates with pluggable policy engines via `policy.Engine`. Policies receive tool metadata (IDs, tags), run context (SessionID, TurnID, labels), and `RetryHint` information after tool failures.

Labels flow into:
- `run.Context.Labels` – available to planners during a run
- `run.Record.Labels` – persisted with run metadata (useful for search/dashboards)

---

## Tool Execution

- **Native toolsets**: You write implementations; runtime handles decoding typed args using generated codecs
- **Agent-as-tool**: Generated agent-tool toolsets run provider agents as child runs (inline from the planner's perspective) and adapt their `RunOutput` into a `planner.ToolResult` with a `RunLink` handle back to the child run
- **MCP toolsets**: Runtime forwards canonical JSON to generated callers; callers handle transport

---

## Memory, Streaming, Telemetry

- **Hook bus** publishes structured hook events for the full agent lifecycle: run start/completion, phase changes, tool scheduling/results/updates, planner notes and thinking blocks, awaits, retry hints, and agent-as-tool links.

- **Memory stores** (`memory.Store`) subscribe and append durable memory events (user/assistant messages, tool calls, tool results, planner notes, thinking) per `(agentID, RunID)`.

- **Run stores** (`run.Store`) track run metadata (status, phases, labels, timestamps) for search and operational dashboards.

- **Stream sinks** (`stream.Sink`, for example Pulse or custom SSE/WebSocket) receive typed `stream.Event` values produced by the `stream.Subscriber`. A `StreamProfile` controls which event kinds are emitted and how child runs are projected (off, flattened, linked).

- **Telemetry**: OTEL-aware logging, metrics, and tracing instrument workflows and activities end to end.

### Observing Events for a Single Run

In addition to global sinks, you can observe the event stream for a single run ID using the `Runtime.SubscribeRun` helper:

```go
type mySink struct{}

func (s *mySink) Send(ctx context.Context, e stream.Event) error {
    // deliver event to SSE/WebSocket, logs, etc.
    return nil
}

func (s *mySink) Close(ctx context.Context) error { return nil }

stop, err := rt.SubscribeRun(ctx, "run-123", &mySink{})
if err != nil {
    panic(err)
}
defer stop()
```

---

## Engine Abstraction

- **In-memory**: Fast dev loop, no external deps
- **Temporal**: Durable execution, replay, retries, signals, workers; adapters wire activities and context propagation

---

## Run Contracts

- `SessionID` is required at run start. `Start` fails fast when `SessionID` is empty or whitespace
- Agents must be registered before the first run. The runtime rejects registration after the first run submission with `ErrRegistrationClosed` to keep engine workers deterministic
- Tool executors receive explicit per-call metadata (`ToolCallMeta`) rather than fishing values from `context.Context`
- Do not rely on implicit fallbacks; all domain identifiers (run, session, turn, correlation) must be passed explicitly

---

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

---

## Planner Contract

Planners implement:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contains tool calls, final response, annotations, and optional `RetryHint`. The runtime enforces caps, schedules tool activities, and feeds tool results back into `PlanResume` until a final response is produced.

Planners also receive a `PlannerContext` via `input.Agent` that exposes runtime services:
- `ModelClient(id string)` - get a provider-agnostic model client
- `AddReminder(r reminder.Reminder)` - register run-scoped system reminders
- `RemoveReminder(id string)` - clear reminders when preconditions no longer hold
- `Memory()` - access conversation history

---

## Feature Modules

- `features/mcp/*` – MCP suite DSL/codegen/runtime callers (HTTP/SSE/stdio)
- `features/memory/mongo` – durable memory store
- `features/run/mongo` – run metadata store + search repositories
- `features/stream/pulse` – Pulse sink/subscriber helpers
- `features/model/{bedrock,openai}` – model client adapters for planners
- `features/model/middleware` – shared `model.Client` middlewares (e.g., adaptive rate limiting)

### Model Client Throughput & Rate Limiting

Goa-AI ships a provider-agnostic adaptive rate limiter under `features/model/middleware`. It wraps any `model.Client`, estimates tokens per request, queues callers using a token bucket, and adjusts its effective tokens-per-minute budget using an additive-increase/multiplicative-decrease (AIMD) strategy when providers report throttling.

```go
import (
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
}, ledger)

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New(runtime.Options{
    // Register limited as the model client exposed to planners.
})
```

---

## LLM Integration

Goa-AI planners interact with large language models through a **provider-agnostic interface**. This design lets you swap providers—AWS Bedrock, OpenAI, or custom endpoints—without changing your planner code.

### The model.Client Interface

All LLM interactions go through the `model.Client` interface:

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### Provider Adapters

Goa-AI ships with adapters for popular LLM providers:

**AWS Bedrock**

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
}, ledger)
```

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

### Using Model Clients in Planners

Planners obtain model clients through the runtime's `PlannerContext`:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := &model.Request{
        RunID:    input.Run.RunID,
        Messages: input.Messages,
        Tools:    input.Tools,
        Stream:   true,
    }
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Drain stream and build response...
}
```

The runtime wraps the underlying `model.Client` with an event-decorated client that emits planner events (thinking blocks, assistant chunks, usage) as you read from the stream.

### Automatic Event Capture

The runtime automatically captures streaming events from model clients, eliminating the need for planners to manually emit events. When you call `input.Agent.ModelClient(id)`, the runtime returns a decorated client that:

- Emits `AssistantChunk` events for text content as you read from the stream
- Emits `PlannerThinkingBlock` events for reasoning/thinking content
- Emits `UsageDelta` events for token usage metrics

This decoration happens transparently:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // ModelClient returns a decorated client that auto-emits events
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Simply drain the stream - events are emitted automatically
    var text strings.Builder
    var toolCalls []model.ToolCall
    for {
        chunk, err := streamer.Recv()
        if errors.Is(err, io.EOF) {
            break
        }
        if err != nil {
            return nil, err
        }
        // Process chunk for your planner logic
        // Events are already emitted by the decorated client
    }
    // ...
}
```

**Important**: If you need to use `planner.ConsumeStream`, obtain a raw `model.Client` that is not wrapped by the runtime. Mixing the decorated client with `ConsumeStream` will double-emit events.

### Bedrock Message Ordering Validation

When using AWS Bedrock with thinking mode enabled, the runtime validates message ordering constraints before sending requests. Bedrock requires:

1. Any assistant message containing `tool_use` must start with a thinking block
2. Each user message containing `tool_result` must immediately follow an assistant message with matching `tool_use` blocks
3. The number of `tool_result` blocks cannot exceed the prior `tool_use` count

The Bedrock client validates these constraints early and returns a descriptive error if violated:

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

This validation ensures that transcript ledger reconstruction produces provider-compliant message sequences.

---

## Next Steps

- Learn about [Toolsets](./toolsets/) to understand tool execution models
- Explore [Agent Composition](./agent-composition/) for agent-as-tool patterns
- Read about [Memory & Sessions](./memory-sessions/) for transcript persistence
