---
title: "Codice Server e Client HTTP Generato"
linkTitle: "Codice HTTP"
weight: 5
description: "Scopri il codice HTTP generato da Goa, incluse le implementazioni server e client, il routing e la gestione degli errori."
---

La generazione del codice HTTP crea un'implementazione completa di client e server
che gestisce tutte le problematiche a livello di trasporto, inclusi il routing delle richieste,
la serializzazione dei dati, la gestione degli errori e altro. Questa sezione copre i componenti
chiave del codice HTTP generato.

## Implementazione del Server HTTP

Goa genera un'implementazione completa del server HTTP in
`gen/http/<nome del servizio>/server/server.go` che espone i metodi del servizio
utilizzando i percorsi e i verbi HTTP descritti nel design. L'implementazione del server
gestisce tutti i dettagli di rete, inclusi il routing delle richieste, la codifica
delle risposte e la gestione degli errori:

```go
// New istanzia gli handler HTTP per tutti gli endpoint del servizio calc utilizzando
// l'encoder e il decoder forniti. Gli handler vengono montati sul mux dato
// utilizzando il verbo e il percorso HTTP definiti nel design. errhandler viene chiamato
// ogni volta che una risposta non può essere codificata. formatter viene utilizzato per formattare gli errori
// restituiti dai metodi del servizio prima della codifica. Sia errhandler che
// formatter sono opzionali e possono essere nil.
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server
```

L'istanziazione del server HTTP richiede di fornire gli endpoint del servizio, un muxer
per instradare le richieste all'handler corretto, e funzioni di encoder e decoder per
serializzare e deserializzare i dati. Il server supporta anche la gestione degli errori
personalizzata e la formattazione (entrambi opzionali). Vedi [Servizi HTTP](../3-http-services)
per ulteriori informazioni sulla codifica HTTP, la gestione degli errori e la formattazione.

Goa genera anche una funzione helper che può essere utilizzata per montare il server HTTP
sul muxer:

```go
// Mount configura il mux per servire gli endpoint calc.
func Mount(mux goahttp.Muxer, h *Server) {
    MountAddHandler(mux, h.Add)
    MountMultiplyHandler(mux, h.Multiply)
}
```

Questo configura automaticamente il muxer per instradare le richieste all'handler corretto
basandosi sul verbo e il percorso HTTP definiti nel design.

La struct `Server` espone anche campi che possono essere utilizzati per modificare singoli
handler o applicare middleware a specifici endpoint:

```go
// Server elenca gli handler HTTP degli endpoint del servizio calc.
type Server struct {
    Mounts   []*MountPoint // Nomi dei metodi e verbo e percorso HTTP associati
    Add      http.Handler  // Handler HTTP per il metodo del servizio "add"
    Multiply http.Handler  // Handler HTTP per il metodo del servizio "multiply"
}
```

Il campo `Mounts` contiene metadati su tutti gli handler montati utili per
l'introspezione mentre i campi `Add` e `Multiply` espongono i singoli
handler per ogni metodo del servizio.

La struct `MountPoint` contiene il nome del metodo, il verbo HTTP e il percorso per ogni
handler. Questi metadati sono utili per l'introspezione e il debugging.

Infine la struct `Server` espone anche un metodo `Use` che può essere utilizzato per applicare
middleware HTTP a tutti i metodi del servizio:

```go
// Use applica il middleware dato a tutti gli handler HTTP del servizio "calc".
func (s *Server) Use(m func(http.Handler) http.Handler) {
    s.Add = m(s.Add)
    s.Multiply = m(s.Multiply)
}
```

Per esempio, puoi applicare un middleware di logging a tutti gli handler:

```go
// LoggingMiddleware è un esempio di middleware che registra ogni richiesta.
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("Ricevuta richiesta: %s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}

// Applica il middleware al server
server.Use(LoggingMiddleware)
```

#### Percorsi HTTP

Goa genera funzioni che possono restituire i percorsi HTTP per ogni metodo del servizio
dati i parametri richiesti. Per esempio, il metodo `Add` ha la seguente
funzione generata:

```go
// AddCalcPath restituisce il percorso URL all'endpoint HTTP add del servizio calc.
func AddCalcPath(a int, b int) string {
    return fmt.Sprintf("/add/%v/%v", a, b)
}
```

Tali funzioni possono essere utilizzate per generare URL per i metodi del servizio.

### Mettere Tutto Insieme

L'interfaccia del servizio e i livelli endpoint sono i blocchi fondamentali del tuo
servizio generato da Goa. Il tuo pacchetto main utilizzerà questi livelli per creare le
implementazioni server e client specifiche per il trasporto, permettendoti di eseguire il tuo
servizio e interagire con esso utilizzando HTTP:

```go
package main

import (
    "net/http"

    goahttp "goa.design/goa/v3/http"

    "github.com/<tuo username>/calc"
    gencalc "github.com/<tuo username>/calc/gen/calc"
    genhttp "github.com/<tuo username>/calc/gen/http/calc/server"
)

func main() {
    svc := calc.New()                      // La tua implementazione del servizio
    endpoints := gencalc.NewEndpoints(svc) // Crea gli endpoint del servizio
    mux := goahttp.NewMuxer()              // Crea il multiplexer delle richieste HTTP
    server := genhttp.New(                 // Crea il server HTTP
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)              
    genhttp.Mount(mux, server)             // Monta il server
    http.ListenAndServe(":8080", mux)      // Avvia il server HTTP
}
```

## Implementazione del Client HTTP

Goa genera anche un'implementazione completa del client HTTP che può essere utilizzata per
interagire con il servizio. Il codice client è generato nel pacchetto `client`
`gen/http/<nome del servizio>/client/client.go` e fornisce metodi che creano
endpoint Goa per ciascuno dei metodi del servizio. Questi endpoint possono a loro volta
essere racchiusi in implementazioni client agnostiche rispetto al trasporto utilizzando il codice
client endpoint generato in `gen/<nome del servizio>/client.go`:

La funzione `NewClient` generata nel pacchetto `client` HTTP crea un oggetto
che può essere utilizzato per creare endpoint client agnostici rispetto al trasporto:

```go  
// NewClient istanzia client HTTP per tutti i server del servizio calc.
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```

La funzione richiede lo schema del servizio (`http` o `https`), l'host
(es. `example.com`), e un client HTTP per effettuare le richieste. Il client
HTTP standard di Go soddisfa l'interfaccia `goahttp.Doer`.
`NewClient` richiede anche funzioni di encoder e decoder per serializzare e deserializzare
i dati. Il flag `restoreBody` indica se il corpo della risposta deve essere
ripristinato nell'oggetto Go `io.Reader` sottostante dopo la decodifica.

### Client HTTP

La struct `Client` istanziata espone campi per ciascuno degli endpoint
del servizio rendendo possibile sovrascrivere il client HTTP per specifici endpoint:

```go
// Client elenca i client HTTP degli endpoint del servizio calc.
type Client struct {
    // AddDoer è il client HTTP utilizzato per effettuare richieste all'endpoint
    // add.
    AddDoer goahttp.Doer

    // MultiplyDoer è il client HTTP utilizzato per effettuare richieste all'endpoint
    // multiply.
    MultiplyDoer goahttp.Doer

    // RestoreResponseBody controlla se i corpi delle risposte vengono ripristinati dopo
    // la decodifica in modo che possano essere letti di nuovo.
    RestoreResponseBody bool

    // Campi privati...
}
```

La struct espone anche metodi che costruiscono endpoint agnostici rispetto al trasporto:

```go
// Multiply restituisce un endpoint che effettua richieste HTTP al server
// multiply del servizio calc.
func (c *Client) Multiply() goa.Endpoint
```

### Mettere Tutto Insieme

Come descritto nella sezione [./4-client.md](Client), Goa genera
client agnostici rispetto al trasporto per ogni servizio. Questi client vengono inizializzati con
gli endpoint appropriati e possono essere utilizzati per effettuare richieste al servizio.

Ecco un esempio di come creare e utilizzare il client HTTP per il servizio `calc`:

```go
package main

import (
    "context"
    "log"
    "net/http"

    goahttp "goa.design/goa/v3/http"
    
    gencalc "github.com/<tuo username>/calc/gen/calc"
    genclient "github.com/<tuo username>/calc/gen/http/calc/client"
)

func main() {
    // Crea il client HTTP
    httpClient := genclient.NewClient(
        "http",                    // Schema
        "localhost:8080",          // Host
        http.DefaultClient,        // Client HTTP
        goahttp.RequestEncoder,    // Encoder delle richieste
        goahttp.ResponseDecoder,   // Decoder delle risposte
        false,                     // Non ripristinare il corpo della risposta
    )

    // Crea il client endpoint
    client := gencalc.NewClient(
        httpClient.Add(),          // Endpoint Add
        httpClient.Multiply(),     // Endpoint Multiply
    )

    // Chiama i metodi del servizio
    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("1 + 2 = %d", result)
}
```

Questo esempio mostra come:
1. Creare un client HTTP
2. Avvolgerlo in un client endpoint
3. Effettuare chiamate al servizio

Il client HTTP gestisce tutte le problematiche a livello di trasporto mentre il client endpoint
fornisce un'interfaccia pulita per effettuare chiamate al servizio. 