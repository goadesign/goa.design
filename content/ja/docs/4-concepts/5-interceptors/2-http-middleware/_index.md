---
linkTitle: HTTPミドルウェア
title: HTTPミドルウェア
weight: 2
description: >
  ロギング、メトリクス、トレーシング、リクエストコンテキストなどのプロトコルレベルの関心事を処理するために、GoaサービスでHTTPミドルウェアを使用する方法を学びます。
---

# HTTPミドルウェア

GoaサービスのHTTPミドルウェアは、ロギング、メトリクス、トレーシング、リクエストコンテキスト管理など、
プロトコルレベルの関心事を処理します。このガイドでは、Goaサービスでミドルウェアを効果的に使用する
方法を説明します。

## コアコンセプト

HTTPミドルウェアはHTTPハンドラーをラップして処理チェーンを形成します。各ミドルウェアは、リクエストが
処理される前後でアクションを実行できます：

```go
func ExampleMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 前処理
        // 例：ロギング、メトリクス、トレーシング

        next.ServeHTTP(w, r)

        // 後処理
        // 例：レスポンスのロギング、クリーンアップ
    })
}
```

## 一般的なミドルウェアスタック

典型的なGoaサービスは以下のミドルウェアスタックを使用します：

```go
// ベースとなるHTTPハンドラーを作成
handler := mux

// 標準的なミドルウェアチェーンを追加
handler = debug.HTTP()(handler)                    // デバッグログ制御
handler = otelhttp.NewHandler(handler, "service")  // OpenTelemetry計装
handler = log.HTTP(ctx)(handler)                   // リクエストログ
handler = goahttpmiddleware.RequestID()(handler)   // リクエストID生成
handler = goahttpmiddleware.PopulateRequestContext()(handler)  // Goaコンテキスト設定
```

## 重要なミドルウェアの種類

### 1. 可観測性ミドルウェア

ロギング、メトリクス、トレーシングを処理します：

```go
// パスフィルタリング付きのロギングミドルウェア
handler = log.HTTP(ctx, 
    log.WithPathFilter(regexp.MustCompile(`^/(healthz|metrics)$`)))(handler)

// OpenTelemetryトレーシングミドルウェア
handler = otelhttp.NewHandler(handler, "service-name",
    otelhttp.WithMessageEvents(otelhttp.ReadEvents, otelhttp.WriteEvents))
```

### 2. コンテキスト管理

リクエストコンテキストに有用な情報を追加します：

```go
func ContextEnrichmentMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // リクエストスコープの値を追加
        ctx := r.Context()
        ctx = context.WithValue(ctx, "request.start", time.Now())
        ctx = context.WithValue(ctx, "request.id", r.Header.Get("X-Request-ID"))
        
        // 強化されたコンテキストで続行
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 3. セキュリティミドルウェア

認証とリクエスト検証を処理します：

```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // セキュリティヘッダーを設定
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        
        next.ServeHTTP(w, r)
    })
}
```

## ベストプラクティス

### 1. ミドルウェアの順序

ミドルウェアを外側から内側へと慎重に順序付けします：

1. パニックリカバリー
2. リクエストID生成
3. ロギング/トレーシング
4. セキュリティヘッダー
5. 認証
6. コンテキスト設定
7. ビジネスロジック

### 2. パフォーマンスの最適化

パフォーマンスのためにミドルウェアを最適化します：

```go
func OptimizedMiddleware(next http.Handler) http.Handler {
    // 高コストなオブジェクトを事前コンパイル
    pathRegex := regexp.MustCompile(`^/api/v\d+/`)
    
    // 頻繁にアロケーションされるオブジェクトにsync.Poolを使用
    bufPool := sync.Pool{
        New: func() interface{} {
            return new(bytes.Buffer)
        },
    }
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // マッチしないパスの場合はミドルウェアをスキップ
        if !pathRegex.MatchString(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }
        
        // プールされたリソースを使用
        buf := bufPool.Get().(*bytes.Buffer)
        buf.Reset()
        defer bufPool.Put(buf)
        
        next.ServeHTTP(w, r)
    })
}
```

### 3. エラー処理

一貫したエラー処理を行います：

```go
func ErrorHandlingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                // リクエストコンテキストとともにエラーをログ
                log.Printf("パニックを回復: %v", err)
                
                // 500レスポンスを返す
                http.Error(w, "内部サーバーエラー", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

## Goaサービスとの統合

Goaサービスとミドルウェアを統合する際：

```go
func main() {
    // 1. ベースとなるマルチプレクサを作成
    mux := goahttp.NewMuxer()
    
    // 2. Goaサーバーを作成してマウント
    server := genhttp.New(endpoints, mux, decoder, encoder, eh, eh)
    genhttp.Mount(mux, server)
    
    // 3. ミドルウェアスタックを追加
    handler := mux
    handler = debug.HTTP()(handler)                // デバッグログ
    handler = otelhttp.NewHandler(handler, "svc")  // トレーシング
    handler = log.HTTP(ctx)(handler)               // リクエストログ
    handler = goahttpmiddleware.RequestID()(handler) // リクエストID
    
    // 4. タイムアウト付きのHTTPサーバーを作成
    httpServer := &http.Server{
        Addr:              ":8080",
        Handler:           handler,
        ReadHeaderTimeout: 10 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       120 * time.Second,
    }
}
```

## テスト

ミドルウェアを単独で、およびチェーンの一部としてテストします：

```go
func TestMiddleware(t *testing.T) {
    // テストハンドラーを作成
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })
    
    // ミドルウェアを追加
    handler = YourMiddleware(handler)
    
    // テストリクエストを作成
    req := httptest.NewRequest("GET", "/test", nil)
    rec := httptest.NewRecorder()
    
    // テスト実行
    handler.ServeHTTP(rec, req)
    
    // 結果を検証
    if rec.Code != http.StatusOK {
        t.Errorf("ステータス %d を取得、期待値は %d", rec.Code, http.StatusOK)
    }
}
```

## 次のステップ

- GoaにおけるHTTPトランスポートについて[学ぶ](@/docs/4-concepts/3-http)
- [可観測性](@/docs/5-real-world/2-observability)パターンを探索する
- [セキュリティ](@/docs/5-real-world/3-security)のベストプラクティスを確認する

HTTPミドルウェアは、Goaサービスでプロトコル固有の関心事を処理するための強力なツールです。
これらのパターンとベストプラクティスに従うことで、クリーンで保守性が高く、効率的なHTTP処理
パイプラインを作成できます。 