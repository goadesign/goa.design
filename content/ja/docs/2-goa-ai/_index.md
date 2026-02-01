---
title: "Goa-AI フレームワーク"
linkTitle: "Goa-AI"
weight: 2
description: "Go でエージェント型・ツール駆動システムを構築するための design-first フレームワーク。"
llm_optimized: true
content_scope: "Complete Goa-AI Documentation"
aliases:
---

## 概要

Goa-AI は、Goa の **design-first**（設計を単一の真実の源にする）哲学を、エージェント型システムに拡張します。DSL でエージェント・ツールセット・ポリシーを宣言し、**型付けされたコントラクト**、**耐久性のあるワークフロー**、**ストリーミングイベント**を備えたプロダクション品質の実装を生成します。

---

## なぜ Goa-AI なのか？

### Design-First Agents {#design-first-agents}

**壊れやすいエージェント実装をやめて、コントラクトから始めましょう。**

多くのエージェントフレームワークでは、プロンプト・ツール・API 呼び出しを命令的に配線していきます。壊れたとき（そして壊れます）に待っているのは、散在したコードのデバッグと、はっきりしない「真実の源」です。

Goa-AI は逆転します。**型付き DSL で能力を定義し、実装を生成する**。設計がそのままドキュメントになり、コントラクトがそのまま検証になります。変更は自動的に全体へ波及します。

```go
Agent("assistant", "A helpful coding assistant", func() {
    Use("code_tools", func() {
        Tool("analyze", "Analyze code for issues", func() {
            Args(func() {
                Attribute("code", String, "Source code to analyze", func() {
                    MinLength(1)           // Can't be empty
                    MaxLength(100000)      // Reasonable size limit
                })
                Attribute("language", String, "Programming language", func() {
                    Enum("go", "python", "javascript", "typescript", "rust", "java")
                })
                Required("code", "language")
            })
            Return(AnalysisResult)
        })
    })
})
```

LLM がこのツールを不正な引数で呼び出した場合（例: `code` が空、`language: "cobol"` など）、Goa-AI は **バリデーションエラーのメッセージ付きで自動リトライ**します。LLM は何が間違っていたのかを正確に理解し、自己修正できます。手書きのエラーハンドリングは不要です。

**メリット:**
- **単一の真実の源** — DSL が振る舞い・型・ドキュメントを定義
- **コンパイル時の安全性** — 実行前にペイロードの不整合を検出
- **自動生成クライアント** — 手配線なしで型安全にツールを呼び出せる
- **一貫したパターン** — どのエージェントも同じ構造で実装される
- **自己修復するエージェント** — 検証エラーがフィードバック付きの自動リトライを誘発

→ 詳細は [DSL Reference](dsl-reference/) と [Quickstart](quickstart/) を参照してください。

---

### Run Trees {#run-trees-composition}

**単純で観測可能な部品から、複雑なシステムを組み立てます。**

現実の AI アプリケーションは、単一エージェントで完結しません。エージェントが別のエージェントへ委譲し、ツールがサブタスクを生成し、全体を追跡できることが求められます。

Goa-AI の **ランツリー（run tree）モデル**は、完全な可観測性を備えた階層実行を提供します。各ランは一意の ID を持ち、子ランは親にリンクされ、イベントはリアルタイムでストリーミングされます。失敗時はツリーを辿って原因に到達できます。

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**メリット:**
- **Agent-as-tool** — 任意のエージェントを別エージェントからツールとして呼び出せる
- **階層トレーシング** — エージェント境界を跨いだ実行を追跡できる
- **失敗の分離** — 子ランの失敗は独立し、親はリトライや回復を選べる
- **ストリーミング・トポロジ** — UI のためにツリーを遡ってイベントを流せる

→ 詳細は [Agent Composition](agent-composition/) と [Runtime](runtime/) を参照してください。

---

### Structured Streaming {#structured-streaming}

**エージェントの意思決定をリアルタイムで可視化します。**

ブラックボックスなエージェントはリスクです。ツール呼び出し、思考の開始、エラーの発生を *今すぐ* 知る必要があります（タイムアウト後では遅い）。

