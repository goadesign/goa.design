---
title: "Goa Framework"
linkTitle: "Goa"
weight: 1
description: "Design-first API development with automatic code generation for Go microservices."
llm_optimized: true
content_scope: "Complete Goa Documentation"
aliases:
  - /en/docs/1-introduction/
  - /en/docs/1-introduction/1-what-is-goa/
  - /en/docs/1-introduction/2-why-goa/
  - /docs/1-introduction/
  - /docs/1-introduction/1-what-is-goa/
  - /docs/1-introduction/2-why-goa/
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
