---
title: "Runtime"
linkTitle: "Runtime"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Architecture Overview

The Goa-AI runtime orchestrates the plan/execute/resume loop, enforces policies, manages state, and coordinates with engines, planners, tools, memory, hooks, and feature modules.

| Layer | Responsibility |
| --- | --- |
| DSL + Codegen | Produce agent registries, tool specs/codecs, completion specs/codecs, workflows, MCP adapters |
| Runtime Core | Orchestrates plan/start/resume loop, policy enforcement, hooks, memory, streaming |
| Workflow Engine Adapter | Temporal adapter implements `engine.Engine`; other engines can plug in |
| Feature Modules | Optional integrations (MCP, Pulse, Mongo stores, model providers) |

---

## High-Level Agentic Architecture

At runtime, Goa-AI organizes your system around a small set of composable constructs:

- **Agents**: Long-lived orchestrators identified by `agent.Ident` (for example, `service.chat`). Each agent owns a planner, run policy, generated workflows, and tool registrations.

- **Runs**: A single execution of an agent. Runs are identified by a `RunID` and tracked via `run.Context` and `run.Handle`. Sessionful runs are grouped by `SessionID` and `TurnID` to form conversations; one-shot runs are explicitly sessionless.

- **Toolsets & tools**: Named collections of capabilities, identified by `tools.Ident` (`service.toolset.tool`). Service-backed toolsets call APIs; agent-backed toolsets run other agents as tools.

- **Completions**: Service-owned typed direct assistant-output contracts generated under `gen/<service>/completions`. Completion helpers attach provider-enforced structured output to unary and direct-streaming model requests, then decode the canonical typed payload through generated codecs.

- **Planners**: Your LLM-driven strategy layer implementing `PlanStart` / `PlanResume`. Planners decide when to call tools versus answer directly; the runtime enforces caps and time budgets around those decisions.

- **Run tree & agent-as-tool**: When an agent calls another agent as a tool, the runtime starts a real child run with its own `RunID`. The parent `ToolResult` carries a `RunLink` (`*run.Handle`) pointing to the child, and a corresponding `child_run_linked` stream event is emitted so UIs can correlate parent tool calls with child run IDs without guessing.

- **Session-owned streams & profiles**: Goa-AI publishes typed `stream.Event` values into a **session-owned stream** (`session/<session_id>`). Events carry both `RunID` and `SessionID`, and include an explicit boundary marker (`run_stream_end`) so consumers can close SSE/WebSocket deterministically without timers. `stream.StreamProfile` selects which event kinds are visible for a given audience (chat UI, debug, metrics).

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

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, "session-1", []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }})
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

## Typed Direct Completions

Not every structured interaction should be modeled as a tool call. When your
service needs a typed final assistant answer, declare `Completion(...)` in the
DSL and regenerate.

`goa gen` emits `gen/<service>/completions` with:

- typed result and union types
- private result schemas and generated codecs
- generated `Complete<Name>(ctx, client, req)` helpers
- typed `StreamComplete<Name>(ctx, client, req)` helpers
- `<Name>Example()` when the root result has an authored `Example(...)`

Services may declare completions without declaring any `Agent(...)`. Agent
quickstart/example scaffolding is emitted only for services that actually own
agents.

Those helpers clone the request, attach provider-neutral structured output
metadata, call the underlying `model.Client`, and decode the canonical typed
payload through the generated codec:

```go
resp, err := taskcompletion.CompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}

fmt.Println(resp.Value.Name)
```

Every low-level `model.StructuredOutput` requires a nonempty name. Generated
helpers derive it from the validated completion DSL. Unary completion makes
exactly one model call. Invalid JSON returns a non-retryable
`planner.OutputContractError` and a nil response; it never triggers a correction
request. On success, `resp.ModelResponse` contains the exact provider response
and token usage.

Streaming completions return `completion.Streamer[T]`. `Recv` exposes preview
fragments, while `Value()` stays unavailable until the stream ends and the
terminal response agrees with the final completion:

```go
stream, err := taskcompletion.StreamCompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        panic(err)
    }
    // Render preview completion_delta chunks here when useful.
    _ = chunk
}
value, ok := stream.Value()
if !ok {
    panic("completion stream ended without a typed value")
}
fmt.Println(value.Name)
```

Typed completion helpers are intentionally strict:

- Unary helpers accept unary requests only.
- Completion names are validated at the DSL boundary: 1-64 ASCII characters,
  letters/digits/`_`/`-` only, and must start with a letter or digit.
- Unary and streaming helpers reject tool-enabled requests and caller-supplied `StructuredOutput`.
- Streaming providers may emit `completion_delta*` previews plus exactly one
  final `completion`, or reject the request explicitly.
- The typed wrapper releases `Value()` only after clean end-of-stream and full
  validation. There is no public decoder that accepts an unchecked chunk.
- Completion streams use their generated typed wrapper directly; planner
  streaming helpers are for assistant transcript text and tool calls.
- Providers that do not implement structured output surface `model.ErrStructuredOutputUnsupported`.
- Generated schemas are canonical and provider-neutral; provider adapters may normalize them to a supported subset, but must fail explicitly when they cannot preserve the declared contract.

---

## Client-Only vs Worker

Two roles use the runtime:

- **Client-only** (submit runs): Constructs a runtime with a client-capable engine and does not register agents. Use the generated `<agent>.NewClient(rt)` which carries the route (workflow + queue) registered by remote workers.
- **Worker** (execute runs): Constructs a runtime with a worker-capable engine, registers toolsets and agents, then seals registration so polling starts only after the local runtime registry is complete.

