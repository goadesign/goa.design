---
title: "コーディングエージェントと開発する"
linkTitle: "エージェントとの開発"
weight: 1
description: "明確な契約を渡し、反復的なコードは生成し、コンパイラーの指摘を使って実装を進めます。"
---

Goaは**コーディングエージェントとソフトウェアを開発すること**と、**ソフトウェアにAIエージェントを組み込むこと**を支えます。Goaはサービスの契約を生成し、Goa-AIはツール、構造化出力、エージェント接続へと生成範囲を広げます。

## コード生成が開発を変える理由

LLMがハンドラー、クライアント、スキーマ、検証を別々に書く場合、それらの整合性も保つ必要があります。Goaは設計から導出できるコードを生成するため、モデルは要件、ドメインの判断、実装に集中できます。

- **反復的な記述を減らす。** LLMに各ファイルを書かせずに生成します。総トークン数の削減はコンテキスト、反復、レビューによって変わります。
- **必要なコンテキストを絞る。** 型、説明、例、制約、操作が設計にまとまっています。大きな実装を調べる前に、関連する設計とインターフェースを読みます。
- **編集範囲を明確にする。** 設計とアプリケーションを編集し、`gen/`は再生成します。サービスごとに別の通信パターンやスキーマ規約を考える必要を減らします。
- **コンパイラーを使う。** 生成されたシグネチャの変更で不整合な実装と呼び出しを検出します。動作の変更はテストで確認します。
- **契約をつなげる。** Goa-AIは型を再利用し、生成されたスキーマ、コーデック、変換を使ってツールとメソッドを接続します。

## Goa service designerスキルをインストール {#install-the-skill}

