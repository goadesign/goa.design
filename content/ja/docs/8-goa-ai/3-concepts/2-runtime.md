---
title: "ランタイムコンセプト"
linkTitle: "ランタイムコンセプト"
weight: 2
description: "Goa-AIランタイムがエージェントをオーケストレーションし、ポリシーを適用し、状態を管理する方法を理解する。"
---

Goa-AIランタイムは、プラン/実行/再開ループをオーケストレーションし、ポリシーを適用し、状態を管理し、エンジン、プランナー、ツール、メモリ、フック、機能モジュールと連携します。

## アーキテクチャ概要

| レイヤー | 責任 |
| --- | --- |
| DSL + コード生成 | エージェントレジストリ、ツールスペック/コーデック、ワークフロー、MCPアダプターを生成 |
| ランタイムコア | プラン/開始/再開ループ、ポリシー適用、フック、メモリ、ストリーミングをオーケストレーション |
| ワークフローエンジンアダプター | Temporalアダプターが`engine.Engine`を実装。他のエンジンもプラグイン可能 |
| 機能モジュール | オプションの統合（MCP、Pulse、Mongoストア、モデルプロバイダー） |

## ハイレベルエージェントアーキテクチャ

ランタイムでは、Goa-AIはシステムを小さなコンポーザブルな構成要素のセットで整理します：

- **エージェント**: `agent.Ident`で識別される長寿命オーケストレーター（例：`service.chat`）。
  各エージェントはプランナー、ランポリシー、生成されたワークフロー、ツール登録を所有します。

- **ラン**: エージェントの単一実行。
  ランは`RunID`で識別され、`run.Context`と`run.Handle`で追跡され、会話を形成するために`SessionID`と`TurnID`でグループ化されます。

- **ツールセットとツール**: `tools.Ident`で識別される名前付き機能コレクション（`service.toolset.tool`）。サービスバックエンドのツールセットはAPIを呼び出し、エージェントバックエンドのツールセットは他のエージェントをツールとして実行します。

- **プランナー**: `PlanStart` / `PlanResume`を実装するLLM駆動の戦略レイヤー。
  プランナーはツールを呼び出すか直接回答するかを決定し、ランタイムはそれらの決定の周りにキャップと時間予算を適用します。

- **ランツリーとエージェントアズツール**: エージェントが別のエージェントをツールとして呼び出すと、ランタイムは独自の`RunID`を持つ実際の子ランを開始します。親の`ToolResult`は子を指す`RunLink`（`*run.Handle`）を持ち、対応する`AgentRunStarted`イベントが親ランで発行されるので、UIやデバッガーはオンデマンドで子ストリームにアタッチできます。

- **ストリームとプロファイル**: すべてのランは独自の`stream.Event`値のストリームを持ちます（アシスタント応答、プランナー思考、ツール開始/更新/終了、待機、使用状況、ワークフロー、エージェントランリンク）。`stream.StreamProfile`は、特定のオーディエンス（チャットUI、デバッグ、メトリクス）に対してどのイベント種別が可視か、および子ランがどのように投影されるか（オフ、フラット化、リンク）を選択します。

このメンタルモデルにより、実行、観測可能性、UI投影をクリーンに分離して推論しやすく保ちながら、複雑なエージェントグラフを構築できます。

## クイックスタート

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    // インメモリエンジンがデフォルト。Temporalやカスタムエンジンの場合はWithEngineを渡す。
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "最新のステータスを要約してください。"}},
    }}, runtime.WithSessionID("session-1"))
    if err != nil {
        panic(err)
    }
    // out.RunID、out.Final（アシスタントメッセージ）などを使用
}
```

## クライアントのみ vs ワーカー

ランタイムを使用する2つの役割：

- **クライアントのみ**（ランを送信）: クライアント対応エンジンを持つランタイムを構築し、エージェントを登録しません。生成された`<agent>.NewClient(rt)`を使用し、リモートワーカーによって登録されたルート（ワークフロー + キュー）を持ちます。
- **ワーカー**（ランを実行）: ワーカー対応エンジンを持つランタイムを構築し、エージェント（実際のプランナー付き）を登録し、エンジンにワークフロー/アクティビティをポーリングして実行させます。

### クライアントのみの例

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // エンジンクライアント

// 呼び出し専用プロセスではエージェント登録不要
client := chat.NewClient(rt)
out, err := client.Run(ctx, msgs, runtime.WithSessionID("s1"))
```