### Client-Only Example

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "s1"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "s1", msgs)
```

### Sessionless One-Shot Runs

Use `StartOneShot` and `OneShotRun` when you want durable work that is not attached to an existing session.

- `Start` / `Run` are sessionful: they require a concrete `SessionID`, participate in session lifecycle, and emit session-scoped stream events.
- `StartOneShot` / `OneShotRun` are sessionless: they take no `SessionID`, do not create one, and append only canonical run-log events for introspection by `RunID`.
- `StartOneShot` returns an `engine.WorkflowHandle` immediately. `OneShotRun` is the blocking convenience wrapper that calls `handle.Wait(ctx)` for you.

```go
client := chat.NewClient(rt)

handle, err := client.StartOneShot(ctx, msgs,
    runtime.WithRunID("run-123"),
    runtime.WithLabels(map[string]string{"tenant": "acme"}),
)
if err != nil {
    panic(err)
}

out, err := handle.Wait(ctx)
if err != nil {
    panic(err)
}

fmt.Println(out.RunID)
```

### Worker Example

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "temporal:7233", Namespace: "default"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "orchestrator.chat"},
})
if err != nil {
    panic(err)
}
defer eng.Close()

rt := runtime.New(runtime.WithEngine(eng))
if err := chat.RegisterUsedToolsets(ctx, rt /* executors... */); err != nil {
    panic(err)
}
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner}); err != nil {
    panic(err)
}
if err := rt.Seal(ctx); err != nil {
    panic(err)
}
```

---

## Plan → Execute → Resume Loop

1. The runtime starts a workflow for the agent (in-memory or Temporal) and records a new `run.Context` with `RunID`, `SessionID`, `TurnID`, labels, and policy caps.
2. It calls your planner's `PlanStart` with the current messages and run context.
3. It schedules tool calls returned by the planner (planner passes canonical JSON payloads; the runtime handles encoding/decoding using generated codecs).
4. It calls `PlanResume` with the surviving planner-visible tool outputs.
   Budgeted tools are visible by default. A failed bookkeeping tool schedules
   another planner turn according to `ToolFailure.Recovery`: correction,
   replanning without that tool, or finalization. The loop repeats until the
   planner returns a final response, a final tool result, or a successful
   `TerminalRun` tool completes the run. If caps or deadlines force
   finalization, the planner may close through terminal bookkeeping tools
   instead of prose. As execution progresses, the run advances through
   `run.Phase` values (`prompted`, `planning`, `executing_tools`,
   `synthesizing`, terminal phases).
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

The runtime emits `RunPhaseChanged` hook events for **non-terminal** phases (e.g., `planning`, `executing_tools`, `synthesizing`) so stream subscribers can track progress in real time.

### Phase vs Status

Phases are distinct from `run.Status`:

- **Status** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) is the coarse-grained lifecycle state stored in durable run metadata
- **Phase** provides finer-grained visibility into the execution loop, intended for streaming/UX surfaces

### Lifecycle events: phase changes vs terminal completion

The runtime emits:

- **`RunPhaseChanged`** for non-terminal phase transitions.
- **`RunCompleted`** once per run for terminal lifecycle (success / failed / canceled).

Stream subscribers translate both into `workflow` stream events (`stream.WorkflowPayload`):

- **Non-terminal updates** (from `RunPhaseChanged`): `phase` only.
- **Terminal update** (from `RunCompleted`): `status` + terminal `phase`, plus structured error fields on failures.

**Terminal status mapping**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**Cancellation is not an error**

For `status="canceled"`, the stream payload **must not** include a user-facing `error`. Consumers should treat cancellation as a terminal, non-error end state.

**Failures are structured**

For `status="failed"`, the stream payload includes:

- `error_kind`: stable classifier for UX/decisioning (provider kinds like `rate_limited`, `unavailable`, or runtime kinds like `timeout`/`internal`)
- `retryable`: whether retrying may succeed without changing input
- `error`: **user-safe** message suitable for direct display
- `debug_error`: raw error string for logs/diagnostics (not for UI)

**Terminal identity**

`RunCompleted` carries `Labels`: the run-scoped labels provided when the run
started (`RunInput.Labels`, set via `runtime.WithLabels(...)`), nil when the run
had none. Completion subscribers can attribute the terminal outcome — success,
failed, or canceled — without maintaining their own run-ID-to-identity map. The
same labels are exposed on `run.Snapshot.Labels` for polling readers, replayed
from the durable `RunStarted` record, so run identity survives process restarts
on both engines. Labels merged by policy decisions mid-run are not included;
they remain observable via `PolicyDecision` events.

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

- **Caps**: `MaxToolCalls` is the total budgeted tool calls per run. Tools declared `Bookkeeping()` consume no retrieval budget and do not change `MaxConsecutiveFailedToolCalls`. Model-authored batches stay atomic: bookkeeping calls add zero cost, but the runtime never removes individual calls to make a mixed batch fit. Successful bookkeeping results stay out of compact future `ToolOutputs`.
- **Time budget**: `TimeBudget` – wall-clock budget for the run. `FinalizerGrace` (runtime-only) – optional reserved window for finalization.
- **Interrupts**: `InterruptsAllowed` – opt-in for pause/resume.
- **Missing fields behavior**: `OnMissingFields` – governs what happens when validation indicates missing fields.
- **Terminal tools**: Tools declared `TerminalRun()` automatically become bookkeeping and complete the run once they succeed—no follow-up `PlanResume` turn is scheduled. A terminal commit can therefore be admitted with no retrieval budget remaining. During forced finalization, the runtime admits only terminal bookkeeping calls, executes them inside the remaining hard-deadline window, and closes the run only if every terminal side effect succeeds. Before execution, the runtime writes the exact `planner.TerminationReason` to `runtime.FinalizationReasonLabel` (`goa-ai.finalization_reason`). Run labels, policy labels, planner output, and model output cannot choose or replace this value. Ordinary calls do not receive it.

  Consumers of fixed-limit or planner-authored terminal calls, including `tool_failure`, use `runtime.FinalizationReasonLabel`. Deploy a change to this execution contract across consumers and runtime workers together.

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

