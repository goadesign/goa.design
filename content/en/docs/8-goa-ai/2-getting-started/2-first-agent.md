---
title: "Your First Agent"
linkTitle: "Your First Agent"
weight: 2
description: "Create your first agent with Goa-AI in minutes."
---

This guide walks you through creating your first agent with Goa-AI. You'll build a simple Q&A assistant that can answer questions using a helper toolset.

## Scaffold a Fresh Project

Create a new project directory:

```bash
mkdir -p $GOPATH/src/example.com/quickstart && cd $_
go mod init example.com/quickstart
go get goa.design/goa/v3@latest
go get goa.design/goa-ai@latest
```

## Add a Design

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

## Generate Code

Run the Goa code generator:

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
```

This creates:
- Generated agent packages under `gen/orchestrator/agents/chat/`
- Tool specs and codecs under `gen/orchestrator/agents/chat/specs/`
- Runnable examples under `cmd/orchestrator/`

## Implement a Simple Planner

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

## Run the Demo

Execute your first agent:

```bash
go run ./cmd/demo
```

Expected output:

```
RunID: orchestrator.chat-...
Assistant: Hello from Goa-AI!
```

## Understanding What Happened

1. **Design**: You declared an agent with a toolset in Goa's DSL
2. **Code Generation**: Goa-AI generated typed agent packages, tool specs, and codecs
3. **Runtime**: The runtime orchestrated the plan/execute loop
4. **Planner**: Your planner decided to return a final response (no tools called)

## Next Steps

Now that you have a working agent, you can:

- Learn about the [DSL Reference](../3-concepts/1-dsl/) to understand all available DSL functions
- Explore [Runtime Concepts](../3-concepts/2-runtime/) to understand how the runtime works
- Follow the [Simple Agent Tutorial](../4-tutorials/1-simple-agent/) to build a more complete agent with tool execution

## Optional: Temporal Setup

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

