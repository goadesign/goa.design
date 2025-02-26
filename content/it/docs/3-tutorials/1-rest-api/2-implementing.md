---
title: Implementazione
weight: 2
description: "Guida passo-passo all'implementazione di un servizio API REST in Goa, che copre la generazione del codice, l'implementazione del servizio, la configurazione del server HTTP e il testing degli endpoint."
---

Dopo aver progettato la tua API REST con il DSL di Goa, è il momento di implementare il servizio. Questo tutorial ti guida attraverso il processo di implementazione passo dopo passo.

1. Generare il codice usando la CLI di Goa (`goa gen`)
2. Creare `main.go` per implementare il servizio e il server HTTP

## 1. Generare gli Artefatti Goa

Dalla radice del tuo progetto (es. `concerts/`), esegui il generatore di codice Goa:

```bash
goa gen concerts/design
```

Questo comando analizza il tuo file di design (`design/concerts.go`) e produce una cartella `gen/` contenente:
- **Endpoint indipendenti dal trasporto** (in `gen/concerts/`)
- Codice di validazione e marshalling **HTTP** (in `gen/http/concerts/`) sia per server che client
- Artefatti **OpenAPI** (in `gen/http/`)

**Nota:** Se modifichi il tuo design (es. aggiungi metodi o campi), riesegui `goa gen` per mantenere il codice generato sincronizzato.

## 2. Esplorare il Codice Generato

Esploriamo i componenti chiave del codice generato. Comprendere questi
file è cruciale per implementare correttamente il tuo servizio e sfruttare
appieno le funzionalità di Goa.

### gen/concerts

Definisce i componenti core del servizio indipendenti dal protocollo di trasporto:
- **Interfaccia del servizio** per l'implementazione della logica di business (`service.go`)
- Tipi **Payload** e **Result** che rispecchiano il tuo design
- Funzione **NewEndpoints** per l'iniezione dell'implementazione del servizio
- Funzione **NewClient** per la creazione del client del servizio

### gen/http/concerts/server

Contiene la logica lato server specifica per HTTP:
- **Handler HTTP** che avvolgono gli endpoint del servizio
- Logica di **codifica/decodifica** per richieste e risposte
- **Routing delle richieste** ai metodi del servizio
- **Tipi specifici del trasporto** e validazione
- **Generazione dei percorsi** dalle specifiche del design

### gen/http/concerts/client

Fornisce funzionalità HTTP lato client:
- **Creazione del client** dagli endpoint HTTP
- **Codifica/decodifica** per richieste e risposte
- Funzioni di **generazione dei percorsi**
- **Tipi specifici del trasporto** e validazione
- **Funzioni helper CLI** per strumenti client

### Specifiche OpenAPI

La directory `gen/http` contiene specifiche OpenAPI generate automaticamente:
- `openapi2.yaml` e `openapi2.json` (Swagger)
- `openapi3.yaml` e `openapi3.json` (OpenAPI 3.0)

Queste specifiche sono compatibili con Swagger UI e altri strumenti API, rendendole utili per l'esplorazione delle API e la generazione dei client.

## 3. Implementare il Tuo Servizio

L'interfaccia del servizio generata in `gen/concerts/service.go` definisce i metodi che devi implementare:

```go
type Service interface {
    // Elenca i prossimi concerti con paginazione opzionale.
    List(context.Context, *ListPayload) (res []*Concert, err error)
    // Crea una nuova voce concerto.
    Create(context.Context, *ConcertPayload) (res *Concert, err error)
    // Ottieni un singolo concerto per ID.
    Show(context.Context, *ShowPayload) (res *Concert, err error)
    // Aggiorna un concerto esistente per ID.
    Update(context.Context, *UpdatePayload) (res *Concert, err error)
    // Rimuovi un concerto dal sistema per ID.
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
        log.Printf("%q montato su %s %s", mount.Method, mount.Verb, mount.Pattern)
    }

    // Avvia il server (questo bloccherà l'esecuzione)
    log.Printf("Avvio del servizio concerti su :%s", port)
    if err := server.ListenAndServe(); err != nil {
        log.Fatal(err)
    }
}

// ConcertsService implementa l'interfaccia genconcerts.Service
type ConcertsService struct {
    concerts []*genconcerts.Concert // Storage in memoria
}

// Elenca i prossimi concerti con paginazione opzionale.
func (m *ConcertsService) List(ctx context.Context, p *genconcerts.ListPayload) ([]*genconcerts.Concert, error) {
    start := (p.Page - 1) * p.Limit
    end := start + p.Limit
    if end > len(m.concerts) {
        end = len(m.concerts)
    }
    return m.concerts[start:end], nil
}

// Crea una nuova voce concerto.
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

// Ottieni un singolo concerto per ID.
func (m *ConcertsService) Show(ctx context.Context, p *genconcerts.ShowPayload) (*genconcerts.Concert, error) {
    for _, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            return concert, nil
        }
    }
    // Usa l'errore progettato
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concerto non trovato: %s", p.ConcertID))
}

// Aggiorna un concerto esistente per ID.
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

// Rimuovi un concerto dal sistema per ID.
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

Congratulazioni! 🎉 Hai implementato con successo il tuo primo servizio Goa. Ora
è il momento della parte eccitante - vedere la tua API in azione! Passa a
[Esecuzione](./3-running.md) dove esploreremo diversi modi per interagire con
il tuo servizio e osservarlo gestire richieste HTTP reali. 