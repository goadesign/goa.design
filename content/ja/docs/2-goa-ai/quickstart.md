---
title: "クイックスタート"
linkTitle: "クイックスタート"
weight: 1
description: "10 分で動く AI エージェントを作ります。スタブから始め、ストリーミングとバリデーションを追加し、最後に実際の LLM へ接続します。"
llm_optimized: true
aliases:
---

このガイドでは、空のモジュールから生成済みで実行可能な Goa-AI エージェントを作ります。
生成される例はインメモリエンジンを使うため、最初の実行に Temporal、MongoDB、Redis、モデル API キーは不要です。

作るもの:

1. 1 つのエージェント、1 つの型付きツール、1 つの型付き直接 completion を持つ Goa デザイン。
2. 生成されたエージェント、ツールセット、completion、ランタイム配線コード。
3. モデル連携プランナーへ置き換えられるスタブプランナー付きの実行可能なサンプル scaffold。
4. 明示的なセッション、生成ツール executor、ストリーミング、モデル登録という最初の本番向けフック。

---

## 1. モジュールを作成する

```bash
go install goa.design/goa/v3/cmd/goa@latest

mkdir quickstart && cd quickstart
go mod init example.com/quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
mkdir design
```

Goa-AI は現在、モダンな Go を対象にしています。`goa.design/goa-ai` モジュールが宣言している Go バージョン、またはそれ以降を使ってください。

---

## 2. エージェントを定義する

`design/design.go` を作成します:

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	. "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var AskPayload = Type("AskPayload", func() {
	Attribute("question", String, "User question to answer")
	Example(map[string]any{"question": "What is the capital of Japan?"})
	Required("question")
})

var Answer = Type("Answer", func() {
	Attribute("text", String, "Answer text")
	Example(map[string]any{"text": "Tokyo is the capital of Japan."})
	Required("text")
})

var TaskDraft = Type("TaskDraft", func() {
	Attribute("name", String, "Task name")
	Attribute("goal", String, "Outcome-style goal")
	Required("name", "goal")
})

var _ = Service("orchestrator", func() {
	Completion("draft_task", "Produce a task draft directly", func() {
		Return(TaskDraft)
	})

	Agent("chat", "Friendly Q&A assistant", func() {
		Use("helpers", func() {
			Tool("answer", "Answer a simple question", func() {
				Args(AskPayload)
				Return(Answer)
			})
		})
		RunPolicy(func() {
			DefaultCaps(MaxToolCalls(2), MaxRecoveryTurns(1))
			TimeBudget("15s")
		})
	})
})
```

これが真実の情報源です。ツールと completion は通常の Goa 型、説明、例、バリデーションを再利用します。モデルに見せるスキーマ、型付き codec、ランタイム契約はこのデザインから生成されます。

---

## 3. コードとサンプルを生成する

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
go run ./cmd/orchestrator
```

期待される出力の形:

```text
RunID: orchestrator-chat-...
Assistant: Tool helpers.answer returned {"text":"Tokyo is the capital of Japan."}
Completion draft_task: ...
Completion stream draft_task: ...
```

デザインに payload example があり、さらに result example があるか result 自体がない場合、scaffold planner はそのツールを実演します。利用可能な example を持つツールがなければ、代わりに greeting を返します。

`goa gen` は生成契約と `AGENTS_QUICKSTART.md`（`DisableAgentDocs()` を設定した場合を除く）を常に更新します。`goa example` は、まだ存在しないアプリケーション所有ファイルだけを作成します:

- `gen/`: 生成コード。このディレクトリを手で編集しないでください。
- `cmd/orchestrator/main.go`: 実行可能なサンプルのエントリポイント（初回のみ作成）。
- `internal/agents/bootstrap/bootstrap.go`: ランタイム構築とエージェント登録（初回のみ作成）。
- `internal/agents/chat/planner/planner.go`: 置き換え用のスタブプランナー（初回のみ作成）。
- `internal/agents/chat/toolsets/helpers/execute.go`: example executor（初回のみ作成）。
- `gen/orchestrator/completions/`: 型付き直接 completion の helper。
- `AGENTS_QUICKSTART.md`: module root に再生成される実装ガイド。

初回のみ作成される各ファイルには、その後の編集をアプリケーションが所有することが明記されます。`goa example` を再実行しても上書きされません。scaffold は手作業で更新するか、新しい stub が必要な場合に意図してファイルを削除してから再実行してください。

---

## 4. ランタイムループを理解する

**plan/execute ループ:**

1. `PlanStart` が最初のユーザーメッセージを受け取ります。
2. プランナーは `FinalResponse`、ツール呼び出し、または await request を返します。
3. ランタイムは生成 spec と登録済み executor を使い、許可されたツール呼び出しを検証して実行します。
4. `PlanResume` がプランナーから見えるツール出力を受け取ります。
5. プランナーが最終応答、終端ツール結果を返すか、ランタイムが上限/時間予算を強制するまでループします。

