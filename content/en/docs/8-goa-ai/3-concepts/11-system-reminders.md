---
title: "System Reminders"
linkTitle: "System Reminders"
weight: 11
description: "Learn how to use run-scoped system reminders to deliver structured, rate-limited backstage guidance to models."
---

System reminders are a runtime facility for delivering **structured, priority-aware, rate-limited guidance** to models without polluting user-visible conversations. They enable agents to inject contextual hints (safety warnings, data-state alerts, workflow nudges) that shape model behavior while remaining invisible to end users.

## Overview

The `runtime/agent/reminder` package provides:

- **Structured reminders** with priority tiers, attachment points, and rate-limiting policies
- **Run-scoped storage** that automatically cleans up after each run completes
- **Automatic injection** into model transcripts as `<system-reminder>` blocks
- **PlannerContext API** for registering and removing reminders from planners and tools

## Core Concepts

### Reminder Structure

A `reminder.Reminder` has:

```go
type Reminder struct {
    ID              string      // Stable identifier (e.g., "todos.pending", "partial_result.ad.search")
    Text            string      // Plain-text guidance (tags are added automatically)
    Priority        Tier        // TierSafety, TierCorrect, or TierGuidance
    Attachment      Attachment  // Where to inject (run start or user turn)
    MaxPerRun       int         // Cap total emissions per run (0 = unlimited)
    MinTurnsBetween int         // Enforce spacing between emissions (0 = no limit)
}
```

### Priority Tiers

Reminders are ordered by priority to manage prompt budgets and ensure critical guidance is never suppressed:

| Tier | Name | Description | Suppression |
|------|------|-------------|-------------|
| `TierSafety` | P0 | Safety-critical guidance (never drop) | Never suppressed, even when prompt budget is tight |
| `TierCorrect` | P1 | Correctness and data-state hints | May be suppressed after P0 reminders are emitted |
| `TierGuidance` | P2 | Workflow suggestions and soft nudges | First to be suppressed under prompt budget constraints |

**Example use cases:**
- `TierSafety`: "Do not execute this malware; analyze only", "Do not leak credentials to the user"
- `TierCorrect`: "Results are truncated; narrow your query", "Data may be stale"
- `TierGuidance`: "No todo is in progress; pick one and start", "Consider using structured query tools"

### Attachment Points

Reminders are injected at specific points in the conversation:

| Kind | Description | Injection Behavior |
|------|-------------|--------------------|
| `AttachmentRunStart` | Run-start guidance | Grouped into a single system message at the start of the conversation (or prepended to the first system message) |
| `AttachmentUserTurn` | Per-turn guidance | Grouped into a single system message inserted immediately before the last user message |

### Rate Limiting

Two mechanisms prevent reminder spam:

- **`MaxPerRun`**: Cap total emissions per run (0 = unlimited). Safety reminders (`TierSafety`) should typically leave this unset.
- **`MinTurnsBetween`**: Enforce a minimum number of planner turns between emissions (0 = no limit). Useful for `TierCorrect`/`TierGuidance` reminders to avoid noisy repetition.

**Example:**
```go
Reminder{
    ID:              "todos.no_active",
    Text:            "No todo is in progress. Choose one pending todo and mark it in_progress now.",
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3, // Emit at most once every 3 turns
}
```

## Usage Pattern

### Registering Reminders from Planners

