---
title: 生成型評価
weight: 10
description: "Goa design で評価 scenario を定義し、型付き hook と信頼できる report を生成します。"
llm_optimized: true
---

**エージェントを変更した後も、回答の品質は保たれていますか？**

evaluation（eval）は、実際のエージェントを実行し、結果が引き続き正しいことを確認する反復可能なテストです。unit test とは異なり、実サービスとモデルを呼ぶため数分かかることがあり、「正しいか」の一部は厳密な値比較ではなくモデルが書いた回答を読む必要があります。

多くのチームは、test case の YAML、専用 runner、モデル回答を照合する正規表現の集まりを手作業で構築します。Goa-AI はエージェントを定義する同じ design からこの harness を生成し、回答照合を、calibration 済みの model judge が評価する claim に置き換えます。

evaluation suite の各要素には、明確な所有者が 1 つだけあります。

- **design** は各 scenario の名前、検証対象、input の形、tag、制限時間を記述します。
- **生成コード** はその記述から Go 型と scenario ごとの interface method を作ります。design と application がずれると build が失敗するため、test が黙って消えることはありません。
- **application code** はそれらの method を実装し、エージェントを呼び、evidence を収集し、成立すべき条件を宣言します。
- **runner**（`goa.design/goa-ai/eval`）は scenario を選択し、同時実行数を制限し、回答を評価して JSON report を作ります。

機能全体は次の 6 用語で説明できます。

| 用語 | 意味 |
|------|------|
| **Scenario** | 「chat agent にすべての alarm を列挙させる」など、1 つの test case |
| **Hook** | 1 scenario に対して実装する Go method。エージェントを実行し、起きたことを返す |
| **Check** | 「すべての result page を取得した」など、コードが厳密に確認する pass/fail の事実 |
| **Claim** | モデルの回答について真でなければならない短い文 |
| **Judge** | 回答に照らして各 claim を分類する model-backed grader |
| **Report** | 実行対象、成否、理由、所要時間をまとめた JSON |

回答の表現は実行ごとに変わるため、完全一致では判定できません。そのため claim を使います。一方、コードで厳密に確認できる事実をモデルへ委ねないために check を使います。

## design で scenario を宣言する

design は各 scenario input の「形」、つまり存在する field と有効条件を宣言します。実際の値は含めません。具体的な user ID、facility、prompt は application code に置くため、同じ design をどの環境でも使えます。

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa-ai/eval/dsl"
    . "goa.design/goa/v3/dsl"
)

var ChatEvalInput = Type("ChatEvalInput", func() {
    Attribute("user_id", String, "User running the evaluation.", func() {
        Format(FormatUUID)
    })
    Attribute("prompt", String, "User message.", func() {
        MinLength(1)
    })
    Required("user_id", "prompt")
})

var _ = Service("chat_agent", func() {
    Agent("chat", "Answers product questions.", func() {
        Suite("chat", func() {
            Description("Exercises production Chat outcomes.")
            Timeout("2m")

            Scenario("alarm_inventory", func() {
                Description("Retrieves every alarm in a fixed window.")
                Input(ChatEvalInput)
                Tags("production", "alarm")
                Timeout("3m")
            })

            Scenario("health_check", func() {
                Description("Verifies application-owned setup.")
            })
        })
    })
})
```

規則は次のとおりです。

- suite、scenario、tag の名前には `lower_snake_case` を使います。report と command-line flag の安定した ID になるため、名前を変えると test の識別子も変わります。
- すべての suite と scenario に `Description` が必要です。suite には正の `Timeout` が必要で、scenario の `Timeout` はその scenario に限り suite の値を置き換えます。
- `Input` は任意です。`Input` のない scenario は `context.Context` だけを受け取る hook を生成します。`Input` は tool の `Args` と同じ形式（名前付き Goa 型、primitive、array、map、attribute を列挙する inline function）を受け取ります。evaluation input では `OneOf` を使えません。
- suite は design の top level または `Agent` 内に宣言できます。agent 内に置くと、生成 package からその agent の tool contract も利用できます。

## Go コードを生成する

design で `goa.design/goa-ai/eval/dsl` を import すると evaluation generator が登録されます。通常どおり `goa gen` を実行すると、`gen/evals/<suite>/suite.go` が生成されます。

```go
type ChatEvalInput struct {
    UserID string
    Prompt string
}

type Hooks interface {
    AlarmInventory(context.Context, *ChatEvalInput) (eval.Result, error)
    HealthCheck(context.Context) (eval.Result, error)
}

