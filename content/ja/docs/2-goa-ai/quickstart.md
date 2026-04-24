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
			DefaultCaps(MaxToolCalls(2), MaxConsecutiveFailedToolCalls(1))
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
Assistant: Hello from example planner.
Completion draft_task: ...
Completion stream draft_task: ...
```

`goa gen` は生成契約を作成します。`goa example` はアプリケーション所有の scaffold を作成します:

- `gen/`: 生成コード。このディレクトリを手で編集しないでください。
- `cmd/orchestrator/main.go`: 実行可能なサンプルのエントリポイント。
- `internal/agents/bootstrap/bootstrap.go`: ランタイム構築とエージェント登録。
- `internal/agents/chat/planner/planner.go`: 置き換え用のスタブプランナー。
- `gen/orchestrator/completions/`: 型付き直接 completion の helper。

DSL を変更したら再生成してください。scaffold の更新が必要なときは `goa example` を再実行し、アプリケーション側の編集は `cmd/` と `internal/` に置きます。

---

## 4. ランタイムループを理解する

**plan/execute ループ:**

1. `PlanStart` が最初のユーザーメッセージを受け取ります。
2. プランナーは `FinalResponse`、ツール呼び出し、または await request を返します。
3. ランタイムは生成 spec と登録済み executor を使い、許可されたツール呼び出しを検証して実行します。
4. `PlanResume` がプランナーから見えるツール出力を受け取ります。
5. プランナーが最終応答、終端ツール結果を返すか、ランタイムが上限/時間予算を強制するまでループします。

生成された例はスタブプランナーから始まるため、モデルを接続する前にこの流れを確認できます。実際のプランナーも同じ契約に従い、判断部分をモデルクライアントへ委譲するだけです。

---

## 5. コードからエージェントを呼び出す

生成されたエージェントパッケージは型付きクライアントを公開します。セッション付き run には明示的なセッションが必要です。one-shot run は意図的にセッションレスです。

```go
rt, cleanup, err := bootstrap.New(ctx)
if err != nil {
	log.Fatal(err)
}
defer cleanup()

if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
	log.Fatal(err)
}

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

---

## 6. ツール executor を実装する

生成されたエージェントパッケージには、ローカルツールセット用の `RegisterUsedToolsets` helper が含まれます。executor は明示的な run メタデータを受け取り、ランタイム所有の実行結果を返します:

```go
type HelpersExecutor struct{}

func (e *HelpersExecutor) Execute(
	ctx context.Context,
	meta *runtime.ToolCallMeta,
	call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
	switch call.Name {
	case helpers.Answer:
		args, err := helpers.UnmarshalAnswerPayload(call.Payload)
		if err != nil {
			return runtime.Executed(&planner.ToolResult{
				Name:  call.Name,
				Error: planner.NewToolError("invalid answer payload"),
			}), nil
		}
		return runtime.Executed(&planner.ToolResult{
			Name:   call.Name,
			Result: &helpers.AnswerResult{Text: "Answer: " + args.Question},
		}), nil
	default:
		return runtime.Executed(&planner.ToolResult{
			Name:  call.Name,
			Error: planner.NewToolError("unknown tool"),
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

プロバイダークライアントをランタイムへ登録し、プランナーから ID で参照します。ストリーミングプランナーでは、assistant/thinking/usage イベントの発行を所有する `PlannerModelClient` を優先してください。

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
	return &planner.PlanResult{
		FinalResponse: &planner.FinalResponse{
			Message: &model.Message{
				Role:  model.ConversationRoleAssistant,
				Parts: []model.Part{model.TextPart{Text: summary.Text}},
			},
		},
		Streamed: true,
	}, nil
}
```

生のストリーム制御が必要な場合は `in.Agent.ModelClient("default")` を使い、`planner.ConsumeStream` と組み合わせます。プランナーターンごとにストリームの所有者は 1 つだけにしてください。

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
		fmt.Printf("tool_start: %s
", e.Data.ToolName)
	case stream.ToolEnd:
		fmt.Printf("tool_end: %s
", e.Data.ToolName)
	case stream.Workflow:
		fmt.Printf("workflow: %s
", e.Data.Phase)
	}
	return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
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

completion 名は structured-output 契約の一部です。1-64 文字の ASCII、英字/数字/`_`/`-` のみ、先頭は英字または数字でなければなりません。ストリーミング completion helper はプレビュー用の `completion_delta` chunk を公開し、正規の最後の `completion` chunk だけをデコードします。

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

各エージェントは、自分のプランナー、ツール、ポリシー、run log を保持します。親は、子 run への `RunLink` を持つ通常のツール結果として結果を受け取ります。

---

## 作ったもの

- スキーマ検証付きツールを持つ design-first エージェント。
- 生成された payload/result codec と、モデル向け JSON Schema。
- 型付き直接 completion 契約。
- セッション付き実行と one-shot 実行を備えた生成ランタイムクライアント。
- モデル連携プランニング、ストリーミング UI、エージェント合成へ進む道筋。

本番では、耐久性のために Temporal engine、memory/session/run log のために Mongo-backed store、分散ストリーミングのために Pulse、プロバイダーのレート制限のために model middleware を追加します。Goa デザインは引き続き真実の情報源です。

---

## 次のステップ

| ガイド | 学べること |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | すべての DSL 関数: ポリシー、MCP、レジストリ |
| [Runtime](runtime/) | plan/execute ループ、エンジン、メモリストア |
| [Toolsets](toolsets/) | サービス実装ツール、変換、executor |
| [Agent Composition](agent-composition/) | agent-as-tool パターンの詳細 |
| [Production](production/) | Temporal セットアップ、UI へのストリーミング、レート制限 |
