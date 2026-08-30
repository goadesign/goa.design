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
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    rt := runtime.New(storageinmem.New())
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
- **Cross-Process**: 異なるワーカー上でエージェントが実行されても、一貫したランツリーを維持できます。`ChildRunLinked` イベントとランハンドルが、親のツール呼び出しと子エージェントランをリンクし、ストリーミングと可観測性を実現します

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
  - ホストの `storage.Store` が、実行状態と変更不可の記録を一つの操作で永続化

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

子プランナーを実行する前に、`storage.Store.StartChildRun` は親へのリンク、子のメタデータ、子の最初の記録をまとめて保存します。session を持たない親には `StartOneShotChildRun` が同じ操作を行い、session を作りません。最初の呼び出しでは、親が存在し、session を持たず、まだ実行中であることが必要です。リンクがすでに保存されていれば、親の終了後も完全に同じ再試行は成功します。内容を変えた再試行や、親の終了後に新しい子を作る呼び出しは拒否されます。

親の tool registration が child 用の prompt を描画する場合、runtime は child
workflow を開始する前に activity でその prompt を準備します。activity は成功か
失敗のどちらか一方だけを返します。成功には、workflow history に保存する正確な
message と prompt render event だけが含まれます。workflow は activity から identity
を受け取らず、記録済みの元の tool call から child run、session、parent、tool、label
の identity を導出します。そのため replay は元の描画済み text を使い、storage
から新しい prompt version を読みません。

Temporal の子 workflow ID には、ランタイムが割り当てた正確な tool-call ID が含まれます。これにより、同じネスト先エージェントを並列に呼び出しても区別できます。この導出方法を変更するリリースは、すでに実行中の子 workflow と互換性がありません。

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
- UI がネストされた「エージェントカード」を作り、セッションストリームを `run_id` でフィルタして子ランのイベントを描画できる
- 外部ツールが推測無しで親ランから子ランへ辿れる

---

## セッション所有ストリーム

Goa-AI は `stream.Event` を単一の **セッション所有ストリーム** に発行します:

- `session/<session_id>`

このストリームには、セッションに属するすべての run（agent-as-tool による子 run を含む）のイベントが含まれます。各イベントは `run_id` と `session_id` を持ち、ランタイムは次を発行します:

- `child_run_linked`: 親ツール呼び出し（`tool_call_id`）と子 run（`child_run_id`）をリンクする
- `run_stream_end`: 「この run に対してこれ以上ストリーム可視イベントは出ない」ことを示す明示マーカー

コンシューマは **セッション単位で 1 回** 購読し、アクティブ run の `run_stream_end` を観測したら SSE/WebSocket を終了します。

```go
import "goa.design/goa-ai/runtime/agent/stream"

events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt, ok := <-events:
        if !ok {
            return
        }
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
    case err := <-errs:
        panic(err)
    }
}
```

---

## ストリームプロファイル

`stream.StreamProfile` は「どのオーディエンスに何を見せるか」を記述し、購読者（subscriber）が出力するイベント種別を制御します。

### StreamProfile の構造

```go
type StreamProfile struct {
    Assistant          bool // assistant_reply
    AssistantTurns     bool // assistant_turn
    Thoughts           bool // planner_thought
    PromptRendered     bool // prompt_rendered
    ToolStart          bool // tool_start
    ToolUpdate         bool // tool_update
    ToolEnd            bool // tool_end
    AwaitClarification bool // await_clarification
    AwaitConfirmation  bool // await_confirmation
    AwaitQuestions     bool // await_questions
    AwaitExternalTools bool // await_external_tools
    ToolAuthorization  bool // tool_authorization
    Usage              bool // usage
    Workflow           bool // workflow
    ChildRuns          bool // child_run_linked（親ツール → 子 run のリンク）
}
```

### 組み込みプロファイル

- `stream.DefaultProfile()` は全イベント種別を出力します。
- `stream.UserChatProfile()` はエンドユーザー向け UI に適したプロファイルです。
- `stream.AgentDebugProfile()` はデバッグ/開発者向けのプロファイルです。
- `stream.MetricsProfile()` は `Usage` と `Workflow` のみを出力します。

