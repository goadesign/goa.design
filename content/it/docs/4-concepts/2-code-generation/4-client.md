---
title: "Client Generato"
linkTitle: "Client"
weight: 4
description: "Scopri il codice client generato da Goa, inclusi gli endpoint lato client e la struct client."
---

## Endpoint Goa

L'astrazione endpoint rappresenta un singolo metodo RPC nel tuo servizio. Un
endpoint può essere creato lato server per rappresentare un metodo che il servizio
implementa, o lato client per rappresentare un metodo che il client chiama. In entrambi
i casi, un endpoint può essere rappresentato dalla funzione `goa.Endpoint`.

## Client Endpoint

Continuando con il nostro esempio `calc`: Goa genera una struct client agnostica
rispetto al trasporto in `gen/calc/client.go`. Questa struct contiene gli endpoint lato client
e fornisce metodi tipizzati per effettuare richieste al servizio. Il codice client generato
appare così:

```go
// Client è il client del servizio "calc".
type Client struct {
        MultiplyEndpoint goa.Endpoint
        AddEndpoint      goa.Endpoint
}

// NewClient inizializza un client del servizio "calc" dati gli endpoint.
func NewClient(multiply, add goa.Endpoint) *Client {
        return &Client{
                AddEndpoint:      add,
                MultiplyEndpoint: multiply,
        }
}

// Add chiama l'endpoint "add" del servizio "calc".
func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
        var ires any
        ires, err = c.AddEndpoint(ctx, p)
        if err != nil {
                return
        }
        return ires.(int), nil
}

// Multiply chiama l'endpoint "multiply" del servizio "calc".
func (c *Client) Multiply(ctx context.Context, p *MultiplyPayload) (res int, err error) {
        var ires any
        ires, err = c.MultiplyEndpoint(ctx, p)
        if err != nil {
                return
        }
        return ires.(int), nil
}
```

La struct client contiene due campi, `AddEndpoint` e `MultiplyEndpoint`, che
rappresentano gli endpoint lato client per i metodi `add` e `multiply`. La
funzione `NewClient` inizializza la struct client con gli endpoint forniti.

Il codice specifico per il trasporto generato da Goa include metodi factory che creano
endpoint per il livello di trasporto. Questi metodi factory vengono utilizzati per inizializzare
la struct client con gli endpoint appropriati.

Consulta le sezioni [HTTP](./5-http.md) e [gRPC](./6-grpc.md) per maggiori informazioni
sulle implementazioni client specifiche per il trasporto. 