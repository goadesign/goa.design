+++
date = "2016-01-30T11:01:06-05:00"
title = "リクエストミドルウエア"
weight = 8

[menu.v1]
name = "ミドルウェア"
parent = "implement.v1"
+++

## 組み込みミドルウエア

`middleware` パッケージは、すでに `goa` によって使用されているパッケージ以外の追加パッケージに依存しないミドルウェアを提供します。
これらのミドルウェアは、ほとんどのマイクロサービスに役立つ機能を提供します：

* [LogRequest](/v1/reference/goa/middleware/#LogRequest) は、やってくるリクエストとそれに対応するレスポンスのログを有効にします。ログの形式は全体的に設定可能になっています。デフォルトの形式ではアクションと対応するコントローラの名前だけでなく、リクエスト HTTP メソッド、パス、パラメータを記録します。
また、リクエストの時刻、レスポンス長も記録します。
もし DEBUG ログレベルが有効になっていれば、リクエスト・ペイロードも記録します。
最後に RequestID ミドルウエアが LogRequest ログにマウントされていれば、一意のリクエスト ID が各ログエントリと一緒に記録されます。

* [LogResponse](/v1/reference/goa/middleware/#LogResponse) は DEBUG ログレベルが有効な場合、レスポンスボディの内容を記録します。

* [RequestID](/v1/reference/goa/middleware/#RequestID) は一意の ID をリクエストコンテキストに注入します。
この ID はロガーで利用され、コントローラーアクションでも利用できます。
ミドルウエアは [RequestIDHeader](/v1/reference/goa/middleware/#RequestIDWithHeader) でヘッダーの ID を調べて、もし見つからなければこれを作ります。

* [Recover](/v1/reference/goa/middleware/#Recover) は panic をリカバーし、panic の内容とバックトレースを記録します。

* [Timeout](/v1/reference/goa/middleware#Timeout) はリクエストコンテキストの Deadline を設定します。
コントローラのアクションは、時間切れのときの通知を受け取るコンテキストチャネルを受信することができるようになるでしょう。

* [RequireHeader](/v1/reference/goa/middleware#RequireHeader) は与えられた正規表現とマッチする値がリクエストのヘッダーに存在するかをチェックします。もしヘッダーがないとか正規表現とマッチしない場合には、ミドルウエアは指定された HTTP ステータスを持つ HTTP レスポンスを送信します。

下記のミドルウエアは 別々の Go のパッケージとして提供されています。

#### Gzip

[@tylerb](https://github.com/tylerb) 氏によって提供されている [gzip](/v1/reference/goa/middleware/gzip) パッケージは RFC 1952で指定された gzip 形式を使用して、レスポンスボディを圧縮する機能を追加します。

#### セキュリティ

[security](/v1/reference/goa/middleware/security) パッケージは、セキュリティ DSL と合わせて使うミドルウエアを含んでいます。

## あなた自身で書くこと

ミドルウエアはリクエストハンドラを受け付けて、リクエストハンドラを返す関数です。
アイデアは、ミドルウェアが「連鎖」しており、実際のアクション実装が最後のリンクであるということです。
[アレックス エドワーズ氏が書いているような](https://www.alexedwards.net/blog/making-and-using-middleware)
Go でミドルウエアを記述しているよい記事が web には多くあります。

goa のリクエストハンドラは、次のようなシグネチャを持ちます：

```go
// Handler defines the request handler signatures.
Handler func(context.Context, http.ResponseWriter, *http.Request) error
```

そして、ミドルウエアは：

```go
// Middleware represents the canonical goa middleware signature.
Middleware func(Handler) Handler
```
ミドルウエアを書くことは、すなわち、ハンドラを受け取ってハンドラを返す関数を書くことからなります：

```go
// MyMiddleware does something interesting.
func MyMiddleware(h goa.Handler) Handler {
    return func(ctx context.Context, rw http.ResponseWriter, req *http.Request) error {
        // Use ctx, rw and req - for example:
        newctx = context.WithValue(ctx, "key", "value")
        rw.Header().Set("X-Custom", "foo")

        // Then call the next handler:
        return h(newctx, rw, req)
    }
}
```

ミドルウェアは、 `Use` メソッドを使用してサービスまたはコントローラにマウントできます。

```go
s := goa.New("my service")
s.Use(MyMiddleware)
```

### ミドルウエアの設定

しばしばミドルウエアに設定情報を渡す必要があります。
たとえば、goa の [Timeout](/v1/reference/goa/middleware/#Timeout)
ミドルウエアはタイムアウトまでの時間が必要です。
これは、設定情報をパラメータとして受け付け、クロージャを使用してミドルウェアを構築するコンストラクタ・メソッドを提供することで簡単に達成できます：

```go
// MyConfiguredMiddleware does something interesting and needs a "config" string value.
func MyConfiguredMiddleware(config string) goa.Middleware {
    return func(h goa.Handler) Handler {
        return func(ctx context.Context, rw http.ResponseWriter, req *http.Request) error {
            // Use ctx, rw, req and any parameter given to the middleware constructor:
            rw.Header().Set("X-Custom", config)
        }
    }
}
```

上記のミドルウエアをマウントすると次のようになります：

```go
s := goa.New("my service")
s.Use(MyConfiguredMiddleware("value"))
```

上記のパターンは、設定の値があろうと無かろうとすべての組み込みミドルウエアが一貫性のために従うものです。

