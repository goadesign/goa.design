---
title: "ゴア・フレームワーク"
linkTitle: "ゴア"
weight: 1
description: "Go マイクロサービス向けのデザインファースト API 開発と自動コード生成。"
llm_optimized: true
content_scope: "Complete Goa Documentation"
aliases:
---

## 概要

Goa は Go でマイクロサービスを構築するためのデザインファーストのフレームワークです。Goa の強力な DSL を使って API を定義し、Goa が定型コード、ドキュメント、クライアントライブラリを生成します。

### 主な機能

- **設計優先** — 実装コードを書く前に、強力な DSL を使って API を定義します。
- **コード生成** — サーバー、クライアント、ドキュメントを自動生成します。
- **型安全性** — 設計から実装までエンドツーエンドで型安全です。
- **マルチトランスポート** — 1 つの設計から HTTP と gRPC をサポートします。
- **バリデーション** — 設計に基づくリクエストバリデーションが組み込まれています。
- **ドキュメント** — OpenAPI 仕様を自動生成します。

## Goa の仕組み

Goa は API 設計と実装を分離する 3 フェーズのワークフローを採用しており、一貫性を保ちながら定型コードを削減します。

{{< figure src="/images/diagrams/GoaWorkflow.svg" alt="Goa の 3 フェーズ・ワークフロー：Design → Generate → Implement" class="img-fluid" >}}

### フェーズ 1: 設計（あなたが書く）

設計フェーズでは、Go ファイル上の Goa DSL（通常は `design/` ディレクトリ）で API を定義します。

- **型（Types）**: バリデーションルール付きのデータ構造を定義します。
- **サービス（Services）**: 関連するメソッドをグループ化します。
- **メソッド（Methods）**: ペイロードと結果を持つ操作を定義します。
- **トランスポート（Transports）**: メソッドを HTTP エンドポイントや gRPC プロシージャへマッピングします。
- **セキュリティ（Security）**: 認証・認可スキームを定義します。

**あなたが作るもの**: API 仕様を Go コードとして表現した `design/*.go` ファイルです。

### フェーズ 2: 生成（自動）

`goa gen` を実行すると、定型コードをすべて自動生成します。

```bash
goa gen myservice/design
```

**Goa が作るもの**（`gen/` ディレクトリ配下）:

- リクエストルーティングとバリデーションを備えたサーバースキャフォールド
- 型安全なクライアントライブラリ
- OpenAPI/Swagger 仕様
- Protocol Buffer 定義（gRPC 用）
- トランスポートのエンコーダー/デコーダー

**重要**: `gen/` 配下のファイルは編集しないでください。`goa gen` を実行するたびに再生成されます。

### フェーズ 3: 実装（あなたが書く）

生成されたサービスインターフェイスを実装して、ビジネスロジックを書きます。

```go
// service.go - あなたが書く
type helloService struct{}

func (s *helloService) SayHello(ctx context.Context, p *hello.SayHelloPayload) (string, error) {
    return fmt.Sprintf("Hello, %s!", p.Name), nil
}
```

**あなたが作るもの**: 実際のビジネスロジックを含むサービス実装ファイルです。

### 手書き vs 自動生成

| あなたが書く | Goa が生成する |
|-----------|---------------|
| `design/*.go` — API 定義 | `gen/` — すべてのトランスポートコード |
| `service.go` — ビジネスロジック | OpenAPI 仕様 |
| `cmd/*/main.go` — サーバー起動 | Protocol Buffer 定義 |
| テストとカスタムミドルウェア | リクエストバリデーション |

## ドキュメントガイド

| ガイド | 説明 | 〜トークン |
|-------|-------------|---------|
| [クイックスタート](quickstart/) | Goa をインストールして、最初のサービスを作成します。 | ~1,100 |
| [DSL リファレンス](dsl-reference/) | Goa デザイン言語の完全なリファレンスです。 | ~2,900 |
| [コード生成](code-generation/) | Goa のコード生成プロセスを理解します。 | ~2,100 |
| [HTTP ガイド](http-guide/) | HTTP トランスポート機能、ルーティング、パターンを扱います。 | ~1,700 |
| [gRPC ガイド](grpc-guide/) | gRPC トランスポート機能とストリーミングを扱います。 | ~1,800 |
| [エラーハンドリング](error-handling/) | エラーの定義とハンドリングを扱います。 | ~1,800 |
| [インターセプター](interceptors/) | インターセプターとミドルウェアのパターンを扱います。 | ~1,400 |
| [プロダクション](production/) | 観測可能性、セキュリティ、デプロイメントを扱います。 | ~1,300 |

**セクション合計:** ~14,500 トークン

## クイック例

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("hello", func() {
    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "Greeting message")
        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

生成して実行します：

```bash
goa gen hello/design
goa example hello/design
go run ./cmd/hello
```

## はじめに

[クイックスタート](quickstart/) ガイドで Goa をインストールし、最初のサービスを数分で構築しましょう。

包括的な DSL カバーについては [DSL リファレンス](dsl-reference/) を参照してください。
