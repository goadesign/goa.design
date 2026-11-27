---
title: "Clue"
weight: 3
description: "Strumentazione per microservizi Go — logging, tracing, metriche, health check e debug."
llm_optimized: true
---

Clue fornisce una strumentazione completa per microservizi Go basata su OpenTelemetry. Pur essendo progettata per integrarsi in modo nativo con Goa, Clue funziona con qualsiasi servizio Go HTTP o gRPC.

## Perché Clue?

Clue risolve un problema frequente nei microservizi: quando qualcosa va storto servono log dettagliati, ma registrare tutto in ogni momento ha un costo eccessivo.

L'approccio di Clue: **accumulare i messaggi di log in memoria e scriverli solo quando si verifica un errore o quando la richiesta è tracciata**. Le richieste andate a buon fine e non tracciate non producono alcun output di log; quando si verifica un errore, ottieni invece l'intero contesto che ha portato al guasto.

Questa singola scelta progettuale riduce drasticamente il volume dei log preservando tutte le informazioni necessarie per il debug.

{{< anchors "panoramica-del-pacchetto" >}}
## Panoramica dei pacchetti

| Pacchetto | Scopo |
|---------|---------|
| `clue` | Configurazione OpenTelemetry — un'unica chiamata per impostare metriche e tracing |
| `log` | Logging strutturato basato sul contesto con buffering intelligente |
| `health` | Endpoint di health check per Kubernetes e sistemi di orchestrazione |
| `debug` | Debug a runtime — attivazione dinamica dei log di debug ed endpoint pprof |
| `mock` | Generazione e configurazione di test double per le dipendenze |
| `interceptors` | Interceptor Goa per tracciare i singoli messaggi di uno stream |

## Installazione

Installa solo i pacchetti che ti servono:

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## Il pacchetto `log`

Il pacchetto `log` ruota attorno a `context.Context` di Go. Inizializzi una sola volta un contesto di logging e lo propaghi nell'applicazione; tutte le funzioni di log ricevono questo contesto come primo argomento.

### Avvio rapido

```go
import "goa.design/clue/log"

func main() {
    // Initialize the logging context
    ctx := log.Context(context.Background())
    
    // Log a message
    log.Printf(ctx, "server starting on port %d", 8080)
    
    // Log structured key-value pairs
    log.Print(ctx, log.KV{K: "event", V: "startup"}, log.KV{K: "port", V: 8080})
}
```

{{< anchors "comprendere-il-buffering" >}}
### Come funziona il buffering

Questa è la caratteristica centrale di Clue. Esistono due categorie di funzioni di log:

**Funzioni immediate** — scrivono subito sull'output:
- `Print()`, `Printf()` — scrivono sempre immediatamente
- `Error()`, `Errorf()` — scaricano il buffer e poi scrivono
- `Fatal()`, `Fatalf()` — scaricano il buffer, scrivono e terminano il processo

**Funzioni bufferizzate** — restano in memoria finché il buffer non viene scaricato:
- `Info()`, `Infof()` — mettono il messaggio nel buffer
- `Warn()`, `Warnf()` — mettono il messaggio nel buffer
- `Debug()`, `Debugf()` — scritte solo quando la modalità debug è attiva (scartate negli altri casi)

Il buffer viene scaricato automaticamente quando:
1. Viene chiamato `Error()` o `Fatal()`
2. La richiesta è tracciata (rilevato tramite lo span context di OpenTelemetry)
3. La modalità debug è abilitata

**Esempio: perché è utile**

```go
func HandleRequest(ctx context.Context, req *Request) error {
    log.Infof(ctx, "received request for user %s", req.UserID)  // buffered
    
    user, err := db.GetUser(ctx, req.UserID)
    if err != nil {
        // Error flushes the buffer - you see BOTH log lines
        log.Errorf(ctx, err, "failed to get user")
        return err
    }
    
    log.Infof(ctx, "user found: %s", user.Name)  // buffered
    
    // Request succeeds - no logs written (buffer discarded)
    return nil
}
```

Per una richiesta riuscita: **zero output di log**. Per una richiesta fallita: **contesto completo**.

{{< anchors "aggiunta-di-contesto-con-with" >}}
### Aggiungere contesto con `With()`

Arricchisci il contesto di logging man mano che la richiesta attraversa il servizio:

```go
func HandleOrder(ctx context.Context, orderID string) error {
    // Add order ID to all subsequent logs
    ctx = log.With(ctx, log.KV{K: "order_id", V: orderID})
    
    log.Info(ctx, log.KV{K: "msg", V: "processing order"})
    // Output includes: order_id=abc123 msg="processing order"
    
    return processPayment(ctx)
}

func processPayment(ctx context.Context) error {
    // order_id is already in context
    log.Info(ctx, log.KV{K: "msg", V: "charging card"})
    // Output includes: order_id=abc123 msg="charging card"
    return nil
}
```

### Coppie chiave-valore

Esistono due modi per specificare coppie chiave-valore:

```go
// KV - deterministic order, slice-backed
log.Print(ctx,
    log.KV{K: "user", V: "alice"},
    log.KV{K: "action", V: "login"},
    log.KV{K: "ip", V: "192.168.1.1"},
)

// Fields - map-backed, order not guaranteed
log.Print(ctx, log.Fields{
    "user":   "alice",
    "action": "login",
    "ip":     "192.168.1.1",
})
```

Usa `KV` quando l'ordine dei campi conta per la leggibilità. Usa `Fields` quando l'ordine non è rilevante.

I valori possono essere: stringhe, numeri, booleani, `nil` o slice di questi tipi.

{{< anchors "formati-dei-registri" >}}
### Formati di log

Clue rileva automaticamente i terminali e seleziona il formato appropriato:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (predefinito fuori dal terminale) — stile logfmt:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (predefinito su terminale) — colorato, con timestamp relativi:
```
INFO[0042] user=alice action=login
```

**FormatJSON** — JSON strutturato:
```json
{"time":"2024-01-15T10:30:00Z","level":"info","user":"alice","action":"login"}
```

**Formato personalizzato:**

```go
func myFormat(e *log.Entry) []byte {
    return []byte(fmt.Sprintf("[%s] %v\n", e.Severity, e.KeyVals))
}

ctx := log.Context(context.Background(), log.WithFormat(myFormat))
```

{{< anchors "aggiunta-degli-id-delle-tracce-e-degli-span" >}}
### Aggiungere ID di trace e span

Collega i log alle tracce distribuite:

```go
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON),
    log.WithFunc(log.Span),  // Adds trace_id and span_id to every log
)
```

Output:
```json
{"time":"...","level":"info","trace_id":"abc123","span_id":"def456","msg":"hello"}
```

{{< anchors "aggiunta-della-posizione-del-file" >}}
### Aggiungere la posizione nel file sorgente

Per il debug, aggiungi file sorgente e numero di riga:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

L'output include: `file=mypackage/handler.go:42`

### Middleware HTTP

Il middleware HTTP svolge due compiti:
1. Copia il logger dal contesto di base nel contesto di ciascuna richiesta
2. Registra inizio e fine della richiesta con metodo, URL, stato e durata

```go
func main() {
    ctx := log.Context(context.Background())
    
    handler := http.HandlerFunc(myHandler)
    handler = log.HTTP(ctx)(handler)  // Note: returns middleware, then apply
    
    http.ListenAndServe(":8080", handler)
}
```

**Opzioni:**

```go
// Skip logging for certain paths (e.g., health checks)
handler = log.HTTP(ctx, log.WithPathFilter(regexp.MustCompile(`^/healthz$`)))(handler)

// Disable request logging entirely (still sets up context)
handler = log.HTTP(ctx, log.WithDisableRequestLogging())(handler)

// Disable request ID generation
handler = log.HTTP(ctx, log.WithDisableRequestID())(handler)
```

{{< anchors "intercettori-grpc" >}}
### Interceptor gRPC

Per i server gRPC:

```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(log.UnaryServerInterceptor(ctx)),
    grpc.ChainStreamInterceptor(log.StreamServerInterceptor(ctx)),
)
```

Per i client gRPC:

```go
conn, err := grpc.Dial(addr,
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(log.StreamClientInterceptor()),
)
```

{{< anchors "registrazione-dei-client-http" >}}
### Logging del client HTTP

Avvolgi i trasporti HTTP per registrare le richieste in uscita:

```go
client := &http.Client{
    Transport: log.Client(http.DefaultTransport),
}

// With OpenTelemetry tracing
client := &http.Client{
    Transport: log.Client(
        otelhttp.NewTransport(http.DefaultTransport),
    ),
}
```