type Inputs struct {
    AlarmInventory *ChatEvalInput
}

func New(hooks Hooks, inputs Inputs) (eval.Suite, error)
```

`Hooks` には scenario ごとに 1 method があるため、design に scenario を追加すると application が実装するまで build が失敗します。`Inputs` には `Input` を宣言した scenario ごとに field があり、application が実値を設定します。`New` は supplied value を design の規則（required field、format、length）に照らして検証し、scenario を開始する前にエラーを返します。

### agent suite の tool contract

agent の tool も design に宣言されるため、generator は agent が呼べる tool（利用する別 agent の tool を含む）を正確に把握しています。suite を `Agent` 内に宣言すると、生成 package に次が含まれます。

```go
func MustToolContract(name tools.Ident) *tools.ToolSpec
```

tool 名を渡すと、schema と argument/result codec を含む生成 contract を返します。hook で記録済み tool call を decode し、手書き JSON 処理なしで argument を厳密に確認できます。build 時に agent から到達できる全 tool が対象です。runtime に discovery される tool は generator が contract を知らないため対象外です。agent が使えない tool を指定すると panic します。これは evaluation 自体の bug だからです。

## 実行可能 command を作る

`goa gen` の後に `goa example` を実行します。

```bash
goa example example.com/product/design
```

これにより `cmd/<suite>-evals/main.go` が一度だけ作られ、上書きはされません。その後は application が所有するファイルです。以降の design 変更でも `gen/evals` は更新されます。hook signature が変われば compile に失敗し、input value が不足すれば `New` が失敗するため、command が黙って古くなることはありません。

生成ファイルは直ちに compile でき、application code が必要な各箇所（scenario ごとの空 hook、`Input` を宣言した scenario ごとの input value、judge）に `TODO` があります。利用可能な command line も含まれます。

- `--scenario <id>` は 1 scenario を実行します。複数回指定できます。
- `--tag <tag>` はその tag を持つ全 scenario を実行します。複数回指定できます。scenario flag と tag flag は併用できません。
- `--max-concurrency <n>` は同時実行数を制限します（default 5）。

各実行は JSON report を standard output へ書き、suite が失敗すると non-zero で終了します。普通の Go program なので、local、CI、schedule のいずれでも実行できます。`go test` を使いたい application は command を省き、test から生成 `New` を呼べます。

## hook を実装する

生成 interface を通常の型で実装します。

```go
type hooks struct {
    client *Client
}

