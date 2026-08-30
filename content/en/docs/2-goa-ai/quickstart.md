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
GOPROXY=direct go install goa.design/goa/v3/cmd/goa@fix/goa-generation-plan

mkdir quickstart && cd quickstart
go mod init example.com/quickstart
GOPROXY=direct go get goa.design/goa/v3@fix/goa-generation-plan goa.design/goa-ai@main
mkdir design
```

These branch names select the integrated runtime storage contract used by this
guide. The direct proxy setting is needed because the Goa preview branch name
contains a slash. Go records exact pseudo-versions in `go.mod`, so later branch
updates do not change an existing build until you run `go get` again.

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
			DefaultCaps(MaxToolCalls(2), MaxRecoveryTurns(1))
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
Assistant: Tool helpers.answer returned {"text":"Tokyo is the capital of Japan."}
Completion draft_task: ...
Completion stream draft_task: ...
```

When the design has an authored payload example and either an authored result
example or no result, the scaffold planner demonstrates that tool. If no tool
has a usable example, it returns the greeting instead.

`goa gen` always refreshes generated contracts and
`AGENTS_QUICKSTART.md` (unless `DisableAgentDocs()` is set). `goa example`
creates application-owned files only when they do not already exist:

- `gen/`: generated code. Do not edit this directory by hand.
- `cmd/orchestrator/main.go`: runnable example entry point (create-once).
- `internal/agents/bootstrap/bootstrap.go`: runtime construction and agent registration (create-once).
- `internal/agents/chat/planner/planner.go`: stub planner to replace (create-once).
- `internal/agents/chat/toolsets/helpers/execute.go`: example executor (create-once).
- `gen/orchestrator/completions/`: typed direct-completion helpers.
- `AGENTS_QUICKSTART.md`: regenerated implementation guide at the module root.

Each create-once file states that the application owns later edits. Rerunning
`goa example` does not overwrite it. Update application scaffolds manually, or
delete a file before rerunning if you intentionally want a fresh stub.

---

## 4. Understand the Runtime Loop

**The plan/execute loop:**

1. `PlanStart` receives the initial user messages.
2. The planner returns a `FinalResponse`, tool calls, or an await request.
3. The runtime validates and executes admitted tool calls using generated specs and registered executors.
4. `PlanResume` receives planner-visible tool outputs.
5. The loop repeats until the planner returns a final response, a terminal tool result, or the runtime enforces caps/time budgets.

When caps or deadlines force finalization, a planner can still close the run by
returning terminal bookkeeping tools. The runtime executes only
`TerminalRun()` tools in that path (`TerminalRun()` implies bookkeeping) and
requires them to succeed before the run is considered closed.

The generated example starts with a stub planner so this flow is visible before
you connect a model. When a tool has an authored payload example, `PlanStart`
constructs the call with `planner.NewToolRequest(gentool.<Tool>Tool(), args)`.
`PlanResume` checks `ToolOutput.Failure` and formats the successful canonical
tool JSON into the final assistant message. A no-result tool succeeds with an
empty result. A real planner follows the same contract; it delegates the
semantic decision to a model client.

---

## 5. Call the Agent from Code

Generated agent packages expose typed clients. Sessionful runs require an
explicit session; one-shot runs are intentionally sessionless.

```go
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
	log.Fatal(err)
}

rt, cleanup, err := bootstrap.New(ctx, store)
if err != nil {
	log.Fatal(err)
}
defer cleanup()

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

The generated local scaffold accepts a `storage.Store` and uses
`runtime/agent/storage/inmem` in the example command. A production application
passes an adapter for the service that owns its runtime database. That service,
not an agent worker, creates and ends sessions.

---

## 6. Implement a Tool Executor

Generated agent packages include a `RegisterUsedToolsets` helper for local
toolsets. Executors receive explicit run metadata and return a runtime-owned
execution result. Each toolset specs package also exports one typed descriptor
per tool (here `helpers.AnswerTool`) that pairs the tool identifier with its
generated payload and result codecs, so decoding is compile-checked — no type
assertions, no restating the name-to-codec pairing the design already fixed:

```go
type HelpersExecutor struct{}

func (e *HelpersExecutor) Execute(
	ctx context.Context,
	meta *runtime.ToolCallMeta,
	call *runtime.ToolCall,
) (*runtime.ToolExecutionResult, error) {
	switch call.Name {
	case helpers.Answer:
		args, err := helpers.AnswerTool().Payload.FromJSON(call.Payload)
		if err != nil {
			return nil, fmt.Errorf("decode admitted %s payload: %w", call.Name, err)
		}
		return runtime.Executed(&planner.ToolResult{
			Name:   call.Name,
			Result: &helpers.AnswerResult{Text: "Answer: " + args.Question},
		}), nil
	default:
		return runtime.Executed(&planner.ToolResult{
			Name: call.Name,
			Failure: &planner.ToolFailure{
				Kind:     planner.FailureInvalidCall,
				Error:    planner.NewToolError("unknown tool"),
				Recovery: planner.RecoveryDirective{Action: planner.RecoveryReplan},
			},
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
and usage event emission. This example uses OpenAI; see
[Runtime → LLM Integration](./runtime/#llm-integration) for AWS Bedrock and
Google Vertex AI (Gemini and Claude-on-Vertex) equivalents.

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
	final := summary.FinalResponse()
	if final == nil {
		return nil, errors.New("model stream ended without a canonical response")
	}
	return &planner.PlanResult{
		FinalResponse: final,
		Streamed: true,
	}, nil
}
```

Use `in.Agent.ModelClient("default")` when you need to drain the validated
stream yourself with `planner.ConsumeStream(ctx, stream)`. Choose one stream
owner per planner turn. Provider constructors return opaque clients whose
responses are validated before planner code receives them.

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

rt := runtime.New(runtimeStore, runtime.WithStream(&ConsoleSink{}))
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
completion helpers return `completion.Streamer[T]`: read preview fragments with
`Recv`, drain to `io.EOF`, and then read the accepted typed value with
`Value()`. There is no public decoder for unchecked chunks.

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

Each agent keeps its own planner, tools, and policy. The host runtime store
records every root and child run, including the parent link. The parent sees a
normal tool result with a `RunLink` to the child run.

---

## What You Built

- A design-first agent with schema-validated tools.
- Generated payload/result codecs, typed per-tool descriptors, and model-facing JSON schemas.
- A typed direct completion contract.
- A generated runtime client with sessionful and one-shot execution.
- A path to model-backed planning, streaming UIs, agent composition, and
  generated evaluation suites (declare a `Suite` in the design; see
  [Evaluations](evaluations/)).

For production, add the Temporal engine for durability, one host-owned runtime
store, a product-owned memory store when needed, Pulse for distributed
streaming, and model middleware for provider rate limits. The Goa design
remains the source of truth.

---

## Next Steps

| Guide | What You'll Learn |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | All DSL functions: policies, MCP, registries |
| [Runtime](runtime/) | Plan/execute loop, engines, memory stores |
| [Toolsets](toolsets/) | Service-backed tools, transforms, executors |
| [Agent Composition](agent-composition/) | Deep dive on agent-as-tool patterns |
| [Evaluations](evaluations/) | Generated eval suites, evidence collection, LLM judge |
| [Production](production/) | Temporal setup, streaming to UIs, rate limiting |
