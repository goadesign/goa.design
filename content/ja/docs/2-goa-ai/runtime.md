---
title: "ランタイム"
linkTitle: "ランタイム"
weight: 3
description: "Goa-AI ランタイムがエージェントをオーケストレーションし、ポリシーを強制し、状態を管理する仕組みを理解します。"
llm_optimized: true
aliases:
---

## アーキテクチャ概要

Goa-AI ランタイムは、Plan/Execute/Resume ループをオーケストレーションし、ポリシーを強制し、状態を管理し、エンジン、プランナー、ツール、メモリ、フック、およびフィーチャーモジュールと連携します。

ツールに加えて、ランタイムは最終アシスタント応答を型付きで扱う
`Completion(...)` コントラクトもサポートします。

これらのコントラクトは `gen/<service>/completions` に unary と
streaming のヘルパーを生成します。completion 名は 1-64 文字の
ASCII、英字・数字・`_`・`-` のみ、先頭は英字または数字という
ルールで DSL 境界で検証されます。streaming では `completion_delta`
はプレビュー専用で、正規の値は最後の 1 つの `completion` chunk
だけです。structured output を実装しない provider は
`model.ErrStructuredOutputUnsupported` を返します。
生成されるスキーマは正規かつ provider 非依存であり、モデル
アダプターは対応するサブセットへ正規化できますが、宣言された
契約を保てない場合は明示的に失敗しなければなりません。

| レイヤー | 責務 |
| --- | --- |
| DSL + Codegen | エージェント登録、ツール仕様/コーデック、ワークフロー、MCP アダプターを生成する |
| Runtime Core | plan/start/resume ループ、ポリシー強制、フック、メモリ、ストリーミングをオーケストレートする |
| Workflow Engine Adapter | Temporal アダプターが `engine.Engine` を実装し、他のエンジンも差し替え可能 |
| Host Runtime Store | session scope、run state、continuation checkpoints、変更不可の run records をまとめて保存 |
| Feature Modules | MCP、Pulse、memory/prompt stores、model providers などの任意統合 |

---

## ハイレベルなエージェントアーキテクチャ

Goa-AI は実行時に、少数の合成可能な構成要素を中心にシステムを組み立てます。

- **Agents**: `agent.Ident`（例: `service.chat`）で識別される長寿命のオーケストレーターです。各エージェントは、プランナー、ランポリシー、生成されたワークフロー、およびツール登録を所有します。

- **Runs**: エージェントの 1 回の実行です。`RunID` で識別され、`run.Context` と `run.Handle` で追跡されます。セッション付き run は `SessionID` と `TurnID` でグルーピングされて会話を構成し、one-shot run は明示的にセッションレスです。

- **Toolsets & tools**: `tools.Ident`（`service.toolset.tool`）で識別される能力の集合です。サービスバックのツールセットは API を呼び出し、エージェントバックのツールセットは他のエージェントをツールとして実行します。

- **Completions**: `gen/<service>/completions` 配下に生成される、サービス所有の型付き直接アシスタント出力コントラクトです。completion helper は unary と direct streaming の model request に provider-enforced structured output を付与し、正規 payload を生成 codec で decode します。

- **Planners**: LLM による戦略レイヤで、`PlanStart` / `PlanResume` を実装します。プランナーは、ツールを呼ぶか直接回答するかを決め、ランタイムはその決定に対して上限（caps）と時間予算（time budget）を強制します。

- **Run tree & agent-as-tool**: あるエージェントが別のエージェントをツールとして呼ぶと、ランタイムは独自の `RunID` を持つ実際の子ランを開始します。親の `ToolResult` には子ランへの `RunLink`（`*run.Handle`）が格納され、ストリーミングでは `child_run_linked` イベントが親ツールコールと子ランを結び付けます。

- **Session-owned streams & profiles**: Goa-AI は型付けされた `stream.Event` を **セッション所有ストリーム**（`session/<session_id>`）へ発行します。イベントは `RunID` と `SessionID` を持ち、`run_stream_end` が SSE/WebSocket をタイマーなしで閉じるための明示マーカーになります。`stream.StreamProfile` は、対象（チャット UI、デバッグ、メトリクス）に応じてどのイベント種別を可視化するかを選択します。

---

## クイックスタート

```go
package main

import (
    "context"
    "time"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
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

## 型付き直接 Completion

すべての構造化されたやり取りをツール呼び出しとして表現する必要はありません。サービスが型付きの最終アシスタント応答を必要とする場合は、DSL で `Completion(...)` を宣言して再生成します。

`goa gen` は `gen/<service>/completions` に次を出力します:

- 型付き result 型と union 型
- 非公開 result schema と生成 codec
- 生成 `Complete<Name>(ctx, client, req)` helper
- 型付き `StreamComplete<Name>(ctx, client, req)` helper
- root result に authored `Example(...)` がある場合の `<Name>Example()`

service は `Agent(...)` を宣言しなくても completion を宣言できます。agent quickstart/example scaffold は、実際に agent を所有する service にだけ出力されます。

helper は request を clone し、provider-neutral structured output metadata を付与し、基盤の `model.Client` を呼び出し、正規の型付き payload を生成 codec で decode します:

```go
resp, err := taskcompletion.CompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}

fmt.Println(resp.Value.Name)
```

low-level `model.StructuredOutput` には必ず空でない名前が必要です。生成 helper は検証済み completion DSL から名前を導出します。unary completion は model call を正確に 1 回行います。不正 JSON は再試行不能な `planner.OutputContractError` と nil response を返し、correction request は行いません。成功時の `resp.ModelResponse` には正確な provider response と token usage が入ります。

streaming completion は `completion.Streamer[T]` を返します。`Recv` は preview fragment を公開し、`Value()` は stream が終了して terminal response が final completion と一致するまで利用できません:

```go
stream, err := taskcompletion.StreamCompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        panic(err)
    }
    // Render preview completion_delta chunks here when useful.
    _ = chunk
}
value, ok := stream.Value()
if !ok {
    panic("completion stream ended without a typed value")
}
fmt.Println(value.Name)
```

型付き completion helper は意図的に厳格です:

- unary helper は unary request だけを受け付けます。
- completion 名は DSL 境界で検証されます。1-64 文字の ASCII、英字/数字/`_`/`-` のみ、先頭は英字または数字です。
- unary と streaming helper は tool-enabled request と caller-supplied `StructuredOutput` を拒否します。
- streaming provider は `completion_delta*` preview と正確に 1 つの final `completion` を emit するか、request を明示的に拒否します。
- 型付き wrapper は clean end-of-stream と完全な validation の後だけ `Value()` を公開します。未検証 chunk を受け付ける公開 decoder はありません。
- completion stream は生成された型付き wrapper を直接使います。planner streaming helper は assistant transcript text と tool call 用です。
- structured output を実装しない provider は `model.ErrStructuredOutputUnsupported` を表面化します。
- 生成 schema は正規かつ provider-neutral です。provider adapter は対応 subset へ normalize できますが、宣言された contract を保てない場合は明示的に失敗しなければなりません。

---

## クライアント専用 vs ワーカー

ランタイムは大きく 2 つのロールで利用されます。

- **クライアント専用**（run の送信）: クライアント機能を持つエンジンでランタイムを構築し、エージェント登録は行いません。生成された `<agent>.NewClient(rt)` は、リモート worker と共有する生成済みの `AgentDefinition` を保持しています。

- **ワーカー**（run の実行）: ワーカー機能を持つエンジンでランタイムを構築し、実際のプランナーを使ってエージェントを登録します。その上で、エンジンが workflow/activity をポーリングして実行します。

生成される各 `AgentDefinition` は、1 つのエージェントに対する完全で変更できない
契約です。workflow 名、既定の task queue、生成されたツール契約、必須ラベル、
completion policy、到達可能なすべての子エージェント定義を含みます。呼び出し側は
engine が workflow を受理する前の検証と送信にこの値を使い、worker は同じ値で
workflow を登録します。個別の実行は `WithTaskQueue` で別の queue を選べますが、
手書きの登録が別の route や子エージェント graph を定義してはいけません。

### クライアント専用の例

```go
rt := runtime.New(runtimeStore, runtime.WithEngine(temporalClient)) // engine client

// The host session service has already created "s1".
// No agent registration is needed in a caller-only process.
client := chat.NewClient(rt)
out, err := client.Run(ctx, "s1", msgs)
```

### セッションレス one-shot 実行

既存セッションに紐づかない耐久実行が必要な場合は `StartOneShot` と `OneShotRun` を使います。

- `Start` / `Run` はセッション付きです。具体的な `SessionID` が必要で、セッションのライフサイクルに参加し、セッションスコープのストリームイベントを発行します。
- `StartOneShot` / `OneShotRun` はセッションレスです。`SessionID` を受け取らず、セッションも作成しません。作業を始める前に、統合 storage がセッションなしの完全な metadata と `RunStarted` record を保存するため、`RunID` で実行を調べられます。
- host が sessionful work の前に session を作成します。agent runtime は session を作成、終了、削除しません。
- engine は root workflow を受理してから、最初の activity が run を記録します。受理前の `pending` row はありません。
- root、child、one-shot は別の start operation です。child start は parent link を保存し、one-shot は session なしで完全な metadata を保存します。
- cancellation reason は write-once です。同一の retry は成功し、異なる reason は conflict になります。
- suspension と terminal change は新しい status と対応する変更不可 record をまとめて保存します。
- `StartOneShot` は `engine.WorkflowHandle` を即座に返します。`OneShotRun` は内部で `handle.Wait(ctx)` を呼ぶ blocking な convenience wrapper です。

```go
client := chat.NewClient(rt)

