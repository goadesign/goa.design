---
title: Implementing
weight: 2
---

# Implementing the Concerts Service

After designing your REST API with Goa's DSL, it's time to **implement** the
service. In this tutorial, you will:

1. Generate code using the Goa CLI (`goa gen`).
2. Create `main.go` to implement the service and the HTTP server.

## 1. Generate the Goa Artifacts

From your project root (e.g., `concerts/`), run the Goa code generator:

```bash
goa gen concerts/design
```

This command analyzes your design file (`design/concerts.go`) and produces a
`gen/` folder containing:
  - **Transport-agnostic endpoints** (in `gen/concerts/`).
  - **HTTP** validation and marshalling code (in `gen/http/concerts/`) for both server and client.
  - **OpenAPI** artifacts (in `gen/http/`).

If you **change your design** (e.g., add methods or fields), **rerun** `goa gen`
to keep the generated code in sync.

## 2. Explore the Generated Code

### `gen/concerts`

Defines **transport-agnostic endpoints** using Goa's `Endpoint` interface. Each
endpoint corresponds to one method in your service (`list`, `create`, `show`,
`update`, `delete`). This package includes:

- The **service interface** you'll implement to provide business logic (in `service.go`).
- **Payload** and **Result** types mirroring your design (also in `service.go`).
- A functions that let you inject your service implementation (`NewEndpoints` in `endpoints.go`).
- A function that wraps Goa endpoints into a service client (`NewClient` in `client.go`).

### `gen/http/concerts/server`

Contains **HTTP-specific** server-side logic mapping your design to HTTP routes,
request bodies, and response status codes. This includes code that:

- **Wraps** service endpoints in HTTP handlers (`New` function in `gen/http/concerts/server/server.go`).
- **Encodes** and **decodes** request bodies and responses (`gen/http/concerts/server/encode_decode.go`).
- **Routes requests** to the proper service method (`Server.Mount` in `gen/http/concerts/server/server.go`).
- **Defines transport-specific types** and their validation logic (`gen/http/concerts/server/types.go`).
- **Creates HTTP paths** from your design (`gen/http/concerts/server/paths.go`).

### `gen/http/concerts/client`

Contains **HTTP-specific** client-side logic which mirrors the server-side
logic. This includes code that:

- **Creates** service endpoints from a HTTP client (`NewClient` function in `gen/http/concerts/client/client.go`).
- **Encodes** and **decodes** request bodies and responses (`gen/http/concerts/client/encode_decode.go`).
- **Creates HTTP paths** from your design (`gen/http/concerts/client/paths.go`).
- **Defines transport-specific types** and their validation logic (`gen/http/concerts/client/types.go`).
- **Defines helper functions** to create a client command line tool (`gen/http/concerts/client/cli.go`).

### `gen/http/openapi[2|3].[yaml|json]`

Contains the OpenAPI specification files that document your API. These are
automatically generated from your design in both YAML and JSON formats, and in
both OpenAPI 2.0 (Swagger) and OpenAPI 3.0 versions. These files can be used
with tools like Swagger UI to explore and test your API, or with code generators
to create client libraries in various programming languages.

## 3. Create Your `main.go` File

Let's now create a `main.go` file to implement the service and the HTTP server.
For the sake of simplicity, we'll create a service in the `main` package.
Typically the service implementation is in a separate package. Create a file
`cmd/concerts/main.go` in your project:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"

    "github.com/google/uuid"
    goahttp "goa.design/goa/v3/http"

    genconcerts "concerts/gen/concerts"
    genhttp "concerts/gen/http/concerts/server"
)

// main instantiates the service and starts the HTTP server.
func main() {
    // Instantiate the service
    svc := &ConcertsService{}

    // Wrap it in the generated endpoints
    endpoints := genconcerts.NewEndpoints(svc)

    // Build an HTTP handler
    mux := goahttp.NewMuxer()
    requestDecoder := goahttp.RequestDecoder
    responseEncoder := goahttp.ResponseEncoder
    handler := genhttp.New(endpoints, mux, requestDecoder, responseEncoder, nil, nil)

    // Mount the handler on the mux
    genhttp.Mount(mux, handler)

    // Create a new HTTP server
    port := "8080"
    server := &http.Server{Addr: ":" + port, Handler: mux}

    // Log the supported routes
    for _, mount := range handler.Mounts {
        log.Printf("%q mounted on %s %s", mount.Method, mount.Verb, mount.Pattern)
    }

    // Start the server (this will block the execution)
    log.Printf("Starting concerts service on :%s", port)
    if err := server.ListenAndServe(); err != nil {
        log.Fatal(err)
    }
}

