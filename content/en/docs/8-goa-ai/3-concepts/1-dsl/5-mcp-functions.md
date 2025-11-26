---
title: "MCP DSL Functions"
linkTitle: "MCP DSL Functions"
weight: 5
description: "Functions for declaring MCP servers, tools, resources, and prompts."
---

## Overview

Goa-AI provides DSL functions for declaring Model Context Protocol (MCP) servers within Goa services. These functions enable services to expose tools, resources, and prompts via the MCP protocol.

MCP declarations generate:

- MCP server handler code with JSON-RPC transport
- Tool/resource/prompt registrations
- Client helpers for consuming MCP servers
- Integration with agent toolsets via `MCPToolset`

## MCPServer

`MCPServer(name, version, opts...)` enables MCP support for the current service. It configures the service to expose tools, resources, and prompts via the MCP protocol.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Service`  
**Purpose**: Declares an MCP server for the service.

### Arguments

- `name`: The MCP server name (used in MCP handshake)
- `version`: The server version string
- `opts...`: Optional configuration functions (e.g., `ProtocolVersion`)

### Example

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("add", func() {
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(func() {
            Attribute("sum", Int, "Result of addition")
            Required("sum")
        })
        MCPTool("add", "Add two numbers")
    })
})
```

## ProtocolVersion

`ProtocolVersion(version)` configures the MCP protocol version supported by the server. Returns a configuration function for use with `MCPServer`.

**Location**: `dsl/mcp.go`  
**Context**: Argument to `MCPServer`  
**Purpose**: Sets the MCP protocol version.

### Example

```go
MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
```

## MCPTool

`MCPTool(name, description)` marks the current method as an MCP tool. The method's payload becomes the tool input schema and the method's result becomes the tool output schema.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Exposes a service method as an MCP tool.

### Example

```go
Method("search", func() {
    Payload(func() {
        Attribute("query", String, "Search query")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Result(func() {
        Attribute("results", ArrayOf(String), "Search results")
        Required("results")
    })
    MCPTool("search", "Search documents by query")
})
```

## Resource

`Resource(name, uri, mimeType)` marks the current method as an MCP resource provider. The method's result becomes the resource content returned when clients read the resource.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Exposes a service method as an MCP resource.

### Arguments

- `name`: The resource name (used in MCP resource list)
- `uri`: The resource URI (e.g., `"file:///docs/readme.md"`)
- `mimeType`: The content MIME type (e.g., `"text/plain"`, `"application/json"`)

### Example

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})
```

## WatchableResource

`WatchableResource(name, uri, mimeType)` marks the current method as an MCP resource that supports subscriptions. Clients can subscribe to receive notifications when the resource content changes.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Exposes a watchable/subscribable resource.

### Example

```go
Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "Current system status")
        Attribute("uptime", Int, "Uptime in seconds")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

## StaticPrompt

`StaticPrompt(name, description, messages...)` adds a static prompt template to the MCP server. Static prompts provide pre-defined message sequences that clients can use without parameters.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Service` (service must have MCP enabled)  
**Purpose**: Declares a static prompt template.

### Arguments

- `name`: The prompt identifier
- `description`: Human-readable prompt description
- `messages...`: Alternating role and content strings (e.g., `"user"`, `"text"`, `"system"`, `"text"`)

### Example

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    StaticPrompt("code_help", "Programming assistance",
        "system", "You are an expert programmer",
        "user", "Help me with my code")
})
```

## DynamicPrompt

`DynamicPrompt(name, description)` marks the current method as a dynamic prompt generator. The method's payload defines parameters that customize the generated prompt, and the result contains the generated message sequence.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Declares a parameterized prompt generator.

### Example

```go
Method("code_review", func() {
    Payload(func() {
        Attribute("language", String, "Programming language")
        Attribute("code", String, "Code to review")
        Required("language", "code")
    })
    Result(ArrayOf(Message))
    DynamicPrompt("code_review", "Generate code review prompt")
})
```

## Notification

`Notification(name, description)` marks the current method as an MCP notification sender. The method's payload defines the notification message structure.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Declares a notification type.

### Example

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "Task identifier")
        Attribute("progress", Int, "Progress percentage (0-100)")
        Required("task_id", "progress")
    })
    Notification("progress", "Task progress notification")
})
```

## Subscription

`Subscription(resourceName)` marks the current method as a subscription handler for a watchable resource. The method is invoked when clients subscribe to the resource identified by `resourceName`.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Handles resource subscriptions.

### Example

```go
Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "Resource URI to subscribe to")
        Required("uri")
    })
    Result(String)
    Subscription("status") // Links to WatchableResource named "status"
})
```

## SubscriptionMonitor

`SubscriptionMonitor(name)` marks the current method as a server-sent events (SSE) monitor for subscription updates. The method streams subscription change events to connected clients.

**Location**: `dsl/mcp.go`  
**Context**: Inside `Method` (service must have MCP enabled)  
**Purpose**: Declares an SSE stream for subscription events.

### Example

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "Resource name")
        Attribute("event", String, "Event type")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

## Complete MCP Server Example

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    // Enable MCP
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Static prompts
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    // Tool exposed via MCP
    Method("search", func() {
        Description("Search documents")
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        MCPTool("search", "Search documents by query")
    })
    
    // Static resource
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    // Watchable resource with subscription
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() {
            Attribute("uri", String)
        })
        Result(String)
        Subscription("status")
    })
    
    // Dynamic prompt
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
    
    // Notification
    Method("notify_progress", func() {
        Payload(func() {
            Attribute("task_id", String)
            Attribute("progress", Int)
            Required("task_id", "progress")
        })
        Notification("progress", "Task progress update")
    })
})
```

## Using MCP Tools in Agents

Once you've declared an MCP server, agents can consume its tools via `MCPToolset`:

```go
// Reference the MCP server's toolset
var AssistantTools = MCPToolset("assistant", "assistant")

var _ = Service("orchestrator", func() {
    Agent("chat", "Chat agent", func() {
        Use(AssistantTools) // Consume all tools from the MCP server
    })
})
```

See [MCP Integration](../4-mcp-integration/) for runtime wiring details.

## Next Steps

- Read about [MCP Integration](../4-mcp-integration/) for runtime configuration
- Explore the [MCP Toolsets Tutorial](../../4-tutorials/3-mcp-toolsets/) for a complete example
- Learn about [Toolset Functions](./3-toolset-functions.md) for agent-native toolsets