handle, err := client.StartOneShot(ctx, msgs,
    runtime.WithRunID("run-123"),
    runtime.WithLabels(map[string]string{"tenant": "acme"}),
)
if err != nil {
    panic(err)
}

out, err := handle.Wait(ctx)
if err != nil {
    panic(err)
}

fmt.Println(out.RunID)
```

下位レベルの `Runtime.RunOneShot` は、アプリケーションコードを呼ぶ前に
run を保存します。callback が戻った後は、callback が context をキャンセル
していても、描画された prompt と最終結果を記録します。一時的なストレージ
障害では、callback を再実行せず、準備済みの記録だけを再試行します。

### ワーカーの例

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "temporal:7233", Namespace: "default"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "orchestrator.chat"},
})
if err != nil {
    panic(err)
}
defer eng.Close()

rt := runtime.New(runtimeStore, runtime.WithEngine(eng))
if err := chat.RegisterUsedToolsets(ctx, rt /* executors... */); err != nil {
    panic(err)
}
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner}); err != nil {
    panic(err)
}
if err := rt.Seal(ctx); err != nil {
    panic(err)
}
```

---

## Plan → Execute → Resume ループ

1. engine が agent workflow を in-memory または Temporal で受理します。
2. 最初の activity が `StartRootRun`、`StartChildRun`、`StartOneShotRun`、
   `StartOneShotChildRun` のいずれかで run identity と最初の変更不可 record を
   保存します。受理されたすべての workflow が `RunStarted` を保存します。
   キャンセル理由と要求 record の有効な 3 通りの保存方法は、
   [メモリとセッション](../memory-sessions/#cancellation-provenance)で定義します。
3. runtime が `PrepareMessages` と、`RunID`、`SessionID`、`TurnID`、labels、policy caps
   を持つ `run.Context` を `PlanStart` に渡します。
4. planner が返した tool calls を generated codecs で実行します。
5. プランナーから見えるまま残った tool output を添えて `PlanResume` を呼び出します。予算対象 tool は既定で可視です。失敗した bookkeeping tool は `ToolFailure.Recovery.Action` に従い、call の修正、その tool を除いた replanning、finalization のいずれかとして次の planner turn を schedule します。planner が final response、final tool result を返すか、成功した `TerminalRun` tool が run を完了するまで loop します。cap や deadline が finalization を強制した場合、planner は prose ではなく terminal bookkeeping tool で閉じられます。進行に応じて run は `run.Phase`（`prompted` / `planning` / `executing_tools` / `synthesizing` / terminal phase）を遷移します。
6. フックとストリームサブスクライバは、イベント（プランナー思考、ツール start/update/end、await、usage、workflow、agent-run links）を発行し、設定に応じてトランスクリプトや run メタデータを永続化します。

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

- **Status**（`running`, `suspended`, `completed`, `failed`, `canceled`）は、耐久化された run メタデータに格納される粗い粒度のライフサイクル状態です。engine 受理前の `pending` 状態はありません。
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
- `debug_error`（診断用のエラーテキスト。誰に公開するかはアプリケーションが決定）

**終端のアイデンティティ**

`RunCompleted` は `Labels` を持ちます。run 開始時に指定した run スコープの
ラベル（`RunInput.Labels`、`runtime.WithLabels(...)` で設定）で、ラベルが
なかった run では nil です。完了サブスクライバーは、独自の run-ID から
アイデンティティへのマップを維持することなく、終端結果（success / failed /
canceled）を帰属できます。同じラベルはポーリングリーダー向けに
`run.Snapshot.Labels` にも公開され、永続的な `RunStarted` レコードから
再構築されるため、run のアイデンティティは両エンジンでプロセス再起動を
またいで保持されます。run 途中にポリシー決定がマージしたラベルは含まれず、
`PolicyDecision` イベントで引き続き観測できます。

---

## エラー診断

Goa-AI は、有効な UTF-8 の診断メッセージと型付きプロバイダーエラーのテキストを、
フィールドごとの長さ制限で省略せず、完全に保持します。計測で何を記録し、誰が
読んだり表示したりできるかはアプリケーションが決定します。プランナーと Temporal
アクティビティの span は、ワークフローへの転送やエラー変換の前に元のエラーを
受け取ります。ワークフローのリプレイでは、これらの診断を再送しません。
表示用の要約、失敗の分類、再試行の可否、モデルの回復動作は変わりません。
診断テキストは、モデルへの修正指示ではありません。

### 保存するエラー形式

新しい `OutputContractFailure`、`ModelOutputRejected`、`PlannerOutputRejected`
レコードは `ReasonVersion="goa_ai.rejection_reason.v2"` を使用します。
`Reason` は、`ReasonSHA256` と `ReasonSize` が示す、選択された原因の正確な
テキストを保持します。有効なテキストでは `ReasonOmitted` は空です。無効な
UTF-8 では `Reason` が空になり、`ReasonOmitted="invalid_utf8"` になります。
新しいレコードは、長い原因テキストを省略するために `size_limit` を使用しません。

新しい Temporal の失敗は、次の 4 つの内部アプリケーションエラー型を使用します。

- `goa_ai.provider_error.v3`
- `goa_ai.generic_error.v3`
- `goa_ai.output_contract_error.v3`
- `goa_ai.invalid_reserved_error.v3`

型によって、保存する詳細情報の形式が決まります。プロバイダーエラーと汎用エラーの
詳細は、それぞれが持つテキストを通常の文字列として保持し、外側の診断メッセージと
区別します。無効な UTF-8 は、元のハッシュとバイト数を含む「テキストを利用できない」
という明示的な通知になります。置換文字への暗黙の変換は行いません。これらの形式は、
任意の Go の原因オブジェクト、SDK のエラーオブジェクト、アプリケーション独自の
詳細情報をシリアライズしません。有効なテキストの正確な保持は、任意のバイト列の
保存を保証するものではありません。

### 転送とアプリケーションの制限

ワークフローの引数と結果に対する既存の上限は、付随するフィールドを含む、
エンコードされた値全体に引き続き適用されます。プランナーの結果が収まらない場合は、
転送容量の超過を示す明示的なエラーを返します。大きすぎる診断テキストを黙って
短くして保存することはありません。

Temporal のネイティブな失敗オブジェクトは、ワークフローの引数や結果のサイズ検証
とは別の、SDK の失敗コンバーターを使用します。Goa-AI は、これらの失敗に新しい
サイズ上限や事前チェックを追加しません。アプリケーションが設定する
`FailureConverter` は、データを拒否する動作も含めて、アプリケーションの管理下に
あります。

Temporal のリクエストや履歴の上限により、大きな失敗が拒否される場合があります。
再試行待ちアクティビティの状態には、サーバーが短くした失敗が保持される場合も
あります。計測にもサンプリング、エクスポーター、保存先の制限があります。
フレームワークがテキストを保持しても、無制限の保存や配信、過去に省略された
テキストの復元は保証されません。

### ワーカーの更新と保存済み履歴

新しい読み取り処理は、バージョンなしと v1 の拒否レコード、および v1/v2 の詳細を
持つ従来の Temporal 型の動作を維持します。デコードやリプレイは、それらの
レコードを書き換えたり、公開済みバイト列を変更したり、失われたテキストを復元したり
しません。古い形式には、従来の省略規則と検証規則が引き続き適用されます。

保存済みの終端エラーは元のバイト列を保持します。古い拒否メタデータを読み取る
ワークフローでも、更新後に初めて終了する場合は、現在の終端エラー型を書き込みます。
リプレイが成功しても、古い終端エラーコマンドと新しいコマンドの詳細情報が、
同一のバイト列にエンコードされることを証明したわけではありません。

新しい形式を受け取る前に、レコードを検証する hook の利用側と、ワークフローおよび
アクティビティのワーカーを更新してください。同じタスクキューで、新しい書き込み側と
互換性のない古い読み取り側を混在させないでください。アプリケーションで検証済みの
ワーカーバージョン別ルーティング、または処理を完了させてからワーカーを置き換える
手順を使用します。ロールバックでも、書き込み済みのすべての形式を読める処理を
維持する必要があります。サポート対象の実行レコードやワークフロー履歴が必要とする
限り、従来形式のデコーダーを残してください。ワーカーの置き換えだけでは、この要件は
なくなりません。

## ポリシー、上限（Caps）、ラベル

### 設計時 RunPolicy

設計時には、`RunPolicy` でエージェントごとのポリシーを設定します。

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxRecoveryTurns(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

これはエージェント登録に紐づく `runtime.RunPolicy` になります。

- **上限**: `MaxToolCalls` は実行ごとの予算対象ツール呼び出し総数を制限します。`MaxRecoveryTurns` は、ツール結果またはモデル回答が拒否された後にプランナーを再実行できる回数を制限します。予算対象ツールが成功すると、この回数はリセットされます。`Bookkeeping()` ツールはいずれの予算も消費しません。
- **Time budget**: `TimeBudget`（run の wall-clock 予算）、`FinalizerGrace`（ランタイム専用: 最終化のための予約ウィンドウ）。
- **Interrupts**: `InterruptsAllowed`（pause/resume のオプトイン）。
- **Terminal tools**: DSL で `TerminalRun()` として宣言された tool は自動的に bookkeeping となり、成功すると後続 `PlanResume` なしで run を終了します。したがって terminal commit は retrieval budget が残っていなくても受理されます。強制 finalization 中、runtime は terminal bookkeeping call だけを受理し、残りの hard deadline 内で実行し、すべての terminal side effect が成功した場合にのみ run を閉じます。実行前に runtime は正確な `planner.TerminationReason` を `runtime.FinalizationReasonLabel`（`goa-ai.finalization_reason`）へ書き込みます。run label、policy label、planner output、model output はこの値を選択したり置き換えたりできません。通常 call には渡されません。
- **Missing fields behavior**: `OnMissingFields`（バリデーションが欠落フィールドを示した場合の挙動）。

  `tool_failure` を含む fixed-limit または planner-generated terminal call の consumer は `runtime.FinalizationReasonLabel` を使います。この execution contract の変更は consumer と runtime worker にまとめて deploy してください。

### ランタイムポリシーのオーバーライド

環境によっては、設計を変更せずにポリシーを強化/緩和したい場合があります。`rt.OverridePolicy` API により、プロセスローカルにポリシーを調整できます。

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxRecoveryTurns: 1,
    InterruptsAllowed:             true,
})
```

**Scope**: オーバーライドは現在のランタイムインスタンスにローカルで、以降の run にのみ影響します。プロセス再起動を越えて永続化されず、他ワーカーへも伝播しません。

**Overridable Fields**:

| Field | 説明 |
| --- | --- |
| `MaxToolCalls` | run あたりの*予算対象*ツール呼び出し総数の上限（`Bookkeeping()` ツールは免除） |
| `MaxRecoveryTurns` | 拒否された出力の後にプランナーを再実行できる回数 |
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

Goa-AI は `policy.Engine` を介して pluggable policy engine と統合します。policy は tool metadata（ID、tag）、run context（SessionID、TurnID、label）、実行失敗後の構造化 `ToolFailure` を受け取ります。

ラベルは次に流れます。

- `run.Context.Labels` – run 中にプランナーが参照可能
- ツールアクティビティ入力（`api.ToolInput.Labels`）– dispatch 済みの tool
  execution へ clone されます。terminal finalization call は runtime 所有の reason も
  `runtime.FinalizationReasonLabel` で受け取ります
- **Runtime store** (`storage.Store`) は `RunID` ごとに変更不可 records を追加します。lifecycle methods は status、checkpoint、cancellation change と対応する record を一つの操作で保存します。
- 終端完了とスナップショット – 開始時のラベルは run の最後に `hooks.RunCompletedEvent.Labels` と `run.Snapshot.Labels` として戻ってくるため、完了フックや `GetRunSnapshot` のリーダーは帯域外の追跡なしに run のアイデンティティを取得できます

### run ごとのツールフィルタリング

設計時 tag と runtime option により、planner prompting の前と execution の前に tool surface を絞り込めます:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithAllowedTags([]string{"read", "safe"}),
    runtime.WithDeniedTags([]string{"destructive"}),
    runtime.WithTagPolicyClauses([]runtime.TagPolicyClause{
        {AllowedAny: []string{"docs", "search"}},
        {DeniedAny: []string{"external"}},
    }),
)
```

