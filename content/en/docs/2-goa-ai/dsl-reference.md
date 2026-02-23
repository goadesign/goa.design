---
title: DSL Reference
weight: 2
description: "Complete reference for Goa-AI's DSL functions - agents, toolsets, policies, and MCP integration."
llm_optimized: true
aliases:
---

This document provides a complete reference for Goa-AI's DSL functions. Use it alongside the [Runtime](./runtime.md) guide to understand how designs translate into runtime behavior.

## DSL Quick Reference

| Function | Context | Description |
|----------|---------|-------------|
| **Agent Functions** | | |
| `Agent` | Service | Defines an LLM-based agent |
| `Use` | Agent | Declares toolset consumption |
| `Export` | Agent, Service | Exposes toolsets to other agents |
| `AgentToolset` | Use argument | References toolset from another agent |
| `UseAgentToolset` | Agent | Alias for AgentToolset + Use |
| `Passthrough` | Tool (in Export) | Deterministic forwarding to service method |
| `DisableAgentDocs` | API | Disables AGENTS_QUICKSTART.md generation |
| **Toolset Functions** | | |
| `Toolset` | Top-level | Declares a provider-owned toolset |
| `FromMCP` | Toolset argument | Configures MCP-backed toolset |
| `FromRegistry` | Toolset argument | Configures registry-backed toolset |
| `Description` | Toolset | Sets toolset description |
| **Tool Functions** | | |
| `Tool` | Toolset, Method | Defines a callable tool |
| `Args` | Tool | Defines input parameter schema |
| `Return` | Tool | Defines output result schema |
| `ServerData` | Tool | Defines server-only data schema (never sent to model providers) |
| `ServerDataDefault` | Tool | Default emission for optional server-data when `server_data` is omitted or `"auto"` |
| `BoundedResult` | Tool | Marks result as bounded view; enforces canonical bounds fields; optional sub-DSL can declare paging cursor fields |
| `Cursor` | BoundedResult | Declares which payload field carries the paging cursor (optional) |
| `NextCursor` | BoundedResult | Declares which result field carries the next-page cursor (optional) |
| `Idempotent` | Tool | Marks tool as idempotent within a run transcript; enables safe cross-transcript de-duplication for identical calls |
| `Tags` | Tool, Toolset | Attaches metadata labels |
| `BindTo` | Tool | Binds tool to service method |
| `Inject` | Tool | Marks fields as runtime-injected |
| `CallHintTemplate` | Tool | Display template for invocations |
| `ResultHintTemplate` | Tool | Display template for results |
| `ResultReminder` | Tool | Static system reminder after tool result |
| `Confirmation` | Tool | Requires explicit out-of-band confirmation before execution |
| **Policy Functions** | | |
| `RunPolicy` | Agent | Configures execution constraints |
| `DefaultCaps` | RunPolicy | Sets resource limits |
| `MaxToolCalls` | DefaultCaps | Maximum tool invocations |
| `MaxConsecutiveFailedToolCalls` | DefaultCaps | Maximum consecutive failures |
| `TimeBudget` | RunPolicy | Simple wall-clock limit |
| `Timing` | RunPolicy | Fine-grained timeout configuration |
| `Budget` | Timing | Overall run budget |
| `Plan` | Timing | Planner activity timeout |
| `Tools` | Timing | Tool activity timeout |
| `History` | RunPolicy | Conversation history management |
| `KeepRecentTurns` | History | Sliding window policy |
| `Compress` | History | Model-assisted summarization |
| `Cache` | RunPolicy | Prompt caching configuration |
| `AfterSystem` | Cache | Checkpoint after system messages |
| `AfterTools` | Cache | Checkpoint after tool definitions |
| `InterruptsAllowed` | RunPolicy | Enable pause/resume |
| `OnMissingFields` | RunPolicy | Validation behavior |
| **MCP Functions** | | |
| `MCPServer` | Service | Enables MCP support |
| `MCP` | Service | Alias for MCPServer |
| `ProtocolVersion` | MCP option | Sets MCP protocol version |
| `MCPTool` | Method | Marks method as MCP tool |
| `MCPToolset` | Top-level | Declares MCP-derived toolset |
| `Resource` | Method | Marks method as MCP resource |
| `WatchableResource` | Method | Marks method as subscribable resource |
| `StaticPrompt` | Service | Adds static prompt template |
| `DynamicPrompt` | Method | Marks method as prompt generator |
| `Notification` | Method | Marks method as notification sender |
| `Subscription` | Method | Marks method as subscription handler |
| `SubscriptionMonitor` | Method | SSE monitor for subscriptions |
| **Registry Functions** | | |
| `Registry` | Top-level | Declares a registry source |
| `URL` | Registry | Sets registry endpoint |
| `APIVersion` | Registry | Sets API version |
| `Timeout` | Registry | Sets HTTP timeout |
| `Retry` | Registry | Configures retry policy |
| `SyncInterval` | Registry | Sets catalog refresh interval |
| `CacheTTL` | Registry | Sets local cache duration |
| `Federation` | Registry | Configures external registry imports |
| `Include` | Federation | Glob patterns to import |
| `Exclude` | Federation | Glob patterns to skip |
| `PublishTo` | Export | Configures registry publication |
| `Version` | Toolset | Pins registry toolset version |
| **Schema Functions** | | |
| `Attribute` | Args, Return, ServerData | Defines schema field (general use) |
| `Field` | Args, Return, ServerData | Defines numbered proto field (gRPC) |
| `Required` | Schema | Marks fields as required |

## Prompt Management (v1 Integration Path)

