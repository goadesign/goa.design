+++
date = "2016-01-30T11:01:06-05:00"
title = "サービスマルチプレクサ"
weight = 7

[menu.main]
name = "マルチプレクサ"
parent = "implement"
+++

# サービスマルチプレクサ

goa HTTP リクエストマルチプレクサは、やってくるリクエストの正しいコントローラアクションへの発送を管理しています。
それは、よく使う HTTP メソッドとハンドラへのパスのバインディングを掌握した goa [ServeMux](https://goa.design/v1/reference/goa/#type-servemux-a-name-goa-servemux-a) を実装し、登録されたハンドラを検索する機能も提供します。

`ServeMux` インタフェースの [Handle](https://goa.design/v1/reference/goa/#type-servemux-a-name-goa-servemux-a) メソッドは、リクエスト HTTP メソッドを [MuxHandler](https://goa.design/v1/reference/goa/#type-muxhandler-a-name-goa-muxhandler-a) へのパスに関連づけます。MuxHandler は HTTP レスポンスライターならびにリクエスト、すべてのパスやクエリパラメータを含む URL Value インスタンスを受け付ける関数です。

`goagen` によって生成されたコードは自動的に `Handle` 関数を呼び出します。
この関数を直接呼び出すことは、生成されたものでないハンドラ、たとえばサードパーティのパッケージからのサポート機能を提供するようなハンドラ、をマウントする場合にのみ必要です。
特に、標準 [HTTP](https://golang.org/pkg/net/http/#Handler) パッケージから HTTP ハンドラをラップすることは簡単です：

```go
// assetHandler returns the handler in charge of serving static assets.
func assetHandler() goa.MuxHandler {
    base := "/path/to/website/static/files"
    h := gzip.FileServer(http.Dir(base))
    return func(rw http.ResponseWriter, req *http.Request, v url.Values) {
        h.ServeHTTP(rw, req)
    }
}
```

そのようなハンドラはサービスマルチプレクサにマウントすることができます：

```
func main() {
    service := goa.New("Service with assets")
    service.Mux.Handle("GET", "/static/*asset", assetHandler())
    // ...
}
```

## NotFound の処理

`ServeMux` インタフェースは、`HandleNotFound` メソッドも公開しています。
`HandleNotFound` メソッドは、登録されたハンドラーに対応しないパスにリクエストが送信されたときに呼び出されるハンドラーを設定します。
`Service` データ構造体は、その機能を利用して、ステータスコード 404 のレスポンスを返す一般的な NotFound ハンドラを登録します。
