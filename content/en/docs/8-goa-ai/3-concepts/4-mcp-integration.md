---
title: "MCP Integration"
linkTitle: "MCP Integration"
weight: 4
description: "Integrate external MCP servers into your agents."
---

Goa-AI provides first-class support for integrating MCP (Model Context Protocol) servers into your agents. MCP toolsets allow agents to consume tools from external MCP servers through generated wrappers and callers.

## Overview

MCP integration follows this workflow:

1. **Service design**: Declare the MCP server via Goa's MCP DSL
2. **Agent design**: Reference that suite with `Use(MCPToolset("service", "suite"))`
3. **Code generation**: Produces both the classic MCP JSON-RPC server (optional) and the runtime registration helper, plus tool codecs/specs mirrored into the agent package
4. **Runtime wiring**: Instantiate an `mcpruntime.Caller` transport (HTTP/SSE/stdio). Generated helpers register the toolset and adapt JSON-RPC errors into `planner.RetryHint` values
5. **Planner execution**: Planners simply enqueue tool calls with canonical JSON payloads; the runtime forwards them to the MCP caller, persists results via hooks, and surfaces structured telemetry

## Declaring MCP Toolsets

### In Service Design

First, declare the MCP server in your Goa service design:

```go
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    // MCP server declaration
    // ... MCP DSL here ...
})
```

### In Agent Design

Then reference the MCP suite in your agent:

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
    })
})
```

## Runtime Wiring

At runtime, instantiate an MCP caller and register the toolset:

```go
import (
    "goa.design/goa-ai/features/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// Create an MCP caller (HTTP, SSE, or stdio)
caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")

// Register the MCP toolset
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

## Generated Helpers

Code generation produces:

- `Register<Service><Suite>Toolset` functions that adapt MCP tool metadata into runtime registrations
- Tool codecs/specs mirrored into the agent package
- `client.NewCaller` helper so Goa-generated MCP clients can be plugged directly into the runtime

## MCP Caller Types

Goa-AI supports multiple MCP transport types:

### HTTP Caller

```go
caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")
```

### SSE Caller

```go
caller := featuresmcp.NewSSECaller("https://assistant.example.com/mcp")
```

### Stdio Caller

```go
caller := featuresmcp.NewStdioCaller(cmd)
```

### Goa-Generated JSON-RPC Caller

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

## Error Handling

Generated helpers adapt JSON-RPC errors into `planner.RetryHint` values:

- Validation errors → `RetryHint` with guidance for planners
- Network errors → Retry hints with backoff recommendations
- Server errors → Error details preserved in tool results

## Tool Execution Flow

1. Planner returns tool calls referencing MCP tools (payload is `json.RawMessage`)
2. Runtime detects MCP toolset registration
3. Forwards canonical JSON payload to MCP caller
4. Invokes MCP caller with tool name and payload
5. MCP caller handles transport (HTTP/SSE/stdio) and JSON-RPC protocol
6. Decodes result using generated codec
7. Returns `ToolResult` to planner

## Best Practices

- **Let codegen manage registration**: Use the generated helper to register MCP toolsets; avoid hand-written glue so codecs and retry hints stay consistent
- **Use typed callers**: Prefer Goa-generated JSON-RPC callers when available for type safety
- **Handle errors gracefully**: Map MCP errors to `RetryHint` values to help planners recover
- **Monitor telemetry**: MCP calls emit structured telemetry events; use them for observability

## Next Steps

- Learn about [Toolsets](../3-toolsets/) to understand tool execution models
- Explore the [MCP Toolsets Tutorial](../../4-tutorials/3-mcp-toolsets/) for a complete example
- Read the [Runtime Concepts](../2-runtime/) to understand the execution flow

