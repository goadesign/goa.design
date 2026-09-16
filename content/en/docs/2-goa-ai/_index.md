---
title: "Goa-AI: agents from a design"
linkTitle: "Goa-AI"
weight: 2
description: "Design typed tools and agent contracts in Go. Generate their integration code and run them with an explicit execution model."
llm_optimized: true
content_scope: "Goa-AI documentation"
---

## Overview

Goa-AI extends Goa's design language and generator to AI applications. Define
agents, tool payloads and results, structured completions, policies, and
evaluation scenarios. Generate the types, schemas, codecs, and bindings; write
the planners and application behavior.

**[Build your first agent](quickstart/)** or follow the
**[coding-agent workflow](../ai-development/)**. You can start with Goa-AI without
first deploying a separate Goa service.

## Build with a coding agent

Goa-AI makes the contract visible to both the developer and the coding agent.
Tool schemas and typed Go codecs come from the same design. A service-backed
tool can reuse an existing service's types and implementation through `BindTo`.

Generation also creates **`AGENTS_QUICKSTART.md`**, a guide based on your
application's agent design. Give that guide and the relevant design files to
your coding agent, then have it implement the planner and executors outside
`gen/`. Regenerate, compile, and run evaluations as the design evolves.

This keeps repetitive schema and integration work out of LLM authoring. It does
not establish a fixed token-saving percentage: measure complete tasks,
including context, retries, and review, for your application.

## Build agents into your product

### Typed tool contracts {#design-first-agents}

Define inputs and results using Goa types, descriptions, examples, and
validation. The generator produces model-facing JSON schemas and typed codecs.
The model boundary validates tool arguments before executor code runs.
[Toolsets](toolsets/) explains service bindings, execution, and bounded results.

### Structured output {#typed-direct-completions}

Declare a service-owned `Completion(...)` when you need a typed assistant answer.
Generated unary and streaming helpers validate the completed result.
See the [DSL reference](dsl-reference/) and [runtime guide](runtime/).

### Evaluation suites {#generated-evaluations}

Declare suites and scenarios alongside the agent. Generate typed hooks and
implement checks for the outcome your product needs. Semantic judging requires
calibration; generated structure does not determine whether an answer is useful.
See [generated evaluations](evaluations/).

### Agent composition {#run-trees-composition}

Expose an agent as a tool for another agent. Child runs have their own identity,
parent links, and execution history. See [agent composition](agent-composition/).

### Streaming {#structured-streaming}

The runtime emits typed events for assistant output, tool progress, human input,
and run state. The application decides what to expose to its users and how to
transport it. See [production streaming](production/#streaming-ui).

### Durable execution {#temporal-durability}

Use the in-memory engine for local development. Configure the Temporal engine
for persisted workflow execution, recovery, and activity retries. External
side effects still need application-level idempotency and appropriate retry
policies. See [production](production/).

### MCP servers and hosted tool registries {#tool-registries}

**Create MCP servers.** Expose service methods as tools, publish resources, and provide prompt templates through generated protocol handling and adapters. Agents can also consume external MCP tools. See [MCP integration](mcp-integration/).

**Host a tool registry.** Run the included registry server as a shared catalog and invocation gateway backed by Redis and Pulse. Providers publish toolsets and schemas; consumers discover tools and invoke healthy providers. Generated helpers connect applications to the registry. See [hosting and operating a registry](registry/).

### Models and application state {#model-providers}

Use the provided model adapters for OpenAI, Anthropic, AWS Bedrock, and Google
Vertex AI. Provider capabilities vary; consult the [runtime guide](runtime/)
when choosing structured output or streaming behavior. Your application supplies
runtime storage and controls sessions, authorization, and product memory.
See [memory and sessions](memory-sessions/).

## Architecture

The design owns static contracts. Generated code turns them into typed packages.
The runtime coordinates execution, and an engine supplies local or durable
workflow execution. Planners own semantic choices; application services own
business behavior.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI design, code generation, runtime, and execution engines" >}}

## Documentation guides

Begin with the local quickstart. Follow task-oriented guides as you add tools,
models, state, and deployment. Use the DSL and runtime references for exact
contracts.
