---
title: HTTPガイド
weight: 4
description: "Complete guide to HTTP transport in Goa - routing, content negotiation, WebSocket, SSE, CORS, and static content."
llm_optimized: true
aliases:
---

このガイドでは、基本的なルーティングから WebSocket ストリーミングやコンテンツネゴシエーション（コンテンツ交渉）といった高度なトピックまで、Goa の HTTP 固有機能を解説する。

## HTTP ルーティング

### 基本ルーティング

ルーティングはサービス内の `HTTP` 関数で定義する。

```go
var _ = Service("calculator", func() {
    HTTP(func() {
        Path("/calculator")  // Base path for all endpoints
    })

    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
        })
        Result(Int)
        HTTP(func() {
            POST("/add")  // POST /calculator/add
        })
    })
})
```

Goa は標準的な HTTP メソッドをすべてサポートしている: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`.

1 つのメソッドで複数の HTTP メソッドやパスを扱うこともできる。

```go
Method("manage_user", func() {
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // Create
        PUT("/users/{user_id}") // Update
        Response(StatusOK)
        Response(StatusCreated)
    })
})
```

### パスパラメータ

URL から動的な値をキャプチャする。

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "user_id", String, "User ID")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // Maps to payload.UserID
    })
})
```

URL のパラメータ名をペイロードのフィールド名にマッピングすることもできる。

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "id", Int, "User ID")
    })
    HTTP(func() {
        GET("/users/{user_id:id}")  // URL uses user_id, maps to payload.ID
    })
})
```

### クエリパラメータ

`Param` 関数でクエリパラメータを定義する。

```go
Method("list_users", func() {
    Payload(func() {
        Field(1, "page", Int, "Page number", func() {
            Default(1)
            Minimum(1)
        })
        Field(2, "per_page", Int, "Items per page", func() {
            Default(20)
            Minimum(1)
            Maximum(100)
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        Param("page")
        Param("per_page")
    })
})
```

### ワイルドカード

残りのパスセグメントをすべてキャプチャするには次のように定義する。

```go
Method("serve_files", func() {
    Payload(func() {
        Field(1, "path", String, "Path to file")
    })
    HTTP(func() {
        GET("/files/*path")  // Matches /files/docs/image.png
    })
})
```

### サービスの関係

サービス階層を確立するには `Parent` を使用する。

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/users/{user_id}")
        CanonicalMethod("get")  // Override default "show"
    })
    
    Method("get", func() {
        Payload(func() {
            Field(1, "user_id", String)
        })
        HTTP(func() {
            GET("")  // GET /users/{user_id}
        })
    })
})

var _ = Service("posts", func() {
    Parent("users")  // Inherit parent's path
    
    Method("list", func() {
        // user_id inherited from parent
        HTTP(func() {
            GET("/posts")  // GET /users/{user_id}/posts
        })
    })
})
```

### パスプレフィックス階層

API レベルとサービスレベルのプレフィックスを組み合わせることができる。

```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // Global prefix
    })
})

var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1/users")  // Service prefix
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")  // Final: /api/v1/users/{id}
        })
    })
})
```

---

## コンテンツ交渉

### 内蔵エンコーダ

Goa のデフォルトエンコーダは次のフォーマットをサポートしている。

- JSON (`application/json`, `*+json`)
- XML (`application/xml`, `*+xml`)
- Gob (`application/gob`, `*+gob`)
- HTML (`text/html`)
- プレーンテキスト (`text/plain`)

レスポンスのコンテンツタイプは次の優先順位で決定される。

1. `Accept` ヘッダー
2. `Accept` がない場合の `Content-Type` ヘッダー
3. 上記がない場合のデフォルト（JSON）

デフォルトのレスポンスコンテンツタイプを設定する。

```go
Method("create", func() {
    HTTP(func() {
        POST("/media")
        Response(StatusCreated, func() {
            ContentType("application/json")
        })
    })
})
```

### カスタムエンコーダ

特殊なフォーマット用のカスタムエンコーダを作成する。

```go
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    enc.w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(enc.w).Encode(v)
}

func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

サーバー生成時にカスタムエンコーダを登録する。

```go
func main() {
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r)
        }
    }
    
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w)
    }
    
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

---

## WebSocket の統合

WebSocket はリアルタイムの双方向通信を提供する。Goa ではストリーミング DSL を通じて WebSocket を実装できる。

### ストリーミングパターン

**クライアントからサーバーへのストリーミング**

```go
Method("listener", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    HTTP(func() {
        GET("/listen")  // WebSocket endpoints must use GET
    })
})
```

