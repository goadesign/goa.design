---
title: エージェントの構成
weight: 5
description: "Agent-as-Tool パターン、ランツリー、ストリーミングトポロジーを使ったエージェントの合成方法を学びます。"
llm_optimized: true
aliases:
---

このガイドでは、あるエージェントを別のエージェントのツールとして扱うことでエージェントを合成する方法を示し、Goa-AI がエージェント実行をツリーとしてモデル化し、異なるオーディエンス向けにストリーミングで投影する方法を説明します。

## 何を作るか

- プランニングツールをエクスポートするプランニングエージェント
- プランニングエージェントのツールを利用するオーケストレータエージェント
- インライン実行によるクロスプロセス合成

---

## コンポーズド・エージェントの設計

`design/design.go` を作成します:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var PlanRequest = Type("PlanRequest", func() {
    Attribute("goal", String, "Goal to plan for")
    Required("goal")
})

var PlanResult = Type("PlanResult", func() {
    Attribute("plan", String, "Generated plan")
    Required("plan")
})

var _ = Service("orchestrator", func() {
    // Planning agent that exports tools
    Agent("planner", "Planning agent", func() {
        Export("planning.tools", func() {
            Tool("create_plan", "Create a plan", func() {
                Args(PlanRequest)
                Return(PlanResult)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(5))
            TimeBudget("1m")
        })
    })
    
    // Orchestrator agent that uses planning tools
    Agent("orchestrator", "Orchestration agent", func() {
        Use(AgentToolset("orchestrator", "planner", "planning.tools"))
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

コードを生成します:

```bash
goa gen example.com/tutorial/design
```

---

## プランナーの実装

生成されたコードは両方のエージェント向けのヘルパーを提供します。これらを配線します:

```go
package main

import (
    "context"
    
    planner "example.com/tutorial/gen/orchestrator/agents/planner"
    orchestrator "example.com/tutorial/gen/orchestrator/agents/orchestrator"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Register planning agent
    if err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Register orchestrator agent (automatically uses planning tools)
    if err := orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Use orchestrator agent
    client := orchestrator.NewClient(rt)
    // ... run agent ...
}
```

**主要な概念:**

- **Export**: 他のエージェントが利用できるツールセットを宣言します
- **AgentToolset**: 別のエージェントからエクスポートされたツールセットを参照します
- **Inline Execution**: 呼び出し側の視点では、agent-as-tool は通常のツール呼び出しのように振る舞います。ランタイムはプロバイダエージェントを子ランとして実行し、その出力を単一の `ToolResult`（子ランへの `RunLink` 付き）に集約します
- **Cross-Process**: 異なるワーカー上でエージェントが実行されても、一貫したランツリーを維持できます。`AgentRunStarted` イベントとランハンドルが、親のツール呼び出しと子エージェントランをリンクし、ストリーミングと可観測性を実現します

---

## パススルー: 決定論的なツール転送

エクスポートされたツールのうち、プランナーを完全にバイパスしてサービスメソッドへ直接転送したいものには `Passthrough` を使います。これは次のような場合に有用です:

- LLM の意思決定を介さない、決定論的で予測可能な挙動が欲しい
- 既存のサービスメソッドの薄いラッパーにしたい
- プランナーのオーバーヘッド無しで確実なレイテンシが必要

### パススルーと通常実行の使い分け

| シナリオ | パススルー | 通常実行 |
|----------|------------|----------|
| 単純な CRUD 操作 | ✓ | |
| ロギング/監査ツール | ✓ | |
| LLM の推論が必要なツール | | ✓ |
| 複数ステップのワークフロー | | ✓ |
| ヒント付きでのリトライが必要になり得るツール | | ✓ |

### DSL での宣言

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("level", String, "Log level", func() {
                Enum("debug", "info", "warn", "error")
            })
            Attribute("message", String, "Message to log")
            Required("level", "message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
            Required("logged")
        })
        // Bypass planner, forward directly to LoggingService.LogMessage
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### ランタイムの挙動

コンシューマエージェントがパススルーツールを呼び出すと:

1. ランタイムはコンシューマのプランナーからツール呼び出しを受け取ります
2. プロバイダエージェントのプランナーを呼ぶ代わりに、ターゲットのサービスメソッドを直接呼び出します
3. LLM を介さずに結果がコンシューマへ返されます

これにより次が得られます:

- **予測可能なレイテンシ**: LLM 推論遅延なし
- **決定論的な挙動**: 同じ入力は常に同じ出力
- **コスト効率**: 単純な操作ではトークン消費なし

---

## ランツリーとセッション

Goa-AI は実行を **ランとツールのツリー** としてモデル化します:

{{< figure src="/images/diagrams/RunTree.svg" alt="ランツリーによる階層的なエージェント実行" >}}

- **Run** – エージェントの 1 回の実行:
  - `RunID` で識別
  - `run.Context`（RunID, SessionID, TurnID, labels, caps）で記述
  - `runlog.Store`（append-only の run event log。cursor paging）で永続追跡

- **Session** – 1 回以上のランにまたがる会話またはワークフロー:
  - `SessionID` が関連するランをグルーピング（例: マルチターンチャット）
  - UI は通常、1 回に 1 セッションをレンダリング

- **Run tree** – ランとツールの親子関係:
  - トップレベルのエージェントラン（例: `chat`）
  - 子エージェントラン（agent-as-tool、例: `ada`、`diagnostics`）
  - それらエージェント配下のサービスツール

ランタイムは次を用いてツリーを維持します:

- `run.Handle` – `RunID`, `AgentID`, `ParentRunID`, `ParentToolCallID` を持つ軽量ハンドル
- ネストされたエージェントでは **常に実際の子ラン** を作成する agent-as-tool ヘルパーとツールセット登録（隠れたインラインハックはしない）

---

## Agent-as-Tool と RunLink

あるエージェントが別のエージェントをツールとして使うとき:

1. ランタイムは、プロバイダエージェントの **子ラン** を、そのエージェント固有の `RunID` で開始します
2. `run.Context` で親子のリンクを追跡します
3. 子ランの中で plan/execute/resume ループをフルに実行します

親側のツール結果（`planner.ToolResult`）には次が入ります:

```go
RunLink *run.Handle
```

この `RunLink` により次が可能になります:

- プランナーが子ランについて推論できる（例: 監査/ロギング）
- UI がネストされた「エージェントカード」を作り、子ランのストリームを購読できる
- 外部ツールが推測無しで親ランから子ランへ辿れる

---

## ランごとのストリーム

各ランは `stream.Event` 値の **独自のストリーム** を持ちます:

- `AssistantReply`, `PlannerThought`
- `ToolStart`, `ToolUpdate`, `ToolEnd`
- `AwaitClarification`, `AwaitExternalTools`
- `Usage`, `Workflow`
- `AgentRunStarted`（親ツール → 子ランへのリンク）

コンシューマはラン単位でサブスクライブします:

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* handle */ }
defer stop()
```

これによりグローバルな「firehose」を避けつつ、UI は次ができます:

- ランごとに 1 接続をアタッチ（例: チャットセッションごと）
- `AgentRunStarted` のメタデータ（`ChildRunID`, `ChildAgentID`）を使って、必要なときだけ子ランを購読し「ドリルイン」する

---

## ストリームプロファイルと子ランのポリシー

`stream.StreamProfile` は「どのオーディエンスに何を見せるか」を記述します。各プロファイルは次を制御します:

- 含めるイベント種別（`Assistant`, `Thoughts`, `ToolStart`, `ToolUpdate`, `ToolEnd`, `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`, `AgentRuns`）
- `ChildStreamPolicy` による子ランの投影方法

### StreamProfile の構造

```go
type StreamProfile struct {
    Assistant          bool              // Assistant reply events
    Thoughts           bool              // Planner thinking/reasoning events
    ToolStart          bool              // Tool invocation start events
    ToolUpdate         bool              // Tool progress update events
    ToolEnd            bool              // Tool completion events
    AwaitClarification bool              // Human clarification requests
    AwaitExternalTools bool              // External tool execution requests
    Usage              bool              // Token usage events
    Workflow           bool              // Run lifecycle events
    AgentRuns          bool              // Agent-as-tool link events
    ChildPolicy        ChildStreamPolicy // How child runs are projected
}
```

### ChildStreamPolicy のオプション

`ChildStreamPolicy` は、ネストされたエージェントランがストリーム上でどう見えるかを制御します:

| ポリシー | 定数 | 挙動 |
|----------|------|------|
| **Off** | `ChildStreamPolicyOff` | 子ランはこのオーディエンスから隠れます。親ツール呼び出しと結果のみが見えます。ネストの詳細を必要としないメトリクスパイプラインに最適です。 |
| **Flatten** | `ChildStreamPolicyFlatten` | 子イベントを親ランストリームに投影し、デバッグ向けの「firehose」ビューを作ります。1 つのストリームで全イベントを見たい運用デバッグに有用です。 |
| **Linked** | `ChildStreamPolicyLinked` | 親は `AgentRunStarted` のリンクイベントを発行し、子イベントは子ストリームに残します。UI はオンデマンドで子ストリームを購読できます。構造化されたチャット UI に最適です。 |

### 組み込みプロファイル

Goa-AI は一般的な用途に向けて 3 つの組み込みプロファイルを提供します:

**`stream.UserChatProfile()`** – エンドユーザー向けチャット UI

```go
// Returns a profile suitable for end-user chat views
func UserChatProfile() StreamProfile {
    return StreamProfile{
        Assistant:          true,
        Thoughts:           true,
        ToolStart:          true,
        ToolUpdate:         true,
        ToolEnd:            true,
        AwaitClarification: true,
        AwaitExternalTools: true,
        Usage:              true,
        Workflow:           true,
        AgentRuns:          true,
        ChildPolicy:        ChildStreamPolicyLinked,
    }
}
```

- リッチな UI レンダリングのため、すべてのイベントタイプを出力します
- UI がネストされた「エージェントカード」をレンダリングし、オンデマンドで子ストリームを購読できるよう **Linked** を使います
- 子エージェントにドリルダウン可能にしつつ、メインのチャットレーンをクリーンに保ちます

**`stream.AgentDebugProfile()`** – 運用デバッグ

```go
// Returns a verbose profile for debugging views
func AgentDebugProfile() StreamProfile {
    p := DefaultProfile()
    p.ChildPolicy = ChildStreamPolicyFlatten
    return p
}
```

- `UserChatProfile` と同様にすべてのイベントタイプを出力します
- すべての子イベントを親ストリームへ投影するため **Flatten** を使います
- 相関のために `AgentRunStarted` リンクも出力します
- デバッグコンソールやトラブルシューティングツールに最適です

**`stream.MetricsProfile()`** – テレメトリ/メトリクスパイプライン

```go
// Returns a profile for metrics/telemetry pipelines
func MetricsProfile() StreamProfile {
    return StreamProfile{
        Usage:       true,
        Workflow:    true,
        ChildPolicy: ChildStreamPolicyOff,
    }
}
```

- `Usage` と `Workflow` のみを出力します
- ネストしたランを完全に隠すため **Off** を使います
- コスト追跡や性能監視向けにオーバーヘッドを最小化します

### サブスクライバへのプロファイル適用

ストリーム購読者の作成時にプロファイルを適用します:

```go
import "goa.design/goa-ai/runtime/agent/stream"

// Create a subscriber with the user chat profile
chatSub, err := stream.NewSubscriberWithProfile(chatSink, stream.UserChatProfile())
if err != nil {
    return err
}

// Create a subscriber with the debug profile
debugSub, err := stream.NewSubscriberWithProfile(debugSink, stream.AgentDebugProfile())
if err != nil {
    return err
}

// Create a subscriber with the metrics profile
metricsSub, err := stream.NewSubscriberWithProfile(metricsSink, stream.MetricsProfile())
if err != nil {
    return err
}
```

### カスタムプロファイルの作成

特殊な要件がある場合は、フィールドを個別に設定してカスタムプロファイルを作成します:

```go
// Custom profile: tools and workflow only, no thoughts or assistant replies
toolsOnlyProfile := stream.StreamProfile{
    ToolStart:   true,
    ToolUpdate:  true,
    ToolEnd:     true,
    Workflow:    true,
    ChildPolicy: stream.ChildStreamPolicyLinked,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

// Custom profile: flatten child runs but skip thoughts
flatNoThoughts := stream.StreamProfile{
    Assistant:          true,
    ToolStart:          true,
    ToolUpdate:         true,
    ToolEnd:            true,
    AwaitClarification: true,
    AwaitExternalTools: true,
    Usage:              true,
    Workflow:           true,
    AgentRuns:          true,
    ChildPolicy:        stream.ChildStreamPolicyFlatten,
}

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### プロファイル選択のガイドライン

| オーディエンス | 推奨プロファイル | 理由 |
|----------------|------------------|------|
| エンドユーザー向けチャット UI | `UserChatProfile()` | エージェントカードを展開できる、クリーンで構造化された表示 |
| 管理者/デバッグコンソール | `AgentDebugProfile()` | 子イベントをフラット化して完全に可視化 |
| メトリクス/課金 | `MetricsProfile()` | 集計に必要な最小限のイベント |
| 監査ログ | カスタム（全イベント、リンク） | 構造化された階層を保った完全な記録 |
| リアルタイムダッシュボード | カスタム（workflow + usage） | ステータスとコスト追跡のみ |

アプリケーションは、シンクやブリッジ（例: Pulse、SSE、WebSocket）を配線する際にプロファイルを選択することで、次を両立できます:

- チャット UI はクリーンで構造化されたまま（リンクされた子ラン、エージェントカード）
- デバッグコンソールはネストしたイベントストリームをすべて可視化
- メトリクスパイプラインは使用量とステータスを集計するのに十分な情報のみを取得

---

## ランツリーに基づくUI設計

ランツリー + ストリーミングモデルを踏まえると、典型的なチャット UI は次のように設計できます:

1. ユーザーチャットプロファイルで **ルートのチャットラン** を購読する
2. 次をレンダリングする:
   - アシスタントの返信
   - トップレベルツールのツール行
   - 「Agent run started」イベントをネストされた **エージェントカード** として表示
3. ユーザーがカードを展開したら:
   - `ChildRunID` を使って子ランを購読する
   - そのエージェントのタイムライン（thoughts, tools, awaits）をカード内にレンダリングする
   - メインのチャットレーンをクリーンに保つ

デバッグツールはデバッグプロファイルでサブスクライブすることで次を見られます:

- フラット化された子イベント
- 明示的な親/子メタデータ
- トラブルシューティングのための完全なランツリー

重要な点は、**実行トポロジー（ランツリー）は常に保持され**、ストリーミングはそのツリーに対するオーディエンス別の投影にすぎない、ということです。

---

## 次のステップ

- **[MCP Integration](./mcp-integration.md)** - 外部ツールサーバーへ接続する
- **[Memory & Sessions](./memory-sessions.md)** - 文字起こしとメモリストアで状態を管理する
- **[Production](./production.md)** - Temporal とストリーミング UI を用いてデプロイする