Goa-AI v1 does **not** require a dedicated prompt DSL (`Prompt(...)`, `Prompts(...)`).
Prompt management is currently runtime-driven:

- Register baseline prompt specs in `runtime.PromptRegistry`.
- Configure scoped overrides with `runtime.WithPromptStore(...)`.
- Render prompts from planners using `PlannerContext.RenderPrompt(...)`.
- Attach rendered prompt provenance to model calls with `model.Request.PromptRefs`.

For agent-as-tool flows, map tool IDs to prompt IDs using runtime options such as
`runtime.WithPromptSpec(...)` on agent-tool registrations.

### Field vs Attribute

Both `Field` and `Attribute` define schema fields, but they serve different purposes:

**`Attribute(name, type, description, dsl)`** - General-purpose schema definition:
- Used for JSON-only schemas
- No field numbering required
- Simpler syntax for most use cases

```go
Args(func() {
    Attribute("query", String, "Search query")
    Attribute("limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**`Field(number, name, type, description, dsl)`** - Numbered fields for gRPC/protobuf:
- Required when generating gRPC services
- Field numbers must be unique and stable
- Use when your service exposes both HTTP and gRPC transports

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**When to use which:**
- Use `Attribute` for agent tools that only use JSON (most common case)
- Use `Field` when your Goa service has gRPC transport and tools bind to those methods
- Mixing is allowed but not recommended within the same schema

## Overview

Goa-AI extends Goa's DSL with functions for declaring agents, toolsets, and runtime policies. The DSL is evaluated by Goa's `eval` engine, so the same rules apply as with the standard service/transport DSL: expressions must be invoked in the proper context, and attribute definitions reuse Goa's type system (`Attribute`, `Field`, validations, examples, etc.).


### Import Path

Add the agents DSL to your Goa design packages:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Entry Point

Declare agents inside a regular Goa `Service` definition. The DSL augments Goa's design tree and is processed during `goa gen`.

### Outcome

Running `goa gen` produces:

- Agent packages (`gen/<service>/agents/<agent>`) with workflow definitions, planner activities, and registration helpers
- Toolset owner packages (`gen/<service>/toolsets/<toolset>`) with typed payload/result structs, specs, codecs, and (when applicable) transforms
- Activity handlers for plan/execute/resume loops
- Registration helpers that wire the design into the runtime

A contextual `AGENTS_QUICKSTART.md` is written at the module root unless disabled via `DisableAgentDocs()`.

### Quickstart Example

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
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
})

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Description("Human front door for the knowledge agent.")

    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Use(AssistantSuite)
        Export("chat.tools", func() {
            Tool("summarize_status", "Produce operator-ready summaries", func() {
                Args(func() {
                    Attribute("prompt", String, "User instructions")
                    Required("prompt")
                })
                Return(func() {
                    Attribute("summary", String, "Assistant response")
                    Required("summary")
                })
                Tags("chat")
            })
        })
        RunPolicy(func() {
            DefaultCaps(
                MaxToolCalls(8),
                MaxConsecutiveFailedToolCalls(3),
            )
            TimeBudget("2m")
        })
    })
})
```

Running `goa gen example.com/assistant/design` produces:

- `gen/orchestrator/agents/chat`: workflow + planner activities + agent registry
- `gen/orchestrator/agents/chat/specs`: agent tool catalog (aggregated `ToolSpec`s + `tool_schemas.json`)
- `gen/orchestrator/toolsets/<toolset>`: toolset-owned types/specs/codecs/transforms for service-owned toolsets
- `gen/orchestrator/agents/chat/exports/<export>`: exported toolsets (agent-as-tool) packages
- MCP-aware registration helpers when an `MCPToolset` is referenced via `Use`

### Typed Tool Identifiers

Each per-toolset specs package defines typed tool identifiers (`tools.Ident`) for every generated tool:

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Use these constants anywhere you need to reference tools.

### Cross-Process Inline Composition

When agent A declares it "uses" a toolset exported by agent B, Goa-AI wires composition automatically:

- The exporter (agent B) package includes generated `agenttools` helpers
- The consumer (agent A) agent registry uses those helpers when you `Use(AgentToolset("service", "agent", "toolset"))`
- The generated `Execute` function builds nested planner messages, runs the provider agent as a child workflow, and adapts the nested agent's `RunOutput` into a `planner.ToolResult`

This yields a single deterministic workflow per agent run and a linked run tree for composition.

---

## Agent Functions

### Agent

`Agent(name, description, dsl)` declares an agent inside a `Service`. It records the service-scoped agent metadata and attaches toolsets via `Use` and `Export`.

**Context**: Inside `Service`

Each agent becomes a runtime registration with:
- A workflow definition and Temporal activity handlers
- PlanStart/PlanResume activities with DSL-derived retry/timeout options
- A `Register<Agent>` helper that registers workflows, activities, and toolsets

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

### Use

`Use(value, dsl)` declares that an agent consumes a toolset. The toolset can be:

- A top-level `Toolset` variable
- An `MCPToolset` reference
- An inline toolset definition (string name + DSL)
- An `AgentToolset` reference for agent-as-tool composition

**Context**: Inside `Agent`

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

### Export

`Export(value, dsl)` declares toolsets exposed to other agents or services. Exported toolsets can be consumed by other agents via `Use(AgentToolset(...))`.

**Context**: Inside `Agent` or `Service`

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

### AgentToolset

`AgentToolset(service, agent, toolset)` references a toolset exported by another agent. This enables agent-as-tool composition.

**Context**: Argument to `Use`

