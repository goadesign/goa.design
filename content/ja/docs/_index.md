---
title: "ドキュメンテーション"
linkTitle: "ドキュメンテーション"
weight: 20
description: >
  LLM-optimized documentation for Goa and Goa-AI frameworks. Consolidated pages designed for easy copying into LLM contexts.
llm_optimized: true
content_scope: "Complete Documentation"
aliases:
---

{{< section-llm-info >}}
**LLMに最適化されたドキュメント** - このドキュメントは、LLMコンテキストに簡単にコピーできるように設計されています。どのページでも "Copy page "ボタンを使って、コンテンツをMarkdownまたはPlain Textとしてコピーしてください。
{{< /section-llm-info >}}

## ドキュメントのセクション

このドキュメントは、LLMの消費に最適化された、統合された自己完結型のページで構成されています。各ページは、包括的なコンテキストを提供するために完全にコピーすることができます。

### Goa フレームワーク

Go マイクロサービスの自動コード生成によるデザインファースト API 開発。

| ガイド | 説明 | ~トークン
|-------|-------------|---------|
| [クイックスタート](1-goa/quickstart/) | Goa をインストールし、最初のサービスを構築する | ~1,100 |.
| [DSL リファレンス](1-goa/dsl-reference/) | Goa のデザイン言語の完全なリファレンス | ~2,900 |.
| [コード生成](1-goa/code-generation/) | Goa のコード生成プロセスを理解する | ~2,100 |｜ [HTTP ガイド](1-goa/code-generation/)
| [HTTPガイド](1-goa/http-guide/) | HTTPトランスポート機能、ルーティング、パターン | ~1,700 |｜ [gRPCガイド](1-goa/code-generation/) | Goaのコード生成プロセスについて理解する。
| [gRPC ガイド](1-goa/grpc-guide/) | gRPC のトランスポート機能とストリーミング | ~1,800 |｜ [エラーハンドリング](1-goa/grpc-guide/)
| [エラーハンドリング](1-goa/error-handling/) | エラーの定義とハンドリング | ~1,800 |｜ [インターセプター](1-goa/grpc-guide/)
| [インターセプター](1-goa/interceptors/) インターセプターとミドルウェアのパターン | ~1,400
| [プロダクション](1-goa/production/) | 観測可能性、セキュリティ、デプロイメント | ~1,300

**Goaセクション合計:** ~14,500 トークン

### Goa-AI フレームワーク

Goでエージェント型、ツール駆動型システムを構築するためのデザインファーストのフレームワーク。

| ガイド | 説明 | ~トークン
|-------|-------------|---------|
| [クイックスタート](2-goa-ai/quickstart/) | インストールと最初のエージェント | 〜2,700 |)
| [DSL リファレンス](2-goa-ai/dsl-reference/) | 完全な DSL: エージェント、ツールセット、ポリシー、MCP | ~3,600 | | [ランタイム](2-goa-ai/quickstart/)
| [ランタイム](2-goa-ai/runtime/) | ランタイムアーキテクチャ、プラン/実行ループ、エンジン | ~2,400 |｜ [ツールセット](2-goa-ai/dsl-reference/)
| [ツールセット](2-goa-ai/toolsets/) | ツールセットのタイプ、実行モデル、トランスフォーム | ~2,300 |｜ [エージェント構成](2-goa-ai/runtime/)
| [エージェント・コンポジション](2-goa-ai/agent-composition/) | エージェント・アズ・ツール、ラン・ツリー、ストリーミング・トポロジー | ~1,400 |｜ [MCP インテグレーション](2-goa-ai/agent-composition/)
| [MCPインテグレーション](2-goa-ai/mcp-integration/) | MCPサーバー、トランスポート、生成されたラッパー | ~1,200 |｜ [メモリとセッション](2-goa-ai/mcp-integration/)
| [メモリとセッション](2-goa-ai/memory-sessions/) | トランスクリプト、メモリストア、セッション、ラン｜~1,600 |)
| [プロダクション](2-goa-ai/production/) | テンポラルのセットアップ、ストリーミングUI、モデルの統合 | ~2,200 |.

**Goa-AIセクション合計:** ~17,600 トークン

## このドキュメントをLLMで使う

### ページのコピー機能

各ドキュメントのページには、2つのオプションがある「ページをコピー」ボタンがあります：

- **マークダウンとしてコピー** - 書式、コードブロック言語注釈、見出し階層を保持します。
- **プレーン・テキストとしてコピー** - マークダウン構文を使用しないクリーンなテキスト。

### 推奨ワークフロー

1. **クイックスタートから始める** - クイックスタートガイドをコピーし、LLMの基本的なコンテキストを与える。
2. **特定のガイドを追加する** - タスクに基づいて関連するガイドをコピーする（例えば、REST APIのHTTPガイド）。
3. **DSL リファレンスを含める** - 設計に関する質問のために、完全な DSL リファレンスを含めます。

### トークン予算のヒント

- 各ガイドは典型的なLLMのコンテキストウィンドウに収まるように設計されています。
- Goa のドキュメント一式 (~14.5k トークン) は、最近の LLM に簡単に収まります。
- Goa-AI ドキュメント一式 (~17.6k トークン) も同様にコンパクトです。
- 両フレームワーク（～32kトークン）を合わせると、より大きなコンテキストモデルでうまく機能する。

## キーコンセプト

### デザインファーストの開発

GoaもGoa-AIもデザイン・ファーストの哲学に従っている：

1. **強力な DSL を使用して API/Agent** を定義します。
2. **設計から自動的にコードを生成
3. **ビジネスロジック** をクリーンでタイプセーフなインターフェイスで実装
4. **同じソースから作成されるため、ドキュメントが同期**されたまま維持される

### 型安全性

生成されたコードは、エンドツーエンドの型安全性を提供します：

```go
// Generated interface - your contract
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// Your implementation - clean and focused
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

## コミュニティ

- [Gophers Slack](https://gophers.slack.com/messages/goa) - #goaチャンネル
- [GitHub Discussions](https://github.com/goadesign/goa/discussions) - 質問やアイデア
- [Bluesky](https://goadesign.bsky.social) - アップデートとお知らせ
