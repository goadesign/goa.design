---
title: "Setup Temporal"
linkTitle: "Setup Temporal"
weight: 1
description: "Configura Goa-AI con Temporal per esecuzione workflow agenti durevole."
---

Goa-AI usa [Temporal](https://temporal.io) per esecuzione agenti durevole e fault-tolerant. I workflow agenti possono sopravvivere a riavvii macchina, fallimenti di rete e operazioni di lunga durata.

## Perché Temporal

I workflow agenti possono coinvolgere:

- Multipli round-trip LLM
- Chiamate tool a servizi esterni
- Attesa di input o review umano

Temporal fornisce:

- **Durabilità**: I workflow sopravvivono a crash e riavvii server
- **Retry**: Retry automatici di attività fallite
- **Timeout**: Controllo fine dei timeout per attività e workflow
- **Osservabilità**: Visibilità completa sull'esecuzione dei workflow

## Setup Base

### 1. Crea il Worker

```go
package main

import (
    "log"

    "go.temporal.io/sdk/client"
    "go.temporal.io/sdk/worker"
    "goa.design/goa-ai/runtime/agent"
)

func main() {
    // Crea client Temporal
    c, err := client.Dial(client.Options{
        HostPort: "localhost:7233",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer c.Close()

    // Crea runtime
    rt, err := agent.NewRuntime(ctx, nil, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Registra agenti e tool...

    // Crea e avvia worker
    w := worker.New(c, "agent-task-queue", worker.Options{})
    
    // Registra workflow e attività runtime
    rt.RegisterTemporalWorker(w)
    
    if err := w.Run(worker.InterruptCh()); err != nil {
        log.Fatal(err)
    }
}
```

### 2. Avvia il Workflow

```go
// Dal codice client
workflowOptions := client.StartWorkflowOptions{
    ID:        "agent-run-" + runID,
    TaskQueue: "agent-task-queue",
}

we, err := c.ExecuteWorkflow(ctx, workflowOptions, rt.AgentWorkflow, input)
if err != nil {
    return err
}

// Ottieni risultato
var result agent.RunResult
if err := we.Get(ctx, &result); err != nil {
    return err
}
```

## Opzioni di Configurazione

```go
rt, err := agent.NewRuntime(ctx, nil, &agent.RuntimeConfig{
    Temporal: &agent.TemporalConfig{
        TaskQueue:          "my-agents",
        WorkflowTimeout:    time.Hour,
        ActivityTimeout:    time.Minute * 5,
        HeartbeatTimeout:   time.Second * 30,
    },
})
```

## Prossimi Passi

- Impara [UI Streaming](./2-streaming-ui.md) per consumare eventi realtime
- Esplora [Sessioni e Run](./4-sessions-runs-memory.md) per gestione stato workflow


