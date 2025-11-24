---
title: "Policy Functions"
linkTitle: "Policy Functions"
weight: 4
description: "Functions for configuring runtime policies and execution limits."
---

## RunPolicy

`RunPolicy(dsl)` configures execution limits enforced at runtime. It's declared inside an `Agent` and contains policy settings like caps, time budgets, and interruption handling.

**Location**: `dsl/policy.go`  
**Context**: Inside `Agent`  
**Purpose**: Configures runtime caps and behavior.

These values appear in the generated workflow configuration and the runtime enforces them on every turn.

### Example

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

## DefaultCaps

`DefaultCaps(opts...)` applies capability caps to prevent runaway loops and enforce execution limits. It accepts options like `MaxToolCalls` and `MaxConsecutiveFailedToolCalls`.

**Location**: `dsl/policy.go`  
**Context**: Inside `RunPolicy`  
**Purpose**: Applies capability caps (max calls, consecutive failures).

### Example

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

## MaxToolCalls

`MaxToolCalls(n)` sets the maximum number of tool calls allowed per planner turn. If exceeded, the runtime aborts the turn and returns an error.

**Location**: `dsl/policy.go`  
**Context**: Argument to `DefaultCaps`  
**Purpose**: Helper option for max tool calls cap.

### Example

```go
DefaultCaps(MaxToolCalls(8))
```

## MaxConsecutiveFailedToolCalls

`MaxConsecutiveFailedToolCalls(n)` sets the maximum number of consecutive failed tool calls allowed before the runtime aborts the run. This prevents infinite retry loops.

**Location**: `dsl/policy.go`  
**Context**: Argument to `DefaultCaps`  
**Purpose**: Helper option for consecutive failures cap.

### Example

```go
DefaultCaps(MaxConsecutiveFailedToolCalls(3))
```

## TimeBudget

`TimeBudget(duration)` enforces a wall-clock limit on agent execution. The runtime monitors elapsed time and aborts when exceeded. Duration can be specified as a string (e.g., `"2m"`, `"30s"`) or a `time.Duration`.

**Location**: `dsl/policy.go`  
**Context**: Inside `RunPolicy`  
**Purpose**: Sets max wall-clock execution time.

### Example

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

## InterruptsAllowed

`InterruptsAllowed(bool)` signals to the runtime that human-in-the-loop interruptions should be honored. When enabled, the runtime supports pause/resume operations via the interrupt API.

**Location**: `dsl/policy.go`  
**Context**: Inside `RunPolicy`  
**Purpose**: Enables run interruption handling.

### Example

```go
RunPolicy(func() {
    InterruptsAllowed(true)
})
```

## DisableAgentDocs

`DisableAgentDocs()` disables generation of `AGENTS_QUICKSTART.md` at the module root. By default, Goa-AI generates a contextual quickstart guide after code generation.

**Location**: `dsl/docs.go`  
**Context**: Inside `API`  
**Purpose**: Disables generation of `AGENTS_QUICKSTART.md` at the module root.

### Example

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

## Complete Policy Example

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        // Cap the number of tool calls per turn
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        
        // Set a time budget for the entire run
        TimeBudget("2m")
        
        // Allow human-in-the-loop interruptions
        InterruptsAllowed(true)
    })
})
```

## Next Steps

- Learn about the [Runtime Concepts](../2-runtime/) to understand how policies are enforced
- Explore [Toolset Functions](./3-toolset-functions.md) for defining tools

