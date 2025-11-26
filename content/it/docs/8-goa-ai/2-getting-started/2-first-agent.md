---
title: "Il Tuo Primo Agente"
linkTitle: "Il Tuo Primo Agente"
weight: 2
description: "Crea il tuo primo agente con Goa-AI in pochi minuti."
---

Questa guida ti accompagna nella creazione del tuo primo agente con Goa-AI. Costruirai un semplice assistente Q&A che può rispondere a domande usando un toolset helper.

## Scaffold di un Nuovo Progetto

Crea una nuova directory di progetto:

```bash
mkdir -p $GOPATH/src/example.com/quickstart && cd $_
go mod init example.com/quickstart
go get goa.design/goa/v3@latest
go get goa.design/goa-ai@latest
```

## Aggiungi un Design

Crea `design/design.go` con una semplice definizione di agente:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Tipi input e output con descrizioni inline
var AskPayload = Type("AskPayload", func() {
    Attribute("question", String, "Domanda dell'utente a cui rispondere")
    Example(map[string]any{"question": "Qual è la capitale dell'Italia?"})
    Required("question")
})

var Answer = Type("Answer", func() {
    Attribute("text", String, "Testo della risposta")
    Required("text")
})

var _ = Service("orchestrator", func() {
    Agent("chat", "Assistente Q&A amichevole", func() {
        Use("helpers", func() {
            Tool("answer", "Rispondi a una domanda semplice", func() {
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

Questo design dichiara:
- Un servizio chiamato `orchestrator`
- Un agente chiamato `chat` che usa un toolset `helpers`
- Un tool chiamato `answer` con payload e risultato tipizzati
- Una policy di esecuzione con cap e budget temporale

## Genera il Codice

Esegui il generatore di codice Goa:

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
```

Questo crea:
- Package agente generati sotto `gen/orchestrator/agents/chat/`
- Specifiche tool e codec sotto `gen/orchestrator/agents/chat/specs/`
- Esempi eseguibili sotto `cmd/orchestrator/`

## Implementa un Planner Semplice

Crea `cmd/demo/main.go` con un planner minimale:

```go
package main

import (
    "context"
    "fmt"

    chat "example.com/quickstart/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

// Un planner semplice: risponde sempre, nessun tool (ottimo per la prima esecuzione)
type StubPlanner struct{}

func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Ciao da Goa-AI!"}},
            },
        },
    }, nil
}

func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Fatto."}},
            },
        },
    }, nil
}

func main() {
    // 1) Runtime (usa engine in-memory di default)
    rt := runtime.New()

    // 2) Registra l'agente generato con il nostro planner
    if err := chat.RegisterChatAgent(context.Background(), rt, chat.ChatAgentConfig{
        Planner: &StubPlanner{},
    }); err != nil {
        panic(err)
    }

    // 3) Eseguilo usando il client tipizzato generato
    client := chat.NewClient(rt)
    out, err := client.Run(context.Background(),
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Saluta"}},
        }},
        runtime.WithSessionID("session-1"),
    )
    if err != nil {
        panic(err)
    }
    fmt.Println("RunID:", out.RunID)
    // out.Final contiene il messaggio dell'assistente
    if out.Final != nil && len(out.Final.Parts) > 0 {
        if tp, ok := out.Final.Parts[0].(model.TextPart); ok {
            fmt.Println("Assistente:", tp.Text)
        }
    }
}
```

## Esegui la Demo

Esegui il tuo primo agente:

```bash
go run ./cmd/demo
```

Output atteso:

```
RunID: orchestrator.chat-...
Assistente: Ciao da Goa-AI!
```

## Capire Cosa è Successo

1. **Design**: Hai dichiarato un agente con un toolset nel DSL di Goa
2. **Generazione Codice**: Goa-AI ha generato package agente tipizzati, specifiche tool e codec
3. **Runtime**: Il runtime ha orchestrato il loop plan/execute
4. **Planner**: Il tuo planner ha deciso di restituire una risposta finale (nessun tool chiamato)

## Prossimi Passi

Ora che hai un agente funzionante, puoi:

- Imparare il [Riferimento DSL](../3-concepts/1-dsl/) per capire tutte le funzioni DSL disponibili
- Esplorare i [Concetti Runtime](../3-concepts/2-runtime/) per capire come funziona il runtime
- Seguire il [Tutorial Agente Semplice](../4-tutorials/1-simple-agent/) per costruire un agente più completo con esecuzione di tool

## Opzionale: Setup Temporal

Per workflow durevoli, puoi usare Temporal invece dell'engine in-memory:

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
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
// Il resto del codice rimane lo stesso
```

Avvia il server di sviluppo Temporal:

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

Il resto del tuo codice rimane identico—il runtime astrae le differenze dell'engine.
