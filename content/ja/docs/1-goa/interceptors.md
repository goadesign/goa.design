---
title: インターセプター
weight: 7
description: "Complete guide to interceptors and middleware in Goa - type-safe Goa interceptors, HTTP middleware, and gRPC interceptors."
llm_optimized: true
aliases:
---

Goa は、型安全なインターセプターと伝統的なミドルウェアパターンを組み合わせた、 リクエスト処理のための包括的なソリューションを提供します。このガイドでは 3 つのアプローチすべてを扱います。

## 概要

Goa サービスでリクエストを処理するとき、3 つの補完的なツールがあります：

1. **Goa インターセプター**：型安全で、コンパイル時にサービスのドメイン型へのアクセスをチェックします。
2. **HTTPミドルウェア**：HTTP特有の懸念に対する標準的な`http.Handler`パターン
3. **gRPC インターセプター**：RPC固有のニーズに対する標準gRPCパターン

### それぞれを使用する場合

| 懸念事項 | ツール |
|---------|------|
| ビジネスロジックの検証 | Goa インターセプター |
| データ変換 | Goa インターセプター |
| リクエスト/レスポンスのエンリッチメント | Goa インターセプター |
| ログ、トレース | HTTP/gRPC ミドルウェア |
| 圧縮、CORS | HTTP ミドルウェア |
| メタデータ処理 | gRPC インターセプター |
| レート制限 | HTTP/gRPC ミドルウェア |

---

## Goa インターセプター

Goa インターセプターは、コンパイル時のチェックと生成されたヘルパーメソッドによって、 サービスのドメイン型への型安全なアクセスを提供します。

### ランタイムモデル（生成コード）

インターセプターはランタイムにある「魔法のフック」ではありません。Goa では **生成された endpoint ラッパー**です。DSL はインターセプターが読み書きできるフィールドを宣言し、コード生成は次を出力します：

- **サービス側の契約** `gen/<service>/service_interceptors.go`
  - `ServerInterceptors` インターフェース：インターセプターごとに 1 メソッド
  - `*<Interceptor>Info` 構造体：サービス/メソッドのメタデータ + アクセサ
  - `*Payload` / `*Result` アクセサ・インターフェース：宣言した読み/書き対象フィールドのみ
- **クライアント側の契約** `gen/<service>/client_interceptors.go`
  - `ClientInterceptors` インターフェースと `*Info` + アクセサ型
- **ラッパーチェーン** `gen/<service>/interceptor_wrappers.go`
  - メソッドごとの `Wrap<Method>Endpoint` と `Wrap<Method>ClientEndpoint`
  - ストリーミングでは `SendWithContext` / `RecvWithContext` をインターセプトする stream ラッパー
- **配線（wiring）** `gen/<service>/endpoints.go` と `gen/<service>/client.go`
  - `NewEndpoints` がサービス endpoint の周りに server wrapper を適用
  - `NewClient` が transport endpoint の周りに client wrapper を適用

重要な帰結：**サーバーインターセプターは transport のデコード後〜サービスメソッド前に実行**され、**クライアントインターセプターは transport のエンコード前に実行され、レスポンスのデコード後にも実行**されます（クライアントコードが呼ぶ型付き endpoint 抽象をそのままラップするため）。

### サーバーインターセプターの契約

Goa はサービスごとにインターフェースを生成します。各インターセプターは `next` をちょうど 1 回呼んで処理を進める必要があります（あるいは早期にエラー/レスポンスを返します）：

```go
type ServerInterceptors interface {
    RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error)
}
```

実行時には通常：

1. `info.Payload()` / `info.Result(res)` で **型安全**にアクセス（推奨）。
2. `info.Service()` / `info.Method()` / `info.CallType()` でログ・メトリクスに安定した識別子を付与。
3. `next(ctx, info.RawPayload())` を呼んでチェーンを継続。
4. 必要に応じて `next` の前に payload を、後に result を変更。

例（result の付加情報 + 処理時間）：

```go
type Interceptors struct{}

func (i *Interceptors) RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error) {
    start := time.Now()

    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }

    r := info.Result(res)
    r.SetProcessedAt(time.Now().UTC().Format(time.RFC3339Nano))
    r.SetDuration(int(time.Since(start).Milliseconds()))

    return res, nil
}
```

アクセサ・インターフェースが重要な理由：

- `ReadPayload(Attribute("recordID"))` を宣言すると、`RecordID() <type>` が生成されます。
- `WriteResult(Attribute("cachedAt"))` を宣言すると、`SetCachedAt(<type>)` が生成されます。
- 宣言していないフィールドにはアクセスできず、契約がコンパイル時に守られます。

### クライアントインターセプターの契約

クライアント側も同じ考え方です。`gen/<service>.NewClient(...)` に渡す transport endpoint をラップします。

実際には：

- `info.RawPayload()` は **メソッドの型付き payload**（例：`*GetPayload`）であり、`*http.Request` ではありません。
- インターセプターが payload に「書き込み」すれば、その変更は transport マッピングに従ってエンコード（header/body など）されます。
- レスポンスのデコード後、`info.Result(res)` で result フィールドを読み書きできます。

