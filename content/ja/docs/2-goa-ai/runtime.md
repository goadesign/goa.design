---
title: "ランタイム"
linkTitle: "ランタイム"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## アーキテクチャ概要

Goa-AI ランタイムは、Plan/Execute/Resume ループをオーケストレーションし、ポリシーを強制し、状態を管理し、エンジン、プランナー、ツール、メモリ、フック、およびフィーチャーモジュールと連携します。

| レイヤー | 責務 |
| --- | --- |
| DSL + Codegen | エージェント登録、ツール仕様/コーデック、ワークフロー、MCP アダプターを生成する |
| Runtime Core | plan/start/resume ループ、ポリシー強制、フック、メモリ、ストリーミングをオーケストレートする |
| Workflow Engine Adapter | Temporal アダプターが `engine.Engine` を実装し、他のエンジンも差し替え可能 |
| Feature Modules | 任意の統合（MCP、Pulse、Mongo ストア、モデルプロバイダーなど） |

---

## ハイレベルなエージェントアーキテクチャ

Goa-AI は実行時に、少数の合成可能な構成要素を中心にシステムを組み立てます。

- **Agents**: `agent.Ident`（例: `service.chat`）で識別される長寿命のオーケストレーターです。各エージェントは、プランナー、ランポリシー、生成されたワークフロー、およびツール登録を所有します。

- **Runs**: エージェントの 1 回の実行です。`RunID` で識別され、`run.Context` と `run.Handle` で追跡されます。また、`SessionID` と `TurnID` でグルーピングされ、会話を構成します。

- **Toolsets & tools**: `tools.Ident`（`service.toolset.tool`）で識別される能力の集合です。サービスバックのツールセットは API を呼び出し、エージェントバックのツールセットは他のエージェントをツールとして実行します。

- **Planners**: LLM による戦略レイヤで、`PlanStart` / `PlanResume` を実装します。プランナーは、ツールを呼ぶか直接回答するかを決め、ランタイムはその決定に対して上限（caps）と時間予算（time budget）を強制します。

- **Run tree & agent-as-tool**: あるエージェントが別のエージェントをツールとして呼ぶと、ランタイムは独自の `RunID` を持つ実際の子ランを開始します。親の `ToolResult` には子ランへの `RunLink`（`*run.Handle`）が格納され、ストリーミングでは `child_run_linked` イベントが親ツールコールと子ランを結び付けます。

- **Session-owned streams & profiles**: Goa-AI は型付けされた `stream.Event` を **セッション所有ストリーム**（`session/<session_id>`）へ発行します。イベントは `RunID` と `SessionID` を持ち、`run_stream_end` が SSE/WebSocket をタイマーなしで閉じるための明示マーカーになります。`stream.StreamProfile` は、対象（チャット UI、デバッグ、メトリクス）に応じてどのイベント種別を可視化するかを選択します。

---

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
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, "session-1", []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }})
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

## クライアント専用 vs ワーカー

ランタイムは大きく 2 つのロールで利用されます。

- **クライアント専用**（run の送信）: クライアント機能を持つエンジンでランタイムを構築し、エージェント登録は行いません。生成された `<agent>.NewClient(rt)` は、リモートワーカーによって登録されたルート（workflow + queue）を保持しており、これを用いて run を送信します。

- **ワーカー**（run の実行）: ワーカー機能を持つエンジンでランタイムを構築し、実際のプランナーを使ってエージェントを登録します。その上で、エンジンが workflow/activity をポーリングして実行します。

### クライアント専用の例

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "s1"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "s1", msgs)
```

### ワーカーの例

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // worker-enabled engine
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// Start engine worker loop per engine's integration (for example, Temporal worker.Run()).
```

---

## Plan → Execute → Resume ループ

