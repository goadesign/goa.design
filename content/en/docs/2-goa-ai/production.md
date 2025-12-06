---
title: "Production"
linkTitle: "Production"
weight: 8
description: "Set up Temporal for durable workflows, stream events to UIs, apply adaptive rate limiting, and use system reminders."
llm_optimized: true
aliases:
  - /en/docs/8-goa-ai/5-real-world/
  - /en/docs/8-goa-ai/5-real-world/1-temporal-setup/
  - /en/docs/8-goa-ai/5-real-world/2-streaming-ui/
  - /en/docs/8-goa-ai/3-concepts/11-system-reminders/
  - /docs/8-goa-ai/5-real-world/
---

## Model Rate Limiting

This section covers adaptive rate limiting for model clients to manage throughput and handle provider throttling gracefully.

### Overview

The `features/model/middleware` package provides an **AIMD-style adaptive rate limiter** that sits at the model client boundary. It estimates token costs, blocks callers until capacity is available, and automatically adjusts its tokens-per-minute budget in response to rate limiting signals from providers.

Key features:
- **Adaptive throughput**: Automatically backs off when throttled and probes for more capacity on success
- **Token estimation**: Estimates request cost based on message content
- **Process-local or cluster-aware**: Operates locally by default, or coordinates across processes using Pulse replicated maps
- **Middleware pattern**: Wraps any `model.Client` transparently

### AIMD Strategy

The limiter uses an **Additive Increase / Multiplicative Decrease (AIMD)** strategy:

| Event | Action | Formula |
|-------|--------|---------|
| Success | Probe (additive increase) | `TPM += recoveryRate` (5% of initial) |
| `ErrRateLimited` | Backoff (multiplicative decrease) | `TPM *= 0.5` |

The effective tokens-per-minute (TPM) is bounded by:
- **Minimum**: 10% of initial TPM (floor to prevent starvation)
- **Maximum**: The configured `maxTPM` ceiling

### Basic Usage

Create a single limiter per process and wrap your model client:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/features/model/bedrock"
)

func main() {
    ctx := context.Background()

    // Create the adaptive rate limiter
    // Parameters: context, rmap (nil for local), key, initialTPM, maxTPM
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // nil = process-local limiter
        "",      // key (unused when rmap is nil)
        60000,   // initial tokens per minute
        120000,  // maximum tokens per minute
    )

    // Create your underlying model client
    bedrockClient, err := bedrock.NewClient(bedrock.Options{
        Region: "us-east-1",
        Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    })
    if err != nil {
        panic(err)
    }

    // Wrap with rate limiting middleware
    rateLimitedClient := limiter.Middleware()(bedrockClient)

    // Use rateLimitedClient with your runtime or planners
    rt := runtime.New(
        runtime.WithModelClient("claude", rateLimitedClient),
    )
}
```

### Cluster-Aware Rate Limiting

For multi-process deployments, coordinate rate limiting across instances using a Pulse replicated map:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()

    // Create a Pulse replicated map backed by Redis
    rm, err := rmap.NewMap(ctx, "rate-limits", rmap.WithRedis(redisClient))
    if err != nil {
        panic(err)
    }

    // Create cluster-aware limiter
    // All processes sharing this map and key coordinate their budgets
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "claude-sonnet",  // shared key for this model
        60000,            // initial TPM
        120000,           // max TPM
    )

    // Wrap your client as before
    rateLimitedClient := limiter.Middleware()(bedrockClient)
}
```

When using cluster-aware limiting:
- **Backoff propagates globally**: When any process receives `ErrRateLimited`, all processes reduce their budget
- **Probing is coordinated**: Successful requests increment the shared budget
- **Automatic reconciliation**: Processes watch for external changes and update their local limiters

### Token Estimation

The limiter estimates request cost using a simple heuristic:
- Counts characters in text parts and string tool results
- Converts to tokens using ~3 characters per token
- Adds a 500-token buffer for system prompts and provider overhead

This estimation is intentionally conservative to avoid under-counting.

### Integration with Runtime

Wire rate-limited clients into the Goa-AI runtime:

```go
// Create limiters for each model you use
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Wrap underlying clients
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configure runtime with rate-limited clients
rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithModelClient("claude", claudeClient),
    runtime.WithModelClient("gpt-4", gptClient),
)
```

### Best Practices

- **One limiter per model/provider**: Create separate limiters for different models to isolate their budgets
- **Set realistic initial TPM**: Start with your provider's documented rate limit or a conservative estimate
- **Use cluster-aware limiting in production**: Coordinate across replicas to avoid aggregate throttling
- **Monitor backoff events**: Log or emit metrics when backoffs occur to detect sustained throttling

---

## Temporal Setup

This section covers setting up Temporal for durable agent workflows in production environments.

