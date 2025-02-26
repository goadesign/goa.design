---
title: "Implementing Client-Side Streaming"
linkTitle: Client-Side
weight: 4
---

Once you've designed your client streaming endpoints using Goa's
`StreamingPayload` DSL, the next step is to implement both the client-side logic
that handles the streaming of data and the server-side code that processes the
stream. This guide walks through implementing both sides of a streaming endpoint
in Goa.

## Client-Side Implementation

When you define a client streaming method in the DSL, Goa generates specific
stream interfaces for the client to implement. These interfaces facilitate the
sending of streamed data to the server.

### Client Stream Interface

Assuming the following design:

```go
var _ = Service("logger", func() {
    Method("upload", func() {
        StreamingPayload(LogEntry)
        HTTP(func() {
            GET("/logs/upload")
            Response(StatusOK)
        })
        GRPC(func() {})
    })
})
```

The client stream interface includes methods for sending data and closing the stream:

```go
// Interface that the client must satisfy
type UploadClientStream interface {
    // Send streams instances of "LogEntry"
    Send(*LogEntry) error
    // Close closes the stream
    Close() error
}
```

### Key Methods

- **Send:** Sends an instance of the specified type (`LogEntry`) to the server.
  This method can be called multiple times to stream multiple payloads.
- **Close:** Closes the stream, `Send` will return an error after calling `Close`.

### Example Implementation

Here's an example of implementing a client-side streaming endpoint:

```go
func uploadLogEntries(client *logger.Client, logEntries []*LogEntry) error {
    stream, err := client.Upload(context.Background())
    if err != nil {
        return fmt.Errorf("failed to start upload stream: %w", err)
    }

    for _, logEntry := range logEntries {
        if err := stream.Send(logEntry); err != nil {
            return fmt.Errorf("failed to send log entry: %w", err)
        }
    }

    if err := stream.Close(); err != nil {
        return fmt.Errorf("failed to close stream: %w", err)
    }

    return nil
}
```

### Error Handling

Proper error handling ensures robust streaming behavior:

- Always check the return value of `Send` to handle potential transmission errors
- The `Send` method will return an error if the server disconnects or the context is canceled
- Ensure that errors are wrapped with appropriate context for debugging
- Consider implementing retry logic for transient failures if appropriate

## Server-Side Implementation

The server-side implementation involves receiving and processing the streamed
data. Goa generates server interfaces that make it easy to handle incoming
streams.

### Server Stream Interface

The generated server interface includes methods for receiving data and handling the stream:

```go
// Interface that the server uses to receive the stream
type UploadServerStream interface {
    // Recv returns the next payload in the stream
    Recv() (*LogEntry, error)
    // Close closes the stream
    Close() error
}
```

### Example Server Implementation

Here's how to process a stream on the server side:

```go
func (s *loggerSvc) Upload(ctx context.Context, stream logger.UploadServerStream) error {
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
        if err := s.processLogEntry(logEntry); err != nil {
            return fmt.Errorf("error processing log entry: %w", err)
        }
    }
}
```

### Key Considerations for Servers

1. **Stream Processing:**
   - Use a loop to continuously receive data until EOF or error
   - Handle `io.EOF` as the normal end-of-stream condition
   - Process incoming data as it arrives

2. **Resource Management:**
   - Consider implementing rate limiting for incoming data
   - Monitor memory usage when processing large streams
   - Implement proper error handling and logging

3. **Error Handling:**
   - Return appropriate errors for validation failures
   - Handle context cancellation appropriately
   - Consider implementing partial success responses

## Summary

Implementing client-side streaming in Goa involves both client-side sending of
data and server-side processing of the stream. By following these patterns and
best practices for error handling and resource management, you can build robust
streaming endpoints that enhance the efficiency of your APIs.

The client implementation focuses on efficiently sending data and handling
errors, while the server implementation provides a clean interface for receiving
and processing the streamed data. Together, they create a powerful mechanism for
handling uploads or real-time data ingestion in your Goa services.