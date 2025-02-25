---
title: "Implementing the Service"
linkTitle: "Implementing"
weight: 2
description: "Guide to implementing gRPC services in Goa, covering code generation, service implementation, server setup, and understanding the generated gRPC artifacts."
---

After designing your gRPC service with Goa's DSL, it's time to bring it to life! This guide will walk you through implementing your service step by step. You'll learn how to:

1. Generate the gRPC scaffolding
2. Understand the generated code structure
3. Implement your service logic
4. Set up the gRPC server

## 1. Generate the gRPC Artifacts

First, let's generate all the necessary gRPC code. From your project root (e.g., `grpcgreeter/`), run:

```bash
goa gen grpcgreeter/design
go mod tidy
```

This command analyzes your gRPC design (`greeter.go`) and generates the required code in the `gen/` directory. Here's what gets created:

```
gen/
├── grpc/
│   └── greeter/
│       ├── pb/           # Protocol Buffers definitions
│       ├── server/       # Server-side gRPC code
│       └── client/       # Client-side gRPC code
└── greeter/             # Service interfaces and types
```

{{< alert title="Important" >}}
Remember to rerun `goa gen` whenever you modify your design to keep the generated code in sync with your service definition.
{{< /alert >}}

## 2. Understanding the Generated Code

Let's explore what Goa generated for us:

### Protocol Buffer Definitions (gen/grpc/greeter/pb/)

- **`greeter.proto`**: The Protocol Buffers service definition
  ```protobuf
  service Greeter {
    rpc SayHello (SayHelloRequest) returns (SayHelloResponse);
  }
  ```
- **`greeter.pb.go`**: The compiled Go code from the `.proto` file

### Server-Side Code (gen/grpc/greeter/server/)

- **`server.go`**: Maps your service methods to gRPC handlers
- **`encode_decode.go`**: Converts between your service types and gRPC messages
- **`types.go`**: Contains server-specific type definitions

### Client-Side Code (gen/grpc/greeter/client/)

- **`client.go`**: gRPC client implementation
- **`encode_decode.go`**: Client-side serialization logic
- **`types.go`**: Client-specific type definitions

## 3. Implementing Your Service

Now for the fun part - implementing your service logic! Create a new file called `greeter.go` in your service package:

```go
package greeter

import (
    "context"
    "fmt"

    // Use a descriptive alias for the generated package
    gengreeter "grpcgreeter/gen/greeter"
)

// GreeterService implements the Service interface
type GreeterService struct{}

// NewGreeterService creates a new service instance
func NewGreeterService() *GreeterService {
    return &GreeterService{}
}

// SayHello implements the greeting logic
func (s *GreeterService) SayHello(ctx context.Context, p *gengreeter.SayHelloPayload) (*gengreeter.SayHelloResult, error) {
    // Add input validation if needed
    if p.Name == "" {
        return nil, fmt.Errorf("name cannot be empty")
    }

    // Build the greeting
    greeting := fmt.Sprintf("Hello, %s!", p.Name)
    
    // Return the result
    return &gengreeter.SayHelloResult{
        Greeting: greeting,
    }, nil
}
```

### Best Practices for Implementation

1. **Error Handling**: Use appropriate gRPC status codes
2. **Validation**: Validate inputs early
3. **Context Usage**: Respect context cancellation
4. **Logging**: Add meaningful logs for debugging
5. **Testing**: Write unit tests for your service logic

## 4. Setting Up the gRPC Server

Create your server entry point in `cmd/greeter/main.go`:

```go
package main

import (
    "context"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"
    
    "grpcgreeter"
    gengreeter "grpcgreeter/gen/greeter"
    genpb "grpcgreeter/gen/grpc/greeter/pb"
    genserver "grpcgreeter/gen/grpc/greeter/server"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
)

func main() {
    // Create a TCP listener
    lis, err := net.Listen("tcp", ":8090")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }

    // Create a new gRPC server with options
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(loggingInterceptor),
    )

    // Initialize your service
    svc := greeter.NewGreeterService()
    
    // Create endpoints
    endpoints := gengreeter.NewEndpoints(svc)
    
    // Register service with gRPC server
    genpb.RegisterGreeterServer(srv, genserver.New(endpoints, nil))
    
    // Enable server reflection for debugging tools
    reflection.Register(srv)

    // Handle graceful shutdown
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
        <-sigCh
        log.Println("Shutting down gRPC server...")
        srv.GracefulStop()
    }()

    // Start serving
    log.Printf("gRPC server listening on :8090")
    if err := srv.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}

// Example logging interceptor
func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    log.Printf("Handling %s", info.FullMethod)
    return handler(ctx, req)
}
```

### Understanding the Server Code

Let's break down the key components of our gRPC server:

1. **TCP Listener Setup**:
   ```go
   lis, err := net.Listen("tcp", ":8090")
   ```
   Opens port 8090 for incoming gRPC connections. This is where your service will listen for client requests.

2. **Server Creation**:
   ```go
   srv := grpc.NewServer(
       grpc.UnaryInterceptor(loggingInterceptor),
   )
   ```
   Creates a new gRPC server with middleware (interceptor) support. The logging interceptor will log every incoming request.

3. **Service Registration**:
   ```go
   svc := greeter.NewGreeterService()
   endpoints := gengreeter.NewEndpoints(svc)
   genpb.RegisterGreeterServer(srv, genserver.New(endpoints, nil))
   ```
   - Creates your service implementation
   - Wraps it in Goa's transport-agnostic endpoints
   - Registers it with the gRPC server so it can handle incoming requests

4. **Server Reflection**:
   ```go
   reflection.Register(srv)
   ```
   Enables gRPC reflection, allowing tools like `grpcurl` to discover your service methods dynamically.

5. **Graceful Shutdown**:
   ```go
   go func() {
       sigCh := make(chan os.Signal, 1)
       signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
       <-sigCh
       srv.GracefulStop()
   }()
   ```
   - Listens for interrupt signals (Ctrl+C) or termination requests
   - Ensures in-flight requests complete before shutting down
   - Prevents connection drops and data loss

6. **Request Logging**:
   ```go
   func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
       log.Printf("Handling %s", info.FullMethod)
       return handler(ctx, req)
   }
   ```
   - Intercepts every gRPC call before it reaches your service
   - Logs the method being called
   - Useful for debugging and monitoring
   - Can be extended for metrics, authentication, or other cross-cutting concerns

### Server Features

- **Graceful Shutdown**: Handles termination signals properly
- **Logging**: Includes a basic request logging interceptor
- **Reflection**: Enables tools like `grpcurl` to discover services
- **Error Handling**: Proper error propagation to clients
- **Extensibility**: Easy to add more interceptors for auth, metrics, etc.

## 5. Building and Running

1. **Build the service**:
   ```bash
   go build -o greeter cmd/greeter/main.go
   ```

2. **Run the server**:
   ```bash
   ./greeter
   ```

Your gRPC service is now running and ready to accept connections on port 8090!

## Next Steps

Now that your service is implemented and running, you can:

- Move on to the [Running tutorial](../3-running) to test your service
- Add metrics and monitoring
- Implement additional service methods
- Add authentication and authorization
- Set up CI/CD pipelines

Remember to check out the [gRPC Concepts](../../4-concepts/4-grpc) section for advanced topics like streaming, middleware, and error handling.
