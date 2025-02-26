---
title: "シングルページアプリケーションの統合"
linkTitle: シングルページアプリケーション
weight: 3
description: "React統合、クライアントサイドルーティングのサポート、本番デプロイメント戦略を含む、シングルページアプリケーション（SPA）をGoaサービスに埋め込んで提供する方法を学びます。"
---

シンプルなアプリケーションの場合、Reactアプリケーションを`go:embed`を使用して
直接Goバイナリに埋め込むことができます。このアプローチは、モダンなフロントエンド
開発の利点とGoの効率的なデプロイメント機能を組み合わせます。APIバックエンドと
Reactフロントエンドの両方を単一の自己完結型の実行可能ファイルにパッケージング
することで、個別のデプロイメントアーティファクトを管理したり、静的ファイル提供用の
追加のWebサーバーを設定したりする必要がなくなります。バイナリをビルドし、デプロイ
して実行するだけです。このアプローチにより、デプロイメントが大幅に簡素化され、
フロントエンドとバックエンドのバージョンが同期されたままになります。

## プロジェクト構造

ReactのSPAを含むプロジェクト構造は以下のようになります：

```
myapp/
├── cmd/                  # メインアプリケーション
├── design/              # 共有デザイン構成要素
│   ├── design.go         # 非APIサービスデザインをインポート
│   └── shared/           # 共有デザイン構成要素
├── gen/                 # 非APIサービス用の生成されたGoaコード
└── services/
    ├── api/
    │   ├── design/       # APIデザイン
    │   ├── gen/          # 生成されたGoaコード
    │   ├── api.go        # API実装
    │   └── ui/
    │       ├── build/    # UIビルド
    │       ├── src/      # Reactソース
    │       └── public/   # 静的アセット
    ├── service1/         # その他のサービス
    :
```

デザインの構成は、関心事の明確な分離を維持するための特定のパターンに従います：

1. パブリックHTTP APIサービス（`services/api`）は独自の`design`パッケージと`gen`
   ディレクトリを持ちます。この分離により、生成されるOpenAPI仕様がパブリックAPI
   エンドポイントのみに焦点を当てることができます。

2. その他のすべてのサービスデザインはトップレベルの`design`パッケージにインポート
   され、そのコードはルートの`gen`ディレクトリに生成されます。このアプローチにより、
   コード生成が2つのコマンドだけで済むようになります：
   - パブリックAPI用の`goa gen myapp/services/api/design`
   - その他のすべてのサービス用の`goa gen myapp/design`

この構造により、どのエンドポイントがパブリックAPIの一部であるかが明確になり、
コード生成プロセスが効率的に保たれます。

さらに、トップレベルのデザインパッケージには、すべてのサービスで使用される
共有デザイン構成要素を含めることができます。

`ui/`ディレクトリにはReactアプリケーションと静的アセットが含まれており、
これらはGoバイナリに埋め込まれます。

## デザイン

APIエンドポイントとSPAの両方を処理するサービスを定義します。開発中は、React開発
サーバーがGoaバックエンドと通信できるようにCORSを設定する必要があります：

```go
var _ = Service("myapp", func() {
    Description("myappサービスはmyappフロントエンドとAPIを提供します。")
    
    // 開発用のCORS設定
    cors.Origin("http://localhost:3000", func() {
        cors.Headers("Content-Type")
        cors.Methods("GET", "POST", "PUT", "DELETE")
        cors.Credentials()
    })
    
    // Reactアプリを提供
    Files("/ui/{*filepath}", "ui/build")
    
    // 静的アセットを直接提供
    Files("/robots.txt", "ui/public/robots.txt")
    Files("/favicon.ico", "ui/public/favicon.ico")
    
    // UIパスを処理
    Method("home", func() {
        HTTP(func() {
            GET("/")
            GET("/ui")
            Redirect("/ui/", StatusMovedPermanently) // ルートを/ui/にリダイレクト
        })
    })
    
    // APIエンドポイント
    Method("list_widgets", func() {
        Description("ウィジェットを一覧表示します。")
        Result(ArrayOf(Widget))
        HTTP(func() {
            GET("/api/widgets")
            Response(StatusOK)
        })
    })
    
    // ... 追加のAPIエンドポイント
})
```

