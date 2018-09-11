+++
date = "2016-04-07T11:01:06-05:00"
title = "goa をはじめる"
weight = 2

[menu.v1]
name = "はじめのガイド"
parent = "learn.v1"
+++

このガイドでは goa で完全なサービスを作成する方法について説明します。そのシンプルなサービスは [GitHub リポジトリ](https://github.com/goadesign/goa-cellar)にある[セラー](../cellar)のサンプルの小さなサブセットを実装します。このサービスはワインボトルを取り扱っています。より簡単に言えば、簡単な GET リクエストを通じて既存のワインボトルモデルを検索することができます。

# 前提条件

`goa` と `goagen` をインストールしてください。

```
go get -u github.com/goadesign/goa/...
```

# デザイン

goa サービスを作成するとき最初に行うことは goa デザイン言語を使用して API を記述することです。`$GOPATH/src/cellar` のように `$GOPATH/src` の下に新しい goa サービスのためのディレクトリを作成します。そのディレクトリに design サブディレクトリと `design/design.go` ファイルを作成し、次の内容を記述します。

```go
package design                                     // The convention consists of naming the design
                                                   // package "design"
import (
        . "github.com/goadesign/goa/design"        // Use . imports to enable the DSL
        . "github.com/goadesign/goa/design/apidsl"
)

var _ = API("cellar", func() {                     // API defines the microservice endpoint and
        Title("The virtual wine cellar")           // other global properties. There should be one
        Description("A simple goa service")        // and exactly one API definition appearing in
        Scheme("http")                             // the design.
        Host("localhost:8080")
})

var _ = Resource("bottle", func() {                // Resources group related API endpoints
        BasePath("/bottles")                       // together. They map to REST resources for REST
        DefaultMedia(BottleMedia)                  // services.

        Action("show", func() {                    // Actions define a single API endpoint together
                Description("Get bottle by id")    // with its path, parameters (both path
                Routing(GET("/:bottleID"))         // parameters and querystring values) and payload
                Params(func() {                    // (shape of the request body).
                        Param("bottleID", Integer, "Bottle ID")
                })
                Response(OK)                       // Responses define the shape and status code
                Response(NotFound)                 // of HTTP responses.
        })
})

// BottleMedia defines the media type used to render bottles.
var BottleMedia = MediaType("application/vnd.goa.example.bottle+json", func() {
        Description("A bottle of wine")
        Attributes(func() {                         // Attributes define the media type shape.
                Attribute("id", Integer, "Unique bottle ID")
                Attribute("href", String, "API href for making requests on the bottle")
                Attribute("name", String, "Name of wine")
                Required("id", "href", "name")
        })
        View("default", func() {                    // View defines a rendering of the media type.
                Attribute("id")                     // Media types may have multiple views and must
                Attribute("href")                   // have a "default" view.
                Attribute("name")
        })
})
```

これを分析してみましょう。

* `design` パッケージを定義し、匿名変数を使用して API を宣言すると、パッケージの init 関数も使用できます。パッケージの実際の名前は何でもかまいません。 `design` は単なる慣例です。

* API 関数は、 API の名前と、追加のプロパティを定義する無名関数の2つの引数をとり、 API を宣言します。このセラーの例では、タイトルと説明を使用します。

* Resource 関数は `bottle` リソースを宣言します。この関数は名前と無名関数も取ります。無名関数で定義されたプロパティには、リソースがサポートするすべてのアクションと、レスポンスでリソースを表示するために使用されるデフォルトのメディアタイプが含まれます。

* 各リソースアクションは、名前と無名関数の同じパターンに続く `Action` 関数を使用して宣言されます。アクションはリソース内で定義され、 HTTP メソッド、 URL 、パラメータ、ペイロード、レスポンス定義を含む特定の API エンドポイントを表します。パラメータは、 URL にワイルドカードを使用して定義することも、 URL に追加したクエリ文字列に対応させることもできます。ペイロードは要求本体のデータ構造を記述します (存在する場合) 。ここでは単一のアクション (`show`) を定義しますが、リソースは任意の数を定義できます。

* `Action` 関数はそのアクションのエンドポイント、パラメータ、ペイロード (この例では使用されていません) および応答を定義します。goa はすべての標準 HTTP ステータスコードのデフォルトレスポンステンプレートを定義します。レスポンステンプレートは、レスポンスの HTTP ステータスコード、そのメディアタイプ (レスポンスボディシェイプを記述します) 、および定義可能なヘッダを定義します。`ResponseTemplate` デザイン言語関数 (ここでは使用されていません) では、追加の応答テンプレートを定義したり、既存の応答テンプレートを上書きすることができます。

* 最後に、リソースのメディアタイプをグローバル変数として定義し、 OK レスポンスを宣言するときに参照することができます。メディアタイプには RFC 6838 で定義されている識別子があり、レスポンスボディの属性 (goa の JSON オブジェクトフィールド) が記述されています。

メディアタイプのデータ構造は、 `Attribute`  デザイン言語関数を使用して記述されます。この関数はデータ構造のフィールドの再帰的な定義を提供することを可能にします。各レベルでは、フィールドの名前とタイプ、および検証ルール (ここでは使用されていません) が定義されています。

[apidsl パッケージリファレンス](/reference/goa/design/apidsl/)には、すべての goa デザイン言語のキーワードが説明や使用例と共に記載されています。

# 実装

API の設計が完了したので、 `goagen` ツールを使用してすべての定型コードを生成することができます。このツールは生成ターゲットと Go デザインパッケージへのインポートパスを引数として取ります。ここでは新しいサービスを開始しているので `bootstrap` ターゲットを使用して完全な実装を生成します。`$GOPATH/src/cellar` の下にデザインパッケージを作成した場合、コマンドラインは次のようになります。

```bash
goagen bootstrap -d cellar/design
```

このツールは生成されたファイルの名前を出力します。デフォルトでは現在の作業ディレクトリにファイルが生成されます。リストは次のようになります。

```bash
app
app/contexts.go
app/controllers.go
app/hrefs.go
app/media_types.go
app/user_types.go
app/test
app/test/bottle.go
main.go
bottle.go
tool/cellar-cli
tool/cli
client
client
tool/cellar-cli/main.go
tool/cli/commands.go
client/client.go
client/bottle.go
client/datatypes.go
swagger
swagger/swagger.json
swagger/swagger.yaml
```

`goagen` がアプリケーション用の `main.go` とスケルトンコントローラ (`bottle.go`) を生成した方法に注目してください。

これらの 2 つのファイルは、新しい開発をブートストラップするためのもので、すでに存在する場合は再生成されません (再度ツールを実行し、`app` 、`client` 、`tool` 、および `swagger` のディレクトリだけが生成されるのに注目してください) 。この動作とその他の多くの側面はコマンドライン引数で設定することができます。詳しくは `goagen` のドキュメントを参照してください。

生成されたファイルの一覧に戻りましょう。

* `app` ディレクトリには低レベルの HTTP ルータをコードに貼り付ける生成コードが含まれています。
* `client` ディレクトリにはクライアント Go パッケージを実装する生成コードが含まれています。
* `tool` ディレクトリにはセラーサービスへの要求を行うために使用できる CLI ツールが含まれています。
* `swagger` ディレクトリには `JSON` と `YAML` 両方のフォーマットで API の swagger 仕様が含まれています。

上述のように、 `main.go` および `bottle.go` ファイルはそれぞれサービスのエントリポイントおよび bottle コントローラを実装するための開始点を提供します。 `app` パッケージのコンテンツを見てみましょう。

* `controllers.go` にはコントローラの interface 型の定義が含まれています。デザイン言語で定義されたリソースごとにそのようなインターフェイスが 1 つあります。このファイルには、これらのコントローラ interface の実装をサービスに「マウント」するコードも含まれています。コントローラの「マウント」の正確な意味は以下でさらに説明されます。

* `contexts.go` にはコンテキストデータ構造定義が含まれています。コンテキストは Martini の `martini.Context` 、 goji の `web.C` または echo の `echo.Context` と同様の役割を果たします。これはすべてのコントローラアクションの最初の引数として与えられ、リクエスト状態にアクセスしてレスポンスを書くためのヘルパメソッドを提供します。

* `hrefs.go` はリソースの href を構築するためのグローバル関数を提供します。リソースの href によって、レスポンスが関連リソースにリンクすることが可能になります。goa は、リソースの「標準的な」アクション (デフォルトでは `show` アクション) の要求パスを調べることによって、これらの href をどのように構築するかを知ります。追加情報については [Action](https://goa.design/v1/reference/goa/design/apidsl/#func-action-a-name-apidsl-action-a) デザイン言語関数を参照してください。

* `media_types.go` にはレスポンスを構築するためにリソースアクションによって使用されるメディアタイプのデータ構造が含まれています。デザインで定義されたビューごとに 1 つのそのようなデータ構造が生成されます。

* `user_types.go` には、[Type](https://goa.design/v1/reference/goa/design/apidsl/#func-type-a-name-apidsl-type-a) デザイン言語関数で定義されたデータ構造が含まれています。そのようなタイプはリクエストのペイロードおよびレスポンスのメディアタイプを定義するために使用することができます。

* `test/bottle.go` にはコントローラのコードをテストするのに便利なテストヘルパが含まれています。コントローラの入力を使ってアクションの実装を呼び出し、結果のメディアタイプを検証することができます。

`goagen` がその作業をしたので、あとは `bottle` コントローラの実装を提供するだけです。 `goagen` によって生成される型定義は次のとおりです。

```go
type BottleController interface {
        goa.Muxer
        Show(*ShowBottleContext) error
}
```

十分シンプルです... `app/contexts.go` にある `ShowBottleContext` の定義を見てみましょう。

```go
// ShowBottleContext provides the bottle show action context.
type ShowBottleContext struct {
        context.Context
        *goa.ResponseData
        *goa.RequestData
        BottleID int
}
```

コンテクストのデータ構造には、デザイン言語で指定された型の int として宣言されたボトルの ID が含まれています。また、未処理の基本リクエストおよび応答状態 (http.Request および http.ResponseWriter オブジェクトへのアクセスを含む) へのアクセスを与える匿名フィールドも含まれています。goa コンテクストのデータ構造はまた、golang の context.Context インタフェースを実装しており、デッドラインやキャンセル信号を、例えばリクエストの処理に関わる異なる goroutine に渡って送ることができます。

同じファイルでは、コンテキストのデータ構造上に 2 つのメソッドも定義されています。

```go
// OK sends a HTTP response with status code 200.
func (ctx *ShowBottleContext) OK(r *GoaExampleBottle) error {
        ctx.ResponseData.Header().Set("Content-Type", "application/vnd.goa.example.bottle")
        return ctx.Service.Send(ctx.Context, 200, r)
}

// NotFound sends a HTTP response with status code 404.
func (ctx *ShowBottleContext) NotFound() error {
        ctx.ResponseData.WriteHeader(404)
        return nil
}
```

goagen はまた `bottle.go` にコントローラの空の実装を生成しています。あとは私たちが実際の実装を提供するだけです。 `bottle.go` ファイルを開き、既存の `Show` メソッドを以下のように置き換えてください。

```go
// Show implements the "show" action of the "bottles" controller.
func (c *BottleController) Show(ctx *app.ShowBottleContext) error {
        if ctx.BottleID == 0 {
                // Emulate a missing record with ID 0
                return ctx.NotFound()
        }
        // Build the resource using the generated data structure
        bottle := app.GoaExampleBottle{
                ID:   ctx.BottleID,
                Name: fmt.Sprintf("Bottle #%d", ctx.BottleID),
                Href: app.BottleHref(ctx.BottleID),
        }

        // Let the generated code produce the HTTP response using the
        // media type described in the design (BottleMedia).
        return ctx.OK(&bottle)
}
```

アプリケーションをビルドして実行する前に main.go を見てみましょう。このファイルには、新しい goa サービスをインスタンス化し、デフォルトのミドルウェアを初期化し、 bottle コントローラをマウントし、 HTTP サーバーを実行する main のデフォルト実装が含まれています。

```go
func main() {
        // Create service
        service := goa.New("cellar")

        // Mount middleware
        service.Use(middleware.RequestID())
        service.Use(middleware.LogRequest(true))
        service.Use(middleware.ErrorHandler(service, true))
        service.Use(middleware.Recover())

        // Mount "bottle" controller
        c := NewBottleController(service)
        app.MountBottleController(service, c)

        // Start service
        if err := service.ListenAndServe(":8080"); err != nil {
                service.LogError("startup", "err", err)
        }
}
```

コントローラをサービスにマウントすると、すべてのコントローラアクションのエンドポイントがルータに登録されます。このコードでは、異なるアクションのルート間に矛盾がないことも確認しています。

サービスをコンパイルして実行します。

```bash
go build -o cellar
./cellar
```

これは次のようになります。

```bash
2016/04/10 16:20:37 [INFO] mount ctrl=Bottle action=Show route=GET /bottles/:bottleID
2016/04/10 16:20:37 [INFO] listen transport=http addr=:8080
```

これで curl を使ってアプリをテストすることができます。

```bash
curl -i localhost:8080/bottles/1

HTTP/1.1 200 OK
Content-Type: application/vnd.goa.example.bottle
Date: Sun, 10 Apr 2016 23:21:19 GMT
Content-Length: 48

{"href":"/bottles/1","id":1,"name":"Bottle #1"}
```

```
curl -i localhost:8080/bottles/0

HTTP/1.1 404 Not Found
Date: Sun, 10 Apr 2016 23:22:05 GMT
Content-Length: 0
Content-Type: text/plain; charset=utf-8
```

無効な (非整数の) ID を渡すことによって goagen によって生成されたバリデーションコードを実行することができます。

```bash
curl -i localhost:8080/bottles/n

HTTP/1.1 400 Bad Request
Content-Type: application/vnd.api.error+json
Date: Sun, 10 Apr 2016 23:22:46 GMT
Content-Length: 117

{"code":"invalid_request","status":400,"detail":"invalid value \"n\" for parameter \"bottleID\", must be a integer"}
```

curl を使用する代わりに、生成された CLI ツールを使用してサービスにリクエストを出してみます。最初に CLI クライアントをコンパイルしましょう。

```bash
cd tool/cellar-cli
go build -o cellar-cli
./cellar-cli
```

上記のコマンドは cli の使用法を表示します。 --help フラグはコンテキストヘルプも提供します。

```bash
./cellar-cli show bottle --help
```

上のコマンドは show bottle アクションを呼び出す方法を示しています。

```bash
./cellar-cli show bottle /bottles/1
2016/04/10 16:26:34 [INFO] started id=Vglid/lF GET=https://localhost:8080/bottles/1
2016/04/10 16:26:34 [INFO] completed id=Vglid/lF status=200 time=773.145µs
{"href":"/bottles/1","id":1,"name":"Bottle #1"}
```

それでおしまいです！はじめての goa サービス作成をおめでとうございます！

この基本的な例は goa ができることのほんの一部をカバーしています。マイクロサービスの設計方法と、それを実装するための goa パッケージとサブパッケージを活用する方法の詳細については、こちらを参照してください。

その他の例は [github](https://github.com/goadesign/examples) にあります。
