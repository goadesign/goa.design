---
title: "コーディングエージェントと開発する"
linkTitle: "エージェントとの開発"
weight: 1
description: "コーディングエージェントに明示的な契約を渡し、反復的なコードは生成し、コンパイラのフィードバックで実装を導きます。"
---

Goa は関連する 2 つの作業——**コーディングエージェントを使ってソフトウェアを構築すること**と、**そのソフトウェアに AI エージェントを組み込むこと**——の両方を支えます。どちらにも同じデザインファーストの開発フローがそのまま効きます。Goa がサービスの契約を生成し、Goa-AI がそのコード生成をツール、構造化出力、エージェント統合へと広げます。

## コード生成がワークフローを変える理由

LLM がハンドラー、クライアントコード、JSON Schema、バリデーションを個別に手書きすると、それらの表現を常に一致させ続けなければなりません。Goa はそれらを設計から導出するため、モデルは要件整理、ドメイン判断、実装に集中できます。

- **反復的なコード記述の削減。** ジェネレーターが各ファイルを出力するため、LLM が生成ファイルを 1 つずつ書く必要がありません。出力トークンを使う作業を減らせますが、全体の削減量は必要なコンテキスト、反復回数、レビュー量によって変わります。
- **焦点を絞った出発点。** 設計ファイルに型、説明、例、制約、操作が一箇所にまとまります。巨大な実装全体を探し回らせる前に、まず関連する設計と生成インターフェースを読み込ませてください。
- **明確な責務境界。** 編集するのは設計とアプリケーションコードだけで、`gen/` は再生成します。サービスごとに新しいトランスポート構成を考えたり、ツールごとに別々のスキーマ規約を作ったりする必要がありません。
- **コンパイラによる即座のフィードバック。** 生成されたメソッドのシグネチャが変わると、型が合わなくなった実装や呼び出し元を Go コンパイラがすべて検出します。振る舞いの変更には引き続きテストが必要です。
- **つながりを保つサービス契約とツール契約。** Goa-AI は Goa の型を再利用し、ツールをサービスメソッドにバインドできます。生成されるスキーマ、コーデック、変換関数が両者の整合性を保ちます。

## Goa service designer スキルをインストール {#install-the-skill}

