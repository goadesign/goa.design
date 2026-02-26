---
title: Intercettatori
weight: 7
description: "Complete guide to interceptors and middleware in Goa - type-safe Goa interceptors, HTTP middleware, and gRPC interceptors."
llm_optimized: true
aliases:
---

Goa offre una soluzione completa per l'elaborazione delle richieste, che combina intercettori sicuri dal punto di vista tipologico e modelli di middleware tradizionali. Questa guida copre tutti e tre gli approcci.

## Panoramica

Quando si elaborano le richieste in un servizio Goa, si dispone di tre strumenti complementari:

1. **Intercettori Goa**: Accesso sicuro, controllato in tempo di compilazione, ai tipi di dominio del servizio
2. **Middleware HTTP**: Modello standard `http.Handler` per problemi specifici di HTTP
3. **Intercettori gRPC**: Modelli gRPC standard per esigenze specifiche di RPC

### Quando usare ciascuno

| Preoccupazione, strumento..
|---------|------|
| Convalida della logica di business | Intercettatori Goa |
| Trasformazione dei dati | Intercettatori Goa |
| Arricchimento delle richieste/risposte | Intercettatori Goa |
| Logging, tracing | HTTP/gRPC Middleware |
| Compressione, CORS | Middleware HTTP |
| Gestione dei metadati | Intercettatori gRPC |
| Limitazione della velocità | Middleware HTTP/gRPC |

---

## Intercettori Goa

Gli intercettori Goa forniscono un accesso sicuro ai tipi di dominio del servizio, con controlli in tempo di compilazione e metodi helper generati.

### Modello di runtime (codice generato)

Gli intercettori non sono “hook magici” del runtime. In Goa sono **wrapper di endpoint generati**. Il DSL indica quali campi un interceptor può leggere/scrivere e la generazione produce:

- **Contratto lato servizio** in `gen/<service>/service_interceptors.go`
  - interfaccia `ServerInterceptors`: un metodo per intercettore
  - struct `*<Interceptor>Info`: metadati servizio/metodo + accessori
  - interfacce di accesso `*Payload` / `*Result`: solo i campi dichiarati come leggibili/scrivibili
- **Contratto lato client** in `gen/<service>/client_interceptors.go`
  - interfaccia `ClientInterceptors` e i relativi tipi `*Info` + accessori
- **Catena di wrapper** in `gen/<service>/interceptor_wrappers.go`
  - `Wrap<Method>Endpoint` e `Wrap<Method>ClientEndpoint` per metodo
  - per lo streaming, wrapper di stream che intercettano `SendWithContext` / `RecvWithContext`
- **Wiring** in `gen/<service>/endpoints.go` e `gen/<service>/client.go`
  - `NewEndpoints` applica i wrapper server attorno agli endpoint del servizio
  - `NewClient` applica i wrapper client attorno agli endpoint di trasporto

La conseguenza importante è: **gli intercettori server vengono eseguiti dopo la decodifica del trasporto e prima del metodo del servizio**, e **gli intercettori client vengono eseguiti prima della codifica del trasporto e dopo la decodifica della risposta** (perché avvolgono la stessa astrazione di endpoint tipizzato chiamata dal tuo client).

### Contratto dell'intercettore server

Goa genera un’interfaccia per servizio. Ogni metodo dell’intercettore deve chiamare `next` esattamente una volta per proseguire (oppure ritornare errore/risposta prima):

```go
type ServerInterceptors interface {
    RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error)
}
```

In esecuzione tipicamente:

1. Usi `info.Payload()` / `info.Result(res)` per accesso **type-safe** (consigliato).
2. Usi `info.Service()`, `info.Method()` e `info.CallType()` per taggare log/metriche con identificatori stabili.
3. Chiami `next(ctx, info.RawPayload())` per continuare la catena.
4. Opzionalmente modifichi il payload prima di `next`, o il result dopo.

Esempio (arricchimento del result + timing):

