---
title: 最初のサービス
weight: 2
description: "このハンズオンチュートリアルで最初のGoaサービスを作成しましょう。シンプルなHTTPエンドポイントのサービス設計、コード生成、実装、テストをカバーします。"
---

## 前提条件

素晴らしいものを作る準備はできましたか？このガイドでは`curl`がインストールされていることを前提としています。他のHTTPクライアントでも問題ありません。

## 1. 新しいモジュールの作成

最初のGoaサービスのための新しいワークスペースをセットアップすることから始めましょう：

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> 注意：このガイドでは簡単なモジュール名`hello`を使用していますが、実際のプロジェクトでは
> 通常`github.com/yourusername/hello-goa`のようなドメイン名を使用します。心配しないでください -
> 学ぶ概念はまったく同じように機能します！

## 2. 最初のサービスの設計

さあ、ワクワクする部分です - サービスの設計です！Goaの強力なDSLを使用して、
わずか数行のコードでクリーンでプロフェッショナルなAPIを作成できます。

1. **`design`フォルダの追加**

```bash
mkdir design
```

2. **設計ファイルの作成**（`design/design.go`）：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("シンプルな挨拶を返すサービス。")

    Method("sayHello", func() {
        Payload(String, "挨拶する相手の名前")
        Result(String, "挨拶メッセージ")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

この設計の内容を見てみましょう：

- `Service("hello", ...)`は"hello"という名前の新しいサービスを定義します
- サービス内で、単一のメソッド`sayHello`を定義し、以下を含みます：
  - 文字列の`Payload` - 挨拶したい相手の名前
  - 文字列の`Result` - 挨拶メッセージ
  - `/hello/{name}`のHTTP GETエンドポイントへのマッピング（`{name}`は自動的にペイロードにバインドされます）

この簡単な設計は、Goaの宣言的なアプローチを示しています - APIに何をしてほしいかを記述し、パラメータのバインド、ルーティング、OpenAPIドキュメントなどの実装の詳細はGoaが処理します。

## 3. コードの生成

ここで魔法が起こります！Goaのコードジェネレータを使用して、あなたの設計を
完全に機能するサービス構造に変換しましょう：

```bash
goa gen hello/design
```

これにより、必要なすべてのもの - エンドポイント、トランスポートロジック、さらにはOpenAPI仕様を含む
`gen`フォルダが作成されます。すごいでしょう？

次に、`example`コマンドで動作するサービスのスキャフォールドを作成しましょう：

```bash
goa example hello/design
```

> 注意：`example`コマンドは出発点と考えてください - 構築の基礎となる動作する実装を提供します。
> 設計が変更されたときは`gen`を再実行しますが、`example`から得たコードはカスタマイズと拡張が可能です。

`hello-goa`フォルダには以下のものが作成されます：

```
hello-goa
├── cmd
│   ├── hello
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli
│       ├── http.go
│       └── main.go
├── design
│   └── design.go
├── gen
│   ├── ...
│   └── http
└── hello.go
```

## 4. サービスの実装

サービスに命を吹き込む時が来ました！`hello.go`ファイルを編集し、
`SayHello`メソッドを以下の歓迎の実装に置き換えましょう：

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
    log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("こんにちは、%sさん！", name), nil
}
```

もう少しです - 驚くほど簡単でしたね？

## 5. 実行とテスト

### サーバーの起動

まず、すべての依存関係を整理しましょう：

```bash
go mod tidy
```

さあ、真実の瞬間です - サービスをオンラインにしましょう：

```bash
go run hello/cmd/hello --http-port=8080
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

### サービスの呼び出し

新しいターミナルを開いて、サービスを動作させてみましょう：

```bash
curl http://localhost:8080/hello/Alice
"こんにちは、Aliceさん！"
```

🎉 素晴らしい！最初のGoaサービスを作成してデプロイしました。これはGoaで構築できるものの始まりに過ぎません！

### CLIクライアントの使用

もっとクールなものを試してみませんか？Goaは自動的にコマンドラインクライアントを生成しました。
試してみましょう：

```bash
go run hello/cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

CLIで他に何ができるか気になりますか？すべての機能を確認してみましょう：

```bash
go run hello/cmd/hello-cli --help
```

## 6. 継続的な開発

### DSLの編集 → 再生成

サービスが成長するにつれて、新機能を追加したくなるでしょう。設計に新しいメソッド、
フィールド、エラーを追加するたびに、以下を実行します：

```bash
goa gen hello/design
```

サービスコードはあなたのものです - Goaは`gen`フォルダ外のものには触れないので、
好きなように拡張とカスタマイズができます！

## 7. 次のステップ

Goaのスキルをさらに高めたいですか？[チュートリアル](../3-tutorials)に進んで、
強力なREST API、gRPCサービスなどの構築方法を学びましょう。可能性は無限大です！ 