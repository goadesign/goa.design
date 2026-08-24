---
title: 記憶とセッション
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

このガイドでは、Goa-AI のトランスクリプトモデル、メモリの永続化、複数ターンの会話や長時間実行するワークフローのモデル化方法について説明します。

## なぜトランスクリプトが重要なのか

Goa-AI は、**トランスクリプト**を 1 つの run における唯一の真実のソースとして扱います。トランスクリプトとは、メッセージとツールの相互作用を順序付きで記録したもので、次の目的を満たすのに十分な情報を持ちます。

- すべてのモデル呼び出しについて、プロバイダー (Bedrock/OpenAI) のペイロードを再構築する
- プランナーを駆動する (リトライやツール修復を含む)
- 正確な履歴にもとづいて UI を構築する

トランスクリプトが権威 (authoritative) であるため、次のようなものを **手作業で管理する必要はありません**。

- 過去のツール呼び出しとツール結果を別々に保持するリスト
- アドホックな「会話状態」構造
- 以前の user/assistant メッセージをターンごとに複製したもの

あなたは **トランスクリプトだけを永続化し、渡す** だけでよく、Goa-AI とプロバイダーアダプターが、そこから必要なすべてを再構築します。

---

## メッセージとパーツ

モデル境界では、Goa-AI はトランスクリプトを `model.Message` 値で表現します。各メッセージはロール (`user`, `assistant`) と、順序付きの **パーツ (parts)** リストを持ちます。

| パート種別 | 説明 |
|-----------|-------------|
| `ThinkingPart` | プロバイダーの推論コンテンツ (プレーンテキスト + 署名、またはマスクされたバイト列)。ユーザー向けではなく、監査/リプレイや任意の「thinking」UI のために使われます。 |
| `TextPart` | ユーザーに表示するテキスト (質問、回答、説明など)。 |
| `ImagePart` | Multimodal image content (bytes or URL/metadata) for providers that support images. |
| `DocumentPart` | Document content (text/bytes/URI/chunks) attached to messages for providers that support document parts. |
| `CitationsPart` | Structured citations metadata produced by providers (for UI display / audit). |
| `ToolUsePart` | アシスタントが開始するツール呼び出し。`ID`、`Name` (正規のツール ID)、`Input` (JSON ペイロード) を持ちます。 |
| `ToolResultPart` | 以前の tool_use に紐づく user/tool の結果。`ToolUseID` と `Content` (JSON ペイロード) を持ちます。 |
| `CacheCheckpointPart` | Marker for prompt cache boundaries (provider-dependent, not user-facing). |

**順序は神聖です (Order is sacred):**

- ツールを使うアシスタントメッセージは、通常 `ThinkingPart` の後に 1 つ以上の `ToolUsePart`、そして任意で `TextPart` が続きます。
- user/tool の結果メッセージは、通常、以前の tool_use ID を参照する 1 つ以上の `ToolResultPart` と、任意の user コンテンツ (`TextPart`, `ImagePart`, `DocumentPart`) を含みます。

Goa-AI のプロバイダーアダプター (例: Bedrock Converse) は、これらのパーツを **並べ替えずに** プロバイダー固有のブロックへ再エンコードします。

---

## トランスクリプトのコントラクト

Goa-AI の高レベルなトランスクリプトのコントラクトは次のとおりです。

1. アプリケーション (またはランタイム) は、run のすべてのイベントを順に永続化します: アシスタントの思考、テキスト、tool_use (ID + 引数)、user の tool_result (tool_use_id + content)、後続のアシスタントメッセージ、など。
2. 各モデル呼び出しの前に、呼び出し元はその run の **トランスクリプト全体** を `[]*model.Message` として渡します。最後の要素は新しい差分 (user テキストまたは tool_result) です。
3. Goa-AI はそのトランスクリプトを、同じ順序でプロバイダーのチャット形式へ再エンコードします。

**「ツール履歴」専用の API は存在しません**。履歴はトランスクリプトそのものです。

model adapter は call をまたいで state を持ちません。provider-ready transcript 全体を各 `model.Request` に含める必要があり、run identifier を渡しても adapter が以前の message を読み込むことはありません。公開 model client は、planner code が観測する前に request と complete response を検証します。

### 履歴の圧縮

agent の `History(...)` policy は、古い turn を要約しながら bounded な正確な末尾を保持できます。`CompressAt...` value は要約を始める時点を、`KeepMax...` value は変更せず保持する最新の完全な turn を決めます。runtime は turn を途中で切りません。