Use `AgentToolset` when:
- You don't have an expression handle to the exported toolset
- Multiple agents export toolsets with the same name
- You want to be explicit in the design for clarity

```go
// Agent A exports tools
Agent("planner", func() {
    Export("planning.tools", func() { /* tools */ })
})

// Agent B uses Agent A's tools
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

**Alias**: `UseAgentToolset(service, agent, toolset)` is an alias that combines `AgentToolset` with `Use` in a single call. Prefer `AgentToolset` in new designs; the alias exists for readability in some codebases.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passthrough

`Passthrough(toolName, target, methodName)` defines deterministic forwarding for an exported tool to a Goa service method. This bypasses the planner entirely.

**Context**: Inside `Tool` nested under `Export`

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

### DisableAgentDocs

`DisableAgentDocs()` disables generation of `AGENTS_QUICKSTART.md` at the module root.

**Context**: Inside `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Toolset Functions

### Toolset

`Toolset(name, dsl)` declares a provider-owned toolset at the top level. When declared at top level, the toolset becomes globally reusable; agents reference it via `Use`.

**Context**: Top-level

```go
var DocsToolset = Toolset("docs.search", func() {
    Description("Tools for searching documentation")
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

Toolsets can include a description using the standard `Description()` DSL function:

```go
var DataToolset = Toolset("data-tools", func() {
    Description("Tools for data processing and analysis")
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})
```

### Tool

`Tool(name, description, dsl)` defines a callable capability inside a toolset.

**Context**: Inside `Toolset` or `Method`

Code generation emits:
- Payload/result Go structs in `tool_specs/types.go`
- JSON codecs (`tool_specs/codecs.go`)
- JSON Schema definitions consumed by planners
- Tool registry entries with helper prompts and metadata

```go
Tool("search", "Search indexed documentation", func() {
    Title("Document Search")
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

### Args and Return

`Args(...)` and `Return(...)` define payload/result types using the standard Goa attribute DSL.

**Context**: Inside `Tool`

You can use:
- A function to define an inline object schema with `Attribute()` calls
- A Goa user type (Type, ResultType, etc.) to reuse existing type definitions
- A primitive type (String, Int, etc.) for simple single-value inputs/outputs

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

**Reusing types:**

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

### ServerData

`ServerData(kind, val, args...)` defines typed server-only output emitted alongside a tool result. Server-data is never sent to model providers.
Optional server-data is typically projected into observer-facing artifacts (for example, UI cards/charts) while keeping the model-facing result bounded and token-efficient. Always-on server-data is emitted/persisted server-side and must not be treated as optional observer output.

**Context**: Inside `Tool`

**Parameters:**
- `kind`: A string identifier for the server-data kind (e.g., `"atlas.time_series"`, `"atlas.control_narrative"`, `"aura.evidence"`). This allows consumers to identify and handle different server-data projections appropriately.
- `val`: The schema definition, following the same patterns as `Args` and `Return`—either a function with `Attribute()` calls, a Goa user type, or a primitive type.

**Audience routing (`Audience*`):**

Each `ServerData` entry declares an audience that downstream consumers use to route the payload without relying on kind naming conventions:

- `"timeline"`: persisted and eligible for observer-facing projection (e.g., UI/timeline cards)
- `"internal"`: tool-composition attachment; not persisted or rendered
- `"evidence"`: provenance references; persisted separately from timeline cards

Set the audience inside the `ServerData` DSL block:

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    ModeAlways()
    FromMethodResultField("evidence")
})
```

**When to use ServerData:**
- When tool results need to include full-fidelity data for UIs (charts, graphs, tables) while keeping model payloads bounded
- When you want to attach large result sets that would exceed model context limits
- When downstream consumers need structured data that the model doesn't need to see

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    })
    ServerDataDefault("off") // Opt-in by default (callers can set `server_data:"on"`)
})
```

**Using a Goa type for the server-data schema:**

```go
var TimeSeriesServerData = Type("TimeSeriesServerData", func() {
    Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
    Attribute("unit", String, "Measurement unit")
    Attribute("resolution", String, "Data resolution (e.g., '1m', '5m', '1h')")
    Required("data_points")
})

Tool("get_metrics", "Get device metrics", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "Metrics summary for the model")
        Attribute("point_count", Int, "Number of data points")
        Required("summary", "point_count")
    })
    ServerData("atlas.metrics", TimeSeriesServerData)
})
```

**Runtime access:**

At runtime, observer-facing artifacts (projected from optional server-data) are available on `planner.ToolResult.Artifacts`:

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    for _, art := range result.Artifacts {
        if art.Kind == "atlas.time_series" {
            // art.Data contains the full time series for UI rendering
        }
    }
}
```

### BoundedResult

`BoundedResult()` marks the current tool's result as a bounded view over a potentially larger data set. It is a lightweight contract that tells the runtime and services that this tool:

1. May return a subset of available data
2. Should surface truncation metadata (`agent.Bounds`) alongside its result

**Context**: Inside `Tool`

`BoundedResult` enforces a canonical bounded-result shape. Tools either declare the full set of
standard bounds fields (`returned`, `total`, `truncated`, `refinement_hint`) or declare none and let
`BoundedResult()` add them. Mixed/partial declarations are rejected.

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("filter", String, "Optional filter expression")
        Attribute("limit", Int, "Maximum devices to return", func() {
            Default(100)
            Maximum(1000)
        })
        Attribute("offset", Int, "Pagination offset", func() {
            Default(0)
        })
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Attribute("returned", Int, "Number of devices returned")
        Attribute("total", Int, "Total devices matching filter")
        Attribute("truncated", Boolean, "Whether results were truncated")
        Required("devices", "returned", "truncated")
    })
    BoundedResult()
})
```

