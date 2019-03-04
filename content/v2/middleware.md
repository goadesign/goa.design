+++
title = "Middleware"
weight = 5

[menu.main]
name = "Middleware"
parent = "v2"
+++

[Middleware](https://godoc.org/goa.design/goa/middleware) in goa wraps the
service specific logic to provide additional functionality. Middleware in goa
can be of two types

* [Endpoint-level middleware](/v2/middleware/#endpoint-level-middleware)
* [Transport-level middleware](/v2/middleware/#transport-level-middleware)

The follow sections describe the above two types of middleware and instructions
on writing a custom middleware using the [basic
example](https://github.com/goadesign/goa/blob/v2/examples/basic) as reference.

## Endpoint-level Middleware

Endpoint-level middlewares which operate at the endpoint level and are transport
agnostic. They wrap the generated endpoint code and are executed from the
outermost to the innermost layer. The generated goa endpoint will be the final
layer to be executed.

Writing an endpoint-level middleware must follow the signature below:

```go
func MyMiddleware(<args>) func(goa.Endpoint) goa.Endpoint {
  ...
}
```
Endpoint-level middleware can be setup by calling the generated `Use` function
in the service package which applies the middleware to all the generated
endpoints or by wrapping specific endpoints explicitly.

```go
import (
    calcsvc "goa.design/goa/gen/examples/basic/gen/calc"
    calc "goa.design/goa/examples/basic"
)

func main() {
    ...
    var svc calcsvc.Service
    {
        svc = calc.NewCalc(logger)
    }

    var eps *calcsvc.Endpoints
    {
        eps = calcsvc.NewEndpoints(svc)
        calcsvc.Use(MyMiddleware(<args>))  // applies MyMiddleware to all endpoints in calc service
        eps.Add = MyMiddleware(<args>)(eps.Add)  // applies MyMiddleware to only the `add` endpoint
    }
    ...
}
```

## Transport-level Middleware

Transport-level middlewares operate at the transport layer and are specific to
the transport.

### HTTP Middleware

HTTP middlewares are HTTP transport specific. They are executed in the same
order as the endpoint middleware - outermost layer to innermost layer.
Writing HTTP middleware must follow the signature below:

```go
// HTTP server-side middleware
func MyServerMiddleware(<args>) func(http.Handler) http.Handler {
}

// HTTP client-side middleware
import goahttp "goa.design/goa/http"

func MyClientMiddleware(<args>) func(goahttp.Doer) goahttp.Doer {
}
```

The **server middleware** can be mounted on a service with the generated `Use`
function in the HTTP server package which wraps all the server handlers.  The
middleware will execute just before executing the endpoint handlers.  Or, the
middleware can be mounted on the [goa
Muxer](https://godoc.org/goa.design/goa/http#Muxer) which would execute the
middleware before the Muxer routes the request to the appropriate server
handlers.

```go
func main() {
    ...
    var mux goahttp.Muxer
    {
        mux = goahttp.NewMuxer()
    }

    var calcServer *calcsvcsvr.Server
    {
        calcServer = calcsvcsvr.New(calcEndpoints, mux, dec, enc, errorHandler(logger))
        calcServer.Use(MyServerMiddleware(<args>))  // applies MyServerMiddleware to all HTTP endpoints
    }

    var handler http.Handler = mux
    handler = MyServerMiddleware(<args>)(handler)
    ...
}
```

The **client middleware** can be mounted on a service by wrapping the [goa
Doer](https://godoc.org/goa.design/goa/http#Doer).
```go
import goahttp "goa.design/goa/http"

func main() {
    ...
    var doer goahttp.Doer
    {
        doer = &http.Client{Timeout: time.Duration(timeout) * time.Second}
    }

    doer = MyClientMiddleware(<args>)(doer)
    ...
}
```

goa implements the following HTTP middlewares

* [**Logging**](https://godoc.org/goa.design/goa/http/middleware#Log) server
  middleware.
* [**Request ID**](https://godoc.org/goa.design/goa/http/middleware#RequestID)
  server middleware.
* **Tracing** middleware for [server](https://godoc.org/goa.design/goa/http/middleware#Trace)
  and [client](https://godoc.org/goa.design/goa/http/middleware#WrapDoer)
* [**AWS X-Ray**](https://godoc.org/goa.design/goa/http/middleware/xray)
  middleware for server and client.

### gRPC Middleware

gRPC middlewares are gRPC transport specific. Writing gRPC middleware is same as
writing gRPC server and client interceptors.

* [UnaryServerInterceptor](https://godoc.org/google.golang.org/grpc#UnaryServerInterceptor)
and [UnaryClientInterceptor](https://godoc.org/google.golang.org/grpc#UnaryClientInterceptor)
for unary endpoints.
* [StreamServerInterceptor](https://godoc.org/google.golang.org/grpc#StreamServerInterceptor)
and [StreamClientInterceptor](https://godoc.org/google.golang.org/grpc#StreamClientInterceptor)
for streaming endpoints.

goa implements the following gRPC middlewares

* **Logging** server middleware for [unary](https://godoc.org/goa.design/goa/grpc/middleware#UnaryServerLog)
  and [streaming](https://godoc.org/goa.design/goa/grpc/middleware#StreamServerLog)
  endpoints.
* **Request ID** server middleware for [unary](https://godoc.org/goa.design/goa/grpc/middleware#UnaryRequestID)
  and [streaming](https://godoc.org/goa.design/goa/grpc/middleware#StreamRequestID)
  endpoints.
* [**Stream Canceler**](https://godoc.org/goa.design/goa/grpc/middleware#StreamCanceler)
  server middleware.
* **Tracing** middleware for [unary server](https://godoc.org/goa.design/goa/grpc/middleware#UnaryServerTrace)
  and [client](https://godoc.org/goa.design/goa/grpc/middleware#UnaryClientTrace)
  and [streaming server](https://godoc.org/goa.design/goa/grpc/middleware#StreamServerTrace) and [client](https://godoc.org/goa.design/goa/grpc/middleware#StreamClientTrace).
* [**AWS X-Ray**](https://godoc.org/goa.design/goa/grpc/middleware/xray)
  middleware for unary and streaming client and server.

Refer to the [tracing example](https://github.com/goadesign/goa/blob/v2/examples/tracing)
to understand how gRPC middlewares are applied to the gRPC endpoints.
