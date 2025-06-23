---
title: "Metriche del Servizio"
description: "Implementare le metriche del servizio con OpenTelemetry"
weight: 3
---

Le applicazioni moderne necessitano di dati quantitativi per comprendere il loro comportamento e le prestazioni.
Quante richieste stiamo gestendo? Quanto tempo impiegano? Stiamo esaurendo le
risorse? Le metriche aiutano a rispondere a queste domande fornendo misurazioni numeriche
del funzionamento del tuo servizio.

## Comprendere le Metriche

OpenTelemetry fornisce diversi strumenti di misurazione, ciascuno progettato per esigenze specifiche. Ogni strumento è definito da:
- **Nome**: Cosa stai misurando (es. `http.requests.total`)
- **Tipo**: Come si comporta il valore (es. solo incrementa, può salire e scendere)
- **Unità**: Unità di misura opzionale (es. `ms`, `bytes`)
- **Descrizione**: Spiegazione opzionale di ciò che rappresenta la metrica

Esploriamo ogni tipo di strumento:

### Strumenti Sincroni
Questi strumenti vengono chiamati direttamente nel codice quando accade qualcosa:

1. **Counter**
   Un valore che può solo aumentare, come il contachilometri di un'auto:
   ```go
   // Contatore per le richieste HTTP totali
   requestCounter, _ := meter.Int64Counter("http.requests.total",
       metric.WithDescription("Numero totale di richieste HTTP"),
       metric.WithUnit("{requests}"))
   
   // Utilizzo: Incrementa quando ricevi una richiesta
   requestCounter.Add(ctx, 1)
   ```
   Perfetto per:
   - Conteggio delle richieste
   - Byte elaborati
   - Attività completate

2. **UpDownCounter**
   Un valore che può aumentare o diminuire, come gli elementi in una coda:
   ```go
   // Contatore bidirezionale per gli elementi in coda
   queueSize, _ := meter.Int64UpDownCounter("queue.items",
       metric.WithDescription("Elementi attuali in coda"),
       metric.WithUnit("{items}"))
   
   // Utilizzo: Aggiungi quando inserisci, sottrai quando rimuovi
   queueSize.Add(ctx, 1)  // Elemento aggiunto
   queueSize.Add(ctx, -1) // Elemento rimosso
   ```
   Perfetto per:
   - Lunghezze delle code
   - Numero di connessioni attive
   - Dimensione del pool di thread

3. **Histogram**
   Traccia la distribuzione dei valori, come la durata delle richieste:
   ```go
   // Istogramma per la durata delle richieste HTTP
   latency, _ := meter.Float64Histogram("http.request.duration",
       metric.WithDescription("Durata delle richieste HTTP"),
       metric.WithUnit("ms"))
   
   // Utilizzo: Registra il valore quando la richiesta è completata
   latency.Record(ctx, time.Since(start).Milliseconds())
   ```
   Perfetto per:
   - Latenze delle richieste
   - Dimensioni delle risposte
   - Tempi di attesa in coda

### Strumenti Asincroni
Questi strumenti vengono raccolti periodicamente tramite callback che registri:

1. **Contatore Asincrono**
   Per valori che solo aumentano, ma hai accesso solo al totale:
   ```go
   // Contatore asincrono per i byte ricevuti
   bytesReceived, _ := meter.Int64ObservableCounter("network.bytes.received",
       metric.WithDescription("Totale byte ricevuti"),
       metric.WithUnit("By"))
   
   // Utilizzo: Registra callback per raccogliere il valore corrente
   meter.RegisterCallback([]instrument.Asynchronous{bytesReceived},
       func(ctx context.Context) {
           bytesReceived.Observe(ctx, getNetworkStats().TotalBytesReceived)
       })
   ```
   Perfetto per:
   - Totale byte trasferiti
   - Tempo di attività del sistema
   - Eventi cumulativi da sistemi esterni

