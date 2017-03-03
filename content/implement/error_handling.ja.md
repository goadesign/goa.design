+++
date = "2016-03-12T01:01:06-05:00"
title = "エラーハンドリング"
weight = 4

[menu.main]
name = "エラーハンドリング"
parent = "implement"
+++

## 目標

すべてのソフトウェア層で一貫した方法でサービスのエラーをハンドリングし、
クライアントに文書化された出力を提供することは困難ですが、
しかしまた、きちんとしたAPI境界を定義するための要件でもあります。 
goaは、すべてのコンポーネントに特別なエラー処理コードを記述することなく、
すべての起こりうるエラーを分類するシンプルな方法を提供するよう適切なバランスに努めています。
具体的な目標は次のとおりです：

* すべての起こりうるレスポンスを文書化すること。
* API エンドポイント（goa のコントローラー）にエラーの分類ロジックを保持すること。
* 既存のエラーの分類を簡単な方法で提供すること。

## エラークラスの導入

上記の目標を達成するために goa で使用される抽象化は、エラークラスです。
エラークラスは、次のフィールドを使用してエラーレスポンスの形を定義します：

* `id`: この特定の発生した問題への一意の識別子。
* `status`: この問題に適用される HTTP ステータス。
* `code`: 文字列の値で表現される、アプリケーション特有のエラーコード。
* `detail`: この発生した問題への人間が判読可能な説明。タイトルと同様に、このフィールドはローカライズ可能です。
* `meta`: エラーに関する非標準のメタ情報を含むメタオブジェクト。

