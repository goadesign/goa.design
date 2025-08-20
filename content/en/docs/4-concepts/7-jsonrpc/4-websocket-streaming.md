---
title: "WebSocket Streaming"
weight: 4
---

JSON‑RPC over WebSocket uses a single connection per service shared by all
methods. Non‑streaming methods are not supported over JSON‑RPC WebSocket.

## Patterns

- StreamingPayload only: client‑to‑server notifications.
- StreamingResult only: server‑to‑client notifications (no request `id`).
- Both StreamingPayload and StreamingResult: bidirectional streaming.

## Guidelines

- Use `GET` on the JSON‑RPC endpoint for WebSocket.
- Include `ID()` in both streaming payload and result to correlate messages at
  the type level when needed.
- Do not mix JSON‑RPC WebSocket endpoints with pure HTTP WebSocket endpoints in
  the same service.

Server handler sketch:

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

Lifecycle and errors:

- The generated server upgrades HTTP to WebSocket and then calls your `HandleStream` method.
- `Recv` decodes an incoming JSON‑RPC message and dispatches to the appropriate generated method handler.
- When a request `id` is present, `SendResponse` and `SendError` correlate replies using that id automatically.
- For malformed messages without an `id`, the server may ignore them to keep the connection alive.
- Close the stream on unrecoverable errors; transient network issues should be retried by the client with backoff.


