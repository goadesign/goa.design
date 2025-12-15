---
title: Code Generation
weight: 3
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

Goa's code generation transforms your design into production-ready code. Rather than just scaffolding, Goa generates complete, runnable service implementations that follow best practices and maintain consistency across your entire API.



## Command Line Tools

### Installation

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

### Commands

All commands expect Go package import paths, not filesystem paths:

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

#### Generate Code (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

The primary command for code generation:
- Processes your design package and generates implementation code
- Recreates the entire `gen/` directory from scratch each time
- Run after every design change

#### Create Example (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

A scaffolding command:
- Creates a one-time example implementation
- Generates handler stubs with example logic
- Run once when starting a new project
- Will NOT overwrite existing custom implementation

#### Show Version

```bash
goa version
```

### Development Workflow

1. Create initial design
2. Run `goa gen` to generate base code
3. Run `goa example` to create implementation stubs
4. Implement your service logic
5. Run `goa gen` after every design change

**Best Practice:** Commit generated code to version control rather than generating during CI/CD. This ensures reproducible builds and allows tracking changes in generated code.

---

## Generation Process

When you run `goa gen`, Goa follows a systematic process:

### 1. Bootstrap Phase

Goa creates a temporary `main.go` that:
- Imports Goa packages and your design package
- Runs DSL evaluation
- Triggers code generation

### 2. Design Evaluation

- DSL functions execute to create expression objects
- Expressions combine into a complete API model
- Relationships between expressions are established
- Design rules and constraints are validated

### 3. Code Generation

- Validated expressions pass to code generators
- Templates render to produce code files
- Output writes to the `gen/` directory

---

## Generated Code Structure

A typical generated project:

```
myservice/
├── cmd/                    # Generated example commands
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/                 # Your design files
│   └── design.go
├── gen/                    # Generated code (don't edit)
│   ├── calc/               # Service-specific code
│   │   ├── client.go
│   │   ├── endpoints.go
│   │   └── service.go
│   ├── http/               # HTTP transport layer
│   │   ├── calc/
│   │   │   ├── client/
│   │   │   └── server/
│   │   └── openapi.json
│   └── grpc/               # gRPC transport layer
│       └── calc/
│           ├── client/
│           ├── server/
│           └── pb/
└── myservice.go            # Your service implementation
```

### Service Interfaces

Generated in `gen/<service>/service.go`:

```go
// Service interface defines the API contract
type Service interface {
    Add(context.Context, *AddPayload) (res int, err error)
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// Payload types
type AddPayload struct {
    A int32
    B int32
}

// Constants for observability
const ServiceName = "calc"
var MethodNames = [2]string{"add", "multiply"}
```

### Endpoint Layer

Generated in `gen/<service>/endpoints.go`:

```go
// Endpoints wraps service methods in transport-agnostic endpoints
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpoints creates endpoints from service implementation
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}

// Use applies middleware to all endpoints
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
```

Endpoint middleware example:

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("request: %v", req)
        res, err = next(ctx, req)
        log.Printf("response: %v", res)
        return
    }
}

endpoints.Use(LoggingMiddleware)
```

### Client Code

Generated in `gen/<service>/client.go`:

```go
// Client provides typed methods for service calls
type Client struct {
    AddEndpoint      goa.Endpoint
    MultiplyEndpoint goa.Endpoint
}

func NewClient(add, multiply goa.Endpoint) *Client {
    return &Client{
        AddEndpoint:      add,
        MultiplyEndpoint: multiply,
    }
}

func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
    ires, err := c.AddEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(int), nil
}
```

---

## HTTP Code Generation

### Server Implementation

Generated in `gen/http/<service>/server/server.go`:

```go
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server

// Server exposes handlers for modification
type Server struct {
    Mounts   []*MountPoint
    Add      http.Handler
    Multiply http.Handler
}

// Use applies HTTP middleware to all handlers
func (s *Server) Use(m func(http.Handler) http.Handler)
```

Complete server setup:

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)
    genhttp.Mount(mux, server)
    http.ListenAndServe(":8080", mux)
}
```

### Client Implementation

Generated in `gen/http/<service>/client/client.go`:

```go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```

Complete client setup:

```go
func main() {
    httpClient := genclient.NewClient(
        "http",
        "localhost:8080",
        http.DefaultClient,
        goahttp.RequestEncoder,
        goahttp.ResponseDecoder,
        false,
    )

    client := gencalc.NewClient(
        httpClient.Add(),
        httpClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## gRPC Code Generation

### Protobuf Definition

Generated in `gen/grpc/<service>/pb/`:

```protobuf
syntax = "proto3";
package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}
```

### Server Implementation

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    lis, _ := net.Listen("tcp", ":8080")
    svr.Serve(lis)
}
```

