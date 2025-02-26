---
title: "Service Metrics"
description: "Implementing service metrics with OpenTelemetry"
weight: 3
---

Modern applications need quantitative data to understand their behavior and performance.
How many requests are we handling? How long do they take? Are we running out of
resources? Metrics help answer these questions by providing numerical measurements
of your service's operation.

## Understanding Metrics

OpenTelemetry provides several metric instruments, each designed for specific measurement needs. Every instrument is defined by:
- **Name**: What you're measuring (e.g., `http.requests.total`)
- **Kind**: How the value behaves (e.g., only increases, can go up and down)
- **Unit**: Optional measurement unit (e.g., `ms`, `bytes`)
- **Description**: Optional explanation of what the metric represents

Let's explore each type of instrument:

### Synchronous Instruments
These instruments are called directly in your code when something happens:

1. **Counter**
   A value that only goes up, like an odometer in a car:
   ```go
   requestCounter, _ := meter.Int64Counter("http.requests.total",
       metric.WithDescription("Total number of HTTP requests"),
       metric.WithUnit("{requests}"))
   
   // Usage: Increment when request received
   requestCounter.Add(ctx, 1)
   ```
   Perfect for:
   - Request counts
   - Bytes processed
   - Tasks completed

2. **UpDownCounter**
   A value that can increase or decrease, like items in a queue:
   ```go
   queueSize, _ := meter.Int64UpDownCounter("queue.items",
       metric.WithDescription("Current items in queue"),
       metric.WithUnit("{items}"))
   
   // Usage: Add when enqueueing, subtract when dequeueing
   queueSize.Add(ctx, 1)  // Item added
   queueSize.Add(ctx, -1) // Item removed
   ```
   Perfect for:
   - Queue lengths
   - Number of active connections
   - Thread pool size

3. **Histogram**
   Tracks the distribution of values, like request durations:
   ```go
   latency, _ := meter.Float64Histogram("http.request.duration",
       metric.WithDescription("HTTP request duration"),
       metric.WithUnit("ms"))
   
   // Usage: Record value when request completes
   latency.Record(ctx, time.Since(start).Milliseconds())
   ```
   Perfect for:
   - Request latencies
   - Response sizes
   - Queue wait times

### Asynchronous Instruments
These instruments are collected periodically by callbacks you register:

1. **Asynchronous Counter**
   For values that only increase, but you only have access to the total:
   ```go
   bytesReceived, _ := meter.Int64ObservableCounter("network.bytes.received",
       metric.WithDescription("Total bytes received"),
       metric.WithUnit("By"))
   
   // Usage: Register callback to collect current value
   meter.RegisterCallback([]instrument.Asynchronous{bytesReceived},
       func(ctx context.Context) {
           bytesReceived.Observe(ctx, getNetworkStats().TotalBytesReceived)
       })
   ```
   Perfect for:
   - Total bytes transferred
   - System uptime
   - Cumulative events from external systems

2. **Asynchronous UpDownCounter**
   For values that can change either way, but you only see the current state:
   ```go
   goroutines, _ := meter.Int64ObservableUpDownCounter("system.goroutines",
       metric.WithDescription("Current number of goroutines"),
       metric.WithUnit("{goroutines}"))
   
   // Usage: Register callback to collect current value
   meter.RegisterCallback([]instrument.Asynchronous{goroutines},
       func(ctx context.Context) {
           goroutines.Observe(ctx, int64(runtime.NumGoroutine()))
       })
   ```
   Perfect for:
   - Current connection count
   - Resource pool size
   - Thread count

3. **Asynchronous Gauge**
   For current-value measurements that you periodically sample:
   ```go
   cpuUsage, _ := meter.Float64ObservableGauge("system.cpu.usage",
       metric.WithDescription("CPU usage percentage"),
       metric.WithUnit("1"))
   
   // Usage: Register callback to collect current value
   meter.RegisterCallback([]instrument.Asynchronous{cpuUsage},
       func(ctx context.Context) {
           cpuUsage.Observe(ctx, getCPUUsage())
       })
   ```
   Perfect for:
   - CPU usage
   - Memory usage
   - Temperature readings
   - Disk space

### Choosing the Right Instrument

1. Ask yourself these questions:
   - Do I need to record values as they happen (synchronous) or periodically check state (asynchronous)?
   - Can the value only go up (Counter) or both up and down (UpDownCounter)?
   - Do I need to analyze the distribution of values (Histogram)?
   - Am I measuring a current state (Gauge)?

2. Common use cases:
   - Counting events → Counter
   - Measuring durations → Histogram
   - Resource usage → Asynchronous Gauge
   - Queue sizes → UpDownCounter
   - System stats → Asynchronous instruments

## Automatic Metrics

Clue automatically instruments several key metrics for your service. These give
you immediate visibility without writing any code:

### HTTP Server Metrics
When you wrap your HTTP handlers with OpenTelemetry middleware:
```go
handler = otelhttp.NewHandler(handler, "service")
```

You automatically get:
- **Request Counts**: Total requests by path, method, and status code
- **Duration Histograms**: How long requests take to process
- **In-Flight Requests**: Current number of active requests
- **Response Sizes**: Distribution of response payload sizes

