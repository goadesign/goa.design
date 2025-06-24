---
Title: Working with Multiple Services in Goa
linkTitle: Multiple Services
weight: 2
description: >
  Design and implement scalable microservice architectures with Goa
---

In real-world applications, it's common to have multiple services that work together
to form a complete system. Goa makes it easy to design and implement multiple
services within a single project. This guide will walk you through the process of
creating and managing multiple services effectively.

See also how to build an [Elegant Monolith](./4-elegant-monolith.md) with Goa.

## Understanding Multiple Services

A service in Goa represents a logical grouping of related endpoints that provide
specific functionality. While simple applications might only need one service,
larger applications often benefit from splitting functionality across multiple
services. This approach enables better organization of API endpoints, clearer
separation of concerns, easier maintenance and testing, independent deployment
capabilities, and granular security controls.

## Service Architecture Patterns

When designing a multi-service system, services typically fall into two
categories: front services which are exposed to the outside world and back
services which are used by front services. Understanding these patterns helps in
designing a scalable and maintainable architecture.

## Service Organization

Goa offers flexibility in how you organize your services' designs and generated
code. Let's explore the two main approaches: independent and unified designs.

### Independent Design Approach

The independent approach treats each service as a standalone unit, in this case
`goa gen` is invoked for each service separately and they each contain their
own `gen/` directory. This makes it possible to easily move services to
separate repositories and to version them independently.

### Unified Design Approach

The unified approach defines a top-level design file that imports all the
services design package and defines a common API:

```go
// design/design.go - Top-level design file
package design

import (
    _ "myapi/services/users/design"    // Each service has its own design which gets imported into the top-level design
    _ "myapi/services/products/design"
    . "goa.design/goa/v3/dsl"
)

var _ = API("myapi", func() {
    Title("My API")
    Description("Multi-service API example")
})
```

This approach centralizes code generation and type sharing:
- Generated code lives in the root `gen/` directory
- A single `goa gen` command generates all service code
- Shared types defined using the `Meta` `struct:pkg:path` key are automatically available across services
- The system maintains a unified OpenAPI specification

The unified approach is well-suited for grouping related services and sharing
common types. It ensures that all the related services are versioned together
and makes it easier to manage dependencies and updates.

## Transport Considerations

Your choice of transport protocol significantly impacts how services interact.
Let's examine the benefits of each approach:

### HTTP Services

HTTP is an excellent choice for external-facing services. It offers universal
client compatibility, a rich ecosystem of tools and middleware, and familiar
REST patterns. HTTP is also easy to debug and test, and it's a natural fit for
web applications.

The flexibility of HTTP comes with a cost though: servers potentially need to
deal with different types of encoding, they also need to choose a specific
style for the their API. Arguably the main drawback is typically poor encoding
performance as compared to a binary protocol like protobuf.

### gRPC Services

