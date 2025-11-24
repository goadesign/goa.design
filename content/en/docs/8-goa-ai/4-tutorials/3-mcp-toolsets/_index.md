---
title: "MCP Toolsets Tutorial"
linkTitle: "MCP Toolsets"
weight: 3
description: "Integrate external MCP servers into your agents."
---

This tutorial shows how to integrate external MCP (Model Context Protocol) servers into your Goa-AI agents.

## What You'll Build

An agent that consumes tools from an external MCP server, demonstrating:

- MCP server declaration
- Agent integration
- Runtime wiring
- Tool execution

## Prerequisites

- Completed the [Simple Agent Tutorial](../1-simple-agent/)
- Understanding of [MCP Integration](../../3-concepts/4-mcp-integration.md)
- Access to an MCP server (or use the example MCP server)

## Step 1: Declare MCP Server

In your service design, declare the MCP server:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    // MCP server declaration
    // ... MCP DSL here ...
})
```

## Step 2: Reference MCP Suite in Agent

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
    })
})
```

## Step 3: Wire MCP Caller at Runtime

```go
import (
    "goa.design/goa-ai/features/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")

if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

## Step 4: Use MCP Tools

Your planner can now reference MCP tools just like native toolsets:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{
            {
                Name:    "assistant.assistant-mcp.some_tool",
                Payload: []byte(`{"param": "value"}`),
            },
        },
    }, nil
}
```

## Next Steps

- Learn about [Toolsets](../../3-concepts/3-toolsets/) to understand execution models
- Explore [Real-World Patterns](../../5-real-world/) for production deployments
- Read the [Runtime Concepts](../../3-concepts/2-runtime/) to understand the execution flow

