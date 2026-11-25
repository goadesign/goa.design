---
title: "エコシステムとツール"
linkTitle: "エコシステム"
weight: 3
description: "Goa を拡張するコンパニオンライブラリとツール: アーキテクチャ図、分散イベント、観測可能性、マルチエージェント連携。"
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## 概要

Goa のエコシステムには、サービス開発やエージェントシステム開発で頻出するニーズを満たす **コンパニオンライブラリとツール** が含まれます。これらのプロジェクトは Goa および Goa-AI と自然に連携するように設計されていますが、単体でも利用できます。

## コンパニオンライブラリとツール

| プロジェクト | 用途 | 主な機能 |
|---------|---------|--------------|
| [Model](model/) | アーキテクチャ図 | C4 図をコードとして記述、バージョン管理、インタラクティブエディタ |
| [Pulse](pulse/) | 分散イベント | イベントストリーミング、ワーカープール、レプリケートマップ |
| [Clue](clue/) | 観測可能性 | トレーシング、ロギング、メトリクス、ヘルスチェック |
| [Chorus](chorus/) | マルチエージェント連携 | 共有 `#channels`、`@agent` DM、サーバー保持ウォーターマーク、`chorus watch` CLI |
| [Surla](surla/) | 契約駆動制御プレーンと検証 | `Story` と Change Card、テスト作成と実装の分離、`eval/` 検証、ブラウザからのマージ |

## Model — コードとしてのアーキテクチャ図

Model は、[C4 model](https://c4model.com) を用いてソフトウェアアーキテクチャを記述するための Go DSL を提供します。GUI ツールで図を描く代わりに、アーキテクチャをコードで定義します：

```go
var _ = Design("My System", "System description", func() {
    var System = SoftwareSystem("My System", "Does something useful")
    
    Person("User", "A user of the system", func() {
        Uses(System, "Uses")
    })
    
    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

**メリット:**
- バージョン管理できるアーキテクチャドキュメント
- 図の自動生成（SVG, JSON）
- 位置調整のためのインタラクティブなグラフィカルエディタ
- API 設計とアーキテクチャ設計を統合する Goa プラグイン

**詳しくは:** [Model Documentation](model/)

## Pulse — 分散イベント基盤

Pulse は、イベント駆動の分散システムを構築するためのプリミティブを提供します。トランスポートに依存せず、Goa サービスの有無にかかわらず利用できます：

- **ストリーミング**: マイクロサービス間の pub/sub ルーティング
- **ワーカープール**: ジョブディスパッチのためのコンシステントハッシュ付き専用ワーカー
- **レプリケートマップ**: ノード間での最終的整合性を持つ共有状態

```go
// Publish events to a stream
stream.Add(ctx, "user.created", userEvent)

// Subscribe to events
reader.Subscribe(ctx, func(event *Event) error {
    return processEvent(event)
})
```

**ユースケース:**
- 非同期イベント処理
- バックグラウンドジョブキュー
- 分散キャッシュ
- リアルタイム通知

**詳しくは:** [Pulse Documentation](pulse/)

## Clue — マイクロサービスの観測可能性

Clue は、OpenTelemetry を基盤にした Goa サービス向けの計測（インストルメンテーション）を提供します。観測可能性の 3 本柱をカバーします：

```go
// Configure OpenTelemetry
cfg := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
clue.ConfigureOpenTelemetry(ctx, cfg)

// Context-based logging
log.Info(ctx, "processing request", log.KV{"user_id", userID})

// Health checks
checker := health.NewChecker(health.NewPinger("db", dbAddr))
```

**機能:**
- 自動スパン伝播を伴う分散トレーシング
- インテリジェントなバッファリングを備えた構造化ロギング
- メトリクス収集とエクスポート
- ヘルスチェックエンドポイント
- 実行時トラブルシューティング用のデバッグエンドポイント

**詳しくは:** [Clue Documentation](clue/)

## Chorus — MCP によるマルチエージェント連携

Chorus は [Goa-AI](/ja/docs/2-goa-ai/) と [Pulse](pulse/) で構築された MCP サーバーで、異なるターミナルやモデルの複数のコーディングエージェントを `#channels` と `@agent` ダイレクトメッセージで連携させます：

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

**機能:**
- 単一の `POST /mcp` エンドポイントで提供される 5 つの MCP ツール（`who`、`join`、`leave`、`send`、`read`）
- `pulse/rmap` によるエージェントごとの既読ウォーターマーク保持と、`pulse/streaming` による上限付きメッセージログ
- `send` 時の未読メッセージ同時配信とコンパクトなプレーンテキスト応答
- DM、メンション、または返信が届くまで待機するバックグラウンド OS リスナー（`chorus watch`）

**詳しくは:** [Chorus Documentation](chorus/)

## Surla — 契約駆動のマルチエージェント制御プレーン

Surla は 1 つのコンパイル済み [Goa](/ja/docs/1-goa/) / [Goa-AI](/ja/docs/2-goa-ai/) 設計のもとでコーディングエージェントを guide・test writer・builder の役割に分け、受理された `eval/` スイートで候補コミットを検証し、承認された変更をブラウザからマージします：

```bash
go install github.com/goadesign/surla/cmd/surla@latest
surla up
```

**機能:**
- 平易な言葉の Change Card（`CP1`）と C4 アーキテクチャ確認（`CP2`）を備える `/surla`（Codex では `$surla`）スキル。新規フォルダはデフォルトでクリーンな Go / `eval/` 構成を作成（サンプル付きは `surla init -example`）
- テスト作成者が実装を書き換えないよう分離された Git 作業コピー（`.surla-tests` と `.surla-build`）
- サーバー検査による `eval/` スイート受理、独立した候補コミット検証（`CP4`）、ライブプロンプト調整（`CP3`）
- Herdr + Chorus の並列ペイン、または単体のバックグラウンド CLI ワーカーから、ブラウザでのワンクリック **Approve**・**Merge**（`CP5`）まで対応

**詳しくは:** [Surla Documentation](surla/)

## ドキュメントガイド

| ガイド | 説明 | ~トークン |
|-------|-------------|---------|
| [Model](model/) | C4 図、DSL リファレンス、`mdl` CLI | ~2,500 |
| [Pulse](pulse/) | ストリーミング、ワーカープール、レプリケートマップ | ~2,200 |
| [Clue](clue/) | ロギング、トレーシング、メトリクス、ヘルスチェック | ~2,800 |
| [Chorus](chorus/) | マルチエージェント MCP 連携、CLI、Goa-AI + Pulse アーキテクチャ | ~1,100 |
| [Surla](surla/) | 契約駆動マルチエージェント開発、Story フロー、独立検証、ブラウザマージ | ~1,400 |

**セクション合計:** ~10,000 tokens

## はじめに

目的に合うライブラリやツールを選んでください：

- **アーキテクチャをドキュメント化したい？** → [Model](model/)
- **イベント駆動システムを構築している？** → [Pulse](pulse/)
- **Goa サービスに観測可能性を追加したい？** → [Clue](clue/)
- **複数のコーディングエージェントを連携させたい？** → [Chorus](chorus/)
- **テスト作成と実装の役割を分けてサービスを構築・検証したい？** → [Surla](surla/)

いずれも `go get` / `go install` で取得できます：

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
go install github.com/goadesign/chorus/cmd/chorus@latest
go install github.com/goadesign/surla/cmd/surla@latest
```
