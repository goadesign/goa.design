---
title: "HTTP and SSE Semantics"
weight: 3
---

HTTP and SSE share the same JSON‑RPC route (typically `POST /rpc`). The client selects SSE by sending `Accept: text/event-stream`. SSE is valid only for methods that declare a streaming result (or mixed results).

## HTTP (unary)

- Regular request/response.
- Batch requests supported (array of request objects in the body).
- Notifications are requests without `id` (no response is sent).

Typical curl example:

```bash
curl -s -X POST localhost:8080/rpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"method","params":{}}'
```

## SSE (server streaming)

- Server emits a sequence of events; each JSON‑RPC notification or response is a separate SSE event.
- Use `Send(ctx, event)` to send notifications; use `SendAndClose(ctx, result)` to send the final JSON‑RPC response and finish the stream.
- The SSE `id:` field mirrors the JSON‑RPC response `id` when present.

Requesting SSE with curl:

```bash
curl -N -X POST localhost:8080/rpc -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"stream","params":{}}'
```

## Mixed results

- Define both `Result` and `StreamingResult` to support content negotiation between HTTP and SSE on the same endpoint.
- The server chooses HTTP vs. SSE based on `Accept`.

Design sketch:

```go
Method("report", func() {
    Payload(func() { /* ... */ })
    Result(func() { /* non-streaming shape for HTTP */ })
    StreamingResult(func() { /* streaming shape for SSE */ })
    JSONRPC(func() { ServerSentEvents(func() {}) })
})
```

Operational tips:

- Set `Cache-Control: no-store` on SSE responses to avoid intermediary caching.
- Send periodic keep‑alives (e.g., empty comments) if clients or proxies time out idle connections.
- Limit SSE event size and frequency to avoid client buffer issues.


