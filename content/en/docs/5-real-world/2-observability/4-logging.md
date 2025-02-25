---
title: "Logging"
description: "Configuring logging with Clue"
weight: 4
---

# Logging Strategy

While OpenTelemetry is the primary source of observability in Clue, logs still
play an important role in certain scenarios. Clue provides a smart logging
system that efficiently buffers and formats log messages, helping you maintain
visibility while controlling costs and performance.

## Key Features

1. **Smart Buffering**:
   Clue's smart buffering system helps optimize logging costs and performance.
   It buffers non-error logs in memory until an error occurs, at which point it
   flushes the buffer to provide full context around the error. For traced
   requests, logs are automatically flushed to ensure complete visibility of the
   request lifecycle. The system also provides manual flush control when you
   need to force log output in specific scenarios. To maintain flexibility,
   buffering behavior can be configured based on the context, allowing you to
   adapt logging patterns to different situations.

2. **Structured Logging**:
   Clue uses structured logging to make logs more useful and maintainable. All
   log fields are stored as key-value pairs, ensuring they can be easily parsed
   and analyzed by logging tools. The consistent formatting across all logs
   improves integration with monitoring and analysis systems. Logs can be output
   in different formats like JSON or plain text depending on your environment's
   needs. Additionally, context-based fields are automatically included to
   correlate logs with request traces, making it easier to debug issues across
   your distributed system.

3. **Performance**:
   Clue's logging system is designed with performance in mind. It uses efficient
   buffering techniques to minimize I/O overhead and employs smart memory
   management to keep allocation overhead low. The system can be configured to
   output logs differently based on your environment's needs. You can also
   control log volume through conditional logging, ensuring you only generate
   the logs you need.

## Basic Setup

The logger needs to be configured before use. Here's how to set up a logger with common options:

```go
// Create logger context with options
ctx := log.Context(context.Background(),
    // Include span IDs in logs for correlation with traces
    log.WithFunc(log.Span),

    // Use JSON format for machine readability
    log.WithFormat(log.FormatJSON),

    // Send logs to standard output
    log.WithOutput(os.Stdout),

    // Disable buffering when request is being traced
    log.WithDisableBuffering(log.IsTracing))

// Add common fields that will be included in all logs
ctx = log.With(ctx, 
    log.KV{"service", "myservice"},  // Service name for filtering
    log.KV{"env", "production"})     // Environment for context
```

This configuration establishes a robust logging foundation for your service. By
including span IDs in the logs, you can easily correlate log entries with
distributed traces, giving you a complete picture of request flows through your
system. The JSON formatting ensures your logs can be efficiently processed by
log aggregation and analysis tools.

For local development convenience, logs are directed to standard output where
they can be easily viewed in the terminal. The smart buffering system
automatically adjusts based on whether a request is being traced, optimizing for
both performance and observability. 

Finally, the setup includes common fields that will be added to every log entry,
providing consistent context for filtering and analysis. These fields, like
service name and environment, make it simple to identify the source and context
of each log entry when investigating issues.

## Log Levels

Clue supports four severity levels, each serving a specific purpose and following different buffering rules:

```go
// Debug level - for detailed troubleshooting
// Only emitted when debug mode is enabled via WithDebug
log.Debug(ctx, "request details",
    log.KV{"headers", req.Headers},
    log.KV{"body_size", len(req.Body)})

// Info level - for normal operations
// These logs are buffered by default and flushed on errors
log.Info(ctx, "processing request",
    log.KV{"requestID", req.ID},
    log.KV{"method", req.Method})

// Warn level - for potential issues
// These logs indicate problems that don't prevent operation
log.Warn(ctx, "resource usage high",
    log.KV{"cpu_usage", cpuUsage},
    log.KV{"memory_usage", memUsage})

// Error level - for failure conditions
// These logs are written immediately and flush the buffer
log.Error(ctx, err, "request failed",
    log.KV{"requestID", req.ID},
    log.KV{"status", http.StatusInternalServerError})

// Fatal level - for unrecoverable errors
// These logs cause the program to exit after logging
log.Fatal(ctx, err, "cannot start server",
    log.KV{"port", config.Port},
    log.KV{"error", err.Error()})
```

Each level also has a corresponding formatted version that accepts printf-style formatting:

```go
// Debug with formatting
log.Debugf(ctx, "processing item %d of %d", current, total)

// Info with formatting
log.Infof(ctx, "request completed in %dms", duration.Milliseconds())

// Warn with formatting
log.Warnf(ctx, "high latency detected: %dms", latency.Milliseconds())

// Error with formatting and error object
log.Errorf(ctx, err, "failed to process request: %s", req.ID)

// Fatal with formatting and error object
log.Fatalf(ctx, err, "failed to initialize: %s", component)
```

