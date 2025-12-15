---
title: Guida HTTP
weight: 4
description: "Complete guide to HTTP transport in Goa - routing, content negotiation, WebSocket, SSE, CORS, and static content."
llm_optimized: true
aliases:
---

Questa guida copre le caratteristiche specifiche di HTTP in Goa, dal routing di base ad argomenti avanzati come lo streaming WebSocket e la negoziazione dei contenuti.

## Instradamento HTTP

### Instradamento di base

Le rotte vengono definite utilizzando la funzione `HTTP` all'interno di un servizio:

```go
var _ = Service("calculator", func() {
    HTTP(func() {
        Path("/calculator")  // Base path for all endpoints
    })

    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
        })
        Result(Int)
        HTTP(func() {
            POST("/add")  // POST /calculator/add
        })
    })
})
```

Goa supporta tutti i metodi HTTP standard: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`.

Un singolo metodo può gestire più metodi o percorsi HTTP:

```go
Method("manage_user", func() {
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // Create
        PUT("/users/{user_id}") // Update
        Response(StatusOK)
        Response(StatusCreated)
    })
})
```

### Parametri del percorso

Cattura i valori dinamici dall'URL:

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "user_id", String, "User ID")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // Maps to payload.UserID
    })
})
```

Mappare i nomi dei parametri dell'URL con i nomi dei campi del payload:

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "id", Int, "User ID")
    })
    HTTP(func() {
        GET("/users/{user_id:id}")  // URL uses user_id, maps to payload.ID
    })
})
```

### Parametri della query

Definire i parametri della query con la funzione `Param`:

```go
Method("list_users", func() {
    Payload(func() {
        Field(1, "page", Int, "Page number", func() {
            Default(1)
            Minimum(1)
        })
        Field(2, "per_page", Int, "Items per page", func() {
            Default(20)
            Minimum(1)
            Maximum(100)
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        Param("page")
        Param("per_page")
    })
})
```

### Caratteri jolly

Cattura tutti i segmenti di percorso rimanenti:

```go
Method("serve_files", func() {
    Payload(func() {
        Field(1, "path", String, "Path to file")
    })
    HTTP(func() {
        GET("/files/*path")  // Matches /files/docs/image.png
    })
})
```

### Relazioni di servizio

Utilizzare `Parent` per stabilire gerarchie di servizi:

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/users/{user_id}")
        CanonicalMethod("get")  // Override default "show"
    })
    
    Method("get", func() {
        Payload(func() {
            Field(1, "user_id", String)
        })
        HTTP(func() {
            GET("")  // GET /users/{user_id}
        })
    })
})

var _ = Service("posts", func() {
    Parent("users")  // Inherit parent's path
    
    Method("list", func() {
        // user_id inherited from parent
        HTTP(func() {
            GET("/posts")  // GET /users/{user_id}/posts
        })
    })
})
```

### Gerarchia dei prefissi dei percorsi

Combinare i prefissi a livello di API e di servizio:

```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // Global prefix
    })
})

var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1/users")  // Service prefix
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")  // Final: /api/v1/users/{id}
        })
    })
})
```

---

## Negoziazione del contenuto

### Codificatori integrati

Gli encoder predefiniti di Goa supportano:
- JSON (`application/json`, `*+json`)
- XML (`application/xml`, `*+xml`)
- Gob (`application/gob`, `*+gob`)
- HTML (`text/html`)
- Testo normale (`text/plain`)

Il tipo di contenuto della risposta è determinato da:
1. `Accept` intestazione
2. `Content-Type` header (se non c'è Accept)
3. Predefinito (JSON)

Imposta un tipo di contenuto di risposta predefinito:

```go
Method("create", func() {
    HTTP(func() {
        POST("/media")
        Response(StatusCreated, func() {
            ContentType("application/json")
        })
    })
})
```

### Codificatori personalizzati

Creare codificatori personalizzati per formati specializzati:

```go
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    enc.w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(enc.w).Encode(v)
}

func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

Registrare i codificatori personalizzati durante la creazione del server:

```go
func main() {
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r)
        }
    }
    
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w)
    }
    
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

---

## Integrazione WebSocket

> **Recapito della progettazione**: Lo streaming è definito a livello di progetto utilizzando `StreamingPayload` e `StreamingResult`. Il DSL è indipendente dal trasporto: lo stesso progetto funziona per HTTP (WebSocket/SSE) e gRPC. Si veda [DSL Reference: Streaming] (dsl-reference/#streaming) per i modelli di progettazione. Questa sezione tratta l'implementazione di WebSocket specifica per HTTP.

WebSocket consente la comunicazione bidirezionale in tempo reale. Goa implementa WebSocket attraverso il suo DSL di streaming.

### Modelli di streaming

**Streaming da client a server:**

```go
Method("listener", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    HTTP(func() {
        GET("/listen")  // WebSocket endpoints must use GET
    })
})
```

**Flusso da server a client:**

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "Update content")
        Field(2, "action", String, "Action type")
        Field(3, "timestamp", String, "When it happened")
        Required("message", "action", "timestamp")
    })
    HTTP(func() {
        GET("/subscribe")
    })
})
```

**Flusso bidirezionale:**

```go
Method("echo", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message to echo")
        Required("message")
    })
    StreamingResult(func() {
        Field(1, "message", String, "Echoed message")
        Required("message")
    })
    HTTP(func() {
        GET("/echo")
    })
})
```

### Implementazione di WebSocket

Implementazione lato server:

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

Gestione delle connessioni:

```go
type ConnectionManager struct {
    connections map[string]*ManagedConnection
    mu          sync.RWMutex
}

