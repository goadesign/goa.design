+++
title = "Handling Errors"
weight = 4

[menu.main]
name = "Handling Errors"
parent = "design"
+++

goa makes it possible to describe the errors that a service method may return.
This allows goa to generate documentation and code that support the encoding of
the errors. Errors have a name, a type which may be a primitive type or a user
defined type and a description that is used to generate comments and
documentation.

Refer [error handling example](https://github.com/goadesign/goa/tree/v2/examples/error)
for more information on how to handle errors in goa.

## Error Expression

The goa DSL makes it possible to define error results on methods and on entire
services using the [Error DSL](https://godoc.org/goa.design/goa/dsl#Error):

```go
var _ = Service("divider", func() {
    // The "div_by_zero" error is defined at the service level and
    // thus may be returned by both "divide" and "integer_divide".
    Error("div_by_zero", func() {
        Description("div_by_zero is the error result returned by the service methods when the right operand is 0.")
    })

    Method("integer_divide", func() {
        // The "has_remainder" error is defined at the method
        // level and is thus specific to "integer_divide".
        Error("has_remainder", func() {
            Description("has_remainder is the error result returned when an integer division has a remainder.")
        })
        // ...
    })

    Method("divide", func() {
        // ...
    })
})
```

In this example both the `div_by_zero` and `has_remainder` errors use the default
error type [ErrorResult](https://godoc.org/goa.design/goa/expr#pkg-variables).
This type defines the following fields:

* `Name` is the name of the error. The generated code takes care of initializing
  the field with the name defined in the design during response encoding.
* `ID` is a unique identifier for the specific instance of the error. The idea is
  that this ID may be instrumented making it possible to correlate a user
  error report with service logs, traces etc.
* `Message` is the error message.
* `Temporary` indicates whether the error is temporary.
* `Timeout` indicates whether the error is due to a timeout.
* `Fault` indicates whether the error is due to a server-side fault.

The DSL makes it possible to specify whether an error denotes a temporary
condition and/or a timeout or a server-side fault.

```go
Error("network_failure", func() {
    Temporary()
})

Error("timeout"), func() {
    Timeout()
})

Error("remote_timeout", func() {
    Temporary()
    Timeout()
})

Error("internal_error", func() {
    Fault()
})
```

The generated code takes care of initializing the `ErrorResult` with
`Temporary`, `Timeout` and `Fault` fields appropriately when encoding the
error response.

## Designing Responses

The [Response DSL](https://godoc.org/goa.design/goa/dsl#Response) makes it
possible to define the HTTP/gRPC responses associated with a given error.

```go
var _ = Service("divider", func() {
    Error("div_by_zero")
    HTTP(func() {
        // Use HTTP status code 400 Bad Request for "div_by_zero"
        // errors.
        Response("div_by_zero", StatusBadRequest)
    })
    GRPC(func() {
        // Use gRPC status code "InvalidArgument" for "div_by_zero"
        // errors.
        Response("div_by_zero", CodeInvalidArgument)
    })

    Method("integer_divide", func() {
        Error("has_remainder")
        HTTP(func() {
            Response("has_remainder", StatusExpectationFailed)
            // ...
        })
        GRPC(func() {
          Response("has_remainder", CodeUnknown)
        })
    })
    // ...
})
```

## Return Errors

Given the divider service design above goa generates two helper functions that
build the corresponding errors: `MakeDivByZero` and `MakeHasRemainder`. These
functions accept a Go error as argument making it convenient to map a business
logic error to a specific error result.

Here is an example of what an implementation of `integer_divide` could look like:
```go
func (s *dividerSvc) IntegerDivide(ctx context.Context, p *dividersvc.IntOperands) (int, error) {
    if p.B == 0 {
        // Use generated function to create error result
        return 0, dividersvc.MakeDivByZero(fmt.Errorf("right operand cannot be 0"))
    }
    if p.A%p.B != 0 {
        return 0, dividersvc.MakeHasRemainder(fmt.Errorf("remainder is %d", p.A%p.B))
    }

    return p.A / p.B, nil
}
```

And that's it! Given this, goa knows to initialize a `ErrorResult` using the
provided error to initiliaze the message field and initializes all the other
fields from the information provided in the design. The generated transport code
also writes the proper HTTP/gRPC status code as defined in the Response DSL.

## Using Custom Error Types

The `Error` DSL allows specifying a type for the error result thereby
overridding the default consisting of `ErrorResult`. Any type can be used for
defining the shape of the error result. Here is an example using string as
error result type:
```go
Error("not_found", String, "not_found is the result returned when there is no bottle with the given ID.")
```

Note how the description can be defined inline when the type is defined
explicitly. The type may be `ErrorResult` which makes it possible to define
a description inline in this case as well.

There are a couple of caveats to be aware of when using custom error result types:

* The `Temporary`, `Timeout`, and `Fault` expressions have no effect on code
  generation in this case as they otherwise set the corresponding field values on
  the `ErrorResult` struct.
* If the custom type is a user defined type and if it is used to define multiple
  errors on the same method then goa must be told which attribute contains the
  error name. The value of this attribute is compared with the names of the
  errors as defined in the design by the encoding and decoding code to infer the
  proper encoding details (e.g. HTTP status code). The attribute is identified
  using the special `struct:error:name` meta, must be a string and must be
  required:

```go
var InsertConflict = ResultType("application/vnd.service.insertconflict", func() {
    Description("InsertConflict is the type of the error values returned when insertion fails because of a conflict")
    Attributes(func() {
        Attribute("conflict_value", String)
        Attribute("name", String, "name of error used by goa to encode response", func() {
            Meta("struct:error:name")
        })
        Required("conflict_value", "name")
    })
    View("default", func() {
        Attribute("conflict_value")
        // Note: error_name is omitted from the default view.
        // in this example error_name is an attribute used to identify
        // the field containing the name of the error and is not
        // encoded in the response sent to the client.
    })
})
```

* User types used to define custom error types cannot have an attribute named
`error_name` as the generated code defines a ErrorName function on the error
struct.
