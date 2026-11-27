---
title: "エコシステムとツール"
linkTitle: "エコシステム"
weight: 3
description: "コンパニオン Go ライブラリとマルチエージェント開発ツール：C4 アーキテクチャ図、Redis イベントストリーム・ワーカープール、OpenTelemetry 可観測性、MCP エージェント連携、契約駆動の独立検証。"
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

{{< anchors "コンパニオンライブラリとツール" >}}
## 概要

これらのオープンソースライブラリと MCP ツールは、アーキテクチャモデリング、分散イベント処理、可観測性、マルチエージェント開発のために Goa と Goa-AI を拡張します。各ライブラリは Goa と組み合わせても、任意の Go サービスで単体としても利用できます。

| プロジェクト | 役割 | 提供する機能 |
|---------|------|------------------|
| [Model](model/) | コードとしてのアーキテクチャ図 | Go による C4 モデル DSL、SVG / JSON エクスポート、対話型レイアウトエディタ（`mdl`）、Goa プラグイン |
| [Pulse](pulse/) | Redis ストリーム・プール・マップ | 上限付き／無制限イベントストリーム、コンシステントハッシュ・ワーカープール、レプリケートされたインメモリマップ |
| [Clue](clue/) | OpenTelemetry 可観測性 | エラー時フラッシュ型バッファロギング、OTLP トレース・メトリクス、`/healthz` チェック、実行時デバッグ切替 |
| [Chorus](chorus/) | エージェント間のピア連携 | 共有 `#channels`、`@agent` DM、サーバー保持ウォーターマーク、待機トークン 0 の `chorus watch`、ライブ `chorus ui` |
| [Highbay](highbay/) | 契約・検証コントロールプレーン | `Story` + Change Card、実装者とテスト作成者の分離された Git 作業コピー、`eval/` 検証ゲート、ブラウザマージ |

{{< anchors "model--コードとしてのアーキテクチャ図" >}}
## Model：Go で記述する C4 アーキテクチャ図

[Model](model/) は、サービスの契約と並べて [C4 アーキテクチャ図](https://c4model.com)を Go コードで定義し、バージョン管理と CI での自動再生成を可能にします：

```go
var _ = Design("Catalog Platform", "Product catalog architecture", func() {
    var System = SoftwareSystem("Catalog Service", "Serves product lookups over HTTP, gRPC, and MCP")

    Person("Developer", "Calls catalog APIs and MCP tools", func() {
        Uses(System, "Queries products", "HTTPS / MCP")
    })

    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

`mdl serve` でブラウザ上から対話的にレイアウトを調整でき、`mdl svg` で CI 上からヘッドレスに SVG を書き出せます。詳しくは [Model ガイド](model/)を参照してください。

{{< anchors "pulse--分散イベント基盤" >}}
## Pulse：Redis イベントストリーム、ワーカープール、レプリケートマップ

[Pulse](pulse/) は、別途メッセージブローカーを導入することなく、Redis（`*redis.Client`）上に 3 つの分散プリミティブを構築します：

- **`streaming`**：独立したファンアウト用 `Reader` と共有コンシューマーグループ用 `Sink` を備えたイベントストリーム（デフォルトは厳密な `MAXLEN` による `1,000` 件保持、`options.WithStreamMaxLen` または `options.WithUnboundedStream` で変更可能）。
- **`pool`**：ジャンプコンシステントハッシュによるキー単位のジョブルーティングと、停止ワーカーの自動フェイルオーバーを備えた専用ワーカープール。
- **`rmap`**：原子的な Redis Lua スクリプトと pub/sub 通知で同期される、ローカル読み取り・結果整合性のキーバリューマップ。

```go
// Open a stream, subscribe a consumer-group sink, then publish
stream, err := streaming.NewStream("orders", rdb)
if err != nil {
    log.Fatal(err)
}
sink, err := stream.NewSink(ctx, "billing-workers")
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)
events := sink.Subscribe()

if _, err := stream.Add(ctx, "order.created", payload); err != nil {
    log.Fatal(err)
}

