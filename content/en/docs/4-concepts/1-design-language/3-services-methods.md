---
title: "Services & Methods"
linkTitle: "Services & Methods"
weight: 3
description: >
  Define your API's services and methods using Goa's service definition DSL. Create clear, well-documented endpoints with strongly typed payloads and results.
---

## Services

A service in Goa represents a collection of related methods that work together
to provide specific functionality. Services help organize your API into logical
groupings.

### Service DSL

The Service DSL supports several options to configure and document your service:

```go
var _ = Service("users", func() {
    // Basic documentation
    Description("User management service")
    
    // Detailed documentation
    Docs(func() {
        Description("Detailed documentation for the user service")
        URL("https://example.com/docs/users")
    })

    // Service-level error definitions
    Error("unauthorized", String, "Authentication failed")
    Error("not_found", NotFound, "Resource not found")
    
    // Service-wide metadata
    Meta("swagger:tag", "Users")
    Meta("rpc:package", "usersvc")
    
    // Security requirements
    Security(OAuth2, func() {
        Scope("read:users")
        Scope("write:users")
    })
    
    // Service-level variables
    Variable("version", String, func() {
        Description("API version")
        Default("v1")
        Enum("v1", "v2")
    })
    
    // Methods
    Method("create", func() {
        // ... method definition
    })
    
    Method("list", func() {
        // ... method definition
    })
    
    // Files served by the service
    Files("/docs", "./swagger", func() {
        Description("API documentation")
    })
})
```

### Service-Level Errors

Define errors that can be returned by all methods in the service:

```go
var _ = Service("orders", func() {
    // All methods in the service will return this error
    Error("unauthorized")
})
```

> **Note:** The `Error` DSL is used to define errors that can be returned by all
> methods in the service. It is not appropriate for defining errors that are
> specific to a subset of methods. Instead, use the `Error` DSL within the
> method or API definition for this purpose.

### Service Documentation

Use the Docs DSL to provide detailed documentation:

```go
var _ = Service("payments", func() {
    Description("Payment processing service")
    
    Docs(func() {
        Description(`The payment service handles all payment-related operations.
            
It provides methods for:
- Processing payments
- Refunding transactions
- Querying payment status
- Managing payment methods`)
        
        URL("https://example.com/docs/payments")
        
        // Additional documentation metadata
        Meta("doc:section", "Financial Services")
        Meta("doc:category", "Core APIs")
    })
})
```

### Multiple Services

Complex APIs can be organized into multiple services:

```go
var _ = Service("users", func() {
    Description("User management service")
    // ... user-related methods
})

var _ = Service("billing", func() {
    Description("Billing and payment service")
    // ... billing-related methods
})
```

## Methods

Methods define the operations that can be performed within a service. Each
method specifies its input (payload), output (result), and error conditions.

### Basic Method Structure

```go
Method("add", func() {
    Description("Add two numbers together")
    
    // Input parameters
    Payload(func() {
        Field(1, "a", Int32, "First operand")
        Field(2, "b", Int32, "Second operand")
        Required("a", "b")
    })
    
    // Success response
    Result(Int32)
    
    // Error responses
    Error("overflow")
})
```

### Payload Types

Methods can accept different types of payloads:

```go
// Simple payload using existing type
Method("getUser", func() {
    Payload(String, "User ID")
    Result(User)
})

// Structured payload defined inline
Method("createUser", func() {
    Payload(func() {
        Field(1, "name", String, "User's full name")
        Field(2, "email", String, "Email address", func() {
            Format(FormatEmail)
        })
        Field(3, "role", String, "User role", func() {
            Enum("admin", "user", "guest")
        })
        Required("name", "email", "role")
    })
    Result(User)
})

// Reference to predefined payload type
Method("updateUser", func() {
    Payload(UpdateUserPayload)
    Result(User)
})
```

### Result Types

Methods can return different types of results:

```go
// Simple primitive result
Method("count", func() {
    Result(Int64)
})

// Structured result defined inline
Method("search", func() {
    Result(func() {
        Field(1, "items", ArrayOf(User), "Matching users")
        Field(2, "total", Int64, "Total count")
        Required("items", "total")
    })
})
```

### Error Handling

Define expected error conditions for methods:

```go
Method("divide", func() {
    Payload(func() {
        Field(1, "a", Float64, "Dividend")
        Field(2, "b", Float64, "Divisor")
        Required("a", "b")
    })
    Result(Float64)
    
    // Method-specific errors
    Error("division_by_zero", func() {
        Description("Attempted to divide by zero")
    })
})
```

### Streaming Methods

Goa supports streaming for both payloads and results:

```go
Method("streamNumbers", func() {
    Description("Stream a sequence of numbers")
    
    // Stream of integers as input
    StreamingPayload(Int32)
    
    // Stream of integers as output
    StreamingResult(Int32)
})

Method("processEvents", func() {
    Description("Process a stream of events")
    
    // Stream structured data
    StreamingPayload(func() {
        Field(1, "event_type", String)
        Field(2, "data", Any)
        Required("event_type", "data")
    })
    
    // Return summary result
    Result(func() {
        Field(1, "processed", Int64, "Number of events processed")
        Field(2, "errors", Int64, "Number of errors encountered")
        Required("processed", "errors")
    })
})
```

See [the streaming tutorial](../../3-tutorials/4-streaming) for more details on streaming.

## Best Practices

{{< alert title="Service Design Guidelines" color="primary" >}}
**Service Organization**
- Group related functionality into services
- Keep service scope focused and cohesive
- Use clear, descriptive service names
- Document service purpose and usage

**Method Design**
- Use clear, action-oriented method names
- Provide detailed descriptions
- Define appropriate error responses
- Consider validation requirements
- Document expected behavior

**Type Usage**
- Use strongly typed payloads and results
- Define reusable types for common structures
- Use appropriate validation rules
- Include meaningful examples
{{< /alert >}}

