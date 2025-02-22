---
title: "Interfacce di Servizio ed Endpoint Generati"
linkTitle: "Interfacce di Servizio ed Endpoint"
weight: 3
description: "Scopri il codice generato da Goa, incluse le interfacce di servizio, gli endpoint e i livelli di trasporto."
---

## Interfacce di Servizio

Il primo componente che Goa genera è il livello di interfaccia del servizio. Questo
livello fondamentale definisce sia il contratto API che l'interfaccia di implementazione
del servizio. Include tutte le firme dei metodi che implementano i tuoi endpoint
API, complete di definizioni dei tipi di payload e risultato che specificano le
strutture dati utilizzate nelle operazioni del tuo servizio.

Per esempio, assumendo il seguente design:

```go
var _ = Service("calc", func() {
    Description("Il servizio calc fornisce operazioni per sommare e moltiplicare numeri.")
    Method("add", func() {
        Description("Add restituisce la somma di a e b")
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
    })
    Method("multiply", func() {
        Description("Multiply restituisce il prodotto di a e b")
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
    })
})
```

Basandosi su questo design, Goa genera un'interfaccia di servizio in
`gen/calc/service.go` che appare così:

```go
// Il servizio calc fornisce operazioni per sommare e moltiplicare numeri.
type Service interface {
    // Add restituisce la somma di a e b
    Add(context.Context, *AddPayload) (res int, err error)
    // Multiply restituisce il prodotto di a e b
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// AddPayload è il tipo di payload del metodo add del servizio calc.
type AddPayload struct {
    A int32
    B int32
}

// MultiplyPayload è il tipo di payload del metodo multiply del servizio calc.
type MultiplyPayload struct {
    A int32
    B int32
}
```

Goa genera anche costanti che possono essere utilizzate quando si configura il
servizio e lo stack di osservabilità, come il nome del servizio e i nomi dei metodi:

```go
// APIName è il nome dell'API come definito nel design.
const APIName = "calc"

// APIVersion è la versione dell'API come definita nel design.
const APIVersion = "0.0.1"

// ServiceName è il nome del servizio come definito nel design. Questo è lo
// stesso valore che viene impostato nei contesti delle richieste endpoint sotto la chiave
// ServiceKey.
const ServiceName = "calc"

// MethodNames elenca i nomi dei metodi del servizio come definiti nel design. Questi
// sono gli stessi valori che vengono impostati nei contesti delle richieste endpoint sotto la
// chiave MethodKey.
var MethodNames = [1]string{"multiply"}
```

## Livello Endpoint

Successivamente, Goa genera il livello endpoint in `gen/calc/endpoints.go`, questo livello
espone i metodi del servizio in modo agnostico rispetto al trasporto. Questo rende possibile
applicare middleware e altre funzionalità trasversali ai metodi del servizio:

```go
// Endpoints racchiude gli endpoint del servizio "calc".
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpoints racchiude i metodi del servizio "calc" con gli endpoint.
func NewEndpoints(s Service) *Endpoints {
   return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}
```

La struct `Endpoints` può essere inizializzata con l'implementazione del servizio e
utilizzata per creare le implementazioni server e client specifiche per il trasporto.

Goa genera anche implementazioni individuali degli endpoint che racchiudono i metodi
del servizio:

```go
// NewAddEndpoint restituisce un endpoint che invoca il metodo "add" del
// servizio "calc".
func NewAddEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req any) (any, error) {
        p := req.(*AddPayload)
        return s.Add(ctx, p)
    }
}
```

Questo pattern ti permette di applicare middleware a specifici endpoint o sostituirli
completamente con implementazioni personalizzate.

## Middleware Endpoint di Goa

Infine Goa genera una funzione `Use` che può essere utilizzata per applicare middleware a
tutti i metodi del servizio:

```go
// Use applica il middleware dato a tutti gli endpoint del servizio "calc".
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
```

E un middleware endpoint è una funzione che prende un endpoint e restituisce un nuovo
endpoint. L'implementazione può alterare il payload della richiesta e il risultato, modificare il
contesto, controllare gli errori e eseguire qualsiasi operazione che deve essere fatta prima
o dopo che l'endpoint viene invocato. Un endpoint Goa è definito nel pacchetto `goa`
come:

```go
// Endpoint espone i metodi del servizio ai client remoti indipendentemente dal
// trasporto sottostante.
type Endpoint func(ctx context.Context, req any) (res any, err error)
```

Per esempio il seguente middleware endpoint Goa registra la richiesta e la risposta:

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("richiesta: %v", req)
        res, err = next(ctx, req)
        log.Printf("risposta: %v", res)
        return
    }
}
```

Puoi applicare questo middleware agli endpoint del servizio usando:

```go
endpoints.Use(LoggingMiddleware)
``` 