### 順序（実際に何が先に動くか）

インターセプターは wrapper チェーンとして適用されます。順序の真実は生成された `Wrap<Method>Endpoint` にあります。

概念的には次のような形になります：

```go
func WrapGetEndpoint(endpoint goa.Endpoint, i ServerInterceptors) goa.Endpoint {
    endpoint = wrapGetCache(endpoint, i)
    endpoint = wrapGetJWTAuth(endpoint, i)
    endpoint = wrapGetRequestAudit(endpoint, i)
    endpoint = wrapGetSetDeadline(endpoint, i)
    endpoint = wrapGetTraceRequest(endpoint, i)
    return endpoint
}
```

各 `wrap...` は「前の endpoint を `next` として呼ぶ」新しい endpoint を返します。その結果：

- **リクエスト方向**：**最後**の wrapper が最初に実行されます。
- **レスポンス方向**：**最初**の wrapper が最初に実行されます。

順序が重要なら、一般的なルールよりも **対象メソッドの生成 wrap** を見て判断してください。

### ストリーミング・インターセプター（Send/Recv）

双方向ストリーミングでは、生成コードが stream をラップして送受信ごとにインターセプトします。単一のインターセプターが複数の呼び出し種別で呼ばれることがあります：

- `goa.InterceptorUnary`：stream endpoint 呼び出しの 1 回だけのインターセプト
- `goa.InterceptorStreamingSend`：各 `SendWithContext` のインターセプト
- `goa.InterceptorStreamingRecv`：各 `RecvWithContext` のインターセプト

必要なら `info.CallType()` で分岐します。send では `info.RawPayload()` がメッセージです。recv では「payload」は `next` が生成し（返り値として見えます）。

### インターセプターの定義

```go
var RequestLogger = Interceptor("RequestLogger", func() {
    Description("Logs incoming requests and their timing")
    
    // Read status from result
    ReadResult(func() {
        Attribute("status")
    })
    
    // Add timing information to result
    WriteResult(func() {
        Attribute("processedAt")
        Attribute("duration")
    })
})
```

### インターセプターの適用

サービスまたはメソッドレベルで適用する：

```go
var _ = Service("calculator", func() {
    // Apply to all methods
    ServerInterceptor(RequestLogger)
    
    Method("add", func() {
        // Method-specific interceptor
        ServerInterceptor(ValidateNumbers)
        
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(func() {
            Attribute("sum", Int)
            Attribute("status", Int)
            Attribute("processedAt", String)
            Attribute("duration", Int)
        })
    })
})
```

### インターセプターの実装

```go
func (i *Interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // Call next interceptor or endpoint
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Access result through type-safe interface
    r := info.Result(res)
    
    // Add timing information
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

### アクセスパターン

#### 読み取り専用アクセス

```go
var Monitor = Interceptor("Monitor", func() {
    Description("Collects metrics without modifying data")
    
    ReadPayload(func() {
        Attribute("size")
    })
    
    ReadResult(func() {
        Attribute("status")
    })
})
```

#### 書き込みアクセス

```go
var Enricher = Interceptor("Enricher", func() {
    Description("Adds context information")
    
    WritePayload(func() {
        Attribute("requestID")
    })
    
    WriteResult(func() {
        Attribute("processedAt")
    })
})
```

#### 複合アクセス

```go
var DataProcessor = Interceptor("DataProcessor", func() {
    Description("Processes both requests and responses")
    
    ReadPayload(func() {
        Attribute("rawData")
    })
    WritePayload(func() {
        Attribute("processed")
    })
    
    ReadResult(func() {
        Attribute("status")
    })
    WriteResult(func() {
        Attribute("enriched")
    })
})
```

### クライアント側のインターセプター

```go
var ClientContext = Interceptor("ClientContext", func() {
    Description("Enriches requests with client context")
    
    WritePayload(func() {
        Attribute("clientVersion")
        Attribute("clientID")
    })
    
    ReadResult(func() {
        Attribute("rateLimit")
        Attribute("rateLimitRemaining")
    })
})

var _ = Service("inventory", func() {
    ClientInterceptor(ClientContext)
    // ...
})
```

### ストリーミングインターセプター

ストリーミング・メソッドには、ストリーミング・バリアントを使います：

```go
var ServerProgressTracker = Interceptor("ServerProgressTracker", func() {
    Description("Adds progress to server stream responses")
    
    WriteStreamingResult(func() {
        Attribute("percentComplete")
        Attribute("itemsProcessed")
    })
})

