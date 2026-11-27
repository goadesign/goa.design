---
title: "Goa-AI: agents from a design"
linkTitle: "Goa-AI"
weight: 2
description: "Design typed tools, MCP servers, and AI agent contracts in Go. Generate schemas and codecs, then run locally in memory or durably on Temporal."
llm_optimized: true
---

Goa-AI brings Goa's contract compiler to AI agents, MCP servers, and hosted tool registries. You define tool arguments, return types, prompt templates, and run policies in Go; `goa gen` produces JSON schemas, boundary validation codecs, service bindings, and **`AGENTS_QUICKSTART.md`**. Your code owns the planner and domain handlers.

- **Start locally (in-memory engine, no external infra):** **[Build your first agent](quickstart/)** (Go 1.27+, works standalone without a separate Goa service)
- **Only need an MCP server?** Jump straight to **[MCP integration](mcp-integration/)**
- **Using a coding agent?** Pair generated **`AGENTS_QUICKSTART.md`** with the **[coding-agent workflow](../ai-development/)**

## One contract to a running agent

### 1. Declare service, bound tool, and run policy (`design/catalog.go`)

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "tenant_id", String, "Caller tenant ID")
    Field(2, "sku", String, "Product SKU", func() {
        Pattern("^[A-Z0-9-]+$")
        Example("BOOK-1")
    })
    Required("tenant_id", "sku")
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product SKU", func() {
        Example("BOOK-1")
    })
    Field(2, "name", String, "Display name", func() {
        Example("The Go Book")
    })
    Field(3, "price_cents", Int, "Price in cents", func() {
        Example(3800)
    })
    Required("sku", "name", "price_cents")
})

var _ = Service("catalog", func() {
    Method("lookup", func() {
        Payload(LookupPayload)
        Result(Product)
    })

    Agent("assistant", "Answer product questions", func() {
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(6))
        })
        Use("catalog", func() {
            // Required tenant_id is hidden from the LLM JSON schema
            Tool("lookup", "Find a product by SKU", func() {
                BindTo("lookup")
                Inject("tenant_id")
            })
        })
    })
})
```

### 2. Generate schemas, bindings, and `AGENTS_QUICKSTART.md`

```bash
go mod init example.com/catalog && go get goa.design/goa-ai@v0.90.0
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy && go run ./cmd/catalog
```

Running `goa` via `go run` uses the exact generator version pinned in `go.mod` (no Node.js or API keys required; `goa example` scaffolds a runnable stub planner for local runs). `Inject("tenant_id")` strips `tenant_id` from the model-facing `gen/catalog/agents/assistant/specs/tool_schemas.json` while keeping `sku`'s regex rule:

```json
{
  "id": "catalog.lookup",
  "payload": {
    "schema": {
      "properties": {
        "sku": { "type": "string", "pattern": "^[A-Z0-9-]+$" }
      },
      "required": ["sku"]
    }
  },
  "hidden_fields": ["tenant_id"]
}
```

### 3. Wire the planner and run (In-Memory or Temporal)

`goa example example.com/catalog/design` scaffolds a runnable stub planner so you can run and test locally without model API keys. To connect a live model (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, Bedrock, or Vertex AI), implement `planner.Planner` (`PlanStart` and `PlanResume`):

```go
type CatalogPlanner struct{}

func (p *CatalogPlanner) PlanStart(
    ctx context.Context, in *planner.PlanInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) PlanResume(
    ctx context.Context, in *planner.PlanResumeInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) next(
    ctx context.Context,
    agent planner.PlannerContext,
    msgs []*model.Message,
) (*planner.PlanResult, error) {
    mc, ok := agent.PlannerModelClient("default")
    if !ok {
        return nil, errors.New(`model "default" is not registered`)
    }
    res, err := mc.Stream(ctx, &model.Request{
        Messages: msgs,
        Tools:    agent.AdvertisedToolDefinitions(),
        Stream:   true,
    })
    if err != nil {
        return nil, err
    }
    if len(res.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: res.ToolCalls}, nil
    }
    return &planner.PlanResult{FinalResponse: res.FinalResponse()}, nil
}
```

Register the agent and bound service executor (`inmem.New()` locally; `runtime.WithEngine(temporalEng)` in production) and supply `tenant_id` via `runtime.WithLabels`:

```go
rt := runtime.New(inmem.New())
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey: os.Getenv("OPENAI_API_KEY"), DefaultModel: "gpt-5-mini",
})
if err != nil {
    return err
}
if err := rt.RegisterModel("default", modelClient); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt,
    assistant.AssistantAgentConfig{Planner: &CatalogPlanner{}},
); err != nil {
    return err
}
// catalogClient is catalog.NewClient(...) wrapping your Goa endpoints
exec := assistantcatalog.NewAssistantCatalogExec(
    assistantcatalog.WithClient(catalogClient),
)
if err := assistant.RegisterUsedToolsets(
    ctx, rt, assistant.WithCatalogExecutor(exec),
); err != nil {
    return err
}

