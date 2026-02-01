---
title: "Quickstart"
linkTitle: "Quickstart"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

{{< alert title="Tested Example" color="info" >}}
This code is tested in CI. If something doesn't work, [file an issue](https://github.com/goadesign/goa-ai/issues).
{{< /alert >}}

In the next 10 minutes, you'll build a production-ready agentic system from scratch. Type-safe tools, real-time streaming, automatic validation with self-healing retries, LLM integration, and agent composition—all from a declarative DSL. Pretty cool stuff.

**What you'll build:**

1. **Stub agent** — understand the plan/execute loop (3 min)
2. **Streaming** — see events as they happen
3. **Validation** — automatic retry on bad input
4. **Real LLM** — connect OpenAI or Claude
5. **Agent composition** — agents calling agents

By the end, you'll have a type-safe agent with validated tools, real-time streaming, and the foundation for production deployment.

---

## Prerequisites

```bash
# Go 1.24+
go version

# Install Goa CLI
go install goa.design/goa/v3/cmd/goa@latest
```

---

## Step 1: Project Setup

```bash
mkdir quickstart && cd quickstart
go mod init quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
```

Create `design/design.go`. This file defines your agent and its tools using Goa's DSL. Think of it as a contract: what the agent can do, what inputs it accepts, and what outputs it returns.

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Service groups related agents and methods
var _ = Service("demo", func() {
    // Agent defines an AI agent with a name and description
    Agent("assistant", "A helpful assistant", func() {
        // Use declares a toolset the agent can access
        Use("weather", func() {
            // Tool defines a capability the LLM can invoke
            Tool("get_weather", "Get current weather", func() {
                // Args defines the input schema (what the LLM sends)
                Args(func() {
                    Attribute("city", String, "City name")
                    Required("city")
                })
                // Return defines the output schema (what the tool returns)
                Return(func() {
                    Attribute("temperature", Int, "Temperature in Celsius")
                    Attribute("conditions", String, "Weather conditions")
                    Required("temperature", "conditions")
                })
            })
        })
    })
})
```

Generate code:

```bash
goa gen quickstart/design
```

This creates a `gen/` directory with:
- **Agent registration helpers** — wire your agent to the runtime
- **Tool specs and codecs** — type-safe payload/result handling
- **JSON schemas** — for LLM tool definitions

Never edit files in `gen/`—they're regenerated on every `goa gen` run.

---

## Step 2: Run with a Stub Planner

Before connecting a real LLM, let's understand how Goa-AI agents work using a stub planner. This makes the flow explicit and helps you debug issues later.

**The plan/execute loop:**
1. Runtime calls `PlanStart` with the user's message
2. Planner returns either a final response or tool calls
3. If tools were called, runtime executes them and calls `PlanResume` with results
4. Loop continues until planner returns a final response

Create `main.go`:

```go
package main

import (
    "context"
    "fmt"

    // Generated package for our assistant agent
    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

// StubPlanner implements the planner.Planner interface.
// A real planner would call an LLM; this one hardcodes the flow.
type StubPlanner struct{}

// PlanStart is called with the initial user message.
// Return ToolCalls to invoke tools, or FinalResponse to end the run.
func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // Request a tool call: "toolset.tool_name" format
    return &planner.PlanResult{
        ToolCalls: []*planner.ToolCall{{
            Name:    "weather.get_weather",        // toolset.tool format
            Payload: []byte(`{"city": "Tokyo"}`),  // JSON matching Args schema
        }},
    }, nil
}

// PlanResume is called after tools execute, with their results in in.Messages.
// Decide: call more tools, or return a final response.
func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // We have tool results; return final answer
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Tokyo is 22°C and sunny!"}},
            },
        },
    }, nil
}

// StubExecutor implements runtime.Executor.
// Called when the planner requests a tool. Returns the tool's result.
type StubExecutor struct{}

func (e *StubExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    // Return data matching the Return schema defined in the DSL
    return &planner.ToolResult{
        Name:   req.Name,
        Result: map[string]any{"temperature": 22, "conditions": "Sunny"},
    }, nil
}