1. ランタイムはエージェントのワークフロー（インメモリまたは Temporal）を開始し、`RunID`、`SessionID`、`TurnID`、ラベル、ポリシー上限を含む新しい `run.Context` を記録します。
2. 現在のメッセージと run コンテキストを渡して、プランナーの `PlanStart` を呼び出します。
3. プランナーが返したツール呼び出しをスケジュールします（プランナーは「正規（canonical）JSON」のペイロードを渡し、エンコード/デコードはランタイムが生成済みコーデックで処理します）。
4. ツール結果を添えて `PlanResume` を呼び出します。プランナーが最終応答を返すか、上限/時間予算に達するまでループします。進行に応じて run は `run.Phase`（`prompted` / `planning` / `executing_tools` / `synthesizing` / 終端フェーズ）を遷移します。
5. フックとストリームサブスクライバは、イベント（プランナー思考、ツール start/update/end、await、usage、workflow、agent-run links）を発行し、設定に応じてトランスクリプトや run メタデータを永続化します。

---

## Run フェーズ

run が plan/execute/resume ループを進むにつれて、ライフサイクルフェーズを遷移します。フェーズは、run が今どの段階にいるかをきめ細かく可視化し、UI が高レベルの進捗を表示できるようにします。

### フェーズ値（Phase Values）

| Phase | 説明 |
| --- | --- |
| `prompted` | 入力を受け取り、これからプランニングを開始する状態 |
| `planning` | ツールを呼ぶか直接答えるか、どのように進めるかをプランナーが判断している状態 |
| `executing_tools` | ツール（ネストされたエージェントを含む）が実行中の状態 |
| `synthesizing` | 追加ツールをスケジュールせず最終回答を合成している状態 |
| `completed` | 正常に完了した状態 |
| `failed` | 失敗した状態 |
| `canceled` | キャンセルされた状態 |

### フェーズ遷移

典型的な成功 run は、次のような経過をたどります。

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

ランタイムは `planning` / `executing_tools` / `synthesizing` などの **非終端フェーズ**に対して `RunPhaseChanged` フックイベントを発行し、ストリーム購読者がリアルタイムに進捗を追跡できるようにします。

### Phase と Status の違い

フェーズは `run.Status` とは異なります。

- **Status**（`pending`, `running`, `completed`, `failed`, `canceled`, `paused`）は、耐久化された run メタデータに格納される粗い粒度のライフサイクル状態です。
- **Phase** は、ストリーミング/UX 向けに実行ループをより細かく可視化するものです。

### ライフサイクルイベント: フェーズ遷移 vs 終端完了

ランタイムは次を発行します:

- **`RunPhaseChanged`**: 非終端フェーズ遷移。
- **`RunCompleted`**: run ごとに 1 回の終端ライフサイクル（success / failed / canceled）。

ストリーム購読者は、両方を `workflow` ストリームイベント（`stream.WorkflowPayload`）に変換します:

- **非終端更新**（`RunPhaseChanged`）: `phase` のみ。
- **終端更新**（`RunCompleted`）: `status` + 終端 `phase`。失敗時は構造化されたエラー情報を含みます。

**終端 status のマッピング**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**キャンセルはエラーではありません**

`status="canceled"` の場合、ストリームペイロードにユーザー向け `error` を含めてはいけません。

**失敗は構造化されます**

`status="failed"` の場合、ストリームペイロードに以下が含まれます:

- `error_kind`
- `retryable`
- `error`（ユーザー向け）
- `debug_error`（診断向け）

---

## ポリシー、上限（Caps）、ラベル

### 設計時 RunPolicy

設計時には、`RunPolicy` でエージェントごとのポリシーを設定します。

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

これはエージェント登録に紐づく `runtime.RunPolicy` になります。

- **Caps**: `MaxToolCalls`（run あたりのツール呼び出し総数）、`MaxConsecutiveFailedToolCalls`（連続失敗回数の上限）。
- **Time budget**: `TimeBudget`（run の wall-clock 予算）、`FinalizerGrace`（ランタイム専用: 最終化のための予約ウィンドウ）。
- **Interrupts**: `InterruptsAllowed`（pause/resume のオプトイン）。
- **Missing fields behavior**: `OnMissingFields`（バリデーションが欠落フィールドを示した場合の挙動）。