**The agent.Bounds Contract:**

When a tool is marked with `BoundedResult()`, generated result types implement `agent.BoundedResult`
via `ResultBounds()`, and the runtime derives `planner.ToolResult.Bounds` from that method:

```go
// agent.Bounds describes how a tool result has been bounded
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied
    RefinementHint string // Guidance on how to narrow the query
}

// agent.BoundedResult interface for typed results
type BoundedResult interface {
    ResultBounds() *Bounds
}
```

**Service Responsibility:**

Services are responsible for:
1. Applying their own truncation logic (pagination, limits, depth caps)
2. Populating the bounds metadata in the result
3. Optionally providing a `RefinementHint` when results are truncated

The runtime does not compute subsets or truncation itself—it only enforces that bounded tools surface a consistent `Bounds` contract on their results.

**When to Use BoundedResult:**

- Tools that return paginated lists (devices, users, records)
- Tools that query large datasets with result limits
- Tools that apply depth or size caps to nested structures
- Any tool where the model needs to understand that results may be incomplete

**Complete Example with Bounds:**

```go
var DeviceToolset = Toolset("devices", func() {
    Tool("list_devices", "List IoT devices", func() {
        Args(func() {
            Attribute("site_id", String, "Site identifier")
            Attribute("status", String, "Filter by status", func() {
                Enum("online", "offline", "unknown")
            })
            Attribute("limit", Int, "Maximum results", func() {
                Default(50)
                Maximum(500)
            })
            Required("site_id")
        })
        Return(func() {
            Attribute("devices", ArrayOf(Device), "Matching devices")
            Attribute("returned", Int, "Count of returned devices")
            Attribute("total", Int, "Total matching devices")
            Attribute("truncated", Boolean, "Results were capped")
            Attribute("refinement_hint", String, "How to narrow results")
            Required("devices", "returned", "truncated")
        })
        BoundedResult()
        BindTo("DeviceService", "ListDevices")
    })
})
```

**Runtime Behavior:**

When a bounded tool executes:
1. The runtime decodes the result and checks for `agent.BoundedResult` implementation
2. If the result implements the interface, `ResultBounds()` is called to extract bounds
3. The bounds metadata is attached to `planner.ToolResult.Bounds`
4. Stream subscribers and finalizers can access bounds for UI display or logging

Tools can include a display title using the standard `Title()` DSL function:

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Idempotent

`Idempotent()` marks the current tool as idempotent *within a run transcript*.
When set, runtimes/planners may treat repeated tool calls with identical arguments
as redundant and avoid executing them once a successful result already exists in
the transcript.

**Context**: Inside `Tool`

**When to use**

Use `Idempotent()` only when the tool result is a pure function of its arguments
for the lifetime of a run transcript (for example, retrieving a documentation
section by stable identifier).

**When not to use**

Do not mark tools idempotent when their result depends on changing external state
but the tool payload does not carry a time/version parameter (for example,
“get current mode” or “get current status” snapshots without an `as_of` input).

**Code generation**

When a tool is marked `Idempotent()`, codegen emits the tag
`goa-ai.idempotency=transcript` into the generated `tools.ToolSpec.Tags`. This
tag is consumed by runtimes/planners that implement transcript-aware de-duplication.

### Confirmation

`Confirmation(dsl)` declares that a tool must be explicitly approved out-of-band before it
executes. This is intended for **operator-sensitive** tools (writes, deletes, commands).

**Context**: Inside `Tool`

At generation time, Goa-AI records confirmation policy in the generated tool spec. At runtime, the
workflow emits a confirmation request using `AwaitConfirmation` and executes the tool only after an
explicit approval is provided.

Minimal example:

```go
Tool("dangerous_write", "Write a stateful change", func() {
    Args(DangerousWriteArgs)
    Return(DangerousWriteResult)
    Confirmation(func() {
        Title("Confirm change")
        PromptTemplate(`Approve write: set {{ .Key }} to {{ .Value }}`)
        DeniedResultTemplate(`{"summary":"Cancelled","key":"{{ .Key }}"}`)
    })
})
```

Notes:

- The runtime owns how confirmation is requested. The built-in confirmation protocol uses a dedicated
  `AwaitConfirmation` await and a `ProvideConfirmation` decision call. See the Runtime guide for the
  expected payloads and execution flow.
- Confirmation templates (`PromptTemplate` and `DeniedResultTemplate`) are Go `text/template` strings
  executed with `missingkey=error`. In addition to the standard template functions (e.g. `printf`),
  Goa-AI provides:
  - `json v` → JSON encodes `v` (useful for optional pointer fields or embedding structured values).
  - `quote s` → returns a Go-escaped quoted string (like `fmt.Sprintf("%q", s)`).
- Confirmation can also be enabled dynamically at runtime via `runtime.WithToolConfirmation(...)`
  (useful for environment-based policies or per-deployment overrides).

### CallHintTemplate and ResultHintTemplate

`CallHintTemplate(template)` and `ResultHintTemplate(template)` configure display templates for tool invocations and results. Templates are Go text/template strings rendered with the tool's typed payload or result struct to produce concise hints shown during and after execution.

**Context**: Inside `Tool`

**Key Points:**

