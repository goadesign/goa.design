+++
date = "2016-01-30T11:01:06-05:00"
title = "Request Middleware"
weight = 8
aliases = [
    "/implement/middleware/"
]
+++

## Built-in Middlewares

The `middleware` package provides middlewares that do not depend on additional packages other than
the ones already used by `goa`. These middlewares provide functionality that is useful to most
microservices:

* [LogRequest](https://goa.design/reference/goa/middleware#LogRequest) enables logging of
  incoming requests and corresponding responses. The log format is entirely configurable. The default
  format logs the request HTTP method, path and parameters as well as the corresponding
  action and controller names. It also logs the request duration and response length. It also logs
  the request payload if the DEBUG log level is enabled. Finally if the RequestID middleware is
  mounted LogRequest logs the unique request ID with each log entry.

* [LogResponse](https://goa.design/reference/goa/middleware#LogResponse) logs the content
  of the response body if the DEBUG log level is enabled.

* [RequestID](https://goa.design/reference/goa/middleware#RequestID) injects a unique ID
  in the request context. This ID is used by the logger and can be used by controller actions as
  well. The middleware looks for the ID in the
  [RequestIDHeader](https://goa.design/reference/goa/middleware#RequestIDHeader) header and if not
  found creates one.

* [Recover](https://goa.design/reference/goa/middleware#Recover) recover panics and logs
  the panic object and backtrace.

* [Timeout](https://goa.design/reference/goa/middleware#Timeout) sets a deadline in the
  request context. Controller actions may subscribe to the context channel to get notified when
  the timeout expires.

* [RequireHeader](https://goa.design/reference/goa/middleware#RequireHeader) checks for the
  presence of a header in the request with a value matching a given regular expression. If the
  header is absent or does not match the regexp the middleware sends a HTTP response with a given
  HTTP status.

Other middlewares listed below are provided as separate Go packages.

#### Gzip

Package [gzip](https://goa.design/reference/goa/middleware/gzip.html) contributed by
[@tylerb](https://github.com/tylerb) adds the ability to compress response bodies using gzip format
as specified in RFC 1952.

#### Security

package [security](https://goa.design/reference/goa/middleware/security.html) contains middleware
that should be used in conjunction with the security DSL.

## Writing Your Own

A middleware is a function that accepts and returns a request handler. The idea is that middlewares
are "chained" together, the actual action implementation being the last link. There are many good
resources on the web describing middlewares in Go such as [Alex Edwards'
writeup](http://www.alexedwards.net/blog/making-and-using-middleware).

A request handler in goa has the following signature:

```go
// Handler defines the request handler signatures.
Handler func(context.Context, http.ResponseWriter, *http.Request) error
```

And a middleware is:

```go
// Middleware represents the canonical goa middleware signature.
Middleware func(Handler) Handler
```

Writing a middleware thus consists of writing a function that accepts a handler and returns one:

```go
// MyMiddleware does something interesting.
func MyMiddleware(h goa.Handler) Handler {
    return func(ctx context.Context, rw http.ResponseWriter, req *http.Request) error {
        // Use ctx, rw and req - for example:
        newctx = context.WithValue(ctx, "key", "value")
        rw.Header().Set("X-Custom", "foo")

        // Then call the next handler:
        return h(newctx, rw, req)
    }
}
```

The middleware can then be mounted on a service or controller with the `Use` method:

```go
s := goa.New("my service")
s.Use(MyMiddleware)
```

### Configuring Middleware

Sometimes there's a need for passing configuration information to the middleware. For example the 
goa [Timeout](https://goa.design/reference/goa/middleware/#Timeout) middleware needs a timeout
value. This is easily accomplished by providing a constructor method that accepts the configuration
information as parameters and uses closure to build the middleware:

```go
// MyConfiguredMiddleware does something interesting and needs a "config" string value.
func MyConfiguredMiddleware(config string) goa.Middleware {
    return func(h goa.Handler) Handler {
        return func(ctx context.Context, rw http.ResponseWriter, req *http.Request) error {
            // Use ctx, rw, req and any parameter given to the middleware constructor:
            rw.Header().Set("X-Custom", config)
        }
    }
}
```

Mounting the middleware above then looks like:

```go
s := goa.New("my service")
s.Use(MyConfiguredMiddleware("value"))
```

The pattern above is the one followed by all built-in middlewares, even the ones not taking
configuration values for consistency.
