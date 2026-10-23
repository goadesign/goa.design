---
nav_group: guides
title: "プロバイダーが実行する操作"
weight: 35
description: "実装をインポートせずにエージェント操作と登録済みツールを呼び出す。"
llm_optimized: true
---

実装をインポートせずにエージェント操作と登録済みツールを呼び出す。

## 操作を開始する

ホストは呼び出し元を認可し、生成された操作宣言と元の引数を送信します。`StartOperation`
はホストの既存セッションを使い、`StartOneShotOperation`
はセッションを作りません。プロバイダーのワーカーが自身のエクスポートを検証し、選択された不変の設定を準備します。利用側に非公開のエージェント定義や
`WithAgentExecutors` は不要です。

```go
handle, err := rt.StartOneShotOperation(
    ctx, runID, operation, arguments, labels, nil,
)
if err != nil {
    return err
}
output, err := handle.Wait(ctx)
if err != nil {
    return err
}
```

登録済み操作には、保存した正確な Registry 選択と `RegisteredInvocation` を使い、`StartToolOperation` または
`StartOneShotToolOperation` を呼びます。同じ Registry
ソースと生成クライアントを設定してください。ネイティブエージェントは宣言されたワークフローとキューを使います。サービスは `WithToolWorkflowQueue` と
`RegisterToolWorkflow` を呼ぶワーカーを使い、エージェント、プランナー、モデル、会話を必要としません。登録やラベルはアクセス権を与えません。

起動プロセスの中断から復旧できる冪等な起動・待機ヘルパーには、`EnsureOperationCompletion`、`EnsureOneShotOperationCompletion`、`EnsureToolOperationCompletion`、`EnsureOneShotToolOperationCompletion` を使います。ツールを呼び出さずにアシスタントのテキストを直接返す必要がある場合は、`runtime.WithTextOnly(true)` を渡します。

最初の処理でワーカーの正確なバージョンを指定する必要がある場合は、`runtime.WithRootExecutionTarget(target)` を使います。検索メソッド `temporalEngine.CurrentWorkflowTarget(ctx, queue)` を持つのは、具象の `temporal.Engine` です。新しい回答や通常のクリーンアップのワークフローは明示的な実行先を省略します。Temporal がディスパッチ時に current を選び、その後の実行はワーカーに設定されたバージョニング動作に従います。復旧では、以前の明示的な実行先も含め、公開済みの設定をそのまま保持します。

プロバイダーワーカーが互換性のあるリビジョン変更をまたいで操作契約を提供する必要がある場合は、ランタイムをシールする前に、リビジョンが所有する契約を `rt.RegisterAgentOperationProvider` で登録します。

## 履歴を明示的に選ぶ

作業の送信またはランタイムの封印前に、プロバイダーのワーカーで `AgentToolResolver` を登録します。署名は `func(context.Context,
genregistry.ExecutionInvocation, string, *runtime.ToolCall)
(*runtime.AgentToolConfiguration, error)` です。元の呼び出し、不変の設定参照、検証済みツール呼び出しを受け取り、必須の
`History`、ラベル、ポリシー、任意のメタデータとプロンプト参照を返します。

```go
configuration := &runtime.AgentToolConfiguration{
    History: runtime.LiteralAgentHistory(messages),
    Labels: labels,
    Policy: policy,
}
```

次のターンには `runtime.NextTurnAgentHistory(completedRunID, systemMessages, freshMessages)`
を使います。履歴元は同じエージェントとセッションで正常完了した実行である必要があります。新しいメッセージにシステムメッセージは含められません。`WithoutPriorReasoning()`
は渡された履歴と継承履歴の推論を除外し、その除外は後続ターンにも残ります。セッションなしの操作は別セッションの履歴を継承できません。正確な再送では受理済みの準備を再利用します。

## 結果、入力、キャンセル

エンジンはプロバイダーの準備前に受理した作業を引き受けます。同じ要求の再送は元の実行を参照し、受理後の入力変更は競合になります。最初のランタイム記録前の失敗やキャンセルにもエンジンの終了結果が残ります。記録がないだけで未開始と判断せず、受理済みエンジン実行を確認してください。

共通の入力、出力、記録、スナップショットには生成された `Subject` が必須です。実際のエージェント識別子、またはサービスツールの Registry
ソースと完全修飾名のいずれかを選びます。サービスに架空のエージェントや隠れたセッションはありません。エージェント専用クライアントとモデル履歴には引き続きエージェントの識別子が必要です。