### ワーカーの例

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // ワーカー対応エンジン
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// エンジンの統合に従ってエンジンワーカーループを開始（例：Temporal worker.Run()）
```

## プラン → ツール実行 → 再開（ループ）

1. ランタイムはエージェント用のワークフロー（インメモリまたはTemporal）を開始し、`RunID`、`SessionID`、`TurnID`、ラベル、ポリシーキャップを持つ新しい`run.Context`を記録します。
2. 現在のメッセージとランコンテキストでプランナーの`PlanStart`を呼び出します。
3. プランナーが返したツールコールをスケジュールします（プランナーは正規のJSONペイロードを渡し、ランタイムは生成されたコーデックを使用してエンコード/デコードを処理します）。
4. ツール結果で`PlanResume`を呼び出します。プランナーが最終応答を返すか、キャップ/時間予算に達するまでループが繰り返されます。実行が進むにつれて、ランは`run.Phase`値（`prompted`、`planning`、`executing_tools`、`synthesizing`、終了フェーズ）を進みます。
5. フックとストリームサブスクライバーはイベント（プランナー思考、ツール開始/更新/終了、待機、使用状況、ワークフロー、エージェントランリンク）を発行し、設定されている場合、トランスクリプトエントリとランメタデータを永続化します。

## ポリシーとキャップ

プランナーターンごとに適用：

- **最大ツールコール**: 暴走ループを防止
- **連続失敗**: N回連続のツール失敗後に中止
- **時間予算**: ランタイムが適用する壁時計制限

ツールはポリシーエンジンによって許可リスト/フィルタリングできます。

## ツール実行

- **ネイティブツールセット**: 実装を書きます。ランタイムは生成されたコーデックを使用して型付き引数をデコードします
- **エージェントアズツール**: 生成されたエージェントツールツールセットはプロバイダーエージェントを子ランとして実行し（プランナーの観点からはインライン）、その`RunOutput`を子ランへの`RunLink`ハンドルを持つ`planner.ToolResult`に適応させます
- **MCPツールセット**: ランタイムは正規のJSONを生成されたコーラーに転送し、コーラーはトランスポートを処理します

## メモリ、ストリーミング、テレメトリ

- **フックバス**はエージェントライフサイクル全体の構造化フックイベントを公開します：
  ラン開始/完了、フェーズ変更、ツールスケジューリング/結果/更新、プランナーノートと思考ブロック、待機、リトライヒント、エージェントアズツールリンク。
- **メモリストア**（`memory.Store`）はサブスクライブして`(agentID, RunID)`ごとに永続メモリイベント（ユーザー/アシスタントメッセージ、ツールコール、ツール結果、プランナーノート、思考）を追加します。
- **ランストア**（`run.Store`）は検索と運用ダッシュボード用のランメタデータ（ステータス、フェーズ、ラベル、タイムスタンプ）を追跡します。
- **ストリームシンク**（`stream.Sink`、例：Pulseまたはカスタムのsse/WebSocket）は`stream.Subscriber`によって生成された型付き`stream.Event`値を受信します。`StreamProfile`はどのイベント種別が発行されるか、子ランがどのように投影されるか（オフ、フラット化、リンク）を制御します。
- **テレメトリ**: OTEL対応のロギング、メトリクス、トレーシングがワークフローとアクティビティをエンドツーエンドで計測します。

### 単一ランのイベント観測

グローバルシンクに加えて、`Runtime.SubscribeRun`ヘルパーを使用して単一ランIDのイベントストリームを観測できます：

```go
type mySink struct{}

