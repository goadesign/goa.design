---
title: "Bidirectional Streaming"
weight: 5
---

# Implementing Bidirectional Streaming

Once you've designed your bidirectional streaming endpoints using Goa's
`StreamingPayload` and `StreamingResult` DSL, the next step is to implement both
sides of the streaming connection. This guide walks through implementing both
client and server components of a bidirectional streaming endpoint in Goa.

## Design

Assuming the following design:

```go
var _ = Service("logger", func() {
    Method("monitor", func() {
        StreamingPayload(LogFilter)
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/monitor")
            Response(StatusOK)
        })
        GRPC(func() {})
    })
})
```

## Client-Side Implementation

When you define a bidirectional streaming method, Goa generates specific stream
interfaces for the client to implement. These interfaces facilitate both sending
and receiving streamed data.

### Client Stream Interface

The client stream interface includes methods for both sending and receiving data:

```go
// Interface that the client must satisfy
type MonitorClientStream interface {
    // Send streams instances of "LogFilter"
    Send(*LogFilter) error
    // Recv returns the next result in the stream
    Recv() (*LogEntry, error)
    // Close closes the stream
    Close() error
}
```

### Key Methods

- **Send:** Sends filter updates to the server. Can be called multiple times to update filtering criteria.
- **Recv:** Receives log entries from the server that match the current filters.
- **Close:** Closes the bidirectional stream. After calling Close, both Send and Recv will return errors.

### Example Implementation

Here's an example of implementing a client-side bidirectional streaming endpoint:

```go
func monitorLogs(client logger.Client, initialFilter *LogFilter) error {
    stream, err := client.Monitor(context.Background())
    if err != nil {
        return fmt.Errorf("failed to start monitor stream: %w", err)
    }
    defer stream.Close()

    // Start a goroutine to handle receiving logs
    go func() {
        for {
            logEntry, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("error receiving log entry: %v", err)
                return
            }
            processLogEntry(logEntry)
        }
    }()

    // Send initial filter
    if err := stream.Send(initialFilter); err != nil {
        return fmt.Errorf("failed to send initial filter: %w", err)
    }

    // Update filters based on some condition
    for {
        newFilter := waitForFilterUpdate()
        if err := stream.Send(newFilter); err != nil {
            return fmt.Errorf("failed to update filter: %w", err)
        }
    }
}
```

## Server-Side Implementation

The server-side implementation handles both incoming filter updates and streams
matching log entries back to the client.

### Server Stream Interface

```go
// Interface that the server must satisfy
type MonitorServerStream interface {
    // Send streams instances of "LogEntry"
    Send(*LogEntry) error
    // Recv returns the next filter in the stream
    Recv() (*LogFilter, error)
    // Close closes the stream
    Close() error
}
```

### Example Server Implementation

Here's how to implement bidirectional streaming on the server side:

```go
func (s *loggerSvc) Monitor(ctx context.Context, stream logger.MonitorServerStream) error {
    // Start a goroutine to handle filter updates
    filterCh := make(chan *LogFilter, 1)
    go func() {
        defer close(filterCh)
        for {
            filter, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("error receiving filter update: %v", err)
                return
            }
            filterCh <- filter
        }
    }()

    // Main loop for processing logs and applying filters
    var currentFilter *LogFilter
    for {
        select {
        case filter, ok := <-filterCh:
            if !ok {
                // Channel closed, stop processing
                return nil
            }
            currentFilter = filter
        case <-ctx.Done():
            // Context cancelled, stop processing
            return ctx.Err()
        default:
            if currentFilter != nil {
                logEntry := s.getNextMatchingLog(currentFilter)
                if err := stream.Send(logEntry); err != nil {
                    return fmt.Errorf("error sending log entry: %w", err)
                }
            }
        }
    }
}
```

### Key Considerations

1. **Concurrent Operations:**
   - Use goroutines to handle sending and receiving independently
   - Implement proper synchronization for shared state
   - Handle graceful shutdown of both directions

2. **Resource Management:**
   - Monitor memory usage for both incoming and outgoing streams
   - Implement rate limiting in both directions
   - Clean up resources when either side closes the stream

3. **Error Handling:**
   - Handle errors from both Send and Recv operations
   - Propagate errors appropriately to both sides
   - Consider implementing reconnection logic for transient failures

4. **Context Management:**
   - Honor context cancellation for both directions
   - Implement appropriate timeouts
   - Clean up resources when context is cancelled

## Summary

Implementing bidirectional streaming in Goa requires careful coordination of
both sending and receiving operations on both client and server sides. By
following these patterns and best practices for concurrent operations, error
handling, and resource management, you can build robust bidirectional streaming
endpoints that enable real-time, interactive communication between client and
server.

The implementation allows for dynamic updates to streaming behavior through
client-sent filters while maintaining a continuous stream of server responses,
creating a flexible and powerful mechanism for real-time data exchange in your
Goa services.