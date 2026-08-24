---
title: Memory & Sessions
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

This guide covers Goa-AI's transcript model, memory persistence, and how to model multi-turn conversations and long-running workflows.

## Why Transcripts Matter

Goa-AI treats the **transcript** as the single source of truth for a run: an ordered sequence of messages and tool interactions that is sufficient to:

- Reconstruct provider payloads (Bedrock/OpenAI) for every model call
- Drive planners (including retries and tool repair)
- Power UIs with accurate history

Because the transcript is authoritative, you do **not** need to hand-manage:
- Separate lists of prior tool calls and tool results
- Ad-hoc "conversation state" structures
- Per-turn copies of previous user/assistant messages

You persist and pass **the transcript only**; Goa-AI and its provider adapters rebuild everything they need from that.

---

## Messages and Parts

At the model boundary, Goa-AI uses `model.Message` values to represent the transcript. Each message has a role (`user`, `assistant`) and an ordered list of **parts**:

| Part Type | Description |
|-----------|-------------|
| `ThinkingPart` | Provider reasoning content (plaintext + signature or redacted bytes). Not user-facing; used for audit/replay and optional "thinking" UIs. |
| `TextPart` | Visible text shown to the user (questions, answers, explanations). |
| `ImagePart` | Multimodal image content (bytes or URL/metadata) for providers that support images. |
| `DocumentPart` | Document content (text/bytes/URI/chunks) attached to messages for providers that support document parts. |
| `CitationsPart` | Structured citations metadata produced by providers (for UI display / audit). |
| `ToolUsePart` | Assistant-initiated tool call with `ID`, `Name` (canonical tool ID), and `Input` (JSON payload). |
| `ToolResultPart` | User/tool result correlated with a prior tool_use via `ToolUseID` and `Content` (JSON payload). |
| `CacheCheckpointPart` | Marker for prompt cache boundaries (provider-dependent, not user-facing). |

**Order is sacred:**
- A tool-using assistant message typically looks like: `ThinkingPart` (when present), then optional `TextPart`, then one or more `ToolUsePart`s
- A user/tool result message typically contains one or more `ToolResultPart`s referencing previous tool_use IDs, plus optional user content (`TextPart`, `ImagePart`, `DocumentPart`)

Goa-AI's provider adapters (e.g., Bedrock Converse) re-encode these parts into provider-specific blocks **without reordering**.

---

## The Transcript Contract

The high-level transcript contract in Goa-AI is:

1. The application (or runtime) **persists every event** for a run in order: assistant thinking, text, tool_use (ID + args), user tool_result (tool_use_id + content), subsequent assistant messages, and so on
2. Before each model call, the caller supplies the **entire transcript** for that run as `[]*model.Message`, with the last element being the new delta (user text or tool_result)
3. Goa-AI re-encodes that transcript into the provider's chat format in the same order

There is **no separate "tool history" API**; the transcript is the history.

Model adapters are stateless across calls. The complete provider-ready
transcript must be present in each `model.Request`; a run identifier does not
cause an adapter to load earlier messages. Public model clients validate the
request and complete response before planner code can observe them.

### History Compression

An agent's `History(...)` policy may summarize older turns while keeping a
bounded exact tail. `CompressAt...` values decide when summarization starts;
`KeepMax...` values decide which newest whole turns remain unchanged. The
runtime never truncates a turn.

