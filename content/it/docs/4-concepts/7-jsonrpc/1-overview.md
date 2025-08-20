---
title: "JSON‑RPC Overview"
weight: 1
---

Goa supports JSON‑RPC 2.0 over multiple transports:

- HTTP (unary requests and responses)
- HTTP Server‑Sent Events (SSE) for server‑initiated streaming
- WebSocket for bidirectional streaming

Key properties:

- Batch requests and notifications are supported where applicable.
- The same JSON‑RPC HTTP route can serve SSE by content negotiation using the
  `Accept` header (`application/json` vs. `text/event-stream`).
- JSON‑RPC WebSocket uses a single connection per service, shared by all
  methods.

Related concepts: see [Transports](../6-trasporti) for the matrix of allowed
combinations within one service and per method.


### Topics in this section

- [IDs and Envelope Mapping](./2-ids-and-envelope)
- [HTTP and SSE Semantics](./3-http-and-sse)
- [WebSocket Streaming](./4-websocket-streaming)
- [Batching and Notifications](./5-batching-and-notifications)
- [Error Mapping](./6-error-mapping)

### Method names

On the wire, the JSON‑RPC `method` value is the DSL method name (for example: `add`). Each service has a single JSON‑RPC endpoint, so names are scoped to the service and do not need a `service.method` prefix.

### Transport summary

| Transport | Connection            | Patterns                         | Batching            | Notifications |
|-----------|-----------------------|----------------------------------|---------------------|---------------|
| HTTP      | Request/response      | Non‑streaming (unary)            | Yes (array body)    | Client → Yes  |
| SSE       | Long‑lived HTTP resp. | Server streaming, mixed results  | Not applicable      | Server → Yes  |
| WebSocket | Persistent (full‑duplex) | Client streaming, server streaming, bidirectional | Not typical (message‑oriented) | Both directions |

Notes:

- SSE shares the same route as HTTP. The client selects SSE via `Accept: text/event-stream` and the method must declare a streaming result (or mixed results).
- WebSocket is enabled by using `GET` on the JSON‑RPC endpoint. Non‑streaming methods are not supported over JSON‑RPC WebSocket.


