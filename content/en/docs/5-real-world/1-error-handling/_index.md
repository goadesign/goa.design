---
linkTitle: Error Handling
title: Error Handling
weight: 1
description: "Learn how to effectively handle errors in Goa services, including error definition, transport mapping, and best practices."
---

# Error Handling in Goa

Goa provides a robust error handling system that enables you to define, manage, and communicate errors effectively across your services. This guide covers everything you need to know about error handling in Goa.

## Overview

Goa takes a "battery included" approach to error handling where errors can be defined with minimal information (just a name) while also supporting completely custom error types when needed. The framework generates both code and documentation from your error definitions, ensuring consistency across your API.

Key features of Goa's error handling:

- Service-level and method-level error definitions
- Default and custom error types
- Transport-specific status code mapping (HTTP/gRPC)
- Generated helper functions for error creation
- Automatic documentation generation

## Defining Errors

### API-Level Errors

Errors can be defined at the API level to create reusable error definitions.
Unlike service-level errors, API-level errors don't automatically apply to all
methods. Instead, they provide a way to define error properties, including
transport mappings, once and reuse them across services and methods:

```go
var _ = API("calc", func() {
    // Define reusable error with transport mapping
    Error("invalid_argument")  // Uses default ErrorResult type
    HTTP(func() {
        Response("invalid_argument", StatusBadRequest)
    })
})

var _ = Service("divider", func() {
    // Reference the API-level error
    Error("invalid_argument")  // Reuses error defined above
                              // No need to define HTTP mapping again

    Method("divide", func() {
        Payload(DivideRequest)
        // Method-specific error with custom type
        Error("div_by_zero", DivByZero, "Division by zero")
    })
})
```

This approach:
- Enables consistent error definitions across your API
- Reduces duplication of transport mappings
- Allows for centralized error handling policies
- Makes it easier to maintain consistent error responses

### Service-Level Errors

Service-level errors are available to all methods within a service. Unlike
API-level errors which provide reusable definitions, service-level errors
automatically apply to every method in the service:

```go
var _ = Service("calc", func() {
    // This error can be returned by any method in this service
    Error("invalid_arguments", ErrorResult, "Invalid arguments provided") 
    
    Method("divide", func() {
        // This method can return invalid_arguments without explicitly declaring it
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        // ... other method definitions
    })

    Method("multiply", func() {
        // This method can also return invalid_arguments
        // ... method definitions
    })
})
```

When defining errors at the service level:
- The error is available to all methods in the service
- Each method can return the error without explicitly declaring it
- Transport mappings defined for the error apply to all methods

### Method-Level Errors

Method-specific errors are scoped to a particular method:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Field(2, "reminder", Int)
            Required("quotient", "reminder")
        })
        Error("div_by_zero") // Method-specific error
    })
})
```

### Custom Error Types

For more complex error scenarios, you can define custom error types. Custom
error types allow you to include additional contextual information specific to
your error cases.

#### Basic Custom Error Type

Here's a simple custom error type:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero is the error returned when using value 0 as divisor.")
    Field(1, "message", String, "division by zero leads to infinity.")
    Required("message")
})
```

#### Error Name Field Requirement

When using custom error types for multiple errors in the same method, Goa needs to know which field contains the error name. This is crucial for:
- Matching errors to their design definitions
- Determining the correct HTTP/gRPC status codes
- Generating proper documentation
- Enabling proper error handling in clients

To specify the error name field, use the `struct:error:name` metadata:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero is the error returned when using value 0 as divisor.")
    Field(1, "message", String, "division by zero leads to infinity.")
    Field(2, "name", String, "Name of the error", func() {
        Meta("struct:error:name")  // Tells Goa this field contains the error name
    })
    Required("message", "name")
})
```

The field marked with `Meta("struct:error:name")`:
- Must be a string type
- Must be a required field
- Must be set to the error name as defined in the design
- Cannot be named `"error_name"` (reserved by Goa)

#### Using Multiple Error Types

When a method can return multiple different custom error types, the name field becomes especially important. Here's why:

1. **Error Type Resolution**: When multiple error types are possible, Goa uses
the name field to determine which error definition in the design matches the
actual error being returned. This allows Goa to:
   - Apply the correct transport mapping (HTTP/gRPC status codes)
   - Generate accurate API documentation
   - Enable proper client-side error handling

2. **Transport Layer Handling**: Without the name field, the transport layer
wouldn't know which status code to use when multiple error types are defined
with different status codes:
   ```go
   HTTP(func() {
       Response("div_by_zero", StatusBadRequest)        // 400
       Response("overflow", StatusUnprocessableEntity)  // 422
   })
   ```

3. **Client-Side Type Assertion**: The name field enables Goa to generate
specific error types for each error defined in your design. These generated
types make error handling type-safe and provide access to all error fields:

Here's an example showing how error names in the design must match the implementation:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // These names ("div_by_zero" and "overflow") must be used exactly
        // in the error type's name field
        Error("div_by_zero", DivByZero)
        Error("overflow", NumericOverflow)
        // ... other method definitions
    })
})

// Example client code handling these errors
res, err := client.Divide(ctx, payload)
if err != nil {
    switch err := err.(type) {
    case *calc.DivideDivByZeroError:
        // This error corresponds to Error("div_by_zero", ...) in the design
        fmt.Printf("Division by zero error: %s\n", err.Message)
        fmt.Printf("Attempted to divide %d by zero\n", err.Dividend)
    case *calc.DivideOverflowError:
        // This error corresponds to Error("overflow", ...) in the design
        fmt.Printf("Overflow error: %s\n", err.Message)
        fmt.Printf("Result value %d exceeded maximum\n", err.Value)
    case *goa.ServiceError:
        // Handle general service errors (validation, etc)
        fmt.Printf("Service error: %s\n", err.Message)
    default:
        // Handle unknown errors
        fmt.Printf("Unknown error: %s\n", err.Error())
    }
}
```

