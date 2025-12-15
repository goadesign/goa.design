---
title: "Clue"
weight: 3
description: "Go 向けのマイクロサービス計測 - ロギング、トレーシング、メトリクス、ヘルスチェック、デバッグ。"
llm_optimized: true
---

Clue は OpenTelemetry をベースに、Go のマイクロサービス向けに包括的な計測（instrumentation）を提供します。Goa とシームレスに統合できるよう設計されていますが、Clue はあらゆる Go の HTTP / gRPC サービスで利用できます。

## なぜ Clue なのか？

Clue が解くのは、マイクロサービスでよくある課題です。障害時には詳細なログが必要ですが、常にすべてをログに出してコストを支払いたくはありません。

Clue のアプローチはこうです: **ログメッセージをメモリにバッファし、エラーが発生したとき、またはリクエストがトレースされているときだけ書き出す**。成功し、トレースされていないリクエストはログ出力を生成しません。エラーが起きたときは、失敗に至るまでの文脈がすべて手に入ります。

この 1 つの設計判断によって、必要なデバッグ情報を保持したままログ量を劇的に削減できます。

## パッケージ概要

| パッケージ | 目的 |
|---------|---------|
| `clue` | OpenTelemetry 設定 - 1 回の呼び出しでメトリクスとトレーシングをセットアップ |
| `log` | コンテキストベースの構造化ロギング（賢いバッファリング付き） |
| `health` | Kubernetes / オーケストレーション向けヘルスチェックエンドポイント |
| `debug` | 実行時デバッグ - デバッグログの切り替え、pprof エンドポイント |
| `mock` | 依存関係のテストダブルを生成・設定 |
| `interceptors` | 個々のストリームメッセージをトレースするための Goa インターセプタ |

## インストール

必要なパッケージだけをインストールします:

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## log パッケージ

`log` パッケージは Go の `context.Context` を中心に設計されています。ロギング用のコンテキストを 1 度初期化し、アプリケーション全体で引き回します。すべてのログ関数は、第一引数にこのコンテキストを取ります。

### クイックスタート

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

### バッファリングを理解する

ここが Clue の中核機能です。ログ関数には 2 種類あります。

**即時関数** - 直接出力へ書き込みます:
- `Print()`, `Printf()` - 常に即時に書き込み
- `Error()`, `Errorf()` - バッファをフラッシュしてから書き込み
- `Fatal()`, `Fatalf()` - バッファをフラッシュし、書き込み、終了

**バッファ関数** - フラッシュされるまでメモリに保持します:
- `Info()`, `Infof()` - メッセージをバッファ
- `Warn()`, `Warnf()` - メッセージをバッファ  
- `Debug()`, `Debugf()` - デバッグが有効な場合にバッファ

バッファは次のタイミングで自動的にフラッシュされます:
1. `Error()` または `Fatal()` が呼ばれたとき
2. リクエストがトレースされているとき（OpenTelemetry の span context を検出）
3. デバッグモードが有効なとき

**例: これがなぜ重要か**

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

成功したリクエストでは: **ログ出力はゼロ**。失敗したリクエストでは: **完全な文脈**。

### With() でコンテキストを追加する

サービス内をリクエストが流れていくにつれて、ロギングコンテキストを積み上げます:

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

### キー・バリューペア

キー・バリューペアの指定方法は 2 つあります:

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

ログフィールドの順序が重要な場合（目視で追いやすい）には `KV` を、重要でない場合は `Fields` を使います。

値には、文字列・数値・ブール値・nil・これらの型のスライスが使えます。

### ログフォーマット

Clue はターミナルを自動検出し、適切なフォーマットを選びます:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText**（非ターミナルのデフォルト） - logfmt 形式:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal**（ターミナルのデフォルト） - 色付き、相対タイムスタンプ:
```
INFO[0042] user=alice action=login
```

**FormatJSON** - 構造化 JSON:
```json
{"time":"2024-01-15T10:30:00Z","level":"info","user":"alice","action":"login"}
```

**カスタムフォーマット:**

```go
func myFormat(e *log.Entry) []byte {
    return []byte(fmt.Sprintf("[%s] %v\n", e.Severity, e.KeyVals))
}

ctx := log.Context(context.Background(), log.WithFormat(myFormat))
```

### Trace / Span ID を追加する

ログを分散トレースに紐付けます:

```go
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON),
    log.WithFunc(log.Span),  // Adds trace_id and span_id to every log
)
```

出力:
```json
{"time":"...","level":"info","trace_id":"abc123","span_id":"def456","msg":"hello"}
```