Goa-AI integrates with pluggable policy engines via `policy.Engine`. Policies
receive tool metadata (IDs, tags), run context (SessionID, TurnID, labels), and
the structured `ToolFailure` after failed execution.

Labels flow into:
- `run.Context.Labels` – available to planners during a run
- tool activity input (`api.ToolInput.Labels`) – cloned into dispatched tool executions so activities observe run and policy metadata; terminal finalization calls also receive the runtime-owned reason under `runtime.FinalizationReasonLabel`
- run log events (`runlog.Store`) – persisted alongside lifecycle events for audit/search/dashboards (where indexed)
- terminal completion and snapshots – the start labels come back out at the end of the run on `hooks.RunCompletedEvent.Labels` and `run.Snapshot.Labels`, so completion hooks and `GetRunSnapshot` readers recover run identity without out-of-band tracking

### Per-Run Tool Filtering

Design-time tags and runtime options let callers narrow the tool surface before
planner prompting and again before execution:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithAllowedTags([]string{"read", "safe"}),
    runtime.WithDeniedTags([]string{"destructive"}),
    runtime.WithTagPolicyClauses([]runtime.TagPolicyClause{
        {AllowedAny: []string{"docs", "search"}},
        {DeniedAny: []string{"external"}},
    }),
)
```

Use `WithRestrictToTool` when a repair flow should expose exactly one tool:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithRestrictToTool(searchspecs.Search),
)
```

This is a run-wide caller policy. Tool failures use a separate contract:
`ToolFailure.Recovery` selects correction, replanning, or finishing and the
runtime enforces the resulting tool catalog on the next planner turn.

---

## Tool Execution

