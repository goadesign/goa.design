---
title: "Osservabilità"
description: "Comprendere e implementare l'osservabilità nei servizi Goa"
weight: 2
---

I sistemi distribuiti moderni sono complessi. Quando qualcosa va storto, il tradizionale
logging da solo non è sufficiente per capire cosa è successo. Hai bisogno di vedere come
le richieste fluiscono attraverso il tuo sistema, misurare le prestazioni e monitorare la salute
del sistema. È qui che entra in gioco l'osservabilità.

{{< alert title="Nota" color="primary" >}}
I servizi Goa sono servizi HTTP o gRPC standard, quindi puoi utilizzare qualsiasi
stack di osservabilità che preferisci. Mentre questa guida si concentra su
[Clue](https://github.com/goadesign/clue) (che Goa usa negli esempi generati
e fornisce funzionalità specifiche per Goa), i principi si applicano a qualsiasi soluzione
di osservabilità.
{{< /alert >}}

## Cos'è l'Osservabilità?

L'osservabilità è la tua capacità di comprendere cosa sta succedendo all'interno del tuo sistema
osservando i suoi output. In Goa, raggiungiamo questo attraverso tre pilastri principali:

1. **Tracciamento Distribuito**: Seguire le richieste mentre attraversano i tuoi servizi
2. **Metriche**: Misurare il comportamento e le prestazioni del sistema
3. **Log**: Registrare eventi specifici ed errori

## Il Pacchetto Clue