### Client Implementation

```go
func main() {
    conn, _ := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, _ := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Customization

### Type Generation Control

Force generation of types not directly referenced by methods:

```go
var MyType = Type("MyType", func() {
    // Force generation in specific services
    Meta("type:generate:force", "service1", "service2")
    
    // Or force generation in all services
    Meta("type:generate:force")
    
    Attribute("name", String)
})
```

### Package Organization

Generate types in a shared package:

```go
var CommonType = Type("CommonType", func() {
    Meta("struct:pkg:path", "types")
    Attribute("id", String)
})
```

Creates:
```
gen/
└── types/
    └── common_type.go
```

### Field Customization

```go
var Message = Type("Message", func() {
    Attribute("id", String, func() {
        // Override field name
        Meta("struct:field:name", "ID")
        
        // Add custom struct tags
        Meta("struct:tag:json", "id,omitempty")
        Meta("struct:tag:msgpack", "id,omitempty")
        
        // Override type
        Meta("struct:field:type", "bson.ObjectId", "github.com/globalsign/mgo/bson", "bson")
    })
})
```

### Protocol Buffer Customization

```go
var MyType = Type("MyType", func() {
    // Override protobuf message name
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "status", Int32, func() {
        // Override protobuf field type
        Meta("struct:field:proto", "int32")
    })

    // Use Google's timestamp type
    Field(2, "created_at", String, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})

// Specify protoc include paths
var _ = API("calc", func() {
    Meta("protoc:include", "/usr/include", "/usr/local/include")
})
```

### OpenAPI Customization

```go
var _ = API("MyAPI", func() {
    // Control generation
    Meta("openapi:generate", "false")
    
    // Format JSON output
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
    
    // Disable example generation
    Meta("openapi:example", "false")
})

var _ = Service("UserService", func() {
    // Add tags
    HTTP(func() {
        Meta("openapi:tag:Users")
        Meta("openapi:tag:Backend:desc", "Backend API Operations")
    })
    
    Method("CreateUser", func() {
        // Custom operation ID
        Meta("openapi:operationId", "{service}.{method}")
        
        // Custom summary
        Meta("openapi:summary", "Create a new user")
        
        HTTP(func() {
            // Add extensions
            Meta("openapi:extension:x-rate-limit", `{"rate": 100}`)
            POST("/users")
        })
    })
})

var User = Type("User", func() {
    // Override type name in OpenAPI spec
    Meta("openapi:typename", "CustomUser")
})
```

---

## Types and Validation

### Validation Enforcement

Goa validates data at system boundaries:
- **Server-side**: Validates incoming requests
- **Client-side**: Validates incoming responses
- **Internal code**: Trusted to maintain invariants

### Pointer Rules for Struct Fields

| Properties | Payload/Result | Request Body (Server) | Response Body (Server) |
|------------|---------------|----------------------|---------------------|
| Required OR Default | Direct (-) | Pointer (*) | Direct (-) |
| Not Required, No Default | Pointer (*) | Pointer (*) | Pointer (*) |

Special types:
- **Objects (structs)**: Always use pointers
- **Arrays and Maps**: Never use pointers (already reference types)

Example:
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

### Default Value Handling

- **Marshaling**: Default values initialize nil arrays/maps
- **Unmarshaling**: Default values apply to missing optional fields (not missing required fields)

---

## Views and Result Types

Views control how result types are rendered in responses.

### How Views Work

1. Service method includes a view parameter
2. A views package is generated at the service level
3. View-specific validation is automatically generated

### Server-Side Response

1. Viewed result type is marshalled
2. Nil attributes are omitted
3. View name is passed in "Goa-View" header

### Client-Side Response

1. Response is unmarshalled
2. Transformed into viewed result type
3. View name extracted from "Goa-View" header
4. View-specific validation performed
5. Converted back to service result type

### Default View

If no views are defined, Goa adds a "default" view that includes all basic fields.

---

## Plugin System

Goa's plugin system extends code generation. Plugins can:

1. **Add New DSLs** - Additional design language constructs
2. **Modify Generated Code** - Inspect and modify files, add new files

Example using the CORS plugin:

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
    })
})
```

Common plugin use cases:
- Protocol support (CORS, etc.)
- Additional documentation formats
- Custom validation rules
- Cross-cutting concerns (logging, metrics)
- Configuration file generation

---

## See Also

- [DSL Reference](dsl-reference/) — Complete DSL reference for design files
- [HTTP Guide](http-guide/) — HTTP transport features and customization
- [gRPC Guide](grpc-guide/) — gRPC transport features and Protocol Buffers
- [Quickstart](quickstart/) — Getting started with code generation
