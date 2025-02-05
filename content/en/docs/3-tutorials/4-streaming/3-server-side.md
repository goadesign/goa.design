---
title: "Server-Side Streaming"
weight: 3
---

# Implementing Server-Side Streaming

Once you've designed your server streaming endpoints using Goa's
`StreamingResult` DSL, the next step is to implement both the server-side logic
that handles the streaming of results and the client-side code that consumes the
stream. This guide walks through implementing both sides of a streaming endpoint
in Goa.

## Server-Side Implementation

When you define a server streaming method in the DSL, Goa generates specific
stream interfaces for the server to implement. These interfaces facilitate the
sending of streamed data to clients.

### Server Stream Interface

Assuming the following design:
```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/stream")
            Response(StatusOK)
        })
    })
})
```

The server stream interface includes methods for sending data and closing the stream:

```go
// Interface that the server must satisfy
type ListServerStream interface {
    // Send streams instances of "StoredBottle"
    Send(*LogEntry) error
    // Close the stream
    Close() error
}
```

### Key Methods

- **Send:** Sends an instance of the specified type (`LogEntry`) to the client.
  This method can be called multiple times to stream multiple results.
- **Close:** Closes the stream, signaling the end of the data transmission.
  After calling `Close`, any subsequent calls to `Send` will result in an error.

### Example Implementation

Here's an example of implementing a server-side streaming endpoint:

```go
// Lists streams the log entries to the client
func (s *loggerSvc) Subscribe(ctx context.Context, stream logger.SubscribeServerStream) error {
    logEntries, err := loadLogEntries()
    if err != nil {
        return fmt.Errorf("failed to load log entries: %w", err)
    }

    for _, logEntry := range logEntries {
        if err := stream.Send(logEntry); err != nil {
            return fmt.Errorf("failed to send log entry: %w", err)
        }
    }

    return stream.Close()
}
```

### Error Handling

Proper error handling ensures robust streaming behavior:

- Always check the return value of `Send` to handle potential transmission errors
- The `Send` method will return an error if the client disconnects or the context is canceled
- Ensure that errors are wrapped with appropriate context for debugging
- Consider implementing retry logic for transient failures if appropriate

## Client-Side Implementation

The client-side implementation involves receiving and processing the streamed
data. Goa generates client interfaces that make it easy to consume streams.

### Client Stream Interface

The generated client interface includes methods for receiving data and handling the stream:

```go
// Interface that the client uses to receive the stream
type ListClientStream interface {
    // Recv returns the next result in the stream
    Recv() (*LogEntry, error)
    // Close closes the stream
    Close() error
}
```

### Example Client Implementation

Here's how to consume a stream from the client side:

```go
func processLogEntryStream(client logger.Client) error {
    stream, err := client.List(context.Background())
    if err != nil {
        return fmt.Errorf("failed to start stream: %w", err)
    }
    defer stream.Close()

    for {
        logEntry, err := stream.Recv()
        if err == io.EOF {
            // Stream is finished
            return nil
        }
        if err != nil {
            return fmt.Errorf("error receiving log entry: %w", err)
        }

        // Process the received log entry
        processLogEntry(logEntry)
    }
}
```

### Key Considerations for Clients

1. **Stream Initialization:**
   - Create the stream using the generated client method
   - Check for initialization errors before proceeding
   - Use `defer stream.Close()` to ensure proper cleanup

2. **Receiving Data:**
   - Use a loop to continuously receive data until EOF or error
   - Handle `io.EOF` as the normal end-of-stream condition
   - Process other errors appropriately based on your application needs

3. **Resource Management:**
   - Always close the stream when done
   - Consider using timeouts or deadlines via context if needed
   - Implement proper error handling and logging

## Summary

Implementing streaming in Goa involves both server-side streaming of data and
client-side consumption of the stream. By following these patterns and best
practices for error handling and resource management, you can build robust
streaming endpoints that enhance the responsiveness and scalability of your
APIs.

The server implementation focuses on efficiently sending data and handling
errors, while the client implementation provides a clean interface for receiving
and processing the streamed data. Together, they create a powerful mechanism for
handling real-time or large datasets in your Goa services.