func (cm *ConnectionManager) AddConnection(id string, stream Stream) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.connections[id] = &ManagedConnection{
        ID:       id,
        Stream:   stream,
        LastPing: time.Now(),
    }
}
```

---

## Eventi inviati dal server

> **Ripresa della progettazione**: SSE utilizza `StreamingResult` a livello di progettazione con `ServerSentEvents()` nella mappatura HTTP. Vedere [DSL Reference: Streaming](dsl-reference/#streaming) per i modelli di progettazione.

SSE fornisce uno streaming unidirezionale da server a client su HTTP. È ideale per:
- Notifiche in tempo reale
- Feed di dati in tempo reale
- Aggiornamenti sullo stato di avanzamento
- Streaming di eventi

### Progettazione SSE

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("timestamp", Int, "Unix timestamp")
    Required("message", "timestamp")
})

var _ = Service("sse", func() {
    Method("stream", func() {
        StreamingResult(Event)
        HTTP(func() {
            GET("/events/stream")
            ServerSentEvents()  // Use SSE instead of WebSocket
        })
    })
})
```

Personalizzare gli eventi SSE:

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("type", String, "Event type")
    Attribute("id", String, "Event ID")
    Attribute("retry", Int, "Reconnection delay in ms")
    Required("message", "type", "id")
})

Method("stream", func() {
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSEEventData("message")
            SSEEventType("type")
            SSEEventID("id")
            SSEEventRetry("retry")
        })
    })
})
```

Gestione di Last-Event-Id per flussi riprendibili:

```go
Method("stream", func() {
    Payload(func() {
        Attribute("startID", String, "Last event ID received")
    })
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSERequestID("startID")  // Maps Last-Event-Id header
        })
    })
})
```

### Implementazione SSE

```go
func (s *Service) Stream(ctx context.Context, stream sse.StreamServerStream) error {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            event := &sse.Event{
                Message:   "Hello from server!",
                Timestamp: time.Now().Unix(),
            }
            if err := stream.Send(event); err != nil {
                return err
            }
        case <-ctx.Done():
            return nil
        }
    }
}
```

Browser client:

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

---

## Configurazione CORS

Il plugin CORS gestisce le richieste di origine incrociata. Importarlo:

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

CORS a livello di API:

```go
var _ = API("calc", func() {
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})
```

CORS a livello di servizio:

```go
var _ = Service("calc", func() {
    // Allow specific origin
    cors.Origin("localhost")

    // Allow subdomain pattern
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // Allow all origins
    cors.Origin("*")

    // Allow regex pattern
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

---

## Contenuto statico

> **Ripresa della progettazione**: Il servizio di file statici utilizza la funzione DSL `Files`. Si tratta di una funzione solo HTTP. Vedere [DSL Reference: Static Files] (dsl-reference/#static-files) per i modelli di progettazione.

Servite i file statici usando la funzione `Files`:

```go
var _ = Service("web", func() {
    // Serve files from a directory
    Files("/static/{*path}", "./public")
    
    // Serve a specific file
    Files("/favicon.ico", "./public/favicon.ico")
})
```

Per le applicazioni a pagina singola, servire l'index.html per tutti i percorsi:

```go
var _ = Service("spa", func() {
    // API endpoints
    Method("api", func() {
        HTTP(func() {
            GET("/api/data")
        })
    })
    
    // Serve SPA - catch-all for client-side routing
    Files("/{*path}", "./dist/index.html")
})
```

---

---

## Vedi anche

- [DSL di riferimento: Streaming](dsl-reference/#streaming) - Modelli di streaming a livello di progetto
- [DSL di riferimento: File statici](dsl-reference/#static-files) - DSL per contenuti statici
- [DSL di riferimento: Gestione degli errori](dsl-reference/#error-handling-design-level) - Definizione degli errori a livello di design
- [Guida gRPC](grpc-guide/) - Caratteristiche del trasporto gRPC
- [Guida alla gestione degli errori](error-handling/) - Modelli completi di gestione degli errori
- [Documentazione di Clue](../3-ecosystem/clue/) - Middleware HTTP per l'osservabilità

---

## Migliori pratiche

### Progettazione degli URL
- Utilizzare sostantivi per le risorse: `/articles`, non `/list-articles`
- Utilizzare in modo coerente i sostantivi plurali
- Lasciare che siano i metodi HTTP a definire le azioni
- Mantenere gli URL gerarchici e prevedibili

### Gestione degli errori
- Mappare gli errori con gli appropriati codici di stato HTTP
- Utilizzare formati di risposta agli errori coerenti
- Includere messaggi di errore significativi

### Prestazioni
- Utilizzare dimensioni di buffer appropriate per WebSocket
- Implementare il pooling delle connessioni per i servizi ad alto traffico
- Considerare il batching dei messaggi per gli endpoint di streaming

### Sicurezza
- Utilizzare sempre HTTPS in produzione
- Configurare CORS in modo appropriato
- Convalidare tutti i parametri di input
- Impostare timeout appropriati per le connessioni di lunga durata
