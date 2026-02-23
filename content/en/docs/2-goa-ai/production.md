---
title: "Production"
linkTitle: "Production"
weight: 8
description: "Set up Temporal for durable workflows, stream events to UIs, apply adaptive rate limiting, and use system reminders."
llm_optimized: true
aliases:
---

## Model Rate Limiting

Every model provider enforces rate limits. Exceed them and your requests fail with 429 errors. Worse: in a multi-replica deployment, each replica independently hammers the API, causing *aggregate* throttling that's invisible to individual processes.

### The Problem

**Scenario:** You deploy 10 replicas of your agent service. Each replica thinks it has 100K tokens/minute available. Combined, they send 1M tokens/minute—10x your actual quota. The provider throttles aggressively. Requests fail randomly across all replicas.

**Without rate limiting:**
- Requests fail unpredictably with 429s
- No visibility into remaining capacity
- Retries make congestion worse
- User experience degrades under load

**With adaptive rate limiting:**
- Each replica shares a coordinated budget
- Requests queue until capacity is available
- Backoff propagates across the cluster
- Graceful degradation instead of failures

### Overview

The `features/model/middleware` package provides an **AIMD-style adaptive rate limiter** that sits at the model client boundary. It estimates token costs, blocks callers until capacity is available, and automatically adjusts its tokens-per-minute budget in response to rate limiting signals from providers.

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

### What Happens Under Load

| Traffic Level | Without Limiter | With Limiter |
|---------------|-----------------|--------------|
| Below quota | Requests succeed | Requests succeed |
| At quota | Random 429 failures | Requests queue, then succeed |
| Burst above quota | Cascade of failures, provider blocks | Backoff absorbs burst, gradual recovery |
| Sustained overload | All requests fail | Requests queue with bounded latency |

### Tuning Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `initialTPM` | (required) | Starting tokens-per-minute budget |
| `maxTPM` | (required) | Ceiling for probing |
| Floor | 10% of initial | Minimum budget (prevents starvation) |
| Recovery rate | 5% of initial | Additive increase per success |
| Backoff factor | 0.5 | Multiplicative decrease on 429 |

**Example:** With `initialTPM=60000, maxTPM=120000`:
- Floor: 6,000 TPM
- Recovery: +3,000 TPM per successful batch
- Backoff: halve current TPM on 429

### Monitoring

Track rate limiter behavior with metrics and logs:

```go
// The limiter logs backoff events at WARN level
// Monitor for sustained throttling by tracking:
// - Wait time distribution (how long requests queue)
// - Backoff frequency (how often 429s occur)
// - Current TPM vs. initial TPM

// Example: export current capacity to Prometheus
currentTPM := limiter.CurrentTPM()
```

### Best Practices

- **One limiter per model/provider**: Create separate limiters for different models to isolate their budgets
- **Set realistic initial TPM**: Start with your provider's documented rate limit or a conservative estimate
- **Use cluster-aware limiting in production**: Coordinate across replicas to avoid aggregate throttling
- **Monitor backoff events**: Log or emit metrics when backoffs occur to detect sustained throttling
- **Set maxTPM above initial**: Leave headroom for probing when traffic is below quota

---

## Prompt Overrides with Mongo Store

Production prompt management typically uses:

- baseline prompt specs registered in `runtime.PromptRegistry`, and
- scoped override records persisted in Mongo via `features/prompt/mongo`.

### Wiring

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

promptClient, err := clientmongo.New(clientmongo.Options{
    Client:     mongoClient,
    Database:   "aura",
    Collection: "prompt_overrides", // optional (default is prompt_overrides)
})
if err != nil {
    panic(err)
}

promptStore, err := promptmongo.NewStore(promptClient)
if err != nil {
    panic(err)
}

rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithPromptStore(promptStore),
)
```

### Override Resolution and Rollout

Override precedence is deterministic:

1. `session` scope
2. `facility` scope
3. `org` scope
4. global scope
5. baseline spec (when no override exists)

Recommended rollout strategy:

- Register new baseline specs first.
- Roll out overrides at broad scope (`org`), then narrow to `facility`/`session` for canaries.
- Track effective versions through `prompt_rendered` events and `model.Request.PromptRefs`.
- Roll back by writing a newer override at the same scope (or removing scope-specific overrides to fall back).

---

## Temporal Setup

This section covers setting up Temporal for durable agent workflows in production environments.

### Overview

Temporal provides durable execution for your Goa-AI agents. Agent runs become Temporal workflows with event-sourced history. Tool calls become activities with configurable retries. Every state transition is persisted. A restarted worker replays history and resumes exactly where it left off.

### How Durability Works

| Component | Role | Durability |
|-----------|------|------------|
| **Workflow** | Agent run orchestration | Event-sourced; survives restarts |
| **Plan Activity** | LLM inference call | Retries on transient failures |
| **Execute Tool Activity** | Tool invocation | Per-tool retry policies |
| **State** | Turn history, tool results | Persisted in workflow history |

**Concrete example:** Your agent calls an LLM, which returns 3 tool calls. Two tools complete. The third tool's service crashes.

- ❌ **Without Temporal:** The entire run fails. You re-run inference ($$$) and re-execute the two successful tools.
- ✅ **With Temporal:** Only the crashed tool retries. The workflow replays from history—no new LLM call, no re-running completed tools. Cost: one retry, not a full restart.

### What Survives Failures

| Failure Scenario | Without Temporal | With Temporal |
|------------------|------------------|---------------|
| Worker process crashes | Run lost, restart from zero | Replays from history, continues |
| Tool call times out | Run fails (or manual handling) | Automatic retry with backoff |
| Rate limit (429) | Run fails | Backs off, retries automatically |
| Network partition | Partial progress lost | Resumes after reconnect |
| Deploy during run | In-flight runs fail | Workers drain, new workers resume |

### Installation

**Option 1: Docker (Development)**

One-liner for local development:
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Option 2: Temporalite (Development)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Option 3: Temporal Cloud (Production)**

Sign up at [temporal.io](https://temporal.io) and configure your client with cloud credentials.

**Option 4: Self-Hosted (Production)**

Deploy Temporal using Docker Compose or Kubernetes. See the [Temporal documentation](https://docs.temporal.io) for deployment guides.

### Runtime Configuration

Goa-AI abstracts the execution backend behind the `Engine` interface. Swap engines without changing agent code:

**In-Memory Engine** (development):
```go
// Default: no external dependencies
rt := runtime.New()
```

**Temporal Engine** (production):
```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"

    // Your generated tool specs aggregate.
    // The generated package exposes: func Spec(tools.Ident) (*tools.ToolSpec, bool)
    specs "<module>/gen/<service>/agents/<agent>/specs"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
        // Required: enforce goa-ai's workflow boundary contract.
        // Tool results, server-data, and UI artifacts cross boundaries as canonical JSON bytes
        // (api.ToolEvent/api.ToolArtifact).
        DataConverter: runtimeTemporal.NewAgentDataConverter(specs.Spec),
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

### Configuring Activity Retries

Tool calls are Temporal activities. Configure retries per toolset in the DSL:

```go
Use("external_apis", func() {
    // Flaky external services: retry aggressively
    ActivityOptions(engine.ActivityOptions{
        Timeout: 30 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts:        5,
            InitialInterval:    time.Second,
            BackoffCoefficient: 2.0,
        },
    })
    
    Tool("fetch_weather", "Get weather data", func() { /* ... */ })
    Tool("query_database", "Query external DB", func() { /* ... */ })
})

Use("local_compute", func() {
    // Fast local tools: minimal retries
    ActivityOptions(engine.ActivityOptions{
        Timeout: 5 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts: 2,
        },
    })
    
    Tool("calculate", "Pure computation", func() { /* ... */ })
})
```

### Worker Setup

Workers poll task queues and execute workflows/activities. Workers are automatically started for each registered agent—no manual worker configuration needed in most cases.

### Best Practices

- **Use separate namespaces** for different environments (dev, staging, prod)
- **Configure retry policies** per toolset based on reliability characteristics
- **Monitor workflow execution** using Temporal's UI and observability tools
- **Set appropriate timeouts** for activities—balance reliability vs. hung detection
- **Use Temporal Cloud** for production to avoid operational burden

---

## Streaming UI

This section shows how to stream agent events to UIs in real-time using Goa-AI's streaming infrastructure.

### Overview

Goa-AI publishes **session-owned streams** of typed events that can be delivered to UIs via:
- Server-Sent Events (SSE)
- WebSockets
- Message buses (Pulse, Redis Streams, etc.)