```go
type Interceptors struct{}

func (i *Interceptors) RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error) {
    start := time.Now()

    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }

    r := info.Result(res)
    r.SetProcessedAt(time.Now().UTC().Format(time.RFC3339Nano))
    r.SetDuration(int(time.Since(start).Milliseconds()))

    return res, nil
}
```

Perché le interfacce di accesso sono importanti:

- Se dichiari `ReadPayload(Attribute("recordID"))`, Goa genera `RecordID() <type>`.
- Se dichiari `WriteResult(Attribute("cachedAt"))`, Goa genera `SetCachedAt(<type>)`.
- L’intercettore non può accedere a campi non dichiarati: è il contratto a compile-time.

### Contratto dell'intercettore client

Gli intercettori client sono lo stesso concetto lato client: avvolgono l’endpoint di trasporto che passi a `gen/<service>.NewClient(...)`.

In pratica:

- `info.RawPayload()` è il **payload tipizzato del metodo** (ad es. `*GetPayload`), non un `*http.Request`.
- Se “scrivi” sul payload nell’intercettore, l’endpoint di trasporto codificherà i cambiamenti (header/body/etc.) secondo i mapping del trasporto.
- Puoi usare `info.Result(res)` per leggere/scrivere campi del result dopo la decodifica della risposta.

### Ordine (cosa viene eseguito davvero per primo)

Gli intercettori vengono applicati generando una catena di wrapper. Il `Wrap<Method>Endpoint` generato è la fonte di verità dell’ordine.

Concettualmente, la generazione fa così:

```go
func WrapGetEndpoint(endpoint goa.Endpoint, i ServerInterceptors) goa.Endpoint {
    endpoint = wrapGetCache(endpoint, i)
    endpoint = wrapGetJWTAuth(endpoint, i)
    endpoint = wrapGetRequestAudit(endpoint, i)
    endpoint = wrapGetSetDeadline(endpoint, i)
    endpoint = wrapGetTraceRequest(endpoint, i)
    return endpoint
}
```

Ogni `wrap...` restituisce un nuovo endpoint che chiama l’intercettore con `next` che punta all’endpoint precedente. Quindi:

- **In ingresso (request)**: l’**ultimo** wrapper viene eseguito per primo.
- **In uscita (response)**: il **primo** wrapper viene eseguito per primo.

Se l’ordine conta, usa questo modello mentale invece di una regola generica: **guarda il wrap generato del metodo**.

### Intercettori streaming (Send/Recv)

Nel bidirectional streaming, la generazione avvolge lo stream per intercettare ogni invio/ricezione. Lo stesso intercettore può essere invocato con diversi tipi di chiamata:

- `goa.InterceptorUnary`: intercettazione una tantum della chiamata all’endpoint di stream
- `goa.InterceptorStreamingSend`: intercettazione di ogni `SendWithContext`
- `goa.InterceptorStreamingRecv`: intercettazione di ogni `RecvWithContext`

Usa `info.CallType()` se serve. In send, `info.RawPayload()` è il messaggio. In recv, il “payload” viene prodotto da `next` (il tuo intercettore lo vede come valore di ritorno).

### Definizione degli intercettori

```go
var RequestLogger = Interceptor("RequestLogger", func() {
    Description("Logs incoming requests and their timing")
    
    // Read status from result
    ReadResult(func() {
        Attribute("status")
    })
    
    // Add timing information to result
    WriteResult(func() {
        Attribute("processedAt")
        Attribute("duration")
    })
})
```

### Applicazione degli intercettori

Applicare a livello di servizio o di metodo:

```go
var _ = Service("calculator", func() {
    // Apply to all methods
    ServerInterceptor(RequestLogger)
    
    Method("add", func() {
        // Method-specific interceptor
        ServerInterceptor(ValidateNumbers)
        
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(func() {
            Attribute("sum", Int)
            Attribute("status", Int)
            Attribute("processedAt", String)
            Attribute("duration", Int)
        })
    })
})
```

