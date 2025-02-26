---
title: "Distributed Tracing"
description: "Implementing distributed tracing with OpenTelemetry"
weight: 2
---

Modern applications are complex distributed systems where a single user request
might touch dozens of services, databases, and external APIs. When something goes
wrong, it can be challenging to understand what happened. This is where
distributed tracing comes in.

## What is Distributed Tracing?

Distributed tracing follows a request as it travels through your system,
recording timing, errors, and context at each step. Think of it like a GPS
tracking system for your requests - you can see exactly where they went, how
long each step took, and where they encountered problems.

### Key Concepts

1. **Trace**: The complete journey of a request through your system
2. **Span**: A single operation within that journey (like a database query or API call)
3. **Context**: Information that travels with the request (like user ID or correlation ID)
4. **Attributes**: Key-value pairs that describe what happened (like order ID or error details)

Here's a visual example:

```
Trace: Create Order
├── Span: Validate User (10ms)
│   └── Attribute: user_id=123
├── Span: Check Inventory (50ms)
│   ├── Attribute: product_id=456
│   └── Event: "stock level low"
└── Span: Process Payment (200ms)
    ├── Attribute: amount=99.99
    └── Error: "insufficient funds"
```

## Automatic Instrumentation

The easiest way to get started with tracing is to use automatic instrumentation.
Clue provides middleware that automatically traces HTTP and gRPC requests with
zero code changes:

```go
// For HTTP servers, wrap your handler with OpenTelemetry middleware.
// This automatically creates traces for all incoming requests.
handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    // Your handler code
})

// Add tracing middleware
handler = otelhttp.NewHandler(handler, "my-service")

// The middleware will:
// - Create a span for each request
// - Record the HTTP method, status code, and URL
// - Track request duration
// - Propagate context to downstream services
```

For gRPC services, use the provided interceptors:

```go
// Create a gRPC server with tracing enabled
server := grpc.NewServer(
    // Add the OpenTelemetry handler to trace all RPCs
    grpc.StatsHandler(otelgrpc.NewServerHandler()))

// This automatically:
// - Traces all gRPC methods
// - Records method names and status codes
// - Tracks latency
// - Handles context propagation
```

## Manual Instrumentation

While automatic instrumentation is great for request boundaries, you often need
to add custom spans to track important business operations. Here's how to add
custom tracing to your code:

```go
func processOrder(ctx context.Context, order *Order) error {
    // Start a new span for this operation.
    // The span name "process_order" will appear in your traces.
    ctx, span := otel.Tracer("myservice").Start(ctx, "process_order")
    
    // Always end the span when the function returns
    defer span.End()

    // Add business context as span attributes
    span.SetAttributes(
        // These will help you filter and analyze traces
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount),
        attribute.String("customer.id", order.CustomerID))

    // Record significant events with timestamps
    span.AddEvent("validating_order")
    if err := validateOrder(ctx, order); err != nil {
        // Record errors with context
        span.RecordError(err)
        span.SetStatus(codes.Error, "order validation failed")
        return err
    }
    span.AddEvent("order_validated")

    // Create nested spans for sub-operations
    ctx, paymentSpan := otel.Tracer("myservice").Start(ctx, "process_payment")
    defer paymentSpan.End()

    if err := processPayment(ctx, order); err != nil {
        paymentSpan.RecordError(err)
        paymentSpan.SetStatus(codes.Error, "payment failed")
        return err
    }

    return nil
}
```

## Tracing External Calls

When your service calls other services or databases, you want to track those
operations as part of your traces. Here's how to instrument different types of
clients:

### HTTP Clients

```go
// Create an HTTP client with tracing enabled
client := &http.Client{
    // Wrap the default transport with OpenTelemetry
    Transport: otelhttp.NewTransport(
        http.DefaultTransport,
        // Enable detailed HTTP tracing (optional)
        otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
            return otelhttptrace.NewClientTrace(ctx)
        }),
    ),
}

// Now all requests will be traced automatically
resp, err := client.Get("https://api.example.com/data")
```

### gRPC Clients

