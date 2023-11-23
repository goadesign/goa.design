+++
title = "プラグイン"
weight = 1

[menu.main]
name = "プラグイン"
parent = "extend"
+++

[Goa プラグイン](https://pkg.go.dev/github.com/goadesign/plugins) を使用すると、
新しい DSL と付随するジェネレーターを作成できます。
これらは最終的な生成物をレンダリングする前に実行されるため、
Goa コードジェネレーターによって公開されるテンプレートを変更でき、
それによって、任意の DSL から新しい種類の出力が生成されます。

[Goa プラグイン リポジトリ](https://github.com/goadesign/plugins) には、
Goa プラグインのパブリックセットが含まれています。
使用方法については、すべてのプラグインに含まれる README を参照してください。

## 独自プラグインの構築

いくつか異なることをおこなうために、プラグインを使用することが出来ます：

* プラグインは、既存の Goa DSL とともに使用される独自の DSL を追加できます。
  プラグイン DSL は、まったく異なるコードを生成したり、Goa コードジェネレーターによって生成された既存のコードを変更したりできます。

* プラグインは、[GenerateFunc](https://pkg.go.dev/goa.design/goa/v3/codegen#GenerateFunc) を提供して、
  Goa が生成したファイルを変更したり、新しいファイルを生成して最終的な生成物として返したりできます。

```go
type GenerateFunc func(genpkg string, roots []eval.Root, files []*File) ([]*File, error)
```

* プラグインは、コードが生成される前にデザインを変更するために、
  [PrepareFunc](https://pkg.go.dev/goa.design/goa/v3/codegen#PrepareFunc) を提供する場合があります。

```go
type PrepareFunc func(genpkg string, roots []eval.Root) error
```

プラグインは、
[RegisterPlugin](https://pkg.go.dev/goa.design/goa/v3/codegen#RegisterPlugin) 関数、
[RegisterPluginFirst](https://pkg.go.dev/goa.design/goa/v3/codegen#RegisterPluginFirst) 関数、
もしくは
[RegisterPluginLast](https://pkg.go.dev/goa.design/goa/v3/codegen#RegisterPlugin) 関数
を使用してプラグイン自身を登録します。

## CORS プラグイン

組み込みプラグインの1つは、[CORS プラグイン](https://github.com/goadesign/plugins/tree/master/cors) で、
このプラグインは HTTP エンドポイントで CORS プロパティを定義する機能を追加し、
対応する式を使用して API に対して CORS を実装するコードを生成します。

CORS プラグインは、以下に示すようにデザインで
使用できる独自の [DSL](https://pkg.go.dev/github.com/goadesign/plugins/cors/dsl) を追加します：

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
	Description("The calc service exposes public endpoints that defines CORS policy.")
	// CORS DSL を利用して CORS ポリシーを追加します
	cors.Origin("/.*localhost.*/", func() {
		cors.Headers("X-Shared-Secret")
		cors.Methods("GET", "POST")
		cors.Expose("X-Time", "X-Api-Version")
		cors.MaxAge(100)
		cors.Credentials()
	})

	Method("multiply", func() {
		Description("Multiply multiplies up the two integer parameters and returns the results.")
		Payload(func() {
			Attribute("a", Int, func() {
				Description("Left operand")
			})
			Attribute("b", Int, func() {
				Description("Right operand")
			})
			Required("a", "b")
		})
		Result(Int)
		HTTP(func() {
			GET("/multiply/{a}/{b}")
			Response(StatusOK)
		})
	})
})
```

上記のデザインでは、`calc` サービスで定義されたすべてのエンドポイントに CORS ポリシーを設定します。

CORS プラグインは、Goa `codegen` パッケージの `RegisterPlugin` 関数を呼び出すことで自身を登録し、
`GenerateFunc` 型を実装する独自のコード[ジェネレーター](https://pkg.go.dev/github.com/goadesign/plugins/cors#Generate)を追加します。

```go
package cors

import (
	"goa.design/goa/v3/codegen"
	"goa.design/goa/v3/eval"
)

func init() {
	codegen.RegisterPlugin("cors", "gen", nil, Generate)
}

// Generate は、プリフライトリクエストを処理するサーバーコードを生成し、
// 適切な CORS ヘッダーで HTTP レスポンスを更新します。
func Generate(genpkg string, roots []eval.Root, files []*codegen.File) ([]*codegen.File, error) {
...
}
```
```go
// cors/dsl/cors.go

package dsl

// CORSプラグインのコードジェネレーターを登録する
import _ "goa.design/plugins/v3/cors"
```

このジェネレーターは、`CORS` エンドポイントをマウントすることにより、
プリフライトリクエストを処理するために、生成された HTTP サーバーコードを変更します。

次に、Goa コード生成アルゴリズムは、生成された HTTP サーバーパッケージを変更する関数を呼び出します。