func main() {
    ctx := context.Background()

    // Create runtime with in-memory engine (no external dependencies)
    rt := runtime.New()
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    // Register the agent with its planner and executor
    err := assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &StubPlanner{},
        Executor: &StubExecutor{},
    })
    if err != nil {
        panic(err)
    }

    // Create a typed client for the agent
    client := assistant.NewClient(rt)

    // Start a run with a user message
    out, err := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather?"}},
    }})
    if err != nil {
        panic(err)
    }

    // Print the result
    fmt.Println("RunID:", out.RunID)
    if out.Final != nil {
        for _, p := range out.Final.Parts {
            if tp, ok := p.(model.TextPart); ok {
                fmt.Println("Assistant:", tp.Text)
            }
        }
    }
}
```

Run:

```bash
go mod tidy && go run main.go
```

Output:
```
RunID: demo.assistant-abc123
Assistant: Tokyo is 22°C and sunny!
```

**What happened:**
1. Runtime called `PlanStart` → planner requested `get_weather` tool
2. Runtime executed the tool via `StubExecutor`
3. Runtime called `PlanResume` with tool results → planner returned final response

The stub planner hardcodes this flow, but a real LLM planner follows the same pattern—it just decides dynamically based on the conversation.

---

## Step 3: Add Streaming

Agents can be opaque. Streaming events let you see exactly what's happening—useful for debugging and building real-time UIs.

Goa-AI emits typed events throughout execution: `ToolStart`, `ToolEnd`, `Workflow` phase changes, `AssistantReply` chunks, and more. You consume them via a `Sink` interface.

See events as they happen:

```go
package main

import (
    "context"
    "fmt"

    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

// Same stub planner as before
type StubPlanner struct{}

func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        ToolCalls: []*planner.ToolCall{{Name: "weather.get_weather", Payload: []byte(`{"city":"Tokyo"}`)}},
    }, nil
}

func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Tokyo is 22°C and sunny!"}},
            },
        },
    }, nil
}

type StubExecutor struct{}

func (e *StubExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    return &planner.ToolResult{Name: req.Name, Result: map[string]any{"temperature": 22, "conditions": "Sunny"}}, nil
}

// ConsoleSink implements stream.Sink to receive events.
// Events are typed—switch on the concrete type to handle each kind.
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
    // Type switch on event to handle different event kinds
    switch e := event.(type) {
    case stream.ToolStart:
        fmt.Printf("🔧 Tool: %s\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Printf("✅ Done: %s\n", e.Data.ToolName)
    case stream.Workflow:
        fmt.Printf("📋 %s\n", e.Data.Phase)
    // Other events: AssistantReply, PlannerThought, UsageDelta, etc.
    }
    return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

func main() {
    ctx := context.Background()

    // Pass the sink to the runtime—all events flow through it
    rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    _ = assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &StubPlanner{},
        Executor: &StubExecutor{},
    })

    client := assistant.NewClient(rt)
    out, _ := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather?"}},
    }})

    fmt.Println("\nRunID:", out.RunID)
}
```

Output:
```
📋 started
🔧 Tool: weather.get_weather
✅ Done: weather.get_weather
📋 completed

RunID: demo.assistant-abc123
```

---

## Step 4: Add Validation

LLMs make mistakes. They'll send empty strings, invalid enum values, or malformed JSON. Without validation, these errors crash your tools or produce garbage results.

Goa-AI validates tool payloads at the boundary—before your executor runs. Invalid calls return a `RetryHint` that the planner can use to self-correct. This happens automatically; you just define the constraints.

Update `design/design.go` with constraints:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("demo", func() {
    Agent("assistant", "A helpful assistant", func() {
        Use("weather", func() {
            Tool("get_weather", "Get current weather", func() {
                Args(func() {
                    // MinLength/MaxLength: string length constraints
                    Attribute("city", String, "City name", func() {
                        MinLength(2)   // Rejects "" or "X"
                        MaxLength(100) // Rejects very long strings
                    })
                    // Enum: only these values are valid
                    Attribute("units", String, "Temperature units", func() {
                        Enum("celsius", "fahrenheit") // Rejects "kelvin"
                    })
                    Required("city") // city must be present
                })
                Return(func() {
                    Attribute("temperature", Int, "Temperature")
                    Attribute("conditions", String, "Weather conditions")
                    Required("temperature", "conditions")
                })
            })
        })
    })
})
```

Regenerate:

```bash
goa gen quickstart/design
```

Now if a planner sends `{"city": ""}` or `{"units": "kelvin"}`:

1. **Rejected** at the boundary (before executor runs)
2. **RetryHint** returned with validation error
3. Planner can **auto-correct** and retry

Here's what the runtime returns when validation fails:

