---
title: MCP Integration
weight: 6
description: "Integrate external MCP servers into your agents with generated wrappers and callers."
llm_optimized: true
aliases:
---

Goa-AI provides first-class support for integrating MCP (Model Context Protocol) servers into your agents. MCP toolsets allow agents to consume tools from external MCP servers through generated wrappers and callers.

## Overview

MCP integration follows this workflow:

1. **Service design**: Declare the MCP server via Goa's MCP DSL
2. **Agent design**: Reference that suite via a toolset declared with `FromMCP(...)` or `FromExternalMCP(...)`
3. **Code generation**: Produces the MCP JSON-RPC server (when Goa-backed) plus runtime registration helpers and toolset-owned specs/codecs for the suite
4. **Runtime wiring**: Instantiate an `mcpruntime.Caller` transport
   (HTTP/SSE/stdio). Generated helpers register the toolset and adapt JSON-RPC
   errors into `planner.ToolFailure` values
5. **Planner execution**: Planners construct calls with generated typed tool
   descriptors; the runtime forwards canonical JSON to the MCP caller, records
   results, and surfaces structured telemetry

---

## Declaring MCP Toolsets

### In Service Design

First, declare the MCP server in your Goa service design:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        Tool("search", "Search documents by query")
    })
})
```

### In Agent Design

Then reference the MCP suite in your agent:

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### External MCP Servers with Inline Schemas

For external MCP servers (not Goa-backed), declare tools with inline schemas:

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

---

## Runtime Wiring

At runtime, instantiate an MCP caller and register the toolset:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// Create an MCP caller (HTTP, SSE, or stdio)
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

---

## MCP Caller Types

Goa-AI supports multiple MCP transport types through the `runtime/mcp` package. All callers implement the `Caller` interface:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### HTTP Caller

For MCP servers accessible via HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage with defaults
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,        // Optional: custom *http.Client
    ProtocolVersion: "2024-11-05",            // Optional: MCP protocol version
    ClientName:      "my-agent",              // Optional: client name for handshake
    ClientVersion:   "1.0.0",                 // Optional: client version
    InitTimeout:     10 * time.Second,        // Optional: initialize handshake timeout
})
```

The HTTP caller performs the MCP initialize handshake on creation and uses synchronous JSON-RPC over HTTP POST for tool calls.

### SSE Caller

For MCP servers using Server-Sent Events streaming:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration (same options as HTTP)
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
```

The SSE caller uses HTTP for the initialize handshake but requests `text/event-stream` responses for tool calls, allowing servers to stream progress events before the final response.

### Stdio Caller

For MCP servers running as subprocesses communicating via stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
})

// Full configuration
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command:         "mcp-server",
    Args:            []string{"--config", "config.json"},
    Env:             []string{"MCP_DEBUG=1"},  // Additional environment variables
    Dir:             "/path/to/workdir",       // Working directory
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
defer caller.Close() // Clean up subprocess
```

The stdio caller launches the command as a subprocess, performs the MCP initialize handshake, and maintains the session across tool invocations. Call `Close()` to terminate the subprocess when done.

### CallerFunc Adapter

For custom caller implementations or testing:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    // Custom implementation
    result, err := myCustomMCPCall(ctx, req.Suite, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{Result: result}, nil
})
```

### Goa-Generated JSON-RPC Caller

For Goa-generated MCP clients that wrap service methods:

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## Tool Execution Flow

1. Planner returns tool calls constructed from the generated MCP tool
   descriptors, or forwards validated model calls with
   `planner.ToolRequestFromModelCall`
2. Runtime validates the complete planner result and assigns execution IDs,
   producing `runtime.ToolCall` values
3. Runtime detects MCP toolset registration
4. Forwards the runtime call's canonical JSON payload to the MCP caller
5. MCP caller handles transport (HTTP/SSE/stdio) and JSON-RPC protocol
6. Decodes result using generated codec
7. Returns `ToolResult` to planner

---

## Error Handling

Generated helpers adapt JSON-RPC errors into `planner.ToolFailure` values:

- **Validation errors** → invalid-call failures with exact correction evidence
- **Network errors** → unavailable or timeout failures with an explicit
  replanning or finish action
- **Server errors** → structured causes preserved in the failure

This gives MCP and native toolsets the same enforced recovery contract.

---

## Complete Example

### Design

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        Tool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Runtime

```go
package main

import (
    "context"
    "log"
    
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    chat "example.com/assistant/gen/orchestrator/agents/chat"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
    })
    if err != nil {
        log.Fatal(err)
    }
    if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
        log.Fatal(err)
    }
    
    // Register agent
    if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &MyPlanner{},
    }); err != nil {
        log.Fatal(err)
    }
    
    // Run agent
    client := chat.NewClient(rt)
    // ... use client ...
}
```

### Planner

Your planner can reference MCP tools just like native toolsets:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        mcpspecs.SearchTool(),
        &mcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{call},
    }, nil
}
```

Here `mcpspecs` is the generated specs package for the MCP toolset. When
forwarding a validated model-emitted tool call instead, use
`planner.ToolRequestFromModelCall` so its provider correlation ID is preserved.

---

## Best Practices

- **Let codegen manage registration**: Use the generated helper to register MCP
  toolsets; avoid hand-written glue so codecs and structured failure recovery
  stay consistent
- **Use typed callers**: Prefer Goa-generated JSON-RPC callers when available for type safety
- **Handle errors explicitly**: Map MCP errors to `ToolFailure` values with the
  correct failure kind and recovery action
- **Monitor telemetry**: MCP calls emit structured telemetry events; use them for observability
- **Choose the right transport**: Use HTTP for simple request/response, SSE for streaming, stdio for subprocess-based servers

---

## Next Steps

- **[Toolsets](./toolsets.md)** - Understand tool execution models
- **[Memory & Sessions](./memory-sessions.md)** - Manage state with transcripts and memory stores
- **[Production](./production.md)** - Deploy with Temporal and streaming UI
