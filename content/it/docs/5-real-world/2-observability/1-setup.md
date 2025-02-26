---
title: "Setup Base"
description: "Configurare Clue e OpenTelemetry"
weight: 1
---

La configurazione dell'osservabilità in un servizio Goa coinvolge la configurazione di Clue e
OpenTelemetry. Questa guida illustra i passaggi essenziali per il setup.

## Prerequisiti

Prima di tutto, aggiungi le dipendenze richieste al tuo `go.mod`:

```go
require (
    goa.design/clue
    go.opentelemetry.io/otel 
    go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc 
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc 
    go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp 
    go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
)
```

Questi pacchetti forniscono:
- `clue`: Il toolkit di osservabilità di Goa
- `otel`: Funzionalità core di OpenTelemetry
- `otlpmetricgrpc` e `otlptracegrpc`: Esportatori OTLP per inviare dati di telemetria
- `otelhttp` e `otelgrpc`: Auto-strumentazione per HTTP e gRPC

## 1. Contesto del Logger

Il contesto del logger è la base del tuo setup di osservabilità. Trasporta configurazione
e ID di correlazione attraverso la tua applicazione:

```go
// Configura il formato del logger in base all'ambiente
format := log.FormatJSON
if log.IsTerminal() {
    format = log.FormatTerminal  // Formato leggibile per lo sviluppo
}

// Crea contesto base con formattazione e tracciamento degli span
ctx := log.Context(context.Background(),
    log.WithFormat(format),      // Imposta formato output
    log.WithFunc(log.Span))      // Includi ID di trace/span nei log

// Abilita logging di debug se necessario
if *debugf {
    ctx = log.Context(ctx, log.WithDebug())
    log.Debugf(ctx, "log di debug abilitati")
}

// Aggiungi informazioni del servizio
ctx = log.With(ctx, 
    log.KV{"service", serviceName},
    log.KV{"version", version},
    log.KV{"env", environment})
```

Il contesto del logger fornisce:
- Logging strutturato coerente attraverso il tuo servizio
- Correlazione automatica tra log e tracce
- Formattazione consapevole dell'ambiente (JSON in produzione, leggibile in sviluppo)
- Controllo del livello di log di debug
- Campi comuni per tutte le voci di log

## 2. Configurazione OpenTelemetry

Il setup di OpenTelemetry coinvolge la creazione di esportatori e la configurazione dei provider globali:

```go
// Crea esportatori OTLP per inviare telemetria a un collettore
spanExporter, err := otlptracegrpc.New(ctx,
    otlptracegrpc.WithEndpoint(*coladdr),
    otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
if err != nil {
    log.Fatalf(ctx, err, "inizializzazione tracciamento fallita")
}
defer func() {
    ctx := log.Context(context.Background())
    if err := spanExporter.Shutdown(ctx); err != nil {
        log.Errorf(ctx, err, "spegnimento tracciamento fallito")
    }
}()

metricExporter, err := otlpmetricgrpc.New(ctx,
    otlpmetricgrpc.WithEndpoint(*coladdr),
    otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
if err != nil {
    log.Fatalf(ctx, err, "inizializzazione metriche fallita")
}
defer func() {
    ctx := log.Context(context.Background())
    if err := metricExporter.Shutdown(ctx); err != nil {
        log.Errorf(ctx, err, "spegnimento metriche fallito")
    }
}()

// Inizializza Clue con gli esportatori
cfg, err := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithResourceAttributes(map[string]string{
        "environment": environment,
        "region":     region,
    }))
if err != nil {
    log.Fatalf(ctx, err, "inizializzazione osservabilità fallita")
}
clue.ConfigureOpenTelemetry(ctx, cfg)
```

Questa configurazione imposta l'infrastruttura core di OpenTelemetry per il tuo
servizio. Crea esportatori che inviano i tuoi dati di telemetria a un collettore per
l'elaborazione e l'archiviazione. La configurazione assicura anche una corretta gestione dello
spegnimento per evitare la perdita di dati quando il tuo servizio termina. Gli attributi delle
risorse come ambiente e regione vengono aggiunti per aiutare a organizzare e filtrare i tuoi dati
di telemetria in modo efficace. Infine, inizializza i provider globali di OpenTelemetry che
abilitano la raccolta di tracce e metriche attraverso la tua applicazione.

