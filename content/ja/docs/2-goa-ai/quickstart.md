---
title: "クイックスタート"
linkTitle: "クイックスタート"
weight: 1
description: "10分で動くAIエージェントを作ります。スタブから始め、ストリーミングとバリデーションを追加し、最後に実際のLLMへ接続します。"
llm_optimized: true
aliases:
---

{{< alert title="動作確認済みの例" color="info" >}}
このコードは CI でテストされています。動かない場合は [issue を作成してください](https://github.com/goadesign/goa-ai/issues)。
{{< /alert >}}

次の 10 分で、プロダクション対応のエージェントシステムをゼロから組み立てます。型安全なツール、リアルタイムのストリーミング、不正入力に対する自己修復リトライ付きの自動バリデーション、LLM 連携、エージェント合成まで――すべてを宣言的な DSL から。なかなか良いですよね。

**作るもの:**

1. **スタブエージェント** — plan/execute ループを理解する（3分）
2. **ストリーミング** — イベントをリアルタイムに見る
3. **バリデーション** — 不正な入力で自動リトライ
4. **実際の LLM** — OpenAI または Claude を接続する
5. **エージェント合成** — エージェントがエージェントを呼ぶ

最後には、バリデーション付きツールとリアルタイムストリーミングを備えた型安全なエージェント、そして本番デプロイに向けた土台が手に入ります。

---

## 前提条件

```bash
# Go 1.24+
go version

# Install Goa CLI
go install goa.design/goa/v3/cmd/goa@latest
```

---

## ステップ 1: プロジェクトのセットアップ

```bash
mkdir quickstart && cd quickstart
go mod init quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
```

`design/design.go` を作成します。このファイルは Goa の DSL を使って、あなたのエージェントとツールを定義します。これは「契約」だと捉えてください：エージェントが何をできるか、どんな入力を受け取り、どんな出力を返すかを明確にします。

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Service groups related agents and methods
var _ = Service("demo", func() {
    // Agent defines an AI agent with a name and description
    Agent("assistant", "A helpful assistant", func() {
        // Use declares a toolset the agent can access
        Use("weather", func() {
            // Tool defines a capability the LLM can invoke
            Tool("get_weather", "Get current weather", func() {
                // Args defines the input schema (what the LLM sends)
                Args(func() {
                    Attribute("city", String, "City name")
                    Required("city")
                })
                // Return defines the output schema (what the tool returns)
                Return(func() {
                    Attribute("temperature", Int, "Temperature in Celsius")
                    Attribute("conditions", String, "Weather conditions")
                    Required("temperature", "conditions")
                })
            })
        })
    })
})
```

コードを生成します：

```bash
goa gen quickstart/design
```

これにより `gen/` ディレクトリが作られ、次が含まれます：
- **エージェント登録ヘルパー** — ランタイムへエージェントを配線する
- **ツール仕様とコーデック** — 型安全なペイロード/結果の取り扱い
- **JSON スキーマ** — LLM のツール定義用
- **`gen/<service>/completions/`** — サービスが `Completion(...)` を宣言したときの型付き直接 completion ヘルパー

`gen/` 配下のファイルは絶対に手で編集しないでください。`goa gen` を実行するたびに再生成されます。

### オプション: 型付き直接 Completion を追加する

ツール呼び出しは、呼び出し可能な能力を表すのに最適です。アシスタントに
型付きの構造化応答を直接返してほしい場合は、サービス所有の completion を
宣言します。

```go
var TaskDraft = Type("TaskDraft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("demo", func() {
    Completion("draft_task", "Produce a task draft directly", func() {
        Return(TaskDraft)
    })
})
```

completion 名は structured output コントラクトの一部です。1 文字以上
64 文字以下の ASCII で、使用できるのは英字・数字・`_`・`-` のみ、
先頭は英字または数字でなければなりません。

再生成すると、`gen/demo/completions/` に結果スキーマ、型付き codec、
そして `CompleteDraftTask(...)`、`StreamCompleteDraftTask(...)`、
`DecodeDraftTaskChunk(...)` のような生成 helper が出力されます。

unary helper は provider に強制された structured output を伴う unary
なモデルリクエストを発行し、生成 codec を通してアシスタント応答を
デコードします。streaming helper は raw な `model.Streamer` の表面に
留まります。`completion_delta` chunk はプレビュー専用で、正規なのは
最後の 1 つの `completion` chunk だけであり、
`DecodeDraftTaskChunk(...)` はその最終 payload だけをデコードします。
生成された completion helper は、ツール有効化リクエストと呼び出し側が
指定した `StructuredOutput` を拒否します。structured output を実装
しない provider は `model.ErrStructuredOutputUnsupported` を返します。

---

## ステップ 2: スタブプランナーで実行する

実際の LLM へつなぐ前に、スタブプランナーを使って Goa-AI のエージェントがどう動くかを理解しましょう。流れが明示されるので、後で問題をデバッグするのにも役立ちます。

**plan/execute ループ:**
1. ランタイムがユーザーメッセージとともに `PlanStart` を呼ぶ
2. プランナーが「最終応答」または「ツール呼び出し」を返す
3. ツールが呼ばれた場合、ランタイムがツールを実行し、結果を添えて `PlanResume` を呼ぶ
4. プランナーが最終応答を返すまでループが続く

`main.go` を作成します：

```go
package main

