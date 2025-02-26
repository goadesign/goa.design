---
Title: Working with Multiple Services in Goa
linkTitle: Multiple Services
weight: 1
description: >
  Design and implement scalable microservice architectures with Goa
---

In real-world applications, it's common to have multiple services that work together
to form a complete system. Goa makes it easy to design and implement multiple
services within a single project. This guide will walk you through the process of
creating and managing multiple services effectively.

## Understanding Multiple Services

A service in Goa represents a logical grouping of related endpoints that provide
specific functionality. While simple applications might only need one service,
larger applications often benefit from splitting functionality across multiple
services. This approach enables better organization of API endpoints, clearer
separation of concerns, easier maintenance and testing, independent deployment
capabilities, and granular security controls.

## Service Architecture Patterns

When designing a multi-service system, services typically fall into two categories:
front services and back services. Understanding these patterns helps in designing
a scalable and maintainable architecture.

## Service Organization

Goa offers flexibility in how you organize your services' designs and generated
code. Let's explore the two main approaches: unified and independent designs.

### Unified Design Approach

The unified approach brings all services under a single design hierarchy while
maintaining service-specific implementations. Here's how it works:

```go
// design/design.go - Top-level design file
package design

import (
    _ "myapi/services/users/design"    // Each service has its own design
    _ "myapi/services/products/design"
    . "goa.design/goa/v3/dsl"
)

var _ = API("myapi", func() {
    Title("My API")
    Description("Multi-service API example")
})
```

Each service maintains its own design file that contributes to the overall API:

```go
// services/users/design/design.go - Service-specific design
package design

import (
    . "goa.design/goa/v3/dsl"
    "myapi/design/types"
)

var _ = Service("users", func() {
    // Service-specific design
})
```

This approach centralizes code generation and type sharing:
- Generated code lives in the root `gen/` directory
- A single `goa gen` command generates all service code
- Shared types are automatically available across services
- The system maintains a unified OpenAPI specification
- Teams can easily maintain consistency across services

### Independent Design Approach

The independent approach treats each service as a standalone unit:

```go
// services/users/design/design.go - Independent service design
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = API("users", func() {
    Title("User Service")
    Description("User management API")
})

var _ = Service("users", func() {
    // Service-specific design
})
```

This approach maximizes service independence:
- Each service maintains its own `gen/` directory
- Services can be generated and versioned independently
- Each service has its own OpenAPI specification
- Services can easily move to separate repositories
- Teams can work independently on different services

## Transport Considerations

Your choice of transport protocol significantly impacts how services interact.
Let's examine the benefits of each approach:

### gRPC Services

gRPC excels at internal service communication through:
- Efficient binary protocol transmission
- Strongly typed interfaces via protocol buffers
- Built-in service discovery and load balancing
- Bi-directional streaming capabilities
- HTTP/JSON integration through gRPC gateway

### HTTP Services

HTTP serves external-facing services well by providing:
- Universal client compatibility
- Rich ecosystem of tools and middleware
- Familiar REST patterns
- Easy debugging and testing
- Natural fit for web applications

## Repository Structure

A well-organized repository helps teams navigate and maintain the codebase
effectively. Here's a recommended structure:

```
myapi/
├── README.md          # System overview and setup guide
├── design/            # Shared design elements
│   ├── design.go      # Top-level design for unified approach
│   └── types/         # Shared type definitions
├── gen/               # Generated code (unified approach)
│   ├── http/          # HTTP transport layer code
│   ├── grpc/          # gRPC transport layer code
│   └── types/         # Generated shared types
├── scripts/           # Development and deployment scripts
└── services/          # Service implementations
    ├── users/         # Example: User service
    │   ├── cmd/       # Service executables
    │   ├── design/    # Service-specific design
    │   ├── gen/       # Generated code (independent approach)
    │   ├── handlers/  # Business logic
    │   └── README.md  # Service documentation
    └── products/      # Example: Product service
        └── ...
```

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

**Unified Approach**:
- Single command generates all service code
- Centralized testing across services
- Coordinated builds and deployments
- Shared dependency management

**Independent Approach**:
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
    
    "myapi/services/users/gen/http/users/server"
    "myapi/services/users/gen/users"
    "myapi/services/users/handlers"
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
    svc := handlers.NewUsers()
    endpoints := users.NewEndpoints(svc)

    // Create transport handlers
    mux := goahttp.NewMuxer()
    server := server.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    server.Mount(mux)

    // Log mounted endpoints
    for _, m := range server.Mounts {
        log.Printf(ctx, "mounted %s %s", m.Method, m.Pattern)
    }

    // Create HTTP server
    handler := log.HTTP(ctx)(mux) // Add logger to request context
    httpServer := &http.Server{
        Addr:    *httpAddr,
        Handler: handler,
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
// services/users/handlers/users.go - Service implementation
package handlers

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

While each service typically runs independently, you might want to run multiple
services in a single process during development. This development server pattern
can be useful for local testing:

```go
// cmd/devserver/main.go - Development server
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
    
    users "myapi/services/users/handlers"
    products "myapi/services/products/handlers"
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

    // Initialize services
    usersSvc := users.NewUsers()
    productsSvc := products.NewProducts()

    // Create transport handlers
    mux := goahttp.NewMuxer()
    users.MountHandler(mux, usersSvc)
    products.MountHandler(mux, productsSvc)

    // Create HTTP server
    handler := log.HTTP(ctx)(mux) // Add logger to request context
    httpServer := &http.Server{
        Addr:    *httpAddr,
        Handler: handler,
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
            log.Printf(ctx, "Development server listening on %s", *httpAddr)
            errc <- httpServer.ListenAndServe()
        }()

        <-ctx.Done()
        log.Print(ctx, "shutting down development server")

        // Shutdown gracefully with a 30s timeout
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := httpServer.Shutdown(ctx); err != nil {
            log.Errorf(ctx, err, "failed to shutdown development server")
        }
    }()

    // Wait for shutdown
    if err := <-errc; err != nil && !strings.HasPrefix(err.Error(), "signal:") {
        log.Errorf(ctx, err, "server error")
    }
    cancel()
    wg.Wait()
    log.Print(ctx, "development server exited")
}
```

This development setup facilitates:
- Rapid local testing
- Simplified debugging
- Integration testing
- Resource efficiency in development

For production deployments, however, running services independently provides:
- Independent scaling
- Fault isolation
- Separate monitoring
- Independent updates

## Best Practices

When building multi-service systems with Goa, follow these guidelines:

1. Design Clear Service Boundaries
   Define explicit interfaces between services and minimize dependencies.

2. Choose Appropriate Transport
   Use gRPC for internal services and HTTP for external APIs.

3. Plan for Evolution
   Version your services and plan for backward compatibility.

4. Implement Robust Error Handling
   Define clear error types and handle cross-service failures gracefully.

5. Monitor and Log Effectively
   Implement consistent logging and monitoring across services.

6. Secure Service Communication
   Use appropriate authentication and authorization between services.

7. Document Service Interactions
   Maintain clear documentation of service APIs and dependencies.

## Next Steps

To deepen your understanding of multi-service systems:

- [Writing Service Clients](/docs/5-real-world/3-common-patterns/1-clients) - Learn
  about implementing robust service communication
- [HTTP Services](/docs/4-concepts/3-http) - Understand HTTP service implementation
- [gRPC Services](/docs/4-concepts/4-grpc) - Learn about gRPC service development
- [Interceptors](/docs/4-concepts/5-interceptors) - Add cross-cutting concerns