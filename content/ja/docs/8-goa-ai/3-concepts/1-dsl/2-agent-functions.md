---
title: "エージェント関数"
linkTitle: "エージェント関数"
weight: 2
description: "エージェントとツール使用を宣言するための関数。"
---

## Agent

`Agent(name, description, dsl)`は`Service`内でエージェントを宣言します。サービススコープのエージェントメタデータ（名前、説明、所有サービス）を記録し、`Use`と`Export`を介してツールセットをアタッチします。

**場所**: `dsl/agent.go`  
**コンテキスト**: `Service`内  
**目的**: エージェント、そのツール使用/エクスポート、およびランポリシーを宣言します。

各エージェントは以下を持つランタイム登録になります：

- ワークフロー定義とTemporalアクティビティハンドラー
- DSL由来のリトライ/タイムアウトオプションを持つPlanStart/PlanResumeアクティビティ
- ワークフロー、アクティビティ、ツールセットを`runtime.Runtime`に登録する`Register<Agent>`ヘルパー

### 例

```go
var _ = Service("orchestrator", func() {
    Agent("chat", "会話ランナー", func() {
        Use(DocsToolset)
        Export("chat.tools", func() {
            // ここでツールを定義
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

## Use

`Use(value, dsl)`はエージェントがツールセットを使用することを宣言します。ツールセットは以下のいずれかです：

- トップレベルの`Toolset`変数
- `MCPToolset`参照
- インラインツールセット定義（文字列名 + DSL）
- エージェントアズツールコンポジションのための`AgentToolset`参照

プロバイダーツールセットを参照する場合、オプションのDSL関数でツールを名前でサブセット化したり、設定を追加したりできます。文字列名を使用する場合、エージェントローカルのインラインツールセットが作成されます。

**場所**: `dsl/agent.go`  
**コンテキスト**: `Agent`内  
**目的**: エージェントがツールセット（インラインまたは参照）を使用することを宣言します。

### 例

```go
Agent("chat", "会話ランナー", func() {
    // トップレベルツールセットを参照
    Use(DocsToolset)
    
    // サブセット化で参照
    Use(CommonTools, func() {
        Tool("notify") // CommonToolsからこのツールのみを使用
    })
    
    // MCPツールセットを参照
    Use(MCPToolset("assistant", "assistant-mcp"))
    
    // インラインのエージェントローカルツールセット定義
    Use("helpers", func() {
        Tool("answer", "質問に回答", func() {
            // ツール定義
        })
    })
    
    // エージェントアズツールコンポジション
    Use(AgentToolset("service", "agent", "toolset"))
})
```

## Export

`Export(value, dsl)`は他のエージェントやサービスに公開するツールセットを宣言します。エクスポートされたツールセットは他のエージェントが`Use(AgentToolset(...))`で使用できます。

Exportは以下で使用できます：
- `Agent`式（エージェント所有としてエクスポート）
- `Service`式（サービス所有としてエクスポート）

**場所**: `dsl/agent.go`  
**コンテキスト**: `Agent`または`Service`内  
**目的**: 他のエージェントやサービスに公開するツールセットを宣言します。

### 例

```go
Agent("planner", "プランニングエージェント", func() {
    Export("planning.tools", func() {
        Tool("create_plan", "プランを作成", func() {
            Args(func() {
                Attribute("goal", String, "計画する目標")
                Required("goal")
            })
            Return(func() {
                Attribute("plan", String, "生成されたプラン")
                Required("plan")
            })
        })
    })
})
```

## AgentToolset

`AgentToolset(service, agent, toolset)`は別のエージェントによってエクスポートされたツールセットを参照します。これにより、あるエージェントが別のエージェントのエクスポートされたツールを使用できるエージェントアズツールコンポジションが可能になります。

`AgentToolset`を使用する場合：
- エクスポートされたツールセットへの式ハンドルがない場合
- 複数のエージェントが同じ名前のツールセットをエクスポートしている場合（曖昧さ）
- 設計で明示的にしたい場合

直接の式ハンドル（例：トップレベルToolset変数）がある場合は、`Use(ToolsetExpr)`を使用し、Goa-AIにプロバイダーを自動的に推論させることを推奨します。

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Use`の引数  
**目的**: 別のエージェントからエクスポートされたツールセットを参照します。

### 例

```go
// エージェントAがツールをエクスポート
Agent("planner", func() {
    Export("planning.tools", func() {
        // ツール
    })
})

// エージェントBがエージェントAのツールを使用
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

## Passthrough

`Passthrough(toolName, target, methodName)`はエクスポートされたツールからGoaサービスメソッドへの決定論的転送を定義します。これはプランナーを完全にバイパスします—ツールが呼び出されると、指定されたサービスメソッドを直接呼び出します。

**場所**: `dsl/agent.go`  
**コンテキスト**: `Export`の下にネストされた`Tool`内  
**目的**: プランナーの関与なしにツールコールをサービスメソッドに直接ルーティングします。

Passthroughは以下を受け入れます：
- `Passthrough(toolName, methodExpr)` - Goaメソッド式を使用
- `Passthrough(toolName, serviceName, methodName)` - サービスとメソッド名を使用

### 例

```go
Export("logging-tools", func() {
    Tool("log_message", "メッセージをログ", func() {
        Args(func() {
            Attribute("message", String, "ログするメッセージ")
            Required("message")
        })
        Return(func() {
            Attribute("logged", Boolean, "メッセージがログされたかどうか")
        })
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

## UseAgentToolset

`UseAgentToolset(service, agent, toolset)`は`AgentToolset`と`Use`を組み合わせた便利な関数です。別のエージェントによってエクスポートされたツールセットを参照し、すぐに現在のエージェントの使用ツールセットに追加します。

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Agent`内  
**目的**: `Use(AgentToolset(...))`の短縮形。

### 例

```go
Agent("orchestrator", func() {
    // これらは同等です：
    Use(AgentToolset("service", "planner", "planning.tools"))
    UseAgentToolset("service", "planner", "planning.tools")
})
```

## DisableAgentDocs

`DisableAgentDocs()`はモジュールルートでの`AGENTS_QUICKSTART.md`の生成を無効にします。デフォルトでは、Goa-AIはコード生成後にコンテキスト対応のクイックスタートガイドを生成します。

**場所**: `dsl/agent.go`  
**コンテキスト**: `API`内  
**目的**: モジュールルートでの`AGENTS_QUICKSTART.md`の生成を無効にします。

### 例

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

## 次のステップ

- ツールセットとツールを定義するための[ツールセット関数](./3-toolset-functions.md)を学ぶ
- ランタイム動作を設定するための[ポリシー関数](./4-policy-functions.md)を読む
