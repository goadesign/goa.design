---
title: "Batching and Notifications"
weight: 5
---

Batching and notifications make JSON‑RPC efficient and flexible. Batching lets a
client send multiple calls in a single HTTP request. Notifications let a client
(or server in streaming transports) send fire‑and‑forget messages that do not
expect a response.

## Batching

Use batching to reduce round‑trips when performing several independent calls and
to improve throughput for chatty clients that can tolerate independent successes
and failures.

How it works: Send a JSON array of JSON‑RPC request objects. The server
processes each entry independently and writes responses only for entries that
include an `id`. Responses appear in the same order as their corresponding
requests; notifications are omitted. Batching is supported on HTTP only;
streaming transports (SSE/WebSocket) do not accept batch arrays.

In Goa, the generated server handles the JSON‑RPC envelopes for each batch
entry. Your method implementations receive typed payloads and return typed
results or errors as usual—you do not parse the batch array or the JSON‑RPC
envelopes yourself.

Request body (JSON only):

```json
[
  {"jsonrpc": "2.0", "id": "1", "method": "add", "params": {"a": 1, "b": 2}},
  {"jsonrpc": "2.0", "id": "2", "method": "add", "params": {"a": 10, "b": 20}},
  {"jsonrpc": "2.0", "method": "add", "params": {"a": 5, "b": 5}}
]
```

Example HTTP call:

```bash
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

Operational notes: IDs should be unique per batch (duplicates make correlation
ambiguous). Batches are not atomic—some entries can succeed while others fail.
Avoid mixing long‑running and short operations in the same batch to reduce
head‑of‑line blocking on the client, and enforce reasonable body size limits to
prevent abuse.

## Notifications

A notification is a JSON‑RPC request without an `id`, so the sender does not
expect a response. On SSE/WebSocket, server‑initiated messages are notifications
and also omit `id`.

Server‑side, Goa also handles the envelope for notifications. Your handlers
receive the usual typed payloads (or streaming server streams) and do not need
to check or set the JSON‑RPC `id`.

Typical uses include logging, telemetry, presence, or any update where the
sender does not need a reply. In streaming sessions, server‑to‑client updates
are notifications.

Client example (HTTP notification):

```json
{"jsonrpc": "2.0", "method": "audit.log", "params": {"action": "login", "user": "alice"}}
```

Do not rely on notifications for critical operations; there is no delivery
guarantee. Prefer small, self‑contained payloads; large notifications cannot be
retried safely. For observability, consider sending a follow‑up request when
acknowledgement is required.

## Design and implementation

No special DSL is required for batching; any JSON‑RPC method exposed over HTTP
can be batched. Notifications are created by clients omitting the `id`.
Server‑side, use the streaming helpers (`Send`, `SendNotification`) to emit
notifications on SSE/WebSocket.

## Best practices

Map application errors to appropriate JSON‑RPC codes so batch responses are
predictable. Document which methods are safe to call as notifications. Validate
batch sizes and entries server‑side and reject malformed entries with proper
error codes.



