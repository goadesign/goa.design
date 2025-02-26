---
title: "WebSocket Integration"
linkTitle: "WebSocket"
weight: 3
description: "Learn how to add WebSocket support to your services, including connection handling, message formats, error handling, and client implementations."
menu:
  main:
    parent: "HTTP Advanced Topics"
    weight: 3
---

WebSocket integration in Goa enables your services to handle real-time, bidirectional
communications. This guide explains how to implement WebSocket connections in your
services, progressing from basic concepts to advanced implementations.

## Core Concepts

WebSocket is a protocol that provides full-duplex communication over a single TCP
connection. Goa implements WebSocket support through its streaming DSL, which
offers three key patterns:

1. **Client-to-Server Streaming** (`StreamingPayload`): Client sends a stream of messages to the server
2. **Server-to-Client Streaming** (`StreamingResult`): Server sends a stream of messages to the client
3. **Bidirectional Streaming**: Using both DSLs enables two-way communication

### Protocol Requirements

WebSocket connections always initiate with a GET request for the protocol upgrade. In Goa, this means:

```go
// All WebSocket endpoints must use GET, regardless of their logical operation
HTTP(func() {
    GET("/stream")    // Required for WebSocket upgrade
    Param("token")    // Additional parameters as needed
})
```

## Basic Streaming Patterns

Let's explore each streaming pattern using examples from a chat service implementation.

### Client-to-Server Streaming

In this example, we implement a listener that receives messages from clients:

```go
Method("listener", func() {
    // Message format for the stream
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    
    HTTP(func() {
        GET("/listen")              // WebSocket endpoint
    })
})
```

This design:
- Accepts an ongoing stream of messages from clients
- Processes each message as it arrives
- Uses a simple message format with a required content field

### Server-to-Client Streaming

In this example, we create a subscription service that sends updates to clients:

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "Update content")
        Field(2, "action", String, "Action type")
        Field(3, "timestamp", String, "When it happened")
        Required("message", "action", "timestamp")
    })
    
    HTTP(func() {
        GET("/subscribe")
    })
})
```

This pattern:
- Establishes a one-way stream to clients
- Sends structured updates with metadata
- Maintains the connection for continuous updates

### Bidirectional Communication

In this example, we create an echo service demonstrating two-way communication:

```go
Method("echo", func() {
    // Client messages
    StreamingPayload(func() {
        Field(1, "message", String, "Message to echo")
        Required("message")
    })
    
    // Server responses
    StreamingResult(func() {
        Field(1, "message", String, "Echoed message")
        Required("message")
    })
    
    HTTP(func() {
        GET("/echo")
    })
})
```

This design:
- Enables simultaneous sending and receiving of messages
- Uses matching message formats for simplicity
- Demonstrates basic request-response pattern over WebSocket

## Implementation Guide

Implementing WebSocket services in Goa requires careful consideration of both server and client-side patterns. While the basic concepts are straightforward, proper implementation needs to account for connection management, concurrent operations, and error handling. Let's explore these aspects using our chat service as an example.

### Server-Side Implementation

The server side of a WebSocket service must manage the full lifecycle of connections while handling messages efficiently. At its core, a WebSocket server needs to maintain active connections, process messages concurrently, and ensure proper cleanup when connections end.

Connection management forms the foundation of any WebSocket server. When a client connects, the server must validate the connection, set up necessary state, and prepare for message handling. Here's how this typically looks in practice:

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    // Initialize connection state
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    // Start message processing
    return s.processMessages(ctx, stream)
}
```

Message processing requires careful handling of concurrency. The server must be able to receive messages while simultaneously sending responses. This is typically achieved using goroutines to separate these concerns:

```go
func (s *service) processMessages(ctx context.Context, stream Stream) error {
    // Handle incoming messages in a separate goroutine
    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    // Wait for either context cancellation or processing error
    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

Error handling is particularly important in WebSocket implementations because connections can fail in various ways. Network issues, client disconnections, and application errors all need to be handled gracefully to maintain service stability.

### Client-Side Implementation

Client implementations face their own set of challenges. A robust WebSocket client needs to maintain connectivity, handle message flow in both directions, and provide a good user experience even when issues occur.

Connection management on the client side involves establishing the initial connection and handling reconnection when failures occur. Here's an example of a client that implements automatic reconnection:

```go
func connectWithRetry(ctx context.Context) (*WSClient, error) {
    for {
        client, err := connect(ctx)
        if err == nil {
            return client, nil
        }

        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-time.After(backoffDuration):
            // Continue retry loop
        }
    }
}
```

Message handling in clients often needs to coordinate between user input and server messages. This typically involves managing multiple goroutines while ensuring proper synchronization:

```go
func (c *Client) handleMessages(ctx context.Context) {
    // Process incoming messages
    go c.receiveMessages(ctx)

    // Handle user input
    c.processUserInput(ctx)
}
```

### Common Implementation Challenges

Several challenges commonly arise when implementing WebSocket services. Understanding these challenges and their solutions helps create more robust implementations.

Message ordering can become an issue in real-time applications. While WebSocket provides message ordering guarantees within a single connection, application-level ordering might still be necessary. For example, in a chat application, messages should be displayed in the order they were sent:

```go
type Message struct {
    Content   string
    Sequence  int64
    Timestamp time.Time
}
```

State management becomes complex when dealing with multiple connections or stateful protocols. Services need to track not just connection state but also application state. For example, in a chat room service:

```go
type ChatRoom struct {
    ID         string
    Members    map[string]*Connection
    Messages   []Message
    LastActive time.Time
    mu         sync.RWMutex
}
```

Resource management is crucial for long-lived connections. Memory leaks can occur if connections aren't properly tracked and cleaned up. A connection manager helps handle this:

```go
type ConnectionManager struct {
    active map[string]*Connection
    mu     sync.RWMutex
}

func (cm *ConnectionManager) cleanup() {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    
    for id, conn := range cm.active {
        if !conn.isAlive() {
            conn.close()
            delete(cm.active, id)
        }
    }
}
```

## Advanced Features

WebSocket services often require advanced features to handle complex real-world requirements. Let's explore some powerful capabilities that Goa provides for building sophisticated WebSocket applications.

### Message Views and Projections

Message views allow you to present the same data in different formats depending on the client's needs. This is particularly useful in scenarios where different clients need different levels of detail, or when bandwidth optimization is important.

For example, in a real-time analytics service, some clients might need detailed data while others only need summaries:

```go
Method("analytics", func() {
    StreamingResult(func() {
        // Define all possible fields
        Field(1, "timestamp", String, "When the event occurred")
        Field(2, "metric", String, "Name of the metric")
        Field(3, "value", Float64, "Current value")
        Field(4, "change", Float64, "Change from previous value")
        Field(5, "metadata", MapOf(String, String), "Additional context")
        
        // Summary view for dashboard displays
        View("summary", func() {
            Attribute("metric")
            Attribute("value")
        })
        
        // Detailed view for analysis tools
        View("detailed", func() {
            Attribute("timestamp")
            Attribute("metric")
            Attribute("value")
            Attribute("change")
        })
        
        // Complete view for data processing
        View("full", func() {
            Attribute("timestamp")
            Attribute("metric")
            Attribute("value")
            Attribute("change")
            Attribute("metadata")
        })
    })
})
```

This design enables:
1. Bandwidth optimization by sending only needed fields
2. Client-specific data views without server-side duplication
3. Flexible data representation for different use cases

### Advanced Connection Management

Connection management in production systems requires sophisticated handling of connection lifecycles, health monitoring, and resource optimization. Here's a comprehensive approach:

```go
type ConnectionManager struct {
    // Core connection tracking
    connections map[string]*ManagedConnection
    mu         sync.RWMutex

    // Configuration
    config ConnectionConfig

    // Monitoring and metrics
    metrics    *Metrics
    healthLog  *HealthLogger
}

type ManagedConnection struct {
    ID        string
    Stream    Stream
    LastPing  time.Time
    State     ConnectionState
    Stats     ConnectionStats
}