[gRPC](https://grpc.io) is particularly well-suited for internal service
communication due to its high performance, low latency, and built-in streaming
support. gRPC also provides built-in service discovery when reflection is
enabled. Additionally, gRPC enables efficient multiplexing of requests and
responses over a single connection, which can lead to significant performance
gains when communicating between services.

The main drawback of gRPC is that it is not as well-suited for external-facing
services since it requires a client library to encode and decode the binary
messages. Additionally, gRPC is not as widely adopted as HTTP so it may not be
as suitable for services that expect a wide range of clients.

### TL;DR

When building a system composed of multiple services, a good approach is to use
HTTP for services that need to be exposed to the outside world and gRPC for
services that only need to communicate with other internal services.

## Repository Structure

A well-organized repository helps teams navigate and maintain the codebase
effectively. A unified structure also makes it easier for developers to move
between systems and services. Here's a recommended structure:

```
myapi/
├── README.md          # System overview and setup guide
├── design/            # Shared design elements
│   ├── design.go      # Top-level design for unified approach
│   └── types/         # Shared type definitions defined with Meta("struct:pkg:path")
├── gen/               # Generated code (unified design approach)
│   ├── http/          # HTTP transport layer code
│   ├── grpc/          # gRPC transport layer code
│   └── types/         # Generated shared types
├── scripts/           # Development and deployment scripts
└── services/          # Service implementations
    ├── users/         # Example: User service
    │   ├── cmd/       # Service executables
    │   ├── design/    # Service-specific design
    │   ├── gen/       # Generated code (independent design approach)
    │   ├── users.go   # Business logic
    │   └── README.md  # Service documentation
    └── products/      # Example: Product service
        └── ...
```

The directory structure follows a clean separation of concerns and modular organization:

- `README.md`: Contains the overall system documentation, setup instructions, and architectural overview.

- `design/`: Houses the shared design elements across services
  - `design.go`: Defines the top-level API design using Goa's DSL for a unified approach
  - `types/`: Contains shared type definitions used across multiple services

- `gen/`: Contains the code generated by Goa from the unified design approach

- `services/`: Individual service implementations
  - Each service (e.g., `orders/`, `products/`) follows a consistent structure:
    - `cmd/`: Service entry points and executables
    - `design/`: Service-specific API designs
    - `gen/`: Service-specific generated code
    - `users.go`: Business logic implementation
    - `README.md`: Service-specific documentation

This structure supports both monolithic and microservice deployments, allowing for:
- Clear separation between services
- Shared types and design elements
- Independent service evolution
- Easy service discovery and navigation

## Service Communication Patterns

When designing service interactions, consider these common patterns:

### Front and Back Services

Services typically fall into two categories:

1. **Front Services**: Public-facing services that:
   - Use HTTP as transport for broad client compatibility
   - Focus on orchestrating requests to back services
   - Handle authentication and authorization of external requests
   - Initiate observability contexts (traces, metrics)
   - Define broad APIs with shallow implementations

2. **Back Services**: Internal services that:
   - Often use gRPC for performance benefits
   - Implement core business logic
   - May use private identity mechanisms (e.g., spiffe)
   - Contribute to existing observability contexts
   - Define focused APIs with deep implementations

A common architecture pattern is to have a few front services (sometimes just one)
that expose your platform's capabilities to external clients, with multiple back
services handling the actual business logic.

## Scripts and Automation

The `scripts/` directory provides automation for common development and deployment
tasks. These scripts adapt to both unified and independent approaches, making it
easy to manage your services regardless of the chosen architecture.

### Development Scripts

The core development scripts handle code generation, building, and testing:

```bash
# scripts/gen.sh - Code generation script
#!/bin/bash
if [ "$1" == "" ]; then
    # Unified approach: generate all services
    goa gen myapi/design
else
    # Independent approach: generate specific service
    cd services/$1 && goa gen myapi/services/$1/design
fi

# scripts/build.sh - Build script
#!/bin/bash
if [ "$1" == "" ]; then
    # Build all services
    for service in services/*/; do
        service=${service%*/}
        echo "Building ${service##*/}..."
        go build -o bin/${service##*/} ./$service/cmd/${service##*/}
    done
else
    # Build specific service
    go build -o bin/$1 ./services/$1/cmd/$1
fi

# scripts/test.sh - Test runner
#!/bin/bash
if [ "$1" == "" ]; then
    # Test all services and shared code
    go test ./... -v
else
    # Test specific service
    go test ./services/$1/... -v
fi
```

### Deployment Scripts

The deployment scripts handle service execution and container deployment:

```bash
# scripts/run.sh - Local service runner
#!/bin/bash
if [ "$1" != "" ]; then
    # Run specific service
    ./bin/$1
else
    # List available services
    echo "Available services:"
    ls bin/
fi

# scripts/deploy.sh - Kubernetes deployment
#!/bin/bash
if [ "$1" != "" ]; then
    deploy_service() {
        echo "Deploying $1..."
        docker build -t myapi/$1 ./services/$1
        docker push myapi/$1
        kubectl apply -f ./services/$1/k8s/
    }
    deploy_service $1
else
    # Deploy all services
    for service in services/*/; do
        service=${service%*/}
        deploy_service ${service##*/}
    done
fi
```

These scripts support both development workflows:

**Unified Design Approach**:
- Single command generates all service code
- Centralized testing across services
- Coordinated builds and deployments
- Shared dependency management

**Independent Design Approach**:
- Per-service code generation
- Isolated testing environments
- Independent build processes
- Service-specific deployments

## Service Implementation

Each service runs as a separate executable, promoting isolation and independent
scaling. Here's an example service implementation:

```go
// services/users/cmd/users/main.go - Service entry point
package main

import (
    "context"
    "flag"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "strings"
    "sync"
    "syscall"
    "time"

    "goa.design/clue/log"
    goahttp "goa.design/goa/v3/http"
    
    genusersserver "myapi/services/users/gen/http/users/server"
    genusers "myapi/services/users/gen/users"
    "myapi/services/users"
)

func main() {
    // Parse command line flags
    var (
        httpAddr = flag.String("http-addr", ":8080", "HTTP listen address")
        debug    = flag.Bool("debug", false, "Enable debug mode")
    )
    flag.Parse()

    // Initialize context with logger
    format := log.FormatJSON
    if log.IsTerminal() {
        format = log.FormatTerminal
    }
    ctx := log.Context(context.Background(), log.WithFormat(format))
    if *debug {
        ctx = log.Context(ctx, log.WithDebug())
        log.Debugf(ctx, "debug mode enabled")
    }

    // Create service and endpoints
    svc := users.NewUsers()
    endpoints := genusers.NewEndpoints(svc)

    // Create transport handlers
    mux := goahttp.NewMuxer()
    server := genusersserver.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    server.Mount(mux)

    // Log mounted endpoints
    for _, m := range server.Mounts {
        log.Printf(ctx, "mounted %s %s", m.Method, m.Pattern)
    }

    // Create HTTP server
    mux.Use(log.HTTP(ctx)) // Add logger to request context
    httpServer := &http.Server{
        Addr:    *httpAddr,
        Handler: mux,
    }

    // Handle shutdown gracefully
    errc := make(chan error)
    go func() {
        c := make(chan os.Signal, 1)
        signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
        errc <- fmt.Errorf("signal: %s", <-c)
    }()

    ctx, cancel := context.WithCancel(ctx)
    var wg sync.WaitGroup
    wg.Add(1)

    go func() {
        defer wg.Done()

        // Start HTTP server
        go func() {
            log.Printf(ctx, "HTTP server listening on %s", *httpAddr)
            errc <- httpServer.ListenAndServe()
        }()

        <-ctx.Done()
        log.Print(ctx, "shutting down HTTP server")

        // Shutdown gracefully with a 30s timeout
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := httpServer.Shutdown(ctx); err != nil {
            log.Errorf(ctx, err, "failed to shutdown HTTP server")
        }
    }()

    // Wait for shutdown
    if err := <-errc; err != nil && !strings.HasPrefix(err.Error(), "signal:") {
        log.Errorf(ctx, err, "server error")
    }
    cancel()
    wg.Wait()
    log.Print(ctx, "server exited")
}
```

The service implementation contains the business logic:

```go
// services/users/users.go - Service implementation
package users

import (
    "context"

    "goa.design/clue/log"
    "myapi/services/users/gen/users"
)

// Users implements the user service interface
type Users struct {}

// NewUsers creates a new user service instance
func NewUsers() *Users {
    return &Users{}
}

// List retrieves all users
func (s *Users) List(ctx context.Context, p *users.ListPayload) (*users.UserCollection, error) {
    log.Printf(ctx, "listing users with filter: %v", p.Filter)
    // Implementation details...
    return nil, nil
}
```

## Best Practices

When building multi-service systems with Goa, follow these guidelines:

1. Choose Appropriate Transport
   Use gRPC for internal services and HTTP for external APIs.

2. Plan for Evolution
   Version your services and plan for backward compatibility.

3. Implement Robust Error Handling
   Define clear error types and handle cross-service failures gracefully.

4. Document Service Interactions
   Maintain clear documentation of service APIs and dependencies.

## Next Steps

To deepen your understanding of multi-service systems:

- [Writing Service Clients](/docs/5-real-world/3-common-patterns/1-clients) - Learn
  about implementing robust service communication
- [HTTP Services](/docs/4-concepts/3-http) - Understand HTTP service implementation
- [gRPC Services](/docs/4-concepts/4-grpc) - Learn about gRPC service development
- [Interceptors](/docs/4-concepts/5-interceptors) - Add cross-cutting concerns