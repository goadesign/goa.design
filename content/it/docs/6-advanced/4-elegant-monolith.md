---
title: "Elegant Monolith"
linkTitle: "Elegant Monolith"
description: "A guide to building monolithic services with Goa"
weight: 4
---

Goa makes it convenient to adopt the elegant monolith architecture, where all
services are combined into a single codebase and run in a single process. This
guide will walk you through the process of setting up elegant monoliths in Goa.

## Goa Endpoint

The key to building a monolithic application with Goa is the `Endpoint` construct:

```go
type Endpoint func(ctx context.Context, request any) (response any, err error)
```

Endpoints define both server and client side remotable functions. On the server
side they wrap the actual business logic, while on the client side they wrap the
transport layer.

For example given the following Goa design:

```go
var _ = Service("calc", func() {
    Method("multiply", func() {
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
        HTTP(func() {
            GET("/multiply/{a}/{b}")
        })
    })
})
```

Server-side, Goa will generate a Go struct that lists all the services endpoints
as well as a helper function to instantiate the struct given business logic:

```go
// Endpoints wraps the "calc" service endpoints.
type Endpoints struct {
	Multiply goa.Endpoint
}

// NewEndpoints wraps the methods of the "calc" service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Multiply: NewMultiplyEndpoint(s),
    }
}
```

Client-side, Goa will generate a Go struct that exposes the service methods and 
can be constructed given the endpoints:

```go
// Client is the "calc" service client.
type Client struct {
	MultiplyEndpoint goa.Endpoint
}

// NewClient initializes a "calc" service client given the endpoints.
func NewClient(multiply goa.Endpoint) *Client {
	return &Client{
		MultiplyEndpoint: multiply,
	}
}

// Multiply calls the "multiply" endpoint of the "calc" service.
func (c *Client) Multiply(ctx context.Context, p *MultiplyPayload) (res int, err error) {
    // Omitted for brevity
}
```

## Building Monolithic Applications

The power of the `Endpoint` construct is that it can be used independently of the
underlying transport layer. In particular a client can be constructed given
endpoints that are implemented in-memory, given the previous example:

```go
package main

import (
    "context"
    "github.com/<your username>/calc/gen/calc"
)

func main() {
    // 1. Instantiate the service
    // NewService() is your function that returns a struct which implements the
    // generated service interface
    service := NewService() 

    // 2. Instantiate the server endpoints using the Goa generated NewEndpoints
    endpoints := calc.NewEndpoints(service)

    // 3. Instantiate the client using the Goa generated NewClient
    client := calc.NewClient(endpoints.Multiply)

    // 4. Use the client
    res, err := client.Multiply(context.Background(), &calc.MultiplyPayload{A: 1, B: 2})

    // ...
}

// NewService returns a new service instance.
func NewService() calc.Service {
    // ...
}
```

This pattern makes it possible to benefit from the simplicity of deploying and
operating monolithic applications while still enjoying the benefits of a modular
and extensible architecture.

## Applying Monolithic Architecture to Entire Systems

This pattern can be applied to entire systems that consist of multiple services
by following the layout described in the
[Multiple Services](./2-multiple-services.md) guide. The main difference is in
the `main` implementation which instantiates all the services instead of just
one.

Assuming a system which consists of both a `users` and a `products` services where
the `products` service depends on the `users` service:

```go
// main.go
package main

import (
    "context"
    "flag"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "strings"
    "sync"
    "syscall"
    "time"

    "goa.design/clue/log"
    goahttp "goa.design/goa/v3/http"
    
    genusersserver "myapi/services/users/gen/http/users/server"
    genusers "myapi/services/users/gen/users"
    "myapi/services/users"
    
    genproductsserver "myapi/services/products/gen/http/products/server"
    genproducts "myapi/services/products/gen/products"
    "myapi/services/products"
)

func main() {
    // Parse command line flags
    var (
        httpAddr = flag.String("http-addr", ":8080", "HTTP listen address")
        debug    = flag.Bool("debug", false, "Enable debug mode")
    )
    flag.Parse()

    // Initialize context with logger
    format := log.FormatJSON
    if log.IsTerminal() {
        format = log.FormatTerminal
    }
    ctx := log.Context(context.Background(), log.WithFormat(format))
    if *debug {
        ctx = log.Context(ctx, log.WithDebug())
        log.Debugf(ctx, "debug mode enabled")
    }

    /*------------------------------------------*
     * This section is specific to the monolith *
     *------------------------------------------*/

    // Create services and endpoints
    usersSvc := users.NewUsers()
    usersEndpoints := genusers.New(usersSvc)
    // Create in-memory client for users service
    usersClient := genusers.NewClient(usersEndpoints.Create, usersEndpoints.Find, usersEndpoints.Update, usersEndpoints.Delete)
    productsSvc := products.NewProducts(usersClient)
    productsEndpoints := genproducts.New(productsSvc)

    // Create transport handlers
    mux := goahttp.NewMuxer()
    usersServer := genusersserver.New(usersEndpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    usersServer.Mount(mux)
    productsServer := genproductsserver.New(productsEndpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    productsServer.Mount(mux)

    // Log mounted endpoints
    for _, m := range usersServer.Mounts {
        log.Printf(ctx, "mounted %s %s", m.Method, m.Pattern)
    }
    for _, m := range productsServer.Mounts {
        log.Printf(ctx, "mounted %s %s", m.Method, m.Pattern)
    }

    /*------------------------------------------*
     * Rest is identical to any Goa application *
     *------------------------------------------*/

    // Create HTTP server
    mux.Use(log.HTTP(ctx)) // Add logger to request context
    httpServer := &http.Server{
        Addr:    *httpAddr,
        Handler: mux,
    }

    // Handle shutdown gracefully
    errc := make(chan error)
    go func() {
        c := make(chan os.Signal, 1)
        signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
        errc <- fmt.Errorf("signal: %s", <-c)
    }()

    ctx, cancel := context.WithCancel(ctx)
    var wg sync.WaitGroup
    wg.Add(1)

    go func() {
        defer wg.Done()

        // Start HTTP server
        go func() {
            log.Printf(ctx, "HTTP server listening on %s", *httpAddr)
            errc <- httpServer.ListenAndServe()
        }()

        <-ctx.Done()
        log.Print(ctx, "shutting down HTTP server")

        // Shutdown gracefully with a 30s timeout
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := httpServer.Shutdown(ctx); err != nil {
            log.Errorf(ctx, err, "failed to shutdown HTTP server")
        }
    }()

    // Wait for shutdown
    if err := <-errc; err != nil && !strings.HasPrefix(err.Error(), "signal:") {
        log.Errorf(ctx, err, "server error")
    }
    cancel()
    wg.Wait()
    log.Print(ctx, "server exited")
}
```

This example creates a single HTTP server that serves the endpoints from all the
services in the monolith.  Any inter-service communication is handled by
in-memory clients.






