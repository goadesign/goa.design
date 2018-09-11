+++
date = "2016-03-02T11:01:06-05:00"
title = "goa プラグインジェネレータ"
weight = 1

[menu.v1]
name = "ジェネレータプラグイン"
parent = "extend.v1"
+++

goa プラグインを使うと、どんな DSL からでも新しい種類の出力を生成することができます。異なる言語のクライアント、ドメイン固有の型変換、データベースバインディングセットなど、可能性は本当に無限です。

# ジェネレータ

ジェネレータは DSL によって生成されたデータ構造を消費して成果物を生成します。ジェネレータは、既存の DSL と新しいDSL（新しい DSL の作成方法については [goa プラグイン DSL](/extend/dsls) を参照してください）用に記述することができます。生成する成果物は何でもかまいません。 DSL エンジンは生成の編成を提供し、実際の出力は認識しません。

## ジェネレータの実装

ジェネレータは `Generate` 関数を実装する Go パッケージで構成されています。
```go
func Generate() ([]string, error)
```
この関数は、成功時には生成されたファイル名のリストを、それ以外の場合には解説的なエラーを返します。ジェネレータは、対応する DSL パッケージから直接 DSL 出力データ構造にアクセスします。例えば goa API DSL は、ビルドアップ API 定義を含む [APIDefinition](https://goa.design/v1/reference/goa/design.html#type-apidefinition-a-name-design-apidefinition-a:83772ba7ad0304b1562d08f190539946) 型の `Design` パッケージ変数を公開します。

### goa API DSL のためのジェネレータの作成

goa DSL はまた、ユーザに定義されたものではなく、エンジンによって動的に生成されたメディアタイプのセットを含む [GeneratedMediaTypes](https://goa.design/v1/reference/goa/design.html#variables:83772ba7ad0304b1562d08f190539946) を [Design](https://goa.design/v1/reference/goa/design.html#variables:83772ba7ad0304b1562d08f190539946) パッケージ変数の上に公開します (メディアタイプが [CollectionOf](https://goa.design/v1/reference/goa/design/apidsl.html#func-collectionof-a-name-apidsl-collectionof-a:aab4f9d6f98ed71f45bd470427dde2a7) でインラインで使用されている場合に発生します) 。

goa API DSL の出力に作用したいジェネレータは次のようになります。
```go
import "github.com/goadesign/goa/design"

// Generate generates artifacts from goa API DSL definitions.
func Generate() ([]string, error) {
	api := design.Design
	// ... use api to generate stuff
	genMedia := design.GeneratedMediaTypes
	// ... use genMedia to generate stuff
}
```
`Generate` メソッドは、 `APIDefinition` `IterateXXX` メソッドを利用して API リソース、メディアタイプ、およびタイプを反復処理して、関数の2つの呼び出し間で順序が変わらないことを保証します (設計が変更されていなくても異なる出力を生成します) 。

#### メタデータ

ジェネレータの恩恵のため、既存の定義に情報を取り込む簡単な方法は、メタデータを使用することです。 goa デザイン言語では、 API 、リソース、アクション、レスポンス、属性 (これらの定義は属性なので Type と MediaType をも意味します) の定義でメタデータを定義できます。リソース上に「疑似」メタデータ値を定義する例を次に示します。

```go
var _ = Resource("Bottle", func() {
	Description("A bottle of wine")
	Metadata("pseudo:port")
	// ...
}
```

DSL エンジンパッケージは、メタデータ定義データ構造 [MetadataDefinition](https://godoc.org/github.com/goadesign/goa/dslengine#MetadataDefinition) を定義します。


#### 成果物の書き出し

[codegen](https://godoc.org/github.com/goadesign/goa/goagen/codegen) パッケージには、 Go コードの生成に役立つさまざまなヘルパー関数が付属しています。例えば、 [design](https://godoc.org/github.com/goadesign/goa/design) パッケージの [DataStructure](https://godoc.org/github.com/goadesign/goa/design#DataStructure) インターフェイスのインスタンスを指定してデータ構造を定義するコードを生成できる関数が含まれています。

### `goagen` での統合

`goagen` は goa の DSL から成果物を生成するために使用されるツールです。 `gen` サブコマンドを使用すると、 Go パッケージパスをジェネレータパッケージ（`Generate` 関数を実装するパッケージ）に指定できます。このコマンドは 1 つのフラグを受け取ります。

```bash
--pkg-path=PKG-PATH specifies the Go package import path to the plugin package.
```

### 例

goa API DSL によって作成された定義をトラバースし、アルファベット順にソートされた API リソースの名前を含む `names.txt` というひとつのファイルを作成するジェネレータを実装してみましょう。リソースが「擬似」キーを持つメタデータペアを持つ場合、プラグインはメタデータ値を代わりに使用します。


```go
package genresnames

import (
	"flag"
	"github.com/goadesign/goa/design"
	"github.com/goadesign/goa/goagen/codegen"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

func Generate() ([]string, error) {
	var (
		ver    string
		outDir string
	)
	set := flag.NewFlagSet("app", flag.PanicOnError)
	set.String("design", "", "") // Consume design argument so Parse doesn't complain
	set.StringVar(&ver, "version", "", "")
	set.StringVar(&outDir, "out", "", "")
	set.Parse(os.Args[2:])

	// First check compatibility
	if err := codegen.CheckVersion(ver); err != nil {
		return nil, err
	}

	return WriteNames(design.Design, outDir)
}

// WriteNames creates the names.txt file.
func WriteNames(api *design.APIDefinition, outDir string) ([]string, error) {
	// Now iterate through the resources to gather their names
	names := make([]string, len(api.Resources))
	i := 0
	api.IterateResources(func(res *design.ResourceDefinition) error {
		if n, ok := res.Metadata["pseudo"]; ok {
			names[i] = n[0]
		} else {
			names[i] = res.Name
		}
		i++
		return nil
	})

	content := strings.Join(names, "\n")
	// Write the output file and return its name
	outputFile := filepath.Join(outDir, "names.txt")
	if err := ioutil.WriteFile(outputFile, []byte(content), 0755); err != nil {
		return nil, err
	}
	return []string{outputFile}, nil
}

```

次のように `genresnames` ジェネレータを呼び出します。
```bash
goagen gen -d /path/to/your/design --pkg-path=/go/path/to/genresnames
```