上限や deadline によって finalization が強制された場合でも、プランナーは
terminal bookkeeping ツールを返して run を閉じることができます。この経路では、
ランタイムは `TerminalRun()` ツールだけを実行します（`TerminalRun()` は
bookkeeping を暗黙に含みます）。それらが成功してから run を閉じたものとして扱います。

生成された例はスタブプランナーから始まるため、モデルを接続する前にこの流れを確認できます。ツールに payload example がある場合、`PlanStart` は `planner.NewToolRequest(gentool.<Tool>Tool(), args)` で呼び出しを構築します。`PlanResume` は `ToolOutput.Failure` を確認し、成功時の正規ツール JSON を最終 assistant message に整形します。result のないツールは空の result で成功します。実際のプランナーも同じ契約に従い、意味上の判断をモデルクライアントへ委譲します。

---

## 5. コードからエージェントを呼び出す

生成されたエージェントパッケージは型付きクライアントを公開します。セッション付き run には明示的なセッションが必要です。one-shot run は意図的にセッションレスです。

```go
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
	log.Fatal(err)
}

rt, cleanup, err := bootstrap.New(ctx, store)
if err != nil {
	log.Fatal(err)
}
defer cleanup()

client := chat.NewClient(rt)
out, err := client.Run(ctx, "session-1", []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Hello"}},
}})
if err != nil {
	log.Fatal(err)
}
fmt.Println(out.RunID)

out, err = client.OneShotRun(ctx, []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Summarize this document"}},
}})
```

会話型/セッション付きの作業には `Run` または `Start` を使います。`RunID` で観測したいがセッションには属させたくないリクエスト/レスポンス型のジョブには、`OneShotRun` または `StartOneShot` を使います。


生成されたローカル scaffold は `storage.Store` を受け取り、サンプルコマンドでは `runtime/agent/storage/inmem` を使います。プロダクションでは、ランタイムデータベースを所有するサービスへのアダプタを渡します。セッションを作成し終了するのはそのサービスであり、エージェントワーカーではありません。

---

## 6. ツール executor を実装する

生成されたエージェントパッケージには、ローカルツールセット用の `RegisterUsedToolsets` helper が含まれます。executor は明示的な run メタデータを受け取り、ランタイム所有の実行結果を返します。各ツールセットの specs package は、ツール識別子と生成済み payload/result codec を組にした型付き descriptor（ここでは `helpers.AnswerTool`）も公開します。これにより decode はコンパイル時に検査され、type assertion や、デザインですでに固定された名前と codec の対応付けを繰り返す必要がありません:

```go
type HelpersExecutor struct{}

func (e *HelpersExecutor) Execute(
	ctx context.Context,
	meta *runtime.ToolCallMeta,
	call *runtime.ToolCall,
) (*runtime.ToolExecutionResult, error) {
	switch call.Name {
	case helpers.Answer:
		args, err := helpers.AnswerTool().Payload.FromJSON(call.Payload)
		if err != nil {
			return nil, fmt.Errorf("decode admitted %s payload: %w", call.Name, err)
		}
		return runtime.Executed(&planner.ToolResult{
			Name:   call.Name,
			Result: &helpers.AnswerResult{Text: "Answer: " + args.Question},
		}), nil
	default:
		return runtime.Executed(&planner.ToolResult{
			Name: call.Name,
			Failure: &planner.ToolFailure{
				Kind:     planner.FailureInvalidCall,
				Error:    planner.NewToolError("unknown tool"),
				Recovery: planner.RecoveryDirective{Action: planner.RecoveryReplan},
			},
		}), nil
	}
}

if err := chat.RegisterUsedToolsets(ctx, rt, chat.WithHelpersExecutor(&HelpersExecutor{})); err != nil {
	log.Fatal(err)
}
```

ランタイムは、実行前に生成 codec で payload JSON を検証し、成功結果を生成 result codec でエンコードし、正規の run イベントを記録し、プランナーから見える出力を `PlanResume` に渡します。

---

## 7. モデルを接続する

