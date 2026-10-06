---
nav_group: guides
title: MCP Integration
weight: 50
description: "Create MCP servers with tools, resources, and prompts, and consume external MCP tools."
llm_optimized: true
aliases:
---

Goa-AI supports both **creating MCP servers** and **consuming external MCP tools**. Add MCP declarations to a Goa service to expose methods as tools, publish resources, and provide prompt templates. The generator produces JSON-RPC protocol handling and service adapters. Hosting an MCP server does not require running a Goa-AI agent.

The HTTP and stdio callers send self-contained requests with protocol metadata. There is no initialization handshake or protocol session. Their `Caller` interface invokes tools; their `Listen` methods receive change notifications. Generated Goa JSON-RPC clients also expose the resource, prompt, discovery, and completion operations declared by the service.

## Overview

MCP integration follows this workflow:

1. **Service design**: Declare the MCP server via Goa's MCP DSL
2. **Agent design**: Reference that suite via a toolset declared with `FromMCP(...)` or `FromExternalMCP(...)`
3. **Code generation**: Produces the MCP JSON-RPC server (when Goa-backed) plus runtime registration helpers and toolset-owned specs/codecs for the suite
4. **Runtime wiring**: Instantiate an HTTP or stdio `mcpruntime.Caller`. The
   HTTP caller accepts either a JSON response or an HTTP event stream. Generated
   helpers register the toolset and adapt JSON-RPC errors into
   `planner.ToolFailure` values
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
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
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

## URL values and mapped attributes

Use Goa’s `Param("payload_field:url_name")` notation to distinguish a payload field from a URL wildcard:

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

The URL supplies `organization_id`. Tool and prompt arguments, schemas, examples, and generated argument codecs exclude that field. An independent domain field named `organization` remains an argument. Each method keeps its declared type, custom Go field name, and validation. Invalid URL values stop before its configured endpoint runs. API and parent service prefixes retain their complete authored paths.

Generated protocol clients carry URL values outside JSON-RPC parameters. Generated `NewCaller` accepts those values in route order after its retry policy; pass `"blue"` last for this route. That caller keeps the same address for every tool call. `NewHTTPCaller` instead receives the complete URL, such as `https://example.com/organizations/blue/mcp`. Regenerate clients, servers, and agent contracts together.

---

## Hosting the generated server

Pass your configured original Goa endpoints to `NewMCPAdapter`, then construct the generated HTTP server. Pass allowed browser origins as the final string arguments to its `New` constructor, such as `"https://app.example.com"`. With no origins, requests without an `Origin` header are accepted and requests carrying that header are rejected.

Use `Server.Use` to install HTTP middleware before requests begin. `Mount(mux)` and direct `ServeHTTP` calls share the same checks for origins, HTTP methods, MCP headers and request metadata before middleware or service work. The origin list is copied during construction. Replace `MountWithOrigins` with constructor arguments and use `ServeHTTP` instead of the removed inner `Handler` field. Regenerate servers and update their callers together.

For routes with URL parameters, register `ServeHTTP` with the same mux passed to `New`, or use `Mount(mux)`. The mux supplies path values to generated decoders.

---

## Runtime Wiring

At runtime, instantiate an MCP caller and register the toolset:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
)

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := genchat.RegisterUsedToolsets(ctx, rt,
    genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
); err != nil {
    log.Fatal(err)
}
```

---

## MCP Caller Types

Goa-AI supports HTTP and stdio through the `runtime/mcp` package. Both callers
implement the `Caller` interface:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

`CallRequest` carries the tool name, raw JSON arguments, and an optional host-owned continuation. `CallResponse.Content` is `content.Blocks` from `runtime/content`: ordered text, image, audio, resource-link, or embedded-resource values. Structured JSON stays separate in `StructuredContent`. An `InputRequired` result leaves the operation unfinished; the host supplies requested input before continuing.

### HTTP Caller

For MCP servers accessible via HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient,
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
```

The constructor validates the endpoint and application identity without making a network request. Each operation sends JSON-RPC over HTTP `POST` and accepts JSON or an event stream. When `Client` is omitted, it uses `http.DefaultClient`; the application owns request deadlines through its context and HTTP client.

### Stdio Caller

For MCP servers running as subprocesses communicating via stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Added to the current environment.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    return err
}
defer func() {
    if err := caller.Close(shutdownContext); err != nil {
        log.Print(err)
    }
}()
```

The stdio caller starts one subprocess and correlates concurrent operations by request ID. Requests carry their own metadata. Close the caller with an application-owned shutdown context and handle the returned error.

### CallerFunc Adapter

For custom caller implementations or testing:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    content, structured, err := myCustomMCPCall(ctx, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{
        Content:           content,
        StructuredContent: structured,
    }, nil
})
```

### Goa-Generated JSON-RPC Caller

For Goa-generated MCP clients that wrap service methods:

```go
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## Progress and resource changes

Use `WithProgress(ctx, handler)` when the host needs progress before a completed result. Service code calls `ReportProgress`; the transport supplies correlation identifiers. A callback failure stops that operation and must be handled.

```go
err := caller.Listen(ctx, mcpruntime.SubscriptionFilter{
    ResourceSubscriptions: []string{"file:///docs/README.md"},
}, func(ctx context.Context, event mcpruntime.SubscriptionEvent) error {
    return handleResourceChange(ctx, event)
})
if err != nil {
    return err
}
```

Use `Listen` to receive an acknowledgment followed by accepted catalog or resource changes. Check the acknowledged filter: unsupported kinds can be omitted. The application implements `handleResourceChange`, reloads the relevant data, and honors cancellation. A connection loss is an error; the caller does not automatically reconnect.

For a generated JSON-RPC client, use `WithSubscriptionEvents(ctx, handler)` and call its typed `SubscriptionsListen` endpoint. The endpoint returns the final result while the handler receives validated events. A missing handler fails before network dispatch.

### Declaring a resource subscription source

An HTTP MCP service with resources can mark one server-streaming method with `ResourceSubscription()`. Its optional `resources` input contains URI strings. Its required `change` union contains `acknowledged` with an optional `resources` array, or `updated` with one required `uri`. Declare `Format(FormatURI)` for each URI. The source first authorizes and acknowledges a subset, then sends updates until it returns or the request is canceled.

Only a bound resource source advertises resource subscription support. The source owns authorization, change detection, and related sub-resource selection. The generator preserves the configured Goa endpoint, including credentials, scopes, interceptors, and middleware. The shared transport owns event ordering and request identifiers. Fixed catalogs do not emit catalog-change notifications.

### Resources, prompts, and rich content

`ResourceTemplate` binds a parameterized URI to a typed read method. `Prompt` binds a method that returns prompt messages. `ResourceCompletion` and `PromptCompletion` bind typed argument suggestions. `ToolContent` selects a typed rich-content field beside the tool’s structured result. These contracts use the same Goa design and generation workflow as ordinary service methods.

### Retrying an interrupted tool response

HTTP calls make one attempt by default. A host can opt into `HTTPRetryPolicy` for a trusted endpoint. An interrupted response is retried only when the selected tool declares read-only or idempotent behavior and the policy trusts those declarations. The retry sends a new request ID and may execute the tool again. Errors, malformed responses, callback failures, and subscription interruptions do not authorize retries.

---

## Tool Execution Flow

1. Planner returns tool calls constructed from the generated MCP tool
   descriptors, or forwards validated model calls with
   `planner.ToolRequestFromModelCall`
2. Runtime validates the complete planner result and assigns execution IDs,
   producing `runtime.ToolCall` values
3. Runtime detects MCP toolset registration
4. Forwards the runtime call's canonical JSON payload to the MCP caller
5. The MCP caller uses HTTP or stdio and handles the JSON-RPC protocol. An HTTP
   response may be JSON or an event stream
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

Failures returned by a tool become `ToolFailure`. An invalid completed planner
result becomes `OutputContractError` instead; it is rejected without another
model request and is not presented as a tool failure.

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
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
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

Pass the generated executor through `RegisterUsedToolsets` before registering the agent. The example accepts an already constructed runtime and your planner.

```go
package main

import (
    "context"

    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    mcpruntime "goa.design/goa-ai/runtime/mcp"
)

func registerChat(ctx context.Context, rt *runtime.Runtime, p planner.Planner) error {
    caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{Name: "my-agent", Version: "1.0.0"},
    })
    if err != nil {
        return err
    }
    if err := genchat.RegisterUsedToolsets(ctx, rt,
        genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
    ); err != nil {
        return err
    }
    return genchat.RegisterChatAgent(ctx, rt, genchat.ChatAgentConfig{Planner: p})
}
```

### Planner

Your planner can reference MCP tools just like native toolsets:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        genmcpspecs.SearchTool(),
        &genmcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{ToolCalls: []planner.ToolRequest{call}}, nil
}
```

`genmcpspecs` imports `example.com/assistant/gen/assistant/toolsets/assistant_mcp`. For a validated model call, use `planner.ToolRequestFromModelCall` to preserve its provider correlation ID.

---

## Best Practices

- **Let codegen manage registration**: Use the generated helper to register MCP
  toolsets; avoid hand-written glue so codecs and structured failure recovery
  stay consistent
- **Use typed callers**: Prefer Goa-generated JSON-RPC callers when available for type safety
- **Handle errors explicitly**: Map MCP errors to `ToolFailure` values with the
  correct failure kind and recovery action
- **Monitor telemetry**: MCP calls emit structured telemetry events; use them for observability
- **Choose the right transport**: Use HTTP for remote servers and stdio for subprocess-based servers. The HTTP caller accepts JSON and event-stream responses

---

## Next Steps

- **[Toolsets](./toolsets.md)** - Understand tool execution models
- **[Memory & Sessions](./memory-sessions.md)** - Manage state with transcripts and memory stores
- **[Production](./production.md)** - Deploy with Temporal and streaming UI
