---
title: "最初のエージェント"
linkTitle: "最初のエージェント"
weight: 2
description: "Goa-AIで数分で最初のエージェントを作成しましょう。"
---

このガイドでは、Goa-AIで最初のエージェントを作成する手順を説明します。ヘルパーツールセットを使って質問に答えることができるシンプルなQ&Aアシスタントを構築します。

## 新しいプロジェクトをスキャフォールド

新しいプロジェクトディレクトリを作成：

```bash
mkdir -p $GOPATH/src/example.com/quickstart && cd $_
go mod init example.com/quickstart
go get goa.design/goa/v3@latest
go get goa.design/goa-ai@latest
```

## 設計を追加

シンプルなエージェント定義で`design/design.go`を作成：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// インライン説明付きの入出力型
var AskPayload = Type("AskPayload", func() {
    Attribute("question", String, "回答するユーザーの質問")
    Example(map[string]any{"question": "日本の首都は何ですか？"})
    Required("question")
})

var Answer = Type("Answer", func() {
    Attribute("text", String, "回答テキスト")
    Required("text")
})

var _ = Service("orchestrator", func() {
    Agent("chat", "フレンドリーなQ&Aアシスタント", func() {
        Use("helpers", func() {
            Tool("answer", "簡単な質問に答える", func() {
                Args(AskPayload)
                Return(Answer)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(2), MaxConsecutiveFailedToolCalls(1))
            TimeBudget("15s")
        })
    })
})
```

この設計は以下を宣言します：
- `orchestrator`というサービス
- `helpers`ツールセットを使用する`chat`というエージェント
- 型付きペイロードと結果を持つ`answer`というツール
- キャップと時間予算を持つ実行ポリシー

## コードを生成

Goaコードジェネレーターを実行：

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
```

これにより以下が作成されます：
- `gen/orchestrator/agents/chat/`配下に生成されたエージェントパッケージ
- `gen/orchestrator/agents/chat/specs/`配下にツール仕様とコーデック
- `cmd/orchestrator/`配下に実行可能なサンプル

## シンプルなプランナーを実装

最小限のプランナーで`cmd/demo/main.go`を作成：

```go
package main

import (
    "context"
    "fmt"

    chat "example.com/quickstart/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

// シンプルなプランナー：常に返信、ツールなし（最初の実行に最適）
type StubPlanner struct{}

func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Goa-AIからこんにちは！"}},
            },
        },
    }, nil
}

func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "完了。"}},
            },
        },
    }, nil
}

func main() {
    // 1) ランタイム（デフォルトでインメモリエンジンを使用）
    rt := runtime.New()

    // 2) プランナーで生成されたエージェントを登録
    if err := chat.RegisterChatAgent(context.Background(), rt, chat.ChatAgentConfig{
        Planner: &StubPlanner{},
    }); err != nil {
        panic(err)
    }

    // 3) 生成された型付きクライアントを使って実行
    client := chat.NewClient(rt)
    out, err := client.Run(context.Background(),
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "挨拶して"}},
        }},
        runtime.WithSessionID("session-1"),
    )
    if err != nil {
        panic(err)
    }
    fmt.Println("RunID:", out.RunID)
    // out.Finalにはアシスタントメッセージが含まれます
    if out.Final != nil && len(out.Final.Parts) > 0 {
        if tp, ok := out.Final.Parts[0].(model.TextPart); ok {
            fmt.Println("アシスタント:", tp.Text)
        }
    }
}
```

## デモを実行

最初のエージェントを実行：

```bash
go run ./cmd/demo
```

期待される出力：

```
RunID: orchestrator.chat-...
アシスタント: Goa-AIからこんにちは！
```

## 何が起きたかを理解する

1. **設計**：GoaのDSLでツールセットを持つエージェントを宣言
2. **コード生成**：Goa-AIが型付きエージェントパッケージ、ツール仕様、コーデックを生成
3. **ランタイム**：ランタイムが計画/実行ループをオーケストレーション
4. **プランナー**：プランナーが最終レスポンスを返すことを決定（ツール呼び出しなし）

## 次のステップ

動作するエージェントができたので、以下ができます：

- [DSLリファレンス](../3-concepts/1-dsl/)で利用可能なすべてのDSL関数を学ぶ
- [ランタイムコンセプト](../3-concepts/2-runtime/)でランタイムの動作を理解
- [シンプルエージェントチュートリアル](../4-tutorials/1-simple-agent/)でツール実行を含むより完全なエージェントを構築

## オプション：Temporalセットアップ

耐久性のあるワークフローのために、インメモリエンジンの代わりにTemporalを使用できます：

```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
// 残りのコードは同じ
```

Temporal開発サーバーを起動：

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

残りのコードは同一のまま—ランタイムがエンジンの違いを抽象化します。