セッション所有ストリーミングでは子 run のために別ストリーム購読は不要です。`child_run_linked` を使って run tree を構築し、同一の `session/<session_id>` ストリームを `run_id` でフィルタしてカードに紐付けます。

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
    ChildRuns:   true,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### プロファイル選択のガイドライン

| オーディエンス | 推奨プロファイル | 理由 |
|----------------|------------------|------|
| エンドユーザー向けチャット UI | `UserChatProfile()` | エージェントカードを展開できる、クリーンで構造化された表示 |
| 管理者/デバッグコンソール | `AgentDebugProfile()` | ツール、await、workflow フェーズの詳細を可視化 |
| メトリクス/課金 | `MetricsProfile()` | 集計に必要な最小限のイベント |
| 監査ログ | `DefaultProfile()` | run 相関フィールドを含む完全な記録 |
| リアルタイムダッシュボード | カスタム（workflow + usage） | ステータスとコスト追跡のみ |

アプリケーションは、シンクやブリッジ（例: Pulse、SSE、WebSocket）を配線する際にプロファイルを選択することで、次を両立できます:

- チャット UI はクリーンで構造化されたまま（`child_run_linked` によるネストカード）
- デバッグコンソールは同じセッションストリームで詳細を可視化
- メトリクスパイプラインは使用量とステータスを集計するのに十分な情報のみを取得

---

## 検証エラーと回復

スキーマに適合しないモデル生成ツール呼び出しは、回復処理へ進みません。検証済みモデルクライアントが `model.OutputValidationError` として拒否し、プランナー／ランタイムは executor やサービスコードを実行する前に `planner.OutputContractError` として公開します。`planner.NewToolRequest` で作ったプランナー生成呼び出しのエンコード失敗は、プランナーコードへ直接返ります。

### 回復に使う情報の出所

`ToolFailure` が始まるのは、モデル生成呼び出しが検証を通過し、ランタイムに受理された後だけです。その executor またはドメイン境界は、構造化されたフィールド問題を含む回復可能な失敗を返せます。失敗が `RecoveryCorrectCall` を選んだ場合、ランタイムは元のモデル生成入力と生成済み example を次のプランナーターンへ渡します。モデル由来でない呼び出しは、同一呼び出しの修正を要求できません。

### 実際の効果

- UI は、受理後に発生した回復可能な失敗のフィールド問題と example を表示できます。
- `RecoveryCorrectCall` が許可する場合、プランナーは対象を絞った質問を行い、修正した呼び出しを作れます。

---

## ランツリーに基づくUI設計

ランツリー + ストリーミングモデルを踏まえると、典型的なチャット UI は次のように設計できます:

1. セッションストリーム（`session/<session_id>`）をユーザーチャットプロファイルで購読する
2. アクティブ run（`active_run_id`）を追跡し、次をレンダリングする:
   - アシスタントの返信（`assistant_reply`）
   - ツールのライフサイクル（`tool_start`/`tool_update`/`tool_end`）
   - 子 run リンク（`child_run_linked`）をネストされた **エージェントカード** として表示（`child_run_id` でカードを作る）
3. 各カードの中身は、同じセッションストリームを `run_id == child_run_id` でフィルタして描画する（追加の購読は不要）
4. `active_run_id` の `run_stream_end` を観測したら SSE/WebSocket を終了する

重要な点は、**実行トポロジー（ランツリー）は ID とリンクイベントで保持され**、ストリーミングはセッション単位の 1 本の順序付きログを `run_id` で投影して UI のレーン/カードを作る、ということです。

---

## 次のステップ

- **[MCP Integration](./mcp-integration.md)** - 外部ツールサーバーへ接続する
- **[Memory & Sessions](./memory-sessions.md)** - 文字起こしとメモリストアで状態を管理する
- **[Production](./production.md)** - Temporal とストリーミング UI を用いてデプロイする