```go
// When the LLM sends invalid input like {"city": "", "units": "kelvin"}
// the runtime returns a ToolResult with RetryHint instead of calling your executor:
&planner.ToolResult{
    Name: "weather.get_weather",
    RetryHint: &planner.RetryHint{
        Message: `validation failed: city length must be >= 2; units must be one of ["celsius", "fahrenheit"]`,
    },
}

// The planner sees this error and can retry with corrected input.
// With real LLMs, this self-correction happens automatically—
// the model reads the error, understands what went wrong, and fixes it.
```

No crashes. No manual parsing. The LLM sees a clear error message and fixes it on the next attempt.

---

## Step 5: Real LLM

Now let's replace the stub with a real LLM. The planner's job is to:
1. Build a request with the conversation history and available tools
2. Send it to the model
3. Interpret the response—either tool calls or a final answer

The runtime handles everything else: tool execution, validation, retries, and streaming.

Connect to OpenAI or Claude. First, create a real planner that uses the model client:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "os"

    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/features/model/openai"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

// RealPlanner calls an actual LLM instead of hardcoding responses.
// It retrieves the model client from the runtime by ID.
type RealPlanner struct {
    systemPrompt string
}

func (p *RealPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // Get the model client by the ID we registered it with
    client, ok := in.Agent.ModelClient("openai")
    if !ok {
        return nil, fmt.Errorf("no model client")
    }

    // Build messages: system prompt first, then user messages
    msgs := append([]*model.Message{{
        Role:  model.ConversationRoleSystem,
        Parts: []model.Part{model.TextPart{Text: p.systemPrompt}},
    }}, in.Messages...)

    // Call the LLM with messages and available tools
    // in.Tools contains the JSON schemas generated from your DSL
    resp, err := client.Complete(ctx, &model.Request{
        Messages: msgs,
        Tools:    in.Tools,
    })
    if err != nil {
        return nil, err
    }

    return interpretResponse(resp)
}

func (p *RealPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    client, ok := in.Agent.ModelClient("openai")
    if !ok {
        return nil, fmt.Errorf("no model client")
    }

    // in.Messages now includes tool results from the previous turn
    msgs := append([]*model.Message{{
        Role:  model.ConversationRoleSystem,
        Parts: []model.Part{model.TextPart{Text: p.systemPrompt}},
    }}, in.Messages...)

    resp, err := client.Complete(ctx, &model.Request{
        Messages: msgs,
        Tools:    in.Tools,
    })
    if err != nil {
        return nil, err
    }

    return interpretResponse(resp)
}

// interpretResponse converts the LLM response to a PlanResult.
// If the LLM requested tools, return ToolCalls. Otherwise, return FinalResponse.
func interpretResponse(resp *model.Response) (*planner.PlanResult, error) {
    if len(resp.Content) == 0 {
        return nil, fmt.Errorf("empty response")
    }

    msg := resp.Content[len(resp.Content)-1]
    var toolCalls []*planner.ToolCall

    // Check each part of the response for tool calls or text
    for _, part := range msg.Parts {
        switch p := part.(type) {
        case model.ToolUsePart:
            // LLM wants to call a tool—convert to ToolCall
            payload, _ := json.Marshal(p.Input)
            toolCalls = append(toolCalls, &planner.ToolCall{
                Name:    p.Name,
                Payload: payload,
            })
        case model.TextPart:
            // Text response (used if no tool calls)
        }
    }

    // If tools were requested, return them for execution
    if len(toolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: toolCalls}, nil
    }

    // No tools—this is the final answer
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{Message: &msg},
    }, nil
}

type WeatherExecutor struct{}

func (e *WeatherExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    // Real implementation would call a weather API here
    return &planner.ToolResult{
        Name:   req.Name,
        Result: map[string]any{"temperature": 22, "conditions": "Sunny"},
    }, nil
}

// ConsoleSink streams assistant text to the console in real-time
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case *stream.ToolStart:
        fmt.Printf("🔧 Tool: %s\n", e.Data.ToolName)
    case *stream.AssistantReply:
        // Print text chunks as they arrive (streaming output)
        fmt.Print(e.Data.Text)
    }
    return nil
}
func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

