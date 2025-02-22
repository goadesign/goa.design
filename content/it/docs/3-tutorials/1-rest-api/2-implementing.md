---
title: Implementazione
weight: 2
description: "Guida passo-passo per implementare un servizio API REST in Goa, coprendo la generazione del codice, l'implementazione del servizio, la configurazione del server HTTP e il testing degli endpoint."
---

Dopo aver progettato la tua API REST con il DSL di Goa, è il momento di implementare il servizio. Questo tutorial ti guida attraverso il processo di implementazione passo dopo passo.

1. Generare il codice usando la CLI di Goa (`goa gen`)
2. Creare `main.go` per implementare il servizio e il server HTTP

## 1. Generare gli Artefatti Goa

Dalla radice del tuo progetto (es. `concerts/`), esegui il generatore di codice Goa:

```bash
goa gen concerts/design
```

{{< alert title="Contenuto Generato" color="primary" >}}
Questo comando analizza il tuo file di design (`design/concerts.go`) e produce una cartella `gen/` contenente:
- **Endpoint indipendenti dal trasporto** (in `gen/concerts/`)
- Codice di **validazione e marshalling HTTP** (in `gen/http/concerts/`) sia per server che per client
- Artefatti **OpenAPI** (in `gen/http/`)

**Nota:** Se modifichi il tuo design (es. aggiungi metodi o campi), riesegui `goa gen` per mantenere il codice generato sincronizzato.
{{< /alert >}}

## 2. Esplorare il Codice Generato

### `gen/concerts`
{{< alert title="Endpoint Indipendenti dal Trasporto" color="primary" >}}
Definisce i componenti principali del servizio indipendenti dal protocollo di trasporto:
- **Interfaccia del servizio** per l'implementazione della logica di business (`service.go`)
- Tipi **Payload** e **Result** che rispecchiano il tuo design
- Funzione **NewEndpoints** per l'iniezione dell'implementazione del servizio
- Funzione **NewClient** per la creazione del client del servizio
{{< /alert >}}

### `gen/http/concerts/server`
{{< alert title="Componenti del Server HTTP" color="primary" >}}
Contiene la logica specifica HTTP lato server:
- **Handler HTTP** che avvolgono gli endpoint del servizio
- Logica di **codifica/decodifica** per richieste e risposte
- **Routing delle richieste** ai metodi del servizio
- **Tipi specifici del trasporto** e validazione
- **Generazione dei percorsi** dalle specifiche del design
{{< /alert >}}

### `gen/http/concerts/client`
{{< alert title="Componenti del Client HTTP" color="primary" >}}
Fornisce funzionalità HTTP lato client:
- **Creazione del client** dagli endpoint HTTP
- **Codifica/decodifica** per richieste e risposte
- Funzioni di **generazione dei percorsi**
- **Tipi specifici del trasporto** e validazione
- **Funzioni helper CLI** per strumenti client
{{< /alert >}}

### `gen/http/openapi[2|3].[yaml|json]`
{{< alert title="Documentazione API" color="primary" >}}
Specifiche OpenAPI generate automaticamente:
- Disponibili sia in formato YAML che JSON
- Supporta OpenAPI 2.0 (Swagger) e 3.0
- Compatibile con Swagger UI e altri strumenti API
- Utile per l'esplorazione delle API e la generazione dei client
{{< /alert >}}

## 3. Implementare il Tuo Servizio

L'interfaccia del servizio generata in `gen/concerts/service.go` definisce i metodi che devi implementare:

```go
type Service interface {
    // List upcoming concerts with optional pagination.
    List(context.Context, *ListPayload) (res []*Concert, err error)
    // Create a new concert entry.
    Create(context.Context, *ConcertPayload) (res *Concert, err error)
    // Get a single concert by ID.
    Show(context.Context, *ShowPayload) (res *Concert, err error)
    // Update an existing concert by ID.
    Update(context.Context, *UpdatePayload) (res *Concert, err error)
    // Remove a concert from the system by ID.
    Delete(context.Context, *DeletePayload) (err error)
}
```

### Flusso di Implementazione

La tua implementazione deve:

1. Creare una struct del servizio che implementa l'interfaccia
2. Implementare tutti i metodi richiesti
3. Collegare tutto insieme con il server HTTP

Crea un file in `cmd/concerts/main.go` con la seguente implementazione:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"

    "github.com/google/uuid"
    goahttp "goa.design/goa/v3/http"

    genconcerts "concerts/gen/concerts"
    genhttp "concerts/gen/http/concerts/server"
)

// main istanzia il servizio e avvia il server HTTP.
func main() {
    // Istanzia il servizio
    svc := &ConcertsService{}

    // Avvolge il servizio negli endpoint generati
    endpoints := genconcerts.NewEndpoints(svc)

    // Costruisce un handler HTTP
    mux := goahttp.NewMuxer()
    requestDecoder := goahttp.RequestDecoder
    responseEncoder := goahttp.ResponseEncoder
    handler := genhttp.New(endpoints, mux, requestDecoder, responseEncoder, nil, nil)

    // Monta l'handler sul mux
    genhttp.Mount(mux, handler)

    // Crea un nuovo server HTTP
    port := "8080"
    server := &http.Server{Addr: ":" + port, Handler: mux}

    // Registra le route supportate
    for _, mount := range handler.Mounts {
        log.Printf("%q mounted on %s %s", mount.Method, mount.Verb, mount.Pattern)
    }

    // Avvia il server (questo bloccherà l'esecuzione)
    log.Printf("Starting concerts service on :%s", port)
    if err := server.ListenAndServe(); err != nil {
        log.Fatal(err)
    }
}

// ConcertsService implementa l'interfaccia genconcerts.Service
type ConcertsService struct {
    concerts []*genconcerts.Concert // Storage in memoria
}

// List elenca i concerti futuri con paginazione opzionale.
func (m *ConcertsService) List(ctx context.Context, p *genconcerts.ListPayload) ([]*genconcerts.Concert, error) {
    start := (p.Page - 1) * p.Limit
    end := start + p.Limit
    if end > len(m.concerts) {
        end = len(m.concerts)
    }
    return m.concerts[start:end], nil
}

// Create crea una nuova voce di concerto.
func (m *ConcertsService) Create(ctx context.Context, p *genconcerts.ConcertPayloadCreatePayload) (*genconcerts.Concert, error) {
    newConcert := &genconcerts.Concert{
        ID:     uuid.New().String(),
        Artist: p.Artist,
        Date:   p.Date,
        Venue:  p.Venue,
        Price:  p.Price,
    }
    m.concerts = append(m.concerts, newConcert)
    return newConcert, nil
}

// Show ottiene un singolo concerto per ID.
func (m *ConcertsService) Show(ctx context.Context, p *genconcerts.ShowPayload) (*genconcerts.Concert, error) {
    for _, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            return concert, nil
        }
    }
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concerto non trovato: %s", p.ConcertID))
}

// Update aggiorna un concerto esistente per ID.
func (m *ConcertsService) Update(ctx context.Context, p *genconcerts.UpdatePayload) (*genconcerts.Concert, error) {
    for i, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            if p.Artist != nil {
                concert.Artist = *p.Artist
            }
            if p.Date != nil {
                concert.Date = *p.Date
            }
            if p.Venue != nil {
                concert.Venue = *p.Venue
            }
            if p.Price != nil {
                concert.Price = *p.Price
            }
            m.concerts[i] = concert
            return concert, nil
        }
    }
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concerto non trovato: %s", p.ConcertID))
}

// Delete rimuove un concerto dal sistema per ID.
func (m *ConcertsService) Delete(ctx context.Context, p *genconcerts.DeletePayload) error {
    for i, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            m.concerts = append(m.concerts[:i], m.concerts[i+1:]...)
            return nil
        }
    }
    return genconcerts.MakeNotFound(fmt.Errorf("concerto non trovato: %s", p.ConcertID))
}
```

## 4. Esecuzione e Test

1. **Esegui** il servizio dalla radice del tuo progetto:
```bash
go run concerts/cmd/concerts
```

2. **Testa** gli endpoint con curl:
```bash
curl http://localhost:8080/concerts
```

Dopo la validazione con successo, procedi a [Esecuzione](./3-running.md) per testare il servizio con un client HTTP. 