func (cm *ConnectionManager) manageConnection(ctx context.Context, stream Stream) error {
    conn := cm.setupConnection(stream)
    defer cm.cleanupConnection(conn)

    // Set up health monitoring
    pingTicker := time.NewTicker(cm.config.PingInterval)
    healthTicker := time.NewTicker(cm.config.HealthCheckInterval)
    defer func() {
        pingTicker.Stop()
        healthTicker.Stop()
    }()

    // Monitor connection health
    go cm.monitorHealth(ctx, conn, healthTicker.C)

    // Handle ping/pong
    go cm.handleHeartbeat(ctx, conn, pingTicker.C)

    // Process messages
    return cm.processMessages(ctx, conn)
}
```

The health monitoring system ensures connections remain viable:

```go
func (cm *ConnectionManager) monitorHealth(ctx context.Context, conn *ManagedConnection, checkTicker <-chan time.Time) {
    for {
        select {
        case <-ctx.Done():
            return
        case <-checkTicker:
            if !cm.isConnectionHealthy(conn) {
                cm.handleUnhealthyConnection(conn)
                return
            }
        }
    }
}

func (cm *ConnectionManager) isConnectionHealthy(conn *ManagedConnection) bool {
    // Check last ping time
    if time.Since(conn.LastPing) > cm.config.MaxPingInterval {
        return false
    }

    // Check error rate
    if conn.Stats.ErrorRate() > cm.config.MaxErrorRate {
        return false
    }

    // Check resource usage
    if conn.Stats.ResourceUsage() > cm.config.MaxResourceUsage {
        return false
    }

    return true
}
```

### Protocol Extensions

Goa's WebSocket implementation can be extended to support advanced protocol features. Here's an example of implementing a custom subprotocol for message prioritization:

```go
type PriorityMessage struct {
    Priority MessagePriority
    Payload  interface{}
}

type MessagePriority int

const (
    LowPriority MessagePriority = iota
    NormalPriority
    HighPriority
    UrgentPriority
)

func (s *service) handlePriorityMessages(ctx context.Context, stream Stream) error {
    // Set up priority queues
    queues := map[MessagePriority]chan *Message{
        UrgentPriority:  make(chan *Message, 100),
        HighPriority:    make(chan *Message, 100),
        NormalPriority:  make(chan *Message, 100),
        LowPriority:     make(chan *Message, 100),
    }

    // Handle incoming messages
    go func() {
        for {
            msg, err := stream.Recv()
            if err != nil {
                return
            }

            // Route message to appropriate queue
            priority := determinePriority(msg)
            queues[priority] <- msg
        }
    }()

    // Process queues with priority
    return s.processPriorityQueues(ctx, queues, stream)
}

func (s *service) processPriorityQueues(ctx context.Context, queues map[MessagePriority]chan *Message, stream Stream) error {
    for {
        // Check queues in priority order
        for priority := UrgentPriority; priority >= LowPriority; priority-- {
            select {
            case msg := <-queues[priority]:
                if err := s.processMessage(msg, stream); err != nil {
                    return err
                }
            default:
                continue
            }
        }

        // Check context after processing all queues
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            continue
        }
    }
}
```

This implementation provides:
1. Message prioritization based on content or metadata
2. Guaranteed processing order within priority levels
3. Fair handling of lower-priority messages
4. Resource management through buffered channels

## Best Practices

When building WebSocket services, following established best practices helps create reliable, maintainable, and efficient implementations. Here are key practices to consider in your implementations.

### Error Handling

WebSocket connections can fail in many ways, from network issues to application errors. A robust error handling strategy should distinguish between different types of failures and handle each appropriately. Some errors are temporary and can be recovered from, while others require terminating the connection.

Network errors, for instance, often resolve themselves and warrant retry attempts. Application errors like rate limiting might need backoff strategies. Unrecoverable errors, such as authentication failures, require immediate connection termination. Here's how to implement this kind of sophisticated error handling:

```go
func handleStreamError(err error) error {
    switch {
    case isRecoverable(err):
        // Temporary network issues can be retried
        return retryWithBackoff(err)
        
    case isResourceExhausted(err):
        // Rate limiting or resource constraints need backoff
        return applyBackpressure(err)
        
    default:
        // Authentication failures or other critical errors
        return terminateStream(err)
    }
}
```

When implementing retries, use exponential backoff to prevent overwhelming the system during recovery:

```go
func retryWithBackoff(err error) error {
    backoff := time.Second
    maxRetries := 3
    
    for i := 0; i < maxRetries; i++ {
        if err = tryOperation(); err == nil {
            return nil
        }
        // Double the wait time with each attempt
        time.Sleep(backoff)
        backoff *= 2
    }
    return fmt.Errorf("failed after %d retries: %v", maxRetries, err)
}
```

### Resource Management

Long-lived WebSocket connections can consume significant resources. Without proper management, this can lead to memory leaks and degraded performance. A comprehensive resource management strategy should track all active connections, monitor their health, and ensure proper cleanup.

The StreamManager pattern provides a centralized way to manage connection lifecycles:

```go
type StreamManager struct {
    streams map[string]*Stream
    mu      sync.RWMutex
    metrics *Metrics
}

