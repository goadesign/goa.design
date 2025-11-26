---
title: "ストリーミングUI"
linkTitle: "ストリーミングUI"
weight: 2
description: "Goa-AIストリーミングイベントを消費するリアルタイムユーザーインターフェースの構築。"
---

Goa-AIは構造化されたイベントストリームを提供し、レスポンシブなリアルタイムUIの構築を可能にします。

## ストリームイベント

Goa-AIは以下のイベントタイプを発行します：

- **`AssistantReply`** – アシスタントテキストのチャンク
- **`PlannerThought`** – 思考/推論ブロック
- **`ToolStart`** – ツール実行の開始
- **`ToolUpdate`** – ツールの進捗更新
- **`ToolEnd`** – 結果を伴うツール完了
- **`AgentRunStarted`** – 子エージェントラン（リンクあり）
- **`AwaitClarification`** – ユーザー入力を待機中
- **`AwaitExternalTools`** – 外部ツールを待機中
- **`Usage`** – トークン使用量メトリクス
- **`Workflow`** – ワークフロー状態の変更

## ストリームへの接続

```go
type MySink struct{}

func (s *MySink) OnEvent(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case *stream.AssistantReply:
        fmt.Printf("アシスタント: %s", e.Text)
    case *stream.ToolStart:
        fmt.Printf("ツール開始: %s", e.ToolID)
    case *stream.ToolEnd:
        fmt.Printf("ツール終了: %s", e.ToolID)
    case *stream.AgentRunStarted:
        fmt.Printf("子エージェント: %s (run: %s)", e.AgentID, e.ChildRunID)
    }
    return nil
}

// サブスクライブ
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil {
    return err
}
defer stop()
```

## UI設計パターン

### チャットメッセージ

`AssistantReply`イベントをバッファリングして、現在のメッセージコンテンツを構築：

```typescript
const [message, setMessage] = useState("");

onEvent((event) => {
  if (event.type === "assistant_reply") {
    setMessage(prev => prev + event.text);
  }
});
```

### ツールステータス

`ToolStart`と`ToolEnd`を追跡してローディングインジケーターを表示：

```typescript
const [activeTools, setActiveTools] = useState<Set<string>>(new Set());

onEvent((event) => {
  if (event.type === "tool_start") {
    setActiveTools(prev => new Set([...prev, event.toolCallId]));
  }
  if (event.type === "tool_end") {
    setActiveTools(prev => {
      const next = new Set(prev);
      next.delete(event.toolCallId);
      return next;
    });
  }
});
```

### ネストされたエージェント

`AgentRunStarted`を使用して子エージェントのUIを作成：

```typescript
onEvent((event) => {
  if (event.type === "agent_run_started") {
    // childRunIdでサブスクライブして子イベントを取得
    subscribeToRun(event.childRunId);
  }
});
```

## 次のステップ

- 完全なイベント構造について[トランスクリプト](../../3-concepts/5-transcripts.md)で学ぶ
- [ランツリー](../../3-concepts/8-run-trees-streaming-topology.md)でネストされたストリームの処理を理解する


