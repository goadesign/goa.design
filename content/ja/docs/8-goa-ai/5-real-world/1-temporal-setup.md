---
title: "Temporalセットアップ"
linkTitle: "Temporalセットアップ"
weight: 1
description: "永続的なエージェントワークフロー実行のためにGoa-AIとTemporalを設定する。"
---

Goa-AIは[Temporal](https://temporal.io)を使用して、永続的でフォールトトレラントなエージェント実行を実現します。エージェントワークフローはマシンの再起動、ネットワーク障害、長時間実行される操作に耐えることができます。

## なぜTemporalか

エージェントワークフローは以下を伴うことがあります：

- 複数のLLMラウンドトリップ
- 外部サービスへのツールコール
- 人間の入力やレビューの待機

Temporalは以下を提供します：

- **耐久性**：ワークフローはクラッシュやサーバー再起動後も存続
- **リトライ**：失敗したアクティビティの自動リトライ
- **タイムアウト**：活動とワークフローの細かいタイムアウト制御
- **オブザーバビリティ**：ワークフロー実行の完全な可視性

## 基本セットアップ

### 1. ワーカーを作成

```go
package main

import (
    "log"

    "go.temporal.io/sdk/client"
    "go.temporal.io/sdk/worker"
    "goa.design/goa-ai/runtime/agent"
)

func main() {
    // Temporalクライアントを作成
    c, err := client.Dial(client.Options{
        HostPort: "localhost:7233",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer c.Close()

    // ランタイムを作成
    rt, err := agent.NewRuntime(ctx, nil, nil)
    if err != nil {
        log.Fatal(err)
    }

    // エージェントとツールを登録...

    // ワーカーを作成して開始
    w := worker.New(c, "agent-task-queue", worker.Options{})
    
    // ランタイムワークフローとアクティビティを登録
    rt.RegisterTemporalWorker(w)
    
    if err := w.Run(worker.InterruptCh()); err != nil {
        log.Fatal(err)
    }
}
```

### 2. ワークフローを開始

```go
// クライアントコードから
workflowOptions := client.StartWorkflowOptions{
    ID:        "agent-run-" + runID,
    TaskQueue: "agent-task-queue",
}

we, err := c.ExecuteWorkflow(ctx, workflowOptions, rt.AgentWorkflow, input)
if err != nil {
    return err
}

// 結果を取得
var result agent.RunResult
if err := we.Get(ctx, &result); err != nil {
    return err
}
```

## 設定オプション

```go
rt, err := agent.NewRuntime(ctx, nil, &agent.RuntimeConfig{
    Temporal: &agent.TemporalConfig{
        TaskQueue:          "my-agents",
        WorkflowTimeout:    time.Hour,
        ActivityTimeout:    time.Minute * 5,
        HeartbeatTimeout:   time.Second * 30,
    },
})
```

## 次のステップ

- [ストリーミングUI](./2-streaming-ui.md)を学んでリアルタイムイベントを消費する方法を理解
- [セッションとラン](./4-sessions-runs-memory.md)でワークフロー状態管理を探索


