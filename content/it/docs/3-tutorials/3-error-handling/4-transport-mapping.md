---
title: Mappare gli Errori sui Codici di Stato del Trasporto
linkTitle: Mappatura dei Trasporti
weight: 4
description: "Impara come mappare gli errori di Goa su appropriati codici di stato HTTP e gRPC, garantendo risposte di errore coerenti attraverso diversi protocolli di trasporto."
---

Una volta definiti i tuoi errori nel DSL di Goa, il passo successivo è mappare questi
errori su appropriati codici di stato specifici del trasporto. Questo assicura che i client
ricevano risposte significative e standardizzate basate sulla natura dell'errore.
Goa ti permette di definire queste mappature per diversi protocolli di trasporto, come
HTTP e gRPC, usando la funzione Response all'interno del DSL.

## Mappatura del Trasporto HTTP

Per i trasporti HTTP, usi la funzione HTTP all'interno delle tue definizioni di servizio o
metodo per mappare gli errori su specifici codici di stato HTTP. Questa mappatura assicura
che quando si verifica un errore, il client riceva una risposta HTTP con il corretto
codice di stato e le informazioni sull'errore.

Esempio

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZero è l'errore restituito quando il divisore è zero.")
    })

    HTTP(func() {
        // Mappa l'errore "DivByZero" su HTTP 400 Bad Request
        Response("DivByZero", StatusBadRequest)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("HasRemainder viene restituito quando una divisione intera ha un resto.")
        })

        HTTP(func() {
            // Mappa l'errore "HasRemainder" su HTTP 417 Expectation Failed
            Response("HasRemainder", StatusExpectationFailed)
        })

        // Definizioni aggiuntive del metodo...
    })

    Method("divide", func() {
        // Definizioni specifiche del metodo...
    })
})
```

In questo esempio:

- `DivByZero`: Mappato sul codice di stato HTTP 400 Bad Request.
- `HasRemainder`: Mappato sul codice di stato HTTP 417 Expectation Failed.

## Definire le Risposte

All'interno della funzione HTTP, usi la funzione Response per associare ogni errore
con un codice di stato HTTP. La sintassi è la seguente:

```go
Response("<NomeErrore>", <CodiceStatoHTTP>, func() {
    Description("<Descrizione opzionale>")
})
```

- `<NomeErrore>`: Il nome dell'errore come definito nel DSL.
- `<CodiceStatoHTTP>`: Il codice di stato HTTP su cui mappare l'errore.
- `Description`: (Opzionale) Una descrizione della risposta per scopi di documentazione.

## Esempio Completo di Mappatura HTTP

```go
var _ = Service("divider", func() {
    // Errori a livello di servizio
    Error("DivByZero", func() {
        Description("DivByZero è l'errore restituito quando il divisore è zero.")
    })

    HTTP(func() {
        // Mappature degli errori a livello di servizio
        Response("DivByZero", StatusBadRequest)           // 400
    })

    Method("integral_divide", func() {
        Description("Esegue la divisione intera e controlla i resti")
        
        Payload(func() {
            Field(1, "dividend", Int, "Numero da dividere")
            Field(2, "divisor", Int, "Numero per cui dividere")
            Required("dividend", "divisor")
        })
        Result(Int)

        Error("HasRemainder", func() {
            Description("HasRemainder viene restituito quando una divisione intera ha un resto.")
        })

        HTTP(func() {
            POST("/divide/integral")
            
            // Mappatura degli errori specifica del metodo
            Response("HasRemainder", StatusExpectationFailed, func() { // 417
                Description("Restituito quando la divisione risulta in un resto")
            })
        })
    })

    Method("divide", func() {
        Description("Esegue la divisione in virgola mobile")
        
        Payload(func() {
            Field(1, "dividend", Float64, "Numero da dividere")
            Field(2, "divisor", Float64, "Numero per cui dividere")
            Required("dividend", "divisor")
        })
        Result(Float64)

        Error("Overflow", func() {
            Description("Overflow viene restituito quando il risultato supera il valore massimo.")
        })

        HTTP(func() {
            POST("/divide")
            
            // Mappatura degli errori specifica del metodo
            Response("Overflow", StatusUnprocessableEntity, func() { // 422
                Description("Restituito quando il risultato della divisione supera il valore massimo")
            })
        })
    })
})
```

Questo esempio dimostra:

1. **Errori a Livello di Servizio**: Errori comuni che si applicano attraverso i metodi:
   - `DivByZero`: Quando si tenta di dividere per zero

2. **Errori Specifici del Metodo**: Ogni metodo definisce i propri errori specifici:
   - `integral_divide`: Gestisce i casi con resto
   - `divide`: Gestisce l'overflow in virgola mobile

3. **Mappatura dei Codici di Stato HTTP**:
   - 400 Bad Request: Per la divisione per zero
   - 417 Expectation Failed: Per la divisione intera con resto
   - 422 Unprocessable Entity: Per l'overflow in virgola mobile

4. **Endpoint Diversi**: Mostra la mappatura degli errori per due diverse operazioni di divisione:
   - `/divide/integral` per la divisione intera
   - `/divide` per la divisione in virgola mobile

Le mappature assicurano che ogni condizione di errore restituisca un codice di stato HTTP
appropriato che riflette accuratamente la natura dell'errore.

## Mappatura del Trasporto gRPC

Per i trasporti gRPC, usi la funzione GRPC all'interno delle tue definizioni di servizio o
metodo per mappare gli errori su specifici codici di stato gRPC. Questa mappatura assicura
che quando si verifica un errore, il client riceva una risposta gRPC con il corretto
codice di stato e le informazioni sull'errore.

Esempio

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZero è l'errore restituito quando il divisore è zero.")
    })

    GRPC(func() {
        // Mappa l'errore "DivByZero" sul codice di stato gRPC InvalidArgument (3)
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("HasRemainder viene restituito quando una divisione intera ha un resto.")
        })

        GRPC(func() {
            // Mappa l'errore "HasRemainder" sul codice di stato gRPC Unknown (2)
            Response("HasRemainder", CodeUnknown)
        })

        // Definizioni aggiuntive del metodo...
    })

    Method("divide", func() {
        // Definizioni specifiche del metodo...
    })
})
```

