---
title: "ツールセット"
linkTitle: "ツールセット"
weight: 3
description: "ツールセットの種類、実行モデル、コンポジションパターンについて学ぶ。"
---

ツールセットはエージェントが使用できるツールのコレクションです。Goa-AIはいくつかのツールセットタイプをサポートしており、それぞれ異なる実行モデルとユースケースがあります。

## ツールセットの種類

### サービス所有ツールセット（メソッドバックエンド）

`Toolset("name", func() { ... })`で宣言します。ツールはGoaサービスメソッドに`BindTo`するか、カスタムエグゼキューターで実装できます。

- コード生成は`gen/<service>/tools/<toolset>/`の下にツールセットごとのスペック/タイプ/コーデックを出力します
- これらのツールセットを`Use`するエージェントはプロバイダースペックをインポートし、型付きコールビルダーとエグゼキューターファクトリを取得します
- アプリケーションは型付き引数（ランタイム提供のコーデックを使用）をデコードし、オプションで変換を使用し、サービスクライアントを呼び出し、`ToolResult`を返すエグゼキューターを登録します

### エージェント実装ツールセット（エージェントアズツール）

エージェントの`Export`ブロックで定義され、オプションで他のエージェントが`Use`します。

- 所有権はサービスにあります。エージェントが実装です
- コード生成はプロバイダー側の`agenttools/<toolset>`ヘルパーを`NewRegistration`と型付きコールビルダーと共に出力します
- エクスポートされたツールセットを`Use`するエージェントのコンシューマー側ヘルパーは、ルーティングメタデータを集中管理しながらプロバイダーヘルパーに委任します
- 実行はインラインで行われます。ペイロードは正規のJSONとして渡され、プロンプトに必要な場合のみ境界でデコードされます

### MCPツールセット

`MCPToolset(service, suite)`で宣言し、`Use(MCPToolset(...))`で参照します。

- 生成された登録は`DecodeInExecutor=true`を設定するので、生のJSONがMCPエグゼキューターに渡されます
- MCPエグゼキューターは独自のコーデックを使用してデコードします
- 生成されたラッパーはJSONスキーマ/エンコーダーとトランスポート（HTTP/SSE/stdio）をリトライとトレーシングで処理します

## 実行モデル

### アクティビティベース実行（デフォルト）

サービスバックエンドのツールセットはTemporalアクティビティ（または他のエンジンの同等物）を介して実行されます：

1. プランナーは`PlanResult`でツールコールを返します（ペイロードは`json.RawMessage`）
2. ランタイムは各ツールコールに対して`ExecuteToolActivity`をスケジュールします
3. アクティビティは検証/ヒントのために生成されたコーデックを使用してペイロードをデコードします
4. 正規のJSONでツールセット登録の`Execute(ctx, planner.ToolRequest)`を呼び出します
5. 生成された結果コーデックで結果を再エンコードします

### インライン実行（エージェントアズツール）

エージェントアズツールのツールセットはプランナーの観点からはインラインで実行されますが、ランタイムはプロバイダーエージェントを実際の子ランとして実行します：

1. ランタイムはツールセット登録で`Inline=true`を検出します。
2. ツールセットの`Execute`関数が独自の`RunID`を持つ子ワークフローとしてプロバイダーエージェントを開始できるように、`engine.WorkflowContext`を`ctx`に注入します。
3. 正規のJSONペイロードとツールメタデータ（親の`RunID`と`ToolCallID`を含む）でツールセットの`Execute(ctx, call)`を呼び出します。
4. 生成されたエージェントツールエグゼキューターはツールペイロードからネストされたエージェントメッセージ（システム + ユーザー）を構築し、ランタイムヘルパーを使用してプロバイダーエージェントを子ランとして実行します。
5. ネストされたエージェントは独自のランで完全なプラン/実行/再開ループを実行します。その`RunOutput`とツールイベントは、結果ペイロード、集約テレメトリ、子の`ChildrenCount`、および子ランを指す`RunLink`を持つ親の`planner.ToolResult`に集約されます。
6. ストリームサブスクライバーは親ツールコールの`tool_start` / `tool_end`と、UIやデバッガーがオンデマンドで子ランのストリームにアタッチできるように`agent_run_started`リンクイベントの両方を発行します。

