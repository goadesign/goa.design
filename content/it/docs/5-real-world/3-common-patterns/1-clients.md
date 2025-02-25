---
title: "Client dei Servizi"
weight: 1
---

# Scrivere Client dei Servizi

Quando si costruiscono microservizi, una sfida comune è come strutturare la
comunicazione tra i servizi. Questa sezione copre le best practice per scrivere
client per i servizi Goa, concentrandosi sulla creazione di implementazioni
manutenibili e testabili.

## Filosofia di Design dei Client

L'approccio raccomandato per costruire client per i servizi Goa segue questi principi chiave:

1. **Responsabilità Singola**: Creare un client per ogni servizio downstream, invece di una libreria client condivisa
2. **Interfacce Ristrette**: Definire interfacce che espongono solo i metodi necessari al servizio consumatore
3. **Indipendenza dall'Implementazione**: Supportare diversi protocolli di trasporto (gRPC, HTTP) dietro la stessa interfaccia
4. **Testabilità**: Abilitare un facile mocking per i test attraverso interfacce ben definite

Questo approccio aiuta a evitare la creazione di monoliti distribuiti dove i servizi
diventano strettamente accoppiati attraverso librerie client condivise.

## Struttura del Client

Un tipico client di servizio Goa consiste in:

1. Un'interfaccia client che definisce il contratto del servizio
2. Tipi di dati che rappresentano i modelli di dominio
3. Un'implementazione concreta che usa il client Goa generato
4. Funzioni factory per creare istanze del client

Vediamo un esempio completo di un client per un servizio di previsioni meteo:

```go
package forecaster

import (
    "context"

    "google.golang.org/grpc"

    "goa.design/clue/debug"
    genforecast "goa.design/clue/example/weather/services/forecaster/gen/forecaster"
    gengrpcclient "goa.design/clue/example/weather/services/forecaster/gen/grpc/forecaster/client"
)

type (
    // Client è un client per il servizio di previsioni.
    Client interface {
        // GetForecast ottiene la previsione per la posizione data.
        GetForecast(ctx context.Context, lat, long float64) (*Forecast, error)
    }

    // Forecast rappresenta la previsione per una data posizione.
    Forecast struct {
        // Location è la posizione della previsione.
        Location *Location
        // Periods sono le previsioni per la posizione.
        Periods []*Period
    }

    // Location rappresenta la posizione geografica di una previsione.
    Location struct {
        // Lat è la latitudine della posizione.
        Lat float64
        // Long è la longitudine della posizione.
        Long float64
        // City è la città della posizione.
        City string
        // State è lo stato della posizione.
        State string
    }

    // Period rappresenta un periodo di previsione.
    Period struct {
        // Name è il nome del periodo di previsione.
        Name string
        // StartTime è l'ora di inizio del periodo di previsione in formato RFC3339.
        StartTime string
        // EndTime è l'ora di fine del periodo di previsione in formato RFC3339.
        EndTime string
        // Temperature è la temperatura del periodo di previsione.
        Temperature int
        // TemperatureUnit è l'unità di temperatura del periodo di previsione.
        TemperatureUnit string
        // Summary è il riepilogo del periodo di previsione.
        Summary string
    }

    // client è l'implementazione del client.
    client struct {
        genc *genforecast.Client
    }
)

// New istanzia un nuovo client del servizio previsioni.
func New(cc *grpc.ClientConn) Client {
    c := gengrpcclient.NewClient(cc, grpc.WaitForReady(true))
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    return &client{genc: genforecast.NewClient(forecast)}
}

// GetForecast restituisce la previsione per la posizione data.
func (c *client) GetForecast(ctx context.Context, lat, long float64) (*Forecast, error) {
    res, err := c.genc.Forecast(ctx, &genforecast.ForecastPayload{Lat: lat, Long: long})
    if err != nil {
        return nil, err
    }
    l := Location(*res.Location)
    ps := make([]*Period, len(res.Periods))
    for i, p := range res.Periods {
        pval := Period(*p)
        ps[i] = &pval
    }
    return &Forecast{&l, ps}, nil
}
```

Analizziamo i componenti chiave:

### Interfaccia Client

L'interfaccia definisce il contratto che i consumatori useranno:

```go
type Client interface {
    GetForecast(ctx context.Context, lat, long float64) (*Forecast, error)
}
```

Questa interfaccia ristretta espone solo i metodi necessari ai consumatori, nascondendo
i dettagli implementativi e rendendo più facile la manutenzione e il testing.

### Tipi di Dominio

Il pacchetto client definisce i propri tipi di dominio (`Forecast`, `Location`,
`Period`) invece di esporre i tipi generati. Questo fornisce:

- Isolamento dai cambiamenti del codice generato
- Un'API più pulita e focalizzata
- Migliore controllo sul modello dati esposto

### Implementazione

L'implementazione concreta usa internamente il client Goa generato mentre
presenta l'interfaccia semplificata ai consumatori:

```go
type client struct {
    genc *genforecast.Client
}
```

### Funzione Factory

La funzione `New` istanzia il client con la configurazione appropriata
specifica del trasporto:

```go
func New(cc *grpc.ClientConn) Client {
    c := gengrpcclient.NewClient(cc, grpc.WaitForReady(true))
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    return &client{genc: genforecast.NewClient(forecast)}
}
```

## Client HTTP

Mentre l'esempio sopra mostra un client gRPC, i client HTTP seguono lo stesso
pattern ma con una diversa inizializzazione. Vediamo in dettaglio come funzionano
i client HTTP.

### Client HTTP Generato da Goa

Goa genera un'implementazione completa del client HTTP per il tuo servizio. Ecco
come appare un tipico client HTTP generato:

```go
// Client elenca i client HTTP degli endpoint del servizio.
type Client struct {
    // ForecastDoer è il client HTTP usato per fare richieste all'endpoint forecast.
    ForecastDoer goahttp.Doer

    // Campi di configurazione
    RestoreResponseBody bool
    scheme             string
    host               string
    encoder            func(*http.Request) goahttp.Encoder
    decoder            func(*http.Response) goahttp.Decoder
}

// NewClient istanzia client HTTP per tutti i server del servizio.
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client {
    return &Client{
        ForecastDoer:        doer,
        RestoreResponseBody: restoreBody,
        scheme:             scheme,
        host:               host,
        decoder:            dec,
        encoder:            enc,
    }
}

// Forecast restituisce un endpoint che fa richieste HTTP al server forecast del servizio.
func (c *Client) Forecast() goa.Endpoint {
    var (
        decodeResponse = DecodeForecastResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v any) (any, error) {
        req, err := c.BuildForecastRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        resp, err := c.ForecastDoer.Do(req)
        if err != nil {
            return nil, goahttp.ErrRequestError("front", "forecast", err)
        }
        return decodeResponse(resp)
    }
}
```

Il client generato fornisce:
- Un'interfaccia `Doer` per ogni endpoint che permette la personalizzazione del comportamento del client HTTP
- Codifica delle richieste e decodifica delle risposte integrate
- Builder di richieste e decoder di risposte specifici per endpoint
- Supporto per middleware attraverso l'interfaccia `Doer`

### Creare la Tua Interfaccia Client

Per creare un'interfaccia client pulita usando il client HTTP generato, scriveresti:

```go
func NewHTTP(doer goa.Doer) Client {
    // Crea il client HTTP generato
    c := genhttpclient.NewClient(
        "http",                    // schema
        "weather-service:8080",    // host
        doer,                      // client HTTP
        goahttp.RequestEncoder,    // encoder richieste
        goahttp.ResponseDecoder,   // decoder risposte
        false,                     // ripristina body risposta
    )

    // Crea endpoint usando il client generato
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    
    // Ritorna il client con l'endpoint configurato
    return &client{
        genc: genforecast.NewClient(forecast),
    }
}
```

## Best Practice

1. **Isolamento**:
   - Mantieni i client in pacchetti separati
   - Definisci interfacce specifiche per il consumatore
   - Evita dipendenze condivise tra client
   - Usa modelli di dominio specifici del client

2. **Configurazione**:
   - Rendi la configurazione del client flessibile
   - Supporta diversi protocolli di trasporto
   - Permetti la personalizzazione del comportamento
   - Usa valori di default sensati

3. **Gestione Errori**:
   - Definisci tipi di errore chiari
   - Fornisci contesto negli errori
   - Gestisci errori di rete e timeout
   - Implementa retry quando appropriato

4. **Testing**:
   - Scrivi test unitari per il client
   - Usa mock per le dipendenze
   - Testa scenari di errore
   - Verifica il comportamento di timeout

## Per Saperne di Più

Per maggiori informazioni sulla creazione di client:

- [Pacchetto Client di Goa](https://pkg.go.dev/goa.design/goa/v3/pkg/client)
  Documentazione completa del pacchetto client di Goa

- [Pattern di Comunicazione](https://microservices.io/patterns/communication-style)
  Pattern comuni per la comunicazione tra servizi

- [Gestione Errori Client](https://www.ardanlabs.com/blog/2020/07/error-handling-design.html)
  Best practice per la gestione degli errori nei client Go 