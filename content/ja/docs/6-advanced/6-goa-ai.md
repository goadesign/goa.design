---
title: "Goa-AIでAIエージェントバックエンドを構築する"
linkTitle: "AIエージェントバックエンド"
weight: 6
description: >
  Goa-AIを使用してAIエージェントバックエンドを構築する方法を学びます。Goa-AIは、GoaとModel Context Protocol（MCP）を橋渡しする設計ファーストのツールキットです。
---

AIエージェントがますます洗練されるにつれて、それらを支えるバックエンドも追随する必要があります。これらのバックエンドを従来の方法で構築すると、ツール定義、JSONスキーマ、実装コードをやり繰りしながら、すべてを同期させ続ける必要があります。Goa-AIは、Goaの設計ファーストアプローチをAIエージェント開発にもたらすことで、この複雑さを排除します。

## Goa-AIを理解する

[Goa-AI](https://github.com/goadesign/goa-ai)は、GoでAIエージェントバックエンドを構築するための設計ファーストのツールキットです。Goaのマイクロサービスフレームワークの力とModel Context Protocol（MCP）を橋渡しし、AI駆動アプリケーションのためのシームレスな開発体験を創出します。

Goa-AIを使用すると、GoaのDSLでAIツールを一度定義するだけで、以下が自動的に生成されます：
- 型安全なハンドラを持つ完全なバックエンドサーバー
- AIモデルと互換性のあるJSONスキーマ
- HTTP上のJSON-RPCトランスポート
- 自動エラーマッピングと処理
- リアルタイム更新のためのServer-Sent Events（SSE）サポート

Goa-AIを始めるには、以下が必要です：
- Go 1.24以降
- Goa v3.22.2以降

```bash
# Goa-AIをインストール
go get goa.design/goa-ai@latest
```

### なぜGoa-AIか？

従来のAIエージェントバックエンド開発には、いくつかの問題点があります：

1. **スキーマの乖離**：ツール定義、JSONスキーマ、実装が簡単に同期を失う
2. **ボイラープレートコード**：JSON-RPCハンドラ、エラーマッピング、検証コードを書くのは退屈
3. **型安全性**：強い型付けがないと、実行時エラーが一般的
4. **リアルタイム更新**：ストリーミング進捗更新の実装には、かなりの配管作業が必要

Goa-AIはこれらの問題を以下によって解決します：
- Goaの表現力豊かなDSLを使用して、すべてを一か所で定義
- すべてのボイラープレートコードを自動生成
- コンパイル時の安全性のためにGoの型システムを活用
- ストリーミングとリアルタイム更新のファーストクラスサポートを提供

## Model Context Protocol（MCP）

[Model Context Protocol](https://modelcontextprotocol.io)は、AI言語モデルとバックエンドサービス間のシームレスな通信を可能にするオープン標準です。AIエージェントが以下を行うための構造化された方法を提供します：

- 利用可能なツールとその機能を発見
- 適切な型検証を使用してバックエンド関数を呼び出し
- 構造化された応答とエラー情報を受信
- リアルタイム進捗更新をユーザーにストリーミング

Goa-AIは、HTTP上のJSON-RPC 2.0を使用してMCPを実装し、任意のMCP互換クライアントからAIツールにアクセスできるようにします。

## 最初のAIツールを作成する

AIエージェントが天気情報を取得するために使用できる簡単な天気サービスを作成しましょう。この例は、Goa-AIの主要な概念を示しています：

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("weather", func() {
    Description("AIエージェント用の天気情報サービス")

    // AIエージェントが呼び出せるメソッドを定義
    Method("get_weather", func() {
        Description("場所の現在の天気を取得")

        Payload(func() {
            Field(1, "location", String, "都市名または座標", func() {
                Example("San Francisco")
            })
            Field(2, "units", String, "温度単位（celsiusまたはfahrenheit）", func() {
                Default("celsius")
            })
            Required("location")
        })

        Result(func() {
            Field(1, "temperature", Float64, "現在の温度")
            Field(2, "conditions", String, "天候状態")
            Field(3, "humidity", Int, "湿度パーセンテージ")
            Required("temperature", "conditions", "humidity")
        })

        Error("not_found", func() {
            Description("場所が見つかりません")
        })

        HTTP(func() {
            POST("/weather")
            Response(StatusOK)
            Response("not_found", StatusNotFound)
        })
    })
})
```

この単一の設計から、Goa-AIは以下を生成します：
- 型安全なサービスインターフェース
- AIモデル用のJSONスキーマ
- 自動リクエスト/レスポンスエンコーディングを持つHTTPハンドラ
- GoエラーとHTTPステータスコード間のエラーマッピング
- テスト用のクライアントコード

## サービスの実装

天気サービスを実装するために書く必要があるコードはこれだけです：

```go
package weather

import (
    "context"
    weather "myapp/gen/weather"
)

type Service struct {
    // 依存関係（APIクライアント、データベースなど）
}

func (s *Service) GetWeather(ctx context.Context, p *weather.GetWeatherPayload) (*weather.GetWeatherResult, error) {
    // ビジネスロジックをここに記述
    temp, conditions, humidity, err := s.fetchWeather(p.Location, p.Units)
    if err != nil {
        return nil, weather.MakeNotFound(err)
    }

    return &weather.GetWeatherResult{
        Temperature: temp,
        Conditions:  conditions,
        Humidity:    humidity,
    }, nil
}
```

これがどれだけクリーンかに注目してください—JSONパース、スキーマ検証、HTTP処理は不要です。Goa-AIがすべてを処理します。

## リアルタイム更新のストリーミング

Goa-AIの最も強力な機能の1つは、Server-Sent Events（SSE）のファーストクラスサポートで、AIエージェントがリアルタイム進捗更新をユーザーにプッシュできます。これは、長時間実行される操作に特に便利です。

ストリーミングメソッドを定義する方法は以下の通りです：

```go
Method("analyze_document", func() {
    Description("ドキュメントを分析し、進捗更新をストリーミング")

    Payload(func() {
        Field(1, "document_url", String, "分析するドキュメントのURL")
        Required("document_url")
    })

    StreamingResult(func() {
        Field(1, "progress", Int, "進捗パーセンテージ（0-100）")
        Field(2, "status", String, "現在のステータスメッセージ")
        Field(3, "result", String, "最終分析結果")
    })

    HTTP(func() {
        POST("/analyze")
        Response(StatusOK)
    })
})
```

実装：

```go
func (s *Service) AnalyzeDocument(ctx context.Context, p *weather.AnalyzeDocumentPayload, stream weather.AnalyzeDocumentServerStream) error {
    // 作業が進むにつれて進捗更新を送信
    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 10,
        Status:   "ドキュメントをダウンロード中...",
    })

    doc, err := s.downloadDocument(p.DocumentURL)
    if err != nil {
        return err
    }

    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 50,
        Status:   "コンテンツを分析中...",
    })

    result := s.analyzeContent(doc)

    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 100,
        Status:   "完了",
        Result:   result,
    })

    return stream.Close()
}
```

AIエージェントとエンドユーザーは、これらの更新をリアルタイムで受け取り、長時間実行される操作のためのはるかに優れたユーザー体験を提供します。

## 型安全性とエラー処理

Goa-AIは、Goの型システムを活用して、AIツールが堅牢で信頼性が高いことを保証します。生成されたコードは以下を提供します：

**コンパイル時の型安全性**
```go
// 生成されたインターフェース - AIとの契約
type Service interface {
    GetWeather(context.Context, *GetWeatherPayload) (*GetWeatherResult, error)
}