### Implementazione degli intercettori

```go
func (i *Interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // Call next interceptor or endpoint
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Access result through type-safe interface
    r := info.Result(res)
    
    // Add timing information
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

## Modelli di accesso

#### Accesso in sola lettura

```go
var Monitor = Interceptor("Monitor", func() {
    Description("Collects metrics without modifying data")
    
    ReadPayload(func() {
        Attribute("size")
    })
    
    ReadResult(func() {
        Attribute("status")
    })
})
```

#### Accesso in scrittura

```go
var Enricher = Interceptor("Enricher", func() {
    Description("Adds context information")
    
    WritePayload(func() {
        Attribute("requestID")
    })
    
    WriteResult(func() {
        Attribute("processedAt")
    })
})
```

#### Accesso combinato

```go
var DataProcessor = Interceptor("DataProcessor", func() {
    Description("Processes both requests and responses")
    
    ReadPayload(func() {
        Attribute("rawData")
    })
    WritePayload(func() {
        Attribute("processed")
    })
    
    ReadResult(func() {
        Attribute("status")
    })
    WriteResult(func() {
        Attribute("enriched")
    })
})
```

### Intercettatori lato client

```go
var ClientContext = Interceptor("ClientContext", func() {
    Description("Enriches requests with client context")
    
    WritePayload(func() {
        Attribute("clientVersion")
        Attribute("clientID")
    })
    
    ReadResult(func() {
        Attribute("rateLimit")
        Attribute("rateLimitRemaining")
    })
})

var _ = Service("inventory", func() {
    ClientInterceptor(ClientContext)
    // ...
})
```

## Intercettatori di flusso

Per i metodi di streaming, utilizzare le varianti di streaming:

```go
var ServerProgressTracker = Interceptor("ServerProgressTracker", func() {
    Description("Adds progress to server stream responses")
    
    WriteStreamingResult(func() {
        Attribute("percentComplete")
        Attribute("itemsProcessed")
    })
})

var ClientMetadataEnricher = Interceptor("ClientMetadataEnricher", func() {
    Description("Enriches outgoing client stream messages")
    
    WriteStreamingPayload(func() {
        Attribute("clientTimestamp")
    })
})
```

### Ordine di esecuzione

Goa applica gli intercettori costruendo una catena di wrapper attorno all’endpoint di ciascun metodo. Il modo più semplice per capire l’ordine esatto (soprattutto quando mescoli intercettori a livello servizio e metodo) è guardare il `Wrap<Method>Endpoint` generato e ricordare che:

- **L’ultimo wrapper viene eseguito per primo** nel percorso di request.
- **Il primo wrapper viene eseguito per primo** nel percorso di response.

Se ti serve un contratto stabile, tratta il wrap generato come la specifica canonica dell’ordine per quel metodo.

---

## Middleware HTTP

Il middleware HTTP gestisce i problemi a livello di protocollo usando lo schema standard `http.Handler`.

### Stack di middleware comune

```go
mux := goahttp.NewMuxer()

// Add middleware (outermost to innermost)
mux.Use(debug.HTTP())                               // Debug logging
mux.Use(otelhttp.NewMiddleware("service"))          // OpenTelemetry
mux.Use(log.HTTP(ctx))                              // Request logging
mux.Use(goahttpmiddleware.RequestID())              // Request ID
mux.Use(goahttpmiddleware.PopulateRequestContext()) // Goa context
```

## Creazione di middleware personalizzato

```go
func ExampleMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Pre-processing
        start := time.Now()
        
        next.ServeHTTP(w, r)
        
        // Post-processing
        log.Printf("Request took %v", time.Since(start))
    })
}
```

## Middleware per le intestazioni di sicurezza

```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        
        next.ServeHTTP(w, r)
    })
}
```

### Middleware per l'arricchimento del contesto

```go
func ContextEnrichmentMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        ctx = context.WithValue(ctx, "request.start", time.Now())
        ctx = context.WithValue(ctx, "request.id", r.Header.Get("X-Request-ID"))
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Middleware per la gestione degli errori

