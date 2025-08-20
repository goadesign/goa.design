---
title: "IDs and Envelope Mapping"
weight: 2
---

This page summarizes how JSON‑RPC IDs map to your Goa design and how they behave
at runtime across transports.

## Design rules

- To map the JSON‑RPC `id` field in your Goa design, use the `ID("request_id", String)` DSL function within your payload or result type. This marks the attribute that will carry the JSON‑RPC `id` value in requests or responses, enabling correlation between requests and responses.
- In your design, the attribute specified by `ID()` must always be of type `String`. While the JSON‑RPC protocol allows `id` values to be either strings or numbers on the wire, the Goa framework will automatically accept numeric IDs from clients and normalize them to strings internally. This ensures consistent handling of IDs in your service logic.
- You may declare an ID attribute in the result type only if the payload also declares an ID. This restriction ensures that the response can be properly correlated with the original request. If the payload does not include an ID, the result type should not declare one either, as there would be no request ID to propagate or return.

## Non‑streaming (HTTP)

- If the result ID is not set in your result type, the Goa framework will automatically set the response envelope's `id` field to match the original request's `id`. This means that, unless you explicitly include an ID attribute in your result and set its value, the server will handle the correlation for you by copying the request `id` into the response envelope. Importantly, in this case, the server does not inject the envelope `id` value into your result struct—your handler code will not see the `id` field in the result object unless you have explicitly declared it.

- If you want your handler logic to access the request `id` (for example, to log it, propagate it to downstream systems, or include it in your result), you should declare an ID attribute in your payload using the `ID()` DSL function. This makes the request `id` available to your handler as part of the payload struct. However, if your handler does not need to access the request `id`, you can omit the `ID()` declaration in the payload, and the framework will still handle request-response correlation transparently.

- Declaring an ID attribute in the result type is only necessary if you want to explicitly control the value of the response envelope's `id` (for example, to echo back a modified or application-specific ID), or if you want the handler to have access to the `id` in the result struct. In most cases, for non-streaming HTTP methods, it is sufficient to declare the ID in the payload only when needed, and omit it from the result unless you have a specific use case.

## SSE (server streaming)

- `Send(ctx, event)` emits a JSON‑RPC notification to the client. In the context of SSE (Server-Sent Events), this means the message sent does not include an `id` field in the JSON‑RPC envelope. Notifications are "fire-and-forget" messages: the client receives the event, but there is no request/response correlation, and the client should not expect a reply or acknowledgment for these messages. This is useful for server-initiated updates, such as progress events, logs, or other asynchronous information.

- `SendAndClose(ctx, result)` sends a final JSON‑RPC response to the client and closes the stream. The response envelope's `id` field is determined as follows:
  - If your result type includes an ID attribute (declared with `ID()` and set in your handler), the framework uses this value as the envelope's `id`. To prevent the same ID from appearing both in the envelope and inside the result object (which would be redundant), the framework automatically clears the ID field from the result before serializing it.
  - If your result type does not include an ID attribute, or if the ID is not set, the framework automatically copies the original request's `id` into the response envelope. In this case, the result object sent to the client does not contain an ID field, but the envelope still provides the necessary correlation.
  - This mechanism ensures that the client can always match the response to the original request, either by a custom ID you provide or by the framework's automatic propagation of the request ID.

**Summary**

- **Use `Send` for server-initiated notifications:**  
  When you call `Send(ctx, event)` in an SSE (Server-Sent Events) method, the framework emits a JSON‑RPC notification to the client. In this case, the outgoing JSON‑RPC envelope does **not** include an `id` field. This is because notifications are designed to be "fire-and-forget" messages: the server sends information to the client (such as progress updates, logs, or asynchronous events), but the client does not send a response or acknowledgment, and there is no request/response correlation. This pattern is ideal for scenarios where the server needs to push updates to the client without expecting any reply.

- **Use `SendAndClose` for final responses:**  
  When you call `SendAndClose(ctx, result)`, the framework sends a final JSON‑RPC response to the client and closes the stream. The handling of the envelope's `id` field depends on your result type:

    - If your result type **includes an ID attribute** (declared with `ID()` and set in your handler), the framework uses this value as the envelope's `id`. To avoid redundancy, the framework automatically removes the ID field from the result object before serializing it, so the ID only appears in the envelope and not inside the result payload.

    - If your result type **does not include an ID attribute**, or if the ID is not set, the framework automatically copies the original request's `id` into the response envelope. In this case, the result object sent to the client does not contain an ID field, but the envelope still provides the necessary correlation.

  This mechanism ensures that the client can always match the final response to the original request, either by a custom ID you provide or by the framework's automatic propagation of the request ID. The framework manages the envelope and result fields for you, preventing duplication and ensuring correct request-response correlation in all cases.

## WebSocket (streaming)

- When the server sends a reply to a client-initiated message over a WebSocket connection, the framework automatically uses the original request's `id` value in the response envelope. This ensures that each response can be correctly correlated with the corresponding request, even when multiple messages are in flight simultaneously.

- If you want to enable bidirectional correlation—meaning both client and server can send messages that need to be matched with responses at the type level—you should declare an `ID()` attribute in both the `StreamingPayload` and `StreamingResult` types in your Goa design. This allows both sides to include and access the `id` in their respective message types, making it possible to match requests and responses programmatically within your handler logic.

- For server-initiated notifications (messages sent by the server that are not replies to a specific client request), the framework omits the `id` field from the JSON‑RPC envelope. These notifications are "fire-and-forget" messages: the client receives them but does not send a response or acknowledgment, and there is no request/response correlation. This is useful for scenarios such as server-driven updates, alerts, or broadcast messages where no reply is expected.

## When to use `ID()`

- **Non‑streaming methods (HTTP/SSE):**  
  Use `ID()` in the payload type if you want your handler to access the request `id` (for example, for logging, tracing, or propagating to downstream systems). Declaring `ID()` in the payload is optional—if omitted, the framework will still handle request-response correlation automatically, but your handler will not see the `id` in the payload struct.  
  Use `ID()` in the result type only if you want to explicitly control the value of the response envelope's `id` (for example, to echo back a modified or application-specific ID), or if you want the handler to have access to the `id` in the result struct. In most cases, for non-streaming methods, declaring `ID()` in the payload is sufficient, and you can omit it from the result unless you have a specific need.

- **WebSocket bidirectional streaming:**  
  For full bidirectional correlation—where both client and server can send messages that need to be matched with responses—declare `ID()` in both the `StreamingPayload` and `StreamingResult` types. This allows both sides to include and access the `id` in their respective message types, enabling programmatic correlation of requests and responses within your handler logic.

- **Notifications (fire-and-forget messages):**  
  Do **not** declare `ID()` in the payload or result types for notifications. Notifications are messages that do not expect a response and are not correlated with a request, so the `id` field is omitted from the JSON‑RPC envelope. This applies to both client-initiated notifications (HTTP) and server-initiated notifications (SSE/WebSocket).

### DSL examples

Correlate request ids in handlers (non‑streaming):

```go
Method("track", func() {
    Payload(func() {
        ID("request_id", String)
        Attribute("action", String)
        Required("request_id", "action")
    })
    Result(func() { /* ... */ })
    JSONRPC(func() {})
})
```

Bidirectional correlation over WebSocket:

```go
Method("echo", func() {
    StreamingPayload(func() {
        ID("msg_id", String)
        Attribute("text", String)
        Required("msg_id", "text")
    })
    StreamingResult(func() {
        ID("msg_id", String)
        Attribute("echo", String)
        Required("msg_id", "echo")
    })
    JSONRPC(func() {})
})
```


