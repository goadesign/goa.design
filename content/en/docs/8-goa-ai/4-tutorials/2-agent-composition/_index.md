---
title: "Agent Composition Tutorial"
linkTitle: "Agent Composition"
weight: 2
description: "Learn how to compose agents using agent-as-tool patterns."
---

This tutorial demonstrates how to compose agents by treating one agent as a tool of another. You'll build a planning agent that exports tools, and an orchestrator agent that uses those tools.

## What You'll Build

- A planning agent that exports planning tools
- An orchestrator agent that uses the planning agent's tools
- Cross-process composition with inline execution

## Prerequisites

- Completed the [Simple Agent Tutorial](../1-simple-agent/)
- Understanding of [Agent Functions](../../3-concepts/1-dsl/2-agent-functions.md)

## Step 1: Design the Agents

Create `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var PlanRequest = Type("PlanRequest", func() {
    Attribute("goal", String, "Goal to plan for")
    Required("goal")
})

var PlanResult = Type("PlanResult", func() {
    Attribute("plan", String, "Generated plan")
    Required("plan")
})

var _ = Service("orchestrator", func() {
    // Planning agent that exports tools
    Agent("planner", "Planning agent", func() {
        Export("planning.tools", func() {
            Tool("create_plan", "Create a plan", func() {
                Args(PlanRequest)
                Return(PlanResult)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(5))
            TimeBudget("1m")
        })
    })
    
    // Orchestrator agent that uses planning tools
    Agent("orchestrator", "Orchestration agent", func() {
        Use(AgentToolset("orchestrator", "planner", "planning.tools"))
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

## Step 2: Generate Code

```bash
goa gen example.com/tutorial/design
```

## Step 3: Implement Planners

The generated code provides helpers for both agents. Wire them together:

```go
package main

import (
    "context"
    
    planner "example.com/tutorial/gen/orchestrator/agents/planner"
    orchestrator "example.com/tutorial/gen/orchestrator/agents/orchestrator"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    
    // Register planning agent
    if err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Register orchestrator agent (automatically uses planning tools)
    if err := orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Use orchestrator agent
    client := orchestrator.NewClient(rt)
    // ... run agent ...
}
```

## Key Concepts

- **Export**: Declares toolsets that other agents can use
- **AgentToolset**: References an exported toolset from another agent
- **Inline Execution**: From the caller's perspective, an agent-as-tool behaves like a
  normal tool call; the runtime runs the provider agent as a child run and aggregates
  its output into a single `ToolResult` (with a `RunLink` back to the child run).
- **Cross-Process**: Agents can execute on different workers while maintaining a coherent
  run tree; `AgentRunStarted` events and run handles link parent tool calls to child
  agent runs for streaming and observability.

## Next Steps

- Learn about [MCP Integration](../3-mcp-toolsets/) for external tool suites
- Read the [Runtime Concepts](../../3-concepts/2-runtime/) to understand inline execution
- Explore [Real-World Patterns](../../5-real-world/) for production deployments

