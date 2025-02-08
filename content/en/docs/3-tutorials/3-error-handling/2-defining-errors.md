---
title: Defining Errors
linkTitle: Defining Errors
weight: 2
description: "Master the art of defining service-level and method-level errors in Goa using its DSL, including custom error types and reusable error definitions."
---

Goa provides a flexible and powerful way to define errors within your service
designs. By leveraging Goa's Domain-Specific Language (DSL), you can specify
both service-level and method-level errors, customize error types, and ensure
that your API communicates failures clearly and consistently across different
transports like HTTP and gRPC.

## Service-Level Errors

Service-level errors are defined at the service scope and can be returned by any
method within the service. This is useful for errors that are common across
multiple methods.

### Example

```go
var _ = Service("divider", func() {
    // The "DivByZero" error is defined at the service level and
    // thus may be returned by both "divide" and "integral_divide".
    Error("DivByZero", func() {
        Description("DivByZero is the error returned by the service methods when the right operand is 0.")
    })

    Method("integral_divide", func() {
        // Method-specific definitions...
    })

    Method("divide", func() {
        // Method-specific definitions...
    })
})
```

In this example, we define a service-level error called `DivByZero` that can
be used by any method within the `divider` service. This is particularly useful
for common error conditions that might occur across multiple methods, such as
division by zero operations in this case.

## Method-Level Errors

Method-level errors are defined within the scope of a specific method and are
only applicable to that method. This allows for more granular error handling
tailored to individual operations.

### Example

```go
var _ = Service("divider", func() {
    Method("integral_divide", func() {
        // The "HasRemainder" error is defined at the method
        // level and is thus specific to "integral_divide".
        Error("HasRemainder", func() {
            Description("HasRemainder is the error returned when an integer division has a remainder.")
        })
        // Additional method definitions...
    })

    Method("divide", func() {
        // Method-specific definitions...
    })
})
```

In this example, we define a method-level error called `HasRemainder` that is
specific to the `integral_divide` method. This error would be used when the
division operation results in a remainder, which is particularly relevant for
integer division operations.

## Reusable Error Definitions

Goa allows you to reuse error definitions across multiple services and methods.
This is particularly useful for defining common errors that are used in multiple
parts of your API. Such definitions must appear in the `API` DSL:

### Example

```go
var _ = API("example", func() {
    Error("NotFound", func() {
        Description("Resource was not found in the system.")
    })
    HTTP(func() {
        Response("NotFound", StatusNotFound)
    })
    GRPC(func() {
        Response("NotFound", CodeNotFound)
    })
})

var _ = Service("example", func() {
    Method("get", func() {
        Payload(func() {
            Field(1, "id", String, "The ID of the concert to get.")
        })
        Result(Concert)
        Error("NotFound")
        HTTP(func() {
            GET("/concerts/{id}")
        })
        GRPC(func() {})
    })
})
```

In this example, we define a reusable error called `NotFound` that can be used
by any method within the `example` service. This error is defined in the `API`
DSL and is thus available to all services and methods within the API. The
`NotFound` error is mapped to the HTTP status code `404` and the gRPC status
code `NotFound`, this mapping is done in the `API` DSL and does not need to be
repeated in the `Service` or `Method` DSLs.

## Custom Error Types and Descriptions

The Error DSL in Goa provides several ways to customize how errors are defined and
documented. You can specify descriptions, temporary/permanent status, and even
define custom response structures.

### Basic Error Definition

The simplest form of error definition includes a name and description:

```go
Error("NotFound", func() {
    Description("Resource was not found in the system.")
})
```

The definition above is equivalent to:

```go
Error("NotFound", ErrorResult, "Resource was not found in the system.")
```

The default type for errors is `ErrorResult` which gets mapped to the
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError) type
in the generated code.

### Temporary, Timeout, and Fault

You can indicate whether an error is temporary, a timeout, or a fault - or any
combination of these using the `Temporary`, `Timeout`, and `Fault` functions:

```go
Error("ServiceUnavailable", func() {
    Description("Service is temporarily unavailable.")
    Temporary()
})

Error("RequestTimeout", func() {
    Description("Request timed out.")
    Timeout()
})

Error("InternalServerError", func() {
    Description("Internal server error.")
    Fault()
})
```

Clients can then lookup the corresponding fields from the
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError) object to
determine whether the error is temporary, a timeout, or a fault.

> Note: this is only supported for `ErrorResult` errors for which the runtime type
> is [ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError).

### Custom Error Types

Goa also makes it easy to design custom error types, for example:

```go
Error("ValidationError", DivByZero, "DivByZero is the error returned when using value 0 as divisor.")
```

This example assumes that `DivByZero` is a custom error type defined elsewhere
in the file, for example:

```go
var DivByZero = Type("DivByZero", func() {
    Field(1, "name", String, "The name of the error.", func() {
        Meta("struct:error:name")
    })
    Field(2, "message", String, "The error message.")
    Required("name", "message")
})
```

These error definitions can be used at both service and method levels, providing
flexibility in how you structure your API's error handling. The Error DSL
integrates with Goa's code generation to produce consistent error responses
across different transport protocols.

See [Error Types](../3-error-types) for more details on custom error types.

## Summary

Defining errors in Goa is a straightforward process that integrates seamlessly
with your service design. By utilizing service-level and method-level error
definitions, leveraging the default ErrorResult type, or creating custom error
types, you can ensure that your APIs handle failures gracefully and communicate
them effectively to clients. Proper error definitions not only enhance the
robustness of your services but also improve the developer experience by
providing clear and consistent error handling mechanisms.
