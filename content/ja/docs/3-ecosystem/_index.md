---
title: "エコシステムとツール"
linkTitle: "エコシステム"
weight: 3
description: "Goa を拡張するコンパニオンライブラリ: アーキテクチャ図、分散イベント、観測可能性。"
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## 概要

Goa のエコシステムには、マイクロサービス開発で頻出するニーズを満たす **コンパニオンライブラリ** が含まれます。これらのツールは Goa と自然に連携するように設計されていますが、単体でも利用できます。

## コンパニオンライブラリ

| ライブラリ | 用途 | 主な機能 |
|---------|---------|--------------|
| [Model](model/) | アーキテクチャ図 | C4 図をコードとして記述、バージョン管理、インタラクティブエディタ |
| [Pulse](pulse/) | 分散イベント | イベントストリーミング、ワーカープール、レプリケートマップ |
| [Clue](clue/) | 観測可能性 | トレーシング、ロギング、メトリクス、ヘルスチェック |

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

## ドキュメントガイド

| ガイド | 説明 | ~トークン |
|-------|-------------|---------|
| [Model](model/) | C4 図、DSL リファレンス、`mdl` CLI | ~2,500 |
| [Pulse](pulse/) | ストリーミング、ワーカープール、レプリケートマップ | ~2,200 |
| [Clue](clue/) | ロギング、トレーシング、メトリクス、ヘルスチェック | ~2,800 |

**セクション合計:** ~7,500 tokens

## はじめに

目的に合うライブラリを選んでください：

- **アーキテクチャをドキュメント化したい？** → [Model](model/)
- **イベント駆動システムを構築している？** → [Pulse](pulse/)
- **Goa サービスに観測可能性を追加したい？** → [Clue](clue/)

いずれも `go get` で取得できます：

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
```

