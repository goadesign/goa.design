---
title: "Observability"
description: "Understanding and implementing observability in Goa services"
weight: 2
---

Modern distributed systems are complex. When something goes wrong, traditional
logging alone isn't enough to understand what happened. You need to see how
requests flow through your system, measure performance, and monitor system
health. This is where observability comes in.

{{< alert title="Note" color="primary" >}}
Goa services are standard HTTP or gRPC services, so you can use any
observability stack you prefer. While this guide focuses on
[Clue](https://github.com/goadesign/clue) (which Goa uses in generated examples
and provides Goa-specific features), the principles apply to any observability
solution.
{{< /alert >}}

## What is Observability?

Observability is your ability to understand what's happening inside your system
by looking at its outputs. In Goa, we achieve this through three main pillars:

1. **Distributed Tracing**: Following requests as they travel through your services
2. **Metrics**: Measuring system behavior and performance
3. **Logs**: Recording specific events and errors

## The Clue Package

Clue is Goa's recommended observability package. It's built on top of
[OpenTelemetry](https://opentelemetry.io), the industry standard for
observability, and provides tight integration with Goa's generated code.

Here's a simple example of what observability looks like in practice:

```go
import (
    "go.opentelemetry.io/otel"                // Standard OpenTelemetry
    "go.opentelemetry.io/otel/attribute"      // Standard OpenTelemetry
    "goa.design/clue/log"                     // Clue's logging package
)

func (s *Service) CreateOrder(ctx context.Context, order *Order) error {
    // Using standard OpenTelemetry API
    ctx, span := otel.Tracer("service").Start(ctx, "create_order")
    defer span.End()

    // Standard OpenTelemetry attributes
    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount))

    // Standard OpenTelemetry metrics
    s.orderCounter.Add(ctx, 1,
        attribute.String("type", order.Type))

    // Clue's structured logging (optional)
    log.Info(ctx, "processing order",
        log.KV{"order_id", order.ID})

    if err := s.processOrder(ctx, order); err != nil {
        // Standard OpenTelemetry error recording
        span.RecordError(err)
        return err
    }

    return nil
}
```

Notice that most of the code uses standard OpenTelemetry packages
(`go.opentelemetry.io/otel/*`). Only the logging uses Clue-specific code, and
even that could be replaced with your preferred logging solution. This means you
can:
- Use any OpenTelemetry-compatible observability backend
- Switch to a different logging library if needed
- Keep your observability code portable

## Why OpenTelemetry First?

Clue follows an OpenTelemetry-first approach. This means:

1. **Traces** are your primary debugging tool. They show you:
   - The exact path of each request
   - Where time is spent
   - Which services are involved
   - What errors occurred

2. **Metrics** help you monitor system health:
   - Request rates and latencies
   - Error rates
   - Resource usage
   - Business metrics

3. **Logs** are used sparingly, mainly for:
   - Fatal errors
   - System startup/shutdown
   - Debugging specific issues

This approach scales better than traditional logging because:
- Traces provide context automatically
- Metrics are more efficient than log parsing
- Logs can focus on what matters

## Getting Started

To add observability to your Goa service, you'll need to:

1. **Set up Clue**: Configure OpenTelemetry with appropriate exporters
2. **Add instrumentation**: Wrap your handlers and clients
3. **Define metrics**: Track important system behaviors
4. **Configure health checks**: Monitor service dependencies
5. **Enable debugging**: Add tools for troubleshooting

The following guides will walk you through each step:

1. [Basic Setup](1-setup) - Configure Clue and OpenTelemetry
2. [Tracing](2-tracing) - Implement distributed tracing
3. [Metrics](3-metrics) - Add service metrics
4. [Logging](4-logging) - Configure logging
5. [Health Checks](5-health) - Add health monitoring
6. [Debugging](6-debugging) - Enable debugging tools

## Example Service

Here's what a fully observable Goa service looks like in practice:

```go
func main() {
    // 1. Create logger with proper formatting
    format := log.FormatJSON
    if log.IsTerminal() {
        format = log.FormatTerminal
    }
    ctx := log.Context(context.Background(),
        log.WithFormat(format),
        log.WithFunc(log.Span))

    // 2. Configure OpenTelemetry with OTLP exporters
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(*coladdr),
        otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "failed to initialize tracing")
    }
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(*coladdr),
        otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "failed to initialize metrics")
    }

    // 3. Initialize Clue with OpenTelemetry
    cfg, err := clue.NewConfig(ctx,
        genservice.ServiceName,
        genservice.APIVersion,
        metricExporter,
        spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)

    // 4. Create service with middleware
    svc := front.New(fc, lc)
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())  // Debug logging
    endpoints.Use(log.Endpoint)         // Request logging
    endpoints.Use(middleware.ErrorReporter())

    // 5. Set up HTTP handlers with observability
    mux := goahttp.NewMuxer()
    debug.MountDebugLogEnabler(debug.Adapt(mux))  // Dynamic log level control
    debug.MountPprofHandlers(debug.Adapt(mux))    // Go profiling endpoints
    
    // Add middleware in correct order:
    mux.Use(otelhttp.NewMiddleware(serviceName) // 3. OpenTelemetry
    mux.Use(debug.HTTP())                       // 2. Debug endpoints
    mux.Use(log.HTTP(ctx))                      // 1. Request logging

    // 6. Mount health checks on separate port
    check := health.Handler(health.NewChecker(
        health.NewPinger("locator", *locatorHealthAddr),
        health.NewPinger("forecaster", *forecasterHealthAddr)))
    http.Handle("/healthz", log.HTTP(ctx)(check))

    // 7. Start servers with graceful shutdown
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        log.Printf(ctx, "HTTP server listening on %s", *httpAddr)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Errorf(ctx, err, "server error")
        }
    }()

    // Handle shutdown
    <-ctx.Done()
    if err := server.Shutdown(context.Background()); err != nil {
        log.Errorf(ctx, err, "shutdown error")
    }
    wg.Wait()
}
```

This service showcases several important observability features that help
monitor and debug the application in production. It implements structured
logging that propagates context through the service, allowing requests to be
traced across components. The service integrates OpenTelemetry for distributed
tracing and metrics collection, providing insights into performance and
behavior. Health check endpoints monitor the status of dependencies like the
locator and forecaster services. Debug endpoints enable profiling of the running
service to identify performance bottlenecks. The service also supports dynamic
log level control to adjust verbosity at runtime without restarts. Finally, it
implements graceful shutdown handling to properly clean up resources and
complete in-flight requests when stopping the service.

## Learn More

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Clue GitHub Repository](https://github.com/goadesign/clue)
- [Clue Weather Example](https://github.com/goadesign/clue/tree/main/example/weather)

