---
title: "Batching and Notifications"
weight: 5
---

Batching and notifications make JSON‑RPC efficient and flexible. Batching lets a client send multiple calls in a single HTTP request. Notifications let a client (or server in streaming transports) send fire‑and‑forget messages that do not expect a response.

## Batching

When to use:

- Reduce network round‑trips when performing several independent calls.
- Improve throughput for chatty clients that can tolerate independent failures.

Behavior:

- The request body is an array of JSON‑RPC request objects.
- Each entry is processed independently; responses are returned as an array in the same order.
- Entries that are notifications (missing `id`) do not produce response entries.

Request body (JSON only):

```json
[
  {"jsonrpc": "2.0", "id": "1", "method": "add", "params": {"a": 1, "b": 2}},
  {"jsonrpc": "2.0", "id": "2", "method": "add", "params": {"a": 10, "b": 20}},
  {"jsonrpc": "2.0", "method": "add", "params": {"a": 5, "b": 5}}
]
```

Example HTTP call:

```http
POST /rpc HTTP/1.1
Content-Type: application/json

[ ... see JSON body above ... ]
```

Response:

```json
[
  {"jsonrpc": "2.0", "result": {"sum": 3},  "id": "1"},
  {"jsonrpc": "2.0", "result": {"sum": 30}, "id": "2"}
]
```

Notes and pitfalls:

- IDs should be unique per batch; duplicates are permitted by the spec but make correlation ambiguous.
- Batches are not atomic. Some entries can succeed while others fail.
- Avoid mixing long‑running and short operations in the same batch to reduce head‑of‑line blocking on the client.
- Enforce reasonable body size limits to prevent abuse.

## Notifications

What they are:

- A JSON‑RPC request without an `id`. The sender does not expect a response.
- On SSE/WebSocket, server‑initiated messages are notifications by definition and also omit `id`.

When to use:

- Logging, telemetry, presence, or any update where the sender does not need a reply.
- Server‑to‑client updates in streaming sessions.

Client example (HTTP notification):

```json
{"jsonrpc": "2.0", "method": "audit.log", "params": {"action": "login", "user": "alice"}}
```

Guidelines:

- Do not rely on notifications for critical operations; there is no delivery guarantee.
- Prefer small, self‑contained payloads; large notifications cannot be retried safely.
- For observability, consider sending a follow‑up request when acknowledgement is required.

## Design and implementation

- No special DSL is required for batching; any JSON‑RPC method exposed over HTTP can be batched.
- Notifications are created by clients omitting the `id`. Server‑side, use the streaming helpers (`Send`, `SendNotification`) to emit notifications on SSE/WebSocket.

## Best practices

- Map application errors to appropriate JSON‑RPC codes so batch responses are predictable.
- Document which methods are safe to call as notifications.
- Validate batch sizes and entries server‑side; reject malformed entries with proper error codes.


