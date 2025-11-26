---
title: "ツールカタログとスキーマ"
linkTitle: "ツールカタログとスキーマ"
weight: 7
description: "Goa-AIエージェントがエクスポートするツール、スキーマ、スペックを発見し、UIとプランナーがそれらを消費する方法を学ぶ。"
---

## ツールカタログが重要な理由

Goa-AIエージェントはGoa設計から**単一の権威あるツールカタログ**を生成します。このカタログは以下を動かします：

- プランナーのツール広告（モデルが呼び出せるツール）、
- UI発見（ツールリスト、カテゴリ、スキーマ）、
- 機械可読スペックが必要な外部オーケストレーター（MCP、カスタムフロントエンド）。

並行するツールリストやアドホックなJSONスキーマを手動で維持するべきではありません。

## 生成されたスペックと`tool_schemas.json`

各エージェントに対して、Goa-AIは**specsパッケージ**と**JSONカタログ**を出力します：

- **Specsパッケージ（`gen/<service>/agents/<agent>/specs/...`）**  
  - `types.go` – ペイロード/結果Go構造体。
  - `codecs.go` – JSONコーデック（型付きペイロード/結果のエンコード/デコード）。
  - `specs.go` – 正規のツールID、ペイロード/結果スキーマ、ヒントを持つ`[]tools.ToolSpec`エントリ。

- **JSONカタログ（`tool_schemas.json`）**  
  - 場所：`gen/<service>/agents/<agent>/specs/tool_schemas.json`
  - ツールごとに1エントリを含み、ID、service、toolset、title、description、tags、payload/result JSONスキーマを持ちます。
  - Goスペック/コーデックと同じDSLから生成されます。スキーマ生成が失敗すると`goa gen`が失敗するので、ずれたカタログを出荷することはありません。

このJSONファイルは以下に理想的です：

- LLMプロバイダーにスキーマを供給（ツール/関数呼び出し）、
- ツールペイロード用のUIフォーム/エディターを構築、
- オフラインドキュメントツール。

## ランタイムイントロスペクションAPI

ランタイムでは、ディスクから`tool_schemas.json`を読む必要はありません。ランタイムは同じスペックに裏付けられたイントロスペクションAPIを公開します：

```go
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // 単一のToolSpec
schemas, ok := rt.ToolSchema(toolID)           // ペイロード/結果スキーマ
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // 1つのエージェントの[]ToolSpec
```

これは以下に推奨される方法です：

- UIが特定のエージェントのツールを発見、
- オーケストレーターが利用可能なツールを列挙してスキーマを読む、
- 運用ツールが実行中のシステムでツールメタデータをイントロスペクト。

## スペックとJSONの選択

使い分け：

- **スペックとランタイムイントロスペクション**の場合：
  - Goコード内（ワーカー、サービス、管理ツール）、
  - 強い型付けとコーデック/スキーマへの直接アクセスが必要。

- **`tool_schemas.json`**の場合：
  - Go外（フロントエンド、外部オーケストレーター）、
  - ロードしてキャッシュするシンプルな静的JSONカタログが必要。

両方とも**同じ設計**から派生しています。コンシューマーにとってより便利な方を選んでください。

## 次のステップ

- UIとプランナーのツール実行パターンについて[ツールセット](../3-toolsets/)を学ぶ
- ストリーミングアーキテクチャについて[ランツリーとストリーミング](../8-run-trees-streaming-topology.md)を読む


