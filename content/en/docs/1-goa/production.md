---
title: Production
weight: 8
description: "Production-ready patterns for Goa services - observability, security, and common deployment patterns."
llm_optimized: true
aliases:
  - /en/docs/5-real-world/
  - /en/docs/5-real-world/2-observability/
  - /en/docs/5-real-world/2-observability/1-setup/
  - /en/docs/5-real-world/2-observability/2-tracing/
  - /en/docs/5-real-world/2-observability/3-metrics/
  - /en/docs/5-real-world/2-observability/4-logging/
  - /en/docs/5-real-world/2-observability/5-health/
  - /en/docs/5-real-world/2-observability/6-debugging/
  - /en/docs/5-real-world/3-common-patterns/
  - /en/docs/5-real-world/3-common-patterns/1-clients/
  - /en/docs/5-real-world/3-common-patterns/2-file-upload-download/
  - /en/docs/5-real-world/4-security/
  - /en/docs/5-real-world/4-security/1-basic-auth/
  - /en/docs/5-real-world/4-security/2-api-key/
  - /en/docs/5-real-world/4-security/3-jwt/
  - /en/docs/5-real-world/4-security/4-oauth2/
  - /en/docs/5-real-world/4-security/5-best-practices/
  - /en/docs/6-advanced/
  - /en/docs/6-advanced/1-plugins/
  - /en/docs/6-advanced/2-multiple-services/
  - /en/docs/6-advanced/3-diagrams/
  - /en/docs/6-advanced/4-elegant-monolith/
  - /en/docs/6-advanced/5-sticky-cookies/
  - /docs/5-real-world/
  - /docs/6-advanced/
---

This guide covers essential patterns for running Goa services in production, including observability, security, and common deployment patterns.

## Observability

Modern distributed systems require comprehensive observability. Goa recommends [Clue](https://github.com/goadesign/clue), built on OpenTelemetry, for observability.

### The Three Pillars

1. **Distributed Tracing**: Follow requests through your system
2. **Metrics**: Measure system behavior and performance
3. **Logs**: Record specific events and errors

### Setting Up Clue

```go
import (
    "goa.design/clue/clue"
    "goa.design/clue/log"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
)

func main() {
    // 1. Create logger
    format := log.FormatJSON
    if log.IsTerminal() {
        format = log.FormatTerminal
    }
    ctx := log.Context(context.Background(),
        log.WithFormat(format),
        log.WithFunc(log.Span))

    // 2. Configure OpenTelemetry exporters
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(*collectorAddr),
        otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "failed to initialize tracing")
    }
    
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(*collectorAddr),
        otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "failed to initialize metrics")
    }

    // 3. Initialize Clue
    cfg, err := clue.NewConfig(ctx,
        genservice.ServiceName,
        genservice.APIVersion,
        metricExporter,
        spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)
}
```

### Distributed Tracing

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

func (s *Service) CreateOrder(ctx context.Context, order *Order) error {
    // Start a span
    ctx, span := otel.Tracer("service").Start(ctx, "create_order")
    defer span.End()

    // Add attributes
    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount))

    if err := s.processOrder(ctx, order); err != nil {
        span.RecordError(err)
        return err
    }

    return nil
}
```

### Metrics

```go
import (
    "go.opentelemetry.io/otel/metric"
)

type Service struct {
    orderCounter metric.Int64Counter
    orderLatency metric.Float64Histogram
}

func NewService(meter metric.Meter) *Service {
    counter, _ := meter.Int64Counter("orders_total",
        metric.WithDescription("Total number of orders"))
    latency, _ := meter.Float64Histogram("order_latency_seconds",
        metric.WithDescription("Order processing latency"))
    
    return &Service{
        orderCounter: counter,
        orderLatency: latency,
    }
}

func (s *Service) CreateOrder(ctx context.Context, order *Order) error {
    start := time.Now()
    defer func() {
        s.orderLatency.Record(ctx, time.Since(start).Seconds())
    }()
    
    s.orderCounter.Add(ctx, 1, attribute.String("type", order.Type))
    // ...
}
```

### Logging

```go
import "goa.design/clue/log"

func (s *Service) CreateOrder(ctx context.Context, order *Order) error {
    log.Info(ctx, "processing order",
        log.KV{"order_id", order.ID},
        log.KV{"amount", order.Amount})

    if err := s.processOrder(ctx, order); err != nil {
        log.Error(ctx, err, "failed to process order",
            log.KV{"order_id", order.ID})
        return err
    }

    return nil
}
```

### Health Checks

```go
import "goa.design/clue/health"

