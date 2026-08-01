---
title: 生成型評価
weight: 10
description: "DSL で評価 suite を定義し、型付き hook を生成し、厳密な semantic contract で model の回答を判定します。"
llm_optimized: true
---

Goa-AI の評価では、安定したテスト意図を design に置き、product の実行と
evidence は application が所有します。framework は DSL、生成 hook interface、
orchestration、semantic judge、report contract を所有します。application は
実際の target、protocol interaction、deterministic check、claim、診断 artifact
を所有します。

## Suite を定義する

Goa design package で `goa.design/goa-ai/eval/dsl` を import します。

```go
var _ = Suite("chat", func() {
    Description("Chat の完全な outcome を評価します。")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("alarm history 全体を取得します。")
        Input("指定した期間の alarm をすべて列挙してください。")
        Tags("production", "alarm")
        Timeout("3m")
    })

    Calibration("entailed", func() {
        Answer("Compressor 1 は稼働中です。")
        Claim("Compressor 1 は稼働中です。")
        Want(eval.Entailed)
    })
})
```

suite、scenario、calibration、tag の ID は `lower_snake_case` を使います。
description、scenario input、正の timeout は必須です。calibration label は
`entailed`、`contradicted`、`not_addressed`、`indeterminate` のいずれかです。

`goa gen` は直接実装する interface を `gen/evals/<suite>/suite.go` に生成します。

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

adapter registry や reflection はありません。生成 method により各 scenario は
compile-time obligation になります。receiver field または closure で application
dependency と target を保持します。

## Evidence を実装して実行する

各 hook は product interaction 全体を実行し、deterministic な `Checks`、semantic
な `Claims`、model の `Output`、診断用 `Artifacts` を含む `eval.Result` を返します。
infrastructure または protocol failure は error として返します。runner は空の
result、重複 ID、output のない claim、1 対 1 でない judge response を拒否します。

`eval/judge` は provider-neutral な `model.Client` を使い、batch ごとに tool を
持たない structured-output request を 1 回だけ行います。model output の修復、
retry、置換は行いません。

```go
suite := genevals.New(hooks)
runner := eval.NewRunner(judge.New(modelClient))
report, err := runner.Run(ctx, suite)
```

runner は scenario を始める前に全 calibration を検証し、生成 timeout の下で
scenario を順番に実行します。すべての check が成功し、すべての claim が
`entailed` の場合だけ scenario は成功します。report は CI と artifact retention
向けに安定した JSON field を使います。

