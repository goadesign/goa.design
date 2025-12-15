---
title: "Indizio"
weight: 3
description: "Microservice instrumentation for Go - logging, tracing, metrics, health checks, and debugging."
llm_optimized: true
---

Clue fornisce una strumentazione completa per i microservizi Go costruiti su OpenTelemetry. Pur essendo progettato per integrarsi perfettamente con Goa, Clue funziona con qualsiasi servizio Go HTTP o gRPC.

## Perché Clue?

Clue risolve un problema comune nei microservizi: si ha bisogno di registri dettagliati quando le cose vanno male, ma non si vuole pagare il costo di registrare sempre tutto.

L'approccio di Clue: **memorizza i messaggi di log in memoria e li scrive solo quando si verifica un errore o la richiesta viene tracciata**. Le richieste riuscite e non tracciate non generano alcun output di log. Quando si verificano errori, si ottiene il contesto completo di ciò che ha portato al fallimento.

Questa singola decisione progettuale riduce drasticamente il volume dei log, preservando le informazioni di debug necessarie.

## Panoramica del pacchetto

| Pacchetto | Scopo |
|---------|---------|
| `clue` | Configurazione di OpenTelemetry - una sola chiamata per impostare le metriche e il tracciamento |
| `log` | Registrazione strutturata basata sul contesto con buffering intelligente |
| `health` | Endpoint di controllo dello stato di salute per Kubernetes e sistemi di orchestrazione |
| `debug` | Debug a tempo di esecuzione - alterna i log di debug, gli endpoint pprof |
| `mock` | Generare e configurare i doppi di test per le dipendenze |
| `interceptors` | Intercettori Goa per tracciare i singoli messaggi di flusso |

## Installazione

Installare solo i pacchetti necessari:

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## Il pacchetto log

Il pacchetto `log` è costruito intorno a `context.Context` di Go. Si inizializza un contesto di log una volta e lo si passa attraverso l'applicazione. Tutte le funzioni di log prendono questo contesto come primo parametro.

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

## Comprendere il buffering

Questa è la caratteristica chiave di Clue. Esistono due tipi di funzioni di log:

**Funzioni immediate** - scrivono direttamente sull'output:
- `Print()`, `Printf()` - scrivono sempre immediatamente
- `Error()`, `Errorf()` - flush buffer, quindi scrittura
- `Fatal()`, `Fatalf()` - scarica il buffer, scrive, poi esce

**Funzioni con buffer** - conservano in memoria fino al lavaggio:
- `Info()`, `Infof()` - bufferizzare il messaggio
- `Warn()`, `Warnf()` - bufferizzano il messaggio
- `Debug()`, `Debugf()` - bufferizza se è abilitato il debug

Il buffer viene scaricato automaticamente quando:
1. `Error()` o `Fatal()` viene richiamato
2. La richiesta è tracciata (rilevata tramite il contesto OpenTelemetry span)
3. La modalità di debug è abilitata

**Esempio: Perché è importante**

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

Per una richiesta andata a buon fine: **zero output di log**. Per una richiesta fallita: **contesto completo**.

### Aggiunta di contesto con With()

Costruire il contesto di registrazione mentre le richieste fluiscono attraverso il servizio:

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

Due modi per specificare le coppie chiave-valore:

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

Usare `KV` quando l'ordine dei campi del log è importante (più facile da analizzare). Usare `Fields` quando non è importante.

I valori possono essere: stringhe, numeri, booleani, nil, o parti di questi tipi.

### Formati dei registri

Clue rileva automaticamente i terminali e seleziona il formato appropriato:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (predefinito per i non terminali) - stile logfmt:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (predefinito per i terminali) - timestamp colorati e relativi:
```
INFO[0042] user=alice action=login
```

**FormatJSON** - JSON strutturato:
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

### Aggiunta degli ID delle tracce e degli Span

Collegare i log alle tracce distribuite:

```go
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON),
    log.WithFunc(log.Span),  // Adds trace_id and span_id to every log
)
```

Uscita:
```json
{"time":"...","level":"info","trace_id":"abc123","span_id":"def456","msg":"hello"}
```

### Aggiunta della posizione del file

Per il debug, aggiungere il file sorgente e i numeri di riga:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

