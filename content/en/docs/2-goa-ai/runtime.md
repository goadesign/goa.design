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

- result schemas and typed result/union types
- generated JSON codecs and validation helpers
- typed `completion.Spec` values
- generated `Complete<Name>(ctx, client, req)` helpers
- generated `StreamComplete<Name>(ctx, client, req)` and `Decode<Name>Chunk(chunk)` helpers

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

Streaming completions stay on the raw `model.Streamer` surface and decode the
final canonical `completion` chunk only:

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
    value, ok, err := taskcompletion.DecodeDraftFromTranscriptChunk(chunk)
    if err != nil {
        panic(err)
    }
    if ok {
        fmt.Println(value.Name)
    }
}
```

Typed completion helpers are intentionally strict:

- Unary helpers accept unary requests only.
- Completion names are validated at the DSL boundary: 1-64 ASCII characters,
  letters/digits/`_`/`-` only, and must start with a letter or digit.
- Unary and streaming helpers reject tool-enabled requests and caller-supplied `StructuredOutput`.
- Streaming providers emit `completion_delta*` preview fragments plus exactly one canonical `completion` chunk, or reject the request explicitly.
- `Decode<Name>Chunk` ignores preview chunks and decodes only the final `completion`.
- Completion streams stay on the direct `model.Streamer` path; do not route them through planner streaming helpers, which are for assistant transcript text/tool execution events.
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

- **Caps**: `MaxToolCalls` – total budgeted tool calls per run. Tools declared `Bookkeeping()` in the DSL are **exempt** from this cap: status updates, progress markers, and terminal-commit tools never consume `RemainingToolCalls` and are never dropped when a batch is trimmed to fit the remaining budget. `MaxConsecutiveFailedToolCalls` – consecutive failures before abort.
- **Time budget**: `TimeBudget` – wall-clock budget for the run. `FinalizerGrace` (runtime-only) – optional reserved window for finalization.
- **Interrupts**: `InterruptsAllowed` – opt-in for pause/resume.
- **Missing fields behavior**: `OnMissingFields` – governs what happens when validation indicates missing fields.
- **Terminal tools**: Tools declared `TerminalRun()` complete the run atomically once they succeed—no follow-up `PlanResume` turn is scheduled. Pair `Bookkeeping()` with `TerminalRun()` for a "commit this run" tool that is guaranteed to execute even when the retrieval budget is exhausted.

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
- tool activity input (`api.ToolInput.Labels`) – cloned into dispatched tool executions so tool activities observe the same run-scoped metadata unless the planner overrides labels for one specific call
- run log events (`runlog.Store`) – persisted alongside lifecycle events for audit/search/dashboards (where indexed)

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
- the runtime projects those bounds into emitted `tool_result` JSON, result-hint
  template data under `.Bounds`, hook payloads, and stream events

Canonical projected fields:

- `returned` (required)
- `truncated` (required)
- `total` (optional)
- `refinement_hint` (optional)
- `next_cursor` (optional, when declared via `NextCursor(...)`)

`planner.ToolResult.Bounds` remains the single machine-readable runtime contract.
Authored Go result types stay semantic and domain-specific; they do not need to
duplicate the canonical bounded fields just so models can see them.

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
    RunID:      input.RunContext.RunID,
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` are runtime metadata for audit/provenance and are not provider wire payload fields.

---

## Memory, Streaming, Telemetry

- **Hook bus** publishes structured hook events for the full agent lifecycle: run start/completion, phase changes, `prompt_rendered`, tool scheduling/results/updates, planner notes and thinking blocks, awaits, retry hints, and agent-as-tool links.

- **Memory stores** (`memory.Store`) subscribe and append durable memory events (user/assistant messages, tool calls, tool results, planner notes, thinking) per `(agentID, RunID)`.

- **Run event stores** (`runlog.Store`) append the canonical hook event log per `RunID` for audit/debug UIs and run introspection.

- **Stream sinks** (`stream.Sink`, for example Pulse or custom SSE/WebSocket) receive typed `stream.Event` values produced by the `stream.Subscriber`. A `StreamProfile` controls which event kinds are emitted.

- **Telemetry**: OTEL-aware logging, metrics, and tracing instrument workflows and activities end to end.

### Tool Call Display Hints (DisplayHint)

Tool calls may carry a user-facing `DisplayHint` (for example for UIs).

Contract:

- Hook constructors do not render hints. Tool call scheduled events default to `DisplayHint==""`.
- The runtime may enrich and persist a durable default call hint at publish time by decoding the typed tool
  payload and executing the DSL `CallHintTemplate`.
- When typed decoding fails or no template is registered, the runtime leaves `DisplayHint` empty. Hints are
  never rendered against raw JSON bytes.
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

### Providing External Tool Results

Some awaits resume with **tool results supplied by an external actor** rather than by `ExecuteToolActivity` itself. Common examples are UI-owned tools such as structured questions, or bridge services that collect results from another system and then wake the run back up.

Use `ProvideToolResults` with raw provided results:

```go
err := rt.ProvideToolResults(ctx, interrupt.ToolResultsSet{
    RunID: "run-123",
    ID:    "await-1",
    Results: []*api.ProvidedToolResult{
        {
            Name:       "chat.ask_question.ask_question",
            ToolCallID: "toolcall-1",
            Result:     rawjson.Message(`{"answers":[{"question_id":"topic","selected_ids":["alarms"]}]}`),
        },
    },
})
```

Contract:

- Callers provide the **raw canonical result JSON** plus optional `Bounds`, `Error`, and `RetryHint`.
- Callers do **not** construct `api.ToolEvent`; that is the runtime's internal workflow envelope.
- The runtime decodes the provided result using the registered tool spec, runs typed result materialization, attaches any server-only sidecars, appends the canonical `tool_result` to the transcript/run log, and only then resumes planning.

This keeps the await path conceptually aligned with the normal execution path: both flows converge on the same typed `planner.ToolResult` contract before publication.

---

## Tool Confirmation

Goa-AI supports **runtime-enforced** confirmation gates for sensitive tools (writes, deletes, commands).

You can enable confirmation in two ways:

- **Design-time (common case):** declare `Confirmation(...)` inside the tool DSL. Codegen stores
  the policy in `tools.ToolSpec.Confirmation`.
- **Runtime (override/dynamic):** pass `runtime.WithToolConfirmation(...)` when constructing the runtime
  to require confirmation for additional tools or override design-time behavior.

At execution time, the workflow emits an out-of-band confirmation request and only executes the tool
after an explicit approval is provided. When denied, the runtime synthesizes a schema-compliant tool
result so the transcript remains valid and the planner can react deterministically.

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

- **Provide decision** (via `ProvideConfirmation` on the runtime):

  ```go
  err := rt.ProvideConfirmation(ctx, interrupt.ConfirmationDecision{
      RunID:       "run-123",
      ID:         "await-1",
      Approved:    true,              // or false
      RequestedBy: "user:123",
      Labels:      map[string]string{"source": "front-ui"},
      Metadata:    map[string]any{"ticket_id": "INC-42"},
  })
  ```

### Tool authorization events

When a decision is provided, the runtime emits a first-class authorization event:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

This event is the canonical “who/when/what” record for a confirmed tool call:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (deterministic runtime-rendered summary)
- `approved_by` (copied from `interrupt.ConfirmationDecision.RequestedBy`, intended to be a stable principal identifier)

The event is emitted immediately after the decision is received (before tool execution when approved, and before the denied tool result is synthesized when denied).

Notes:

- Consumers should treat confirmation as a runtime protocol:
  - Use the accompanying `RunPaused` reason (`await_confirmation`) to decide when to display a confirmation UI.
  - Do not couple UI behavior to a specific confirmation tool name; treat it as an internal transport detail.
- Confirmation templates (`PromptTemplate` and `DeniedResultTemplate`) are Go `text/template` strings
  executed with `missingkey=error`. In addition to the standard template functions (e.g. `printf`),
  Goa-AI provides:
  - `json v` → JSON encodes `v` (useful for optional pointer fields or embedding structured values).
  - `quote s` → returns a Go-escaped quoted string (like `fmt.Sprintf("%q", s)`).

### Runtime validation

The runtime validates confirmation interactions at the boundary:

- The confirmation `ID` matches the pending await identifier when provided.
- The decision object is well-formed (non-empty `RunID`, boolean `Approved` value).

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
- `AdvertisedToolDefinitions()` - get the runtime-filtered tool definitions visible to the model for this turn
- `ModelClient(id string)` - get a raw provider-agnostic model client
- `PlannerModelClient(id string)` - get a planner-scoped model client with runtime-owned event emission
- `RenderPrompt(ctx, id, data)` - resolve and render prompt content for the current run scope
- `AddReminder(r reminder.Reminder)` - register run-scoped system reminders
- `RemoveReminder(id string)` - clear reminders when preconditions no longer hold
- `Memory()` - access conversation history

---

## Feature Modules

- `features/mcp/*` – MCP suite DSL/codegen/runtime callers (HTTP/SSE/stdio)
- `features/memory/mongo` – durable memory store
- `features/prompt/mongo` – Mongo-backed prompt override store
- `features/runlog/mongo` – run event log store (append-only, cursor-paginated)
- `features/session/mongo` – session metadata store
- `features/stream/pulse` – Pulse sink/subscriber helpers
- `features/model/{anthropic,bedrock,openai}` – model client adapters for planners
- `features/model/middleware` – shared `model.Client` middlewares (e.g., adaptive rate limiting)
- `features/policy/basic` – simple policy engine with allow/block lists and retry hint handling

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

Planners obtain model clients through the runtime's `PlannerContext`. There are
two explicit integration styles:

- `PlannerModelClient(id)` for planner-scoped streaming with runtime-owned event emission
- `ModelClient(id)` when you need raw transport access and will pair it with `planner.ConsumeStream` or emit `PlannerEvents` yourself

#### PlannerModelClient (Recommended)

`PlannerContext.PlannerModelClient(id)` returns a planner-scoped client that
owns `AssistantChunk`, `PlannerThinkingBlock`, and `UsageDelta` emission. Its
`Stream(...)` method drains the underlying provider stream and returns a
`planner.StreamSummary`:

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
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: sum.Text}},
            },
        },
        Streamed: true, // Assistant text was already streamed
    }, nil
}
```

This is the safest integration style because the planner-scoped client does not
expose a raw `model.Streamer`, so it cannot be combined accidentally with
`planner.ConsumeStream`.

#### Raw Client + ConsumeStream

When you need the raw `model.Client`, fetch it from `PlannerContext.ModelClient`
and pair it with `planner.ConsumeStream`:

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
streamer, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, streamer, req, input.Events)
if err != nil {
    return nil, err
}
```

This helper drains the stream, emits assistant/thinking/usage events, and
returns a `StreamSummary` with accumulated text and tool calls.

Use the raw client path when you need full control over stream consumption, want
custom early-stop behavior, or want to manage `PlannerEvents` explicitly. Do not
mix `PlannerModelClient.Stream(...)` with `planner.ConsumeStream`; choose one
stream owner per planner turn.

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
