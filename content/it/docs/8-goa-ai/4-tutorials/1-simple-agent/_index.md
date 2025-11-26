---
title: "Costruire un Agente Semplice"
linkTitle: "Agente Semplice"
weight: 1
description: "Costruisci il tuo primo agente Goa-AI con tool da zero."
---

Questo tutorial ti guida nella costruzione di un semplice agente Goa-AI che:

- Accetta un prompt utente
- Usa tool definiti nel design per completare task
- Restituisce una risposta strutturata e type-safe

## Prerequisiti

- Go 1.24 o superiore
- Conoscenza base di Goa
- Accesso ad AWS Bedrock, OpenAI, o altro provider compatibile `model.Client`

## Step 1: Crea il Design

Prima, crea il design dell'agente. Crea un nuovo file `design.go` nel tuo package Goa, o aggiungi a un design Goa esistente:

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa/v3/dsl"
)

var _ = Service("assistant", func() {
    Description("Un semplice servizio assistente")

    // Definisci un agente per l'assistente
    Agent("helper", "Un assistente capace che aiuta con le richieste", func() {
        // Attacca toolset a questo agente
        UseToolset("utilities")
    })
})

// Toolset utility con tool per l'ora corrente
var _ = Toolset("utilities", "Tool utility generici", func() {
    Tool("get_time", "Ottieni la data e l'ora corrente", func() {
        Result(String, "Ora corrente in formato HH:MM:SS")
    })
})
```

## Step 2: Genera il Codice

Esegui la generazione Goa standard:

```bash
goa gen <your-module>/design -o .
```

Questo crea in `gen/`:

- Registrazione agente (`gen/<service>/agents/<agent>/`)
- Spec tool e schemi (`gen/<service>/agents/<agent>/specs/`)
- Helper registrazione toolset (`gen/<service>/toolsets/<toolset>/`)

## Step 3: Implementa i Tool Handler

Crea tool handler usando la registrazione toolset generata:

```go
package main

import (
    "context"
    "time"

    "goa.design/goa-ai/runtime/agent"
    utilities "your-module/gen/assistant/toolsets/utilities"
)

func registerTools(rt *agent.Runtime) error {
    reg := utilities.NewRegistration()
    
    reg.GetTime = func(ctx context.Context, payload *utilities.GetTimePayload) (*utilities.GetTimeResult, error) {
        return &utilities.GetTimeResult{
            Time: time.Now().Format("15:04:05"),
        }, nil
    }
    
    return rt.RegisterToolset(reg)
}
```

## Step 4: Setup Runtime ed Esegui

Metti tutto insieme:

```go
package main

import (
    "context"
    "log"

    "goa.design/goa-ai/features/model/bedrock"
    "goa.design/goa-ai/runtime/agent"
    helper "your-module/gen/assistant/agents/helper"
)

func main() {
    // Crea runtime
    rt, err := agent.NewRuntime(context.Background(), nil, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Setup model client (es., Bedrock)
    modelClient, err := bedrock.New(/* AWS config */, bedrock.Options{
        DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        MaxTokens:    1024,
    }, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Registra tool
    if err := registerTools(rt); err != nil {
        log.Fatal(err)
    }

    // Registra agente
    if err := helper.Register(rt, modelClient); err != nil {
        log.Fatal(err)
    }

    // Esegui il run dell'agente
    result, err := rt.Run(context.Background(), helper.AgentID, "Che ore sono adesso?")
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Risposta agente: %s", result.Reply)
}
```

## Prossimi Passi

- Aggiungi altri tool, esplora tipi payload e validazione
- Aggiungi `RetryHint` per gestire errori e retry
- Esplora gestione sessioni per contesto conversazionale
- Abilita streaming per aggiornamenti realtime in chat UI