## 3. Setup HTTP e gRPC

Per servizi HTTP, avvolgi i tuoi handler con middleware di osservabilità:

```go
// Crea muxer HTTP di Goa
mux := goahttp.NewMuxer()

// Monta endpoint di debug
debug.MountDebugLogEnabler(debug.Adapt(mux))  // Controllo dinamico livello log
debug.MountPprofHandlers(debug.Adapt(mux))    // Endpoint profiling Go

// Aggiungi middleware nell'ordine corretto (dall'interno all'esterno):
handler := otelhttp.NewHandler(mux, serviceName)  // 3. OpenTelemetry
handler = debug.HTTP()(handler)                   // 2. Endpoint debug
handler = log.HTTP(ctx)(handler)                  // 1. Logging richieste

// Crea server con l'handler strumentato
server := &http.Server{
    Addr:         *httpAddr,
    Handler:      handler,
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 15 * time.Second,
}
```

Per servizi gRPC, usa gli interceptor:

```go
// Crea connessione client gRPC con osservabilità
conn, err := grpc.DialContext(ctx, *serverAddr,
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()))

// Crea server gRPC con osservabilità
srv := grpc.NewServer(
    grpc.UnaryInterceptor(log.UnaryServerInterceptor()),
    grpc.StatsHandler(otelgrpc.NewServerHandler()))
```

I middleware/interceptor forniscono:
- Tracciamento distribuito per tutte le richieste
- Logging di richieste/risposte
- Controllo dinamico del livello di log
- Endpoint di profiling delle prestazioni

## 4. Controlli di Salute

I controlli di salute aiutano a monitorare il tuo servizio e le sue dipendenze. Clue fornisce due
interfacce principali per implementare i controlli di salute:

### L'Interfaccia Pinger

L'interfaccia `Pinger` definisce come controllare la salute di una singola dipendenza:

```go
type Pinger interface {
    // Name restituisce il nome del servizio remoto
    Name() string
    
    // Ping controlla se il servizio è in salute
    Ping(context.Context) error
}
```

Clue fornisce un'implementazione predefinita basata su HTTP che pinga un endpoint di controllo salute:

```go
// Crea un pinger per un servizio database
dbPinger := health.NewPinger("database", "db:8080",
    health.WithScheme("https"),           // Usa HTTPS (default: http)
    health.WithPath("/health"))           // Path personalizzato (default: /livez)

// Crea un pinger per Redis
redisPinger := health.NewPinger("redis", "redis:6379",
    health.WithPath("/ping"))             // Endpoint salute Redis
```

Puoi anche implementare pinger personalizzati per casi speciali:

```go
type CustomPinger struct {
    name string
    db   *sql.DB
}

func (p *CustomPinger) Name() string { return p.name }

func (p *CustomPinger) Ping(ctx context.Context) error {
    return p.db.PingContext(ctx)
}
```

### L'Interfaccia Checker

L'interfaccia `Checker` aggrega più pinger e fornisce lo stato di salute complessivo:

```go
type Checker interface {
    // Check restituisce lo stato di salute di tutte le dipendenze
    Check(context.Context) (*Health, bool)
}

// Health contiene informazioni dettagliate sullo stato
type Health struct {
    Uptime  int64             // Tempo di attività del servizio in secondi
    Version string            // Versione del servizio
    Status  map[string]string // Stato di ogni dipendenza
}
```

Crea un checker con multiple dipendenze:

```go
// Crea health checker con più pinger
checker := health.NewChecker(
    health.NewPinger("database", *dbAddr),
    health.NewPinger("cache", *cacheAddr),
    health.NewPinger("search", *searchAddr),
    &CustomPinger{name: "custom", db: db},
)

// Crea handler HTTP dal checker
check := health.Handler(checker)
``` 