repair flow で 1 つの tool だけを公開したい場合は `WithRestrictToTool` を使います:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithRestrictToTool(searchspecs.Search),
)
```

これは run 全体に適用する caller policy です。tool failure は別の contract を使います。`ToolFailure.Recovery.Action` が correction、failed tool を除いた replanning、finish のどれかを選択し、runtime は次の planner turn に適用する tool catalog を強制します。

---

## ツール実行

- **Native toolsets**: 実装はアプリ側で書き、ランタイムが生成済みコーデックで型付き引数をデコードします。
- **Agent-as-tool**: 生成された agent-tool ツールセットはプロバイダーエージェントを子ランとして実行し（プランナー視点ではインライン）、その `RunOutput` を `planner.ToolResult` に変換し、子ランへの `RunLink`（ハンドル）を返します。
- **MCP toolsets**: ランタイムは正規 JSON を生成済み caller へ転送し、caller がトランスポートを扱います。

### Tool payload defaults

Tool payload decoding follows Goa’s **decode-body → transform** pattern and applies Goa-style defaults deterministically for tool payloads.

See **[Tool Payload Defaults](tool-payload-defaults/)** for the contract and codegen invariants.

### Bounded tool results

大きな data set の一部だけを返す tool は、DSL で `BoundedResult(...)` を宣言するべきです。これらの tool の runtime contract は次の通りです:

- 生成 `tools.ToolSpec.Bounds` が正規 bounded-result schema を宣言する
- successful execution は `planner.ToolResult.Bounds` を populate する必要がある
- runtime は provider-owned bounds を emitted `tool_result` JSON、`.Bounds` 配下の result-hint template data、hook payload、stream event へ project する
- paged tool では、provider code は次ページの opaque cursor を `Bounds.NextCursor` に設定します

`tools.ToolSpec.Bounds` は model-facing JSON 名を使います。DSL 宣言が
`NextCursor("nextCursor")` のような lower-camel Goa attribute を参照しても、
生成 specs、schemas、runtime projection、result codec は `next_cursor` を使います。

正規 projected field:

- `returned` (required)
- `truncated` (required)
- `total` (optional)
- `refinement_hint` (optional)
- `next_cursor` (direct `Cursor` contract が `NextCursor(...)` を公開する場合は optional)

`planner.ToolResult.Bounds` が唯一の machine-readable provider contract です。手書きの Go result type は semantic かつ domain-specific のままでよく、model に見せるためだけに正規 bounded field を重複させる必要はありません。

`ContinueWith("continue_tool", "cursor")` は機械的な continuation を別 action として宣言します。runtime は、次の cursor を持つ live chain head が一つだけある場合に限って action を公開します。正確な cursor lineage によって連続 page を進めます。source call は並列実行できますが、複数の live head がある間は引数なしの action を公開しません。model は `{}` で action を選び、runtime が実行前に cursor と保持済み query field を bind します。direct `Cursor("cursor")` は open contract であり、model は `next_cursor` の opaque cursor と変更していない query argument を次の call に指定します。

method-backed `BindTo` tool では、生成 executor が projection 前に `planner.ToolResult.Bounds` を構築できるよう、bound service method result は正規 bounded field を保持する必要があります。明示的な tool-facing `Return(...)` shape はそれらの正規 field を重複させてはいけません。bound method result の中で required にできるのは `returned` と `truncated` だけです。`total`、`refinement_hint`、`next_cursor` は bounds contract の optional part のままで、runtime bounds が省略した場合は emitted JSON からも省略されます。

service boundary が `ExecuteToolActivity` の外で正規 result JSON を assemble する必要がある場合は、生成 result codec と bounded-result projection helper を別々に呼ぶのではなく `runtime.EncodeCanonicalToolResult(...)` を使います。

---

## Prompt ランタイムコントラクト

Prompt 管理はランタイムネイティブで、バージョン管理されます。

- `runtime.PromptRegistry` は不変なベースライン `prompt.PromptSpec` 登録を保持する
- `runtime.WithPromptStore(prompt.Store)` はスコープ付き override 解決（`session` -> `facility` -> `org` -> global）を有効化する
- プランナーは `PlannerContext.RenderPrompt(ctx, id, data)` を呼び、prompt 内容を解決・描画する
- 描画済み内容には provenance 用の `prompt.PromptRef` が含まれ、プランナーは `model.Request.PromptRefs` に付与できる

```go
messages, err := input.PrepareMessages()
if err != nil {
    return nil, err
}
content, err := input.Agent.RenderPrompt(ctx, "assistant.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` は model request に影響した rendered prompt versions を示し、provider wire payload には含まれません。runtime は `prompt_rendered` と parent/child link records から導出し、矛盾し得る別リストを持ちません。

prompt の描画自体は runtime storage に書き込みません。すべての経路は
`prompt.RenderRecorder` を使い、解決された prompt ID、version、scope を持つ
同じ `prompt.RenderEvent` を作ります。

- アプリケーションコードが最初の message を描画する場合は、その message と
  一緒に `recorder.Events()` を `runtime.WithRenderedPrompts` で渡します。
- planner activity は、planner result と一緒に記録済み event を返します。
- child agent の prompt 準備は activity で実行し、描画済み text と event を
  child input に返します。
- `RunOneShot` は callback が行った描画を記録します。

workflow は、受理したすべての event を同じ `PromptRendered` record として保存
します。最初の経路だけ描画規則が違うわけではありません。workflow 開始前に
作られた event を渡す点だけが異なります。child の準備を activity で行うため、
Temporal replay は history に保存済みの text と event を再利用し、storage から
新しい prompt version を読み直しません。
`RenderRecorder.Events` は、完了した描画を prompt ID、version、session、scope
の安定した順序で返します。そのため、同時に実行した描画の完了順序が正確な
workflow start request を変えることはありません。

---

## メモリ、ストリーミング、テレメトリ

- **Hook bus** は、run の開始/完了、フェーズ変更、`prompt_rendered`、ツールのスケジューリング/結果/更新、プランナーノートと思考ブロック、await、`ToolFailure` の recovery directive、agent-as-tool link など、エージェントライフサイクル全体の構造化 hook event を publish します。

- **Memory stores**（`memory.Store`）は、`(agentID, RunID)` ごとに耐久化されるメモリイベント（ユーザー/アシスタントメッセージ、ツール呼び出し、ツール結果、プランナーノート、思考）を購読し追記します。

- **Runtime store**（`storage.Store`）は一つだけで、host application が所有します。
  `RunID` ごとに、挿入後は変更できない record を追加し、audit/debug UI と run の
  調査に使います。lifecycle method は、status、checkpoint、または cancellation の
  変更と、それに対応する変更不可 record を 1 回の操作で保存します。

- **Stream sinks**（`stream.Sink`。例: Pulse またはカスタム SSE/WebSocket）は、`stream.Subscriber` が生成する型付き `stream.Event` を受け取ります。`StreamProfile` は送出するイベント種別を制御します。

  永続的な transcript は、選択された provider response をそのまま保持します。
  assistant message にツール呼び出しが含まれる場合、その text は provider への
  replay 用に transcript に残りますが、ユーザー向けの assistant answer としては
  発行されません。ツールイベントと await イベントが、その未完了の手順を表します。
  ツール呼び出しを含まない assistant message だけが、確定した assistant text
  イベントを生成します。

- **Telemetry**: OTEL 対応のロギング、メトリクス、トレーシングが workflow/activity を end-to-end で計測します。

### ツール呼び出しヒント（DisplayHint）

ツール呼び出しには、ユーザー向けの `DisplayHint`（例: UI 表示用）を含めることができます。

契約:

- hooks のイベントコンストラクタはヒントをレンダリングしません。ツール呼び出しのスケジュールイベントは既定で `DisplayHint==""` です。
- ランタイムは、payload のデコードに成功した場合、型付きテンプレートから公開時に **永続的な** 呼び出しヒントを付与して保存します。
- ツール登録には空でないメタデータ title が必要です。型付きデコードに失敗する、またはテンプレートが登録されていない場合、ランタイムはその title を display hint として使用します。不正な payload は引き続きツール境界で失敗します。メタデータ title は、試行された作業を表示可能に保つためだけに使われます。ヒントは生の JSON に対してレンダリングされません。
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
- **Temporal**: 耐久実行、リプレイ、activity の再試行、シグナル、ワーカー。アダプタが activity と context の伝搬を接続します。

Goa-AI の agent workflow は一度だけ実行されます。runtime は contract が許す
個別の activity を再試行しますが、失敗した agent workflow 全体を最初から
実行し直しません。workflow 全体を再試行すると、tool の副作用を繰り返したり、
最初の実行が保存した最終 record と conflict したりするためです。

### セマンティックな Timing と Temporal の Liveness

Goa-AI は公開ランタイム契約をエンジン非依存に保ちます:

- `RunPolicy.Timing.Plan` と `RunPolicy.Timing.Tools` はセマンティックな「試行ごとの予算」
- `runtime.WithTiming(...)` は run ごとにそれらのセマンティック予算を上書きする
- 生成 client は agent の default task queue を使います。一つの `Start` または
  `Run` だけ別の queue を使う場合は
  `runtime.WithTaskQueue("orchestrator.chat")` を渡します

Temporal アダプタを使っていて、キュー待ちや liveness を調整したい
場合は、それらを Temporal エンジン側で設定します:

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "temporal:7233",
        Namespace: "default",
    },
    WorkerOptions: temporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: temporal.ActivityDefaults{
        Planner: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
if err != nil {
    panic(err)
}
```

この分離により、ワークフローのメカニクスは Temporal の境界の内側に
保たれ、汎用ランタイムは Temporal とインメモリエンジンの両方に対して
正直なままでいられます。

### Storage と完了に関するアダプタ契約

runtime は `runtime.store` という型付き activity を 1 つだけ登録します。各
`StorageActivityCommand` は `Append`、`RootStart`、`ChildStart`、
`OneShotStart`、`OneShotChildStart`、`Cancellation`、`Suspension`、`Terminal`
のうち 1 つだけを設定します。返される `StorageActivityResult` も同じ field だけを設定します。
同じ command を再試行しても成功しない場合、custom store は
`storage.ContractError` を返します。一時的な database error や network error
は通常の error のままなので再試行できます。`runtime.WithStorageActivityTimeout`
は activity の Start-to-Close timeout を設定し、0 より大きい値が必要です。

`Engine.QueryRunCompletion` は現在の run `Status` を返します。run が閉じた後は、
同じ結果に安定した完了時刻 `CompletedAt` と、最終 `Output` または
`WorkflowError` も含まれます。`EnsureRunCompletion` は `CompletedAt` を
record timestamp として使うため、再試行でも同じ値が送られます。method が別に
返す error は、engine がそれらの情報を取得できなかったことを示します。status
専用の別 query はありません。

child prompt の準備は `Success` または `Failure` のどちらか一方だけを返します。
成功には message と描画済み prompt の情報だけが含まれます。workflow は、記録済み
の元の tool call から child run、session、parent、tool、label の identity を導出します。
in-memory engine は input と output をコピーして size limit を適用し、Temporal と同じ
retry policy を使います。

---

## Run コントラクト

- `SessionID` はセッション付き開始で必須です。`Start` と `Run` は `SessionID` が空、または空白のみの場合に fail-fast します。
- `StartOneShot` と `OneShotRun` は明示的にセッションレスです。セッションを要求/作成せず、セッションスコープのストリームイベントも発行しません。
- host は session を使う work を送る前に session を作成します。agent runtime は session を作成、終了、削除しません。
- engine は root workflow を受理した後、最初の activity で run を保存します。runtime は受理前に `pending` record を作成しません。
- 同じ run ID と完全に同じ request で start を繰り返すと、engine history を query
  できる間は受理済み workflow が返ります。異なる input で ID を再利用すると拒否されます。
  history retention 後の permanent command identity は product service が所有し、
  Goa-AI は保証しません。
- root、child、one-shot の開始には別々の storage operation を使います。child start は親 link と child start をまとめて保存し、one-shot start は session なしで完全な metadata を保存します。
- 親 workflow が先に終了すると、Temporal は child workflow を終了します。
- 新しい child には running の parent が必要です。`StartChildRun` と `StartOneShotChildRun` は、親 link と child start をそれぞれまとめて保存します。受理済みの完全に同じ retry は parent の停止後も有効ですが、内容を変えた retry や新しい child は拒否します。
- 最初の cancellation reason は変更できません。完全に同じ再試行は成功し、同じ run に別の reason を指定すると conflict になります。
- suspension と終了は、新しい status と対応する変更不可の record をまとめて保存します。
- 永続化された `RunStarted`、`RunSuspended`、`RunCompleted`、`ChildRunLinked` の payload は、対応する型の JSON 値を正確に一つだけ含む必要があります。未知の field や末尾の追加 JSON 値は拒否します。
- エージェントは最初の run の前に登録されなければなりません。ランタイムは、エンジンワーカーの決定性を保つため、最初の run 送信後の登録を `ErrRegistrationClosed` で拒否します。
- tool executor は `context.Context` から値を“釣る”のではなく、call ごとの明示 metadata（`ToolCallMeta`）を受け取ります。その label には clone された run／policy label が入り、call が terminal finalization を実行する場合だけ `runtime.FinalizationReasonLabel` も入ります。
- 暗黙のフォールバックには依存しません。すべてのドメイン識別子（run / session / turn / correlation）は明示的に渡します。

### 最終記録とその配信を保証する {#ensuring-a-final-record-and-its-delivery}

通常の workflow は、runtime storage が受理するまで suspension と terminal の
書き込みを再試行します。engine history が閉じた後、host は二つの明示的な command
を使えます。

- `Runtime.EnsureRunCompletion(ctx, runID)` は、storage 上でまだ active の run に
  欠けている suspension または terminal result を保存します。run がすでに終了して
  いる場合や、command の実行中に別の final result が先に確定した場合は、保存済みの
  正確な result を検証して配信します。
- `Runtime.EnsureChildRunLink(ctx, runID)` は、session に属する child run の保存済み
  parent link だけを検証して配信します。host は nested child の final result を配信
  する前に、parent から child の順でこの command を呼べます。

`EnsureRunCompletion` は child の final event より先に parent link を配信します。
安定した event key により stream への再配信は安全です。すでに保存済みの result から
local lifecycle notification をもう一度発行することはありません。どちらの command
も storage が受理済みの result を変更しません。

配信に使う Session status が active な場合、どちらの command にも
`Runtime.WithStream` が必要です。`EnsureChildRunLink` は
`LoadSessionStatus` で現在の status を読みます。一方、`EnsureRunCompletion` は
final record の書き込みまたは完全に同じ再試行と一緒に返された `SessionStatus`
を使います。新たに確認した Session が終了済みなら、保存済み record は保持して
stream 配信を抑止します。Session が active な間に storage が event を受理した場合、
その event は配信対象のままです。同じ配信 call の再試行中に Session が終了しても
取り消されません。

engine が workflow を running と報告している場合、`EnsureRunCompletion` は
`ErrRunCompletionNotReady` を返します。engine history または保存済み lifecycle data
から一つの有効な result を構成できない場合は `ErrRunCompletionCorrupt` を返します。
engine history の読み込み error は caller に返し、workflow failure として保存しません。

run の一覧や snapshot の method は読み取り専用で、どちらの command も呼びません。
これらの command は database schema migration を追加せず、公開 wire format も
変更しません。ただし custom store の Go interface は変わり、既存の durable
lifecycle record は [Memory & Sessions](../memory-sessions/#durable-event-json) に記載した
厳密な typed JSON 形式を満たす必要があります。

---

## 外部入力と workflow continuation

受理された各 user input は、その turn の top-level workflow を 1 つ開始します。workflow は、その turn の final result または external-input suspension のどちらかで終了します。nested agent は引き続き linked child workflow として動きます。

clarification、structured question、external tool result、confirmation は、現在の workflow を正常終了させます。返される `RunOutput.Suspension` には、UI または external system が回答する公開可能な `Pending` requests と、非公開の `Checkpoint` が入ります。application は suspension 全体を信頼できる server storage に保存し、回答する相手には `Suspension.Pending` だけを送ります。非公開 checkpoint を信頼できない client に送ってはいけません。人が判断している間、Temporal workflow は開いたままになりません。

workflow が完了する前に、Goa-AI は completed run ID の下に非公開 checkpoint を保存します。application は 1 つの answer を原子的に受理し、2 つの concurrent request が同じ state を続行できないようにしなければなりません。その後、predecessor run ID、新しい run ID、新しい turn ID、1 つの型付き response を使って新 workflow を開始します。

answer の受理と product data を同じ transaction で保存する必要がある場合は、まず
`PrepareContinuation`、続いて `MarshalBinary` を呼び、その bytes と answer を同じ
transaction で保存します。workflow を開始する process は bytes を読み込み、
`ParsePreparedRun` を呼び、復元した値を `StartPrepared` に渡します。validation と
engine submission の間に application write がない場合だけ `Continue` を使います。

```go
next, err := client.Continue(
    ctx,
    "session-1",
    previous.RunID,
    "run-124",
    "turn-2",
    &api.PendingInputResponse{
        Clarification: &api.ClarificationAnswer{
            ID:     "clarify-device",
            Answer: "Device ID is ABC-123",
        },
    },
    runtime.WorkflowOptions{},
)
```

continuation の準備時に application が渡すのは、完了した run ID と型付き回答
だけです。Goa-AI は checkpoint を読み、その version と保留中 request を検証し、
現在の generated codec で保存済み payload を復元して planning を再開します。
`PreparedRun` の bytes には、その checkpoint のコピーと完全な transcript が含まれる
場合があります。信頼できる access-controlled な application storage にだけ保存し、
信頼できない client には決して送信しないでください。

受理される形式は `goa-ai.run-suspension.v8` だけです。version eight は、受理済みの
recovery plan が input を待つとき、その turn で提示した tool 名を保存します。
失敗した tool 名だけから、ほかに提示した選択肢を復元することはできません。
continuation はその選択肢を保持しますが、現在の agent definition と実行 policy の
検証も引き続き行います。

Goa-AI は以前の checkpoint version をすべて拒否します。upgrade 前に、古い形式の
保存済み work は、それを所有する runtime で完了させてください。未完了のまま残す
必要がある場合、host が保存方法と再開可能性を明示的に判断します。この runtime では
再開できません。framework は変換 command を提供せず、保存済み work の削除、
キャンセル、書き換えを自動で行うこともありません。

回答が以前の workflow で model が作成した tool call を完了させる場合、新しい
`tool_end` event には二つの run identity が含まれます。

- 通常の run ID は、回答を受け取った新しい workflow を示します。
- `call_run_id` は、対応する `tool_start` を発行した以前の workflow を示します。

stream consumer は `call_run_id` と tool call ID を使って event を対応付けます。
以前の run を検索したり、call と result が同じ workflow に属すると仮定したり
してはいけません。

---

## ツール確認（Tool Confirmation）

Goa-AI は、書き込み・削除・コマンド実行などのセンシティブなツールに対して、**ランタイム強制**の確認ゲートをサポートします。

確認は次の 2 通りで有効化できます。

- **設計時（一般的）**: ツール DSL 内で `Confirmation(...)` を宣言します。Codegen はポリシーを `tools.ToolSpec.Confirmation` に格納します。
- **ランタイム（上書き/動的）**: ランタイム構築時に `runtime.WithToolConfirmation(...)` を渡し、追加ツールに確認を要求したり設計時の挙動を上書きしたりできます。

実行時には workflow が confirmation request を emit し、suspension とともに完了します。受理された decision は新 workflow を開始します。その continuation は approved の場合だけ tool を実行します。denied の場合、runtime は schema-compliant tool result を合成し、transcript を有効なままにして planner が決定論的に反応できるようにします。

### 確認プロトコル

実行時の確認は、専用の await/decision プロトコルとして実装されます。

- **Await payload**（`await_confirmation` としてストリームされる）:

```json
{
  "id": "...",
  "title": "...",
  "prompt": "...",
  "tool_name": "facility.commands.change_setpoint",
  "tool_call_id": "toolcall-1",
  "payload": { "...": "canonical tool arguments (JSON)" }
}
```

契約:

- `payload` には常に、保留中のツール呼び出しに対する正規の JSON 引数が入ります。承認された場合、ランタイムが実行するのはその引数です。
- 確認のオーバーライドは prompt や拒否結果のレンダリングをカスタマイズできますが、表示専用の別 payload チャネルを導入したり、`payload` の意味を変えたりしてはいけません。
- よりリッチな確認 UI が必要なプロダクトでは、アプリケーション層で正規 payload とアプリケーション所有の読み取り結果からその表示を materialize してください。

- **Continuation response**:

```go
response := &api.PendingInputResponse{
    Confirmation: &api.ConfirmationDecision{
        ID:          "await-1",
        Approved:    true, // or false
        RequestedBy: "user:123",
        Labels:      map[string]string{"source": "front-ui"},
        Metadata:    map[string]any{"ticket_id": "INC-42"},
    },
}
```

### ツール承認イベント

決定が提供されると、ランタイムは第一級の承認イベントを発行します:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

このイベントは、確認が必要なツール呼び出しに対する “who/when/what” の正規レコードです:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (ランタイムが決定論的にレンダリングする要約)
- `approved_by` (`api.ConfirmationDecision.RequestedBy` からコピーされる安定 principal ID)

イベントは決定受信直後に発行されます（承認時はツール実行前、拒否時は拒否結果の合成前）。

注意:

- コンシューマは確認を「ランタイムプロトコル」として扱うべきです。
  - pending item の kind が `confirmation` の場合に最初の item を表示し、`Continue` で decision を送信します。
  - 確認 UI の挙動を特定の確認ツール名に結びつけないでください（内部トランスポート詳細として扱います）。
- 確認テンプレート（`PromptTemplate` と `DeniedResultTemplate`）は Go の `text/template` 文字列で、`missingkey=error` で実行されます。標準関数（例: `printf`）に加えて、Goa-AI は次を提供します。
  - `json v` → `v` を JSON エンコード（オプショナルポインタや構造値の埋め込みに便利）
  - `quote s` → Go のエスケープ済み引用符付き文字列を返す（`fmt.Sprintf("%q", s)` 相当）

### ランタイムバリデーション

ランタイムは境界で確認操作をバリデートします。

- 提供された確認 `ID` が、保留中の await 識別子と一致すること
- continuation に正確に 1 つの response variant と well-formed decision が含まれること

---

## プランナー契約

プランナーは次を実装します。

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` には tool call、最終応答、最終 tool result、注釈、選択された
post-tool transition が含まれます。`PlanResumeInput` は、プランナーが呼ばれた
理由を示します。

planner-generated request には domain intent だけを含めます。`planner.NewToolRequest(typedTool, payload)` で encode してください。検証済み provider call を転送する場合は `planner.ToolRequestFromModelCall(call)` を使い、provider correlation ID を runtime execution ID に変えず保持します。runtime は execution ID の割り当てや tool event の publish より前に plan 全体を検証します。

これらの契約は別々です。

| 契約 | スコープ | 意味 |
| --- | --- | --- |
| `ToolSpec.Tags` | すべての run における 1 つの tool | 汎用的な policy と UI filtering に使えるフラットなラベル。 |
| `ToolSpec.Meta` | すべての run における 1 つの tool | 名前付きコンシューマが意味を所有する、不活性な生成アノテーション。メタデータだけでは runtime 動作は変わらない。 |
| `ToolSpec.Bookkeeping` | すべての run における 1 つの tool | 成功後に別の planner turn を必要としない durable な制御記録。retrieval と連続失敗の budget を消費しない。 |
| `ToolSpec.TerminalRun` | すべての run における 1 つの tool | 成功そのものが run を終了し、自動的に bookkeeping を含む。 |
| `ToolFailure.Recovery.Action` | 1 つの失敗 result | failed tool を引き続き利用可能にした修正、その tool を除いた replanning、finalization のいずれかを選ぶ。 |
| `PlanResult.SynthesizeAfterTools` | 選択された 1 batch | recoverable failure がなければ、次の planner turn は回答しなければならない。 |
| `PlanResumeInput.SynthesisOnly` | 1 planner activity | 最終回答を返す。tool call は無効。 |
| `PlanResumeInput.Finalize` | runtime が強制する終了 | cap または deadline により通常作業が禁止されている。 |

ランタイムは次の順序で次状態を選びます。

| 完了したステップ | 次の状態 |
| --- | --- |
| cap または deadline が finalization を要求 | `Finalize` turn |
| `TerminalRun` tool が成功 | 即時終了 |
| 失敗 result のいずれかで `AllowsToolTurn() == true` | 通常の repair turn |
| `SynthesizeAfterTools` が true | `SynthesisOnly` turn |
| その他 | 通常の continuation turn |

これにより planner intent が 2 つ目の retry policy になることを防ぎます。
recoverable failure を先に修復し、成功した final batch または terminal failure を
含む final batch は synthesis に進みます。ランタイムは `SynthesisOnly` turn
から返された tool call を拒否します。

recoverable な `ToolFailure` は `Recovery.Action` も 1 つ選択します。

- `correct_call` は失敗した tool を引き続き利用可能にし、拒否された input、
  生成済み validation issue、field guidance、example を次の planner turn に
  渡します。失敗 1 件につき replacement call 1 件を要求するものではありません。
  planner は作業をまとめ、表示された tool を任意の回数だけ正しく呼び出し、
  input を待つか、すでに集めた evidence から回答できます。
- `replan` は失敗した tool を次の planner turn から除外します。planner は別の
  表示済み tool を使うか、input を待つか、回答できます。
- `finish` はすべての tool を除外し、利用可能な evidence に基づく最終回答を
  要求します。

通常の `correct_call` turn では、現在の agent が実行できる tool と、失敗した tool の
正確な contract を組み合わせます。同じ名前と contract は重複を除きます。
contract の不一致、実行登録の欠落、tool の取り消しは model 呼び出し前に失敗します。
caller の制限、run tag の制限、recovery による除外も適用します。修正対象の tool が
拒否されていれば error にし、黙って除外したり filtering 後に復活させたりしません。
実行先での認可も、各 call に引き続き適用します。

未完了の query は runtime が生成した continuation action を保持します。失敗した
request から continuation は生成しません。強制 finalization で修正できるのは、
失敗した正確な terminal tool だけです。synthesis-only turn には tool を提示しません。
修正後の通常 turn は、現在の agent の tool に戻ります。

ランタイムは recovery turn で表示した tool catalog を正確に記録し、その外側の
実行可能な call をすべて拒否します。user または外部 input の要求に埋め込まれた
call も対象です。生成済み codec は引き続きすべての payload を検証し、run の
tool・failure・time limit は無効な作業の繰り返しを停止します。recovery turn が
input を待つ場合、failure evidence は再開後も利用できます。tool call または最終
回答を選ぶと、その evidence は消去されます。

recovery activity の input と表示された catalog は durable workflow history の一部です。production deployment は pinned Temporal Worker Deployment Versioning を使い、Temporal が drained と報告するまで各 old worker version を保持しなければなりません。新 worker の起動は、既存 workflow を新 code で replay してよい根拠にはなりません。continuation は新 workflow なので、保存済み checkpoint の validation を通過した後なら current version を使えます。

`PlanResumeInput.Finalize` が設定されている場合、プランナーは terminal
bookkeeping tool を返せます。これらは後続プランナーターンには再生されず、
finalization を永続的に完了する必要があります。

プランナーは `input.Agent` 経由でランタイムサービスを提供する `PlannerContext` も受け取ります。

- `AdvertisedToolDefinitions()` - このターンでモデルに見えている、runtime がフィルタ済みのツール定義を取得する
- `ModelClient(id string)` - provider-agnostic な検証済みモデルクライアントを取得する
- `PlannerModelClient(id string)` - planner ターン専用で runtime-owned なイベント発行を行うモデルクライアントを取得する
- `RenderPrompt(ctx, id, data)` - 現在の run scope で prompt 内容を解決・描画する
- `AddReminder(r reminder.Reminder)` - run スコープの system reminder を登録する
- `RemoveReminder(id string)` - 前提条件が満たされなくなったときに reminder を削除する
- `Memory()` - 会話履歴へアクセスする

### 会話メッセージの準備 {#preparing-conversation-messages}

`PlanInput` と `PlanResumeInput` には
`PrepareMessages func() ([]*model.Message, error)` が必須です。代わりに使える
`Messages` フィールドはありません。プランナーは履歴の読み取り、確認、変換、
プロンプトやリマインダーの組み立ての前に `PrepareMessages()` を呼び、
エラーを確認します。モデルを呼ばずにメッセージを使う処理も同じです。
メッセージが不要な処理だけは呼び出しを省略でき、その場合は履歴ポリシーも、
それに伴うトークン計数や要約も実行しません。

最初の呼び出しは、アクティビティのコンテキストと期限を使って、メッセージと
提示されたツールに履歴ポリシーを適用します。キャンセルはトークン計数と要約にも
伝わります。ポリシーが未設定でも、ランタイムはこの関数を必ず渡します。
同じプランナー呼び出し内では、並行呼び出しも含め、常に同じスライス、同じメッセージへの
ポインター、同じエラーを返します。スライスやメッセージの並行変更は呼び出し側で
同期する必要があります。この関数を後で使うために保存してはいけません。
すべての呼び出しは `PlanStart` または
`PlanResume` が戻る前に完了させます。準備エラーをプランナーが無視しても
アクティビティは失敗し、未準備の履歴には切り替えません。元の準備エラーは、その後の
プランナーやモデルのエラーより優先し、元の分類を保ちます。モデル出力の修復処理には
変わりません。同じ試行内で失敗した準備を再実行することもありません。
完了済みアクティビティの再生では保存した
結果を使い、準備は繰り返しません。新しい試行やプランナー呼び出しでは改めて準備します。
保存済みの履歴、圧縮規則、上限は変わりません。

---

## フィーチャーモジュール

- `runtime/mcp` – HTTP と stdio 用の MCP caller。HTTP は JSON と event-stream の応答を受け付ける
- `features/memory/mongo` – durable memory store
- `features/prompt/mongo` – Mongo-backed prompt override store
- `features/stream/pulse` – Pulse sink/subscriber helpers
- `features/model/{anthropic,bedrock,openai,vertex}` – 検証済み model client を返す provider adapter
- `features/model/gateway` – remote provider server と検証済み transport client
- `features/model/middleware` – client validation の下に install する provider middleware（正確な token count を使う adaptive rate limiter など）
- `features/policy/basic` – allow/block list と `ToolFailure` を扱う簡易 policy engine

### モデルクライアントのスループット & レート制限

Goa-AI は `features/model/middleware` に adaptive input-token limiter を提供します。wrapped client に正確な request token count を問い合わせ、call 前にその capacity を予約し、provider が throttling を報告したときに実効 input-tokens-per-minute budget を調整します。

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})
if err != nil {
    panic(err)
}

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial input tokens per minute
    1_000_000,           // maximum input tokens per minute
)
limited, err := rl.Middleware()(bed)
if err != nil {
    panic(err)
}