- **Native toolsets**: You write implementations; runtime handles decoding typed args using generated codecs
- **Agent-as-tool**: Generated agent-tool toolsets run provider agents as child runs (inline from the planner's perspective) and adapt their `RunOutput` into a `planner.ToolResult` with a `RunLink` handle back to the child run
- **MCP toolsets**: Runtime forwards canonical JSON to generated callers; callers handle transport

### Tool payload defaults

Tool payload decoding follows Goa’s **decode-body → transform** pattern and applies Goa-style defaults deterministically for tool payloads.

See **[Tool Payload Defaults](tool-payload-defaults/)** for the contract and codegen invariants.

### Bounded tool results

Tools that return partial views of larger datasets should declare `BoundedResult(...)`
in the DSL. The runtime contract for those tools is:

- generated `tools.ToolSpec.Bounds` declares the canonical bounded-result schema
- successful executions must populate `planner.ToolResult.Bounds`
- the runtime projects provider-owned bounds into emitted `tool_result` JSON, result-hint
  template data under `.Bounds`, hook payloads, and stream events
- for paged tools, provider code sets `Bounds.NextCursor` to the opaque
  next-page cursor

`tools.ToolSpec.Bounds` uses model-facing JSON names. A DSL declaration may
refer to lower-camel Goa attributes such as `NextCursor("nextCursor")`, but
generated specs, schemas, runtime projection, and result codecs use
`next_cursor`.

Canonical projected fields:

- `returned` (required)
- `truncated` (required)
- `total` (optional)
- `refinement_hint` (optional)
- `next_cursor` (optional, when declared via `NextCursor(...)` and exposed by a
  self-paging `Cursor` contract)

`planner.ToolResult.Bounds` remains the single machine-readable provider contract.
Authored Go result types stay semantic and domain-specific; they do not need to
duplicate the canonical bounded fields just so models can see them.

`ContinueWith("continue_tool", "cursor")` declares mechanical continuation as
a separate action. The runtime advertises that action only when result history
contains exactly one live successful chain head with another cursor. Exact
cursor lineage advances sequential pages. Parallel source invocations remain
valid, but multiple live heads make the no-argument action unavailable because
the contract exposes no result-chain selector. Its model-facing schema is an
empty object; when the model chooses the action with `{}`, the runtime binds the
cursor and any retained canonical query fields before execution.

`Cursor("cursor")` on a self-paging tool is the open contract: the runtime
projects `Bounds.NextCursor` into `next_cursor`, and the model repeats the
unchanged query arguments with that opaque cursor. Use it when pagination
itself requires a model-visible choice rather than mechanical continuation.

Generated result codecs accept the same canonical bounded fields projected by
the runtime and reject unknown fields outside the semantic result plus those
runtime-owned fields. This keeps method results, tool results, and transcript
JSON aligned without handwritten schema walking.

For method-backed `BindTo` tools, the bound service method result still needs to
carry the canonical bounded fields so the generated executor can build
`planner.ToolResult.Bounds` before projection. Explicit tool-facing `Return(...)`
shapes must not duplicate those canonical fields. Within the bound method
result, only `returned` and `truncated` may be required; `total`,
`refinement_hint`, and `next_cursor` remain optional and are omitted from emitted
JSON whenever runtime bounds omit them.

When a service boundary must assemble canonical result JSON outside
`ExecuteToolActivity`, use `runtime.EncodeCanonicalToolResult(...)` rather than
calling the generated result codec and bounded-result projection helpers
separately.

---

## Prompt Runtime Contracts

Prompt management is runtime-native and versioned:

- `runtime.PromptRegistry` stores immutable baseline `prompt.PromptSpec` registrations.
- `runtime.WithPromptStore(prompt.Store)` enables scoped override resolution (`session` -> `facility` -> `org` -> global).
- Planners call `PlannerContext.RenderPrompt(ctx, id, data)` to resolve and render prompt content.
- Rendered content includes `prompt.PromptRef` metadata for provenance; planners can attach these to
  `model.Request.PromptRefs`.

```go
content, err := input.Agent.RenderPrompt(ctx, "aura.chat.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` are runtime metadata for audit/provenance and are not provider wire payload fields.

---

## Memory, Streaming, Telemetry

- **Hook bus** publishes structured hook events for the full agent lifecycle: run start/completion, phase changes, `prompt_rendered`, tool scheduling/results/updates, planner notes and thinking blocks, awaits, `ToolFailure` recovery directives, and agent-as-tool links.

- **Memory stores** (`memory.Store`) subscribe and append durable memory events (user/assistant messages, tool calls, tool results, planner notes, thinking) per `(agentID, RunID)`.

- **Run event stores** (`runlog.Store`) append the canonical hook event log per `RunID` for audit/debug UIs and run introspection.

- **Stream sinks** (`stream.Sink`, for example Pulse or custom SSE/WebSocket) receive typed `stream.Event` values produced by the `stream.Subscriber`. A `StreamProfile` controls which event kinds are emitted.

- **Telemetry**: OTEL-aware logging, metrics, and tracing instrument workflows and activities end to end.

### Tool Call Display Hints (DisplayHint)

Tool calls may carry a user-facing `DisplayHint` (for example for UIs).

Contract:

- Hook constructors do not render hints. Tool call scheduled events default to `DisplayHint==""`.
- The runtime enriches and persists a durable default call hint at publish time from the typed template when
  payload decoding succeeds.
- Tool registration requires a non-empty metadata title. When typed decoding fails or no template is
  registered, the runtime uses that title as the display hint. Malformed payloads still fail at the tool
  boundary; the metadata title only keeps the attempted work renderable. Hints are never rendered against raw
  JSON bytes.
- If a producer explicitly sets `DisplayHint` (non-empty) before publishing the hook event, the runtime treats
  it as authoritative and does not overwrite it.
- For per-consumer wording changes, configure `runtime.WithHintOverrides` on the runtime. Overrides take
  precedence over DSL-authored templates for streamed `tool_start` events.

### Consuming a Session Stream (Pulse)

In production, the common pattern is:

- publish runtime stream events to Pulse (Redis Streams) using a `stream.Sink`
- subscribe to the **session stream** (`session/<session_id>`) from your UI fan-out (SSE/WebSocket)
- stop streaming a run when you observe `type=="run_stream_end"` for the active run ID

```go
import (
    pulsestream "goa.design/goa-ai/features/stream/pulse"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

streams, err := pulsestream.NewRuntimeStreams(pulsestream.RuntimeStreamsOptions{
    Client: pulseClient,
})
if err != nil {
    panic(err)
}
rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(streams.Sink()),
)

sub, err := streams.NewSubscriber(pulsestream.SubscriberOptions{SinkName: "ui"})
if err != nil {
    panic(err)
}
events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt, ok := <-events:
        if !ok {
            return
        }
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
        // evt.SessionID(), evt.RunID(), evt.Type(), evt.Payload()
    case err := <-errs:
        panic(err)
    }
}
```

---

## Engine Abstraction

- **In-memory**: Fast dev loop, no external deps
- **Temporal**: Durable execution, replay, retries, signals, workers; adapters wire activities and context propagation

### Semantic timing vs Temporal liveness

Goa-AI keeps the public runtime contract engine-agnostic:

- `RunPolicy.Timing.Plan` and `RunPolicy.Timing.Tools` are semantic attempt budgets
- `runtime.WithTiming(...)` overrides those semantic budgets for a run
- `runtime.WithWorker(...)` is for queue placement, not workflow-engine tuning

If you use the Temporal adapter and need queue-wait or liveness tuning, configure
it on the Temporal engine itself:

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "temporal:7233",
        Namespace: "default",
    },
    WorkerOptions: temporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: temporal.ActivityDefaults{
        Planner: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
if err != nil {
    panic(err)
}
```

This split keeps workflow mechanics behind the Temporal boundary while the
generic runtime stays honest across both Temporal and the in-memory engine.

---

## Run Contracts

- `SessionID` is required for sessionful starts. `Start` and `Run` fail fast when `SessionID` is empty or whitespace
- `StartOneShot` and `OneShotRun` are explicitly sessionless. They do not require or create a session and do not emit session-scoped stream events
- Agents must be registered before the first run. The runtime rejects registration after the first run submission with `ErrRegistrationClosed` to keep engine workers deterministic
- Tool executors receive explicit per-call metadata (`ToolCallMeta`) rather than fishing values from `context.Context`. Its labels contain cloned run and policy labels plus `runtime.FinalizationReasonLabel` only when that call is executing terminal finalization
- Do not rely on implicit fallbacks; all domain identifiers (run, session, turn, correlation) must be passed explicitly

---

## External Input and Workflow Continuations

Each accepted user input starts one top-level workflow for that turn. The
workflow ends with either that turn's final result or an external-input
suspension. Nested agents still run as linked child workflows.

Clarifications, structured questions, external tool results, and confirmations
end the current workflow successfully. The returned `RunOutput.Suspension`
contains the request that the UI or external system must answer. No Temporal
workflow remains open while a person is deciding.

Before the workflow completes, Goa-AI stores its private checkpoint under the
completed run ID. The application must atomically accept one answer so two
concurrent requests cannot continue the same state. It then starts a new
workflow with the predecessor run ID, a new run ID, a new turn ID, and one typed
response:

```go
next, err := client.Continue(
    ctx,
    "session-1",
    previous.RunID,
    "run-124",
    "turn-2",
    &api.PendingInputResponse{
        Clarification: &api.ClarificationAnswer{
            ID:     "clarify-device",
            Answer: "Device ID is ABC-123",
        },
    },
    nil, // optional workflow settings for the new run
)
```

The application passes only the completed run ID and the typed answer. Goa-AI
loads the checkpoint, requires the exact `goa-ai.run-suspension.v4` schema and
pending request, restores saved payloads through the current generated codecs,
and resumes planning. Other checkpoint versions are rejected rather than
translated or inferred. The checkpoint remains private to the session store.

When an answer completes a model-authored tool call from the earlier workflow,
the new `tool_end` event has two distinct run identities:

- its normal run ID names the new workflow that received the answer; and
- `call_run_id` names the earlier workflow that emitted the matching
  `tool_start`.

Stream consumers must pair those events using `call_run_id` and the tool call
ID. They must not search previous runs or assume the call and result belong to
the same workflow. See [Transparent rollouts](../production/#transparent-rollouts)
for the worker and deployment requirements that preserve this boundary during
a release.

---

## Tool Confirmation

Goa-AI supports **runtime-enforced** confirmation gates for sensitive tools (writes, deletes, commands).

You can enable confirmation in two ways:

- **Design-time (common case):** declare `Confirmation(...)` inside the tool DSL. Codegen stores
  the policy in `tools.ToolSpec.Confirmation`.
- **Runtime (override/dynamic):** pass `runtime.WithToolConfirmation(...)` when constructing the runtime
  to require confirmation for additional tools or override design-time behavior.

At execution time, the workflow emits a confirmation request and completes with
a suspension. The accepted decision starts a new workflow. That continuation
executes the tool only when approved. When denied, the runtime synthesizes a
schema-compliant tool result so the transcript remains valid and the planner can
react deterministically.

### Confirmation protocol

At runtime, confirmation is implemented as a dedicated await/decision protocol:

- **Await payload** (streamed as `await_confirmation`):

  ```json
  {
    "id": "...",
    "title": "...",
    "prompt": "...",
    "tool_name": "atlas.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

Contract:

- `payload` always contains the canonical JSON tool arguments for the pending call. If approved, those are the arguments the runtime executes.
- Confirmation overrides may customize the prompt and denied-result rendering, but they do not introduce a separate display-payload channel or change the meaning of `payload`.
- Products that need a richer confirmation UI should materialize it in the application layer from the canonical payload plus application-owned reads.

- **Continuation response**:

  ```go
  response := &api.PendingInputResponse{
      Confirmation: &api.ConfirmationDecision{
          ID:          "await-1",
          Approved:    true, // or false
          RequestedBy: "user:123",
          Labels:      map[string]string{"source": "front-ui"},
          Metadata:    map[string]any{"ticket_id": "INC-42"},
      },
  }
  ```

### Tool authorization events

When a decision is provided, the runtime emits a first-class authorization event:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

This event is the canonical “who/when/what” record for a confirmed tool call:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (deterministic runtime-rendered summary)
- `approved_by` (copied from `api.ConfirmationDecision.RequestedBy`, intended to be a stable principal identifier)

The event is emitted immediately after the decision is received (before tool execution when approved, and before the denied tool result is synthesized when denied).

Notes:

- Consumers should treat confirmation as a runtime protocol:
  - Render the first pending item when its kind is `confirmation`, then submit
    the decision through `Continue`.
  - Do not couple UI behavior to a specific confirmation tool name; treat it as an internal transport detail.
- Confirmation templates (`PromptTemplate` and `DeniedResultTemplate`) are Go `text/template` strings
  executed with `missingkey=error`. In addition to the standard template functions (e.g. `printf`),
  Goa-AI provides:
  - `json v` → JSON encodes `v` (useful for optional pointer fields or embedding structured values).
  - `quote s` → returns a Go-escaped quoted string (like `fmt.Sprintf("%q", s)`).

### Runtime validation

The runtime validates confirmation interactions at the boundary:

- The confirmation `ID` matches the pending await identifier when provided.
- The continuation contains exactly one response variant and a well-formed
  decision.

---

## Planner Contract

Planners implement:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contains tool requests, a final response, a final tool result,
annotations, and the selected post-tool transition. `PlanResumeInput` tells the
planner why it is being called.

Planner-authored requests contain domain intent only. Use
`planner.NewToolRequest(typedTool, payload)` to encode one. When forwarding a
validated provider call, use `planner.ToolRequestFromModelCall(call)` so the
provider correlation ID is preserved without becoming the runtime execution
ID. The runtime validates the complete plan before it assigns execution IDs or
publishes tool events.

These contracts are separate:

| Contract | Scope | Plain-English meaning |
| --- | --- | --- |
| `ToolSpec.Tags` | A tool, for every run | Flat labels available to generic policy and UI filtering. |
| `ToolSpec.Meta` | A tool, for every run | Inert generated annotations whose semantics belong to the named consumer; metadata alone changes no runtime behavior. |
| `ToolSpec.Bookkeeping` | A tool, for every run | The call is a durable control record whose success does not require another planner turn. It consumes no retrieval or consecutive-failure budget. |
| `ToolSpec.TerminalRun` | A tool, for every run | Successful execution itself ends the run. It automatically implies bookkeeping. |
| `ToolFailure.Recovery` | One failed result | Selects same-tool correction, replanning without the failed tool, or finalization. |
| `PlanResult.SynthesizeAfterTools` | One selected batch | If the batch has no recoverable failure, the next planner turn must answer. |
| `PlanResumeInput.SynthesisOnly` | One planner activity | Return a final answer; tool calls are invalid. |
| `PlanResumeInput.Finalize` | Runtime-forced termination | A cap or deadline has prohibited normal work. |

The runtime chooses one next state in this order:

| Completed step | Next state |
| --- | --- |
| A cap or deadline requires finalization | `Finalize` turn |
| A successful `TerminalRun` tool completed | End immediately |
| Any failed result has `AllowsToolTurn() == true` | Normal repair turn |
| `SynthesizeAfterTools` is true | `SynthesisOnly` turn |
| Otherwise | Normal continuation turn |

This keeps planner intent from becoming a second retry policy. A recoverable failure is repaired first; a successful or terminally failed final batch proceeds to synthesis. The runtime rejects tool calls returned from a `SynthesisOnly` turn.

Each recoverable `ToolFailure` also selects a `Recovery.Action`:

- `correct_call` keeps the failed tool available and gives the next planner turn
  the original model-authored input, generated validation issues, field
  guidance, and example.
  It does not require one replacement call per failure. The planner may combine
  work, make any number of valid calls to advertised tools, wait for input, or
  answer from the evidence already collected.
- `replan` removes the failed tool from the next planner turn. The planner may
  use another advertised tool, wait for input, or answer.
- `finish` removes all tools and requires a final answer from the available
  evidence.

The workflow owns model-facing correction evidence. It replaces executor-
supplied prior input and examples with the original provider call and the
registered tool specification before the failure enters run history. A
runtime-created continuation has no model-authored input, so it cannot request
`correct_call`; this prevents private cursors or injected execution fields from
appearing in a later model request. Model transcripts correlate results with
`ModelToolCallID`, while activities, retries, and stored execution records use
the separate runtime `ToolCallID`.

The runtime records the exact tool catalog shown on a recovery turn and rejects
every executable call outside it, including a call embedded in a request for
user or external input. Generated codecs still validate every payload, and the
run's tool, failure, and time limits still stop repeated invalid work. If a
recovery turn waits for input, its failure evidence remains available when the
run resumes; choosing a tool call or final answer clears that evidence.

Recovery activity inputs and their advertised catalog are part of durable
workflow history. Production deployments must use pinned Temporal Worker
Deployment Versioning and retain each old worker version until Temporal reports
it drained. Starting a new worker does not make it safe to replay an existing
workflow on new code. A continuation is a new workflow and may use the current
version after its saved checkpoint passes validation.

When `PlanResumeInput.Finalize` is set, planners may return terminal bookkeeping tools; those calls are not replayed into a later planner turn and must durably finish finalization.

Planners also receive a `PlannerContext` via `input.Agent` that exposes runtime services:
- `AdvertisedToolDefinitions()` - get the runtime-filtered tool definitions visible to the model for this turn
- `ModelClient(id string)` - get a raw provider-agnostic model client
- `PlannerModelClient(id string)` - get a planner-scoped model client with runtime-owned event emission
- `RenderPrompt(ctx, id, data)` - resolve and render prompt content for the current run scope
- `AddReminder(r reminder.Reminder)` - register run-scoped system reminders
- `RemoveReminder(id string)` - clear reminders when preconditions no longer hold
- `Memory()` - access conversation history

---

## Feature Modules

- `runtime/mcp` – MCP callers for HTTP, SSE, and stdio transports
- `features/memory/mongo` – durable memory store
- `features/prompt/mongo` – Mongo-backed prompt override store
- `features/runlog/mongo` – run event log store (append-only, cursor-paginated)
- `features/session/mongo` – session metadata store
- `features/stream/pulse` – Pulse sink/subscriber helpers
- `features/model/{anthropic,bedrock,openai,vertex}` – provider adapters that
  return validated model clients
- `features/model/gateway` – remote provider server and validated transport
  clients
- `features/model/middleware` – provider middleware installed beneath client
  validation, including exact-token adaptive rate limiting
- `features/policy/basic` – simple policy engine with allow/block lists and `ToolFailure` handling

### Model Client Throughput & Rate Limiting

Goa-AI ships an adaptive input-token limiter under
`features/model/middleware`. It asks the wrapped client for the exact request
token count, reserves that capacity before the call, and adjusts its effective
input-tokens-per-minute budget when providers report throttling.

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})
if err != nil {
    panic(err)
}

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial input tokens per minute
    1_000_000,           // maximum input tokens per minute
)
limited, err := rl.Middleware()(bed)
if err != nil {
    panic(err)
}

