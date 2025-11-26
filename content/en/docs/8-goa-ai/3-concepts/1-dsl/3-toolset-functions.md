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
    ToolsetDescription("Tools for searching documentation")
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

## ToolsetDescription

`ToolsetDescription(description)` sets a human-readable description for the current toolset. This description documents the toolset's purpose and capabilities.

**Location**: `dsl/toolset.go`  
**Context**: Inside `Toolset`  
**Purpose**: Documents the toolset's purpose.

### Example

```go
Toolset("data-tools", func() {
    ToolsetDescription("Tools for data processing and analysis")
    Tool("analyze", "Analyze dataset", func() {
        // tool definition
    })
})
```

## MCPToolset

`MCPToolset(service, toolset)` declares an MCP-defined toolset derived from a Goa MCP server. It's a top-level construct that agents reference via `Use`.

**Location**: `dsl/toolset.go`  
**Context**: Top-level  
**Purpose**: Declares a provider MCP suite that agents reference via `Use`.

There are two usage patterns:

1. **Goa-backed MCP server**: Tool schemas are discovered from the service's `MCPTool` declarations
2. **External MCP server**: Tools are declared explicitly with inline schemas; requires an `mcpruntime.Caller` at runtime

### Example (Goa-backed)

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

### Example (External with inline schemas)

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

## Tool

`Tool(name, description, dsl)` defines a callable capability inside a toolset. It has two distinct use cases:

1. **Inside a Toolset**: Declares a tool with inline argument and return schemas
2. **Inside a Method**: Marks a Goa service method as an MCP tool (see [MCP DSL Reference](./5-mcp-functions.md))

**Location**: `dsl/toolset.go`  
**Context**: Inside `Toolset` or `Method`  
**Purpose**: Defines a tool (arguments, result, metadata).

Code generation emits:

- Payload/result Go structs in `tool_specs/types.go`
- JSON codecs (`tool_specs/codecs.go`) used for activity marshaling and memory
- JSON Schema definitions consumed by planners and optional validation layers
- Tool registry entries consumed by the runtime, including helper prompts and metadata

### Example

```go
Tool("search", "Search indexed documentation", func() {
    ToolTitle("Document Search")
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Required("documents")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ len .Documents }} documents")
    Tags("docs", "search")
})
```

## Args and Return

`Args(...)` and `Return(...)` define payload/result types using the standard Goa attribute DSL. You can use:

- A function to define an inline object schema with `Attribute()` calls
- A Goa user type (Type, ResultType, etc.) to reuse existing type definitions
- A primitive type (String, Int, etc.) for simple single-value inputs/outputs

When using a function to define the schema inline, you can use:

- `Attribute(name, type, description)` to define each field
- `Field(index, name, type, description)` for positional fields
- `Required(...)` to mark fields as required
- `Example(...)` for example values
- `Default(...)` for default values
- `Enum(...)` for enumerated values
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

### Example (reusing types)

```go
var SearchParams = Type("SearchParams", func() {
    Attribute("query", String)
    Attribute("limit", Int)
    Required("query")
})

Tool("search", "Search documents", func() {
    Args(SearchParams)
    Return(func() {
        Attribute("results", ArrayOf(String))
    })
})
```

## Sidecar

`Sidecar(...)` defines a typed sidecar schema for tool results. Sidecar data is attached to `planner.ToolResult.Sidecar` but never sent to the model provider—it's for full-fidelity artifacts that back a bounded model-facing result.

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Defines structured data attached to results but hidden from the model.

### Example

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
    })
    Sidecar(func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
    })
})
```

## ToolTitle

`ToolTitle(title)` sets a human-friendly display title for the tool. If not specified, the generated code derives a title from the tool name by converting snake_case or kebab-case to Title Case.

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Sets a display title for UI presentation.

### Example

```go
Tool("web_search", "Search the web", func() {
    ToolTitle("Web Search")
    Args(func() { /* ... */ })
})
```

## CallHintTemplate and ResultHintTemplate

`CallHintTemplate(template)` and `ResultHintTemplate(template)` configure display templates for tool invocations and results. Templates are Go templates rendered with the tool's payload or result to produce concise hints shown during and after execution.

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Provides display hints for UIs during tool execution.

Templates are compiled with `missingkey=error`. Keep `CallHintTemplate` concise (≤140 characters recommended).

### Example

```go
Tool("search", "Search documents", func() {
    Args(func() {
        Attribute("query", String)
        Attribute("limit", Int)
    })
    Return(func() {
        Attribute("count", Int)
        Attribute("results", ArrayOf(String))
    })
    CallHintTemplate("Searching for: {{ .Query }} (limit: {{ .Limit }})")
    ResultHintTemplate("Found {{ .Count }} results")
})
```

## Tags

`Tags(values...)` annotates tools or toolsets with metadata labels. Tags are surfaced to policy engines and telemetry, allowing you to filter or categorize tools.

Common tag patterns:

- Domain categories: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Capability types: `"read"`, `"write"`, `"search"`, `"transform"`
- Risk levels: `"safe"`, `"destructive"`, `"external"`
- Performance hints: `"slow"`, `"fast"`, `"cached"`

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool` or `Toolset`  
**Purpose**: Annotates tools/toolsets with metadata tags.

### Example

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})

Toolset("admin-tools", func() {
    Tags("admin", "privileged")
    Tool("reset_system", "Reset system state", func() {
        // inherits toolset tags
    })
})
```

## BindTo

`BindTo("Method")` or `BindTo("Service", "Method")` associates a tool with a Goa service method. During evaluation, the DSL resolves the referenced method; codegen emits typed specs/codecs and transform helpers.

When a tool is bound to a method:

- The tool's `Args` schema can differ from the method's `Payload`
- The tool's `Return` schema can differ from the method's `Result`
- Generated adapters transform between tool and method types
- Method payload/result validation still applies

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Associates a tool with a service method implementation.

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

### Example (cross-service binding)

```go
Tool("notify", "Send notification", func() {
    Args(func() {
        Attribute("message", String)
    })
    BindTo("notifications", "send")  // notifications.send method
})
```

## Inject

`Inject(fields...)` marks specific payload fields as "injected" (server-side infrastructure). Injected fields are:

1. Hidden from the LLM (excluded from the JSON schema sent to the model)
2. Exposed in the generated struct with a Setter method
3. Intended to be populated by runtime hooks (`ToolInterceptor`)

**Location**: `dsl/toolset.go`  
**Context**: Inside `Tool`  
**Purpose**: Marks fields as infrastructure-only, hidden from the LLM.

### Example

```go
Tool("get_data", "Get data for current session", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String))
    })
    BindTo("data_service", "get")
    // session_id is required by the service but hidden from the LLM
    Inject("session_id")
})
```

At runtime, use a `ToolInterceptor` to populate injected fields:

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

## Next Steps

- Learn about [Policy Functions](./4-policy-functions.md) for configuring runtime behavior
- Read the [Runtime Concepts](../2-runtime/) to understand how toolsets are executed