rt := runtime.New(runtimeStore)
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

middleware construction は token-count 対応を検査しません。選択 provider または request を正確に count できない場合、最初の `Complete` または `Stream` call が inference 前に `model.ErrTokenCountingUnsupported` を返します。Vertex Gemini は正確な count に対応します。Bedrock は Runtime `CountTokens` が受理する request／model だけに対応し、OpenAI には native counter がありません。

limiter が計量するのは input token だけです。unary success または clean stream end で上向き probe を行い、unary または terminal streaming の rate-limit error で backoff します。単に stream を開閉しただけでは success とみなしません。

---

## LLM 統合

Goa-AI のプランナーは、**provider-agnostic なインターフェース**を通じて大規模言語モデルと対話します。この設計により、プランナーコードを変えずに、AWS Bedrock、OpenAI、Google Vertex AI（Gemini / Claude-on-Vertex）、カスタムエンドポイントなどのプロバイダーを切り替えられます。

### 検証済み model client

planner と model の対話はすべて opaque な `model.Client` を通ります。

```go
resp, err := client.Complete(ctx, req)
stream, err := client.Stream(ctx, req) // *model.ValidatedStream
```

provider integration は raw transport response／chunk を生成する `model.Provider` を実装します。Goa-AI は `model.NewClient(provider)` で `model.Client` を構築し、その provider の前後で request と complete response を検証します。external package は `model.Client` を実装できず、raw provider chunk を planner に公開できません。

