---
title: Stream Interceptors
weight: 2
description: >
  Learn how to implement streaming gRPC interceptors for Goa services, with practical examples of common patterns.
---

# Stream gRPC Interceptors

Stream interceptors handle streaming RPCs in gRPC services. They're used when
either the client, server, or both send multiple messages over a single
connection. This guide shows you how to implement effective stream interceptors
for your Goa services.

## Basic Structure

A stream interceptor follows this pattern:

```go
func StreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // 1. Pre-stream operations
    // - Extract metadata
    // - Validate protocol requirements
    // - Initialize stream state
    
    // 2. Wrap the stream for monitoring
    wrappedStream := &wrappedServerStream{
        ServerStream: ss,
        // Add fields for tracking stream state
    }
    
    // 3. Handle the stream
    err := handler(srv, wrappedStream)
    
    // 4. Post-stream operations
    // - Record metrics
    // - Clean up resources
    // - Handle errors
    
    return err
}
```

This structure allows you to:
- Set up stream-wide context and state
- Monitor message flow
- Handle stream lifecycle events
- Manage stream-specific resources

## Stream Wrapper

The gRPC server stream interface provides basic message handling capabilities, but
interceptors often need to add functionality without modifying the original stream.
This is where stream wrappers become essential. A stream wrapper implements the
`grpc.ServerStream` interface while adding custom behavior through composition.

Here's a standard implementation pattern:

```go
type wrappedServerStream struct {
    grpc.ServerStream                // Embed the original interface
    msgCount   int64                 // Track message count
    startTime  time.Time             // Track stream duration
    method     string                // Store RPC method name
}

func (w *wrappedServerStream) SendMsg(m interface{}) error {
    err := w.ServerStream.SendMsg(m)
    if err == nil {
        atomic.AddInt64(&w.msgCount, 1)  // Thread-safe counter
    }
    return err
}

func (w *wrappedServerStream) RecvMsg(m interface{}) error {
    err := w.ServerStream.RecvMsg(m)
    if err == nil {
        atomic.AddInt64(&w.msgCount, 1)  // Track received messages too
    }
    return err
}
```

This wrapper pattern serves several important purposes:

1. **Message Tracking**: The wrapper intercepts every message sent or received,
   allowing you to:
   - Count total messages processed
   - Implement rate limiting
   - Log message sizes or contents
   - Apply transformations

2. **State Management**: The wrapper maintains stream-specific state:
   - Track timing information
   - Store stream metadata
   - Manage resource usage
   - Coordinate multiple goroutines

3. **Error Handling**: The wrapper can enhance error handling by:
   - Adding context to errors
   - Implementing retry logic
   - Recording error metrics
   - Cleaning up resources

Here's an example of a more sophisticated wrapper that adds functionality
commonly needed in production environments:

```go
type enhancedServerStream struct {
    grpc.ServerStream
    ctx       context.Context    // Enhanced context
    method    string            // RPC method name
    startTime time.Time         // Stream start time
    msgCount  int64            // Message counter
    msgSize   int64            // Total bytes processed
    metadata  metadata.MD       // Cached metadata
    mu        sync.RWMutex      // Protect concurrent access
    logger    *zap.Logger       // Structured logging
}

func newEnhancedServerStream(ss grpc.ServerStream, method string) *enhancedServerStream {
    return &enhancedServerStream{
        ServerStream: ss,
        ctx:         ss.Context(),
        method:      method,
        startTime:   time.Now(),
        metadata:    metadata.MD{},
        logger:      zap.L().With(zap.String("method", method)),
    }
}

func (s *enhancedServerStream) Context() context.Context {
    return s.ctx
}

func (s *enhancedServerStream) SendMsg(m interface{}) error {
    // Pre-send processing
    msgSize := proto.Size(m.(proto.Message))
    
    s.mu.Lock()
    s.msgSize += int64(msgSize)
    s.mu.Unlock()
    
    // Log large messages
    if msgSize > maxMessageSize {
        s.logger.Warn("large message detected",
            zap.Int("size", msgSize))
    }
    
    // Send with timing
    start := time.Now()
    err := s.ServerStream.SendMsg(m)
    duration := time.Since(start)
    
    // Post-send processing
    if err == nil {
        atomic.AddInt64(&s.msgCount, 1)
        metrics.RecordMessageMetrics(s.method, "send",
            msgSize, duration)
    } else {
        s.logger.Error("send failed",
            zap.Error(err))
    }
    
    return err
}

func (s *enhancedServerStream) RecvMsg(m interface{}) error {
    // Similar enhancement pattern for receive...
}

func (s *enhancedServerStream) Stats() StreamStats {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    return StreamStats{
        Method:      s.method,
        Duration:    time.Since(s.startTime),
        MessageCount: atomic.LoadInt64(&s.msgCount),
        TotalBytes:   s.msgSize,
    }
}
```