### ランタイムポリシーのオーバーライド

環境によっては、設計を変更せずにポリシーを強化/緩和したい場合があります。`rt.OverridePolicy` API により、プロセスローカルにポリシーを調整できます。

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Scope**: オーバーライドは現在のランタイムインスタンスにローカルで、以降の run にのみ影響します。プロセス再起動を越えて永続化されず、他ワーカーへも伝播しません。

**Overridable Fields**:

| Field | 説明 |
| --- | --- |
| `MaxToolCalls` | run あたりのツール呼び出し総数の上限 |
| `MaxConsecutiveFailedToolCalls` | 連続失敗回数の上限 |
| `TimeBudget` | run の wall-clock 予算 |
| `FinalizerGrace` | 最終化のための予約ウィンドウ |
| `InterruptsAllowed` | pause/resume を有効化する |

ゼロ値でないフィールドのみが適用されます（`InterruptsAllowed` は `true` の場合に適用）。これにより、他のポリシー設定へ影響を与えず選択的なオーバーライドが可能です。

**Use Cases**:

- プロバイダスロットリング時の一時的なバックオフ
- ポリシー設定の A/B テスト
- 制約を緩和した開発/デバッグ
- テナントごとのランタイムポリシー調整

### ラベルとポリシーエンジン

Goa-AI は `policy.Engine` を介してプラガブルなポリシーエンジンと統合します。ポリシーは、ツールのメタデータ（ID、タグ）、run コンテキスト（SessionID、TurnID、labels）、そしてツール失敗後の `RetryHint` 情報を受け取ります。

ラベルは次に流れます。

- `run.Context.Labels` – run 中にプランナーが参照可能
- runlog イベント（`runlog.Store`）– ライフサイクルイベントとともに永続化され、検索/ダッシュボードに有用（インデックスされる場合）

---

## ツール実行

- **Native toolsets**: 実装はアプリ側で書き、ランタイムが生成済みコーデックで型付き引数をデコードします。
- **Agent-as-tool**: 生成された agent-tool ツールセットはプロバイダーエージェントを子ランとして実行し（プランナー視点ではインライン）、その `RunOutput` を `planner.ToolResult` に変換し、子ランへの `RunLink`（ハンドル）を返します。
- **MCP toolsets**: ランタイムは正規 JSON を生成済み caller へ転送し、caller がトランスポートを扱います。

### Tool payload defaults

Tool payload decoding follows Goa’s **decode-body → transform** pattern and applies Goa-style defaults deterministically for tool payloads.

See **[Tool Payload Defaults](tool-payload-defaults/)** for the contract and codegen invariants.

## Prompt ランタイムコントラクト

Prompt 管理はランタイムネイティブで、バージョン管理されます。

- `runtime.PromptRegistry` は不変なベースライン `prompt.PromptSpec` 登録を保持する
- `runtime.WithPromptStore(prompt.Store)` はスコープ付き override 解決（`session` -> `facility` -> `org` -> global）を有効化する
- プランナーは `PlannerContext.RenderPrompt(ctx, id, data)` を呼び、prompt 内容を解決・描画する
- 描画済み内容には provenance 用の `prompt.PromptRef` が含まれ、プランナーは `model.Request.PromptRefs` に付与できる

```go
content, err := input.Agent.RenderPrompt(ctx, "aura.chat.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` は監査/プロベナンス向けのランタイムメタデータであり、プロバイダー wire payload のフィールドではありません。

---

## メモリ、ストリーミング、テレメトリ

- **Hook bus** は、run の開始/完了、フェーズ変更、`prompt_rendered`、ツールのスケジューリング/結果/更新、プランナーノートと思考ブロック、await、retry hints、agent-as-tool links など、エージェントライフサイクル全体の構造化フックイベントを publish します。

- **Memory stores**（`memory.Store`）は、`(agentID, RunID)` ごとに耐久化されるメモリイベント（ユーザー/アシスタントメッセージ、ツール呼び出し、ツール結果、プランナーノート、思考）を購読し追記します。

