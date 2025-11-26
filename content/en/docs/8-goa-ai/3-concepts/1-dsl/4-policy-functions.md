---
title: "Policy Functions"
linkTitle: "Policy Functions"
weight: 4
description: "Functions for configuring runtime policies and execution limits."
---

## RunPolicy

`RunPolicy(dsl)` configures execution limits enforced at runtime. It's declared inside an `Agent` and contains policy settings like caps, time budgets, timing, and interruption handling.

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
        OnMissingFields("await_clarification")
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

`MaxToolCalls(n)` sets the maximum number of tool invocations allowed during agent execution. If exceeded, the runtime aborts and returns an error.

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

`TimeBudget(duration)` enforces a wall-clock limit on agent execution. The runtime monitors elapsed time and aborts when exceeded. Duration is specified as a string (e.g., `"2m"`, `"30s"`).

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

## OnMissingFields

`OnMissingFields(action)` configures how the agent responds when tool invocation validation detects missing required fields. This allows control over whether the agent should stop, wait for user input, or continue execution.

**Location**: `dsl/policy.go`  
**Context**: Inside `RunPolicy`  
**Purpose**: Configures response to validation failures.

Valid values:

- `"finalize"`: Stop execution when required fields are missing
- `"await_clarification"`: Pause and wait for user to provide missing information
- `"resume"`: Continue execution despite missing fields
- `""` (empty): Let the planner decide based on context

### Example

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

## Timing

`Timing(dsl)` defines detailed run timing configuration for an agent. Use this to configure fine-grained timeouts for different phases of execution.

**Location**: `dsl/timing.go`  
**Context**: Inside `RunPolicy`  
**Purpose**: Configures granular timeout settings.

### Example

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock
        Plan("45s")     // timeout for Plan/Resume activities
        Tools("2m")     // default timeout for tool activities
    })
})
```

## Budget

`Budget(duration)` sets the total wall-clock budget for a run. This is an alternative to `TimeBudget` when using the `Timing` block.

**Location**: `dsl/timing.go`  
**Context**: Inside `Timing`  
**Purpose**: Sets overall execution time budget.

### Example

```go
Timing(func() {
    Budget("10m")
})
```

## Plan

`Plan(duration)` sets the timeout for both Plan and Resume activities. These are the LLM inference calls that produce tool requests.

**Location**: `dsl/timing.go`  
**Context**: Inside `Timing`  
**Purpose**: Sets timeout for planner activities.

### Example

```go
Timing(func() {
    Plan("45s") // 45 seconds for each planning step
})
```

## Tools

`Tools(duration)` sets the default timeout for ExecuteTool activities. Individual tool executions that exceed this duration are aborted.

**Location**: `dsl/timing.go`  
**Context**: Inside `Timing`  
**Purpose**: Sets default timeout for tool execution.

### Example

```go
Timing(func() {
    Tools("2m") // 2 minutes per tool execution
})
```

## Complete Policy Example

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        // Cap the number of tool calls
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        
        // Configure detailed timing
        Timing(func() {
            Budget("5m")    // total run budget
            Plan("30s")     // planner timeout
            Tools("1m")     // tool execution timeout
        })
        
        // Allow human-in-the-loop interruptions
        InterruptsAllowed(true)
        
        // Handle validation failures
        OnMissingFields("await_clarification")
    })
})
```

## Next Steps

- Learn about the [Runtime Concepts](../2-runtime/) to understand how policies are enforced
- Explore [Toolset Functions](./3-toolset-functions.md) for defining tools
- Read about [MCP DSL Functions](./5-mcp-functions.md) for MCP server integration
