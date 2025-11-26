---
title: "DSL概要"
linkTitle: "DSL概要"
weight: 1
description: "Goa-AIのDSLとGoaの拡張方法の概要。"
---

## 概要

Goa-AIは、エージェント、ツールセット、ランタイムポリシーを宣言するための関数でGoaのDSLを拡張します。DSLはGoaの`eval`エンジンによって評価されるため、標準のサービス/トランスポートDSLと同じルールが適用されます：式は適切なコンテキストで呼び出す必要があり、属性定義はGoaの型システム（`Attribute`、`Field`、バリデーション、例など）を再利用します。

### インポートパス

Goa設計パッケージにエージェントDSLを追加します：

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### エントリポイント

通常のGoa `Service`定義内でエージェントを宣言します。DSLはGoaの設計ツリーを拡張し、`goa gen`中に処理されます。

### 結果

`goa gen`を実行すると以下が生成されます：

- エージェントパッケージ（`gen/<service>/agents/<agent>`）：ワークフロー定義、プランナーアクティビティ、登録ヘルパー
- ツールコーデック/スペック：型付きペイロード/結果構造体とJSONコーデック
- プラン/実行/再開ループのアクティビティハンドラー
- 設計をランタイムに接続する登録ヘルパー

`DisableAgentDocs()`で無効にしない限り、コンテキスト対応の`AGENTS_QUICKSTART.md`がモジュールルートに書き込まれます。

## クイックスタート例

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	. "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
	Tool("search", "インデックスされたドキュメントを検索", func() {
		Args(func() {
			Attribute("query", String, "検索フレーズ")
			Attribute("limit", Int, "最大結果数", func() { Default(5) })
			Required("query")
		})
		Return(func() {
			Attribute("documents", ArrayOf(String), "マッチしたスニペット")
			Required("documents")
		})
		Tags("docs", "search")
	})
})

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
	Description("ナレッジエージェントへのヒューマンフロントドア。")

	Agent("chat", "会話ランナー", func() {
		Use(DocsToolset)
		Use(AssistantSuite)
		Export("chat.tools", func() {
			Tool("summarize_status", "オペレーター向けサマリーを生成", func() {
				Args(func() {
					Attribute("prompt", String, "ユーザー指示")
					Required("prompt")
				})
				Return(func() {
					Attribute("summary", String, "アシスタント応答")
					Required("summary")
				})
				Tags("chat")
			})
		})
		RunPolicy(func() {
			DefaultCaps(
				MaxToolCalls(8),
				MaxConsecutiveFailedToolCalls(3),
			)
			TimeBudget("2m")
		})
	})
})
```

`goa gen example.com/assistant/design`を実行すると以下が生成されます：

- `gen/orchestrator/agents/chat`: ワークフロー + プランナーアクティビティ + エージェントレジストリ
- `gen/orchestrator/agents/chat/specs`: ペイロード/結果構造体、JSONコーデック、ツールスキーマ
- `gen/orchestrator/agents/chat/agenttools`: エクスポートされたツールを他のエージェントに公開するヘルパー
- `MCPToolset`が`Use`で参照されている場合、MCP対応の登録ヘルパー

## 型付きツール識別子

各ツールセットのspecsパッケージは、生成されたすべてのツールに対して型付きツール識別子（`tools.Ident`）を定義します：

```go
const (
    // 型付きツールID
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

これらの定数は、エクスポートされていないツールセットを含め、ツールを参照する必要がある場所で使用します（アドホックな文字列を定義する必要はありません）。

## クロスプロセスインラインコンポジション

エージェントAがエージェントBによってエクスポートされたツールセットを「使用」すると宣言すると、Goa-AIは自動的にコンポジションを配線するのに十分な情報を持ちます：

- エクスポーター（エージェントB）パッケージには、エクスポートされたツールセット（ツールID、スペック、テンプレート）を記述し、エージェントアズツール実行のためのインライン`ToolsetRegistration`を構築する`agenttools`ヘルパーが生成されます。
- コンシューマー（エージェントA）エージェントレジストリは、`Use(AgentToolset("service", "agent", "toolset"))`を使用するときにこれらのヘルパーを使用し、強力な契約ルーティングメタデータ（ワークフロー名、アクティビティ、キュー）を使用してプロバイダーエージェントを実際の子ランとして実行するインラインツールセットを登録します。
- インラインツールセットの生成された`Execute`関数は、ツールペイロードからネストされたプランナーメッセージを構築し、プロバイダーエージェントを子ワークフローとして実行し、ネストされたエージェントの`RunOutput`を（子ランを識別する`RunLink`を含む）`planner.ToolResult`に適応させます。
- ペイロードと結果は境界を越えて正規のJSONのままであり、プロバイダーツール境界で正確に一度だけデコードされます。

これにより、**エージェントラン**ごとに単一の決定論的ワークフローと、コンポジションのためのリンクされたランツリーが生成されます：親ランはエージェントアズツールコールの`tool_start` / `tool_end`イベントと、子エージェントランストリームを指す`agent_run_started`リンクイベントを見ます。

## 次のステップ

- エージェントを宣言するための[エージェント関数](./2-agent-functions.md)を学ぶ
- ツールセットを定義するための[ツールセット関数](./3-toolset-functions.md)を探索する
- ランタイム動作を設定するための[ポリシー関数](./4-policy-functions.md)を読む
- MCPサーバー統合のための[MCP DSL関数](./5-mcp-functions.md)を見る

