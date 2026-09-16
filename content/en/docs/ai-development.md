---
title: "Develop with a coding agent"
linkTitle: "Coding-agent workflow"
weight: 1
description: "Give your coding agent an explicit contract, generate the repetitive code, and use compiler feedback to guide implementation."
---

Goa supports two related jobs: **building software with a coding agent** and
**building AI agents into that software**. The same design-first workflow helps
with both. Goa generates service contracts; Goa-AI extends generation to tools,
structured output, and agent integration.

## Why generation changes the workflow

When an LLM writes handlers, client code, JSON schemas, and validation separately,
it must keep those representations aligned. Goa derives them from the design.
The model can concentrate on requirements, domain decisions, and implementation.

- **Less repetitive authoring.** The generator produces code without an LLM
  writing each generated file. This can reduce output-token work; total savings
  depend on how much context, iteration, and review the task needs.
- **A focused starting point.** The design puts types, descriptions, examples,
  constraints, and operations together. Load the relevant design and interface
  before asking the agent to explore a larger implementation.
- **Predictable ownership.** Edit the design and application code. Regenerate
  `gen/`. A coding agent does not need to invent a new transport pattern for
  every service or a separate schema convention for every tool.
- **Compiler feedback.** A changed generated method signature makes incompatible
  implementations and callers visible to the Go compiler. Behavioral changes
  still need tests.
- **Connected service and tool contracts.** Goa-AI can reuse Goa types and bind
  tools to service methods. Generated schemas, codecs, and transforms keep
  those representations connected.

## Install the Goa service designer skill {#install-the-skill}

Run this command in your application repository. The [Skills CLI](https://github.com/vercel-labs/skills) installs the complete skill and lets you choose your coding tool. It requires Node.js and npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

The skill teaches the agent to inspect your project, edit the design first, run the matching generator, implement outside `gen/`, update affected consumers, and verify the change. It includes guidance for service contracts, HTTP/gRPC, validation, errors, and interceptors. For Goa-AI, also supply the generated `AGENTS_QUICKSTART.md`; the service designer skill is focused on Goa services.

To select specific tools without the installer prompts:

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

The default is project-local. Add `--global` for a personal installation or `--copy` if your environment does not support symlinks. Without Node.js, copy the full [`goa-service-designer` directory](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) into the skill directory your coding tool supports.

## The development loop

### 1. Supply the relevant context

Give the coding agent the goal, the design files, and the implementation it will
change. For a service, install the
[Goa service designer skill](https://github.com/goadesign/goa/tree/v3/skills)
using the instructions for your coding tool.

For Goa-AI, also read **`AGENTS_QUICKSTART.md`** at your application's root. Goa-AI
generates this guide from the agent design unless `DisableAgentDocs()` is set.
It describes the generated packages and the implementation work that remains.

Use this site's Markdown pages or [documentation index](/llms.txt) to supply
focused reference material. Avoid loading all generated transports into the
model context by default; inspect them when the task requires it.

### 2. Change the design first

Describe operations, payloads, results, errors, and constraints in `design/`.
Put structural validation in the design. Keep authorization and business rules
in the application layer that owns them.

For an agent tool, make its description explain when to use it and what it
returns. Give every field a useful description. Reuse existing service types
when they express the same domain contract.

### 3. Generate and implement

```bash
goa gen example.com/catalog/design
```

Implement or update the generated interfaces in application-owned files.
`goa example` creates starter files once; it does not update existing business
logic when the design changes. Never patch `gen/` to satisfy a compiler error.
Fix the design or the application implementation and regenerate.

### 4. Verify the whole change

```bash
gofmt -w design
go test ./...
```

Review the design diff and the resulting public contract. Add behavior tests for
what callers should observe. For AI applications, run evaluations that check
outcomes and tool behavior. Schema-valid arguments do not establish that a model
chose the right tool or produced a useful answer.

Generation does not establish authorization, make external side effects
idempotent, or prove compatibility with deployed clients. Test those properties
where the application owns them.

## One design, two entry points {#one-design-two-entry-points}

This catalog exposes the same operation over **HTTP, gRPC, and JSON-RPC**, and gives an agent a tool bound to it. `LookupPayload` and `Product` define both contracts. The numbered fields also define the Protocol Buffer mapping. Implement product lookup and the planner in application code.

Create a module and install the versions used for this example:

This guide uses a pinned Goa-AI development snapshot, not a stable release. Its Go module selects the matching Goa dependency. Run the generator through `go run` so it uses that selected version. Use the Go version declared by the module or newer.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.78.8-0.20260915025548-ae0c418b7e77
mkdir design
```

Save the following as `design/catalog.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {
    Title("Product catalog")
    Description("Find products through an API or an agent tool")
})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "sku", String, "Product stock-keeping unit", func() {
        MinLength(1)
    })
    Required("sku")
    Example(map[string]any{"sku": "BOOK-1"})
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product stock-keeping unit")
    Field(2, "name", String, "Product name")
    Required("sku", "name")
    Example(map[string]any{"sku": "BOOK-1", "name": "The Go Book"})
})

var _ = Service("catalog", func() {
    Description("Provides product information to API clients and agents")
    JSONRPC(func() { POST("/rpc") })

    Method("lookup", func() {
        Description("Find a product by SKU")
        Payload(LookupPayload)
        Result(Product)

        HTTP(func() {
            GET("/products/{sku}")
            Response(StatusOK)
        })
        GRPC(func() {})
        JSONRPC(func() {})
    })

    Agent("assistant", "Find products", func() {
        Use("catalog", func() {
            Tool("lookup", "Find a product by SKU", func() {
                Args(LookupPayload)
                Return(Product)
                BindTo("lookup")
            })
        })
    })
})
```

Generate the contracts and initial application files:

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Inspect the generated service interface, HTTP server and client, OpenAPI
specifications, agent tool schemas and codecs, and `AGENTS_QUICKSTART.md`.
Application scaffolding is a starting point: implement lookup behavior and
replace the example planner before using it in a product.

## A useful task prompt

```text
Read design/ and the relevant generated service interface. For Goa-AI,
also read AGENTS_QUICKSTART.md.

Implement the requested behavior by changing the design first when the
contract changes. Regenerate with the project's pinned Goa version.
Do not edit gen/ or maintain a second tool schema by hand.

Update application implementations and callers. Put structural validation
in the design; keep authorization and business rules in their owning code.
Run the project's tests and relevant agent evaluations. Report the contract
changes, checks performed, and any behavior still needing review.
```

Add the actual user outcome and acceptance criteria. This prompt defines a
workflow; it cannot replace a clear task or good engineering judgment.

## Measure the advantage in your project

Compare the same task, acceptance criteria, model, and starting codebase across
several runs. Record input and output tokens, wall-clock time, regeneration and
test time, manual corrections, review effort, and behavioral defects. Include
setup and failed attempts. Generated lines of code are evidence of work the
generator performs, not a token-savings or productivity benchmark.

There is no universal 10× claim here. The concrete advantage is that deterministic
code generation takes repetitive contract work out of model authoring and gives
both people and coding agents a clearer implementation target.

Continue with the [Goa quickstart](../1-goa/quickstart/) or the
[Goa-AI quickstart](../2-goa-ai/quickstart/).
