---
title: "Goa Framework"
linkTitle: "Goa"
weight: 1
description: "Design-first API development with automatic code generation for Go microservices."
llm_optimized: true
content_scope: "Complete Goa Documentation"
aliases:
---

## Overview

Goa is a design-first framework for building microservices in Go. Define your API using Goa's powerful DSL, and let Goa generate the boilerplate code, documentation, and client libraries.

### Key Features

- **Design-First** — Define your API using a powerful DSL before writing implementation code
- **Code Generation** — Automatically generate server, client, and documentation code
- **Type Safety** — End-to-end type safety from design to implementation
- **Multi-Transport** — Support for HTTP and gRPC from a single design
- **Validation** — Built-in request validation based on your design
- **Documentation** — Auto-generated OpenAPI specifications

## How Goa Works

Goa follows a three-phase workflow that separates API design from implementation, ensuring consistency and reducing boilerplate.

{{< figure src="/images/diagrams/GoaWorkflow.svg" alt="Goa three-phase workflow: Design → Generate → Implement" class="img-fluid" >}}

### Phase 1: Design (You Write)

In the design phase, you define your API using Goa's DSL in Go files (typically in a `design/` directory):

- **Types**: Define data structures with validation rules
- **Services**: Group related methods together
- **Methods**: Define operations with payloads and results
- **Transports**: Map methods to HTTP endpoints and/or gRPC procedures
- **Security**: Define authentication and authorization schemes

**What you create**: `design/*.go` files containing your API specification as Go code.

### Phase 2: Generate (Automated)

Run `goa gen` to automatically generate all boilerplate code:

```bash
goa gen myservice/design
```

**What Goa creates** (in the `gen/` directory):
- Server scaffolding with request routing and validation
- Type-safe client libraries
- OpenAPI/Swagger specifications
- Protocol Buffer definitions (for gRPC)
- Transport encoders/decoders

**Important**: Never edit files in `gen/` — they are regenerated each time you run `goa gen`.

### Phase 3: Implement (You Write)

Write your business logic by implementing the generated service interfaces:

```go
// service.go - You write this
type helloService struct{}

func (s *helloService) SayHello(ctx context.Context, p *hello.SayHelloPayload) (string, error) {
    return fmt.Sprintf("Hello, %s!", p.Name), nil
}
```

**What you create**: Service implementation files that contain your actual business logic.

### What's Hand-Written vs Auto-Generated

| You Write | Goa Generates |
|-----------|---------------|
| `design/*.go` — API definitions | `gen/` — All transport code |
| `service.go` — Business logic | OpenAPI specifications |
| `cmd/*/main.go` — Server startup | Protocol Buffer definitions |
| Tests and custom middleware | Request validation |

## Documentation Guides

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | Install Goa and build your first service | ~1,100 |
| [DSL Reference](dsl-reference/) | Complete reference for Goa's design language | ~2,900 |
| [Code Generation](code-generation/) | Understanding Goa's code generation process | ~2,100 |
| [HTTP Guide](http-guide/) | HTTP transport features, routing, and patterns | ~1,700 |
| [gRPC Guide](grpc-guide/) | gRPC transport features and streaming | ~1,800 |
| [Error Handling](error-handling/) | Defining and handling errors | ~1,800 |
| [Interceptors](interceptors/) | Interceptors and middleware patterns | ~1,400 |
| [Production](production/) | Observability, security, and deployment | ~1,300 |

**Total Section:** ~14,500 tokens

## Quick Example

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("hello", func() {
    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "Greeting message")
        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Generate and run:

```bash
goa gen hello/design
goa example hello/design
go run ./cmd/hello
```

## Getting Started

Start with the [Quickstart](quickstart/) guide to install Goa and build your first service in minutes.

For comprehensive DSL coverage, see the [DSL Reference](dsl-reference/).