for event := range events {
    if err := handleOrder(event); err == nil {
        _ = sink.Ack(ctx, event)
    }
}
```

詳しくは [Pulse ガイド](pulse/)を参照してください。

{{< anchors "clue--マイクロサービスの観測可能性" >}}
## Clue：OpenTelemetry トレース、バッファ付きログ、ヘルスチェック

[Clue](clue/) は、OpenTelemetry のトレース、メトリクス、ヘルスプローブ、および**エラー時フラッシュ型のコンテキストロギング**で Go サービスを計装します。トレース対象外の正常リクエストではログ出力を抑えつつ、エラー発生時にはそのリクエストのデバッグ文脈をすべて書き出します：

```go
// Configure OpenTelemetry trace and metric exporters
cfg, err := clue.NewConfig(ctx, "catalog", "1.0.0", metricExporter, spanExporter)
if err != nil {
    log.Fatal(ctx, err)
}
clue.ConfigureOpenTelemetry(ctx, cfg)

// Buffered structured log (flushed automatically if an error is logged or request is traced)
log.Info(ctx, log.KV{K: "msg", V: "looking up SKU"}, log.KV{K: "sku", V: sku})

// HTTP dependency health check (probes upstream /livez with an explicit timeout)
checker := health.NewChecker(
    health.NewPinger("inventory-api", inventoryAddr, health.WithTimeout(5*time.Second)),
)
```

詳しくは [Clue ガイド](clue/)を参照してください。

{{< anchors "chorus--mcp-によるマルチエージェント連携" >}}
## Chorus：MCP によるマルチエージェント連携

[Chorus](chorus/) は、[Goa-AI](/ja/docs/2-goa-ai/) と [Pulse](pulse/) 上に構築されたローカル MCP サーバーです。共有 `#channels`、`@agent` ダイレクトメッセージ、ピン留めされたタスクボードを通じて、異なるターミナル、エディタ、モデルファミリー（`Claude Code`、`Codex`、`Gemini CLI`、`Antigravity`、`Cursor`、`Windsurf`、`Copilot`、`VS Code`）のコーディングエージェントを接続します：

```bash
brew install goadesign/tap/chorus && chorus up
```

コマンド 1 つで実行できる他のセットアップ方法（`npx @goadesign/chorus up`、`curl`、`go install`）は [Chorus ガイド](chorus/)および [Chorus ページ](/ja/chorus/)を参照してください。

- **5 つのツール（`who`、`join`、`leave`、`send`、`read`）**を `http://localhost:9440/mcp` で公開し、コンパクトなプレーンテキストの `ToolContent` ワイヤ応答（スクリプト化されたパスキーセッションでの見積もりは 1 メッセージあたり `約 16〜52 トークン`）を返します。
- **`pulse/rmap` によるサーバー保持の既読ウォーターマーク**、`send` 時の未読メッセージ同時配信、および待機中のモデルトークン消費 `0` の `chorus watch` を備えています。

{{< anchors "highbay--契約駆動のマルチエージェント制御プレーン" >}}
## Highbay：契約駆動のマルチエージェント・コントロールプレーン

[Highbay](highbay/) は、サービス・MCP サーバー・AI エージェントにまたがるプラットフォームアーキテクチャを標準化し、マージ前に確定済みの契約を軸として実装担当エージェント（`.highbay-build`）と独立したテスト作成エージェント（`.highbay-tests`）を組み合わせます：

```bash
brew install goadesign/tap/highbay
highbay up
```

`npx @goadesign/highbay up` や `go install github.com/goadesign/highbay/cmd/highbay@latest` によるセットアップ手順は [Highbay ガイド](highbay/)および [Highbay ページ](/ja/highbay/)を参照してください。

- **`/highbay`（Codex では `$highbay`）**が Change Card（`CP1`）と C4 アーキテクチャプレビュー（`CP2`）を起草し、空フォルダではドメイン中立でクリーンな Go / `eval/` 構成から開始します（動作するサンプルを含める場合は `highbay init -example`）。
- **独立検証（`CP4`）**がブラウザでの **Approve** と **Merge**（`CP5`）をゲート管理し、受理済みの `eval/` シナリオスイートに合格するまでマージをブロックします。

{{< anchors "ドキュメントガイド" "はじめに" >}}
## インストールリファレンス

```bash
# Go libraries
go get goa.design/model@latest
go get goa.design/pulse@latest
go get goa.design/clue@latest

# CLI & MCP tools
go install goa.design/model/cmd/mdl@latest
go install github.com/goadesign/chorus/cmd/chorus@latest
go install github.com/goadesign/highbay/cmd/highbay@latest
```
