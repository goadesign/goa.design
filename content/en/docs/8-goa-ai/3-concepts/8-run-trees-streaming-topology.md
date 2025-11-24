---
title: "Run Trees & Streaming Topology"
linkTitle: "Run Trees & Streaming"
weight: 8
description: "Understand how Goa-AI models agent runs as a tree and how streaming projects that topology to different audiences."
---

## Runs, Sessions, and the Run Tree

Goa-AI models execution as a **tree of runs and tools**:

- **Run** – one execution of an agent:
  - identified by a `RunID`,
  - described by `run.Context` (RunID, SessionID, TurnID, labels, caps),
  - tracked durably via `run.Record` (status, timestamps, labels).

- **Session** – a conversation or workflow spanning one or more runs:
  - `SessionID` groups related runs (e.g., multi-turn chat).
  - UIs typically render one session at a time.

- **Run tree** – parent/child relationships between runs and tools:
  - top-level agent run (e.g., `chat`),
  - child agent runs (agent-as-tool, e.g., `ada`, `diagnostics`),
  - service tools underneath those agents.

The runtime maintains this tree using:

- `run.Handle` – a lightweight handle:
  - `RunID`, `AgentID`,
  - `ParentRunID`, `ParentToolCallID`.
- Agent-as-tool helpers and toolset registrations that **always create real
  child runs** for nested agents (no hidden inline hacks).

## Agent-as-Tool and RunLink

When an agent uses another agent as a tool:

- The runtime:
  - starts a **child run** for the provider agent with its own `RunID`,
  - tracks parent/child linkage in `run.Context`,
  - executes a full plan/execute/resume loop in the child.
- The parent tool result (`planner.ToolResult`) carries:

```go
RunLink *run.Handle
```

This `RunLink` allows:

- planners to reason about the child run (e.g., for audit/logging),
- UIs to create nested “agent cards” that can subscribe to the child run’s stream,
- external tooling to navigate from a parent run to its children without guessing.

## Per-Run Streams, Not Global Firehoses

Each run has its **own stream** of `stream.Event` values:

- `AssistantReply`, `PlannerThought`,
- `ToolStart`, `ToolUpdate`, `ToolEnd`,
- `AwaitClarification`, `AwaitExternalTools`,
- `Usage`, `Workflow`,
- `AgentRunStarted` (link from parent tool → child run).

Consumers subscribe per run:

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* handle */ }
defer stop()
```

This avoids global firehoses and lets UIs:

- attach one connection per run (e.g., per chat session),
- decide when to “drill into” child agents by subscribing to their runs
  using `AgentRunStarted` metadata (`ChildRunID`, `ChildAgentID`).

## Stream Profiles and Child Policies

`stream.StreamProfile` describes what an audience sees:

- which event kinds are included (`Assistant`, `Thoughts`, `ToolStart`, `ToolEnd`,
  `AwaitClarification`, `Usage`, `Workflow`, `AgentRuns`),
- and how child runs are projected via `ChildStreamPolicy`:
  - **Off** – child runs are hidden from this audience; only parent tool calls/results.
  - **Flatten** – child events are projected into the parent stream
    (debug-style “firehose”).
  - **Linked** – parent emits `AgentRunStarted` link events; child events remain
    on their own streams.

Built-in profiles:

- `stream.UserChatProfile()` – suitable for end-user chat:
  - assistant replies, thoughts, tools, awaits, usage, workflow,
  - **linked child runs** via `AgentRunStarted` (no flattening).

- `stream.AgentDebugProfile()` – verbose operational view:
  - same events as the default profile,
  - plus **flattened child runs** and link events.

- `stream.MetricsProfile()` – metrics/telemetry:
  - usage + workflow only,
  - child runs hidden (`ChildStreamPolicyOff`).

Applications choose the profile when wiring sinks and bridges (e.g., Pulse,
SSE, WebSocket) so:

- chat UIs stay clean and structured (linked child runs, agent cards),
- debug consoles can see full nested event streams,
- metrics pipelines see just enough to aggregate usage and statuses.

## How This Helps You Design UIs

Given the run tree + streaming model, a typical chat UI can:

- subscribe to the **root chat run** with a user chat profile,
- render:
  - assistant replies,
  - tool rows for top-level tools,
  - “agent run started” events as nested **Agent Cards**,
- when the user expands a card:
  - subscribe to the child run using `ChildRunID`,
  - render that agent’s own timeline (thoughts, tools, awaits) inside the card,
  - keep the main chat lane clean.

Debug tools can subscribe with a debug profile to see:

- flattened child events,
- explicit parent/child metadata,
- and full run trees for troubleshooting.

The key idea: **execution topology (run tree) is always preserved**, and
streaming is just a set of projections over that tree for different audiences.


