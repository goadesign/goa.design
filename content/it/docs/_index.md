---
title: "Documentazione"
linkTitle: "Documentazione"
weight: 20
description: >
  Documentazione per Goa, un framework design-first per la creazione di microservizi e API in Go.
---

## Cos'è Goa?

Goa è un potente framework per la creazione di microservizi e API in Go. Adotta
un approccio design-first in cui descrivi il tuo servizio una volta, e Goa genera
il codice di implementazione, la documentazione e le librerie client.

Nel suo nucleo, Goa ti aiuta a:
* Definire il design della tua API come unica fonte di verità
* Generare codice server e client sia per HTTP che per gRPC
* Mantenere la documentazione sempre sincronizzata con l'implementazione
* Concentrarti sulla logica di business anziché sul codice ripetitivo

## Come Funziona Goa

![L'architettura a strati di Goa](/img/docs/layers.png)

Partendo da un singolo file di design, Goa genera:

1. Codice di Implementazione
    * Interfacce per servizi e client
    * Endpoint indipendenti dal trasporto
    * Gestori del layer di trasporto (HTTP/gRPC)
    * Codifica di richieste/risposte

2. Documentazione
    * Specifiche OpenAPI
    * Definizioni Protocol buffer

3. Codice di Supporto
    * Validazione degli input
    * Gestione degli errori
    * Librerie client

Devi solo implementare la logica di business nelle interfacce di servizio generate - Goa gestisce tutto il resto.

## Un Esempio Semplice
Ecco come appare la progettazione di un'API con Goa:

```go
var _ = Service("calculator", func() {
    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "Primo numero")
            Field(2, "b", Int, "Secondo numero")
            Required("a", "b")
        })
        Result(Int)

        HTTP(func() {
            GET("/add/{a}/{b}")
            Response(StatusOK)
        })
    })
})
```

Da questo design, Goa genera:

* Codice server con routing e gestione delle richieste
* Librerie client
* Documentazione OpenAPI
* Validazione degli input
* Interfacce type-safe

## Concetti Chiave

### Approccio Design-First
Goa ti incoraggia a pensare al design della tua API prima dell'implementazione. Il tuo
design diventa un contratto che sia i server che i client seguono, garantendo
coerenza tra i tuoi servizi.

### Architettura Pulita
Il codice generato segue un pattern di architettura pulita con strati distinti:
* Layer di Servizio: La tua logica di business
* Layer di Endpoint: Endpoint indipendenti dal trasporto
* Layer di Trasporto: Gestori HTTP/gRPC

Questa separazione rende facile mantenere e modificare i tuoi servizi quando i requisiti cambiano.

### Sicurezza dei Tipi
Goa sfrutta il sistema di tipi di Go per garantire che la tua implementazione corrisponda al tuo design:
```go
// Interfaccia generata
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// La tua implementazione
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

### Struttura del Progetto
Un tipico progetto Goa appare così:

```
├── design/         # Il tuo design API
├── gen/            # Codice generato
│   ├── calculator/ # Package del servizio
│   ├── http/       # Trasporto HTTP
│   └── grpc/       # Trasporto gRPC
└── calculator.go   # La tua implementazione
```

## Prossimi Passi

* Segui la [Guida Introduttiva](2-getting-started)
* Esplora i [Tutorial Base](3-tutorials)
* Unisciti alla community:
    * [Gophers Slack](https://gophers.slack.com/messages/goa)
    * [GitHub Discussions](https://github.com/goadesign/goa/discussions)
    * [Bluesky](https://bsky.social/goadesign) 