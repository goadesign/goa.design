---
title: Progettare un'API REST
linkTitle: Progettazione
weight: 1
description: "Impara a progettare un'API REST completa per la gestione di concerti usando Goa, incluse operazioni CRUD, paginazione, mappature HTTP appropriate e gestione degli errori."
---

Questo tutorial ti guida attraverso la progettazione di un'API REST per la gestione di concerti musicali usando Goa. Imparerai come creare un design API completo che include operazioni comuni, mappature HTTP appropriate e gestione degli errori.

## Cosa Costruiremo

Creeremo un servizio `concerts` che fornisce queste operazioni REST standard:

| Operazione | Metodo HTTP | Percorso | Descrizione |
|-----------|------------|------|-------------|
| List | GET | /concerts | Ottieni tutti i concerti con paginazione |
| Create | POST | /concerts | Aggiungi un nuovo concerto |
| Show | GET | /concerts/{id} | Ottieni un singolo concerto |
| Update | PUT | /concerts/{id} | Modifica un concerto |
| Delete | DELETE | /concerts/{id} | Rimuovi un concerto |

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

// Definizione del servizio
var _ = Service("concerts", func() {
  Description("Il servizio concerts gestisce i dati dei concerti musicali.")

  Method("list", func() {
    Description("Elenca i prossimi concerti con paginazione opzionale.")
    
    Payload(func() {
      Attribute("page", Int, "Numero di pagina", func() {
        Minimum(1)
        Default(1)
      })
      Attribute("limit", Int, "Elementi per pagina", func() {
        Minimum(1)
        Maximum(100)
        Default(10)
      })
    })

    Result(ArrayOf(Concert))

    HTTP(func() {
      GET("/concerts")

      // Parametri di query per la paginazione
      Param("page", Int, "Numero di pagina", func() {
        Minimum(1)
      })
      Param("limit", Int, "Numero di elementi per pagina", func() {
        Minimum(1)
        Maximum(100)
      })

      Response(StatusOK) // Non serve specificare il Body, viene dedotto dal Result
    })
  })

  Method("create", func() {
    Description("Crea una nuova voce concerto.")
    
    Payload(ConcertPayload)
    Result(Concert)

    HTTP(func() {
      POST("/concerts")
      Response(StatusCreated)
    })
  })

  Method("show", func() {
    Description("Ottieni un singolo concerto per ID.")
    
    Payload(func() {
      Attribute("concertID", String, "UUID del concerto", func() {
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
    Description("Aggiorna un concerto esistente per ID.")

    Payload(func() {
      Extend(ConcertPayload)
      Attribute("concertID", String, "ID del concerto da aggiornare.", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert, "Il concerto aggiornato.")

    Error("not_found", ErrorResult, "Concerto non trovato")

    HTTP(func() {
      PUT("/concerts/{concertID}")

      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("delete", func() {
    Description("Rimuovi un concerto dal sistema per ID.")

    Payload(func() {
      Attribute("concertID", String, "ID del concerto da rimuovere.", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Error("not_found", ErrorResult, "Concerto non trovato")

    HTTP(func() {
      DELETE("/concerts/{concertID}")

      Response(StatusNoContent)
      Response("not_found", StatusNotFound)
    })
  })
})

// Tipi di Dati
var ConcertPayload = Type("ConcertPayload", func() {
  Description("Dati necessari per creare/aggiornare un concerto.")

  Attribute("artist", String, "Artista/band che si esibisce", func() {
    MinLength(1)
    Example("The Beatles")
  })
  Attribute("date", String, "Data del concerto (YYYY-MM-DD)", func() {
    Pattern(`^\d{4}-\d{2}-\d{2}$`)
    Example("2024-01-01")
  })
  Attribute("venue", String, "Luogo del concerto", func() {
    MinLength(1)
    Example("The O2 Arena")
  })
  Attribute("price", Int, "Prezzo del biglietto (USD)", func() {
    Minimum(1)
    Example(100)
  })
})

var Concert = Type("Concert", func() {
  Description("Un concerto con tutti i suoi dettagli.")
  Extend(ConcertPayload)
  
  Attribute("id", String, "ID univoco del concerto", func() {
    Format(FormatUUID)
  })
  Required("id", "artist", "date", "venue", "price")
})

## Comprendere il Design

Per un riferimento completo di tutte le funzioni DSL utilizzate in questo tutorial, consulta
la [documentazione del DSL di Goa](https://pkg.go.dev/goa.design/goa/v3/dsl). Ogni
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
- Richieste `GET` per recuperare dati (elencare e mostrare concerti)
- `POST` per creare nuovi concerti
- `PUT` per aggiornare concerti esistenti
- `DELETE` per rimuovere concerti
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
- Tipi di errore con nomi che indicano chiaramente cosa è andato storto (es. "not_found")
- Codici di stato HTTP appropriati (404 per non trovato, 201 per creazione, ecc.)
- Formato di risposta degli errori consistente su tutti gli endpoint

#### Riutilizzo dei Tipi
Abbiamo strutturato i nostri tipi per evitare la duplicazione:
- `ConcertPayload` definisce i campi comuni necessari per creazione/aggiornamenti
- `Concert` estende `ConcertPayload` e aggiunge il campo ID
- Questo approccio garantisce consistenza tra i dati di input e quelli memorizzati

## Prossimi Passi

Ora che hai un design API completo, procedi al [Tutorial di Implementazione](./2-implementing)
per imparare come dare vita a questo design con la generazione di codice di Goa. 