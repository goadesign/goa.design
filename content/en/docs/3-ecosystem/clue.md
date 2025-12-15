---
title: "Clue"
weight: 3
description: "Microservice instrumentation for Go - logging, tracing, metrics, health checks, and debugging."
llm_optimized: true
---

Clue provides comprehensive instrumentation for Go microservices built on OpenTelemetry. While designed to integrate seamlessly with Goa, Clue works with any Go HTTP or gRPC service.

## Why Clue?

Clue solves a common problem in microservices: you need detailed logs when things go wrong, but you don't want to pay the cost of logging everything all the time.

Clue's approach: **buffer log messages in memory and only write them when an error occurs or the request is being traced**. Successful, untraced requests generate no log output. When errors happen, you get the full context of what led to the failure.

This single design decision dramatically reduces log volume while preserving the debugging information you need.

## Package Overview

| Package | Purpose |
|---------|---------|
| `clue` | OpenTelemetry configuration - one call to set up metrics and tracing |
| `log` | Context-based structured logging with smart buffering |
| `health` | Health check endpoints for Kubernetes and orchestration systems |
| `debug` | Runtime debugging - toggle debug logs, pprof endpoints |
| `mock` | Generate and configure test doubles for dependencies |
| `interceptors` | Goa interceptors for tracing individual stream messages |

## Installation

Install only the packages you need:

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## The log Package

The `log` package is built around Go's `context.Context`. You initialize a logging context once and pass it through your application. All log functions take this context as their first argument.

### Quick Start

```go
import "goa.design/clue/log"

func main() {
    // Initialize the logging context
    ctx := log.Context(context.Background())
    
    // Log a message
    log.Printf(ctx, "server starting on port %d", 8080)
    
    // Log structured key-value pairs
    log.Print(ctx, log.KV{K: "event", V: "startup"}, log.KV{K: "port", V: 8080})
}
```

### Understanding Buffering

This is Clue's key feature. There are two types of log functions:

**Immediate functions** - write directly to output:
- `Print()`, `Printf()` - always write immediately
- `Error()`, `Errorf()` - flush buffer, then write
- `Fatal()`, `Fatalf()` - flush buffer, write, then exit

**Buffered functions** - store in memory until flushed:
- `Info()`, `Infof()` - buffer the message
- `Warn()`, `Warnf()` - buffer the message  
- `Debug()`, `Debugf()` - buffer if debug enabled

The buffer flushes automatically when:
1. `Error()` or `Fatal()` is called
2. The request is being traced (detected via OpenTelemetry span context)
3. Debug mode is enabled

**Example: Why this matters**

```go
func HandleRequest(ctx context.Context, req *Request) error {
    log.Infof(ctx, "received request for user %s", req.UserID)  // buffered
    
    user, err := db.GetUser(ctx, req.UserID)
    if err != nil {
        // Error flushes the buffer - you see BOTH log lines
        log.Errorf(ctx, err, "failed to get user")
        return err
    }
    
    log.Infof(ctx, "user found: %s", user.Name)  // buffered
    
    // Request succeeds - no logs written (buffer discarded)
    return nil
}
```

For a successful request: **zero log output**. For a failed request: **full context**.

### Adding Context with With()

Build up logging context as requests flow through your service:

```go
func HandleOrder(ctx context.Context, orderID string) error {
    // Add order ID to all subsequent logs
    ctx = log.With(ctx, log.KV{K: "order_id", V: orderID})
    
    log.Info(ctx, log.KV{K: "msg", V: "processing order"})
    // Output includes: order_id=abc123 msg="processing order"
    
    return processPayment(ctx)
}

func processPayment(ctx context.Context) error {
    // order_id is already in context
    log.Info(ctx, log.KV{K: "msg", V: "charging card"})
    // Output includes: order_id=abc123 msg="charging card"
    return nil
}
```

### Key-Value Pairs

Two ways to specify key-value pairs:

```go
// KV - deterministic order, slice-backed
log.Print(ctx,
    log.KV{K: "user", V: "alice"},
    log.KV{K: "action", V: "login"},
    log.KV{K: "ip", V: "192.168.1.1"},
)

// Fields - map-backed, order not guaranteed
log.Print(ctx, log.Fields{
    "user":   "alice",
    "action": "login",
    "ip":     "192.168.1.1",
})
```

Use `KV` when log field order matters (easier to scan). Use `Fields` when it doesn't.

Values can be: strings, numbers, booleans, nil, or slices of these types.

### Log Formats

Clue auto-detects terminals and selects the appropriate format:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (default for non-terminals) - logfmt style:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (default for terminals) - colored, relative timestamps:
```
INFO[0042] user=alice action=login
```

**FormatJSON** - structured JSON:
```json
{"time":"2024-01-15T10:30:00Z","level":"info","user":"alice","action":"login"}
```

**Custom format:**

```go
func myFormat(e *log.Entry) []byte {
    return []byte(fmt.Sprintf("[%s] %v\n", e.Severity, e.KeyVals))
}

ctx := log.Context(context.Background(), log.WithFormat(myFormat))
```

### Adding Trace and Span IDs

Connect logs to distributed traces:

```go
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON),
    log.WithFunc(log.Span),  // Adds trace_id and span_id to every log
)
```

Output:
```json
{"time":"...","level":"info","trace_id":"abc123","span_id":"def456","msg":"hello"}
```

### Adding File Location

For debugging, add source file and line numbers:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

Output includes: `file=mypackage/handler.go:42`

### HTTP Middleware

The HTTP middleware does two things:
1. Copies the logger from your base context into each request's context
2. Logs request start/end with method, URL, status, and duration

```go
func main() {
    ctx := log.Context(context.Background())
    
    handler := http.HandlerFunc(myHandler)
    handler = log.HTTP(ctx)(handler)  // Note: returns middleware, then apply
    
    http.ListenAndServe(":8080", handler)
}
```

**Options:**

```go
// Skip logging for certain paths (e.g., health checks)
handler = log.HTTP(ctx, log.WithPathFilter(regexp.MustCompile(`^/healthz$`)))(handler)

// Disable request logging entirely (still sets up context)
handler = log.HTTP(ctx, log.WithDisableRequestLogging())(handler)

// Disable request ID generation
handler = log.HTTP(ctx, log.WithDisableRequestID())(handler)
```

### gRPC Interceptors

For gRPC servers:

```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(log.UnaryServerInterceptor(ctx)),
    grpc.ChainStreamInterceptor(log.StreamServerInterceptor(ctx)),
)
```

For gRPC clients:

```go
conn, err := grpc.Dial(addr,
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(log.StreamClientInterceptor()),
)
```

### HTTP Client Logging

Wrap HTTP transports to log outgoing requests:

```go
client := &http.Client{
    Transport: log.Client(http.DefaultTransport),
}

// With OpenTelemetry tracing
client := &http.Client{
    Transport: log.Client(
        otelhttp.NewTransport(http.DefaultTransport),
    ),
}
```

### Goa Integration

Add service and method names to logs:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

### Customizing Log Keys

All log keys are package variables you can override:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

### Adapter for Other Loggers

```go
// Standard library log.Logger compatible
stdLogger := log.AsStdLogger(ctx)

// AWS SDK logger
awsLogger := log.AsAWSLogger(ctx)

// logr.LogSink (for Kubernetes controllers, etc.)
sink := log.ToLogrSink(ctx)

// Goa middleware logger
goaLogger := log.AsGoaMiddlewareLogger(ctx)
```

---

## The clue Package

The `clue` package configures OpenTelemetry with sensible defaults in a single function call.

### Basic Setup

```go
import (
    "goa.design/clue/clue"
    "goa.design/clue/log"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
)

func main() {
    ctx := log.Context(context.Background())
    
    // Create exporters
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
        otlpmetricgrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    
    // Configure OpenTelemetry
    cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
    if err != nil {
        log.Fatal(ctx, err)
    }
    clue.ConfigureOpenTelemetry(ctx, cfg)
}
```

### Adaptive Sampling

Clue includes an adaptive sampler that automatically adjusts the sampling rate based on traffic volume. This prevents trace storage from being overwhelmed during traffic spikes.