### gRPC Server Metrics
When you create a gRPC server with OpenTelemetry instrumentation:
```go
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()))
```

You automatically get:
- **RPC Counts**: Total RPCs by method and status code
- **Duration Histograms**: How long RPCs take to complete
- **In-Flight RPCs**: Current number of active RPCs
- **Message Sizes**: Distribution of request/response sizes

## Custom Metrics

While automatic metrics are helpful, you often need to track business-specific
measurements. Here's how to create and use custom metrics effectively:

### Creating Metrics

First, get a meter for your service:
```go
meter := otel.Meter("myservice")
```

Then create the metrics you need:

1. **Counter Example**: Track business events
   ```go
   orderCounter, _ := meter.Int64Counter("orders.total",
       metric.WithDescription("Total number of orders processed"),
       metric.WithUnit("{orders}"))
   ```

2. **Histogram Example**: Measure processing times
   ```go
   processingTime, _ := meter.Float64Histogram("order.processing_time",
       metric.WithDescription("Time taken to process orders"),
       metric.WithUnit("ms"))
   ```

3. **Gauge Example**: Monitor queue depth
   ```go
   queueDepth, _ := meter.Int64UpDownCounter("orders.queue_depth",
       metric.WithDescription("Current number of orders in queue"),
       metric.WithUnit("{orders}"))
   ```

### Using Metrics

Let's look at a complete example that demonstrates how to use different types of
metrics in a real-world scenario. This example shows how to monitor an order
processing system:

```go
func processOrder(ctx context.Context, order *Order) error {
    // Track total orders (counter)
    // We increment the counter by 1 for each order, adding attributes for analysis
    orderCounter.Add(ctx, 1,
        attribute.String("type", order.Type),
        attribute.String("customer", order.CustomerID))

    // Measure processing time (histogram)
    // We use a defer to ensure we always record the duration, even if the function returns early
    start := time.Now()
    defer func() {
        processingTime.Record(ctx,
            time.Since(start).Milliseconds(),
            attribute.String("type", order.Type))
    }()

    // Monitor queue depth (gauge)
    // We track the queue size by incrementing when adding and decrementing when done
    queueDepth.Add(ctx, 1)  // Increment when adding to queue
    defer queueDepth.Add(ctx, -1)  // Decrement when done

    return processOrderInternal(ctx, order)
}
```

This example demonstrates several best practices:
- Using counters for discrete events (orders processed)
- Using histograms for durations (processing time)
- Using gauges for current state (queue depth)
- Adding relevant attributes for analysis
- Proper cleanup with defer statements

## Service Level Indicators (SLIs)

Service Level Indicators are key metrics that help you understand your service's
health and performance. The four golden signals (Latency, Traffic, Errors, and
Saturation) provide a comprehensive view of your service's behavior. Let's
implement each one:

### 1. Latency
Latency measures how long it takes to serve requests. This example shows how to
track request duration in an HTTP middleware:

```go
// Create a histogram to track request durations
requestDuration, _ := meter.Float64Histogram("http.request.duration",
    metric.WithDescription("HTTP request duration"),
    metric.WithUnit("ms"))

// Middleware to measure request duration
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        // Record the duration with the request path as an attribute
        requestDuration.Record(r.Context(),
            time.Since(start).Milliseconds(),
            attribute.String("path", r.URL.Path))
    })
}
```

### 2. Traffic
Traffic measures the demand on your system. This example counts HTTP requests:

```go
// Create a counter for incoming requests
requestCount, _ := meter.Int64Counter("http.request.count",
    metric.WithDescription("Total HTTP requests"),
    metric.WithUnit("{requests}"))

// Middleware to count requests
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Increment the counter with method and path attributes
        requestCount.Add(r.Context(), 1,
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path))
        next.ServeHTTP(w, r)
    })
}
```

### 3. Errors
Error tracking helps identify issues in your service. This example counts HTTP 5xx errors:

```go
// Create a counter for server errors
errorCount, _ := meter.Int64Counter("http.error.count",
    metric.WithDescription("Total HTTP errors"),
    metric.WithUnit("{errors}"))

// Middleware to track errors
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Use a custom ResponseWriter to capture the status code
        sw := &statusWriter{ResponseWriter: w}
        next.ServeHTTP(sw, r)
        
        // Count 5xx errors
        if sw.status >= 500 {
            errorCount.Add(r.Context(), 1,
                attribute.Int("status_code", sw.status),
                attribute.String("path", r.URL.Path))
        }
    })
}
```

### 4. Saturation
Saturation measures how "full" your service is. This example monitors system resources:

```go
// Create gauges for CPU and memory usage
cpuUsage, _ := meter.Float64ObservableGauge("system.cpu.usage",
    metric.WithDescription("CPU usage percentage"),
    metric.WithUnit("1"))

memoryUsage, _ := meter.Int64ObservableGauge("system.memory.usage",
    metric.WithDescription("Memory usage bytes"),
    metric.WithUnit("By"))

// Start a goroutine to periodically collect system metrics
go func() {
    ticker := time.NewTicker(time.Second)
    for range ticker.C {
        ctx := context.Background()
        
        // Update CPU usage
        var cpu float64
        cpuUsage.Observe(ctx, getCPUUsage())
        
        // Update memory usage using runtime statistics
        var mem runtime.MemStats
        runtime.ReadMemStats(&mem)
        memoryUsage.Observe(ctx, int64(mem.Alloc))
    }
}()
```