compression には設定済みの `HistoryModel` が必要です。token-based trigger と retention には、その model client による正確な token count も必要です。Bedrock Runtime は structured-output request を count できず、現在の一部 Claude model は AWS の別の Mantle endpoint を必要とします。完全な contract は [Runtime → History Policies](../runtime/#history-policies) と [DSL Reference → History](../dsl-reference/#history) を参照してください。

### プランナーと UI がどのように簡素化されるか

- **プランナー**: `planner.PlanInput.Messages` と `planner.PlanResumeInput.Messages` で現在のトランスクリプトを受け取ります。追加の状態を持ち回らず、メッセージだけにもとづいて判断できます。
- **UI**: チャット履歴、ツールリボン、エージェントカードなどを、モデルのために永続化した同じトランスクリプトから描画できます。別の「ツールログ」構造は不要です。
- **プロバイダーアダプター**: どのツールが呼ばれ、どの結果がどこに属するかを推測しません。トランスクリプトのパーツをプロバイダーのブロックに写像するだけです。

---

## run log からのトランスクリプト再生

runtime は provider-ready transcript への追加分を、順序付き run-log event として保存します。transcript event は `model.Message` slice を JSON encode したものです。replay は run-log 順にそれらの slice を append します。part の並べ替え、欠けた message の補完、変更可能な transcript object の公開は行いません。

### 順序要件

保存済み message は、provider が要求する part 順を保ちます。

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

provider adapter は同じ順序で part を provider-specific block へ再 encode します。

### 公開 replay API

`runtime/agent/transcript` package は次の run-log operation を公開します。

- `EncodeRunLogDelta(messages)` は、run の 1 地点で追加された `[]*model.Message` を受け取り、JSON payload を `rawjson.Message` として返します。encode failure は error です。
- `DecodeRunLogDelta(payload)` は transcript run-log event の JSON payload を受け取り、保存されていた `[]*model.Message` を返します。不正 JSON は error です。
- `ReplayRunLogEvents(events)` は、すでに順序付けされた `*runlog.Event` slice を受け取ります。transcript seed／append record 以外は skip し、decode した message slice を input 順に append して、message、transcript event が 1 つでもあったかを示す boolean、error を返します。
- `BuildMessagesFromRunLog(ctx, store, runID)` は 1 run の `runlog.Store` を paging し、完全に順序付けされた `[]*model.Message` transcript を返します。store または run ID がない、list／decode が失敗する、transcript event がない場合は error です。

多くの application は runtime に transcript event を書かせ、provider-ready history が必要なときに `BuildMessagesFromRunLog` を使います。

```go
messages, err := transcript.BuildMessagesFromRunLog(ctx, runEventStore, runID)
if err != nil {
    return err
}
```

message を構築または replay した後に validator を使います。

```go
if err := transcript.ValidatePlannerTranscript(messages); err != nil {
    return err
}
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    return err
}
```

`ValidatePlannerTranscript(messages)` は `[]*model.Message` を受け取り、assistant tool-call group の直後に user message が 1 つあり、そこに全 tool-call ID と正確に対応する result が 1 つずつ含まれる場合だけ `nil` を返します。`ValidateBedrock(messages, thinkingEnabled)` は Bedrock 固有の thinking rule を追加検査します。thinking が無効なら追加検査はしません。有効なら、tool call を含む各 assistant message が `ThinkingPart` で始まらない限り error です。どちらの validator も message を変更しません。

### これが重要な理由

- **決定論的リプレイ**: 保存されたイベントから、デバッグ/監査/失敗ターンの再実行のために、まったく同じトランスクリプトを再構築できます。
- **プロバイダー非依存の保存形式**: run-log payload は provider SDK に依存せず `model.Message` JSON を保存します。
- **プランナーの簡素化**: プランナーはプロバイダー制約を管理せずに、正しく並んだメッセージを受け取れます。
- **検証**: 順序違反がプロバイダーに到達して不可解なエラーになる前に検出できます。

---

## セッション、ラン、トランスクリプト

Goa-AI は会話状態を 3 つの層に分けて扱います。

- **セッション** (`SessionID`) – 時間をまたぐ会話やワークフロー:
  - 例: チャットセッション、修復チケット、調査タスク
  - 同じセッションに複数のランが属することがあります

- **ラン** (`RunID`) – エージェントの 1 回の実行:
  - エージェントクライアント (`Run`/`Start`) を呼ぶたびにランが作成されます
  - ランにはステータス、フェーズ、ラベルがあります

- **トランスクリプト** – ランにおけるメッセージとツール相互作用の完全な履歴:
  - `[]*model.Message` で表現されます
  - `runlog.Store` の transcript seed／append event として永続化されます

### 実運用での SessionID と TurnID

エージェントを呼び出すときは次のようになります。

```go
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "chat-session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: 会話に属するすべてのランをグループ化します。ランログやダッシュボードの検索キーとしてよく使われます。
- `TurnID`: 1 回の user → assistant 相互作用に関するイベントをグループ化します。必須ではありませんが、UI やログに便利です。

セッションは明示的に終了します（例: 会話の削除）。セッションが終了したら、その下で新しい run を開始してはいけません。

---

## メモリストアとランログ

Goa-AI の feature モジュールは、補完関係にあるストアを提供します。

### メモリストア (`memory.Store`)

ランごとのイベント履歴を永続化します。

- user/assistant メッセージ
- ツール呼び出しと結果
- プランナーのメモと thinking

```go
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}
```

主要な型:

- **`memory.Snapshot`** – ランの保存履歴の不変ビュー (`AgentID`, `RunID`, `Events []memory.Event`)
- **`memory.Event`** – 単一の永続化エントリ。`Type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`, `planner_note`, `thinking`)、`Timestamp`、`Data`、`Labels` を持ちます

### ランログ (`runlog.Store`)

run の **正規で append-only な event log** を永続化します。runtime は run の実行中に hook event（start、phase change、tool、message、completion）を append し、caller は UI や診断のため cursor pagination で一覧できます。

Temporal planner activity では、`PlanActivityInput.ToolOutputs` が call run ID、result run ID、tool-call ID を含む reference を運びます。planner activity は planner を呼ぶ前に、その reference を使って tool input、result body、server data、planner-visible metadata を run log から読み込みます。reference により、planner activity boundary をまたいで result body 全体を繰り返し渡さずに済みます。ただし、copy がほかに存在しないという意味ではありません。runtime の非公開 suspension checkpoint は、停止中の workflow を再開できるよう transcript と tool-output state を保持します。

tool call には異なる 2 つの identifier があります。`ModelToolCallID` は provider transcript の ID で、model-generated call と model-visible result を対応付けます。`ToolCallID` は runtime execution ID で、activity、retry、run-log record、stream event に使います。停止された model-generated call は両方を保存します。一方を他方の代わりに使ったり、run の順番から導出したりしないでください。

```go
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

