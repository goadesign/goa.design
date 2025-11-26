---
title: "Installazione"
linkTitle: "Installazione"
weight: 1
description: "Installa Goa-AI e configura il tuo ambiente di sviluppo."
---

## Prerequisiti

Prima di installare Goa-AI, assicurati di avere:

- **Go 1.24+** installato e configurato
- **Goa v3.23.0+** CLI installato
- **Temporal** (opzionale, per workflow durevoli) - puoi usare l'engine in-memory per lo sviluppo

## Installa la CLI Goa

La CLI Goa è necessaria per generare codice dai tuoi design:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

Verifica l'installazione:

```bash
goa version
```

## Installa Goa-AI

Aggiungi Goa-AI al tuo modulo Go:

```bash
go get goa.design/goa-ai@latest
```

Oppure aggiungilo al tuo `go.mod`:

```bash
go get goa.design/goa-ai
```

## Opzionale: Setup Temporal

Per workflow durevoli in produzione, avrai bisogno di Temporal. Per lo sviluppo, puoi usare l'engine in-memory (nessun Temporal richiesto).

### Sviluppo (Engine In-Memory)

Il runtime usa un engine in-memory di default, così puoi iniziare a sviluppare immediatamente senza Temporal:

```go
rt := runtime.New() // Usa engine in-memory
```

### Produzione (Engine Temporal)

Per deployment in produzione, configura Temporal:

**Opzione 1: Docker (Quick Start)**

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Opzione 2: Temporalite (Sviluppo Locale)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Opzione 3: Temporal Cloud**

Registrati su [temporal.io](https://temporal.io) e configura il tuo client con le credenziali cloud.

## Verifica Installazione

Crea un semplice test per verificare che tutto funzioni:

```go
package main

import (
    "context"
    
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    // Runtime creato con successo
    _ = rt
}
```

Eseguilo:

```bash
go run main.go
```

Se questo viene eseguito senza errori, sei pronto per iniziare a costruire agenti!

## Prossimi Passi

Ora che hai Goa-AI installato, segui la guida [Il Tuo Primo Agente](./2-first-agent/) per creare il tuo primo agente.
