---
title: "テンプレートの統合"
linkTitle: テンプレートの統合
weight: 2
description: "テンプレートの構成、データの受け渡し、適切なエラー処理を含む、動的HTMLコンテンツをレンダリングするためにGoのテンプレートエンジンをGoaと統合します。"
---

Goaサービスは、Goの標準`html/template`パッケージを使用して動的HTMLコンテンツを
レンダリングできます。このガイドでは、テンプレートレンダリングをGoaサービスに
統合する方法を説明します。

## デザイン

まず、HTMLテンプレートをレンダリングするサービスエンドポイントを定義します：

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("front", func() {
    Description("テンプレートレンダリングを行うフロントエンドWebサービス")

    Method("home", func() {
        Description("ホームページをレンダリングします")
        
        Payload(func() {
            Field(1, "name", String, "ホームページに表示する名前")
            Required("name")
        })
        
        Result(Bytes)
        
        HTTP(func() {
            GET("/")
            Response(StatusOK, func() {
                ContentType("text/html")
            })
        })
    })
})
```

## 実装

### サービス構造

テンプレートレンダリングを管理するサービスを作成します：

```go
package front

import (
    "context"
    "embed"
    "html/template"
    "bytes"
    "fmt"

    genfront "myapp/gen/front" // 生成されたパッケージ名に置き換えてください
)

//go:embed templates/*.html
var templateFS embed.FS

type Service struct {
    tmpl *template.Template
}

func New() (*Service, error) {
    tmpl, err := template.ParseFS(templateFS, "templates/*.html")
    if err != nil {
        return nil, fmt.Errorf("テンプレートの解析に失敗しました: %w", err)
    }
    
    return &Service{tmpl: tmpl}, nil
}
```

### テンプレートレンダリング

テンプレートをレンダリングするサービスメソッドを実装します：

```go
func (svc *Service) Home(ctx context.Context, p *genfront.HomePayload) ([]byte, error) {
    // テンプレート用のデータを準備
    data := map[string]interface{}{
        "Title":   "ようこそ",
        "Content": p.Name + "さん、ようこそ！",
    }
    
    // レンダリングされたテンプレートを格納するバッファを作成
    var buf bytes.Buffer
    
    // テンプレートをバッファにレンダリング
    if err := svc.tmpl.ExecuteTemplate(&buf, "home.html", data); err != nil {
        return nil, fmt.Errorf("テンプレートのレンダリングに失敗しました: %w", err)
    }
    
    return buf.Bytes(), nil
}
```

### テンプレート構造

`templates`ディレクトリにHTMLテンプレートを作成します：

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
</head>
<body>
    {{block "content" .}}{{end}}
</body>
</html>

<!-- templates/home.html -->
{{template "base.html" .}}
{{define "content"}}
    <h1>{{.Title}}</h1>
    <p>{{.Content}}</p>
{{end}}
```

### サーバーセットアップ

テンプレートサービスでサーバーをセットアップします：

```go
func main() {
    // サービスを作成
    svc := front.New()
    
    // HTTPサーバーを初期化
    endpoints := genfront.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genserver.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    genserver.Mount(server, mux)
    
    // サーバーを起動
    if err := http.ListenAndServe(":8080", mux); err != nil {
        log.Fatalf("サーバーの起動に失敗しました: %v", err)
    }
}
```

## オプション：静的コンテンツと動的コンテンツの組み合わせ

静的ファイルと動的テンプレートの両方を提供する必要がある場合、サービスデザインで
それらを組み合わせることができます：

```go
var _ = Service("front", func() {
    // 動的テンプレートエンドポイント
    Method("home", func() {
        HTTP(func() {
            GET("/")
            Response(StatusOK, func() {
                ContentType("text/html")
            })
        })
    })
    
    // 静的ファイルの提供
    Files("/static/{*filepath}", "public/static")
})
```

このセットアップは以下を提供します：
- ルートパス（/）での動的テンプレートコンテンツ
- /staticパスでの静的ファイル（CSS、JS、画像）
- public/static以下のすべてのファイルは/static/で利用可能

## ベストプラクティス

1. **テンプレートの構成**
   - ベースレイアウトを使用したテンプレートの構成
   - テンプレートを専用のディレクトリに保管
   - embed.FSを使用してテンプレートをバイナリにバンドル

2. **エラー処理**
   - サービス初期化時にテンプレートを解析
   - テンプレートレンダリングが失敗した場合は意味のあるエラーを返す
   - 適切なHTTPレスポンスコードとヘッダーを設定

3. **パフォーマンス**
   - 起動時に一度だけテンプレートを解析
   - 本番環境でテンプレートキャッシングを使用
   - 開発環境でテンプレートの再読み込みの実装を検討 