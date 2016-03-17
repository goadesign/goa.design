+++
date = "2016-03-12T01:01:06-05:00"
title = "Error Handling"
+++

# Error Handling in goa

## Goals

Handling errors in services in a way that is consistent across all the software layers and provides
a documented output to the clients is hard yet is a requirement for defining crisp API boundaries.
This problem is rarely addressed explicitly and error handling tends to “just happen” resulting in
APIs where the error cases become impossible to document properly. This in turn makes it difficult
to build client services that implement the proper retry strategies for example.

Some of the difficulty involved in doing proper error handling originate from the fact that errors
may happen at any point in any of the components. More often than not the component where the error
occurs is not - and should not be - aware that it is being run as part of handling a request.
Another pitfall is that trying to understand all the possible error cases to map them back to
corresponding responses is often times impractical. The error handling code becomes invasive and
distract from the initial purpose of the service.

goa strives to strike the right balance of providing a simple way to classify all the possible
errors without having to write special error handling code in all components. Specifically the goals
are:

* Make it possible to document all the possible responses.
* Keep the error classification logic in the API endpoints (*controllers* in goa).
* Provide a simple way to classify existing errors.

## Introducing Error Classes

The abstraction used in goa to achieve the goals listed above is the error class. An error class
defines the shape of the response by specifying an HTTP response status code together with fixed
program friendly identifier and human friendly title. Error classes can then be used to create
instances of
[HTTPError](http://goa.design/reference/goa.html#type-httperror-a-name-goa-httperror-a:f65b389c849e4c539b25815fbdc1fd8d) -
each with their own specific error message. Error classes are implemented by the
[ErrorClass](http://goa.design/reference/goa.html#type-errorclass-a-name-goa-errorclass-a:f65b389c849e4c539b25815fbdc1fd8d)
struct.

Errors returned by components deep in the software stack can be wrapped with an error class
providing the information needed to produce the corresponding response. The error class struct
exposes the
[Error](http://goa.design/reference/goa.html#func-errorclass-error-a-name-goa-errorclass-error-a:f65b389c849e4c539b25815fbdc1fd8d)
method that takes an `error` and returns a wrapper
[HTTPError](http://goa.design/reference/goa.html#type-httperror-a-name-goa-httperror-a:f65b389c849e4c539b25815fbdc1fd8d).
goa comes with a [set of standard error
classes](http://goa.design/reference/goa.html#constants:f65b389c849e4c539b25815fbdc1fd8d) that cover
a number of generic invalid request cases (missing required parameter, invalid string value pattern,
etc.). New error classes may also be defined to handle service specific errors via the
[NewErrorClass](http://goa.design/reference/goa.html#func-newerrorclass-a-name-goa-errorclass-newerrorclass-a:f65b389c849e4c539b25815fbdc1fd8d)
function.

```go
// DoAction is a dummy example of a goa action implementation that defines a new error class and
// uses it to create a new error then to wrap an existing error.
func (c *MyController) DoAction(ctx *DoActionContext) error {
    endpoint := ctx.SomeServiceEndpoint
    // The convention for naming error class ids is <namespace.acronym> where the goa namespace
    // is reserved for goa.
    invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 400)
    // Assume endpoint must contain .mycompany.com
    if !strings.Contains(endpoint, ".mycompany.com") {
        // Create new goa.HTTPError
        return invalidEndpointErr("%s should contain mycompany.com", endpoint)
    }
    err := useEndpoint(endpoint)
    if err != nil {
        // Wrap err into an HTTPError and add metadata
        return invalidEndpointErr(err).Meta("endpoint", endpoint)
    }
    // ...
}
```

## Error Handlers

Each service in goa defines a [top level error
handler](http://goa.design/reference/goa.html#type-service-a-name-goa-service-a:f65b389c849e4c539b25815fbdc1fd8d).
Controllers may also implement [resource specific error
handlers](http://goa.design/reference/goa.html#type-controller-a-name-goa-controller-a:f65b389c849e4c539b25815fbdc1fd8d).
These handlers get invoked whenever an action or a middleware returns a non-nil error.

The [default error
handler](http://goa.design/reference/goa.html#func-defaulterrorhandler-a-name-goa-defaulterrorhandler-a:f65b389c849e4c539b25815fbdc1fd8d)
checks whether the error has a class attached to it and if so uses it to construct the final
response. Errors that don’t have a class attached (that is that are not of type
[HTTPError](http://goa.design/reference/goa.html#type-httperror-a-name-goa-httperror-a:f65b389c849e4c539b25815fbdc1fd8d))
get wrapped into the
[ErrInternal](http://goa.design/reference/goa.html#constants:f65b389c849e4c539b25815fbdc1fd8d) class
which produces responses with a 500 status code.

## Putting It All Together

Going back to the initial goals, the API design defines the possible responses for each action
including the error responses via the
[Response](http://goa.design/reference/goa/design/apidsl.html#func-response-a-name-apidsl-response-a:aab4f9d6f98ed71f45bd470427dde2a7)
DSL. Error classes provide a way to map the errors produced by the
implementation back to the design by wrapping errors into
[HTTPError](http://goa.design/reference/goa.html#type-httperror-a-name-goa-httperror-a:f65b389c849e4c539b25815fbdc1fd8d).

Services should create their own error classes to handle domain specific errors. The controllers
must make sure to only return errors with attached error classes so the proper responses are sent.
They can do so by creating these errors or wrapping errors coming from deeper layers.

Note that the controller actions are responsible for implementing the contract defined in the
design. That is they should not define error classes that use HTTP status codes not listed in the
[action definitions](http://goa.design/reference/goa/design/apidsl.html#func-action-a-name-apidsl-action-a:aab4f9d6f98ed71f45bd470427dde2a7).
