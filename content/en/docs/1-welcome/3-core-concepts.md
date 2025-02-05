---
title: Core Concepts
weight: 3
---

# Core Concepts

These are the **foundational ideas** you’ll use throughout Goa development.

## 1. The DSL as a Single Source of Truth

### What It Is

Goa’s **Domain-Specific Language (DSL)** allows you to define **services**,
**methods**, **payloads**, **results**, and **errors** in a **design-first**
manner.

### Why It Matters

By putting the API contract at the center, teams can **agree on endpoints and
data formats** before writing any business logic. This **reduces
miscommunication** and ensures **consistent APIs** across multiple services.

### Quick Example

Here’s a **minimal DSL snippet** that defines a simple “hello” service:

```go
package design

import (
  . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
  Description("The hello service greets people.")

  Method("sayHello", func() {
    Description("Say hello to a person.")

    Payload(String, "Name to greet")
    Result(String, "A greeting message")

    HTTP(func() { GET("/hello/{name}") })
    GRPC(func() { })
  })
})
```

* `Service("hello", ...)`: Declares a new service named “hello.”
* `Method("sayHello", ...)`: Defines a service method with a payload (String) and a result (String).
* `HTTP(...)` & `GRPC(...)`: Configure how the method is exposed over HTTP and gRPC transports.

The `goa` command-line tool uses this DSL file to generate server stubs, client libraries, and documentation—all in one go.

## 2. Transport-Agnostic Design

Goa’s **Domain-Specific Language** (DSL) can automatically generate both **HTTP** and **gRPC** transport layers, saving you from duplicating routing or serialization code. Beyond merely supporting multiple transports, Goa also provides **fine-grained control** over **how data is mapped** in each layer:

### HTTP

- Decide which fields go in **headers**, **path parameters**, or **query parameters**.  
- **Select or customize encodings** (e.g., JSON, XML, form data).  
- Precisely specify routes, HTTP methods (GET, POST, etc.), and request/response bodies.  

### gRPC

- Configure **metadata** (headers, trailers) and how method inputs/outputs map to protobuf messages.  
- Control **streaming** vs. **unary** calls.  
- Integrate standard or custom **protobuf** definitions for maximum flexibility.

All these details are **captured in the DSL**, giving you a single **common design language** that **ensures consistency** across different transports.

Here is a simple example of a HTTP method definition that makes use of headers, path parameters, query parameters, request and response bodies:

```go
Method("sayHello", func() {
  // Define the payload for the method (what the client sends)
  Payload(func() {
    // A path parameter (will appear in the URL path).
    Attribute("name", String, "Name to greet")

    // A query parameter (?lang=en).
    Attribute("lang", String, "Language code (e.g., 'en')", func() {
      Enum("en", "es", "fr") // Accept only these language codes
    })

    // A header (sent as X-Client-ID: ...)
    Attribute("clientID", String, "Client ID for authentication")

    // An attribute that we'll map to the request body
    Attribute("notes", String, "Additional data from the client")

    Required("name", "clientID")
  })

  // Define the result (what the service returns)
  Result(func() {
    Attribute("message", String, "A greeting message")
    Attribute("success", Boolean, "Whether the greeting was successful")

    // This will go out in the response header
    Attribute("requestID", String, "Server-generated request ID")

    Required("message", "success", "requestID")
  })

  // HTTP transport details
  HTTP(func() {
    // Use POST so we can demonstrate a request body
    POST("/hello/{name}")

    // Map the clientID attribute to a request header
    Header("clientID: X-Client-ID")

    // Map the lang attribute to a query parameter
    Param("lang")

    // Define which part of the payload goes into the request body
    // (optional, Goa will map all unmapped attributes to the request body)
    Body(func() {
      Attribute("notes")
    })

    // Define the successful HTTP response
    Response(StatusOK, func() {
      // Map 'requestID' to a response header
      Header("requestID: X-Request-ID")

      // Map the 'message' and 'success' fields to the response body
      // (optional, Goa will map all unmapped attributes to the response body)
      Body(func() {
        Attribute("message")
        Attribute("success")
      })
    })
  })
})
```     

