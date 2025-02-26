---
title: "WebSocket統合"
linkTitle: "WebSocket"
weight: 3
description: "接続処理、メッセージフォーマット、エラー処理、クライアント実装を含むWebSocketサポートをサービスに追加する方法を学びます。"
menu:
  main:
    parent: "HTTP高度なトピック"
    weight: 3
---

GoaのWebSocket統合により、サービスでリアルタイムの双方向通信を処理できるようになります。
このガイドでは、基本的な概念から高度な実装まで、サービスでWebSocket接続を実装する方法を説明します。

## コアコンセプト

WebSocketは、単一のTCP接続上で全二重通信を提供するプロトコルです。Goaは、ストリーミングDSLを通じて
WebSocketサポートを実装し、3つの主要なパターンを提供します：

1. **クライアントからサーバーへのストリーミング**（`StreamingPayload`）：クライアントがメッセージのストリームをサーバーに送信
2. **サーバーからクライアントへのストリーミング**（`StreamingResult`）：サーバーがメッセージのストリームをクライアントに送信
3. **双方向ストリーミング**：両方のDSLを使用して双方向通信を実現

### プロトコル要件

WebSocket接続は常に、プロトコルアップグレードのためのGETリクエストで開始されます。Goaでは、これは以下を意味します：

```go
// 論理的な操作に関係なく、すべてのWebSocketエンドポイントはGETを使用する必要があります
HTTP(func() {
    GET("/stream")    // WebSocketアップグレードに必要
    Param("token")    // 必要に応じて追加のパラメータ
})
```

## 基本的なストリーミングパターン

チャットサービスの実装例を使用して、各ストリーミングパターンを見ていきましょう。

### クライアントからサーバーへのストリーミング

この例では、クライアントからメッセージを受信するリスナーを実装します：

```go
Method("listener", func() {
    // ストリームのメッセージフォーマット
    StreamingPayload(func() {
        Field(1, "message", String, "メッセージ内容")
        Required("message")
    })
    
    HTTP(func() {
        GET("/listen")              // WebSocketエンドポイント
    })
})
```

このデザインは：
- クライアントからの継続的なメッセージストリームを受け入れる
- 各メッセージを到着時に処理する
- 必須のコンテンツフィールドを持つ単純なメッセージフォーマットを使用する

### サーバーからクライアントへのストリーミング

この例では、クライアントに更新を送信するサブスクリプションサービスを作成します：

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "更新内容")
        Field(2, "action", String, "アクションタイプ")
        Field(3, "timestamp", String, "発生時刻")
        Required("message", "action", "timestamp")
    })
    
    HTTP(func() {
        GET("/subscribe")
    })
})
```

このパターンは：
- クライアントへの一方向のストリームを確立する
- メタデータを含む構造化された更新を送信する
- 継続的な更新のために接続を維持する

### 双方向通信

この例では、双方向通信を示すエコーサービスを作成します：

```go
Method("echo", func() {
    // クライアントメッセージ
    StreamingPayload(func() {
        Field(1, "message", String, "エコーするメッセージ")
        Required("message")
    })
    
    // サーバーレスポンス
    StreamingResult(func() {
        Field(1, "message", String, "エコーされたメッセージ")
        Required("message")
    })
    
    HTTP(func() {
        GET("/echo")
    })
})
```

このデザインは：
- メッセージの同時送受信を可能にする
- シンプルさのために一致するメッセージフォーマットを使用する
- WebSocket上の基本的なリクエスト-レスポンスパターンを示す

## 実装ガイド

GoaでWebSocketサービスを実装する際は、サーバー側とクライアント側の両方のパターンを慎重に考慮する必要があります。
基本的な概念は単純ですが、適切な実装には接続管理、並行処理、エラー処理を考慮する必要があります。
チャットサービスを例にして、これらの側面を見ていきましょう。

### サーバー側の実装

WebSocketサービスのサーバー側は、メッセージを効率的に処理しながら、接続の完全なライフサイクルを管理する必要があります。
WebSocketサーバーの核心は、アクティブな接続を維持し、メッセージを並行して処理し、接続が終了したときに適切なクリーンアップを
確実に行うことです。

接続管理は、WebSocketサーバーの基礎を形成します。クライアントが接続すると、サーバーは接続を検証し、
必要な状態を設定し、メッセージ処理の準備をする必要があります。実際にはこのように見えます：

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    // 接続状態を初期化
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    // メッセージ処理を開始
    return s.processMessages(ctx, stream)
}
```

