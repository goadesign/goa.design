---
title: "Goa-AI Framework"
linkTitle: "Goa-AI"
weight: 2
description: "Design-first framework for building agentic, tool-driven systems in Go."
llm_optimized: true
content_scope: "Complete Goa-AI Documentation"
aliases:
---

## Overview

Goa-AI extends Goa's design-first philosophy to agentic systems. Define agents, toolsets, and policies in a DSL; generate production-ready code with typed contracts, durable workflows, and streaming events.

---

## Why Goa-AI?

### Design-First Agents {#design-first-agents}

**Stop writing brittle agent code. Start with contracts.**

Most agent frameworks have you wiring together prompts, tools, and API calls imperatively. When things break—and they will—you're debugging scattered code with no clear source of truth.

Goa-AI flips this: **define your agent's capabilities in a typed DSL**, then generate the implementation. Your design *is* your documentation. Your contracts *are* your validation. Changes propagate automatically.

```go
Agent("assistant", "A helpful coding assistant", func() {
    Use("code_tools", func() {
        Tool("analyze", "Analyze code for issues", func() {
            Args(func() {
                Attribute("code", String, "Source code to analyze", func() {
                    MinLength(1)           // Can't be empty
                    MaxLength(100000)      // Reasonable size limit
                })
                Attribute("language", String, "Programming language", func() {
                    Enum("go", "python", "javascript", "typescript", "rust", "java")
                })
                Required("code", "language")
            })
            Return(AnalysisResult)
        })
    })
})
```

When the LLM calls this tool with invalid arguments—say, an empty `code` string or `language: "cobol"`—Goa-AI **automatically retries** with a validation error message. The LLM sees exactly what went wrong and corrects itself. No manual error handling code required.

**Benefits:**
- **Single source of truth** — The DSL defines behavior, types, and documentation
- **Compile-time safety** — Catch mismatched payloads before runtime
- **Auto-generated clients** — Type-safe tool invocations without manual wiring
- **Consistent patterns** — Every agent follows the same structure
- **Self-healing agents** — Validation errors trigger automatic retries with feedback

→ Learn more in the [DSL Reference](dsl-reference/) and [Quickstart](quickstart/)

---

### Run Trees {#run-trees-composition}

**Build complex systems from simple, observable pieces.**

Real-world AI applications aren't single agents—they're orchestrated workflows where agents delegate to other agents, tools spawn sub-tasks, and you need to trace everything.

Goa-AI's **run tree model** gives you hierarchical execution with full observability. Each agent run has a unique ID. Child runs link to parents. Events stream in real-time. Debug any failure by walking the tree.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Benefits:**
- **Agent-as-tool** — Any agent can be invoked as a tool by another agent
- **Hierarchical tracing** — Follow execution across agent boundaries
- **Isolated failures** — Child runs fail independently; parents can retry or recover
- **Streaming topology** — Events flow up the tree for real-time UIs

→ Deep dive in [Agent Composition](agent-composition/) and [Runtime](runtime/)

---

### Structured Streaming {#structured-streaming}

**Real-time visibility into every decision your agents make.**

Black-box agents are a liability. When your agent calls a tool, starts thinking, or encounters an error, you need to know *immediately*—not after the request times out.

Goa-AI emits **typed events** throughout execution: `assistant_reply` for streaming text, `tool_start`/`tool_end` for tool lifecycle, `planner_thought` for reasoning visibility, `usage` for token tracking. Events flow through a simple **Sink** interface to any transport.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))

