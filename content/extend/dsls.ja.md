+++
date = "2016-01-30T11:01:06-05:00"
title = "プラグイン DSL を使った goa の拡張"
weight = 2

[menu.main]
name = "DSL の作成"
parent = "extend"
+++

goa プラグインは、新しい DSL と付随するジェネレータを作成することを可能にします。 DSL は Go 関数に過ぎないので構文は完全にオープンです。プラグインは、あらゆる DSL から新しい種類の出力を生成することも可能にします。例えば goa API デザイン言語とは異なる言語をターゲットとする新しいジェネレータです。

これら 2 つの側面の組み合わせは goa プラグインは非常に強力なものにし、コード、ドキュメント、設定などの有用なもの生成するあらゆるユースケースをターゲットとした新しい DSL とジェネレータを作成できます。

もう一つの興味深い側面は DSL がお互いを完成させることです。新しい DSL をゼロから作成する必要はありません。例えば、組み込みの API DSL にいくつかの新しいキーワードを追加することができます。新しい DSL 実装は、新しい成果物を作成したり、既存の成果物がどのように作成されるかを変更することができます。

## DSL の拡張

goa DSL は、*定義* と呼ばれる再帰的なデータ構造を構築する Go パッケージ関数で構成されています。これらの定義の根源は [Register](http://goa.design/reference/goa/dslengine/#func-register-a-name-dslengine-register-a:1e0eb94feca2c8be53d3bd77a1934133) 関数を介して goa *dslengine* パッケージに記録する必要があります。定義の実際の内容は完全にあなた次第です。ジェネレータはそれらを使用して成果物を作成するので、生成を行うために必要なすべての情報を含める必要があります。

### 最初の露出

ここに、名前を受け入れて新しい `ModelDefinition` データ構造体を作成する `Model` という新しい DSL 関数を定義する関数の例があります。

```go
package modeldsl

// ModelDefinition describes a model defined via DSL.
type ModelDefinition struct {
	// Name is the model name
	Name string
}

// The definition built by the DSL
var model *ModelDefinition

// Model creates a new model with the given name.
func Model(name string) {
	model = &ModelDefinition{Name: name}
}
```
ご覧のとおり何も特別なものはありません。データ構造体 `ModelDefinition` を構築し、それをパッケージ変数に入れるパッケージ関数 `Model` があるだけです。

式的な DSL を実装するために使用される一般的なパターンは、DSL 関数の最後の引数に無名関数を受け入れることです。この関数の引数は、他の DSL 関数を呼び出してデータ構造体を構築することができます。上の例を拡張して、モデルに新しいフィールドを追加しましょう。`Type` は `"TEXT"` か `"INTEGER"` のいずれかになります。そのフィールドの値を指定することができるようになる新しい DSL 関数、 `Type` を紹介しましょう。
```go
package modeldsl


// ModelDefinition describes a model.
type ModelDefinition struct {
	// Name is the model name
	Name string
	// Type is the model type
	Type string
}

// The definition built by the DSL
var model *ModelDefinition

// Model creates a new model with the given name.
func Model(name string, dsl func()) {
	model = &ModelDefinition{Name: name}
	dsl()
}

// Type sets the type of the model being built.
func Type(value string) {
	if value != "TEXT" && value != "INTEGER" {
		panic("invalid DSL!")
	}
	model.Type = value
}
```
上記のように、ユーザは次のような方法でモデルを記述できるようになりました。
```go
var _ = Model("bottle", func() {
	Type("TEXT")
}
```
良い感じです！ DSL を構築するために使用される別の一般的なパターンは、可変長関数です。このような関数はオプションの引数を定義することを可能にします。私たちの DSL をさらに拡張して、ユーザーがタイプ `VARCHAR` を持つモデルを定義できるようにしたいと考えていますが、タイプに余分な長さの値も必要です。これをモデル化するには `Type` 関数に余分なオプション引数を与えることができます。
```go
// Type sets the type of the model being built.
func Type(value string, extra ...interface{}) {
	if value != "TEXT" && value != "INTEGER" && value != "VARCHAR" {
		panic("invalid DSL!")
	}
	if value == "VARCHAR" {
		if len(extra) == 0 {
			panic("invalid DSL!")
		}
		length, ok := extra[0].(int)
		if !ok {
			panic("invalid DSL!")
		}
		model.TypeLen = length // TypeLen is a int field on ModelDefinition
	}
	model.Type = value
}
```
OK 、少し前に戻りましょう。 DSL はパッケージ変数を構築するパッケージ関数です。 DSL を引数や可変関数などの匿名関数のように使いやすくするために使用される一般的なパターンがいくつかあります。上記の例では引数の型として `interface{}` を使用しているので DSL ユーザーは強力な DSL を構築するのに非常に役立つあらゆる値を渡すことができます。

### goa DSL エンジンにプラグインする

上記の DSL はうまく動作しますが、明らかにかなり制限されています。データ構造は 1 つしか構築されず、エラーをあまりうまく処理しません。エラーとエラー報告は、ユーザーが最初の体験として DSL を書くときに重要です。 goa には DSL エンジンが付属しており、再帰的なデータ構造を構築し、エラーの記録と報告のための標準フレームワークを提供します。

#### DSL エンジン実行フロー

goa エンジンの上で DSL を実装する詳細に飛ぶ前に、実行中のステップをハイレベルで理解することは役に立ちます。少し戻って、 DSL を実行しているのは何でしょうか？ 2 つのものがあります。

1. `Go` ランタイムは、ジェネレータプログラムがロードされるときにグローバル変数を評価します。これにより、そのように呼ばれるすべての DSL 関数が実行され、最初の定義セットが生成されます。
2. これらの関数の中には、遅延実行の定義データ構造体に匿名関数を保存するものがあります。 goa DSL エンジンは、追加の定義を作成して初期化する可能性のあるこれらの機能を実行します。

上記の例では、 `Type` 関数は提供された `dsl` 無名関数を直ちに実行しました。これは、コードが最初に作成される他の定義に依存する可能性があるため、常に可能なわけではありません。この場合、共通のパターンは dsl 関数を定義自体の中に格納することから成ります。 goa DSL エンジンは、すべての「トップレベル」定義が作成されたら、その機能を実行します。

したがって、実行の流れは次のようになります。

1. `Go` ランタイムは、最初の定義セットを作成するデザインパッケージ変数を評価します。
2. goa DSL エンジンは、この最初のセットを横断し埋め込まれた無名関数 (2回目のパス) を実行します。
3. goa DSL エンジンは、定義を検証する別のパスを作成します。
4. goa DSL エンジンは、定義を確定するために最終的なパスを行います。

バリデーションとファイナライズについては以下で詳しく説明しますが、定義が一貫していること、情報が欠落していないこと、およびジェネレータがそれらを消費する前に内容をマッサージする機会を与えることを検証しています。

実行フローに関する最後の注意：エラーがいずれかのステージで発生した場合、そのステージが完了した後で実行が停止されます。これにより無効なデータでステージの実行を開始することを避けながら、複数のエラーを同時に報告することができます。

#### DSL 定義

goa エンジンによって実行される DSL によって構築された定義は、すべて `dslengine` [Definition](https://godoc.org/github.com/goadesign/goa/dslengine#Definition) インタフェースを実装する必要があります。このインタフェースは、エラーメッセージを作成するためにエンジンによって使用される文字列を返す単一のメソッド `Context()` を定義します。文字列の値は、エラーが発生した場所をユーザーが理解するのに役立ちます。上の例では、メソッドはモデル名を返すことができます。

`dslengine` パッケージは、オプションで実装可能な4つの追加インタフェースを定義します。

[Source](https://godoc.org/github.com/goadesign/goa/dslengine#Source) インタフェースは、最後の引数として無名関数を受け入れる DSL 関数で構築された定義で実装する必要があります。 `DSL()` 関数はこの無名関数を返すので、 goa DSL エンジンはフェーズ 2 でそれを実行することができます。

[Validate](https://godoc.org/github.com/goadesign/goa/dslengine#Validate) インターフェイスは、すべての定義がフェーズ 3 で構築されたら、 goa DSL エンジンによって呼び出される `Validate()` メソッドを公開します。定義が矛盾しているか、情報が欠落している (つまりユーザーがDSLを正しく使用しなかった) 場合、実装は意味のあるエラーを返す必要があります。上記の例では、型が正しい値を持つかどうかのチェックは `Validate()` 関数で行うことができます。

[Finalize](https://godoc.org/github.com/goadesign/goa/dslengine#Finalize) 関数はフェイズ 4 で呼び出される関数です。たとえば、定義フィールドにデフォルト値を設定したり、フィールドを非正規化して、ジェネレータによって消費されやすいデータ構造にすることができます。

例に戻って、 DSL エンジンを利用するために `ModelDefinition` データ構造をどのように実装できるかを以下に示します。
```go
// ModelDefinition describes a model.
type ModelDefinition struct {
	// dsl that initializes the model
	dsl func()
	// Name is the model name
	Name string
	// Type is the model type
	Type string
	// TypeLen is the len of VARCHAR types
	TypeLen int
	// GenType is used by the code generator
	GenType string
}

// Context returns the part of the error message used to identify the model.
func (m *ModelDefinition) Context() string {
	return fmt.Sprintf("model %s", m.Name)
}

// Source returns the user defined DSL.
func (m *ModelDefinition) DSL() func() {
	return m.dsl
}

// Validate makes sure the model type is correct.
func (m *ModelDefinition) Validate() error {
	if m.Type != "TEXT" && m.Type != "INTEGER" && m.Type != "VARCHAR" {
		return fmt.Errorf("invalid model type %#v, must be one of TEXT, INTEGER or VARCHAR", m.Type)
	}
	if m.Type == "VARCHAR" {
		if m.TypeLen == 0 {
			return fmt.Errorf("invalid VARCHAR length, must be greater than 0 and lesser than 256")
		}
	}
	return nil
}

// Finalize computes the type name and stores it for the generator to use.
func (m *ModelDefinition) Finalize() {
	if m.Type == "VARCHAR" {
		m.GenType = fmt.Sprintf("VARCHAR(%d)", m.TypeLen)
	} else {
		m.GenType = m.Type
	}
}
```
上記のデータ構造を前提にすると、 goa DSL エンジンは正しい方法で各メソッドを呼び出し、エラーを一貫した方法でユーザーに報告します。

#### DSL ルート

新しい　DSL　を作成するときのパズルの最後のピースは、 DSL エンジンが実行する DSL *ルート* を定義することです。ルートは [Register](http://goa.design/reference/goa/dslengine.html#func-register-a-name-dslengine-register-a:1e0eb94feca2c8be53d3bd77a1934133) 関数を使用して `dslengine` パッケージで登録する必要があります。 DSL ルートは [Root](http://goa.design/reference/goa/dslengine.html#type-root-a-name-dslengine-root-a:1e0eb94feca2c8be53d3bd77a1934133) インタフェースを実装しています。このインタフェースは、エンジンが実行のための定義を反復処理するために使用する `IterateSets` メソッドを公開します。 `IterateSets` は定義のスライスを返します。異なるタイプの定義を実行する順番を制御できます。

上記の例の DSL を拡張して、ハードコードされたリストを持たずにモデルタイプを定義できるようにしたとします。おそらく型定義はモデル定義の前に実行されなければならないでしょう。これは DSL ルートの `IterateSets` メソッドで最初にすべての型定義を返し、その後すべてのモデル定義を返すことで実現できます。

```go
package modeldsl

// Root is the data structure built by the DSL.
type Root struct {
	Models []*ModelDefinition
	Types []*TypeDefinition
}

// dslRoot contains the instance of Root built by the DSL
var dslRoot = &Root{}

// IterateSets first returns the type definitions then the model definitions.
func (r *Root) IterateSets(it dslengine.SetIterator) {
	err := it(r.Types)
	if err != nil {
		return // The errors will be reported to the user by the DSL engine.
	}
	it(r.Models)
}
```
すべてをまとめると、DSL関数は `dslRoot` 変数を初期化します。次に例を示します。
```go
// Model creates a new model with the given name.
func Model(name string, dsl func()) {
	model = &ModelDefinition{Name: name, dsl: dsl}
	dslRoot.Models = append(dslRoot.Models, model)
}
```

### DSL 関数の実装

このセクションでは DSL 機能の実装に役立つ追加情報について説明します。これには、エラー報告、エンジンコンテキストスタックの詳細、およびDSLを実装する際に役立つ追加のヘルパー関数が含まれます。

#### エラー報告

実際の DSL 実装では、ユーザのエラーを報告するためにパニックに陥るべきではありません。 代わりに `dslengine` パッケージは、エラーが発生した場所の行番号や列番号などのコンテキスト情報とともにエラーメッセージを報告するためのいくつかの機能を公開しています。

主なエラー報告機能は `fmt.Errorf` と非常によく似た [ReportError](https://godoc.org/github.com/goadesign/goa/dslengine#ReportError) です。 任意でフォーマットされたエラーメッセージを出力するだけです。

もう 1 つの便利な関数は [InvalidArgError](https://godoc.org/github.com/goadesign/goa/dslengine#InvalidArgError) です。 InvalidArgError という名前は、 DSL 関数が不正な引数で呼び出されたときに呼び出されることを意味します。これは例えば、 Go 関数のパラメータが表現力のあるDSLを可能にするために `interface{}` を使用する場合に発生します。 DSL 関数コードは入力を検証し、無効な値を報告するために [InvalidArgError](https://godoc.org/github.com/goadesign/goa/dslengine#InvalidArgError) を使用します。

もう 1 つの関数は [IncompatibleDSL](https://godoc.org/github.com/goadesign/goa/dslengine#IncompatibleDSL) です。 この関数の使用例は、以下の段落で説明しています。

すべてのエラー報告機能は、ユーザーフレンドリなエラーメッセージを作成し、 `dslengine` パッケージの [Errors](https://godoc.org/github.com/goadesign/goa/dslengine#Errors) 変数に追加します。

#### コンテキストスタック

厳密に DSL を実装する必要はありませんが、エンジンがどのようにそれをフル活用するか知ることは有益かもしれません。特に興味深い概念はコンテキストスタックです。エンジンが実行されると、コンテキストスタックに現在実行されている定義が追加されます。これは `Source` インターフェイスを実装し DSL が実行されている定義です。コンテクストスタックの最上部にある現在の定義は [CurrentDefinition](https://godoc.org/github.com/goadesign/goa/dslengine#CurrentDefinition) 関数を介して取得できます。

これは、適切なコンテキストで DSL 関数が呼び出されていることを検証するのに便利です。たとえば、上記の Model DSL では、 Model 関数が実行されたときに `Type` が呼び出されないようにします。 `Type` 関数は次のようにチェックできます。
```go
// Type sets the type of the model being built.
func Type(value string, extra ...interface{}) {
  model, ok := dslengine.CurrentDefinition().(*ModelDefinition)
  if !ok {
    panic("invalid use of the Type function")
  }
  // ... initialize "model"
}
```
実際このケースは非常に一般的で、 `dslengine` は [IncompatibleDSL](https://godoc.org/github.com/goadesign/goa/dslengine#IncompatibleDSL) を公開しています。 DSL 実装が呼び出すことができる関数です。
```go
// Type sets the type of the model being built.
func Type(value string, extra ...interface{}) {
  model, ok := dslengine.CurrentDefinition().(*ModelDefinition)
  if !ok {
    dslengine.IncompatibleDSL("Type")
    return
  }
  // ... initialize "model"
}
```
`IncompatibleDSL` は現在の定義 `Context` メソッドから返された値を使って素晴らしいエラーメッセージを作成します。

##### DSL の実行

[Execute](https://godoc.org/github.com/goadesign/goa/dslengine#Execute) 関数は、引数として無名関数と定義をとります。コンテキストスタックに定義を追加し DSL を実行します。 DSL がエラーを報告する場合は false を返し、そうでない場合は true を返します。この関数は、他のものに依存しない DSL を実行するのに便利で、 Go の DSL エンジンがソース定義を実行するのではなく、 Go ランタイムがグローバル変数の初期評価を行うときに実行できます。

#### DSL の集約

DSL 実装は、単に対応するパッケージをインポートするだけで、他の DSL で定義された定義を活用します。例えば goa API DSLを拡張する DSL は、 goa 自身が使用するのと同じ定義を使用できます。これにより、簡単に新しいキーワードを追加して DSL を拡張することができます。例として goa DSL の既存の [API](https://godoc.org/github.com/goadesign/goa/design/apidsl#API) 関数に `Cluster` 関数を追加しましょう。 この関数は文字列を受け取り `ClusterDefinition ` を初期化します。

```go
package clusterdsl

import "github.com/goadesign/goa/design/apidsl"

// ClusterDefinition defines a cluster.
type ClusterDefinition struct {
	// Name of cluster
	Name string
	// API is the goa API DSL definition that belongs to cluster.
	API *apidsl.APIDefinition
}

// Root is the DSL root.
type Root struct {
	Clusters []*ClusterDefinition
}

// DSL root
var dslRoot &Root{}

// Register the DSL root with the DSL engine.
func init() {
	dslengine.Roots = append(dslengine.Roots, dslRoot)
}

// Cluster defines a cluster for an API.
func Cluster(name string) {
	api, ok := dslengine.CurrentDefinition().(*apidsl.APIDefinition)
	if !ok {
		dslengine.InvalidDSL("Cluster")
		return
	}
	c := &ClusterDefinition{Name: name, API: api}
	dslRoot.Clusters = append(dslRoot.Clusters, c)
}
```
ジェネレータは goa API 定義にアクセスして成果物を生成します。

#### 属性

goa API DSL は、汎用フィールドを表す[属性
definition](https://godoc.org/github.com/goadesign/goa/design#AttributeDefinition)定義データ構造を定義します。属性は型を持ち、型が [Object](https://godoc.org/github.com/goadesign/design#Object) の場合は他の属性を含むことがあります。また、検証規則 (必須フィールドとフィールドごとの追加検証) も定義します。属性は多くの DSL にとって有益であり、プラグインのデータ構造内で属性を定義する能力は一般的なシナリオです。このシナリオは `ContainerDefinition` インターフェイスを使用してサポートされています。基本的に、属性 DSL はその親が属性自体、メディアタイプ、または汎用/プラグインコンテナ定義であるかどうかをチェックします。

### 完成させる

DSL を書くことは、定義を構築するパブリックパッケージ関数を書くことから成ります。 goa [dslengine](https://godoc.org/github.com/goadesign/goa/dslengine) パッケージは、 DSL を実行してエラーをユーザに報告するためのシンプルなフレームワークを提供します。定義データ構造は、エンジンに接続して実行ライフサイクルを利用するための多数のインターフェースを実装することができます。 DSL は、 DSL を実行するエンジンの DSL エンジンパッケージ [Roots](https://godoc.org/github.com/goadesign/goa/dslengine#Roots) 変数にそのルートオブジェクトを登録する必要があります。

DSL を作成し、定義を作成したら、次のステップは実際にそれらを使って出力を生成することです。ジェネレータに入門しましょう。