Compression requires a configured `HistoryModel`. Token-based triggers and
retention also require exact token counting from that model client. Bedrock
Runtime cannot count structured-output requests, and some current Claude
models require AWS's separate Mantle endpoint. See [Runtime → History
Policies](../runtime/#history-policies) and [DSL Reference →
History](../dsl-reference/#history) for the complete contract.

### How This Simplifies Planners and UIs

- **Planners**: Receive the current transcript in `planner.PlanInput.Messages` and `planner.PlanResumeInput.Messages`. Can decide what to do based purely on the messages, without threading extra state.
- **UIs**: Can render chat history, tool ribbons, and agent cards from the same underlying transcript they persist for the model. No separate "tool log" structures needed.
- **Provider adapters**: Never guess which tools were called or which results belong where; they simply map transcript parts → provider blocks.

---

## Run-Log Transcript Replay

The runtime stores provider-ready transcript additions as ordered run-log
events. A transcript event contains a JSON-encoded slice of `model.Message`
values. Replay appends those slices in run-log order; it does not reorder parts,
invent missing messages, or expose a mutable transcript object.

### Ordering Requirements

Stored messages keep the part order required by providers:

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

Provider adapters re-encode these parts into provider-specific blocks in the
same sequence.

### Public Replay API

The `runtime/agent/transcript` package exposes these run-log operations:

- `EncodeRunLogDelta(messages)` accepts the `[]*model.Message` values added at
  one point in a run and returns their JSON payload as `rawjson.Message`.
  Encoding failures are returned as errors.
- `DecodeRunLogDelta(payload)` accepts one JSON payload from a transcript
  run-log event and returns the `[]*model.Message` values stored in it. Invalid
  JSON is returned as an error.
- `ReplayRunLogEvents(events)` accepts an already ordered slice of
  `*runlog.Event`. It skips events that are not transcript seed or append
  records, appends the decoded message slices in input order, and returns the
  messages, a boolean that reports whether any transcript event was found, and
  an error.
- `BuildMessagesFromRunLog(ctx, store, runID)` pages through a `runlog.Store`
  for one run and returns its complete ordered `[]*model.Message` transcript.
  It returns an error when the store or run ID is missing, listing or decoding
  fails, or the run has no transcript events.

Most applications let the runtime write transcript events and use
`BuildMessagesFromRunLog` when they need the provider-ready history:

```go
messages, err := transcript.BuildMessagesFromRunLog(ctx, runEventStore, runID)
if err != nil {
    return err
}
```

Use the validators after constructing or replaying messages:

```go
if err := transcript.ValidatePlannerTranscript(messages); err != nil {
    return err
}
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    return err
}
```

`ValidatePlannerTranscript(messages)` accepts `[]*model.Message` and returns
`nil` only when every assistant tool-call group is followed immediately by one
user message containing exactly one matching result for every tool-call ID.
`ValidateBedrock(messages, thinkingEnabled)` checks Bedrock's additional
thinking rule. It performs no additional check when thinking is disabled. When
thinking is enabled, it returns an error unless each assistant message
containing a tool call begins with a `ThinkingPart`. Neither validator changes
the messages.

### Why This Matters

- **Deterministic Replay**: Stored events can rebuild the exact transcript for debugging, auditing, or re-running failed turns
- **Provider Agnostic Storage**: Run-log payloads store `model.Message` JSON without provider SDK dependencies
- **Simplified Planners**: Planners receive correctly ordered messages without managing provider constraints
- **Validation**: Catch ordering violations before they reach the provider and cause cryptic errors

---

## Sessions, Runs, and Transcripts

Goa-AI separates conversation state into three layers:

- **Session** (`SessionID`) – a conversation or workflow over time:
  - e.g., a chat session, a remediation ticket, a research task
  - Multiple runs can belong to the same session

- **Run** (`RunID`) – one execution of an agent:
  - Each call to an agent client (`Run`/`Start`) creates a run
  - Runs have status, phases, and labels

- **Transcript** – the full history of messages and tool interactions for a run:
  - Represented as `[]*model.Message`
  - Persisted as transcript seed and append events in `runlog.Store`

### SessionID & TurnID in Practice

When calling an agent:

```go
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "chat-session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: Groups all runs for a conversation; often used as a search key in run logs and dashboards
- `TurnID`: Groups events for a single user → assistant interaction; optional but helpful for UIs and logs

Sessions are ended explicitly (for example, when a conversation is deleted). Once a session is ended, new runs must not start under it.

---

## Memory Store vs Run Log

Goa-AI's feature modules provide complementary stores:

### Memory Store (`memory.Store`)

Persists per-run event history:
- User/assistant messages
- Tool calls and results
- Planner notes and thinking

```go
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}
```

Key types:
- **`memory.Snapshot`** – immutable view of a run's stored history (`AgentID`, `RunID`, `Events []memory.Event`)
- **`memory.Event`** – single persisted entry with `Type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`, `planner_note`, `thinking`), `Timestamp`, `Data`, and `Labels`

### Run Log (`runlog.Store`)

Persists the **canonical, append-only event log** for runs. The runtime appends hook events as the run executes (start/phase changes/tools/messages/completion) and callers can list them using cursor pagination for UIs and diagnostics.

For Temporal planner activities, `PlanActivityInput.ToolOutputs` carries
references containing the call run ID, result run ID, and tool-call ID. The
planner activity uses those references to load the tool input, result body,
server data, and planner-visible metadata from this run log before invoking the
planner. References avoid repeating full result bodies across the planner
activity boundary. They do not mean that no second copy exists: the runtime's
private suspension checkpoint still contains transcript and tool-output state
so a suspended workflow can resume.

```go
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

