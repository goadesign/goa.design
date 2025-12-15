---
title: "プロダクション"
linkTitle: "プロダクション"
weight: 8
description: "Temporal による耐久性のあるワークフロー、UI へのイベントストリーミング、適応型レート制限、システムリマインダー。"
llm_optimized: true
aliases:
---

## モデルのレート制限

どのモデルプロバイダーにもレート制限があります。超過すると 429 エラーで失敗します。さらに悪いことに、マルチレプリカ構成では各レプリカが独立に API を叩くため、個々のプロセスからは見えない形で**合計**のスロットリングが発生します。

### 問題

**シナリオ:** エージェントサービスを 10 レプリカでデプロイします。各レプリカは「100K tokens/min 使える」と思っています。合計では 1M tokens/min を送ってしまい、実際のクォータの 10 倍です。プロバイダーは強くスロットリングし、全レプリカでランダムに失敗します。

**レート制限なしの場合:**
- 429 により予測不能に失敗する
- 残りキャパシティが可視化されない
- リトライが混雑を悪化させる
- 負荷時に UX が劣化する

**適応型レート制限ありの場合:**
- レプリカ間で協調されたバジェットを共有できる
- キャパシティが空くまでリクエストをキューイングできる
- バックオフがクラスター全体に伝播する
- 失敗ではなく、段階的な劣化にできる

### 概要

`features/model/middleware` パッケージは、モデルクライアント境界に挿入する **AIMD（Additive Increase / Multiplicative Decrease）スタイルの適応型レートリミッター**を提供します。トークンコストを見積もり、キャパシティが利用可能になるまで呼び出し元をブロックし、プロバイダーからのレート制限シグナルに応じて tokens-per-minute バジェットを自動調整します。

### AIMD 戦略

このリミッターは **Additive Increase / Multiplicative Decrease (AIMD)** を使います。

| イベント | 動作 | 計算式 |
|--------|------|--------|
| Success | Probe（加法増加） | `TPM += recoveryRate`（初期値の 5%） |
| `ErrRateLimited` | Backoff（乗法減少） | `TPM *= 0.5` |

有効な tokens-per-minute（TPM）は次で制約されます:
- **最小**: 初期 TPM の 10%（飢餓を防ぐフロア）
- **最大**: 設定した `maxTPM` の上限

### 基本的な使い方

プロセスごとに 1 つのリミッターを作成して、モデルクライアントをラップします。

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/features/model/bedrock"
)

func main() {
    ctx := context.Background()

    // Create the adaptive rate limiter
    // Parameters: context, rmap (nil for local), key, initialTPM, maxTPM
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // nil = process-local limiter
        "",      // key (unused when rmap is nil)
        60000,   // initial tokens per minute
        120000,  // maximum tokens per minute
    )

    // Create your underlying model client
    bedrockClient, err := bedrock.NewClient(bedrock.Options{
        Region: "us-east-1",
        Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    })
    if err != nil {
        panic(err)
    }

    // Wrap with rate limiting middleware
    rateLimitedClient := limiter.Middleware()(bedrockClient)

    // Use rateLimitedClient with your runtime or planners
    rt := runtime.New(
        runtime.WithModelClient("claude", rateLimitedClient),
    )
}
```

### クラスタ対応のレート制限

マルチプロセスのデプロイでは、Pulse の replicated map を使ってインスタンス間でレート制限を協調させます。

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()

    // Create a Pulse replicated map backed by Redis
    rm, err := rmap.NewMap(ctx, "rate-limits", rmap.WithRedis(redisClient))
    if err != nil {
        panic(err)
    }

    // Create cluster-aware limiter
    // All processes sharing this map and key coordinate their budgets
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "claude-sonnet",  // shared key for this model
        60000,            // initial TPM
        120000,           // max TPM
    )

    // Wrap your client as before
    rateLimitedClient := limiter.Middleware()(bedrockClient)
}
```

クラスタ対応制限を使うと:
- **バックオフがグローバルに伝播**: どれか 1 つのプロセスが `ErrRateLimited` を受けると、全プロセスがバジェットを減らします
- **プロービングが協調される**: 成功リクエストが共有バジェットを増やします
- **自動リコンシリエーション**: 外部変更を監視し、ローカルリミッターを更新します

### トークン見積もり