func (s *mySink) Send(ctx context.Context, e stream.Event) error {
    // SSE/WebSocket、ログなどにイベントを配信
    return nil
}

func (s *mySink) Close(ctx context.Context) error { return nil }

stop, err := rt.SubscribeRun(ctx, "run-123", &mySink{})
if err != nil {
    panic(err)
}
defer stop()
```

`SubscribeRun`は指定された`RunID`のイベントのみをシンクに転送するフィルタリングされたサブスクライバーをインストールし、サブスクリプションとシンクの両方を閉じる関数を返します。

## エンジン抽象化

- **インメモリ**: 高速開発ループ、外部依存なし
- **Temporal**: 永続実行、リプレイ、リトライ、シグナル、ワーカー。アダプターがアクティビティとコンテキスト伝播を配線

## ラン契約

- `SessionID`はラン開始時に必須です。`SessionID`が空または空白の場合、`Start`はすぐに失敗します
- エージェントは最初のランの前に登録する必要があります。ランタイムは最初のラン送信後の登録を`ErrRegistrationClosed`で拒否し、エンジンワーカーを決定論的に保ちます
- ツールエグゼキューターは`context.Context`から値を探すのではなく、明示的なコールごとのメタデータ（`ToolCallMeta`）を受け取ります
- 暗黙のフォールバックに依存しないでください。すべてのドメイン識別子（ラン、セッション、ターン、相関）は明示的に渡す必要があります

## 一時停止と再開

ヒューマンインザループワークフローは、ランタイムの中断ヘルパーを使用してランを中断および再開できます：

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// 一時停止
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// 再開
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

裏側では、一時停止/再開シグナルがランストアを更新し、`run_paused`/`run_resumed`フックイベントを発行するので、UIレイヤーは同期を維持します。

## フック、メモリ、ストリーミング

ランタイムは構造化イベントをフックバスに公開します。デフォルトサブスクライバーには以下が含まれます：

- **メモリサブスクライバー** – ツールコール、ツール結果、プランナーノート、思考ブロック、アシスタント応答を設定された`memory.Store`に書き込みます
- **ストリームサブスクライバー** – フックイベントを型付き`stream.Event`値（`AssistantReply`、`PlannerThought`、`ToolStart`、`ToolUpdate`、`ToolEnd`、`AwaitClarification`、`AwaitExternalTools`、`Usage`、`Workflow`、`AgentRunStarted`）にマップし、設定された`stream.Sink`に転送します

カスタムサブスクライバーは`Hooks.Register`を介して登録して、分析の発行、承認ワークフローのトリガーなどを行えます。

## プランナー契約

プランナーは以下を実装します：

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult`にはツールコール、最終応答、アノテーション、オプションの`RetryHint`が含まれます。ランタイムはキャップを適用し、ツールアクティビティをスケジュールし、最終応答が生成されるまでツール結果を`PlanResume`にフィードバックします。

## 機能モジュール

- `features/mcp/*` – MCPスイートDSL/コード生成/ランタイムコーラー（HTTP/SSE/stdio）
- `features/memory/mongo` – 永続メモリストア
- `features/run/mongo` – ランメタデータストア + 検索リポジトリ
- `features/stream/pulse` – Pulseシンク/サブスクライバーヘルパー
- `features/model/{bedrock,openai}` – プランナー用モデルクライアントアダプター

各モジュールはオプションです。サービスは必要なものをインポートし、結果のクライアントを機能オプション（例：`runtime.WithMemoryStore`、`runtime.WithRunStore`、`runtime.WithStream`）を介して`runtime.New`に渡すか、プランナーに直接配線します。

## 次のステップ

- ツール実行モデルを理解するための[ツールセット](../3-toolsets/)を学ぶ
- 外部ツールスイートのための[MCP統合](../4-mcp-integration.md)を探索する
- 本番デプロイメントのための[実世界パターン](../../5-real-world/)を読む

