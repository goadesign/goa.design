---
title: "ツール検証とリトライヒント"
linkTitle: "ツール検証とリトライヒント"
weight: 6
description: "Goa-AIが検証失敗をLLMがツールコールを修復できる構造化されたToolErrorとRetryHint値に変換する方法を学ぶ。"
---

## これが重要な理由

Goa-AIは**Goaの設計時検証**と**構造化ツールエラーモデル**を組み合わせて、LLMプランナーに**無効なツールコールを自動的に修復する**強力な方法を提供します。

以下の代わりに：

- エグゼキューターでアドホックな検証を散らばせる、
- 不透明なエラー文字列から欠落フィールドを推測する、または
- ユーザーにすべての不正なコールを手動で修正させる、

Goa-AIでは以下ができます：

- Goa設計で正確なペイロードスキーマと検証を記述、
- 失敗を構造化された`ToolError` + `RetryHint`値として表示、
- それらのヒントに基づいて**より良い入力でリトライ**するようプランナーに教える。

このパターンは、ツールを使用するエージェントにGoa-AIを使用する最良の理由の1つです。

## コアタイプ：ToolErrorとRetryHint

プランナーレベル（`runtime/agent/planner`）で：

- **`ToolError`**  
  `runtime/agent/toolerrors.ToolError`のエイリアス：
  - `Message string` – 人間可読なサマリー。
  - `Cause *ToolError` – オプションのネストされた原因（リトライとエージェントアズツールホップ間でチェーンを保持）。
  - コンストラクターとヘルパー：
    - `planner.NewToolError(msg string)`
    - `planner.NewToolErrorWithCause(msg string, cause error)`
    - `planner.ToolErrorFromError(err error)`
    - `planner.ToolErrorf(format, args...)`

- **`RetryHint`**  
  ランタイムとポリシーエンジンが使用するプランナー側ヒント：

  ```go
  type RetryHint struct {
      Reason             RetryReason
      Tool               tools.Ident
      RestrictToTool     bool
      MissingFields      []string
      ExampleInput       map[string]any
      PriorInput         map[string]any
      ClarifyingQuestion string
      Message            string
  }
  ```

  一般的な`RetryReason`値：

  - `invalid_arguments` – ペイロードが検証に失敗（スキーマ/タイプ）。
  - `missing_fields` – 必須フィールドが欠落。
  - `malformed_response` – ツールがデコードできないデータを返した。
  - `timeout`、`rate_limited`、`tool_unavailable` – 実行/インフラの問題。

ランタイムはプランナーヒントを同じフィールドを持つランタイム/ポリシー形式（`policy.RetryHint`）に変換します。ポリシーエンジンとUIは反応できます（キャップを調整、ツールを無効化、修復提案を表示）。

## 検証の出所

検証は**設計駆動**です：

- Goa設計で、ツールペイロード（`Args`）を以下で記述します：
  - `Attribute`タイプ、
  - `Required(...)`、
  - 制約（`MinLength`、`Maximum`、`Enum`など）、
  - 説明と例。
- Goa-AIコード生成は以下を出力します：
  - **型付きペイロード/結果構造体**、および
  - ツール境界でそれらのルールを適用する**バリデーター/コーデック**。

ツールペイロードが検証に失敗した場合（例：必須フィールドの欠落）、生成されたコードとランタイムは：

- 簡潔なメッセージを持つ`ToolError`を生成し、
- プランナーに**正確にコールを修復する方法**を伝える`RetryHint`をアタッチできます。

エラー文字列用のカスタムパーサーを書く必要はありません。パターンは標準化されています。

## ToolResult：エラーとヒントの伝達

すべてのツール呼び出しは`planner.ToolResult`として表示されます：

```go
type ToolResult struct {
    Name          tools.Ident
    Result        any
    Error         *ToolError
    RetryHint     *RetryHint
    Telemetry     *telemetry.ToolTelemetry
    ToolCallID    string
    ChildrenCount int
    RunLink       *run.Handle
}
```

重要なポイント：

- 成功時：
  - `Result`にはデコードされた結果（またはフォールバックとして生のJSON）が含まれます。
  - `Error`と`RetryHint`はnilです。
- 検証または実行失敗時：
  - `Error`はプランナー/UIフレンドリーな方法で何が起こったかを説明します。
  - `RetryHint`（存在する場合）は**リトライ方法**を説明します。

ランタイムは：

- エグゼキューターまたはアクティビティから論理的なツール出力を受け取り、
- 失敗メッセージを`ToolError`にラップし、
- 境界で生成された`RetryHint`をアタッチし、
- UI用の構造化された`toolerrors.ToolError`ペイロードを持つ`ToolResultReceivedEvent`（および対応する`stream.ToolEnd`イベント）を公開します。

## パターン：無効なツールコールの自動修復

推奨パターンは：

1. **強力なペイロードスキーマでツールを設計**（Goa設計）。
2. **エグゼキューター/ツールが検証失敗を表示**するようにします。パニックやエラーを隠す代わりに`ToolError` + `RetryHint`として表示します。
3. **プランナーに教えます**：
   - `ToolResult.Error`と`ToolResult.RetryHint`を検査し、
   - 可能であればペイロードを修復（またはユーザーに尋ね）、
   - 適切であればツールコールをリトライ。