func (h *hooks) AlarmInventory(
    ctx context.Context,
    input *genevals.ChatEvalInput,
) (eval.Result, error) {
    answer, evidence, err := h.client.Run(ctx, input.UserID, input.Prompt)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{{
            Name:   "all_pages_retrieved",
            Passed: evidence.Exhausted,
        }},
        Claims: []eval.Claim{{
            ID:   "complete_answer",
            Text: "The answer reports every alarm in the window.",
        }},
        Output: answer,
        Artifacts: []eval.Artifact{{
            Name: "protocol",
            URI:  evidence.ArtifactURI,
        }},
    }, nil
}
```

hook は 3 種類の情報を返します。

- **Checks** は tool 名、ID、件数、state など、コードが厳密に確認できる事実です。失敗した check には、問題を説明する診断が必要です。
- **Claims** はモデル回答についての文で、後から judge が評価します。複合した長い claim ではなく、事実ごとに 1 つ（「回答が alarm 名を示す」「回答が activation time を示す」）を書きます。そうすれば、失敗時に欠けた事実が明確です。正規表現や keyword list で回答の意味を近似しないでください。その役割を claim と judge が担います。claim は評価対象の回答 `Output` に照らして判定されます。`Output` が空、つまり run が回答を生成しなかった場合は、judge を呼ばずに全 claim を `not_addressed` とし、scenario を失敗させます。
- **Artifacts** は log、transcript、protocol dump など、失敗調査に使う保存済み evidence への任意の link です。

返り値の error は、エージェントに接続できない、timeout、test environment の故障など infrastructure 問題だけに使います。「回答は返ったが内容が違う」は error ではなく、failed check または unsupported claim です。

runner は採点前に不正な result を拒否します。result には check または claim が 1 つ以上必要で、name と ID は一意、artifact には name と URI の両方が必要です。

## evidence を収集し、expectation を宣言する

多くの hook は同じ 2 つの処理を行います。run の stream event を監視して agent の行動を記録し、その記録を scenario の expectation と比較します。`eval/evidence` package が両方を所有するため、すべての suite が同じ実装を共有します。

`evidence.Collector` は runtime の stream event（tool start/end、assistant reply、workflow lifecycle、confirmation boundary）を受け取り、`evidence.Evidence` を構築します。そこには、tool call ID で相関され因果順に並んだ全 tool call（親 tool の直後に、その child run が行った nested call が並ぶ）と正規 JSON argument/result、累積 assistant answer、pending confirmation、terminal workflow phase が含まれます。goa-ai stream を直接公開する application は event をそのまま渡します。独自 transport へ再 encoding する application は、wire type を stream event へ戻す小さな adapter を書きます。

```go
collector := evidence.NewCollector()
for !collector.Done() {
    event, err := stream.Recv()
    if err != nil {
        return eval.Result{}, err
    }
    if err := collector.Consume(event); err != nil {
        return eval.Result{}, err
    }
}
ev, err := collector.Finish()
```

`evidence.Expect` は deterministic expectation を宣言し、evidence を check へ変換します。生成される各 toolset package は、tool identifier と型付き payload/result codec を組にした descriptor（例: `helpers.AnswerTool`）を tool ごとに 1 つ公開します。`evidence.ExpectCall` で descriptor から expectation を構築します。対応付けは生成時に固定され、assertion は型付き Go predicate なので手作業の JSON traversal は不要です。field の rename や型変更は、黙って一致しなくなる代わりに suite を compile error にします。

```go
expect := evidence.Expect{
    Tools: []evidence.Tool{
        evidence.ExpectCall(helpers.AnswerTool,
            func(p *helpers.AnswerPayload) error {
                if p.Question == "" {
                    return errors.New("question must not be empty")
                }
                return nil
            },
            nil, // result unconstrained
        ),
    },
    ForbidTools: []tools.Ident{admin.DeleteRecords},
}
return eval.Result{
    Checks: expect.Checks(ev),
    Claims: claims,
    Output: ev.Answer,
}, nil
```

`Expect` は 2 つの trajectory mode を備えます。default は、宣言した tool を観測 call の順序付き subsequence として対応付け、未宣言 call は制約しません。run は拒否された call を再試行したり、1 tool の処理を複数 call に分けたりできます。`Exact: true` は完全な因果 trajectory を call ごとに比較するため、隠れた retry や余分な tool は失敗します。tool ごとの policy は failure semantics を扱います。`evidence.ExpectFailure` は正確に 1 つの classification で失敗すべき call を宣言し、`ForbidFailureKinds` は全 attempt にわたり保護対象の failure class を拒否し、`RequireAllAttemptsSuccessful` は失敗または result 欠落を拒否します。`evidence.ExpectConfirmation` は、run が完了せず operator confirmation 待ちで停止したことを確認します。生成 descriptor がない registry-discovered toolset では、tool identifier と `evidence.Decoded` assertion を持つ素の `evidence.Tool` を宣言します。

bounded-result metadata は生成 domain result 型の内部ではなく、その横に保持されます。scenario が返却件数、全件数、truncation、refinement hint、continuation cursor を検査する必要がある場合は `Tool.Bounds` を設定します。

```go
alarms := evidence.ExpectCall(ada.ListAlarmsTool, nil, nil)
alarms.Bounds = func(bounds *agent.Bounds) error {
    if bounds == nil || bounds.Truncated {
        return errors.New("expected a complete alarm inventory")
    }
    return nil
}
```

## suite を実行する

```go
suite, err := genevals.New(&hooks{client: client}, genevals.Inputs{
    AlarmInventory: &genevals.ChatEvalInput{
        UserID: userID,
        Prompt: "List every alarm in the requested window.",
    },
})
if err != nil {
    return err
}

grader, err := judge.New(modelClient, maxOutputTokens)
if err != nil {
    return err
}
runner, err := eval.NewRunner(grader, eval.RunnerConfig{
    MaxConcurrency: 5,
    Reporter:       reporter,
})
if err != nil {
    return err
}
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` は必須で正の値でなければなりません。同時に実行される scenario は最大でその数です。1 scenario の失敗は他を停止しません。完了順にかかわらず、report は design の宣言順です。scenario は並列実行されるため、hook と judge は concurrent call に対応する必要があります。

任意の `Reporter` は各 scenario の開始時と終了時に callback を受け取るため、application は scheduling を実装せずに進捗を表示できます。選択された scenario には必ず 1 回の finished callback があります。run の cancel により開始しなかった scenario も対象ですが、その場合は start time が zero で started callback はありません。

context を cancel すると新しい scenario は開始されず、実行中の scenario は各 context を通じて cancel されます。`Run` は context error と partial report を返します。hook は cancellation を尊重しなければなりません。

どの hook も claim を返さない場合に限り、nil judge を渡せます。

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

hook が claim を返したのに judge が nil なら、その scenario は judge が必要だという error で失敗します。

### scenario を選択する

runner は agent や model を呼ぶ前にすべての選択を検証します。

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` は指定した scenario 名を実行します。`RunTags` は指定 tag の少なくとも 1 つを持つ全 scenario を実行します。どちらも空の選択、空値、重複、存在しない名前や tag を拒否するため、typo によって何も実行されず成功することはありません。

