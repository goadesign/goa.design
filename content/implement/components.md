+++
date = "2016-01-30T11:01:06-05:00"
title = "Supporting Functionality"
+++

goa services leverage the goa package to implement the API handlers. The package includes the
implementation of the base request context base which provides the means to access the request state
and write the response. The package also contains a number of data structures and algorithms that
provide supporting functionality to the service. These include logging, error handling, versioning
support etc. goa follows the "battery included" model for the supporting functionality letting you
customize all aspects if the provided default is not sufficient.

### Supporting Functionality

#### Service Mux

The goa HTTP request mux is in charge of dispatching incoming requests
to the correct controller action. It implements the `ServeMux`
interface which on top of the usual binding of HTTP method and path
to handler also provides support for API versioning.

The `ServeMux` interface `Handle` method associates a request HTTP method and path to a HandleFunc
which is a function that accepts an http ResponseWriter and Request as well as an instance of url
Values that contain all the path and querystring parameters.

The interface also exposes a `Version` method that gives access to version specific muxes. This
makes it possible to define different controller actions for the same request HTTP method and path
but different API versions. The actual algorithm used to compute the targeted API version is
provided via an instance of `SelectVersionFunc`. goa comes with several implementations of
SelectVersionFunc:

* The `PathSelectVersionFunc` function creates a `SelectVersionFunc` that extracts the version from
  the request path.

* The `HeaderSelectVersionFunc` function creates a `SelectVersionFunc` that extracts the version
  from the given HTTP request header.

* The `QuerySelectVersionFunc` function creates a `SelectVersionFunc` extracts the version from
  the given querystring value.

The function `CombineSelectVersionFunc` makes it possible to combine any number of
`SelectionVersionFunc` to produce arbitrarily complex lookup algorithms.

#### Logging

goa uses structured logging so that logs created at each level contain all the contextual
information. The root logger is the service-level `Logger` field. Loggers are derived from it for
each controller and for each action. Finally a logger is also created for each request so that log
entries created inside a request contain the full context: service name, controller name, action
name and unique request ID.

#### Error Handling

All goa actions return an error. Error handlers can be defined at the controller or service level.
If an action returns a non-nil error then the controller error handler is invoked. If the controller
does not define an error handler then the service-wide error handler is invoked instead. The default
goa error handler simply returns a 500 response containing the error details in the body.

#### Graceful Shutdown

A goa service can be instantiated via `NewGraceful` in which case the http server is implemented by
the <a href="https://godoc.org/github.com/tylerb/graceful">graceful package</a> which provides
graceful shutdown behavior where upon receiving a shutdown signal the service waits until all pending
requests are completed before terminating.

### Swapping the Batteries

#### Error Handling

The service interface exposes a `SetHandler` method which allows overriding the default service
error handler. goa comes with two built-in error handlers:

* The `DefaultErrorHandler` returns a 400 if the error is an instance of `BadRequestError`, 500
otherwise. It also always writes the error message to the response body.

* The `TerseErrorHandler` behaves identically to the default error handler with the exception that
it does not write the error message to the response body for internal errors (i.e. errors that are
not instances of `BadRequestError`).

Custom error handlers can be easily swapped in, they consist of a function that accepts an instance
of an action context and of an error.

#### Request Mux and Versioning

As mentioned above the goa mux supports defining version specific
muxes. Different versions can be defined in the design using the
`Version` DSL:

```go
package design

import (
        . "github.com/goadesign/goa/design"
        . "github.com/goadesign/goa/design/apidsl"
)

var _ = API("cellar", func() {
        Description("A basic example of an API implemented with goa")
        Scheme("http")
        Host("localhost:8080")
})

var _ = Version("1.0", func() {
        Title("The virtual winecellar v1.0 API")
        // ... other API level properties
})

var _ = Version("2.0", func() {
        Title("The virtual winecellar v2.0 API")
        // ... other API level properties
})

var _ = Resource("bottle", func() {
        BasePath("/bottles")
        Version("1.0")
        Version("2.0")
        // ... other resource properties
})

var _ = Resource("bottle", func() {
        BasePath("/bottles")
        Version("3.0")
        // ... other resource properties
})
```

When `goagen` sees that the design defines versions it produces code that leverages the
ServeMux interface Version method to mount controllers onto the appropriate version mux:

```go
func MountBottleV1Controller(service goa.Service, ctrl v1.BottleController) {
        // ...
```

Each version defined in the design produces a different package containing the corresponding
generated controllers.

The generated code relies on the `ServeMux` method exposed by the service to retrieve the
top-level mux. The goa default mux implementation relies on the
[httprouter](https://github.com/julienschmidt/httprouter) package to implement the low level
dispatch. Other low level routers can easily be substituted by providing an implementation of the
ServeMux interface.
