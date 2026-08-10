---
title: 生成型評価
weight: 10
description: "Goa design で評価 scenario を定義し、型付き hook と信頼できる report を生成します。"
llm_optimized: true
---

Goa-AI の評価では、安定した scenario を design に定義し、product 固有の処理を
通常の Go コードに実装できます。Goa-AI はコード生成、scenario 選択、同時実行数
の制限、回答の意味の判定、report 作成を担当します。application は呼び出す
system、対象、厳密に確認する事実、保存する診断 artifact を担当します。

## Scenario を定義する

Goa v3 DSL をすでに使っている application の design package に評価 DSL を追加
します。

```go
package design

import . "goa.design/goa-ai/eval/dsl"

var _ = Suite("chat", func() {
    Description("Chat の完全な outcome を評価します。")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("alarm history 全体を取得します。")
        Input("指定した期間の alarm をすべて列挙してください。")
        Tags("production", "alarm")
        Timeout("3m")
    })
})
```

application には通常の Goa service design も必要です。Goa CLI は追加 DSL を
読み込む前に、その design から Goa の version を判定します。

suite、scenario、tag の ID は `lower_snake_case` を使います。description、input、
正の suite timeout は必須です。scenario timeout がある場合、その scenario では
suite timeout の代わりに使われます。

`goa gen` は `gen/evals/<suite>/suite.go` を生成します。

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

scenario ごとに method が 1 つあります。そのため scenario を追加すると、suite
を実行する application はその method を実装する必要があり、compiler が実装漏れ
を検出します。生成コードには確定した名前、input、tag、timeout が含まれ、
reflection や runtime registry は使いません。

## Check と Claim を実装する

hook は scenario を実行し、`eval.Result` を返します。`Check` は型付き evidence と、
application が厳密に判断できる事実を比較します。`Claim` は model の回答を読んで
判断する必要がある意味を表します。

tool 名、ID、件数、state などの厳密な値には check を使います。回答の解釈が必要
な場合だけ claim を使います。infrastructure または protocol の失敗は error として
返します。失敗した check には診断内容が必要です。

runner は空の result、重複 ID、回答のない claim、不正な artifact、不完全な judge
response を拒否します。

## Runner を作成して実行する

同時実行数は明示的に指定し、上限を設けます。

```go
runner, err := eval.NewRunner(
    judge.New(modelClient),
    eval.RunnerConfig{MaxConcurrency: 5},
)
if err != nil {
    return err
}
suite := genevals.New(hooks)
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` は必須で、正の値でなければなりません。同時に実行される scenario
は最大でその数です。1 つの scenario が失敗しても他は継続します。完了順に関係
なく、report は常に suite の宣言順になります。そのため hook と semantic judge は
この上限までの同時呼び出しを処理できる必要があります。

すべての hook が deterministic check だけを返し、semantic claim を返さない場合は
nil judge を渡します。

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

## Scenario を選択する

runner は product または model を呼び出す前に選択内容を検証します。

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` は指定した ID を実行します。`RunTags` は指定した tag を 1 つ以上持つ
scenario をすべて実行します。空の選択、空文字、重複、未知の ID または tag は
拒否されます。

## Semantic judge

scenario の前に、runner は framework が管理する 4 つの例で judge を検証します。
`entailed` は回答が claim を裏付ける場合、`contradicted` は反対を裏付ける場合、
`not_addressed` は別の話題だけを扱う場合、`indeterminate` は矛盾した情報のため結論
を出せない場合です。

4 つすべてを正しく返す必要があります。これにより常に `entailed` を返す judge が
全 evaluation を成功させることを防ぎます。calibration failure は application を
呼ぶ前に suite を停止します。scenario では `entailed` だけが成功です。judge は
出力を retry または修復しません。

## Report を読む

scenario duration には application 呼び出し、result validation、semantic judging が
含まれます。selection と calibration の失敗は suite error です。hook、validation、
timeout、judge の error は該当 scenario に記録され、他の scenario は継続します。

suite error がない場合は `report.Passed` を確認します。false なら、評価を起動した
test または CI command を失敗させてください。