client := assistant.NewClient(rt)
msg := &model.Message{
    Role: model.ConversationRoleUser,
    Parts: []model.Part{
        model.TextPart{Text: "What does BOOK-1 cost?"},
    },
}
out, err := client.Run(ctx, "session-1", []*model.Message{msg},
    runtime.WithLabels(map[string]string{"tenant_id": "acme"}),
)
```

```text
tool_start: catalog.lookup {"sku":"BOOK-1"}  # tenant_id="acme" injected
tool_end:   {"sku":"BOOK-1","name":"The Go Book","price_cents":3800}
assistant:  BOOK-1 ("The Go Book") costs $38.00.
```

## Core capabilities

### Typed tool contracts & bounds {#design-first-agents}

Define tool inputs and outputs with Goa validations, `Inject("tenant_id")` for server-bound context fields hidden from the model, `BoundedResult` for cursor-paginated responses, and `Confirmation` for human approval gates before sensitive actions execute. See [Toolsets](toolsets/) and [Tool payload defaults](tool-payload-defaults/).

### Structured direct completions {#typed-direct-completions}

Declare `Completion(...)` when a service needs a schema-validated typed response from a model without a multi-turn tool loop. Generated unary and streaming helpers decode and validate the output. See [DSL reference](dsl-reference/) and [Runtime](runtime/).

### MCP servers & hosted tool registries {#tool-registries}

- **MCP servers (`MCP(...)`)**: Expose Goa service methods as MCP tools, resources, and prompt templates over HTTP without running an agent runtime. See [MCP integration](mcp-integration/).
- **Tool registry & search**: Run the included Redis/[Pulse](../3-ecosystem/pulse/)-backed registry gateway so agents discover schemas dynamically across services instead of stuffing every tool schema into every prompt. See [Registry](registry/) and [Tool search](tool-search/).

### Agent composition & run trees {#run-trees-composition}

Export an agent as a tool consumed by a parent agent (`Export` / `Use`). Child runs preserve independent run IDs, budgets, and parent-linked telemetry spans. See [Agent composition](agent-composition/).

### Typed streaming events {#structured-streaming}

Stream typed runtime events (`AssistantReply`, `ToolStart`, `ToolEnd`, `AwaitConfirmation`, `RunCompleted`) to web UIs over SSE or WebSockets. See [Production streaming](production/#streaming-ui).

### Local to Temporal durability {#temporal-durability}

Develop and test with the zero-dependency in-memory engine, then configure the Temporal engine in production for crash recovery, durable `Confirmation` pauses, and activity retries (pair external side effects with idempotency keys). See [Production](production/).

### Evaluation suites {#generated-evaluations}

Declare scenario suites alongside your agent and run deterministic tool-trajectory assertions with scripted model doubles or calibrated semantic judges. See [Evaluations](evaluations/) and [Testing](testing/).

### Model providers & session state {#model-providers}

Built-in model adapters cover **OpenAI**, **Anthropic**, **AWS Bedrock**, and **Google Vertex AI**. Your application supplies session transcripts, authorization, and domain memory. See [Memory and sessions](memory-sessions/) and [Provider operations](provider-operations/).

## Architecture

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI architecture: Design DSL compiles into generated typed packages, executed by the Runtime over In-Memory or Temporal engines and model/tool adapters" >}}
