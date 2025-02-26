---
title: "Streaming"
linkTitle: "Streaming"
weight: 3
description: "Learn how to implement gRPC streaming services in Goa, including server-side, client-side, and bidirectional streaming patterns"
---

Goa provides comprehensive support for gRPC streaming, enabling you to build
services that can handle continuous data transmission in real-time. This guide
covers the different streaming patterns available in gRPC and how to implement
them using Goa.

## Streaming Patterns

gRPC supports three streaming patterns:

### Server-Side Streaming

In server-side streaming, the client sends a single request and receives a
stream of responses. This pattern is useful for scenarios like:
- Real-time data feeds
- Progress updates
- System monitoring

Here's how to define a server streaming method:

```go
var _ = Service("monitor", func() {
    Method("watch", func() {
        Description("Stream system metrics")
        
        Payload(func() {
            Field(1, "interval", Int, "Sampling interval in seconds")
            Required("interval")
        })
        
        StreamingResult(func() {
            Field(1, "cpu", Float32, "CPU usage percentage")
            Field(2, "memory", Float32, "Memory usage percentage")
            Required("cpu", "memory")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

### Client-Side Streaming

Client-side streaming allows the client to send a stream of requests while
receiving a single response. This is ideal for:
- File uploads
- Batch processing
- Aggregating data

Example definition:

```go
var _ = Service("analytics", func() {
    Method("process", func() {
        Description("Process stream of analytics events")
        
        StreamingPayload(func() {
            Field(1, "event_type", String, "Type of event")
            Field(2, "timestamp", String, "Event timestamp")
            Field(3, "data", Bytes, "Event data")
            Required("event_type", "timestamp", "data")
        })
        
        Result(func() {
            Field(1, "processed_count", Int64, "Number of events processed")
            Required("processed_count")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

### Bidirectional Streaming

Bidirectional streaming enables both the client and server to send streams of
messages simultaneously. This pattern is perfect for:
- Real-time chat applications
- Gaming
- Interactive data processing

Example definition:

```go
var _ = Service("chat", func() {
    Method("connect", func() {
        Description("Establish bidirectional chat connection")
        
        StreamingPayload(func() {
            Field(1, "message", String, "Chat message")
            Field(2, "user_id", String, "User identifier")
            Required("message", "user_id")
        })
        
        StreamingResult(func() {
            Field(1, "message", String, "Chat message")
            Field(2, "user_id", String, "User identifier")
            Field(3, "timestamp", String, "Message timestamp")
            Required("message", "user_id", "timestamp")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

## Implementation

The implementation of gRPC streaming in Goa involves both server-side and
client-side code. Goa generates the necessary interfaces and types based on your
service definition, and you'll need to implement these interfaces to handle the
streaming logic.

### Server Implementation

On the server side, you'll need to implement methods that handle the streaming
communication. Each streaming pattern requires a different approach to handle
the data flow. Let's look at each pattern in detail:

#### Server-Side Streaming Example: System Monitoring

In this example, we'll implement a service that streams system metrics (CPU and
memory usage) to clients at regular intervals. The server maintains an open
connection and continuously sends data to the client.

The `monitor.WatchServerStream` interface provided by Goa gives us two main capabilities:
1. `Send(*WatchResult) error`: Sends a single result to the client
2. Access to the context through `Context() context.Context`

Here's how we use these capabilities:

```go
// Server-side streaming
func (s *monitorService) Watch(ctx context.Context, p *monitor.WatchPayload, stream monitor.WatchServerStream) error {
    // Create a ticker that fires at the interval specified by the client
    ticker := time.NewTicker(time.Duration(p.Interval) * time.Second)
    // Ensure the ticker is cleaned up when we're done
    defer ticker.Stop()

    // Infinite loop to keep sending metrics
    for {
        select {
        // Check if the client has cancelled the request using the context
        case <-ctx.Done():
            return ctx.Err()
        // Wait for the next tick
        case <-ticker.C:
            // Get the current system metrics (implementation not shown)
            metrics := getSystemMetrics()
            // Use the stream's Send method to send metrics to the client
            // Each call to Send transmits one message in the stream
            if err := stream.Send(&monitor.WatchResult{
                CPU:    metrics.CPU,
                Memory: metrics.Memory,
            }); err != nil {
                return err
            }
        }
    }
}
```

#### Client-Side Streaming Example: Analytics Processing

This example shows how to handle a stream of events from the client. The
`analytics.ProcessServerStream` interface provides three key methods:
1. `Recv() (*ProcessPayload, error)`: Receives the next message from the client
2. `SendAndClose(*ProcessResult) error`: Sends a final response and closes the stream
3. Access to the context through `Context() context.Context`

Here's how we use these capabilities:

```go
// Client-side streaming
func (s *analyticsService) Process(ctx context.Context, stream analytics.ProcessServerStream) error {
    // Keep track of how many events we've processed
    var count int64
    
    // Continue reading events from the stream until it's closed
    for {
        // Use Recv() to get the next message in the stream
        // Recv blocks until a message is received or the stream is closed
        event, err := stream.Recv()
        if err == io.EOF {
            // Client has finished sending data
            // Use SendAndClose to send the final result and close the stream
            // This is specific to client-streaming - we can only send one response
            return stream.SendAndClose(&analytics.ProcessResult{
                ProcessedCount: count,
            })
        }
        if err != nil {
            return err
        }
        
        // Process the received event (implementation not shown)
        if err := processEvent(event); err != nil {
            return err
        }
        count++
    }
}
```

#### Bidirectional Streaming Example: Chat Service

This example demonstrates a chat service where both sides can send messages at
any time. The `chat.ConnectServerStream` interface combines capabilities of both
streaming types:
1. `Recv() (*ConnectPayload, error)`: Receives messages from the client
2. `Send(*ConnectResult) error`: Sends messages to the client
3. Access to the context through `Context() context.Context`

Here's how we use these capabilities:

```go
// Bidirectional streaming
func (s *chatService) Connect(ctx context.Context, stream chat.ConnectServerStream) error {
    // Continue processing messages until the client disconnects
    for {
        // Use Recv() to wait for and receive the next client message
        // This blocks until a message arrives or the client closes the stream
        msg, err := stream.Recv()
        if err == io.EOF {
            // Client has closed their send stream
            return nil
        }
        if err != nil {
            return err
        }

        // Create a response with the current timestamp
        response := &chat.ConnectResult{
            Message:   msg.Message,
            UserID:    msg.UserID,
            Timestamp: time.Now().Format(time.RFC3339),
        }
        
        // Use Send() to send a message back to the client
        // In bidirectional streaming, we can send and receive in any order
        if err := stream.Send(response); err != nil {
            return err
        }
    }
}
```

### Client Implementation

The client side interfaces mirror the server side but from the client's perspective. Let's look at each type:

#### Server-Side Streaming Client: Monitoring Metrics

The client receives a `monitor.WatchClient` interface that provides:
1. `Recv() (*WatchResult, error)`: Receives the next metrics update
2. `Close() error`: Closes the stream

```go
// Server-side streaming client
func watchMetrics(ctx context.Context, client *monitor.Client) error {
    // Start the streaming connection with initial parameters
    // This returns a stream interface for receiving metrics
    stream, err := client.Watch(ctx, &monitor.WatchPayload{
        Interval: 5, // Request metrics every 5 seconds
    })
    if err != nil {
        return err
    }

    // Continue receiving metrics until the stream ends
    for {
        // Use Recv() to get the next metrics update
        // This blocks until new metrics arrive or the server closes the stream
        metrics, err := stream.Recv()
        if err == io.EOF {
            // Server has closed the stream
            break
        }
        if err != nil {
            return err
        }
        // Process the received metrics (in this case, just log them)
        log.Printf("CPU: %.2f%%, Memory: %.2f%%", metrics.CPU, metrics.Memory)
    }
    return nil
}
```

#### Client-Side Streaming Client: Uploading Events

The client receives a `analytics.ProcessClient` interface that provides:
1. `Send(*ProcessPayload) error`: Sends an event to the server
2. `CloseAndRecv() (*ProcessResult, error)`: Closes the send stream and waits for the final response

```go
// Client-side streaming client
func uploadEvents(ctx context.Context, client *analytics.Client, events []*analytics.Event) error {
    // Initialize the streaming connection
    // This returns a stream interface for sending events
    stream, err := client.Process(ctx)
    if err != nil {
        return err
    }

    // Send each event to the server using the stream's Send method
    for _, event := range events {
        if err := stream.Send(event); err != nil {
            return err
        }
    }

    // Use CloseAndRecv to close our send stream and get the server's response
    // This blocks until the server processes all events and sends the result
    result, err := stream.CloseAndRecv()
    if err != nil {
        return err
    }
    log.Printf("Processed %d events", result.ProcessedCount)
    return nil
}
```

#### Bidirectional Streaming Client: Chat Client

The client receives a `chat.ConnectClient` interface that combines both capabilities:
1. `Send(*ConnectPayload) error`: Sends messages to the server
2. `Recv() (*ConnectResult, error)`: Receives messages from the server
3. `CloseSend() error`: Closes the send stream

```go
// Bidirectional streaming client
func startChat(ctx context.Context, client *chat.Client, userID string) error {
    // Initialize the bidirectional stream
    // This returns a stream interface for both sending and receiving
    stream, err := client.Connect(ctx)
    if err != nil {
        return err
    }

    // Start a separate goroutine to send messages
    // This demonstrates how we can send and receive concurrently
    go func() {
        for {
            // Use Send to transmit messages to the server
            if err := stream.Send(&chat.ConnectPayload{
                Message: "Hello",
                UserID:  userID,
            }); err != nil {
                log.Printf("Send error: %v", err)
                return
            }
            time.Sleep(time.Second)
        }
    }()

    // Use the main goroutine to receive messages
    for {
        // Use Recv to get the next message from the server
        msg, err := stream.Recv()
        if err == io.EOF {
            // Server has closed the stream
            break
        }
        if err != nil {
            return err
        }
        // Process the received message
        log.Printf("Received: %s from %s at %s",
            msg.Message, msg.UserID, msg.Timestamp)
    }
    return nil
}
```

## Error Handling

When implementing streaming endpoints, proper error handling is crucial:

1. **Context Cancellation**: Always check for context cancellation to handle client disconnections gracefully.
2. **EOF Handling**: Properly handle io.EOF to detect when the stream ends.
3. **Resource Cleanup**: Use defer statements to ensure resources are properly cleaned up.
4. **Partial Failures**: Consider implementing retry logic for transient failures.

## Best Practices

1. **Message Size**: Keep message sizes reasonable to avoid memory pressure.
2. **Flow Control**: Implement proper flow control to prevent overwhelming either side.
3. **Timeouts**: Set appropriate timeouts for streaming operations.
4. **Monitoring**: Add metrics to track streaming performance and errors.
5. **Documentation**: Clearly document the streaming behavior and error conditions.