`runlog.Page` captures:
- `Events` (ordered oldest-first)
- `NextCursor` (empty when there are no further events)

---

## Wiring Stores

With the MongoDB-backed implementations:

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    memorymongoclient "goa.design/goa-ai/features/memory/mongo/clients/mongo"
    runlogmongo "goa.design/goa-ai/features/runlog/mongo"
    runlogmongoclient "goa.design/goa-ai/features/runlog/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memClient, err := memorymongoclient.New(memorymongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

memStore, err := memorymongo.NewStore(memClient)
if err != nil {
    log.Fatal(err)
}

runlogClient, err := runlogmongoclient.New(runlogmongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

runEventStore, err := runlogmongo.NewStore(runlogClient)
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunEventStore(runEventStore),
)
```

Once configured:
- Default subscribers persist memory and run events automatically
- You can rebuild provider-ready transcripts from `runlog.Store` at any time to re-call models, power UIs, or run offline analysis

---

## Custom Stores

Implement the `memory.Store` and `runlog.Store` interfaces for custom backends:

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run log store
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

---

## Common Patterns

### Chat Sessions

- Use one `SessionID` per chat session
- Start a new run per user turn or per "task"
- Persist transcripts per run; use session metadata to stitch the conversation

### Long-Running Workflows

- Use a single run per logical workflow (potentially with pause/resume)
- Use `SessionID` to group related workflows (e.g., per ticket or incident)
- Rely on `run.Phase` and `RunCompleted` events for status tracking

### Search and Dashboards

- Page through `runlog.Store` by `RunID` for audit/debug UIs
- Replay transcripts from `runlog.Store` on demand for selected runs

---

## Best Practices

- **Always correlate tool results**: Make sure tool implementations and planners preserve tool_use IDs and map tool results back to the correct `ToolUsePart` via `ToolResultPart.ToolUseID`

- **Use strong, descriptive schemas**: Rich `Args` / `Return` types, descriptions, and examples in your Goa design produce clearer tool payloads/results in the transcript

- **Let the runtime own state**: Avoid maintaining parallel "tool history" arrays or "previous messages" slices in your planner. Read from `PlanInput.Messages` / `PlanResumeInput.Messages` and rely on the runtime to append new parts

- **Persist transcripts once, reuse everywhere**: Whatever store you choose, treat the transcript as reusable infrastructure—same transcript backing model calls, chat UI, debug UI, and offline analysis

- **Index frequently queried fields**: Session ID, run ID, status for efficient queries

- **Archive old transcripts**: Reduce storage costs by archiving completed runs

---

## Next Steps

- **[Production](./production.md)** - Deploy with Temporal, streaming UI, and model integration
- **[Runtime](./runtime.md)** - Understand the plan/execute loop
- **[Agent Composition](./agent-composition.md)** - Build complex agent graphs
