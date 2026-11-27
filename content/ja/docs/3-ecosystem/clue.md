---
title: "Clue"
weight: 3
description: "Go 向けのマイクロサービス計装ライブラリ — ロギング、トレーシング、メトリクス、ヘルスチェック、デバッグ。"
llm_optimized: true
---

Clue は OpenTelemetry をベースに、Go のマイクロサービス向けに包括的な計装（instrumentation）を提供します。Goa とシームレスに統合できるよう設計されていますが、あらゆる Go の HTTP / gRPC サービスで利用できます。

## なぜ Clue なのか？

Clue が解決するのは、マイクロサービスでよく直面する課題です。障害時には詳細なログが必要ですが、常にあらゆるログを出力してコストを払いたくはありません。

Clue のアプローチは明快です：**ログメッセージをメモリにバッファし、エラーが発生したとき、またはリクエストがトレースされているときだけ書き出す**。トレース対象外の正常なリクエストはログを一切出力しません。エラーが起きたときは、失敗に至るまでの文脈がすべて手に入ります。

この 1 つの設計判断によって、必要なデバッグ情報を保持したままログ量を劇的に削減できます。

## パッケージ概要

| パッケージ | 目的 |
|---------|---------|
| `clue` | OpenTelemetry 設定 — 1 回の呼び出しでメトリクスとトレーシングをセットアップ |
| `log` | スマートバッファリングを備えたコンテキストベースの構造化ロギング |
| `health` | Kubernetes やオーケストレーション基盤向けのヘルスチェックエンドポイント |
| `debug` | 実行時デバッグ — デバッグログの動的切り替え、pprof エンドポイント |
| `mock` | 依存関係のテストダブルを生成・設定 |
| `interceptors` | 個々のストリームメッセージをトレースするための Goa インターセプター |

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

`log` パッケージは Go の `context.Context` を中心に設計されています。ロギング用のコンテキストを一度初期化し、アプリケーション全体で引き回します。すべてのログ関数は第 1 引数にこのコンテキストを受け取ります。

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

{{< anchors "バッファリングを理解する" >}}
### バッファリングの仕組み

ここが Clue の中核機能です。ログ関数には 2 種類あります：

**即時関数** — 直接出力へ書き込みます:
- `Print()`, `Printf()` - 常に即座に書き込み
- `Error()`, `Errorf()` - バッファをフラッシュしてから書き込み
- `Fatal()`, `Fatalf()` - バッファをフラッシュし、書き込んでから終了

**バッファ関数** — フラッシュされるまでメモリに保持します:
- `Info()`, `Infof()` - メッセージをバッファに保持
- `Warn()`, `Warnf()` - メッセージをバッファに保持
- `Debug()`, `Debugf()` - デバッグモードが有効な場合のみ出力（それ以外は破棄）

バッファは次のタイミングで自動的にフラッシュされます:
1. `Error()` または `Fatal()` が呼ばれたとき
2. リクエストがトレースされているとき（OpenTelemetry のスパンコンテキストから検出）
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

成功したリクエストでは：**ログ出力はゼロ**。失敗したリクエストでは：**完全な文脈**が出力されます。

### With() でコンテキストを追加する

サービス内をリクエストが流れるにつれて、ロギングコンテキストを積み上げます:

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

ログフィールドの順序を揃えたい場合（目視で追いやすい）は `KV` を、順序を問わない場合は `Fields` を使います。

値には文字列、数値、真偽値、`nil`、およびこれらの型のスライスを指定できます。

### ログフォーマット

Clue はターミナルを自動検出し、適切なフォーマットを選択します:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText**（非ターミナル時のデフォルト） — logfmt 形式:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal**（ターミナル時のデフォルト） — カラー表示・相対タイムスタンプ:
```
INFO[0042] user=alice action=login
```

**FormatJSON** — 構造化 JSON:
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

{{< anchors "trace--span-id-を追加する" >}}
### Trace ID と Span ID を追加する

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

デバッグ向けにソースファイルと行番号を追加します:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

出力に `file=mypackage/handler.go:42` が含まれます。

### HTTP ミドルウェア

HTTP ミドルウェアは次の 2 つを行います:
1. ベースコンテキストから各リクエストのコンテキストへロガーをコピーする
2. メソッド、URL、ステータス、所要時間を含めてリクエストの開始・終了をログに記録する

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