// ConcertsService implements genconcerts.Service interface from
// gen/concerts/service.go
type ConcertsService struct {
    // In-memory storage for concerts
    concerts []*genconcerts.Concert
}

// List upcoming concerts with optional pagination.
func (m *ConcertsService) List(ctx context.Context, p *genconcerts.ListPayload) ([]*genconcerts.Concert, error) {
    start := (p.Page - 1) * p.Limit
    end := start + p.Limit
    if end > len(m.concerts) {
        end = len(m.concerts)
    }
    return m.concerts[start:end], nil
}

// Create a new concerts entry.
func (m *ConcertsService) Create(ctx context.Context, p *genconcerts.ConcertPayloadCreatePayload) (*genconcerts.Concert, error) {
    newConcert := &genconcerts.Concert{
        ID:     uuid.New().String(),
        Artist: p.Artist,
        Date:   p.Date,
        Venue:  p.Venue,
        Price:  p.Price,
    }
    m.concerts = append(m.concerts, newConcert)
    return newConcert, nil
}

// Get a single concert by ID.
func (m *ConcertsService) Show(ctx context.Context, p *genconcerts.ShowPayload) (*genconcerts.Concert, error) {
    for _, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            return concert, nil
        }
    }
    // Use the generated MakeNotFound function to create a not found error
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concert not found: %s", p.ConcertID))
}

// Update an existing concert by ID.
func (m *ConcertsService) Update(ctx context.Context, p *genconcerts.UpdatePayload) (*genconcerts.Concert, error) {
    for i, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            if p.Artist != nil {
                concert.Artist = *p.Artist
            }
            if p.Date != nil {
                concert.Date = *p.Date
            }
            if p.Venue != nil {
                concert.Venue = *p.Venue
            }
            if p.Price != nil {
                concert.Price = *p.Price
            }
            m.concerts[i] = concert
            return concert, nil
        }
    }
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concert not found: %s", p.ConcertID))
}

// Remove a concert from the system by ID.
func (m *ConcertsService) Delete(ctx context.Context, p *genconcerts.DeletePayload) error {
    for i, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            m.concerts = append(m.concerts[:i], m.concerts[i+1:]...)
            return nil
        }
    }
    return genconcerts.MakeNotFound(fmt.Errorf("concert not found: %s", p.ConcertID))
}
```

## 4. Add Your Custom Logic

### Service Interface

Within `gen/concerts/service.go`, you'll see:

```go
// The concerts service manages music concert data.
 type Service interface {
     // List upcoming concerts with optional pagination.
     List(context.Context, *ListPayload) (res []*Concert, err error)
     // Create a new concert entry.
     Create(context.Context, *ConcertPayload) (res *Concert, err error)
     // Get a single concert by ID.
     Show(context.Context, *ShowPayload) (res *Concert, err error)
     // Update an existing concert by ID.
     Update(context.Context, *UpdatePayload) (res *Concert, err error)
     // Remove a concert from the system by ID.
     Delete(context.Context, *DeletePayload) (err error)
 }
```

Implementing these methods is up to you. Place your logic in a separate package,
add a database or persistent layer, and handle errors properly.

### Service Implementation Flow

Here's how the pieces fit together:

1. First, you implement the service interface with your business logic:
```go
type ConcertsService struct {
    // Your fields here
}

// Implement all required methods
func (s *ConcertsService) List(ctx context.Context, p *ListPayload) ([]*Concert, err error) {
    // Your implementation
}
```

2. Then, you wire everything together:
```go
// Create your service implementation
svc := &ConcertsService{}

// Convert your service into Goa endpoints
endpoints := genconcerts.NewEndpoints(svc)

// For HTTP: Create an HTTP handler from the endpoints
handler := genhttp.New(endpoints, mux, decoder, encoder, nil, nil)

// For gRPC (if your design includes it):
// grpcHandler := gengrpc.New(endpoints, nil)
```

The `NewEndpoints` function wraps each of your service methods in a standardized
Goa endpoint that handles transport-agnostic concerns. These endpoints can then
be used with different transport layers (HTTP, gRPC) through their respective
handlers.

## 5. Validate the Implementation

- **Run** the service, from the project root:
```bash
go run concerts/cmd/concerts
```

- **Test** endpoints with `curl` or similar:

```bash
curl http://localhost:8080/concerts
```

If everything works, you're ready to proceed to the [Running tutorial](./3-running.md) (if applicable) or start **enhancing** your service with advanced Goa features.
