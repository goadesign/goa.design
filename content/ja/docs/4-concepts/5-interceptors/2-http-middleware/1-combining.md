---
title: ミドルウェアとインターセプターの組み合わせ
weight: 1
description: >
  堅牢で保守性の高いサービスを作成するために、HTTPミドルウェアとGoaインターセプターを組み合わせる強力なパターンを学びます。
---

HTTPミドルウェアとGoaインターセプターは、協調して強力な階層型ソリューションを作成できます。
このガイドでは、それらを効果的に組み合わせるためのパターンと戦略を説明します。

## コアコンセプト

### データフロー
ミドルウェアとインターセプターを通じた典型的なデータフロー：

```
HTTPリクエスト → HTTPミドルウェア → Goaトランスポート → Goaインターセプター → サービスメソッド
     └────────────────┴───────────────┴─────────────────────┴────────────────┘
                            レスポンスフロー
```

### 共有コンテキスト
`context.Context`はデータを共有するための主要なメカニズムです：

```go
// HTTPミドルウェアがデータを追加
func EnrichContext(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // HTTP固有のデータを追加
        ctx := r.Context()
        ctx = context.WithValue(ctx, "http.start_time", time.Now())
        ctx = context.WithValue(ctx, "http.method", r.Method)
        ctx = context.WithValue(ctx, "http.path", r.URL.Path)
        
        // 強化されたコンテキストで続行
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Goaインターセプターがデータを使用
var _ = Service("api", func() {
    Interceptor("RequestLogger", func() {
        Description("HTTPコンテキストを使用してリクエストの詳細をログに記録")
        
        Request(func() {
            // 実装でHTTPコンテキストにアクセス
            Attribute("method")
            Attribute("path")
            Attribute("duration")
        })
    })
})

// 実装が両方を使用
func (i *Interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    // コンテキストからHTTPデータにアクセス
    startTime := ctx.Value("http.start_time").(time.Time)
    method := ctx.Value("http.method").(string)
    path := ctx.Value("http.path").(string)
    
    // サービスを呼び出し
    res, err := next(ctx, info.RawPayload())
    
    // 組み合わせたデータでログを記録
    duration := time.Since(startTime)
    log.Printf("HTTP %s %s が %v で完了", method, path, duration)
    
    return res, err
}
```

## 一般的なパターン

### 1. 認証チェーン

HTTP認証とビジネス認可を組み合わせます：

```go
// HTTPミドルウェアがJWT検証を処理
func JWTAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        
        // JWTを検証
        claims, err := validateJWT(token)
        if err != nil {
            http.Error(w, "無効なトークン", http.StatusUnauthorized)
            return
        }
        
        // クレームをコンテキストに追加
        ctx := context.WithValue(r.Context(), "jwt.claims", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Goaインターセプターが認可を処理
var _ = Service("api", func() {
    Interceptor("Authorizer", func() {
        Description("JWTクレームを使用して権限をチェック")
        
        Request(func() {
            // 実装でクレームにアクセス
            Attribute("claims")
            Attribute("resource")
            Attribute("action")
        })
    })
})

// 実装が両方を組み合わせる
func (i *Interceptors) Authorizer(ctx context.Context, info *AuthorizerInfo, next goa.Endpoint) (any, error) {
    // HTTPコンテキストからクレームを取得
    claims := ctx.Value("jwt.claims").(JWTClaims)
    
    // 権限をチェック
    if !hasPermission(claims, info.Resource(), info.Action()) {
        return nil, goa.NewErrorf(goa.ErrForbidden, "権限が不足しています")
    }
    
    return next(ctx, info.RawPayload())
}
```

### 2. 可観測性スタック

HTTPとビジネスメトリクスを組み合わせて包括的な可観測性を構築します：

```go
// HTTPミドルウェアがリクエストメトリクスを収集
func HTTPMetrics(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // 記録用のレスポンスライターを作成
        rec := newRecordingResponseWriter(w)
        
        // リクエストを処理
        next.ServeHTTP(rec, r)
        
        // HTTPメトリクスを記録
        duration := time.Since(start)
        metrics.RecordHTTPMetrics(
            r.Method,
            r.URL.Path,
            rec.StatusCode(),
            duration,
            rec.BytesWritten(),
        )
    })
}

// Goaインターセプターがビジネスコンテキストを追加
var _ = Service("api", func() {
    Interceptor("BusinessMetrics", func() {
        Description("ビジネスレベルのメトリクスを記録")
        
        Request(func() {
            Attribute("operation")
        })
        Response(func() {
            Attribute("status")
            Attribute("result")
        })
    })
})

// 実装がメトリクスを組み合わせる
func (i *Interceptors) BusinessMetrics(ctx context.Context, info *BusinessMetricsInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // サービスを呼び出し
    res, err := next(ctx, info.RawPayload())
    
    // ビジネスメトリクスを記録
    duration := time.Since(start)
    metrics.RecordBusinessMetrics(
        info.Operation(),
        duration,
        err == nil,
    )
    
    return res, err
}
```

### 3. キャッシング戦略

HTTPとビジネスロジックでマルチレベルキャッシングを実装します：

```go
// HTTPミドルウェアがレスポンスキャッシングを処理
func HTTPCache(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := generateCacheKey(r)
        
        // HTTPキャッシュをチェック
        if cached := httpCache.Get(key); cached != nil {
            writeFromCache(w, cached)
            return
        }
        
        // フラグをコンテキストに入れて続行
        ctx := context.WithValue(r.Context(), "cache.key", key)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Goaインターセプターがビジネスキャッシングを処理
var _ = Service("api", func() {
    Interceptor("BusinessCache", func() {
        Description("ビジネスレベルのキャッシングを実装")
        
        Request(func() {
            Attribute("cacheKey")
            Attribute("cacheTTL")
        })
    })
})

// 実装がキャッシング戦略を組み合わせる
func (i *Interceptors) BusinessCache(ctx context.Context, info *BusinessCacheInfo, next goa.Endpoint) (any, error) {
    // HTTPコンテキストからキャッシュキーを取得
    httpKey := ctx.Value("cache.key").(string)
    
    // ビジネスキャッシュをチェック
    if cached := businessCache.Get(httpKey); cached != nil {
        return cached, nil
    }
    
    // サービスを呼び出し
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // 結果をキャッシュ
    businessCache.Set(httpKey, res, info.CacheTTL())
    
    return res, nil
}
```

## ベストプラクティス

### 1. コンテキスト管理

- 型付きコンテキストキーを使用する
- コンテキストの依存関係を文書化する 