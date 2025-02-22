---
title: "Mappatura dei Trasporti"
linkTitle: "Mappatura dei Trasporti"
weight: 5
description: >
  Definisci come il tuo servizio comunica attraverso diversi protocolli di trasporto. Mappa i metodi del tuo servizio su endpoint HTTP e gRPC.
---

## Panoramica della Mappatura dei Trasporti

Goa supporta sia HTTP che gRPC. Il DSL di mappatura dei trasporti ti permette di definire come i metodi del tuo servizio sono esposti attraverso questi protocolli.

## Trasporto HTTP

Il [DSL HTTP](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP) definisce come i metodi del tuo servizio si mappano sugli endpoint HTTP. Puoi configurare questo su tre livelli:
- Livello API: Definisce le impostazioni HTTP globali
- Livello Servizio: Configura le proprietà HTTP a livello di servizio
- Livello Metodo: Specifica il comportamento HTTP specifico per metodo

### Livelli di Mappatura

#### Livello API
Definisce le impostazioni HTTP globali che si applicano a tutti i servizi:
```go
API("bookstore", func() {
    HTTP(func() {
        Path("/api/v1") // Prefisso globale per tutti gli endpoint
    })
})
```

#### Livello Servizio
Configura le proprietà HTTP per tutti i metodi in un servizio:
```go
Service("books", func() {
    HTTP(func() {
        Path("/books")     // Prefisso del percorso a livello di servizio
        Parent("store")    // Servizio padre per il nesting dei percorsi
    })
})
```

#### Livello Metodo
Definisce il comportamento HTTP specifico per i singoli metodi:
```go
Method("show", func() {
    HTTP(func() {
        GET("/{id}")       // Metodo HTTP e percorso
        Response(StatusOK) // Codice di risposta di successo
    })
})
```

### Funzionalità di Mappatura HTTP

Il DSL HTTP fornisce diverse funzionalità per configurare gli endpoint:

1. **Parametri del Percorso**
   - Mappa i campi del payload sui segmenti URL del percorso
   - Usa il pattern matching e la validazione
   - Supporta parametri opzionali

2. **Parametri Query**
   - Mappa i campi del payload sui parametri della query string
   - Definisce i tipi di parametri e la validazione
   - Gestisce parametri opzionali

3. **Header**
   - Mappa i campi del payload/risultato sugli header HTTP
   - Imposta header richiesti e opzionali
   - Definisce i formati degli header e la validazione

4. **Codici di Risposta**
   - Mappa i risultati sui codici di stato di successo
   - Definisce i codici di risposta di errore
   - Gestisce diversi scenari di risposta

## Trasporto gRPC

Il DSL gRPC definisce come i metodi del tuo servizio si mappano sulle procedure gRPC. Come HTTP, può essere configurato su più livelli.

### Funzionalità gRPC

1. **Mappatura dei Messaggi**
   - Definisce le strutture dei messaggi di richiesta/risposta
   - Mappa i campi sui tipi protobuf
   - Configura i numeri dei campi e le opzioni

2. **Codici di Stato**
   - Mappa i risultati del servizio sui codici di stato gRPC
   - Definisce le mappature dei codici di errore
   - Gestisce scenari standard di stato gRPC

3. **Metadata**
   - Configura la gestione dei metadata gRPC
   - Mappa gli header sui metadata
   - Definisce la validazione dei metadata

### Pattern Comuni

Ecco alcuni pattern comuni di mappatura dei trasporti:

#### Mappatura delle Risorse RESTful
```go
Service("users", func() {
    HTTP(func() {
        Path("/users")
    })
    
    Method("list", func() {
        HTTP(func() {
            GET("/")              // GET /users
        })
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")          // GET /users/{id}
        })
    })
})
```

#### Supporto per Protocolli Misti
I servizi possono supportare sia HTTP che gRPC:
```go
Method("create", func() {
    // Mappatura HTTP
    HTTP(func() {
        POST("/")
        Response(StatusCreated)
    })
    
    // Mappatura gRPC
    GRPC(func() {
        Response(CodeOK)
    })
})
```

## Migliori Pratiche

{{< alert title="Linee Guida per la Mappatura dei Trasporti" color="primary" >}}
**Design HTTP**
- Usa pattern URL consistenti
- Segui le convenzioni RESTful
- Scegli codici di stato appropriati
- Gestisci gli errori in modo consistente

**Design gRPC**
- Usa nomi di servizio significativi
- Definisci strutture dei messaggi chiare
- Segui le migliori pratiche protobuf
- Pianifica per la compatibilità all'indietro

**Suggerimenti Generali**
- Documenta il comportamento specifico del trasporto
- Considera le implicazioni di sicurezza
- Pianifica il versionamento
- Testa entrambi i livelli di trasporto
{{< /alert >}}

## Gestione degli Errori Specifica per Trasporto

Ogni protocollo di trasporto ha il suo modo di rappresentare gli errori:

### Errori HTTP
- Mappa sui codici di stato appropriati
- Includi i dettagli dell'errore nel corpo della risposta
- Usa header standard per informazioni aggiuntive
- Segui le convenzioni degli errori HTTP

### Errori gRPC
- Usa codici di stato gRPC standard
- Includi messaggi di errore dettagliati
- Sfrutta la funzionalità dei dettagli degli errori
- Segui il modello di errore gRPC 