+++
date = "2016-01-30T11:01:06-05:00"
title = "Vendoring goa Services"
weight = 5

[menu.main]
name = "goa サービスのベンダリング"
parent = "design"
+++

コード生成は、生成されたコードが他の依存関係との互換性を保つことを保証するために、生成ツールも一緒にベンダリングされる必要があるため、ベンダリングが少し複雑になります。
ここでの例は、[glide](https://github.com/Masterminds/glide) の YAML ファイルがどのように見えるかを抽出したものです：

```yaml
package: github.com/foo/bar
import:
- package: github.com/goadesign/goa
  vcs: git
  version: master
  subpackages:
  - client
  - design
  - design/apidsl
  - dslengine
  - goagen
  - middleware
- package: golang.org/x/tools
  subpackages:
  - go/ast/astutil
- package: gopkg.in/yaml.v2
```

`glide install` を実行すると、`vendor` ディレクトリに `goagen` がインストールされます：

```bash
cd ./vendor/github.com/goadesign/goa/goagen
go build
cd ../../../../../
```

常に同じジェネレータツールを生成し利用することができます：

```bash
./vendor/github.com/goadesign/goa/goagen/goagen app -d <import path to design package>
```

ベンダリングを使用してプロジェクトを bootstrap するには、次の手順を実行します（デザインがすでに作成されていることが前提です）：

1. `goagen bootstrap` コマンドで初期コードを生成する
2. `glide create` を実行すると、`glide.yaml` が生成される
3. `glide.yaml` を編集し、上記のエントリを追加する
4. `glide install` を実行する

`goagen` のソースを含む `vendor` ディレクトリがあり、それらをコンパイルし、上記で説明したようにツールを使用します。
`goa` を更新するような `glide update` の後にツールを再コンパイルするのを忘れないでください。

# ベンダリング・クライアント

もう一つ注意しなければならない問題は、ベンダリングされた goa を使用すると、`goagen` によって生成されたコード生成ツールが、ベンダリングされた goa を使用することになるということです。
これは `goagen` をベンダリングされていないデザインに対して起動する必要がなければ問題になりません（実際は良いことです）。
これは、たとえば、依存サービスのクライアントを生成しようとしている場合に発生する可能性があります。
この場合 ベンダリングされてないサービスの `design` パッケージがベンダリングされてない goa を利用することになります。
これは、"間違った" ` design` パッケージでデザインが初期化されることを意味します。

上記の問題があると、goagen は初期化されていないデザインを利用しようとしてエラーメッセージを出力すことになってしまいます
（`design.Design` 変数がベンダリングされた goa `design` パッケージでは nil であるため）。
この問題を解決する最良の方法は、依存する `デザイン` パッケージをベンダリングすることです（これはおそらく最初にやるべきことです）。

# コードベースの生成とベンダリング

ベンダリングへのもう1つのアプローチは、 `goagen` コマンドラインツールの代わりにプログラムでジェネレータを呼び出すことです。

あなたのリポジトリに小さな接着用のパッケージを書くことで、あなたの好みのベンダリング・ツールでインポート依存関係とベンダリングしているすべてをトレースすることができます。

その結果、バージョニングが簡素化され、ベンダリング・ユーティリティに依存関係が明示されます。

待ちきれない人のために、ここで簡潔なバージョンをお見せしましょう：

```
$ mkdir -p $GOPATH/src/github.com/your/pkg/design
$ cd !$
$ # Create your design in the `design` package
$ # Paste the content of `gen/main.go` below to `...github.com/your/pkg/gen/main.go`
$ go run gen/main.go      # generates all the things
$ govendor init           # creates the vendor/ dir
$ govendor add +e         # pull needed packages in
```

これで準備できました。
設計を調整しても、バージョンの競合を起こさずに、チームの全員がコードを決定的に再生成できます。

`goagen`のコード生成関数を呼び出す小さなパッケージを作ることでこれを行います：

```
cd $GOPATH/src/github.com/your/pkg
mkdir gen
```

こちらの内容を `gen/main.go` に入れます:

```
package main

import (
	_ "github.com/your/pkg/design"

	"github.com/goadesign/goa/design"
	"github.com/goadesign/goa/goagen/codegen"
	genapp "github.com/goadesign/goa/goagen/gen_app"
	genclient "github.com/goadesign/goa/goagen/gen_client"
	genjs "github.com/goadesign/goa/goagen/gen_js"
	genmain "github.com/goadesign/goa/goagen/gen_main"
	genschema "github.com/goadesign/goa/goagen/gen_schema"
	genswagger "github.com/goadesign/goa/goagen/gen_swagger"
)

func main() {
	codegen.ParseDSL()
	codegen.Run(
		&genmain.Generator{
			API:    design.Design,
			Target: "app",
		},
		&genswagger.Generator{
			API: design.Design,
		},
		&genapp.Generator{
			API:    design.Design,
			OutDir: "app",
			Target: "app",
			NoTest: true,
		},
		&genclient.Generator{
			API: design.Design,
		},
		&genschema.Generator{
			API: design.Design,
		},
		&genjs.Generator{
			API: design.Design,
		},
	)
}
```

不要なジェネレータがあれば `Run()` の呼び出しからを削除してください。

上記のコードは、すべての `goa` コード生成パッケージを適切にベンダリングします。

`govendor` （同様の方法であなたが望むどんなベンダリング・ツールでも使えます）では、これを簡単に行うことができます：

```
$ govendor init
$ govendor list
 e  github.com/dimfeld/httppath
 e  github.com/goadesign/goa/design
 e  github.com/goadesign/goa/design/apidsl
 e  github.com/goadesign/goa/dslengine
 e  github.com/goadesign/goa/goagen/codegen
 e  github.com/goadesign/goa/goagen/gen_app
 e  github.com/goadesign/goa/goagen/gen_client
 e  github.com/goadesign/goa/goagen/gen_js
 e  github.com/goadesign/goa/goagen/gen_main
 e  github.com/goadesign/goa/goagen/gen_schema
 e  github.com/goadesign/goa/goagen/gen_swagger
 e  github.com/goadesign/goa/goagen/utils
 e  github.com/goadesign/goa/version
 e  github.com/manveru/faker
 e  github.com/satori/go.uuid
 e  github.com/zach-klippenstein/goregen
 e  golang.org/x/tools/go/ast/astutil
 e  gopkg.in/yaml.v2
 l  github.com/your/pkg/design
pl  github.com/your/pkg/gen
```

もうひとつ設定をすると、次回以降コード生成が必要になったときにはベンダリングされるようになります：

```
$ govendor add +ext
$ wc -l vendor/vendor.json
181 vendor/vendor.json
```

これにより、選択したベンダリング・ツールを使用してコード生成パッケージをいつ変更するかを制御できます。

あなたが明示的に `goa` をアップグレードしない限り、今後の実行において、誰の計算機上でも、決定的に同じコードを生成します。

## コードを生成する

次のステップは、作成したデザインに基づいて実際にコードを生成することです。
`gen/main.go` を次のように実行してください：

```
$ cd $GOPATH/src/github.com/your/pkg
$ go run gen/main.go

...
swagger/swagger.json
...
app/contexts.go
...
tool/yourapi-cli/main.go
tool/cli/commands.go
...
client/client.go
...
schema/schema.json
...
js/client.js
```

そうしている間に、`your/pkg/main.go` の一番上に以下の行を書き加えます：

```
//go:generate go run gen/main.go
```

次回は `go generate` することだけ覚えておけばよくなります。
詳細については、[この記事](https://blog.golang.org/generate) を参照してください。

## _生成された_ コードの依存関係のベンダリング

一度コードを生成すると、より多くの依存関係が存在することがわかります：

```
$ govendor list
$ govendor list
 v  github.com/dimfeld/httppath
 v  github.com/goadesign/goa/design
 v  github.com/goadesign/goa/design/apidsl
 v  github.com/goadesign/goa/dslengine
 v  github.com/goadesign/goa/goagen/codegen
 v  github.com/goadesign/goa/goagen/gen_app
 v  github.com/goadesign/goa/goagen/gen_client
 v  github.com/goadesign/goa/goagen/gen_js
 v  github.com/goadesign/goa/goagen/gen_main
 v  github.com/goadesign/goa/goagen/gen_schema
 v  github.com/goadesign/goa/goagen/gen_swagger
 v  github.com/goadesign/goa/goagen/utils
 v  github.com/goadesign/goa/version
 v  github.com/manveru/faker
 v  github.com/satori/go.uuid
 v  github.com/zach-klippenstein/goregen
 v  golang.org/x/tools/go/ast/astutil
 v  gopkg.in/yaml.v2
 e  github.com/armon/go-metrics
 e  github.com/dimfeld/httppath
 e  github.com/dimfeld/httptreemux
 e  github.com/goadesign/goa
 e  github.com/goadesign/goa/client
 e  github.com/goadesign/goa/middleware
 e  github.com/goadesign/goa/uuid
 e  github.com/inconshreveable/mousetrap
 e  github.com/satori/go.uuid
 e  github.com/spf13/cobra
 e  github.com/spf13/pflag
 e  golang.org/x/net/context
 e  golang.org/x/net/websocket
pl  github.com/your/pkg
 l  github.com/your/pkg/app
 l  github.com/your/pkg/client
 l  github.com/your/pkg/design
pl  github.com/your/pkg/gen
 l  github.com/your/pkg/js
 l  github.com/your/pkg/tool/cli
 ```

外部の依存関係をどのように取得する必要があるのかを見てください（ `external`に` e`と記されています）。
goa サービスのランタイム機能を持つ `goadesign/goa` パッケージが含まれており、ビジネスロジックの記述に役立ちます。

それら全てをベンダリングします：

```
$ govendor add +e
$
```

これでよし！

コード生成パッケージがベンダリングされているだけでなく、`goa` やその依存関係、また独自の依存関係も含まれていることに注意してください。
