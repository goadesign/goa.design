---
title: "ポリシー、キャップ、ラベル"
linkTitle: "ポリシーとラベル"
weight: 9
description: "Goa-AIが設計時RunPolicyとランタイムオーバーライドを使用してエージェントラン周りのキャップ、時間予算、ポリシーを適用する方法を学ぶ。"
---

## 設計時RunPolicy

設計時に、`RunPolicy`でエージェントごとのポリシーを設定します：

```go
Agent("chat", "会話ランナー", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

これはエージェントの登録にアタッチされた`runtime.RunPolicy`になります：

- **キャップ**：`MaxToolCalls`、`MaxConsecutiveFailedToolCalls`
- **時間予算**：`TimeBudget`、`FinalizerGrace`（ランタイムのみ）
- **中断**：`InterruptsAllowed`
- **欠落フィールド動作**：`OnMissingFields`

これらは**強力なデフォルト**です：オーバーライドされない限り、ランタイムはすべてのランでそれらを適用します。

## ランタイムポリシーオーバーライド

一部の環境では、設計を変更せずにポリシーを厳しくしたり緩めたりしたい場合があります。ランタイムは以下を公開します：

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

ゼロ以外のフィールド（および`InterruptsAllowed`がtrueの場合）のみが適用されます。未指定のフィールドは設計時のデフォルトを維持します。

ガイドライン：

- 安定した契約レベルの境界には**設計時RunPolicy**を使用、
- ローカル実験や緊急キャップには**`OverridePolicy`**を控えめに使用。

## ラベルとポリシーエンジン

Goa-AIは`policy.Engine`を介してプラガブルなポリシーエンジンと統合します。ポリシーは以下を受け取ります：

- ツールメタデータ（ID、タグ）、
- ランコンテキスト（SessionID、TurnID、ラベル）、
- ツール失敗後の`RetryHint`情報。

ポリシー決定は以下ができます：

- ツールを許可/拒否、
- キャップや時間予算を調整、
- 追加ラベルでランをアノテート。

ラベルは以下に流れます：

- `run.Context.Labels` – ラン中にプランナーで利用可能、
- `run.Record.Labels` – ランメタデータと共に永続化（検索/ダッシュボードに便利）。

## ポリシーとRetryHintの連携

ツールが失敗して`RetryHint`を返すと、ランタイムはそれを`policy.RetryHint`に変換し、続行方法を決定する前にポリシーエンジンに渡します：

- ポリシーは：キャップを減らすか問題のあるツールを無効化、ラベルでレビュー用にランをマーク、または決定を完全にプランナーに委ねる。
- プランナーは：`RetryHint`に基づいてコールを修復してリトライ、`AwaitClarification`にエスカレート、またはベストエフォートの回答でファイナライズ。


