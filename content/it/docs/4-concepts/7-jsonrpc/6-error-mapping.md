---
title: "Error Mapping"
weight: 6
---

Map your service errors to JSON‑RPC error codes using the DSL. Clear mappings
help clients reason about failures and build robust retries.

## Standard codes

The JSON‑RPC 2.0 specification defines a set of standard error codes that are reserved for core protocol errors. These codes are negative integers and each represents a specific type of failure that can occur during the processing of a JSON‑RPC request:

- **Parse error (`-32700`)**  
  This error occurs when the server receives invalid JSON and is unable to parse the request. It typically indicates a syntax error in the JSON sent by the client.

- **Invalid request (`-32600`)**  
  The received JSON is syntactically valid, but the structure of the request does not conform to the JSON‑RPC protocol (for example, missing required fields like `jsonrpc`, `method`, or `params`).

- **Method not found (`-32601`)**  
  The requested method does not exist or is not available on the server. This is returned when the `method` field in the request does not match any known method.

- **Invalid params (`-32602`)**  
  The parameters provided in the request are invalid or do not match the expected types or structure for the method. This can include missing required parameters or parameters of the wrong type.

- **Internal error (`-32603`)**  
  An internal JSON‑RPC error occurred on the server while processing the request. This is a generic error for unexpected conditions not covered by the other codes.

These standard codes are reserved for protocol-level errors and should be used as appropriate to help clients distinguish between different classes of failures.

## Error declarations and scope

Goa lets you declare errors at three levels. The level determines both visibility and whether an error is considered returnable by a method.

- API level (top‑level `API(...)`):
  - Define the error details once (description, attributes/shape) so it can be referenced by services and methods.
  - Optionally define a default transport mapping (when supported) so the code mapping does not need to be repeated.
  - Declaring an error at the API level DOES NOT mean any method can return it. Methods must still opt‑in (directly or via service‑level declaration).

- Service level (`Service(...)`):
  - Referencing `Error("name")` here means any method of the service may return this error.
  - You can also provide a service‑wide JSON‑RPC mapping in the service `JSONRPC` block. Methods can still override it.

- Method level (`Method(...)`):
  - Declare or reference `Error("name")` to state the method may return it.
  - Provide method‑specific JSON‑RPC mapping in the method `JSONRPC` block when it differs from the service‑wide mapping.

Mapping precedence: method mapping overrides service mapping, which overrides any default defined at a higher level.

## How to map

Typical pattern:

1) Define the error once (API level), including description and, if desired, a default mapping.
2) Make the error returnable where needed (service or method level) and provide more specific mappings only when necessary.

### Example

```go
// API level: define the error details once (does not make it returnable)
var _ = API("calc", func() {
    Error("unauthorized", func() { Description("User is not authenticated") })
    // Optionally define a default mapping if supported in your setup
    // JSONRPC(func() { Response("unauthorized", func() { Code(-32001) }) })
})

// Service level: make the error returnable by any method in this service
var _ = Service("calc", func() {
    JSONRPC(func() { POST("/rpc") })

    Error("unauthorized") // now any method may return it

    // Service‑wide mapping (methods can override)
    JSONRPC(func() {
        Response("unauthorized", func() { Code(-32001) })
    })

    Method("divide", func() {
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
            Required("a", "b")
        })
        Result(Int)

        // Method‑specific error
        Error("div_zero")
        JSONRPC(func() { Response("div_zero", func() { Code(-32602) }) })
    })
})
```

## Summary

- API‑level error: defines details/mapping reuse only; does not imply returnability.
- Service‑level error: makes the error returnable by any method of the service.
- Method‑level error: makes the error returnable by that method (and can override mappings).

## Guidelines

- Prefer specific application errors mapped to appropriate codes.
- Unmapped errors default to Internal error (-32603).

Tip: Use consistent application error messages and, when helpful, include `data` with structured fields that aid debugging and client UX.