## judge の仕組み

`eval/judge` は、Goa-AI の他の箇所と同じ不透明な検証済み `model.Client` から judge を作るため、設定済みのどの provider でも利用できます。deterministic な judge client が必要な test は `model.Provider` を実装し、`model.NewClient` を通します。application code は `model.Client` を直接実装できません。

application は `judge.New` に正の `maxOutputTokens` を渡し、返された error を処理する必要があります。suite を実行する前に application の設定からこの値を読み取ってください。ゼロや負の値では model を呼ばずに生成が失敗します。default 値はありません。

この値は、全 judgment と JSON 構造を含む**モデルの 1 回の応答全体**に対する output token 数の上限です。上限と同じ値までは許可されます。claim ごとの割り当てでも、scenario や suite 全体の予算でもありません。Goa-AI は claim 数にかかわらず、初回 request と許可された各 correction request に同じ値を渡します。設定された provider と model が対応する値を選んでください。未対応の値は黙って引き下げられず、error になります。有限の上限では、その範囲内で応答が完了することは保証されません。

### 共有する参照情報と judge の移行

複数の claim に共通する事実情報は、各 claim に繰り返し書くのではなく、任意の文字列フィールド `Result.Reference` に入れます。`Output` には評価対象の回答をそのまま保持します。

```go
result := eval.Result{
    Output:    answer,
    Reference: "Supported export formats: CSV and JSON.",
    Claims: []eval.Claim{{
        ID:   "export_formats",
        Text: "The answer lists the supported export formats.",
    }},
}
```

runner は回答を変更せず、参照情報を別に渡します。モデルを使う judge は、既存の修正リクエストも含め、各リクエストに参照情報を 1 回だけ含めます。参照情報の事実は回答の正確さを判断するためのものであり、回答に欠けた内容を補うものではありません。この例では、参照情報だけに形式が列挙されていても claim を満たしません。`Output` が空なら、参照情報に答えが含まれていても judge は呼ばれず、すべての claim が `not_addressed` になります。

独自の judge は、新しい 4 引数のインターフェースを実装します。

```go
Judge(ctx context.Context, output string, claims []eval.Claim, reference string) ([]eval.Judgment, error)
```

直接の呼び出しは `grader.Judge(ctx, output, claims, reference)` に更新します。追加の情報が不要なら `""` を渡してください。calibration も空の参照情報を使います。runner は空でない参照情報を JSON report の `reference` フィールドに保存し、空ならフィールドを省略します。このフィールドがない既存の report は、引き続き追加情報がないことを意味します。report を厳格に検証する外部の読み取り側は、新しいフィールドを含む report を読む前に、そのフィールドを受け入れるよう更新する必要があります。保存済み report の移行、生成される suite の変更、製品のサービス契約の変更は不要です。この変更でモデルの呼び出しは増えず、モデルの選択、トークン上限、判定ラベル、修正回数も変わりません。

### 判定ラベルと応答の検証

各 scenario について、judge は回答と claim を受け取り、claim ごとに正確に 1 label と短い理由を返します。

- `entailed`: 回答が claim を真だと裏付ける。
- `contradicted`: 回答が claim を偽だと裏付ける。
- `not_addressed`: 回答が別の話題だけを扱う。
- `indeterminate`: 回答が曖昧または矛盾しており判断できない。

成功とみなすのは `entailed` だけです。

各 claim の条件を記載どおりに適用します。「価格を示す」には価格が必要です。
「記載する価格は参照情報と一致しなければならず、価格を記載しなくてもこの制約を満たす」
という条件なら省略できます。空ではない回答が価格を記載せず、他の要件も満たしていれば、
その制約の判定は `not_addressed` ではなく `entailed` です。省略によって必須の内容を
補ったり、回答に含まれる根拠のない記述を裏付けたり、現実についての不明な条件を
解決したりすることはできません。

