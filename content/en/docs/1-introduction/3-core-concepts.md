---
title: Core Concepts
weight: 3
description: "Explore Goa's fundamental concepts including design-first philosophy, services, methods, type system, and transport mappings to build well-structured, transport-independent APIs."
---

Let's explore how Goa helps you design and implement services. Understanding these core concepts will help you create well-structured APIs that are transport-independent, type-safe, and maintainable.

## The Design-First Philosophy

{{< alert title="Key Concept" color="primary" >}}
Goa encourages you to think about your API design before implementation. You describe your entire service architecture using Goa's Domain-Specific Language (DSL), which becomes the single source of truth for your system.
{{< /alert >}}

### Why Design First?
- Teams can agree on interfaces before writing implementation code
- API contracts are clear and unambiguous
- Changes can be reviewed at the design level
- Generated code ensures the implementation matches the design

## Services and Methods

{{< alert title="Building Blocks" color="primary" >}}
A Goa design consists of one or more services. Each service is a collection of methods that define the operations your API can perform. Methods are described in a transport-agnostic way, focusing on their logical interface rather than how they're exposed to clients.
{{< /alert >}}

Here's a basic service design:

```go
var _ = Service("calculator", func() {
    // Service-level settings
    Description("A simple calculator service")

    // Define methods
    Method("add", func() {
        Description("Add two numbers")
        
        // Transport-agnostic interface
        Payload(func() {
            Attribute("x", Int, "First operand")
            Attribute("y", Int, "Second operand")
            Required("x", "y")
        })
        Result(Int, "Sum of operands")
        Error("overflow")
    })
})
```

### Multiple Services in One Design

One of Goa's powerful features is the ability to design multiple related services together:

```go
var _ = Service("users", func() {
    Description("User management service")
    
    Method("create", func() { /* ... */ })
    Method("get", func() { /* ... */ })
})

var _ = Service("orders", func() {
    Description("Order processing service")
    
    Method("place", func() { /* ... */ })
    Method("track", func() { /* ... */ })
})
```

This approach allows you to:
- Design entire systems with clear service boundaries
- Maintain consistency across related services
- Share types and patterns between services
- Generate client libraries that can interact with all services

## The Type System

{{< alert title="Rich Data Modeling" color="primary" >}}
Goa's type system is as expressive as JSON Schema, allowing you to define complex data structures with validation rules, documentation, and examples. These types can be reused across services and methods.
{{< /alert >}}

### Defining Types

```go
// Define a reusable type named "User" that can be referenced by services
var User = Type("User", func() {
    // Add a description that appears in generated documentation
    Description("User account information")
    
    // Define attributes with their types and descriptions
    Attribute("id", Int, "Unique user ID")
    // Use nested func() to add extra configuration to attributes
    Attribute("email", String, func() {
        // Add format validation
        Format(FormatEmail)
        // Provide example for documentation
        Example("user@example.com")
        Description("User's email address")
    })
    // Enums restrict values to a predefined set
    Attribute("role", String, func() {
        Enum("admin", "user", "guest")
        Description("User's role in the system")
    })
    // ArrayOf creates an array type
    Attribute("preferences", ArrayOf(String))
    // MapOf creates a map type with string keys and any values
    Attribute("metadata", MapOf(String, Any))
    
    // Mark which attributes must be present
    Required("id", "email", "role")
})
```

### Using Types in Methods

Types can be used for method payloads, results, and error definitions:

```go
Method("create", func() {
    Description("Create a new user account")
    
    // Use the User type for both input and output
    Payload(func() {
        Reference(User)
        Attribute("email") // Inherits the email attribute from the User type
        Attribute("role")  // Inherits the role attribute from the User type
        Required("email", "role")
    })
    Result(User)
    
    // Define possible errors
    Error("invalid_email")
})
```

## Transport Mappings

After defining your service interface, you map it to specific transport protocols. This separation allows you to expose your services via multiple protocols without changing the core design.

For HTTP, you can map your methods to REST endpoints by specifying:
- HTTP verbs (GET, POST, PUT, DELETE, etc.)
- URL paths and path parameters
- Query parameters
- Request/response headers
- Status codes
- Content types and encodings