リミッターは単純なヒューリスティックでリクエストコストを見積もります:
- テキストパートと文字列ツール結果の文字数を数える
- おおよそ「3 文字 ≒ 1 トークン」でトークン数に換算する
- システムプロンプトやプロバイダーオーバーヘッドとして 500 トークンのバッファを加算する

この見積もりは、過少カウントを避けるために意図的に保守的です。

### ランタイムとの統合

レート制限したクライアントを Goa-AI runtime に配線します。

```go
// Create limiters for each model you use
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Wrap underlying clients
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configure runtime with rate-limited clients
rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithModelClient("claude", claudeClient),
    runtime.WithModelClient("gpt-4", gptClient),
)
```

### 負荷時に何が起きるか

| トラフィック | リミッターなし | リミッターあり |
|-------------|---------------|----------------|
| クォータ未満 | 成功 | 成功 |
| クォータ付近 | 429 がランダムに発生 | キューイングしてから成功 |
| クォータを超えるバースト | 失敗が連鎖し、プロバイダーがブロック | バックオフでバーストを吸収し、段階的に回復 |
| 持続的な過負荷 | 全リクエストが失敗 | レイテンシ上限を伴うキューイング |

### チューニングパラメータ

| パラメータ | デフォルト | 説明 |
|-----------|----------|------|
| `initialTPM` | (必須) | 初期 tokens-per-minute バジェット |
| `maxTPM` | (必須) | プロービング用の上限 |
| Floor | 初期の 10% | 最小バジェット（飢餓防止） |
| Recovery rate | 初期の 5% | 成功ごとの加法増加 |
| Backoff factor | 0.5 | 429 のときの乗法減少 |

**例:** `initialTPM=60000, maxTPM=120000` の場合:
- Floor: 6,000 TPM
- Recovery: 成功バッチごとに +3,000 TPM
- Backoff: 429 のたびに現在 TPM を半減

### 監視

メトリクスとログでレートリミッターの挙動を追跡します。

```go
// The limiter logs backoff events at WARN level
// Monitor for sustained throttling by tracking:
// - Wait time distribution (how long requests queue)
// - Backoff frequency (how often 429s occur)
// - Current TPM vs. initial TPM

// Example: export current capacity to Prometheus
currentTPM := limiter.CurrentTPM()
```

### ベストプラクティス

- **モデル/プロバイダーごとに 1 リミッター**: 異なるモデルのバジェットを分離するために、リミッターを分けます
- **現実的な初期 TPM**: プロバイダーが提示するレート制限（または保守的な見積もり）から始めます
- **本番ではクラスタ対応を使う**: レプリカの合算スロットリングを避けるため、インスタンス間で協調させます
- **バックオフを監視**: バックオフ発生時のログやメトリクスを出して、持続的なスロットリングを検出します
- **`maxTPM` は初期より上に**: クォータ未満のときにプロービングできる余白を残します

---

## Temporal セットアップ

このセクションは、本番環境における耐久性のあるエージェントワークフローのために Temporal をセットアップする方法を扱います。

### 概要

Temporal は Goa-AI エージェントに耐久実行を提供します。エージェントの run は Temporal workflow になり、イベントソースな履歴を持ちます。ツール呼び出しは、リトライを設定可能な activity になります。すべての状態遷移が永続化され、ワーカーの再起動後も履歴をリプレイして**まったく同じ地点から**再開します。

### 耐久性が機能する仕組み

| コンポーネント | 役割 | 耐久性 |
|--------------|------|--------|
| **Workflow** | エージェント run のオーケストレーション | イベントソース。再起動に耐える |
| **Plan Activity** | LLM 推論呼び出し | 一時的な失敗をリトライ |
| **Execute Tool Activity** | ツール実行 | ツールごとのリトライポリシー |
| **State** | ターン履歴、ツール結果 | workflow 履歴に永続化 |

**具体例:** エージェントが LLM を呼び出し、3 つのツール呼び出しが返ります。2 つは完了し、3 つ目のツール実行中にサービスがクラッシュしました。

- ❌ **Temporal なし:** run 全体が失敗します。推論（$$$）を再実行し、成功済み 2 ツールも再実行します。
- ✅ **Temporal あり:** クラッシュしたツールだけがリトライされます。workflow は履歴からリプレイされ、新たな LLM 呼び出しも完了済みツールの再実行もありません。コストは「1 回のリトライ」で済みます。

