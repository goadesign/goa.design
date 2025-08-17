---
title: "ストリーミング"
linkTitle: "ストリーミング"
weight: 3
description: "サーバーサイド、クライアントサイド、双方向ストリーミングパターンを含むGoaでのgRPCストリーミングサービスの実装方法を学ぶ"
---

Goaは、リアルタイムでの継続的なデータ送信を処理できるサービスを構築するための包括的なgRPCストリーミングサポートを提供します。このガイドでは、gRPCで利用可能な異なるストリーミングパターンとGoaを使用した実装方法について説明します。

{{< alert title="関連" color="info" >}}
トランスポート横断のルールや、各トランスポートで有効なストリーミングモードについては、
[トランスポート](../../6-transports) を参照してください。
{{< /alert >}}

## ストリーミングパターン

gRPCは3つのストリーミングパターンをサポートしています：

### サーバーサイドストリーミング

サーバーサイドストリーミングでは、クライアントが単一のリクエストを送信し、レスポンスのストリームを受信します。このパターンは以下のようなシナリオに適しています：
- リアルタイムデータフィード
- 進捗状況の更新
- システムモニタリング

以下はサーバーストリーミングメソッドの定義方法です：

```go
var _ = Service("monitor", func() {
    Method("watch", func() {
        Description("システムメトリクスをストリーミングする")
        
        Payload(func() {
            Field(1, "interval", Int, "サンプリング間隔（秒）")
            Required("interval")
        })
        
        StreamingResult(func() {
            Field(1, "cpu", Float32, "CPU使用率（パーセント）")
            Field(2, "memory", Float32, "メモリ使用率（パーセント）")
            Required("cpu", "memory")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

### クライアントサイドストリーミング

クライアントサイドストリーミングでは、クライアントがリクエストのストリームを送信し、単一のレスポンスを受信します。これは以下のような用途に最適です：
- ファイルアップロード
- バッチ処理
- データの集約

定義例：

```go
var _ = Service("analytics", func() {
    Method("process", func() {
        Description("分析イベントのストリームを処理する")
        
        StreamingPayload(func() {
            Field(1, "event_type", String, "イベントの種類")
            Field(2, "timestamp", String, "イベントのタイムスタンプ")
            Field(3, "data", Bytes, "イベントデータ")
            Required("event_type", "timestamp", "data")
        })
        
        Result(func() {
            Field(1, "processed_count", Int64, "処理されたイベントの数")
            Required("processed_count")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

### 双方向ストリーミング

双方向ストリーミングでは、クライアントとサーバーの両方が同時にメッセージのストリームを送信できます。このパターンは以下のような用途に最適です：
- リアルタイムチャットアプリケーション
- ゲーム
- インタラクティブなデータ処理

定義例：

```go
var _ = Service("chat", func() {
    Method("connect", func() {
        Description("双方向チャット接続を確立する")
        
        StreamingPayload(func() {
            Field(1, "message", String, "チャットメッセージ")
            Field(2, "user_id", String, "ユーザー識別子")
            Required("message", "user_id")
        })
        
        StreamingResult(func() {
            Field(1, "message", String, "チャットメッセージ")
            Field(2, "user_id", String, "ユーザー識別子")
            Field(3, "timestamp", String, "メッセージのタイムスタンプ")
            Required("message", "user_id", "timestamp")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

## 実装

GoaでのgRPCストリーミングの実装には、サーバーサイドとクライアントサイドの両方のコードが含まれます。Goaはサービス定義に基づいて必要なインターフェースと型を生成し、ストリーミングロジックを処理するためにこれらのインターフェースを実装する必要があります。

### サーバー実装

サーバーサイドでは、ストリーミング通信を処理するメソッドを実装する必要があります。各ストリーミングパターンでは、データフローを処理するために異なるアプローチが必要です。それぞれのパターンを詳しく見てみましょう：

#### サーバーサイドストリーミングの例：システムモニタリング

この例では、一定の間隔でクライアントにシステムメトリクス（CPUとメモリの使用率）をストリーミングするサービスを実装します。サーバーは接続を開いたままにし、クライアントに継続的にデータを送信します。

Goaが提供する`monitor.WatchServerStream`インターフェースには2つの主要な機能があります：
1. `Send(*WatchResult) error`：クライアントに単一の結果を送信
2. `Context() context.Context`を通じたコンテキストへのアクセス

これらの機能の使用方法は以下の通りです：

```go
// サーバーサイドストリーミング
func (s *monitorService) Watch(ctx context.Context, p *monitor.WatchPayload, stream monitor.WatchServerStream) error {
    // クライアントが指定した間隔で発火するティッカーを作成
    ticker := time.NewTicker(time.Duration(p.Interval) * time.Second)
    // 終了時にティッカーをクリーンアップ
    defer ticker.Stop()

    // メトリクスを送信し続けるための無限ループ
    for {
        select {
        // コンテキストを使用してクライアントがリクエストをキャンセルしたかチェック
        case <-ctx.Done():
            return ctx.Err()
        // 次のティックを待機
        case <-ticker.C:
            // 現在のシステムメトリクスを取得（実装は省略）
            metrics := getSystemMetrics()
            // ストリームのSendメソッドを使用してメトリクスをクライアントに送信
            // Sendの各呼び出しでストリーム内の1つのメッセージを送信
            if err := stream.Send(&monitor.WatchResult{
                CPU:    metrics.CPU,
                Memory: metrics.Memory,
            }); err != nil {
                return err
            }
        }
    }
}
```

#### クライアントサイドストリーミングの例：分析処理

この例では、クライアントからのイベントストリームを処理する方法を示します。`analytics.ProcessServerStream`インターフェースは3つの主要なメソッドを提供します：
1. `Recv() (*ProcessPayload, error)`：クライアントから次のメッセージを受信
2. `SendAndClose(*ProcessResult) error`：最終レスポンスを送信してストリームを閉じる
3. `Context() context.Context`を通じたコンテキストへのアクセス

これらの機能の使用方法は以下の通りです：

```go
// クライアントサイドストリーミング
func (s *analyticsService) Process(ctx context.Context, stream analytics.ProcessServerStream) error {
    // 処理したイベントの数を追跡
    var count int64
    
    // ストリームが閉じられるまでイベントの読み取りを継続
    for {
        // Recv()を使用してストリームの次のメッセージを取得
        // Recvはメッセージを受信するかストリームが閉じられるまでブロック
        event, err := stream.Recv()
        if err == io.EOF {
            // クライアントがデータの送信を完了
            // SendAndCloseを使用して最終結果を送信しストリームを閉じる
            // これはクライアントストリーミング特有 - 1つのレスポンスのみ送信可能
            return stream.SendAndClose(&analytics.ProcessResult{
                ProcessedCount: count,
            })
        }
        if err != nil {
            return err
        }
        
        // 受信したイベントを処理（実装は省略）
        if err := processEvent(event); err != nil {
            return err
        }
        count++
    }
}
```

#### 双方向ストリーミングの例：チャットサービス

この例では、両サイドがいつでもメッセージを送信できるチャットサービスを示します。`chat.ConnectServerStream`インターフェースは両方のストリーミングタイプの機能を組み合わせています：
1. `Recv() (*ConnectPayload, error)`：クライアントからメッセージを受信
2. `Send(*ConnectResult) error`：クライアントにメッセージを送信
3. `Context() context.Context`を通じたコンテキストへのアクセス

これらの機能の使用方法は以下の通りです：

```go
// 双方向ストリーミング
func (s *chatService) Connect(ctx context.Context, stream chat.ConnectServerStream) error {
    // クライアントが切断するまでメッセージの処理を継続
    for {
        // Recv()を使用して次のクライアントメッセージを待機して受信
        // これはメッセージが到着するかクライアントがストリームを閉じるまでブロック
        msg, err := stream.Recv()
        if err == io.EOF {
            // クライアントが送信ストリームを閉じた
            return nil
        }
        if err != nil {
            return err
        }

        // 現在のタイムスタンプを含むレスポンスを作成
        response := &chat.ConnectResult{
            Message:   msg.Message,
            UserID:    msg.UserID,
            Timestamp: time.Now().Format(time.RFC3339),
        }
``` 