In questo esempio:

- `DivByZero`: Mappato sul codice di stato gRPC InvalidArgument (codice 3).
- `HasRemainder`: Mappato sul codice di stato gRPC Unknown (codice 2).

## Definire le Risposte

All'interno della funzione GRPC, usi la funzione Response per associare ogni errore
con un codice di stato gRPC. La sintassi è la seguente:

```go
Response("<NomeErrore>", Code<CodiceStato>, func() {
    Description("<Descrizione opzionale>")
})
```

- `<NomeErrore>`: Il nome dell'errore come definito nel DSL.
- `Code<CodiceStato>`: Il codice di stato gRPC su cui mappare l'errore, prefissato con Code.
- `Description`: (Opzionale) Una descrizione della risposta per scopi di documentazione.

## Combinare le Mappature HTTP e gRPC

Goa ti permette di definire sia mappature HTTP che gRPC all'interno dello stesso servizio o
metodo. Questo è particolarmente utile quando il tuo servizio supporta trasporti multipli,
assicurando che gli errori siano mappati appropriatamente indipendentemente dal protocollo di trasporto
utilizzato dal client.

Esempio

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZero viene restituito quando si tenta di dividere per zero.")
    })

    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Float64, "Numero da dividere")
            Field(2, "divisor", Float64, "Numero per cui dividere")
            Required("dividend", "divisor")
        })
        Result(Float64)

        HTTP(func() {
            POST("/divide")
            // Mappa la divisione per zero su HTTP 422 Unprocessable Entity
            Response("DivByZero", StatusUnprocessableEntity)
        })

        GRPC(func() {
            // Mappa la divisione per zero su INVALID_ARGUMENT
            Response("DivByZero", CodeInvalidArgument)
        })
    })
}) 