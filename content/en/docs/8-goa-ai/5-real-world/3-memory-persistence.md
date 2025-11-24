---
title: "Memory Persistence"
linkTitle: "Memory Persistence"
weight: 3
description: "Persist agent transcripts and run metadata."
---

This guide covers persisting agent transcripts and run metadata using Goa-AI's memory and run stores.

## Overview

Goa-AI provides two complementary stores:

- **Memory Store (`memory.Store`)**: Persists per-run event history (user/assistant
  messages, tool calls/results, planner notes, thinking blocks) so planners and tools
  can query prior turns.
- **Run Store (`run.Store`)**: Persists run metadata (agent ID, status, phases,
  timestamps, labels) for observability and search.

## MongoDB Implementation

Goa-AI includes MongoDB-backed implementations:

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    runmongo    "goa.design/goa-ai/features/run/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient() // construct the typed Mongo client used by your app

memStore, err := memorymongo.NewStore(memorymongo.Options{Client: mongoClient})
if err != nil {
    log.Fatal(err)
}

runStore, err := runmongo.NewStore(runmongo.Options{Client: mongoClient})
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunStore(runStore),
)
```

## Custom Stores

### Memory Store (`memory.Store`)

The memory store interface lives in `runtime/agent/memory`:

```go
type Store interface {
    // LoadRun retrieves the snapshot for the given agent and run.
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)

    // AppendEvents appends events to the run's history.
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}
```

Key types:

- **`memory.Snapshot`** – immutable view of a run's stored history:
  - `AgentID`, `RunID`
  - `Events []memory.Event`
  - optional `Meta` for backend-specific metadata.
- **`memory.Event`** – single persisted entry:
  - `Type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`,
    `planner_note`, `thinking`)
  - `Timestamp`
  - `Data` (payload: message content, tool args/results, etc.)
  - `Labels` (structured metadata for filtering/search).

### Run Store (`run.Store`)

The run store interface lives in `runtime/agent/run`:

```go
type Store interface {
    Upsert(ctx context.Context, record run.Record) error
    Load(ctx context.Context, runID string) (run.Record, error)
}
```

`run.Record` captures coarse-grained lifecycle metadata:

- `AgentID`, `RunID`
- `SessionID`, `TurnID`
- `Status` (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`)
- `StartedAt`, `UpdatedAt`
- `Labels` (tenant, priority, etc.)
- `Metadata` (implementation-specific fields such as error codes).

## Best Practices

- **Index frequently queried fields** (session ID, run ID, status)
- **Archive old transcripts** to reduce storage costs
- **Use search attributes** for efficient run queries
- **Monitor store performance** and scale as needed

## Next Steps

- Learn about [Temporal Setup](./1-temporal-setup.md) for durable workflows
- Explore [Streaming UI](./2-streaming-ui.md) for real-time updates