### ファイル位置を追加する

デバッグ用途に、ソースファイルと行番号を追加します:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

出力に `file=mypackage/handler.go:42` が含まれます。

### HTTP ミドルウェア

HTTP ミドルウェアは 2 つのことを行います:
1. ベースコンテキストから logger を各リクエストのコンテキストへコピーする
2. method / URL / status / duration を含めて、リクエストの開始と終了をログする

```go
func main() {
    ctx := log.Context(context.Background())
    
    handler := http.HandlerFunc(myHandler)
    handler = log.HTTP(ctx)(handler)  // Note: returns middleware, then apply
    
    http.ListenAndServe(":8080", handler)
}
```

**オプション:**

```go
// Skip logging for certain paths (e.g., health checks)
handler = log.HTTP(ctx, log.WithPathFilter(regexp.MustCompile(`^/healthz$`)))(handler)

// Disable request logging entirely (still sets up context)
handler = log.HTTP(ctx, log.WithDisableRequestLogging())(handler)

// Disable request ID generation
handler = log.HTTP(ctx, log.WithDisableRequestID())(handler)
```

### gRPC インターセプタ

gRPC サーバー向け:

```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(log.UnaryServerInterceptor(ctx)),
    grpc.ChainStreamInterceptor(log.StreamServerInterceptor(ctx)),
)
```

gRPC クライアント向け:

```go
conn, err := grpc.Dial(addr,
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(log.StreamClientInterceptor()),
)
```

### HTTP クライアントのロギング

HTTP Transport をラップして外向きリクエストをログします:

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

### Goa との統合

サービス名とメソッド名をログに追加します:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

### ログキーをカスタマイズする

ログキーはすべてパッケージ変数として定義されており、上書きできます:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

### 他ロガー向けアダプタ

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

## clue パッケージ

`clue` パッケージは、OpenTelemetry を「良いデフォルト」で単一の関数呼び出しで設定します。

### 基本セットアップ

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

### アダプティブサンプリング

Clue には、トラフィック量に応じてサンプリングレートを自動調整するアダプティブサンプラーが含まれます。これにより、トラフィックスパイク時にトレース保存が過負荷になるのを防げます。

デフォルト設定:
- **最大サンプリングレート:** 1 秒あたり 2 トレース
- **サンプルサイズ:** 調整間隔 10 リクエスト

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

### エクスポータ作成のヘルパー関数

Clue は、適切な shutdown 処理まで含めてエクスポータを作成するヘルパー関数を提供します:

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

### 設定オプション

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

### メトリクスまたはトレーシングの無効化

不要な方のエクスポータに `nil` を渡します:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## health パッケージ

`health` パッケージは、サービス依存先をレポートするヘルスチェックエンドポイントを作成します。

### 基本利用

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

### 依存関係のチェック

ヘルスエンドポイントを公開しているサービスをチェックするには `NewPinger` を使います:

```go
checker := health.NewChecker(
    health.NewPinger("database-service", "db.internal:8080"),
    health.NewPinger("cache-service", "cache.internal:8080"),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https")),
)
```

**Pinger のオプション:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

### カスタムヘルスチェック

カスタムチェックのために `Pinger` インターフェイスを実装します:

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

### レスポンス形式

ハンドラはデフォルトでは JSON を返し、要求に応じて XML を返します:

**正常（HTTP 200）:**
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

**異常（HTTP 503）:**
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

ビルド時に version を設定できます:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## debug パッケージ

`debug` パッケージは、再デプロイなしで実行時のトラブルシューティングを可能にします。

### 動的デバッグロギング

実行時にデバッグログを切り替えるエンドポイントをマウントします:

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

HTTP 経由でデバッグログを制御します:

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

**重要:** このエンドポイントはフラグを制御するだけです。効果を出すには debug ミドルウェアを使用する必要があります:

```go
// For HTTP servers
handler = debug.HTTP()(handler)

// For gRPC servers
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(debug.UnaryServerInterceptor()),
    grpc.ChainStreamInterceptor(debug.StreamServerInterceptor()),
)
```

**オプション:**

```go
debug.MountDebugLogEnabler(mux,
    debug.WithPath("/api/debug"),     // Default: "/debug"
    debug.WithQuery("logging"),        // Default: "debug-logs"
    debug.WithOnValue("enable"),       // Default: "on"
    debug.WithOffValue("disable"),     // Default: "off"
)
```

### pprof エンドポイント

Go のプロファイリングエンドポイントをマウントします:

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