### 何が失敗に耐えるか

| 失敗シナリオ | Temporal なし | Temporal あり |
|-------------|--------------|---------------|
| ワーカープロセスがクラッシュ | run 消失、ゼロからやり直し | 履歴からリプレイして継続 |
| ツール呼び出しがタイムアウト | run 失敗（または手動対処） | バックオフ付き自動リトライ |
| レート制限（429） | run 失敗 | バックオフして自動リトライ |
| ネットワーク分断 | 進捗が部分的に失われる | 再接続後に再開 |
| run 中にデプロイ | 実行中 run が失敗 | ワーカーをドレインし、新ワーカーが再開 |

### インストール

**オプション 1: Docker（開発）**

ローカル開発向けのワンライナー:

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**オプション 2: Temporalite（開発）**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**オプション 3: Temporal Cloud（本番）**

[temporal.io](https://temporal.io) でサインアップし、クラウド認証情報でクライアントを設定します。

**オプション 4: セルフホスト（本番）**

Docker Compose または Kubernetes で Temporal をデプロイします。デプロイガイドは [Temporal documentation](https://docs.temporal.io) を参照してください。

### ランタイム設定

Goa-AI は実行バックエンドを `Engine` インタフェースの背後に抽象化しています。エージェントコードを変更せずにエンジンを差し替えられます。

**インメモリエンジン**（開発）:

```go
// Default: no external dependencies
rt := runtime.New()
```

**Temporal エンジン**（本番）:

```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

### Activity のリトライ設定

ツール呼び出しは Temporal activity です。DSL の toolset ごとにリトライを設定できます。

```go
Use("external_apis", func() {
    // Flaky external services: retry aggressively
    ActivityOptions(engine.ActivityOptions{
        Timeout: 30 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts:        5,
            InitialInterval:    time.Second,
            BackoffCoefficient: 2.0,
        },
    })
    
    Tool("fetch_weather", "Get weather data", func() { /* ... */ })
    Tool("query_database", "Query external DB", func() { /* ... */ })
})

Use("local_compute", func() {
    // Fast local tools: minimal retries
    ActivityOptions(engine.ActivityOptions{
        Timeout: 5 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts: 2,
        },
    })
    
    Tool("calculate", "Pure computation", func() { /* ... */ })
})
```

### ワーカーのセットアップ

ワーカーは task queue をポーリングし、workflow/activity を実行します。登録された各エージェントに対してワーカーは自動的に開始されるため、ほとんどのケースで手動設定は不要です。

### ベストプラクティス

- **環境ごとに namespace を分ける**（dev / staging / prod）
- **ツールセットごとにリトライポリシーを調整する**（信頼性特性に合わせる）
- **Temporal UI と観測性ツールで実行状況を監視する**
- **activity のタイムアウトを適切に設定する**（信頼性とハング検知のバランス）
- **本番は Temporal Cloud を推奨**（運用負荷を下げる）

---

## UI ストリーミング

このセクションでは、Goa-AI のストリーミング基盤を使って、エージェントのイベントを UI にリアルタイム配信する方法を説明します。

### 概要

Goa-AI は run ごとに型付きイベントストリームを公開しており、以下の手段で UI に届けられます:
- Server-Sent Events（SSE）
- WebSockets
- メッセージバス（Pulse、Redis Streams など）

各 workflow run は自身のストリームを持ちます。エージェントが他のエージェントをツールとして呼ぶ場合、ランタイムは子 run を開始し、`AgentRunStarted` イベントと `RunLink` ハンドルでリンクします。UI は run ID で任意の run を購読でき、どの程度詳細に描画するかを選べます。

### Stream Sink インタフェース

`stream.Sink` インタフェースを実装します。

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### イベント型

`stream` パッケージは `stream.Event` を実装する具体的なイベント型を定義します。UI でよく使うものは次です。

| イベント型 | 説明 |
|-----------|------|
| `AssistantReply` | アシスタントのメッセージチャンク（ストリーミングテキスト） |
| `PlannerThought` | プランナーの思考ブロック（メモや構造化 reasoning） |
| `ToolStart` | ツール実行開始 |
| `ToolUpdate` | ツール実行の進捗（期待される子数の更新など） |
| `ToolEnd` | ツール実行完了（結果、エラー、テレメトリ） |
| `AwaitClarification` | プランナーが人間からの明確化を待機している |
| `AwaitExternalTools` | プランナーが外部ツール結果を待機している |
| `Usage` | モデル呼び出しごとのトークン使用量 |
| `Workflow` | run のライフサイクルとフェーズ更新 |
| `AgentRunStarted` | 親ツール呼び出しから子エージェント run へのリンク |

トランスポート層は通常、コンパイル時の安全性のために `stream.Event` に対して type switch します。

```go
switch e := evt.(type) {
case stream.AssistantReply:
    // e.Data.Text
case stream.PlannerThought:
    // e.Data.Note or structured thinking fields
case stream.ToolStart:
    // e.Data.ToolCallID, e.Data.ToolName, e.Data.Payload
case stream.ToolEnd:
    // e.Data.Result, e.Data.Error, e.Data.ResultPreview
case stream.AgentRunStarted:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
}
```

### 例: SSE Sink

```go
type SSESink struct {
    w http.ResponseWriter
}

