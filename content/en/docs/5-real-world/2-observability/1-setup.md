---
title: "Basic Setup"
description: "Setting up Clue and OpenTelemetry"
weight: 1
---

Setting up observability in a Goa service involves configuring Clue and
OpenTelemetry. This guide walks through the essential setup steps.

## Prerequisites

First, add the required dependencies to your `go.mod`:

```go
require (
	goa.design/clue
	go.opentelemetry.io/otel 
	go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc 
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc 
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp 
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
)
```

These packages provide:
- `clue`: Goa's observability toolkit
- `otel`: OpenTelemetry core functionality
- `otlpmetricgrpc` and `otlptracegrpc`: OTLP exporters for sending telemetry data
- `otelhttp` and `otelgrpc`: Auto-instrumentation for HTTP and gRPC

## 1. Logger Context

The logger context is the foundation of your observability setup. It carries configuration
and correlation IDs throughout your application:

```go
// Configure logger format based on environment
format := log.FormatJSON
if log.IsTerminal() {
	format = log.FormatTerminal  // Human-readable format for development
}

// Create base context with formatting and span tracking
ctx := log.Context(context.Background(),
	log.WithFormat(format),      // Set output format
	log.WithFunc(log.Span))      // Include trace/span IDs in logs

// Enable debug logging if needed
if *debugf {
	ctx = log.Context(ctx, log.WithDebug())
	log.Debugf(ctx, "debug logs enabled")
}

// Add service information
ctx = log.With(ctx, 
	log.KV{"service", serviceName},
	log.KV{"version", version},
	log.KV{"env", environment})
```

The logger context provides:
- Consistent structured logging across your service
- Automatic correlation between logs and traces
- Environment-aware formatting (JSON in production, readable in development)
- Debug log level control
- Common fields for all log entries

## 2. OpenTelemetry Configuration

OpenTelemetry setup involves creating exporters and configuring global providers:

```go
// Create OTLP exporters for sending telemetry to a collector
spanExporter, err := otlptracegrpc.New(ctx,
	otlptracegrpc.WithEndpoint(*coladdr),
	otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
if err != nil {
	log.Fatalf(ctx, err, "failed to initialize tracing")
}
defer func() {
	ctx := log.Context(context.Background())
	if err := spanExporter.Shutdown(ctx); err != nil {
		log.Errorf(ctx, err, "failed to shutdown tracing")
	}
}()

metricExporter, err := otlpmetricgrpc.New(ctx,
	otlpmetricgrpc.WithEndpoint(*coladdr),
	otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
if err != nil {
	log.Fatalf(ctx, err, "failed to initialize metrics")
}
defer func() {
	ctx := log.Context(context.Background())
	if err := metricExporter.Shutdown(ctx); err != nil {
		log.Errorf(ctx, err, "failed to shutdown metrics")
	}
}()

// Initialize Clue with the exporters
cfg, err := clue.NewConfig(ctx,
	serviceName,
	version,
	metricExporter,
	spanExporter,
	clue.WithResourceAttributes(map[string]string{
		"environment": environment,
		"region":     region,
	}))
if err != nil {
	log.Fatalf(ctx, err, "failed to initialize observability")
}
clue.ConfigureOpenTelemetry(ctx, cfg)
```

This configuration sets up the core OpenTelemetry infrastructure for your
service. It creates exporters that send your telemetry data to a collector for
processing and storage. The configuration also ensures proper shutdown handling
to avoid data loss when your service terminates. Resource attributes like
environment and region are added to help organize and filter your telemetry data
effectively. Finally, it initializes the global OpenTelemetry providers that
enable tracing and metrics collection throughout your application.

## 3. HTTP and gRPC Setup

For HTTP services, wrap your handlers with observability middleware:

```go
// Create Goa HTTP muxer
mux := goahttp.NewMuxer()

// Mount debug endpoints
debug.MountDebugLogEnabler(debug.Adapt(mux))  // Dynamic log level control
debug.MountPprofHandlers(debug.Adapt(mux))    // Go profiling endpoints

// Add middleware in correct order (inside to out):
handler := otelhttp.NewHandler(mux, serviceName)  // 3. OpenTelemetry
handler = debug.HTTP()(handler)                   // 2. Debug endpoints
handler = log.HTTP(ctx)(handler)                  // 1. Request logging

// Create server with the instrumented handler
server := &http.Server{
	Addr:         *httpAddr,
	Handler:      handler,
	ReadTimeout:  15 * time.Second,
	WriteTimeout: 15 * time.Second,
}
```

For gRPC services, use interceptors:

```go
// Create gRPC client connection with observability
conn, err := grpc.DialContext(ctx, *serverAddr,
	grpc.WithTransportCredentials(insecure.NewCredentials()),
	grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
	grpc.WithStatsHandler(otelgrpc.NewClientHandler()))

// Create gRPC server with observability
srv := grpc.NewServer(
	grpc.UnaryInterceptor(log.UnaryServerInterceptor()),
	grpc.StatsHandler(otelgrpc.NewServerHandler()))
```

The middleware/interceptors provide:
- Distributed tracing for all requests
- Request/response logging
- Dynamic log level control
- Performance profiling endpoints

## 4. Health Checks

Health checks help monitor your service and its dependencies. Clue provides two
main interfaces for implementing health checks:

### The Pinger Interface

The `Pinger` interface defines how to check the health of a single dependency:

```go
type Pinger interface {
    // Name returns the name of the remote service
    Name() string
    
    // Ping checks if the service is healthy
    Ping(context.Context) error
}
```

Clue provides a default HTTP-based implementation that pings a health check endpoint:

```go
// Create a pinger for a database service
dbPinger := health.NewPinger("database", "db:8080",
    health.WithScheme("https"),           // Use HTTPS (default: http)
    health.WithPath("/health"))           // Custom path (default: /livez)

// Create a pinger for Redis
redisPinger := health.NewPinger("redis", "redis:6379",
    health.WithPath("/ping"))             // Redis health endpoint
```

You can also implement custom pingers for special cases:

```go
type CustomPinger struct {
    name string
    db   *sql.DB
}

func (p *CustomPinger) Name() string { return p.name }

func (p *CustomPinger) Ping(ctx context.Context) error {
    return p.db.PingContext(ctx)
}
```

### The Checker Interface

The `Checker` interface aggregates multiple pingers and provides overall health status:

```go
type Checker interface {
    // Check returns the health status of all dependencies
    Check(context.Context) (*Health, bool)
}

// Health contains detailed status information
type Health struct {
    Uptime  int64             // Service uptime in seconds
    Version string            // Service version
    Status  map[string]string // Status of each dependency
}
```

Create a checker with multiple dependencies:

```go
// Create health checker with multiple pingers
checker := health.NewChecker(
    health.NewPinger("database", *dbAddr),
    health.NewPinger("cache", *cacheAddr),
    health.NewPinger("search", *searchAddr),
    &CustomPinger{name: "custom", db: db},
)

// Create HTTP handler from checker
check := health.Handler(checker)

// Add logging to health checks
check = log.HTTP(ctx)(check).(http.HandlerFunc)

// Mount health endpoints (often on separate port)
http.Handle("/healthz", check)  // Kubernetes liveness probe
http.Handle("/livez", check)    // Kubernetes readiness probe
```

### Health Check Response

The health check endpoint returns a JSON response with detailed status:

```json
{
    "uptime": 3600,           // Seconds since service start
    "version": "1.0.0",       // Service version
    "status": {              // Status of each dependency
        "database": "OK",
        "cache": "OK",
        "search": "NOT OK"    // Failed dependency
    }
}
```

The response code is:
- `200` if all dependencies are healthy
- `503` if any dependency is unhealthy

### Best Practices

1. **Separate Port**: Run health checks on a different port to:
   - Prevent interference with application traffic
   - Prevent interference with other observability constructs
   - Allow different security policies

```go
// Create main application server
appServer := &http.Server{
    Addr:    *httpAddr,
    Handler: appHandler,
}

// Create health check server on different port
healthServer := &http.Server{
    Addr:    *healthAddr,
    Handler: check,
}
```

2. **Timeout Handling**: Configure appropriate timeouts:

```go
// Create pinger with custom client
client := &http.Client{Timeout: 5 * time.Second}
pinger := health.NewPinger("service", *addr,
    health.WithClient(client))
```

3. **Error Handling**: Log health check failures with context:

```go
check = log.HTTP(ctx, 
    log.With(ctx, log.KV{"component", "health"}))(check)
```

4. **Kubernetes Integration**: Configure probes in your deployment:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: health-port
  initialDelaySeconds: 10
  periodSeconds: 5

readinessProbe:
  httpGet:
    path: /livez
    port: health-port
  initialDelaySeconds: 5
  periodSeconds: 2
```

Health checks are a critical component of service observability. They
continuously monitor the status of your service's dependencies, ensuring you're
alerted quickly if a dependency becomes unhealthy. The checks integrate
seamlessly with Kubernetes probes, allowing the container orchestrator to make
informed decisions about pod lifecycle management. When issues occur, the health
checks log errors appropriately, providing valuable debugging information.

## 5. Graceful Shutdown

Implement proper shutdown handling to ensure clean service termination:

```go
// Create shutdown channel
errc := make(chan error)
go func() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
	errc <- fmt.Errorf("signal: %s", <-c)
}()

