---
title: "Tracciamento"
description: "Implementare il tracciamento distribuito con OpenTelemetry"
weight: 2
---

# Tracciamento Distribuito

Le applicazioni moderne sono sistemi distribuiti complessi dove una singola richiesta utente
potrebbe toccare dozzine di servizi, database e API esterne. Quando qualcosa va
storto, può essere difficile capire cosa è successo. È qui che entra in gioco
il tracciamento distribuito.

## Cos'è il Tracciamento Distribuito?

Il tracciamento distribuito segue una richiesta mentre attraversa il tuo sistema,
registrando tempi, errori e contesto ad ogni passo. Pensalo come un sistema di
tracciamento GPS per le tue richieste - puoi vedere esattamente dove sono andate, quanto
tempo ha richiesto ogni passo e dove hanno incontrato problemi.

### Concetti Chiave

1. **Trace**: Il viaggio completo di una richiesta attraverso il tuo sistema
2. **Span**: Una singola operazione all'interno di quel viaggio (come una query al database o una chiamata API)
3. **Contesto**: Informazioni che viaggiano con la richiesta (come ID utente o ID di correlazione)
4. **Attributi**: Coppie chiave-valore che descrivono cosa è successo (come ID ordine o dettagli errore)

Ecco un esempio visivo:

```
Trace: Crea Ordine
├── Span: Valida Utente (10ms)
│   └── Attributo: user_id=123
├── Span: Controlla Inventario (50ms)
│   ├── Attributo: product_id=456
│   └── Evento: "livello scorte basso"
└── Span: Processa Pagamento (200ms)
    ├── Attributo: amount=99.99
    └── Errore: "fondi insufficienti"
```

## Strumentazione Automatica

Il modo più semplice per iniziare con il tracciamento è usare la strumentazione automatica.
Clue fornisce middleware che traccia automaticamente le richieste HTTP e gRPC senza
modifiche al codice:

```go
// Per server HTTP, avvolgi il tuo handler con il middleware OpenTelemetry.
// Questo crea automaticamente tracce per tutte le richieste in arrivo.
handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    // Il tuo codice handler
})

// Aggiungi middleware di tracciamento
handler = otelhttp.NewHandler(handler, "my-service")

// Il middleware:
// - Crea uno span per ogni richiesta
// - Registra il metodo HTTP, codice di stato e URL
// - Traccia la durata della richiesta
// - Propaga il contesto ai servizi downstream
```

Per servizi gRPC, usa gli interceptor forniti:

```go
// Crea un server gRPC con tracciamento abilitato
server := grpc.NewServer(
    // Aggiungi l'handler OpenTelemetry per tracciare tutte le RPC
    grpc.StatsHandler(otelgrpc.NewServerHandler()))

// Questo automaticamente:
// - Traccia tutti i metodi gRPC
// - Registra nomi dei metodi e codici di stato
// - Traccia la latenza
// - Gestisce la propagazione del contesto
```

## Strumentazione Manuale

Mentre la strumentazione automatica è ottima per i confini delle richieste, spesso hai bisogno
di aggiungere span personalizzati per tracciare operazioni di business importanti. Ecco come aggiungere
tracciamento personalizzato al tuo codice:

```go
func processOrder(ctx context.Context, order *Order) error {
    // Inizia un nuovo span per questa operazione.
    // Il nome dello span "process_order" apparirà nelle tue tracce.
    ctx, span := otel.Tracer("myservice").Start(ctx, "process_order")
    
    // Termina sempre lo span quando la funzione ritorna
    defer span.End()

    // Aggiungi contesto di business come attributi dello span
    span.SetAttributes(
        // Questi ti aiuteranno a filtrare e analizzare le tracce
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount),
        attribute.String("customer.id", order.CustomerID))

    // Registra eventi significativi con timestamp
    span.AddEvent("validating_order")
    if err := validateOrder(ctx, order); err != nil {
        // Registra errori con contesto
        span.RecordError(err)
        span.SetStatus(codes.Error, "validazione ordine fallita")
        return err
    }
    span.AddEvent("order_validated")

    // Crea span annidati per sotto-operazioni
    ctx, paymentSpan := otel.Tracer("myservice").Start(ctx, "process_payment")
    defer paymentSpan.End()

    if err := processPayment(ctx, order); err != nil {
        paymentSpan.RecordError(err)
        paymentSpan.SetStatus(codes.Error, "pagamento fallito")
        return err
    }

    return nil
}
```

