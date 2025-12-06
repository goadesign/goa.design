---
title: "Integrazione LLM"
linkTitle: "Integrazione LLM"
weight: 10
description: "Come Goa-AI si integra con i provider LLM attraverso un'interfaccia agnostica al provider e moduli adapter."
---

I planner Goa-AI interagiscono con i large language model (LLM) attraverso un'**interfaccia agnostica al provider**. Questo design ti permette di cambiare provider—AWS Bedrock, OpenAI, o endpoint custom—senza cambiare il codice del planner.

## Interfaccia model.Client

Tutte le interazioni LLM passano attraverso l'interfaccia `model.Client` definita in `goa.design/goa-ai/runtime/agent/model`:

```go
type Client interface {
    // Complete esegue un'invocazione modello non-streaming.
    Complete(ctx context.Context, req *Request) (*Response, error)

    // Stream esegue un'invocazione modello streaming quando supportato.
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

I planner chiamano `Complete` per completion sincrone o `Stream` per risposte incrementali. Il runtime gestisce encoding tool, gestione transcript e stranezze specifiche del provider attraverso l'adapter.

## Uso dei Model Client nei Planner

I planner ottengono model client attraverso il `PlannerContext` del runtime:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // Ottieni un model client dal runtime
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := &model.Request{
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
    
    // Svuota lo stream e costruisci la risposta...
}
```

Il runtime wrappa il `model.Client` sottostante con un client decorato per eventi che emette eventi planner (blocchi thinking, chunk assistente, usage) mentre leggi dallo stream.

## Adapter Provider

Goa-AI viene fornito con adapter per provider LLM popolari. Ogni adapter implementa `model.Client` e gestisce:

- **Encoding messaggi**
- **Schemi tool**
- **Sanitizzazione nomi**
- **Streaming**
- **Thinking**

### AWS Bedrock

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

### OpenAI

```go
import "goa.design/goa-ai/features/model/openai"

// Da API key
modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

## Prossimi Passi

- Impara i [Toolset](../3-toolsets/) e come i tool vengono esposti ai modelli
- Esplora [Run Tree e Streaming](../8-run-trees-streaming-topology.md) per pattern di flusso eventi
- Leggi i [Concetti Runtime](../2-runtime/) per il modello completo di esecuzione planner

