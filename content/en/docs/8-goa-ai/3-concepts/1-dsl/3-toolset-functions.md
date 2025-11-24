---
title: "Toolset Functions"
linkTitle: "Toolset Functions"
weight: 3
description: "Functions for defining toolsets and tools."
---

## Toolset

`Toolset(name, dsl)` declares a provider-owned toolset at the top level. When declared at top level, the toolset becomes globally reusable; agents reference it via `Use` and services can expose it via `Export`.

**Location**: `dsl/toolset.go`  
**Context**: Top-level  
**Purpose**: Defines a provider-owned toolset (reusable across agents).

Toolsets can carry multiple tools, each with payload/result schemas, helper prompts, and metadata tags.

### Example

```go
var DocsToolset = Toolset("docs.search", func() {
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
    })
})
```

## MCPToolset

`MCPToolset(service, suite)` declares an MCP-defined toolset that agents reference via `Use(MCPToolset(...))`. During code generation, the DSL resolves to the service-level MCP metadata, and the agent package automatically imports the generated helper.

**Location**: `dsl/toolset.go`  
**Context**: Top-level  
**Purpose**: Declares a provider MCP suite that agents reference via `Use`.

At runtime:

1. Application code instantiates an `mcpruntime.Caller` (HTTP, SSE, stdio, or the Goa-generated JSON-RPC caller)
2. The agent registry automatically invokes the generated helper for each configured caller
3. Planner outputs can now reference the tools by their names just like native toolsets

### Example

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

## Tool

`Tool(name, description, dsl)` defines a callable capability inside a toolset. Compose the payload/result with `Args` and `Return` using Goa's attribute syntax (attributes, types, validations, examples).

**Location**: `dsl/toolset.go`  
**Context**: Inside `Toolset`  
**Purpose**: Defines a tool (arguments, result, metadata).

Code generation emits:

- Payload/result Go structs in `tool_specs/types.go`
- JSON codecs (`tool_specs/codecs.go`) used for activity marshaling and memory
- JSON Schema definitions consumed by planners and optional validation layers
- Tool registry entries consumed by the runtime, including helper prompts and metadata

### Example

```go
Tool("search", "Search indexed documentation", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Required("documents")
    })
    Tags("docs", "search")
})
```

## Args and Return

`Args(...)` and `Return(...)` define payload/result types using the standard Goa attribute DSL. You can use:

- `Attribute` for individual fields
- `Field` for positional fields
- `Required` for required fields
- `Example` for example values
- `Default` for default values
- `Enum` for enumerated values
- `MinLength`/`MaxLength` for string constraints
- `Minimum`/`Maximum` for numeric constraints

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Define payload/result types using the standard Goa attribute DSL.

### Example

```go
Tool("search", "Search documentation", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() {
            Default(5)
            Minimum(1)
            Maximum(100)
        })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Attribute("count", Int, "Number of results")
        Required("documents", "count")
    })
})
```

## Tags

`Tags(values...)` annotates tools with metadata tags. Tags are surfaced to policy engines and telemetry, allowing you to filter or categorize tools.

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Annotates tools with metadata tags.

### Example

```go
Tool("search", "Search documentation", func() {
    Tags("docs", "search", "read-only")
    // tool definition
})
```

## BindTo

`BindTo("Method")` or `BindTo("Service", "Method")` associates a tool with a Goa service method. During evaluation, the DSL resolves the referenced `*expr.MethodExpr`; codegen then emits:

- Typed tool specs/codecs under `gen/<svc>/agents/<agent>/specs/<toolset>/`
- A `New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)` helper
- When shapes are compatible, per-tool transform helpers in `specs/<toolset>/transforms.go`

### Example

```go
var _ = Service("orchestrator", func() {
    Method("Search", func() {
        Payload(SearchPayload)
        Result(SearchResult)
    })
    
    Agent("chat", func() {
        Use("docs", func() {
            Tool("search", "Search documentation", func() {
                Args(SearchPayload)
                Return(SearchResult)
                BindTo("Search") // binds to method on same service
            })
        })
    })
})
```

## Next Steps

- Learn about [Policy Functions](./4-policy-functions.md) for configuring runtime behavior
- Read the [Runtime Concepts](../2-runtime/) to understand how toolsets are executed