- Templates receive typed Go structs, not raw JSON—use Go field names (e.g., `.Query`, `.DeviceID`) not JSON keys (e.g., `.query`, `.device_id`)
- Keep hints concise: ≤140 characters recommended for clean UI display
- Templates are compiled with `missingkey=error`—all referenced fields must exist
- Use `{{ if .Field }}` or `{{ with .Field }}` blocks for optional fields

**Basic Example:**

```go
Tool("search", "Search documents", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Return(func() {
        Attribute("count", Int, "Number of results found")
        Attribute("results", ArrayOf(String), "Matching documents")
        Required("count", "results")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ .Count }} results")
})
```

**Typed Struct Fields:**

Templates receive the generated Go payload/result structs. Field names follow Go naming conventions (PascalCase), not JSON conventions (snake_case or camelCase):

```go
// DSL definition
Tool("get_device_status", "Get device status", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")      // JSON: device_id
        Attribute("include_metrics", Boolean, "Include metrics") // JSON: include_metrics
        Required("device_id")
    })
    Return(func() {
        Attribute("device_name", String, "Device name")          // JSON: device_name
        Attribute("is_online", Boolean, "Online status")         // JSON: is_online
        Attribute("last_seen", String, "Last seen timestamp")    // JSON: last_seen
        Required("device_name", "is_online")
    })
    // Use Go field names (PascalCase), not JSON keys
    CallHintTemplate("Checking status of {{ .DeviceID }}")
    ResultHintTemplate("{{ .DeviceName }}: {{ if .IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Handling Optional Fields:**

Use conditional blocks for optional fields to avoid template errors:

```go
Tool("list_items", "List items with optional filter", func() {
    Args(func() {
        Attribute("category", String, "Optional category filter")
        Attribute("limit", Int, "Maximum items", func() { Default(50) })
    })
    Return(func() {
        Attribute("items", ArrayOf(Item), "Matching items")
        Attribute("total", Int, "Total count")
        Attribute("truncated", Boolean, "Results were truncated")
        Required("items", "total")
    })
    CallHintTemplate("Listing items{{ with .Category }} in {{ . }}{{ end }}")
    ResultHintTemplate("{{ .Total }} items{{ if .Truncated }} (truncated){{ end }}")
})
```

**Built-in Template Functions:**

The runtime provides these helper functions for hint templates:

| Function | Description | Example |
|----------|-------------|---------|
| `join` | Join string slice with separator | `{{ join .Tags ", " }}` |
| `count` | Count elements in a slice | `{{ count .Results }} items` |
| `truncate` | Truncate string to N characters | `{{ truncate .Query 20 }}` |

**Complete Example with All Features:**

```go
Tool("analyze_data", "Analyze dataset", func() {
    Args(func() {
        Attribute("dataset_id", String, "Dataset identifier")
        Attribute("analysis_type", String, "Type of analysis", func() {
            Enum("summary", "detailed", "comparison")
        })
        Attribute("filters", ArrayOf(String), "Optional filters")
        Required("dataset_id", "analysis_type")
    })
    Return(func() {
        Attribute("insights", ArrayOf(String), "Analysis insights")
        Attribute("metrics", MapOf(String, Float64), "Computed metrics")
        Attribute("processing_time_ms", Int, "Processing time in milliseconds")
        Required("insights", "processing_time_ms")
    })
    CallHintTemplate("Analyzing {{ .DatasetID }} ({{ .AnalysisType }})")
    ResultHintTemplate("{{ count .Insights }} insights in {{ .ProcessingTimeMs }}ms")
})
```

### ResultReminder

`ResultReminder(text)` configures a static system reminder that is injected into the conversation after the tool result is returned. Use this to provide backstage guidance to the model about how to interpret or present the result to the user.

**Context**: Inside `Tool`

The reminder text is automatically wrapped in `<system-reminder>` tags by the runtime. Do not include the tags in the text.

**Static vs Dynamic Reminders:**

`ResultReminder` is for static, design-time reminders that apply every time the tool is called. For dynamic reminders that depend on runtime state or tool result content, use `PlannerContext.AddReminder()` in your planner implementation instead. Dynamic reminders support:
- Rate limiting (minimum turns between emissions)
- Per-run caps (maximum emissions per run)
- Runtime addition/removal based on conditions
- Priority tiers (safety vs guidance)

**Basic Example:**

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp")
        Attribute("end_time", String, "End timestamp")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("series", ArrayOf(DataPoint), "Time series data points")
        Attribute("summary", String, "Summary for the model")
        Required("series", "summary")
    })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

**When to Use ResultReminder:**

- When the UI renders tool results in a special way (charts, graphs, tables) that the model should know about
- When the model should avoid repeating information that's already visible to the user
- When there's important context about how results are presented that affects how the model should respond
- When you want consistent guidance that applies to every invocation of the tool

**Multiple Tools with Reminders:**

When multiple tools in a single turn have result reminders, they are combined into a single system message:

```go
Tool("get_metrics", "Get device metrics", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Metrics are displayed as a dashboard widget.")
})

Tool("get_alerts", "Get active alerts", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Alerts are shown in a priority-sorted list with severity indicators.")
})
```

**Dynamic Reminders via PlannerContext:**

For reminders that depend on runtime conditions, use the planner API instead:

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolResults {
        if tr.Name == "get_time_series" && hasAnomalies(tr.Result) {
            input.Agent.AddReminder(reminder.Reminder{
                ID:   "anomaly_detected",
                Text: "Anomalies were detected in the time series. Highlight these to the user.",
                Priority: reminder.TierGuidance,
            })
        }
    }
    // ... rest of planner logic
}
```

### Tags

`Tags(values...)` annotates tools or toolsets with metadata labels. Tags are surfaced to policy engines and telemetry.

