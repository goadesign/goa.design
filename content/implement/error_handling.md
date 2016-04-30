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
* `status`: the HTTP status code applicable to this problem, expressed as a string value.
* `code`: an application-specific error code, expressed as a string value.
* `detail`: a human-readable explanation specific to this occurrence of the problem. Like title, this field's value can be localized.
* `meta`: a meta object containing non-standard meta-information about the error.

Error classes are created using the
[NewErrorClass](http://goa.design/reference/goa/#func-newerrorclass-a-name-goa-errorclass-newerrorclass-a)
function which accepts the error code and status:

```go
func NewErrorClass(code string, status int) ErrorClass
```

Error classes are functions themselves that create instances of
[Error](http://goa.design/reference/goa/#type-error-a-name-goa-error-a) given a format and
optional values similarly to `fmt.Errorf`:

```go
type ErrorClass func(fm interface{}, v ...interface{}) *Error
```

For example:

```go
// Create a new error class:
invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 422)
// And use it to create errors:
return invalidEndpointErr("The specified endpoint %s could not be resolved", endpoint)
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

In some cases it may be useful to attach additional metadata to the error - this can be done using
the [Meta](http://goa.design/reference/goa/#func-error-meta-a-name-goa-error-meta-a) method exposed
by all instances of [Error](http://goa.design/reference/goa/#type-error-a-name-goa-error-a):

```go
        if err := someInternalMethod(); err != nil {
               return goa.ErrBadRequest(err).Meta("module", "internal")
        }
```

### Creating New Errors

Sometimes it may be useful to create new error classes. For example it may be necessary for clients
to handle this error in a specific way. Or the error needs to be easily differentiated in logs or
by other tracing mechanisms. In this case the error class function acts in a similar fashion as
`fmt.Errorf`:

```go
// DoAction is a dummy example of a goa action implementation that defines a new error class and
// uses it to create a new error then to wrap an existing error.
func (c *MyController) DoAction(ctx *DoActionContext) error {
        endpoint := ctx.SomeServiceEndpoint
        invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 400)
        // Assume endpoint must contain .mycompany.com
        if !strings.Contains(endpoint, ".mycompany.com") {
              // Create new goa.HTTPError
              return invalidEndpointErr("%s should contain mycompany.com", endpoint)
        }
        // ...
}
```

## Error Handlers

The
[ErrorHandler](http://goa.design/reference/goa/middleware/#func-errorhandler-a-name-middleware-errorhandler-a)
middleware maps any returned error to HTTP responses.  Errors that are instances of
[Error](http://goa.design/reference/goa/#type-error-a-name-goa-error-a) get serialized in the
response body and their status is used to form the response HTTP status.  Other errors get wrapped
into the [ErrInternal](http://goa.design/reference/goa/#variables) which produces responses with a
500 status code.

## Putting It All Together

Going back to the initial goals, the API design defines the possible responses for each action
including the error responses via the
[Response](http://goa.design/reference/goa/design/apidsl.html#func-response-a-name-apidsl-response-a)
DSL. Error classes provide a way to map the errors produced by the
implementation back to the design by wrapping errors into
[Error](http://goa.design/reference/goa/#type-error-a-name-goa-error-a).

Services should create their own error classes to handle domain specific errors. The controllers
must make sure to only return errors with attached error classes so the proper responses are sent.
They can do so by creating these errors or wrapping errors coming from deeper layers.

Note that the controller actions are responsible for implementing the contract defined in the
design. That is they should not define error classes that use HTTP status codes not listed in the
[action definitions](http://goa.design/reference/goa/design/apidsl.html#func-action-a-name-apidsl-action-a).
