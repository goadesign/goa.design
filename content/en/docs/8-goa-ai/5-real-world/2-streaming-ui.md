---
title: "Streaming UI"
linkTitle: "Streaming UI"
weight: 2
description: "Stream agent events to UIs in real-time."
---

This guide shows how to stream agent events to UIs in real-time using Goa-AI's streaming infrastructure.

## Overview

Goa-AI exposes **per-run streams** of typed events that can be delivered to UIs via:

- Server-Sent Events (SSE)
- WebSockets
- Message buses (Pulse, Redis Streams, etc.)

Each workflow run has its own stream; when agents call other agents as tools, the runtime
starts child runs and links them using `AgentRunStarted` events and `RunLink` handles.
UIs can subscribe to any run by ID and choose how much detail to render.

## Stream Sink Interface

Implement the `stream.Sink` interface:

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

## Event Types

The `stream` package defines concrete event types that implement `stream.Event`. Common
ones for UIs are:

- **`AssistantReply`** – assistant message chunks (streaming text)
- **`PlannerThought`** – planner thinking blocks (notes and structured reasoning)
- **`ToolStart`** – tool execution started
- **`ToolUpdate`** – tool execution progress (expected child count updates)
- **`ToolEnd`** – tool execution completed (result, error, telemetry)
- **`AwaitClarification`** – planner is waiting for human clarification
- **`AwaitExternalTools`** – planner is waiting for external tool results
- **`Usage`** – token usage per model invocation
- **`Workflow`** – run lifecycle and phase updates (`prompted`, `planning`,
  `executing_tools`, `synthesizing`, `completed`, `failed`, `canceled`)
- **`AgentRunStarted`** – link from a parent tool call to a child agent run

Transports typically type-switch on `stream.Event` for compile-time safety:

```go
switch e := evt.(type) {
case stream.AssistantReply:
    // e.Data.Text
case stream.PlannerThought:
    // e.Data.Note or structured thinking fields
case stream.ToolStart:
    // e.Data.ToolCallID, e.Data.ToolName, e.Data.Payload
case stream.ToolEnd:
    // e.Data.Result, e.Data.Error, e.Data.ResultPreview
case stream.AgentRunStarted:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
}
```

## Example: SSE Sink

```go
type SSESink struct {
    w http.ResponseWriter
}

func (s *SSESink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.AssistantReply:
        fmt.Fprintf(s.w, "data: assistant: %s\n\n", e.Data.Text)
    case stream.PlannerThought:
        if e.Data.Note != "" {
            fmt.Fprintf(s.w, "data: thinking: %s\n\n", e.Data.Note)
        }
    case stream.ToolStart:
        fmt.Fprintf(s.w, "data: tool_start: %s\n\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Fprintf(s.w, "data: tool_end: %s status=%v\n\n",
            e.Data.ToolName, e.Data.Error == nil)
    case stream.AgentRunStarted:
        fmt.Fprintf(s.w, "data: agent_run_started: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    // ... handle Workflow, Await*, Usage, etc. as needed
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

## Per-Run Subscription

Subscribe to a specific run's events:

```go
sink := &SSESink{w: w}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil {
    return err
}
defer stop()
```

## Global Stream Sink

To stream all runs through a global sink (for example, Pulse), configure the runtime
with a stream sink:

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

The runtime installs a default `stream.Subscriber` that:

- maps hook events to `stream.Event` values, and
- uses the **default `StreamProfile`**, which emits assistant replies, planner thoughts,
  tool start/update/end, awaits, usage, workflow, and `AgentRunStarted` links, with
  child runs kept on their own streams.

For advanced scenarios, you can build subscribers with explicit profiles:

- `stream.UserChatProfile()` – user-facing chat views (linked child runs)
- `stream.AgentDebugProfile()` – debug views (flattened children plus links)
- `stream.MetricsProfile()` – usage and workflow only

and register them directly on the hook bus.

## Advanced: Pulse & Stream Bridges

For production setups, you often want to:

- publish events to a shared bus (e.g., Pulse), and
- keep **per-run streams** on that bus (one topic/key per run).

Goa-AI provides:

- `features/stream/pulse` – a `stream.Sink` implementation backed by Pulse.
- `runtime/agent/stream/bridge` – helpers to wire the hook bus to any sink
  without importing the hooks subscriber directly.

Typical wiring:

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Derive stream ID from RunID, e.g. "run/<run-id>"
    StreamIDFunc: func(ev stream.Event) (string, error) {
        if ev.RunID() == "" {
            return "", errors.New("missing run id")
        }
        return fmt.Sprintf("run/%s", ev.RunID()), nil
    },
})
if err != nil { log.Fatal(err) }

rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(s),
)
```

For per-request sinks (e.g., SSE/WebSocket per tab), use the bridge helpers to
attach a subscriber for the duration of the connection:

```go
sub, _ := streambridge.Register(rt.Bus, mySink)
defer sub.Close()
```

The combination of:

- **per-run streams** (one topic/key per `RunID`), and
- **profiles** (`UserChatProfile`, `AgentDebugProfile`, `MetricsProfile`)

lets you build clean, scalable streaming architectures: chat UIs, debug
dashboards, and metrics pipelines can all consume from the same underlying
event model with audience-specific projections.

## Next Steps

- Learn about [Memory Persistence](./3-memory-persistence.md) for transcript storage
- Explore [Temporal Setup](./1-temporal-setup.md) for durable workflows