provider call 前には tool name／schema、message part、thinking option、structured-output metadata、request の dynamic value を検証します。request と unary response は 16 MiB、visited value は 100,000 個までで、nested dynamic metadata の depth は 64 までです。streaming では chunk と terminal response に 1 つの累積 budget を適用します。limit 超過では操作全体を拒否し、model data の切り詰め、修復、coercion は行いません。

`ValidatedStream` は `io.EOF` まで drain する必要があります。完了した場合だけ `Response()` が受理済み canonical response を返します。不完全、不正、または矛盾する stream は error となり、受理済み response はありません。

完了した tool call は、planner が受け取る前に、提示済み schema に合格する必要があります。
生成済み decoder が付属する場合は、その検証にも合格します。schema の拒否に最深部の原因が一つだけあり、
生成済みの配列 field metadata と一致する場合、修正指示はその配列の要素数の下限または
上限を、境界値を含む形で示します。たとえば `Field "items" must contain at most 3 items.`
です。原因が曖昧または未対応なら、一般的な修正指示を使います。この制限は提出した
一つの配列に対するもので、run 全体の制限ではありません。引数は実行前に拒否された
ままで、Goa-AI は分割、切り詰め、書き換えをしません。元の validation error、
受理規則、設定済み recovery-turn 上限は変わりません。

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
})
if err != nil {
    panic(err)
}
```

**OpenAI**

```go
import (
    "os"

    "goa.design/goa-ai/runtime/agent/runtime"
)

