+++
date = "2019-09-08T11:01:06-05:00"
title = "HTTP エンコーディング"
weight = 2

[menu.main]
name = "HTTP エンコーディング"
parent = "implement"
+++

## 概要

Goa は、柔軟なエンコード/デコードをサポートしていて、任意のエンコーダーおよびデコーダーを特定の HTTP レスポンスおよびリクエスト・コンテンツタイプに関連付けることができます。
エンコーダーは [Encoder](https://godoc.org/goa.design/goa/http#Encoder) インターフェイスを実装する構造体であり、
デコーダーは [Decoder](https://godoc.org/goa.design/goa/http#Decoder) インターフェイスを実装する構造体です。

生成されたサーバーコンストラクターは、引数としてエンコーダーおよびデコーダーのコンストラクター関数を受理し、任意の実装を提供できるようにします。
Goa には、JSON、XML、および [gob](https://golang.org/pkg/encoding/gob/) をサポートするデフォルトのエンコーダーとデコーダーが付属しています。
[基本的な例](https://github.com/goadesign/examples/blob/master/basic)で見てみると、Goa によって生成されるサーバーコンストラクターのシグネチャは次のようになります：

```go
// New は、すべての calc サービスのエンドポイントに対して HTTP ハンドラーをインスタンス化します。
func New(
	e *divider.Endpoints,
	mux goahttp.Muxer,
	decoder func(*http.Request) goahttp.Decoder,
	encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
	errhandler func(context.Context, http.ResponseWriter, error),
	formatter func(context.Context, err error) goahttp.Statuser
) *Server
```

引数 `decoder` は、リクエストを受け取りデコーダーを返す関数です。
Goa はリクエストごとにこの関数を呼び出し、異なる HTTP リクエストに異なるデコーダーを提供できるようにします。
引数 `encoder` は、コンテキストと HTTP レスポンスライターを受け取り、エンコーダーを返す関数です。

### デフォルトのエンコーダー/デコーダーのコンストラクター

Goa パッケージは、JSON、XML、および gob をエンコード/デコードできるデフォルトの HTTP 
[エンコーダー](https://godoc.org/goa.design/goa/http#RequestEncoder) / 
[デコーダー](https://godoc.org/goa.design/goa/http#ResponseEncoder)
のコンストラクターを提供します。 
ここに、デフォルトの example ジェネレーターが `calc` の例でこれらのコンストラクタをどのように活用しているかを示します：

```go
	var (
		dec = goahttp.RequestDecoder
		enc = goahttp.ResponseEncoder
	)
    //...

	var (
		calcServer *calcsvr.Server
	)
	{
        // ...
		calcServer = calcsvr.New(calcEndpoints, mux, dec, enc, eh)
	}
```

## デコード

デフォルトのリクエストデコーダーは、受け取ったリクエストの `Content-Type` をみて、それをデコーダーと照合します。
値が `application/json` なら JSON デコーダーに、`application/xml` なら XML デコーダーに、`application/gob` なら gob デコーダーに割り当てられます。
JSON デコーダーは、`Content-Type` ヘッダーが欠落している場合や、既知の値と一致しない場合にも使用されます。
デコードが失敗した場合、Goa はエラーレスポンスにステータスコード 400 を用い、そのボディを書き込みに [ServiceError](https://pkg.go.dev/goa.design/goa/v3@v3.6.0/pkg#ServiceError) エラーを使用します
（エラーがどのように HTTP レスポンスに変換されるかの詳細については、[エラー処理](/implement/error_handling/) を参照してください）。


### カスタムデコーダーの作成

 [概要](#Overview) で示したように、デコーダーの作成は、`Decoder` インターフェース
 およびデコーダーコンストラクター関数の実装を次のシグネチャで作成することで構成されます：

```go
func(r *http.Request) (goahttp.Decoder, error)
```
ここで、`goahttp` は、`goa.design/goa/v3/http` というパスを持つパッケージのエイリアスです。
コンストラクター関数はリクエストオブジェクトにアクセスできるため、その状態を検査して、可能な限り最良のデコーダーを推測できます。
この関数は、概要に示したように、生成されたサーバーコンストラクターに与えられます。

## エンコード

デフォルトのレスポンス・エンコーダーは、単純なコンテンツ・ネゴシエーションアルゴリズムを実装しており、
受け取ったリクエストの `Accept` ヘッダーの値、もしくはこれが - 欠落している場合 - は `Content-Type` ヘッダーの値を活用します。
アルゴリズムはヘッダーの値をサニタイズし、JSON、XML、および gob の MIME タイプと比較して、適切なエンコーダーを推測します。
`Accept` または `Content-Type` ヘッダーがない場合、または値が既知のコンテンツタイプのいずれかとも一致しない場合、
アルゴリズムはデフォルトで JSON になります。

### カスタムエンコーダーの作成

あなたの作成したサービスが、異なるエンコーダーを使用する必要がある理由はたくさんあります。
たとえば、あなたのユースケースでは、stdlib JSON パッケージからカスタムパッケージに切り替えるとパフォーマンスが向上しそうだという場合には、
デコーダーを切り替えたくなるでしょう。
また、msgpack などのさまざまなシリアル化形式をサポートする必要がある場合もあります。
概要に示されているように、エンコーダーは `Eecoder` インターフェイスを実装する必要があり、次のシグネチャを持つコンストラクター関数を介して生成されたコードに提供できます。

```go
func(ctx context.Context, w http.ResponseWriter) (goahttp.Encoder, error)
```

Goa がコンストラクター関数を呼び出すときに指定されるコンテキストには、
`Content-Type` リクエストと `Accept` ヘッダーの値が [ContentTypeKey](https://godoc.org/goa.design/goa/http#pkg-constants) と `AcceptTypeKey` が
のそれぞれに含まれています。
これにより、エンコーダー・コンストラクターは、これらのヘッダーの値を調べて、
クライアントにとって最適なエンコーダーを返すコンテンツタイプ・ネゴシエーションを実装できます。

## デフォルト・コンテンツタイプの設定

[レスポンス](https://godoc.org/goa.design/goa/dsl#Response) デザイン DSL では、
[ContentType](https://godoc.org/goa.design/goa/dsl#ContentType) を使用してコンテンツタイプを指定できます。
設定すると、値はリクエストヘッダーで指定されたコンテンツタイプをオーバーライドします。
これは `Accept` ヘッダーで指定された値をオーバーライドしないことに注意してください。
これにより、`Accept` ヘッダーがない場合に、レスポンス・エンコーダー コンストラクターが使用するコンテンツタイプを制御できます。