**Context**: Inside `Tool` or `Toolset`

Common tag patterns:
- Domain categories: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Capability types: `"read"`, `"write"`, `"search"`, `"transform"`
- Risk levels: `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### BindTo

`BindTo("Method")` or `BindTo("Service", "Method")` associates a tool with a Goa service method.

**Context**: Inside `Tool`

When a tool is bound to a method:
- The tool's `Args` schema can differ from the method's `Payload`
- The tool's `Return` schema can differ from the method's `Result`
- Generated adapters transform between tool and method types

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

### Inject

`Inject(fields...)` marks specific payload fields as "injected" (server-side infrastructure). Injected fields are:

1. Hidden from the LLM (excluded from the JSON schema sent to the model)
2. Exposed in the generated struct with a Setter method
3. Intended to be populated by runtime hooks (`ToolInterceptor`)

**Context**: Inside `Tool`

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
    Inject("session_id") // hidden from LLM, populated by interceptor
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

---

## Policy Functions

### RunPolicy

`RunPolicy(dsl)` configures execution limits enforced at runtime. It's declared inside an `Agent` and contains policy settings like caps, time budgets, history management, and interruption handling.

**Context**: Inside `Agent`

**Available Policy Functions:**
- `DefaultCaps` – resource limits (tool calls, consecutive failures)
- `TimeBudget` – simple wall-clock limit for the entire run
- `Timing` – fine-grained timeouts for budget, planning, and tool activities (advanced)
- `History` – conversation history management (sliding window or compression)
- `InterruptsAllowed` – enable pause/resume for human-in-the-loop
- `OnMissingFields` – validation behavior for missing required fields

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")

        History(func() {
            KeepRecentTurns(20)
        })
    })
})
```

### DefaultCaps

`DefaultCaps(opts...)` applies capability caps to prevent runaway loops and enforce execution limits.

**Context**: Inside `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)**: Sets the maximum number of tool invocations allowed. If exceeded, the runtime aborts.

**MaxConsecutiveFailedToolCalls(n)**: Sets the maximum consecutive failed tool calls before abort. Prevents infinite retry loops.

### TimeBudget

`TimeBudget(duration)` enforces a wall-clock limit on agent execution. Duration is specified as a string (e.g., `"2m"`, `"30s"`).

**Context**: Inside `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

For fine-grained control over individual activity timeouts, use `Timing` instead.

### Timing

`Timing(dsl)` provides fine-grained timeout configuration as an alternative to `TimeBudget`. While `TimeBudget` sets a single overall limit, `Timing` lets you control timeouts at three levels: the overall run budget, planner activities (LLM inference), and tool execution activities.

**Context**: Inside `RunPolicy`

**When to use Timing vs TimeBudget:**
- Use `TimeBudget` for simple cases where a single wall-clock limit is sufficient
- Use `Timing` when you need different timeouts for planning vs tool execution—for example, when tools make slow external API calls but you want fast LLM responses

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

**Timing Functions:**

| Function | Description | Affects |
|----------|-------------|---------|
| `Budget(duration)` | Total wall-clock budget for the run | Entire run lifecycle |
| `Plan(duration)` | Timeout for Plan and Resume activities | LLM inference calls via planner |
| `Tools(duration)` | Default timeout for ExecuteTool activities | Tool execution (service calls, MCP, agent-as-tool) |

**How Timing Affects Runtime Behavior:**

The runtime translates these DSL values into Temporal activity options (or equivalent engine timeouts):
- `Budget` becomes the workflow execution timeout
- `Plan` becomes the activity timeout for `PlanStart` and `PlanResume` activities
- `Tools` becomes the default activity timeout for `ExecuteTool` activities

**Complete Example:**

```go
Agent("data-processor", "Processes large datasets", func() {
    Use(DataToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20))
        Timing(func() {
            Budget("30m")   // long-running data jobs
            Plan("1m")      // LLM decisions should be quick
            Tools("5m")     // data operations may take time
        })
    })
})
```

### Cache

`Cache(dsl)` configures prompt caching behavior for the agent. It specifies where the runtime should place cache checkpoints relative to system prompts and tool definitions for providers that support caching.

**Context**: Inside `RunPolicy`

Prompt caching can significantly reduce inference costs and latency by allowing providers to reuse previously processed content. The Cache function lets you define checkpoint boundaries that providers use to determine what content can be cached.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Cache Checkpoint Functions:**

| Function | Description |
|----------|-------------|
| `AfterSystem()` | Places a cache checkpoint after all system messages. Providers interpret this as a cache boundary immediately following the system preamble. |
| `AfterTools()` | Places a cache checkpoint after tool definitions. Providers interpret this as a cache boundary immediately following the tool configuration section. |

**Provider Support:**

Not all providers support prompt caching, and support varies by checkpoint type:

| Provider | AfterSystem | AfterTools |
|----------|-------------|------------|
| Bedrock (Claude models) | ✓ | ✓ |
| Bedrock (Nova models) | ✓ | ✗ |

Providers that do not support caching ignore these options. The runtime validates provider-specific constraints—for example, requesting `AfterTools` with a Nova model returns an error.

**When to Use Cache:**

- Use `AfterSystem()` when your system prompt is stable across turns and you want to avoid re-processing it
- Use `AfterTools()` when your tool definitions are stable and you want to cache the tool configuration
- Combine both for maximum caching benefit with supported providers

**Complete Example:**