**サーバーからクライアントへのストリーミング**

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "Update content")
        Field(2, "action", String, "Action type")
        Field(3, "timestamp", String, "When it happened")
        Required("message", "action", "timestamp")
    })
    HTTP(func() {
        GET("/subscribe")
    })
})
```

**双方向ストリーミング**

```go
Method("echo", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message to echo")
        Required("message")
    })
    StreamingResult(func() {
        Field(1, "message", String, "Echoed message")
        Required("message")
    })
    HTTP(func() {
        GET("/echo")
    })
})
```

### WebSocket の実装

サーバー側の実装例。

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

接続管理の例。

```go
type ConnectionManager struct {
    connections map[string]*ManagedConnection
    mu          sync.RWMutex
}

func (cm *ConnectionManager) AddConnection(id string, stream Stream) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.connections[id] = &ManagedConnection{
        ID:       id,
        Stream:   stream,
        LastPing: time.Now(),
    }
}
```

---

## サーバー送信イベント

SSE は HTTP 上でサーバーからクライアントへの一方向ストリーミングを提供する。次のような用途に適している。

- リアルタイム通知
- ライブデータフィード
- 進捗状況の更新
- イベントストリーミング

### SSE デザイン

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("timestamp", Int, "Unix timestamp")
    Required("message", "timestamp")
})

var _ = Service("sse", func() {
    Method("stream", func() {
        StreamingResult(Event)
        HTTP(func() {
            GET("/events/stream")
            ServerSentEvents()  // Use SSE instead of WebSocket
        })
    })
})
```

SSE イベントのカスタマイズ。

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("type", String, "Event type")
    Attribute("id", String, "Event ID")
    Attribute("retry", Int, "Reconnection delay in ms")
    Required("message", "type", "id")
})

Method("stream", func() {
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSEEventData("message")
            SSEEventType("type")
            SSEEventID("id")
            SSEEventRetry("retry")
        })
    })
})
```

再開可能なストリームで Last-Event-Id を処理する例。

```go
Method("stream", func() {
    Payload(func() {
        Attribute("startID", String, "Last event ID received")
    })
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSERequestID("startID")  // Maps Last-Event-Id header
        })
    })
})
```

### SSE の実装

```go
func (s *Service) Stream(ctx context.Context, stream sse.StreamServerStream) error {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            event := &sse.Event{
                Message:   "Hello from server!",
                Timestamp: time.Now().Unix(),
            }
            if err := stream.Send(event); err != nil {
                return err
            }
        case <-ctx.Done():
            return nil
        }
    }
}
```

ブラウザクライアント側の例。

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

---

## CORS の構成

CORS プラグインはクロスオリジンリクエストを処理する。次のようにインポートする。

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

API レベルの CORS 設定。

```go
var _ = API("calc", func() {
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})
```

サービスレベルの CORS 設定。

```go
var _ = Service("calc", func() {
    // Allow specific origin
    cors.Origin("localhost")

    // Allow subdomain pattern
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // Allow all origins
    cors.Origin("*")

    // Allow regex pattern
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

---

## 静的コンテンツ

`Files` 関数を使って静的ファイルを配信できる。

```go
var _ = Service("web", func() {
    // Serve files from a directory
    Files("/static/{*path}", "./public")
    
    // Serve a specific file
    Files("/favicon.ico", "./public/favicon.ico")
})
```

シングルページアプリケーション (SPA) の場合、すべてのルートに `index.html` を配信するように定義できる。

```go
var _ = Service("spa", func() {
    // API endpoints
    Method("api", func() {
        HTTP(func() {
            GET("/api/data")
        })
    })
    
    // Serve SPA - catch-all for client-side routing
    Files("/{*path}", "./dist/index.html")
})
```

---

## ベストプラクティス

### URL デザイン

- リソースには名詞を使う。`/list-articles` ではなく `/articles` とする。
- 名詞は複数形を一貫して使用する。
- アクションは HTTP メソッドで表現する。
- URL は階層的で予測しやすい構造にする。

### エラー処理

- エラーを適切な HTTP ステータスコードにマップする。
- 一貫性のあるエラーレスポンスフォーマットを使用する。
- 意味のあるエラーメッセージを含める。

### パフォーマンス

- WebSocket に適切なバッファサイズを設定する。
- トラフィックの多いサービスにはコネクションプーリングを実装する。
- ストリーミングエンドポイントのメッセージバッチ化を検討する。

### セキュリティ

- 本番環境では常に HTTPS を使用する。
- CORS を適切に構成する。
- すべての入力パラメータを検証する。
- 長時間の接続には適切なタイムアウトを設定する。
