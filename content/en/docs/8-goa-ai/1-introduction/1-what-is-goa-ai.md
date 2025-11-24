---
title: "What is Goa-AI?"
linkTitle: "What is Goa-AI?"
weight: 1
description: "Learn about Goa-AI, a design-first framework for building agentic, tool-driven systems in Go."
---

Goa-AI is a design-first framework for building agentic, tool-driven systems in Go. You declare agents, toolsets, and run policies in Goa's DSL; Goa-AI then generates typed code, codecs, workflows, and registry helpers that plug into a production-grade runtime (in-memory for dev, Temporal for durability). Planners focus on strategy; the runtime handles orchestration, policies, memory, streaming, telemetry, and MCP integration.

## The Power of Design-First Agent Development

Just as Goa transforms API development by putting design first, Goa-AI brings the same philosophy to agentic systems. You describe your entire agent architecture—agents, toolsets, policies, and workflows—in Goa's expressive DSL, and Goa-AI generates production-ready code that handles all the complex orchestration logic.

{{< alert title="Key Design Elements" color="primary" >}}
**Agents & Toolsets**  
Define agents that consume or export toolsets with clean, readable syntax. Every tool, every policy, and every interaction is clearly specified.

**Typed Tool Contracts**  
Describe your tool payloads and results with type-safe precision. Goa-AI ensures your data flows exactly as designed, from input validation to response formatting.

**Runtime Policies**  
Specify execution limits, time budgets, and interruption handling. The runtime enforces these policies automatically on every turn.
{{< /alert >}}

From these definitions, Goa-AI generates production-ready code that handles all the complex workflow logic, letting you focus purely on your planner implementation. No more tedious boilerplate or error-prone manual translations between your agent design and implementation.

## Core Mental Model

```
DSL → Codegen → Runtime → Engine + Features
```

- **DSL (`goa-ai/dsl`)**: Declare agents inside a Goa `Service`. Specify toolsets (native or MCP) and a `RunPolicy`.
- **Codegen (`codegen/agent`, `codegen/mcp`)**: Emits agent packages under `gen/`, tool specs/codecs, Temporal activities, and registry helpers.
- **Runtime (`runtime/agent`, `runtime/mcp`)**: Durable plan/execute loop with policy enforcement, memory/session stores, hook bus, telemetry, MCP callers.
- **Engine (`runtime/agent/engine`)**: Abstracts the workflow backend (in-memory for dev; Temporal adapter for production).
- **Features (`features/*`)**: Optional modules (Mongo memory/session, Pulse stream sink, Bedrock/OpenAI model clients, policy engine).

Never edit `gen/` by hand — always regenerate after DSL changes.

## When to Use Goa-AI

- **LLM workflows with tools**: Build agents that call typed tools with validations and examples, not ad-hoc JSON.
- **Durable orchestration**: Need long-running, resumable runs with retries, time budgets, and deterministic replays.
- **Agent composition**: Treat one agent as a tool of another, even across processes (inline execution, single history).
- **Typed schemas everywhere**: Generated payload/result types and codecs keep schema drift and hand-rolled encoding out.
- **Transcript-first state**: Let Goa-AI build and reuse full transcripts (messages + tool calls/results) so you do not need separate
  “tool history” or “previous messages” structures in your planners or UIs.
- **Operational visibility**: Stream planner/tool/assistant events; persist transcripts; instrument with logs/metrics/traces.
- **MCP integration**: Consume tool suites from MCP servers through generated wrappers and callers.

## A Simple Example

Here's what designing an agent with Goa-AI looks like:

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
    })
})

var _ = Service("orchestrator", func() {
    Description("Human front door for the knowledge agent.")

    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
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

And here's all the code you need to write to run it:

```go
rt := runtime.New()
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
    Planner: myPlanner,
}); err != nil {
    log.Fatal(err)
}

client := chat.NewClient(rt)
out, err := client.Run(ctx, []model.Message{
    {Role: "user", Content: "Search for Go documentation"},
}, runtime.WithSessionID("session-1"))
```

## Key Concepts

### Design-First: Your Single Source of Truth

Stop juggling multiple tool schemas, documentation, and implementation files. With Goa-AI, your design is your contract—a clear, executable specification that keeps everyone on the same page. Teams love this approach because it eliminates the "but that's not what the spec said" conversations forever.

### Clean Architecture That Scales

Goa-AI generates code that follows clean architecture principles:
* **Planner Layer**: Your LLM strategy logic, pure and clean
* **Runtime Layer**: Durable orchestration with policy enforcement
* **Engine Layer**: Workflow backend abstraction (Temporal, in-memory, or custom)

This isn't just architecture theory—it's working code that makes your agents easier to test, modify, and scale as your needs evolve.

### Type Safety That Has Your Back

Forget about runtime surprises. Goa-AI leverages Go's type system to catch issues at compile time:

```go
// Generated tool spec - your contract
type SearchPayload struct {
    Query string `json:"query"`
    Limit *int   `json:"limit,omitempty"`
}

// Your executor - clean and focused
func (e *executor) Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    args, _ := docsspecs.UnmarshalSearchPayload(call.Payload)
    // Use typed args directly
    return planner.ToolResult{Payload: result}, nil
}
```

If your executor doesn't match the design, you'll know before your code hits production.

## Next Steps

* Follow the [Getting Started guide](../2-getting-started/) to build your first agent
* Explore the [Core Concepts](../3-concepts/) to understand the DSL, runtime, and toolsets
* Check out the [Tutorials](../4-tutorials/) for step-by-step examples