func main() {
    // Create health checker
    checker := health.NewChecker(
        health.NewPinger("database", dbHealthAddr),
        health.NewPinger("cache", cacheHealthAddr),
    )
    
    // Mount health endpoint
    http.Handle("/healthz", log.HTTP(ctx)(health.Handler(checker)))
}
```

### Complete Observable Service

```go
func main() {
    ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))

    // Initialize OpenTelemetry
    cfg, _ := clue.NewConfig(ctx, serviceName, version, metricExporter, spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)

    // Create service with middleware
    svc := NewService()
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())
    endpoints.Use(log.Endpoint)

    // Set up HTTP with observability middleware
    mux := goahttp.NewMuxer()
    mux.Use(otelhttp.NewMiddleware(serviceName))
    mux.Use(debug.HTTP())
    mux.Use(log.HTTP(ctx))

    // Mount debug endpoints
    debug.MountDebugLogEnabler(debug.Adapt(mux))
    debug.MountPprofHandlers(debug.Adapt(mux))

    // Mount health checks
    http.Handle("/healthz", health.Handler(health.NewChecker(...)))

    // Start server
    server := &http.Server{Addr: ":8080", Handler: mux}
    server.ListenAndServe()
}
```

---

## Security

Goa provides robust security features through its DSL.

### Security Schemes

#### Basic Authentication

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication using username and password")
})
```

#### API Key Authentication

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Secures endpoint by requiring an API key")
})
```

#### JWT Authentication

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Secures endpoint by requiring a valid JWT token")
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

#### OAuth2 Authentication

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("OAuth2 authentication")
    AuthorizationCodeFlow("/authorize", "/token", "/refresh")
    Scope("api:write", "Write access")
    Scope("api:read", "Read access")
})
```

### Applying Security

Security can be applied at API, service, or method level:

```go
// API level - default for all endpoints
var _ = API("myapi", func() {
    Security(BasicAuth)
})

// Service level - override API default
var _ = Service("users", func() {
    Security(APIKeyAuth)
    
    Method("list", func() {
        // Uses service-level APIKeyAuth
        Payload(func() {
            APIKey("api_key", "key", String)
            Required("key")
        })
    })
    
    Method("admin", func() {
        // Override with JWT for this method
        Security(JWTAuth)
        Payload(func() {
            Token("token", String)
            Required("token")
        })
    })
    
    Method("public", func() {
        // No security for this method
        NoSecurity()
    })
})
```

### Security Best Practices

1. **Always use HTTPS in production**
2. **Define security at API level** for consistent defaults
3. **Use `NoSecurity()` explicitly** for public endpoints
4. **Implement rate limiting** for API key authentication
5. **Use appropriate token expiration** for JWT tokens
6. **Regularly rotate secrets and keys**
7. **Log and monitor authentication failures**
8. **Validate all input** even for authenticated requests

---

## Common Patterns

### Graceful Shutdown

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    
    // Create server
    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }
    
    // Start server in goroutine
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Errorf(ctx, err, "server error")
        }
    }()
    
    // Wait for interrupt signal
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
    <-sigChan
    
    // Graceful shutdown with timeout
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer shutdownCancel()
    
    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Errorf(ctx, err, "shutdown error")
    }
    
    cancel()
    wg.Wait()
}
```

### Configuration Management

```go
type Config struct {
    HTTPAddr     string        `env:"HTTP_ADDR" default:":8080"`
    GRPCAddr     string        `env:"GRPC_ADDR" default:":8081"`
    DatabaseURL  string        `env:"DATABASE_URL" required:"true"`
    LogLevel     string        `env:"LOG_LEVEL" default:"info"`
    ReadTimeout  time.Duration `env:"READ_TIMEOUT" default:"10s"`
    WriteTimeout time.Duration `env:"WRITE_TIMEOUT" default:"30s"`
}

func main() {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        log.Fatal(err)
    }
    
    server := &http.Server{
        Addr:         cfg.HTTPAddr,
        Handler:      mux,
        ReadTimeout:  cfg.ReadTimeout,
        WriteTimeout: cfg.WriteTimeout,
    }
}
```

### Server Timeouts

```go
server := &http.Server{
    Addr:              ":8080",
    Handler:           mux,
    ReadHeaderTimeout: 10 * time.Second,
    ReadTimeout:       30 * time.Second,
    WriteTimeout:      60 * time.Second,
    IdleTimeout:       120 * time.Second,
    MaxHeaderBytes:    1 << 20, // 1MB
}
```

---

## Summary

Production-ready Goa services should include:

1. **Observability**: Tracing, metrics, logging, and health checks
2. **Security**: Appropriate authentication and authorization
3. **Resilience**: Graceful shutdown, timeouts, and error handling
4. **Configuration**: Environment-based configuration management
5. **Monitoring**: Debug endpoints and profiling capabilities

These patterns ensure your services are reliable, secure, and maintainable in production environments.
