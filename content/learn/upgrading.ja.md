+++
title = "Goa v1 や Goa v2 から v3 にアップグレードする"
weight = 3

[menu.main]
name = "アップグレード"
parent = "learn"
+++

# v2 から v3 にアップグレード

v2 と v3 は機能的には同等で、アップグレードはかなり簡単です。
v3 は Go モジュールのサポートが必要になるため、Go 1.11 以降が必要です。
v2 から v3 へのアップグレードは次のように簡単です：

* プロジェクトの Go モジュールを有効にします (env GO111MODULE=on go mod init)
* goa パッケージのインポートパスを goa.design/goa/v3/pkg にアップデートします
* Goa のパッケージ X を goa.design/goa/X から goa.design/goa/v3/X にアップデートします

これでおしまいです！
また、 v3 の goa ツールには後方互換性があり、v2 のデザインに対してコードを生成することができます。
v2 を GOPATH 内に保持しながら v3 を Go モジュールで利用することで、v2 と v3 の両方のプロジェクトで同時に作業することが可能になります。

# v1 から v2 もしくは v3 へのアップグレード

Goa v2 と v3 は、v1 に比べて多くの新機能と改善点をもたらします。特に、

* トランスポートとビジネスロジックの間の懸念が明確に分離されたモジュラーアーキテクチャ
* gRPC サポート
* 外部依存性の少なさ
* [Go kit](https://gokit.io) を含むより強力なプラグインシステム

一部の変更はかなり根本的なものであり、サービスの設計方法に影響を与えますが、基本原則と価値提案は同じままです：

* Go をベースとしたデザイン DSL によって提供される信頼できる唯一の情報源
* 与えられた DSL からドキュメント、サーバー、クライアントのコードを生成するコード生成ツール

本文書では、変更点について説明し、アップグレードの方法についていくつかのガイドラインを示します。

> 注：Goa v2 と v3 は機能的に同等です。唯一の違いは、v3 では Go モジュールを利用しサポートしているのに対し、v2 ではそうではないことです。
> このドキュメントの残りの部分は v3 で解説していますが、両方に適用できます。

## DSL の変更

Goa v3 では、下層のトランスポートとは無関係にサービス API を設計できるようにすることで、レイヤーの明確な分離を推進しています。
トランスポート固有の DSL は、各トランスポート（HTTP と gRPC）のマッピングを提供することを可能にします。
それで `Resources` と `Actions` の代わりに DSL は `Services` と `Methods` に重点を置いています。 
各メソッドはそれぞれの入力と出力を記述します。
トランスポート固有の DSL は、入力タイプが HTTP リクエストまたは入力される gRPC メッセージからどのように組み立てられているか、
また、出力タイプが HTTP レスポンスまたは出力される gRPC メッセージへどのように書き込まれるべきかを記述します。

> 注： v3 DSL は [godoc](https://godoc.org/goa.design/goa/dsl) に大々的に文書化されています。

### 型

型の記述に利用される DSL は、いくつかの違いはありますが、大部分は同じままです：

* `MediaType` は [ResultType](https://godoc.org/goa.design/goa/dsl#ResultType) になり、この DSL を利用して記述された型がメソッドの結果として利用されることが明確になりました。
   [Type](https://godoc.org/goa.design/goa/dsl#Type) DSL によって定義された標準の型も結果の型として使用できることに注意してください。 
* 結果の型はビューの定義を省略することがあります。結果の型がビューを定義していない場合は、すべての結果の型の属性をリストしたデフォルトビューが定義されます。
* 新しい [Field](https://godoc.org/goa.design/goa/dsl#Field) DSL は [Attribute](https://godoc.org/goa.design/goa/dsl#Attribute) と同等ですが、
  gRPC のフィールドナンバーに対応するインデックスを指定することが可能です。
* `HashOf` は [MapOf](https://godoc.org/goa.design/goa/dsl#MapOf) になりました。Go 開発者にはより直感的になりました。
* データのバイナリレイアウトをより正確に記述するために、新しい基本型が導入されました：
  [Int](https://godoc.org/goa.design/goa/dsl#Int),
  [Int32](https://godoc.org/goa.design/goa/dsl#Int32),
  [Int64](https://godoc.org/goa.design/goa/dsl#Int64),
  [UInt](https://godoc.org/goa.design/goa/dsl#UInt),
  [UInt32](https://godoc.org/goa.design/goa/dsl#UInt32),
  [UInt64](https://godoc.org/goa.design/goa/dsl#UInt64),
  [Float32](https://godoc.org/goa.design/goa/dsl#Float32),
  [Float64](https://godoc.org/goa.design/goa/dsl#Float64),
  [Bytes](https://godoc.org/goa.design/goa/dsl#Bytes)
* [String](https://godoc.org/goa.design/goa/dsl#String) と対応する [Format](https://godoc.org/goa.design/goa/dsl#Format) バリデーションがあるので、
  `DateTime` と `UUID` は廃止されました。

#### 例

v1 の MediaType：

```go
var Person = MediaType("application/vnd.goa.person", func() {
	Description("A person")
	Attributes(func() {
		Attribute("name", String, "Name of person")
		Attribute("age", Integer, "Age of person")
		Required("name")
	})
	View("default", func() {  // View defines a rendering of the media type.
		Attribute("name") // Media types may have multiple views and must
		Attribute("age")  // have a "default" view.
	})
})
```

対応する v3 の ResultType：

```go
var Person = ResultType("application/vnd.goa.person", func() {
	Description("A person")
	Attributes(func() {
		Attribute("name", String, "Name of person")
		Attribute("age", Int, "Age of person")
		Required("name")
	})
})
```

対応する v3 の ResutlType （フィールドインデックスを明示）：

```go
var Person = ResultType("application/vnd.goa.person", func() {
	Description("A person")
	Attributes(func() {
		Field(1, "name", String, "Name of person")
		Field(2, "age", Int, "Age of person")
		Required("name")
	})
})
```

### API

[API](https://godoc.org/goa.design/goa/dsl#API) DSL に次のような変更が加えられました：

* `Host`, `Scheme` ならびに `BasePath` DSL は [Server](https://godoc.org/goa.design/goa/dsl#Server) に置き換えられます。
* [Server](https://godoc.org/goa.design/goa/dsl#Server) DSL を使用するとさまざまな環境のサーバプロパティを定義できます。
  各サーバは、サーバがホストするサービスをリストして、1つのデザインで複数のサーバーの定義を可能にします。
* `Origin` は [CORS プラグイン](https://github.com/goadesign/plugins/tree/v3/cors)の一部として実装されました。 
* `ResponseTemplate` と `Trait` は廃止になりました。

#### Example

v1 の API：

```go
var _ = API("cellar", func() {
	Title("Cellar Service")
	Description("HTTP service for managing your wine cellar")
	Scheme("http")
	Host("localhost:8080")
	BasePath("/cellar")
})
```

対応する v3 の API：

```go
var _ = API("cellar", func() {
	Title("Cellar Service")
	Description("HTTP service for managing your wine cellar")
	Server("app", func() {
		Host("localhost", func() {
			URI("http://localhost:8080/cellar")
		})
	})
})
```

対応する v3 の API （複数サーバー）:

```go
var _ = API("cellar", func() {
	Title("Cellar Service")
	Description("HTTP service for managing your wine cellar")
	Server("app", func() {
		Description("App server hosts the storage and sommelier services.")
		Services("sommelier", "storage")
		Host("localhost", func() {
			Description("default host")
			URI("http://localhost:8080/cellar")
		})
	})
	Server("swagger", func() {
		Description("Swagger server hosts the service OpenAPI specification.")
		Services("swagger")
		Host("localhost", func() {
			Description("default host")
			URI("http://localhost:8088/swagger")
		})
	})
})
```

### サービス

`Resource` 関数は [Service](https://godoc.org/goa.design/goa/dsl#Service) になりました。 
この DSL は現在、トランスポートに関わらないセクションとトランスポート固有の DSL とで構成されています。
トランスポートに関わらないセクションはすべてのサービスメソッドによって返される可能性のあるエラーを列挙しています。
トランスポート固有のセクションは、これらのエラーを HTTP ステータスコードまたは gRPC レスポンスコードにマッピングします。

* `BasePath` は [Path](https://godoc.org/goa.design/goa/dsl#Path) と呼ばれるようになりました。[HTTP](https://godoc.org/goa.design/goa/dsl#HTTP) DSL に現れます。
* `CanonicalActionName` は [CanonicalMethod](https://godoc.org/goa.design/goa/dsl#CanonicalMethod) と呼ばれるようになりました。[HTTP](https://godoc.org/goa.design/goa/dsl#HTTP) DSL に現れます。
* `Response` は [Error](https://godoc.org/goa.design/goa/dsl#Error) に置き換えられました。
* `Origin` は [CORS プラグイン](https://github.com/goadesign/plugins/tree/v3/cors)の一部として実装されました。 
* `DefaultMedia` は廃止されました。

#### 例

v1 のデザイン：

```go
	Resource("bottle", func() {
		Description("A wine bottle")
		BasePath("/bottles")
		Parent("account")
		CanonicalActionName("get")

		Response(Unauthorized, ErrorMedia)
		Response(BadRequest, ErrorMedia)
		// ... Actions
	})
```

同等な v3 のデザイン：

```go
	Service("bottle", func() {
		Description("A wine bottle")
		Error("Unauthorized")
		Error("BadRequest")

		HTTP(func() {
			Path("/bottles")
			Parent("account")
			CanonicalMethod("get")
		})
		// ... Methods
	})
```

### メソッド

`Action` 関数は [Method](https://godoc.org/goa.design/goa/dsl#Method) で置き換えられました。 
サービスと同様に、DSL はトランスポートに関わらないセクションとトランスポート固有の DSL で構成されます。
トランスポートに関わらないセクションでは、ペイロードと結果の型、およびサービスレベルでまだ定義されていない、考えられるメソッド固有のすべてのエラーを定義します。
トランスポート固有の DSL は、ペイロードと結果の型の属性を HTTPヘッダー、ボディなどのトランスポート固有の構造にマッピングします。

* v1 に存在する DSL のほとんどは HTTP 特有のものなので、[HTTP](https://godoc.org/goa.design/goa/dsl#HTTP) DSL に移動しました。
* [Param](https://godoc.org/goa.design/goa/dsl#Param) と [Header](https://godoc.org/goa.design/goa/dsl#Header) 関数は、
  メソッドペイロードや結果の型に対応するの属性の名前を列挙するだけですみます。
* エラーレスポンスは [Error](https://godoc.org/goa.design/goa/dsl#Error) DSL を利用するようになりました。
* HTTP パスパラメータはコロンの代わりに中括弧を使って定義されるようになりました： `/foo/:id` の代わりに `/foo/{id}` と記述します。

入力と出力の対応は、

v1 Action のデザイン例：

```go
	Action("update", func() {
		Description("Change account name")
		Routing(
			PUT("/:accountID"),
		)
		Params(func() {
			Param("accountID", Integer, "Account ID")
		})
		Payload(func() {
			Attribute("name", String, "Account name")
			Required("name")
		})
		Response(NoContent)
		Response(NotFound)
		Response(BadRequest, ErrorMedia)
	})
```

同等な v3 のデザイン：

```go
	Method("update", func() {
		Description("Change account name")
		Payload(func() {
			Attribute("accountID", Int, "Account ID")
			Attribute("name", String, "Account name")
			Required("name")
		})
		Result(Empty)
		Error("NotFound")
		Error("BadRequest")

		HTTP(func() {
			PUT("/{accountID}")
		})
	})
```
