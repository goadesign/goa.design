---
title: "Designing a JSON‑RPC Service"
linkTitle: "Designing"
weight: 1
description: "Learn to design a JSON‑RPC 2.0 service with Goa, including the shared endpoint, method exposure, ID mapping, and transport choices."
---

In this tutorial, you'll design a simple JSON‑RPC service with Goa. Goa
provides first‑class support for JSON‑RPC 2.0 across HTTP, SSE, and WebSocket.

What you'll learn:

- Define a service and methods in Goa's DSL
- Enable JSON‑RPC on the service and methods
- Map JSON‑RPC IDs to fields
- Choose transports (HTTP, SSE, WebSocket)

## What We'll Build

We'll create a `calculator` service with one method `add` that sums two
integers.

| Method | Description                 |
|--------|-----------------------------|
| add    | Returns the sum of `a + b`. |

## 1. Create a new module and folder

Create a fresh module `jsonrpccalc`:

```bash
mkdir jsonrpccalc
cd jsonrpccalc
go mod init jsonrpccalc
```

Create a `design/` directory:

```bash
mkdir design
```

## 2. Write the service design

Create `design/calculator.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// JSON‑RPC calculator service.
var _ = Service("calculator", func() {
    Description("A simple calculator exposed via JSON‑RPC")

    // Expose this service via JSON‑RPC at POST /rpc
    JSONRPC(func() { POST("/rpc") })

    Method("add", func() {
        Description("Add two integers")

        Payload(func() {
            Attribute("a", Int, "Left operand")
            Attribute("b", Int, "Right operand")
            Required("a", "b")
        })

        Result(func() {
            Attribute("sum", Int, "Sum of a and b")
            Required("sum")
        })

        // Enable JSON‑RPC for this method
        JSONRPC(func() {})
    })
})
```

Key points:

- `JSONRPC(func(){ POST("/rpc") })` defines a single shared HTTP route for all
  service methods.
- Each method exposed via JSON‑RPC declares `JSONRPC(func(){})`.
- ID handling is automatic for non‑streaming: the response envelope `id` equals
  the request `id`. You do not need to include ID fields. If you need to access
  the ID in your handler, add `ID("request_id", String)` to the payload.
- SSE and HTTP share the same route; content negotiation picks SSE when
  `Accept: text/event-stream`.

## 3. Next steps

Proceed to [Implementing the Service](./2-implementing.md) to generate code and
add the business logic.

See also: [JSON‑RPC Overview](../../4-concepts/7-jsonrpc/1-overview).