メッセージ処理では、並行性を慎重に扱う必要があります。サーバーはレスポンスを送信しながら同時にメッセージを
受信できる必要があります。これは通常、goroutineを使用してこれらの関心事を分離することで実現されます：

```go
func (s *service) processMessages(ctx context.Context, stream Stream) error {
    // 別のgoroutineで受信メッセージを処理
    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    // コンテキストのキャンセルまたは処理エラーを待機
    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

エラー処理は、WebSocket実装で特に重要です。接続はさまざまな方法で失敗する可能性があるためです。
ネットワークの問題、クライアントの切断、アプリケーションのエラーはすべて、サービスの安定性を維持するために
適切に処理される必要があります。

### クライアント側の実装

クライアント実装は独自の課題に直面します。堅牢なWebSocketクライアントは、接続を維持し、
両方向のメッセージフローを処理し、問題が発生しても良好なユーザーエクスペリエンスを提供する必要があります。

クライアント側の接続管理には、初期接続の確立と、失敗が発生したときの再接続の処理が含まれます。
自動再接続を実装するクライアントの例を示します：

```go
func connectWithRetry(ctx context.Context) (*WSClient, error) {
    for {
        client, err := connect(ctx)
        if err == nil {
            return client, nil
        }

        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-time.After(backoffDuration):
            // リトライループを継続
        }
    }
}
```

クライアントでのメッセージ処理では、ユーザー入力とサーバーメッセージの間の調整が必要になることがよくあります。
これは通常、適切な同期を確保しながら複数のgoroutineを管理することを含みます：

```go
func (c *Client) handleMessages(ctx context.Context) {
    // 受信メッセージを処理
    go c.receiveMessages(ctx)

    // ユーザー入力を処理
    c.processUserInput(ctx)
}
```

### 一般的な実装の課題

WebSocketサービスを実装する際には、いくつかの課題が一般的に発生します。これらの課題とその解決策を理解することで、
より堅牢な実装を作成できます。

メッセージの順序は、リアルタイムアプリケーションで問題になる可能性があります。WebSocketは単一の接続内でメッセージの
順序を保証しますが、アプリケーションレベルでの順序付けが必要になる場合があります。例えば、チャットアプリケーションでは、
メッセージは送信された順序で表示される必要があります：

```go
type Message struct {
    Content   string
    Sequence  int64
    Timestamp time.Time
}
```

複数の接続やステートフルなプロトコルを扱う場合、状態管理は複雑になります。サービスは接続状態だけでなく、
アプリケーションの状態も追跡する必要があります。例えば、チャットルームサービスでは：

```go
type ChatRoom struct {
    ID         string
    Members    map[string]*Connection
    Messages   []Message
    LastActive time.Time
    mu         sync.RWMutex
}
```

リソース管理は、長期間存続する接続にとって重要です。接続が適切に追跡されクリーンアップされない場合、
メモリリークが発生する可能性があります。接続マネージャーはこれを処理するのに役立ちます：

```go
type ConnectionManager struct {
    active map[string]*Connection
    mu     sync.RWMutex
}

func (cm *ConnectionManager) cleanup() {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    
    for id, conn := range cm.active {
        if !conn.isAlive() {
            conn.close()
            delete(cm.active, id)
        }
    }
}
```

## 高度な機能

WebSocketサービスでは、複雑な実世界の要件を処理するために高度な機能が必要になることがよくあります。
Goaが提供する、洗練されたWebSocketアプリケーションを構築するためのいくつかの強力な機能を見ていきましょう。

### メッセージビューとプロジェクション 