This enhanced wrapper demonstrates several production-ready features:

1. **Metrics Collection**: The wrapper automatically records:
   - Message counts and sizes
   - Processing durations
   - Error rates
   - Custom business metrics

2. **Logging Integration**: It provides structured logging with:
   - Method-level context
   - Size warnings
   - Error details
   - Timing information

3. **Resource Tracking**: The wrapper maintains:
   - Total bytes processed
   - Stream duration
   - Message statistics
   - Resource usage patterns

4. **Thread Safety**: It properly handles concurrent access through:
   - Atomic operations for counters
   - Mutex protection for shared state
   - Safe context management
   - Thread-safe logging

You can use these wrappers in your interceptors like this:

```go
func StreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // Create enhanced stream
    ws := newEnhancedServerStream(ss, info.FullMethod)
    
    // Use wrapper in handler
    err := handler(srv, ws)
    
    // Record final statistics
    stats := ws.Stats()
    metrics.RecordStreamStats(stats)
    
    return err
}
```

These wrapper patterns are standard practice in gRPC services, and you'll find
similar implementations in many production systems. The specific enhancements you
add will depend on your service's requirements, but the basic pattern of wrapping
the stream to add functionality remains consistent.

## Common Patterns

### 1. Stream Monitoring

Monitor streaming RPC performance and behavior:

```go
func MonitoringStreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // Create wrapped stream
    ws := &wrappedServerStream{
        ServerStream: ss,
        startTime:    time.Now(),
        method:       info.FullMethod,
    }
    
    // Extract peer information
    peer, _ := peer.FromContext(ss.Context())
    
    // Handle stream
    err := handler(srv, ws)
    
    // Record metrics
    duration := time.Since(ws.startTime)
    msgCount := atomic.LoadInt64(&ws.msgCount)
    status := status.Code(err)
    
    metrics.RecordStreamMetrics(ws.method, peer.Addr.String(),
        status, duration, msgCount)
    
    return err
}
```

This pattern demonstrates comprehensive stream monitoring capabilities. The interceptor
tracks the duration of each stream from start to finish, maintaining an accurate
count of messages processed. It extracts and records peer information from the
context, enabling you to identify and monitor client behavior. The interceptor
properly handles stream errors, ensuring that failure scenarios are captured and
recorded. All of this information is collected into stream-specific metrics,
providing valuable insights into your service's streaming behavior.

### 2. Resource Management

Manage resources for long-lived streams:

```go
func ResourceManagementInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // Create resource pool
    pool := acquireResourcePool()
    defer releaseResourcePool(pool)
    
    // Create stream context with cancel
    ctx, cancel := context.WithCancel(ss.Context())
    defer cancel()
    
    // Create wrapped stream with resource context
    ws := &wrappedServerStream{
        ServerStream: wrapStreamContext(ss, ctx),
        resources:    pool,
    }
    
    // Monitor resource usage
    go func() {
        ticker := time.NewTicker(time.Second)
        defer ticker.Stop()
        
        for {
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
                if pool.Usage() > maxUsage {
                    cancel() // Terminate stream if resources exceeded
                    return
                }
            }
        }
    }()
    
    return handler(srv, ws)
}
```

