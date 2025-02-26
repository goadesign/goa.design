---
title: Unary Interceptors
weight: 1
description: >
  Learn how to implement unary gRPC interceptors for Goa services, with practical examples of common patterns.
---

## Unary gRPC Interceptors

Unary interceptors handle single request/response RPCs in gRPC services. They're
ideal for protocol-level concerns like metadata handling, logging, and monitoring.
This guide shows you how to implement effective unary interceptors for your Goa
services.

## Basic Structure

A unary interceptor follows this pattern:

```go
func UnaryInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    // 1. Pre-handler operations
    // - Extract metadata
    // - Validate protocol requirements
    // - Start timing
    
    // 2. Call the handler
    resp, err := handler(ctx, req)
    
    // 3. Post-handler operations
    // - Record metrics
    // - Transform errors
    // - Add response metadata
    
    return resp, err
}
```

This structure allows you to:
- Process requests before they reach your handler
- Modify or record responses after handler execution
- Handle errors at the protocol level
- Manage gRPC-specific metadata and context

## Common Patterns

### 1. Metadata Handling

This interceptor demonstrates proper metadata propagation:

```go
func MetadataInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    // Extract incoming metadata
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    }
    
    // Add or modify metadata
    requestID := md.Get("x-request-id")
    if len(requestID) == 0 {
        requestID = []string{uuid.New().String()}
        md = metadata.Join(md, metadata.Pairs("x-request-id", requestID[0]))
    }
    
    // Create new context with metadata
    ctx = metadata.NewIncomingContext(ctx, md)
    
    // Call handler
    resp, err := handler(ctx, req)
    
    // Add metadata to response
    header := metadata.Pairs("x-request-id", requestID[0])
    grpc.SetHeader(ctx, header)
    
    return resp, err
}
```

This example demonstrates several key metadata handling capabilities. It shows
how to extract and validate metadata from incoming requests, ensuring that
required values are present. When values like request IDs are missing, it
generates new ones to maintain traceability. The interceptor properly propagates
metadata through the context, making it available to downstream handlers.
Finally, it adds relevant metadata to responses, enabling end-to-end tracking of
requests.

### 2. Monitoring

This interceptor captures RPC metrics:

```go
func MonitoringInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    start := time.Now()
    
    // Extract caller information
    peer, _ := peer.FromContext(ctx)
    method := info.FullMethod
    
    // Call handler
    resp, err := handler(ctx, req)
    
    // Record metrics
    duration := time.Since(start)
    status := status.Code(err)
    
    metrics.RecordRPCMetrics(method, peer.Addr.String(), status, duration)
    
    return resp, err
}
```

This pattern demonstrates several key monitoring capabilities. It accurately
measures RPC execution time by capturing timestamps before and after the handler
call. The interceptor extracts important caller information from the context,
allowing you to track which clients are making requests. It records standardized
metrics that can be used for monitoring and alerting. Finally, it properly
handles error status codes, ensuring that failures are accurately captured in
your metrics.

### 3. Protocol Error Handling

Handle protocol-level errors that occur outside of your service methods:

```go
func ProtocolErrorInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    // Handle context errors
    if err := ctx.Err(); err != nil {
        switch err {
        case context.DeadlineExceeded:
            return nil, status.Error(codes.DeadlineExceeded, "request timeout")
        case context.Canceled:
            return nil, status.Error(codes.Canceled, "request canceled")
        }
    }
    
    // Call handler (Goa handles mapping of design errors to gRPC codes)
    resp, err := handler(ctx, req)
    if err != nil {
        return nil, err
    }
    
    // Handle protocol-specific validation
    if err := validateProtocolRequirements(resp); err != nil {
        return nil, status.Error(codes.FailedPrecondition, err.Error())
    }
    
    return resp, nil
}
```

This example demonstrates several important aspects of protocol error handling
in gRPC interceptors. It shows how to properly handle protocol-specific errors
like timeouts and cancellations that can occur during RPC calls. The interceptor
preserves Goa's built-in error mapping functionality for design errors while
adding additional protocol-level validation. It also ensures that appropriate
gRPC status codes are used when protocol-level issues arise, maintaining
consistency with gRPC best practices.

## Testing

Testing gRPC interceptors requires careful consideration of the gRPC context,
metadata handling, and error propagation. Here's how to use Clue's mock package
to test interceptors effectively:

```go
// Mock implementation for testing
type mockUnaryHandler struct {
    *mock.Mock
}

func newMockUnaryHandler(t *testing.T) *mockUnaryHandler {
    return &mockUnaryHandler{mock.New()}
}

func (m *mockUnaryHandler) Handle(ctx context.Context, req interface{}) (interface{}, error) {
    if f := m.Next("Handle"); f != nil {
        return f.(func(context.Context, interface{}) (interface{}, error))(ctx, req)
    }
    return nil, nil
}

func TestMetadataInterceptor(t *testing.T) {
    tests := []struct {
        name        string
        setup       func(context.Context, *mockUnaryHandler)
        incomingMD  metadata.MD
        wantReqID   bool
        wantErr     bool
    }{
        {
            name: "adds missing request ID",
            setup: func(ctx context.Context, h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    md, ok := metadata.FromIncomingContext(ctx)
                    if !ok {
                        return nil, fmt.Errorf("no metadata in context")
                    }
                    if ids := md.Get("x-request-id"); len(ids) == 0 {
                        return nil, fmt.Errorf("no request ID added")
                    }
                    return "test response", nil
                })
            },
            incomingMD: metadata.New(nil),
            wantReqID:  true,
            wantErr:    false,
        },
        {
            name: "preserves existing request ID",
            setup: func(ctx context.Context, h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    md, _ := metadata.FromIncomingContext(ctx)
                    ids := md.Get("x-request-id")
                    if len(ids) != 1 || ids[0] != "test-id" {
                        return nil, fmt.Errorf("request ID not preserved")
                    }
                    return "test response", nil
                })
            },
            incomingMD: metadata.Pairs("x-request-id", "test-id"),
            wantReqID:  true,
            wantErr:    false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create test context with metadata
            ctx := metadata.NewIncomingContext(context.Background(), tt.incomingMD)
            
            // Create mock handler
            handler := newMockUnaryHandler(t)
            if tt.setup != nil {
                tt.setup(ctx, handler)
            }

            // Call interceptor
            resp, err := MetadataInterceptor(ctx, "test request",
                &grpc.UnaryServerInfo{},
                handler.Handle)

            // Verify error behavior
            if (err != nil) != tt.wantErr {
                t.Errorf("MetadataInterceptor() error = %v, wantErr %v", err, tt.wantErr)
            }

            // Verify all expected calls were made
            if handler.HasMore() {
                t.Error("not all expected handler operations were performed")
            }
        })
    }
}

// Testing monitoring interceptors
func TestMonitoringInterceptor(t *testing.T) {
    tests := []struct {
        name       string
        setup      func(*mockUnaryHandler)
        wantMetric string
        wantErr    bool
    }{
        {
            name: "records successful call",
            setup: func(h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    // Simulate successful processing
                    time.Sleep(10 * time.Millisecond)
                    return "success", nil
                })
            },
            wantMetric: "success",
            wantErr:    false,
        },
        {
            name: "records failed call",
            setup: func(h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    return nil, status.Error(codes.Internal, "test error")
                })
            },
            wantMetric: "error",
            wantErr:    true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            handler := newMockUnaryHandler(t)
            if tt.setup != nil {
                tt.setup(handler)
            }

            resp, err := MonitoringInterceptor(context.Background(), "test",
                &grpc.UnaryServerInfo{FullMethod: "/test.Service/Method"},
                handler.Handle)

            if (err != nil) != tt.wantErr {
                t.Errorf("MonitoringInterceptor() error = %v, wantErr %v", err, tt.wantErr)
            }

            if handler.HasMore() {
                t.Error("not all expected handler operations were performed")
            }
        })
    }
}

// Testing protocol error handling
func TestProtocolErrorInterceptor(t *testing.T) {
    tests := []struct {
        name      string
        setup     func(context.Context, *mockUnaryHandler)
        ctx       context.Context
        wantCode  codes.Code
    }{
        {
            name: "handles deadline exceeded",
            setup: func(ctx context.Context, h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    return nil, ctx.Err()
                })
            },
            ctx: func() context.Context {
                ctx, cancel := context.WithTimeout(context.Background(), 0)
                cancel()
                return ctx
            }(),
            wantCode: codes.DeadlineExceeded,
        },
        {
            name: "handles context canceled",
            setup: func(ctx context.Context, h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    return nil, ctx.Err()
                })
            },
            ctx: func() context.Context {
                ctx, cancel := context.WithCancel(context.Background())
                cancel()
                return ctx
            }(),
            wantCode: codes.Canceled,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            handler := newMockUnaryHandler(t)
            if tt.setup != nil {
                tt.setup(tt.ctx, handler)
            }

            resp, err := ProtocolErrorInterceptor(tt.ctx, "test",
                &grpc.UnaryServerInfo{},
                handler.Handle)

            if status.Code(err) != tt.wantCode {
                t.Errorf("ProtocolErrorInterceptor() status code = %v, want %v",
                    status.Code(err), tt.wantCode)
            }

            if handler.HasMore() {
                t.Error("not all expected handler operations were performed")
            }
        })
    }
}
```

These examples demonstrate several key testing techniques for gRPC interceptors.
First, they show how to effectively use Clue's mock package to create test
doubles that verify interceptor behavior. The `Set` method defines default
behaviors for operations, while `Next` allows for sequence-specific responses.
The tests cover verification of metadata handling, metrics recording, and error
status codes. Additionally, they demonstrate how to test complex context
scenarios, such as cancellation and timeouts, which are common in real-world
gRPC applications.

## Best Practices

1. **Keep it Simple**: Each interceptor should handle one concern.
2. **Handle Context**: Respect context cancellation and deadlines.
3. **Error Handling**: Use appropriate gRPC status codes.
4. **Performance**: Minimize allocations and expensive operations.
5. **Testing**: Test edge cases and error conditions.
6. **Logging**: Use structured logging for debugging.
7. **Metrics**: Record relevant metrics for monitoring.

## Next Steps

- Learn about [Stream Interceptors](@/docs/4-concepts/5-interceptors/3-grpc-interceptors/2-stream.md)
- Review [Error Handling](@/docs/4-concepts/4-error-handling.md)
- Explore [Observability](@/docs/5-real-world/2-observability.md)