Payload and result attributes can be mapped to HTTP headers, query parameters, and the request and response bodies.

Similarly, for gRPC, you can map your methods to gRPC methods and map payload and result attributes to the request and response messages and metadata. You can also specify the gRPC status codes for errors.

Continuing with the previous example, here's how you can map the `create` method to HTTP and gRPC:

```go
HTTP(func() {
    POST("/users")
    Body(User)
    Response(StatusCreated)
})

gRPC(func() {
    Message(User)
    Response(CodeOK)
})
```

## Code Generation and Implementation

Goa generates all the infrastructure code needed to serve your API, letting you focus on implementing the business logic. The generated code follows a clean architecture pattern with clear separation of concerns.

### Generated Code Structure
```
gen/
├── users/
│   ├── service.go      # Service interface definitions
│   ├── endpoints.go    # Transport-agnostic endpoints
│   └── client.go       # Client package
├── http/
│   ├── server/        # HTTP server code
│   ├── client/        # HTTP client code
│   └── openapi.json   # API documentation
└── grpc/
    ├── server/        # gRPC server code
    ├── client/        # gRPC client code
    └── pb/            # Protocol buffers
```

### 1. Generated Interface
Goa generates service interfaces that define the contract between your transport layer and business logic. These interfaces are type-safe and include all the methods you defined in your design.

For example, given a user service design:

```go
// gen/users/service.go
type Service interface {
    Create(context.Context, *CreatePayload) (*User, error)
    Get(context.Context, *GetPayload) (*User, error)
}
```

### 2. Your Implementation

You implement your service by creating a struct that satisfies the generated interface. This is where you write your actual business logic:

```go
// services/users.go
type usersService struct {
    db *Database
}

func (s *usersService) Create(ctx context.Context, p *users.CreatePayload) (*users.User, error) {
    // Your business logic here
    user := &users.User{
        Name: p.Name,
        Age:  p.Age,
    }

    // Save user to database
    err := s.db.Save(user)
    if err != nil {
        return nil, err
    }

    return user, nil
}
```

### 3. Main Application

Finally, you compose everything together in your main application. The generated code provides factories and constructors that make it easy to wire up all the components:

```go
// cmd/server/main.go
func main() {
    // Create your service implementation
    svc := &usersService{db: initDB()}
    
    // Use Goa's generated factories
    endpoints := genusers.NewEndpoints(svc)
    
    // Create and configure the HTTP server 
    // Create a new HTTP Muxer
    mux := goahttp.NewMuxer()
    // Use generated factory method to create HTTP server
    httpServer := genhttp.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    // Mount the HTTP server on the Muxer
    genhttp.Mount(mux, httpServer)
    
    // Create and configure the gRPC server
    // Use generated factory method to create gRPC server
    grpcServer := gengrpc.New(endpoints)
    // Use standard Go pattern to create gRPC server
    srv := grpc.NewServer()
    // Register the gRPC server with the generated service implementation
    genpb.RegisterUsersServer(srv, grpcServer)
    
    // Configure your servers
    grpcServer.Mount(mux)
    
    // Start servers using standard Go patterns
    go http.ListenAndServe(":8080", mux)
    grpcListener, _ := net.Listen("tcp", ":8081")
    go grpcServer.Serve(grpcListener)
}
```

## The Complete Picture

{{< alert title="Design Flow" color="primary" >}}
1. **Design Services**: Define methods and types independent of transport
2. **Add Transport Mappings**: Specify how your design maps to HTTP/gRPC
3. **Generate Code**: Let Goa create the infrastructure
4. **Implement Logic**: Write your business logic against generated interfaces
5. **Wire Everything**: Use generated factories to compose your application
{{< /alert >}}

This approach provides:
- Clear separation between design and implementation
- Type-safe interfaces throughout your codebase
- Transport protocol flexibility
- Consistent patterns across services
- Automatic validation and error handling
- Generated documentation and client libraries

## Ready to Build?

Now that you understand Goa's core concepts, head to the [Getting Started](../2-getting-started/) guide to build your first service!

---

The next section will walk you through installing Goa and creating your first API.

