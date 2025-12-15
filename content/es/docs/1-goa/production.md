---
title: Producción
weight: 8
description: "Production-ready patterns for Goa services - observability, security, and common deployment patterns."
llm_optimized: true
aliases:
---

Esta guía cubre patrones esenciales para ejecutar servicios Goa en producción, incluyendo observabilidad, seguridad y patrones comunes de despliegue.

## Observabilidad

Los sistemas distribuidos modernos requieren una observabilidad completa. Goa recomienda [Clue](https://github.com/goadesign/clue), construido sobre OpenTelemetry, para la observabilidad. Esta sección cubre patrones comunes; para la documentación completa de la API, vea [Documentación de Clue](../3-ecosystem/clue/).

### Los tres pilares

1. **Rastreo Distribuido**: Siga las peticiones a través de su sistema
2. **Métricas**: Mida el comportamiento y el rendimiento del sistema
3. **Registros**: Registrar eventos y errores específicos

### Configuración de Clue

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

### Rastreo Distribuido

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

### Métricas

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

### Registro

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

### Comprobaciones de salud

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

### Servicio Observable Completo

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

## Seguridad

Goa proporciona sólidas funciones de seguridad a través de su DSL.

### Esquemas de seguridad

#### Autenticación básica

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication using username and password")
})
```

#### Autenticación con clave API

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Secures endpoint by requiring an API key")
})
```

#### Autenticación JWT

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Secures endpoint by requiring a valid JWT token")
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

#### Autenticación OAuth2

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("OAuth2 authentication")
    AuthorizationCodeFlow("/authorize", "/token", "/refresh")
    Scope("api:write", "Write access")
    Scope("api:read", "Read access")
})
```

### Aplicación de la seguridad

La seguridad se puede aplicar a nivel de API, servicio o método:

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

### Mejores prácticas de seguridad

1. **Utilice siempre HTTPS en producción**
2. **Defina la seguridad a nivel de API** para que los valores predeterminados sean coherentes
3. **Utilice `NoSecurity()` explícitamente** para los puntos finales públicos
4. **Implementar la limitación de velocidad** para la autenticación de claves API
5. **Utilizar una caducidad de token adecuada** para tokens JWT
6. **Rotación periódica de secretos y claves
7. **Registrar y supervisar los fallos de autenticación
8. **Validación de todas las entradas**, incluso para solicitudes autenticadas

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

### Gestión de la configuración

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

### Tiempos de espera del servidor

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

## Resumen

Los servicios Goa listos para la producción deben incluir:

1. **Observabilidad**: Rastreo, métricas, registro y comprobaciones de estado
2. **Seguridad Autenticación y autorización adecuadas
3. **Resiliencia**: Apagado gradual, tiempos de espera y gestión de errores
4. **Configuración**: Gestión de la configuración basada en el entorno
5. **Supervisión**: Puntos finales de depuración y capacidades de creación de perfiles

Estos patrones garantizan que sus servicios sean fiables, seguros y mantenibles en entornos de producción.

---

## Ver también

- [Clue Documentation](../3-ecosystem/clue/) - Completo conjunto de herramientas de observabilidad con referencia detallada de la API
- [DSL Reference: Security](dsl-reference/#security) - Definiciones de esquemas de seguridad
- [Guía de manejo de errores](error-handling/) - Patrones de manejo de errores y mejores prácticas
- [Interceptores](interceptors/) - Patrones de middleware e interceptores
