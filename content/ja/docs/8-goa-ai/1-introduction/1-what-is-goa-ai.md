---
title: "Goa-AIとは？"
linkTitle: "Goa-AIとは？"
weight: 1
description: "Goでエージェント型のツール駆動システムを構築するためのデザインファーストフレームワーク、Goa-AIについて学びましょう。"
---

Goa-AIはGoでエージェント型のツール駆動システムを構築するためのデザインファーストフレームワークです。GoaのDSLでエージェント、ツールセット、実行ポリシーを宣言し、Goa-AIが型付きコード、コーデック、ワークフロー、レジストリヘルパーを生成します。これらは本番環境グレードのランタイム（開発用はインメモリ、耐久性用はTemporal）にプラグインされます。プランナーは戦略に集中し、ランタイムがオーケストレーション、ポリシー、メモリ、ストリーミング、テレメトリ、MCP統合を処理します。

## デザインファーストエージェント開発の力

GoaがAPIをデザインファーストで変革するように、Goa-AIはエージェントシステムに同じ哲学をもたらします。GoaのDSLでエージェントアーキテクチャ全体—エージェント、ツールセット、ポリシー、ワークフロー—を記述すると、Goa-AIがすべての複雑なオーケストレーションロジックを処理する本番環境対応コードを生成します。

{{< alert title="主要な設計要素" color="primary" >}}
**エージェントとツールセット**  
クリーンで読みやすい構文でツールセットを利用または公開するエージェントを定義します。すべてのツール、すべてのポリシー、すべてのインタラクションが明確に指定されます。

**型付きツール契約**  
型安全な精度でツールペイロードと結果を記述します。Goa-AIは入力バリデーションからレスポンスフォーマットまで、設計通りにデータが流れることを保証します。

**ランタイムポリシー**  
実行制限、時間予算、中断処理を指定します。ランタイムはすべてのターンでこれらのポリシーを自動的に適用します。
{{< /alert >}}

これらの定義から、Goa-AIはすべての複雑なワークフローロジックを処理する本番環境対応コードを生成し、プランナーの実装に純粋に集中できるようにします。面倒なボイラープレートやエージェント設計と実装の間の手動変換による誤りの心配はありません。

## コアメンタルモデル

```
DSL → コード生成 → ランタイム → エンジン + 機能
```

- **DSL (`goa-ai/dsl`)**: Goaの`Service`内でエージェントを宣言。ツールセット（ネイティブまたはMCP）と`RunPolicy`を指定。
- **コード生成 (`codegen/agent`, `codegen/mcp`)**: `gen/`配下にエージェントパッケージ、ツール仕様/コーデック、Temporalアクティビティ、レジストリヘルパーを出力。
- **ランタイム (`runtime/agent`, `runtime/mcp`)**: ポリシー適用、メモリ/セッションストア、フックバス、テレメトリ、MCPコーラーを備えた耐久性のある計画/実行ループ。
- **エンジン (`runtime/agent/engine`)**: ワークフローバックエンドを抽象化（開発用はインメモリ、本番用はTemporalアダプター）。
- **機能 (`features/*`)**: オプションモジュール（Mongoメモリ/セッション、Pulseストリームシンク、Bedrock/OpenAIモデルクライアント、ポリシーエンジン）。

`gen/`を手動で編集しないでください — DSL変更後は常に再生成してください。

## Goa-AIを使用する場面

- **ツールを使用したLLMワークフロー**: アドホックなJSONではなく、バリデーションと例を備えた型付きツールを呼び出すエージェントを構築。
- **耐久性のあるオーケストレーション**: リトライ、時間予算、決定論的リプレイを備えた長時間実行、再開可能な実行が必要な場合。
- **エージェント構成**: あるエージェントを別のエージェントのツールとして扱う、プロセス間でも可能（インライン実行、単一履歴）。
- **あらゆる場所での型付きスキーマ**: 生成されたペイロード/結果型とコーデックがスキーマドリフトと手書きエンコーディングを排除。
- **トランスクリプトファーストの状態**: Goa-AIに完全なトランスクリプト（メッセージ + ツール呼び出し/結果）を構築・再利用させ、プランナーやUIで別の「ツール履歴」や「以前のメッセージ」構造を維持する必要がない。
- **運用可視性**: プランナー/ツール/アシスタントイベントをストリーミング、トランスクリプトを永続化、ログ/メトリクス/トレースで計装。
- **MCP統合**: 生成されたラッパーとコーラーを通じてMCPサーバーからツールスイートを利用。

## シンプルな例

Goa-AIでエージェントを設計する様子は次のとおりです：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
    Tool("search", "インデックス化されたドキュメントを検索", func() {
        Args(func() {
            Attribute("query", String, "検索フレーズ")
            Attribute("limit", Int, "最大結果数", func() { Default(5) })
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "マッチしたスニペット")
            Required("documents")
        })
    })
})

var _ = Service("orchestrator", func() {
    Description("ナレッジエージェントへの人間のフロントドア。")

    Agent("chat", "会話ランナー", func() {
        Use(DocsToolset)
        RunPolicy(func() {
            DefaultCaps(
                MaxToolCalls(8),
                MaxConsecutiveFailedToolCalls(3),
            )
            TimeBudget("2m")
        })
    })
})
```

そして、実行に必要なコードは以下だけです：

```go
rt := runtime.New()
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
    Planner: myPlanner,
}); err != nil {
    log.Fatal(err)
}

client := chat.NewClient(rt)
out, err := client.Run(ctx, []*model.Message{{
    Role:  model.ConversationRoleUser,
    Parts: []model.Part{model.TextPart{Text: "Goドキュメントを検索"}},
}}, runtime.WithSessionID("session-1"))
```

## 主要コンセプト

### デザインファースト：唯一の真実の源

複数のツールスキーマ、ドキュメント、実装ファイルをジャグリングするのはやめましょう。Goa-AIでは、設計が契約です—全員が同じページにいることを保証する明確で実行可能な仕様です。チームはこのアプローチを好みます。「でも仕様にはそう書いてなかった」という会話を永遠になくすからです。

### スケールするクリーンアーキテクチャ

Goa-AIはクリーンアーキテクチャの原則に従うコードを生成します：
* **プランナーレイヤー**: あなたのLLM戦略ロジック、純粋でクリーン
* **ランタイムレイヤー**: ポリシー適用を備えた耐久性のあるオーケストレーション
* **エンジンレイヤー**: ワークフローバックエンド抽象化（Temporal、インメモリ、またはカスタム）

これはアーキテクチャ理論だけではありません—ニーズの進化に合わせてエージェントをテスト、変更、スケールしやすくする実動コードです。

### あなたをサポートする型安全性

ランタイムサプライズを忘れてください。Goa-AIはGoの型システムを活用してコンパイル時に問題をキャッチします：

```go
// 生成されたツール仕様 - あなたの契約
type SearchPayload struct {
    Query string `json:"query"`
    Limit *int   `json:"limit,omitempty"`
}

// あなたのエグゼキューター - クリーンで集中
func (e *executor) Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    args, _ := docsspecs.UnmarshalSearchPayload(call.Payload)
    // 型付き引数を直接使用
    return planner.ToolResult{Payload: result}, nil
}
```

エグゼキューターが設計と一致しない場合、コードが本番環境に到達する前に分かります。

## 次のステップ

* [はじめに](../2-getting-started/)ガイドに従って最初のエージェントを構築
* [コアコンセプト](../3-concepts/)を探索してDSL、ランタイム、ツールセットを理解
* [チュートリアル](../4-tutorials/)でステップバイステップの例をチェック
