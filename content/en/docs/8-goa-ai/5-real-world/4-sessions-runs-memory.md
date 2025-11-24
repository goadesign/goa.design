---
title: "Sessions, Runs & Memory"
linkTitle: "Sessions, Runs & Memory"
weight: 4
description: "Model multi-turn conversations and long-running workflows with SessionID, RunID, and memory/run stores."
---

## Three Layers: Session, Run, Transcript

Goa-AI separates conversation state into three layers:

- **Session** (`SessionID`) – a conversation or workflow over time:
  - e.g., a chat session, a remediation ticket, a research task.
  - multiple runs can belong to the same session.

- **Run** (`RunID`) – one execution of an agent:
  - each call to an agent client (`Run`/`Start`) creates a run,
  - runs have status, phases, and labels (see Runtime Concepts).

- **Transcript** – the full history of messages and tool interactions for a run:
  - represented as `[]*model.Message`,
  - persisted via `memory.Store` as ordered memory events.

You choose **when to start a new run** vs **resume an existing one**, but the
identifiers always have these roles.

## SessionID & TurnID in Practice

When calling an agent:

```go
client := chat.NewClient(rt)
out, err := client.Run(ctx, messages,
    runtime.WithSessionID("chat-session-123"), // required
    runtime.WithTurnID("turn-1"),              // optional but recommended for chat
)
```

- `SessionID`:
  - groups all runs for a conversation,
  - is often used as a search key in run stores and dashboards.

- `TurnID`:
  - groups events for a single user → assistant interaction,
  - is optional but helpful for UIs and logs.

The runtime records these in `run.Context` and `run.Record`; streaming and
memory subscribers can use them for correlation and indexing.

## Memory Store vs Run Store vs Session Store

Goa-AI’s feature modules provide three complementary stores:

- **Memory store (`memory.Store`)**  
  - persists per-run event history:
    - user/assistant messages,
    - tool calls and results,
    - planner notes and thinking.
  - API:

    ```go
    type Store interface {
        LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
        AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
    }
    ```

- **Run store (`run.Store`)**  
  - persists coarse-grained run metadata:
    - `RunID`, `AgentID`, `SessionID`, `TurnID`,
    - status, timestamps, labels.
  - API:

    ```go
    type Store interface {
        Upsert(ctx context.Context, record run.Record) error
        Load(ctx context.Context, runID string) (run.Record, error)
    }
    ```

- **Session store (`session.Store`)** (in the runtime features)  
  - tracks session-level metadata and search indexes where needed,
  - typically used for cross-run views (e.g., list sessions, last activity).

For many applications, a combination of **run store + memory store** is enough;
add a dedicated session store when you need richer session-level queries.

## Common Patterns

- **Chat sessions**:
  - use one `SessionID` per chat session,
  - start a new run per user turn or per “task”,
  - persist transcripts per run; use session metadata to stitch the conversation.

- **Long-running workflows**:
  - use a single run per logical workflow (potentially with pause/resume),
  - use `SessionID` to group related workflows (e.g., per ticket or incident),
  - rely on `run.Phase` and `RunCompleted` events for status tracking.

- **Search and dashboards**:
  - query `run.Store` by `SessionID`, labels, status,
  - load transcripts from `memory.Store` on demand for selected runs.

## Wiring Stores

With the Mongo-backed implementations:

```go
memStore,  _ := memorymongo.NewStore(memorymongo.Options{Client: mongoClient})
runStore,  _ := runmongo.NewStore(runmongo.Options{Client: mongoClient})

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunStore(runStore),
)
```

Once configured:

- default subscribers persist memory and run metadata automatically,
- you can rebuild transcripts from `memory.Store` at any time to:
  - re-call models,
  - power UIs,
  - or run offline analysis.