このデザインは以下の目的を果たします：
1. ReactのデフォルトポートでCORSを開発用に設定
2. Reactアプリケーションを`/ui`の下にマウント
3. 静的アセットとリダイレクトを処理
4. `/api`の下にAPIエンドポイントを提供
5. ワイルドカードパスを通じてクライアントサイドルーティングをサポート

CORSの設定の詳細については、[CORS](https://github.com/goadesign/plugins/tree/master/cors)
プラグインを参照してください。

## 実装

### サービス構造

サービス実装はReactビルドを埋め込み、APIリクエストを処理します：

```go
package front

import (
    "embed"
    "context"
)

//go:embed ui/build
var UIBuildFS embed.FS

type Service struct {
    // サービスの依存関係
}

func New() *Service {
    return &Service{}
}

// Homeはリダイレクトハンドラを実装します
func (svc *Service) Home(ctx context.Context) error {
    return nil
}

// APIメソッドの実装
func (svc *Service) ListWidgets(ctx context.Context) ([]*Widget, error) {
    // 実装
}
```

### メイン関数のセットアップ

メイン関数でサービスを設定します：

```go
func main() {
    // サービスとエンドポイントを作成
    svc := myapp.New()
    endpoints := genmyapp.NewEndpoints(svc)
    
    // トランスポートを作成
    mux := goahttp.NewMuxer()
    server := genserver.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil,
        nil,
        http.FS(myapp.UIBuildFS),  // UIを提供
    )
    genserver.Mount(mux, server)
    
    // サーバーを起動
    if err := http.ListenAndServe(":8000", mux); err != nil {
        log.Fatal(err)
    }
}
```

## 開発ワークフロー

ローカル開発の場合：

1. package.jsonでReact開発サーバーを設定：
```json
{
  "proxy": "http://localhost:8000"
}
```

2. React開発サーバーを実行：
```bash
cd services/api/ui
npm start
```

3. Goサービスを実行：
```bash
go run myapp/cmd/myapp
```

package.jsonのプロキシ設定は、CORS設定と連携してシームレスな開発を可能にします。
React開発サーバーはUIを直接提供しながら、APIリクエストをGoaバックエンドに転送します。

## ビルドプロセス

1. Reactアプリをビルド：
```bash
cd services/api/ui && npm run build
```

2. Goバイナリをビルド：
```bash
go build myapp/cmd/myapp
```

## ベストプラクティス

1. **API構成**
   APIエンドポイントを構成する際は、すべてのAPIエンドポイントを`/api`プレフィックス
   の下に配置する一貫した構造に従ってください。これにより、APIルートと静的コンテンツ
   のルートが明確に区別されます。さらに、API全体で一貫した体験を提供するために、
   エラーレスポンスが標準化されたフォーマットに従うようにしてください。最後に、
   クリーンで直感的なAPI構造を維持するために、関連するエンドポイントを機能または
   リソースタイプに基づいて論理的なグループに整理してください。

2. **CORS設定**
   本番環境でCORSを設定する際は、APIにアクセスできるオリジンを具体的に指定してください
   - ワイルドカードを避け、信頼できるドメインを明示的にリストアップします。不要な
   OPTIONSリクエストを減らしパフォーマンスを向上させるために、プリフライトリクエスト
   の適切なキャッシングを実装してください。最小権限の原則に従い、APIが実際に必要と
   するHTTPヘッダーとメソッドのみを公開してください。最後に、クレデンシャルモードを
   有効にすることは、クロスオリジンリクエストにCookieと認証ヘッダーを含めることを
   許可するため、セキュリティへの影響を慎重に検討してください - アプリケーションの
   セキュリティモデルで特に必要な場合にのみ有効にしてください。

3. **SPAの提供**
   SPAを提供する際は、APIルートと明確に区別するために、専用のパス（`/ui`など）の下で
   提供することが重要です。また、クリーンでユーザーフレンドリーなURLを確保するために、
   ルートリダイレクトの適切な処理を実装する必要があります。さらに、サーバー設定は
   フロントエンドアプリケーションで定義されたすべてのルートを適切に処理し、それらの
   ルートに対してメインの`index.html`ファイルを返すことで、クライアントサイド
   ルーティングをサポートする必要があります。 