---
title: "Implementing the Service"
weight: 2
---

# Implementing a gRPC Service in Goa

After **designing** your gRPC service with Goa’s DSL, the next step is to
**implement** and run that service. In this tutorial, you will:

1. **Generate** the gRPC scaffolding.  
2. **Implement** the service interface.  
3. **Set up a `main.go`** to start your gRPC server.

## 1. Generate the gRPC Artifacts

From your project root (e.g., `grpcgreeter/`), run:

```bash
goa gen grpcgreeter/design
go mod tidy
```

This command analyzes your gRPC design (`greeter.go`) and creates a `gen` folder
with **transport-specific** code for gRPC. You’ll see files in these directories:

- `gen/grpc/greeter/`  
  - `pb/` containing the `.proto` file and generated Go code.  
  - `server/` containing server-side logic that **maps** your methods to gRPC calls.  
  - `client/` containing client-side logic for calling the service.  

**Note**: If you ever change your design (e.g., add or remove fields), **rerun**
*this command to keep the generated code in sync.

## 2. Explore the Generated Code

### `gen/grpc/greeter/pb/`

Holds protobuf artifacts:
- **`greeter.proto`**  
  The protobuf file describing your `SayHello` RPC.  
- **`greeter.pb.go`**  
  The compiled Go code from the `.proto` file.

### `gen/grpc/greeter/server/`

Contains the **server** side implementation stubs:
- **`server.go`**: Wires up your method definitions to the gRPC service.  
- **`encode_decode.go`**: Handles converting payloads/results into gRPC messages.  

### `gen/grpc/greeter/client/`

Contains the **client** side code for calling the `greeter` service:
- **`client.go`**: Creates a gRPC client for your method(s).
- **`encode_decode.go`**: Serializes/deserializes data between Go structs and gRPC messages.

## 3. Implement the Service Interface

Inside `gen/greeter/service.go`, you’ll find the **service interface** Goa
expects. For our `SayHello` example, it looks like:

```go
 // A simple gRPC service that says hello.
 type Service interface {
     // Send a greeting to a user.
     SayHello(context.Context, *SayHelloPayload) (res *SayHelloResult, err error)
 }
```

### Create a User-Owned Implementation

Goa separates **generated** code from **user** code to avoid overwriting your
logic on regeneration. Create a file such as `internal/greeter_service.go`:

```go
package internal

import (
	"context"
	gengreeter "grpcgreeter/gen/greeter"
)

// GreeterService implements the Service interface found in server/interface.go
type GreeterService struct{}

// NewGreeterService returns a new instance of GreeterService
func NewGreeterService() *GreeterService {
	return &GreeterService{}
}

// SayHello handles the RPC call from the client.
func (s *GreeterService) SayHello(ctx context.Context, payload *gengreeter.SayHelloPayload) (*gengreeter.SayHelloResult, error) {
	// Build a greeting message
	greeting := "Hello, " + payload.Name + "!"
	return &gengreeter.SayHelloResult{Greeting: greeting}, nil
}
```

This satisfies Goa’s service interface for `SayHello`. We simply append `payload.Name`
to a string. In real scenarios, you’d add domain logic, persistence, or
validation here.

## 4. Create Your `main.go` to Start the gRPC Server

If you don’t use `goa example`, you need your own `main.go` to **mount** the
service. For instance, create `cmd/greeter/main.go`:

```go
package main

import (
    "fmt"
    "log"
    "net"
    
    gengreeter "grpcgreeter/gen/greeter"
    pb "grpcgreeter/gen/grpc/greeter/pb"
    genserver "grpcgreeter/gen/grpc/greeter/server"
    "grpcgreeter/internal"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
)

func main() {
    // Create a TCP listener on port 8090
    lis, err := net.Listen("tcp", ":8090")
    if err != nil {
        log.Fatalf("Failed to listen on port 8090: %v", err)
    }

    // Create a gRPC server
    grpcServer := grpc.NewServer()

    // Instantiate your service
    svc := internal.NewGreeterService()

    // Convert it into Goa endpoints and register with gRPC
    endpoints := gengreeter.NewEndpoints(svc)
    pb.RegisterGreeterServer(grpcServer, genserver.New(endpoints, nil))
    
    // Enable server reflection for tools like grpcurl
    reflection.Register(grpcServer)

    fmt.Println("gRPC greeter service listening on :8090")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("gRPC server failed: %v", err)
    }
}
```

### Explanation

- **`net.Listen("tcp", ":8090")`**: Opens port `8090` for incoming gRPC requests.  
- **`grpc.NewServer()`**: Instantiates a bare gRPC server.  
- **`internal.NewGreeterService()`**: Creates your custom service.  
- **`greeterserver.NewEndpoints(svc)`**: Wraps your service in transport-agnostic
  Goa endpoints.  
- **`RegisterGreeterServer(...)`**: Tells the gRPC server about your method(s).

## 5. Run the gRPC Service

Simply run the `greeter` service, from the project root:

```bash
go mod tidy
go run grpcgreeter/cmd/greeter
```

When the service starts, it listens for gRPC calls on port 8090.

## 6. Next Steps

With your **gRPC service running**, you can:

- **Test** it using the official gRPC CLI or other client libraries.  
- Add more **methods** to the DSL and rerun `goa gen`.  
- Integrate advanced features like **streaming** or **error handling** with gRPC
  status codes.

Continue to the [Running tutorial](./3-running.md) to learn how to call your new
service and confirm everything works as expected.
