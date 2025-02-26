---
title: カスタムミドルウェア
weight: 2
description: >
  実践的な例と統合パターンを通じて、Goaサービスと効果的に連携するHTTPミドルウェアの作成方法を学びます。
---

GoaサービスはGoの標準HTTPハンドラーを使用するため、Goの標準的なミドルウェアパターンに従う
任意のHTTPミドルウェアを使用できます。このガイドでは、実際の使用例から、Goaサービスと
うまく連携する効果的なHTTPミドルウェアの作成方法を説明します。

HTTPミドルウェアは、ヘッダー、クッキー、リクエスト/レスポンスの操作などのHTTPプロトコルの
関心事に焦点を当てるべきです。ビジネスロジックやサービスのペイロードとリザルトへの型安全な
アクセスには、代わりにGoaインターセプターを使用してください。インターセプターはサービスの
ドメイン型に直接アクセスでき、ビジネスレベルの関心事により適しています。

## 一般的なパターン

以下は、Goaサービスを構築する際に特に有用な一般的なミドルウェアパターンです。これらの
パターンは標準的なGo HTTPミドルウェアの手法を使用し、Goaの生成されたHTTPハンドラーと
組み合わせることができます。

### 1. レスポンスライターラッパー

標準の`http.ResponseWriter`インターフェースは、書き込み後のレスポンスメタデータへの
アクセスを提供しません。このパターンはその情報を取得する方法を示しています：

```go
type responseWriter struct {
    http.ResponseWriter
    status int
    size   int64
}

func (rw *responseWriter) WriteHeader(status int) {
    rw.status = status
    rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    size, err := rw.ResponseWriter.Write(b)
    rw.size += int64(size)
    return size, err
}

func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // ラッパーを作成
        rw := &responseWriter{
            ResponseWriter: w,
            status:        http.StatusOK,
        }
        
        start := time.Now()
        next.ServeHTTP(rw, r)
        duration := time.Since(start)
        
        // メトリクスを記録
        metrics.RecordHTTPMetrics(r.Method, r.URL.Path, rw.status, rw.size, duration)
    })
}
```

このパターンは、HTTPリクエスト処理のいくつかの重要な領域で不可欠な役割を果たします。
レスポンスステータスコードとサイズを取得することで、HTTPレベルのメトリクスを正確に
収集できます。また、このパターンはレスポンスデータの包括的なロギングを容易にし、
サービスがクライアントに返す内容の可視性を提供します。さらに、クライアントに到達する前に
レスポンスを変更または強化できるレスポンス変換の実装の基盤も提供します。

実際のペイロードデータ（HTTPメタデータだけでなく）にアクセスまたは変更する必要がある場合は、
代わりにGoaインターセプターの使用を検討してください。インターセプターは、生のHTTPボディを
解析することなく、サービスのドメイン型への型安全なアクセスを提供します。

### 2. パスベースのフィルタリング

Goaサービスを扱う際、異なるエンドポイントを異なる方法で処理する必要がよくあります。
このパターンは、ミドルウェアを選択的に適用する方法を示しています：

```go
func PathFilterMiddleware(next http.Handler) http.Handler {
    // 効率性のためにregexを事前コンパイル
    noLogRegexp := regexp.MustCompile(`^/(healthz|livez|metrics)$`)
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // ヘルスチェックとメトリクスエンドポイントの処理をスキップ
        if noLogRegexp.MatchString(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }
        
        // 他のリクエストを処理
        // ... ミドルウェアのロジックをここに ...
        next.ServeHTTP(w, r)
    })
}
```

パスベースのフィルタリングは、異なるエンドポイントを異なる方法で処理する必要がある場合に
特に有用です。例えば、ノイズを減らすためにヘルスチェックエンドポイントをロギングパイプライン
から除外したり、APIルートと静的ファイルルートで特別な処理を適用したり、特定のパスで不要な
処理をスキップしてミドルウェアのパフォーマンスを最適化したりできます。このミドルウェアの
選択的な適用により、サービスを効率的かつ整理された状態に保つことができます。

### 3. レート制限

