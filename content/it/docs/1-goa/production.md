---
title: Produzione
weight: 8
description: "Production-ready patterns for Goa services - observability, security, and common deployment patterns."
llm_optimized: true
aliases:
---

Questa guida copre i modelli essenziali per l'esecuzione dei servizi Goa in produzione, tra cui l'osservabilità, la sicurezza e i modelli comuni di distribuzione.

## Osservabilità

I moderni sistemi distribuiti richiedono un'osservabilità completa. Goa raccomanda [Clue](https://github.com/goadesign/clue), costruito su OpenTelemetry, per l'osservabilità. Questa sezione copre gli schemi comuni; per la documentazione completa delle API, vedere [Clue Documentation](../3-ecosystem/clue/).

### I tre pilastri

1. **Tracciamento distribuito**: Seguire le richieste attraverso il sistema
2. **Misurazione**: Misurare il comportamento e le prestazioni del sistema
3. **Registri**: Registra eventi ed errori specifici

### Impostazione di Clue

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

### Tracciamento distribuito

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

### Metriche

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

## Registrazione

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

### Controlli di salute

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

## Servizio completo osservabile

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

## Sicurezza

Goa offre solide funzioni di sicurezza attraverso il suo DSL.

### Schemi di sicurezza

#### Autenticazione di base

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication using username and password")
})
```

#### Autenticazione con chiave API

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Secures endpoint by requiring an API key")
})
```

#### Autenticazione JWT

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Secures endpoint by requiring a valid JWT token")
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

#### Autenticazione OAuth2

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("OAuth2 authentication")
    AuthorizationCodeFlow("/authorize", "/token", "/refresh")
    Scope("api:write", "Write access")
    Scope("api:read", "Read access")
})
```

### Applicazione della sicurezza

La sicurezza può essere applicata a livello di API, servizio o metodo:

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

### Migliori pratiche di sicurezza

1. **Usare sempre l'HTTPS in produzione
2. **Definire la sicurezza a livello di API** per ottenere valori predefiniti coerenti
3. **Usare `NoSecurity()` in modo esplicito** per gli endpoint pubblici
4. **Implementare la limitazione della velocità** per l'autenticazione con chiave API
5. **Utilizzare la scadenza appropriata dei token** per i token JWT
6. **Ruotare regolarmente i segreti e le chiavi**
7. **Registrare e monitorare i fallimenti di autenticazione**
8. **Validare tutti gli input** anche per le richieste autenticate

---

## Modelli comuni

### Arresto di grazia

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

### Gestione della configurazione

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

### Timeout del server

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

## Riepilogo

I servizi Goa pronti per la produzione dovrebbero includere:

1. **Osservabilità**: Tracciamento, metriche, logging e controlli di salute
2. **Sicurezza**: Autenticazione e autorizzazione appropriate
3. **Resilienza**: Arresto di grazia, timeout e gestione degli errori
4. **Configurazione**: Gestione della configurazione basata sull'ambiente
5. **Monitoraggio**: Endpoint di debug e funzionalità di profiling

Questi modelli assicurano che i servizi siano affidabili, sicuri e manutenibili negli ambienti di produzione.

---

## Vedi anche

- [Documentazione di Clue](../3-ecosystem/clue/) - Toolkit completo per l'osservabilità con riferimenti dettagliati alle API
- [Riferimento DSL: Sicurezza](dsl-reference/#security) - Definizioni dello schema di sicurezza
- [Guida alla gestione degli errori](error-handling/) - Modelli di gestione degli errori e buone pratiche
- [Intercettori](interceptors/) - Modelli di middleware e intercettori
