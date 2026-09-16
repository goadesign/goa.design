---
title: "Build with Goa"
linkTitle: "Documentation"
weight: 1
description: "One design language for Go services and AI agents. A clear workflow for developers and coding agents."
hide_children: true
---

Goa is a Go framework that gives coding agents less code to write and one contract to reason from. Generate APIs, clients, and validation. Build AI agents, MCP servers, and tool registries with Goa-AI.

## Choose your starting point

- **[Build a service with Goa](1-goa/quickstart/).** Define an API in Go, generate its HTTP server and client, and implement the business logic.
- **[Build an AI agent with Goa-AI](2-goa-ai/quickstart/).** Define typed tools, generate a runnable local agent, and connect your own planner and model.
- **[Develop with a coding agent](ai-development/).** Give your agent a focused design, explicit edit boundaries, and a repeatable generation and test loop.

Goa and Goa-AI share a design language and generator. You can use Goa for a
service on its own, start directly with Goa-AI, or expose a service method as an
agent tool using the same types.

## How the pieces fit

**The design describes the contract.** Types, descriptions, validation rules,
examples, and operations live in Go source. Goa-AI extends this with agents,
toolsets, structured completions, and evaluation suites.

**The generator derives the code.** Run `goa gen` to produce the interfaces,
transport code, clients, schemas, and bindings described by your design. The
contents of `gen/` are generated; application code lives outside it.

**Your application implements the behavior.** You and your coding agent write
service logic, planners, persistence, authorization, and tests. Regenerate when
the contract changes, then use compiler errors and tests to guide the update.

## Documentation for people and coding agents

Use the navigation to move between quickstarts, guides, and reference pages.
Every page has a **Copy page** control and a **Markdown** version. The
[documentation index for coding agents](/llms.txt) links to focused pages so you
can supply the context relevant to a task.

For observability, distributed events, and architecture diagrams, explore the
[Goa ecosystem](3-ecosystem/). Visit [contributing](contributing/) to report an
issue or improve these guides.