### エグゼキューターの例（疑似コード）

レコードをアップサートするツールの概念的なエグゼキューター：

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (*planner.ToolResult, error) {
    // 生成されたコーデックを使用してデコード
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        // 検証/デコードエラー → 構造化されたToolError + RetryHint
        return &planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "ペイロードが予期されたスキーマに一致しませんでした。",
                // オプション: MissingFields、ExampleInput、ClarifyingQuestion...
            },
        }, nil
    }

    // 基盤サービスを呼び出す
    res, err := client.Upsert(ctx, args)
    if err != nil {
        return &planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }, nil
    }

    // 成功：通常通り結果を返す
    return &planner.ToolResult{
        Name:   call.Name,
        Result: res,
    }, nil
}
```

### プランナーロジックの例

`PlanResume`で、プランナーは最後のツール結果を検査できます：

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolResults) == 0 {
        // 何もすることがない
        return &planner.PlanResult{}, nil
    }

    last := in.ToolResults[len(in.ToolResults)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            // 戦略1：ユーザーに明確化を求める（AwaitClarification）
            return &planner.PlanResult{
                Await: &planner.Await{
                    Clarification: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Question:         hint.ClarifyingQuestion,
                        MissingFields:    hint.MissingFields,
                        RestrictToTool:   hint.Tool,
                        ExampleInput:     hint.ExampleInput,
                        ClarifyingPrompt: hint.Message,
                    },
                },
            }, nil

        case planner.RetryReasonTimeout, planner.RetryReasonRateLimited:
            // 戦略2：バックオフするかツールを切り替える（実装固有）
        }
    }

    // デフォルト：ツール結果から最終回答を合成
    // ...
    return &planner.PlanResult{/* FinalResponse、次のToolCallsなど */}, nil
}
```

このパターンにより、LLM（プランナーコードを介して）はランを完全に失敗させる代わりに**ツールコールを修復**できます。

## Goa-AIがGoaを使用してこれを機能させる方法

Goa-AIはGoaの設計とコード生成をいくつかの方法で活用します：

- **設計時検証**  
  ツールのペイロードのGoa設計は以下を定義します：
  - 必須フィールドとオプションフィールド、
  - 許可される値、形式、範囲、
  - 説明と例。

- **生成されたバリデーターとコーデック**  
  各ツールペイロードに対して：
  - Goa-AIは型付き構造体と検証ロジックを出力します。
  - 境界での検証エラーは簡潔なメッセージとフィールドレベルのヒントにマップできます。

- **ランタイムヒント構築**  
  ランタイムとアクティビティレイヤーは：
  - **ツール境界**（基盤サービスを実行する前）で検証失敗をキャプチャし、
  - エラーチェーンを`ToolError`として保持し、
  - 利用可能な`RetryHint`を`ToolResult`にアタッチし、
  - 単一のツールコールが無効な場合にワークフロー全体を中止することを回避します。

設計とランタイムがスキーマについて一致しているため、すべてのツールに対して**統一されたエラー/ヒント契約**に依存できます：

- サービスバックエンド、
- エージェントバックエンド（エージェントアズツール）、
- またはMCPバックエンド。

## ベストプラクティス

- **検証を設計に入れる、プランナーではない**  
  Goaの属性DSL（`Required`、`MinLength`、`Enum`など）を使用します。生成されたバリデーターとコーデックにそれらを適用させ、ツール境界で構造化エラーとヒントを表示します。

- **エグゼキューターからToolError + RetryHintを返す**  
  以下を優先：

  ```go
  return &planner.ToolResult{
      Name:  call.Name,
      Error: planner.NewToolError("..."),
      RetryHint: &planner.RetryHint{ /* 構造化ガイダンス */ },
  }, nil
  ```

  パニックや単純な`error`リターンよりも。

- **ヒントは簡潔だがアクション可能に**  
  以下に焦点を当てる：
  - どのフィールドが欠落/無効か、
  - 短い明確化質問、
  - 修正された値を持つ小さな`ExampleInput`マップ。

- **プランナーにヒントを読むよう教える**  
  `RetryHint`処理をプランナーのファーストクラスの部分にします：
  - 安全な場合は修復してリトライ、
  - 必要な場合は`AwaitClarification`でユーザーに尋ねる、
  - それ以外は最終回答にフォールバック。

- **サービス内部での再検証を避ける**  
  Goa-AIは検証がツール境界で行われることを前提としています。内部サービスロジックは検証済み入力を信頼し、ドメイン動作に焦点を当てるべきです。

検証駆動リトライパターンと将来の拡張（スキーマ対応ヒントビルダー、よりリッチなフィールド問題）の詳細については、`goa-ai`リポジトリのGoa-AIランタイムとプランナーパッケージ（例：`runtime/agent/toolerrors`と`runtime/agent/planner`）を参照してください。


