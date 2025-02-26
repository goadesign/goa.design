---
title: "Transport Mapping"
linkTitle: "Transport Mapping"
weight: 5
description: >
  Define how your service communicates over different transport protocols. Map your service methods to HTTP and gRPC endpoints.
---

## Transport Mapping Overview

Goa supports both HTTP and gRPC. The transport mapping DSL allows you to define how your service methods are exposed over these protocols.

## HTTP Transport

The [HTTP DSL](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP) defines how your service methods map to HTTP endpoints. You can configure this at three levels:
- API level: Define global HTTP settings
- Service level: Configure service-wide HTTP properties
- Method level: Specify method-specific HTTP behavior

### Mapping Levels

#### API Level
Define global HTTP settings that apply to all services:
```go
API("bookstore", func() {
    HTTP(func() {
        Path("/api/v1") // Global prefix for all endpoints
    })
})
```

#### Service Level
Configure HTTP properties for all methods in a service:
```go
Service("books", func() {
    HTTP(func() {
        Path("/books")     // Service-wide path prefix
        Parent("store")    // Parent service for path nesting
    })
})
```

#### Method Level
Define specific HTTP behavior for individual methods:
```go
Method("show", func() {
    HTTP(func() {
        GET("/{id}")       // HTTP method and path
        Response(StatusOK) // Success response code
    })
})
```

### HTTP Mapping Features

The HTTP DSL provides several features for configuring endpoints:

1. **Path Parameters**
   - Map payload fields to URL path segments
   - Use pattern matching and validation
   - Support optional parameters

2. **Query Parameters**
   - Map payload fields to query string parameters
   - Define parameter types and validation
   - Handle optional parameters

3. **Headers**
   - Map payload/result fields to HTTP headers
   - Set required and optional headers
   - Define header formats and validation

4. **Response Codes**
   - Map results to success status codes
   - Define error response codes
   - Handle different response scenarios

## gRPC Transport

The gRPC DSL defines how your service methods map to gRPC procedures. Like HTTP, it can be configured at multiple levels.

### gRPC Features

1. **Message Mapping**
   - Define request/response message structures
   - Map fields to protobuf types
   - Configure field numbers and options

2. **Status Codes**
   - Map service results to gRPC status codes
   - Define error code mappings
   - Handle standard gRPC status scenarios

3. **Metadata**
   - Configure gRPC metadata handling
   - Map headers to metadata
   - Define metadata validation

### Common Patterns

Here are some common transport mapping patterns:

#### RESTful Resource Mapping
```go
Service("users", func() {
    HTTP(func() {
        Path("/users")
    })
    
    Method("list", func() {
        HTTP(func() {
            GET("/")              // GET /users
        })
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")          // GET /users/{id}
        })
    })
})
```

#### Mixed Protocol Support
Services can support both HTTP and gRPC:
```go
Method("create", func() {
    // HTTP mapping
    HTTP(func() {
        POST("/")
        Response(StatusCreated)
    })
    
    // gRPC mapping
    GRPC(func() {
        Response(CodeOK)
    })
})
```

## Best Practices

{{< alert title="Transport Mapping Guidelines" color="primary" >}}
**HTTP Design**
- Use consistent URL patterns
- Follow RESTful conventions
- Choose appropriate status codes
- Handle errors consistently

**gRPC Design**
- Use meaningful service names
- Define clear message structures
- Follow protobuf best practices
- Plan for backwards compatibility

**General Tips**
- Document transport-specific behavior
- Consider security implications
- Plan for versioning
- Test both transport layers
{{< /alert >}}

## Transport-Specific Error Handling

Each transport protocol has its own way of representing errors:

### HTTP Errors
- Map to appropriate status codes
- Include error details in response body
- Use standard headers for additional info
- Follow HTTP error conventions

### gRPC Errors
- Use standard gRPC status codes
- Include detailed error messages
- Leverage error details feature
- Follow gRPC error model