func (s *SSESink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.AssistantReply:
        fmt.Fprintf(s.w, "data: assistant: %s\n\n", e.Data.Text)
    case stream.PlannerThought:
        if e.Data.Note != "" {
            fmt.Fprintf(s.w, "data: thinking: %s\n\n", e.Data.Note)
        }
    case stream.ToolStart:
        fmt.Fprintf(s.w, "data: tool_start: %s\n\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Fprintf(s.w, "data: tool_end: %s status=%v\n\n",
            e.Data.ToolName, e.Data.Error == nil)
    case stream.AgentRunStarted:
        fmt.Fprintf(s.w, "data: agent_run_started: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### run ごとの購読

特定 run のイベントを購読します。

```go
sink := &SSESink{w: w}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil {
    return err
}
defer stop()
```

### グローバルな Stream Sink

すべての run をグローバル sink（たとえば Pulse）に流したい場合、runtime に stream sink を設定します。

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

runtime はデフォルトの `stream.Subscriber` をインストールします。これは:
- hook イベントを `stream.Event` にマップし
- **デフォルト `StreamProfile`**を使用して、アシスタント返信、プランナー思考、ツール start/update/end、await、usage、workflow、`AgentRunStarted` を出力します（子 run は自身のストリームに残します）

### Stream Profile

すべてのコンシューマがすべてのイベントを必要とするわけではありません。**Stream profile** は用途に応じてイベントをフィルタし、ノイズや帯域を削減します。

| プロファイル | 用途 | 含まれるイベント |
|-------------|------|------------------|
| `UserChatProfile()` | エンドユーザー向けチャット UI | アシスタント返信、ツール start/end、workflow 完了 |
| `AgentDebugProfile()` | 開発者デバッグ | プランナー思考を含むすべて |
| `MetricsProfile()` | 観測性パイプライン | usage と workflow のみ |

**組み込みプロファイルの使用:**

```go
// User-facing chat: replies, tool status, completion
profile := stream.UserChatProfile()

// Debug view: everything including planner thoughts
profile := stream.AgentDebugProfile()

// Metrics pipeline: just usage and workflow events
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**カスタムプロファイル:**

```go
// Fine-grained control over which events to emit
profile := stream.StreamProfile{
    Assistant:  true,
    Thought:    false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    RunStarted: true,   // Include agent-run-started links
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

カスタムプロファイルは次のような場合に有用です:
- 特定コンシューマ向けのイベントだけが必要（例: 進捗トラッキング）
- モバイル向けにペイロードを削減したい
- 一部イベントだけの分析パイプラインを作りたい

### 高度: Pulse と Stream ブリッジ

本番ではよく次が必要になります:
- イベントを共有バス（例: Pulse）へ publish する
- そのバス上で **run ごとのストリーム**（run ごとに topic/key）を保つ

Goa-AI は次を提供します:
- `features/stream/pulse` – Pulse backed な `stream.Sink`
- `runtime/agent/stream/bridge` – hook bus を任意の sink に配線するためのヘルパ

典型的な配線は次の通りです。

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    StreamIDFunc: func(ev stream.Event) (string, error) {
        if ev.RunID() == "" {
            return "", errors.New("missing run id")
        }
        return fmt.Sprintf("run/%s", ev.RunID()), nil
    },
})
if err != nil { log.Fatal(err) }

rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(s),
)
```

---

## システムリマインダー

モデルはドリフトします。指示を忘れます。10 ターン前には明らかだった文脈を無視します。長時間タスクを実行するエージェントでは、ユーザー会話を汚さずに **動的で文脈的なガイダンス**を注入する仕組みが必要です。

### 問題

**シナリオ:** エージェントが todo リストを管理しています。20 ターン後にユーザーが「次は何？」と尋ねましたが、モデルがドリフトしていて「進行中の todo がある」ことを覚えていません。ユーザーに「REMINDER: ...」のような不自然なメッセージを見せずに、モデルだけに促しを入れたいです。

**システムリマインダーなしの場合:**
- system prompt があらゆるケースで肥大化する
- 会話が長くなるほどガイダンスが埋もれる
- ツール結果に基づいて文脈を注入できない
- ユーザーに内部の足場が見えてしまう

**システムリマインダーありの場合:**
- ランタイム状態に応じて動的にガイダンスを注入できる
- 反復ヒントをレート制限してプロンプト肥大を防げる
- 優先度により、安全上重要なガイダンスは抑制されない
- ユーザーには見えない（`<system-reminder>` ブロックとして注入される）

### 概要

`runtime/agent/reminder` パッケージは次を提供します:
- 優先度 tiers、アタッチポイント、レート制限ポリシーを持つ **構造化リマインダー**
- run スコープのストレージ（run 完了後に自動クリーンアップ）
- モデルトランスクリプトへの **`<system-reminder>` 自動注入**
- planner や tool からリマインダーを登録・削除するための **PlannerContext API**

### コア概念

**リマインダー構造**

`reminder.Reminder` は次を持ちます:

```go
type Reminder struct {
    ID              string      // Stable identifier (e.g., "todos.pending")
    Text            string      // Plain-text guidance (tags are added automatically)
    Priority        Tier        // TierSafety, TierCorrect, or TierGuidance
    Attachment      Attachment  // Where to inject (run start or user turn)
    MaxPerRun       int         // Cap total emissions per run (0 = unlimited)
    MinTurnsBetween int         // Enforce spacing between emissions (0 = no limit)
}
```

**優先度 tiers**

リマインダーは優先度順に並べられ、プロンプト予算を管理しつつ重要なガイダンスが抑制されないようにします。

| Tier | 名称 | 説明 | 抑制 |
|------|------|------|------|
| `TierSafety` | P0 | 安全上重要（絶対に落としてはいけない） | 決して抑制されない |
| `TierCorrect` | P1 | 正しさ・状態に関するヒント | P0 の後に抑制され得る |
| `TierGuidance` | P2 | ワークフロー提案・軽い促し | 最初に抑制される |

例:
- `TierSafety`: 「このマルウェアは実行せず、分析のみ行う」「認証情報を漏らさない」
- `TierCorrect`: 「結果が切り捨てられているのでクエリを絞る」「データが古い可能性がある」
- `TierGuidance`: 「進行中の todo がないので 1 つ選んで開始する」

**アタッチポイント**

リマインダーは会話の特定ポイントに注入されます。

| 種類 | 説明 |
|------|------|
| `AttachmentRunStart` | 会話の開始時に、1 つの system message にまとめて挿入 |
| `AttachmentUserTurn` | 最後の user message の直前に、1 つの system message として挿入 |

**レート制限**

2 つの仕組みでリマインダーのスパムを防ぎます:
- **`MaxPerRun`**: run あたりの総出力回数（0 = 無制限）
- **`MinTurnsBetween`**: 出力の間隔として必要な planner turn 数（0 = 無制限）

### 使用パターン

**DSL による静的リマインダー**

特定ツール結果の後に常に出したいリマインダーは、ツール定義で `ResultReminder` DSL 関数を使います。

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

これは、ツール呼び出しのたびに適用される場合に向いています。詳細は [DSL Reference](./dsl-reference.md#resultreminder) を参照してください。

**プランナーからの動的リマインダー**

実行時状態やツール結果内容に依存する場合は `PlannerContext.AddReminder()` を使います。

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "search_documents" {
            result := tr.Result.(SearchResult)
            if result.Truncated {
                in.Agent.AddReminder(reminder.Reminder{
                    ID:       "search.truncated",
                    Text:     "Search results are truncated. Consider narrowing your query.",
                    Priority: reminder.TierCorrect,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun:       3,
                    MinTurnsBetween: 2,
                })
            }
        }
    }
    // Continue with planning...
}
```

