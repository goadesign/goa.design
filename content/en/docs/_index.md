---
title: "Welcome to Goa!"
linkTitle: "Documentation"
menu:
  main:
    weight: 1
type: docs
---

## What is Goa?

Goa is a powerful framework for building microservices and APIs in Go. It takes
a design-first approach where you describe your service once, and Goa generates
the implementation code, documentation, and client libraries.

At its core, Goa helps you:
* Define your API design as a single source of truth
* Generate server and client code for both HTTP and gRPC
* Keep your documentation always in sync with implementation
* Focus on business logic rather than boilerplate

## How Goa Works

![Goa's layered architecture](/img/docs/layers.png)

Starting with a single design file, Goa generates:

1. Implementation Code
    * Service and client interfaces
    * Transport-agnostic endpoints
    * Transport layer (HTTP/gRPC) handlers
    * Request/response encoding

2. Documentation
    * OpenAPI specifications
    * Protocol buffer definitions

3. Supporting Code
    * Input validation
    * Error handling
    * Client libraries

You only need to implement the business logic in the generated service interfaces - Goa handles everything else.

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

From this design, Goa generates:

* Server code with routing and request handling
* Client libraries
* OpenAPI documentation
* Input validation
* Type-safe interfaces

## Key Concepts

### Design-First Approach
Goa encourages you to think about your API design before implementation. Your
design becomes a contract that both servers and clients follow, ensuring
consistency across your services.

### Clean Architecture
Generated code follows a clean architecture pattern with distinct layers:
* Service Layer: Your business logic
* Endpoint Layer: Transport-agnostic endpoints
* Transport Layer: HTTP/gRPC handlers

This separation makes it easy to maintain and modify your services as requirements change.

### Type Safety
Goa leverages Go's type system to ensure your implementation matches your design:
```go
// Generated interface
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// Your implementation
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

### Project Structure
A typical Goa project looks like this:

```
├── design/         # Your API design
├── gen/            # Generated code
│   ├── calculator/ # Service package
│   ├── http/       # HTTP transport
│   └── grpc/       # gRPC transport
└── calculator.go   # Your implementation
```

## Next Steps

* Follow the [Getting Started guide](2-getting-started)
* Explore the [Core Tutorials](3-tutorials)
* Join the community:
    * [Gophers Slack](https://gophers.slack.com/messages/goa)
    * [GitHub Discussions](https://github.com/goadesign/goa/discussions)
    * [Bluesky](https://bsky.social/goadesign)