{{< anchors "integrazione-di-goa" >}}
### Integrazione con Goa

Aggiungi i nomi di servizio e metodo ai log:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

{{< anchors "personalizzazione-delle-chiavi-di-registro" >}}
### Personalizzare le chiavi dei log

Tutte le chiavi standard dei log sono variabili di pacchetto sovrascrivibili:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

{{< anchors "adattatore-per-altri-logger" >}}
### Adattatori per altri logger

```go
// Standard library log.Logger compatible
stdLogger := log.AsStdLogger(ctx)

// AWS SDK logger
awsLogger := log.AsAWSLogger(ctx)

// logr.LogSink (for Kubernetes controllers, etc.)
sink := log.ToLogrSink(ctx)

// Goa middleware logger
goaLogger := log.AsGoaMiddlewareLogger(ctx)
```

---

{{< anchors "il-pacchetto-di-indizi" >}}
## Il pacchetto `clue`

Il pacchetto `clue` configura OpenTelemetry con impostazioni predefinite sensate in una singola chiamata di funzione.

### Configurazione di base

```go
import (
    "goa.design/clue/clue"
    "goa.design/clue/log"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
)

func main() {
    ctx := log.Context(context.Background())
    
    // Create exporters
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
        otlpmetricgrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    
    // Configure OpenTelemetry
    cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
    if err != nil {
        log.Fatal(ctx, err)
    }
    clue.ConfigureOpenTelemetry(ctx, cfg)
}
```

### Campionamento adattivo

Clue include un campionatore adattivo che regola automaticamente la frequenza di campionamento in base al volume di traffico, evitando di saturare lo storage delle tracce durante i picchi.

Impostazioni predefinite:
- **Frequenza massima di campionamento:** 2 tracce al secondo
- **Dimensione del campione:** 10 richieste tra un adeguamento e il successivo

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

{{< anchors "funzioni-di-esportazione-degli-helper" >}}
### Funzioni helper per gli exporter

Clue fornisce funzioni helper che creano gli exporter gestendo correttamente lo shutdown:

```go
// gRPC exporters
metricExporter, shutdown, err := clue.NewGRPCMetricExporter(ctx,
    otlpmetricgrpc.WithEndpoint("localhost:4317"))
defer shutdown()

spanExporter, shutdown, err := clue.NewGRPCSpanExporter(ctx,
    otlptracegrpc.WithEndpoint("localhost:4317"))
defer shutdown()

// HTTP exporters
metricExporter, shutdown, err := clue.NewHTTPMetricExporter(ctx,
    otlpmetrichttp.WithEndpoint("localhost:4318"))
defer shutdown()

spanExporter, shutdown, err := clue.NewHTTPSpanExporter(ctx,
    otlptracehttp.WithEndpoint("localhost:4318"))
defer shutdown()
```