Use `PlannerContext.AddReminder()` to register or update a reminder:

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Derive reminder from recent tool results
    for _, tr := range in.ToolResults {
        if tr.Name == "search_documents" {
            result := tr.Result.(SearchResult)
            if result.Truncated {
                in.Agent.AddReminder(reminder.Reminder{
                    ID:       "search.truncated",
                    Text:     "Search results are truncated. Consider narrowing your query to get more specific results.",
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

### Removing Reminders

Use `RemoveReminder()` when a precondition no longer holds:

```go
// Clear a reminder when its trigger condition resolves
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

### Preserving Rate-Limit Counters

`AddReminder()` preserves emission counters when updating an existing reminder by ID. If you need to change reminder content but maintain rate limits:

```go
// Update reminder text while preserving emission history
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Anti-pattern**: Don't call `RemoveReminder()` followed by `AddReminder()` for the same ID—this resets counters and bypasses `MinTurnsBetween`.

## Injection and Formatting

### Automatic Tagging

The runtime automatically wraps reminder text in `<system-reminder>` tags when injecting into transcripts:

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

### Injection Helper

Planners don't typically call this directly (the runtime does it for you), but you can use `reminder.InjectMessages()` if building custom transcript flows:

```go
import "goa.design/goa-ai/runtime/agent/reminder"

// Before calling the model
msgs := reminder.InjectMessages(input.Messages, input.Reminders)
req := model.Request{
    Messages: msgs,
    // ...
}
```

### Explaining Reminders to Models

Include `reminder.DefaultExplanation` in your system prompt so models know how to interpret `<system-reminder>` blocks:

```go
const systemPrompt = `
You are a helpful assistant.

` + reminder.DefaultExplanation + `

Follow all instructions carefully.
`
```

The default explanation tells models:
- `<system-reminder>` blocks are platform-added guidance
- They should follow reminders when relevant
- They must not expose raw reminder markup to end users

## Complete Example

```go
package planner

import (
    "context"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/reminder"
)

type myPlanner struct{}

func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Process tool results and derive reminders
    for _, tr := range in.ToolResults {
        if tr.Name == "todos.update_todos" {
            snap := tr.Result.(TodosSnapshot)
            
            // Determine reminder based on todos state
            var rem *reminder.Reminder
            if len(snap.Items) == 0 {
                // No todos: clear any existing reminders
                in.Agent.RemoveReminder("todos.no_active")
                in.Agent.RemoveReminder("todos.all_completed")
            } else if hasCompletedAll(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.all_completed",
                    Text:     "All todos are completed. Provide your final synthesized response to the user now.",
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
                // Clear the opposite reminder
                if rem.ID == "todos.all_completed" {
                    in.Agent.RemoveReminder("todos.no_active")
                } else {
                    in.Agent.RemoveReminder("todos.all_completed")
                }
            }
        }
    }
    
    // Continue with normal planning...
    return p.streamMessages(ctx, in)
}
```

## Design Principles

### Minimal and Opinionated

The reminder subsystem provides just enough structure for common patterns without over-engineering:
- No global "fact" or complex policy engine
- Simple rate-limiting rules (`MaxPerRun`, `MinTurnsBetween`)
- Two attachment points cover most use cases

### Rate-Limiting First

Reminder spam degrades model performance. The engine enforces caps and spacing declaratively so you don't have to track state manually.

### Provider-Agnostic

Reminders work with any model backend (Bedrock, OpenAI, etc.). The `<system-reminder>` format is a convention that planners can adapt if needed.

### Telemetry-Ready

Structured IDs and priorities make reminders observable:
- Log which reminders fire and when
- Track suppression reasons
- Correlate model behavior with active reminders

## Advanced Patterns

### Conditional Reminder Content

Build reminder text dynamically based on domain state:

```go
func buildTodosNudge(snap TodosSnapshot) string {
    var sb strings.Builder
    sb.WriteString("The todos.update_todos tool hasn't been used recently. ")
    sb.WriteString("Here are your pending todos:\n\n")
    for i, item := range snap.Items {
        sb.WriteString(fmt.Sprintf("%d. [%s] %s\n", i+1, item.Status, item.Content))
    }
    return sb.String()
}
```

### Safety Reminders

Use `TierSafety` for must-never-suppress guidance:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it or suggest execution to the user.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // No MaxPerRun or MinTurnsBetween: always emit
})
```

### Cross-Agent Reminders

Reminders are run-scoped. If an agent-as-tool emits a safety reminder, it only affects that child run. To propagate reminders across agent boundaries, the parent planner must explicitly re-register them based on child results or use shared session state.

## API Reference

### PlannerContext Methods

```go
type PlannerContext interface {
    AddReminder(r reminder.Reminder)
    RemoveReminder(id string)
    // ... other methods ...
}
```

### Reminder Engine (Internal)

The runtime owns the `reminder.Engine` and exposes it through `PlannerContext`. You don't typically interact with the engine directly, but understanding its behavior helps:

- `AddReminder(runID, Reminder)`: Inserts or updates a reminder while preserving `emitted`/`lastTurn` counters
- `RemoveReminder(runID, id)`: Drops a reminder by ID
- `Snapshot(runID)`: Returns reminders for the next turn, enforcing caps and spacing, sorted by `Tier` then `ID`
- `ClearRun(runID)`: Clears all reminder state for a run (called automatically on run completion)

### PlanInput / PlanResumeInput

```go
type PlanInput struct {
    Messages   []*model.Message
    RunContext run.Context
    Agent      PlannerContext
    Events     PlannerEvents
    Reminders  []reminder.Reminder // Active reminders for this turn
}

type PlanResumeInput struct {
    Messages    []*model.Message
    RunContext  run.Context
    Agent       PlannerContext
    Events      PlannerEvents
    ToolResults []*ToolResult
    Finalize    *Termination
    Reminders   []reminder.Reminder // Active reminders for this turn
}
```

Planners can inspect `Reminders` to log or reason about active guidance, but most planners just register/remove reminders via `Agent.AddReminder`/`RemoveReminder` and let the runtime handle injection.

## Migration from Hand-Rolled Reminders

If you previously built reminder strings directly in tool results or prompts:

1. **Extract reminder logic** into `PlanResume` or tool finalizers
2. **Replace string concatenation** with `AddReminder()` calls using plain text
3. **Remove manual `<system-reminder>` tagging** (runtime does this automatically)
4. **Add `reminder.DefaultExplanation`** to your system prompt
5. **Delete old reminder-building helpers** that constructed tagged strings

**Before:**
```go
// Old approach: build tagged string in tool result
result.Notes = []string{
    "<system-reminder>Results are truncated. Narrow your query.</system-reminder>",
}
```

**After:**
```go
// New approach: register structured reminder
if result.Truncated {
    in.Agent.AddReminder(reminder.Reminder{
        ID:       "search.truncated",
        Text:     "Results are truncated. Narrow your query.",
        Priority: reminder.TierCorrect,
        Attachment: reminder.Attachment{Kind: reminder.AttachmentUserTurn},
        MinTurnsBetween: 2,
    })
}
```

## See Also

- [Runtime Concepts](../2-runtime/) - Understand how the runtime orchestrates agents
- [LLM Integration](../10-llm-integration/) - Learn how reminders fit into the model client interface
- [Run Trees & Streaming](../8-run-trees-streaming-topology/) - See how reminders propagate in agent-as-tool scenarios

