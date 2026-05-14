---
title: プロダクション
weight: 8
description: "Production-ready patterns for Goa services - observability, security, and common deployment patterns."
llm_optimized: true
aliases:
---

このガイドでは、観測可能性、セキュリティ、一般的なデプロイメントパターンなど、Goa サービスを本番環境で実行するために不可欠なパターンを説明します。

## 観測可能性

最新の分散システムには、包括的な観測可能性が必要です。Goa は、OpenTelemetry をベースに構築された [Clue](https://github.com/goadesign/clue) を推奨しています。このセクションでは一般的なパターンを扱います。API の完全なドキュメントについては [Clue Documentation](../3-ecosystem/clue/) を参照してください。

### 3つの柱

1. **Distributed Tracing**：システムを通してリクエストを追跡
2. **メトリクス**：システムの動作とパフォーマンスを測定
3. **ログ**：特定のイベントやエラーを記録

### Clue の設定

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

### 分散トレース

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

### メトリクス

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

### ロギング

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

### ヘルスチェック

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

### 完全な観測可能サービス

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

## セキュリティ

GoaはDSLを通じて強固なセキュリティ機能を提供する。

### セキュリティスキーム

#### 基本認証

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication using username and password")
})
```

#### API キー認証

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Secures endpoint by requiring an API key")
})
```

#### Bearer トークン認証

```go
var BearerAuth = BearerSecurity("bearer", func() {
    Description("Secures endpoint by requiring a bearer token")
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

#### JWT認証

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Secures endpoint by requiring a valid JWT token")
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

`BearerSecurity` と `JWTSecurity` はどちらも、標準の
`Authorization: Bearer <token>` ワイヤ形式をデフォルトで使用します。汎用または
不透明な bearer トークンには `BearerSecurity` を使用し、生成される API を明示的に
JWT 向けにしたい場合は `JWTSecurity` を使用します。OpenAPI v3 ドキュメントで特定の
bearer トークン形式を示す必要がある場合にのみ `BearerFormat` を使用します。
`JWTSecurity` はデフォルトで `bearerFormat: JWT` を出力します。

#### OAuth2 認証

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("OAuth2 authentication")
    AuthorizationCodeFlow("/authorize", "/token", "/refresh")
    Scope("api:write", "Write access")
    Scope("api:read", "Read access")
})
```

### セキュリティの適用

セキュリティは、API、サービス、またはメソッドのレベルで適用できる：

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
        // Override with bearer token auth for this method
        Security(BearerAuth)
        Payload(func() {
            BearerToken("token", String)
            Required("token")
        })
    })
    
    Method("public", func() {
        // No security for this method
        NoSecurity()
    })
})
```

### セキュリティのベストプラクティス

1. **本番環境では常に HTTPS を使用する**
2. **一貫したデフォルトのために API レベルでセキュリティを定義する**
3. **公開エンドポイントには `NoSecurity()` を明示的に使用する**
4. **API キー認証にはレート制限を実装する**
5. **bearer トークンと JWT トークンには適切な有効期限を設定する**
6. **シークレットとキーを定期的にローテーションする**
7. **認証失敗をログに記録して監視する**
8. **認証済みリクエストでもすべての入力を検証する**

---

## よくあるパターン

### グレースフル・シャットダウン

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

### 構成管理

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

### サーバーのタイムアウト

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

## 要約

本番用のGoaサービスには以下のものが含まれる：

1. **観測可能性**：トレース、メトリクス、ロギング、ヘルスチェック
2. **セキュリティ適切な認証と承認
3. **レジリエンスグレースフルシャットダウン、タイムアウト、エラー処理
4. **コンフィギュレーション**：環境ベースのコンフィギュレーション管理
5. **モニタリングデバッグエンドポイントとプロファイリング機能

これらのパターンにより、本番環境でのサービスの信頼性、安全性、保守性が保証されます。