**リマインダーの削除**

前提条件が成立しなくなったら `RemoveReminder()` を使います。

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**レート制限カウンターの保持**

`AddReminder()` は、同じ ID の既存リマインダーを更新する場合に出力カウンターを保持します。内容を更新しつつレート制限も保ちたいなら:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**アンチパターン:** 同じ ID に対して `RemoveReminder()` の後に `AddReminder()` を呼ぶのは避けてください。カウンターがリセットされ、`MinTurnsBetween` をバイパスします。

### 注入とフォーマット

**自動タグ付け**

ランタイムは、トランスクリプトに注入する際に自動で `<system-reminder>` タグを付けます。

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**モデルへの説明**

モデルが `<system-reminder>` ブロックをどう解釈すべきか理解できるように、system prompt に `reminder.DefaultExplanation` を含めます。

```go
const systemPrompt = `
You are a helpful assistant.

` + reminder.DefaultExplanation + `

Follow all instructions carefully.
`
```

### 完全な例

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "todos.update_todos" {
            snap := tr.Result.(TodosSnapshot)
            
            var rem *reminder.Reminder
            if len(snap.Items) == 0 {
                in.Agent.RemoveReminder("todos.no_active")
                in.Agent.RemoveReminder("todos.all_completed")
            } else if hasCompletedAll(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.all_completed",
                    Text:     "All todos are completed. Provide your final response now.",
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun: 1,
                }
            } else if hasPendingNoActive(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.no_active",
                    Text:     buildTodosNudge(snap),
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MinTurnsBetween: 3,
                }
            }
            
            if rem != nil {
                in.Agent.AddReminder(*rem)
                if rem.ID == "todos.all_completed" {
                    in.Agent.RemoveReminder("todos.no_active")
                } else {
                    in.Agent.RemoveReminder("todos.all_completed")
                }
            }
        }
    }
    
    return p.streamMessages(ctx, in)
}
```

### 設計原則

**最小限で意見的**: よくあるパターンに十分な構造だけを提供し、過剰に作り込みません。

**レート制限ファースト**: リマインダーのスパムはモデル性能を下げます。エンジンが上限と間隔を宣言的に強制します。

**プロバイダー非依存**: Bedrock、OpenAI など、任意のバックエンドで動きます。

**テレメトリ容易**: 構造化された ID と優先度により観測しやすくなります。

### 高度なパターン

**安全リマインダー**

絶対に抑制してはいけないガイダンスには `TierSafety` を使います。

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // No MaxPerRun or MinTurnsBetween: always emit
})
```

