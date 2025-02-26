---
title: "Negoziazione dei Contenuti"
linkTitle: "Negoziazione dei Contenuti"
weight: 1
description: "Impara come gestire tipi di contenuto multipli, elaborare gli header Accept e implementare encoder/decoder personalizzati nei servizi HTTP di Goa."
---

La negoziazione dei contenuti permette ai tuoi servizi HTTP di supportare molteplici
tipi e formati di contenuto. Goa fornisce una strategia flessibile di codifica e
decodifica che rende possibile associare encoder e decoder arbitrari ai tipi di
contenuto delle richieste e risposte HTTP.

## Costruzione del Server

Il costruttore del server HTTP generato accetta funzioni di encoder e decoder come
argomenti, permettendo implementazioni personalizzate:

```go
// New istanzia gli handler HTTP per tutti gli endpoint del servizio
func New(
    e *divider.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(context.Context, err error) goahttp.Statuser,
) *Server
```

L'encoder e il decoder predefiniti di Goa sono forniti dal pacchetto `http` di Goa e
possono essere utilizzati così:

```go
import (
    // ...
    "goa.design/goa/v3/http"
)

// ...

server := calcsvr.New(endpoints, mux, http.RequestDecoder, http.ResponseEncoder, nil, nil)
```

## Supporto dei Tipi di Contenuto

Il supporto dei tipi di contenuto in Goa determina come i dati vengono serializzati e
deserializzati attraverso il confine di rete. I ruoli di codifica e decodifica si
alternano tra client e server, in ordine di esecuzione:

- La codifica lato client prepara i corpi delle richieste da inviare
- La decodifica lato server elabora i corpi delle richieste in arrivo
- La codifica lato server gestisce i corpi delle risposte inviate ai client
- La decodifica lato client elabora i corpi delle risposte ricevute

### Encoder/Decoder Incorporati

Gli encoder e decoder predefiniti di Goa supportano diversi tipi di contenuto comuni.
Questi includono:
- JSON e varianti JSON (`application/json`, `*+json`)
- XML e varianti XML (`application/xml`, `*+xml`)
- Gob e varianti Gob (`application/gob`, `*+gob`)
- HTML (`text/html`)
- Testo semplice (`text/plain`)

Il pattern di corrispondenza dei suffissi permette varianti del tipo di contenuto, come
`application/ld+json`, `application/hal+json`, e `application/vnd.api+json`.

### Tipi di Contenuto delle Risposte

L'encoder di risposta predefinito implementa una strategia di negoziazione dei contenuti
che considera molteplici fattori in sequenza:

- Prima, esamina l'header `Accept` della richiesta in arrivo per determinare
  i tipi di contenuto preferiti dal client.
- Successivamente, guarda l'header `Content-Type` della richiesta se l'header Accept
  non è presente.
- Infine, ricade su un tipo di contenuto predefinito per la risposta se nessuno dei
  due header fornisce informazioni utilizzabili.

Sul lato server, l'encoder elabora l'header `Accept` del client per determinare le
preferenze del tipo di contenuto. Quindi seleziona l'encoder più appropriato in base
ai tipi supportati disponibili. Quando non viene trovata una corrispondenza adatta tra
i tipi accettati, l'encoder utilizza JSON come predefinito.

Per le operazioni lato client, il decoder elabora la risposta ricevuta in base al
tipo di contenuto specificato negli header della risposta. Quando incontra tipi di
contenuto sconosciuti, ricade in modo sicuro sulla decodifica JSON per mantenere la compatibilità.

### Tipi di Contenuto delle Richieste

La gestione del tipo di contenuto delle richieste segue un processo di negoziazione
più semplice rispetto alle risposte. Il processo si basa principalmente sull'header
`Content-Type` della richiesta, con un fallback su un tipo di contenuto predefinito
quando necessario.

Sul lato server, il decoder inizia ispezionando l'header `Content-Type` della richiesta.
In base a questo valore, seleziona l'implementazione del decoder appropriata—che sia
JSON, XML o gob. Nei casi in cui l'header `Content-Type` è mancante o specifica un
formato non supportato, il decoder utilizza JSON come predefinito per assicurare che
l'elaborazione della richiesta possa continuare.

