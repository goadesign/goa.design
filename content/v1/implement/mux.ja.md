+++
date = "2016-01-30T11:01:06-05:00"
title = "サービスマルチプレクサ"
weight = 7

[menu.v1]
name = "マルチプレクサ"
parent = "implement.v1"
+++

# サービスマルチプレクサ

goa HTTP リクエストマルチプレクサは、やってくるリクエストの正しいコントローラアクションへの発送を管理しています。
それは、よく使う HTTP メソッドとハンドラへのパスのバインディングを掌握した goa [ServeMux](/v1/reference/goa/#ServeMux) を実装し、登録されたハンドラを検索する機能も提供します。

`ServeMux` インタフェースの [Handle](/v1/reference/goa/#ServeMux) メソッドは、リクエスト HTTP メソッドを [MuxHandler](/v1/reference/goa/#MuxHandler) へのパスに関連づけます。MuxHandler は HTTP レスポンスライターならびにリクエスト、すべてのパスやクエリパラメータを含む URL Value インスタンスを受け付ける関数です。

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
