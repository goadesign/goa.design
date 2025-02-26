---
title: "Interceptor Implementation"
description: "Understanding how to implement Goa interceptors and common patterns"
weight: 3
---

This guide explains how to implement interceptors in Goa, focusing on the flexibility provided by the interceptor pattern and the `next` function.

## Implementation Structure

Goa generates type-safe interceptor interfaces based on your design. Each interceptor method follows this signature:

```go
func (i *Interceptor) MethodName(ctx context.Context, info *InterceptorInfo, next goa.Endpoint) (any, error)
```

Where:
- `ctx`: The request context
- `info`: Type-safe access to payload and result attributes
- `next`: The wrapped endpoint (service method or next interceptor)

## The Next Function

The `next` function is the key to interceptor flexibility. It represents the
wrapped endpoint and can be called at any point in your interceptor code. This
enables three main patterns:

### 1. Pre-Processing Pattern

Call `next` at the end after modifying the context or payload:

```go
func (i *Interceptor) SetDeadline(ctx context.Context, info *SetDeadlineInfo, next goa.Endpoint) (any, error) {
    // Modify context before calling the endpoint
    deadline := time.Now().Add(30 * time.Second)
    ctx, cancel := context.WithDeadline(ctx, deadline)
    defer cancel()
    
    // Call endpoint with modified context
    return next(ctx, info.RawPayload())
}
```

### 2. Post-Processing Pattern

Call `next` first, then process its result:

```go
func (i *Interceptor) Cache(ctx context.Context, info *CacheInfo, next goa.Endpoint) (any, error) {
    // Call endpoint first
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Process the response
    if result := info.Result(resp); result != nil {
        // Cache the result...
    }
    
    return resp, nil
}
```

### 3. Wrapper Pattern

Process both before and after calling `next`:

```go
func (i *Interceptor) RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error) {
    // Pre-processing
    start := time.Now()
    payload := info.RawPayload()
    
    // Call endpoint
    resp, err := next(ctx, payload)
    
    // Post-processing
    duration := time.Since(start)
    if err != nil {
        log.Printf("request failed: %v, duration: %v", err, duration)
        return nil, err
    }
    
    log.Printf("request succeeded, duration: %v", duration)
    return resp, nil
}
```

## Using the Info Object

The generated `info` object provides type-safe access to payload and result
attributes. The access methods are generated based on your design DSL:

```go
// In your design
var TraceRequest = Interceptor("TraceRequest", func() {
    Description("Adds trace context to requests")
    
    ReadPayload(func() {
        Attribute("trace_id")    // Generates info.TraceID() method
        Attribute("span_id")     // Generates info.SpanID() method
    })
    
    WriteResult(func() {
        Attribute("duration")    // Generates info.SetDuration() method
    })
})

// In the generated implementation
func (i *Interceptor) TraceRequest(ctx context.Context, info *TraceRequestInfo, next goa.Endpoint) (any, error) {
    // Generated methods match attribute names in design
    traceID := info.TraceID()   // Returns the trace_id value
    spanID := info.SpanID()     // Returns the span_id value
    
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Write result attributes using generated setters
    if result := info.Result(resp); result != nil {
        info.SetDuration(result, time.Since(start))
    }
    
    return resp, nil
}
```

For each attribute in your design:
- `ReadPayload`/`ReadResult` attributes generate getter methods
- `WritePayload`/`WriteResult` attributes generate setter methods
- Method names are CamelCase versions of the attribute names
- Types are preserved from the design definitions

## Streaming Interceptors

Streaming interceptors handle streaming methods, with a key difference from regular
interceptors: they are called for each message in the stream, not just once per
request. Like regular interceptors, they operate on either the server side OR the
client side, not both:

```go
// SERVER-SIDE streaming interceptor
func (i *Interceptor) ServerStreamMonitor(ctx context.Context, info *ServerStreamMonitorInfo, next goa.Endpoint) (any, error) {
    // This interceptor is called for EACH message in the stream
    
    // For server streaming results:
    // - Called each time the server is about to send a message
    // - info.StreamingResult() contains the message about to be sent
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    if result := info.StreamingResult(resp); result != nil {
        // Monitor outgoing server stream message
        log.Printf("server sending message: %v", result)
    }
    
    return resp, nil
}

// CLIENT-SIDE streaming interceptor
func (i *Interceptor) ClientStreamMonitor(ctx context.Context, info *ClientStreamMonitorInfo, next goa.Endpoint) (any, error) {
    // This interceptor is called for EACH message in the stream
    
    // For client streaming payloads:
    // - Called each time the client sends a message
    // - info.StreamingPayload() contains the message about to be sent
    if payload := info.StreamingPayload(); payload != nil {
        // Monitor outgoing client stream message
        log.Printf("client sending message: %v", payload)
    }
    
    return next(ctx, info.RawPayload())
}
```

This per-message execution enables:
- Processing each message as it flows through the system
- Maintaining state across messages using interceptor instance fields
- Early stream termination by returning an error
- Message transformation or filtering

For example, a server-side rate limiting interceptor:

```go
type StreamRateLimiter struct {
    messageCount int
    lastReset   time.Time
    limit       int
}

func (i *StreamRateLimiter) LimitServerStream(ctx context.Context, info *LimitServerStreamInfo, next goa.Endpoint) (any, error) {
    i.mu.Lock()
    // Reset counter every minute 
    if time.Since(i.lastReset) > time.Minute {
        i.messageCount = 0
        i.lastReset = time.Now()
    }

    // Check rate before processing message
    if i.messageCount >= i.limit {
        i.mu.Unlock()
        return nil, fmt.Errorf("rate limit exceeded") 
    }

    // Process message and increment counter
    i.messageCount++
    i.mu.Unlock()

    return next(ctx, info.RawPayload())
}
```

## Error Handling

Interceptors can handle errors from the wrapped endpoint:

```go
func (i *Interceptor) ErrorHandler(ctx context.Context, info *ErrorHandlerInfo, next goa.Endpoint) (any, error) {
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        // Convert error to appropriate type
        if gerr, ok := err.(*goa.ServiceError); ok {
            // Handle service error...
            return nil, gerr
        }
        // Wrap unknown errors
        return nil, goa.NewServiceError("internal error")
    }
    return resp, nil
}
```

## Next Steps

- Explore [Best Practices](../4-best-practices) for interceptor design