rt := runtime.New()
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

Middleware construction does not test token-count support. If the selected
provider or request cannot be counted exactly, the first `Complete` or `Stream`
call returns `model.ErrTokenCountingUnsupported` before inference. Vertex
Gemini supports exact counting; Bedrock supports it only for requests and
models accepted by Runtime `CountTokens`. OpenAI has no native counter.

The limiter meters input tokens only. A unary success or clean stream end
probes upward; a unary or terminal streaming rate-limit error backs off. Merely
opening or closing a stream does not count as success.

---

## LLM Integration

Goa-AI planners interact with large language models through a **provider-agnostic interface**. This design lets you swap providers—AWS Bedrock, OpenAI, Google Vertex AI (Gemini and Claude-on-Vertex), or custom endpoints—without changing your planner code.

### The Validated Model Client

All planner interactions go through an opaque `model.Client`:

```go
resp, err := client.Complete(ctx, req)
stream, err := client.Stream(ctx, req) // *model.ValidatedStream
```

Provider integrations implement `model.Provider`, which produces raw transport
responses and chunks. Goa-AI constructs `model.Client` with
`model.NewClient(provider)` and validates requests and complete responses around
that provider. External packages cannot implement `model.Client` or expose raw
provider chunks to planners.

Before a provider call, the client validates tool names and schemas, message
parts, thinking options, structured-output metadata, and the request's dynamic
values. Requests and unary responses are limited to 16 MiB and 100,000 visited
values. Nested dynamic metadata is limited to depth 64. Streaming applies one
cumulative budget across chunks and the terminal response. These limits reject
the whole operation; Goa-AI never truncates, repairs, or coerces model data.