```go
// Create a gRPC client connection with tracing
conn, err := grpc.DialContext(ctx,
    "service:8080",
    // Add the OpenTelemetry handler
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    // Other options...
    grpc.WithTransportCredentials(insecure.NewCredentials()))

// All calls using this connection will be traced
client := pb.NewServiceClient(conn)
```

### Database Calls

For database operations, create custom spans to track queries:

```go
func (r *Repository) GetUser(ctx context.Context, id string) (*User, error) {
    // Create a span for the database operation
    ctx, span := otel.Tracer("repository").Start(ctx, "get_user")
    defer span.End()

    // Add query context
    span.SetAttributes(
        attribute.String("db.type", "postgres"),
        attribute.String("db.user_id", id))

    // Execute query
    var user User
    if err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE id = $1", id); err != nil {
        // Record database errors
        span.RecordError(err)
        span.SetStatus(codes.Error, "database query failed")
        return nil, err
    }

    return &user, nil
}
```

## Context Propagation

For traces to work across service boundaries, trace context must be propagated
with requests. This happens automatically with the instrumented clients above,
but here's how it works manually:

```go
// When receiving a request, extract the trace context
func handleIncoming(w http.ResponseWriter, r *http.Request) {
    // Extract trace context from request headers
    ctx := otel.GetTextMapPropagator().Extract(r.Context(),
        propagation.HeaderCarrier(r.Header))
    
    // Use this context for all operations
    processRequest(ctx)
}

// When making a request, inject the trace context
func makeOutgoing(ctx context.Context) error {
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com", nil)
    
    // Inject trace context into request headers
    otel.GetTextMapPropagator().Inject(ctx,
        propagation.HeaderCarrier(req.Header))
    
    resp, err := http.DefaultClient.Do(req)
    return err
}
```

Context propagation uses the W3C Trace Context standard to ensure traces work
across different services and observability systems. Learn more about context
propagation in:

- [OpenTelemetry Context and Propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Go SDK Propagation](https://pkg.go.dev/go.opentelemetry.io/otel/propagation)

## Controlling Trace Data

In production systems, tracing every request can generate an overwhelming amount
of data, leading to high storage costs and performance overhead. Sampling helps
you collect enough traces to understand your system while keeping costs under
control.

### Why Sample?

1. **Cost Control**: Storing and processing trace data can be expensive
2. **Performance**: Generating traces adds some overhead to requests
3. **Analysis**: You often don't need every trace to understand system behavior
4. **Storage**: Trace data can quickly consume large amounts of storage

### Fixed Rate Sampling

The simplest approach is to sample a fixed percentage of requests. This is
predictable and easy to understand:

```go
// Sample 10% of requests (0.1 = 10%)
cfg := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithSamplingRate(0.1))

// Common sampling rates:
// 1.0    = 100% (all requests, good for development)
// 0.1    = 10%  (common in production)
// 0.01   = 1%   (high-traffic services)
// 0.001  = 0.1% (very high-traffic services)
```

Fixed rate sampling works well when:
- Your traffic is relatively consistent
- You want predictable storage costs
- You don't need to adjust sampling dynamically

However, fixed rate sampling has important limitations:

1. **Low Traffic Blindness**
   During quiet periods, a fixed sampling rate can lead to significant gaps in
   observability. For example, if you're sampling 10% of traffic and only
   receiving 10 requests per minute, you'll capture just one trace every minute
   on average. With 2 requests per minute, you might go several minutes without
   capturing any traces at all. This creates blind spots exactly when you might
   need visibility the most - during unusual low-traffic periods that could
   indicate a problem.

2. **Statistical Unreliability**
   With low traffic volumes, the actual sampling rate can vary wildly from your
   configured rate. Consider a 10% sampling rate during a 5-minute period with
   only 5 requests: you might capture no traces at all (0% actual rate) or
   capture 2 traces (40% actual rate). Neither scenario accurately represents
   your intended 10% sampling rate, making it difficult to draw reliable
   conclusions from the data.

3. **Missed Edge Cases**
   Critical but infrequent events, such as error conditions or rare edge cases,
   might go completely unrecorded if they happen to occur during unsampled
   requests. This is particularly problematic during low-traffic periods when
   the combination of low traffic and fixed sampling rate significantly
   increases the chance of missing important events.

For services with variable or low traffic, consider these alternatives:
- Use adaptive sampling (described in next section)
- Implement conditional sampling for important events:
  
  Conditional sampling means always capturing traces for specific types of requests
  or events that are important to your business, regardless of your normal sampling
  rate. Think of it like having a VIP list - these special cases always get
  recorded, while regular traffic follows the normal sampling rules.

  Common scenarios for conditional sampling include:
  - Error cases: Always capture traces when something goes wrong (like HTTP 500
    errors or failed transactions)
  - Performance issues: Always capture traces for slow requests that exceed your
    latency thresholds
  - Business importance: Always capture traces for high-value transactions or
    critical business operations
  - Debugging: Always capture traces for specific users, features, or endpoints
    that you're actively debugging

  This approach gives you the best of both worlds: you never miss important events
  that you need to investigate, while still keeping your overall trace volume (and
  costs) under control by sampling regular traffic at a lower rate.

- Use a higher sampling rate during known low-traffic periods

### Adaptive Sampling

For more dynamic control, Clue provides an adaptive sampler that automatically
adjusts the sampling rate based on the observed request rate to maintain a target
sampling rate:

```go
// Target 100 samples per second, recalculate rate every 1000 requests
cfg := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithSampler(
        clue.AdaptiveSampler(
            100,    // Target sampling rate (samples/second)
            1000))) // Sample size for rate adjustment
```

The adaptive sampler works by:
1. Initially sampling all requests until the first sample size is reached
2. Every sample size requests (e.g., every 1000 requests), it:
   - Calculates the current request rate (requests/second)
   - Adjusts the sampling probability to achieve the target sampling rate
   - Resets its counters for the next window

For example, if your target is 100 samples/second:
- During low traffic (50 rps):
  The sampler will collect all requests since 50 < 100

- During normal traffic (500 rps):
  The sampler will collect about 20% of requests (100/500)
  to maintain the target of 100 samples/second

- During high traffic (2000 rps):
  The sampler will collect about 5% of requests (100/2000)
  to maintain the target rate

This adaptive sampling approach provides several key benefits. It maintains a
consistent sample collection rate even as traffic fluctuates throughout the day.
During quiet periods with low traffic, you get maximum visibility into your
system's behavior since all requests can be sampled. When traffic spikes, the
sampling rate automatically adjusts downward to control costs while still
providing statistically significant data. The adaptation happens smoothly as
traffic patterns change, preventing sudden drops or spikes in sampling that
could skew your analysis.

Learn more about sampling in:
- [OpenTelemetry Sampling](https://opentelemetry.io/docs/concepts/sampling/)
- [Sampling Performance Impact](https://www.jaegertracing.io/docs/1.41/sampling/#performance-overhead)
- [Adaptive Sampling Design](https://github.com/jaegertracing/jaeger/blob/main/docs/adaptive_sampling.md)

## Error Handling Best Practices

Proper error handling in traces is crucial for debugging and monitoring your
application. When something goes wrong, your traces should provide enough context
to understand what happened, why it happened, and where it happened.

### Key Principles

1. **Always Record Errors**: Every error should be captured in your traces
2. **Add Context**: Include relevant information about what led to the error
3. **Set Status**: Update the span status to reflect the error condition
4. **Preserve Privacy**: Never include sensitive data in error details
5. **Stay Organized**: Use consistent error attributes across your service

### Basic Error Recording

When handling errors in traces, there are two distinct ways to record error information:

1. **SetStatus**: Sets the overall status of the span. Can only be called once per span
   and represents the final state of the operation:
   ```go
   // Set the span's final status (can only be called once)
   span.SetStatus(codes.Error, "operation failed")
   ```

2. **RecordError**: Adds an error event to the span's timeline. Can be called multiple
   times to record different errors that occur during the span's lifetime:
   ```go
   // Record multiple errors as events (can be called many times)
   span.RecordError(err1)  // First error
   span.RecordError(err2)  // Another error later
   span.RecordError(err3)  // Yet another error
   ```

Here's how to use them together:
```go
func processWithRetries(ctx context.Context) error {
    ctx, span := tracer.Start(ctx, "process_with_retries")
    defer span.End()

    for attempt := 1; attempt <= maxRetries; attempt++ {
        err := process()
        if err != nil {
            // Record each failed attempt as an error event
            span.RecordError(err,
                trace.WithAttributes(
                    attribute.Int("attempt", attempt)))
            continue
        }
        // Operation succeeded after retries
        span.SetStatus(codes.Ok, "succeeded after retries")
        return nil
    }

    // Set final error status after all retries failed
    span.SetStatus(codes.Error, "all retries failed")
    return errors.New("max retries exceeded")
}
```

This separation between `RecordError` and `SetStatus` provides several important
benefits. First, it allows you to track every error that occurs during an
operation by recording each one as it happens using `RecordError`. Second, you can
clearly indicate the final outcome of the operation by setting its status with
`SetStatus`. Third, since errors are recorded as events with timestamps, you
maintain a clear chronological timeline of when each error occurred. Finally,
this approach lets you distinguish between temporary failures that were
recovered from and the ultimate result of the operation.

### Detailed Error Handling

For more complex scenarios, add context and categorize errors:

```go
func processRequest(ctx context.Context, req *Request) error {
    ctx, span := otel.Tracer("service").Start(ctx, "process_request")
    defer span.End()

    // Add request context that might be useful for debugging
    span.SetAttributes(
        attribute.String("request.id", req.ID),
        attribute.String("request.type", req.Type),
        attribute.String("user.id", req.UserID))

    if err := validate(req); err != nil {
        // For validation errors, include which fields failed
        span.RecordError(err,
            trace.WithAttributes(
                attribute.String("error.type", "validation"),
                attribute.String("validation.field", err.Field),
                attribute.String("validation.constraint", err.Constraint)))
        
        // Add an event to mark when the error occurred
        span.AddEvent("validation_failed",
            trace.WithAttributes(
                attribute.String("error.details", err.Error())))
        
        span.SetStatus(codes.Error, "request validation failed")
        return err
    }

    if err := process(req); err != nil {
        // For system errors, include relevant system context
        span.RecordError(err,
            trace.WithAttributes(
                attribute.String("error.type", "system"),
                attribute.String("error.component", err.Component),
                attribute.String("error.operation", err.Operation)))
        
        // For critical errors, you might want to log the stack trace
        span.AddEvent("system_error",
            trace.WithAttributes(
                attribute.String("error.stack", string(debug.Stack()))))
        
        span.SetStatus(codes.Error, "request processing failed")
        return err
    }

    // Mark successful completion
    span.SetStatus(codes.Ok, "request processed successfully")
    return nil
}
```

### Error Categories

Organize errors into categories to make analysis easier:

```go
// Common error categories
const (
    ErrorTypeValidation = "validation"  // Input validation errors
    ErrorTypeSystem     = "system"      // Internal system errors
    ErrorTypeExternal   = "external"    // External service errors
    ErrorTypeResource   = "resource"    // Resource availability errors
    ErrorTypeSecurity   = "security"    // Security-related errors
)

// Record error with category
func recordError(span trace.Span, err error, errType string) {
    span.RecordError(err,
        trace.WithAttributes(
            attribute.String("error.type", errType),
            attribute.String("error.message", err.Error())))
}

// Usage example
if err := validateInput(req); err != nil {
    recordError(span, err, ErrorTypeValidation)
    span.SetStatus(codes.Error, "validation failed")
    return err
}
```

### Error Attributes

Use consistent attribute names for error information:

```go
// Standard error attributes
span.SetAttributes(
    attribute.String("error.type", errType),       // Error category
    attribute.String("error.message", err.Error()), // Error description
    attribute.String("error.code", errCode),        // Error code if available
    attribute.String("error.component", component), // Failed component
    attribute.String("error.operation", operation), // Failed operation
    attribute.Bool("error.retryable", isRetryable), // Can be retried?
)
```

### Error Events

Use events to record error-related timestamps:

```go
// Record the error occurrence
span.AddEvent("error_detected",
    trace.WithAttributes(
        attribute.String("error.message", err.Error())))

// Record retry attempts
span.AddEvent("retry_attempt",
    trace.WithAttributes(
        attribute.Int("retry.count", retryCount),
        attribute.Int("retry.max", maxRetries)))

// Record error resolution
span.AddEvent("error_resolved",
    trace.WithAttributes(
        attribute.String("resolution", "retry_succeeded")))
```

### Best Practices

1. **Error Granularity**:
   ```go
   // Too generic
   span.RecordError(err)  // Don't do this
   
   // Better - includes context
   span.RecordError(err,
       trace.WithAttributes(
           attribute.String("error.type", errType),
           attribute.String("error.context", context)))
   ```

2. **Privacy and Security**:
   ```go
   // DON'T include sensitive data
   span.RecordError(err,
       trace.WithAttributes(
           attribute.String("user.password", password),    // NO!
           attribute.String("credit_card", cardNumber)))   // NO!
   
   // DO include safe identifiers
   span.RecordError(err,
       trace.WithAttributes(
           attribute.String("user.id", userID),           // OK
           attribute.String("transaction.id", txID)))     // OK
   ```

3. **Error Recovery**:
   ```go
   func processWithRetry(ctx context.Context) error {
       ctx, span := tracer.Start(ctx, "process_with_retry")
       defer span.End()
       
       for attempt := 1; attempt <= maxRetries; attempt++ {
           if err := process(); err != nil {
               span.AddEvent("retry_attempt",
                   trace.WithAttributes(
                       attribute.Int("attempt", attempt)))
               continue
           }
           return nil
       }
       
       span.SetStatus(codes.Error, "all retries failed")
       return errors.New("max retries exceeded")
   }
   ```

4. **Correlation with Logs**:
   ```go
   if err != nil {
       // Add trace ID to logs for correlation
       logger.Error("operation failed",
           "trace_id", span.SpanContext().TraceID(),
           "error", err)
           
       span.RecordError(err)
       span.SetStatus(codes.Error, "operation failed")
   }
   ```

### Learn More

For more information about error handling in traces:
- [OpenTelemetry Error Handling](https://opentelemetry.io/docs/concepts/signals/traces/#errors)
- [Semantic Conventions for Errors](https://opentelemetry.io/docs/concepts/semantic-conventions/exceptions/)
- [Error Status Codes](https://pkg.go.dev/go.opentelemetry.io/otel/codes)

## Best Practices

### 1. Span Naming

Use consistent, descriptive names that help identify operations:

```go
// Good span names
"http.request"              // Type + operation
"db.query.get_user"        // Component + type + operation
"payment.process_charge"    // Domain + operation

// Bad span names
"process"                  // Too vague
"handleFunc"              // Implementation detail
"do_stuff"                // Not descriptive
```

### 2. Attributes

Add useful context without overwhelming:

```go
// Good attributes
span.SetAttributes(
    attribute.String("user.id", userID),        // Identity
    attribute.String("order.status", status),   // State
    attribute.Int64("items.count", count))      // Metrics

// Bad attributes
span.SetAttributes(
    attribute.String("raw_json", hugejson),     // Too much data
    attribute.String("password", password),      // Sensitive data
    attribute.String("tmp", "xyz"))             // Not meaningful
```

### 3. Error Handling

Record errors with context:

```go
if err != nil {
    // Record error with type and context
    span.RecordError(err,
        trace.WithAttributes(
            attribute.String("error.type", errorType),
            attribute.String("error.context", context)))
    
    // Set error status with description
    span.SetStatus(codes.Error, err.Error())
    
    // Optionally add error event with timestamp
    span.AddEvent("error_occurred",
        trace.WithAttributes(
            attribute.String("error.stack", stack)))
}
```

### 4. Performance Considerations

- Use appropriate sampling rates
- Don't create spans for very small operations
- Avoid adding large attributes or events
- Consider batch processing for high-throughput scenarios

## Learn More

For more information about distributed tracing:

- [OpenTelemetry Tracing Specification](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Trace Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
- [Sampling Documentation](https://opentelemetry.io/docs/concepts/sampling/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