## Tracciamento delle Chiamate Esterne

Quando il tuo servizio chiama altri servizi o database, vuoi tracciare queste
operazioni come parte delle tue tracce. Ecco come strumentare diversi tipi di
client:

### Client HTTP

```go
// Crea un client HTTP con tracciamento abilitato
client := &http.Client{
    // Avvolgi il transport predefinito con OpenTelemetry
    Transport: otelhttp.NewTransport(
        http.DefaultTransport,
        // Abilita tracciamento HTTP dettagliato (opzionale)
        otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
            return otelhttptrace.NewClientTrace(ctx)
        }),
    ),
}

// Ora tutte le richieste saranno tracciate automaticamente
resp, err := client.Get("https://api.example.com/data")
```

### Client gRPC

```go
// Crea una connessione client gRPC con tracciamento
conn, err := grpc.DialContext(ctx,
    "service:8080",
    // Aggiungi l'handler OpenTelemetry
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    // Altre opzioni...
    grpc.WithTransportCredentials(insecure.NewCredentials()))

// Tutte le chiamate usando questa connessione saranno tracciate
client := pb.NewServiceClient(conn)
```

### Chiamate al Database

Per operazioni sul database, crea span personalizzati per tracciare le query:

```go
func (r *Repository) GetUser(ctx context.Context, id string) (*User, error) {
    // Crea uno span per l'operazione sul database
    ctx, span := otel.Tracer("repository").Start(ctx, "get_user")
    defer span.End()

    // Aggiungi contesto della query
    span.SetAttributes(
        attribute.String("db.type", "postgres"),
        attribute.String("db.user_id", id))

    // Esegui query
    var user User
    if err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE id = $1", id); err != nil {
        // Registra errori del database
        span.RecordError(err)
        span.SetStatus(codes.Error, "query database fallita")
        return nil, err
    }

    return &user, nil
}
```

## Propagazione del Contesto

Perché le tracce funzionino attraverso i confini dei servizi, il contesto della traccia deve essere propagato
con le richieste. Questo avviene automaticamente con i client strumentati sopra,
ma ecco come funziona manualmente:

```go
// Quando ricevi una richiesta, estrai il contesto della traccia
func handleIncoming(w http.ResponseWriter, r *http.Request) {
    // Estrai contesto della traccia dagli header della richiesta
    ctx := otel.GetTextMapPropagator().Extract(r.Context(),
        propagation.HeaderCarrier(r.Header))
    
    // Usa questo contesto per tutte le operazioni
    processRequest(ctx)
}

// Quando fai una richiesta, inietta il contesto della traccia
func makeOutgoing(ctx context.Context) error {
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com", nil)
    
    // Inietta contesto della traccia negli header della richiesta
    otel.GetTextMapPropagator().Inject(ctx,
        propagation.HeaderCarrier(req.Header))
    
    resp, err := http.DefaultClient.Do(req)
    return err
}
```

La propagazione del contesto usa lo standard W3C Trace Context per assicurare che le tracce funzionino
attraverso diversi servizi e sistemi di osservabilità. Scopri di più sulla propagazione
del contesto in:

- [OpenTelemetry Context e Propagazione](https://opentelemetry.io/docs/concepts/context-propagation/)
- [Specifica W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [SDK OpenTelemetry Go Propagazione](https://pkg.go.dev/go.opentelemetry.io/otel/propagation)

## Controllo dei Dati di Traccia

Nei sistemi in produzione, tracciare ogni richiesta può generare una quantità travolgente di
dati, portando a costi di storage elevati e overhead di prestazioni. Il campionamento ti aiuta
a raccogliere abbastanza tracce per comprendere il tuo sistema mantenendo i costi sotto
controllo.

### Perché Campionare?

1. **Controllo dei Costi**: Archiviare ed elaborare dati di traccia può essere costoso
2. **Prestazioni**: Generare tracce aggiunge un certo overhead alle richieste
3. **Analisi**: Spesso non hai bisogno di ogni traccia per capire il comportamento del sistema
4. **Storage**: I dati di traccia possono rapidamente consumare grandi quantità di storage

### Campionamento a Tasso Fisso

L'approccio più semplice è campionare una percentuale fissa di richieste. Questo è
prevedibile e facile da capire: 

```go
// Configura un sampler che traccia il 10% delle richieste
cfg, err := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithSampler(sdktrace.TraceIDRatioBased(0.1)))

// Oppure usa il sampler predefinito di Clue
cfg, err := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithDefaultSampler())  // Usa le impostazioni consigliate
```

### Campionamento Basato su Regole

Per un controllo più preciso, puoi campionare in base a caratteristiche della richiesta:

```go
// Crea un sampler personalizzato che traccia:
// - 100% degli errori
// - 50% delle richieste di pagamento
// - 10% di tutto il resto
sampler := func(p sdktrace.SamplingParameters) sdktrace.SamplingResult {
    // Controlla gli attributi dello span
    if p.Kind == trace.SpanKindServer {
        // Traccia sempre gli errori
        if p.Attributes["error"] != nil {
            return sdktrace.SamplingResult{
                Decision: sdktrace.RecordAndSample,
            }
        }

        // Campiona pagamenti al 50%
        if p.Name == "process_payment" {
            if rand.Float64() < 0.5 {
                return sdktrace.SamplingResult{
                    Decision: sdktrace.RecordAndSample,
                }
            }
            return sdktrace.SamplingResult{
                Decision: sdktrace.Drop,
            }
        }
    }

    // Campiona tutto il resto al 10%
    if rand.Float64() < 0.1 {
        return sdktrace.SamplingResult{
            Decision: sdktrace.RecordAndSample,
        }
    }
    return sdktrace.SamplingResult{
        Decision: sdktrace.Drop,
    }
}

// Usa il sampler personalizzato
cfg, err := clue.NewConfig(ctx,
    serviceName,
    version,
    metricExporter,
    spanExporter,
    clue.WithSampler(sampler))
```

### Campionamento Adattivo

Per sistemi con carichi variabili, considera il campionamento adattivo che regola
il tasso di campionamento in base alle condizioni del sistema:

```go
// Implementa un sampler che si adatta al carico del sistema
type AdaptiveSampler struct {
    mu sync.RWMutex
    rate float64
}

func (s *AdaptiveSampler) ShouldSample(p sdktrace.SamplingParameters) sdktrace.SamplingResult {
    s.mu.RLock()
    rate := s.rate
    s.mu.RUnlock()

    if rand.Float64() < rate {
        return sdktrace.SamplingResult{Decision: sdktrace.RecordAndSample}
    }
    return sdktrace.SamplingResult{Decision: sdktrace.Drop}
}

// Aggiorna il tasso di campionamento in base al carico
func (s *AdaptiveSampler) UpdateRate(load float64) {
    s.mu.Lock()
    defer s.mu.Unlock()

    // Riduci il campionamento quando il carico è alto
    if load > 0.8 {
        s.rate = 0.01  // 1% quando il carico è alto
    } else if load > 0.5 {
        s.rate = 0.05  // 5% per carico medio
    } else {
        s.rate = 0.1   // 10% per carico basso
    }
}
```

## Best Practice

1. **Nomi Significativi**
   - Usa nomi di span descrittivi che riflettono l'operazione
   - Segui una convenzione di denominazione coerente
   - Includi il contesto di business quando appropriato

2. **Attributi Utili**
   - Aggiungi attributi che aiutano nel debug
   - Includi ID correlati (utente, ordine, ecc.)
   - Non includere dati sensibili o PII

3. **Gestione degli Errori**
   - Registra sempre gli errori negli span
   - Includi dettagli sufficienti per il debug
   - Usa codici di stato appropriati

4. **Propagazione del Contesto**
   - Assicurati che il contesto sia propagato attraverso tutti i layer
   - Usa client strumentati quando possibile
   - Testa la propagazione del contesto

5. **Campionamento Intelligente**
   - Adatta il campionamento al tuo caso d'uso
   - Campiona sempre gli errori
   - Monitora i costi e l'impatto sulle prestazioni

## Conclusione

Il tracciamento distribuito è uno strumento potente per comprendere e debuggare sistemi distribuiti.
Con Goa e OpenTelemetry, puoi:

- Ottenere visibilità automatica nelle richieste HTTP e gRPC
- Aggiungere tracciamento personalizzato per operazioni di business
- Seguire le richieste attraverso servizi multipli
- Controllare i costi attraverso il campionamento intelligente

Nei prossimi capitoli, esploreremo come combinare il tracciamento con metriche e logging
per una visibilità completa del sistema.