import (
    "context"
    "fmt"

    // Generated package for our assistant agent
    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

// StubPlanner implements the planner.Planner interface.
// A real planner would call an LLM; this one hardcodes the flow.
type StubPlanner struct{}

// PlanStart is called with the initial user message.
// Return ToolCalls to invoke tools, or FinalResponse to end the run.
func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // Request a tool call: "toolset.tool_name" format
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{{
            Name:    "weather.get_weather",        // toolset.tool format
            Payload: []byte(`{"city": "Tokyo"}`),  // JSON matching Args schema
        }},
    }, nil
}

// PlanResume is called after tools execute, with their results in in.Messages.
// Decide: call more tools, or return a final response.
func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // We have tool results; return final answer
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Tokyo is 22°C and sunny!"}},
            },
        },
    }, nil
}

// StubExecutor implements runtime.Executor.
// Called when the planner requests a tool. Returns the tool's result.
type StubExecutor struct{}

func (e *StubExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    // Return data matching the Return schema defined in the DSL
    return &planner.ToolResult{
        Name:   req.Name,
        Result: map[string]any{"temperature": 22, "conditions": "Sunny"},
    }, nil
}

func main() {
    ctx := context.Background()

    // Create runtime with in-memory engine (no external dependencies)
    rt := runtime.New()
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    // Register the agent with its planner and executor
    err := assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &StubPlanner{},
        Executor: &StubExecutor{},
    })
    if err != nil {
        panic(err)
    }

    // Create a typed client for the agent
    client := assistant.NewClient(rt)

    // Start a run with a user message
    out, err := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather?"}},
    }})
    if err != nil {
        panic(err)
    }

    // Print the result
    fmt.Println("RunID:", out.RunID)
    if out.Final != nil {
        for _, p := range out.Final.Parts {
            if tp, ok := p.(model.TextPart); ok {
                fmt.Println("Assistant:", tp.Text)
            }
        }
    }
}
```

実行します：

```bash
go mod tidy && go run main.go
```

出力：
```
RunID: demo.assistant-abc123
Assistant: Tokyo is 22°C and sunny!
```

**起きたこと:**
1. ランタイムが `PlanStart` を呼び、プランナーが `get_weather` ツールを要求した
2. ランタイムが `StubExecutor` 経由でツールを実行した
3. ランタイムがツール結果とともに `PlanResume` を呼び、プランナーが最終応答を返した

このスタブプランナーはフローをハードコードしていますが、実際の LLM プランナーも同じパターンです（違いは、会話に応じて動的に決めることだけです）。

### 任意: Prompt Override Store を追加する

最初からランタイム管理の prompt override を使いたい場合は、runtime 作成時に prompt store を接続します。

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
)

promptClient, _ := clientmongo.New(clientmongo.Options{
    Client:   mongoClient,
    Database: "quickstart",
})
promptStore, _ := promptmongo.NewStore(promptClient)

rt := runtime.New(
    runtime.WithPromptStore(promptStore),
)
```

prompt store なしでも実行できます。その場合、runtime はベースライン prompt spec のみを使用します。

---

## ステップ 3: ストリーミングを追加する

エージェントはブラックボックスになりがちです。ストリーミングイベントがあれば、何が起きているかを正確に確認でき、デバッグやリアルタイム UI の構築に役立ちます。

Goa-AI は実行中に、`ToolStart` / `ToolEnd`、`Workflow` のフェーズ変化、`AssistantReply` のチャンクなど、型付きイベントを発行します。`Sink` インターフェースを通してそれらを受け取ります。

イベントをリアルタイムに見る：

