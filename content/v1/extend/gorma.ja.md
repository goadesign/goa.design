+++
date = "2016-01-30T11:01:06-05:00"
title = "gorma プラグイン"
weight = 3

[menu.v1]
name = "Gorma"
parent = "extend.v1"
+++

[gorma](/v1/reference/gorma) はデータベースモデルを記述することを可能にする goa のプラグインです。 gorma コードジェネレータは、モデル定義を使用して、モデルから自動的にメディア・タイプを作成するコードを生成します。まだドキュメントはあまりありません。

## 概要
goa は API のエンドユーザー体験のための DSL です。入力と出力を正確に記述します。 `gorma` はこの経験をデータストレージレイヤにまで広げます。 `gorma` はストレージレイヤとモデル間の関係を記述する新しい DSL を追加します。 `gorma` の仕様は、あなたの goa DSL と同じ `design` のフォルダにあります。ここに例があります。

```go
package design

import (
	"github.com/goadesign/gorma"
	. "github.com/goadesign/gorma/dsl"
)

var _ = StorageGroup("CongoStorageGroup", func() {
	Description("This is the global storage group")
	Store("postgres", gorma.Postgres, func() {
		Description("This is the Postgres relational store")
		Model("User", func() {
			BuildsFrom(func() {
				Payload("user", "create")
				Payload("user", "update")
			})
			RendersTo(User)
			Description("User Model Description")
			HasMany("Reviews", "Review")
			HasMany("Proposals", "Proposal")
			Field("id", gorma.Integer, func() {
				PrimaryKey()
				Description("This is the User Model PK field")
			})
			Field("created_at", gorma.Timestamp, func() {})
			Field("updated_at", gorma.Timestamp, func() {})
			Field("deleted_at", gorma.NullableTimestamp, func() {})
		})

		Model("Proposal", func() {
			BuildsFrom(func() {
				Payload("proposal", "create")
				Payload("proposal", "update")
			})
			RendersTo(Proposal)
			Description("Proposal Model")
			BelongsTo("User")
			HasMany("Reviews", "Review")
			Field("id", gorma.Integer, func() {
				PrimaryKey()
				Description("This is the Payload Model PK field")
			})
			Field("title", func() {
				Alias("proposal_title")
			})
			Field("created_at", gorma.Timestamp, func() {})
			Field("updated_at", gorma.Timestamp, func() {})
			Field("deleted_at", gorma.NullableTimestamp, func() {})
		})

		Model("Review", func() {
			BuildsFrom(func() {
				Payload("review", "create")
				Payload("review", "update")
			})
			RendersTo(Review)
			Description("Review Model")
			BelongsTo("User")
			BelongsTo("Proposal")
			Field("id", gorma.Integer, func() {
				PrimaryKey()
				Description("This is the Review Model PK field")
			})
			Field("created_at", gorma.Timestamp, func() {})
			Field("updated_at", gorma.Timestamp, func() {})
			Field("deleted_at", gorma.NullableTimestamp, func() {})
		})

		Model("Test", func() {
			Description("TestModel")
			NoAutomaticIDFields()
			Field("created_at", gorma.Timestamp, func() {})
			Field("updated_at", gorma.Timestamp, func() {})
			Field("deleted_at", gorma.NullableTimestamp, func() {})
		})
	})
})

```

goa のように、 `gorma` の DSL は実際には背後の構成を構築する Go 関数のセットです。 `gorma` はこの設定を使用して、プロジェクトの `models` ディレクトリにデータベースアクセスパッケージを生成します。上の例で DSL を見てみましょう。

### StorageGroup (ストレージグループ)
StorageGroup (ストレージグループ) 仕様は、あなたの `gorma` 構成のルートです。それ自体は何も作成しませんが、プロジェクトのすべてのストレージ仕様のコンテナとして機能します。プロジェクトに定義されている StorageGroup は 1 つだけです。 goa と gorma のほぼすべての DSL と同様に、 StorageGroup に `Description("...")` 仕様を追加できます。

### Store (ストア)

Store (ストア) は単一のデータストアを表します。今日ではそれはリレーショナルデータベースを意味します。この制限は将来、貢献、需要および必要性に基づいて変更される可能性があります。ストアには名前とタイプがあります。

```go
	Store("postgres", gorma.Postgres, ...)
```
現在、これらの識別子はコード生成では使用されませんが、将来データベース固有の方法で生成コードを変更するために使用される可能性があります。名前は特別なものではありません。好きな名前を使用できます。

上記 Store の例には `Description` といくつかの `Model` 定義があります。

```go
	Store("postgres", gorma.Postgres, func() {
		Description("This is the Postgres relational store")
		Model("User", func() { ...
```

あなたの Store には任意の数のモデルが含まれていてもよく、指定したモデルはあなたの goa DSL で指定されたモデルに限定されません。