This example showcases essential resource management techniques for streaming RPCs.
The interceptor creates and manages a dedicated resource pool for each stream,
ensuring proper allocation and cleanup of resources. It implements active monitoring
of resource usage through a background goroutine, which periodically checks
consumption levels. When resource limits are exceeded, the interceptor gracefully
terminates the stream using context cancellation. Throughout the stream's
lifecycle, it maintains proper cleanup through strategic use of defer statements,
guaranteeing that resources are released even in error scenarios.

### 3. Flow Control

Implement flow control for streaming RPCs:

```go
func FlowControlInterceptor(maxMsgsPerSecond int) grpc.StreamServerInterceptor {
    return func(srv interface{},
        ss grpc.ServerStream,
        info *grpc.StreamServerInfo,
        handler grpc.StreamHandler) error {
        
        limiter := rate.NewLimiter(rate.Limit(maxMsgsPerSecond), 1)
        
        ws := &wrappedServerStream{
            ServerStream: ss,
            sendMsg: func(m interface{}) error {
                if err := limiter.Wait(ss.Context()); err != nil {
                    return err
                }
                return ss.SendMsg(m)
            },
            recvMsg: func(m interface{}) error {
                if err := limiter.Wait(ss.Context()); err != nil {
                    return err
                }
                return ss.RecvMsg(m)
            },
        }
        
        return handler(srv, ws)
    }
}
```

This pattern illustrates sophisticated flow control for streaming RPCs. The
interceptor employs a token bucket algorithm to enforce rate limits on message
flow, preventing resource exhaustion from high-volume streams. It carefully
respects context cancellation, ensuring that rate limiting doesn't block
indefinitely when streams are terminated. The implementation handles both send and
receive operations uniformly, providing consistent flow control in both directions.
This approach allows for fine-grained control over message processing rates while
maintaining responsiveness to cancellation and shutdown signals.

## Testing

Testing streaming interceptors requires careful consideration of stream lifecycle,
message flow, and state management. Here's how to use Clue's mock package to test
stream interceptors effectively:

```go
// Mock implementation of grpc.ServerStream
type mockServerStream struct {
    *mock.Mock
    t *testing.T
}

func newMockServerStream(t *testing.T) *mockServerStream {
    return &mockServerStream{mock.New(), t}
}

func (m *mockServerStream) Context() context.Context {
    if f := m.Next("Context"); f != nil {
        return f.(func() context.Context)()
    }
    return context.Background()
}

func (m *mockServerStream) SendMsg(msg interface{}) error {
    if f := m.Next("SendMsg"); f != nil {
        return f.(func(interface{}) error)(msg)
    }
    return nil
}

func (m *mockServerStream) RecvMsg(msg interface{}) error {
    if f := m.Next("RecvMsg"); f != nil {
        return f.(func(interface{}) error)(msg)
    }
    return nil
}

func TestMonitoringStreamInterceptor(t *testing.T) {
    tests := []struct {
        name      string
        setup     func(*mockServerStream)
        msgCount  int
        wantErr   bool
    }{
        {
            name: "successful stream with multiple messages",
            setup: func(s *mockServerStream) {
                // Set up context call
                s.Set("Context", func() context.Context {
                    return context.Background()
                })
                
                // Set up successful message sends
                for i := 0; i < 10; i++ {
                    s.Add("SendMsg", func(msg interface{}) error {
                        return nil
                    })
                }
            },
            msgCount: 10,
            wantErr:  false,
        },
        {
            name: "stream with error",
            setup: func(s *mockServerStream) {
                s.Set("Context", func() context.Context {
                    return context.Background()
                })
                
                // First few messages succeed
                for i := 0; i < 3; i++ {
                    s.Add("SendMsg", func(msg interface{}) error {
                        return nil
                    })
                }
                
                // Then error occurs
                s.Add("SendMsg", func(msg interface{}) error {
                    return status.Error(codes.Internal, "stream error")
                })
            },
            msgCount: 4,
            wantErr:  true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create mock stream
            stream := newMockServerStream(t)
            if tt.setup != nil {
                tt.setup(stream)
            }
            
            // Create test handler
            handler := func(srv interface{}, stream grpc.ServerStream) error {
                for i := 0; i < tt.msgCount; i++ {
                    if err := stream.SendMsg(i); err != nil {
                        return err
                    }
                }
                return nil
            }
            
            // Call interceptor
            err := MonitoringStreamInterceptor(nil, stream,
                &grpc.StreamServerInfo{}, handler)
            
            // Verify error behavior
            if (err != nil) != tt.wantErr {
                t.Errorf("MonitoringStreamInterceptor() error = %v, wantErr %v",
                    err, tt.wantErr)
            }
            
            // Verify all expected calls were made
            if stream.HasMore() {
                t.Error("not all expected stream operations were performed")
            }
        })
    }
}

// Testing resource management with Clue mocks
func TestResourceManagementInterceptor(t *testing.T) {
    tests := []struct {
        name      string
        setup     func(*mockServerStream)
        resources *ResourcePool
        wantErr   bool
    }{
        {
            name: "respects resource limits",
            setup: func(s *mockServerStream) {
                s.Set("Context", func() context.Context {
                    return context.Background()
                })
                
                // Simulate message processing until resource limit
                s.Add("SendMsg", func(msg interface{}) error {
                    return nil
                })
            },
            resources: NewResourcePool(100),
            wantErr:   true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            stream := newMockServerStream(t)
            tt.setup(stream)
            
            err := ResourceManagementInterceptor(nil, stream,
                &grpc.StreamServerInfo{}, testHandler)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("ResourceManagementInterceptor() error = %v, wantErr %v",
                    err, tt.wantErr)
            }
            
            if stream.HasMore() {
                t.Error("not all expected stream operations were performed")
            }
        })
    }
}

// Testing flow control with Clue mocks
func TestFlowControlInterceptor(t *testing.T) {
    tests := []struct {
        name     string
        setup    func(*mockServerStream)
        rate     int
        wantErr  bool
    }{
        {
            name: "throttles rapid messages",
            setup: func(s *mockServerStream) {
                s.Set("Context", func() context.Context {
                    return context.Background()
                })
                
                // Set up sequence of messages with timing checks
                start := time.Now()
                for i := 0; i < 3; i++ {
                    s.Add("SendMsg", func(msg interface{}) error {
                        if elapsed := time.Since(start); elapsed < time.Second/2 {
                            return fmt.Errorf("message sent too quickly: %v", elapsed)
                        }
                        return nil
                    })
                }
            },
            rate:    2, // messages per second
            wantErr: false,
        },
    }
    
    // Test implementation...
}
```

This testing approach using Clue's mock package offers several advantages:

1. **Sequence Control**: The `Add` method allows precise control over the sequence
   of stream operations, making it easy to test different message patterns and
   error scenarios.

2. **Permanent Behaviors**: The `Set` method defines default behaviors for stream
   operations that don't need to vary, reducing test setup code.

3. **Verification**: The `HasMore` method provides a simple way to verify that all
   expected operations were performed, catching missing or unexpected calls.

4. **Flexibility**: The mock implementation can be easily extended to handle new
   stream behaviors or test different aspects of interceptor functionality.

The tests demonstrate several key patterns:

1. **Setup Functions**: Each test case includes a setup function that configures
   the mock stream's behavior, making the test cases clear and self-contained.

2. **Error Scenarios**: The tests cover both successful operations and various
   error conditions, ensuring robust error handling.

3. **Resource Management**: Tests verify proper resource allocation, usage
   tracking, and cleanup.

4. **Flow Control**: Tests validate rate limiting and backpressure mechanisms
   using timing-aware mock implementations.

## Best Practices

1. **Resource Management**: Always clean up resources, even on errors.
2. **Context Handling**: Respect context cancellation for stream operations.
3. **Flow Control**: Implement rate limiting for high-volume streams.
4. **Error Handling**: Use appropriate gRPC status codes for stream errors.
5. **Testing**: Test stream lifecycle events and error conditions.
6. **Monitoring**: Track stream health and performance metrics.
7. **Documentation**: Document stream behavior and resource requirements.

## Next Steps

- Review [Error Handling](@/docs/4-concepts/4-error-handling.md)
- Explore [Observability](@/docs/5-real-world/2-observability.md)
- Learn about [Load Balancing](@/docs/5-real-world/4-load-balancing.md)