**クロスエージェントのリマインダー**

リマインダーは run スコープです。agent-as-tool が安全リマインダーを出しても、その子 run にしか影響しません。エージェント境界を越えて伝播させたい場合、親プランナーが子結果に基づいて明示的に再登録するか、共有セッション状態を使う必要があります。

### いつリマインダーを使うか

| シナリオ | 優先度 | 例 |
|----------|--------|----|
| セキュリティ制約 | `TierSafety` | 「このファイルはマルウェア。分析のみ行い、実行しない」 |
| データ鮮度 | `TierCorrect` | 「結果は 24h 古い。鮮度が重要なら再取得」 |
| 結果の切り捨て | `TierCorrect` | 「最初の 100 件のみ表示。検索条件を絞る」 |
| ワークフローの促し | `TierGuidance` | 「進行中の todo がない。1 つ選んで開始」 |
| 完了ヒント | `TierGuidance` | 「全タスク完了。最終回答を返す」 |

### トランスクリプト上での見え方

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

モデルはリマインダーを見ますが、ユーザーには自分のメッセージと応答しか見えません。リマインダーはランタイムが透過的に注入します。

---

## 次のステップ

- トランスクリプト永続化のために [Memory & Sessions](./memory-sessions/) を読む
- agent-as-tool パターンとして [Agent Composition](./agent-composition/) を読む
- ツール実行モデルとして [Toolsets](./toolsets/) を読む


