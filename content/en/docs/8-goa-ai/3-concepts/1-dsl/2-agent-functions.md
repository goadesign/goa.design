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
- An inline toolset definition (string name + DSL)
- An `AgentToolset` reference for agent-as-tool composition

When referencing a provider toolset, the optional DSL function can subset tools by name or add configuration. When using a string name, an agent-local inline toolset is created.

**Location**: `dsl/agent.go`  
**Context**: Inside `Agent`  
**Purpose**: Declares that an agent consumes a toolset (inline or by reference).

### Example

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset
    Use(MCPToolset("assistant", "assistant-mcp"))
    
    // Inline agent-local toolset definition
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

Export can appear in:
- An `Agent` expression (exports as agent-owned)
- A `Service` expression (exports as service-owned)

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

Use `AgentToolset` when:
- You don't have an expression handle to the exported toolset
- Multiple agents export toolsets with the same name (ambiguity)
- You want to be explicit in the design for clarity

When you have a direct expression handle (e.g., a top-level Toolset variable), prefer `Use(ToolsetExpr)` and let Goa-AI infer the provider automatically.

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

## Passthrough

`Passthrough(toolName, target, methodName)` defines deterministic forwarding for an exported tool to a Goa service method. This bypasses the planner entirely—when the tool is invoked, it directly calls the specified service method.

**Location**: `dsl/agent.go`  
**Context**: Inside `Tool` nested under `Export`  
**Purpose**: Routes tool calls directly to service methods without planner involvement.

Passthrough accepts:
- `Passthrough(toolName, methodExpr)` - Using a Goa method expression
- `Passthrough(toolName, serviceName, methodName)` - Using service and method names

### Example

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("message", String, "Message to log")
            Required("message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
        })
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

## UseAgentToolset

`UseAgentToolset(service, agent, toolset)` is a convenience function that combines `AgentToolset` and `Use`. It references a toolset exported by another agent and immediately adds it to the current agent's used toolsets.

**Location**: `dsl/toolset.go`  
**Context**: Inside `Agent`  
**Purpose**: Shorthand for `Use(AgentToolset(...))`.

### Example

```go
Agent("orchestrator", func() {
    // These two are equivalent:
    Use(AgentToolset("service", "planner", "planning.tools"))
    UseAgentToolset("service", "planner", "planning.tools")
})
```

## DisableAgentDocs

`DisableAgentDocs()` disables generation of `AGENTS_QUICKSTART.md` at the module root. By default, Goa-AI generates a contextual quickstart guide after code generation.

**Location**: `dsl/agent.go`  
**Context**: Inside `API`  
**Purpose**: Disables generation of `AGENTS_QUICKSTART.md` at the module root.

### Example

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

## Next Steps

- Learn about [Toolset Functions](./3-toolset-functions.md) for defining toolsets and tools
- Read about [Policy Functions](./4-policy-functions.md) for configuring runtime behavior
