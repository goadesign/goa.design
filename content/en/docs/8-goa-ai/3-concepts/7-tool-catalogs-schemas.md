---
title: "Tool Catalogs & Schemas"
linkTitle: "Tool Catalogs & Schemas"
weight: 7
description: "Discover tools, schemas, and specs exported by Goa-AI agents, and learn how UIs and planners can consume them."
---

## Why Tool Catalogs Matter

Goa-AI agents generate a **single, authoritative catalog of tools** from your Goa
designs. This catalog powers:

- planner tool advertisement (which tools the model can call),
- UI discovery (tool lists, categories, schemas),
- and external orchestrators (MCP, custom frontends) that need machine-readable specs.

You should never hand-maintain a parallel list of tools or ad-hoc JSON Schemas.

## Generated Specs and `tool_schemas.json`

For each agent, Goa-AI emits a **specs package** and a **JSON catalog**:

- **Specs packages (`gen/<service>/agents/<agent>/specs/...`)**  
  - `types.go` – payload/result Go structs.
  - `codecs.go` – JSON codecs (encode/decode typed payloads/results).
  - `specs.go` – `[]tools.ToolSpec` entries with:
    - canonical tool ID (`tools.Ident`),
    - payload/result schemas,
    - hints (titles, descriptions, tags).

- **JSON catalog (`tool_schemas.json`)**  
  - Location:

    ```text
    gen/<service>/agents/<agent>/specs/tool_schemas.json
    ```

  - Contains one entry per tool with:
    - `id` – canonical tool ID (`"<service>.<toolset>.<tool>"`),
    - `service`, `toolset`, `title`, `description`, `tags`,
    - `payload.schema` and `result.schema` (JSON Schema).
  - Generated from the same DSL as the Go specs/codecs; if schema generation
    fails, `goa gen` fails so you never ship a drifted catalog.

This JSON file is ideal for:

- feeding schemas to LLM providers (tool/function calling),
- building UI forms/editors for tool payloads,
- and offline documentation tooling.

## Runtime Introspection APIs

At runtime, you do not need to read `tool_schemas.json` from disk. The runtime
exposes an introspection API backed by the same specs:

```go
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // single ToolSpec
schemas, ok := rt.ToolSchema(toolID)           // payload/result schemas
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // []ToolSpec for one agent
```

Where `toolID` is a typed `tools.Ident` constant from a generated specs or
agenttools package.

This is the preferred way for:

- UIs to discover tools for a given agent,
- orchestrators to enumerate available tools and read their schemas,
- ops tooling to introspect tool metadata in a running system.

## Choosing Between Specs and JSON

Use:

- **Specs & runtime introspection** when:
  - you are inside Go code (workers, services, admin tools),
  - you want strong typing and direct access to codecs/schemas.

- **`tool_schemas.json`** when:
  - you are outside Go (frontends, external orchestrators),
  - you want a simple static JSON catalogue to load and cache.

Both are derived from the **same design**; choose whichever is more convenient
for your consumer.

## Agenttools and Typed Tool IDs

For exported toolsets (agent-as-tool), Goa-AI also generates an **agenttools**
package under:

```text
gen/<service>/agents/<agent>/agenttools/<toolset>/
```

These packages provide:

- typed tool ID constants (`tools.Ident`),
- alias payload/result types,
- codecs,
- and helper builders such as `New<Search>Call(...)`.

Example:

```go
import (
    chattools "example.com/assistant/gen/orchestrator/agents/chat/agenttools/search"
)

// Use a generated constant instead of ad-hoc strings
spec,   _ := rt.ToolSpec(chattools.Search)
schemas, _ := rt.ToolSchema(chattools.Search)

// Build a typed tool call
req := chattools.NewSearchCall(&chattools.SearchPayload{
    Query: "golang",
}, chattools.WithToolCallID("tc-1"))
```

Prefer these **typed IDs and builders** anywhere you reference tools
(planners, orchestrators, UIs) to avoid stringly-typed bugs and keep your
catalog aligned with the design.