プロバイダークライアントをランタイムへ登録し、プランナーから ID で参照します。ストリーミングプランナーでは、assistant/thinking/usage イベントの発行を所有する `PlannerModelClient` を優先してください。この例では OpenAI を使用します。AWS Bedrock や Google Vertex AI（Gemini / Claude-on-Vertex）の同等な例は [Runtime → LLM 統合](./runtime/#llm-統合) を参照してください。

```go
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
	APIKey:       os.Getenv("OPENAI_API_KEY"),
	DefaultModel: "gpt-5-mini",
	HighModel:    "gpt-5",
	SmallModel:   "gpt-5-nano",
})
if err != nil {
	log.Fatal(err)
}
if err := rt.RegisterModel("default", modelClient); err != nil {
	log.Fatal(err)
}
```

プランナーのスケッチ:

```go
func (p *Planner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
	mc, ok := in.Agent.PlannerModelClient("default")
	if !ok {
		return nil, errors.New("model client default is not registered")
	}

	summary, err := mc.Stream(ctx, &model.Request{
		Messages: in.Messages,
		Tools:    in.Agent.AdvertisedToolDefinitions(),
		Stream:   true,
	})
	if err != nil {
		return nil, err
	}
	if len(summary.ToolCalls) > 0 {
		return &planner.PlanResult{ToolCalls: summary.ToolCalls}, nil
	}
	final := summary.FinalResponse()
	if final == nil {
		return nil, errors.New("model stream ended without a canonical response")
	}
	return &planner.PlanResult{
		FinalResponse: final,
		Streamed: true,
	}, nil
}
```

検証済み stream を自分で drain する必要がある場合は `in.Agent.ModelClient("default")` を使い、`planner.ConsumeStream(ctx, stream)` と組み合わせます。プランナーターンごとにストリームの所有者は 1 つだけにしてください。provider constructor は不透明な client を返し、その response は planner code が受け取る前に検証されます。

---

## 8. ストリーミングを追加する

Goa-AI は、assistant text、tool start/end、workflow status、await、usage、child run link のための型付きストリームイベントを発行します。任意の `stream.Sink` を配線できます:

```go
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
	switch e := event.(type) {
	case stream.AssistantReply:
		fmt.Print(e.Data.Text)
	case stream.ToolStart:
		fmt.Printf("tool_start: %s\n", e.Data.ToolName)
	case stream.ToolEnd:
		fmt.Printf("tool_end: %s\n", e.Data.ToolName)
	case stream.Workflow:
		fmt.Printf("workflow: %s\n", e.Data.Phase)
	}
	return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

rt := runtime.New(runtimeStore, runtime.WithStream(&ConsoleSink{}))
```

本番 UI では Pulse へ publish し、セッションストリーム（`session/<session_id>`）を購読します。アクティブ run の `run_stream_end` を観測したらユーザー接続を閉じます。

---

## 9. 型付き直接 Completion を使う

`Completion(...)` は、ツール呼び出しではない構造化されたアシスタント出力のためのものです。生成 helper は provider-enforced structured output を要求し、生成 codec でデコードします:

```go
resp, err := completions.CompleteDraftTask(ctx, modelClient, &model.Request{
	Messages: []*model.Message{{
		Role:  model.ConversationRoleUser,
		Parts: []model.Part{model.TextPart{Text: "Draft a task for launch readiness."}},
	}},
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(resp.Value.Name)
```

completion 名は structured-output 契約の一部です。1-64 文字の ASCII、英字/数字/`_`/`-` のみ、先頭は英字または数字でなければなりません。streaming completion helper は `completion.Streamer[T]` を返します。`Recv` で preview fragment を読み、`io.EOF` まで drain した後、`Value()` で検証済みの型付き値を取得します。未検証 chunk を decode する公開 API はありません。

---

## 10. エージェントを合成する

エージェントは、他のエージェントが使えるツールセットを export できます。ネストしたエージェントは独自の `RunID` を持つ子ワークフローとして実行され、ストリームは `child_run_linked` を発行するため、UI は run tree を描画できます。

```go
Agent("researcher", "Research specialist", func() {
	Export("research", func() {
		Tool("deep_search", "Perform deep research", func() {
			Args(ResearchRequest)
			Return(ResearchReport)
		})
	})
})

Agent("coordinator", "Delegates specialist work", func() {
	Use(AgentToolset("orchestrator", "researcher", "research"))
})
```

各エージェントはそれぞれのプランナー、ツール、ポリシーを持ちます。ホストのランタイムストアは、親へのリンクを含め、すべてのルートランと子ランを記録します。親には子ランへの `RunLink` を含む通常のツール結果が返ります。

---

## 作ったもの

- スキーマ検証付きツールを持つ design-first エージェント。
- 生成された payload/result codec、ツールごとの型付き descriptor、モデル向け JSON Schema。
- 型付き直接 completion 契約。
- セッション付き実行と one-shot 実行を備えた生成ランタイムクライアント。
- モデル連携プランニング、ストリーミング UI、エージェント合成、生成 evaluation suite へ進む道筋（デザインで `Suite` を宣言します。詳細は [Evaluations](evaluations/)）。

プロダクションでは、耐久実行のための Temporal engine、ホスト所有の単一ランタイムストア、必要に応じてプロダクト所有のメモリストア、分散ストリーミングのための Pulse、プロバイダのレート制限に対応するモデルミドルウェアを追加します。Goa design が引き続き唯一の定義元です。

---

## 次のステップ

| ガイド | 学べること |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | すべての DSL 関数: ポリシー、MCP、レジストリ |
| [Runtime](runtime/) | plan/execute ループ、エンジン、メモリストア |
| [Toolsets](toolsets/) | サービス実装ツール、変換、executor |
| [Agent Composition](agent-composition/) | agent-as-tool パターンの詳細 |
| [Evaluations](evaluations/) | 生成 eval suite、evidence collection、LLM judge |
| [Production](production/) | Temporal セットアップ、UI へのストリーミング、レート制限 |