`planner.PlanInput.ParentTool` と `planner.PlanResumeInput.ParentTool`
は委譲と直接操作の結果契約を持ちます。プランナーは契約に合う `planner.FinalToolResult` を返し、会話テキストだけの結果は拒否されます。型付き結果には
`FinalToolResult`、回答テキストには `Final` を使います。診断履歴が必要な場合だけページ単位の実行記録を読みます。

入力が必要な場合、継続処理は元の操作を復元し、受け入れられた呼び出し元メタデータ（`Metadata`）を保持して、1つの後続を受け入れます。サービスツールの場合、ホストは前身、後続の実行 ID、型付きの回答を永続的に保存し、そのワーカーが `StartToolContinuation` と `EnsureToolContinuationCompletion` を呼び出します（任意のワークフロー `memo map[string]any` を最後の引数として渡します）。親のキャンセルは受け入れられた子の関係に従い、未完了のクリーンアップを保持します。完了がクライアントの再試行に依存してはなりません。

キャンセルを観測するワークフローは、実行中と中断中のどちらにも `AutoUpgrade` を使います。クリーンアップを観測する間も、実際の処理は割り当てられた実行を保ちます。復旧では、受理済みの観測ワークフローの明示的な実行先とリクエストのダイジェストを保持します。

## 生成される入力契約

コンパイル済みツールセットの `Use` 内で `BindInput("read", "scope")`
を指定すると、その利用側のモデル入力からプロバイダーの必須トップレベルフィールドを除外できます。計画アクティビティごとに生成された型付きヘルパーを登録してアプリケーションの値を渡します。プロバイダーは完全な元の入力を受け取ります。任意、注入済み、不明、重複フィールドやネストしたパスは拒否されます。リモート
Registry 契約にはコンパイル済み宣言が必要です。

生成コーデックは、明示的に `json.RawMessage` として表現された `Any` または `Bytes` をサポートし、生の JSON
値と正確な数値を保ちます。`Meta("struct:tag:json", ",embed")`
を持つマップは値の契約に従って追加のオブジェクトメンバーを受け入れます。重複キー、宣言済みフィールドとの衝突、不正な値は拒否されます。通常のオブジェクトは未宣言フィールドを拒否し、通常のバイト列は
base64 を使います。

## アップグレードとロールバック {#upgrade}

コード、通信形式、保存データをまとめて更新します。利用側とプロバイダーを再生成してビルドし、resolver の `Messages` を必須の `History`
に置き換え、登録をプロバイダーへ移します。空の履歴は `runtime.LiteralAgentHistory(nil)` と明示し、未選択の `AgentHistory`
は拒否されます。ネイティブの対象には `Executor`、`Configuration`、`Workflow`、`Queue` が必須です。`SeedDeclaration` は `Origin` を重複して保持しなくなり、`RunSeed.Origin` は `BeginRunPreparationOperation` パラメータから直接取得されます。廃止されたエントリも含め、保持されたすべての宣言グループを有効化前に検証してください。

現在の中断形式は `goa-ai.run-suspension.v14`、最上位の結果は `json/goa-ai-run-output-v3`
です。以前の形式は拒否されます。必須の `Subject` に合わせて
Stores、エンジンアダプター、共通記録、利用側、生成トランスポートを更新します。開始、準備、選択、中断記録、子の結果を含む親履歴、エクスポート履歴、結果のコピーを調べます。旧ワーカーで完了させるか、所有者による変換をリプレイで検証してください。旧作業が残る間は旧・新の準備ワーカーでキューを共有できません。

独立してデプロイする読み手と書き手を調整してください。ロールバックには保存データ、宣言、要求、ワーカーの整合が必要です。新形式の書き込み後にバイナリだけ戻すのは安全ではありません。フレームワークは不足する実行者を推測せず、恒久的な互換モードも提供しません。

フレームワークの詳細な契約:

- [Run subjects](https://github.com/goadesign/goa-ai/blob/main/docs/run-subjects.md)
- [Workflow results](https://github.com/goadesign/goa-ai/blob/main/docs/workflow-results.md)
- [Native declarations](https://github.com/goadesign/goa-ai/blob/main/docs/native-agent-declarations.md)
- [JSON codecs](https://github.com/goadesign/goa-ai/blob/main/docs/json_codecs.md)