`ValidatedStream` must be drained to `io.EOF`. Only then does `Response()`
return the accepted canonical response. An incomplete, malformed, or
contradictory stream returns an error and no accepted response.

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
})
if err != nil {
    panic(err)
}
```

**OpenAI**

```go
import (
    "os"

    "goa.design/goa-ai/runtime/agent/runtime"
)

rt := runtime.New()
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey:       os.Getenv("OPENAI_API_KEY"),
    DefaultModel: "gpt-5-mini",
    HighModel:    "gpt-5",
    SmallModel:   "gpt-5-nano",
})
if err != nil {
    panic(err)
}
```

**Google Vertex AI (Gemini and Claude-on-Vertex)**

The `features/model/vertex` package ships two constructors that both satisfy
`model.Client`: a native Gemini adapter, and a pure-construction helper that
points the Anthropic adapter at Claude models hosted on Vertex.

```go
import "goa.design/goa-ai/runtime/agent/runtime"

// Gemini on Vertex, using Application Default Credentials.
geminiClient, err := rt.NewVertexGeminiModelClient(ctx, runtime.VertexConfig{
    ProjectID:      "my-gcp-project",
    Location:       "us-central1",
    DefaultModel:   "gemini-2.5-flash",
    HighModel:      "gemini-3-pro-preview",
    SmallModel:     "gemini-2.5-flash-lite",
    MaxTokens:      4096,
    ThinkingBudget: 10000,
})