- **Run event stores**（`runlog.Store`）は、`RunID` ごとに hook イベントのカノニカルログを追記し、audit/debug UI と run の introspection に利用できます。

- **Stream sinks**（`stream.Sink`。例: Pulse またはカスタム SSE/WebSocket）は、`stream.Subscriber` が生成する型付き `stream.Event` を受け取ります。`StreamProfile` は送出するイベント種別を制御します。

- **Telemetry**: OTEL 対応のロギング、メトリクス、トレーシングが workflow/activity を end-to-end で計測します。

### ツール呼び出しヒント（DisplayHint）

ツール呼び出しには、ユーザー向けの `DisplayHint`（例: UI 表示用）を含めることができます。

契約:

- hooks のイベントコンストラクタはヒントをレンダリングしません。ツール呼び出しのスケジュールイベントは既定で `DisplayHint==""` です。
- ランタイムは、型付き payload をデコードして DSL の `CallHintTemplate` を実行できる場合、公開時に **永続的な** 呼び出しヒントを付与して保存できます。
- 型付きデコードに失敗する、またはテンプレートが登録されていない場合、ランタイムは `DisplayHint` を空のままにします（生の JSON に対してヒントをレンダリングしません）。
- producer が hook イベントを公開する前に `DisplayHint`（非空）を明示的に設定した場合、ランタイムはそれを権威ある値として扱い、上書きしません。
- consumer ごとの文言変更（例: UI の表現）にはランタイムで `runtime.WithHintOverrides` を設定します。override は、ストリームの `tool_start` イベントにおいて DSL テンプレートより優先されます。

### セッションストリームの消費（Pulse）

プロダクションでは一般に以下のパターンを取ります：

- 共有バス（Pulse / Redis Streams）からセッションストリーム（`session/<session_id>`）を消費する
- `run_id` でフィルタして run ごとのカード/レーンを構築する
- アクティブ run の `run_stream_end` を観測したら SSE/WebSocket を終了する

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

## エンジン抽象

- **In-memory**: 高速な開発ループ、外部依存なし
- **Temporal**: 耐久実行、リプレイ、リトライ、シグナル、ワーカー。アダプタがアクティビティとコンテキスト伝搬を統合します。

---

## Run コントラクト

- `SessionID` は run 開始時に必須です。`Start` は `SessionID` が空、または空白のみの場合に fail-fast します。
- エージェントは最初の run の前に登録されなければなりません。ランタイムは、エンジンワーカーの決定性を保つため、最初の run 送信後の登録を `ErrRegistrationClosed` で拒否します。
- ツール実行者は、`context.Context` から値を“釣る”のではなく、呼び出しごとの明示メタデータ（`ToolCallMeta`）を受け取ります。
- 暗黙のフォールバックには依存しません。すべてのドメイン識別子（run / session / turn / correlation）は明示的に渡します。

---

## 一時停止と再開

Human-in-the-loop のワークフローは、ランタイムの interrupt ヘルパーを使って run を一時停止/再開できます。

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// Pause
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// Resume
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

内部では pause/resume シグナルが run ストアを更新し、`run_paused` / `run_resumed` フックイベントを発行するため、UI レイヤは同期を維持できます。

---

## ツール確認（Tool Confirmation）

Goa-AI は、書き込み・削除・コマンド実行などのセンシティブなツールに対して、**ランタイム強制**の確認ゲートをサポートします。

確認は次の 2 通りで有効化できます。

- **設計時（一般的）**: ツール DSL 内で `Confirmation(...)` を宣言します。Codegen はポリシーを `tools.ToolSpec.Confirmation` に格納します。
- **ランタイム（上書き/動的）**: ランタイム構築時に `runtime.WithToolConfirmation(...)` を渡し、追加ツールに確認を要求したり設計時の挙動を上書きしたりできます。