Clue è il pacchetto di osservabilità raccomandato da Goa. È costruito su
[OpenTelemetry](https://opentelemetry.io), lo standard industriale per
l'osservabilità, e fornisce una stretta integrazione con il codice generato da Goa.

Ecco un semplice esempio di come appare l'osservabilità nella pratica:

```go
import (
    "go.opentelemetry.io/otel"                // OpenTelemetry standard
    "go.opentelemetry.io/otel/attribute"      // OpenTelemetry standard
    "goa.design/clue/log"                     // Pacchetto di logging di Clue
)

func (s *Service) CreateOrder(ctx context.Context, order *Order) error {
    // Uso dell'API standard di OpenTelemetry
    ctx, span := otel.Tracer("service").Start(ctx, "create_order")
    defer span.End()

    // Attributi standard di OpenTelemetry
    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount))

    // Metriche standard di OpenTelemetry
    s.orderCounter.Add(ctx, 1,
        attribute.String("type", order.Type))

    // Logging strutturato di Clue (opzionale)
    log.Info(ctx, "elaborazione ordine",
        log.KV{"order_id", order.ID})

    if err := s.processOrder(ctx, order); err != nil {
        // Registrazione standard degli errori di OpenTelemetry
        span.RecordError(err)
        return err
    }

    return nil
}
```

Nota che la maggior parte del codice usa pacchetti standard di OpenTelemetry
(`go.opentelemetry.io/otel/*`). Solo il logging usa codice specifico di Clue, e
anche quello potrebbe essere sostituito con la tua soluzione di logging preferita. Questo significa che puoi:
- Usare qualsiasi backend di osservabilità compatibile con OpenTelemetry
- Passare a una libreria di logging diversa se necessario
- Mantenere il tuo codice di osservabilità portabile

## Perché OpenTelemetry First?

Clue segue un approccio OpenTelemetry-first. Questo significa:

1. **Tracce** sono il tuo principale strumento di debug. Ti mostrano:
   - Il percorso esatto di ogni richiesta
   - Dove viene speso il tempo
   - Quali servizi sono coinvolti
   - Quali errori si sono verificati

2. **Metriche** ti aiutano a monitorare la salute del sistema:
   - Tassi di richieste e latenze
   - Tassi di errore
   - Utilizzo delle risorse
   - Metriche di business

3. **Log** sono usati con parsimonia, principalmente per:
   - Errori fatali
   - Avvio/spegnimento del sistema
   - Debug di problemi specifici

Questo approccio scala meglio del logging tradizionale perché:
- Le tracce forniscono contesto automaticamente
- Le metriche sono più efficienti del parsing dei log
- I log possono concentrarsi su ciò che conta

## Per Iniziare

Per aggiungere l'osservabilità al tuo servizio Goa, dovrai:

1. **Configurare Clue**: Configurare OpenTelemetry con gli esportatori appropriati
2. **Aggiungere strumentazione**: Avvolgere i tuoi handler e client
3. **Definire metriche**: Tracciare comportamenti importanti del sistema
4. **Configurare controlli di salute**: Monitorare le dipendenze del servizio
5. **Abilitare il debugging**: Aggiungere strumenti per la risoluzione dei problemi

Le seguenti guide ti guideranno attraverso ogni passo:

1. [Setup Base](1-setup) - Configurare Clue e OpenTelemetry
2. [Tracciamento](2-tracing) - Implementare il tracciamento distribuito
3. [Metriche](3-metrics) - Aggiungere metriche del servizio
4. [Logging](4-logging) - Configurare il logging
5. [Controlli di Salute](5-health) - Aggiungere monitoraggio della salute
6. [Debugging](6-debugging) - Abilitare strumenti di debug

## Esempio di Servizio

Ecco come appare nella pratica un servizio Goa completamente osservabile:

```go
func main() {
    // 1. Crea logger con formattazione appropriata
    format := log.FormatJSON
    if log.IsTerminal() {
        format = log.FormatTerminal
    }
    ctx := log.Context(context.Background(),
        log.WithFormat(format),
        log.WithFunc(log.Span))

    // 2. Configura OpenTelemetry con esportatori OTLP
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(*coladdr),
        otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "inizializzazione tracciamento fallita")
    }
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(*coladdr),
        otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "inizializzazione metriche fallita")
    }

    // 3. Inizializza Clue con OpenTelemetry
    cfg, err := clue.NewConfig(ctx,
        genservice.ServiceName,
        genservice.APIVersion,
        metricExporter,
        spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)

    // 4. Crea servizio con middleware
    svc := front.New(fc, lc)
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())  // Logging di debug
    endpoints.Use(log.Endpoint)         // Logging delle richieste
    endpoints.Use(middleware.ErrorReporter())

    // 5. Configura handler HTTP con osservabilità
    mux := goahttp.NewMuxer()
    debug.MountDebugLogEnabler(debug.Adapt(mux))  // Controllo dinamico livello log
    debug.MountPprofHandlers(debug.Adapt(mux))    // Endpoint profiling Go
    
    // Aggiungi middleware nell'ordine corretto:
    mux.Use(otelhttp.NewMiddleware(serviceName)) // 3. OpenTelemetry
    mux.Use(debug.HTTP())                        // 2. Endpoint debug
    mux.Use(log.HTTP(ctx))                       // 1. Logging richieste

    // 6. Monta controlli di salute su porta separata
    check := health.Handler(health.NewChecker(
        health.NewPinger("locator", *locatorHealthAddr),
        health.NewPinger("forecaster", *forecasterHealthAddr)))
    http.Handle("/healthz", log.HTTP(ctx)(check))

    // 7. Avvia server con spegnimento graceful
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        log.Printf(ctx, "Server HTTP in ascolto su %s", *httpAddr)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Errorf(ctx, err, "errore server")
        }
    }()

    // Gestisci spegnimento
    <-ctx.Done()
    if err := server.Shutdown(context.Background()); err != nil {
        log.Errorf(ctx, err, "errore spegnimento")
    }
    wg.Wait()
}
```

Questo servizio mostra diverse importanti funzionalità di osservabilità che aiutano
a monitorare e debuggare l'applicazione in produzione. Implementa logging strutturato
che propaga il contesto attraverso il servizio, permettendo alle richieste di essere
tracciate attraverso i componenti. Il servizio integra OpenTelemetry per il tracciamento
distribuito e la raccolta di metriche, fornendo insight sulle prestazioni e sul
comportamento. Gli endpoint di controllo della salute monitorano lo stato delle dipendenze come i
servizi locator e forecaster. Gli endpoint di debug abilitano il profiling del servizio
in esecuzione per identificare colli di bottiglia nelle prestazioni. Il servizio supporta anche il controllo
dinamico del livello di log per regolare la verbosità a runtime senza riavvii. Infine,
implementa la gestione dello spegnimento graceful per pulire correttamente le risorse e
completare le richieste in volo quando si ferma il servizio.

## Per Saperne di Più

- [Documentazione OpenTelemetry](https://opentelemetry.io/docs/)
- [Repository GitHub di Clue](https://github.com/goadesign/clue)
- [Esempio Weather di Clue](https://github.com/goadesign/clue/tree/main/example/weather) 