rt := runtime.New(runtimeStore) // host が所有する runtime storage
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey:       os.Getenv("OPENAI_API_KEY"),
    DefaultModel: "gpt-5-mini",
    HighModel:    "gpt-5",
    SmallModel:   "gpt-5-nano",
})
if err != nil {
    panic(err)
}
```

**Google Vertex AI（Gemini / Claude-on-Vertex）**

`features/model/vertex` パッケージは、いずれも `model.Client` を返す 2 つの
コンストラクタを提供します。ネイティブの Gemini アダプタと、Vertex 上でホスト
される Claude モデルに Anthropic アダプタを向ける純粋なコンストラクタヘルパー
です。

```go
import "goa.design/goa-ai/runtime/agent/runtime"

// Vertex 上の Gemini。Application Default Credentials を使用。
geminiClient, err := rt.NewVertexGeminiModelClient(ctx, runtime.VertexConfig{
    ProjectID:      "my-gcp-project",
    Location:       "us-central1",
    DefaultModel:   "gemini-2.5-flash",
    HighModel:      "gemini-3-pro-preview",
    SmallModel:     "gemini-2.5-flash-lite",
    MaxTokens:      4096,
    ThinkingBudget: 10000,
})

// Vertex 上の Claude。これは純粋な構築です: SDK の Vertex トランスポートに
// 対して Anthropic SDK クライアントを構築し、features/model/anthropic に渡し
// ます。同パッケージが、Anthropic がホストするすべてのアダプタ（直接 API /
// Vertex ホスト共通）の Messages 変換と HTTP ステータスのエラー分類を担います
// — 別個の変換レイヤはありません。
claudeOnVertexClient, err := rt.NewVertexAnthropicModelClient(ctx, runtime.VertexConfig{
    ProjectID:    "my-gcp-project",
    Location:     "us-east5",
    DefaultModel: "claude-sonnet-4-5@20250929",
})
```

Gemini 3 世代のモデルは、ツール呼び出しの背後にある推論チェーンを認証する
ために、`functionCall` パート（thought/thinking パートだけでなく）に不透明な
**thought signature** を付与します。Vertex アダプタはこのシグネチャを、
`ThinkingPart.Signature` と同じ base64 規約で
`model.ToolCall.ThoughtSignature` / `model.ToolUsePart.ThoughtSignature` を
通じてラウンドトリップします。ランタイムはこのシグネチャをモデルクライアント
境界で（以下のどちらの統合スタイルでも `planner.ToolRequest` が生成される前
に）捕捉し、プロバイダー向けトランスクリプトを再構築する際にツールコール ID
で再付与します。`planner.ToolRequest` にシグネチャフィールドはありません。
プランナーコードがシグネチャの存在を意識する必要はありません。

### provider capability の違い

共有 request type は provider-neutral ですが、各 adapter は provider API が保持できない組み合わせを拒否します。

| Provider | call 前または call 中に強制される契約 |
| --- | --- |
| OpenAI | structured output は strict schema projection を使い、tool と併用できない。重複する `oneOf` branch は広げず拒否する。strict schema は property 5,000 個、enum value 1,000 個、object 10 level、name／enum 合計 120,000 文字までで、fine-tuned model は追加の非対応 keyword を拒否する。thinking request は temperature を拒否する。 |
| Anthropic | 対応する現行 Claude model は native structured output を使う。adaptive thinking は tool と通常の forced choice を許すが、旧 manual thinking は forced `any`／named-tool choice を拒否する。現行世代は deprecated sampling parameter を省略する。stream は全 content block を閉じ、stop reason を報告しなければならない。 |
| Bedrock | Claude 4.5／4.6 は native `OutputConfig` を使い、それ以外の Claude model は private forced tool 1 つを使って同じ契約で result を検証する。event-stream exception は provider error kind を保持する。Runtime `CountTokens` は別 Mantle endpoint が必要な model と structured-output request を拒否する。 |
| Vertex Gemini | Gemini 3 は thinking level を使い、数値 thinking budget と明示的な thinking disable を拒否し、API-valid temperature を転送する。tool-call thought signature は runtime が保持・replay する。stream は candidate が正確に 1 つで finish reason が必要。 |

Claude Opus 4.7+、Sonnet 5+、Haiku 5+、Fable、Mythos では、Anthropic／Bedrock adapter は model が拒否する `temperature`、`top_p`、`top_k` を省略します。旧 Claude 世代には構成済み sampling value を引き続き渡します。

provider adapter は conversation history に関して stateless です。各 request は provider-ready な `Messages` transcript 全体を含める必要があり、`RunID` を渡しても adapter が以前の message を load することはありません。

主な sentinel error は次のとおりです。

- adapter が要求された output contract を表現できない場合の `model.ErrStructuredOutputUnsupported`
- provider の正確な token count を利用できない場合の `model.ErrTokenCountingUnsupported`
- provider が model output なしで閉じた場合の `model.ErrEmptyStream`
- retry 可能な provider throttling の `model.ErrRateLimited`

`*planner.OutputContractError` は sentinel ではなく structured error です。`errors.As` で検出し、origin から不正な model、planner、tool output を区別します。別 request によって contract violation を隠してはならないため、retry 不可です。

### 正規メッセージメタデータと引用の再生

`model.Message.Meta` には、応答を正確に再生するために必要なプロバイダー生成
データが含まれます。メタデータを永続化または転送する境界では、
`model.MarshalMetadata` と `model.UnmarshalMetadata` を使用してください。
これらの codec は単一の JSON オブジェクトを要求し、デコードした数値を
`json.Number` として保持し、後続データを拒否し、nil または空オブジェクトを
nil に正規化します。

引用の再生はプロバイダー固有であり、引用を通常のテキストに平坦化しては
なりません。Bedrock アダプタは、assistant の `CitationsPart` をネイティブな
引用コンテンツブロックとして再生し、ソース ID、抜粋、および文書内の文字・
チャンク・ページ位置を保持できます。Bedrock の system content union には
引用メンバーがないため、system 引用はサポートされません。Anthropic と
Vertex は、正規パートに各プロバイダーのプロトコルで必須のフィールドが
ない場合、引用の再生を拒否します。

### プランナーでモデルクライアントを使う

プランナーはランタイムの `PlannerContext` 経由でモデルクライアントを取得します。
現在は、統合スタイルが明示的に 2 つあります。

- `PlannerModelClient(id)` は planner scope の streaming と runtime-owned event emission に使う
- `ModelClient(id)` は検証済み model に直接 access し、返された stream を `planner.ConsumeStream` で drain するときに使う

#### PlannerModelClient（推奨）

`PlannerContext.PlannerModelClient(id)` は、`AssistantChunk`、
`PlannerThinkingBlock`、`UsageDelta` の発行を担う planner ターン専用の
クライアントを返します。`Stream(...)` は基盤となる provider stream を
drain し、`planner.StreamSummary` を返します。`PlannerModelClient` が許す
`Complete` または `Stream` は、その planner turn につき正確に 1 回です。

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    messages, err := input.PrepareMessages()
    if err != nil {
        return nil, err
    }
    req := &model.Request{
        Messages: messages,
        Tools:    input.Agent.AdvertisedToolDefinitions(),
        Stream:   true,
    }

    sum, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    if len(sum.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
    }
    final := sum.FinalResponse()
    if final == nil {
        return nil, errors.New("model stream ended without a canonical response")
    }
    return &planner.PlanResult{
        FinalResponse: final,
        Streamed: true, // assistant テキストはすでにストリーム済み
    }, nil
}
```