Default settings:
- **Max sampling rate:** 2 traces per second
- **Sample size:** 10 requests between adjustments

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

### Helper Exporter Functions

Clue provides helper functions that create exporters with proper shutdown handling:

```go
// gRPC exporters
metricExporter, shutdown, err := clue.NewGRPCMetricExporter(ctx,
    otlpmetricgrpc.WithEndpoint("localhost:4317"))
defer shutdown()

spanExporter, shutdown, err := clue.NewGRPCSpanExporter(ctx,
    otlptracegrpc.WithEndpoint("localhost:4317"))
defer shutdown()

// HTTP exporters
metricExporter, shutdown, err := clue.NewHTTPMetricExporter(ctx,
    otlpmetrichttp.WithEndpoint("localhost:4318"))
defer shutdown()

spanExporter, shutdown, err := clue.NewHTTPSpanExporter(ctx,
    otlptracehttp.WithEndpoint("localhost:4318"))
defer shutdown()
```

### Configuration Options

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),
    clue.WithSampleSize(50),
    clue.WithReaderInterval(30 * time.Second),  // Metric export interval
    clue.WithPropagators(propagation.TraceContext{}),  // Custom propagators
    clue.WithResource(resource.NewWithAttributes(...)),  // Additional resource attributes
    clue.WithErrorHandler(myErrorHandler),
)
```

### Disabling Metrics or Tracing

Pass `nil` for the exporter you don't need:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## The health Package

The `health` package creates health check endpoints that report on service dependencies.

### Basic Usage

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

### Checking Dependencies

Use `NewPinger` to check services that expose health endpoints:

```go
checker := health.NewChecker(
    health.NewPinger("database-service", "db.internal:8080"),
    health.NewPinger("cache-service", "cache.internal:8080"),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https")),
)
```

**Pinger options:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

### Custom Health Checks

Implement the `Pinger` interface for custom checks:

```go
type DBChecker struct {
    db *sql.DB
}

func (c *DBChecker) Name() string {
    return "postgresql"
}

func (c *DBChecker) Ping(ctx context.Context) error {
    return c.db.PingContext(ctx)
}

// Usage
checker := health.NewChecker(&DBChecker{db: db})
```

### Response Format

The handler returns JSON by default, XML if requested:

**Healthy (HTTP 200):**
```json
{
    "uptime": 3600,
    "version": "abc123",
    "status": {
        "postgresql": "OK",
        "redis": "OK"
    }
}
```

**Unhealthy (HTTP 503):**
```json
{
    "uptime": 3600,
    "version": "abc123",
    "status": {
        "postgresql": "OK",
        "redis": "NOT OK"
    }
}
```

Set the version at build time:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## The debug Package

The `debug` package enables runtime troubleshooting without redeployment.

### Dynamic Debug Logging

Mount an endpoint to toggle debug logs at runtime:

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Control debug logs via HTTP:

```bash
# Check current state
curl http://localhost:8080/debug
# {"debug-logs":"off"}

# Enable debug logging
curl "http://localhost:8080/debug?debug-logs=on"
# {"debug-logs":"on"}

# Disable debug logging
curl "http://localhost:8080/debug?debug-logs=off"
# {"debug-logs":"off"}
```

**Important:** The endpoint only controls a flag. You must use the debug middleware for it to take effect:

```go
// For HTTP servers
handler = debug.HTTP()(handler)

// For gRPC servers
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(debug.UnaryServerInterceptor()),
    grpc.ChainStreamInterceptor(debug.StreamServerInterceptor()),
)
```

**Options:**

```go
debug.MountDebugLogEnabler(mux,
    debug.WithPath("/api/debug"),     // Default: "/debug"
    debug.WithQuery("logging"),        // Default: "debug-logs"
    debug.WithOnValue("enable"),       // Default: "on"
    debug.WithOffValue("disable"),     // Default: "off"
)
```

### pprof Endpoints

Mount Go's profiling endpoints:

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Available endpoints:
- `/debug/pprof/` - Index page
- `/debug/pprof/heap` - Heap profile
- `/debug/pprof/goroutine` - Goroutine profile
- `/debug/pprof/profile` - CPU profile (30s by default)
- `/debug/pprof/trace` - Execution trace
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, etc.

⚠️ **Security warning:** Don't expose pprof endpoints publicly. They reveal sensitive information about your application.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Payload Logging for Goa

Log request and response payloads when debug is enabled:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())  // Only logs when debug enabled
endpoints.Use(log.Endpoint)
```

