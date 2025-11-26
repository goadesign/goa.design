---
title: "LLM統合"
linkTitle: "LLM統合"
weight: 10
description: "Goa-AIがプロバイダー非依存インターフェースとアダプターモジュールを通じてLLMプロバイダーと統合する方法。"
---

Goa-AIプランナーは**プロバイダー非依存インターフェース**を通じて大規模言語モデル（LLM）と対話します。この設計により、プランナーコードを変更せずにプロバイダー（AWS Bedrock、OpenAI、またはカスタムエンドポイント）を交換できます。

## model.Clientインターフェース

すべてのLLMインタラクションは`goa.design/goa-ai/runtime/agent/model`で定義された`model.Client`インターフェースを通じて行われます：

```go
type Client interface {
    // Completeは非ストリーミングモデル呼び出しを実行します。
    Complete(ctx context.Context, req Request) (Response, error)

    // Streamはサポートされている場合、ストリーミングモデル呼び出しを実行します。
    Stream(ctx context.Context, req Request) (Streamer, error)
}
```

プランナーは同期補完に`Complete`を、増分応答に`Stream`を呼び出します。ランタイムはアダプターを通じてツールエンコーディング、トランスクリプト管理、プロバイダー固有の癖を処理します。

## プランナーでのモデルクライアントの使用

プランナーはランタイムの`PlannerContext`を通じてモデルクライアントを取得します：

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // ランタイムからモデルクライアントを取得
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := model.Request{
        RunID:    input.Run.RunID,
        Messages: input.Messages,
        Tools:    input.Tools,
        Stream:   true,
    }
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // ストリームをドレインして応答を構築...
}
```

ランタイムは基礎となる`model.Client`をイベントデコレートクライアントでラップし、ストリームから読み取るにつれてプランナーイベント（思考ブロック、アシスタントチャンク、使用状況）を発行します。

## プロバイダーアダプター

Goa-AIには人気のLLMプロバイダー用アダプターが同梱されています。各アダプターは`model.Client`を実装し、以下を処理します：

- **メッセージエンコーディング**
- **ツールスキーマ**
- **名前サニタイズ**
- **ストリーミング**
- **思考**

### AWS Bedrock

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
}, ledger)
```

### OpenAI

```go
import "goa.design/goa-ai/features/model/openai"

// APIキーから
modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

## 次のステップ

- ツールがモデルに公開される方法について[ツールセット](../3-toolsets/)を学ぶ
- イベントフローパターンについて[ランツリーとストリーミング](../8-run-trees-streaming-topology.md)を探索する
- 完全なプランナー実行モデルについて[ランタイムコンセプト](../2-runtime/)を読む