2. **Contatore Bidirezionale Asincrono**
   Per valori che possono cambiare in entrambe le direzioni, ma vedi solo lo stato corrente:
   ```go
   // Contatore bidirezionale asincrono per le goroutine
   goroutines, _ := meter.Int64ObservableUpDownCounter("system.goroutines",
       metric.WithDescription("Numero corrente di goroutine"),
       metric.WithUnit("{goroutines}"))
   
   // Utilizzo: Registra callback per raccogliere il valore corrente
   meter.RegisterCallback([]instrument.Asynchronous{goroutines},
       func(ctx context.Context) {
           goroutines.Observe(ctx, int64(runtime.NumGoroutine()))
       })
   ```
   Perfetto per:
   - Conteggio connessioni correnti
   - Dimensione pool di risorse
   - Conteggio thread

3. **Gauge Asincrono**
   Per misurazioni del valore corrente che campioni periodicamente:
   ```go
   // Gauge asincrono per l'utilizzo della CPU
   cpuUsage, _ := meter.Float64ObservableGauge("system.cpu.usage",
       metric.WithDescription("Percentuale di utilizzo CPU"),
       metric.WithUnit("1"))
   
   // Utilizzo: Registra callback per raccogliere il valore corrente
   meter.RegisterCallback([]instrument.Asynchronous{cpuUsage},
       func(ctx context.Context) {
           cpuUsage.Observe(ctx, getCPUUsage())
       })
   ```
   Perfetto per:
   - Utilizzo CPU
   - Utilizzo memoria
   - Letture temperatura
   - Spazio su disco

### Scegliere lo Strumento Giusto

1. Poniti queste domande:
   - Ho bisogno di registrare valori quando accadono (sincrono) o controllare periodicamente lo stato (asincrono)?
   - Il valore può solo aumentare (Counter) o sia aumentare che diminuire (UpDownCounter)?
   - Ho bisogno di analizzare la distribuzione dei valori (Histogram)?
   - Sto misurando uno stato corrente (Gauge)?

2. Casi d'uso comuni:
   - Conteggio eventi → Counter
   - Misurazione durate → Histogram
   - Utilizzo risorse → Asynchronous Gauge
   - Dimensioni code → UpDownCounter
   - Statistiche sistema → Strumenti asincroni

## Metriche Automatiche

Clue strumenta automaticamente diverse metriche chiave per il tuo servizio. Queste forniscono
visibilità immediata senza scrivere codice:

### Metriche Server HTTP
Quando avvolgi i tuoi handler HTTP con il middleware OpenTelemetry:
```go
mux.Use(otelhttp.NewMiddleware("service"))
```

Ottieni automaticamente:
- **Conteggio Richieste**: Richieste totali per percorso, metodo e codice di stato
- **Istogrammi Durata**: Quanto tempo impiegano le richieste per essere elaborate
- **Richieste In Corso**: Numero corrente di richieste attive
- **Dimensioni Risposte**: Distribuzione delle dimensioni dei payload di risposta

### Metriche Server gRPC
Quando crei un server gRPC con strumentazione OpenTelemetry:
```go
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()))
```

Ottieni automaticamente:
- **Conteggio RPC**: RPC totali per metodo e codice di stato
- **Istogrammi Durata**: Quanto tempo impiegano le RPC per completarsi
- **RPC In Corso**: Numero corrente di RPC attive
- **Dimensioni Messaggi**: Distribuzione delle dimensioni di richieste/risposte

## Metriche Personalizzate

Mentre le metriche automatiche sono utili, spesso hai bisogno di tracciare misurazioni
specifiche del business. Ecco come creare e utilizzare metriche personalizzate efficacemente:

### Creazione di Metriche

Prima, ottieni un meter per il tuo servizio:
```go
meter := otel.Meter("myservice")
```

Poi crea le metriche necessarie:

1. **Esempio Counter**: Traccia eventi di business
   ```go
   // Contatore per gli ordini totali
   orderCounter, _ := meter.Int64Counter("orders.total",
       metric.WithDescription("Numero totale di ordini elaborati"),
       metric.WithUnit("{orders}"))
   ```

2. **Esempio Histogram**: Misura tempi di elaborazione
   ```go
   // Istogramma per i tempi di elaborazione
   processingTime, _ := meter.Float64Histogram("order.processing_time",
       metric.WithDescription("Tempo impiegato per elaborare gli ordini"),
       metric.WithUnit("ms"))
   ```

3. **Esempio Gauge**: Monitora profondità coda
   ```go
   // Gauge per la profondità della coda
   queueDepth, _ := meter.Int64UpDownCounter("orders.queue_depth",
       metric.WithDescription("Numero corrente di ordini in coda"),
       metric.WithUnit("{orders}"))
   ```

### Utilizzo delle Metriche

Vediamo un esempio completo che dimostra come utilizzare diversi tipi di
metriche in uno scenario reale. Questo esempio mostra come monitorare un
sistema di elaborazione ordini:

```go
func processOrder(ctx context.Context, order *Order) error {
    // Traccia ordini totali (counter)
    // Incrementiamo il contatore di 1 per ogni ordine, aggiungendo attributi per l'analisi
    orderCounter.Add(ctx, 1,
        attribute.String("type", order.Type),
        attribute.String("customer", order.CustomerID))

    // Misura tempo di elaborazione (histogram)
    // Usiamo un defer per assicurarci di registrare sempre la durata, anche se la funzione termina prima
    start := time.Now()
    defer func() {
        processingTime.Record(ctx,
            time.Since(start).Milliseconds(),
            attribute.String("type", order.Type))
    }()

    // Monitora profondità coda (gauge)
    // Tracciamo la dimensione della coda incrementando quando aggiungiamo e decrementando quando finito
    queueDepth.Add(ctx, 1)  // Incrementa quando aggiungi alla coda
    defer queueDepth.Add(ctx, -1)  // Decrementa quando finito

    return processOrderInternal(ctx, order)
}
```

Questo esempio dimostra diverse best practice:
- Uso di contatori per eventi discreti (ordini elaborati)
- Uso di istogrammi per le durate (tempo di elaborazione)
- Uso di gauge per lo stato corrente (profondità coda)
- Aggiunta di attributi rilevanti per l'analisi
- Pulizia appropriata con istruzioni defer

## Indicatori di Livello di Servizio (SLI) 

Gli Indicatori di Livello di Servizio (SLI) sono metriche chiave che aiutano a comprendere la
salute e le prestazioni del tuo servizio. I quattro segnali d'oro (Latenza, Traffico, Errori e
Saturazione) forniscono una visione completa del comportamento del tuo servizio. Vediamo
come implementare ciascuno:

### 1. Latenza
La latenza misura quanto tempo serve per gestire le richieste. Questo esempio mostra come
tracciare la durata delle richieste in un middleware HTTP:

```go
// Crea un istogramma per tracciare la durata delle richieste
requestDuration, _ := meter.Float64Histogram("http.request.duration",
    metric.WithDescription("Durata delle richieste HTTP"),
    metric.WithUnit("ms"))

// Middleware per misurare la durata delle richieste
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        // Registra la durata con il percorso della richiesta come attributo
        requestDuration.Record(r.Context(),
            time.Since(start).Milliseconds(),
            attribute.String("path", r.URL.Path))
    })
}
```

### 2. Traffico
Il traffico misura la domanda sul tuo sistema. Questo esempio conta le richieste HTTP:

```go
// Crea un contatore per le richieste in arrivo
requestCount, _ := meter.Int64Counter("http.request.count",
    metric.WithDescription("Totale richieste HTTP"),
    metric.WithUnit("{requests}"))

// Middleware per contare le richieste
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Incrementa il contatore con attributi metodo e percorso
        requestCount.Add(r.Context(), 1,
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path))
        next.ServeHTTP(w, r)
    })
}
```