All stream-visible events for a session are appended to a single stream: `session/<session_id>`. Each event carries both `run_id` and `session_id` so UIs can group events into per-run lanes/cards. Nested agent runs are linked via `child_run_linked` events. UIs close SSE/WebSocket deterministically when they observe `run_stream_end` for the active run.

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
| `ChildRunLinked` | Link from a parent tool call to a child agent run |
| `RunStreamEnd` | Explicit stream boundary marker for a run (no more stream-visible events will appear for that run) |

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
case stream.ChildRunLinked:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
case stream.RunStreamEnd:
    // run has no more stream-visible events
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
    case stream.ChildRunLinked:
        fmt.Fprintf(s.w, "data: child_run_linked: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    case stream.RunStreamEnd:
        fmt.Fprintf(s.w, "data: run_stream_end: %s\n\n", e.RunID())
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### Session Stream Subscription (Pulse)

In production, UIs consume the session stream (`session/<session_id>`) from a shared bus (Pulse / Redis Streams) and filter by `run_id`. Close SSE/WebSocket when you observe `run_stream_end` for the active run.

### Global Stream Sink

To stream all runs through a global sink (for example, Pulse), configure the runtime with a stream sink:

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

The runtime installs a default `stream.Subscriber` that:
- maps hook events to `stream.Event` values
- uses the **default `StreamProfile`**, which emits assistant replies, planner thoughts, tool start/update/end, awaits, usage, workflow, `child_run_linked` links, and the terminal `run_stream_end` marker

### Stream Profiles

Not every consumer needs every event. **Stream profiles** filter events for different audiences, reducing noise and bandwidth for specific use cases.

| Profile | Use Case | Included Events |
|---------|----------|-----------------|
| `UserChatProfile()` | End-user chat UI | Assistant replies, tool start/end, workflow completion |
| `AgentDebugProfile()` | Developer debugging | Everything including planner thoughts |
| `MetricsProfile()` | Observability pipelines | Usage and workflow events only |

**Using built-in profiles:**

```go
// User-facing chat: replies, tool status, completion
profile := stream.UserChatProfile()

// Debug view: everything including planner thoughts
profile := stream.AgentDebugProfile()

// Metrics pipeline: just usage and workflow events
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**Custom profiles:**

```go
// Fine-grained control over which events to emit
profile := stream.StreamProfile{
    Assistant:  true,
    Thoughts:   false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    ChildRuns:  true,   // Include parent tool → child run links
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

Custom profiles are useful when:
- You need specific events for a specialized consumer (e.g., progress tracking)
- You want to reduce payload size for mobile clients
- You're building analytics pipelines that only need certain events

### Advanced: Pulse & Stream Bridges

For production setups, you often want to:
- publish events to a shared bus (e.g., Pulse)
- use a **session-owned stream** on that bus (`session/<session_id>`)

Goa-AI provides:
- `features/stream/pulse` – a `stream.Sink` implementation backed by Pulse
- `runtime/agent/stream/bridge` – helpers to wire the hook bus to any sink

Typical wiring:

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Optional: override stream naming (defaults to `session/<SessionID>`).
    StreamID: func(ev stream.Event) (string, error) {
        if ev.SessionID() == "" {
            return "", errors.New("missing session id")
        }
        return fmt.Sprintf("session/%s", ev.SessionID()), nil
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

Models drift. They forget instructions. They ignore context that was clear 10 turns ago. When your agent executes long-running tasks, you need a way to inject *dynamic, contextual guidance* without polluting the user conversation.

### The Problem

**Scenario:** Your agent manages a todo list. After 20 turns, the user asks "what's next?" but the model has drifted—it doesn't remember there's a pending todo in progress. You need to nudge it *without* the user seeing an awkward "REMINDER: you have a todo in progress" message.

**Without system reminders:**
- You bloat the system prompt with every possible scenario
- Guidance gets lost in long conversations
- No way to inject context based on tool results
- Users see internal agent scaffolding

**With system reminders:**
- Inject guidance dynamically based on runtime state
- Rate-limit repetitive hints to avoid prompt bloat
- Priority tiers ensure safety guidance is never suppressed
- Invisible to users—injected as `<system-reminder>` blocks

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

**Static Reminders via DSL**

For reminders that should always appear after a specific tool result, use the `ResultReminder` DSL function in your tool definition:

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

This is ideal when the reminder applies to every invocation of the tool. See the [DSL Reference](./dsl-reference.md#resultreminder) for details.

**Dynamic Reminders from Planners**

For reminders that depend on runtime state or tool result content, use `PlannerContext.AddReminder()`:

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

### When to Use Reminders

| Scenario | Priority | Example |
|----------|----------|---------|
| Security constraints | `TierSafety` | "This file is malware—analyze only, never execute" |
| Data staleness | `TierCorrect` | "Results are 24h old; re-query if freshness matters" |
| Truncated results | `TierCorrect` | "Only showing first 100 results; narrow your search" |
| Workflow nudges | `TierGuidance` | "No todo is in progress; pick one and start" |
| Completion hints | `TierGuidance` | "All tasks done; provide your final response" |

### What Reminders Look Like in the Transcript

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

The model sees the reminder; the user sees only their message and the response. Reminders are injected transparently by the runtime.

---

## Next Steps

- Learn about [Memory & Sessions](./memory-sessions/) for transcript persistence
- Explore [Agent Composition](./agent-composition/) for agent-as-tool patterns
- Read about [Toolsets](./toolsets/) for tool execution models