// Start servers
var wg sync.WaitGroup
wg.Add(1)
go func() {
	defer wg.Done()
	log.Printf(ctx, "HTTP server listening on %s", *httpAddr)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		errc <- err
	}
}()

// Wait for shutdown signal
if err := <-errc; err != nil {
	log.Errorf(ctx, err, "shutdown initiated")
}

// Graceful shutdown
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := server.Shutdown(ctx); err != nil {
	log.Errorf(ctx, err, "shutdown error")
}
wg.Wait()
```

Proper shutdown ensures:
- In-flight requests complete
- Resources are cleaned up
- Telemetry data is flushed
- Dependencies are notified

## Configuration Options

### Sampling Rate

Control how much trace data you collect. Clue provides two sampling strategies:

#### Fixed Rate Sampling

Use a fixed percentage of requests:

```go
cfg := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithSamplingRate(0.1))  // Sample 10% of requests
```

#### Adaptive Sampling

For more dynamic control, use the adaptive sampler which automatically adjusts
the sampling rate to maintain a target requests-per-second:

```go
cfg := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithSampler(
        clue.AdaptiveSampler(
            100,    // Target 100 traces per second
            1000))) // Adjust rate every 1000 requests
```

The adaptive sampler:
- Dynamically adjusts sampling rate based on traffic
- Prevents trace explosion during high load
- Maintains consistent sampling during low traffic
- Provides predictable storage and processing costs

For example:
- During low traffic (50 rps), it might sample 100% of requests
- During normal traffic (200 rps), it might sample 50% of requests
- During high traffic (1000 rps), it might sample 10% of requests

This adaptive sampling approach ensures you never exceed your target sampling
rate while maintaining optimal visibility. During quiet periods, you get full
visibility into your system's behavior since all requests can be sampled. During
peak loads, the sampling automatically adjusts to remain cost-effective while
still providing statistically significant data for analysis.

### Resource Attributes

Add metadata to all telemetry:

```go
cfg := clue.NewConfig(ctx,
	serviceName,
	version,
	metricExporter,
	spanExporter,
	clue.WithResourceAttributes(map[string]string{
		"environment": "production",
		"region":     "us-west",
		"deployment": "blue",
	}))
```

### Alternative Exporters

OpenTelemetry can send telemetry data to different backends (systems that store and
visualize your observability data). While the previous examples used OTLP
(OpenTelemetry Protocol) exporters, you can use other popular systems:

#### What are Exporters?

Exporters are components that send your telemetry data (traces, metrics, logs) to
a backend system for storage and analysis. Think of them as adapters that
translate OpenTelemetry data into a format that specific backends understand.

#### Common Backends

1. **Jaeger** - Popular open-source distributed tracing system:
   ```go
   import "go.opentelemetry.io/otel/exporters/jaeger"

   // Send traces directly to Jaeger
   spanExporter, err := jaeger.New(
       jaeger.WithCollectorEndpoint(
           jaeger.WithEndpoint("http://jaeger:14268/api/traces")))
   ```

2. **Prometheus** - Industry-standard metrics collection system:
   ```go
   import "go.opentelemetry.io/otel/exporters/prometheus"

   // Export metrics in Prometheus format
   metricExporter, err := prometheus.New(
       prometheus.WithNamespace("myapp"))    // Prefix all metrics
   ```

3. **Zipkin** - Another distributed tracing system:
   ```go
   import "go.opentelemetry.io/otel/exporters/zipkin"

   // Send traces to Zipkin
   spanExporter, err := zipkin.New(
       "http://zipkin:9411/api/v2/spans")
   ```

#### Using Multiple Exporters

You can send data to multiple backends simultaneously:

```go
// Create exporters
jaegerExp, err := jaeger.New(jaegerEndpoint)
prometheusExp, err := prometheus.New()
otlpExp, err := otlp.New(otlpEndpoint)

// Configure with multiple exporters
cfg, err := clue.NewConfig(ctx,
    serviceName,
    version,
    prometheusExp,        // Metrics to Prometheus
    otlpExp,             // Traces to OTLP
    clue.WithTraceExporter(jaegerExp))  // Also send traces to Jaeger
```

Using multiple exporters provides several benefits. You can leverage specialized
tools that excel at specific observability needs - for example, using Prometheus
for metrics while sending traces to Jaeger. This also enables you to compare
different backend capabilities side-by-side to evaluate which best suits your
requirements. Additionally, when you need to migrate between observability
systems, you can do so gradually by running both systems in parallel during the
transition period.

## Next Steps

Now that you have basic observability set up, explore:
- [Tracing](../2-tracing) - Add distributed tracing
- [Metrics](../3-metrics) - Implement service metrics
- [Logging](../4-logging) - Configure logging strategy
- [Health Checks](../5-health) - Monitor dependencies
- [Debugging](../6-debugging) - Enable debugging tools 