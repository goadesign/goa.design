---
title: "Quickstart"
linkTitle: "Quickstart"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

This guide takes you from an empty module to a generated, runnable Goa-AI agent.
The generated example uses the in-memory engine, so you do not need Temporal,
MongoDB, Redis, or a model API key for the first run.

You will build:

1. A Goa design with one agent, one typed tool, and one typed direct completion.
2. Generated agent, toolset, completion, and runtime wiring code.
3. A runnable example scaffold with a stub planner you can replace with a model-backed planner.
4. The first production hooks: explicit sessions, generated tool executors, streaming, and model registration.

---

## 1. Create a Module

```bash
go install goa.design/goa/v3/cmd/goa@latest

mkdir quickstart && cd quickstart
go mod init example.com/quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
mkdir design
```

Goa-AI currently targets modern Go. Use the Go version declared by the
`goa.design/goa-ai` module or newer.

---

## 2. Define the Agent

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
	Example(map[string]any{"text": "Tokyo is the capital of Japan."})
	Required("text")
})

var TaskDraft = Type("TaskDraft", func() {
	Attribute("name", String, "Task name")
	Attribute("goal", String, "Outcome-style goal")
	Required("name", "goal")
})

var _ = Service("orchestrator", func() {
	Completion("draft_task", "Produce a task draft directly", func() {
		Return(TaskDraft)
	})

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

This is the source of truth. Tools and completions reuse normal Goa types,
descriptions, examples, and validations. The model-facing schemas, typed codecs,
and runtime contracts are generated from this design.

---

## 3. Generate Code and Example

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
go run ./cmd/orchestrator
```

Expected shape:

```text
RunID: orchestrator-chat-...
Assistant: Hello from example planner.
Completion draft_task: ...
Completion stream draft_task: ...
```

`goa gen` creates generated contracts. `goa example` creates application-owned
scaffold:

- `gen/`: generated code. Do not edit this directory by hand.
- `cmd/orchestrator/main.go`: runnable example entry point.
- `internal/agents/bootstrap/bootstrap.go`: runtime construction and agent registration.
- `internal/agents/chat/planner/planner.go`: stub planner to replace.
- `gen/orchestrator/completions/`: typed direct-completion helpers.

Regenerate after DSL changes. Re-run `goa example` when you want scaffold
updates, then keep application edits in `cmd/` and `internal/`.

---

## 4. Understand the Runtime Loop

**The plan/execute loop:**

1. `PlanStart` receives the initial user messages.
2. The planner returns a `FinalResponse`, tool calls, or an await request.
3. The runtime validates and executes admitted tool calls using generated specs and registered executors.
4. `PlanResume` receives planner-visible tool outputs.
5. The loop repeats until the planner returns a final response, a terminal tool result, or the runtime enforces caps/time budgets.

The generated example starts with a stub planner so this flow is visible before
you connect a model. A real planner follows the same contract; it just delegates
the decision to a model client.

---

## 5. Call the Agent from Code

Generated agent packages expose typed clients. Sessionful runs require an
explicit session; one-shot runs are intentionally sessionless.

```go
rt, cleanup, err := bootstrap.New(ctx)
if err != nil {
	log.Fatal(err)
}
defer cleanup()

if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
	log.Fatal(err)
}

client := chat.NewClient(rt)
out, err := client.Run(ctx, "session-1", []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Hello"}},
}})
if err != nil {
	log.Fatal(err)
}
fmt.Println(out.RunID)

out, err = client.OneShotRun(ctx, []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Summarize this document"}},
}})
```

Use `Run` or `Start` for conversational/sessionful work. Use `OneShotRun` or
`StartOneShot` for request/response jobs that should be observable by `RunID`
but should not belong to a session.

---

## 6. Implement a Tool Executor

Generated agent packages include a `RegisterUsedToolsets` helper for local
toolsets. Executors receive explicit run metadata and return a runtime-owned
execution result:

```go
type HelpersExecutor struct{}

func (e *HelpersExecutor) Execute(
	ctx context.Context,
	meta *runtime.ToolCallMeta,
	call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
	switch call.Name {
	case helpers.Answer:
		args, err := helpers.UnmarshalAnswerPayload(call.Payload)
		if err != nil {
			return runtime.Executed(&planner.ToolResult{
				Name:  call.Name,
				Error: planner.NewToolError("invalid answer payload"),
			}), nil
		}
		return runtime.Executed(&planner.ToolResult{
			Name:   call.Name,
			Result: &helpers.AnswerResult{Text: "Answer: " + args.Question},
		}), nil
	default:
		return runtime.Executed(&planner.ToolResult{
			Name:  call.Name,
			Error: planner.NewToolError("unknown tool"),
		}), nil
	}
}