// 実装が一致しない場合、コンパイルされません
func (s *service) GetWeather(ctx context.Context, p *GetWeatherPayload) (*GetWeatherResult, error) {
    // 実装
}
```

**自動エラーマッピング**
```go
// 設計でカスタムエラーを定義
Error("rate_limited", func() {
    Description("リクエストが多すぎます")
})

// 実装で使用
if s.isRateLimited(ctx) {
    return nil, weather.MakeRateLimited(errors.New("レート制限を超えました"))
}

// Goa-AIは適切なHTTPステータスコードに自動的にマッピング
```

**リクエスト検証**
すべてのリクエスト検証は自動的です。AIモデルが無効なデータを送信した場合、Goa-AIはコードが実行される前に適切なエラー応答を返します。

## AIモデルとの統合

Goa-AIは、主要なAIプラットフォームと互換性のあるJSONスキーマを生成します：

**OpenAI関数呼び出し**
```json
{
  "name": "get_weather",
  "description": "場所の現在の天気を取得",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "都市名または座標"
      },
      "units": {
        "type": "string",
        "description": "温度単位（celsiusまたはfahrenheit）",
        "default": "celsius"
      }
    },
    "required": ["location"]
  }
}
```

**Anthropic Claudeツール**
同じスキーマがClaudeのツール使用機能で機能し、バックエンドが複数のAIプラットフォームにサービスを提供できます。

## プロジェクト構造

典型的なGoa-AIプロジェクトは、明確な構成に従います：

```
├── design/              # AIツールの設計
│   └── weather.go      # サービス定義
├── gen/                # 生成されたコード（編集しない）
│   └── weather/        # サービスインターフェースと型
│       ├── service.go  # サービスインターフェース
│       ├── endpoints.go # トランスポート非依存のエンドポイント
│       └── http/       # HTTPトランスポート
├── weather.go          # 実装
└── cmd/
    └── server/
        └── main.go     # サーバーセットアップ
