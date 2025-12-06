---
title: "Quickstart"
linkTitle: "Quickstart"
weight: 1
description: "Get started with Goa-AI: understand what it is, why to use it, install it, and build your first agent."
llm_optimized: true
aliases:
  - /en/docs/8-goa-ai/2-getting-started/
  - /en/docs/8-goa-ai/2-getting-started/1-installation/
  - /en/docs/8-goa-ai/2-getting-started/2-first-agent/
  - /en/docs/8-goa-ai/4-tutorials/1-simple-agent/
  - /docs/8-goa-ai/2-getting-started/
  - /docs/8-goa-ai/4-tutorials/1-simple-agent/
---

## What is Goa-AI?

Goa-AI is a design-first framework for building agentic, tool-driven systems in Go. You declare agents, toolsets, and run policies in Goa's DSL; Goa-AI then generates typed code, codecs, workflows, and registry helpers that plug into a production-grade runtime (in-memory for dev, Temporal for durability). Planners focus on strategy; the runtime handles orchestration, policies, memory, streaming, telemetry, and MCP integration.

### The Power of Design-First Agent Development

Just as Goa transforms API development by putting design first, Goa-AI brings the same philosophy to agentic systems. You describe your entire agent architecture—agents, toolsets, policies, and workflows—in Goa's expressive DSL, and Goa-AI generates production-ready code that handles all the complex orchestration logic.

Key design elements:

- **Agents & Toolsets**: Define agents that consume or export toolsets with clean, readable syntax. Every tool, every policy, and every interaction is clearly specified.
- **Typed Tool Contracts**: Describe your tool payloads and results with type-safe precision. Goa-AI ensures your data flows exactly as designed, from input validation to response formatting.
- **Runtime Policies**: Specify execution limits, time budgets, and interruption handling. The runtime enforces these policies automatically on every turn.

### Core Mental Model

```
DSL → Codegen → Runtime → Engine + Features
```

- **DSL (`goa-ai/dsl`)**: Declare agents inside a Goa `Service`. Specify toolsets (native or MCP) and a `RunPolicy`.
- **Codegen (`codegen/agent`, `codegen/mcp`)**: Emits agent packages under `gen/`, tool specs/codecs, Temporal activities, and registry helpers.
- **Runtime (`runtime/agent`, `runtime/mcp`)**: Durable plan/execute loop with policy enforcement, memory/session stores, hook bus, telemetry, MCP callers.
- **Engine (`runtime/agent/engine`)**: Abstracts the workflow backend (in-memory for dev; Temporal adapter for production).
- **Features (`features/*`)**: Optional modules (Mongo memory/session, Pulse stream sink, Bedrock/OpenAI model clients, policy engine).

Never edit `gen/` by hand—always regenerate after DSL changes.

### When to Use Goa-AI

- **LLM workflows with tools**: Build agents that call typed tools with validations and examples, not ad-hoc JSON.
- **Durable orchestration**: Need long-running, resumable runs with retries, time budgets, and deterministic replays.
- **Agent composition**: Treat one agent as a tool of another, even across processes (inline execution, single history).
- **Typed schemas everywhere**: Generated payload/result types and codecs keep schema drift and hand-rolled encoding out.
- **Transcript-first state**: Let Goa-AI build and reuse full transcripts (messages + tool calls/results) so you don't need separate "tool history" or "previous messages" structures.
- **Operational visibility**: Stream planner/tool/assistant events; persist transcripts; instrument with logs/metrics/traces.
- **MCP integration**: Consume tool suites from MCP servers through generated wrappers and callers.

