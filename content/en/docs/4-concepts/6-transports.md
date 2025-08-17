---
title: "Transports and Streaming Combinations"
linkTitle: "Transports"
weight: 6
description: "Allowed transport combinations per service and per method, with streaming modes and constraints."
---

This page explains which transport combinations a Goa service and its methods
can expose, and which streaming modes are valid per transport. The goal is to
give newcomers and experienced users a single, authoritative reference for what
“mixing transports” means in Goa, and what combinations are allowed or
forbidden.

It covers:
- The available transports: HTTP (plain), HTTP Server‑Sent Events (SSE), HTTP
  WebSocket, JSON‑RPC 2.0 (over HTTP, SSE, WebSocket), and gRPC.
- Streaming modes: no stream, client stream, server stream, bidirectional.
- What a single service may expose at the same time.
- What a single method may expose on a per‑transport basis.


## Terminology

- No stream: Standard request/response (unary).
- Client stream: Client sends a stream of payloads to the server.
- Server stream: Server sends a stream of results to the client.
- Bidirectional: Both sides stream.
- Mixed results: A method defines both `Result` and `StreamingResult` with
  different types. This enables content negotiation between a regular response
  and a streaming response (only supported by SSE).


## Service‑level: What transports can be mixed in one service?

In the table below, “yes” means the transports can coexist in the same Goa
service. Notes explain constraints.

| Transport in same service | With HTTP (plain) | With HTTP (WS) | With HTTP (SSE) | With JSON‑RPC (HTTP) | With JSON‑RPC (WS) | With JSON‑RPC (SSE) | With gRPC |
|---------------------------|-------------------|----------------|-----------------|----------------------|--------------------|---------------------|-----------|
| HTTP (plain)              | —                 | yes            | yes             | yes                  | no [S2]            | yes                 | yes       |
| HTTP (WebSocket)          | yes               | —              | yes             | yes                  | no [S2]            | yes                 | yes       |
| HTTP (SSE)                | yes               | yes            | —               | yes                  | no [S2]            | yes                 | yes       |
| JSON‑RPC (HTTP)           | yes               | yes            | yes             | —                    | no [S1]            | yes                 | yes       |
| JSON‑RPC (WebSocket)      | no [S2]           | no [S2]        | no [S2]         | no [S1]              | —                  | no [S1]             | yes       |
| JSON‑RPC (SSE)            | yes               | yes            | yes             | yes                  | no [S1]            | —                   | yes       |
| gRPC                      | yes               | yes            | yes             | yes                  | yes                | yes                 | —         |

Notes:
- [S1] JSON‑RPC WebSocket cannot be mixed with other JSON‑RPC transports in the
  same service. A JSON‑RPC service must be either WebSocket‑only, or HTTP/SSE
  (which can coexist) — not both.
- [S2] A service cannot mix JSON‑RPC WebSocket endpoints with “pure HTTP”
  WebSocket endpoints. JSON‑RPC uses a single WS connection shared by all
  methods, whereas pure HTTP creates one WS connection per endpoint.

Additional service‑level behaviors:
- JSON‑RPC HTTP and JSON‑RPC SSE may share the same POST endpoint and are
  selected via the `Accept` header (e.g., `text/event-stream` vs.
  `application/json`).
- gRPC is independent and can be combined freely with HTTP and JSON‑RPC
  transports.


## Method‑level: Valid streaming modes per transport

In the table below, “yes” means the streaming mode is valid for a method over
that transport. “yes (mixed)” means it is valid when the method uses mixed
results (different `Result` and `StreamingResult`) and the endpoint enables
SSE. “no” means it is forbidden.

| Transport           | No stream           | Client stream | Server stream       | Bidirectional |
|---------------------|---------------------|---------------|---------------------|---------------|
| HTTP (plain)        | yes                 | no            | yes (mixed) [M1]    | no            |
| HTTP (SSE)          | yes (mixed) [M2]    | no            | yes [M3]            | no            |
| HTTP (WebSocket)    | no                  | yes [M4]      | yes [M4]            | yes [M4]      |
| JSON‑RPC (HTTP)     | yes                 | no            | yes (mixed) [M1,M5] | no            |
| JSON‑RPC (SSE)      | yes (mixed) [M2,M5] | no            | yes [M6]            | no            |
| JSON‑RPC (WebSocket)| no                  | yes [M7]      | yes [M8]            | yes [M7]      |
| gRPC                | yes                 | yes           | yes                 | yes           |

Notes:
- [M1] Mixed results requires SSE on the endpoint and forbids
  `StreamingPayload`. Use for content negotiation between a regular response
  and an SSE stream.
