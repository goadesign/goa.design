---
title: 記憶とセッション
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

このガイドでは、Goa-AI のトランスクリプトモデル、メモリの永続化、複数ターンの会話や長時間実行するワークフローのモデル化方法について説明します。

## なぜトランスクリプトが重要なのか
Goa-AI は **トランスクリプト**を、モデルに見える会話の唯一の定義元として扱います。メッセージとツール操作を順序付きで並べたもので、次の処理に十分な情報を持ちます。

- 各モデル呼び出し用の provider payload を再構築する
- retry と tool repair を含めて planner を動かす
- UI に正確な履歴を提供する

トランスクリプトがモデル入力の基準になるため、次の情報を手作業で管理する必要はありません。

- 過去の tool calls と results の別リスト
- 独自の conversation state 構造
- turn ごとの過去メッセージのコピー

会話履歴には **トランスクリプトだけ**を保存して渡します。Goa-AI と provider adapter がそこから provider input を再構築します。run status、cancellation、continuation checkpoint、変更不可の run records は、後述する別の host-owned runtime store に属します。

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

## ランタイムのトランスクリプト再生

ランタイムは、正規の `model.Message` の追加分を、ランの順序付き記録に保存します。
`transcript_messages_seeded` にはラン開始前から存在したメッセージを、
`transcript_messages_appended` にはランの実行中に受理したメッセージを保存します。
初期メッセージの記録はモデル入力の復元に使われますが、新しいアシスタント出力としては配信されません。

復旧や調査で、プロバイダーに渡すメッセージ列を正確に再現する必要がある場合は、
公開されている再生関数を使います。

```go
import "goa.design/goa-ai/runtime/agent/transcript"

messages, err := transcript.BuildMessagesFromRunLog(ctx, runtimeStore, runID)
if err != nil {
    return err
}
```

`BuildMessagesFromRunLog` は `storage.Store.ListRunRecords` をページ単位で読み、
保存順に正規のトランスクリプト記録だけを再生します。記録をすでに読み込んでいる場合は、
`ReplayRunLogEvents` が同じ変換を行います。プロバイダーアダプターはパーツの順序を保持し、
`ValidatePlannerTranscript` と `ValidateBedrock` は適切な境界でトランスクリプトを検証します。

`ValidatePlannerTranscript` は、assistant の各 tool call group の直後に、すべての
tool call ID と一対一で対応する result を含む user message が一つだけあることを
要求します。thinking が有効な場合、`ValidateBedrock` は tool を呼ぶ各 assistant
message が `ThinkingPart` で始まることも要求します。どちらの validator も message
を変更しません。

これらのランタイム記録は、workflow の復旧と調査のためのものです。
チャット履歴、評価、検索、保持期間、顧客データの削除に使う、
プロダクト所有のトランスクリプトを置き換えるものではありません。

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
  - `storage.Store` の transcript seed／append record として永続化されます

### 実運用での SessionID と TurnID

エージェントを呼び出すときは次のようになります。