{{< anchors "grpc-インターセプタ" >}}
### gRPC インターセプター

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

HTTP トランスポートをラップして外向きリクエストを記録します:

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

{{< anchors "ログキーをカスタマイズする" >}}
### ログキーのカスタマイズ

ログキーはすべてパッケージ変数として公開されており、上書きできます:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

{{< anchors "他ロガー向けアダプタ" >}}
### 他のロガー向けアダプター

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

`clue` パッケージは、単一の関数呼び出しで実用的なデフォルトを備えた OpenTelemetry 設定を行います。

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

Clue には、トラフィック量に応じてサンプリングレートを自動調整するアダプティブサンプラーが組み込まれています。これにより、トラフィックスパイク時にトレースストレージが過負荷になるのを防ぎます。

デフォルト設定:
- **最大サンプリングレート:** 1 秒あたり 2 トレース
- **サンプルサイズ:** 調整間隔 10 リクエスト

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

{{< anchors "エクスポータ作成のヘルパー関数" >}}
### エクスポーター作成のヘルパー関数

適切なシャットダウン処理を備えたエクスポーターを作成するヘルパー関数が用意されています:

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

不要なエクスポーターには `nil` を渡します:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## health パッケージ

`health` パッケージは、サービスの依存先状態をレポートするヘルスチェックエンドポイントを作成します。

{{< anchors "基本利用" >}}
### 基本的な使い方

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

{{< anchors "依存関係のチェック" >}}
### HTTP サービス依存先のチェック

`/livez`（または任意のパス）のヘルスエンドポイントを公開している上流 HTTP サービスをプローブするには `NewPinger` を使います（SQL データベースや Redis には、後述の 2 メソッドからなる `Pinger` インターフェースを実装してください）:

```go
checker := health.NewChecker(
    health.NewPinger("orders-service", "orders.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("inventory-service", "inventory.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https"), health.WithTimeout(5*time.Second)),
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

独自のチェックを行うには `Pinger` インターフェースを実装します:

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

ハンドラーはデフォルトで JSON を返し、要求に応じて XML を返します:

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

ビルド時にバージョンを設定できます:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## debug パッケージ

`debug` パッケージを使うと、再デプロイなしで実行時のトラブルシューティングを行えます。

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

**重要:** このエンドポイントはフラグを切り替えるだけです。実際に反映するには debug ミドルウェアを組み込む必要があります:

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
- `/debug/pprof/` - インデックスページ
- `/debug/pprof/heap` - ヒーププロファイル
- `/debug/pprof/goroutine` - ゴルーチンプロファイル
- `/debug/pprof/profile` - CPU プロファイル（デフォルト 30 秒）
- `/debug/pprof/trace` - 実行トレース
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex` など

⚠️ **セキュリティ警告:** pprof エンドポイントを外部へ公開しないでください。アプリケーションの機微な内部情報が露出します。

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Goa 向けペイロードロギング

デバッグ有効時にリクエストとレスポンスのペイロードをログ出力します:

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

{{< anchors "goa-muxer-アダプタ" >}}
### Goa Muxer アダプター

Goa の HTTP muxer 向け:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## mock パッケージ

`mock` パッケージは、呼び出し順序（シーケンス）や永続モックをサポートした依存関係のテストダブル作成を支援します。

{{< anchors "概念" >}}
### 基本概念

**シーケンス（Sequences）:** 期待される呼び出しを順序付きで定義します。`Next()` を呼ぶたびにシーケンス内の次の関数を返します。

**永続モック（Permanent mocks）:** シーケンスが尽きた後、または呼び出し順序を問わない場合に常に同じ関数を返します。

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

シーケンスは永続モックより優先され、シーケンスが尽きると `Next()` は永続モックを返します。

{{< anchors "モックジェネレータcmg" >}}
### モックジェネレーター（cmg）

インターフェースからモックを自動生成します:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

生成されたモックは、元のソースファイルと同じ階層の `mocks/` サブディレクトリに出力されます。

---

## interceptors パッケージ

`interceptors` パッケージは、ストリーミング RPC 内の個々のメッセージをトレースするための Goa インターセプターを提供します。ストリーム全体を 1 つとしてトレースする標準の OpenTelemetry 計装とは異なり、各メッセージを通じてトレースコンテキストを伝播します。

### 使いどころ

