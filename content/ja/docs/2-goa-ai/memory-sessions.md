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
| `ToolUsePart` | アシスタントが開始するツール呼び出し。`ID`、`Name` (正規のツール ID)、`Input` (JSON ペイロード) を持ちます。 |
| `ToolResultPart` | 以前の tool_use に紐づく user/tool の結果。`ToolUseID` と `Content` (JSON ペイロード) を持ちます。 |

**順序は神聖です (Order is sacred):**

- ツールを使うアシスタントメッセージは、通常 `ThinkingPart` の後に 1 つ以上の `ToolUsePart`、そして任意で `TextPart` が続きます。
- user/tool の結果メッセージは、通常、以前の tool_use ID を参照する 1 つ以上の `ToolResultPart` と、任意の user テキストを含みます。

Goa-AI のプロバイダーアダプター (例: Bedrock Converse) は、これらのパーツを **並べ替えずに** プロバイダー固有のブロックへ再エンコードします。

---

## トランスクリプトのコントラクト

Goa-AI の高レベルなトランスクリプトのコントラクトは次のとおりです。

1. アプリケーション (またはランタイム) は、run のすべてのイベントを順に永続化します: アシスタントの思考、テキスト、tool_use (ID + 引数)、user の tool_result (tool_use_id + content)、後続のアシスタントメッセージ、など。
2. 各モデル呼び出しの前に、呼び出し元はその run の **トランスクリプト全体** を `[]*model.Message` として渡します。最後の要素は新しい差分 (user テキストまたは tool_result) です。
3. Goa-AI はそのトランスクリプトを、同じ順序でプロバイダーのチャット形式へ再エンコードします。

**「ツール履歴」専用の API は存在しません**。履歴はトランスクリプトそのものです。

### プランナーと UI がどのように簡素化されるか

- **プランナー**: `planner.PlanInput.Messages` と `planner.PlanResumeInput.Messages` で現在のトランスクリプトを受け取ります。追加の状態を持ち回らず、メッセージだけにもとづいて判断できます。
- **UI**: チャット履歴、ツールリボン、エージェントカードなどを、モデルのために永続化した同じトランスクリプトから描画できます。別の「ツールログ」構造は不要です。
- **プロバイダーアダプター**: どのツールが呼ばれ、どの結果がどこに属するかを推測しません。トランスクリプトのパーツをプロバイダーのブロックに写像するだけです。

---

## トランスクリプト台帳

**トランスクリプト台帳 (transcript ledger)** は、モデルプロバイダーが要求する厳密な形式で会話履歴を保持する、プロバイダー精度の記録です。これにより、ワークフロー状態へプロバイダー SDK の型を漏らすことなく、決定論的なリプレイとプロバイダー忠実性を実現します。

### プロバイダー忠実性

モデルプロバイダー (Bedrock、OpenAI など) は、メッセージの順序や構造に厳しい要件を持ちます。台帳はこれらの制約を強制します。

| プロバイダー要件 | 台帳の保証 |
|------------------|------------|
| アシスタントメッセージでは thinking が tool_use より前でなければならない | 台帳はパーツを thinking → text → tool_use の順で並べます |
| ツール結果は対応する tool_use の後に続かなければならない | 台帳は tool_result を ToolUseID で関連付けます |
| メッセージの交替 (assistant → user → assistant) | user 結果を追加する前に、アシスタント側をフラッシュします |

Bedrock では特に、thinking を有効にしている場合:

- tool_use を含むアシスタントメッセージは、**必ず** thinking ブロックで始まらなければなりません。
- tool_result を含む user メッセージは、tool_use を宣言したアシスタントメッセージの直後に続かなければなりません。
- ツール結果の数は、直前の tool_use の数を超えられません。

### 順序要件

台帳は、プロバイダーが要求する正規の順序でパーツを保存します。

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

この順序は **神聖** です。台帳はパーツを並べ替えず、プロバイダーアダプターも同じ順序でプロバイダー固有のブロックに再エンコードします。

### 台帳の自動メンテナンス

ランタイムはトランスクリプト台帳を自動で維持します。手動で管理する必要はありません。

1. **イベントキャプチャ**: run の進行に合わせて、ランタイムがメモリイベント (`EventThinking`, `EventAssistantMessage`, `EventToolCall`, `EventToolResult`) を順に永続化します。

2. **台帳の再構築**: `BuildMessagesFromEvents` 関数が、保存されたイベントからプロバイダー向けのメッセージを再構築します。

```go
// Reconstruct messages from persisted events
events := loadEventsFromStore(agentID, runID)
messages := transcript.BuildMessagesFromEvents(events)

// Messages are now in canonical provider order
// Ready to pass to model.Client.Complete() or Stream()
```