L'output include: `file=mypackage/handler.go:42`

### Middleware HTTP

Il middleware HTTP svolge due funzioni:
1. Copia il logger dal contesto di base nel contesto di ogni richiesta
2. Registra l'inizio e la fine della richiesta con metodo, URL, stato e durata

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

### Intercettori gRPC

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

### Registrazione dei client HTTP

Avvolgere i trasporti HTTP per registrare le richieste in uscita:

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

### Integrazione di Goa

Aggiungere i nomi dei servizi e dei metodi ai log:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

### Personalizzazione delle chiavi di registro

Tutte le chiavi di log sono variabili di pacchetto che possono essere sovrascritte:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

### Adattatore per altri logger

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

## Il pacchetto di indizi

Il pacchetto `clue` configura OpenTelemetry con valori predefiniti ragionevoli in una singola chiamata di funzione.

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

Clue include un campionatore adattivo che regola automaticamente la frequenza di campionamento in base al volume di traffico. In questo modo si evita che l'archiviazione delle tracce venga sovraccaricata durante i picchi di traffico.

Impostazioni predefinite:
- **Frequenza massima di campionamento:** 2 tracce al secondo
- **Dimensione del campione:** 10 richieste tra le regolazioni

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

### Funzioni di esportazione degli helper

Clue fornisce funzioni ausiliarie che creano esportatori con una corretta gestione degli arresti:

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

### Disabilitazione delle metriche o del tracciamento

Passare `nil` per l'esportatore non necessario:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## Il pacchetto salute

Il pacchetto `health` crea endpoint di controllo dello stato di salute che riportano le dipendenze dei servizi.

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

### Verifica delle dipendenze

Usare `NewPinger` per controllare i servizi che espongono endpoint sanitari:

```go
checker := health.NewChecker(
    health.NewPinger("database-service", "db.internal:8080"),
    health.NewPinger("cache-service", "cache.internal:8080"),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https")),
)
```

**Opzioni del pinger:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

### Controlli sanitari personalizzati

Implementare l'interfaccia `Pinger` per i controlli personalizzati:

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

Il gestore restituisce JSON per impostazione predefinita, XML se richiesto:

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

Impostare la versione in fase di compilazione:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## Il pacchetto debug

Il pacchetto `debug` consente la risoluzione dei problemi in fase di esecuzione senza la ridistribuzione.

### Registrazione dinamica del debug

Monta un endpoint per attivare i log di debug in fase di esecuzione:

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Controllare i log di debug via HTTP:

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

**Importante: ** L'endpoint controlla solo un flag. È necessario utilizzare il middleware di debug perché abbia effetto:

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

### Endpoint di pprof

Monta gli endpoint di profilazione di Go:

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Endpoint disponibili:
- `/debug/pprof/` - Pagina dell'indice
- `/debug/pprof/heap` - Profilo dell'heap
- `/debug/pprof/goroutine` - Profilo della goroutine
- `/debug/pprof/profile` - Profilo della CPU (30s di default)
- `/debug/pprof/trace` - Traccia dell'esecuzione
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, ecc.

⚠️ **Avvertenza di sicurezza:** Non esporre pubblicamente gli endpoint di pprof. Rivelano informazioni sensibili sulla vostra applicazione.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Registrazione del carico utile per Goa

Registra i payload delle richieste e delle risposte quando il debug è abilitato:

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

### Adattatore Goa Muxer

Per il muxer HTTP di Goa:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## Il pacchetto mock

Il pacchetto `mock` aiuta a creare doppi test per le dipendenze, con il supporto di sequenze di chiamate e mock permanenti.

### Concetti

**Sequenze:** Definiscono le chiamate previste in ordine. Ogni chiamata a `Next()` restituisce la funzione successiva nella sequenza.

**Mock permanenti:** Restituiscono sempre la stessa funzione, usati dopo l'esaurimento delle sequenze o quando l'ordine non ha importanza.

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

## Utilizzo dei Mock nei test

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

Usare `Set()` per le chiamate che devono comportarsi sempre allo stesso modo:

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Le sequenze hanno la precedenza sui mock permanenti. Una volta esaurita la sequenza, `Next()` restituisce il mock permanente.

### Generatore di mock (cmg)

