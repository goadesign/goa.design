---
title: クイックスタート
weight: 1
description: "Complete guide to installing Goa and building your first service - from setup to running a working HTTP endpoint."
llm_optimized: true
aliases:
---

このガイドでは Goa のインストールから最初のサービスの作成までを説明します。最後には、拡張やカスタマイズが可能な HTTP API が使えるようになります。

## 前提条件

始める前に、あなたの環境が以下の要件を満たしていることを確認してください：

- **Go 1.18 以降** - Goa は最新の Go 機能を利用しています。
- **Go Modules enabled** - Go 1.16+ ではデフォルトですが、必要に応じて `GO111MODULE=on` で確認してください。
- **curl または任意の HTTP クライアント** - サービスのテスト用

## インストール

GoaパッケージとCLIツールをインストールします：

```bash
# Pull the Goa packages
go get goa.design/goa/v3/...

# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Verify the installation
goa version
```

現在のGoaのバージョンが表示されるはずです（例：`v3.x.x`）。`goa` コマンドが見つからない場合は、Go bin ディレクトリが PATH にあることを確認してください：

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

例えば上記のように設定します。

---

## 最初のサービスを作る

それでは、Goa のデザインファーストアプローチを示すシンプルな “Hello World” サービスを作ってみましょう。

### 1. プロジェクトのセットアップ

新しいディレクトリを作成し、Goモジュールを初期化します：

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> このガイドでは、シンプルなモジュール名 `hello` を使います。実際のプロジェクトでは、通常`github.com/yourusername/hello-goa`のようなドメイン名を使います。コンセプトは全く同じように機能します。

### 2. API の設計

Goaは強力なDSL (Domain Specific Language)を使ってAPIを記述します。デザイン・ディレクトリとファイルを作成します：

```bash
mkdir design
```

`design/design.go`を作成します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("A simple service that says hello.")

    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "A greeting message")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

このデザインが何をするのかを分解してみよう：

- **`Service("hello", ...)`** - "hello "という新しいサービスを定義する。
- **`Method("sayHello", ...)`** - サービス内にメソッドを定義します。
- **`Payload(String, ...)`** - 入力として、挨拶する名前を文字列で指定する。
- **`Result(String, ...)`** - 出力：挨拶メッセージを指定する。
- **`HTTP(func() { GET("/hello/{name}") })`** - メソッドをHTTP GETエンドポイントにマップし、`{name}`が自動的にペイロードにバインドされます。

この宣言的なアプローチとは、APIが何をするのかを記述し、Goaが実装の詳細（パラメータバインディング、ルーティング、バリデーション、OpenAPIドキュメンテーション）を処理することを意味します。

### 3. コードの生成

設計を完全に機能するサービス構造に変換します：

```bash
goa gen hello/design
```

これにより、以下を含む`gen`フォルダが作成されます：
- サービス・インターフェースとエンドポイント
- HTTPトランスポートレイヤー（ハンドラー、エンコーダー、デコーダー）
- OpenAPI/Swagger仕様
- クライアントコード

次に、動作する実装の足場を作る：

```bash
goa example hello/design
```

> **重要:** `gen` コマンドは実行するたびに `gen/` フォルダーを再生成します。`example` コマンドは、あなたが所有しカスタマイズするスターター実装ファイルを作成します（以後の実行で Goa が上書きしません）。

これで、プロジェクトの構造は次のようになります：

```
hello-goa/
├── cmd/
│   ├── hello/           # Server executable
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli/       # CLI client
│       ├── http.go
│       └── main.go
├── design/
│   └── design.go        # Your API design
├── gen/                 # Generated code (don't edit)
│   ├── hello/
│   └── http/
└── hello.go             # Your service implementation
```

### 4.サービスの実装

`hello.go`を開き、`SayHello`メソッドを見つけます。あなたの実装に置き換えてください：

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
    log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Hello, %s!", name), nil
}
```

これが必要なビジネスロジックのすべてです - Goaが他のすべてを処理します。

### 5. 実行とテスト

まず、依存関係をダウンロードします：

```bash
go mod tidy
```

サーバーを起動します：

```bash
go run ./cmd/hello --http-port=8080
```

こう表示されるはずだ：

```
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

（新しいターミナルで）curl を使ってテストしてください：

```bash
curl http://localhost:8080/hello/Alice
```

レスポンス：

```
"Hello, Alice!"
```

おめでとうございます！最初の Goa サービスが完成しました。

#### 生成された CLI クライアントを使う

Goa はコマンドラインクライアントも生成しました。試してみてください：

```bash
go run ./cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

利用可能なコマンドを調べる：

```bash
go run ./cmd/hello-cli --help
```

---

## 進行中の開発

サービスが進化するにつれて、設計を修正し、コードを再生成します：

```bash
# After updating design/design.go
goa gen hello/design
```

キーポイント
- **`gen/`フォルダ** - 毎回再生成されます。
- **あなたの実装ファイル** - あなたがカスタマイズしてください。
- **新しいメソッド** - デザインに追加し、再生成し、新しいメソッドのスタブを実装します。

---

## 次のステップ

Goaのデザインファーストアプローチの基礎を学びました。旅を続けましょう：

- **[DSL リファレンス](./dsl-reference.md)** - Goa デザイン言語の完全ガイド
- **[HTTP ガイド](./http-guide.md)** - HTTP トランスポート機能を深く掘り下げます。
- **[gRPCガイド](./grpc-guide.md)** - GoaでgRPCサービスを構築します。
- **[エラー処理](./error-handling.md)** - エラーを定義し、適切に処理する
- **[コード生成](./code-generation.md)** - Goa が生成するコードとそのカスタマイズ方法を理解する。