3. **検証**: プロバイダーへ送る前に、ランタイムはメッセージ構造を検証できます。

```go
// Validate Bedrock constraints when thinking is enabled
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    // Handle constraint violation
}
```

### 台帳 API

高度なユースケースでは、台帳を直接操作できます。台帳は次の主要なメソッドを提供します。

| メソッド | 説明 |
|--------|-------------|
| `NewLedger()` | 空の台帳を新規作成します |
| `AppendThinking(part)` | 現在のアシスタントメッセージに thinking パートを追加します |
| `AppendText(text)` | 現在のアシスタントメッセージに可視テキストを追加します |
| `DeclareToolUse(id, name, args)` | 現在のアシスタントメッセージでツール呼び出しを宣言します |
| `FlushAssistant()` | 現在のアシスタントメッセージを確定し、user 入力の準備をします |
| `AppendUserToolResults(results)` | ツール結果を user メッセージとして追加します |
| `BuildMessages()` | トランスクリプト全体を `[]*model.Message` として返します |

**使用例:**

```go
import "goa.design/goa-ai/runtime/agent/transcript"

// Create a new ledger
l := transcript.NewLedger()

// Record assistant turn
l.AppendThinking(transcript.ThinkingPart{
    Text:      "Let me search for that...",
    Signature: "provider-sig",
    Index:     0,
    Final:     true,
})
l.AppendText("I'll search the database.")
l.DeclareToolUse("tu-1", "search_db", map[string]any{"query": "status"})
l.FlushAssistant()

// Record user tool results
l.AppendUserToolResults([]transcript.ToolResultSpec{{
    ToolUseID: "tu-1",
    Content:   map[string]any{"results": []string{"item1", "item2"}},
    IsError:   false,
}})

// Build provider-ready messages
messages := l.BuildMessages()
```

**Note:** 多くのユーザーは台帳を直接操作する必要はありません。ランタイムがイベントキャプチャと再構築を通じて台帳を自動維持します。台帳 API は、カスタムプランナーやデバッグツールなどの高度なシナリオでのみ利用してください。

### これが重要な理由

- **決定論的リプレイ**: 保存されたイベントから、デバッグ/監査/失敗ターンの再実行のために、まったく同じトランスクリプトを再構築できます。
- **プロバイダー非依存の保存形式**: 台帳は JSON フレンドリーなパーツを保存し、プロバイダー SDK 依存を持ち込みません。
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
  - `memory.Store` を通じて、順序付きのメモリイベントとして永続化されます

### 実運用での SessionID と TurnID

エージェントを呼び出すときは次のようになります。

```go
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: 会話に属するすべてのランをグループ化します。ランストアやダッシュボードの検索キーとしてよく使われます。
- `TurnID`: 1 回の user → assistant 相互作用に関するイベントをグループ化します。必須ではありませんが、UI やログに便利です。

---

## メモリストアとランストア

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

### ランストア (`run.Store`)

粗粒度のランメタデータを永続化します。

- `RunID`, `AgentID`, `SessionID`, `TurnID`
- ステータス、タイムスタンプ、ラベル

```go
type Store interface {
    Upsert(ctx context.Context, record run.Record) error
    Load(ctx context.Context, runID string) (run.Record, error)
}
```

`run.Record` には次が含まれます。

- `AgentID`, `RunID`, `SessionID`, `TurnID`
- `Status` (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`)
- `StartedAt`, `UpdatedAt`
- `Labels` (tenant、priority など)

---

## ストアの配線

MongoDB ベースの実装では次のように配線します。

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    runmongo    "goa.design/goa-ai/features/run/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memStore, err := memorymongo.NewStore(memorymongo.Options{Client: mongoClient})
if err != nil {
    log.Fatal(err)
}

runStore, err := runmongo.NewStore(runmongo.Options{Client: mongoClient})
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunStore(runStore),
)
```

設定すると次のようになります。

- デフォルトのサブスクライバーが、メモリとランメタデータを自動的に永続化します。
- `memory.Store` からいつでもトランスクリプトを再構築でき、モデル再呼び出し、UI 表示、オフライン分析に利用できます。

---

## カスタムストア

カスタムバックエンド向けに `memory.Store` と `run.Store` インターフェイスを実装できます。

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run store
type Store interface {
    Upsert(ctx context.Context, record run.Record) error
    Load(ctx context.Context, runID string) (run.Record, error)
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

- `run.Store` を `SessionID`、ラベル、ステータスでクエリします
- `memory.Store` から選択したランのトランスクリプトをオンデマンドで読み込みます

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
