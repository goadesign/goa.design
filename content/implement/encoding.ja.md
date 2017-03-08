+++
date = "2016-04-30T11:01:06-05:00"
title = "エンコーディング"
weight = 6

[menu.main]
name = "エンコーディング"
parent = "implement"
+++

## 概要

goa は、柔軟なエンコードとデコードの方法をサポートし、任意のエンコーダーとデコーダを、与えられたレスポンスとリクエストのコンテンツタイプと関連づけることを可能にします。
デフォルトでは、すべての goa サービスは JSON、XML、[gob](https://golang.org/pkg/encoding/gob/) をデコードまたはエンコードできます。

### デコーディング

goa のデコーダは、やってくるリクエストの `Content-Type` ヘッダを調べ、それをデコーダと照合します。
デフォルトでは、`application/json` は JSON デコーダに、`application/xml` は XML デコーダに、そして `application/gob` は gob デコーダにマッピングされます。
JSON デコーダは、`Content-Type` ヘッダーが見つからないか、既知の値のいずれとも一致しない場合にも使用されます。
もしデコードに失敗した場合には goa は、ステータスコードは 400 で、ボディは [ErrInvalidEncoding](https://goa.design/reference/goa/#variables) エラーを使って、エラーレスポンスを書き込みます。（エラーがどのように HTTP レスポンスに変換されるかついての詳細は[エラーハンドリング](/implement/error_handling/)を参照してください）。

### エンコーディング

goa のエンコーダは、やってくるリクエストの `Accept` ヘッダーを調べ、シンプルなコンテントネゴシエーションアルゴリズムを実装して、サービスで使用可能なエンコーダと一致させます。
デコーダと同様に、JSON、XML、gob をデフォルトでサポートしています。
`Accept` ヘッダーがない場合、またはその値が既知のコンテンツタイプのいずれとも一致しない場合は、デフォルトで JSON に設定されます。

## カスタムデコーダを利用する

あなたのサービスで、いつもと異なるデコーダを使用する必要がある理由はたくさんあります。
たとえば、標準ライブラリの JSON パッケージを、あなたのユースケースでパフォーマンスを向上させるカスタムパッケージに変更したいということもあるでしょう。また、`msgpack` などの異なるシリアライズフォーマットをサポートする必要があるかもしれません。
goa は、デコーダを goa サービスにマウントするためにデコーダが実装する必要のあるインタフェースを定義します。
インタフェースは次のとおりです：

```go
// A Decoder unmarshals an io.Reader into an interface.
Decoder interface {
	Decode(v interface{}) error
}
```

デコーダは、`Reset` メソッドを追加した、リセット可能なデコーダインタフェースを実装することになるかもしれません：

```go
// ResettableDecoder is used to determine whether or not a Decoder can be reset and thus
// safely reused in a sync.Pool.
ResettableDecoder interface {
	Decoder
	Reset(r io.Reader)
}
```

`ResettableDecoder` が実装されたデコーダは、再利用可能なインスタンスとして goa がプールで保持できるようになり、それによって各リクエストに対してデコーダを作成されるオーバーヘッドを大幅に削減します。

goa はまた、デコーダのインスタンスを作成するために使用するデコーダコンストラクタの関数シグネチャを定義します。

```go
// DecoderFunc instantiates a decoder that decodes data read from the given io reader.
DecoderFunc func(r io.Reader) Decoder
```

カスタムデコーダを実装するパッケージは、`DecoderFunc` を実装した（デフォルトでは） `NewDecoder` 関数を公開する必要があります（`NewDecoder` については以下を参照してください）。
goa によって生成されたコードは、やってくるリクエストペイロードをデコードする新しいデコーダを作成する関数を自動的に呼び出します。

### カスタムデコーダの設定

シンプルな2段階の行程でカスタムデコーダが利用できます：

1. サービスのデザインは、[Consumes](https://goa.design/reference/goa/design/apidsl/#func-consumes-a-name-apidsl-consumes-a) DSL 関数を利用する必要があります。これは、コンテンツタイプと対応するデコーダパッケージ、オプション関数をリストします。
コンテンツタイプと対応するデコーダパッケージをリストし、オプションで機能するために、Consumer DSL機能を使用する必要があります。
2. 上記の`DecoderFunc` 関数を実装しているパッケージは、サービスによってインポートされなければなりません。

`goagen app` はサービスデコーダを設定するコードの生成を行います（もし興味があれば `controllers.go` を見てみて下さい）。
`Consumes` DSL は `Function` DSL を介してデコーダを生成するのに使われるパッケージ関数の名前を変更することもできます。

```go
    Consumes("application/json", func() {
        Package("github.com/myjsondecoder")
        Function("CustomNewDecoder")
    })
```

### デフォルトデコーダの設定

デフォルトのデコーダは、やってくるリクエストの `Content-Type` ヘッダが見つからなかったり、`Consumes` DSLで定義されているコンテンツタイプと一致しない場合に使用されるデコーダです。これは `Consumer` DSLにリストされる最初のデコーダです。
デコーダがリストされていない場合、生成されるコードは、標準 JSON デコーダをデフォルトにします。

### 組み込みカスタムデコーダ

goaには、`binc`、`cbor`、`msgpack`、および [ugorji](https://github.com/ugorji/go/tree/master/codec) のJSONデコーダをカバーするいくつかのカスタムデコーダ（または、より正確な外部デコーダへのアダプタ）があります。
`msgpack` を例にすると、デザインは次のようになります：

```go
var _ = API("My API", func() {
    // ...
    Consumes("application/msgpack", func() {
        Package("github.com/goadesign/goa/encoding/msgpack")
    })
    // ...
})
```

これだけです。
goa [msgpack](https://goa.design/reference/goa/encoding/msgpack/) パッケージは [NewDecoder](https://goa.design/reference/goa/encoding/msgpack/#func-newdecoder-a-name-msgpack-newdecoder-a) 関数を公開し、生成されたコードは goa デコーダを設定します。

## カスタムエンコーダの利用

カスタムエンコーダを使用するメカニズムは、カスタムデコーダを使用する方法と非常によく似ています。
エンコーダは、`Encoder` インタフェースを実装する必要があります：

```go
// An Encoder marshals from an interface into an io.Writer.
Encoder interface {
	Encode(v interface{}) error
}
```

また、オプションで `ResettableEncoder` インターフェイスを実装して、同期プールの利用を有効にすることもできます：

```go
// The ResettableEncoder is used to determine whether or not a Encoder can be reset and
// thus safely reused in a sync.Pool.
ResettableEncoder interface {
	Encoder
	Reset(w io.Writer)
}
```

エンコーダパッケージでは、次のシグネチャを持つ `NewEncoder` 関数を実装する必要があります：

```go
// EncoderFunc instantiates an encoder that encodes data into the given writer.
EncoderFunc func(w io.Writer) Encoder
```

### カスタムエンコーダの利用

カスタムエンコーダを指定するための DSL 関数は [Produces](https://goa.design/reference/goa/design/apidsl/#func-produces-a-name-apidsl-produces-a) です。これは `Consumes` と同じ構文をサポートしています：

```go
var _ = API("My API", func() {
    // ...
    Produces("application/msgpack", func() {
        Package("github.com/goadesign/goa/encoding/msgpack")
    })
    // ...
})
```

デコーダの場合と同様に、DSL にリストされている最初のエンコーダは、やってくるリクエストの `Accept` ヘッダーが見つからなかったり、デザインにリストされているコンテンツタイプと一致しない場合に使用されるデフォルトのエンコーダになります。
デザインにエンコーダーがリストされていない場合、生成されるコードは標準 JSON エンコーダーをデフォルトにします。