実行時には、workflow がアウトオブバンドの確認要求を発行し、明示的な承認が与えられた後にのみツールを実行します。拒否された場合、ランタイムはスキーマ準拠のツール結果を合成し、トランスクリプトの整合性（決定性）を保ったままプランナーが反応できるようにします。

### 確認プロトコル

実行時の確認は、専用の await/decision プロトコルとして実装されます。

- **Await payload**（`await_confirmation` としてストリームされる）:

```json
{
  "id": "...",
  "title": "...",
  "prompt": "...",
  "tool_name": "atlas.commands.change_setpoint",
  "tool_call_id": "toolcall-1",
  "payload": { "...": "canonical tool arguments (JSON)" }
}
```

- **決定の提供**（ランタイムの `ProvideConfirmation` を通して）:

```go
err := rt.ProvideConfirmation(ctx, interrupt.ConfirmationDecision{
    RunID:       "run-123",
    ID:         "await-1",
    Approved:    true,              // or false
    RequestedBy: "user:123",
    Labels:      map[string]string{"source": "front-ui"},
    Metadata:    map[string]any{"ticket_id": "INC-42"},
})
```

### ツール承認イベント

決定が提供されると、ランタイムは第一級の承認イベントを発行します:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

このイベントは、確認が必要なツール呼び出しに対する “who/when/what” の正規レコードです:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (ランタイムが決定論的にレンダリングする要約)
- `approved_by` (`interrupt.ConfirmationDecision.RequestedBy` からコピーされる安定 principal ID)

イベントは決定受信直後に発行されます（承認時はツール実行前、拒否時は拒否結果の合成前）。

注意:

- コンシューマは確認を「ランタイムプロトコル」として扱うべきです。
  - 付随する `RunPaused` の理由（`await_confirmation`）を見て、確認 UI を出すべきタイミングを判断します。
  - 確認 UI の挙動を特定の確認ツール名に結びつけないでください（内部トランスポート詳細として扱います）。
- 確認テンプレート（`PromptTemplate` と `DeniedResultTemplate`）は Go の `text/template` 文字列で、`missingkey=error` で実行されます。標準関数（例: `printf`）に加えて、Goa-AI は次を提供します。
  - `json v` → `v` を JSON エンコード（オプショナルポインタや構造値の埋め込みに便利）
  - `quote s` → Go のエスケープ済み引用符付き文字列を返す（`fmt.Sprintf("%q", s)` 相当）

### ランタイムバリデーション

ランタイムは境界で確認操作をバリデートします。

- 提供された確認 `ID` が、保留中の await 識別子と一致すること
- decision オブジェクトが整形されていること（空でない `RunID`、真偽値の `Approved`）

---

## プランナー契約

