---
title: Memory & Sessions
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

This guide covers Goa-AI's transcript model, memory persistence, and how to model multi-turn conversations and long-running workflows.

## Why Transcripts Matter

Goa-AI treats the **transcript** as the source of truth for the model-visible
conversation: an ordered sequence of messages and tool interactions that is
sufficient to:

- Reconstruct provider payloads (Bedrock/OpenAI) for every model call
- Drive planners (including retries and tool repair)
- Power UIs with accurate history

Because the transcript is authoritative for model input, you do **not** need to
hand-manage:

- Separate lists of prior tool calls and tool results
- Ad-hoc "conversation state" structures
- Per-turn copies of previous user/assistant messages

You persist and pass **the transcript only** for model conversation history;
Goa-AI and its provider adapters rebuild provider input from that. Run status,
cancellation, continuation checkpoints, and run records that cannot change
after insertion belong to the separate host-owned runtime store described
below.

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

On the first `PrepareMessages` call in each planner activity, an agent's
`History(...)` policy may summarize older turns while keeping a
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

- **Planners**: Call `PrepareMessages` on `planner.PlanInput` or `planner.PlanResumeInput` and handle its error before reading the policy-prepared transcript. They can decide from those messages without maintaining parallel history. See [Preparing conversation messages](../runtime/#preparing-conversation-messages).
- **UIs**: Can render chat history, tool ribbons, and agent cards from the same underlying transcript they persist for the model. No separate "tool log" structures needed.
- **Provider adapters**: Never guess which tools were called or which results belong where; they simply map transcript parts → provider blocks.

---

## Runtime Transcript Replay

The runtime stores canonical `model.Message` deltas in the ordered run records.
`transcript_messages_seeded` contains messages that existed before a run began;
`transcript_messages_appended` contains messages accepted while that run was
executing. Seed records rebuild model input but are not emitted as new assistant
output.

Use the public replay helper when runtime recovery or inspection needs the exact
provider-ready message sequence:

```go
import "goa.design/goa-ai/runtime/agent/transcript"

messages, err := transcript.BuildMessagesFromRunLog(ctx, runtimeStore, runID)
if err != nil {
    return err
}
```

`BuildMessagesFromRunLog` pages through `storage.Store.ListRunRecords` and
replays only the canonical transcript records in their stored order. If records
are already loaded, `ReplayRunLogEvents` performs the same projection. Provider
adapters preserve part order, and `ValidatePlannerTranscript` or
`ValidateBedrock` can check a transcript at the relevant boundary.

`ValidatePlannerTranscript` requires every assistant tool-call group to be
followed immediately by one user message containing exactly one matching
result for every tool-call ID. `ValidateBedrock` adds one rule when thinking is
enabled: each assistant message containing a tool call must begin with a
`ThinkingPart`. Neither validator changes the messages.

These runtime records support workflow replay and inspection. They do not
replace the product-owned transcript used for chat history, ratings, search,
retention, or customer-facing deletion.

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
  - Persisted as transcript seed and append records in `storage.Store`

### SessionID & TurnID in Practice

When calling an agent:

```go
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "chat-session-123", time.Now().UTC()); err != nil {
    panic(err)
}
rt := runtime.New(store)
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: Groups all runs for a conversation; often used as a search key in runtime records and dashboards
- `TurnID`: Groups events for a single user → assistant interaction; optional but helpful for UIs and logs

Sessions are ended explicitly by the host application (for example, when a
conversation is deleted). Once a session is ended, an accepted workflow records
a canceled run and stops before planning or calling tools. The host may
permanently delete the session only after all of its runs have finished.

---

## Product Memory vs Runtime Storage {#runtime-store}

Goa-AI keeps two kinds of durable data separate because they have different
owners:

- **Product memory** is the transcript and any application data built from it.
  The product decides what to retain, display, search, or redact.
- **Runtime storage** is the state Goa-AI needs to execute and continue runs:
  session state, run metadata, private continuation checkpoints, and run records
  that cannot change after insertion.

For example, a chat service may store the complete conversation, ratings, and
search fields in its own database. The runtime store records that run `run-42`
started, which child run it launched, whether cancellation was requested, and
how it finished. The runtime store does not become the chat application's
transcript database.

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

### Runtime Store (`storage.Store`)

The host provides one `storage.Store` implementation to the runtime. That one
implementation owns all runtime writes for:

- session scope and whether a session is active, ended, or permanently deleted
- run identity, parentage, labels, start decision, and current status
- the private bytes required to continue a suspended run
- ordered run records that cannot change after insertion, used for inspection
  and for identifying which prompt versions influenced a run

The runtime requires this dependency:

For Temporal planner activities, `PlanActivityInput.ToolOutputs` carries
references containing the call run ID, result run ID, and tool-call ID. The
planner activity uses those references to load the tool input, result body,
server data, and planner-visible metadata from this run log before invoking the
planner. References avoid repeating full result bodies across the planner
activity boundary. They do not mean that no second copy exists: the runtime's
private suspension checkpoint still contains transcript and tool-output state
so a suspended workflow can resume.

Tool calls have two different identifiers. `ModelToolCallID` is the provider
transcript ID that pairs a model-authored call with its model-visible result.
`ToolCallID` is the runtime execution ID used by activities, retries, run-log
records, and stream events. A suspended model-authored call stores both; never
substitute one for the other or derive either from run order.

```go
store := newRuntimeStore()
rt := runtime.New(store, runtime.WithEngine(eng))
```

In a single-process application, `store` may be a local database adapter. In a
distributed application, one service should own the database and expose typed
methods; agent workers should implement `storage.Store` by calling that service.
Different services must not write the runtime collections directly.

---

## Store Lifecycle Changes and Records Together {#store-lifecycle-changes-and-records-together}

Each lifecycle method stores the run state and the records that prove that
state in one operation:

- `StartRootRun` stores root-run metadata and its first record.
- `StartChildRun` stores the parent link, child metadata, and first child record.
  A new child requires a running parent; an exact accepted retry remains valid
  after the parent stops.
- `StartOneShotRun` stores a sessionless run and its first record.
- `StartOneShotChildRun` stores a sessionless parent link and child start in one
  operation. It applies the same running-parent and exact-retry rule.
- `RecordRunCancellation` stores the first cancellation reason and its record.
- `RecordRunSuspension` stores the private checkpoint, suspended status, and
  suspension record.
- `RecordRunTerminal` stores the final status and matching terminal record.

This contract prevents partial results. A database failure cannot leave a run
marked complete without its completion record, or store a continuation
checkpoint while the run still appears active.

Ordinary records that do not change lifecycle use `AppendRunRecord`. Callers
read records with `ListRunRecords` or `ListSessionRunRecords`. A cursor is a
store-provided position that callers pass back unchanged to fetch the next page.

### Exact retries

Workflow activities can run more than once. The storage contract therefore
treats an exact repeat as success and returns the original record identifier.
The retry must contain the same run identity, time, labels, event key, event
payload, checkpoint, status, and cancellation reason as the first attempt.
For each start, cancellation, suspension, and terminal change, the store also
remembers the exact record selected by the first successful write. Repeating
the lifecycle change with a different record is a conflict even when the status
and other lifecycle fields match.

A repeat that changes any value fixed by the first write is a conflict. The
store must not guess which value is newer or overwrite the first value.
Cancellation follows the same rule: the first reason is permanent, an exact
repeat succeeds, and a different reason fails.

### Durable event JSON

The runtime decodes `RunStarted`, `RunSuspended`, `RunCompleted`, and
`ChildRunLinked` payloads as exactly one typed JSON value. Unknown fields and
extra JSON values after that value are rejected. Existing records must match
these exact shapes before the runtime can replay or deliver them; it never
ignores incompatible stored data.

### Cancellation provenance {#cancellation-provenance}

The runtime store distinguishes a cancellation request from the reason a run
ended:

- When a running workflow accepts an explicit `CancelRun` request, it stores
  the first reason in run metadata and a matching record whose type is
  `storage.CancellationRecordType` (`runtime.cancellation_intent`) in one
  operation before it stops. The later canceled `RunCompleted` record must
  contain that same reason.
- If `StartRootRun` or `StartChildRun` finds that its session already ended,
  the start operation stores `session_ended` in run metadata together with
  `RunStarted` and the canceled `RunCompleted` record. It does not store a
  `storage.CancellationRecordType` record because no separate cancellation was
  requested.
- If the workflow engine cancels a run without a previously recorded request,
  the cancellation reason in run metadata remains empty and there is no
  `storage.CancellationRecordType` record. The canceled `RunCompleted` record
  contains `engine_canceled`. In this case, the empty metadata field has a
  precise meaning; it is not missing data.

These are the three valid pairings between run metadata and cancellation
records. A durable store must preserve each pairing exactly.

### Continuation starts

A continuation start requires an existing predecessor run in `suspended`
status. The successor must repeat the predecessor's session, agent, and parent
run identity. The store checks all four facts inside the same transaction that
would create the successor. A mismatch is rejected before the successor start
or any parent link is written.

The successor's `RunStarted` record stores `PredecessorRunID`. `RunMeta` does
not duplicate that relationship. Readers reconstruct continuation history from
the records that established it.

### Start ordering

For root runs, the workflow engine accepts the workflow before runtime storage
is written. There is no `pending` run record created before engine admission.
The workflow's first durable activity calls `StartRootRun`:

- if the session is active, the store records `RunStarted`, marks the run as
  running, and the workflow proceeds;
- if the session ended after the engine accepted the workflow, the store still
  records `RunStarted`, immediately follows it with a canceled `RunCompleted`,
  and the workflow stops before planner or tool work.

Child workflows use `StartChildRun`. The store records `ChildRunLinked` on the
parent followed by `RunStarted` on the child. If the session has ended, it also
records the child's canceled `RunCompleted`. Every workflow accepted by the
engine therefore has one `RunStarted` record, including work stopped because
its session ended. A new child requires a running parent. An exact retry of a
child start that the store already accepted remains valid after the parent
stops; a changed retry or a new child is rejected. Temporal terminates a child
workflow if its parent workflow closes first.

Sessionless root work uses `StartOneShotRun`; it receives normal run metadata
and `RunStarted`, but it does not create or join a session. An agent called as a
tool from that run uses `StartOneShotChildRun`. On the first call, the parent
must already exist, have no session, and still be running. The store writes
`ChildRunLinked` on that parent and `RunStarted` on the sessionless child in one
operation.

An exact retry of `StartOneShotChildRun` succeeds even if the parent finished
after the first write, because the child relationship was already accepted.
The retry must repeat the same child identity and both record keys and payloads.
A changed retry is a conflict, and a new child cannot be attached after the
parent has finished.

The start result reports the original start decision, not the run's current
status. Retrying a start after the run has completed therefore returns the same
decision that was made on the first write.

---

## Session Lifecycle and Deletion

Session administration belongs to the host application, not to agent workers.
The host creates a session before submitting sessionful work, ends it when no
new work should begin, and permanently deletes it only after every active run
has reached a final state.

Ending a session and deleting it are separate operations:

- **End** prevents accepted workflows from doing new planner or tool work while
  allowing already-running workflows to save their final records.
- **Purge** removes the session, its runs, checkpoints, and records after all
  runs finish. The deleted session ID remains unusable so a delayed retry cannot
  recreate old state.

The in-memory implementation under `runtime/agent/storage/inmem` exposes
`CreateSession`, `EndSession`, and `PurgeSession` for local examples and tests.
A production host implements those operations in the service that owns its
runtime database.

The runtime derives which prompt versions influenced a run from the
`prompt_rendered` records and parent/child link records, which cannot change
after insertion. Stores do not maintain a second list of prompt references or
child IDs that could disagree with the run history.

---

## Upgrading from Split Stores

This storage contract is a breaking change. The following public APIs are
removed:

- `session.Store` and `runlog.Store`
- `runtime.WithSessionStore` and `runtime.WithRunEventStore`
- runtime session-administration methods such as `CreateSession`, `EndSession`,
  and `PurgeSession`
- the built-in `features/session/mongo` and `features/runlog/mongo` packages

Replace the two stores with one implementation of `storage.Store` from
`goa.design/goa-ai/runtime/agent/storage`, then pass it as the first argument to
`runtime.New`. Move session creation, ending, and deletion into the host service
that owns the runtime data. If agent workers run in separate services, make them
call that owner through a typed API instead of importing its database adapter.

Before the new runtime writes, existing persisted data must satisfy the
integrated store contract. Run metadata, checkpoints, and records must support
the lifecycle operations above, and old split-store writers must not overlap
with new writers. The host chooses the conversion and recovery procedure for
its database and deployment environment, then deploys the owner and all workers
that use it as one coordinated change.

The completion-delivery commands do not add a database schema migration or
change a public wire format. They do change the Go source contract. Upgrade the
runtime and its store implementation together:

- replace each `Runtime.RepairRunCompletion` call with
  `Runtime.EnsureRunCompletion`;
- implement `LoadSessionStatus` in every custom `storage.Store`;
- configure `Runtime.WithStream` before calling either ensure command for an
  active Session; and
- expect a new child start to fail after its parent stops. An exact retry of a
  child start already accepted by the store remains valid.

Existing durable lifecycle records must also satisfy the exact JSON contract
above.

---

## Common Patterns

### Chat Sessions

- Use one `SessionID` per chat session
- Start a new run per user turn or per "task"
- Keep the product transcript in the chat service; use runtime records for run
  state, continuation, and inspection

### Long-Running Workflows

- Use one run for each workflow accepted by the engine
- When a run requests external input, its workflow ends; the answer starts a new
  run in the same session using the saved checkpoint
- When accepting the answer must be combined with an application write, use
  `PrepareContinuation`, call `MarshalBinary`, and atomically store those bytes
  with the accepted answer. A submitting process loads the bytes, calls
  `ParsePreparedRun`, and passes the restored value to `StartPrepared`. See
  [External Input and Workflow Continuations](../runtime/#external-input-and-workflow-continuations).
- Use `SessionID` to group related runs (e.g., per ticket or incident)
- Rely on `run.Phase` and `RunCompleted` events for status tracking

### Search and Dashboards

- Page through `storage.Store` by `RunID` for audit/debug UIs
- Load transcripts from `memory.Store` on demand for selected runs

---

## Best Practices

- **Always correlate tool results**: Make sure tool implementations and planners preserve tool_use IDs and map tool results back to the correct `ToolUsePart` via `ToolResultPart.ToolUseID`

- **Use strong, descriptive schemas**: Rich `Args` / `Return` types, descriptions, and examples in your Goa design produce clearer tool payloads/results in the transcript

- **Let the runtime own state**: Avoid maintaining parallel "tool history" arrays or "previous messages" slices in your planner. Read the messages returned by `PrepareMessages` after checking its error, and rely on the runtime to append new parts to the stored transcript

- **Persist product transcripts once**: Keep one product-owned transcript for
  model calls, chat UI, debug UI, and offline analysis. Do not copy it into a
  second service merely because that service owns runtime state

- **Index frequently queried fields**: Session ID, run ID, status for efficient queries

- **Archive old transcripts**: Reduce storage costs by archiving completed runs

---

## Next Steps

- **[Production](./production.md)** - Deploy with Temporal, streaming UI, and model integration
- **[Runtime](./runtime.md)** - Understand the plan/execute loop
- **[Agent Composition](./agent-composition.md)** - Build complex agent graphs