アプリケーションのリポジトリ内で実行します。[Skills CLI](https://github.com/vercel-labs/skills)がスキル全体をインストールし、利用するコーディングツールを選択できます。Node.jsとnpmが必要です。

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

スキルは、プロジェクトの確認、設計の変更、対応バージョンの生成器の実行、`gen/`外での実装、影響する呼び出し元の更新、検証へとエージェントを導きます。サービス契約、HTTP/gRPC、検証、エラー、インターセプターを扱います。Goa-AIでは生成された`AGENTS_QUICKSTART.md`も渡してください。このスキル自体はGoaサービス向けです。

インストーラーの選択画面を使わず、対象ツールを指定するには：

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

既定ではプロジェクト内にインストールされます。個人用には`--global`、シンボリックリンクが使えない環境では`--copy`を追加します。Node.jsを使わない場合は、[`goa-service-designer`ディレクトリ](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer)全体を、ツールが対応するスキルディレクトリにコピーしてください。

## 開発の繰り返し

### 1. 必要なコンテキストを渡す

目的、設計ファイル、変更対象の実装を渡します。[Goa service designerスキル](https://github.com/goadesign/goa/tree/v3/skills)は使用する開発ツールの手順に沿って導入してください。

Goa-AIでは、アプリケーションのルートにある**`AGENTS_QUICKSTART.md`**も読みます。`DisableAgentDocs()`を指定しなければ設計から生成され、パッケージと残りの実装作業を説明します。Markdownページや[索引](/ja/llms.txt)から必要な資料を渡してください。生成された通信コードを最初からすべて読み込まず、タスクに必要なときに調べます。

### 2. 設計から変更する

`design/`に操作、入力、結果、エラー、制約を定義します。構造の検証は設計に置き、認可やビジネスルールは担当するアプリケーションコードに置きます。ツールの説明には使用場面、返す結果、各フィールドの意味を書きます。同じドメイン契約ならサービスの型を再利用します。

### 3. 生成して実装する

```bash
goa gen example.com/catalog/design
```

`gen/`の外でインターフェースを実装します。`goa example`は初期ファイルを一度だけ作成し、既存のロジックは更新しません。コンパイルエラーを`gen/`の編集で直さず、設計または実装を修正して再生成します。

### 4. 変更全体を確認する

```bash
gofmt -w design
go test ./...
```

公開契約の差分をレビューし、呼び出し元が観測する動作をテストします。AIアプリケーションでは成果とツールの利用を評価します。スキーマに適合した引数でも、正しいツールを選んだとは限りません。認可、外部副作用の冪等性、稼働中クライアントとの互換性はアプリケーション側で検証します。

## ひとつの設計、ふたつの入り口 {#one-design-two-entry-points}

このカタログは同じ操作を**HTTP、gRPC、JSON-RPC**で公開し、そのメソッドに紐付くツールをエージェントへ提供します。`LookupPayload`と`Product`が両方の契約を定義し、フィールド番号がProtocol Bufferのマッピングも定義します。商品検索とプランナーはアプリケーション側で実装します。

モジュールを作り、この例で使うバージョンを導入します。

このガイドは安定版リリースではなく、固定したGoa-AIの開発スナップショットを使用します。Goモジュールが対応するGoaの依存バージョンを選択します。ジェネレーターは`go run`で実行し、そのバージョンを使ってください。Goはモジュールで宣言されたバージョン以降を使用します。

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.78.8-0.20260915025548-ae0c418b7e77
mkdir design
```

次を`design/catalog.go`に保存します。

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {
    Title("Product catalog")
    Description("Find products through an API or an agent tool")
})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "sku", String, "Product stock-keeping unit", func() {
        MinLength(1)
    })
    Required("sku")
    Example(map[string]any{"sku": "BOOK-1"})
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product stock-keeping unit")
    Field(2, "name", String, "Product name")
    Required("sku", "name")
    Example(map[string]any{"sku": "BOOK-1", "name": "The Go Book"})
})

var _ = Service("catalog", func() {
    Description("Provides product information to API clients and agents")
    JSONRPC(func() { POST("/rpc") })

    Method("lookup", func() {
        Description("Find a product by SKU")
        Payload(LookupPayload)
        Result(Product)

        HTTP(func() {
            GET("/products/{sku}")
            Response(StatusOK)
        })
        GRPC(func() {})
        JSONRPC(func() {})
    })

    Agent("assistant", "Find products", func() {
        Use("catalog", func() {
            Tool("lookup", "Find a product by SKU", func() {
                Args(LookupPayload)
                Return(Product)
                BindTo("lookup")
            })
        })
    })
})
```

契約と初期ファイルを生成します。

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

インターフェース、HTTPサーバーとクライアント、OpenAPI、ツールのスキーマとコーデック、`AGENTS_QUICKSTART.md`を確認します。プロダクトで使う前に検索を実装し、サンプルのプランナーを置き換えてください。

## タスクを渡すためのプロンプト

```text
Read design/ and the relevant generated service interface. For Goa-AI,
also read AGENTS_QUICKSTART.md.

Implement the requested behavior by changing the design first when the
contract changes. Regenerate with the project's pinned Goa version.
Do not edit gen/ or maintain a second tool schema by hand.

Update application implementations and callers. Put structural validation
in the design; keep authorization and business rules in their owning code.
Run the project's tests and relevant agent evaluations. Report the contract
changes, checks performed, and any behavior still needing review.
```

実際に求める成果と受け入れ条件を追加してください。このプロンプトは手順を定めるもので、明確なタスクや開発者の判断に代わるものではありません。

## プロジェクトで効果を測る

同じタスク、受け入れ条件、モデル、初期コードを使い、複数回比較します。入力・出力トークン、経過時間、生成とテストの時間、手作業の修正、レビュー、動作上の不具合を記録し、準備と失敗した試行も含めます。生成行数はジェネレーターが行う仕事を示すもので、トークン削減や生産性のベンチマークではありません。

普遍的な「10倍」の効果は主張しません。反復的な契約の記述を決定的な生成に任せ、人とエージェントが取り組む実装目標を明確にすることが、具体的な利点です。

[Goaクイックスタート](../1-goa/quickstart/)または[Goa-AIクイックスタート](../2-goa-ai/quickstart/)へ進んでください。