プランナーは次を実装します。

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` にはツール呼び出し、最終応答、注釈、オプションの `RetryHint` が含まれます。ランタイムは上限を強制し、ツールアクティビティをスケジュールし、最終応答が生成されるまでツール結果を `PlanResume` にフィードバックします。

プランナーは `input.Agent` 経由でランタイムサービスを提供する `PlannerContext` も受け取ります。

- `ModelClient(id string)` - provider-agnostic なモデルクライアントを取得する
- `RenderPrompt(ctx, id, data)` - 現在の run scope で prompt 内容を解決・描画する
- `AddReminder(r reminder.Reminder)` - run スコープの system reminder を登録する
- `RemoveReminder(id string)` - 前提条件が満たされなくなったときに reminder を削除する
- `Memory()` - 会話履歴へアクセスする

---

## フィーチャーモジュール

- `features/mcp/*` – MCP suite DSL/codegen/runtime callers（HTTP/SSE/stdio）
- `features/memory/mongo` – durable memory store
- `features/prompt/mongo` – Mongo-backed prompt override store
- `features/runlog/mongo` – run event log store（append-only, cursor pagination）
- `features/session/mongo` – session metadata store
- `features/stream/pulse` – Pulse sink/subscriber helpers
- `features/model/{anthropic,bedrock,openai}` – モデルクライアントアダプター（プランナー向け）
- `features/model/middleware` – 共有 `model.Client` ミドルウェア（例: 適応型レート制限）
- `features/policy/basic` – allow/block リストと retry hint を扱う簡易ポリシーエンジン

### モデルクライアントのスループット & レート制限

Goa-AI は `features/model/middleware` に provider-agnostic な適応型レートリミッターを提供します。これは任意の `model.Client` をラップし、リクエストごとのトークンを推定し、トークンバケットで呼び出しをキューイングし、プロバイダがスロットリングを返したときに AIMD（additive-increase/multiplicative-decrease）戦略で実効 TPM 予算を調整します。

```go
import (
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
}, ledger)

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New(runtime.Options{
    // Register limited as the model client exposed to planners.
})
```

---

## LLM 統合

Goa-AI のプランナーは、**provider-agnostic なインターフェース**を通じて大規模言語モデルと対話します。この設計により、プランナーコードを変えずに、AWS Bedrock、OpenAI、カスタムエンドポイントなどのプロバイダーを切り替えられます。

### `model.Client` インターフェース

すべての LLM 呼び出しは `model.Client` を通ります。

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### プロバイダーアダプター

Goa-AI は一般的な LLM プロバイダー向けのアダプターを同梱しています。

**AWS Bedrock**

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

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

### プランナーでモデルクライアントを使う

プランナーはランタイムの `PlannerContext` 経由でモデルクライアントを取得します。

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")

    req := &model.Request{
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

    // Drain stream and build response...
}
```

ランタイムは、基礎となる `model.Client` をイベント装飾したクライアントでラップし、ストリームから読み取るたびにプランナーイベント（thinking blocks、assistant chunks、usage）を発行します。

### 自動イベントキャプチャ

ランタイムはモデルクライアントのストリーミングイベントを自動的に取り込み、プランナーが手動でイベントを発行する必要をなくします。`input.Agent.ModelClient(id)` は、次のイベントを自動発行する装飾クライアントを返します。

- ストリームから読み取ったテキストコンテンツに対して `AssistantChunk` イベントを発行
- 推論/思考コンテンツに対して `PlannerThinkingBlock` イベントを発行
- トークン使用量に対して `UsageDelta` イベントを発行

この装飾は透過的に行われます。

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // ModelClient returns a decorated client that auto-emits events
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")

    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()

    // Simply drain the stream - events are emitted automatically
    var text strings.Builder
    var toolCalls []model.ToolCall
    for {
        chunk, err := streamer.Recv()
        if errors.Is(err, io.EOF) {
            break
        }
        if err != nil {
            return nil, err
        }
        // Process chunk for your planner logic
        // Events are already emitted by the decorated client
    }
    // ...
}
```

**Important**: `planner.ConsumeStream` を使う必要がある場合は、ランタイムにラップされていない生の `model.Client` を取得してください。装飾クライアントと `ConsumeStream` を混ぜると、イベントが二重に発行されます。

### Bedrock メッセージ順序の検証

AWS Bedrock で thinking mode を有効にすると、ランタイムはリクエスト送信前にメッセージ順序制約を検証します。Bedrock は次を要求します。

1. `tool_use` を含むアシスタントメッセージは、必ず thinking ブロックから始まること
2. `tool_result` を含むユーザーメッセージは、対応する `tool_use` ブロックを持つアシスタントメッセージの直後に続くこと
3. `tool_result` ブロック数は、直前の `tool_use` 数を超えないこと

Bedrock クライアントはこれらを早期に検証し、違反時は説明的なエラーを返します。

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

この検証により、トランスクリプト ledger の再構築がプロバイダー準拠のメッセージ列を生成することを保証します。

---

## 次のステップ

- ツール実行モデルを理解するために [Toolsets](./toolsets/) を学ぶ
- agent-as-tool パターンのために [Agent Composition](./agent-composition/) を読む
- トランスクリプト永続化のために [Memory & Sessions](./memory-sessions/) を読む
