+++
date = "2016-01-30T11:01:06-05:00"
title = "Supporting Functionality"
+++

goa services leverage the goa package to implement the API handlers. The package includes the
implementation of the base request context base which provides the means to access the request state
and write the response. The package also contains a number of data structures and algorithms that
provide supporting functionality to the service. These include logging, error handling, etc.
goa follows the "battery included" model for the supporting functionality letting you
customize all aspects if the provided default is not sufficient.

### Supporting Functionality

#### Service Mux

The goa HTTP request mux is in charge of dispatching incoming requests
to the correct controller action. It implements the `ServeMux`
interface which on top of the usual binding of HTTP method and path
to handler also provides the ability to lookup registered handlers.

The `ServeMux` interface `Handle` method associates a request HTTP method and path to a HandleFunc
which is a function that accepts an http ResponseWriter and Request as well as an instance of url
Values that contain all the path and querystring parameters.

#### Logging

goa uses structured logging so that logs created at each level contain all the contextual
information. The root logger is the service-level `Logger` field. Logger contexts are
created for each controller and for each action. Finally a logger context is also created for each
request so that log entries created inside a request contain the full context: service name,
controller name, action name and unique request ID.

#### Graceful Shutdown

A goa service can be instantiated via `NewGraceful` in which case the http server is implemented by
the <a href="https://godoc.org/github.com/tylerb/graceful">graceful package</a> which provides
graceful shutdown behavior where upon receiving a shutdown signal the service waits until all pending
requests are completed before terminating.