Per le operazioni lato client, l'encoder imposta il tipo di contenuto in base alla
configurazione della richiesta e codifica il corpo della richiesta di conseguenza.
Quando non viene fornito un tipo di contenuto specifico, utilizza la codifica JSON
come predefinito per mantenere un comportamento coerente.

In tutti i casi, se la codifica o la decodifica fallisce, Goa invoca il gestore degli
errori che è stato registrato durante la creazione del server HTTP, permettendo una
gestione degli errori elegante e un feedback appropriato al client.

### Impostazione dei Tipi di Contenuto Predefiniti

Usa il DSL `ContentType` per specificare un tipo di contenuto predefinito per la risposta:

```go
var _ = Service("media", func() {
    Method("create", func() {
        HTTP(func() {
            POST("/media")
            Response(StatusCreated, func() {
                // Sovrascrive il tipo di contenuto della risposta
                ContentType("application/json")
            })
        })
    })
})
```

Quando impostato, questo sovrascrive qualsiasi tipo di contenuto specificato negli header
della richiesta, ma non il valore dell'header `Accept`.

## Encoder/Decoder Personalizzati

Quando gli encoder incorporati di Goa non soddisfano le tue esigenze, puoi implementare
encoder e decoder personalizzati. Potresti aver bisogno di encoder personalizzati per
supportare formati specializzati come MessagePack o BSON che non sono inclusi nelle
impostazioni predefinite di Goa. Sono anche utili quando hai bisogno di ottimizzare le
prestazioni di codifica per il tuo caso d'uso specifico, aggiungere livelli di
compressione o crittografia alle tue risposte, o mantenere la compatibilità con formati
legacy o proprietari utilizzati da sistemi esistenti.

### Creazione di un Encoder Personalizzato

Un encoder deve implementare l'interfaccia `Encoder` definita nel pacchetto `http` di
Goa e fornire una funzione costruttore:

```go
// Interfaccia Encoder per la codifica delle risposte
type Encoder interface {
    Encode(v any) error
}

// Funzione costruttore
func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

La funzione costruttore deve restituire un `Encoder` e un errore:

```go
// Firma del costruttore
func(ctx context.Context, w http.ResponseWriter) (goahttp.Encoder, error)

// Esempio di encoder MessagePack
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    // Imposta l'header del tipo di contenuto
    enc.w.Header().Set("Content-Type", "application/msgpack")
    
    // Usa la codifica MessagePack
    return msgpack.NewEncoder(enc.w).Encode(v)
}

// Funzione costruttore
func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

Il contesto contiene sia i valori `ContentTypeKey` che `AcceptTypeKey`, permettendo la
negoziazione del tipo di contenuto.

### Creazione di un Decoder Personalizzato

Un decoder deve implementare l'interfaccia `goahttp.Decoder` e fornire una funzione
costruttore:

```go
// Firma del costruttore
func(r *http.Request) (goahttp.Decoder, error)

// Esempio di decoder MessagePack
type MessagePackDecoder struct {
    r *http.Request
}

func (dec *MessagePackDecoder) Decode(v interface{}) error {
    return msgpack.NewDecoder(dec.r.Body).Decode(v)
}

// Funzione costruttore
func NewMessagePackDecoder(r *http.Request) goahttp.Decoder {
    return &MessagePackDecoder{r: r}
}
```

Il costruttore ha accesso all'oggetto request e può ispezionare il suo stato per
determinare il decoder appropriato.

### Registrazione di Encoder/Decoder Personalizzati

Usa il tuo encoder/decoder personalizzato quando crei il server HTTP:

```go
func main() {
    // Crea gli endpoint
    endpoints := myapi.NewEndpoints(svc)
    
    // Crea la factory del decoder
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r) // Decoder predefinito di Goa
        }
    }
    
    // Crea la factory dell'encoder
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w) // Encoder predefinito di Goa
    }
    
    // Crea il server HTTP con encoder/decoder personalizzati
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

### Migliori Pratiche per Encoder Personalizzati

1. **Gestione degli Errori**
   - Restituisci errori significativi quando la codifica/decodifica fallisce
   - Considera l'implementazione di tipi di errore personalizzati per fallimenti specifici
   - Gestisci correttamente i valori nil e i casi limite

2. **Prestazioni**
   - Considera il buffering per payload di grandi dimensioni
   - Implementa il pooling per oggetti frequentemente utilizzati
   - Profila e ottimizza i percorsi critici 