## エグゼキューターファーストモデル

生成されたサービスツールセットは単一の汎用コンストラクターを公開します：

```go
New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)
```

アプリケーションは消費する各ツールセットにエグゼキューター実装を登録します。エグゼキューターはツールの実行方法（サービスクライアント、MCP、ネストエージェントなど）を決定し、`ToolCallMeta`を介して明示的なコールごとのメタデータを受け取ります。

### エグゼキューターの例

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error: planner.NewToolError("invalid payload"),
            }, nil
        }
        
        // コード生成で出力された場合のオプションの変換
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return planner.ToolResult{
                Error: planner.ToolErrorFromError(err),
            }, nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return planner.ToolResult{Payload: tr}, nil
        
    default:
        return planner.ToolResult{
            Error: planner.NewToolError("unknown tool"),
        }, nil
    }
}
```

## 変換

ツールが`BindTo`を介してGoaメソッドにバインドされている場合、コード生成はツールのArg/Returnとメソッドのpayload/Resultを分析します。形状が互換性がある場合、Goaは型安全な変換ヘルパーを出力します：

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

変換は`gen/<service>/agents/<agent>/specs/<toolset>/transforms.go`の下に出力され、GoaのGoTransformを使用してフィールドを安全にマップします。変換が出力されない場合は、エグゼキューターで明示的なマッパーを書いてください。

## ツールアイデンティティ

各ツールセットは、エクスポートされていないツールセットを含むすべての生成されたツールに対して型付きツール識別子（`tools.Ident`）を定義します。アドホックな文字列よりもこれらの定数を優先してください：

```go
import chattools "example.com/assistant/gen/orchestrator/agents/chat/agenttools/search"

// アドホックな文字列/キャストの代わりに生成された定数を使用
spec, _ := rt.ToolSpec(chattools.Search)
schemas, _ := rt.ToolSchema(chattools.Search)
```

エクスポートされたツールセット（エージェントアズツール）の場合、Goa-AIは以下を持つ**agenttools**パッケージも生成します：

- 型付きツールID、
- エイリアスペイロード/結果タイプ、
- コーデック、
- ヘルパービルダー（例：`New<Search>Call`）。

文字列型のIDを避け、ツール参照を設計に合わせるために、プランナーとランタイム/イントロスペクションコードでこれらのヘルパーを使用してください。

## デコードと検証のセマンティクス

Goa-AIはツールペイロードに**正規のJSON**契約を使用します：

- **プランナー**: 常に`ToolRequest.Payload`で`json.RawMessage`を渡します。プランナーはツール引数を型付き構造体にデコードする必要はありません。
- **ランタイム**: すべてのスキーマ対応デコードを処理します。検証、リトライヒント、エージェントアズツールプロンプトレンダリングのためにJSONペイロードを型付き構造体にデコードします。
- **エグゼキューター**: 正規のJSONを受け取ります。実装ロジックのために生成されたコーデックを使用して型付き構造体にデコードできます。

厳密な検証はサービス境界（Goaサービス）に残ります。サービスによって返される検証エラーは、プランナーに回復可能なガイダンスを表示することを選択した場合、`RetryHint`にマップできます。

## 次のステップ

- 外部ツールスイートのための[MCP統合](../4-mcp-integration.md)を学ぶ
- エージェントアズツールパターンのための[エージェントコンポジション](../../4-tutorials/2-agent-composition/)を探索する
- ツール実行フローを理解するための[ランタイムコンセプト](../2-runtime/)を読む