func NewStreamManager(metrics *Metrics) *StreamManager {
    sm := &StreamManager{
        streams: make(map[string]*Stream),
        metrics: metrics,
    }
    // Start periodic cleanup
    go sm.periodicCleanup()
    return sm
}

func (m *StreamManager) AddStream(id string, stream *Stream) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Track new connection in metrics
    m.metrics.ActiveConnections.Inc()
    
    // Set up automatic cleanup when the context is cancelled
    go func() {
        <-stream.Context().Done()
        m.removeStream(id)
        m.metrics.ActiveConnections.Dec()
    }()
    
    m.streams[id] = stream
}
```

This manager not only tracks connections but also integrates with monitoring systems to provide visibility into resource usage. Regular cleanup prevents resource leaks:

```go
func (m *StreamManager) periodicCleanup() {
    ticker := time.NewTicker(cleanupInterval)
    defer ticker.Stop()

    for range ticker.C {
        m.mu.Lock()
        for id, stream := range m.streams {
            if !stream.isHealthy() {
                m.removeStream(id)
                m.metrics.DeadConnections.Inc()
            }
        }
        m.mu.Unlock()
    }
}
```

### Performance Optimization

WebSocket performance optimization involves several aspects: connection handling, message processing, and data transmission. Each area requires specific techniques to achieve optimal performance.

Connection handling can be optimized through proper buffer sizing and compression settings:

```go
var upgrader = websocket.Upgrader{
    // Larger buffers for better throughput with large messages
    ReadBufferSize:  1024 * 16,  // 16KB read buffer
    WriteBufferSize: 1024 * 16,  // 16KB write buffer
    
    // Enable compression for text-based messages
    EnableCompression: true,
    
    // Balance compression level between CPU usage and size
    CompressionLevel: 6,  // Medium compression
    
    // Custom check for origin
    CheckOrigin: func(r *http.Request) bool {
        return isAllowedOrigin(r.Header.Get("Origin"))
    },
}
```

For high-throughput scenarios, message batching can significantly improve performance by reducing the number of network operations:

```go
type MessageBatch struct {
    Messages []Message
    BatchID  string
    SentAt   time.Time
    Size     int
}

func (s *service) batchProcessor() {
    batch := &MessageBatch{
        BatchID: uuid.New().String(),
        SentAt:  time.Now(),
    }

    // Collect messages until batch is full or timeout occurs
    for {
        select {
        case msg := <-s.messageQueue:
            batch.Messages = append(batch.Messages, msg)
            batch.Size += msg.Size()
            
            if batch.Size >= maxBatchSize {
                s.sendBatch(batch)
                batch = newBatch()
            }
            
        case <-time.After(maxBatchDelay):
            if len(batch.Messages) > 0 {
                s.sendBatch(batch)
                batch = newBatch()
            }
        }
    }
}
```

Memory usage can be optimized by implementing message pooling for frequently allocated message types:

```go
var messagePool = sync.Pool{
    New: func() interface{} {
        return &Message{
            Headers: make(map[string]string),
            Data:    make([]byte, 0, 1024),
        }
    },
}

func acquireMessage() *Message {
    return messagePool.Get().(*Message)
}

func releaseMessage(m *Message) {
    m.Reset()  // Clear message contents
    messagePool.Put(m)
}
```

These optimizations should be applied judiciously based on your specific use case. Always measure performance impact before and after implementing optimizations to ensure they provide meaningful benefits for your application.

For a complete working implementation demonstrating all these concepts, check out the [complete chatter service example](https://github.com/goadesign/examples/tree/master/streaming).
