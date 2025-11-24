---
title: "DSL Overview"
linkTitle: "DSL Overview"
weight: 1
description: "Overview of Goa-AI's DSL and how it extends Goa."
---

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
- Tool codecs/specs with typed payload/result structs and JSON codecs
- Activity handlers for plan/execute/resume loops
- Registration helpers that wire the design into the runtime

A contextual `AGENTS_QUICKSTART.md` is written at the module root unless disabled via `DisableAgentDocs()`.

## Quickstart Example

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
- `gen/orchestrator/agents/chat/specs`: payload/result structs, JSON codecs, tool schemas
- `gen/orchestrator/agents/chat/agenttools`: helpers that expose exported tools to other agents
- MCP-aware registration helpers when an `MCPToolset` is referenced via `Use`

## Typed Tool Identifiers

Each per-toolset specs package defines typed tool identifiers (`tools.Ident`) for every generated tool:

```go
const (
    // Typed tool IDs
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Use these constants anywhere you need to reference tools, including for non-exported toolsets (no need to define ad-hoc strings).

## Cross-Process Inline Composition

When agent A declares it "uses" a toolset exported by agent B, Goa-AI has enough information to wire composition automatically:

- The exporter (agent B) package includes generated `agenttools` helpers that describe
  the exported toolset (tool IDs, specs, templates) and build an inline
  `ToolsetRegistration` for agent-as-tool execution.
- The consumer (agent A) agent registry uses those helpers when you
  `Use(AgentToolset("service", "agent", "toolset"))`, registering an inline toolset
  that executes the provider agent as a real child run using strong-contract routing
  metadata (workflow name, activities, queue).
- The generated `Execute` function for the inline toolset builds nested planner
  messages from the tool payload, runs the provider agent as a child workflow, and
  adapts the nested agent's `RunOutput` into a `planner.ToolResult` (including a
  `RunLink` that identifies the child run).
- Payloads and results remain canonical JSON across boundaries and are decoded exactly
  once at the provider tool boundary.

This yields a single deterministic workflow **per agent run** and a linked run tree for
composition: the parent run sees `tool_start` / `tool_end` events for the agent-as-tool
call plus `agent_run_started` link events that point at the child agent run stream.

## Next Steps

- Learn about [Agent Functions](./2-agent-functions.md) for declaring agents
- Explore [Toolset Functions](./3-toolset-functions.md) for defining toolsets
- Read about [Policy Functions](./4-policy-functions.md) for configuring runtime behavior