## Metric Exporters

Once you've instrumented your code with metrics, you need to export them to a monitoring system. Here are examples of common exporters:

### Prometheus
Prometheus is a popular choice for metrics collection. Here's how to configure it:

```go
// Create a Prometheus exporter with custom histogram boundaries
exporter, err := prometheus.New(prometheus.Config{
    DefaultHistogramBoundaries: []float64{
        1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, // in milliseconds
    },
})
```

The histogram boundaries are crucial for accurate latency measurements. Choose boundaries that cover your expected latency range.

### OpenTelemetry Protocol (OTLP)
OTLP is the native protocol for OpenTelemetry. Use it to send metrics to collectors:

```go
// Create an OTLP exporter connecting to a collector
exporter, err := otlpmetricgrpc.New(ctx,
    otlpmetricgrpc.WithEndpoint("collector:4317"),
    otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
```

Remember to configure TLS appropriately in production environments.

## Best Practices

### 1. Naming Conventions
Follow a consistent pattern to make metrics discoverable and understandable:
```
<namespace>.<type>.<name>
```

For example:
- `http.request.duration` - HTTP request latency
- `database.connection.count` - Number of DB connections
- `order.processing.time` - Order processing duration

The pattern helps users find and understand metrics without referring to documentation.

### 2. Units
Always specify units in metric descriptions to avoid ambiguity:
- Time: `ms` (milliseconds), `s` (seconds)
- Bytes: `By` (bytes)
- Counts: `{requests}`, `{errors}`
- Ratios: `1` (dimensionless)

Using consistent units makes metrics comparable and prevents conversion errors.

### 3. Performance
Consider these factors to maintain good performance:

- **Collection intervals**: Choose appropriate intervals based on metric volatility
  - High-frequency changes: 1-5 seconds
  - Stable metrics: 15-60 seconds
  - Resource-intensive metrics: 5+ minutes

- **Batch updates**: Group metric updates when possible
  ```go
  // Instead of this:
  counter.Add(ctx, 1)
  counter.Add(ctx, 1)
  
  // Do this:
  counter.Add(ctx, 2)
  ```

- **Cardinality growth**: Monitor the number of unique time series
  - Set limits on attribute combinations
  - Regularly review and clean up unused metrics
  - Use recording rules for high-cardinality metrics

- **Aggregation**: Pre-aggregate high-volume metrics
  ```go
  // Instead of recording every request:
  histogram.Record(ctx, duration)
  
  // Batch and record summaries:
  type window struct {
      count int64
      sum   float64
  }
  ```

### 4. Documentation
Document each metric thoroughly to help users understand and use them effectively:

Required documentation:
- **Clear description**: What the metric measures and why it's important
- **Unit of measurement**: The specific unit used (e.g., milliseconds, bytes)
- **Valid attribute values**: List of expected values for each attribute
- **Update frequency**: How often the metric is updated
- **Retention period**: How long the metric data is kept

Example documentation:
```go
// http.request.duration measures the time taken to process HTTP requests.
// Unit: milliseconds
// Attributes:
//   - method: HTTP method (GET, POST, etc.)
//   - path: Request path
//   - status_code: HTTP status code
// Update frequency: Per request
// Retention: 30 days
requestDuration, _ := meter.Float64Histogram(
    "http.request.duration",
    metric.WithDescription("Time taken to process HTTP requests"),
    metric.WithUnit("ms"))
```

## Learn More

For more detailed information about metrics:

- [OpenTelemetry Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)
  The official guide to OpenTelemetry metrics concepts and implementation.

- [Metric Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
  Standard names and attributes for common metrics.

- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
  Excellent guidance on metric naming and labels.

- [Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)
  Google's guide to essential service metrics.

These resources provide deeper insights into metric implementation and best practices.

### Choosing Attributes

Attributes provide context to your metrics, making them more useful for analysis. However, choosing the right attributes requires careful consideration to avoid performance issues and maintain data quality.

Good attributes to include:
- **High cardinality**: `customer_type`, `order_status`, `error_code`
  These attributes have a limited set of possible values and provide meaningful grouping.
- **Business relevant**: `subscription_tier`, `payment_method`
  These help correlate metrics with business outcomes.
- **Technical grouping**: `region`, `datacenter`, `instance_type`
  These enable operational analysis and troubleshooting.

Attributes to avoid:
- **Unique IDs**: Don't use `user_id`, `order_id` (use these in traces instead)
  These create too many unique time series and can overwhelm your metrics storage.
- **Timestamps**: Metrics already have timestamps
  Adding timestamp attributes is redundant and wastes storage.
- **Sensitive data**: Never include PII or secrets
  Metrics are often widely accessible in an organization.