Best practices for log levels:

1. **DEBUG** (SeverityDebug):
   - Use for detailed troubleshooting information
   - Only emitted when debug mode is enabled
   - Ideal for development and debugging sessions
   - Can include detailed request/response data

2. **INFO** (SeverityInfo):
   - Use for normal operations that need to be audited
   - Buffered by default to optimize performance
   - Record significant but expected events
   - Include business-relevant information

3. **WARN** (SeverityWarn):
   - Use for potentially harmful situations
   - Indicate problems that don't prevent operation
   - Highlight approaching resource limits
   - Flag deprecated feature usage

4. **ERROR** (SeverityError):
   - Use for any error condition that needs attention
   - Automatically flushes the log buffer
   - Include error details and context
   - Add stack traces when available

5. **FATAL** (SeverityError + Exit):
   - Use only for unrecoverable errors
   - Causes the program to exit with status 1
   - Include all relevant context for post-mortem
   - Use sparingly - most errors should be recoverable

Special behaviors:
- Debug logs are only emitted when debug mode is enabled
- Info logs are buffered by default
- Warn logs indicate issues that need attention
- Error logs flush the buffer and disable buffering
- Fatal logs are like Error but also exit the program

Color coding (when using terminal format):
- Debug: Gray (37m)
- Info: Blue (34m)
- Warn: Yellow (33m)
- Error/Fatal: Bright Red (1;31m)

## Structured Logging

Structured logging makes it easier to parse and analyze logs. Here are different ways to structure your logs:

```go
// Using log.KV for ordered key-value pairs
// This is the preferred method as it maintains field order
log.Print(ctx,
    log.KV{"action", "user_login"},      // What happened
    log.KV{"user_id", user.ID},          // Who it happened to
    log.KV{"ip", req.RemoteAddr},        // Additional context
    log.KV{"duration_ms", duration.Milliseconds()})  // Performance data

// Using log.Fields for map-style logging
// Useful when working with existing maps of data
log.Print(ctx, log.Fields{
    "action":     "user_login",
    "user_id":    user.ID,
    "ip":         req.RemoteAddr,
    "duration_ms": duration.Milliseconds(),
})

// Adding context fields that will be included in all subsequent logs
// Useful for request-scoped information
ctx = log.With(ctx,
    log.KV{"tenant", tenant.ID},     // Multi-tenant context
    log.KV{"region", "us-west"},     // Geographic context
    log.KV{"request_id", reqID})     // Request correlation
```

Best practices for structured logging:
- Use consistent field names across your application
- Include relevant context without overwhelming detail
- Group related fields logically
- Consider log parsing and analysis when choosing field names

## Output Formats

Choose an output format that matches your environment and tools:

```go
// Plain text format (logfmt)
// Best for local development and human readability
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatText))
// Output: time=2024-02-24T12:34:56Z level=info msg="hello world"

// Terminal format with colors
// Great for local development and debugging
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatTerminal))
// Output: INFO[0000] msg="hello world"

// JSON format
// Best for production and log aggregation systems
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON))
// Output: {"time":"2024-02-24T12:34:56Z","level":"info","msg":"hello world"}

// Custom format
// Use when you need special formatting
ctx := log.Context(context.Background(),
    log.WithFormat(func(entry *log.Entry) []byte {
        return []byte(fmt.Sprintf("[%s] %s: %s\n",
            entry.Time.Format(time.RFC3339),
            entry.Level,
            entry.Message))
    }))
```

When choosing a log format, consider your environment and requirements
carefully. Development environments often benefit from human-readable formats
with colors and formatting, while production deployments typically need
machine-parseable formats like JSON for log aggregation systems. The format you
choose should balance human readability with the needs of your log processing
pipeline. Additionally, consider the performance impact of your chosen format -
while JSON provides rich structure, it has more processing overhead than simple
text formats.

## HTTP Middleware

Add logging to HTTP handlers to track requests and responses:

```go
// Basic logging middleware
// Automatically logs request start/end and duration
handler = log.HTTP(ctx)(handler)

// Custom middleware with detailed logging
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Log request details at start
        log.Info(ctx, "request started",
            log.KV{"method", r.Method},
            log.KV{"path", r.URL.Path},
            log.KV{"user_agent", r.UserAgent()})
            
        start := time.Now()
        sw := &statusWriter{ResponseWriter: w}
        
        next.ServeHTTP(sw, r)
        
        // Log response details and duration
        log.Info(ctx, "request completed",
            log.KV{"status", sw.status},
            log.KV{"duration_ms", time.Since(start).Milliseconds()},
            log.KV{"bytes_written", sw.written})
    })
}
```