これらの条件はモデルが解釈します。フレームワークはコードで claim を分類したり、
判定ラベルや理由を書き換えたりしません。`Output` 全体が空なら、引き続き judge を
呼ばずにすべての claim を `not_addressed` とし、scenario を失敗させます。

scenario を開始する前に、runner は label ごとに 1 つ、固定の 4 example で judge を検査します。この手順を calibration と呼びます。たとえば常に `entailed` を返して全 evaluation を成功させるような、label を区別できない judge は calibration に失敗し、application へ触れる前に suite を停止します。calibration は runner 所有の 2 分 deadline 内で行うため、接続不能または停止した model endpoint は suite を永久に block せず、明確な error になります。

プロンプトは、プロバイダー固有の名前を書かず、提示された評価ツールを正確に 1 回呼び出すよう求めます。
スキーマは各 claim ID を名前とするプロパティを要求し、その値には label と空でない理由を含めます。
judge は応答内の位置ではなく名前で判断を参照し、元の claim 順で返します。
不足・未知・重複した名前、余分なフィールド、不正な label は拒否されます。

構造を表すフィールドメタデータにより、検証器は独立したフィールドの誤りを説明できます。
たとえば、オブジェクトが必要な claim が文字列として返された場合です。
claim の全文はスキーマに、参照証拠はリクエストに保持され、どちらもこの修正用メタデータにはコピーされません。
スキーマが要求する場合、`requests` という名前の claim も有効です。judge は判定例を提示しません。

既存の回数制限付き修正処理は代わりの応答を求められますが、不正な出力を書き換えることはありません。
label、モデル選択、トークン上限、修正回数は変わらず、説明が明確になってもモデルが従う保証はありません。
修正回数を使い切ると、呼び出し元には架空の判断ではなくエラーが返ります。
詳しくは[フレームワークの judge 契約](https://github.com/goadesign/goa-ai/blob/main/docs/evals.md#how-judging-works)を参照してください。

## report を読む

report とその全要素は安定した JSON field 名を使うため、tooling が依存できます。scenario duration は hook call、result validation、judging を含みます。

失敗には 2 つの level があります。

- **suite-level**: 不正な選択、calibration failure、cancellation は `Run` の error として返り、report の `error` field に記録されます。
- **scenario-level**: hook error、不正な result、timeout、judging failure は該当 scenario の report に記録され、残りの scenario は完了まで続きます。

suite-level error なしで実行を終えたら `report.Passed` を確認します。全 selected scenario がすべての check と claim に成功した場合だけ true です。false なら呼び出し元 command または CI job を失敗させてください。

## judge の生成処理を移行する

`judge.New(client, opts...) *Judge` は `judge.New(client, maxOutputTokens, opts...) (*Judge, error)` に置き換わります。すべての呼び出し元で、設定済みの正の応答上限を渡し、runner を作る前に error を処理してください。`WithModelClass` など既存の option は必須の上限値の後に渡し、意味は変わりません。

以前の `256 × claim 数` という計算は削除されます。これは Go source の変更なので、新しい version で compile するには呼び出し元の更新が必要です。judge の model 選択、prompt、label、厳格な応答検証、correction 回数は変わりません。保存済み report の移行は不要です。

## string-input suite からの upgrade

以前の version は、各 hook に 1 つの string を渡していました。型付き input は次のように置き換えます。

- `Input("some literal")` を Goa input 型へ置き換え、literal は生成 `Inputs` value へ移す。
- Goa v3 の `Description` と `Timeout`、Goa-AI の `Tags` を使う。`eval/dsl` が宣言するのは `Suite`、`Scenario`、`Input` だけ。
- hook を `(context.Context, string)` から生成された型付き signature へ更新する。
- `New(hooks)` を `New(hooks, inputs)` に更新し、validation error を処理する。

application code を compile する前に再生成してください。生成 suite package と application hook は同じ Go binary に入るため、network 越しの version 混在はありません。不一致は runtime の surprise ではなく compile error になります。

## Remote Judge Model

evaluation suite は planner と同じ不透明な検証済み `model.Client` を使います。judge model が別 process で動く場合は `gateway.NewServer` で provider を公開し、`gateway.NewRemoteClient` または `gateway.NewCountingRemoteClient` で接続します。evaluation policy が正確な input-token count を必要とする場合は counting client が必要です。transport と validation contract は [Remote Model Gateway](./runtime/#remote-model-gateways) を参照してください。