## 3. Separation of Generated Code and Business Logic

### `gen` Package

Goa places all **generated artifacts**—including **transport scaffolding** (routing, validation), **transport-agnostic endpoint definitions** (`goa.Endpoint`), **service interfaces** that must be implemented by user code, **documentation** and **client code**—in a **dedicated `gen` folder**. Treat these files as **read-only** to avoid merge conflicts or accidental edits.

### Main Application Files

You **inject your business logic** in the **main** package (or an `internal` package). This is where you **implement** the interfaces that the `gen` package defines and wire up the application’s flow. Keeping your domain code separate from the generated code ensures a **clean**, **easy-to-maintain** structure.

Below is an example **generated code layout** (simplified) for the sayHello method after running goa gen. Each subdirectory corresponds to different layers (HTTP, gRPC) and components (server, client, CLI) that Goa produces from the design.

```
gen
├── sayHello
│   ├── client.go
│   ├── endpoints.go
│   └── service.go
├── grpc
│   ├── sayHello
│   │   ├── client
│   │   ├── pb
│   │   └── server
│   └── cli
└── http
    ├── sayHello
    │   ├── client
    │   ├── paths.go
    │   └── server
    ├── cli
    │   └── sayHello
    │       └── cli.go
    ├── openapi.json
    ├── openapi.yaml
    ├── openapi3.json
    └── openapi3.yaml
```

