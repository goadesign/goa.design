+++
date = "2016-03-12T01:01:06-05:00"
title = "Error Handling"
weight = 4
+++

## Goals

Handling errors in services in a way that is consistent across all the software layers and provides
a documented output to the clients is hard, yet is a requirement for defining crisp API boundaries.
goa strives to strike the right balance of providing a simple way to classify all the possible
errors without having to write special error handling code in all components. Specifically the goals
are:

* Make it possible to document all the possible responses.
* Keep the error classification logic in the API endpoints (*controllers* in goa).
* Provide a simple way to classify existing errors.

## Introducing Error Classes

The abstraction used in goa to achieve the goals listed above is the error class. An error class
defines the shape of an error response using the following fields:

* `id`: a unique identifier for this particular occurrence of the problem.
* `status`: the HTTP status code applicable to this problem.
* `code`: an application-specific error code, expressed as a string value.
* `detail`: a human-readable explanation specific to this occurrence of the problem. Like title, this field's value can be localized.
* `meta`: a meta object containing non-standard meta-information about the error.

Error classes are created using the
[NewErrorClass](https://goa.design/reference/goa/#func-newerrorclass-a-name-goa-errorclass-newerrorclass-a)
function which accepts the error code and status:

```go
func NewErrorClass(code string, status int) ErrorClass
```

Error classes are functions themselves that create instances of `error` given a message and
optional key pair values:

```go
type ErrorClass func(message interface{}, keypairs ...interface{}) error
```

For example:

```go
// Create a new error class:
invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 422)
// And use it to create errors:
return invalidEndpointErr("endpoint cannot be resolved", "endpoint", endpoint, "error", err)
```

goa comes with a set of pre-existing error classes that can be leveraged to cover the common cases.
One especially useful error class is `ErrBadRequest` which can be used to return generic bad
request errors:

```
func (c *OperandsController) Divide(ctx *app.OperandsContext) error {
          if ctx.Divisor == 0 {
                  return goa.ErrBadRequest("cannot divide by zero")
          }
          // ...
}
```

All errors returned by calling error class functions implement the
[ServiceError](https://goa.design/reference/goa/#type-serviceerror-a-name-goa-serviceerror-a) interface.
This interface exposes the error response status and unique token that middlewares can take
advantage of for logging or otherwise processing errors. It's also possible to determine whether a
given error was created via a error class by checking the behavior of the error object:

```go
if _, ok := err.(goa.ServiceError); ok {
    // Error created via a error class
    // Contains the data needed to build a proper response
} else {
    // Error is a generic Go error
    // Will result in an internal error unless wrapped with a error class
}
```

## Using Error Classes

There are two main use cases for error classes:
* Error classes can be used to wrap errors returned by internal modules.
* Error classes may be used to create new errors directly in the API endpoint (e.g. custom
  validation errors).

### Wrapping Existing Errors

Wrapping an existing error is done simply by invoking the error class function on the `error`
instance:

```go
        if err := someInternalMethod(); err != nil {
               return goa.ErrBadRequest(err)
        }
```

Additional metadata can be attached to the error using the optional key pair parameters:

```go
        if err := someInternalMethod(); err != nil {
               return goa.ErrBadRequest(err, "module", "internal")
        }
```

### Creating New Errors

Sometimes it may be useful to create new error classes. For example it may be necessary for clients
to handle a specific class of errors in a specific way. The errors may need to be easily
differentiated in logs or by other tracing mechanisms. In this case the error class function acts in
a similar fashion as `errors.New`:

```go
// DoAction is a dummy example of a goa action implementation that defines a new error class and
// uses it to create a new error then to wrap an existing error.
func (c *MyController) DoAction(ctx *DoActionContext) error {
        endpoint := ctx.SomeServiceEndpoint
        invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 400)
        // Assume endpoint must contain .mycompany.com
        if !strings.Contains(endpoint, ".mycompany.com") {
              return invalidEndpointErr("endpoint must contain .mycompany.com", "endpoint", endpoint)
        }
        // ...
}
```

## Error Handlers

The
[ErrorHandler](https://goa.design/reference/goa/middleware/#func-errorhandler-a-name-middleware-errorhandler-a)
middleware maps any returned error to HTTP responses.  Errors that are created via goa's
[ErrorClass](https://goa.design/reference/goa/#type-error-a-name-goa-error-a) get serialized in the
response body and their status is used to form the response HTTP status.  Other errors get wrapped
into the [ErrInternal](https://goa.design/reference/goa/#variables) which produces responses with a
500 status code.

## Designing Error Responses

So far we've seen how controller code can adapt or create error responses. Ultimately though the API
design dictates the correct content for responses. The goa design package provides the
[ErrorMedia](https://goa.design/reference/goa/design.html#variables)
media type that action definitions can take advantage of to describe responses that correspond to
errors created via error classes. Here is an example of such an action definition:

```go
var _ = Resource("bottle", func() {
        Action("create", func() {
                Routing(POST("/"))
                Response(Created)
                Response(BadRequest, ErrorMedia) // Maps errors return by the Create action
        })
})
```

The Go type generated for `ErrorMedia` is `error` so that the controller code can reuse the
error directly to send the response in the generated response method:

```go
func (c *BottleController) Create(ctx *app.CreateBottleContext) error {
        b, err := c.db.Create(ctx.Payload)
        if err != nil {
                // ctx.BadRequest accepts a *goa.Error as argument
                return ctx.BadRequest(goa.ErrBadRequest(err))
        }
        return ctx.OK(b)
}
```

## Putting It All Together

Going back to the initial goals, the API design defines the possible responses for each action
including the error responses via the
[Response](https://goa.design/reference/goa/design/apidsl.html#func-response-a-name-apidsl-response-a)
DSL. Error classes provide a way to map the errors produced by the
implementation back to the design by wrapping the errors using error classes.

Services should create their own error classes to handle domain specific errors. The controllers
must make sure to only return errors with attached error classes so the proper responses are sent.
They can do so by creating these errors or wrapping errors coming from deeper layers.

Note that the controller actions are responsible for implementing the contract defined in the
design. That is they should not define error classes that use HTTP status codes not listed in the
[action definitions](https://goa.design/reference/goa/design/apidsl.html#func-action-a-name-apidsl-action-a).