```go
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "chat-session-123", time.Now().UTC()); err != nil {
    panic(err)
}
rt := runtime.New(store)
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: 会話に属するすべてのランをグループ化します。ランログやダッシュボードの検索キーとしてよく使われます。
- `TurnID`: 1 回の user → assistant 相互作用に関するイベントをグループ化します。必須ではありませんが、UI やログに便利です。

セッションは明示的に終了します（例: 会話の削除）。セッションが終了したら、その下で新しい run を開始してはいけません。

---

## プロダクトメモリとランタイムストレージ

Goa-AI は、所有者が異なる二種類の永続データを分けます。

- **プロダクトメモリ** はトランスクリプトと、それから作られるアプリケーションデータです。何を保持、表示、検索、削除するかはプロダクトが決めます。
- **ランタイムストレージ** は実行と継続に必要なセッション状態、ランメタデータ、非公開チェックポイント、変更不可の記録です。

たとえば、チャットサービスは会話、評価、検索項目を自分のデータベースに保存します。ランタイムストアは `run-42` の開始、子ラン、キャンセル要求、終了結果を記録しますが、チャットのトランスクリプトデータベースにはなりません。

### メモリストア (`memory.Store`)

ユーザーとアシスタントのメッセージ、ツール呼び出しと結果、プランナーのメモと思考を保存します。これらから `model.Transcript` とプロバイダ向けメッセージを再構築します。モデルに見えるこのデータはプロダクトが所有します。

### ランタイムストア (`storage.Store`)

ホストは一つの `storage.Store` 実装を渡します。この実装だけが次のランタイム書き込みを所有します。

- セッションの範囲と active、ended、purged の状態
- ランの識別情報、親子関係、ラベル、開始判断、現在状態
- 一時停止したランを継続するための非公開 bytes
- 調査と prompt provenance に使う、順序付きで変更不可の記録

ランタイムはこの依存を必須とします。

```go
store := newRuntimeStore()
rt := runtime.New(store, runtime.WithEngine(eng))
```

単一プロセスでは `store` はローカル DB adapter でも構いません。分散構成では一つのサービスが DB を所有して型付きメソッドを公開し、worker はそのサービスを呼ぶことで `storage.Store` を実装します。異なるサービスが同じ collection を直接書きません。

---

## ライフサイクル変更と記録をまとめて保存する

各メソッドは状態と、それを示す記録を一つの操作で保存します。

- `StartRootRun` はルートランのメタデータと最初の記録を保存します。
- `StartChildRun` は親リンク、子のメタデータ、最初の記録を保存します。
- `StartOneShotRun` はセッションなしランと最初の記録を保存します。
- `RecordRunCancellation` は最初のキャンセル理由と記録を保存します。
- `RecordRunSuspension` は非公開チェックポイント、一時停止状態、記録を保存します。
- `RecordRunTerminal` は最終状態と記録を保存します。

これにより、終了記録のない完了状態や、状態が active のまま checkpoint だけ保存されることはありません。通常の記録は `AppendRunRecord` で追加し、`ListRunRecords` と `ListSessionRunRecords` で読みます。cursor は store が返した値を変更せず次のページ取得に使います。

### 完全一致の再試行

workflow activity は複数回実行されることがあります。完全に同じ再試行は成功し、元の記録 ID を返します。identity、時刻、labels、event key と payload、checkpoint、status、cancellation reason がすべて同じ必要があります。

開始、キャンセル、一時停止、終了の各変更について、store は最初に保存した
正確な record も記憶します。status と他の lifecycle field が同じでも、別の
record を使って同じ変更を繰り返すと conflict になります。

最初の書き込みで確定した値を変えると conflict になります。store は新旧を推測せず、最初の値を上書きしません。最初の cancellation reason も変更不可です。

### 開始順序

ルート workflow は engine が受理した後に初めて store へ書きます。受理前の `pending` record はありません。最初の durable activity が `StartRootRun` を呼びます。session が active なら running を記録して続行し、受理後に session が ended なら canceled を記録して planner や tool の前に停止します。

子 workflow は `StartChildRun` を使い、親リンクと開始を同時に見せます。session なしの処理は `StartOneShotRun` を使い、通常の metadata と records を持ちますが session を作成しません。開始結果は現在状態ではなく最初の開始判断を返します。

---

## セッションのライフサイクルと削除

session 管理は host application の責任であり、agent worker の責任ではありません。host は sessionful work の前に作成し、新しい work を止めるときに終了し、すべての run が final になってから完全削除します。

- **End** は新しい planner/tool work を拒否し、進行中 run の最終記録は許可します。
- **Purge** は全 run 終了後に session、runs、checkpoints、records を削除します。削除した session ID は再利用できません。

`runtime/agent/storage/inmem` は例とテスト向けに `CreateSession`、`EndSession`、`PurgeSession` を公開します。プロダクションでは runtime DB を所有するサービスが実装します。prompt version は `prompt_rendered` と親子リンクの records から導出し、別の prompt ref や child ID リストは持ちません。

---

## 分割ストアからの移行

`session.Store`、`runlog.Store`、`runtime.WithSessionStore`、`runtime.WithRunEventStore`、runtime の `CreateSession`、`EndSession`、`PurgeSession`、`features/session/mongo`、`features/runlog/mongo` は削除されます。

一つの `runtime/agent/storage.Store` を実装し、`runtime.New` の第一引数に渡します。session 管理は runtime data を所有する host service に移します。別サービスの worker は typed API で owner を呼び、DB adapter を import しません。

新 runtime が書き込む前に、既存データが integrated store contract を満たして
いなければなりません。run metadata、checkpoint、record は上記 lifecycle
operation を支え、旧 split-store writer と新 writer は重ならないようにします。
host application は自身の database と environment に合う conversion と recovery
の手順を選び、owner と全 worker をまとめて deploy します。

## よくあるパターン

### チャットセッション

- チャットセッションごとに 1 つの `SessionID` を使います
- user のターンまたは「タスク」ごとに新しいランを開始します
- プロダクトの transcript は chat service に保存し、run の状態、継続、調査には runtime record を使います

### 長時間実行するワークフロー

- engine が受理した workflow ごとに一つの run を使います
- run が外部入力を求めると、その workflow は終了します。回答は保存済み checkpoint を使い、同じ session 内で新しい run を開始します
- `SessionID` を使って関連するワークフローをグループ化します (例: チケットやインシデントごと)
- ステータス追跡には `run.Phase` と `RunCompleted` イベントを利用します

### 検索とダッシュボード

- audit/debug UI では `storage.Store` を `RunID` でページングする
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
