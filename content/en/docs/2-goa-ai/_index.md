---
title: "Goa-AI Framework"
linkTitle: "Goa-AI"
weight: 2
description: "Design-first framework for building agentic, tool-driven systems in Go."
llm_optimized: true
content_scope: "Complete Goa-AI Documentation"
aliases:
  - /en/docs/8-goa-ai/
  - /en/docs/8-goa-ai/1-introduction/
  - /en/docs/8-goa-ai/1-introduction/1-what-is-goa-ai/
  - /en/docs/8-goa-ai/1-introduction/2-why-goa-ai/
  - /docs/8-goa-ai/
---

## Overview

Goa-AI extends Goa's design-first philosophy to agentic systems. Define agents, toolsets, and policies in a DSL; generate production-ready code with typed contracts, durable workflows, and streaming events.

### Key Features

- **Design-First Agents** — Define agents, tools, and policies using a powerful DSL
- **Typed Contracts** — End-to-end type safety for tool payloads and results
- **Durable Workflows** — Built-in Temporal integration for reliable execution
- **Streaming Events** — Real-time event streaming for UI and observability
- **MCP Integration** — Native support for Model Context Protocol servers
- **Agent Composition** — Compose agents as tools for complex workflows

## Documentation Guides

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | Installation and first agent | ~2,700 |
| [DSL Reference](dsl-reference/) | Complete DSL: agents, toolsets, policies, MCP | ~3,600 |
| [Runtime](runtime/) | Runtime architecture, plan/execute loop, engines | ~2,400 |
| [Toolsets](toolsets/) | Toolset types, execution models, transforms | ~2,300 |
| [Agent Composition](agent-composition/) | Agent-as-tool, run trees, streaming topology | ~1,400 |
| [MCP Integration](mcp-integration/) | MCP servers, transports, generated wrappers | ~1,200 |
| [Memory & Sessions](memory-sessions/) | Transcripts, memory stores, sessions, runs | ~1,600 |
| [Production](production/) | Temporal setup, streaming UI, model integration | ~2,200 |

**Total Section:** ~17,600 tokens

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Goa-AI Design                          │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Agents  │  │ Toolsets │  │ Policies │  │ MCP Definitions │  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └───────┬─────────┘  │
└───────┼────────────┼─────────────┼────────────────┼────────────┘
        │            │             │                │
        ▼            ▼             ▼                ▼
┌────────────────────────────────────────────────────────────────┐
│                      Code Generation                           │
│  • Agent interfaces    • Tool specs       • Policy handlers    │
│  • Workflow activities • Type converters  • MCP wrappers       │
└────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│                        Runtime                                 │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│ │ Planner  │  │ Executor │  │ Memory   │  │ Event Streaming  │ │
│ └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## Quick Example

```go
package design

import . "goa.design/goa-ai/dsl"

var _ = Agent("assistant", func() {
    Description("A helpful assistant agent")
    
    Toolset("calculator", func() {
        Tool("add", func() {
            Description("Add two numbers")
            Payload(func() {
                Field(1, "a", Int, "First number")
                Field(2, "b", Int, "Second number")
            })
            Result(Int)
        })
    })
    
    Policy(func() {
        MaxTokens(4096)
        Temperature(0.7)
    })
})
```

## Getting Started

Start with the [Quickstart](quickstart/) guide to install Goa-AI and build your first agent.

For comprehensive DSL coverage, see the [DSL Reference](dsl-reference/).

For understanding the runtime architecture, see the [Runtime](runtime/) guide.