エラークラスは、エラーコードとステータスを受け入れる
[NewErrorClass](https://goa.design/reference/goa/#func-newerrorclass-a-name-goa-errorclass-newerrorclass-a)
関数を使用して作成されます：

```go
func NewErrorClass(code string, status int) ErrorClass
```

エラークラスは、メッセージとオプションでキーと値のペアを指定して `error` のインスタンスを生成する関数です：

```go
type ErrorClass func(message interface{}, keypairs ...interface{}) error
```

例：

```go
// Create a new error class:
invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 422)
// And use it to create errors:
return invalidEndpointErr("endpoint cannot be resolved", "endpoint", endpoint, "error", err)
```
goa では一般的なケースをカバーするために利用できる既存のエラークラスのセットが付属しています。
特に有用なエラークラスのひとつは `ErrBadRequest` で bad request error を返すのに利用できます：

```
func (c *OperandsController) Divide(ctx *app.OperandsContext) error {
          if ctx.Divisor == 0 {
                  return goa.ErrBadRequest("cannot divide by zero")
          }
          // ...
}
```

エラークラス関数の呼び出しによって返されるすべてのエラーは、[ServiceError](https://goa.design/reference/goa/#type-serviceerror-a-name-goa-serviceerror-a) インターフェイスを実装します。
このインタフェースは、ミドルウェアがロギングなどのエラー処理に利用できるようなエラーレスポンスのステータスや固有のトークンを公開します。
また、エラーオブジェクトの振る舞いをチェックすることによって、エラークラスを介して生成されたエラーがかどうかを判定することもできます。

```go
if _, ok := err.(goa.ServiceError); ok {
    // Error created via a error class
    // Contains the data needed to build a proper response
} else {
    // Error is a generic Go error
    // Will result in an internal error unless wrapped with a error class
}
```

## エラークラスを使う

エラークラスのユースケースは主に2つあります：

* エラークラスを使用して、内部モジュールから返されたエラーをラップすることができます。
* エラークラスを使用して API エンドポイントで新しいエラーを直接作成することができます（たとえばカスタムバリデーションエラー）。

### 既存のエラーをラップする

既存のエラーをラップするには、単に `error` インスタンスにエラークラス関数を適用して呼び出すだけで完了します：

```go
        if err := someInternalMethod(); err != nil {
               return goa.ErrBadRequest(err)
        }
```

オプションの対になったキーのパラメータを用いることで、追加のメタデータをエラーに添付する事ができます：

```go
        if err := someInternalMethod(); err != nil {
               return goa.ErrBadRequest(err, "module", "internal")
        }
```

### 新しいエラーを作る

新しいエラーを作った方が便利な場合もしばしばあります。たとえば、クライアントが特定のエラーのクラスを特定の方法で扱う必要があるかもしれません。エラーはログや他のトレースする仕組みによって簡単に区別できる必要があるかもしれません。
この場合、エラークラス関数は `errors.New` と同様に動作します：

```go
// DoAction is a dummy example of a goa action implementation that defines a new error class and
// uses it to create a new error then to wrap an existing error.
func (c *MyController) DoAction(ctx *DoActionContext) error {
        endpoint := ctx.SomeServiceEndpoint
        invalidEndpointErr := goa.NewErrorClass("invalid_endpoint", 400)
        // Assume endpoint must contain .mycompany.com
        if !strings.Contains(endpoint, ".mycompany.com") {
              return invalidEndpointErr("endpoint must contain .mycompany.com", "endpoint", endpoint)
        }
        // ...
}
```

## エラーハンドラー

[ErrorHandler](https://goa.design/reference/goa/middleware/#func-errorhandler-a-name-middleware-errorhandler-a)
ミドルウエアは返されたエラーを HTTP レスポンスにマップします。
goa の [ErrorClass](https://goa.design/reference/goa/#type-errorclass-a-name-goa-errorclass-a) を介して作成されたエラーは、レスポンスボディでシリアライズされ、それらのステータスはレスポンス HTTP ステータスを整形するために使用されます。
それ以外のエラーはステータスコード 500 のレスポンスを生じさせる [ErrInternal](https://goa.design/reference/goa/#variables) 
にラップされます。

## エラーレスポンスをデザインする

これまで、コントローラのコードがエラーレスポンスをどのように適応また作成するかを見てきました。
最終的には、APIのデザインによってレスポンスの正しい内容が決定されます。
goa デザインパッケージは、エラークラスを介して作成されたエラーに対応するレスポンスの記述を利用してアクション定義が利用できる [ErrorMedia](https://goa.design/reference/goa/#variables) メディアタイプを提供しています。

そのようなアクション定義の例はこのようになります：

```go
var _ = Resource("bottle", func() {
        Action("create", func() {
                Routing(POST("/"))
                Response(Created)
                Response(BadRequest, ErrorMedia) // Maps errors return by the Create action
        })
})
```

`ErrorMedia` のために生成されたGoの型は `error` であるので、コントローラコードはエラーを直接再利用して、生成されたレスポンスメソッドでレスポンスを送信できます：

```go
func (c *BottleController) Create(ctx *app.CreateBottleContext) error {
        b, err := c.db.Create(ctx.Payload)
        if err != nil {
                // ctx.BadRequest accepts a *goa.Error as argument
                return ctx.BadRequest(goa.ErrBadRequest(err))
        }
        return ctx.OK(b)
}
```

## すべてを統合して

最初の目標に戻ってみましょう。API デザインは、[Response](https://goa.design/reference/goa/design/apidsl/#func-response-a-name-apidsl-response-a) DSL によるエラーレスポンスを含む各アクションの可能なレスポンスを定義しています。
エラークラスは、エラークラスを利用してエラーをラップすることによって、実装によって生成されたエラーをデザインにマップする方法を提供します。

サービスは、ドメイン固有のエラーを処理する独自のエラークラスを作成する必要があります。
コントローラーは、適切なレスポンスが送信されるように、エラークラスを添付したエラーだけを返すようにする必要があります。
これらのエラーを作成するか、より深いレイヤーからのエラーをラップすることで、そうすることができます。

コントローラアクションは、デザインで定義された約定を実装する責任があることに注意してください。
つまり、[アクション定義](https://goa.design/reference/goa/design/apidsl/#func-action-a-name-apidsl-action-a)にリストされていない HTTP ステータスコードを使用するエラークラスを定義するべきではありません。
