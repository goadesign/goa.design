---
title: Implementing
weight: 2
description: "Step-by-step guide to implementing a REST API service in Goa, covering code generation, service implementation, HTTP server setup, and endpoint testing."
---

After designing your REST API with Goa's DSL, it's time to implement the service. This tutorial walks you through the implementation process step by step.

1. Generate code using the Goa CLI (`goa gen`)
2. Create `main.go` to implement the service and the HTTP server

## 1. Generate the Goa Artifacts

From your project root (e.g., `concerts/`), run the Goa code generator:

```bash
goa gen concerts/design
```

This command analyzes your design file (`design/concerts.go`) and produces a `gen/` folder containing:
- **Transport-agnostic endpoints** (in `gen/concerts/`)
- **HTTP** validation and marshalling code (in `gen/http/concerts/`) for both server and client
- **OpenAPI** artifacts (in `gen/http/`)

**Note:** If you change your design (e.g., add methods or fields), rerun `goa gen` to keep the generated code in sync.

## 2. Explore the Generated Code

Let's explore the key components of the generated code. Understanding these
files is crucial for implementing your service correctly and taking full
advantage of Goa's features.

### gen/concerts

Defines core service components independent of transport protocol:
- **Service interface** for business logic implementation (`service.go`)
- **Payload** and **Result** types mirroring your design
- **NewEndpoints** function for service implementation injection
- **NewClient** function for service client creation

### gen/http/concerts/server

Contains server-side HTTP-specific logic:
- **HTTP handlers** wrapping service endpoints
- **Encoding/decoding** logic for requests and responses
- **Request routing** to service methods
- **Transport-specific types** and validation
- **Path generation** from design specifications

### gen/http/concerts/client

Provides client-side HTTP functionality:
- **Client creation** from HTTP endpoints
- **Encoding/decoding** for requests and responses
- **Path generation** functions
- **Transport-specific types** and validation
- **CLI helper functions** for client tools

### OpenAPI Specifications

The `gen/http` directory contains auto-generated OpenAPI specifications:
- `openapi2.yaml` and `openapi2.json` (Swagger)
- `openapi3.yaml` and `openapi3.json` (OpenAPI 3.0)

These specifications are compatible with Swagger UI and other API tools, making them useful for API exploration and client generation.

## 3. Implement Your Service

The generated service interface in `gen/concerts/service.go` defines the methods you need to implement:

```go
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

### Implementation Flow

Your implementation needs to:

1. Create a service struct that implements the interface
2. Implement all required methods
3. Wire everything together with the HTTP server

Create a file at `cmd/concerts/main.go` with the following implementation:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"

    "github.com/google/uuid"
    goahttp "goa.design/goa/v3/http"

    // Use gen prefix for generated packages
    genconcerts "concerts/gen/concerts"
    genhttp "concerts/gen/http/concerts/server"
)

// ConcertsService implements the genconcerts.Service interface
type ConcertsService struct {
    concerts []*genconcerts.Concert // In-memory storage
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
    // Use designed error
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
```

## 4. Run and Test

1. **Run** the service from your project root:
```bash
go run concerts/cmd/concerts
```

2. **Test** endpoints with curl:
```bash
curl http://localhost:8080/concerts
```

Congratulations! 🎉 You've successfully implemented your first Goa service. Now
it's time for the exciting part - seeing your API in action! Head over to
[Running](./3-running.md) where we'll explore different ways to interact with
your service and watch it handle real HTTP requests.