APIの過剰な使用から保護する場合、レート制限はミドルウェアに属するHTTPレベルの一般的な
関心事です：

```go
type RateLimiter struct {
    requests map[string]*tokenBucket
    mu       sync.RWMutex
    rate     float64
    capacity int64
}

func NewRateLimiter(rate float64, capacity int64) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string]*tokenBucket),
        rate:     rate,
        capacity: capacity,
    }
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // クライアント識別子（例：IPアドレス）を取得
            clientID := r.RemoteAddr
            
            // レート制限をチェック
            if !limiter.Allow(clientID) {
                w.Header().Set("Retry-After", "60")
                http.Error(w, "レート制限を超過", http.StatusTooManyRequests)
                return
            }
            
            // レート制限ヘッダーを追加
            limit := strconv.FormatInt(limiter.capacity, 10)
            w.Header().Set("X-RateLimit-Limit", limit)
            w.Header().Set("X-RateLimit-Remaining", 
                strconv.FormatInt(limiter.Remaining(clientID), 10))
            
            next.ServeHTTP(w, r)
        })
    }
}
```

このミドルウェアは純粋なHTTPプロトコルの関心事の処理を示しています：
- トークンバケットアルゴリズムによるリクエストレートの管理
- 適切なレート制限ヘッダーの設定
- 制限を超えた場合の標準的なHTTP 429ステータスの返却
- ビジネスロジックなしの純粋なHTTPプロトコルレベルでの動作

CORS（Goaのプラグインシステムで処理される）とは異なり、レート制限はカスタムHTTP
ミドルウェアに適したプロトコル固有の関心事です。

## 統合例

これらの例は、一般的な機能を追加するためにHTTPミドルウェアをGoaの生成されたハンドラーと
統合する方法を示しています。これらのミドルウェアはHTTPレベルの関心事に焦点を当てている
ことを覚えておいてください - ビジネスロジックには代わりにGoaインターセプターを使用します。

### 1. 組織コンテキスト

マルチテナントサービスでは、組織情報を検証して注入する必要がよくあります。この
ミドルウェアは組織検証のHTTPの側面を処理します：

```go
func OrganizationMiddleware(orgService OrganizationService) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // パスまたはヘッダーから組織名を抽出
            orgName := extractOrgName(r)
            
            // 組織名をIDに変換
            orgID, err := orgService.GetOrgID(r.Context(), orgName)
            if err != nil {
                http.Error(w, "無効な組織", http.StatusBadRequest)
                return
            }
            
            // 組織IDをコンテキストに追加
            ctx := context.WithValue(r.Context(), "org.id", orgID)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

注意：組織に基づいてビジネスロジックの検証を実行したり、型付きペイロードにアクセスしたり
する必要がある場合は、サービスのドメイン型に直接アクセスできるGoaインターセプターで
実装してください。

### 2. リクエストタイムアウト

サービスの安定性を維持するためにリクエストレベルのタイムアウトを実装します：

```go
func TimeoutMiddleware(timeout time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), timeout)
            defer cancel()
            
            done := make(chan struct{})
            go func() {
                next.ServeHTTP(w, r.WithContext(ctx))
                close(done)
            }()
            
            select {
            case <-done:
                return
            case <-ctx.Done():
                w.WriteHeader(http.StatusGatewayTimeout)
                return
            }
        })
    }
}
```

### 3. 認証クッキー

ヘッダーベースの認証をクッキーベースの認証に変換してWebSocket認証を処理します：

```go
func AuthorizationCookieMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if websocket.IsWebSocketUpgrade(r) {
            // 認証ヘッダーからトークンを抽出
            token := r.Header.Get("Authorization")
            if token != "" {
                // WebSocket認証用の一時的なクッキーを設定
                http.SetCookie(w, &http.Cookie{
                    Name:     "Authorization",
                    Value:    token,
                    Path:     "/",
                    HttpOnly: true,
                    Secure:   true,
                    SameSite: http.SameSiteStrictMode,
                })
            }
        }
        next.ServeHTTP(w, r)
    })
}
``` 