---
title: "シンプルエージェントの構築"
linkTitle: "シンプルエージェント"
weight: 1
description: "最初のGoa-AIエージェントをツールと一緒にゼロから構築する。"
---

このチュートリアルでは、以下を行うシンプルなGoa-AIエージェントを構築します：

- ユーザープロンプトを受け入れる
- 設計定義されたツールを使用してタスクを完了する
- 構造化された型安全な応答を返す

## 前提条件

- Go 1.24以上
- 基本的なGoaの知識
- AWS Bedrock、OpenAI、または他の`model.Client`互換プロバイダーへのアクセス

## ステップ1：設計を作成する

まず、エージェント設計を作成します。Goaパッケージで新しい`design.go`ファイルを作成するか、既存のGoa設計に追加します：

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa/v3/dsl"
)

var _ = Service("assistant", func() {
    Description("シンプルなアシスタントサービス")

    // アシスタント用のエージェントを定義
    Agent("helper", "リクエストを支援する有能なアシスタント", func() {
        // このエージェントにツールセットをアタッチ
        UseToolset("utilities")
    })
})

// 現在時刻ツールを持つユーティリティツールセット
var _ = Toolset("utilities", "汎用ユーティリティツール", func() {
    Tool("get_time", "現在の日付と時刻を取得する", func() {
        Result(String, "HH:MM:SS形式の現在時刻")
    })
})
```

## ステップ2：コードを生成する

通常のGoa生成を実行：

```bash
goa gen <your-module>/design -o .
```

これにより`gen/`に以下が作成されます：

- エージェント登録（`gen/<service>/agents/<agent>/`）
- ツールスペックとスキーマ（`gen/<service>/agents/<agent>/specs/`）
- ツールセット登録ヘルパー（`gen/<service>/toolsets/<toolset>/`）

## ステップ3：ツールハンドラーを実装する

生成されたツールセット登録を使用するツールハンドラーを作成：

```go
package main

import (
    "context"
    "time"

    "goa.design/goa-ai/runtime/agent"
    utilities "your-module/gen/assistant/toolsets/utilities"
)

func registerTools(rt *agent.Runtime) error {
    reg := utilities.NewRegistration()
    
    reg.GetTime = func(ctx context.Context, payload *utilities.GetTimePayload) (*utilities.GetTimeResult, error) {
        return &utilities.GetTimeResult{
            Time: time.Now().Format("15:04:05"),
        }, nil
    }
    
    return rt.RegisterToolset(reg)
}
```

## ステップ4：ランタイムをセットアップしてランを実行する

すべてを組み合わせる：

```go
package main

import (
    "context"
    "log"

    "goa.design/goa-ai/features/model/bedrock"
    "goa.design/goa-ai/runtime/agent"
    helper "your-module/gen/assistant/agents/helper"
)

func main() {
    // ランタイムを作成
    rt, err := agent.NewRuntime(context.Background(), nil, nil)
    if err != nil {
        log.Fatal(err)
    }

    // モデルクライアントを設定（例：Bedrock）
    modelClient, err := bedrock.New(/* AWS config */, bedrock.Options{
        DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        MaxTokens:    1024,
    }, nil)
    if err != nil {
        log.Fatal(err)
    }

    // ツールを登録
    if err := registerTools(rt); err != nil {
        log.Fatal(err)
    }

    // エージェントを登録
    if err := helper.Register(rt, modelClient); err != nil {
        log.Fatal(err)
    }

    // エージェントランを実行
    result, err := rt.Run(context.Background(), helper.AgentID, "今何時ですか？")
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("エージェント応答: %s", result.Reply)
}
```

## 次のステップ

- より多くのツールを追加し、ペイロードの型やバリデーションを探索する
- エラーやリトライに対処するために`RetryHint`を追加する
- 会話のコンテキストのためにセッション管理を探索する
- ストリーミングを有効にしてチャットUIのリアルタイム更新を実現する


