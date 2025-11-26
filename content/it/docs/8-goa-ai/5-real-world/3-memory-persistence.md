---
title: "Persistenza Memoria"
linkTitle: "Persistenza Memoria"
weight: 3
description: "Configura storage durevole per conversazioni e contesto in Goa-AI."
---

Goa-AI supporta storage durevole per sessioni, run e memoria, permettendo agli agenti di mantenere contesto tra interazioni.

## Interfacce Storage

Goa-AI definisce tre interfacce chiave per lo storage:

- **`session.Store`** – Persiste sessioni conversazionali
- **`run.Store`** – Persiste run individuali e i loro metadati
- **`memory.Store`** – Persiste memoria agente a lungo termine

## Esempio MongoDB

Goa-AI viene fornito con implementazioni MongoDB nel package `features/`:

```go
import (
    "goa.design/goa-ai/features/session/mongo"
    "goa.design/goa-ai/features/run/mongo"
    "goa.design/goa-ai/features/memory/mongo"
)

// Connetti a MongoDB
client, err := mongodb.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
if err != nil {
    log.Fatal(err)
}
db := client.Database("myapp")

// Crea store
sessionStore := sessionmongo.New(db)
runStore := runmongo.New(db)
memoryStore := memorymongo.New(db)

// Crea runtime con store
rt, err := agent.NewRuntime(ctx, &agent.RuntimeStores{
    Session: sessionStore,
    Run:     runStore,
    Memory:  memoryStore,
}, nil)
```

## Implementazione Custom

Puoi implementare ogni interfaccia store per fornire il tuo backend.

### session.Store

```go
type Store interface {
    Create(ctx context.Context, session *Session) error
    Get(ctx context.Context, id string) (*Session, error)
    Update(ctx context.Context, session *Session) error
    List(ctx context.Context, filter Filter) ([]*Session, error)
}
```

### run.Store

```go
type Store interface {
    Create(ctx context.Context, run *Record) error
    Get(ctx context.Context, id string) (*Record, error)
    Update(ctx context.Context, run *Record) error
    ListBySession(ctx context.Context, sessionID string) ([]*Record, error)
}
```

## Prossimi Passi

- Comprendi come questi concetti lavorano insieme in [Sessioni, Run e Memoria](./4-sessions-runs-memory.md)