**Options:**

```go
debug.LogPayloads(
    debug.WithMaxSize(2048),  // Max bytes to log, default: 1024
    debug.WithFormat(debug.FormatJSON),  // Custom formatter
    debug.WithClient(),  // Prefix keys with "client-" for client-side logging
)
```

### Goa Muxer Adapter

For Goa's HTTP muxer:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## The mock Package

The `mock` package helps create test doubles for dependencies with support for call sequences and permanent mocks.

### Concepts

**Sequences:** Define expected calls in order. Each call to `Next()` returns the next function in the sequence.

**Permanent mocks:** Always return the same function, used after sequences are exhausted or when order doesn't matter.

### Creating a Mock

```go
type MockUserService struct {
    *mock.Mock
    t *testing.T
}

func NewMockUserService(t *testing.T) *MockUserService {
    return &MockUserService{mock.New(), t}
}

func (m *MockUserService) GetUser(ctx context.Context, id string) (*User, error) {
    if f := m.Next("GetUser"); f != nil {
        return f.(func(context.Context, string) (*User, error))(ctx, id)
    }
    m.t.Error("unexpected GetUser call")
    return nil, errors.New("unexpected call")
}

func (m *MockUserService) AddGetUser(f func(context.Context, string) (*User, error)) {
    m.Add("GetUser", f)
}

func (m *MockUserService) SetGetUser(f func(context.Context, string) (*User, error)) {
    m.Set("GetUser", f)
}
```

### Using Mocks in Tests

```go
func TestOrderService(t *testing.T) {
    userMock := NewMockUserService(t)
    
    // Add sequence: first call returns user, second returns error
    userMock.AddGetUser(func(ctx context.Context, id string) (*User, error) {
        return &User{ID: id, Name: "Alice"}, nil
    })
    userMock.AddGetUser(func(ctx context.Context, id string) (*User, error) {
        return nil, errors.New("not found")
    })
    
    svc := NewOrderService(userMock)
    
    // First call succeeds
    _, err := svc.CreateOrder(ctx, "user1", items)
    require.NoError(t, err)
    
    // Second call fails
    _, err = svc.CreateOrder(ctx, "user2", items)
    require.Error(t, err)
    
    // Verify all expected calls were made
    if userMock.HasMore() {
        t.Error("not all expected calls were made")
    }
}
```

### Permanent Mocks

Use `Set()` for calls that should always behave the same:

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Sequences take precedence over permanent mocks. Once the sequence is exhausted, `Next()` returns the permanent mock.

### Mock Generator (cmg)

Generate mocks automatically from interfaces:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

Generated mocks go in a `mocks/` subdirectory alongside the source file.

---

## The interceptors Package

The `interceptors` package provides Goa interceptors for tracing individual messages in streaming RPCs. Unlike standard OpenTelemetry instrumentation (which traces the entire stream), these interceptors propagate trace context through each message.

### When to Use

Use these interceptors when you need:
- Per-message tracing in long-running streams
- Trace context to flow from client to server through stream messages
- Individual message timing and correlation

### Design Setup

In your Goa design, define interceptors with `TraceMetadata` attributes:

```go
var TraceBidirectionalStream = Interceptor("TraceBidirectionalStream", func() {
    WriteStreamingPayload(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    ReadStreamingPayload(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    WriteStreamingResult(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    ReadStreamingResult(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
})
```

Apply to streaming methods:

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### Implementation

In your interceptor implementations, call the provided functions:

```go
import "goa.design/clue/interceptors"

// Client-side
func (i *ClientInterceptors) TraceBidirectionalStream(
    ctx context.Context,
    info *genservice.TraceBidirectionalStreamInfo,
    next goa.Endpoint,
) (any, error) {
    return interceptors.TraceBidirectionalStreamClient(ctx, info, next)
}

// Server-side
func (i *ServerInterceptors) TraceBidirectionalStream(
    ctx context.Context,
    info *genservice.TraceBidirectionalStreamInfo,
    next goa.Endpoint,
) (any, error) {
    return interceptors.TraceBidirectionalStreamServer(ctx, info, next)
}
```

### Extracting Trace Context from Received Messages

Since Goa's generated stream interfaces don't return a context, use the helper functions:

```go
func (s *Service) Chat(ctx context.Context, stream genservice.ChatServerStream) error {
    for {
        ctx = interceptors.SetupTraceStreamRecvContext(ctx)
        msg, err := stream.RecvWithContext(ctx)
        if err != nil {
            return err
        }
        ctx = interceptors.GetTraceStreamRecvContext(ctx)
        
        // ctx now contains trace context from the received message
        log.Info(ctx, log.KV{K: "received", V: msg.Text})
    }
}
```

Or use the wrapper for cleaner code:

```go
wrapped := interceptors.WrapTraceBidirectionalStreamServerStream(stream)

for {
    ctx, msg, err := wrapped.RecvAndReturnContext(ctx)
    if err != nil {
        return err
    }
    // ctx contains trace context
}
```

---

## Complete Example

A fully instrumented Goa service:

```go
package main

import (
    "context"
    "net/http"
    
    "goa.design/clue/clue"
    "goa.design/clue/debug"
    "goa.design/clue/health"
    "goa.design/clue/log"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    
    genservice "myapp/gen/myservice"
)

func main() {
    // 1. Initialize logging context with trace correlation
    ctx := log.Context(context.Background(),
        log.WithFormat(log.FormatJSON),
        log.WithFunc(log.Span))
    
    // 2. Configure OpenTelemetry
    spanExporter, _ := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
    metricExporter, _ := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
    cfg, _ := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)
    
    // 3. Create service and endpoints
    svc := NewService()
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())  // Log payloads when debug enabled
    endpoints.Use(log.Endpoint)          // Add service/method to logs
    
    // 4. Create HTTP handler with middleware stack
    handler := genservice.NewHandler(endpoints)
    handler = otelhttp.NewHandler(handler, "myservice")  // OpenTelemetry
    handler = debug.HTTP()(handler)                       // Debug log control
    handler = log.HTTP(ctx)(handler)                      // Request logging
    
    // 5. Mount on mux
    mux := http.NewServeMux()
    mux.Handle("/", handler)
    
    // 6. Mount operational endpoints
    debug.MountDebugLogEnabler(mux)
    debug.MountPprofHandlers(mux)
    mux.Handle("/healthz", health.Handler(
        health.NewChecker(
            health.NewPinger("database", dbAddr),
        ),
    ))
    
    // 7. Start server
    log.Printf(ctx, "starting server on :8080")
    http.ListenAndServe(":8080", mux)
}
```

---

## Best Practices

### Logging

1. **Use `Info()` for request processing, `Print()` for lifecycle events.** Request logs should buffer; startup/shutdown logs should write immediately.

2. **Add context early, log late.** Use `log.With()` to add IDs and metadata as soon as you have them.

3. **Always add trace correlation.** Use `log.WithFunc(log.Span)` so logs can be correlated with traces.

### Health Checks

1. **Check real dependencies.** Don't just return 200. Verify database connections, downstream services.

2. **Use timeouts.** A health check that hangs is worse than one that fails.

3. **Separate liveness and readiness.** Use `/livez` for basic process health, `/readyz` for full dependency checks.

### Debugging

1. **Never expose pprof publicly.** Use a separate internal port or network policy.

2. **Design for debug toggling.** Structure logging so debug mode reveals useful information without overwhelming.

---

## See Also

- [Production Guide](../../1-goa/production/) — Production deployment patterns
- [Clue GitHub Repository](https://github.com/goadesign/clue) — Source code and weather example
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) — OpenTelemetry concepts