次のようなケースで利用します:
- 長時間接続のストリームにおけるメッセージ単位のトレーシング
- ストリームメッセージを介したクライアントからサーバーへのトレースコンテキスト伝播
- 個々のメッセージの所要時間計測と相関付け

{{< anchors "デザイン設定" >}}
### 設計側のセットアップ

Goa の設計で `TraceMetadata` 属性を持つインターセプターを定義します:

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

インターセプター実装で提供関数を呼び出します:

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

Goa が生成するストリームインターフェースは context を返さないため、ヘルパー関数を使います:

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

より簡潔に書くにはラッパーを使います:

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

{{< anchors "完全な例" >}}
## 完全な実装例

計装一式を組み込んだ Goa サービスの例です:

```go
package main

import (
    "context"
    "net/http"
    "time"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "goa.design/clue/clue"
    "goa.design/clue/debug"
    "goa.design/clue/health"
    "goa.design/clue/log"
    goahttp "goa.design/goa/v3/http"

    catalogapi "example.com/catalog"
    gencatalog "example.com/catalog/gen/catalog"
    genhttp "example.com/catalog/gen/http/catalog/server"
)

func main() {
    // 1. Initialize logging context with trace correlation
    ctx := log.Context(context.Background(),
        log.WithFormat(log.FormatJSON),
        log.WithFunc(log.Span),
    )

    // 2. Configure OpenTelemetry
    spanExporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    metricExporter, err := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    cfg, err := clue.NewConfig(ctx, "catalog", "1.0.0", metricExporter, spanExporter)
    if err != nil {
        log.Fatal(ctx, err)
    }
    clue.ConfigureOpenTelemetry(ctx, cfg)

    // 3. Create Goa endpoints and mount generated HTTP server
    svc := catalogapi.NewCatalog()
    endpoints := gencatalog.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads()) // Log payloads when debug enabled
    endpoints.Use(log.Endpoint)        // Add goa.service and goa.method to logs

    mux := goahttp.NewMuxer()
    srv := genhttp.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    genhttp.Mount(mux, srv)

    // 4. Mount debug, pprof, and dependency health endpoints
    usersAddr := "localhost:8081"
    debug.MountDebugLogEnabler(debug.Adapt(mux))
    debug.MountPprofHandlers(debug.Adapt(mux))
    check := health.Handler(health.NewChecker(
        health.NewPinger("users-service", usersAddr, health.WithTimeout(5*time.Second)),
    ))
    mux.Handle("GET", "/healthz", check.ServeHTTP)

    // 5. Wrap mux with OpenTelemetry, debug control, and request logging middleware
    var handler http.Handler = mux
    handler = otelhttp.NewHandler(handler, "catalog")
    handler = debug.HTTP()(handler)
    handler = log.HTTP(ctx)(handler)

    // 6. Start server
    log.Printf(ctx, "starting server on :8080")
    log.Fatal(ctx, http.ListenAndServe(":8080", handler))
}
```

---

## ベストプラクティス

### ロギング

1. **リクエスト処理には `Info()`、ライフサイクルイベントには `Print()` を使う。** リクエストログはバッファに溜め、起動・終了ログは即座に書き出します。

2. **早めにコンテキストを追加し、遅めにログを出す。** ID やメタデータが判明した時点で `log.With()` を使って追加します。

3. **常にトレース相関を有効にする。** `log.WithFunc(log.Span)` を設定し、ログとトレースを紐付けられるようにします。

### ヘルスチェック

1. **実際の依存先を検査する。** 無条件に 200 を返すのではなく、データベース接続や下流サービスを検証します。

2. **タイムアウトを設定する。** ハングするヘルスチェックは、失敗を返すヘルスチェックより深刻です。

3. **liveness と readiness を分ける。** プロセス自体の生存確認には `/livez`、依存先を含めた受け入れ可否には `/readyz` を使います。

### デバッグ

1. **pprof を外部に公開しない。** 内部専用ポートまたはネットワークポリシーで保護してください。

2. **デバッグ切り替えを前提に設計する。** デバッグモードを有効にした際、過剰なノイズを出さずに有用な情報が得られるようログを構造化します。

---

## 関連リンク

- [Production Guide](../../1-goa/production/) — 本番デプロイのパターン
- [Clue GitHub リポジトリ](https://github.com/goadesign/clue) — ソースコードと weather サンプル
- [OpenTelemetry ドキュメント](https://opentelemetry.io/docs/) — OpenTelemetry の概念
