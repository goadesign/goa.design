---
title: "双方向ストリーミングの実装"
linkTitle: 双方向
weight: 5
---

Goaの`StreamingPayload`と`StreamingResult` DSLを使用して双方向ストリーミング
エンドポイントを設計したら、次のステップはストリーミング接続の両側を実装する
ことです。このガイドでは、Goaで双方向ストリーミングエンドポイントのクライアント
とサーバーの両方のコンポーネントを実装する方法を説明します。

## 設計

以下のような設計を想定します：

```go
var _ = Service("logger", func() {
    Method("monitor", func() {
        StreamingPayload(LogFilter)
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/monitor")
            Response(StatusOK)
        })
        GRPC(func() {})
    })
})
```

## クライアントサイドの実装

双方向ストリーミングメソッドを定義すると、Goaはクライアントが実装する特定の
ストリームインターフェースを生成します。これらのインターフェースは、データの
送信と受信の両方を容易にします。

### クライアントストリームインターフェース

クライアントストリームインターフェースには、データの送信と受信の両方のメソッドが
含まれます：

```go
// クライアントが満たすべきインターフェース
type MonitorClientStream interface {
    // "LogFilter"のインスタンスをストリーミング
    Send(*LogFilter) error
    // ストリーム内の次の結果を返す
    Recv() (*LogEntry, error)
    // ストリームを終了
    Close() error
}
```

### 主要なメソッド

- **Send:** フィルター更新をサーバーに送信します。フィルタリング条件を更新するために複数回呼び出すことができます。
- **Recv:** 現在のフィルターに一致するログエントリをサーバーから受信します。
- **Close:** 双方向ストリームを終了します。Closeを呼び出した後、SendとRecvの両方がエラーを返します。

### 実装例

以下はクライアントサイド双方向ストリーミングエンドポイントの実装例です：

```go
func monitorLogs(client logger.Client, initialFilter *LogFilter) error {
    stream, err := client.Monitor(context.Background())
    if err != nil {
        return fmt.Errorf("モニターストリームの開始に失敗: %w", err)
    }
    defer stream.Close()

    // ログ受信を処理するゴルーチンを開始
    go func() {
        for {
            logEntry, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("ログエントリの受信エラー: %v", err)
                return
            }
            processLogEntry(logEntry)
        }
    }()

    // 初期フィルターを送信
    if err := stream.Send(initialFilter); err != nil {
        return fmt.Errorf("初期フィルターの送信に失敗: %w", err)
    }

    // 条件に基づいてフィルターを更新
    for {
        newFilter := waitForFilterUpdate()
        if err := stream.Send(newFilter); err != nil {
            return fmt.Errorf("フィルターの更新に失敗: %w", err)
        }
    }
}
```

## サーバーサイドの実装

サーバーサイドの実装は、受信フィルター更新の処理と、一致するログエントリを
クライアントにストリーミング返すことの両方を処理します。

### サーバーストリームインターフェース

```go
// サーバーが満たすべきインターフェース
type MonitorServerStream interface {
    // "LogEntry"のインスタンスをストリーミング
    Send(*LogEntry) error
    // ストリーム内の次のフィルターを返す
    Recv() (*LogFilter, error)
    // ストリームを終了
    Close() error
}
```

### サーバー実装例

以下はサーバー側で双方向ストリーミングを実装する方法です：

```go
func (s *loggerSvc) Monitor(ctx context.Context, stream logger.MonitorServerStream) error {
    // フィルター更新を処理するゴルーチンを開始
    filterCh := make(chan *LogFilter, 1)
    go func() {
        defer close(filterCh)
        for {
            filter, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("フィルター更新の受信エラー: %v", err)
                return
            }
            filterCh <- filter
        }
    }()

    // ログの処理とフィルターの適用のメインループ
    var currentFilter *LogFilter
    for {
        select {
        case filter, ok := <-filterCh:
            if !ok {
                // チャネルが閉じられた、処理を停止
                return nil
            }
            currentFilter = filter
        case <-ctx.Done():
            // コンテキストがキャンセルされた、処理を停止
            return ctx.Err()
        default:
            if currentFilter != nil {
                logEntry := s.getNextMatchingLog(currentFilter)
                if err := stream.Send(logEntry); err != nil {
                    return fmt.Errorf("ログエントリの送信エラー: %w", err)
                }
            }
        }
    }
}
```

### 主要な考慮事項

1. **並行処理:**
   - 送信と受信を独立して処理するためにゴルーチンを使用
   - 共有状態に対する適切な同期を実装
   - 両方向の適切なシャットダウンを処理

2. **リソース管理:**
   - 受信と送信の両方のストリームのメモリ使用量を監視
   - 両方向のレート制限を実装
   - どちらかの側がストリームを終了したときにリソースをクリーンアップ

3. **エラー処理:**
   - SendとRecv操作の両方からのエラーを処理
   - エラーを両側に適切に伝播
   - 一時的な障害に対する再接続ロジックの実装を検討

4. **コンテキスト管理:**
   - 両方向のコンテキストキャンセルを尊重
   - 適切なタイムアウトを実装
   - コンテキストがキャンセルされたときにリソースをクリーンアップ

## まとめ

Goaでの双方向ストリーミングの実装には、クライアントとサーバーの両側での
送信と受信操作の慎重な調整が必要です。これらの並行処理、エラー処理、
リソース管理のパターンとベストプラクティスに従うことで、クライアントと
サーバー間のリアルタイムで対話的な通信を可能にする堅牢な双方向ストリーミング
エンドポイントを構築できます。

この実装により、クライアントから送信されるフィルターを通じてストリーミング
動作を動的に更新しながら、サーバーレスポンスの継続的なストリームを維持し、
Goaサービスでリアルタイムデータ交換のための柔軟で強力なメカニズムを作成
できます。 