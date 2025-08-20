---
title: "Implementing the Service"
linkTitle: "Implementing"
weight: 2
description: "Generate code and implement a basic JSON‑RPC service in Goa."
---

In this step you will generate code and implement the `calculator` service.

## 1. Generate code

```bash
go install goa.design/goa/v3/cmd/goa@latest
goa gen jsonrpccalc/design
```

This generates server and client code for JSON‑RPC over HTTP (and SSE if your
methods use streaming results). For WebSocket streaming, see the JSON‑RPC
concepts section.

## 2. Implement service logic

Create `cmd/server/main.go` and implement the `Add` method in the generated
`service` package. The implementation mirrors the REST/gRPC tutorials.

Example minimal server wiring:

```go
// cmd/server/main.go
package main

// Import generated packages for your service and the generated JSON‑RPC HTTP server.
// The exact import paths depend on your module name and service name.

type calcSvc struct{}

// Implement the generated interface method.
// func (calcSvc) Add(ctx context.Context, p *calc.AddPayload) (*calc.AddResult, error) {
//     return &calc.AddResult{Sum: p.A + p.B}, nil
// }

func main() {
    // 1) Create the service implementation
    // 2) Build endpoints with the generated helper
    // 3) Mount the generated JSON‑RPC HTTP server on your mux
    // 4) Start the HTTP server on :8080
}
```

Notes on IDs and streaming (authoritative):

- Non‑streaming: If you don't declare an `ID()` field, the framework still
  correlates responses using the request envelope `id`. Add `ID("request_id",
  String)` in the payload only if your handler needs to read the `id` value.
- SSE: `SendAndClose` sets the response envelope `id` to the result ID if set,
  otherwise to the original request `id`.
- WebSocket: bidirectional streaming uses a single connection per service; use
  `StreamingPayload`/`StreamingResult` and include `ID()` in both when you need
  typed correlation.

## 3. Run the server

Proceed to [Running](./3-running.md) to start the server and call it over HTTP
and SSE.