### Opzioni di configurazione

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),
    clue.WithSampleSize(50),
    clue.WithReaderInterval(30 * time.Second),  // Metric export interval
    clue.WithPropagators(propagation.TraceContext{}),  // Custom propagators
    clue.WithResource(resource.NewWithAttributes(...)),  // Additional resource attributes
    clue.WithErrorHandler(myErrorHandler),
)
```

{{< anchors "disabilitazione-delle-metriche-o-del-tracciamento" >}}
### Disabilitare metriche o tracing

Passa `nil` per l'exporter che non ti serve:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

{{< anchors "il-pacchetto-salute" >}}
## Il pacchetto `health`

Il pacchetto `health` crea endpoint di health check che riportano lo stato delle dipendenze del servizio.

### Uso di base

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

{{< anchors "verifica-delle-dipendenze" >}}
### Verificare le dipendenze HTTP

Usa `NewPinger` per sondare i servizi HTTP a monte che espongono un endpoint di salute `/livez` (o personalizzato; per database SQL o Redis implementa invece l'interfaccia `Pinger` a due metodi mostrata più sotto):

```go
checker := health.NewChecker(
    health.NewPinger("orders-service", "orders.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("inventory-service", "inventory.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https"), health.WithTimeout(5*time.Second)),
)
```

**Opzioni del Pinger:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

{{< anchors "controlli-sanitari-personalizzati" >}}
### Health check personalizzati

Implementa l'interfaccia `Pinger` per verifiche personalizzate:

```go
type DBChecker struct {
    db *sql.DB
}

func (c *DBChecker) Name() string {
    return "postgresql"
}

func (c *DBChecker) Ping(ctx context.Context) error {
    return c.db.PingContext(ctx)
}

// Usage
checker := health.NewChecker(&DBChecker{db: db})
```

### Formato della risposta

L'handler restituisce JSON per impostazione predefinita, oppure XML se richiesto:

**Sano (HTTP 200):**
```json
{
    "uptime": 3600,
    "version": "abc123",
    "status": {
        "postgresql": "OK",
        "redis": "OK"
    }
}
```

**Non sano (HTTP 503):**
```json
{
    "uptime": 3600,
    "version": "abc123",
    "status": {
        "postgresql": "OK",
        "redis": "NOT OK"
    }
}
```

Imposta la versione in fase di build:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## Il pacchetto `debug`

Il pacchetto `debug` abilita la diagnostica a runtime senza ridistribuire il servizio.

{{< anchors "registrazione-dinamica-del-debug" >}}
### Logging di debug dinamico

Monta un endpoint per attivare o disattivare i log di debug a runtime:

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Controlla i log di debug via HTTP:

```bash
# Check current state
curl http://localhost:8080/debug
# {"debug-logs":"off"}

# Enable debug logging
curl "http://localhost:8080/debug?debug-logs=on"
# {"debug-logs":"on"}

# Disable debug logging
curl "http://localhost:8080/debug?debug-logs=off"
# {"debug-logs":"off"}
```

**Importante:** L'endpoint modifica soltanto un flag; affinché abbia effetto sulle richieste devi registrare il middleware di debug:

```go
// For HTTP servers
handler = debug.HTTP()(handler)

// For gRPC servers
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(debug.UnaryServerInterceptor()),
    grpc.ChainStreamInterceptor(debug.StreamServerInterceptor()),
)
```

**Opzioni:**

```go
debug.MountDebugLogEnabler(mux,
    debug.WithPath("/api/debug"),     // Default: "/debug"
    debug.WithQuery("logging"),        // Default: "debug-logs"
    debug.WithOnValue("enable"),       // Default: "on"
    debug.WithOffValue("disable"),     // Default: "off"
)
```

{{< anchors "endpoint-di-pprof" >}}
### Endpoint pprof

Monta gli endpoint di profilazione di Go:

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Endpoint disponibili:
- `/debug/pprof/` — Pagina indice
- `/debug/pprof/heap` — Profilo heap
- `/debug/pprof/goroutine` — Profilo goroutine
- `/debug/pprof/profile` — Profilo CPU (30s predefiniti)
- `/debug/pprof/trace` — Traccia di esecuzione
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, ecc.

⚠️ **Avvertenza di sicurezza:** Non esporre pubblicamente gli endpoint pprof: rivelano dettagli interni sensibili dell'applicazione.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

{{< anchors "registrazione-del-carico-utile-per-goa" >}}
### Logging dei payload per Goa

Registra i payload di richiesta e risposta quando il debug è attivo:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())  // Only logs when debug enabled
endpoints.Use(log.Endpoint)
```

**Opzioni:**

```go
debug.LogPayloads(
    debug.WithMaxSize(2048),  // Max bytes to log, default: 1024
    debug.WithFormat(debug.FormatJSON),  // Custom formatter
    debug.WithClient(),  // Prefix keys with "client-" for client-side logging
)
```

{{< anchors "adattatore-goa-muxer" >}}
### Adattatore per il muxer di Goa

Per il muxer HTTP di Goa:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## Il pacchetto `mock`

Il pacchetto `mock` aiuta a costruire test double per le dipendenze, supportando sequenze ordinate di chiamate e mock permanenti.

### Concetti

**Sequenze:** Definiscono le chiamate attese in ordine. Ogni chiamata a `Next()` restituisce la funzione successiva nella sequenza.

**Mock permanenti:** Restituiscono sempre la stessa funzione; vengono usati una volta esaurita la sequenza o quando l'ordine delle chiamate non conta.

### Creare un mock