var ClientMetadataEnricher = Interceptor("ClientMetadataEnricher", func() {
    Description("Enriches outgoing client stream messages")
    
    WriteStreamingPayload(func() {
        Attribute("clientTimestamp")
    })
})
```

### 実行順序

Goa は各メソッドの endpoint の周りに wrapper チェーンを構築してインターセプターを適用します。特にサービスレベルとメソッドレベルを混在させたときの「正確な順序」を理解する最も簡単な方法は、生成された `Wrap<Method>Endpoint` を見て、次を覚えることです：

- **最後**の wrapper が **リクエスト方向で最初**に実行される
- **最初**の wrapper が **レスポンス方向で最初**に実行される

順序を安定した契約として扱いたい場合は、そのメソッドの生成 wrap を順序仕様の正として扱ってください。

---

## HTTP ミドルウェア

HTTPミドルウェアは、標準的な`http.Handler`パターンを使ってプロトコルレベルの懸念を処理します。

### 一般的なミドルウェアスタック

```go
mux := goahttp.NewMuxer()

// Add middleware (outermost to innermost)
mux.Use(debug.HTTP())                               // Debug logging
mux.Use(otelhttp.NewMiddleware("service"))          // OpenTelemetry
mux.Use(log.HTTP(ctx))                              // Request logging
mux.Use(goahttpmiddleware.RequestID())              // Request ID
mux.Use(goahttpmiddleware.PopulateRequestContext()) // Goa context
``` パターン

### カスタムミドルウェアの作成

```go
func ExampleMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Pre-processing
        start := time.Now()
        
        next.ServeHTTP(w, r)
        
        // Post-processing
        log.Printf("Request took %v", time.Since(start))
    })
}
```

### セキュリティヘッダーミドルウェア

```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        
        next.ServeHTTP(w, r)
    })
}
```

### コンテキスト・エンリッチメント・ミドルウェア

```go
func ContextEnrichmentMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        ctx = context.WithValue(ctx, "request.start", time.Now())
        ctx = context.WithValue(ctx, "request.id", r.Header.Get("X-Request-ID"))
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### エラー処理ミドルウェア

```go
func ErrorHandlingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic recovered: %v", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

---

## gRPCインターセプター

gRPCインターセプターは、RPCコールのプロトコルレベルの懸念を処理します。

### 単項インターセプター

```go
func LoggingInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        start := time.Now()
        
        resp, err := handler(ctx, req)
        
        log.Printf("Method: %s, Duration: %v, Error: %v",
            info.FullMethod, time.Since(start), err)
        
        return resp, err
    }
}
```

### ストリームインターセプタ

```go
func StreamLoggingInterceptor() grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        start := time.Now()
        
        err := handler(srv, ss)
        
        log.Printf("Stream: %s, Duration: %v, Error: %v",
            info.FullMethod, time.Since(start), err)
        
        return err
    }
}
```

### Goaとの統合

```go
func main() {
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            MetadataInterceptor(),
            LoggingInterceptor(),
            MonitoringInterceptor(),
        )),
        grpc.StreamInterceptor(grpc_middleware.ChainStreamServer(
            StreamMetadataInterceptor(),
            StreamLoggingInterceptor(),
        )),
    )

    pb.RegisterServiceServer(srv, server)
}
```

---

## 3つの組み合わせ

3つのアプローチの組み合わせは以下の通りだ：

```go
func main() {
    // 1. Create service with Goa interceptors
    svc := NewService()
    interceptors := NewInterceptors(log.Default())
    endpoints := NewEndpoints(svc, interceptors)
    
    // 2. Set up HTTP with middleware
    mux := goahttp.NewMuxer()
    mux.Use(otelhttp.NewMiddleware("payment-svc"))
    mux.Use(debug.HTTP())
    mux.Use(log.HTTP(ctx))
    
    httpServer := genhttp.New(endpoints, mux, dec, enc, eh, eh)
    genhttp.Mount(mux, httpServer)
    
    // 3. Set up gRPC with interceptors
    grpcServer := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            grpc_recovery.UnaryServerInterceptor(),
            grpc_prometheus.UnaryServerInterceptor,
        )),
    )
    
    grpcSvr := gengrpc.New(endpoints, nil)
    genpb.RegisterPaymentServer(grpcServer, grpcSvr)
}
```

### 実行フロー

```
Request Processing:
─────────────────────────────────────────────────────────────────>
HTTP/gRPC Middleware → Goa Interceptors → Service Method

Response Processing:
<─────────────────────────────────────────────────────────────────
Service Method → Goa Interceptors → HTTP/gRPC Middleware
```

---

## ベストプラクティス

### Goa インターセプター
- ビジネスロジックの検証とデータ変換に使用する
- インターセプターは単一の責務に集中させる
- 型安全なアクセスパターンを使用する

### HTTP ミドルウェア
- ミドルウェアの順序は慎重に（パニック・リカバリを最初に、次にロギングなど）。
- 高価なオブジェクトは事前にコンパイルしておく（正規表現など）
- 頻繁に割り当てられるオブジェクトには sync.Pool を使用する。

### gRPC インターセプター
- プロトコルレベルの懸念に焦点を当てる
- コンテキストキャンセルを適切に処理する
- 適切なステータスコードを使用する

### 一般
- インターセプター／ミドルウェアを分離してテストする
- パフォーマンスへの影響を考慮する
- 各インターセプターの目的を文書化する