### Model (モデル)
Model (モデル) は、データベーステーブルにマップする単一の `struct` またはドメインオブジェクトを表します。Model DSL は gorma の中で最も柔軟な DSL であり、あなたがほとんどの仕様を行う場所です。 `gorma` によって生成されたモデルは、データベースにアクセスするために [gorm](https://github.com/jinzhu/gorm) を使います。つまり `gorma` は gorm がサポートするすべてのデータベースドライバをサポートします。 `gorma` でのすべてのテストは現在 PostgreSQL で行われています。 `gorma` はデータベース固有の機能を使用しないため、サポートされているデータベースでも同様に機能します。

モデル定義を分解して、何が起こっているのかを見てみましょう。

```go
		Model("User", func() {
			BuildsFrom(func() {
				Payload("user", "create")
				Payload("user", "update")
			})
			RendersTo(User)
			Description("User Model Description")
			HasMany("Reviews", "Review")
			HasMany("Proposals", "Proposal")
			Field("id", gorma.Integer, func() {
				PrimaryKey()
				Description("This is the User Model PK field")
			})
			Field("created_at", gorma.Timestamp, func() {})
			Field("updated_at", gorma.Timestamp, func() {})
			Field("deleted_at", gorma.NullableTimestamp, func() {})
		})

```
構成の最初の節は `BuildsFrom` DSL です。この `BuildsFrom` は、このモデルがユーザーのリソースの「Create (作成)」と「Update (更新)」アクションに送信されたペイロードから入力されたデータを受け入れることを `gorma` に伝えます。
`gorma` は、 goa の強く型付けされたペイロードオブジェクトをデータアクセスコードの Create メソッドと Update メソッドに適したUserモデルに変換する変換関数を自動的に生成するので、これは重要です。

次の行は、 User モデルがあなたの goa デザインの "User" メディアタイプにレンダリングすること (`RendersTo`) を指定します。ここでも `gorma` はデータベースモデルを強く型付けされた goa ビューに変換する変換関数を自動的に生成します。 goa DSL の力のために、 `gorma` は完全なビューオブジェクトグラフを作成するためのコードを生成することができます。あなたの User メディアタイプが goa Links を返すよう指定した場合、 gorma はこれらのリンクを作成してあなたのビューに埋め込むためのコードを生成します。同様に、ビューがネストされたモデルを返すように指定している場合、 `gorma` はそれらのモデルも取得して設定します。埋め込みオブジェクトを定義する goa メディアタイプの例を次に示します。

```go
var Proposal = MediaType("application/vnd.proposal+json", func() {
	Description("A response to a CFP")
	Reference(ProposalPayload)
	Attributes(func() {
		Attribute("id", Integer, "ID of user")
		Attribute("href", String, "API href of user")
		Attribute("title", String, "Response title")
		Attribute("abstract", String, "Response abstract")
		Attribute("detail", String, "Response detail")
		Attribute("reviews", CollectionOf(Review), "Reviews")
	})
	Links(func(){
		Link("reviews")
	})
	View("default", func() {
		Attribute("id")
		Attribute("href")
		Attribute("title")
		Attribute("abstract")
		Attribute("detail")
		Attribute("reviews")
		Attribute("links")
	})
	View("link", func() {
		Attribute("id")
		Attribute("href")
		Attribute("title")
	})
})
```
特に注目すべきは `Attribute("reviews", CollectionOf(Review), "Reviews")` の行です。 goa DSL は、この Proposal メディアタイプに、実際に Review メディアタイプのコレクションである「reviews」という属性があることを指定します。この属性は Proposal メディアタイプの「default」ビューに含まれています。これを `gorma` で動作させるには、 DSL のモデル間の関係を定義する必要があります。 User モデル DSL に戻ると、 `gorma` がこれをどのようにしているかを見ることができます。

```go
		Model("User", func() {
			BuildsFrom(func() {
				Payload("user", "create")
				Payload("user", "update")
			})
			RendersTo(User)
			Description("User Model Description")
			HasMany("Reviews", "Review")
			HasMany("Proposals", "Proposal")
			...
```
モデルリレーションシップには Active Record 命名法を採用しています。 `gorma` DSL は、 `HasMany` 、 `HasOne` 、 `BelongsTo` 、 `ManyToMany` のリレーションをサポートしています。 DSL は、 goa のメディアタイプで指定した関係と一致させるために `gorma` のモデルとニーズとの関係を指定します。上記の Media Type 定義のように、 Proposal に Review のコレクションが含まれている場合、 `gorma` の Proposal モデルは Review モデルと `HasMany` 関係を宣言する必要があります。

このモデル定義の例では、 `created_at` 、 `updated_at` 、および `deleted_at` の各フィールドを追加しましたが、必ずしも指定する必要はありません。 Store または Model 定義に `NoAutomaticTimestamps()` DSL を指定しない限 `gorma` は自動的にそれらをインクルードします。同様に、 `gorma` は Integer 型の `id` というプライマリキーフィールドを作成します (データベースのストレージモデルにマップします) 。 Store または Model 定義の `NoAutomaticIDFields()` DSL を使用してこれを抑制できます。

### Fields (フィールド)
`gorma` は `BuildsFrom` DSL のフィールドに基づいてモデルのフィールドに値を設定しようとします。これは、参照するペイロードにフィールドのセットが含まれている場合、あなたの `gorma` モデルはそれらのフィールドも取得することを意味します。セカンダリインデックスを追加する場合など、これらのフィールドに関する追加情報を指定する必要が生じることがあります。 他の場合には、ペイロードに含まれていないフィールドがモデル内に必要です。 `Field` DSL ではモデルのフィールド定義を指定できます。

Proposal モデルのフィールドのいくつかのプロパティを指定する Proposal モデル定義の抜粋です。

```go
		Model("Proposal", func() {
			...
			Field("id", gorma.Integer, func() {
				PrimaryKey()
				Description("This is the Payload Model PK field")
			})
			Field("title", func() {
				Alias("proposal_title")
			})
			Field("created_at", gorma.Timestamp, func() {})
			Field("updated_at", gorma.Timestamp, func() {})
			Field("deleted_at", gorma.NullableTimestamp, func() {})
			...
		})
```
"id" フィールドは明示的にここに設定されていますが、上記のように必須ではありません。 フィールドの DSL に `PrimaryKey()` 定義も含まれています。複合主キーがある場合は、 `PrimaryKey()` タグを使用して、複数のフィールド定義をモデルに作成して指定できます。

また、 "title" フィールドの別名も指定しました。これは、モデルの `title` フィールドがデータベースの `proposal_title` カラムに格納されることを `gorma` に伝えます。モデルとフィールドの定義の両方にエイリアスを指定できます。テーブルにエイリアスを指定すると、データベース内のテーブルの名前が変更されます。


## gorma の実行
`goagen` コマンドの `gen` 機能を使用してモデルを生成します。

```
	goagen --design=gopath/to/your/project/design/ gen --pkg-path=github.com/goadesign/gorma
```

## 期待されること
`gorma` は一定の期待をしています。すべての自動配線をうまく機能させるには、あまり離れすぎてはいけません。

* モデルのリレーションは、メディアタイプで指定した暗黙的な関係と一致する必要があります。メディアタイプに実際に別のメディアタイプの属性があることを指定すると、リレーションを指定しています。その関係は、あなたの `gorma` DSL にも反映されなければなりません。
* 命名：キャメルケースでモデルに名前を付けます。スネークケースでフィールドに名前を付けます。 `gorma` は常に命名とコンバージョンを使って正しいことをしようとしますが、この標準を維持することで、まだテストされていないエッジケースの助けになります。
* `gorma` は `models` と呼ばれるフォルダにあなたのモデルを生成します。 `goagen` を呼び出すときに `-- --pkg=otherfolder` を追加することでこれを上書きすることができます。


## 制限
* Gorma は、すべてのキー (プライマリと外部) が `int` 型であると予想しています。将来的に、非整数の主キーをサポートするかもしれません。
* Gorma は現在、 PostgreSQL に対して広範にテストされています。これは Gorm がサポートしている他のデータベースに対してもうまくいくはずですが、もしそうでなければバグを報告してください。
* `gorma` によって生成されるメソッドは、主キーによるデータ操作のための基本的なケースメソッドです。 将来のルックアップ関数をモデルの他のフィールドで追加することは可能です。 プルリクエストは喜んで受け入れます。
* Gorm (と任意の ORM は) 、本当にすべてのユースケースに対して最適な SQL を生成しません。特定のケースを最適化する必要がある場合は、モデルにメソッドを追加する方法については、「その他の注意」の注釈を参照し SQL を手書きしてください。 `gorma` は基礎となるデータベースハンドルを公開しているので、Goの `db/sql` パッケージにドロップして、カスタムメソッドに必要なものを書き込むことができます。


## その他特記事項
* `gorma` はプロジェクトルートの `models` フォルダにあなたのモデルを生成します。 `goagen` を使用するたびにこれらのモデルを上書きしますが、上書きされるのは `gorma` によって作成されるファイルだけです。このディレクトリに追加のファイルを追加して、 `gorma` の命名規則である `model.go` と `model_helper.go` と競合しないファイル名を使用する限り、モデルに追加の機能を指定できます。余分なコードを上書きしないようにするには、 `model_addons.go` のようなものをお勧めします。
* Gorm のアップデートモデルは少し怖いです。カスタム機能を作成する場合は、アップデートを Gorm にどのように送信するか慎重に検討してください。 `gorma` は null の可能性のあるフィールド上のポインタを使用し、生成する Update 関数内の更新句にフィールドを追加する前に各フィールドをチェックすることでこれを考慮します。カスタムの Update メソッドを記述するときは、 Gorm の `Save()` メソッドに直接 goa ペイロードを送信しないでください。そうしないと、データベースに格納されている列がモデルに入力されていないフィールドで上書きされます。代わりに、 Gorm の Update メソッドを呼び出して、更新するフィールドと値を明示的に渡します。
