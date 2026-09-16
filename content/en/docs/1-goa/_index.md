---
title: "Goa: services from a design"
linkTitle: "Goa"
weight: 1
description: "Define your API contract in Go. Generate its types, transports, clients, validation, and documentation."
llm_optimized: true
content_scope: "Goa documentation"
---

## Overview

Goa is a framework for building Go services from a design. You describe types,
operations, errors, and transport mappings in a Go domain-specific language
(DSL). Goa generates the code that follows from those decisions. You implement
the business behavior behind the generated interfaces.

**[Build your first service](quickstart/)** or follow the
**[coding-agent workflow](../ai-development/)**.

## Why this works well with coding agents

A coding agent can start with the API's design instead of reconstructing its
contract from handlers, clients, schemas, and documentation maintained
separately. It changes the contract in one place, runs the generator, and works
through compiler feedback in the application code.

The generator writes the repetitive transport code without an LLM authoring it.
Your model context can stay focused on the design, the relevant generated
interface, and the implementation under change. Generated code is still
inspectable when a task requires it.

## How Goa works

### Design {#phase-1-design-you-write}

Define service methods, payloads, results, validation, and HTTP, gRPC, or
JSON-RPC mappings in `design/*.go`. Descriptions and examples become part of the
generated API documentation.

### Generate {#phase-2-generate-automated}

```bash
goa gen example.com/myservice/design
```

The selected transports determine the output: Go interfaces and types,
servers, clients, request validation, OpenAPI specifications, and Protocol
Buffer definitions where applicable. Do not edit `gen/`; generation replaces it.

`goa example` can create initial application scaffolding. It does not overwrite
existing implementation files.

### Implement {#phase-3-implement-you-write}

Write the service methods, authorization, persistence, and tests. When you
change a method's signature in the design, regenerate and compile: Go identifies
implementations and callers that no longer satisfy the generated types.

## What you own {#whats-hand-written-vs-auto-generated}

| You and your coding agent maintain | Goa generates |
| --- | --- |
| Design and domain decisions | Go types and service interfaces |
| Business logic and authorization | Transport routing, encoding, and validation |
| Persistence and application startup | Typed clients and transport helpers |
| Behavior tests | API specifications derived from the design |

Generated validation checks the constraints you declare. Business correctness,
security decisions, and compatibility with deployed clients still require
application design and tests.

## Add AI capabilities when you need them

[Goa-AI](../2-goa-ai/) uses the same design model to define typed tools,
structured model output, and agents. A tool can reuse service types and bind to
a service method, keeping API and tool contracts connected.

## Documentation guides

Start with the quickstart, use the transport guides for implementation tasks,
and keep the DSL reference nearby when changing a design.