if err := chat.RegisterUsedToolsets(ctx, rt, chat.WithHelpersExecutor(&HelpersExecutor{})); err != nil {
	log.Fatal(err)
}
```

The runtime validates payload JSON with generated codecs before execution,
encodes successful results with generated result codecs, records canonical run
events, and passes planner-visible outputs to `PlanResume`.

---

## 7. Connect a Model

Register provider clients with the runtime, then access them from planners by ID.
For streaming planners, prefer `PlannerModelClient`; it owns assistant/thinking
and usage event emission.

```go
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
	APIKey:       os.Getenv("OPENAI_API_KEY"),
	DefaultModel: "gpt-5-mini",
	HighModel:    "gpt-5",
	SmallModel:   "gpt-5-nano",
})
if err != nil {
	log.Fatal(err)
}
if err := rt.RegisterModel("default", modelClient); err != nil {
	log.Fatal(err)
}
```

Planner sketch:

```go
func (p *Planner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
	mc, ok := in.Agent.PlannerModelClient("default")
	if !ok {
		return nil, errors.New("model client default is not registered")
	}

	summary, err := mc.Stream(ctx, &model.Request{
		Messages: in.Messages,
		Tools:    in.Agent.AdvertisedToolDefinitions(),
		Stream:   true,
	})
	if err != nil {
		return nil, err
	}
	if len(summary.ToolCalls) > 0 {
		return &planner.PlanResult{ToolCalls: summary.ToolCalls}, nil
	}
	return &planner.PlanResult{
		FinalResponse: &planner.FinalResponse{
			Message: &model.Message{
				Role:  model.ConversationRoleAssistant,
				Parts: []model.Part{model.TextPart{Text: summary.Text}},
			},
		},
		Streamed: true,
	}, nil
}
```

Use `in.Agent.ModelClient("default")` when you need raw stream control and pair
it with `planner.ConsumeStream`. Choose one stream owner per planner turn.

---

## 8. Add Streaming

Goa-AI emits typed stream events for assistant text, tool starts/ends, workflow
status, awaits, usage, and child run links. Wire any `stream.Sink`:

```go
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
	switch e := event.(type) {
	case stream.AssistantReply:
		fmt.Print(e.Data.Text)
	case stream.ToolStart:
		fmt.Printf("tool_start: %s\n", e.Data.ToolName)
	case stream.ToolEnd:
		fmt.Printf("tool_end: %s\n", e.Data.ToolName)
	case stream.Workflow:
		fmt.Printf("workflow: %s\n", e.Data.Phase)
	}
	return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
```

For production UIs, publish to Pulse and subscribe to the session stream
(`session/<session_id>`). Close the user connection when you observe
`run_stream_end` for the active run.

---

## 9. Use Typed Direct Completions

`Completion(...)` is for structured assistant output that is not a tool call.
Generated helpers request provider-enforced structured output and decode through
generated codecs:

```go
resp, err := completions.CompleteDraftTask(ctx, modelClient, &model.Request{
	Messages: []*model.Message{{
		Role:  model.ConversationRoleUser,
		Parts: []model.Part{model.TextPart{Text: "Draft a task for launch readiness."}},
	}},
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(resp.Value.Name)
```

Completion names are part of the structured-output contract: 1-64 ASCII
characters, letters/digits/`_`/`-`, starting with a letter or digit. Streaming
completion helpers expose preview `completion_delta` chunks and decode only the
final canonical `completion` chunk.

---

## 10. Compose Agents

Agents can export toolsets that other agents use. Nested agents run as child
workflows with their own `RunID`, and streams emit `child_run_linked` so UIs can
render run trees.

```go
Agent("researcher", "Research specialist", func() {
	Export("research", func() {
		Tool("deep_search", "Perform deep research", func() {
			Args(ResearchRequest)
			Return(ResearchReport)
		})
	})
})

Agent("coordinator", "Delegates specialist work", func() {
	Use(AgentToolset("orchestrator", "researcher", "research"))
})
```

Each agent keeps its own planner, tools, policy, and run log. The parent sees a
normal tool result with a `RunLink` to the child run.

---

## What You Built

- A design-first agent with schema-validated tools.
- Generated payload/result codecs and model-facing JSON schemas.
- A typed direct completion contract.
- A generated runtime client with sessionful and one-shot execution.
- A path to model-backed planning, streaming UIs, and agent composition.

For production, add the Temporal engine for durability, Mongo-backed stores for
memory/session/run logs, Pulse for distributed streaming, and model middleware
for provider rate limits. The Goa design remains the source of truth.

---

## Next Steps

| Guide | What You'll Learn |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | All DSL functions: policies, MCP, registries |
| [Runtime](runtime/) | Plan/execute loop, engines, memory stores |
| [Toolsets](toolsets/) | Service-backed tools, transforms, executors |
| [Agent Composition](agent-composition/) | Deep dive on agent-as-tool patterns |
| [Production](production/) | Temporal setup, streaming to UIs, rate limiting |
