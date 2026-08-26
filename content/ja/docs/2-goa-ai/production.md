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

`features/model/middleware` package は、検証済み model client の下に置く **AIMD（Additive Increase / Multiplicative Decrease）スタイルの適応型 rate limiter** を提供します。provider に正確な input-token count を問い合わせ、その capacity が利用可能になるまで caller を block し、provider の throttling に応じて input-tokens-per-minute budget を調整します。token を推定せず、output quota は計量しません。

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

プロセスごとに 1 つの limiter を作成し、model client を wrap します:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    ctx := context.Background()
    rt := runtime.New()

    // Vertex Gemini exposes the exact CountTokens operation required by the limiter.
    modelClient, err := rt.NewVertexGeminiModelClient(ctx, runtime.VertexConfig{
        ProjectID:    "my-gcp-project",
        Location:     "us-central1",
        DefaultModel: "gemini-2.5-flash",
    })
    if err != nil {
        panic(err)
    }

    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // process-local limiter
        "",      // unused for a process-local limiter
        60000,   // initial input tokens per minute
        120000,  // maximum input tokens per minute
    )

    rateLimitedClient, err := limiter.Middleware()(modelClient)
    if err != nil {
        panic(err)
    }

    if err := rt.RegisterModel("default", rateLimitedClient); err != nil {
        panic(err)
    }
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
    rm, err := rmap.Join(ctx, "rate-limits", redisClient)
    if err != nil {
        panic(err)
    }
    defer rm.Close()

    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "vertex:gemini",  // shared key for this model family
        60000,            // initial TPM
        120000,           // max TPM
    )

    rateLimitedClient, err := limiter.Middleware()(vertexClient)
    if err != nil {
        panic(err)
    }
}
```

replicated-map の read／write が成功している間:
- **バックオフがグローバルに伝播**: どれか 1 つのプロセスが `ErrRateLimited` を受けると、全プロセスがバジェットを減らします
- **プロービングが協調される**: 成功リクエストが共有バジェットを増やします
- **自動リコンシリエーション**: 外部変更を監視し、ローカルリミッターを更新します

nil map または空 key を渡すと、意図して process-local limiter を作ります。両方を設定したものの shared key がなく、middleware が seed できない場合も process-local operation へ fallback します。startup 後に shared backoff／probe update が失敗しても model call 自体は失敗しません。その process は後続の replicated-map event で reconcile されるまで、local adaptive budget を使い続けます。cluster-wide coordination が必要なら Redis availability を監視してください。

### 正確な token count

limiter は capacity を予約する前に、wrapped client の `CountTokens` operation を呼びます。`Exact=true` を要求し、推定はしません。

Vertex Gemini は native count operation を公開します。Bedrock は対応箇所で Runtime `CountTokens` を使いますが、structured-output request と、別の AWS Mantle endpoint を必要とする Claude Opus 4.7、Sonnet 5、Mythos 5 などでは `model.ErrTokenCountingUnsupported` を返します。remote gateway が counting を保つのは `gateway.NewCountingRemoteClient` で構築した場合だけです。OpenAI には native token counter がありません。

counting 非対応の client も wrap 自体は成功します。最初の `Complete` または `Stream` call が inference 前に `model.ErrTokenCountingUnsupported` を返します。

limiter は成功した unary call または正常な stream end の後に上向き probe を行い、terminal `model.ErrRateLimited` の後に backoff します。terminal outcome に到達せず stream を開閉した場合は capacity を変更しません。

### ランタイムとの統合

レート制限したクライアントを Goa-AI runtime に配線します。

```go
vertexLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
limitedVertex, err := vertexLimiter.Middleware()(vertexClient)
if err != nil {
    panic(err)
}

rt := runtime.New(runtime.WithEngine(temporalEng))
if err := rt.RegisterModel("gemini", limitedVertex); err != nil {
    panic(err)
}
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

wrapped client 周辺の telemetry で model-call latency と terminal `model.ErrRateLimited` error を測定します。replicated map を使う場合は Redis も監視します。shared-state initialization や update が失敗すると、middleware は意図して process-local budget で model call を続行するためです。

### ベストプラクティス

- **モデル/プロバイダーごとに 1 リミッター**: 異なるモデルのバジェットを分離するために、リミッターを分けます
- **現実的な初期 TPM**: プロバイダーが提示するレート制限（または保守的な見積もり）から始めます
- **本番ではクラスタ対応を使う**: レプリカの合算スロットリングを避けるため、インスタンス間で協調させます
- **バックオフを監視**: バックオフ発生時のログやメトリクスを出して、持続的なスロットリングを検出します
- **`maxTPM` は初期より上に**: クォータ未満のときにプロービングできる余白を残します