```go
type MockUserService struct {
    *mock.Mock
    t *testing.T
}

func NewMockUserService(t *testing.T) *MockUserService {
    return &MockUserService{mock.New(), t}
}

func (m *MockUserService) GetUser(ctx context.Context, id string) (*User, error) {
    if f := m.Next("GetUser"); f != nil {
        return f.(func(context.Context, string) (*User, error))(ctx, id)
    }
    m.t.Error("unexpected GetUser call")
    return nil, errors.New("unexpected call")
}

func (m *MockUserService) AddGetUser(f func(context.Context, string) (*User, error)) {
    m.Add("GetUser", f)
}

func (m *MockUserService) SetGetUser(f func(context.Context, string) (*User, error)) {
    m.Set("GetUser", f)
}
```

{{< anchors "utilizzo-dei-mock-nei-test" >}}
### Usare i mock nei test

```go
func TestOrderService(t *testing.T) {
    userMock := NewMockUserService(t)
    
    // Add sequence: first call returns user, second returns error
    userMock.AddGetUser(func(ctx context.Context, id string) (*User, error) {
        return &User{ID: id, Name: "Alice"}, nil
    })
    userMock.AddGetUser(func(ctx context.Context, id string) (*User, error) {
        return nil, errors.New("not found")
    })
    
    svc := NewOrderService(userMock)
    
    // First call succeeds
    _, err := svc.CreateOrder(ctx, "user1", items)
    require.NoError(t, err)
    
    // Second call fails
    _, err = svc.CreateOrder(ctx, "user2", items)
    require.Error(t, err)
    
    // Verify all expected calls were made
    if userMock.HasMore() {
        t.Error("not all expected calls were made")
    }
}
```

### Mock permanenti

Usa `Set()` per chiamate che devono comportarsi sempre allo stesso modo:

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Le sequenze hanno la precedenza sui mock permanenti. Una volta esaurita la sequenza, `Next()` restituisce il mock permanente.

### Generatore di mock (`cmg`)

Genera automaticamente i mock a partire dalle interfacce Go:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

I mock generati vengono scritti in una sottodirectory `mocks/` accanto al file sorgente.

---

{{< anchors "il-pacchetto-di-intercettori" >}}
## Il pacchetto `interceptors`

