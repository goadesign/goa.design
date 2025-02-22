---
title: Progettare un'API REST
linkTitle: Progettazione
weight: 1
description: "Impara a progettare un'API REST completa per la gestione dei concerti utilizzando Goa, incluse le operazioni CRUD, la paginazione, le mappature HTTP appropriate e la gestione degli errori."
---

Questo tutorial ti guida attraverso la progettazione di un'API REST per la gestione dei concerti musicali utilizzando Goa. Imparerai come creare un design completo dell'API che include operazioni comuni, mappature HTTP appropriate e gestione degli errori.

## Cosa Costruiremo

Creeremo un servizio `concerts` che fornisce queste operazioni REST standard:

| Operazione | Metodo HTTP | Percorso | Descrizione |
|-----------|------------|------|-------------|
| Lista | GET | /concerts | Ottieni tutti i concerti con paginazione |
| Crea | POST | /concerts | Aggiungi un nuovo concerto |
| Mostra | GET | /concerts/{id} | Ottieni un singolo concerto |
| Aggiorna | PUT | /concerts/{id} | Modifica un concerto |
| Elimina | DELETE | /concerts/{id} | Rimuovi un concerto |

## Il File di Design

Prima creiamo un nuovo modulo Go per ospitare il nostro servizio.

```bash
mkdir concerts
cd concerts
go mod init concerts
```

Crea un nuovo file in `design/concerts.go` con il seguente contenuto:

```go
package design

import (
  . "goa.design/goa/v3/dsl"
)

// Service definition
var _ = Service("concerts", func() {
  Description("The concerts service manages music concert data.")

  Method("list", func() {
    Description("List upcoming concerts with optional pagination.")
    
    Payload(func() {
      Attribute("page", Int, "Page number", func() {
        Minimum(1)
        Default(1)
      })
      Attribute("limit", Int, "Items per page", func() {
        Minimum(1)
        Maximum(100)
        Default(10)
      })
    })

    Result(ArrayOf(Concert))

    HTTP(func() {
      GET("/concerts")

      // Query parameters for pagination
      Param("page", Int, "Page number", func() {
        Minimum(1)
      })
      Param("limit", Int, "Number of items per page", func() {
        Minimum(1)
        Maximum(100)
      })

      Response(StatusOK) // No need to specify the Body, it's inferred from the Result
    })
  })

  Method("create", func() {
    Description("Create a new concert entry.")
    
    Payload(ConcertPayload)
    Result(Concert)

    HTTP(func() {
      POST("/concerts")
      Response(StatusCreated)
    })
  })

  Method("show", func() {
    Description("Get a single concert by ID.")
    
    Payload(func() {
      Attribute("concertID", String, "Concert UUID", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert)
    Error("not_found")

    HTTP(func() {
      GET("/concerts/{concertID}")
      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("update", func() {
    Description("Update an existing concert by ID.")

    Payload(func() {
      Extend(ConcertPayload)
      Attribute("concertID", String, "ID of the concert to update.", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert, "The updated concert.")

    Error("not_found", ErrorResult, "Concert not found")

    HTTP(func() {
      PUT("/concerts/{concertID}")

      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("delete", func() {
    Description("Remove a concert from the system by ID.")

    Payload(func() {
      Attribute("concertID", String, "ID of the concert to remove.", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Error("not_found", ErrorResult, "Concert not found")

    HTTP(func() {
      DELETE("/concerts/{concertID}")

      Response(StatusNoContent)
      Response("not_found", StatusNotFound)
    })
  })
})

// Data Types
var ConcertPayload = Type("ConcertPayload", func() {
  Description("Data needed to create/update a concert.")

  Attribute("artist", String, "Performing artist/band", func() {
    MinLength(1)
    Example("The Beatles")
  })
  Attribute("date", String, "Concert date (YYYY-MM-DD)", func() {
    Pattern(`^\d{4}-\d{2}-\d{2}$`)
    Example("2024-01-01")
  })
  Attribute("venue", String, "Concert venue", func() {
    MinLength(1)
    Example("The O2 Arena")
  })
  Attribute("price", Int, "Ticket price (USD)", func() {
    Minimum(1)
    Example(100)
  })
})

var Concert = Type("Concert", func() {
  Description("A concert with all its details.")
  Extend(ConcertPayload)
  
  Attribute("id", String, "Unique concert ID", func() {
    Format(FormatUUID)
  })
  Required("id", "artist", "date", "venue", "price")
})
```

## Comprendere il Design

Per un riferimento completo di tutte le funzioni DSL utilizzate in questo tutorial, consulta la
[documentazione DSL di Goa](https://pkg.go.dev/goa.design/goa/v3/dsl). Ogni
funzione è documentata in modo approfondito con spiegazioni dettagliate ed esempi
pratici.

### 1. Struttura Base
Il design consiste in tre parti principali:
- Definizione del servizio (`Service("concerts")`)
- Metodi (`list`, `create`, `show`, ecc.)
- Tipi di dati (`Concert` e `ConcertPayload`)

### 2. Caratteristiche Chiave

#### Mappature HTTP
La nostra API segue le convenzioni RESTful con mappature HTTP intuitive:
- Richieste GET per recuperare dati (elenco e visualizzazione concerti)
- POST per creare nuovi concerti
- PUT per aggiornare concerti esistenti
- DELETE per rimuovere concerti
- Parametri di query (`page` e `limit`) gestiscono la paginazione
- Parametri di percorso catturano gli ID delle risorse (es. `/concerts/{concertID}`)

#### Validazione dei Dati
Goa fornisce una validazione integrata per garantire l'integrità dei dati:
- Gli ID dei concerti devono essere UUID validi
- I nomi degli artisti e delle location non possono essere vuoti
- Le date dei concerti devono seguire il formato YYYY-MM-DD
- I prezzi dei biglietti devono essere numeri positivi
- I parametri di paginazione hanno limiti sensati (es. max 100 elementi per pagina)

#### Gestione degli Errori
L'API gestisce gli errori in modo elegante con:
- Tipi di errore denominati che indicano chiaramente cosa è andato storto (es. "not_found")
- Codici di stato HTTP appropriati (404 per non trovato, 201 per creazione, ecc.)
- Formato di risposta degli errori coerente su tutti gli endpoint

#### Riutilizzo dei Tipi
Abbiamo strutturato i nostri tipi per evitare la duplicazione:
- `ConcertPayload` definisce i campi comuni necessari per creazione/aggiornamenti
- `Concert` estende `ConcertPayload` e aggiunge il campo ID
- Questo approccio garantisce coerenza tra i dati di input e quelli memorizzati

## Prossimi Passi

Ora che hai un design completo dell'API, procedi al [Tutorial di
Implementazione](./2-implementing) per imparare come dare vita a questo design con la
generazione del codice di Goa. 