Goa-AI は実行中に **型付けされたイベント**を発行します。たとえば、ストリーミングテキストの `assistant_reply`、ツールのライフサイクルを表す `tool_start`/`tool_end`、推論の可視化のための `planner_thought`、トークン消費の `usage` などです。イベントはシンプルな **Sink** インターフェースを介して任意のトランスポートへ流せます。プロダクションでは UI は **セッション所有ストリーム**（`session/<session_id>`）を 1 本購読し、アクティブ run の `run_stream_end` を観測したら SSE/WebSocket を終了します。

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))
```

**Stream profiles** は消費者ごとにイベントをフィルタします。エンドユーザ UI 用の `UserChatProfile()`、開発者向けの `AgentDebugProfile()`、観測基盤向けの `MetricsProfile()` など。Pulse（Redis Streams）用の組み込み sink により、サービス間で分散ストリーミングできます。

**メリット:**
- **トランスポート非依存** — WebSocket / SSE / Pulse / 独自バックエンドで同一イベントを利用
- **型付きコントラクト** — 文字列パースなし。ドキュメント化された強い型
- **選択的配信** — プロファイルで消費者ごとに必要なイベントだけを配信
- **マルチテナント対応** — `RunID` と `SessionID` によりルーティング・フィルタが可能

→ 実装詳細は [Production Streaming](production/#streaming-ui) を参照してください。

---

### Temporal Durability {#temporal-durability}

**クラッシュ、再起動、ネットワーク障害に耐えるエージェント実行。**

耐久性がないと、プロセスのクラッシュで進捗が消えます。レートリミットでラン全体が失敗します。ツール実行中のネットワーク瞬断で、高価な推論をやり直すことになります。

Goa-AI は **Temporal** による耐久実行を採用します。エージェントランはワークフローになり、ツール呼び出しはリトライ設定可能なアクティビティになります。すべての状態遷移が永続化され、ツールがクラッシュしても **LLM 呼び出しを再実行することなく** 自動的にリトライできます。

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.New(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**メリット:**
- **推論の無駄を削減** — ツール失敗は LLM を再呼び出しせずにリトライ
- **クラッシュリカバリ** — ワーカーを再起動しても最後のチェックポイントから再開
- **レート制限耐性** — 指数バックオフで API スロットリングを吸収
- **安全なデプロイ** — ローリングデプロイでも進行中の作業を失わない

→ セットアップとリトライ設定は [Production](production/#temporal-setup) を参照してください。

---

### Tool Registries {#tool-registries}

**どこからでもツールを発見し、利用できます（クラスタ内でもパブリッククラウドでも）。**

AI エコシステムが拡大すると、ツールはあらゆる場所に散らばります。社内サービス、サードパーティ API、公開 MCP レジストリ。ツール定義をハードコードする方法はスケールしません。動的ディスカバリが必要です。

Goa-AI は、自社ツールセット向けの **クラスタ対応の内部レジストリ**と、Anthropic の MCP カタログのような外部レジストリと連携する **フェデレーション**を提供します。一度定義すれば、どこからでも発見できます。

```go
// Connect to public registries
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "filesystem")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Or run your own clustered registry
var CorpRegistry = Registry("corp", func() {
    Description("Internal tool registry")
    URL("https://registry.corp.internal")
    Security(CorpAPIKey)
    SyncInterval("5m")
})
```

**内部レジストリのクラスタリング:**

同じ名前の複数ノードは、Redis を介して自動的にクラスタを形成します。共有状態、協調ヘルスチェック、水平スケール——すべて自動です。

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**メリット:**
- **動的ディスカバリ** — コンパイル時ではなく実行時にツールを発見
- **マルチクラスタ・スケール** — ノードが Redis 経由で自動協調
- **公開レジストリ連携** — Anthropic/OpenAI など、任意の MCP レジストリからインポート
- **ヘルス監視** — しきい値を持つ ping/pong の自動チェック
- **選択的インポート** — include/exclude パターンで粒度の細かい制御

→ 詳細は [MCP Integration](mcp-integration/) と [Production](production/) を参照してください。

---

## 機能概要

| 機能 | 得られるもの |
|---------|--------------|
| [Design-First Agents](#design-first-agents) | DSL でエージェントを定義し、型安全なコードを生成 |
| [MCP Integration](mcp-integration/) | Model Context Protocol のネイティブサポート |
| [Tool Registries](#tool-registries) | クラスタ対応のディスカバリ + 公開レジストリのフェデレーション |
| [Run Trees](#run-trees-composition) | エージェントがエージェントを呼ぶ構成を完全に追跡 |
| [Structured Streaming](#structured-streaming) | UI と観測のためのリアルタイム型付きイベント |
| [Temporal Durability](#temporal-durability) | 障害に強い、耐久実行 |
| [Typed Contracts](dsl-reference/) | ツール操作のエンドツーエンド型安全性 |

## ドキュメントガイド

| ガイド | 説明 | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | インストールと最初のエージェント | ~2,700 |
| [DSL Reference](dsl-reference/) | 完全な DSL: agents / toolsets / policies / MCP | ~3,600 |
| [Runtime](runtime/) | ランタイム構造、plan/execute ループ、エンジン | ~2,400 |
| [Toolsets](toolsets/) | ツールセット種別、実行モデル、トランスフォーム | ~2,300 |
| [Agent Composition](agent-composition/) | agent-as-tool、ランツリー、ストリーミングトポロジ | ~1,400 |
| [MCP Integration](mcp-integration/) | MCP サーバ、トランスポート、生成ラッパ | ~1,200 |
| [Memory & Sessions](memory-sessions/) | トランスクリプト、メモリストア、セッション、ラン | ~1,600 |
| [Production](production/) | Temporal セットアップ、ストリーミング UI、モデル統合 | ~2,200 |
| [Testing & Troubleshooting](testing/) | エージェント/プランナー/ツールのテスト、典型的なエラー | ~2,000 |

**Total Section:** ~21,400 tokens

## アーキテクチャ

Goa-AI は、宣言的な設計をプロダクション品質のエージェントシステムへ変換する **define → generate → execute** パイプラインに従います。

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**レイヤ概要:**

| レイヤ | 目的 |
|-------|---------|
| **DSL** | バージョン管理された Go コードで、エージェント・ツール・ポリシー・外部統合を宣言 |
| **Codegen** | 型安全な spec/codec/workflow 定義/レジストリクライアントを生成（`gen/` は編集しない） |
| **Runtime** | ポリシー適用、メモリ永続化、イベントストリーミングを伴う plan/execute ループの実行 |
| **Engine** | 実行バックエンドを交換（開発は in-memory、本番は Temporal） |
| **Features** | モデルプロバイダ（OpenAI/Anthropic/AWS Bedrock）、永続化（Mongo）、ストリーミング（Pulse）、レジストリなどをプラグイン |

**主要な統合ポイント:**

- **Model Clients** — LLM プロバイダを統一インターフェースの裏に抽象化し、OpenAI/Anthropic/Bedrock を設計変更なしに差し替え
- **Registry** — プロセス境界を跨いでツールセットを発見・呼び出し。Redis でクラスタ化し水平スケール
- **Pulse Streaming** — UI 更新、観測パイプライン、サービス間通信のためのリアルタイムイベントバス
- **Temporal Engine** — 自動リトライ、リプレイ、クラッシュリカバリを備えた耐久ワークフロー実行

### モデルプロバイダと拡張性 {#model-providers}

Goa-AI は 3 つの LLM プロバイダ向けにファーストクラスのアダプタを提供します。

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

3 つはいずれも、プランナーが利用する同一の `model.Client` インターフェースを実装します。アプリケーションは `rt.RegisterModel("provider-id", client)` でモデルクライアントを登録し、プランナーや生成されたエージェント設定から ID で参照します。プロバイダ差し替えは設計変更ではなく設定変更になります。

新しいプロバイダを追加する手順も同様です。

1. プロバイダ SDK の型を `model.Request` / `model.Response` / ストリーミング `model.Chunk` にマッピングして `model.Client` を実装する。
2. 必要に応じて共有ミドルウェア（例: `features/model/middleware.NewAdaptiveRateLimiter`）でレート制限とメトリクスを付与する。
3. エージェント登録前に `rt.RegisterModel("my-provider", client)` を呼び出し、プランナーやエージェント設定から `"my-provider"` を参照する。

プランナーとランタイムは `model.Client` のみに依存するため、新しいプロバイダは Goa の設計や生成コードの変更なしに追加できます。

## クイック例

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("calculator", func() {
    Description("Calculator service with an AI assistant")
    
    // Define a service method that the tool will bind to
    Method("add", func() {
        Description("Add two numbers")
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(Int)
    })
    
    // Define the agent within the service
    Agent("assistant", "A helpful assistant agent", func() {
        // Use a toolset with tools bound to service methods
        Use("calculator", func() {
            Tool("add", "Add two numbers", func() {
                Args(func() {
                    Attribute("a", Int, "First number")
                    Attribute("b", Int, "Second number")
                    Required("a", "b")
                })
                Return(Int)
                BindTo("add")  // Bind to the service method
            })
        })
        
        // Configure the agent's run policy
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

## はじめに

まずは [Quickstart](quickstart/) を参照し、Goa-AI をインストールして最初のエージェントを構築してください。

DSL の全体像は [DSL Reference](dsl-reference/) を参照してください。

ランタイムアーキテクチャは [Runtime](runtime/) を参照してください。


