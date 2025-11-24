---
title: "Agent Functions"
linkTitle: "Agent Functions"
weight: 2
description: "Functions for declaring agents and their tool usage."
---

## Agent

`Agent(name, description, dsl)` declares an agent inside a `Service`. It records the service-scoped agent metadata (name, description, owning service) and attaches toolsets via `Use` and `Export`.

**Location**: `dsl/agent.go`  
**Context**: Inside `Service`  
**Purpose**: Declares an agent, its tool usage/exports, and run policy.

Each agent becomes a runtime registration with:

- A workflow definition and Temporal activity handlers
- PlanStart/PlanResume activities with DSL-derived retry/timeout options
- A `Register<Agent>` helper that registers workflows, activities, and toolsets against a `runtime.Runtime`

### Example

```go
var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Export("chat.tools", func() {
            // tools defined here
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

## Use

`Use(value, dsl)` declares that an agent consumes a toolset. The toolset can be:

- A top-level `Toolset` variable
- An `MCPToolset` reference
- An inline toolset definition
- An `AgentToolset` reference for agent-as-tool composition

**Location**: `dsl/agent.go`  
**Context**: Inside `Agent`  
**Purpose**: Declares that an agent consumes a toolset (inline or by reference).

### Example

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference an MCP toolset
    Use(MCPToolset("assistant", "assistant-mcp"))
    
    // Inline toolset definition
    Use("helpers", func() {
        Tool("answer", "Answer a question", func() {
            // tool definition
        })
    })
    
    // Agent-as-tool composition
    Use(AgentToolset("service", "agent", "toolset"))
})
```

## Export

`Export(value, dsl)` declares toolsets exposed to other agents or services. Exported toolsets can be consumed by other agents via `Use(AgentToolset(...))`.

**Location**: `dsl/agent.go`  
**Context**: Inside `Agent` or `Service`  
**Purpose**: Declares toolsets exposed to other agents or services.

### Example

```go
Agent("planner", "Planning agent", func() {
    Export("planning.tools", func() {
        Tool("create_plan", "Create a plan", func() {
            Args(func() {
                Attribute("goal", String, "Goal to plan for")
                Required("goal")
            })
            Return(func() {
                Attribute("plan", String, "Generated plan")
                Required("plan")
            })
        })
    })
})
```

## AgentToolset

`AgentToolset(service, agent, toolset)` references a toolset exported by another agent. This enables agent-as-tool composition where one agent can use another agent's exported tools.

**Location**: `dsl/toolset.go`  
**Context**: Argument to `Use`  
**Purpose**: References an exported toolset from another agent.

### Example

```go
// Agent A exports tools
Agent("planner", func() {
    Export("planning.tools", func() {
        // tools
    })
})

// Agent B uses Agent A's tools
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

## Next Steps

- Learn about [Toolset Functions](./3-toolset-functions.md) for defining toolsets and tools
- Read about [Policy Functions](./4-policy-functions.md) for configuring runtime behavior