```go
Agent("assistant", "Conversational assistant", func() {
    Use(DocsToolset)
    Use(SearchToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(10))
        TimeBudget("5m")
        Cache(func() {
            AfterSystem()  // cache the system prompt
            AfterTools()   // cache tool definitions (Claude only)
        })
    })
})
```

### History

`History(dsl)` defines how the runtime manages conversation history before each planner invocation. History policies transform the message history while preserving:

- System prompts at the start of the conversation
- Logical turn boundaries (user + assistant + tool calls/results as atomic units)

At most one history policy may be configured per agent.

**Context**: Inside `RunPolicy`

Two standard policies are available:

**KeepRecentTurns (Sliding Window):**

`KeepRecentTurns(n)` retains only the most recent N user/assistant turns while preserving system prompts and tool exchanges. This is the simplest approach for bounding context size.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Parameters:**
- `n`: Number of recent turns to keep (must be > 0)

**Compress (Model-Assisted Summarization):**

`Compress(triggerAt, keepRecent)` summarizes older turns using a model while keeping recent turns in full fidelity. This preserves more context than a simple sliding window by condensing older conversation into a summary.

```go
RunPolicy(func() {
    History(func() {
        // When at least 30 turns exist, summarize older turns
        // and keep the most recent 10 in full fidelity
        Compress(30, 10)
    })
})
```

**Parameters:**
- `triggerAt`: Minimum total turn count before compression runs (must be > 0)
- `keepRecent`: Number of most recent turns to retain in full fidelity (must be >= 0 and < triggerAt)

**HistoryModel Requirement:**

When using `Compress`, you must supply a `model.Client` via the generated `HistoryModel` field on the agent config. The runtime uses this client with `ModelClassSmall` to summarize older turns:

```go
// Generated agent config includes HistoryModel field when Compress is used
cfg := chat.ChatAgentConfig{
    Planner:      &ChatPlanner{},
    HistoryModel: smallModelClient, // Required: implements model.Client
}
if err := chat.RegisterChatAgent(ctx, rt, cfg); err != nil {
    log.Fatal(err)
}
```

If `HistoryModel` is not provided when `Compress` is configured, registration will fail.

**Turn Boundary Preservation:**

Both policies preserve logical turn boundaries as atomic units. A "turn" consists of:
1. A user message
2. The assistant's response (text and/or tool calls)
3. Any tool results from that response

This ensures the model always sees complete interaction sequences, never partial turns that could confuse context.

### InterruptsAllowed
 
`InterruptsAllowed(bool)` signals that human-in-the-loop interruptions should be honored. When enabled, the runtime supports pause/resume operations, which are essential for clarification loops and durable await states.
 
**Context**: Inside `RunPolicy`
 
**Key Benefits:**
- Enables the agent to **pause** execution when missing required information (see `OnMissingFields`).
- Allows the planner to **await** user input via clarification tools.
- Ensures the agent state is preserved exclusively during the pause, consuming no compute resources until resumed.
 
```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### OnMissingFields

`OnMissingFields(action)` configures how the agent responds when tool invocation validation detects missing required fields.

**Context**: Inside `RunPolicy`

Valid values:
- `"finalize"`: Stop execution when required fields are missing
- `"await_clarification"`: Pause and wait for user to provide missing information
- `"resume"`: Continue execution despite missing fields
- `""` (empty): Let the planner decide based on context

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Complete Policy Example

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        Timing(func() {
            Budget("5m")
            Plan("30s")
            Tools("1m")
        })
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")
        History(func() {
            Compress(30, 10)
        })
    })
})
```

---

## MCP Functions

Goa-AI provides DSL functions for declaring Model Context Protocol (MCP) servers within Goa services.

### MCPServer

`MCPServer(name, version, opts...)` enables MCP support for the current service. It configures the service to expose tools, resources, and prompts via the MCP protocol.

**Alias**: `MCP(name, version, opts...)` is an alias for `MCPServer`. Both functions are identical in behavior.

**Context**: Inside `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    // Using MCPServer
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Or equivalently using the MCP alias
    // MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
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

### ProtocolVersion

`ProtocolVersion(version)` configures the MCP protocol version supported by the server. It returns a configuration function for use with `MCPServer` or `MCP`.

**Context**: Option argument to `MCPServer` or `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### MCPTool

`MCPTool(name, description)` marks the current method as an MCP tool. The method's payload becomes the tool input schema and the result becomes the output schema.

**Context**: Inside `Method` (service must have MCP enabled)

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

### MCPToolset

`MCPToolset(service, toolset)` declares an MCP-defined toolset derived from a Goa MCP server.

**Context**: Top-level

There are two usage patterns:

**Goa-backed MCP server:**

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

**External MCP server with inline schemas:**

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

### Resource and WatchableResource

`Resource(name, uri, mimeType)` marks a method as an MCP resource provider.

`WatchableResource(name, uri, mimeType)` marks a method as a subscribable resource.

**Context**: Inside `Method` (service must have MCP enabled)

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})

Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "Current system status")
        Attribute("uptime", Int, "Uptime in seconds")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

### StaticPrompt and DynamicPrompt

`StaticPrompt(name, description, messages...)` adds a static prompt template.

`DynamicPrompt(name, description)` marks a method as a dynamic prompt generator.