```go
package main

import (
    "context"
    "fmt"

    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

// Same stub planner as before
type StubPlanner struct{}

func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{{Name: "weather.get_weather", Payload: []byte(`{"city":"Tokyo"}`)}},
    }, nil
}

func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Tokyo is 22°C and sunny!"}},
            },
        },
    }, nil
}

type StubExecutor struct{}

func (e *StubExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    return &planner.ToolResult{Name: req.Name, Result: map[string]any{"temperature": 22, "conditions": "Sunny"}}, nil
}

// ConsoleSink implements stream.Sink to receive events.
// Events are typed—switch on the concrete type to handle each kind.
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
    // Type switch on event to handle different event kinds
    switch e := event.(type) {
    case stream.ToolStart:
        fmt.Printf("🔧 Tool: %s\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Printf("✅ Done: %s\n", e.Data.ToolName)
    case stream.Workflow:
        fmt.Printf("📋 %s\n", e.Data.Phase)
    // Other events: AssistantReply, PlannerThought, UsageDelta, etc.
    }
    return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

func main() {
    ctx := context.Background()

    // Pass the sink to the runtime—all events flow through it
    rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    _ = assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &StubPlanner{},
        Executor: &StubExecutor{},
    })

    client := assistant.NewClient(rt)
    out, _ := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather?"}},
    }})

    fmt.Println("\nRunID:", out.RunID)
}
```

出力：
```
📋 started
🔧 Tool: weather.get_weather
✅ Done: weather.get_weather
📋 completed

RunID: demo.assistant-abc123
```

---

## ステップ 4: バリデーションを追加する

LLM は間違えます。空文字、無効な enum 値、壊れた JSON などを送ってきます。バリデーションがないと、ツールがクラッシュしたり、ゴミ結果が生まれたりします。

Goa-AI はツールのペイロードを境界でバリデーションします（executor が走る前）。不正な呼び出しは `RetryHint` を返し、プランナーが自己修復できるようにします。これは自動で起こり、あなたは制約を定義するだけです。

制約を追加して `design/design.go` を更新します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("demo", func() {
    Agent("assistant", "A helpful assistant", func() {
        Use("weather", func() {
            Tool("get_weather", "Get current weather", func() {
                Args(func() {
                    // MinLength/MaxLength: string length constraints
                    Attribute("city", String, "City name", func() {
                        MinLength(2)   // Rejects "" or "X"
                        MaxLength(100) // Rejects very long strings
                    })
                    // Enum: only these values are valid
                    Attribute("units", String, "Temperature units", func() {
                        Enum("celsius", "fahrenheit") // Rejects "kelvin"
                    })
                    Required("city") // city must be present
                })
                Return(func() {
                    Attribute("temperature", Int, "Temperature")
                    Attribute("conditions", String, "Weather conditions")
                    Required("temperature", "conditions")
                })
            })
        })
    })
})
```

再生成します：

```bash
goa gen quickstart/design
```

これで、プランナーが `{"city": ""}` や `{"units": "kelvin"}` を送ってきた場合は次が起きます：

1. executor が走る前に、境界で **拒否される**
2. バリデーションエラーを含む **RetryHint** が返る
3. プランナーが **自動修正** してリトライできる

バリデーションに失敗したとき、ランタイムは次を返します：

```go
// When the LLM sends invalid input like {"city": "", "units": "kelvin"}
// the runtime returns a ToolResult with RetryHint instead of calling your executor:
&planner.ToolResult{
    Name: "weather.get_weather",
    RetryHint: &planner.RetryHint{
        Message: `validation failed: city length must be >= 2; units must be one of ["celsius", "fahrenheit"]`,
    },
}

