---
title: "Designing Streaming Endpoints"
linkTitle: Designing
weight: 2
---

Designing streaming endpoints in Goa involves defining methods that can handle
the transmission of a sequence of results. Whether you're implementing
server-side streaming, client-side streaming, or bidirectional streaming, Goa's
DSL provides a clear and concise way to specify these behaviors.

## Using the `StreamingResult` DSL

The `StreamingResult` DSL is used within a method definition to indicate that
the method will stream a sequence of results to the client. It is mutually
exclusive with the `Result` DSL; you can only use one within a given method.

### Example

```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        // LogEntry instances are streamed to the client.
        StreamingResult(LogEntry)
    })
})
```

In this example:

- **subscribe Method:** Defines a streaming endpoint that sends `LogEntry` instances.
- **LogEntry:** The type of the results that will be streamed to the client.

When defining a streaming method, you need to specify the type of data that will
be streamed. This is done by passing the result type to the `StreamingResult`
function.

### Constraints and Considerations

- **Mutual Exclusivity:** A method can use either `Result` or `StreamingResult`, but not both.
- **Single Result Type:** All streamed results must be instances of the same type.
- **Transport Independence:** The design is agnostic of the transport protocol, allowing Goa to generate appropriate transport-specific code.

## Using the `StreamingPayload` DSL

The `StreamingPayload` DSL is used within a method definition to indicate that
the method will receive a sequence of messages from the client. When used with
HTTP transport, it works in conjunction with the regular `Payload` DSL to handle
both the initial connection parameters and the subsequent streaming data.

### Example

```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        // Client streams LogEntry instances
        StreamingPayload(LogEntry)

        // Single result returned after processing all updates
        Result(Summary)
    })
})
```

In this example:

- **subscribe Method:** Defines an endpoint that receives a stream of `LogEntry` instances.
- **LogEntry:** The type of the payload that will be streamed from the client.
- **Summary:** A single result returned after processing all updates.

When defining a client streaming method, you need to specify the type of data
that will be received in the stream. This is done by passing the payload type to
the `StreamingPayload` function.

### Constraints and Considerations

- **Single Payload Type:** All streamed payloads must be instances of the same type.
- **Transport Independence:** The design is agnostic of the transport protocol, allowing Goa to generate appropriate transport-specific code.
- **Optional Result:** Client streaming methods may return a single result or no result.
- **Transport Behavior:** In HTTP, the stream is established after the initial request is processed and the connection is upgraded to WebSocket.

### Combining with Regular Payload

For HTTP endpoints, you'll often want to include initialization parameters in the
initial request before the WebSocket upgrade. This is achieved by combining
`StreamingPayload` with a regular `Payload`:

```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        // Initial connection parameters
        Payload(func() {
            Field(1, "topic", String, "Topic of the log to subscribe to")
            Field(2, "api_key", String, "API key for authentication")
            Required("topic", "api_key")
        })

        // Stream of updates from the client
        StreamingPayload(LogEntry)

        // Final result after processing all updates
        Result(Summary)

        HTTP(func() {
            GET("/logs/{topic}/stream")
            Param("api_key")
        })
    })
})
```

This pattern is particularly useful for:
- Authentication and authorization before establishing the stream
- Providing context or scope for the streaming session
- Setting initial parameters that remain constant throughout the stream
- Validating the request before upgrading to a WebSocket connection

In the HTTP transport:
1. The initial GET request includes the `topic` and `api_key` parameters
2. After validation, the connection is upgraded to WebSocket
3. The client then begins streaming `StreamingPayload` messages
4. The server processes the stream and may return a final result

## Summary

Designing streaming endpoints in Goa is straightforward with the
`StreamingResult` and `StreamingPayload` DSLs. By defining the type of data
to be streamed within your service methods, you can leverage Goa's powerful code
generation to handle the underlying transport-specific streaming logic. This
ensures that your streaming endpoints are robust, efficient, and maintainable.