### A Simple Example

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
out, err := client.Run(ctx, []*model.Message{{
    Role:  model.ConversationRoleUser,
    Parts: []model.Part{model.TextPart{Text: "Search for Go documentation"}},
}}, runtime.WithSessionID("session-1"))
```

### Key Concepts

**Design-First: Your Single Source of Truth**

Stop juggling multiple tool schemas, documentation, and implementation files. With Goa-AI, your design is your contract—a clear, executable specification that keeps everyone on the same page.

**Clean Architecture That Scales**

Goa-AI generates code that follows clean architecture principles:
- **Planner Layer**: Your LLM strategy logic, pure and clean
- **Runtime Layer**: Durable orchestration with policy enforcement
- **Engine Layer**: Workflow backend abstraction (Temporal, in-memory, or custom)

**Type Safety That Has Your Back**

Goa-AI leverages Go's type system to catch issues at compile time:

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

---

## Why Goa-AI?

Goa-AI is an **opinionated, design-first framework** for building production-grade agents in Go.

While many frameworks focus on *prompt engineering* (chains, templates) or *rapid prototyping*, Goa-AI focuses on **software engineering**: architecture, type safety, reliability, and composability.

### 1. Design-First Contracts (The "Goa" Way)

You define your agents, tools, and policies in a **DSL** (Domain Specific Language). Goa-AI then generates the glue code.

- **Why it matters**: You never write brittle "string parsing" code for tool arguments.
- **The result**: Your tools have **strong schemas**. If an LLM calls a tool with missing fields, the *generated code* catches it at the boundary and provides a structured **Auto-Repair Hint** (`RetryHint`) so the planner can fix it automatically. You get compile-time safety for your agent's interface.

### 2. Agents as First-Class Actors

In Goa-AI, an agent isn't just a prompt loop. It is a **service**.

- **Agent-as-Tool**: You can register an entire agent (e.g., `ResearchAgent`) as a *tool* for another agent (e.g., `ChatAgent`).
- **Run Trees**: The runtime tracks this hierarchy. It doesn't "flatten" the execution; it maintains a **Run Tree** (Parent → Child → Tool).
- **Why it matters**: You can build complex systems out of small, specialized agents that compose cleanly. The runtime handles the "plumbing" of passing context and linking runs.

### 3. Structured Streaming (Not Just Text)

Most frameworks stream raw text tokens. Goa-AI streams **Typed Events**.

- **The Experience**: Your UI receives specific events: `AssistantReply`, `PlannerThought`, `ToolStart`, `AgentRunStarted`.
- **Topology-Aware**: The stream tells the UI *exactly* what is happening: "The Chat Agent just started a child run of the Research Agent."
- **Why it matters**: This enables **Rich UIs** (like "Agent Cards" or "Thinking Accordions") instead of just a chat bubble. You can render the *structure* of the thought process, not just the output.

### 4. Production-Ready Runtime

It is built for "Day 2" operations, not just demos.

- **Durability**: First-class support for **Temporal** workflows. Your agents can run for days (e.g., "Monitor this incident") and survive restarts.
- **Policy & Caps**: Enforce strict limits (e.g., "Max 5 tool calls", "2 minute budget").
- **Observability**: Every run is tracked with `RunID`, `SessionID`, and `TurnID`. You can persist transcripts to Mongo and search them later.
- **MCP Integration**: Native support for the **Model Context Protocol**, so your agents can instantly use external tool servers (GitHub, Slack, Postgres).

### Summary: Systems vs Scripts

Use Goa-AI if you are building **systems**, not just scripts.

- **If you want**: To hack together a quick script to "chat with a PDF" or prototype an idea in an afternoon → Use a dynamic language library.
- **If you want**: To build a reliable, scalable platform where agents are services, tools are strongly typed, and UIs reflect the real state of the system → **Use Goa-AI**.

---

## Installation

### Prerequisites

Before installing Goa-AI, ensure you have:

- **Go 1.24+** installed and configured
- **Goa v3.23.0+** CLI installed
- **Temporal** (optional, for durable workflows) - can use in-memory engine for development

### Install Goa CLI

The Goa CLI is required to generate code from your designs:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

Verify the installation:

```bash
goa version
```

### Install Goa-AI

Add Goa-AI to your Go module:

```bash
go get goa.design/goa-ai@latest
```

### Optional: Temporal Setup

For durable workflows in production, you'll need Temporal. For development, you can use the in-memory engine (no Temporal required).

**Development (In-Memory Engine)**

The runtime uses an in-memory engine by default, so you can start developing immediately without Temporal:

```go
rt := runtime.New() // Uses in-memory engine
```

**Production (Temporal Engine)**

For production deployments, set up Temporal:

Option 1: Docker (Quick Start)
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

Option 2: Temporalite (Local Development)
```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

