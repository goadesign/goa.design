---
title: "ポリシー関数"
linkTitle: "ポリシー関数"
weight: 4
description: "ランタイムポリシーと実行制限を設定するための関数。"
---

## RunPolicy

`RunPolicy(dsl)`はランタイムで適用される実行制限を設定します。`Agent`内で宣言され、キャップ、時間予算、タイミング、中断処理などのポリシー設定を含みます。

**場所**: `dsl/policy.go`  
**コンテキスト**: `Agent`内  
**目的**: ランタイムキャップと動作を設定します。

これらの値は生成されたワークフロー設定に表示され、ランタイムはすべてのターンでそれらを適用します。

### 例

```go
Agent("chat", "会話ランナー", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")
    })
})
```

## DefaultCaps

`DefaultCaps(opts...)`は暴走ループを防止し実行制限を適用するための機能キャップを適用します。`MaxToolCalls`や`MaxConsecutiveFailedToolCalls`などのオプションを受け入れます。

**場所**: `dsl/policy.go`  
**コンテキスト**: `RunPolicy`内  
**目的**: 機能キャップ（最大呼び出し数、連続失敗数）を適用します。

### 例

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

## MaxToolCalls

`MaxToolCalls(n)`はエージェント実行中に許可されるツール呼び出しの最大数を設定します。超過した場合、ランタイムは中止してエラーを返します。

**場所**: `dsl/policy.go`  
**コンテキスト**: `DefaultCaps`の引数  
**目的**: 最大ツール呼び出しキャップのヘルパーオプション。

### 例

```go
DefaultCaps(MaxToolCalls(8))
```

## MaxConsecutiveFailedToolCalls

`MaxConsecutiveFailedToolCalls(n)`はランタイムがランを中止する前に許可される連続失敗ツール呼び出しの最大数を設定します。これにより無限リトライループを防止します。

**場所**: `dsl/policy.go`  
**コンテキスト**: `DefaultCaps`の引数  
**目的**: 連続失敗キャップのヘルパーオプション。

### 例

```go
DefaultCaps(MaxConsecutiveFailedToolCalls(3))
```

## TimeBudget

`TimeBudget(duration)`はエージェント実行に壁時計制限を適用します。ランタイムは経過時間を監視し、超過した場合に中止します。持続時間は文字列で指定します（例：`"2m"`、`"30s"`）。

**場所**: `dsl/policy.go`  
**コンテキスト**: `RunPolicy`内  
**目的**: 最大壁時計実行時間を設定します。

### 例

```go
RunPolicy(func() {
    TimeBudget("2m") // 2分
})
```

## InterruptsAllowed

`InterruptsAllowed(bool)`はヒューマンインザループの中断を尊重すべきことをランタイムに通知します。有効にすると、ランタイムは中断APIを介した一時停止/再開操作をサポートします。

**場所**: `dsl/policy.go`  
**コンテキスト**: `RunPolicy`内  
**目的**: ラン中断処理を有効にします。

### 例

```go
RunPolicy(func() {
    InterruptsAllowed(true)
})
```

## OnMissingFields

`OnMissingFields(action)`はツール呼び出し検証が必須フィールドの欠落を検出した場合のエージェントの応答方法を設定します。これにより、エージェントが停止するか、ユーザー入力を待つか、実行を続行するかを制御できます。

**場所**: `dsl/policy.go`  
**コンテキスト**: `RunPolicy`内  
**目的**: 検証失敗への応答を設定します。

有効な値：

- `"finalize"`: 必須フィールドが欠落している場合に実行を停止
- `"await_clarification"`: 一時停止してユーザーが欠落情報を提供するのを待つ
- `"resume"`: 欠落フィールドにもかかわらず実行を続行
- `""` (空): プランナーにコンテキストに基づいて判断させる

### 例

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

## Timing

`Timing(dsl)`はエージェントの詳細なランタイミング設定を定義します。これを使用して、実行の異なるフェーズの細かいタイムアウトを設定します。

**場所**: `dsl/timing.go`  
**コンテキスト**: `RunPolicy`内  
**目的**: 詳細なタイムアウト設定を構成します。

### 例

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // 全体的な壁時計
        Plan("45s")     // Plan/Resumeアクティビティのタイムアウト
        Tools("2m")     // ツールアクティビティのデフォルトタイムアウト
    })
})
```

## Budget

`Budget(duration)`はランの合計壁時計予算を設定します。これは`Timing`ブロックを使用する場合の`TimeBudget`の代替です。

**場所**: `dsl/timing.go`  
**コンテキスト**: `Timing`内  
**目的**: 全体的な実行時間予算を設定します。

### 例

```go
Timing(func() {
    Budget("10m")
})
```

## Plan

`Plan(duration)`はPlanとResumeアクティビティの両方のタイムアウトを設定します。これらはツールリクエストを生成するLLM推論呼び出しです。

**場所**: `dsl/timing.go`  
**コンテキスト**: `Timing`内  
**目的**: プランナーアクティビティのタイムアウトを設定します。

### 例

```go
Timing(func() {
    Plan("45s") // 各プランニングステップに45秒
})
```

## Tools

`Tools(duration)`はExecuteToolアクティビティのデフォルトタイムアウトを設定します。この期間を超える個別のツール実行は中止されます。

**場所**: `dsl/timing.go`  
**コンテキスト**: `Timing`内  
**目的**: ツール実行のデフォルトタイムアウトを設定します。

### 例

```go
Timing(func() {
    Tools("2m") // ツール実行ごとに2分
})
```

## 完全なポリシー例

```go
Agent("chat", "会話ランナー", func() {
    RunPolicy(func() {
        // ツール呼び出し数をキャップ
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        
        // 詳細なタイミングを設定
        Timing(func() {
            Budget("5m")    // 合計ラン予算
            Plan("30s")     // プランナータイムアウト
            Tools("1m")     // ツール実行タイムアウト
        })
        
        // ヒューマンインザループの中断を許可
        InterruptsAllowed(true)
        
        // 検証失敗を処理
        OnMissingFields("await_clarification")
    })
})
```

## 次のステップ

- ポリシーがどのように適用されるかを理解するための[ランタイムコンセプト](../2-runtime/)を学ぶ
- ツールを定義するための[ツールセット関数](./3-toolset-functions.md)を探索する
- MCPサーバー統合のための[MCP DSL関数](./5-mcp-functions.md)を読む