### 3. Errori
Il tracciamento degli errori aiuta a identificare problemi nel tuo servizio. Questo esempio conta gli errori HTTP 5xx:

```go
// Crea un contatore per gli errori del server
errorCount, _ := meter.Int64Counter("http.error.count",
    metric.WithDescription("Totale errori HTTP"),
    metric.WithUnit("{errors}"))

// Middleware per tracciare gli errori
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Usa un ResponseWriter personalizzato per catturare il codice di stato
        sw := &statusWriter{ResponseWriter: w}
        next.ServeHTTP(sw, r)
        
        // Conta gli errori 5xx
        if sw.status >= 500 {
            errorCount.Add(r.Context(), 1,
                attribute.Int("status_code", sw.status),
                attribute.String("path", r.URL.Path))
        }
    })
}
```

### 4. Saturazione
La saturazione misura quanto è "pieno" il tuo servizio. Questo esempio monitora le risorse di sistema:

```go
// Crea gauge per l'utilizzo di CPU e memoria
cpuUsage, _ := meter.Float64ObservableGauge("system.cpu.usage",
    metric.WithDescription("Percentuale di utilizzo CPU"),
    metric.WithUnit("1"))

memoryUsage, _ := meter.Int64ObservableGauge("system.memory.usage",
    metric.WithDescription("Utilizzo memoria in bytes"),
    metric.WithUnit("By"))

// Avvia una goroutine per raccogliere periodicamente le metriche di sistema
go func() {
    ticker := time.NewTicker(time.Second)
    for range ticker.C {
        ctx := context.Background()
        
        // Aggiorna utilizzo CPU
        var cpu float64
        cpuUsage.Observe(ctx, getCPUUsage())
        
        // Aggiorna utilizzo memoria usando statistiche runtime
        var mem runtime.MemStats
        runtime.ReadMemStats(&mem)
        memoryUsage.Observe(ctx, int64(mem.Alloc))
    }
}()
```

## Esportatori di Metriche

Una volta strumentato il codice con le metriche, devi esportarle in un sistema di monitoraggio. Ecco esempi di esportatori comuni:

### Prometheus
Prometheus è una scelta popolare per la raccolta di metriche. Ecco come configurarlo:

```go
// Crea un esportatore Prometheus con limiti personalizzati per gli istogrammi
exporter, err := prometheus.New(prometheus.Config{
    DefaultHistogramBoundaries: []float64{
        1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, // in millisecondi
    },
})
```

I limiti degli istogrammi sono cruciali per misurazioni accurate della latenza. Scegli limiti che coprano il tuo intervallo di latenza previsto.

### Protocollo OpenTelemetry (OTLP)
OTLP è il protocollo nativo per OpenTelemetry. Usalo per inviare metriche ai collettori:

```go
// Crea un esportatore OTLP che si connette a un collettore
exporter, err := otlpmetricgrpc.New(ctx,
    otlpmetricgrpc.WithEndpoint("collector:4317"),
    otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
```

Ricorda di configurare TLS appropriatamente negli ambienti di produzione.

## Best Practice

### 1. Convenzioni di Denominazione
Segui un pattern consistente per rendere le metriche scopribili e comprensibili:
```
<namespace>.<tipo>.<nome>
```

Per esempio:
- `http.request.duration` - Latenza richieste HTTP
- `database.connection.count` - Numero di connessioni DB
- `order.processing.time` - Durata elaborazione ordini

Il pattern aiuta gli utenti a trovare e comprendere le metriche senza consultare la documentazione.

### 2. Unità di Misura
Specifica sempre le unità nelle descrizioni delle metriche per evitare ambiguità:
- Tempo: `ms` (millisecondi), `s` (secondi)
- Byte: `By` (byte)
- Conteggi: `{requests}`, `{errors}`
- Rapporti: `1` (adimensionale)

Usare unità consistenti rende le metriche comparabili e previene errori di conversione.