For each error defined in your design, Goa generates:
- A specific error type (e.g., `DivideDivByZeroError` for `"div_by_zero"`)
- Helper functions to create and handle these errors
- Proper error type conversion in the transport layer

The connection between design and implementation is maintained through the error names:
1. The name used in `Error("name", ...)` in the design
2. The name field in your error type must match exactly
3. The generated error type will be named after this (e.g., `MethodNameError`)

### Error Properties

Error properties are crucial flags that inform clients about the nature of
errors and enable them to implement appropriate handling strategies. These
properties are **only available when using the default `ErrorResult` type** -
they have no effect when using custom error types.

The properties are defined using DSL functions:

- `Temporary()`: Indicates the error is transient and the same request may succeed if retried
- `Timeout()`: Indicates the error occurred because a deadline was exceeded
- `Fault()`: Indicates a server-side error (bug, configuration issue, etc.)

When using the default `ErrorResult` type, these properties are automatically
mapped to fields in the generated `ServiceError` struct, enabling sophisticated
client-side error handling:

```go
var _ = Service("calc", func() {
    // Temporary errors suggest the client should retry
    Error("service_unavailable", ErrorResult, func() {  // Note: using ErrorResult type
        Description("Service is temporarily unavailable")
        Temporary()  // Sets the Temporary field in ServiceError
    })

    // Timeout errors help clients adjust their timeouts
    Error("request_timeout", ErrorResult, func() {      // Note: using ErrorResult type
        Description("Request timed out")
        Timeout()    // Sets the Timeout field in ServiceError
    })

    // Fault errors indicate server issues that require administrator attention
    Error("internal_error", ErrorResult, func() {       // Note: using ErrorResult type
        Description("Internal server error")
        Fault()      // Sets the Fault field in ServiceError
    })
})
```

Clients can then use these properties to implement sophisticated error handling:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    switch e := err.(type) {
    case *goa.ServiceError:  // Only ServiceError has these properties
        if e.Temporary {
            // Implement retry with backoff
            return retry(ctx, func() error {
                res, err = client.Divide(ctx, payload)
                return err
            })
        }
        if e.Timeout {
            // Maybe increase timeout for next request
            ctx = context.WithTimeout(ctx, 2*time.Second)
            return client.Divide(ctx, payload)
        }
        if e.Fault {
            // Log error and alert administrators
            log.Error("server fault detected", "error", e)
            alertAdmins(e)
        }
    default:
        // Custom error types won't have these properties
        log.Error("error occurred", "error", err)
    }
}
```

These properties enable clients to:
- Implement intelligent retry strategies for temporary errors
- Adjust timeouts or payload sizes for timeout errors
- Properly escalate server-side faults
- Make informed decisions about whether to retry operations

Note: If you need these properties with custom error types, you'll need to
implement similar fields in your custom type and handle them explicitly in your
code.

## Transport Mapping

Goa allows you to map errors to appropriate transport-specific status codes.
This mapping is crucial for providing consistent and meaningful error responses
across different protocols.

### HTTP Status Codes

For HTTP transport, map errors to standard HTTP status codes that best represent
the error condition. The mapping is defined in the `HTTP` DSL:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // Define possible errors with their descriptions
        Error("div_by_zero", ErrorResult, "Division by zero error")
        Error("overflow", ErrorResult, "Numeric overflow error")
        Error("unauthorized", ErrorResult, "Authentication required")

        HTTP(func() {
            POST("/")
            // Map each error to an appropriate HTTP status code
            Response("div_by_zero", StatusBadRequest)
            Response("overflow", StatusUnprocessableEntity)
            Response("unauthorized", StatusUnauthorized)
        })
    })
})
```

When an error occurs, Goa will:
1. Match the error to its design definition
2. Use the mapped status code in the HTTP response
3. Serialize the error according to the response definition
4. Include any specified headers or metadata

### gRPC Status Codes

For gRPC transport, map errors to standard gRPC status codes. The mapping follows similar principles but uses gRPC-specific codes:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // Define possible errors with their descriptions
        Error("div_by_zero", ErrorResult, "Division by zero error")
        Error("overflow", ErrorResult, "Numeric overflow error")
        Error("unauthorized", ErrorResult, "Authentication required")

        GRPC(func() {
            // Map each error to an appropriate gRPC status code
            Response("div_by_zero", CodeInvalidArgument)
            Response("overflow", CodeOutOfRange)
            Response("unauthorized", CodeUnauthenticated)
        })
    })
})
```

Common gRPC status code mappings:
- `CodeInvalidArgument`: For validation errors (e.g., div_by_zero)
- `CodeNotFound`: For resource not found errors
- `CodeUnauthenticated`: For authentication errors
- `CodePermissionDenied`: For authorization errors
- `CodeDeadlineExceeded`: For timeout errors
- `CodeInternal`: For server-side faults

### Default Mappings

If no explicit mapping is provided:
- HTTP: Uses status code 400 (Bad Request) for validation errors and 500 (Internal Server Error) for other errors
- gRPC: Uses `CodeUnknown` for unmapped errors

## Next Steps

Now that you understand the basics of error handling in Goa, explore these topics to deepen your knowledge:

- [Domain vs Transport Errors](1-domain-vs-transport.md) - Learn how to separate business logic errors from their transport representation
- [Error Propagation](2-error-propagation.md) - Understand how errors flow through different layers of your service
- [Error Serialization](3-error-serialization.md) - Learn how to customize error serialization and formatting

These guides will help you implement a comprehensive error handling strategy in your Goa services.