Il pacchetto `interceptors` fornisce interceptor Goa per tracciare i singoli messaggi nelle RPC in streaming. A differenza della strumentazione standard di OpenTelemetry (che traccia l'intero stream), questi interceptor propagano il contesto di trace in ciascun messaggio.

{{< anchors "quando-usare" >}}
### Quando usarli

Usa questi interceptor quando ti servono:
- Tracciamento per singolo messaggio negli stream di lunga durata
- Propagazione del contesto di trace dal client al server attraverso i messaggi dello stream
- Tempistiche e correlazione dei singoli messaggi

{{< anchors "impostazione-del-progetto" >}}
### Configurazione nel design

Nel tuo design Goa, definisci gli interceptor con attributi `TraceMetadata`:

```go
var TraceBidirectionalStream = Interceptor("TraceBidirectionalStream", func() {
    WriteStreamingPayload(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    ReadStreamingPayload(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    WriteStreamingResult(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    ReadStreamingResult(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
})
```

Applicali ai metodi in streaming:

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### Implementazione

Nelle implementazioni degli interceptor, invoca le funzioni fornite dal pacchetto:

```go
import "goa.design/clue/interceptors"

// Client-side
func (i *ClientInterceptors) TraceBidirectionalStream(
    ctx context.Context,
    info *genservice.TraceBidirectionalStreamInfo,
    next goa.Endpoint,
) (any, error) {
    return interceptors.TraceBidirectionalStreamClient(ctx, info, next)
}

// Server-side
func (i *ServerInterceptors) TraceBidirectionalStream(
    ctx context.Context,
    info *genservice.TraceBidirectionalStreamInfo,
    next goa.Endpoint,
) (any, error) {
    return interceptors.TraceBidirectionalStreamServer(ctx, info, next)
}
```

{{< anchors "estrazione-del-contesto-di-tracciamento-dai-messaggi-ricevuti" >}}
### Estrarre il contesto di trace dai messaggi ricevuti

Poiché le interfacce stream generate da Goa non restituiscono un contesto, usa le funzioni helper:

```go
func (s *Service) Chat(ctx context.Context, stream genservice.ChatServerStream) error {
    for {
        ctx = interceptors.SetupTraceStreamRecvContext(ctx)
        msg, err := stream.RecvWithContext(ctx)
        if err != nil {
            return err
        }
        ctx = interceptors.GetTraceStreamRecvContext(ctx)
        
        // ctx now contains trace context from the received message
        log.Info(ctx, log.KV{K: "received", V: msg.Text})
    }
}
```

Oppure usa il wrapper per un codice più pulito:

```go
wrapped := interceptors.WrapTraceBidirectionalStreamServerStream(stream)

for {
    ctx, msg, err := wrapped.RecvAndReturnContext(ctx)
    if err != nil {
        return err
    }
    // ctx contains trace context
}
```

---

## Esempio completo

Un servizio Goa completamente strumentato:

```go
package main

import (
    "context"
    "net/http"
    "time"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "goa.design/clue/clue"
    "goa.design/clue/debug"
    "goa.design/clue/health"
    "goa.design/clue/log"
    goahttp "goa.design/goa/v3/http"

    catalogapi "example.com/catalog"
    gencatalog "example.com/catalog/gen/catalog"
    genhttp "example.com/catalog/gen/http/catalog/server"
)

func main() {
    // 1. Initialize logging context with trace correlation
    ctx := log.Context(context.Background(),
        log.WithFormat(log.FormatJSON),
        log.WithFunc(log.Span),
    )

    // 2. Configure OpenTelemetry
    spanExporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    metricExporter, err := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    cfg, err := clue.NewConfig(ctx, "catalog", "1.0.0", metricExporter, spanExporter)
    if err != nil {
        log.Fatal(ctx, err)
    }
    clue.ConfigureOpenTelemetry(ctx, cfg)

    // 3. Create Goa endpoints and mount generated HTTP server
    svc := catalogapi.NewCatalog()
    endpoints := gencatalog.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads()) // Log payloads when debug enabled
    endpoints.Use(log.Endpoint)        // Add goa.service and goa.method to logs

    mux := goahttp.NewMuxer()
    srv := genhttp.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    genhttp.Mount(mux, srv)

    // 4. Mount debug, pprof, and dependency health endpoints
    usersAddr := "localhost:8081"
    debug.MountDebugLogEnabler(debug.Adapt(mux))
    debug.MountPprofHandlers(debug.Adapt(mux))
    check := health.Handler(health.NewChecker(
        health.NewPinger("users-service", usersAddr, health.WithTimeout(5*time.Second)),
    ))
    mux.Handle("GET", "/healthz", check.ServeHTTP)

    // 5. Wrap mux with OpenTelemetry, debug control, and request logging middleware
    var handler http.Handler = mux
    handler = otelhttp.NewHandler(handler, "catalog")
    handler = debug.HTTP()(handler)
    handler = log.HTTP(ctx)(handler)

    // 6. Start server
    log.Printf(ctx, "starting server on :8080")
    log.Fatal(ctx, http.ListenAndServe(":8080", handler))
}
```

---

{{< anchors "migliori-pratiche" >}}
## Best practice

{{< anchors "registrazione" >}}
### Logging

1. **Usa `Info()` per l'elaborazione delle richieste, `Print()` per gli eventi del ciclo di vita.** I log delle richieste vanno bufferizzati; i log di avvio e arresto devono essere scritti subito.

2. **Aggiungi il contesto presto, registra tardi.** Usa `log.With()` per allegare ID e metadati non appena sono disponibili.

3. **Aggiungi sempre la correlazione con le tracce.** Usa `log.WithFunc(log.Span)` per collegare i log agli span OpenTelemetry.

{{< anchors "controlli-di-salute" >}}
### Health check

1. **Verifica le dipendenze reali.** Non limitarti a restituire 200: controlla connessioni al database e servizi a valle.

2. **Imposta sempre un timeout.** Un health check che resta appeso è peggiore di uno che fallisce subito.

3. **Separa liveness e readiness.** Usa `/livez` per la vitalità base del processo e `/readyz` per la verifica completa delle dipendenze.

### Debug

1. **Non esporre mai pprof pubblicamente.** Usa una porta interna dedicata o una network policy.

2. **Progetta il logging pensando al toggle di debug.** Struttura i log in modo che l'attivazione del debug mostri dettagli utili senza inondare l'output.

---

## Vedi anche

- [Guida alla produzione](../../1-goa/production/) — Pattern di distribuzione in produzione
- [Repository GitHub di Clue](https://github.com/goadesign/clue) — Codice sorgente ed esempio weather
- [Documentazione OpenTelemetry](https://opentelemetry.io/docs/) — Concetti di OpenTelemetry
