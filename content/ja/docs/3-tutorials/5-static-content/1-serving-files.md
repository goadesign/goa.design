---
title: ファイルの提供
linkTitle: ファイルの提供
weight: 1
description: "Goaのファイル提供機能をマスターして、HTML、CSS、JavaScript、画像などの静的アセットをHTTPエンドポイントを通じて適切なパス解決で効率的に配信します。"
---

Goaは、サービスDSLの`Files`関数を通じて、HTML、CSS、JavaScript、画像などの静的アセットを
提供するための簡単な方法を提供します。この関数を使用すると、HTTPパスをディスク上の
ディレクトリや特定のファイルにマッピングでき、サービスが静的コンテンツを効率的に
配信できるようになります。

## `Files`関数の使用

`Files`関数は、HTTPを介して静的アセットを提供するエンドポイントを定義します。標準の
`http.ServeFile`関数と同様に動作し、定義されたパスに基づいてファイルやディレクトリの
リクエストを処理します。

### 構文

```go
Files(path, filename string, dsl ...func())
```

- **path:** HTTPリクエストパス。URLの可変セグメントにマッチするワイルドカード（例：`{*filepath}`）を含めることができます。
- **filename:** 提供するディレクトリまたはファイルのファイルシステムパス。
- **dsl:** 説明やドキュメントなどの追加メタデータを提供するためのオプションのDSL関数。

### 例

#### 単一ファイルの提供

単一のファイルを提供するには、特定のパスとディスク上のファイルの場所を指定して`Files`関数を定義します。

```go
var _ = Service("web", func() {
    Files("/index.html", "/www/data/index.html", func() {
        // すべてオプションですが、OpenAPI仕様に役立ちます
        Description("ホームページを提供します。")
        Docs(func() {
            Description("追加のドキュメント")
            URL("https://goa.design")
        })
    })
})
```

この例では：

- **パス:** `/index.html` - `/index.html`へのリクエストは`/www/data/index.html`にあるファイルを提供します。
- **ファイル名:** `/www/data/index.html` - ディスク上のファイルの絶対パス。
- **DSL関数:** エンドポイントの説明と追加のドキュメントを提供します。

#### ワイルドカードを使用した静的アセットの提供

ディレクトリから複数のファイルを提供するには、パスにワイルドカードを使用します。

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "/www/data/static", func() {
        Description("CSS、JS、画像などの静的アセットを提供します。")
    })
})
```

この例では：

- **パス:** `/static/{*path}` - `{*path}`ワイルドカードは`/static/`以降の任意のサブパスにマッチし、動的なファイル提供を可能にします。
- **ファイル名:** `/www/data/static` - 静的アセットを含むディレクトリ。
- **説明:** エンドポイントの説明を提供します。

#### パス解決

`/static/{*path}`のようなワイルドカードパスを使用する場合、Goaはワイルドカードの値をベースディレクトリと組み合わせてファイルを特定します：

1. URLパスのワイルドカード部分が抽出されます
2. これが`Filename`で指定されたベースディレクトリに追加されます
3. 結果のパスがファイルの検索に使用されます

例えば、以下の設定の場合：

```go
Files("/static/{*path}", "/www/data/static")
```

URLパスが`/static/css/style.css`の場合、Goaは`/www/data/static/css/style.css`に解決します。

## インデックスファイルの処理

ディレクトリを提供する際は、インデックスファイル（例：`index.html`）が正しく
マッピングされていることを確認してください。ワイルドカードパスの下で`index.html`を
明示的にマッピングしない場合、基礎となる`http.ServeFile`呼び出しは`index.html`
ファイルの代わりに`./`へのリダイレクトを返します。

### 例

```go
var _ = Service("bottle", func() {
    Files("/static/{*path}", "/www/data/static", func() {
        Description("SPAの静的アセットを提供します。")
    })
    Files("/index.html", "/www/data/index.html", func() {
        Description("クライアントサイドルーティングのためのSPAのindex.htmlを提供します。")
    })
})
```

この設定により、`/index.html`へのリクエストは`index.html`ファイルを提供し、
`/static/*`へのリクエストは静的ディレクトリからファイルを提供することが保証されます。

## サービス実装との統合

Goaサービスで静的ファイル提供を実装する際、ファイルを管理および提供するための
いくつかのオプションがあります：

* ファイルシステムの使用：サービス実装で、ファイルシステムを使用して埋め込みファイルを提供します。

* 埋め込みファイルの使用：Go 1.16+の`embed`パッケージを使用すると、静的ファイルを
  バイナリに直接埋め込むことができ、デプロイメントがよりシンプルで信頼性の高いものになります。

### サービス実装の例

この例では、`embed`パッケージを使用して静的ファイルを提供する方法を示します。

以下のデザインを想定：

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "static")
})
```

サービス実装は以下のようになります：

```go
package web

import (
    "embed"
    // ... その他のインポート ...
)

//go:embed static
var StaticFS embed.FS

// ... その他のサービスコード ...
```

### メイン関数のセットアップ

メイン関数で、以下の手順で静的ファイルを提供するようにHTTPサーバーを設定します：

1. 埋め込まれた`StaticFS`から`http.FS`インスタンスを作成：`http.FS(web.StaticFS)`
2. このファイルシステムインスタンスを生成された`New`関数の最後の引数として渡す
3. これにより、HTTPサーバーはデザインで`Files`で定義されたエンドポイントを通じて
   埋め込まれた静的ファイルを効率的に提供できます

ファイルシステムインスタンスは、適切なファイルシステムのセマンティクスとセキュリティを
維持しながら、埋め込まれたファイルへのアクセスを提供します。

```go
func main() {
    // その他のセットアップコード...
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil,
        nil,
        http.FS(web.StaticFS), // 埋め込みファイルシステムを渡す
    )
    genhttp.Mount(mux, server)
    // サーバーを起動...
}
```

このセットアップでは：

- **go:embed:** `static`ディレクトリをバイナリに埋め込みます。
- **http.FS:** 静的ファイルを提供するためのファイルシステムをサーバーに提供します。

## まとめ

Goaの`Files`関数を使用することで、サービスで静的コンテンツを効率的に提供できます。
特定のパスとファイルの場所を定義することで、静的アセットの配信をシームレスに管理
できます。インデックスファイルの適切なマッピングを確保し、埋め込みファイルシステムを
活用してデプロイメントを効率化してください。 