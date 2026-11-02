---
nav_group: guides
title: "プロンプト管理"
linkTitle: "プロンプト管理"
weight: 28
description: "prompt を設計で宣言し、型付き引数で描画し、ランタイムで 1 つのスコープに限って変更し、各モデルリクエストをどの prompt バージョンで組み立てたかを確認します。"
llm_optimized: true
---

prompt とは、エージェントがモデルに送るテキストです。たとえば、サポート
アシスタントに返金の扱い方を指示する system prompt がこれにあたります。
Goa-AI は prompt を設計の一部として扱います。

- 各 prompt とそのロール、受け取る引数を設計で宣言します。
- `goa gen` はすべてのテンプレートをその引数と照合し、テンプレートを描画する
  型付き関数を生成します。
- ランタイムで、1 つの顧客、1 つのセッション、または全員に対して、再ビルドや
  再デプロイなしで prompt のテキストを置き換えられます。
- 描画は、実際に使った prompt バージョンをそのまま返します。それをテキストを送る
  モデルリクエストに付けると、リクエストのトレースでどのテキストがどの回答を
  生んだかがわかります。

## バージョン要件 {#version-prerequisite}

設計で宣言する prompt（`SystemPrompt`、`Prompt`、`Template`、`Role`、`Args`）、
生成される prompt パッケージ、および override の型付き検証は `v0.90.0` より後の
`goa.design/goa-ai` で導入されました。次のタグ付きリリースまでは、
`goa.design/goa-ai` をコミット `fb00df97927e61cfa444423e77584b950d753bda` に
固定してください（`goa-ai` のモジュール要件により、互換性のある
`goa.design/goa/v3` が自動的に選択されます）。

```bash
go get goa.design/goa-ai@fb00df97927e61cfa444423e77584b950d753bda
```

## 概念 {#concepts}

**ベースライン prompt。** 設計で宣言されたとおりの prompt です。ID（例:
`support.assistant.system`）、ロール（`system`、`user`、`tool`、`synthesis` の
いずれか）、テンプレートテキスト、テンプレートが使えるフィールドから成ります。
ランタイムは各ベースラインを 1 回だけ登録し、登録済みのベースラインは変わりません。
バージョンはテンプレートテキストから導出されるため、設計でテキストを変えると
新しいバージョンになります。

**Override。** 1 つの prompt の置き換えテキストで、prompt ストアに保存され、
あるスコープの中でだけ適用されます。override ごとに独自のバージョンを持ちます。

**スコープ。** override が適用される範囲です。スコープは任意のセッション ID と、
`account=acme` や `region=eu` のような自由に選べるラベルを持ちます。override は
次の両方を満たすリクエストに適用されます。

- override にセッション ID がない、またはそのセッション ID がリクエストの
  セッション ID と等しい。
- override のすべてのラベルが、同じ値でリクエストに含まれている。

セッションもラベルも持たない override は、すべてのリクエストに適用されます。

**どの override が選ばれるか。** 複数の override が適用される場合、ランタイムは
次の順で 1 つを選びます。

1. セッション ID を持つ override が、持たない override より優先される。
2. それ以外では、ラベルの多い override が、少ない override より優先される。
3. それ以外では、新しい override が優先される。

適用される override がない場合、ランタイムはベースラインを描画します。

たとえば、`support.assistant.system` に次の override が保存されているとします。

| Override のスコープ | セッション `s-42`、`account=acme`、`region=eu` のリクエストに適用されるか |
| --- | --- |
| セッションなし、ラベルなし | はい |
| `account=acme` | はい |
| `account=acme`, `region=eu` | はい。ラベルが最も多いため、これが選ばれる |
| `account=globex` | いいえ。ラベルの値が異なる |

## 設計で prompt を宣言する

`Agent` 内の `SystemPrompt` でエージェントのベースライン system prompt
（`<service>.<agent>.system`、ロール `system`）を宣言し、`Agent` 内の `Prompt` で
エージェント所有の prompt（`<service>.<agent>.<name>`、デフォルトロール `user`）を
宣言し、`Service` 内の `Prompt` で複数のエージェントや非エージェントコードが
共有する prompt（`<service>.<name>`）を宣言します。

