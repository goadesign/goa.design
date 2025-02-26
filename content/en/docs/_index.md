---
title: "Discover Goa"
linkTitle: "Discover Goa"
weight: 20
description: >
  Documentation for Goa, a design-first framework for building microservices and APIs in Go.
---

## Transform Your API Development

In the world of microservices and APIs, the gap between design and
implementation has always been a challenge. Goa bridges this gap with an
innovative approach that transforms how you build services in Go. By putting
design at the forefront, Goa eliminates the tedious back-and-forth between
specification, implementation, and documentation that plagues traditional
development.

Imagine describing your API once and automatically generating everything you
need: server code, client libraries, documentation, and more. This isn't just a
dream—it's what Goa delivers. By leveraging Go's type system and modern design
principles, Goa helps you build robust, production-ready services in a fraction
of the time.

## What Makes Goa Different?

Goa stands out by treating your API design as a living contract. This
design-first approach means:

* Your API documentation is always in sync with your code—because they come from the same source
* Your implementation is guaranteed to match your design through type-safe interfaces
* You can switch between HTTP and gRPC without changing your business logic
* You focus on what matters: building features that deliver value

## How Goa Works

![Goa's layered architecture](/img/docs/layers.png)

Here's where the magic happens. From a single design file, Goa unleashes a
cascade of generated code that would typically take weeks to write and maintain
by hand. You focus on describing what you want, and Goa handles the heavy
lifting:

1. Implementation Code - The Foundation
    * Production-ready service and client interfaces
    * Transport-agnostic endpoints that keep your code clean
    * HTTP and gRPC handlers that just work
    * All the request/response encoding you'd rather not write

2. Documentation That Markets Itself
    * Beautiful OpenAPI specifications
    * Protocol buffer definitions ready for cross-platform use
    * Documentation that evolves with your code, not as an afterthought

3. The Extra Mile
    * Rock-solid input validation
    * Production-grade error handling
    * Client libraries your users will thank you for

The best part? While Goa generates thousands of lines of boilerplate, testing,
and documentation, you only write the code that matters - your business logic.
Three lines of your code can turn into a complete production-ready service with
HTTP and gRPC support, command-line tools, and comprehensive API documentation.

## A Simple Example
Here's what designing an API with Goa looks like:

```go
var _ = Service("calculator", func() {
    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "First number")
            Field(2, "b", Int, "Second number")
            Required("a", "b")
        })
        Result(Int)

        HTTP(func() {
            GET("/add/{a}/{b}")
            Response(StatusOK)
        })
    })
})
```

And here's all the code you need to write to implement it:

```go
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

## Key Concepts

### Design-First: Your Single Source of Truth

Stop juggling multiple API specs, documentation, and implementation files. With
Goa, your design is your contract - a clear, executable specification that keeps
everyone on the same page. Teams love this approach because it eliminates the
"but that's not what the spec said" conversations forever.

### Clean Architecture That Scales

Goa generates code that even senior architects dream about. Each component lives in its perfect place:
* Service Layer: Your domain logic, pure and clean
* Endpoint Layer: Transport-agnostic business flows
* Transport Layer: HTTP/gRPC handlers that adapt to your needs

This isn't just architecture theory - it's working code that makes your services
easier to test, modify, and scale as your needs evolve.

### Type Safety That Has Your Back

Forget about runtime surprises. Goa leverages Go's type system to catch issues at compile time:

```go
// Generated interface - your contract
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// Your implementation - clean and focused
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

If your implementation doesn't match the design, you'll know before your code hits production.

### Project Structure That Makes Sense

No more guessing where files should go. Goa projects follow a crystal-clear organization:

```
├── design/         # Your API design - the source of truth
├── gen/            # Generated code - never edit this
│   ├── calculator/ # Service interfaces
│   ├── http/       # HTTP transport layer
│   └── grpc/       # gRPC transport layer
└── calculator.go   # Your implementation - where the magic happens
```

Each file has its place, and every developer on your team will know exactly where to look.

## Next Steps

* Follow the [Getting Started guide](2-getting-started)
* Explore the [Core Tutorials](3-tutorials)
* Join the community:
    * [Gophers Slack](https://gophers.slack.com/messages/goa)
    * [GitHub Discussions](https://github.com/goadesign/goa/discussions)
    * [Bluesky](https://goadesign.bsky.social)