// The planner sees this error and can retry with corrected input.
// With real LLMs, this self-correction happens automatically—
// the model reads the error, understands what went wrong, and fixes it.
```

クラッシュしません。手動パースも不要です。LLM は明確なエラーメッセージを受け取り、次の試行で直せます。

---

## ステップ 5: 実際の LLM

ここから、スタブを実際の LLM に置き換えます。プランナーの仕事は次です：
1. 会話履歴と利用可能なツールからリクエストを組み立てる
2. モデルへ送る
3. 応答を解釈する（ツール呼び出し、または最終回答）

それ以外（ツール実行、バリデーション、リトライ、ストリーミング）はランタイムが扱います。

OpenAI または Claude に接続しましょう。まず、モデルクライアントを使う実プランナーを作ります：

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "os"

    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/features/model/openai"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

// RealPlanner calls an actual LLM instead of hardcoding responses.
// It retrieves the model client from the runtime by ID.
type RealPlanner struct {
    systemPrompt string
}

func (p *RealPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // Get the raw model client by the ID we registered it with.
    // Use PlannerModelClient instead when you want runtime-owned streaming events.
    client, ok := in.Agent.ModelClient("openai")
    if !ok {
        return nil, fmt.Errorf("no model client")
    }

    // Build messages: system prompt first, then user messages
    msgs := append([]*model.Message{{
        Role:  model.ConversationRoleSystem,
        Parts: []model.Part{model.TextPart{Text: p.systemPrompt}},
    }}, in.Messages...)

    // Call the LLM with messages and available tools.
    // AdvertisedToolDefinitions returns the JSON schemas generated from your DSL
    // after runtime filtering for the current turn.
    resp, err := client.Complete(ctx, &model.Request{
        Messages: msgs,
        Tools:    in.Agent.AdvertisedToolDefinitions(),
    })
    if err != nil {
        return nil, err
    }

    return interpretResponse(resp)
}

func (p *RealPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    client, ok := in.Agent.ModelClient("openai")
    if !ok {
        return nil, fmt.Errorf("no model client")
    }

    // in.Messages now includes tool results from the previous turn
    msgs := append([]*model.Message{{
        Role:  model.ConversationRoleSystem,
        Parts: []model.Part{model.TextPart{Text: p.systemPrompt}},
    }}, in.Messages...)

    resp, err := client.Complete(ctx, &model.Request{
        Messages: msgs,
        Tools:    in.Agent.AdvertisedToolDefinitions(),
    })
    if err != nil {
        return nil, err
    }

    return interpretResponse(resp)
}

// interpretResponse converts the LLM response to a PlanResult.
// If the LLM requested tools, return ToolCalls. Otherwise, return FinalResponse.
func interpretResponse(resp *model.Response) (*planner.PlanResult, error) {
    if len(resp.Content) == 0 {
        return nil, fmt.Errorf("empty response")
    }

    msg := resp.Content[len(resp.Content)-1]
    var toolCalls []planner.ToolRequest

    // Check each part of the response for tool calls or text
    for _, part := range msg.Parts {
        switch p := part.(type) {
        case model.ToolUsePart:
            // LLM wants to call a tool—convert to ToolCall
            payload, _ := json.Marshal(p.Input)
            toolCalls = append(toolCalls, planner.ToolRequest{
                Name:       p.Name,
                Payload:    payload,
                ToolCallID: p.ID,
            })
        case model.TextPart:
            // Text response (used if no tool calls)
        }
    }

    // If tools were requested, return them for execution
    if len(toolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: toolCalls}, nil
    }

    // No tools—this is the final answer
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{Message: &msg},
    }, nil
}

type WeatherExecutor struct{}

func (e *WeatherExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    // Real implementation would call a weather API here
    return &planner.ToolResult{
        Name:   req.Name,
        Result: map[string]any{"temperature": 22, "conditions": "Sunny"},
    }, nil
}

// ConsoleSink streams assistant text to the console in real-time
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.ToolStart:
        fmt.Printf("🔧 Tool: %s\n", e.Data.ToolName)
    case stream.AssistantReply:
        // Print text chunks as they arrive (streaming output)
        fmt.Print(e.Data.Text)
    }
    return nil
}
func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

func main() {
    ctx := context.Background()

    // --- OpenAI ---
    modelClient, err := openai.NewFromAPIKey(os.Getenv("OPENAI_API_KEY"), "gpt-4o")
    if err != nil {
        panic(err)
    }

    // --- Claude via Bedrock (uncomment to use instead) ---
    // import "goa.design/goa-ai/features/model/bedrock"
    //
    // bedrockClient, err := bedrock.New(bedrock.Options{
    //     Region: "us-east-1",
    //     Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    // })
    // if err != nil {
    //     panic(err)
    // }
    // // Then use: runtime.WithModelClient("claude", bedrockClient)
    // // And in planners for raw access: in.Agent.ModelClient("claude")
    // // Or for runtime-owned streaming: in.Agent.PlannerModelClient("claude")

    // Create runtime with streaming and model client
    // The ID ("openai") is how the planner retrieves it
    rt := runtime.New(
        runtime.WithStream(&ConsoleSink{}),
        runtime.WithModelClient("openai", modelClient),
    )
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    // Register the agent with the real planner
    err = assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &RealPlanner{systemPrompt: "You are a helpful weather assistant."},
        Executor: &WeatherExecutor{},
    })
    if err != nil {
        panic(err)
    }

    // Run the agent
    client := assistant.NewClient(rt)
    out, err := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather in Paris?"}},
    }})
    if err != nil {
        panic(err)
    }

    fmt.Println("\n\nRunID:", out.RunID)
}
```

