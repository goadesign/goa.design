+++
date = "2016-01-30T11:01:06-05:00"
title = "goagen：goa のツール"
weight = 2

[menu.main]
name = "goagen"
parent = "implement"
+++

## コード生成ツール

`goagen` は、goa デザインパッケージからさまざまなアーティファクト（中間生成物）を生成するツールです。

次のようにインストールします：

```bash
go install github.com/goadesign/goa/goagen
```

それぞれのタイプのアーティファクトは、独自のフラグセットを公開する `goagen` コマンドに関連付けられています。
内部的には、これらのコマンドは、アーティファクトを生成するロジックを含む"ジェネレータ"にマップされます。
これは次のように動作します：

1. `goagen` はコマンドラインを解析して、必要な出力のタイプを判断し、適切なジェネレータを呼び出す。
2. ジェネレータは、最終出力を生成するツールのコードを一時ディレクトリに書き込む。
3. デザインパッケージとツールコードで構成されるツールは、一時ディレクトリでコンパイルされる。
4. このツールが実行され、最終的な出力を書き込むためにデザインのデータ構造をたどる。

Each generator is exposed via a command of the `goagen` tool, `goagen --help` lists all the available
commands. These are:

* [`app`](#gen_app): コントローラー、コンテキスト、メディアタイプ、ユーザータイプなどのサービス定型コードを生成します。
* [`main`](#gen_main): デフォルトの `main` と同様に、リソースコントローラごとにスケルトンファイルを生成します。
* [`client`](#gen_client): API クライアントの Go パッケージとツールを生成します。
* [`js`](#gen_js): JavaScript APIクライアントを生成します。
* [`swagger`](#gen_swagger): API の Swagger 仕様書を生成します。
* [`schema`](#gen_schema): API の Hyper-schema JSON を生成します。
* [`gen`](#gen_gen): サードパーティ製のジェネレーターを起動します。
* `bootstrap`: `app`、`main`、`client`、`swagger` の各ジェネレータを呼び出します。

## goagen での作業： Scaffold（足場） vs. 生成されるコード

デザインが発展するにつれ、`goagen` を何度も実行する必要があるので **Scaffold（足場）** と **生成された** コードとの区別を理解することが重要になってきます。

`main` コマンドによって生成された Scaffold コードは、すぐに開始する方法として一度生成されます。 このコードは、編集、テストされ、手動で書かれた他のファイル同様一般的な処理が行われることを意味します。`goagen` は Scaffold ファイルがすでに存在する場合には上書きしません。 `client` コマンドによって生成されるクライアントツールの `main` パッケージも Scaffold です。

他のすべてのコマンドの出力（および `client` コマンドの `main` パッケージを除く出力）から構成される生成されたアーティファクトは、編集できませし、すべきではありません。アーティファクトは `goagen` が実行されるたびに、一から作り直されます。
それらがインポートされ、公開された関数と他の Go のパッケージと同様のデータ構造を消費して生成された Go パッケージを、ユーザーコードは利用します。

## 共通のフラグ

次のフラグは、すべてのgoagenコマンドに適用できます：

* `--design|-d=DESIGN` は、Go パッケージパスをサービスのデザインパッケージとして定義します。
* `--out|-o=OUT` は、ファイルを生成する場所を指定します。デフォルトは現在のディレクトリです。
* `--debug` は、`goagen` のデバッグを可能にします。 これにより、`goagen` は一時ファイルの内容を出力し、それらを残します。
* `--help` は、コンテキスト・ヘルプを表示します。

## <a name="gen_app"></a> コンテキストとコントローラ：`goagen app`

`app` がおそらく最も重要なコマンドです。
これは、goa サービスを支えるためのすべてのコードを生成します。
このコマンドは、テストヘルパを含む `test` サブパッケージも生成します。
テストヘルパは、コントローラのアクションとビューごとに1つずつ生成されます。
これらのテスト・ヘルパーを使用すると、管理された値で呼び出して返されたメディアタイプを検証するよう実装することで、アクションを簡単にテストできます。

このコマンドはいくつかの追加フラグをサポートしています：

* `--pkg=app` は、生成されたGoパッケージの名前を指定します。デフォルトはappです。これは、生成された Go ファイルを格納するために作成されるサブディレクトリの名前でもあります。
* `--notest` は、テストヘルパーの生成を止めます。

このコマンドは毎回既存のディレクトリを削除して同じ名前で再作成します。
それは、これらのファイルは決して編集されるべきではないという考えに基づいています。


## <a name="gen_main"></a> Scaffolding（足場）：`goagen main`

`main` コマンドは、デザイン・パッケージに定義されている各リソースコントローラのデフォルトの（空の）実装と同様に、デフォルトの`main.go` を生成することによって、新しい goa サービスをブートストラップするのに役立ちます。
デフォルトでは、このコマンドは出力ディレクトリに生成されるファイルが存在しない場合にのみファイルを生成します。
このコマンドは、追加のフラグを受け取ります：

* `--force` は、同じ名前のファイルがすでに存在していてもファイルを生成させます。

## <a name="gen_client"></a> クライアント・パッケージとツール：`goagen client`

`client` コマンドは、API クライアントパッケージと CLI ツールの両方を生成します。
クライアント・パッケージは、各リソースアクションに対して1つのメソッドを公開した `Client` オブジェクトを実装します。
また、対応する HTTP リクエストオブジェクトを、送信せずに、作成するメソッドも公開しています。
生成された CLI ツールのコードは、パッケージを利用してサービスの API リクエストを作成します。

`Client` オブジェクトは、アクションに対してセキュリティが有効になっている場合（アクション DSL がセキュリティ機能を使用する場合）、要求を送信する前に呼び出されるリクエストの認証方法を使用するように設定されています。
認証方法は、たとえば、認証ヘッダーを含めるようにリクエストを変更します。
goaには、
[Basic 認証](https://godoc.org/github.com/goadesign/goa/client#BasicSigner)、
[JWT 認証](https://godoc.org/github.com/goadesign/goa/client/#JWTSigner)、
[API キー](https://godoc.org/github.com/goadesign/goa/client/#APIKeySigner)、
[OAuth2](https://godoc.org/github.com/goadesign/goa/client#OAuth2Signer) のサブセットを実装する認証方法が付属しています。

## <a name="gen_js"></a> JavaScript：`goagen js`

`js` コマンドは、クライアント側とサーバー側の両方のアプリケーションに適した JavaScript API クライアントを生成します。
生成されたコードは、匿名の AMD モジュールを定義し、実際のHTTPリクエストを作成するために [axios](https://github.com/mzabriskie/axios) の promise ベースの JavaScript ライブラリに依存しています。

生成されたモジュールは `axios` クライアントをラップし、API 固有の関数を追加します。たとえば：
The generated module wraps the `axios` client and adds API specific functions, for example:

```javascript
// List all bottles in account optionally filtering by year
// path is the request path, the format is "/cellar/accounts/:accountID/bottles"
// years is used to build the request query string.
// config is an optional object to be merged into the config built by the function prior to making the request.
// The content of the config object is described here: https://github.com/mzabriskie/axios#request-api
// This function returns a promise which raises an error if the HTTP response is a 4xx or 5xx.
client.listBottle = function (path, years, config) {
        cfg = {
                timeout: timeout,
                url: urlPrefix + path,
                method: 'get',
                params: {
                        years: years
                },
                responseType: 'json'
        };
        if (config) {
                cfg = utils.merge(cfg, config);
        }
        return client(cfg);
}
```

生成されたクライアントモジュールは、`requirejs` を使用してロードできます：

```javascript
requirejs.config({
        paths: {
                axios: '/js/axios.min',
                client: '/js/client'
        }
});
requirejs(['client'], function (client) {
        client().listBottle ("/cellar/accounts/440/bottles", 317)
                .then(function (resp) {
                        // All good, use resp
                })
                .catch(function (resp) {
                        // Woops, request failed or returned 4xx or 5xx.
                });
});
```

上記のコードでは、生成されたファイル `client.js` と `axios.min.js` の両方が `/js` から提供されているものと仮定しています。
promise に返される `resp` の値は次のフィールドを持つオブジェクトです：

```javascript
{
        // `data` is the response that was provided by the server
        data: {},

        // `status` is the HTTP status code from the server response
        status: 200,

        // `statusText` is the HTTP status message from the server response
        statusText: 'OK',

        // `headers` is the headers that the server responded with
        headers: {},

        // `config` is the config that was provided to `axios` for the request
        config: {}
}
```

また、ジェネレータは、JavaScript をすばやくテストするために サンプル HTML とgoa サービスにマウントできるコントローラを生成します。
サービスのメインで `js` Go パッケージをインポートし、コントローラをマウントするだけです。
サンプル HTML は `/js` の下で提供されるので、このパスをブラウザにロードすると、生成された JavaScript がトリガーされます。

## <a name="gen_swagger"></a> Swagger：`goagen swagger`

`swagger` コマンドは、API の [Swagger](http://swagger.io) 仕様を生成します。
コマンドは追加のフラグを受け付けません。 Swagger JSON とYAML の両方を生成します。
生成されたファイルは、デザインの [Files](http://goa.design/reference/goa/design/apidsl/#func-files-a-name-apidsl-files-a) で定義されたファイルサーバーを使用して API 自体から提供できます。


## <a name="gen_schema"></a> JSON Schema：`goagen schema`

`schema` コマンドは、API を表現する [Heroku ライク](https://blog.heroku.com/archives/2014/1/8/json_schema_for_heroku_platform_api) な JSON ハイパースキーマを生成します。
goa サービスにマウントして `/schema.json` の下でそれを提供できるように JSON とコントローラの両方を生成します。

## <a name="gen_gen"></a> プラグイン：`goagen gen`

`gen` コマンドを使用すると、`goagen` プラグインを呼び出すことができます。 このコマンドは、1つのフラグを受け取ります：

* `--pkg-path=PKG-PATH` は、プラグインパッケージへの Go パッケージのインポートパスを指定します。

goa プラグインの詳細については、[ジェネレータプラグイン](/extend/generators)のセクションを参照してください。