- **sayHello/****  
  Contains the core logic for this specific method: an interface (service.go), endpoint definitions (endpoints.go), and a generated client (client.go).

- **grpc/****  
  Holds gRPC-specific code: protobuf files, server logic, a gRPC client, and optional CLI utilities.

- **http/****  
  Houses HTTP-specific files: the HTTP client/server scaffolding, request path definitions, plus a CLI for testing endpoints.

- **openapi.*****  
  Automatically generated OpenAPI specs so you can share or document the service contract with consumers.

## 4. Error Handling

Goa’s design-first approach extends naturally to **error handling**, giving you a consistent and expressive way to define errors alongside your service logic. Instead of scattering error definitions and HTTP or gRPC mappings across multiple files, you declare them **up front** in the DSL, ensuring every client—HTTP or gRPC—encounters predictable, well-structured error responses.

### Defining Errors

At the heart of Goa’s error handling is the `Error` function. You can call this DSL function in an API, service, or method to define a **named error**. If you don’t specify a custom type, Goa uses the built-in `ErrorResult` by default. For example:

```go
var _ = API("calc", func() {
  Error("invalid_argument") // Uses ErrorResult by default
  HTTP(func() {
    Response("invalid_argument", StatusBadRequest) // HTTP 400 Bad Request
  })
})
```

This snippet defines an invalid_argument error globally for the calc API and maps it to an HTTP 400 status code. In a gRPC context, Goa automatically translates the same error name into an appropriate gRPC status code.

### Mapping to Transport Protocols

Whenever you define an error, Goa generates the necessary transport logic to ensure it’s consistently handled. For HTTP, you typically specify the status code in the DSL. For gRPC, Goa identifies the error name (e.g., "invalid_argument", "div_by_zero") and translates it into a relevant gRPC status code (like InvalidArgument).

```go
var _ = Service("divider", func() {
  Method("divide", func() {
    Error("div_by_zero", DivByZero, "Division by zero")
    // ...
  })
})
```

This example introduces a custom DivByZero type for the "div_by_zero" error and describes it as “Division by zero.” Goa then takes care of returning the correct HTTP or gRPC response.

See the [Error Handling](../3-tutorials/4-error-handling/) section for more details.

## 5. Inteceptors

Goa supports **transport-agnostic interceptors**—small, composable units of logic that plug into the **request/response flow** without being tied to a specific protocol like HTTP or gRPC. This makes them ideal for handling **cross-cutting concerns** such as authentication, caching, logging, and tracing in a centralized way.

### Why Use Interceptors?

- **Cross-Cutting Concerns**: Interceptors let you centralize repeated tasks (for example, token validation or adding trace IDs), keeping your core service methods focused and uncluttered.
- **Consistency Across Transports**: Transport-agnostic interceptors ensure that the same logic is applied consistently across different transports (HTTP, gRPC, etc.).
- **Flexible Scoping**: Attach interceptors at the service level (for every method) or the method level (only where needed).

### Defining and Attaching Interceptors

In your design file, use the `Interceptor(name, func() { ... })` DSL to define interceptors. You then attach them via `ServerInterceptor()` or `ClientInterceptor()` within a service or method:

```go
// Example interceptor definitions
var JWTAuth = Interceptor("JWTAuth", func() {
  Description("Validates JWT tokens before handling requests")
  ReadPayload(func() {
    Attribute("auth", String, "JWT token")
  })
})

var Retry = Interceptor("Retry", func() {
  Description("Client-side retry logic for failed requests")
  WriteResult(func() {
    Attribute("retryCount", Int)
  })
})

// Attaching them in a service
var _ = Service("interceptors", func() {
  ServerInterceptor(JWTAuth)  // Server side
  ClientInterceptor(Retry)    // Client side

  Method("get", func() {
    // ...
  })
})
```

- **Server-Side** Interceptors run automatically on all incoming requests (or specific methods if configured there).
- **Client-Side** Interceptors apply when this service client is used by other services.

Interceptors let you modularize common logic so your core service methods remain focused on domain concerns. In [later sections](../4-concepts/3-interceptors/), we’ll dive deeper into advanced interceptor usage, customization, and best practices for structuring interceptors in large codebases.

## 6. Code Generation for Clients and Documentation

Goa’s DSL doesn’t just define server scaffolding—it also produces client libraries and documentation artifacts, ensuring both server and consumer-facing resources remain consistent.

### Client Libraries

#### HTTP and gRPC Clients

- **Goa generates type-safe Go clients** for each transport. For HTTP, it handles route construction, query parameters, headers, and body encoding. For gRPC, it wraps proto stubs in idiomatic Go code.

- **Reduce Boilerplate**: Instead of handcrafting request logic, you simply call generated methods like `client.SayHello(ctx, "bob")`. This is especially helpful when a service must be consumed by multiple internal microservices or a CLI.

#### Consistent Interface 

- **Changes you make in the DSL** (e.g., adding a new field or endpoint) automatically update the generated client code when you run `goa gen` again. This helps teams avoid version drift between server and client, since the DSL remains the single source of truth.

- **CLI Integration**: Goa can also generate command-line utilities for each service method, enabling easy local testing without writing custom scripts. This is particularly useful in CI/CD pipelines or when debugging endpoints manually.

### Documentation Artifacts

#### OpenAPI Specs (REST)

- For REST endpoints, Goa generates **OpenAPI specifications** (both v2 and v3).
- These specs detail endpoints, request/response schemas, parameter types, and error structures.
- They can be plugged into tools like **Swagger UI** or **Redoc** for live API documentation or used to automatically validate requests in proxies or gateways.

#### Protobuf Files (gRPC)

- **Goa exports protobuf files** for services defined with gRPC.
- These `.proto` files are crucial for interoperability, letting non-Go clients or microservices (e.g., Node.js, Java) consume your gRPC APIs.
- As with OpenAPI, any DSL changes update the `.proto` definitions automatically, helping maintain a consistent API contract.

#### Single Source of Truth

Whether your endpoints are HTTP-based, gRPC-based, or both, all documentation (OpenAPI specs, Proto files) stems from the exact same DSL that drives code generation. This prevents outdated docs or misaligned definitions from creeping into your workflow.

---

These core concepts guide how Goa **streamlines** development, whether you’re building a single service or **scaling** up to a microservices architecture. Next, head over to the [Getting Started](../2-getting-started/) section to install Goa, and try out your first service in minutes!