// Claude on Vertex. This is pure construction: it builds an Anthropic SDK
// client against the SDK's Vertex transport and hands it to
// features/model/anthropic, which owns Messages translation and
// HTTP-status error classification for every Anthropic-hosted adapter
// (direct API and Vertex-hosted alike) — no separate translation layer.
claudeOnVertexClient, err := rt.NewVertexAnthropicModelClient(ctx, runtime.VertexConfig{
    ProjectID:    "my-gcp-project",
    Location:     "us-east5",
    DefaultModel: "claude-sonnet-4-5@20250929",
})
```

Gemini 3-class models attach an opaque **thought signature** to `functionCall`
parts (not only to thought/thinking parts) to authenticate the reasoning chain
behind a tool call. The Vertex adapter round-trips this signature through
`model.ToolCall.ThoughtSignature` / `model.ToolUsePart.ThoughtSignature` using
the same base64 convention as `ThinkingPart.Signature`. The runtime captures
this signature at the model-client boundary — before either integration style
below ever produces a `planner.ToolRequest` — and reattaches it by tool-call
ID when rebuilding the provider transcript. `planner.ToolRequest` never
carries a signature field; planner code does not need to know signatures
exist.

### Provider Capability Differences

The shared request type is provider-neutral, but adapters reject combinations
their APIs cannot preserve:

| Provider | Contract enforced before or during the call |
| --- | --- |
| OpenAI | Structured output uses strict schema projection. Tools and structured output cannot be combined. Overlapping `oneOf` branches are rejected rather than widened. Strict schemas are bounded to 5,000 properties, 1,000 enum values, 10 object levels, and 120,000 aggregate name/enum characters; fine-tuned models reject additional unsupported keywords. Thinking requests reject temperature. |
| Anthropic | Current Claude models use native structured output where supported. Adaptive thinking permits tools and normal forced choice, while older manual thinking rejects forced `any` or named-tool choice. Current-generation Claude models omit deprecated sampling parameters. Streams must close every content block and report a stop reason. |
| Bedrock | Claude 4.5 and 4.6 use native `OutputConfig`; other Claude models use one private forced tool and validate its result against the same contract. Event-stream exceptions retain their provider error kind. Runtime `CountTokens` rejects models that require the separate Mantle endpoint and cannot count structured-output requests. |
| Vertex Gemini | Gemini 3 uses thinking levels, rejects numeric thinking budgets and explicit thinking disablement, and forwards API-valid temperatures. Tool-call thought signatures are retained and replayed by the runtime. Streams require exactly one candidate and a finish reason. |

For Claude Opus 4.7+, Sonnet 5+, Haiku 5+, Fable, and Mythos, the Anthropic and
Bedrock adapters omit `temperature`, `top_p`, and `top_k` because those models
reject the parameters. Older Claude generations continue to receive configured
sampling values.

Provider adapters are stateless with respect to conversation history. Every
request must carry the complete provider-ready `Messages` transcript; a
`RunID` does not ask an adapter to load prior messages.

Common sentinel errors include:

- `model.ErrStructuredOutputUnsupported` when an adapter cannot express the
  requested output contract
- `model.ErrTokenCountingUnsupported` when exact provider counting is
  unavailable
- `model.ErrEmptyStream` when a provider closes without model output
- `model.ErrRateLimited` for retryable provider throttling

`*planner.OutputContractError` is a structured error, not a sentinel. Detect it
with `errors.As` and inspect its origin to distinguish invalid model, planner,
or tool output. It is non-retryable because another request must not hide a
contract violation.

### Canonical Message Metadata and Citation Replay

`model.Message.Meta` contains provider-authored data needed to replay a
response exactly. Boundaries that persist or transport metadata should use
`model.MarshalMetadata` and `model.UnmarshalMetadata`. These codecs require one
JSON object, preserve decoded numbers as `json.Number`, reject trailing data,
and canonicalize nil or an empty object to nil.

Citation replay is provider-specific and must never flatten citations into
ordinary text. The Bedrock adapter can replay assistant `CitationsPart` values
as native citation content blocks, preserving source identity, excerpts, and
document character, chunk, or page locations. Bedrock system citations remain
unsupported because its system-content union has no citation member. Anthropic
and Vertex reject citation replay when the canonical part lacks fields their
provider protocol requires.

### Using Model Clients in Planners

Planners obtain model clients through the runtime's `PlannerContext`. There are
two explicit integration styles:

- `PlannerModelClient(id)` for planner-scoped streaming with runtime-owned event emission
- `ModelClient(id)` when you need direct validated model access and will drain
  the returned stream with `planner.ConsumeStream`

#### PlannerModelClient (Recommended)

`PlannerContext.PlannerModelClient(id)` returns a planner-scoped client that
owns `AssistantChunk`, `PlannerThinkingBlock`, and `UsageDelta` emission. Its
`Stream(...)` method drains the underlying provider stream and returns a
`planner.StreamSummary`. `PlannerModelClient` permits exactly one `Complete` or
`Stream` invocation in that planner turn:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    req := &model.Request{
        Messages: input.Messages,
        Tools:    input.Agent.AdvertisedToolDefinitions(),
        Stream:   true,
    }

    sum, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    if len(sum.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
    }
    final := sum.FinalResponse()
    if final == nil {
        return nil, errors.New("model stream ended without a canonical response")
    }
    return &planner.PlanResult{
        FinalResponse: final,
        Streamed: true, // Assistant text was already streamed
    }, nil
}
```