planner-scoped client 自身が検証済み stream を drain／summary 化するため、最も簡単な統合方法です。`sum.FinalResponse()` はその invocation で捕捉した provider response を正確に選びます。text-only message を再構築すると thinking、citation、signature、metadata、message boundary が失われます。

#### 検証済み Client + ConsumeStream

`model.Client` への直接 access が必要な場合は `PlannerContext.ModelClient` から取得し、
`planner.ConsumeStream` と組み合わせます。

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
messages, err := input.PrepareMessages()
if err != nil {
    return nil, err
}
req := &model.Request{
    Messages: messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
stream, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, stream)
if err != nil {
    return nil, err
}
if len(sum.ToolCalls) > 0 {
    return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
}
final := sum.FinalResponse()
if final == nil {
    return nil, errors.New("model stream ended without a canonical response")
}
return &planner.PlanResult{
    FinalResponse: final,
    Streamed:      true,
}, nil
```

この helper は stream を drain し、累積 text と tool call を持つ `StreamSummary` を返すだけです。runtime の model-invocation journal が、受理済み presentation／usage event を後で publish します。

生成 tool definition は `model.ToolDefinitionFromSpec` を使い、生成 payload decoder を保持します。caller-authored tool は `model.AdvertisedToolInputFromSchema` を使います。どちらも unknown tool／invalid payload を planner code が provider tool call として受け取る前に拒否します。

planner logic が検証済み preview chunk を調べる場合や、1 planner turn で複数 model call を行う場合に direct client path を使います。選択した stream はすべて terminal result まで drain してください。早く close しても受理済み response にはなりません。返す `PlanResult` は、選んだ 1 つの exact result、つまり summary の complete `ToolCalls` set または `FinalResponse()` のどちらかを転送しなければなりません。runtime は modified、mixed、ambiguous result を拒否します。`PlannerModelClient.Stream(...)` と `planner.ConsumeStream` は混用せず、planner turn ごとに stream owner を 1 つにします。

### remote model gateway

`features/model/gateway` は validation を弱めず、model request を別 deployment の provider process に送ります。server は raw `model.Provider` に対して動くため、provider-side middleware は transport より前に実行されます。

```go
server, err := gateway.NewServer(
    gateway.WithProvider(provider),
    gateway.WithUnary(unaryMiddleware...),
    gateway.WithStream(streamMiddleware...),
)
```

consumer は transport function から検証済み client を構築します。

```go
client, err := gateway.NewRemoteClient(completeRemote, streamRemote)
countingClient, err := gateway.NewCountingRemoteClient(
    completeRemote,
    streamRemote,
    countRemote,
)
```

remote endpoint が exact token count を実装するときだけ `NewCountingRemoteClient` を使います。`NewRemoteClient` は推測せず、count request に対して意図的に `model.ErrTokenCountingUnsupported` を返します。

### history policy

履歴ポリシーはプランナー呼び出しの前ではなく、
[`PrepareMessages`](#preparing-conversation-messages) を呼ぶ時に適用します。

history compression では、summary 開始条件と exact recent history の保持量を分けます。

- `CompressAtTurns` と `CompressAtMaxInputTokens` は OR 条件。
- `KeepMaxTurns` と `KeepMaxInputTokens` はどちらも summary 後に残す最新の complete turn を制限し、runtime は turn の途中で切らない。
- token policy には client の `CountTokens` が exact count を返す `HistoryModel` が必要。count には保持する system message、candidate turn、現在 advertise している tool が含まれる。
- `CompressAtMaxInputTokens` は exclusive。request が threshold と同値なら収まり、それを超えた場合だけ compression を開始する。

Bedrock Runtime は structured-output request を count できません。Claude Opus 4.7、Sonnet 5、Mythos 5 は AWS の別 Mantle count endpoint を必要とするため、Bedrock adapter はこれらで `model.ErrTokenCountingUnsupported` を返します。生成 agent config の `HistoryCompression` により、design default を変えず deployment ごとに上書きできます。

#### 正確な履歴の保持と要約の対象範囲

`CompressAtMaxInputTokens` が正の場合、一回の要約に最新ターンより前のすべての
ターンを渡します。ランタイムは、保持するシステムメッセージ、実際に生成された
要約、保持候補の完全なターン、現在のツールをまとめて数えます。上限を超えたら、
任意保持の最古ターンだけを除き、収まる最長の末尾部分が見つかるまで再計数します。
上限と同値なら受理します。最新ターンは要約も分割もしません。`KeepMaxTurns` と
`KeepMaxInputTokens` は引き続き保持候補を制限します。要約は全体上限に数え、
古いターンの追加保持枠から差し引きません。

除いたターンはすべて、事前に要約モデルへ渡されています。一部の古いターンが
要約と正確な履歴の両方に現れても、ツールを再実行するわけではありません。ただし、
重複や矛盾をモデルが正しく解釈する保証にはなりません。保持候補が `K` ターンなら、
初期チェックに加えて最終計数は最大 `K` 回です。入力の拡大と追加計数は費用や
待ち時間を増やす可能性がありますが、要約呼び出しは一回のままです。要約と最新
ターンだけでも収まらない場合や、計数・要約が失敗した場合、ポリシーは元の履歴と
エラーを返します。この履歴で代わりに計画を進めることはできません。
`PrepareMessages()` のエラーでアクティビティは失敗し、代替処理や自動再開はしません。

全体上限がない場合は、除外する古い先頭部分だけを要約します。正確に保持する
末尾部分は変わらず、重複対象や最終計数は追加しません。正の上限を使う場合、
`WithSummaryPrompt` の「除外した履歴だけ」という前提は「渡された古い履歴」に
変更してください。選んだ要約目的、`%s`、エスケープしたパーセント記号、モデル、
ロールは変わりません。新しい設定や保存履歴の移行は不要です。
詳細は[英語の契約](https://goa.design/docs/2-goa-ai/runtime/#exact-retention-and-summary-coverage)を参照してください。

#### 要約モデルに渡す根拠

`Compress` は、選択した過去のメッセージを、続行すべき会話ではなく要約対象の
根拠として渡します。テキスト、ツールの完全な引数と結果、呼び出しと結果の ID、
エラー状態と全文、引用の各フィールドを、`model.Message` の標準 JSON 形式で
引用します。元のロール、位置、順序を保持し、値の選別、丸め、重複除去はしません。
どの事実が重要かはモデルが判断します。

`WithSummaryPrompt` は引き続き `%s` に完全な引用テキストを挿入します。
画像と文書は同じ呼び出し内で、ネイティブの添付として一度だけ渡します。
メディアを含む元のユーザーメッセージごとに添付メッセージを一つ作り、元の
メッセージとパートの位置を示します。実行可能なツールは提示せず、文書本文の
抽出や取得もしません。`Message.Meta`、思考内容、キャッシュのチェックポイント、
ツールの思考署名は新しい要約リクエストにはコピーしません。元の履歴、正確に
保持するメッセージ、診断情報、ツールのエラー全文は変更しません。

返す要約のロールとテキスト形式は維持します。引用付きの文とすべての出典情報を、
元の順序で引用レコードとして残します。引用の座標は、それを生成したリクエストに
属します。新しい要約が引用を含み、そのリクエストでネイティブ文書を使った場合は、
文書の配置も記録します。本文を複製せず、`DocumentIndex` を再割り当てせず、
不明な出典からファイルへのリンクを推測しません。

対象範囲と履歴の保持は上記の規則に従います。モデル、上限、一回の要約呼び出しは
維持します。未対応または大きすぎる要約入力は明示的なエラーとなり、根拠の削除や
別の要約呼び出しで回避しません。添付による別途の計数は追加しません。
完全な根拠を渡しても、モデルがすべての事実を
要約に残す保証にはなりません。詳細は[英語の契約](https://goa.design/docs/2-goa-ai/runtime/#evidence-supplied-to-the-summary-model)を参照してください。

### 生成 system の協調 release

compatible release は透過的に rollout できます。incompatible な生成 contract 変更には coordinated drain と cutover が必要です。checkpoint version、generated codec、required tool name、worker retention の要件は [production rollout contract](../production/#transparent-rollouts) を参照してください。

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

この検証は provider call 前に実行されます。stream validation は別の境界です。不完全な content block、署名のない reasoning、stop reason の欠落は、planner code が受理済み response を得る前に output-contract error となります。

---

## 次のステップ

- ツール実行モデルを理解するために [Toolsets](./toolsets/) を学ぶ
- agent-as-tool パターンのために [Agent Composition](./agent-composition/) を読む
- トランスクリプト永続化のために [Memory & Sessions](./memory-sessions/) を読む