Option 3: Temporal Cloud - Sign up at [temporal.io](https://temporal.io) and configure your client with cloud credentials.

### Verify Installation

Create a simple test to verify everything works:

```go
package main

import (
    "context"
    
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    // Runtime created successfully
    _ = rt
}
```

Run it:

```bash
go run main.go
```

If this runs without errors, you're ready to start building agents!

---

## Your First Agent

This section walks you through creating your first agent with Goa-AI. You'll build a simple Q&A assistant that can answer questions using a helper toolset.

### Scaffold a Fresh Project

Create a new project directory:

```bash
mkdir -p $GOPATH/src/example.com/quickstart && cd $_
go mod init example.com/quickstart
go get goa.design/goa/v3@latest
go get goa.design/goa-ai@latest
```

### Add a Design

Create `design/design.go` with a simple agent definition:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Input and output types with inline descriptions
var AskPayload = Type("AskPayload", func() {
    Attribute("question", String, "User question to answer")
    Example(map[string]any{"question": "What is the capital of Japan?"})
    Required("question")
})

var Answer = Type("Answer", func() {
    Attribute("text", String, "Answer text")
    Required("text")
})

var _ = Service("orchestrator", func() {
    Agent("chat", "Friendly Q&A assistant", func() {
        Use("helpers", func() {
            Tool("answer", "Answer a simple question", func() {
                Args(AskPayload)
                Return(Answer)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(2), MaxConsecutiveFailedToolCalls(1))
            TimeBudget("15s")
        })
    })
})
```

This design declares:
- A service called `orchestrator`
- An agent called `chat` that uses a `helpers` toolset
- A tool called `answer` with typed payload and result
- A run policy with caps and time budget

### Generate Code

Run the Goa code generator:

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
```

This creates:
- Generated agent packages under `gen/orchestrator/agents/chat/`
- Tool specs and codecs under `gen/orchestrator/agents/chat/specs/`
- Runnable examples under `cmd/orchestrator/`
- A contextual quickstart guide at `AGENTS_QUICKSTART.md`

### Generated Quickstart Guide

When you run `goa gen`, Goa-AI automatically generates an `AGENTS_QUICKSTART.md` file at your module root. This contextual guide is tailored to your specific design and includes:

- A summary of all agents and their configurations
- Ready-to-run code snippets with your actual package imports
- Tool wiring examples specific to your toolsets
- Agent-as-tool registration patterns for exported toolsets

The generated guide is safe to delete—it will be regenerated on the next `goa gen` run. To opt out of generating this file, add `DisableAgentDocs()` to your API design:

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

### Implement a Simple Planner

Create `cmd/demo/main.go` with a minimal planner:

```go
package main

import (
    "context"
    "fmt"

    chat "example.com/quickstart/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

// A simple planner: always replies, no tools (great for first run)
type StubPlanner struct{}

func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Hello from Goa-AI!"}},
            },
        },
    }, nil
}

func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Done."}},
            },
        },
    }, nil
}

func main() {
    // 1) Runtime (uses in-memory engine by default)
    rt := runtime.New()

    // 2) Register generated agent with our planner
    if err := chat.RegisterChatAgent(context.Background(), rt, chat.ChatAgentConfig{
        Planner: &StubPlanner{},
    }); err != nil {
        panic(err)
    }

    // 3) Run it using the generated typed client
    client := chat.NewClient(rt)
    out, err := client.Run(context.Background(),
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Say hi"}},
        }},
        runtime.WithSessionID("session-1"),
    )
    if err != nil {
        panic(err)
    }
    fmt.Println("RunID:", out.RunID)
    // out.Final contains the assistant message
    if out.Final != nil && len(out.Final.Parts) > 0 {
        if tp, ok := out.Final.Parts[0].(model.TextPart); ok {
            fmt.Println("Assistant:", tp.Text)
        }
    }
}
```

### Run the Demo

Execute your first agent:

```bash
go run ./cmd/demo
```

Expected output:

```
RunID: orchestrator.chat-...
Assistant: Hello from Goa-AI!
```

### Understanding What Happened

1. **Design**: You declared an agent with a toolset in Goa's DSL
2. **Code Generation**: Goa-AI generated typed agent packages, tool specs, and codecs
3. **Runtime**: The runtime orchestrated the plan/execute loop
4. **Planner**: Your planner decided to return a final response (no tools called)

### Optional: Temporal Setup

For durable workflows, you can use Temporal instead of the in-memory engine:

```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
// Rest of the code remains the same
```

Start Temporal dev server:

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

The rest of your code remains identical—the runtime abstracts the engine differences.

---

## Next Steps

- Learn about the [DSL Reference](./dsl-reference/) to understand all available DSL functions
- Explore [Runtime Concepts](./runtime/) to understand how the runtime works
- Follow the [Agent Composition](./agent-composition/) guide to build multi-agent systems