- [M2] Using SSE with a non‑streaming method is only valid when the method has
  mixed results (the SSE path serves the streaming result; the non‑SSE path
  serves the regular result).
- [M3] SSE is strictly server‑to‑client; it cannot be used with client or
  bidirectional streaming.
- [M4] Pure HTTP WebSocket endpoints must use GET and cannot include a request
  body. Map request data via headers/params instead. (JSON‑RPC WS is an
  exception because messages travel inside the WS channel.)
- [M5] JSON‑RPC HTTP and JSON‑RPC SSE can coexist with mixed results; the server
  chooses based on the `Accept` header.
- [M6] JSON‑RPC SSE uses POST on the shared JSON‑RPC endpoint; the SSE `id`
  field maps to the result ID attribute.
- [M7] JSON‑RPC WebSocket supports client‑stream, server‑stream, and
  bidirectional streaming. Non‑streaming methods are not supported over
  JSON‑RPC WebSocket.
- [M8] For JSON‑RPC WebSocket with server streaming, define request data in the
  method `Payload`; do not also define a `StreamingPayload`.


## JSON‑RPC specifics

- WebSocket:
  - One WS connection per service shared by all JSON‑RPC methods.
  - No header/cookie/param mappings on WS endpoints.
  - Three method patterns are supported:
    - `StreamingPayload()` only (client‑to‑server notifications).
    - `StreamingResult()` only (server‑to‑client notifications; emitted without
      a request `id`).
    - Both `StreamingPayload()` and `StreamingResult()` (bidirectional).
  - Non‑streaming methods are not supported over JSON‑RPC WebSocket.

- HTTP and SSE:
  - Both use the same JSON‑RPC route (POST). The server selects the response
    behavior at runtime based on `Accept`.
  - Mixed results enable content negotiation between regular HTTP JSON‑RPC
    responses and SSE event streams.

- ID handling:
  - Non‑streaming: the framework copies the request `id` to the result `ID`
    field if not set by user code.
  - Streaming (WS): server replies reuse the original request `id`;
    server‑initiated notifications have no `id`.
  - SSE: `SendAndClose` sends a JSON‑RPC response; the `id` equals the result
    ID if set, otherwise the request `id`.


## HTTP specifics

- WebSocket endpoints must use GET. SSE endpoints may use GET or POST. JSON‑RPC
  SSE uses POST.
- WebSocket endpoints (pure HTTP) cannot have a request body. Map input
  through headers and/or params. (JSON‑RPC WS is exempt because the JSON‑RPC
  messages flow over the WS channel.)


## gRPC specifics

gRPC places no additional restrictions relative to HTTP/JSON‑RPC in Goa. Unary,
client streaming, server streaming, and bidirectional streaming are all
supported. gRPC can be combined freely with any of the HTTP and JSON‑RPC
transports listed above.


## Where these rules are enforced (for reference)

The following components enforce the constraints summarized in this document:
- `expr/method.go`: stream‑kind helpers; mixed results detection.
- `dsl/payload.go`, `dsl/result.go`: how `StreamingPayload`/`StreamingResult`
  set the method stream kind.
- `expr/http_endpoint.go`: SSE constraints; mixed results requirements; pure
  HTTP WS method/route validations; JSON‑RPC endpoint validations.
- `expr/http_service.go`: JSON‑RPC transport mixing rules; JSON‑RPC WS vs. pure
  HTTP WS conflict; JSON‑RPC route preparation and method enforcement (GET for
  WS, POST otherwise).
- `dsl/jsonrpc.go` and `jsonrpc/README.md`: JSON‑RPC transport behavior
  (batching, notifications, WS/SSE semantics), including “WS requires
  streaming” and “HTTP+SSE content negotiation.”


## Quick examples

Minimal examples to connect the concepts to the DSL (omitting unrelated lines):

```go
// JSON‑RPC SSE + HTTP (mixed results)
Method("monitor", func() {
    Result(ResultType)
    StreamingResult(EventType)
    JSONRPC(func() { ServerSentEvents() })
})
```

```go
// JSON‑RPC WebSocket (bidirectional)
Method("chat", func() {
    StreamingPayload(Message)
    StreamingResult(Message)
    JSONRPC(func() {})
})
```

```go
// Pure HTTP SSE (server stream)
Method("watch", func() {
    StreamingResult(Event)
    HTTP(func() { ServerSentEvents() })
})
```

Use these examples as templates and apply the tables above to ensure your
service and methods select valid combinations.


