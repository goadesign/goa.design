---
title: "Running the Service"
linkTitle: "Running"
weight: 3
description: "Run and call the JSON‑RPC service over HTTP and SSE."
---

Start the server (from your module root):

```bash
go run ./cmd/server
```

### Call over HTTP

Use curl to send a JSON‑RPC request:

```bash
curl -s -X POST localhost:8080/rpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"add","params":{"a":2,"b":40}}'
```

### Call over SSE (server‑streaming)

When your method uses mixed results (non‑streaming + streaming), request SSE:

```bash
curl -N -X POST localhost:8080/rpc -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"add","params":{"a":2,"b":40}}'
```

### WebSocket (bidirectional streaming)

For bidirectional streaming, expose the JSON‑RPC endpoint with `GET` to allow WebSocket upgrade and use `StreamingPayload`/`StreamingResult` in your design. Clients maintain a single connection per service and exchange JSON‑RPC messages over it.

### Batching and notifications

- To send a notification, omit the `id` in the request body; the server will not send a response.
- To batch, send an array of request objects; the response is an array of results in the same order (notifications produce no entry).

For details, see the JSON‑RPC concepts pages:

- [WebSocket Streaming](../../4-concepts/7-jsonrpc/4-websocket-streaming)
- [Batching and Notifications](../../4-concepts/7-jsonrpc/5-batching-and-notifications)
- [Error Mapping](../../4-concepts/7-jsonrpc/6-error-mapping)