---

## OpenTelemetry GenAI オブザーバビリティ

tracer を設定すると、Goa-AI は planner が実行するエージェント操作について、ベンダー非依存の OpenTelemetry GenAI semantic convention に沿った span を出力します。

- モデル呼び出しは `gen_ai.operation.name="chat"` を使い、`chat {model}` のような span 名になります
- ツール完了は `gen_ai.operation.name="execute_tool"` を使い、`execute_tool {tool_name}` のような span 名になります
- agent-as-tool の委譲は `gen_ai.operation.name="invoke_agent"` を使い、`invoke_agent {agent_name}` のような span 名になります

これらの span には、利用可能な場合に `gen_ai.conversation.id`、`gen_ai.agent.id`、`gen_ai.agent.name`、`gen_ai.request.model`、`gen_ai.response.model`、トークン使用量、終了理由、ツール識別子、streaming の time-to-first-chunk が含まれます。runtime は識別子、件数、時間、エラーを既定で記録します。prompt 本文、chat 履歴、ツール引数、ツール結果を添付するかどうかはアプリケーション側のポリシーであり、自動では添付されません。

これにより、Goa-AI の open source telemetry は OpenTelemetry backend 間で移植可能なまま、production システムは conversation のグルーピング、モデルごとの latency と token 使用量の比較、multi-agent tool chain の調査に必要な構造を得られます。

---

## Mongo Store を使った Prompt Override

本番での Prompt 管理は通常、次の組み合わせで行います。

- `runtime.PromptRegistry` に登録したベースライン prompt spec
- `features/prompt/mongo` で Mongo に永続化したスコープ付き override レコード

### 配線

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

promptClient, err := clientmongo.New(clientmongo.Options{
    Client:     mongoClient,
    Database:   "aura",
    Collection: "prompt_overrides", // 任意（既定は prompt_overrides）
})
if err != nil {
    panic(err)
}

promptStore, err := promptmongo.NewStore(promptClient)
if err != nil {
    panic(err)
}

rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithPromptStore(promptStore),
)
```

### Override 解決順序とロールアウト

override の優先順位は決定的です。

1. `session` スコープ
2. `facility` スコープ
3. `org` スコープ
4. グローバルスコープ
5. ベースライン spec（override が存在しない場合）

推奨ロールアウト手順:

- まず新しいベースライン prompt spec を登録する
- override は広いスコープ（`org`）から開始し、`facility`/`session` へ絞ってカナリア展開する
- `prompt_rendered` イベントと `model.Request.PromptRefs` で実効バージョンを追跡する
- 同一スコープにより新しい override を書く（またはスコープ固有 override を削除する）ことでロールバックする

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
| run 中にデプロイ | 実行中 run が失敗 | 既存 workflow は保持された互換 worker を使い続け、新規 workflow は昇格済み version を使う |

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
    temporalclient "go.temporal.io/sdk/client"
    "go.temporal.io/sdk/worker"
    "go.temporal.io/sdk/workflow"
)

const releaseBuildID = "git-sha-or-image-digest"

temporalEng, err := runtimeTemporal.NewWorker(runtimeTemporal.Options{
    ClientOptions: &temporalclient.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
        Options: worker.Options{
            DeploymentOptions: worker.DeploymentOptions{
                UseVersioning: true,
                Version: worker.WorkerDeploymentVersion{
                    DeploymentName: "assistant",
                    BuildID:        releaseBuildID,
                },
                DefaultVersioningBehavior: workflow.VersioningBehaviorPinned,
            },
        },
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

`ClientOptions.DataConverter` を設定しないでください。Temporal engine は custom converter を拒否し、すべての worker と client が同じ永続 contract を使うよう Goa-AI の bounded converter を自ら install します。

### Temporal payload contract

workflow または activity の各 argument list には、encode 後の aggregate limit `engine.MaxPayloadBytes`（1 MiB）があります。converter は encode 前に、depth が 64 level を超える value graph または visited value が 100,000 を超える graph も拒否します。oversized data を truncate しません。

`planner.ToolResult` は in-process value で、Temporal boundary を越えられません。workflow は代わりに正規 JSON byte を持つ `api.ToolEvent` を運びます。有効な tool result が 1 MiB を超え得る場合、tool executor は application-owned storage に保存し、型付き reference を返さなければなりません。runtime が黙って result を置き換えることはありません。

### Timing と Activity Retry

DSL は semantic run budget、つまり run 全体にどれだけ時間を使えるか、planner attempt と tool attempt がどれだけ実行できるかを表します。

```go
Agent("operator", "Production operations agent", func() {
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20), MaxRecoveryTurns(3))
        Timing(func() {
            Budget("5m")
            Plan("45s")
            Tools("90s")
        })
    })
})
```

Temporal adapter は queue-wait や liveness timeout などの workflow-engine mechanics を所有します。DSL ではなく engine 側で設定してください:

```go
temporalEng, err := runtimeTemporal.NewWorker(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: runtimeTemporal.ActivityDefaults{
        Planner: runtimeTemporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: runtimeTemporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
```

生成される plan/resume、execute-tool、hook-publishing activity の retry policy は、retry が論理的に idempotent な場合にだけ安全です。hook event は安定した event key を持ち、tool execution は不可逆な副作用を繰り返すのではなく、`ToolCallID` 単位で canonical result を永続化または replay するべきです。

### ワーカーのセットアップ

ワーカーは task queue をポーリングし、workflow/activity を実行します。登録された各エージェントに対してワーカーは自動的に開始されるため、ほとんどのケースで手動設定は不要です。

### 透過的なロールアウト

Temporal の durability と透過的な release は別の保証です。Temporal は workflow history を保存します。deployment は、その history が使われている間、互換性のある worker code と必要な downstream service を利用可能に保たなければなりません。

上の設定は worker を [Temporal Worker Deployment Versioning](https://docs.temporal.io/production-deployment/worker-deployments/worker-versioning) に参加させます。`releaseBuildID` は 1 つの immutable binary または container image を識別しなければなりません。異なる workflow code に build ID を再利用したり、`latest` のような mutable tag を使ったりしないでください。

worker version は次の順序で release します。

1. 保持中の全 worker version と並べて新 worker を起動する。
2. 新 process が readiness を通過し、Temporal への registration に成功するまで待つ。
3. 新しい Worker Deployment Version を current にする。Temporal は新規 workflow をそこへ割り当て、既存 workflow は開始時の version に pinned されたままにする。
4. worker process が API も提供する場合、通常の API traffic は current ready build だけへ route する。古い pod は Temporal 用に生かすが、新規 API request は送らない。API deployment を分ける設計も有効だが必須ではない。
5. Temporal が drained と報告した後だけ古い version を削除する。pod が停止したことは、その code を必要とする workflow がない証明にはならない。

受理された各 user input は top-level Goa-AI workflow を 1 つ開始します。Goa-AI は human または external input を要求すると workflow を終了し、completed run ID の下に非公開 checkpoint を保存します。受理された answer は current worker version で新しい workflow を開始します。そのため透過的 release では、新 version が保存済み checkpoint version、生成 result codec、必要な tool 名との互換性を保つ必要があります。Worker Versioning は互換性のない保存値を変換できません。

application の残りの部分も、同じ overlap 中に availability を保つ必要があります。

- downstream Service には常に 1 つ以上の ready endpoint が必要です。readiness-gated rolling replacement を使います。`Recreate` rollout は gap を作ります。
- downstream API は retained worker と current worker の両方からの call を受け付けなければなりません。
- database migration は古い version が drained になるまで両 release を支える必要があります。古い code が schema を使わなくなる前に置き換えず、expand-then-contract sequence を使います。
- 1 process が API traffic と Temporal work の両方を提供する場合、traffic selector は Temporal が retained worker へ到達する仕組みとは別に current build を識別しなければなりません。

#### registry-backed tool provider

Goa-AI tool provider も readiness-gated rolling replacement に対応します。同じ生成 schema と admission revision を持つ provider replica は同じ registry admission に参加し、overlap できます。どちらかが変わる場合、old admission が authority を持つ間、replacement provider は生存したまま registration を retry します。old provider は新しい call の claim を止め、受理済み work を確定し、lease を release してから new admission が実行可能になります。そのため、異なる 2 つの tool contract が同じ toolset を同時に提供することはありません。

active toolset に healthy provider がないとき、有効な `CallTool` request は既存 execution deadline 内で待ちます。request publication は、call を append する同じ Redis operation で選択 provider を検証します。health check 後に old provider が draining を始めた場合、未 publish の call は deadline を延長せず replacement を選び直します。provider assignment が永久に固定されるのは publication 成功時だけです。caller cancellation が終了させるのはその transport attempt だけで、完全に同じ retry は未 publish call を続行できます。deadline expiry は通常の durable `call_not_admitted` decision を記録します。

registry が所有するのは provider health であり deployment intent ではありません。rollout handoff と別の provider outage を区別できないため、同じ bounded wait が両方に適用されます。pod 名や version string を調べず、model に retry を求めません。この contract により、互換性のない provider generation の overlap を許さず、consumer は provider change に 1 つの rolling release policy を使えます。

release 中も registry client、server、provider は互換 wire protocol を使う必要があります。envelope を互換性なく変更する必要がある場合、まず両形式を受理する code を release してください。registry は rolling overlap 中に protocol version を negotiate しません。

Worker Deployment Versioning は workflow replay を保護します。dependency が利用不能、API が非互換、checkpoint が非互換な場合から workflow を保護するものではありません。

#### 生成 contract の変更

生成 agent、completion package、永続 runtime payload を互換性なく変更する場合、上記の mixed-version 手順を適用しません。全 agent と completion を再生成し、影響を受ける work を drain または停止して、runtime、worker、caller を 1 回の coordinated release で deploy します。Goa-AI は生成 runtime contract の dual-read mode を提供しません。

runtime が受理するのは、正確な `goa-ai.run-suspension.v4` schema だけです。question、clarification、external tool を待つ planner は provider の `ModelToolCallID` を保持し、workflow は停止データを保存する前に別の runtime `ToolCallID` を割り当てます。ほかの suspension schema は resume しません。将来 schema を変更する場合、coordinated release の前に互換性のない保存済み work を調査して廃止します。dual reader を追加したり field を推測したりしてはいけません。

#### release の検証

次の check がすべて通るまで release を透過的とみなさないでください。

- promotion 前に開始した workflow が元の build で完了する。
- 新しい workflow が current build で開始して完了する。
- promotion 前に作られた external-input request が、promotion 後に新しい workflow として正常に続行する。
- API traffic が current ready build だけに到達する。
- Temporal が drained と報告するまで old worker が ready のままである。
- replacement 中、各 downstream Service に ready endpoint が残る。
- observation window に新しい workflow failure、container restart、readiness gap がない。

1 turn につき 1 workflow と cross-workflow event identity の contract は [External Input and Workflow Continuations](../runtime/#external-input-and-workflow-continuations) を参照してください。

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

セッションに属するストリーミング可視イベントは、単一のストリーム `session/<session_id>` に追記されます。各イベントは `run_id` と `session_id` を持ち、`child_run_linked` で親ツールコールと子 run をリンクします。UI はアクティブ run の `run_stream_end` を観測したら SSE/WebSocket を終了できます（タイマー不要）。

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
| `ChildRunLinked` | 親ツール呼び出しから子エージェント run へのリンク |
| `RunStreamEnd` | run の明示的な stream boundary marker (その run について stream-visible event がこれ以上出ないことを示す) |

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
case stream.ChildRunLinked:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
case stream.RunStreamEnd:
    // run has no more stream-visible events
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
    case stream.ChildRunLinked:
        fmt.Fprintf(s.w, "data: child_run_linked: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    case stream.RunStreamEnd:
        fmt.Fprintf(s.w, "data: run_stream_end: %s\n\n", e.RunID())
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### セッションストリームの購読（Pulse）

プロダクションでは UI はセッションストリーム（`session/<session_id>`）を購読し、`run_id` でフィルタして描画します。アクティブ run の `run_stream_end` を観測したら SSE/WebSocket を終了します。

### グローバルな Stream Sink

すべての run をグローバル sink（たとえば Pulse）に流したい場合、runtime に stream sink を設定します。

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

runtime はデフォルトの `stream.Subscriber` をインストールします。これは:
- hook イベントを `stream.Event` にマップし
- **デフォルト `StreamProfile`**を使用して、アシスタント返信、プランナー思考、ツール start/update/end、await、usage、workflow、`child_run_linked`、および終端マーカー `run_stream_end` を出力します

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
    Thoughts:   false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    ChildRuns:  true,   // Include parent tool → child run links
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
- そのバス上で **session-owned stream** (`session/<session_id>`) を使う

Goa-AI は次を提供します:
- `features/stream/pulse` – Pulse backed な `stream.Sink`
- `runtime/agent/stream/bridge` – hook bus を任意の sink に配線するためのヘルパ

典型的な配線は次の通りです。

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Optional: override stream naming (defaults to `session/<SessionID>`).
    StreamID: func(ev stream.Event) (string, error) {
        if ev.SessionID() == "" {
            return "", errors.New("missing session id")
        }
        return fmt.Sprintf("session/%s", ev.SessionID()), nil
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
    for _, tr := range in.ToolOutputs {
        if tr.Name == "search_documents" {
            result, err := specs.UnmarshalSearchDocumentsResult(tr.Result)
            if err != nil {
                return nil, err
            }
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
    for _, tr := range in.ToolOutputs {
        if tr.Name == "todos.update_todos" {
            snap, err := specs.UnmarshalUpdateTodosResult(tr.Result)
            if err != nil {
                return nil, err
            }

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