```go
var _ = Service("support", func() {
    Prompt("shared_safety", func() {
        Description("Shared safety rules")
        Role("system")
        Template("Never disclose internal credentials or personal data.")
    })

    Agent("assistant", "Answer refund questions", func() {
        SystemPrompt(func() {
            Description("Refund policy")
            Args(func() {
                Attribute("account_name", String)
                Attribute("refund_limit", Int)
                Required("account_name", "refund_limit")
            })
            Template("You help {{ .AccountName }} customers. " +
                "Approve refunds up to ${{ .RefundLimit }}. " +
                `{{ render "support.shared_safety" }}`)
        })
    })
})
```

テンプレートは生成された Go の引数構造体（`SystemPromptArgs` または
`<Name>PromptArgs`）に対して描画されるため、テンプレート式には生成された Go の
正確なフィールド名（`{{ .AccountName }}`、`{{ .RefundLimit }}`）を使います。
`goa gen` はエージェントの prompt ヘルパーを
`gen/<service>/agents/<agent>/prompts.go`（`SystemPromptID`、`Prompt<Name>ID`、
`SystemPromptArgs`、`<Name>PromptArgs`、`PromptSpecSystem()`、
`PromptSpec<Name>()`、`PromptSpecs()`、`RegisterPrompts`、`RenderSystemPrompt`、
`Render<Name>Prompt`、`RenderSystemPromptWithRegistry`、
`Render<Name>PromptWithRegistry`）に出力し、サービスレベルの prompt ヘルパーを
`gen/<service>/prompts/prompts.go` に出力します。

## prompt を登録する

何かが prompt を描画する前に、ランタイムがその prompt のベースラインを知って
いる必要があります。

**エージェントの prompt** はエージェントと一緒に登録されます。
`AgentRegistration.PromptSpecs` はエージェントが所有する prompt を列挙し、
`Runtime.RegisterAgent` がそれらを処理します。

1. 何かを登録する前に、まず列挙されたすべての prompt を検査します。パースできない
   テンプレート、重複した ID、すでに登録済みの ID があると、呼び出し全体が失敗
   します。prompt が `ArgsType` を宣言している場合、宣言されていないフィールドを
   使うテンプレートも同様に失敗します。
2. エージェントをワークフローエンジンに登録します。
3. それが成功した場合にだけ、prompt を `Runtime.PromptRegistry` に追加します。

検査に失敗した prompt があると、エージェントがワークフローエンジンに届く前に
`RegisterAgent` が停止します。登録値を組み立てても副作用はありません。
`RegisterAgent` を呼ぶまで何も登録されません。

**サービス所有の prompt** は 1 つのエージェントではなくサービスに属するため、
複数のエージェントやエージェント以外のコードで共有できます。これらの
`PromptSpec.AgentID` は空で、生成されたサービスパッケージの `RegisterPrompts`
ヘルパー（または `Runtime.PromptRegistry.Register`）で `Runtime.PromptRegistry`
に登録します。

```go
if err := supportprompts.RegisterPrompts(rt.PromptRegistry); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
    Planner: myPlanner,
}); err != nil {
    return err
}
```

`NewAssistantRegistration(rt, cfg)` はレジストリを変更せずに生成された
`PromptSpecs()` スライスから `AgentRegistration.PromptSpecs` を設定し、
`RegisterAssistantAgent` が `rt.RegisterAgent(ctx, reg)` を呼び出します。

**手動で登録する prompt** は引き続き動作します。これまでどおり
`prompt.PromptSpec` を組み立てて `Runtime.PromptRegistry.Register` に渡します。
`ArgsType` が nil の spec は型なしデータを受け取るため、そのテンプレートは構文と
宣言された `Funcs` は検査されますが、構造体フィールド名は検査されません。

## prompt を描画し、使われたものを記録する

描画は、テキストと、それを組み立てるのに使ったすべての prompt バージョンの
リストを返します。このリストには `{{ render "<prompt-id>" . }}` で取り込まれた
prompt も、描画された順に含まれます。そのリストを、テキストを使うモデル
リクエストに付けます。

```go
content, err := assistant.RenderSystemPrompt(ctx, input.Agent, assistant.SystemPromptArgs{
    AccountName: "Acme",
    RefundLimit: 100,
})
if err != nil {
    return nil, err
}

system := &model.Message{
    Role:  model.ConversationRoleSystem,
    Parts: []model.Part{model.TextPart{Text: content.Text}},
}
resp, err := modelClient.Complete(ctx, &model.Request{
    Messages:   append([]*model.Message{system}, input.Messages...),
    PromptRefs: content.Refs,
})
```

