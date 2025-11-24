---
title: "Goa-AI"
linkTitle: "Goa-AI"
weight: 8
description: >
  Design-first framework for building agentic, tool-driven systems in Go. Extend Goa's DSL to declare agents, toolsets, and policies, then let Goa-AI generate typed code, workflows, and runtime integrations.
menu:
  main:
    weight: 8
---

## Transform Your Agent Development

Goa-AI extends Goa's design-first workflow into a complete framework for building **agentic, tool-driven systems** in Go. Describe your agents, toolsets, policies, and workflows once in Goa's DSL, then let Goa-AI generate everything you need: typed tool payloads, Temporal workflows, runtime registries, and durable execution loops.

## What Makes Goa-AI Different?

Goa-AI stands out by treating your agent design as a living contract, just like Goa does for APIs:

* **Type-safe tools**: Generated payload/result structs plus JSON codecs—no more hand-written schemas
* **Durable orchestration**: Temporal-ready workflows & activities with retry/timeouts baked in
* **Agent composition**: Treat one agent as a tool of another, even across processes
* **Operational visibility**: Stream planner/tool/assistant events; persist transcripts; instrument with logs/metrics/traces
* **MCP integration**: Consume tool suites from MCP servers through generated wrappers

## How Goa-AI Works

```
DSL → Codegen → Runtime → Engine + Features
```

From a single design file, Goa-AI generates:

1. **Agent Packages** - Workflow definitions, planner activities, and registration helpers
2. **Tool Specs** - Typed payload/result structs, JSON codecs, and JSON Schema definitions
3. **Runtime Integration** - Durable plan/execute loop with policy enforcement, memory persistence, and streaming hooks
4. **MCP Adapters** - Generated wrappers that bridge MCP servers into the runtime

The result is a cohesive architecture where planners focus on business logic while Goa-AI supplies the plumbing for Temporal, Mongo-backed memory, Pulse streams, MCP integration, and model providers.

## Next Steps

* Follow the [Getting Started guide](./2-getting-started/) to build your first agent
* Explore the [Core Concepts](./3-concepts/) to understand the DSL, runtime, and toolsets
* Check out the [Tutorials](./4-tutorials/) for step-by-step examples
* Learn about [Real-World Patterns](./5-real-world/) for production deployments