利用可能なエンドポイント:
- `/debug/pprof/` - Index page
- `/debug/pprof/heap` - Heap profile
- `/debug/pprof/goroutine` - Goroutine profile
- `/debug/pprof/profile` - CPU profile (30s by default)
- `/debug/pprof/trace` - Execution trace
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, etc.

⚠️ **セキュリティ警告:** pprof エンドポイントを公開インターネットへ露出させないでください。アプリケーションの機微情報が漏れる可能性があります。

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Goa 向けペイロードロギング

デバッグが有効なときに、リクエストとレスポンスのペイロードをログします:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())  // Only logs when debug enabled
endpoints.Use(log.Endpoint)
```

**オプション:**

```go
debug.LogPayloads(
    debug.WithMaxSize(2048),  // Max bytes to log, default: 1024
    debug.WithFormat(debug.FormatJSON),  // Custom formatter
    debug.WithClient(),  // Prefix keys with "client-" for client-side logging
)
```

### Goa Muxer アダプタ

Goa の HTTP muxer 向け:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## mock パッケージ

`mock` パッケージは、依存関係のテストダブルを作成するのに役立ちます。呼び出し順序（sequence）や永続モック（permanent mock）をサポートします。

### 概念

**シーケンス（Sequences）:** 期待される呼び出しを順序付きで定義します。`Next()` を呼ぶたびに、シーケンス内の次の関数を返します。

**永続モック（Permanent mocks）:** 常に同じ関数を返します。シーケンスが尽きた後、または順序が重要でない場合に使います。

### モックの作成

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

### テストでモックを使う

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

### 永続モック

常に同じ振る舞いをする呼び出しには `Set()` を使います:

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

シーケンスは永続モックより優先されます。シーケンスが尽きると `Next()` は永続モックを返します。

### モックジェネレータ（cmg）

インターフェイスからモックを自動生成します:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

生成されたモックは、元のソースファイルの隣にある `mocks/` サブディレクトリへ出力されます。

---

## interceptors パッケージ

`interceptors` パッケージは、ストリーミング RPC で個々のメッセージをトレースするための Goa インターセプタを提供します。標準の OpenTelemetry 計測（ストリーム全体をトレース）とは異なり、これらのインターセプタは各メッセージを通じてトレースコンテキストを伝播します。

### 使いどころ

次のような場合に利用します:
- 長時間動くストリームで、メッセージ単位のトレーシングが必要
- ストリームメッセージを通じて、クライアントからサーバへトレースコンテキストを流したい
- 個々のメッセージのタイミングと相関（correlation）が欲しい

### デザイン設定

Goa のデザインで `TraceMetadata` 属性を持つインターセプタを定義します:

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

ストリーミングメソッドへ適用します:

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### 実装

インターセプタ実装では、提供される関数を呼び出します:

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

### 受信メッセージからトレースコンテキストを取り出す

Goa が生成するストリームインターフェイスは context を返さないため、ヘルパー関数を使います:

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

よりすっきり書くには、ラッパーを使います:

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

## 完全な例

完全に計測された Goa サービスの例:

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

## ベストプラクティス

### ロギング

1. **リクエスト処理には `Info()`、ライフサイクルイベントには `Print()` を使う。** リクエストログはバッファし、起動・終了ログは即時に書き出します。

2. **早くコンテキストを追加し、遅くログする。** `log.With()` を使い、ID やメタデータを分かった時点ですぐ追加します。

3. **常にトレース相関を追加する。** `log.WithFunc(log.Span)` を使って、ログをトレースと相関付けられるようにします。

### ヘルスチェック

1. **実際の依存関係をチェックする。** ただ 200 を返すのではなく、DB 接続や下流サービスを検証します。

2. **タイムアウトを設定する。** ハングするヘルスチェックは、失敗するヘルスチェックより悪いです。

3. **liveness と readiness を分離する。** 基本的なプロセスの生存確認には `/livez`、依存関係まで含めた確認には `/readyz` を使います。

### デバッグ

1. **pprof を絶対に公開しない。** 別の内部ポート、またはネットワークポリシーで保護します。

2. **デバッグ切り替え前提で設計する。** デバッグモードで有用な情報が出て、かつ過剰なログにならないようにロギングを構造化します。

---

## 関連リンク

- [Production Guide](../../1-goa/production/) — 本番デプロイのパターン
- [Clue GitHub Repository](https://github.com/goadesign/clue) — ソースコードと weather サンプル
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) — OpenTelemetry の概念