This middleware provides comprehensive logging capabilities for your HTTP
services. It automatically correlates requests with their corresponding
responses, allowing you to track the complete lifecycle of each request. Timing
information is captured to help identify performance bottlenecks and track
response latencies. The middleware also monitors status codes, making it easy to
detect and investigate errors or unexpected responses. Through error detection,
you can quickly identify and debug issues in your service. Additionally, the
performance metrics gathered by the middleware give you valuable insights into
your service's behavior and help you optimize its performance.

## gRPC Interceptors

Add logging to gRPC services for consistent observability:

```go
// Server-side unary interceptor
// Logs each RPC call with method and duration
svr := grpc.NewServer(
    grpc.UnaryInterceptor(log.UnaryServerInterceptor(ctx)))

// Server-side stream interceptor
// Logs stream lifecycle events
svr := grpc.NewServer(
    grpc.StreamInterceptor(log.StreamServerInterceptor(ctx)))

// Client-side interceptors
// Log outgoing RPCs for debugging
conn, err := grpc.DialContext(ctx,
    "localhost:8080",
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()))
```

These interceptors provide comprehensive logging capabilities for your gRPC
services. Each RPC method name is automatically logged, allowing you to track
which endpoints are being called. The interceptors monitor status codes returned
by your services, making it easy to identify successful calls versus failures.
They measure the duration of each RPC call, helping you understand performance
characteristics and identify slow requests. When errors occur, they are
automatically logged with relevant context to aid debugging. The interceptors
also capture metadata associated with each call, providing additional context
about the RPC invocation such as authentication tokens or correlation IDs.

## Standard Logger Compatibility

Use Clue's logger with standard library compatible code:

```go
// Create a standard logger that uses Clue's logging system
logger := log.AsStdLogger(ctx)

// Use standard log package functions
logger.Print("hello world")               // Basic logging
logger.Printf("hello %s", "world")        // Format string
logger.Println("hello world")             // With newline

// Fatal logging functions
logger.Fatal("fatal error")               // Log and exit
logger.Fatalf("fatal: %v", err)           // Format and exit
logger.Fatalln("fatal error")             // With newline
```

The compatibility layer provides several important benefits for teams adopting
Clue's logging system. It enables seamless integration with existing codebases
that rely on the standard library logger, allowing teams to maintain
functionality while transitioning to Clue. This makes it possible to gradually
migrate different parts of an application to structured logging without
disrupting operations.

The layer ensures consistent log handling across both new and legacy code paths,
maintaining a unified logging experience. All logs, whether from modern or
legacy components, flow through the same pipeline and receive the same
formatting and processing. Additionally, by maintaining compatibility with Go's
standard library logging interface, teams can continue using familiar logging
patterns while gaining the advanced features of Clue's logging system.

## Goa Integration

Use Clue's logger with Goa services:

```go
// Create a Goa middleware compatible logger
logger := log.AsGoaMiddlewareLogger(ctx)

// Use logger in Goa service
svc := myservice.New(logger)

// Add logging middleware to all endpoints
endpoints := genmyservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)
```

Integrating Clue's logging with Goa provides several important benefits for your
service. The integration ensures consistent logging patterns across all your
services, making it easier to monitor and debug your entire system. Through
automatic context propagation, logs maintain their relationship with requests as
they flow through different service components.

The integration automatically handles logging of requests and responses, giving
you visibility into the data flowing through your APIs. When errors occur, they
are automatically tracked and logged with appropriate context and stack traces.
This makes troubleshooting much more efficient.

Additionally, the integration includes built-in performance monitoring
capabilities. It tracks important metrics like request duration and helps you
identify performance bottlenecks in your services. This comprehensive approach
to logging and monitoring helps teams maintain reliable and performant services.

## Best Practices

1. **Log Levels**:
   - Use INFO for normal operations that need to be audited
   - Use DEBUG for detailed information needed during troubleshooting
   - Use WARN for potentially harmful situations that don't prevent operation
   - Use ERROR for any error condition that needs attention
   - Use FATAL only for unrecoverable errors that prevent operation

2. **Structured Data**:
   - Always use structured logging with consistent field names
   - Include relevant context without overwhelming detail
   - Use appropriate data types for values
   - Avoid logging sensitive information

3. **Performance**:
   - Leverage buffering for non-error logs
   - Use appropriate log levels to control volume
   - Monitor log volume and storage costs
   - Configure retention policies based on needs

4. **Context**:
   - Always propagate context through your application
   - Add relevant fields at each layer
   - Include correlation IDs for request tracking
   - Maintain consistency in field names

## Learn More

For more information about logging:

- [Clue Log Package](https://pkg.go.dev/goa.design/clue/log)
  Complete documentation of Clue's logging capabilities

- [Go Logger Interface](https://pkg.go.dev/log)
  Standard library logging interface documentation