アプリケーションのリポジトリ内で次のコマンドを実行します。[Skills CLI](https://github.com/vercel-labs/skills) がスキル一式をインストールし、使用するコーディングツールを選択できます。Node.js と npm が必要です。

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

このスキルは、プロジェクトの確認、設計の先行編集、対応バージョンのジェネレーター実行、`gen/` 外での実装、影響する呼び出し元の更新、そして変更の検証までをエージェントに案内します。サービス契約、HTTP/gRPC、バリデーション、エラー処理、インターセプターの指針が含まれています。Goa-AI を使う場合は、あわせて生成された `AGENTS_QUICKSTART.md` も渡してください（service designer スキル自体は Goa サービス向けです）。

対話プロンプトなしで対象ツールを直接指定するには：

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

デフォルトではプロジェクトローカルにインストールされます。個人環境全体に入れるには `--global`、シンボリックリンク非対応の環境では `--copy` を追加します。Node.js がない場合は、[`goa-service-designer` ディレクトリ](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer)一式を、お使いのコーディングツールが対応するスキルディレクトリへコピーしてください。

## 開発ループ

### 1. 関連するコンテキストを渡す

目的、設計ファイル、変更対象の実装をコーディングエージェントに渡します。サービス開発では、お使いのツールの手順に沿って [Goa service designer スキル](https://github.com/goadesign/goa/tree/v3/skills)を導入してください。

Goa-AI では、アプリケーションルートに出力される **`AGENTS_QUICKSTART.md`** も読み込ませます。`DisableAgentDocs()` を指定しない限りエージェント設計から自動生成され、生成パッケージの構成と残りの実装作業がまとめられています。

ピンポイントなリファレンス資料を渡すには、本サイトの Markdown ページや[ドキュメント索引](/ja/llms.txt)を活用してください。生成されたトランスポート一式を最初からすべてコンテキストへ読み込ませるのではなく、タスクで必要になったときに参照させます。

### 2. まず設計を変更する

操作、ペイロード、結果、エラー、制約を `design/` に記述します。構造的なバリデーションは設計に置き、認可やビジネスルールはそれらを所有するアプリケーション層に置きます。

エージェントのツールでは、いつ使うべきかと何を返すかが分かる説明を書きます。各フィールドにも具体的な説明を付け、同じドメイン契約を表す既存のサービス型があれば再利用します。

### 3. 生成して実装する

```bash
goa gen example.com/catalog/design
```

アプリケーション側のファイルで、生成されたインターフェースを実装または更新します。`goa example` は雛形ファイルを一度だけ作成するコマンドであり、設計変更時に既存のビジネスロジックを更新することはありません。コンパイルエラーを解消するために `gen/` を直接書き換えてはいけません。必ず設計またはアプリケーション実装を修正して再生成してください。

### 4. 変更全体を検証する

```bash
gofmt -w design
go test ./...
```

設計の差分と、そこから生成された公開契約をレビューします。呼び出し元から観測される振る舞いのテストを追加します。AI アプリケーションでは、最終成果とツール呼び出しの挙動を確認する評価を実行してください。スキーマ上有効な引数であっても、モデルが適切なツールを選び有用な回答を返したことの証明にはなりません。

コード生成は、認可の正しさ、外部副作用の冪等性、デプロイ済みクライアントとの後方互換性を自動的に保証するものではありません。これらはアプリケーション側の責務としてテストしてください。

## ひとつの設計、ふたつの入り口 {#one-design-two-entry-points}

このカタログは、同じ操作を **HTTP、gRPC、JSON-RPC** で公開しつつ、そのメソッドにバインドされたツールをエージェントに与えます。`LookupPayload` と `Product` が両方の契約を定義し、フィールド番号は Protocol Buffer のマッピングも兼ねています。商品検索ロジックとプランナーはアプリケーションコードで実装します。

モジュールを作成し、この例で使用するバージョンを導入します：

このガイドでは Goa-AI `v0.90.0` リリース（Go 1.27.3 以降が必要）を使用します。Go モジュールが互換性のある Goa `v3.35+` の依存関係を自動選択します（最新の Goa リリースを明示固定する場合は `go get goa.design/goa/v3@v3.36.0` を実行してください）。ジェネレーターはモジュールで選択されたバージョンを使うよう `go run` 経由で実行します。

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.90.0
mkdir design
```

以下を `design/catalog.go` として保存します：

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

契約と初期アプリケーションファイルを生成します：

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

生成されたサービスインターフェース、HTTP サーバーとクライアント、OpenAPI 仕様、エージェントのツールスキーマとコーデック、および `AGENTS_QUICKSTART.md` を確認してください。この 54 行の `design/catalog.go` から、`goa gen` はモデルの出力トークンを一切消費せずに `gen/` 配下の 57 ファイル（約 5,400 行の Go コードに加え、OpenAPI、Protobuf、ツール JSON スキーマ）と `AGENTS_QUICKSTART.md` を生成します。生成されたアプリケーションの雛形は出発点です。本番プロダクトで使う前に、検索処理の実装とサンプルプランナーの置き換えを行ってください。

## 実用的なタスクプロンプト例

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

ここに実際のユーザーゴールと受け入れ条件を添えて渡します。このプロンプトは作業手順を定めるものであり、明確なタスク定義やエンジニアリング上の判断に代わるものではありません。

## Chorus で複数のコーディングエージェントを連携させる {#coordinate-multiple-agents}

契約とセキュリティをレビューするエージェント（`arch`）、Goa サービスを実装するエージェント（`api`）、並行 `-race` テストと結合検証を回すエージェント（`qa`）のように、複数の役割やモデルファミリーにまたがるタスクでは、[Chorus](/ja/docs/3-ecosystem/chorus/)（`github.com/goadesign/chorus`）を使って共有ローカル MCP サーバー（`http://localhost:9440/mcp`）経由で各セッションを接続します。

Chorus をインストールして起動します（コーディングエージェントに MCP と `chorus` スキルを登録します）：

```bash
brew install goadesign/tap/chorus && chorus up
```

Homebrew を使わない場合（`curl` または Node.js 18 以上の `npx`）：

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

```bash
npx @goadesign/chorus up
```

続いて、各コーディングエージェントのプロンプトでハンドルとチャンネルを指定します：

```text
Use Chorus as arch in #catalog and review the LookupPayload contract with api and qa.
```

エージェントは `#channels` に参加し、`@agent` ダイレクトメッセージをやり取りし、`send` 時に未読返信をまとめて受け取り、ピアからメンションや返信が届くまで `chorus watch <handle>` でバックグラウンド待機します。ツールリファレンスとアーキテクチャの詳細は [Chorus ガイド](/ja/docs/3-ecosystem/chorus/)を参照してください。

## Highbay でテスト作成と実装・検証を分離する {#build-and-verify-with-highbay}

1 つのコーディングエージェントに受け入れテストを書かせ、別のコーディングエージェントに実装を書かせ、合意済みの契約に対するサーバー検証を通過してからマージしたい場合は、[Highbay](/ja/docs/3-ecosystem/highbay/)（`github.com/goadesign/highbay`）を使います。

Highbay をインストールし、コーディングエージェントに `highbay` MCP サーバーと `/highbay`（Codex では `$highbay`）スキルを登録します：

```bash
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

空のフォルダ（または Git コミットがあり、`<module>/eval` スイートもしくは保存済みの検証設定を持つ既存の Goa リポジトリ）で `/highbay` を実行します：

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

空のフォルダでは、エージェントがドメイン中立でクリーンな Go と `eval/` の骨格を初期化し（動くサンプルを含めたい場合は `highbay init -example` または `worked_example: true`）、`design/story.go` にビジネスフローを起草してブラウザで Change Card を開きます。カードを確定すると、Highbay はテスト作成者（`.highbay-tests`）と実装者（`.highbay-build`）を別々の作業コピーに割り当て、`eval/` スイートを検査・受理し、それに対して実装者のコミットを検証したうえで、承認済みコミットをワンクリックでローカルブランチへマージできるようにします。詳しくは [Highbay ページ](/ja/highbay/)および [Highbay エコシステムガイド](/ja/docs/3-ecosystem/highbay/)を参照してください。

## プロジェクトで実際の効果を測定する

同じタスク、受け入れ条件、モデル、初期コードベースを揃え、複数回の実行で比較してください。入力・出力トークン、実経過時間、再生成とテストの時間、手動修正、レビュー工数、振る舞い上の不具合を記録し、セットアップや失敗した試行も含めます。生成コードの行数はジェネレーターが肩代わりした作業量を示すものであり、それ自体がトークン削減率や生産性のベンチマークではありません。

ここで万能な「10 倍効率化」を謳うつもりはありません。反復的な契約コードの記述を決定論的なコード生成でモデルの作業から切り離し、人間とコーディングエージェントの双方に明確な実装ターゲットを与えること——それが具体的な利点です。

続いて [Goa クイックスタート](../1-goa/quickstart/)または [Goa-AI クイックスタート](../2-goa-ai/quickstart/)へ進んでください。
