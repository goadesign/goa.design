---
title: "LLM Integration"
linkTitle: "LLM Integration"
weight: 10
description: "How Goa-AI integrates with LLM providers through a provider-agnostic interface and adapter modules."
---

Goa-AI planners interact with large language models (LLMs) through a **provider-agnostic interface**. This design lets you swap providers—AWS Bedrock, OpenAI, or custom endpoints—without changing your planner code.

## The model.Client Interface

All LLM interactions go through the `model.Client` interface defined in `goa.design/goa-ai/runtime/agent/model`:

```go
type Client interface {
    // Complete performs a non-streaming model invocation.
    Complete(ctx context.Context, req Request) (Response, error)

    // Stream performs a streaming model invocation when supported.
    Stream(ctx context.Context, req Request) (Streamer, error)
}
```

Planners call `Complete` for synchronous completions or `Stream` for incremental responses. The runtime handles tool encoding, transcript management, and provider-specific quirks through the adapter.

## Request and Response Types

The `model.Request` struct captures everything needed for a model call:

```go
type Request struct {
    RunID       string            // Logical run identifier
    Model       string            // Provider-specific model ID (e.g., "claude-3-opus")
    ModelClass  ModelClass        // High-reasoning, default, or small
    Messages    []*Message        // Conversation transcript
    Tools       []*ToolDefinition // Tools available to the model
    ToolChoice  *ToolChoice       // Constrain tool selection
    MaxTokens   int               // Output token cap
    Temperature float32           // Sampling temperature
    Stream      bool              // Request streaming
    Thinking    *ThinkingOptions  // Provider thinking features
}
```

Responses include the assistant's content, any tool calls requested, token usage, and a stop reason:

```go
type Response struct {
    Content    []Message   // Assistant messages
    ToolCalls  []ToolCall  // Requested tool invocations
    Usage      TokenUsage  // Token consumption
    StopReason string      // Why generation stopped
}
```

## Messages and Parts

Messages use typed parts rather than plain strings. This preserves structure for thinking blocks, tool calls, and results:

| Part Type | Purpose |
|-----------|---------|
| `TextPart` | Plain text content from user or assistant |
| `ThinkingPart` | Provider reasoning (signature, redacted, or plaintext) |
| `ToolUsePart` | Tool invocation declared by assistant |
| `ToolResultPart` | Tool result provided by user/runtime |

Parts keep provider-specific encodings opaque while giving planners and UIs typed access to message structure.

## Provider Adapters

Goa-AI ships with adapters for popular LLM providers. Each adapter implements `model.Client` and handles:

- **Message encoding**: Translating messages and parts into provider-native formats
- **Tool schemas**: Converting `ToolDefinition` to provider tool specs
- **Name sanitization**: Mapping canonical tool IDs (`toolset.tool`) to provider-safe names and back
- **Streaming**: Parsing incremental events into `Chunk` values
- **Thinking**: Configuring and surfacing provider reasoning features

### AWS Bedrock

The Bedrock adapter (`features/model/bedrock`) uses the Converse and ConverseStream APIs:

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
}, ledger)
```

The Bedrock adapter supports:
- Multi-model routing via `ModelClass` (high-reasoning, default, small)
- Tool name sanitization (canonical `toolset.tool` → provider-safe names)
- Extended thinking with budget tokens
- Interleaved thinking mode for agentic workflows
- Transcript rehydration via ledger source

### OpenAI

The OpenAI adapter (`features/model/openai`) uses the Chat Completions API:

```go
import "goa.design/goa-ai/features/model/openai"

// From API key
modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")

// Or with custom client
modelClient, err := openai.New(openai.Options{
    Client:       customOpenAIClient,
    DefaultModel: "gpt-4o",
})
```

The OpenAI adapter handles:
- Message and tool encoding to Chat Completions format
- Tool choice modes (auto, none, specific tool)
- Usage tracking

> **Note**: OpenAI streaming is not yet supported in the adapter. Callers fall back to `Complete`.

## Using Model Clients in Planners

Planners obtain model clients through the runtime's `PlannerContext`:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // Get a model client from the runtime
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := model.Request{
        RunID:    input.Run.RunID,
        Messages: input.Messages,
        Tools:    input.Tools,
        Stream:   true,
    }
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Drain stream and build response...
}
```

The runtime wraps the underlying `model.Client` with an event-decorated client that emits planner events (thinking blocks, assistant chunks, usage) as you read from the stream. This means you **should not** call `planner.ConsumeStream` on streamers from `ModelClient`—the events are emitted automatically.

## Tool Integration

Adapters translate Goa-generated `ToolDefinition` values into provider-native tool specs. The translation includes:

1. **Name mapping**: Canonical IDs like `atlas.read.chat.get_user` become provider-safe names
2. **Schema encoding**: JSON Schema input definitions become provider tool parameters
3. **Reverse mapping**: Tool calls from the model are translated back to canonical IDs

This keeps planners provider-agnostic—they work with canonical tool identifiers while adapters handle provider quirks.

## Implementing Custom Adapters

To integrate a new provider, implement `model.Client`:

```go
type MyProviderClient struct {
    // provider-specific fields
}

func (c *MyProviderClient) Complete(ctx context.Context, req model.Request) (model.Response, error) {
    // 1. Encode messages to provider format
    // 2. Encode tools to provider format  
    // 3. Call provider API
    // 4. Translate response to model.Response
}

func (c *MyProviderClient) Stream(ctx context.Context, req model.Request) (model.Streamer, error) {
    // Return ErrStreamingUnsupported if not implemented
    // Otherwise return a Streamer that yields Chunks
}
```

Key considerations:
- Handle tool name sanitization if the provider has naming constraints
- Preserve tool call IDs for result correlation
- Emit proper `Chunk` types for streaming (text, tool_call, thinking, usage, stop)
- Surface provider errors clearly rather than masking them

## Next Steps

- Learn about [Toolsets](../3-toolsets/) and how tools are exposed to models
- Explore [Run Trees & Streaming](../8-run-trees-streaming-topology.md) for event flow patterns
- Read [Runtime Concepts](../2-runtime/) for the full planner execution model

