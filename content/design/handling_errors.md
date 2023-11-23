+++
title = "Handling Errors"
weight = 3

[menu.main]
name = "Handling Errors"
parent = "design"
+++

Goa makes it possible to describe the errors that a service method may return.
From this description Goa can generate both code and documentation. The code
provides the transport specific marshalling and unmarshalling logic. Errors have
a name, a type which may be a primitive type or a user defined type and a
description that is used to generate comments and documentation.

This document describes how to define errors in Goa designs and how to leverage
the generated code to return errors from service methods.

## Design

The Goa DSL makes it possible to define error results on methods and on entire
services using the [Error](https://godoc.org/goa.design/goa/v3/dsl#Error)
expression:

```go
var _ = Service("divider", func() {
    // The "DivByZero" error is defined at the service level and
    // thus may be returned by both "divide" and "integral_divide".
    Error("DivByZero", func() {
        Description("DivByZero is the error returned by the service methods when the right operand is 0.")
    })

    Method("integral_divide", func() {
        // The "HasRemainder" error is defined at the method
        // level and is thus specific to "integral_divide".
        Error("HasRemainder", func() {
            Description("HasRemainder is the error returned when an integer division has a remainder.")
        })
        // ...
    })

    Method("divide", func() {
        // ...
    })
})
```

In this example both the `DivByZero` and `HasRemainder` errors use the default
error type [ErrorResult](https://godoc.org/goa.design/goa/v3/expr#pkg-variables).
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

The [Response](https://godoc.org/goa.design/goa/v3/dsl#Response) function makes it
possible to define the HTTP/gRPC responses associated with a given error.

```go
var _ = Service("divider", func() {
    Error("DivByZero")
    HTTP(func() {
        // Use HTTP status code 400 Bad Request for "DivByZero"
        // errors.
        Response("DivByZero", StatusBadRequest)
    })
    GRPC(func() {
        // Use gRPC status code "InvalidArgument" for "DivByZero"
        // errors.
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder")
        HTTP(func() {
            Response("HasRemainder", StatusExpectationFailed)
            // ...
        })
        GRPC(func() {
          Response("HasRemainder", CodeUnknown)
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

Here is an example of what an implementation of `integral_divide` could look
like:

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *dividersvc.IntOperands) (int, error) {
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
provided error to initialize the message field and initializes all the other
fields from the information provided in the design. The generated transport code
also writes the proper HTTP/gRPC status code as defined in the Response DSL.
Using the generated command line tool to verify:

```bash
./dividercli -v divider integer-divide -a 1 -b 2
> GET http://localhost:8080/idiv/1/2
< 417 Expectation Failed
< Content-Length: 68
< Content-Type: application/json
< Date: Thu, 22 Mar 2018 01:34:33 GMT
{"name":"HasRemainder","id":"dlqvenWL","message":"remainder is 1"}
```

## Using Custom Error Types

The `Error` DSL allows specifying a type for the error result thereby
overridding the default consisting of `ErrorResult`. Any type can be used for
defining the shape of the error result. Here is an example using string as error
result type:

```go
Error("NotFound", String, "NotFound is the error returned when there is no bottle with the given ID.")
```

Note how the description can be defined inline when the type is defined
explicitly. The type may be `ErrorResult` which makes it possible to define
a description inline in this case as well.

There are a couple of caveats to be aware of when using custom error result types:

* The `Temporary`, `Timeout`, and `Fault` expressions have no effect on code
   generation in this case as they otherwise set the corresponding field values
   on the `ErrorResult` struct.

* If the custom type is a user defined type and if it is used to define
   multiple errors on the same method then goa must be told which attribute
   contains the error name. The value of this attribute is compared with the
   names of the errors as defined in the design by the encoding and decoding
   code to infer the proper encoding details (e.g. HTTP status code). The
   attribute is identified using the special `struct:error:name` meta, must be a
   string and must be required:

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
   `error_name` as the generated code defines a `ErrorName` function on the
   error struct.
