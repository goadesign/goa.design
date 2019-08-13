+++
title = "はじめのガイド"
weight = 2

[menu.main]
name = "はじめのガイド"
parent = "learn"
+++

このガイドでは Goa による完全なサービスの書き方についてひと通り説明します。
この単純なサービスは、[Github リポジトリ](https://github.com/goadesign/examples/tree/master/basic)にある基本的な例を実装しています。
説明では Go モジュールの使用を前提としていて、Go のバージョン1.11以降が必要です。 

## 前もって必要なこと

以下の説明はあなたのホームディレクトリ配下に新しいプロジェクトを作成します。
`$HOME` は他の場所に置き換えてもかまいません。
ただひとつ注意しなければならないのは、`GOPATH` 配下のディレクトリを選択した場合、環境変数 `GO111MODULE` を `on` に設定してモジュールが有効になっていることを確認する必要があるということです。

```bash
cd $HOME
mkdir -p calc/design
cd calc
go mod init calc
```

次に、Goa モジュールがインストールされていて最新のものであることを確認します：

```bash
go get -u goa.design/goa/v3
go get -u goa.design/goa/v3/...
```

これから作成するサービスは gRPC を利用するので、 `protoc` と`protoc-gen-go` の両方が必要になります。

* [releases](https://github.com/google/protobuf/releases) から `protoc` バイナリをダウンロードしてください。
* `protoc` がパスに含まれるか確認してください。
* Go の protoc プラグインをインストールします： `go get -u github.com/golang/protobuf/protoc-gen-go`

## デザイン

次のステップではサービス API を設計していきます。
このステップが明確であることが、Goa フレームワークの主な差別化要因のひとつです：
Goa を使用すると、実装上の問題とは無関係に自分の API について検討し、実装を作成する前にすべての利害関係者とその設計を確認できます。
これは、さまざまなチームがサービスを実装して使用する必要があるような大規模な組織では大きなメリットです。
ファイル `$HOME/calc/design/design.go` を開き、以下のコードを記述します：

```go
package design

import (
	. "goa.design/goa/v3/dsl"
)

var _ = API("calc", func() {
	Title("Calculator Service")
	Description("Service for adding numbers, a Goa teaser")
    Server("calc", func() {
        Host("localhost", func() {
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})

var _ = Service("calc", func() {
	Description("The calc service performs operations on numbers.")

	Method("add", func() {
		Payload(func() {
			Field(1, "a", Int, "Left operand")
			Field(2, "b", Int, "Right operand")
			Required("a", "b")
		})

		Result(Int)

		HTTP(func() {
			GET("/add/{a}/{b}")
		})

		GRPC(func() {
		})
	})

	Files("/openapi.json", "./gen/http/openapi.json")
})
```

このデザインは `calc` という名前のサービスを記述していて、ひとつのメソッド `add` が定義されています。
`add` は2つの整数からなるペイロードを入力として受け取り、ひとつの整数を返します。
このメソッドは、HTTP と gRPC のどちらのトランスポートの対応についても記述しています。
HTTP トランスポートは URL パラメータを使用して入力整数を伝送しますが、gRPC トランスポートはメッセージを使用します（これはデフォルトの動作であるため、デザインに明示されていません）。
HTTP トランスポートと gRPC トランスポートのいずれも、レスポンスにステータスコード `OK` を使用します（これもデフォルトです）。

最後に、デザインは HTTP ファイルサーバーのエンドポイントを公開します。これは生成された [OpenAPI](https://www.openapis.org/) 仕様を提供します 。

>上記の例は、Goa ができることのほんの一部です。
>もっと多くの例を [examples リポジトリ](https://github.com/goadesign/examples)で見つけることが出来るでしょう。
>[Goa DSL パッケージの GoDoc](https://godoc.org/goa.design/goa/dsl) では、すべての DSL キーワードをそれぞれの説明と使用例付きで一覧できます。

## コード生成

### `goa gen` コマンド
さて、サービスのための設計ができたので、`goa gen` コマンドを実行して定型コードを生成できます。
このコマンドは、デザインパッケージのインポートパスを引数として取ります。
また、出力ディレクトリのパスもオプションのフラグとして指定できます。
ここまでデザインは `calc` モジュール配下に作成してきたので、コマンドは次のようになります：


```bash
goa gen calc/design
```

このコマンドは、生成したファイルの名前を出力します。
ターゲットディレクトリが指定されていない場合、現在の作業ディレクトリにファイルを生成します。

生成されたファイルは次のようになります：

```
gen
├── calc
│   ├── client.go
│   ├── endpoints.go
│   └── service.go
├── grpc
│   ├── calc
│   │   ├── client
│   │   │   ├── cli.go
│   │   │   ├── client.go
│   │   │   ├── encode_decode.go
│   │   │   └── types.go
│   │   ├── pb
│   │   │   ├── calc.pb.go
│   │   │   └── calc.proto
│   │   └── server
│   │       ├── encode_decode.go
│   │       ├── server.go
│   │       └── types.go
│   └── cli
│       └── calc
│           └── cli.go
└── http
    ├── calc
    │   ├── client
    │   │   ├── cli.go
    │   │   ├── client.go
    │   │   ├── encode_decode.go
    │   │   ├── paths.go
    │   │   └── types.go
    │   └── server
    │       ├── encode_decode.go
    │       ├── paths.go
    │       ├── server.go
    │       └── types.go
    ├── cli
    │   └── calc
    │       └── cli.go
    ├── openapi.json
    └── openapi.yaml
```

`gen` ディレクトリはトランスポートに依存しないサービスコードを格納する `calc` サブディレクトリを含みます。
`endpoints.go` ファイルはトランスポートに依存しないサービスコードをトランスポート層に公開する [Goa エンドポイント](https://godoc.org/goa.design/goa#Endpoint) を作成します。

`grpc` ディレクトリには、 `protoc` [ツール](https://developers.google.com/protocol-buffers/docs/proto3#generating)の出力(pb/calc.pb.go) はもちろん、 `calc` gRPC サービスを記述するプロトコルバッファファイル (pb/calc.proto) も含まれています。
このディレクトリには、リクエストとレスポンスをエンコード・デコードするためのロジックとともに、protoc で生成された gRPC サーバーとクライアントのコードを接続するサーバーとクライアントのコードも含まれています。
最後に `cli` サブディレクトリはコマンドラインから gRPC リクエストをビルドするための CLI コードを含みます。 

`http` サブディレクトリは HTTP トランスポートを記述しており、リクエストとレスポンスをエンコード・デコードするロジックを持つサーバとクライアントのコード、コマンドラインから HTTP リクエストを構築する CLI コードを定義しています。
また、Open API 2.0 仕様のファイルも json と yaml 両方の形式で含まれています。

### `goa example` コマンド

さてここで、`goa example` コマンドを実行して、サービスの基本的な実装を生成することができます。
この実装には、goroutine を起動して HTTP と gRPC サーバーを起動するビルド可能なサーバーファイルと、
サーバーにリクエストを送ることができるクライアントファイルを伴います。

> 注：`goa gen` によって生成されたコードは編集できません。 このディレクトリは、コマンドが実行されるたびに（たとえば、デザインが変更された後に）完全に最初から再生成されます。
> これは、生成されたコードと生成されていないコードとの間のインターフェースをきれいに保ち、標準の Go 構成（つまり関数呼び出し）を使用するための仕様です。
> しかし `goa example` によって生成されたコードは **あなたの** コードです。
> 修正したり、テストを追加したりする必要があります。
> このコマンドは、自力の開発を助けるサービスの開始点を生成します - 特に、デザインが変更されたときに再実行することを意図して **いません** 。 
> 代わりに単にファイルを編集してください。


```bash
goa example calc/design
```

`goa example` コマンドは以下のファイルを生成します：

```

├── calc.go
├── cmd
│   ├── calc
│   │   ├── grpc.go
│   │   ├── http.go
│   │   └── main.go
│   └── calc-cli
│       ├── grpc.go
│       ├── http.go
│       └── main.go
```

`calc.go` はデザインに記述された `add` メソッドのダミー実装を含みます。
すべきこととして残されているのは、実際の実装を与え、ビルドし、サーバやクライアントを実行することだけです。

`calc.go` ファイルを開き、`Add` メソッドを実装します：

```go
func (s *calcsrvc) Add(ctx context.Context, p *calc.AddPayload) (res int, err error) {
  return p.A + p.B, nil
}
```

`goa example` コマンドは、デザインに記述されている任意の [Server DSL](https://godoc.org/goa.design/goa/dsl#Server) を使用して、ビルド可能なサーバーファイルとクライアントファイルを生成します。
デザインで指定されたそれぞれの `Server` DSL に対して `cmd` に一つのディレクトリを構築します。
ここではポート 8000 で HTTP リクエストを待ち受けるサーバー `calc` をひとつ定義しました。

## サービスをビルドし実行する

生成されたサーバーとクライアントのコードは次のようにビルドされ実行されます：

```bash
go build ./cmd/calc && go build ./cmd/calc-cli

# サーバーの実行

./calc
[calcapi] 21:35:36 HTTP "Add" mounted on GET /add/{a}/{b}
[calcapi] 21:35:36 HTTP "./gen/http/openapi.json" mounted on GET /openapi.json
[calcapi] 21:35:36 serving gRPC method calc.Calc/Add
[calcapi] 21:35:36 HTTP server listening on "localhost:8000"
[calcapi] 21:35:36 gRPC server listening on "localhost:8080"

# クライアントの実行

# HTTP サーバーと交信
$ ./calc-cli --url="http://localhost:8000" calc add --a 1 --b 2
3

# gRPC サーバーと交信
$ ./calc-cli --url="grpc://localhost:8080" calc add --message '{"a": 1, "b": 2}'
3
```

## まとめと次のステップ

Goa は、サーバとクライアントのコードおよびドキュメントを自動的に生成できる信頼できる唯一の情報源を記述することが可能で、そのことによって、サービス開発を加速することが出来ます。
API デザインに焦点を当てることができるため、実装を開始する前にチームが API を確認して合意することができ、堅牢でスケーラブルな開発プロセスが可能になります。
デザインが完成したら、生成されたコードは入力バリデーションを含むデータの Marshal、Unmarshal に関わるすべての面倒な作業を引き受けます（たとえば、整数以外の値を使用して calc サービスを呼び出してみてください）。

この例は Goa の基本にのみ触れています。デザインの<a href="../design/overview">デザイン概要</a> では他の多くの側面もカバーしています。
ぜひ他の[例](https://github.com/goadesign/examples)も見てみてください。
最後に、DSL パッケージ [GoDoc](https://godoc.org/goa.design/goa/dsl) には多くのコードスニペットが含まれており、デザインを作成する際の参考資料として役立ちます。
