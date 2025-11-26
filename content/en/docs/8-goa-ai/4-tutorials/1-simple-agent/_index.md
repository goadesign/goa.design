---
title: "Simple Agent Tutorial"
linkTitle: "Simple Agent"
weight: 1
description: "Build a simple agent with tool execution."
---

This tutorial walks you through building a simple agent that can execute tools. You'll learn how to define toolsets, implement executors, and wire everything together.

## What You'll Build

A Q&A agent that can answer questions using a helper toolset. The agent will:

1. Receive user questions
2. Call a tool to get answers
3. Return the results to the user

## Prerequisites

- Go 1.24+ installed
- Goa CLI installed (`go install goa.design/goa/v3/cmd/goa@latest`)
- Goa-AI added to your project (`go get goa.design/goa-ai`)

## Step 1: Design the Agent

Create `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

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

## Step 2: Generate Code

```bash
goa gen example.com/tutorial/design
goa example example.com/tutorial/design
```

## Step 3: Implement the Executor

Create `internal/agents/chat/toolsets/helpers/execute.go`:

```go
package helpers

import (
    "context"
    
    helpersspecs "example.com/tutorial/gen/orchestrator/agents/chat/specs/helpers"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    switch call.Name {
    case "orchestrator.helpers.answer":
        args, err := helpersspecs.UnmarshalAnswerPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error: planner.NewToolError("invalid payload"),
            }, nil
        }
        
        // Simple answer logic (replace with real implementation)
        answer := "The answer to '" + args.Question + "' is: This is a placeholder answer."
        
        return planner.ToolResult{
            Result: map[string]any{
                "text": answer,
            },
        }, nil
        
    default:
        return planner.ToolResult{
            Error: planner.NewToolError("unknown tool"),
        }, nil
    }
}
```

## Step 4: Wire the Runtime

Create `cmd/demo/main.go`:

```go
package main

import (
    "context"
    "fmt"
    
    chat "example.com/tutorial/gen/orchestrator/agents/chat"
    helpers "example.com/tutorial/internal/agents/chat/toolsets/helpers"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

type SimplePlanner struct{}

func (p *SimplePlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // For this tutorial, always call the answer tool
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{
            {
                Name:    "orchestrator.helpers.answer",
                Payload: []byte(`{"question": "What is the capital of Japan?"}`),
            },
        },
    }, nil
}

func (p *SimplePlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Return the tool result as the final answer
    if len(in.ToolResults) > 0 {
        result := in.ToolResults[0]
        if result.Error != nil {
            return &planner.PlanResult{
                FinalResponse: &planner.FinalResponse{
                    Message: &model.Message{
                        Role:  model.ConversationRoleAssistant,
                        Parts: []model.Part{model.TextPart{
                            Text: "Sorry, I encountered an error: " + result.Error.Message,
                        }},
                    },
                },
            }, nil
        }
        
        // Extract answer from result (result.Result is the decoded tool output)
        if m, ok := result.Result.(map[string]any); ok {
            text, _ := m["text"].(string)
            return &planner.PlanResult{
                FinalResponse: &planner.FinalResponse{
                    Message: &model.Message{
                        Role:  model.ConversationRoleAssistant,
                        Parts: []model.Part{model.TextPart{Text: text}},
                    },
                },
            }, nil
        }
    }
    
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "No results available"}},
            },
        },
    }, nil
}

func main() {
    rt := runtime.New()
    
    // Register the toolset executor
    reg := chat.NewChatHelpersToolsetRegistration(helpers.Execute)
    if err := rt.RegisterToolset(reg); err != nil {
        panic(err)
    }
    
    // Register the agent
    if err := chat.RegisterChatAgent(context.Background(), rt, chat.ChatAgentConfig{
        Planner: &SimplePlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Run the agent
    client := chat.NewClient(rt)
    out, err := client.Run(context.Background(), []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What is the capital of Japan?"}},
    }}, runtime.WithSessionID("session-1"))
    
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

## Step 5: Run

```bash
go run ./cmd/demo
```

Expected output:

```
RunID: orchestrator.chat-...
Assistant: The answer to 'What is the capital of Japan?' is: This is a placeholder answer.
```

## Next Steps

- Explore [Agent Composition](../2-agent-composition/) to learn about agent-as-tool patterns
- Learn about [MCP Integration](../3-mcp-toolsets/) for external tool suites
- Read the [Runtime Concepts](../../3-concepts/2-runtime/) to understand the execution flow