func main() {
    ctx := context.Background()

    // --- OpenAI ---
    modelClient, err := openai.NewFromAPIKey(os.Getenv("OPENAI_API_KEY"), "gpt-4o")
    if err != nil {
        panic(err)
    }

    // --- Claude via Bedrock (uncomment to use instead) ---
    // import "goa.design/goa-ai/features/model/bedrock"
    //
    // bedrockClient, err := bedrock.New(bedrock.Options{
    //     Region: "us-east-1",
    //     Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    // })
    // if err != nil {
    //     panic(err)
    // }
    // // Then use: runtime.WithModelClient("claude", bedrockClient)
    // // And in planner: in.Agent.ModelClient("claude")

    // Create runtime with streaming and model client
    // The ID ("openai") is how the planner retrieves it
    rt := runtime.New(
        runtime.WithStream(&ConsoleSink{}),
        runtime.WithModelClient("openai", modelClient),
    )
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    // Register the agent with the real planner
    err = assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &RealPlanner{systemPrompt: "You are a helpful weather assistant."},
        Executor: &WeatherExecutor{},
    })
    if err != nil {
        panic(err)
    }

    // Run the agent
    client := assistant.NewClient(rt)
    out, err := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather in Paris?"}},
    }})
    if err != nil {
        panic(err)
    }

    fmt.Println("\n\nRunID:", out.RunID)
}
```

Run with your API key:

```bash
export OPENAI_API_KEY="sk-..."
go run main.go
```

All model adapters implement the same `model.Client` interface, so switching between OpenAI, Claude, or other providers is just a configuration change—your planner code stays the same.

---

## Step 6: Agent Composition

Real-world AI systems aren't single agents—they're specialists working together. A research agent gathers data, an analyst interprets it, a writer formats the output.

Goa-AI supports this natively with **agent-as-tool**. Any agent can expose capabilities that other agents invoke as tools. The nested agent runs with its own planner and tools, but within the parent's workflow—single transaction, unified history, full traceability.

Agents can call other agents as tools. Add to `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Weather specialist agent—has its own tools and planner
var _ = Service("weather", func() {
    Agent("forecaster", "Weather specialist", func() {
        // Internal tools only this agent can use
        Use("weather_tools", func() {
            Tool("get_forecast", "Get forecast", func() {
                Args(func() {
                    Attribute("city", String, "City")
                    Required("city")
                })
                Return(func() {
                    Attribute("forecast", String, "Forecast")
                    Required("forecast")
                })
            })
        })

        // Export makes this agent callable as a tool by other agents.
        // The exported toolset defines the interface other agents see.
        Export("ask_weather", func() {
            Tool("ask", "Ask weather specialist", func() {
                Args(func() {
                    Attribute("question", String, "Question")
                    Required("question")
                })
                Return(func() {
                    Attribute("answer", String, "Answer")
                    Required("answer")
                })
            })
        })
    })
})

// Main assistant uses the weather agent as a tool
var _ = Service("demo", func() {
    Agent("assistant", "A helpful assistant", func() {
        // UseAgentToolset imports an exported toolset from another agent.
        // Args: service name, agent name, exported toolset name
        UseAgentToolset("weather", "forecaster", "ask_weather")
    })
})
```

Regenerate:

```bash
goa gen quickstart/design
```

Now when the assistant needs weather info:
1. Assistant's planner decides to call `ask_weather`
2. Runtime invokes the weather agent as a child run
3. Weather agent runs its own plan/execute loop with its own tools
4. Weather agent returns its answer to the parent
5. Assistant's planner receives the result and continues

**Each agent has its own planner, tools, and context.** The runtime handles orchestration, and you get full visibility into both runs via streaming events.

---

## What You Built

✅ **Typed agent** with schema-validated tools  
✅ **Streaming events** for real-time visibility  
✅ **Validation** with automatic retry hints  
✅ **Real LLM** integration  
✅ **Agent composition** with run trees  

All from a declarative DSL. The design is your source of truth—change it, regenerate, and your types, schemas, and validation stay in sync automatically.

**What's running under the hood:**
- Generated codecs handle JSON serialization with proper types
- Validation runs at the boundary before your code executes
- The plan/execute loop manages state and retries
- Events stream to any sink you configure

This is the foundation. For production, you'll add Temporal for durability, Mongo for persistence, and Pulse for distributed streaming—but the agent code stays the same.

---

## Next Steps

| Guide | What You'll Learn |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | All DSL functions: policies, MCP, registries |
| [Runtime](runtime/) | Plan/execute loop, engines, memory stores |
| [Toolsets](toolsets/) | Service-backed tools, transforms, executors |
| [Agent Composition](agent-composition/) | Deep dive on agent-as-tool patterns |
| [Production](production/) | Temporal setup, streaming to UIs, rate limiting |