### 3. Prestazioni
Considera questi fattori per mantenere buone prestazioni:

- **Intervalli di raccolta**: Scegli intervalli appropriati basati sulla volatilità della metrica
  - Cambiamenti ad alta frequenza: 1-5 secondi
  - Metriche stabili: 15-60 secondi
  - Metriche che consumano risorse: 5+ minuti

- **Aggiornamenti in batch**: Raggruppa gli aggiornamenti delle metriche quando possibile
  ```go
  // Invece di questo:
  counter.Add(ctx, 1)
  counter.Add(ctx, 1)
  
  // Fai questo:
  counter.Add(ctx, 2)
  ```

- **Crescita della cardinalità**: Monitora il numero di serie temporali uniche
  - Imposta limiti sulle combinazioni di attributi
  - Rivedi e pulisci regolarmente le metriche inutilizzate
  - Usa regole di registrazione per metriche ad alta cardinalità

- **Aggregazione**: Pre-aggrega metriche ad alto volume
  ```go
  // Invece di registrare ogni richiesta:
  histogram.Record(ctx, duration)
  
  // Raggruppa e registra sommari:
  type window struct {
      count int64
      sum   float64
  }
  ```

### 4. Documentazione
Documenta ogni metrica accuratamente per aiutare gli utenti a comprenderle e utilizzarle efficacemente:

Documentazione richiesta:
- **Descrizione chiara**: Cosa misura la metrica e perché è importante
- **Unità di misura**: L'unità specifica utilizzata (es. millisecondi, byte)
- **Valori attributi validi**: Lista dei valori previsti per ogni attributo
- **Frequenza di aggiornamento**: Quanto spesso la metrica viene aggiornata
- **Periodo di conservazione**: Per quanto tempo i dati della metrica vengono conservati

Esempio di documentazione:
```go
// http.request.duration misura il tempo impiegato per elaborare le richieste HTTP.
// Unità: millisecondi
// Attributi:
//   - method: Metodo HTTP (GET, POST, ecc.)
//   - path: Percorso della richiesta
//   - status_code: Codice di stato HTTP
// Frequenza di aggiornamento: Per richiesta
// Conservazione: 30 giorni
requestDuration, _ := meter.Float64Histogram(
    "http.request.duration",
    metric.WithDescription("Tempo impiegato per elaborare le richieste HTTP"),
    metric.WithUnit("ms"))
```

## Per Saperne di Più

Per informazioni più dettagliate sulle metriche:

- [OpenTelemetry Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)
  La guida ufficiale ai concetti e all'implementazione delle metriche OpenTelemetry.

- [Convenzioni Semantiche delle Metriche](https://opentelemetry.io/docs/concepts/semantic-conventions/)
  Nomi e attributi standard per metriche comuni.

- [Best Practice Prometheus](https://prometheus.io/docs/practices/naming/)
  Eccellente guida sulla denominazione delle metriche e le etichette.

- [Quattro Segnali d'Oro](https://sre.google/sre-book/monitoring-distributed-systems/)
  La guida di Google alle metriche essenziali dei servizi.

Queste risorse forniscono approfondimenti sull'implementazione delle metriche e le best practice.

### Scelta degli Attributi

Gli attributi forniscono contesto alle tue metriche, rendendole più utili per l'analisi. Tuttavia, scegliere gli attributi giusti richiede un'attenta considerazione per evitare problemi di prestazioni e mantenere la qualità dei dati.

Buoni attributi da includere:
- **Alta cardinalità**: `customer_type`, `order_status`, `error_code`
  Questi attributi hanno un insieme limitato di valori possibili e forniscono raggruppamenti significativi.
- **Rilevanti per il business**: `subscription_tier`, `payment_method`
  Questi aiutano a correlare le metriche con i risultati di business.
- **Raggruppamento tecnico**: `region`, `datacenter`, `instance_type`
  Questi permettono di analizzare le prestazioni per componente infrastrutturale.