`[]prompt.PromptRef{content.Ref}` ではなく `content.Refs` を使ってください。
`content.Ref` はトップレベルの prompt だけを指し、それが組み込んだ prompt は
含みません。

ランタイムは prompt バージョンを自動では付けません。各リクエストは、呼び出し元が
付けたリストを持ちます。プランナーが同じターンの 2 回のモデル呼び出しのために
分類用 prompt と別の回答用 prompt を描画する場合は、各リクエストにそれぞれの
描画結果の `Refs` を渡してください。`gen_ai.chat` クライアントスパンには、その
リクエストに付いた `gen_ai.prompt.ids`、`gen_ai.prompt.versions`、および
`goa_ai.prompt.refs`（`"<id>@<version>"`）が記録されます。

## ランタイムで prompt を変更する

override を保存すると、1 つのスコープで prompt のテキストが置き換わります。
ランタイムは何かを保存する前に新しいテンプレートを検査します。生成された prompt は
`Args` が宣言されている場合は `PromptSpec.ArgsType` を
`reflect.TypeFor[<Name>PromptArgs]()` に設定し、引数を受け取らない場合は
`reflect.TypeFor[struct{}]()` に設定するため、不明なフィールドを使うテンプレートは
後で描画のたびに失敗するのではなく、保存時に拒否されます。

```go
scope := prompt.Scope{
    Labels: map[string]string{"account": "acme"},
}
if err := rt.PromptRegistry.ValidateOverride(assistant.SystemPromptID, newTemplate); err != nil {
    return err
}
if err := rt.PromptRegistry.SetOverride(ctx, assistant.SystemPromptID, scope, newTemplate, map[string]string{
    "author": "ops@acme.com",
}); err != nil {
    return err
}
```

## override をリセットする

リセットは、ちょうど 1 つのスコープにある prompt の override を削除します。
その結果、次の描画は次に適用される override、またはベースラインに戻ります。

リセットは破壊的な操作です。

- その prompt について保存された override のうち、スコープが渡したスコープと
  完全に一致するもの（同じセッション ID と同じラベルで、多くも少なくもない）を
  すべて完全に削除します。
- より広いスコープやより狭いスコープを含め、他のスコープの override には
  影響しません。
- その後の `History` は、残っている override だけを返します。リセットは削除した
  ものの監査記録を残しません。必要な場合は、リセットする前に記録してください。

たとえば、`support.assistant.system` をスコープ `account=acme` でリセットすると、
ちょうど `account=acme` に保存された override が削除されます。
`account=acme, region=eu` の override は残り、ラベルなしの override も残ります。
`account=acme, region=eu` のリクエストは引き続きより狭い override を使います。
`account=acme` だけのリクエストは、今後ラベルなしの override を使います。

```go
if err := rt.PromptRegistry.ResetOverride(ctx, assistant.SystemPromptID, prompt.Scope{
    Labels: map[string]string{"account": "acme"},
}); err != nil {
    return err
}
```

## override の保存先

override は prompt ストアに保存され、そのストアは `runtime.WithPromptStore` で
ランタイムに渡します。Goa-AI には次の 2 つが含まれます。

- `prompt.NewInMemoryStore()`: テストと単一プロセスでの開発用
- `features/prompt/mongo` の MongoDB ストア: 本番用

prompt ストアがない場合、すべての描画はベースラインを使います。

### カスタムストア

カスタムの `prompt.Store` は、上で説明した完全一致スコープの破壊的な動作を持つ
`Reset` を実装します。ラベルのキーと値は単なるデータとして扱ってください。キーには
ドットが含まれることがあり、値は `$` で始まることがあります。

```go
type Store interface {
    Resolve(ctx context.Context, promptID Ident, scope Scope) (*Override, error)
    Set(ctx context.Context, promptID Ident, scope Scope, template string, metadata map[string]string) error
    Reset(ctx context.Context, promptID Ident, scope Scope) error
    History(ctx context.Context, promptID Ident) ([]*Override, error)
    List(ctx context.Context) ([]*Override, error)
}
```

アプリケーションでカスタムの `prompt.Store` を実装する場合は、
`Reset(ctx, promptID, scope)` を追加し、`PromptID`、`Scope.SessionID`、および
`Scope.Labels` が `scope` と完全に一致する override を完全に削除するようにします
（その完全一致スコープに override が存在しない場合は `nil` を返します）。