// Or subscribe to a specific run
stop, _ := rt.SubscribeRun(ctx, runID, connectionSink)
defer stop()
```

**Stream profiles** filter events for different consumers: `UserChatProfile()` for end-user UIs, `AgentDebugProfile()` for developer views, `MetricsProfile()` for observability pipelines. Built-in sinks for Pulse (Redis Streams) enable distributed streaming across services.

**Benefits:**
- **Transport-agnostic** — Same events work over WebSocket, SSE, Pulse, or custom backends
- **Typed contracts** — No string parsing; events are strongly typed with documented payloads
- **Selective delivery** — Stream profiles filter events per consumer
- **Multi-tenant ready** — Events carry `RunID` and `SessionID` for routing and filtering

→ Implementation details in [Production Streaming](production/#streaming-ui)

---

### Temporal Durability {#temporal-durability}

**Agent runs that survive crashes, restarts, and network failures.**

Without durability, a crashed process loses all progress. A rate-limited API call fails the entire run. A network blip during tool execution means re-running expensive inference.

Goa-AI uses **Temporal** for durable execution. Agent runs become workflows; tool calls become activities with configurable retries. Every state transition is persisted. A crashed tool retries automatically—*without* re-running the LLM call that produced it.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.New(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Benefits:**
- **No wasted inference** — Failed tools retry without re-calling the LLM
- **Crash recovery** — Restart workers anytime; runs resume from last checkpoint
- **Rate limit handling** — Exponential backoff absorbs API throttling
- **Deployment-safe** — Rolling deploys don't lose in-flight work

→ Setup guide and retry configuration in [Production](production/#temporal-setup)

---

### Tool Registries {#tool-registries}

**Discover and consume tools from anywhere—your cluster or the public cloud.**

As AI ecosystems grow, tools are everywhere: internal services, third-party APIs, public MCP registries. Hardcoding tool definitions doesn't scale. You need dynamic discovery.

Goa-AI provides a **clustered internal registry** for your own toolsets and **federation** with external registries like Anthropic's MCP catalog. Define once, discover everywhere.

```go
// Connect to public registries
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "filesystem")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Or run your own clustered registry
var CorpRegistry = Registry("corp", func() {
    Description("Internal tool registry")
    URL("https://registry.corp.internal")
    Security(CorpAPIKey)
    SyncInterval("5m")
})
```

**Internal Registry Clustering:**

Multiple registry nodes with the same name automatically form a cluster via Redis. Shared state, coordinated health checks, horizontal scaling—all automatic.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Benefits:**
- **Dynamic discovery** — Agents find tools at runtime, not compile time
- **Multi-cluster scaling** — Registry nodes auto-coordinate via Redis
- **Public registry federation** — Import tools from Anthropic, OpenAI, or any MCP registry
- **Health monitoring** — Automatic ping/pong checks with configurable thresholds
- **Selective import** — Include/exclude patterns for granular control

→ Learn more in [MCP Integration](mcp-integration/) and [Production](production/)

---

## Key Features Summary

| Feature | What You Get |
|---------|--------------|
| [Design-First Agents](#design-first-agents) | Define agents in DSL, generate type-safe code |
| [MCP Integration](mcp-integration/) | Native Model Context Protocol support |
| [Tool Registries](#tool-registries) | Clustered discovery + public registry federation |
| [Run Trees](#run-trees-composition) | Agents calling agents with full traceability |
| [Structured Streaming](#structured-streaming) | Real-time typed events for UIs and observability |
| [Temporal Durability](#temporal-durability) | Fault-tolerant execution that survives failures |
| [Typed Contracts](dsl-reference/) | End-to-end type safety for all tool operations |

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
| [Testing & Troubleshooting](testing/) | Testing agents, planners, tools, common errors | ~2,000 |

**Total Section:** ~21,400 tokens

## Architecture

Goa-AI follows a **define → generate → execute** pipeline that transforms declarative designs into production-ready agent systems.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Layer Overview:**

| Layer | Purpose |
|-------|---------|
| **DSL** | Declare agents, tools, policies, and external integrations in version-controlled Go code |
| **Codegen** | Generate type-safe specs, codecs, workflow definitions, and registry clients—never edit `gen/` |
| **Runtime** | Execute the plan/execute loop with policy enforcement, memory persistence, and event streaming |
| **Engine** | Swap execution backends: in-memory for development, Temporal for production durability |
| **Features** | Plug in model providers (OpenAI, Anthropic, AWS Bedrock), persistence (Mongo), streaming (Pulse), and registries |

**Key Integration Points:**

- **Model Clients** — Abstract LLM providers behind a unified interface; switch between OpenAI, Anthropic, or Bedrock without changing agent code
- **Registry** — Discover and invoke toolsets across process boundaries; clustered via Redis for horizontal scaling
- **Pulse Streaming** — Real-time event bus for UI updates, observability pipelines, and cross-service communication
- **Temporal Engine** — Durable workflow execution with automatic retries, replay, and crash recovery

### Model Providers & Extensibility {#model-providers}

Goa-AI ships first-class adapters for three LLM providers:

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

All three implement the same `model.Client` interface used by planners. Applications register model clients with the runtime using `rt.RegisterModel("provider-id", client)` and refer to them by ID from planners and generated agent configs, so swapping providers is a configuration change rather than a redesign.

Adding a new provider follows the same pattern:

1. Implement `model.Client` for your provider by mapping its SDK types onto `model.Request`, `model.Response`, and streaming `model.Chunk`s.
2. Optionally wrap the client with shared middleware (for example, `features/model/middleware.NewAdaptiveRateLimiter`) for adaptive rate limiting and metrics.
3. Call `rt.RegisterModel("my-provider", client)` before registering agents, then reference `"my-provider"` from your planners or agent configs.

Because planners and the runtime depend only on `model.Client`, new providers plug in without changes to your Goa designs or generated agent code.

## Quick Example

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("calculator", func() {
    Description("Calculator service with an AI assistant")
    
    // Define a service method that the tool will bind to
    Method("add", func() {
        Description("Add two numbers")
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(Int)
    })
    
    // Define the agent within the service
    Agent("assistant", "A helpful assistant agent", func() {
        // Use a toolset with tools bound to service methods
        Use("calculator", func() {
            Tool("add", "Add two numbers", func() {
                Args(func() {
                    Attribute("a", Int, "First number")
                    Attribute("b", Int, "Second number")
                    Required("a", "b")
                })
                Return(Int)
                BindTo("add")  // Bind to the service method
            })
        })
        
        // Configure the agent's run policy
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

## Getting Started

Start with the [Quickstart](quickstart/) guide to install Goa-AI and build your first agent.

For comprehensive DSL coverage, see the [DSL Reference](dsl-reference/).

For understanding the runtime architecture, see the [Runtime](runtime/) guide.
