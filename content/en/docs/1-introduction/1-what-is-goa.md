---
title: "What is Goa?"
linkTitle: "What is Goa?"
weight: 1
description: "Learn about Goa, a design-first framework for building microservices and APIs in Go, featuring a powerful DSL and code generation capabilities."
---

Now that you understand why Goa can transform your API development, let's explore how it works in practice. At its core, Goa is a design-first framework that revolutionizes how you build microservices and APIs in Go through an elegant domain-specific language (DSL) that lets you define your entire service architecture in a clear, maintainable way.

## The Power of Design-First Development

The design-first approach you've just learned about comes to life through Goa's expressive DSL. This powerful language lets you describe your entire API architecture in a way that both humans and machines can understand, turning high-level service definitions into production-ready code.

{{< alert title="Key Design Elements" color="primary" >}}
**Services & Methods**  
Define the core behaviors your API provides with clean, readable syntax. Every endpoint, every operation, and every interaction is clearly specified.

**Data Structures**  
Describe your payloads, results, and error types with type-safe precision. Goa ensures your data flows exactly as designed, from input validation to response formatting.

**Transport Mappings**  
Specify how your services are exposed - HTTP, gRPC, or both. Switch between protocols or support multiple transports without changing your core service logic.
{{< /alert >}}

From these definitions, Goa generates production-ready code that handles all the complex transport logic, letting you focus purely on your business implementation. No more tedious boilerplate or error-prone manual translations between your API design and implementation.

## Why This Approach Matters

When you define your APIs before implementing them, something magical happens:

{{< alert title="Benefits" color="primary" >}}
**Team Alignment**  
Service contracts are agreed upon before a single line of code is written

**Perfect Synchronization**  
Frontend and backend teams work confidently with a shared understanding

**Predictable Evolution**  
API changes become manageable and well-documented

**Natural Consistency**  
A single source of truth ensures uniform patterns across your entire system
{{< /alert >}}

The design-first philosophy means you catch potential issues early, when they're easiest to fix. Your team can review and validate the API interface before investing time in implementation.

## How Goa Works

The journey from design to running service is straightforward:

### 1. Design Your Service
Create your service blueprint in Goa's DSL, typically in a `design` package. This becomes your single source of truth for the entire service.

Here's what designing an API with Goa looks like:

```go
var _ = Service("calculator", func() {             // A service groups related methods
   Method("add", func() {                          // A method (endpoint)
        Payload(func() {                           // The method's payload (request body)
            Attribute("a", Int, "First number")    
            Attribute("b", Int, "Second number")
            Required("a", "b")                     // Payload validation
        })
        Result(Int)                                // The method's result (response body)

        HTTP(func() {                              // HTTP transport details
            GET("/add/{a}/{b}")                    // HTTP request verb and path
            Response(StatusOK)                     // HTTP response status
        })
    })
})
```

### 2. Generate the Framework
Run `goa gen` and watch as Goa creates your `gen` package containing:

- **Service interfaces** - Type-safe contracts for implementing your business logic
- **Transport handlers** - HTTP/gRPC servers with full request/response handling
- **Encoders/decoders** - Efficient serialization of your data types
- **Client packages** - Ready-to-use client libraries for your services
- **OpenAPI specs** - Complete API documentation in OpenAPI/Swagger format
- **Command-line tools** - CLI clients for testing your services
- **Middleware hooks** - Extension points for logging, metrics, auth, etc.

This generated code handles all the complex transport details like routing, parameter parsing, content negotiation, and error handling. It's production-ready, thoroughly tested, and follows best practices - giving you a rock-solid foundation to build upon.

### 3. Add Your Logic
Now comes the fun part - implementing your business logic. Simply:
- Instantiate the generated components
- Implement the service interfaces
- Connect everything in your main application

{{< figure src="/img/docs/layers.png" alt="Goa's layered architecture" class="full-width-image" >}}

{{< alert title="Clean Architecture" color="primary" >}}
Goa maintains a clear separation between generated transport code and your business logic. This means you can evolve your service without getting tangled in low-level networking details.
{{< /alert >}}

## Best Practices and Beyond

Through years of real-world usage, the Goa community has developed proven patterns for success:

### Design Best Practices
- **Start Simple**: Begin with core endpoints and evolve gradually
- **Think in Services**: Group related functionality into cohesive services
- **Design for Change**: Use versioning and extensible types from day one
- **Consistent Naming**: Follow established conventions for endpoints and types

### Development Workflow
- **Design Reviews**: Validate API designs with stakeholders before implementation
- **Iterative Development**: Use Goa's generation to quickly prototype and refine
- **Documentation First**: Keep API documentation as a first-class citizen

### Team Collaboration
- **Shared Understanding**: Use the DSL as a common language between teams
- **Clear Boundaries**: Define service interfaces that respect domain boundaries
- **Code Organization**: Structure projects for clarity and maintainability
- **Knowledge Sharing**: Build on community patterns and contribute back

## Ready to Dive Deeper?

Continue to [Why Goa?](./2-why-goa/) to see how Goa compares to other frameworks
and discover why it might be the perfect choice for your next project. 