Genera automaticamente i mock dalle interfacce:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

I mock generati vanno in una sottodirectory `mocks/` accanto al file sorgente.

---

## Il pacchetto di intercettori

Il pacchetto `interceptors` fornisce intercettori Goa per tracciare i singoli messaggi nelle RPC in streaming. A differenza della strumentazione standard di OpenTelemetry (che traccia l'intero flusso), questi intercettori propagano il contesto di tracciamento attraverso ogni messaggio.

### Quando usare

Utilizzate questi intercettori quando avete bisogno di:
- Tracciamento per messaggio in flussi di lunga durata
- Tracciare il contesto del flusso da client a server attraverso i messaggi dello stream
- Tempistica e correlazione dei singoli messaggi

### Impostazione del progetto

Nel progetto di Goa, definire gli intercettori con gli attributi `TraceMetadata`:

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

Applicare ai metodi di streaming:

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### Implementazione

Nelle implementazioni dei propri intercettori, richiamare le funzioni fornite:

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

### Estrazione del contesto di tracciamento dai messaggi ricevuti

Poiché le interfacce di flusso generate da Goa non restituiscono un contesto, è necessario utilizzare le funzioni di aiuto:

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

Oppure utilizzare il wrapper per un codice più pulito:

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
    
    "goa.design/clue/clue"
    "goa.design/clue/debug"
    "goa.design/clue/health"
    "goa.design/clue/log"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    
    genservice "myapp/gen/myservice"
)

func main() {
    // 1. Initialize logging context with trace correlation
    ctx := log.Context(context.Background(),
        log.WithFormat(log.FormatJSON),
        log.WithFunc(log.Span))
    
    // 2. Configure OpenTelemetry
    spanExporter, _ := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
    metricExporter, _ := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
    cfg, _ := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)
    
    // 3. Create service and endpoints
    svc := NewService()
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())  // Log payloads when debug enabled
    endpoints.Use(log.Endpoint)          // Add service/method to logs
    
    // 4. Create HTTP handler with middleware stack
    handler := genservice.NewHandler(endpoints)
    handler = otelhttp.NewHandler(handler, "myservice")  // OpenTelemetry
    handler = debug.HTTP()(handler)                       // Debug log control
    handler = log.HTTP(ctx)(handler)                      // Request logging
    
    // 5. Mount on mux
    mux := http.NewServeMux()
    mux.Handle("/", handler)
    
    // 6. Mount operational endpoints
    debug.MountDebugLogEnabler(mux)
    debug.MountPprofHandlers(mux)
    mux.Handle("/healthz", health.Handler(
        health.NewChecker(
            health.NewPinger("database", dbAddr),
        ),
    ))
    
    // 7. Start server
    log.Printf(ctx, "starting server on :8080")
    http.ListenAndServe(":8080", mux)
}
```

---

## Migliori pratiche

### Registrazione

1. **Usare `Info()` per l'elaborazione delle richieste, `Print()` per gli eventi del ciclo di vita ** I log delle richieste devono essere bufferizzati; i log di avvio/arresto devono essere scritti immediatamente.

2. **Usare `log.With()` per aggiungere ID e metadati non appena si hanno a disposizione.

3. **Aggiungere sempre la correlazione con le tracce.** Usare `log.WithFunc(log.Span)` per correlare i registri con le tracce.

### Controlli di salute

1. **Verificare le dipendenze reali ** Non limitarsi a restituire 200. Verificare le connessioni al database, i servizi a valle.

2. **Usare i timeout.** Un controllo di salute che si blocca è peggiore di uno che fallisce.

3. **Usare `/livez` per la salute di base dei processi, `/readyz` per i controlli di dipendenza completi.

### Debug

1. **Non esporre mai pprof pubblicamente.** Usare una porta interna separata o una politica di rete.

2. **Strutturare il logging in modo che la modalità di debug riveli informazioni utili senza sovraccaricare.

---

## Vedi anche

- [Guida alla produzione](../../1-goa/production/) - Modelli di distribuzione della produzione
- [Repository GitHub di Clue](https://github.com/goadesign/clue) - Codice sorgente ed esempio di meteo
- [Documentazione OpenTelemetry](https://opentelemetry.io/docs/) - I concetti di OpenTelemetry
