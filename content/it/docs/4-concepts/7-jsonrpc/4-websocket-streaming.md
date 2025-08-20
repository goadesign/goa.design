---
title: "WebSocket Streaming"
weight: 4
---

JSON‑RPC over WebSocket uses a single connection per service shared by all
methods. Non‑streaming methods are not supported over JSON‑RPC WebSocket.

Batching is not supported over WebSocket. Send one JSON‑RPC message per frame.

## Patterns

- **StreamingPayload only:**  
  In this pattern, the method defines only a `StreamingPayload` and does not
  specify a `StreamingResult`. This enables the client to send a continuous
  stream of messages to the server, typically as notifications. Since there is
  no result stream, the server does not send any responses back to the client
  for these messages. This is useful for scenarios where the client needs to
  push data or events to the server without expecting a reply, such as telemetry
  uploads or fire-and-forget commands.

- **StreamingResult only:**  
  Here, the method defines only a `StreamingResult` and does not specify a
  `StreamingPayload`. The client initiates the stream (often with an empty or
  minimal request), and the server sends a stream of messages back to the
  client. These are server-to-client notifications, and typically, no request
  `id` is used because the client is not expecting a direct response to a
  specific request. This pattern is suitable for server push updates, event
  feeds, or real-time data streams where the client passively receives
  information.

- **Both StreamingPayload and StreamingResult:**  
  When both `StreamingPayload` and `StreamingResult` are defined, the method
  supports bidirectional streaming. This allows both the client and the server
  to send messages to each other independently over the same WebSocket
  connection. Each side can send and receive messages as needed, enabling
  interactive or conversational protocols, collaborative editing, or any use
  case requiring real-time two-way communication. In this mode, messages may
  include an `id` field to correlate requests and responses if necessary.

## Guidelines

- **Use `GET` on the JSON‑RPC endpoint for WebSocket connections:**  
  When establishing a WebSocket connection for JSON‑RPC, always use the HTTP
  `GET` method on the designated JSON‑RPC endpoint (e.g., `GET /rpc`). This is
  in accordance with the WebSocket protocol, which upgrades an HTTP GET request
  to a WebSocket connection. Avoid using `POST` or other HTTP methods for
  WebSocket upgrades.

- **Include `ID()` in both streaming payload and result types to correlate messages:**  
  To enable reliable message correlation between client and server, define an
  `ID()` field or method in both the streaming payload and streaming result
  types. This allows each message sent in either direction to carry a unique
  identifier, making it possible to match requests with their corresponding
  responses or notifications at the type level. This is especially important in
  bidirectional or multiplexed streaming scenarios, where multiple messages may
  be in flight simultaneously.

- **Do not mix JSON‑RPC WebSocket endpoints with pure HTTP WebSocket endpoints in the same service:**  
  Keep JSON‑RPC WebSocket endpoints separate from any endpoints that implement
  custom or non-JSON‑RPC WebSocket protocols. Mixing these in the same service
  can lead to confusion, protocol mismatches, and maintenance challenges. Each
  WebSocket endpoint should have a clearly defined protocol—either JSON‑RPC or a
  custom protocol, but not both.
 
## HandleStream

`HandleStream` is called once per WebSocket connection. The server upgrades the
HTTP GET, builds a service‑level `Stream`, and invokes `HandleStream(ctx,
stream)`.

Inside `HandleStream`, defer `stream.Close()` and loop on `stream.Recv(ctx)`.
Each call reads one JSON‑RPC message and dispatches it to the matching generated
method handler by `method`. The loop ends when the connection closes or an
unrecoverable error occurs.

When a streaming method runs, your handler receives a method‑specific server
stream (for example, `EchoServerStream`). Use it to talk back to the client:
- `SendNotification(ctx, result)`: server‑initiated message (no `id`).
- `SendResponse(ctx, result)`: success response tied to the original request `id`.
- `SendError(ctx, err)`: error response tied to the original request `id`.

ID correlation is automatic; you never pass the request `id` to `SendResponse`
or `SendError`. Add `ID()` to your streaming payload and result types only if
you want the `id` available in your structs.

Invalid messages with an `id` produce a JSON‑RPC error response. Malformed
notifications (no `id`) may be ignored to keep the connection alive. On protocol
or I/O errors, return from `HandleStream` and let clients reconnect with
backoff.
  
**Example server handler sketch:**  
The following is a conceptual example of how a server might handle a JSON‑RPC
WebSocket stream.

```go
func (s *service) HandleStream(ctx context.Context, stream svc.Stream) error {
    defer stream.Close()
    for {
        if _, err := stream.Recv(ctx); err != nil { return err }
        // Incoming messages are dispatched to generated method handlers.
    }
}
```

Replying to a client request inside a method:

```go
func (s *service) Echo(ctx context.Context, p *svc.EchoPayload, stream svc.EchoServerStream) error {
    return stream.SendResponse(ctx, &svc.EchoResult{ /* echo fields */ })
}
```


