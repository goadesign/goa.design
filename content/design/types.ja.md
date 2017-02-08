+++
date = "2016-04-20T11:01:06-05:00"
title = "Working with Data Types"
weight = 2

[menu.main]
name = "データ型を扱う"
parent = "design"
+++

goa DSL の重要な側面として、タイプがどのように定義され使用されるかがあります。
[概要](/design/overview)では、タイプとメディアタイプの基本的な働きを取り上げました。
この文書では一歩戻って、DSL の原理について説明していきます。

データ構造は、[Attribute](http://goa.design/reference/goa/design/apidsl/#func-attribute-a-name-apidsl-attribute-a) 関数またはそのエイリアス（`Member` や ` Header`, `Param`）を使用してデザインに記述されています。
この記述は絶対的に存在します。つまり、指定された言語 （例えば、`Go`）やテクノロジーに関連しないものです。
これにより、`Go`のコード、JSONスキーマ、Swagger、あるいは他の言語（JavaScriptクライアントなど）へのバインディングにいたるまで、多くの出力を生成することができます。
デザイン言語には、[Overview](/design/overview) にリストされているいくつかのプリミティブ型が含まれていますが、[Type](http://goa.design/reference/goa/design/apidsl/#func-type-a-name-apidsl-type-a) 関数を使用して任意のデータ構造を再帰的に記述することができます。

## リクエスト・ペイロード

このように定義されたタイプの主な利用用途は、与えられたアクションのリクエスト・ペイロードを記述することです。
リクエスト・ペイロードはリクエスト・ボディの形を特徴付けます。
`goagen` はその記述を利用して、アクション・メソッドがそのリクエスト・コンテキストとして受け取るのに対応する `Go` の構造体を生成します。
ペイロードは、次のようにインラインで定義できます：

```go
Action("create", func() {
	Routing(POST(""))
	Payload(func() {
		Member("name")
	})
	Response(Created, "/accounts/[0-9]+")
})
```

もしくは事前にタイプを定義しておくことも可能です：

```go
var CreatePayload = Type("CreatePayload", func() {
	Attribute("name")
})

Action("create", func() {
	Routing(POST(""))
	Payload(CreatePayload)
	Response(Created, "/accounts/[0-9]+")
})
```

前者の記法は、ジェネレータによって内部で使用される匿名のタイプを作成することになります。
DSLが再帰的であることを思い出してください。上記の例では、`name` Attribute のタイプが指定されておらず、デフォルト設定の`String`が設定されています。
しかし、インラインもしくは事前に定義されたデータ構造を含むその他のタイプを使用することもできます：

```go
Action("create", func() {
	Routing(POST(""))
	Payload(func() {
		Member("address", func() {
			Attribute("street")
			Attribute("number", Integer)
		})
	})
	Response(Created, "/accounts/[0-9]+")
})
```

もしくは：

```go
Action("create", func() {
	Routing(POST(""))
	Payload(func() {
		Member("name", Address) // where Address is a predefined type
	})
	Response(Created, "/accounts/[0-9]+")
})
```

`Attribute` が利用されている所ならどこでも同様の柔軟性があります。

定義済みの型は、上記のように変数を使って参照することもできますし、名前で参照することも出来ます。
つまり、`Payload(CreatePayload)` は `Payload("CreatePayload")` として書くことができます。
ここで、"CreatePayload" は `CreatePayload` タイプ定義で与えられる名前です。
これにより、お互いに依存する型を定義することが可能になり、 `Go` コンパイラが循環参照にエラーを出すこともなくなります。

## メディアタイプ

他のよくあるタイプの利用は、メディアタイプを記述することです。
レスポンス・メディアタイプはレスポンス・ボディの形を特徴付けます。
メディアタイプは *views* と *links* を定義している点でタイプと異なります。
詳細は、[Overview](/design/overview) を参照してください。
メディアタイプは、[MediaType](http://goa.design/reference/goa/design/apidsl/#func-mediatype-a-name-apidsl-mediatype-a) 関数を利用して定義されます。

基本的なメディアタイプの定義は次のようになります：

```go
var MT = MediaType("application/vnd.app.mt", func() {
	Attributes(func() {
		Attribute("name")
	})
	View("default", func() {
		Attribute("name")
	})
})
```
`MediaType` の第一引数はメディアタイプの識別子で、これは [RFC 6838](https://tools.ietf.org/html/rfc6838) で定義されるものです。
DSLは、タイプで Attribute が定義される方法と同様に、Attribute と View（ここでは `default` ビューのみ）をリストし、他のメディアタイプへのリンクがあればそれもリストします。

そのようなメディアタイプを使用して、アクションのレスポンスを以下のように定義できます：

```go
Action("show", func() {
	Routing(GET("/:accountID"))
	Params(func() {
		Param("accountID", Integer, "Account ID")
	})
	Response(OK, func() {
		Media(MT)
	})
	Response(NotFound)
})
```

これは下記と同等です：

```go
Action("show", func() {
	Routing(GET("/:accountID"))
	Params(func() {
		Param("accountID", Integer, "Account ID")
	})
	Response(OK, MT)
	Response(NotFound)
})
```

もしくは：

```go
Action("show", func() {
	Routing(GET("/:accountID"))
	Params(func() {
		Param("accountID", Integer, "Account ID")
	})
	Response(OK, "application/vnd.app.mt")
	Response(NotFound)
})
```

メディアタイプは、タイプが変数またはその名前を使用して参照するように、変数またはそのメディアタイプ識別子を使用して参照できます。

アクションのリクエスト・ペイロードとリクエスト・メディアタイプを定義するために同じ Attribute が使用されることがよくあります。
特に、REST APIでは、リソースを作成するリクエストを送信すると、レスポンスにその表現が返されることがしばしばあります。
goa デザイン言語では、 `Type` と `MediaType` 関数呼び出しの両方で使うことができる `Reference` 関数を提供することで、この共通のケースを支援します。
この関数は、1つの引数を取ります。引数は、タイプまたはメディアタイプを保持する変数か、タイプまたはメディアタイプの名前です。
`Reference` 関数を使うと、参照されているタイプの Attribute をすべて再定義せずに、そのタイプのプロパティ（タイプ、説明、例、バリデーションなど）を再利用することができます。

次のタイプ定義があるとします：

```go
var CreatePayload = Type("CreatePayload", func() {
	Attribute("name", String, "Name of thingy", func() {
		MinLength(5)
		MaxLength(256)
		Pattern("^[a-zA-Z]([a-zA-Z ]+)")
	})
})
```
メディアタイプは、以下のように `name` Attribute 定義を利用することができます：

```go
var MT = MediaType("application/vnd.app.mt", func() {
	Reference(CreatePayload)
	Attributes(func() {
		Attribute("name")
	})
	View("default", func() {
		Attribute("name")
	})
})
```
`name` Attribute は、対応する `CreatePayload` 定義された Attribute のタイプ、記述、バリデーションを自動的に継承します。
メディアタイプ定義では、依然として参照される Attribute の名前をリストする必要があることに注意してください。これにより、「継承する」Attribute を選別することが出来ます。。
また、メディアタイプは、必要に応じて（例えば、タイプ、記述、バリデーション等を変更するために） `name` Attribute のプロパティを上書きすることが出来ます。

メディアタイプは、メディアタイプ識別子を使用して自分自身を参照することもできます。
これにより、再帰的メディアタイプを定義することが可能になり、Goコンパイラが循環参照についてエラーを出すこともありません：

```go
var MT = MediaType("application/vnd.app.mt", func() {
	Reference(CreatePayload)
	Attributes(func() {
		Attribute("name")
		Attribute("children", CollectionOf("application/vnd.app.mt"))
	})
	View("default", func() {
		Attribute("name")
	})
})
```

## タイプとメディアタイプを混ぜあわせについて

`Reference` を使ってタイプとメディアタイプ間で Attribute 定義を再利用する方法を見てきました。
メディアタイプは特殊な形式のタイプです。
つまり、タイプを使用できる場所（Attribute が定義されている場所）であればどこでもタイプの代わりに使用できます。
しかし、ベストプラクティスは、上に示したようにレスポンス・ボディを定義するためだけにメディアタイプを使用し、他のすべてに対してタイプを使用することです。
これは、メディアタイプが、そのメディアタイプにのみ適用される識別子、ビュー、リンクなどの追加のプロパティを定義しているからです。
したがって、タイプとメディアタイプの間で同じ Attribute が共有される場合、、`Reference` を利用してタイプを定義するのが良策です。
