---
nav_group: guides
title: "プロンプト管理"
linkTitle: "プロンプト管理"
weight: 28
description: "prompt を設計で宣言し、型付き引数で描画し、ランタイムで 1 つのスコープに限って変更し、各モデルリクエストをどの prompt バージョンで組み立てたかを確認します。"
llm_optimized: true
---

<!-- PENDING(signatures): this draft describes contracts already settled in
review. Every block marked PENDING(signatures) waits for the reviewed goa-ai
prompt API; do not publish while any marker remains. -->

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

## 概念 {#concepts}

**ベースライン prompt。** 設計で宣言されたとおりの prompt です。ID（例:
`support.system`）、ロール（`system`、`user`、`tool`、`synthesis` のいずれか）、
テンプレートテキスト、テンプレートが使えるフィールドから成ります。ランタイムは
各ベースラインを 1 回だけ登録し、登録済みのベースラインは変わりません。
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

この選択は決定的です。同じ瞬間に保存された override 同士でも、毎回同じ 1 つに
決まります。

適用される override がない場合、ランタイムはベースラインを描画します。

たとえば、`support.system` に次の override が保存されているとします。

| Override のスコープ | セッション `s-42`、`account=acme`、`region=eu` のリクエストに適用されるか |
| --- | --- |
| セッションなし、ラベルなし | はい |
| `account=acme` | はい |
| `account=acme`, `region=eu` | はい。ラベルが最も多いため、これが選ばれる |
| `account=globex` | いいえ。ラベルの値が異なる |

## 設計で prompt を宣言する

<!-- PENDING(signatures): Prompt / SystemPrompt / Args DSL, agent-level and
service-level placement, and the exact generated names. Arguments are rendered
from the generated Go struct, so templates use exact generated Go field names. -->

## prompt を登録する

何かが prompt を描画する前に、ランタイムがその prompt のベースラインを知って
いる必要があります。

**エージェントの prompt** はエージェントと一緒に登録されます。
`AgentRegistration.PromptSpecs` はエージェントが所有する prompt を列挙し、
`Runtime.RegisterAgent` がそれらを処理します。

1. 何かを登録する前に、まず列挙されたすべての prompt を検査します。パースできない
   テンプレート、重複した ID、すでに登録済みの ID があると、呼び出し全体が失敗
   します。prompt がフィールドを宣言している場合、宣言されていないフィールドを
   使うテンプレートも同様に失敗します。
2. エージェントをワークフローエンジンに登録します。
3. それが成功した場合にだけ、prompt を `Runtime.PromptRegistry` に追加します。

検査に失敗した prompt があると、エージェントがワークフローエンジンに届く前に
`RegisterAgent` が停止します。登録値を組み立てても副作用はありません。
`RegisterAgent` を呼ぶまで何も登録されません。

**サービス所有の prompt** は 1 つのエージェントではなくサービスに属するため、
複数のエージェントやエージェント以外のコードで共有できます。これらの
`PromptSpec.AgentID` は空で、`Runtime.PromptRegistry.Register` で直接登録します。

<!-- PENDING(signatures): the generated agent registration that fills
PromptSpecs and the generated service registration function. -->

**手動で登録する prompt** は引き続き動作します。これまでどおり
`prompt.PromptSpec` を組み立てて `Runtime.PromptRegistry.Register` に渡します。
`Fields` を持たない spec はフィールドを宣言しないため、そのテンプレートは構文は
検査されますが、フィールド名は検査されません。

## prompt を描画し、使われたものを記録する

描画は、テキストと、それを組み立てるのに使ったすべての prompt バージョンの
リストを返します。このリストには `{{ render "<prompt-id>" . }}` で取り込まれた
prompt も、描画された順に含まれます。そのリストを、テキストを使うモデル
リクエストに付けます。

<!-- PENDING(signatures): replace with the generated typed render helper once
its signature is final. -->

```go
content, err := input.Agent.RenderPrompt(ctx, "support.system", args)
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
描画結果の `Refs` を渡してください。モデル呼び出しのトレーススパンには、その
リクエストに付いた prompt ID とバージョンが記録されます。

<!-- PENDING(signatures): exact span attribute names. -->

## ランタイムで prompt を変更する

override を保存すると、1 つのスコープで prompt のテキストが置き換わります。
ランタイムは何かを保存する前に新しいテンプレートを検査します。フィールドを宣言
している prompt では、不明なフィールドを使うテンプレートは、後で描画のたびに
失敗するのではなく、保存時に拒否されます。

<!-- PENDING(signatures): state how generated prompts, including prompts with
no arguments, declare their fields. -->

<!-- PENDING(signatures): SetOverride / ValidateOverride signatures and return
values. -->

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

たとえば、`support.system` をスコープ `account=acme` でリセットすると、ちょうど
`account=acme` に保存された override が削除されます。`account=acme, region=eu`
の override は残り、ラベルなしの override も残ります。
`account=acme, region=eu` のリクエストは引き続きより狭い override を使います。
`account=acme` だけのリクエストは、今後ラベルなしの override を使います。

<!-- PENDING(signatures): Registry.ResetOverride / Store.Reset call. -->

## override の保存先

override は prompt ストアに保存され、そのストアは `runtime.WithPromptStore` で
ランタイムに渡します。Goa-AI には次の 2 つが含まれます。

- `prompt.NewInMemoryStore()`: テストと単一プロセスでの開発用
- `features/prompt/mongo` の MongoDB ストア: 本番用

prompt ストアがない場合、すべての描画はベースラインを使います。

### カスタムストア

カスタムの `prompt.Store` は `Reset` も実装するようになり、上で説明した完全一致
スコープの破壊的な動作を持ちます。ラベルのキーと値は単なるデータとして扱って
ください。キーにはドットが含まれることがあり、値は `$` で始まることがあります。

<!-- PENDING(signatures): final Store interface listing and migration note for
external implementers. -->