### Overview

Temporal provides durable execution, replay, retries, signals, and workers for your Goa-AI agents. The Goa-AI runtime includes a Temporal adapter that implements the `engine.Engine` interface.

### Installation

**Option 1: Temporal Cloud**

Sign up at [temporal.io](https://temporal.io) and configure your client with cloud credentials.

**Option 2: Self-Hosted Temporal**

Deploy Temporal using Docker Compose or Kubernetes. See the [Temporal documentation](https://docs.temporal.io) for deployment guides.

**Option 3: Temporalite (Development)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

### Runtime Configuration

```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

### Worker Setup

Workers poll task queues and execute workflows/activities. Workers are automatically started for each registered agent—no manual worker configuration needed in most cases.

### Best Practices

- **Use separate namespaces** for different environments (dev, staging, prod)
- **Configure retry policies** in your workflow definitions
- **Monitor workflow execution** using Temporal's UI and observability tools
- **Set appropriate timeouts** for activities and workflows

---

## Streaming UI

This section shows how to stream agent events to UIs in real-time using Goa-AI's streaming infrastructure.

### Overview

Goa-AI exposes **per-run streams** of typed events that can be delivered to UIs via:
- Server-Sent Events (SSE)
- WebSockets
- Message buses (Pulse, Redis Streams, etc.)

Each workflow run has its own stream; when agents call other agents as tools, the runtime starts child runs and links them using `AgentRunStarted` events and `RunLink` handles. UIs can subscribe to any run by ID and choose how much detail to render.

### Stream Sink Interface

Implement the `stream.Sink` interface:

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### Event Types

The `stream` package defines concrete event types that implement `stream.Event`. Common ones for UIs are:

| Event Type | Description |
|------------|-------------|
| `AssistantReply` | Assistant message chunks (streaming text) |
| `PlannerThought` | Planner thinking blocks (notes and structured reasoning) |
| `ToolStart` | Tool execution started |
| `ToolUpdate` | Tool execution progress (expected child count updates) |
| `ToolEnd` | Tool execution completed (result, error, telemetry) |
| `AwaitClarification` | Planner is waiting for human clarification |
| `AwaitExternalTools` | Planner is waiting for external tool results |
| `Usage` | Token usage per model invocation |
| `Workflow` | Run lifecycle and phase updates |
| `AgentRunStarted` | Link from a parent tool call to a child agent run |

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

### Example: SSE Sink

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
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### Per-Run Subscription

Subscribe to a specific run's events:

```go
sink := &SSESink{w: w}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil {
    return err
}
defer stop()
```

### Global Stream Sink

To stream all runs through a global sink (for example, Pulse), configure the runtime with a stream sink:

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

The runtime installs a default `stream.Subscriber` that:
- maps hook events to `stream.Event` values
- uses the **default `StreamProfile`**, which emits assistant replies, planner thoughts, tool start/update/end, awaits, usage, workflow, and `AgentRunStarted` links, with child runs kept on their own streams

For advanced scenarios, you can build subscribers with explicit profiles:
- `stream.UserChatProfile()` – user-facing chat views (linked child runs)
- `stream.AgentDebugProfile()` – debug views (flattened children plus links)
- `stream.MetricsProfile()` – usage and workflow only

### Advanced: Pulse & Stream Bridges

For production setups, you often want to:
- publish events to a shared bus (e.g., Pulse)
- keep **per-run streams** on that bus (one topic/key per run)

Goa-AI provides:
- `features/stream/pulse` – a `stream.Sink` implementation backed by Pulse
- `runtime/agent/stream/bridge` – helpers to wire the hook bus to any sink

Typical wiring:

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
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

---

## System Reminders

System reminders are a runtime facility for delivering **structured, priority-aware, rate-limited guidance** to models without polluting user-visible conversations. They enable agents to inject contextual hints (safety warnings, data-state alerts, workflow nudges) that shape model behavior while remaining invisible to end users.

### Overview

The `runtime/agent/reminder` package provides:
- **Structured reminders** with priority tiers, attachment points, and rate-limiting policies
- **Run-scoped storage** that automatically cleans up after each run completes
- **Automatic injection** into model transcripts as `<system-reminder>` blocks
- **PlannerContext API** for registering and removing reminders from planners and tools

### Core Concepts

**Reminder Structure**

A `reminder.Reminder` has:

```go
type Reminder struct {
    ID              string      // Stable identifier (e.g., "todos.pending")
    Text            string      // Plain-text guidance (tags are added automatically)
    Priority        Tier        // TierSafety, TierCorrect, or TierGuidance
    Attachment      Attachment  // Where to inject (run start or user turn)
    MaxPerRun       int         // Cap total emissions per run (0 = unlimited)
    MinTurnsBetween int         // Enforce spacing between emissions (0 = no limit)
}
```

**Priority Tiers**

Reminders are ordered by priority to manage prompt budgets and ensure critical guidance is never suppressed:

| Tier | Name | Description | Suppression |
|------|------|-------------|-------------|
| `TierSafety` | P0 | Safety-critical guidance (never drop) | Never suppressed |
| `TierCorrect` | P1 | Correctness and data-state hints | May be suppressed after P0 |
| `TierGuidance` | P2 | Workflow suggestions and soft nudges | First to be suppressed |

Example use cases:
- `TierSafety`: "Do not execute this malware; analyze only", "Do not leak credentials"
- `TierCorrect`: "Results are truncated; narrow your query", "Data may be stale"
- `TierGuidance`: "No todo is in progress; pick one and start"

**Attachment Points**

Reminders are injected at specific points in the conversation:

| Kind | Description |
|------|-------------|
| `AttachmentRunStart` | Grouped into a single system message at the start of the conversation |
| `AttachmentUserTurn` | Grouped into a single system message inserted immediately before the last user message |

**Rate Limiting**

Two mechanisms prevent reminder spam:
- **`MaxPerRun`**: Cap total emissions per run (0 = unlimited)
- **`MinTurnsBetween`**: Enforce a minimum number of planner turns between emissions (0 = no limit)

### Usage Pattern

**Registering Reminders from Planners**

Use `PlannerContext.AddReminder()` to register or update a reminder:

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "search_documents" {
            result := tr.Result.(SearchResult)
            if result.Truncated {
                in.Agent.AddReminder(reminder.Reminder{
                    ID:       "search.truncated",
                    Text:     "Search results are truncated. Consider narrowing your query.",
                    Priority: reminder.TierCorrect,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun:       3,
                    MinTurnsBetween: 2,
                })
            }
        }
    }
    // Continue with planning...
}
```

**Removing Reminders**

Use `RemoveReminder()` when a precondition no longer holds:

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**Preserving Rate-Limit Counters**

`AddReminder()` preserves emission counters when updating an existing reminder by ID. If you need to change reminder content but maintain rate limits:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Anti-pattern**: Don't call `RemoveReminder()` followed by `AddReminder()` for the same ID—this resets counters and bypasses `MinTurnsBetween`.

### Injection and Formatting

**Automatic Tagging**

The runtime automatically wraps reminder text in `<system-reminder>` tags when injecting into transcripts:

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**Explaining Reminders to Models**

Include `reminder.DefaultExplanation` in your system prompt so models know how to interpret `<system-reminder>` blocks:

```go
const systemPrompt = `
You are a helpful assistant.

` + reminder.DefaultExplanation + `

Follow all instructions carefully.
`
```

### Complete Example

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "todos.update_todos" {
            snap := tr.Result.(TodosSnapshot)
            
            var rem *reminder.Reminder
            if len(snap.Items) == 0 {
                in.Agent.RemoveReminder("todos.no_active")
                in.Agent.RemoveReminder("todos.all_completed")
            } else if hasCompletedAll(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.all_completed",
                    Text:     "All todos are completed. Provide your final response now.",
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun: 1,
                }
            } else if hasPendingNoActive(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.no_active",
                    Text:     buildTodosNudge(snap),
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MinTurnsBetween: 3,
                }
            }
            
            if rem != nil {
                in.Agent.AddReminder(*rem)
                if rem.ID == "todos.all_completed" {
                    in.Agent.RemoveReminder("todos.no_active")
                } else {
                    in.Agent.RemoveReminder("todos.all_completed")
                }
            }
        }
    }
    
    return p.streamMessages(ctx, in)
}
```

### Design Principles

**Minimal and Opinionated**: The reminder subsystem provides just enough structure for common patterns without over-engineering.

**Rate-Limiting First**: Reminder spam degrades model performance. The engine enforces caps and spacing declaratively.

**Provider-Agnostic**: Reminders work with any model backend (Bedrock, OpenAI, etc.).

**Telemetry-Ready**: Structured IDs and priorities make reminders observable.

### Advanced Patterns

**Safety Reminders**

Use `TierSafety` for must-never-suppress guidance:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // No MaxPerRun or MinTurnsBetween: always emit
})
```

**Cross-Agent Reminders**

Reminders are run-scoped. If an agent-as-tool emits a safety reminder, it only affects that child run. To propagate reminders across agent boundaries, the parent planner must explicitly re-register them based on child results or use shared session state.

---

## Next Steps

- Learn about [Memory & Sessions](./memory-sessions/) for transcript persistence
- Explore [Agent Composition](./agent-composition/) for agent-as-tool patterns
- Read about [Toolsets](./toolsets/) for tool execution models
