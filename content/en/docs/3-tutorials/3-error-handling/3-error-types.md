---
title: "Error Types"
linkTitle: Error Types
weight: 3
description: "Explore Goa's error type system, including the default ErrorResult type and how to create custom error types for more complex error scenarios."
---

Goa allows you to define errors using either the default `ErrorResult` type or
custom user-defined types. Choosing the appropriate error type depends on the
complexity and specificity of the errors you need to represent.

## Default Error Type (`ErrorResult`)

By default, errors use the `ErrorResult` type, which includes standard fields
such as `Name`, `ID`, `Message`, `Temporary`, `Timeout`, and `Fault`. This
provides a consistent structure for errors across your service.

### Structure and Fields

- **Name**: The name of the error, as defined in the DSL.
- **ID**: A unique identifier for the specific instance of the error, useful for correlating logs and traces.
- **Message**: A descriptive error message.
- **Temporary**: Indicates whether the error is temporary and might be resolved upon retrying.
- **Timeout**: Indicates whether the error was caused by a timeout.
- **Fault**: Indicates whether the error was due to a server-side fault.

### Usage Example

Define a service-level error using the default `ErrorResult`:

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "Division by zero")
    Error("ServiceUnavailable", ErrorResult, "Service is temporarily unavailable.", func() {
        Temporary()
    })
    // ...
})
```

In this example, we define two service-level errors that can be returned by any
method within the `divider` service. The `DivByZero` error represents a division
by zero operation, while the `ServiceUnavailable` error indicates a temporary
service outage. Both errors use the default `ErrorResult` type, but the
`ServiceUnavailable` error is marked as temporary using the `Temporary()`
function, indicating that clients may retry the operation.

### Runtime Representation

The generated code defines functions that instantiate
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError) objects
for the `DivByZero` and `ServiceUnavailable` errors. These functions take
care of setting the appropriate fields for the error:

```go
// MakeDivByZero builds a goa.ServiceError from an error. 
func MakeDivByZero(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "DivByZero", false, false, false)
}

// MakeServiceUnavailable builds a goa.ServiceError from an error.
func MakeServiceUnavailable(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "ServiceUnavailable", true, false, false)
}
```

Clients can cast the error returned by the service to the `ServiceError` type
and then use the `Temporary`, `Timeout`, and `Fault` fields to check the error
details.

## Custom Error Types

For more detailed error information, you can define custom error types. This
allows you to include additional fields specific to your application's needs.

### Creating a Custom Error Type

Define a custom error type using the `Type` function:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero is the error returned when using value 0 as divisor.")
    Field(1, "message", String, "Error message for division by zero.")
    Field(2, "divisor", Int, "Divisor that caused the error.")
    Required("message", "divisor")
})
```

### Using a Custom Error Type in a Service

Integrate the custom error type within a service method:

```go
var _ = Service("divider", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Field(2, "remainder", Int)
            Required("quotient", "remainder")
        })
        Error("DivByZero", DivByZero, "Division by zero")
        // Additional method definitions...
    })
})
```

In this example, we define a method-level error called `DivByZero` that uses
the custom `DivByZero` type. This allows us to provide detailed error
information specific to division by zero scenarios, including both the error
message and the actual divisor value that caused the error.

### Caveats When Using Custom Error Types

- **Error Metadata**: When using custom types for multiple errors within the
  same method, you must specify which attribute contains the error name using the
  `struct:error:name` metadata. This is essential for Goa to correctly map errors
  to their definitions.

```go
var CustomError = Type("CustomError", func() {
    Field(1, "detail", String)
    Field(2, "name", String, func() {
        Meta("struct:error:name")
    })
    Required("detail", "name")
})
```

- **Reserved Attributes**: Custom error types cannot have an attribute named
  `error_name` as Goa uses this internally for error identification and
  serialization.