This is the simplest integration style because the planner-scoped client drains
and summarizes the validated stream itself. Returning `sum.FinalResponse()`
also selects the exact
provider response captured for that invocation; rebuilding a text-only message
would discard thinking, citations, signatures, metadata, and message boundaries.

#### Validated Client + ConsumeStream

When you need direct `model.Client` access, fetch it from
`PlannerContext.ModelClient` and pair its validated stream with
`planner.ConsumeStream`:

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
req := &model.Request{
    Messages: input.Messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
stream, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, stream)
if err != nil {
    return nil, err
}
if len(sum.ToolCalls) > 0 {
    return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
}
final := sum.FinalResponse()
if final == nil {
    return nil, errors.New("model stream ended without a canonical response")
}
return &planner.PlanResult{
    FinalResponse: final,
    Streamed:      true,
}, nil
```

This helper only drains the stream and returns a `StreamSummary` with
accumulated text and tool calls. The runtime model-invocation journal publishes
accepted presentation and usage events later.

Generated tool definitions use `model.ToolDefinitionFromSpec`, which retains
the generated payload decoder. Caller-authored tools use
`model.AdvertisedToolInputFromSchema`. Both paths reject unknown tools and
invalid payloads before planner code receives a provider tool call.

Use the direct client path when planner logic needs to inspect validated preview
chunks or make multiple model calls in one planner turn. Drain every selected
stream to its terminal result; closing early does not produce an accepted
response. The returned `PlanResult` must forward one exact selected result:
either that summary's complete `ToolCalls` set or its `FinalResponse()`. The
runtime rejects modified, mixed, or ambiguous results. Do not mix
`PlannerModelClient.Stream(...)` with `planner.ConsumeStream`; choose one stream
owner per planner turn.

### Remote Model Gateways

`features/model/gateway` carries model requests to a separately deployed
provider process without weakening validation. The server operates on a raw
`model.Provider`, so provider-side middleware runs before the transport:

```go
server, err := gateway.NewServer(
    gateway.WithProvider(provider),
    gateway.WithUnary(unaryMiddleware...),
    gateway.WithStream(streamMiddleware...),
)
```

The consumer constructs a validated client from its transport functions:

```go
client, err := gateway.NewRemoteClient(completeRemote, streamRemote)
countingClient, err := gateway.NewCountingRemoteClient(
    completeRemote,
    streamRemote,
    countRemote,
)
```

Use `NewCountingRemoteClient` only when the remote endpoint implements exact
token counting. `NewRemoteClient` deliberately returns
`model.ErrTokenCountingUnsupported` for count requests instead of estimating.

### History Policies

History compression separates the condition that starts summarization from the
amount of exact recent history retained:

- `CompressAtTurns` and `CompressAtMaxInputTokens` are ORed triggers.
- `KeepMaxTurns` and `KeepMaxInputTokens` both constrain the newest complete
  turns retained after summarization; the runtime never cuts a turn in half.
- Token policies require a `HistoryModel` whose client's `CountTokens` operation
  returns an exact count. The count includes preserved system messages,
  candidate turns, and currently advertised tools.
- `CompressAtMaxInputTokens` is exclusive: a request exactly at the threshold
  fits; only a larger request triggers compression.

Bedrock Runtime cannot count structured-output requests. Claude Opus 4.7,
Sonnet 5, and Mythos 5 require AWS's separate Mantle count endpoint, so the
Bedrock adapter returns `model.ErrTokenCountingUnsupported` for those models.
The generated agent config exposes `HistoryCompression` for deployment-specific
overrides without changing the design defaults.

### Coordinated Generated-System Releases

Compatible releases may roll transparently; incompatible generated changes
require a coordinated drain and cutover. See the authoritative
[Production rollout contract](../production/#transparent-rollouts) for the
checkpoint-version, generated-codec, required-tool-name, and worker-retention
requirements.

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

This ordering check runs before the provider call. Stream validation is a
separate boundary: incomplete content blocks, unsigned reasoning, and missing
stop reasons fail as output-contract errors before planner code receives an
accepted response.

---

## Next Steps

- Learn about [Toolsets](./toolsets/) to understand tool execution models
- Explore [Agent Composition](./agent-composition/) for agent-as-tool patterns
- Read about [Memory & Sessions](./memory-sessions/) for transcript persistence