**Context**: Inside `Service` (static) or `Method` (dynamic)

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
    // Static prompt
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    // Dynamic prompt
    Method("code_review", func() {
        Payload(func() {
            Attribute("language", String, "Programming language")
            Attribute("code", String, "Code to review")
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
})
```

### Notification and Subscription

`Notification(name, description)` marks a method as an MCP notification sender.

`Subscription(resourceName)` marks a method as a subscription handler for a watchable resource.

**Context**: Inside `Method` (service must have MCP enabled)

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "Task identifier")
        Attribute("progress", Int, "Progress percentage (0-100)")
        Required("task_id", "progress")
    })
    Notification("progress", "Task progress notification")
})

Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "Resource URI to subscribe to")
        Required("uri")
    })
    Result(String)
    Subscription("status") // Links to WatchableResource named "status"
})
```

### SubscriptionMonitor

`SubscriptionMonitor(name)` marks the current method as a server-sent events (SSE) monitor for subscription updates. The method streams subscription change events to connected clients.

**Context**: Inside `Method` (service must have MCP enabled)

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "Resource URI that changed")
        Attribute("event", String, "Event type (created, updated, deleted)")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

**When to use SubscriptionMonitor:**
- When clients need real-time updates about subscription changes
- For implementing SSE endpoints that push subscription events
- When building reactive UIs that respond to resource changes

### Complete MCP Server Example

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
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
    
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() { Attribute("uri", String) })
        Result(String)
        Subscription("status")
    })
    
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
    
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

---

## Registry Functions

Goa-AI provides DSL functions for declaring and consuming tool registries—centralized catalogs of MCP servers, toolsets, and agents that can be discovered and consumed by agents.

### Registry

`Registry(name, dsl)` declares a registry source for tool discovery. Registries are centralized catalogs that can be discovered and consumed by goa-ai agents.

**Context**: Top-level

Inside the DSL function, use:
- `URL`: sets the registry endpoint URL (required)
- `Description`: sets a human-readable description
- `APIVersion`: sets the registry API version (defaults to "v1")
- `Security`: references Goa security schemes for authentication
- `Timeout`: sets HTTP request timeout
- `Retry`: configures retry policy for failed requests
- `SyncInterval`: sets how often to refresh the catalog
- `CacheTTL`: sets local cache duration
- `Federation`: configures external registry import settings

```go
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})
```

**Configuration Options:**

| Function | Description | Example |
|----------|-------------|---------|
| `URL(endpoint)` | Registry endpoint URL (required) | `URL("https://registry.corp.internal")` |
| `APIVersion(version)` | API version path segment | `APIVersion("v1")` |
| `Timeout(duration)` | HTTP request timeout | `Timeout("30s")` |
| `Retry(maxRetries, backoff)` | Retry policy for failed requests | `Retry(3, "1s")` |
| `SyncInterval(duration)` | Catalog refresh interval | `SyncInterval("5m")` |
| `CacheTTL(duration)` | Local cache duration | `CacheTTL("1h")` |

### Federation

`Federation(dsl)` configures external registry import settings. Use Federation inside a Registry declaration to specify which namespaces to import from a federated source.

**Context**: Inside `Registry`

Inside the Federation DSL function, use:
- `Include`: specifies glob patterns for namespaces to import
- `Exclude`: specifies glob patterns for namespaces to skip

```go
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "data-*")
        Exclude("experimental/*", "deprecated/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})
```

**Include and Exclude:**

- `Include(patterns...)`: Specifies glob patterns for namespaces to import. If no Include patterns are specified, all namespaces are included by default.
- `Exclude(patterns...)`: Specifies glob patterns for namespaces to skip. Exclude patterns are applied after Include patterns.

### FromRegistry

`FromRegistry(registry, toolset)` configures a toolset to be sourced from a registry. Use FromRegistry as a provider option when declaring a Toolset.

**Context**: Argument to `Toolset`

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

// Basic usage - toolset name derived from registry toolset name
var RegistryTools = Toolset(FromRegistry(CorpRegistry, "data-tools"))

// With explicit name
var MyTools = Toolset("my-tools", FromRegistry(CorpRegistry, "data-tools"))

// With additional configuration
var ConfiguredTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
    Tags("data", "etl")
})
```

Registry-backed toolsets can be pinned to a specific version using the standard `Version()` DSL function:

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### PublishTo

`PublishTo(registry)` configures registry publication for an exported toolset. Use PublishTo inside an Export DSL to specify which registries the toolset should be published to.

**Context**: Inside `Toolset` (when being exported)

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var LocalTools = Toolset("utils", func() {
    Tool("summarize", "Summarize text", func() {
        Args(func() { Attribute("text", String) })
        Return(func() { Attribute("summary", String) })
    })
})

Agent("data-agent", "Data processing agent", func() {
    Use(LocalTools)
    Export(LocalTools, func() {
        PublishTo(CorpRegistry)
        Tags("data", "etl")
    })
})
```

### Complete Registry Example

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Define registries
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})

var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Federation(func() {
        Include("web-search", "code-execution")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Consume toolsets from registries
var DataTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("2.1.0")
})

var SearchTools = Toolset(FromRegistry(AnthropicRegistry, "web-search"))

// Local toolset to publish
var AnalyticsTools = Toolset("analytics", func() {
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})

var _ = Service("orchestrator", func() {
    Agent("analyst", "Data analysis agent", func() {
        Use(DataTools)
        Use(SearchTools)
        Use(AnalyticsTools)
        
        // Export and publish to registry
        Export(AnalyticsTools, func() {
            PublishTo(CorpRegistry)
            Tags("analytics", "data")
        })
        
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

---

## Next Steps

- **[Runtime](./runtime.md)** - Understand how designs translate into runtime behavior
- **[Toolsets](./toolsets.md)** - Deep dive into toolset execution models
- **[MCP Integration](./mcp-integration.md)** - Runtime wiring for MCP servers