API キーを設定して実行します：

```bash
export OPENAI_API_KEY="sk-..."
go run main.go
```

すべてのモデルアダプターは同じ `model.Client` インターフェースを実装しているので、OpenAI / Claude / その他の切り替えは設定の変更だけで済みます（プランナーコードはそのままです）。

---

## ステップ 6: エージェント合成

現実の AI システムは単一エージェントではありません。リサーチ担当が情報を集め、アナリストが解釈し、ライターが整形する――そんな「専門家チーム」です。

Goa-AI はこれを **agent-as-tool** としてネイティブにサポートします。どのエージェントでも、自分の能力を他のエージェントがツールとして呼べる形で公開できます。ネストしたエージェントは独自のプランナーとツールを使って動きますが、親のワークフローの中で動作します。単一トランザクション、統合ヒストリ、完全なトレーサビリティです。

エージェントが別のエージェントをツールとして呼べるようにするため、`design/design.go` に追加します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Weather specialist agent—has its own tools and planner
var _ = Service("weather", func() {
    Agent("forecaster", "Weather specialist", func() {
        // Internal tools only this agent can use
        Use("weather_tools", func() {
            Tool("get_forecast", "Get forecast", func() {
                Args(func() {
                    Attribute("city", String, "City")
                    Required("city")
                })
                Return(func() {
                    Attribute("forecast", String, "Forecast")
                    Required("forecast")
                })
            })
        })

        // Export makes this agent callable as a tool by other agents.
        // The exported toolset defines the interface other agents see.
        Export("ask_weather", func() {
            Tool("ask", "Ask weather specialist", func() {
                Args(func() {
                    Attribute("question", String, "Question")
                    Required("question")
                })
                Return(func() {
                    Attribute("answer", String, "Answer")
                    Required("answer")
                })
            })
        })
    })
})

// Main assistant uses the weather agent as a tool
var _ = Service("demo", func() {
    Agent("assistant", "A helpful assistant", func() {
        // UseAgentToolset imports an exported toolset from another agent.
        // Args: service name, agent name, exported toolset name
        UseAgentToolset("weather", "forecaster", "ask_weather")
    })
})
```

再生成します：

```bash
goa gen quickstart/design
```

アシスタントが天気情報を必要としたときは、次が起きます：
1. アシスタントのプランナーが `ask_weather` を呼ぶと判断する
2. ランタイムが天気エージェントを子ランとして起動する
3. 天気エージェントが自分の plan/execute ループを、自分のツールで実行する
4. 天気エージェントが答えを親へ返す
5. アシスタントのプランナーが結果を受け取り、続行する

**各エージェントは独自のプランナー、ツール、コンテキストを持ちます。** ランタイムがオーケストレーションを処理し、ストリーミングイベントを通して両方のランの完全な可視性が得られます。

---

## 作ったもの

✅ **スキーマでバリデーションされるツールを備えた型付きエージェント**  
✅ **リアルタイム可視化のためのストリーミングイベント**  
✅ **自動リトライのためのヒント付きバリデーション**  
✅ **実際の LLM 連携**  
✅ **ランツリーを伴うエージェント合成**  

すべて、宣言的 DSL から。デザインが唯一の真実の情報源です。デザインを変えて再生成すれば、型・スキーマ・バリデーションは常に同期します。

**内部で動いているもの:**
- 生成されたコーデックが、正しい型で JSON シリアライズを扱う
- バリデーションが境界で実行され、あなたのコードが動く前に不正を止める
- plan/execute ループが状態とリトライを管理する
- 設定した任意の Sink にイベントをストリームする

これは土台です。本番では Temporal による耐久性、Mongo による永続化、Pulse による分散ストリーミングを足しますが、エージェントコード自体は同じままです。

---

## 次のステップ

| ガイド | 学べること |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | DSL 関数すべて：ポリシー、MCP、レジストリ |
| [Runtime](runtime/) | plan/execute ループ、エンジン、メモリストア |
| [Toolsets](toolsets/) | サービス実装ツール、変換、executor |
| [Agent Composition](agent-composition/) | agent-as-tool パターンの詳細 |
| [Production](production/) | Temporal セットアップ、UI へのストリーミング、レート制限 |
