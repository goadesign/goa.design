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

### How This Simplifies Planners and UIs

- **Planners**: Receive the current transcript in `planner.PlanInput.Messages` and `planner.PlanResumeInput.Messages`. Can decide what to do based purely on the messages, without threading extra state.
- **UIs**: Can render chat history, tool ribbons, and agent cards from the same underlying transcript they persist for the model. No separate "tool log" structures needed.
- **Provider adapters**: Never guess which tools were called or which results belong where; they simply map transcript parts → provider blocks.

---

## Transcript Ledger

The **transcript ledger** is a provider-precise record that maintains conversation history in the exact format required by model providers. It ensures deterministic replay and provider fidelity without leaking provider SDK types into workflow state.

### Provider Fidelity

Different model providers (Bedrock, OpenAI, etc.) have strict requirements about message ordering and structure. The ledger enforces these constraints:

| Provider Requirement | Ledger Guarantee |
|---------------------|------------------|
| Thinking must precede tool_use in assistant messages | Ledger orders parts: thinking → text → tool_use |
| Tool results must follow their corresponding tool_use | Ledger correlates tool_result via ToolUseID |
| Message alternation (assistant → user → assistant) | Ledger flushes assistant before appending user results |

For Bedrock specifically, when thinking is enabled:
- Assistant messages containing tool_use **must** start with a thinking block
- User messages with tool_result must immediately follow the assistant message declaring the tool_use
- Tool result count cannot exceed the prior tool_use count

### Ordering Requirements

The ledger stores parts in the canonical order required by providers:

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

This ordering is **sacred** — the ledger never reorders parts, and provider adapters re-encode them into provider-specific blocks in the same sequence.

### Automatic Ledger Maintenance

The runtime automatically maintains the transcript ledger. You do not need to manage it manually:

1. **Event Capture**: As the run progresses, the runtime persists memory events (`EventThinking`, `EventAssistantMessage`, `EventToolCall`, `EventToolResult`) in order

2. **Ledger Reconstruction**: The `BuildMessagesFromEvents` function rebuilds provider-ready messages from stored events:

```go
// Reconstruct messages from persisted events
events := loadEventsFromStore(agentID, runID)
messages := transcript.BuildMessagesFromEvents(events)

// Messages are now in canonical provider order
// Ready to pass to model.Client.Complete() or Stream()
```

3. **Validation**: Before sending to providers, the runtime can validate message structure:

```go
// Validate Bedrock constraints when thinking is enabled
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    // Handle constraint violation
}
```

### Ledger API

For advanced use cases, you can interact with the ledger directly. The ledger provides these key methods:

| Method | Description |
|--------|-------------|
| `NewLedger()` | Creates a new empty ledger |
| `AppendThinking(part)` | Appends a thinking part to the current assistant message |
| `AppendText(text)` | Appends visible text to the current assistant message |
| `DeclareToolUse(id, name, args)` | Declares a tool invocation in the current assistant message |
| `FlushAssistant()` | Finalizes the current assistant message and prepares for user input |
| `AppendUserToolResults(results)` | Appends tool results as a user message |
| `BuildMessages()` | Returns the complete transcript as `[]*model.Message` |

**Example usage:**

```go
import "goa.design/goa-ai/runtime/agent/transcript"

// Create a new ledger
l := transcript.NewLedger()

// Record assistant turn
l.AppendThinking(transcript.ThinkingPart{
    Text:      "Let me search for that...",
    Signature: "provider-sig",
    Index:     0,
    Final:     true,
})
l.AppendText("I'll search the database.")
l.DeclareToolUse("tu-1", "search_db", map[string]any{"query": "status"})
l.FlushAssistant()

// Record user tool results
l.AppendUserToolResults([]transcript.ToolResultSpec{{
    ToolUseID: "tu-1",
    Content:   map[string]any{"results": []string{"item1", "item2"}},
    IsError:   false,
}})

// Build provider-ready messages
messages := l.BuildMessages()
```

**Note:** Most users don't need to interact with the ledger directly. The runtime automatically maintains the ledger through event capture and reconstruction. Use the ledger API only for advanced scenarios like custom planners or debugging tools.

### Why This Matters

- **Deterministic Replay**: Stored events can rebuild the exact transcript for debugging, auditing, or re-running failed turns
- **Provider Agnostic Storage**: The ledger stores JSON-friendly parts without provider SDK dependencies
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
  - Persisted via `memory.Store` as ordered memory events

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
- You can rebuild transcripts from `memory.Store` at any time to re-call models, power UIs, or run offline analysis

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
- Load transcripts from `memory.Store` on demand for selected runs

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