```go
func ErrorHandlingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic recovered: %v", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

---

## Intercettori gRPC

gli intercettori gRPC gestiscono le problematiche a livello di protocollo per le chiamate RPC.

### Intercettori unari

```go
func LoggingInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        start := time.Now()
        
        resp, err := handler(ctx, req)
        
        log.Printf("Method: %s, Duration: %v, Error: %v",
            info.FullMethod, time.Since(start), err)
        
        return resp, err
    }
}
```

### Intercettatori di flusso

```go
func StreamLoggingInterceptor() grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        start := time.Now()
        
        err := handler(srv, ss)
        
        log.Printf("Stream: %s, Duration: %v, Error: %v",
            info.FullMethod, time.Since(start), err)
        
        return err
    }
}
```

## Integrazione con Goa

```go
func main() {
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            MetadataInterceptor(),
            LoggingInterceptor(),
            MonitoringInterceptor(),
        )),
        grpc.StreamInterceptor(grpc_middleware.ChainStreamServer(
            StreamMetadataInterceptor(),
            StreamLoggingInterceptor(),
        )),
    )

    pb.RegisterServiceServer(srv, server)
}
```

---

## Combinazione di tutti e tre

Ecco come i tre approcci funzionano insieme:

```go
func main() {
    // 1. Create service with Goa interceptors
    svc := NewService()
    interceptors := NewInterceptors(log.Default())
    endpoints := NewEndpoints(svc, interceptors)
    
    // 2. Set up HTTP with middleware
    mux := goahttp.NewMuxer()
    mux.Use(otelhttp.NewMiddleware("payment-svc"))
    mux.Use(debug.HTTP())
    mux.Use(log.HTTP(ctx))
    
    httpServer := genhttp.New(endpoints, mux, dec, enc, eh, eh)
    genhttp.Mount(mux, httpServer)
    
    // 3. Set up gRPC with interceptors
    grpcServer := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            grpc_recovery.UnaryServerInterceptor(),
            grpc_prometheus.UnaryServerInterceptor,
        )),
    )
    
    grpcSvr := gengrpc.New(endpoints, nil)
    genpb.RegisterPaymentServer(grpcServer, grpcSvr)
}
```

### Flusso di esecuzione

```
Request Processing:
─────────────────────────────────────────────────────────────────>
HTTP/gRPC Middleware → Goa Interceptors → Service Method

Response Processing:
<─────────────────────────────────────────────────────────────────
Service Method → Goa Interceptors → HTTP/gRPC Middleware
```

---

## Migliori pratiche

### Intercettatori Goa
- Da usare per la validazione della logica di business e la trasformazione dei dati
- Mantenere gli intercettori focalizzati su singole responsabilità
- Utilizzare modelli di accesso sicuri per i tipi

### Middleware HTTP
- Ordinare con cura il middleware (prima il panic recovery, poi il logging, ecc.)
- Precompilare oggetti costosi (regex, ecc.)
- Utilizzare sync.Pool per gli oggetti allocati frequentemente

### Intercettori gRPC
- Concentrarsi sui problemi a livello di protocollo
- Gestire correttamente la cancellazione del contesto
- Utilizzare codici di stato appropriati

### Generale
- Testare gli intercettori/middleware in isolamento
- Considerare l'impatto sulle prestazioni
- Documentare lo scopo di ogni intercettore

---

## Vedi anche

- [Riferimento DSL](dsl-reference/) - Definizioni del DSL degli intercettatori
- [Guida HTTP](http-guide/) - Modelli di middleware specifici per HTTP
- [Guida gRPC](grpc-guide/) - Modelli di intercettori gRPC
- [Documentazione di Clue](../3-ecosystem/clue/) - Intercettori e middleware di Observability