`runlog.Page` には次が含まれます。

- `Events`（古い順）
- `NextCursor`（空の場合はこれ以上イベントがない）

---

## ストアの配線

MongoDB ベースの実装では次のように配線します。

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    memorymongoclient "goa.design/goa-ai/features/memory/mongo/clients/mongo"
    runlogmongo "goa.design/goa-ai/features/runlog/mongo"
    runlogmongoclient "goa.design/goa-ai/features/runlog/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memClient, err := memorymongoclient.New(memorymongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

memStore, err := memorymongo.NewStore(memClient)
if err != nil {
    log.Fatal(err)
}

runlogClient, err := runlogmongoclient.New(runlogmongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

runEventStore, err := runlogmongo.NewStore(runlogClient)
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunEventStore(runEventStore),
)
```

設定すると次のようになります。

- デフォルトのサブスクライバーが、メモリとランイベントを自動的に永続化します。
- `runlog.Store` からいつでも provider-ready transcript を再構築でき、モデル再呼び出し、UI 表示、オフライン分析に利用できます。

---

## カスタムストア

カスタムバックエンド向けに `memory.Store` と `runlog.Store` インターフェイスを実装できます。

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run log store
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

---

## よくあるパターン

### チャットセッション

- チャットセッションごとに 1 つの `SessionID` を使います
- user のターンまたは「タスク」ごとに新しいランを開始します
- ランごとにトランスクリプトを永続化し、セッションメタデータで会話を繋ぎます

### 長時間実行するワークフロー

- 論理的なワークフローごとに 1 つのランを使います (一時停止/再開の可能性あり)
- `SessionID` を使って関連するワークフローをグループ化します (例: チケットやインシデントごと)
- ステータス追跡には `run.Phase` と `RunCompleted` イベントを利用します

### 検索とダッシュボード

- `runlog.Store` を `RunID` + cursor でページングして audit/debug UI を構築します
- `runlog.Store` から選択したランのトランスクリプトをオンデマンドで replay します

---

## ベストプラクティス

- **ツール結果を必ず相関付ける**: ツール実装とプランナーが tool_use ID を保持し、ツール結果を `ToolResultPart.ToolUseID` で正しい `ToolUsePart` に紐づけるようにしてください。

- **強く記述的なスキーマを使う**: Goa の設計で、豊富な `Args` / `Return` 型、説明、例を用意すると、トランスクリプトにより明確なツールのペイロード/結果が残ります。

- **状態はランタイムに持たせる**: プランナー内で「ツール履歴」配列や「以前のメッセージ」スライスを並行して維持しないでください。`PlanInput.Messages` / `PlanResumeInput.Messages` から読み出し、新しいパーツの追加はランタイムに任せます。

- **一度保存したトランスクリプトをどこでも再利用する**: どのストアを選ぶにしても、トランスクリプトは再利用可能なインフラとして扱いましょう。同じトランスクリプトが、モデル呼び出し、チャット UI、デバッグ UI、オフライン分析を支えます。

- **よく検索するフィールドをインデックスする**: 効率的なクエリのために、セッション ID、ラン ID、ステータスなどにインデックスを張ります。

- **古いトランスクリプトをアーカイブする**: 完了したランをアーカイブして保管コストを下げます。

---

## 次のステップ

- **[プロダクション](./production.md)** - Temporal、ストリーミング UI、モデル統合を用いたデプロイ
- **[ランタイム](./runtime.md)** - plan/execute ループを理解する
- **[エージェント・コンポジション](./agent-composition.md)** - 複雑なエージェントグラフを構築する