```

## ベストプラクティス

Goa-AIでAIエージェントバックエンドを構築する際：

1. **設計ファースト**：常に設計から始めます。AIが必要とするツールと、それらがどのように連携すべきかを考えます。

2. **詳細な説明**：設計で詳細な説明を使用します。これらはAIのツール理解の一部になります：
   ```go
   Field(1, "location", String, "都市名（例：'San Francisco'）または座標（例：'37.7749,-122.4194'）")
   ```

3. **例を提供**：例は、AIモデルが期待される形式を理解するのに役立ちます：
   ```go
   Field(1, "date", String, "ISO 8601形式の日付", func() {
       Example("2025-01-15T10:30:00Z")
   })
   ```

4. **長時間操作にストリーミングを使用**：操作に数秒以上かかる場合は、ストリーミングを使用して進捗更新を提供します。

5. **適切なエラーを定義**：異なる失敗モードに対して特定のエラータイプを作成します：
   ```go
   Error("invalid_location")
   Error("rate_limited")
   Error("service_unavailable")
   ```

6. **APIをバージョン管理**：AIツールが進化するにつれて、互換性を維持するためにバージョン管理を使用します：
   ```go
   var _ = Service("weather_v2", func() {
       // 追加機能を持つ新しいバージョン
   })
   ```

## 例：マルチツールAIアシスタント

複数のツールが連携する、より完全な例を以下に示します：

```go
package design

import . "goa.design/goa/v3/dsl"

// ドキュメント検索ツール
var _ = Service("search", func() {
    Description("ドキュメントを検索")

    Method("search_documents", func() {
        Payload(func() {
            Field(1, "query", String, "検索クエリ")
            Field(2, "max_results", Int, "返す最大結果数", func() {
                Default(10)
            })
            Required("query")
        })

        Result(ArrayOf(func() {
            Field(1, "title", String)
            Field(2, "content", String)
            Field(3, "relevance", Float64)
        }))

        HTTP(func() {
            POST("/search")
        })
    })
})

// メール作成ツール
var _ = Service("email", func() {
    Description("メール管理")

    Method("send_email", func() {
        Payload(func() {
            Field(1, "to", String, "受信者のメールアドレス")
            Field(2, "subject", String, "メール件名")
            Field(3, "body", String, "メール本文")
            Required("to", "subject", "body")
        })

        Result(func() {
            Field(1, "message_id", String)
            Field(2, "sent_at", String)
        })

        Error("invalid_address")

        HTTP(func() {
            POST("/email/send")
        })
    })
})

// カレンダースケジュールツール
var _ = Service("calendar", func() {
    Description("カレンダーとスケジュール")

    Method("create_event", func() {
        Payload(func() {
            Field(1, "title", String, "イベントタイトル")
            Field(2, "start_time", String, "ISO 8601タイムスタンプ")
            Field(3, "duration_minutes", Int, "イベント期間")
            Field(4, "attendees", ArrayOf(String), "参加者のメール")
            Required("title", "start_time", "duration_minutes")
        })

        Result(func() {
            Field(1, "event_id", String)
            Field(2, "calendar_url", String)
        })

        Error("time_conflict")

        HTTP(func() {
            POST("/calendar/events")
        })
    })
})
```

これら3つのサービスを使用して、AIエージェントはドキュメントを検索し、メールを送信し、会議をスケジュールできます—すべて型安全で十分に文書化されたインターフェースを通じて。

## 詳細を学ぶ

- [Goa-AI GitHubリポジトリ](https://github.com/goadesign/goa-ai)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Goaドキュメント](https://goa.design/docs)
- [JSON-RPCチュートリアル](../../3-tutorials/3-jsonrpc-service)

## 次のステップ

Goa-AIを理解したので、以下ができます：
- リポジトリの[例](https://github.com/goadesign/goa-ai/tree/main/examples)を探索
- Goa-AIを支える[JSON-RPC](../../3-tutorials/3-jsonrpc-service)について学習
- [Goa Slack](https://gophers.slack.com/messages/goa)（#goaチャンネル）でディスカッションに参加
- [Model Context Protocol](https://modelcontextprotocol.io)について読み、標準を理解
