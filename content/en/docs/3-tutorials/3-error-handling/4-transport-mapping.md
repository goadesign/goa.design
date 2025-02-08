---
title: Mapping Errors to Transport Status Codes
linkTitle: Transport Mapping
weight: 4
description: "Learn how to map Goa errors to appropriate HTTP and gRPC status codes, ensuring consistent error responses across different transport protocols."
---

Once you've defined your errors in the Goa DSL, the next step is to map these
errors to appropriate transport-specific status codes. This ensures that clients
receive meaningful and standardized responses based on the nature of the error.
Goa allows you to define these mappings for different transport protocols, such
as HTTP and gRPC, using the Response function within the DSL.

## HTTP Transport Mapping

For HTTP transports, you use the HTTP function within your service or method
definitions to map errors to specific HTTP status codes. This mapping ensures
that when an error occurs, the client receives an HTTP response with the correct
status code and error information.

Example

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZero is the error returned when the divisor is zero.")
    })

    HTTP(func() {
        // Map the "DivByZero" error to HTTP 400 Bad Request
        Response("DivByZero", StatusBadRequest)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("HasRemainder is returned when an integer division has a remainder.")
        })

        HTTP(func() {
            // Map the "HasRemainder" error to HTTP 417 Expectation Failed
            Response("HasRemainder", StatusExpectationFailed)
        })

        // Additional method definitions...
    })

    Method("divide", func() {
        // Method-specific definitions...
    })
})
```

In this example:

- `DivByZero`: Mapped to HTTP status code 400 Bad Request.
- `HasRemainder`: Mapped to HTTP status code 417 Expectation Failed.

## Defining Responses

Within the HTTP function, you use the Response function to associate each error
with an HTTP status code. The syntax is as follows:

```go
Response("<ErrorName>", <HTTPStatusCode>, func() {
    Description("<Optional description>")
})
```

- `<ErrorName>`: The name of the error as defined in the DSL.
- `<HTTPStatusCode>`: The HTTP status code to map the error to.
- `Description`: (Optional) A description of the response for documentation purposes.

## Complete HTTP Mapping Example

```go
var _ = Service("divider", func() {
    // Service-level errors
    Error("DivByZero", func() {
        Description("DivByZero is the error returned when the divisor is zero.")
    })

    HTTP(func() {
        // Service-wide error mappings
        Response("DivByZero", StatusBadRequest)           // 400
    })

    Method("integral_divide", func() {
        Description("Performs integer division and checks for remainders")
        
        Payload(func() {
            Field(1, "dividend", Int, "Number to be divided")
            Field(2, "divisor", Int, "Number to divide by")
            Required("dividend", "divisor")
        })
        Result(Int)

        Error("HasRemainder", func() {
            Description("HasRemainder is returned when an integer division has a remainder.")
        })

        HTTP(func() {
            POST("/divide/integral")
            
            // Method-specific error mapping
            Response("HasRemainder", StatusExpectationFailed, func() { // 417
                Description("Returned when the division results in a remainder")
            })
        })
    })

    Method("divide", func() {
        Description("Performs floating-point division")
        
        Payload(func() {
            Field(1, "dividend", Float64, "Number to be divided")
            Field(2, "divisor", Float64, "Number to divide by")
            Required("dividend", "divisor")
        })
        Result(Float64)

        Error("Overflow", func() {
            Description("Overflow is returned when the result exceeds maximum value.")
        })

        HTTP(func() {
            POST("/divide")
            
            // Method-specific error mapping
            Response("Overflow", StatusUnprocessableEntity, func() { // 422
                Description("Returned when the division result exceeds maximum value")
            })
        })
    })
})
```

This example demonstrates:

1. **Service-Level Errors**: Common errors that apply across methods:
   - `DivByZero`: When attempting to divide by zero

2. **Method-Specific Errors**: Each method defines its own specific errors:
   - `integral_divide`: Handles remainder cases
   - `divide`: Handles floating-point overflow

3. **HTTP Status Code Mapping**:
   - 400 Bad Request: For division by zero
   - 417 Expectation Failed: For integer division with remainder
   - 422 Unprocessable Entity: For floating-point overflow

4. **Different Endpoints**: Shows error mapping for two different division operations:
   - `/divide/integral` for integer division
   - `/divide` for floating-point division

The mappings ensure that each error condition returns an appropriate HTTP status
code that accurately reflects the nature of the error.

## gRPC Transport Mapping

For gRPC transports, you use the GRPC function within your service or method
definitions to map errors to specific gRPC status codes. This mapping ensures
that when an error occurs, the client receives a gRPC response with the correct
status code and error information.

Example

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZero is the error returned when the divisor is zero.")
    })

    GRPC(func() {
        // Map the "DivByZero" error to gRPC status code InvalidArgument (3)
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("HasRemainder is returned when an integer division has a remainder.")
        })

        GRPC(func() {
            // Map the "HasRemainder" error to gRPC status code Unknown (2)
            Response("HasRemainder", CodeUnknown)
        })

        // Additional method definitions...
    })

    Method("divide", func() {
        // Method-specific definitions...
    })
})
```

In this example:

- `DivByZero`: Mapped to gRPC status code InvalidArgument (code 3).
- `HasRemainder`: Mapped to gRPC status code Unknown (code 2).

## Defining Responses

Within the GRPC function, you use the Response function to associate each error
with a gRPC status code. The syntax is as follows:

```go
Response("<ErrorName>", Code<StatusCode>, func() {
    Description("<Optional description>")
})
```

- `<ErrorName>`: The name of the error as defined in the DSL.
- `Code<StatusCode>`: The gRPC status code to map the error to, prefixed with Code.
- `Description`: (Optional) A description of the response for documentation purposes.

## Combining HTTP and gRPC Mappings

Goa allows you to define both HTTP and gRPC mappings within the same service or
method. This is particularly useful when your service supports multiple transports,
ensuring that errors are appropriately mapped regardless of the transport protocol
used by the client.

Example

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZero is returned when attempting to divide by zero.")
    })

    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Float64, "Number to be divided")
            Field(2, "divisor", Float64, "Number to divide by")
            Required("dividend", "divisor")
        })
        Result(Float64)

        HTTP(func() {
            POST("/divide")
            // Map division by zero to HTTP 422 Unprocessable Entity
            Response("DivByZero", StatusUnprocessableEntity)
        })

        GRPC(func() {
            // Map division by zero to INVALID_ARGUMENT
            Response("DivByZero", CodeInvalidArgument)
        })
    })
})
```

In this example, the `DivByZero` error is mapped to both:

- HTTP status code 422 Unprocessable Entity.
- gRPC status code InvalidArgument (code 3).

## Summary

Mapping errors to transport-specific status codes in Goa ensures that clients
receive clear and appropriate responses based on the nature of the error
encountered. By defining these mappings within the DSL, Goa automates the
generation of the necessary code and documentation, maintaining consistency and
reducing boilerplate. Whether you're working with HTTP, gRPC, or both, Goa's
flexible error mapping capabilities empower you to build robust and user-friendly
APIs.
