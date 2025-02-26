---
title: "ストリーミング結果での複数ビューの処理"
linkTitle: ビュー
weight: 6
---

Goaの柔軟性により、結果型に対して複数のビューを定義でき、クライアントの要件に
基づいてデータの異なる表現を可能にします。ストリーミング結果を扱う場合、
ストリーミングされるデータが適切に表示されるように、これらのビューを管理する
ことが重要になります。このセクションでは、GoaのDSLと生成されたコードを使用して、
ストリーミング結果で複数のビューを処理する方法を説明します。

## Goaのビューについて

Goaのビューを使用すると、結果型の異なる表現を定義できます。各ビューには、
特定のユースケースやクライアントのニーズに合わせて、型の属性のサブセットを
含めることができます。

### 例

```go
var LogEntry = Type("LogEntry", func() {
    Field(1, "timestamp", String, "ログエントリが作成された時刻")
    Field(2, "message", String, "ログメッセージ")
    Field(3, "level", String, "ログレベル（INFO、WARN、ERRORなど）")
    Field(4, "source", String, "ログエントリのソース")
    Field(5, "metadata", MapOf(String, String), "追加のメタデータ")
    Required("timestamp", "message", "level")

    View("default", func() {
        Attribute("timestamp")
        Attribute("message")
        Attribute("level")
    })
    
    View("detailed", func() {
        Attribute("timestamp")
        Attribute("message")
        Attribute("level")
        Attribute("source")
        Attribute("metadata")
    })
})
```

この例では：

- **defaultビュー:** 基本的なログ情報（`timestamp`、`message`、`level`）を含みます。
- **detailedビュー:** `source`と`metadata`を含むすべてのログ情報を含みます。

## サービス実装での`SetView`の使用

複数のビューを持つ結果をストリーミングする場合、各結果を送信する際に使用する
ビューを指定する必要があります。これは、Goaによって生成された`SetView`メソッドを
使用して行われ、ストリーミングデータのビューコンテキストを設定します。

### 設計例

```go
var _ = Service("logger", func() {
    Method("monitor", func() {
        StreamingPayload(ViewSelector)
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/monitor")
            Response(StatusOK)
        })
    })
})
```

### 実装例

この例では、`Payload`と`StreamingPayload`の両方を使用してビューを設定するため、
HTTPトランスポートを想定しています。

```go
func (s *loggerSvc) Monitor(ctx context.Context, p *logsvc.ViewSelector, stream logsvc.MonitorServerStream) error {
    // クライアントのリクエストに基づいてビューを設定
    stream.SetView(p.View)
    
    // ログのモニタリングを開始
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            logEntry := s.getNextLog()
            if err := stream.Send(logEntry); err != nil {
                return err
            }
        }
    }
}
```

### クライアントサイドの実装

```go
func monitorLogsWithView(client logger.Client, view string) error {
    // 目的のビューでモニターストリームを開始
    stream, err := client.Monitor(context.Background(), &logger.ViewSelector{ View: view })
    if err != nil {
        return fmt.Errorf("モニターストリームの開始に失敗: %w", err)
    }
    defer stream.Close()

    // ログを受信して処理
    for {
        logEntry, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            return fmt.Errorf("ログの受信エラー: %w", err)
        }

        // ビューに応じてログエントリを処理
        // デフォルトビューはtimestamp、message、levelのみを持つ
        // 詳細ビューはsourceとmetadataを含む
        processLogEntry(logEntry)
    }

    return nil
}
```

## ストリーミングでの複数ビューのベストプラクティス

- **ビューの選択:** ユースケースに基づいて適切なビューを選択：
  - 基本的なモニタリングとアラートには`default`ビューを使用
  - デバッグと詳細な分析には`detailed`ビューを使用

- **パフォーマンスの考慮事項:**
  - デフォルトビューは日常的なモニタリングのネットワークトラフィックを削減
  - 詳細ビューは必要な場合に完全な情報を提供

- **ドキュメント:** 利用可能なビューを文書化：
```go
// LogEntryのビュー：
// - "default": 基本的なログ情報（timestamp、message、level）
// - "detailed": sourceとmetadataを含む完全なログ情報
```

## まとめ

ロガーサービスにビューを適用することで、異なるモニタリングニーズに適した
柔軟なデータ表現を提供できます。デフォルトビューは効率的な基本モニタリングを
提供し、詳細ビューは包括的なデバッグシナリオをサポートします。このアプローチは、
必要な場合に完全な情報にアクセスする機能を維持しながら、ネットワーク使用量を
最適化します。 