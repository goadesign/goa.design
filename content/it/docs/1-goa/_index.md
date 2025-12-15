---
title: "Struttura di Goa"
linkTitle: "Goa"
weight: 1
description: "Design-first API development with automatic code generation for Go microservices."
llm_optimized: true
content_scope: "Complete Goa Documentation"
aliases:
---

## Panoramica

Goa è un framework di progettazione per la costruzione di microservizi in Go. Definite la vostra API utilizzando il potente DSL di Goa e lasciate che Goa generi il codice di base, la documentazione e le librerie client.

### Caratteristiche principali

- **Progettazione prioritaria** - Definire l'API utilizzando un potente DSL prima di scrivere il codice di implementazione
- **Generazione di codice** - Generazione automatica di codice per server, client e documentazione
- **Sicurezza dei tipi** - Sicurezza dei tipi end-to-end dalla progettazione all'implementazione
- **Multi-Transport** - Supporto per HTTP e gRPC da un unico progetto
- **Validazione** - Convalida integrata delle richieste in base al vostro progetto
- **Documentazione** - Specifiche OpenAPI generate automaticamente

## Come funziona Goa

Goa segue un flusso di lavoro in tre fasi che separa la progettazione dell'API dall'implementazione, assicurando coerenza e riducendo il boilerplate.

{{< figure src="/images/diagrams/GoaWorkflow.svg" alt="Goa three-phase workflow: Design → Generate → Implement" class="img-fluid" >}}

### Fase 1: Progettazione (si scrive)

Nella fase di progettazione, si definisce l'API utilizzando il DSL di Goa in file Go (in genere in una cartella `design/`):

- **Tipi**: Definire strutture di dati con regole di validazione
- **Servizi**: Raggruppano i metodi correlati
- **Metodi**: Definire operazioni con payload e risultati
- **Trasporti**: Mappare i metodi agli endpoint HTTP e/o alle procedure gRPC
- **Sicurezza**: Definire schemi di autenticazione e autorizzazione

**Cosa si crea**: file `design/*.go` contenenti le specifiche dell'API come codice Go.

### Fase 2: Generazione (automatizzata)

Eseguire `goa gen` per generare automaticamente tutto il codice boilerplate:

```bash
goa gen myservice/design
```

**Cosa crea Goa** (nella cartella `gen/`):
- Impalcatura del server con instradamento e validazione delle richieste
- Librerie client sicure del tipo
- Specifiche OpenAPI/Swagger
- Definizioni del buffer di protocollo (per gRPC)
- Codificatori/decodificatori di trasporto

**Importante**: Non modificare mai i file in `gen/`: vengono rigenerati ogni volta che si esegue `goa gen`.

### Fase 3: implementazione (si scrive)

Scrivete la vostra logica aziendale implementando le interfacce di servizio generate:

```go
// service.go - You write this
type helloService struct{}

func (s *helloService) SayHello(ctx context.Context, p *hello.SayHelloPayload) (string, error) {
    return fmt.Sprintf("Hello, %s!", p.Name), nil
}
```

**Cosa si crea**: File di implementazione del servizio che contengono la logica aziendale effettiva.

### Cosa è scritto a mano e cosa è generato automaticamente

| L'utente scrive, Goa genera
|-----------|---------------|
| `design/*.go` - Definizioni API | `gen/` - Tutto il codice di trasporto |
| `service.go` - Logica di business | Specifiche OpenAPI |
| `cmd/*/main.go` - Avvio del server | Definizioni del buffer di protocollo |
| Test e middleware personalizzato | Convalida delle richieste |

## Guide alla documentazione

| Guida | Descrizione | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | Installa Goa e costruisci il tuo primo servizio | ~1,100 |
| [DSL Reference](dsl-reference/) | Riferimento completo per il linguaggio di progettazione di Goa | ~2,900 |
| [Code Generation](code-generation/) | Comprendere il processo di generazione del codice di Goa | ~2.100 |
| [Guida HTTP](http-guide/) | Caratteristiche del trasporto HTTP, routing e pattern | ~1.700 |
| [Guida gRPC](grpc-guide/) | Caratteristiche del trasporto gRPC e streaming | ~1,800 |
| [Gestione degli errori](error-handling/) | Definizione e gestione degli errori | ~1.800 |
| [Intercettatori](interceptors/) | Intercettatori e modelli di middleware | ~1.400 |
| [Produzione](production/) | Osservabilità, sicurezza e distribuzione | ~1.300 |

**Sezione totale:** ~14.500 gettoni

## Esempio rapido

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("hello", func() {
    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "Greeting message")
        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Generare ed eseguire:

```bash
goa gen hello/design
goa example hello/design
go run ./cmd/hello
```

## Iniziare

Iniziate con la guida [Quickstart](quickstart/) per installare Goa e creare il vostro primo servizio in pochi minuti.

Per una copertura completa del DSL, vedere [DSL Reference](dsl-reference/).
