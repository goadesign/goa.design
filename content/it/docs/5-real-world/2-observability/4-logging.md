---
title: "Logging"
description: "Configurare il logging con Clue"
weight: 4
---

# Strategia di Logging

Mentre OpenTelemetry è la fonte primaria di osservabilità in Clue, i log
mantengono ancora un ruolo importante in determinati scenari. Clue fornisce un sistema
di logging intelligente che bufferizza e formatta efficientemente i messaggi di log,
aiutandoti a mantenere la visibilità controllando costi e prestazioni.

## Caratteristiche Principali

1. **Buffering Intelligente**:
   Il sistema di buffering intelligente di Clue aiuta a ottimizzare costi e prestazioni
   del logging. Bufferizza i log non di errore in memoria fino a quando si verifica un
   errore, momento in cui svuota il buffer per fornire il contesto completo intorno
   all'errore. Per le richieste tracciate, i log vengono automaticamente svuotati per
   garantire la visibilità completa del ciclo di vita della richiesta. Il sistema
   fornisce anche controllo manuale del flush quando hai bisogno di forzare l'output
   dei log in scenari specifici. Per mantenere la flessibilità, il comportamento
   del buffering può essere configurato in base al contesto, permettendoti di
   adattare i pattern di logging a diverse situazioni.

2. **Logging Strutturato**:
   Clue usa il logging strutturato per rendere i log più utili e manutenibili. Tutti
   i campi del log sono memorizzati come coppie chiave-valore, assicurando che possano
   essere facilmente analizzati dagli strumenti di logging. La formattazione
   consistente attraverso tutti i log migliora l'integrazione con i sistemi di
   monitoraggio e analisi. I log possono essere emessi in diversi formati come JSON
   o testo semplice a seconda delle necessità del tuo ambiente. Inoltre, i campi
   basati sul contesto sono automaticamente inclusi per correlare i log con le
   tracce delle richieste, rendendo più facile il debug dei problemi attraverso
   il tuo sistema distribuito.

3. **Prestazioni**:
   Il sistema di logging di Clue è progettato pensando alle prestazioni. Usa
   tecniche di buffering efficienti per minimizzare l'overhead di I/O e impiega
   una gestione intelligente della memoria per mantenere basso l'overhead di
   allocazione. Il sistema può essere configurato per emettere log in modo
   diverso in base alle necessità del tuo ambiente. Puoi anche controllare
   il volume dei log attraverso il logging condizionale, assicurando di
   generare solo i log necessari.

## Setup Base

Il logger deve essere configurato prima dell'uso. Ecco come configurare un logger con opzioni comuni:

```go
// Crea contesto del logger con opzioni
ctx := log.Context(context.Background(),
    // Includi ID degli span nei log per correlazione con le tracce
    log.WithFunc(log.Span),

    // Usa formato JSON per leggibilità macchina
    log.WithFormat(log.FormatJSON),

    // Invia log allo standard output
    log.WithOutput(os.Stdout),

    // Disabilita buffering quando la richiesta viene tracciata
    log.WithDisableBuffering(log.IsTracing))

// Aggiungi campi comuni che saranno inclusi in tutti i log
ctx = log.With(ctx, 
    log.KV{"service", "myservice"},  // Nome servizio per filtraggio
    log.KV{"env", "production"})     // Ambiente per contesto
```

Questa configurazione stabilisce una solida base di logging per il tuo servizio.
Includendo gli ID degli span nei log, puoi facilmente correlare le voci di log
con le tracce distribuite, dandoti un quadro completo dei flussi di richieste
attraverso il tuo sistema. La formattazione JSON assicura che i tuoi log possano
essere elaborati efficientemente da strumenti di aggregazione e analisi dei log.

Per comodità di sviluppo locale, i log sono diretti allo standard output dove
possono essere facilmente visualizzati nel terminale. Il sistema di buffering
intelligente si adatta automaticamente in base al fatto che una richiesta sia
tracciata o meno, ottimizzando sia le prestazioni che l'osservabilità.

Infine, il setup include campi comuni che saranno aggiunti a ogni voce di log,
fornendo un contesto consistente per il filtraggio e l'analisi. Questi campi,
come il nome del servizio e l'ambiente, rendono semplice identificare la fonte
e il contesto di ogni voce di log durante l'investigazione dei problemi.

## Livelli di Log

Clue supporta quattro livelli di severità, ciascuno con uno scopo specifico e regole di buffering diverse:

```go
// Livello Debug - per troubleshooting dettagliato
// Emesso solo quando la modalità debug è abilitata via WithDebug
log.Debug(ctx, "dettagli richiesta",
    log.KV{"headers", req.Headers},
    log.KV{"body_size", len(req.Body)})

// Livello Info - per operazioni normali
// Questi log sono bufferizzati di default e svuotati sugli errori
log.Info(ctx, "elaborazione richiesta",
    log.KV{"requestID", req.ID},
    log.KV{"method", req.Method})

// Livello Warn - per problemi potenziali
// Questi log indicano problemi che non impediscono l'operazione
log.Warn(ctx, "utilizzo risorse alto",
    log.KV{"cpu_usage", cpuUsage},
    log.KV{"memory_usage", memUsage})

// Livello Error - per condizioni di fallimento
// Questi log sono scritti immediatamente e svuotano il buffer
log.Error(ctx, err, "richiesta fallita",
    log.KV{"requestID", req.ID},
    log.KV{"status", http.StatusInternalServerError})

// Livello Fatal - per errori non recuperabili
// Questi log causano l'uscita del programma dopo il logging
log.Fatal(ctx, err, "impossibile avviare server",
    log.KV{"port", config.Port},
    log.KV{"error", err.Error()})
```

Ogni livello ha anche una versione formattata corrispondente che accetta formattazione stile printf:

```go
// Debug con formattazione
log.Debugf(ctx, "elaborazione elemento %d di %d", current, total)

// Info con formattazione
log.Infof(ctx, "richiesta completata in %dms", duration.Milliseconds())

// Warn con formattazione
log.Warnf(ctx, "alta latenza rilevata: %dms", latency.Milliseconds())

// Error con formattazione e oggetto errore
log.Errorf(ctx, err, "fallita elaborazione richiesta: %s", req.ID)

// Fatal con formattazione e oggetto errore
log.Fatalf(ctx, err, "fallita inizializzazione: %s", component)
```

Best practice per i livelli di log:

1. **DEBUG** (SeverityDebug):
   - Usa per informazioni dettagliate di troubleshooting
   - Emesso solo quando la modalità debug è abilitata
   - Ideale per sviluppo e sessioni di debug
   - Può includere dati dettagliati di richiesta/risposta

2. **INFO** (SeverityInfo):
   - Usa per operazioni normali che necessitano di audit
   - Bufferizzato di default per ottimizzare le prestazioni
   - Registra eventi significativi ma attesi
   - Includi informazioni rilevanti per il business

3. **WARN** (SeverityWarn):
   - Usa per situazioni potenzialmente dannose
   - Indica problemi che non impediscono l'operazione
   - Evidenzia limiti di risorse in avvicinamento
   - Segnala uso di funzionalità deprecate

4. **ERROR** (SeverityError):
   - Usa per qualsiasi condizione di errore che richiede attenzione
   - Svuota automaticamente il buffer dei log
   - Includi dettagli dell'errore e contesto
   - Aggiungi stack trace quando disponibili

5. **FATAL** (SeverityError + Exit):
   - Usa solo per errori non recuperabili
   - Causa l'uscita del programma con stato 1
   - Includi tutto il contesto rilevante per post-mortem
   - Usa con parsimonia - la maggior parte degli errori dovrebbe essere recuperabile

Comportamenti speciali:
- I log Debug sono emessi solo quando la modalità debug è abilitata
- I log Info sono bufferizzati di default
- I log Warn indicano problemi che richiedono attenzione
- I log Error svuotano il buffer e disabilitano il buffering
- I log Fatal sono come Error ma causano anche l'uscita del programma

Codifica colori (quando si usa il formato terminale):
- Debug: Grigio (37m)
- Info: Blu (34m)
- Warn: Giallo (33m)
- Error/Fatal: Rosso Brillante (1;31m)

## Logging Strutturato

Il logging strutturato rende più facile analizzare i log. Ecco diversi modi per strutturare i tuoi log:

```go
// Uso di log.KV per coppie chiave-valore ordinate
// Questo è il metodo preferito poiché mantiene l'ordine dei campi
log.Print(ctx,
    log.KV{"action", "user_login"},      // Cosa è successo
    log.KV{"user_id", user.ID},          // A chi è successo
    log.KV{"ip", req.RemoteAddr},        // Contesto addizionale
    log.KV{"duration_ms", duration.Milliseconds()})  // Dati prestazioni

// Uso di log.Fields per logging stile mappa
// Utile quando si lavora con mappe di dati esistenti
log.Print(ctx, log.Fields{
    "action":     "user_login",
    "user_id":    user.ID,
    "ip":         req.RemoteAddr,
    "duration_ms": duration.Milliseconds(),
})

// Aggiunta di campi di contesto che saranno inclusi in tutti i log successivi
// Utile per informazioni nell'ambito della richiesta
ctx = log.With(ctx,
    log.KV{"tenant", tenant.ID},     // Contesto multi-tenant
    log.KV{"region", "us-west"},     // Contesto geografico
    log.KV{"request_id", reqID})     // Correlazione richiesta
```

Best practice per il logging strutturato:
- Usa nomi di campo consistenti attraverso la tua applicazione
- Includi contesto rilevante senza dettagli eccessivi
- Raggruppa campi correlati logicamente
- Considera l'analisi dei log quando scegli i nomi dei campi

## Formati di Output

Scegli un formato di output che corrisponda al tuo ambiente e strumenti:

```go
// Formato testo semplice (logfmt)
// Migliore per sviluppo locale e leggibilità umana
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatText))
// Output: time=2024-02-24T12:34:56Z level=info msg="hello world"

// Formato terminale con colori
// Ottimo per sviluppo locale e debugging
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatTerminal))
// Output: INFO[0000] msg="hello world"

// Formato JSON
// Migliore per produzione e sistemi di aggregazione log
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON))
// Output: {"time":"2024-02-24T12:34:56Z","level":"info","msg":"hello world"}

// Formato personalizzato
// Usa quando hai bisogno di formattazione speciale
ctx := log.Context(context.Background(),
    log.WithFormat(func(entry *log.Entry) []byte {
        return []byte(fmt.Sprintf("[%s] %s: %s\n",
            entry.Time.Format(time.RFC3339),
            entry.Level,
            entry.Message))
    }))
```

Quando scegli un formato di log, considera attentamente il tuo ambiente e i requisiti.
Gli ambienti di sviluppo spesso beneficiano di formati leggibili dall'uomo con
colori e formattazione, mentre i deployment in produzione tipicamente necessitano
di formati analizzabili dalle macchine come JSON per i sistemi di aggregazione
dei log. Il formato che scegli dovrebbe bilanciare la leggibilità umana con le
necessità della tua pipeline di elaborazione dei log. Inoltre, considera l'impatto
sulle prestazioni del formato scelto - mentre JSON fornisce una struttura ricca,
ha più overhead di elaborazione rispetto ai formati di testo semplici.

## Middleware HTTP

Aggiungi logging agli handler HTTP per tracciare richieste e risposte:

```go
// Middleware di logging base
// Logga automaticamente inizio/fine richiesta e durata
handler = log.HTTP(ctx)(handler)

// Middleware personalizzato con logging dettagliato
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Logga dettagli richiesta all'inizio
        log.Info(ctx, "richiesta iniziata",
            log.KV{"method", r.Method},
            log.KV{"path", r.URL.Path},
            log.KV{"user_agent", r.UserAgent()})
            
        start := time.Now()
        sw := &statusWriter{ResponseWriter: w}
        
        next.ServeHTTP(sw, r)
        
        // Logga dettagli risposta e durata
        log.Info(ctx, "richiesta completata",
            log.KV{"status", sw.status},
            log.KV{"duration_ms", time.Since(start).Milliseconds()},
            log.KV{"bytes_written", sw.written})
    })
}
```

Questo middleware fornisce capacità di logging complete per i tuoi servizi HTTP.
Correla automaticamente le richieste con le loro risposte corrispondenti,
permettendoti di tracciare il ciclo di vita completo di ogni richiesta. Le
informazioni temporali sono catturate per aiutare a identificare colli di
bottiglia nelle prestazioni e tracciare le latenze di risposta. Il middleware
monitora anche i codici di stato, rendendo facile rilevare e investigare errori
o risposte inattese. Attraverso il rilevamento degli errori, puoi rapidamente
identificare e debuggare problemi nel tuo servizio. Inoltre, le metriche di
prestazione raccolte dal middleware ti danno preziosi insight sul comportamento
del tuo servizio e ti aiutano a ottimizzarne le prestazioni.

## Interceptor gRPC

Aggiungi logging ai servizi gRPC per un'osservabilità consistente:

```go
// Interceptor unario lato server
// Logga ogni chiamata RPC con metodo e durata
svr := grpc.NewServer(
    grpc.UnaryInterceptor(log.UnaryServerInterceptor(ctx)))

// Interceptor stream lato server
// Logga eventi del ciclo di vita dello stream
svr := grpc.NewServer(
    grpc.StreamInterceptor(log.StreamServerInterceptor(ctx)))

// Interceptor lato client
// Logga RPC in uscita per debugging
conn, err := grpc.DialContext(ctx,
    "localhost:8080",
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()))
```

Questi interceptor forniscono capacità di logging complete per i tuoi servizi gRPC.
Ogni nome di metodo RPC viene automaticamente loggato, permettendoti di tracciare
quali endpoint vengono chiamati. Gli interceptor monitorano i codici di stato
restituiti dai tuoi servizi, rendendo facile identificare chiamate riuscite
rispetto ai fallimenti. Misurano la durata di ogni chiamata RPC, aiutandoti a
comprendere le caratteristiche di prestazione e identificare richieste lente.
Quando si verificano errori, vengono automaticamente loggati con contesto
rilevante per aiutare il debugging. Gli interceptor catturano anche i metadata
associati a ogni chiamata, fornendo contesto addizionale sull'invocazione RPC
come token di autenticazione o ID di correlazione.

## Compatibilità con Logger Standard

Usa il logger di Clue con codice compatibile con la libreria standard:

```go
// Crea un logger standard che usa il sistema di logging di Clue
logger := log.AsStdLogger(ctx)

// Usa funzioni del pacchetto log standard
logger.Print("hello world")               // Logging base
logger.Printf("hello %s", "world")        // Stringa di formato
logger.Println("hello world")             // Con newline

// Funzioni di logging fatal
logger.Fatal("errore fatale")             // Log ed exit
logger.Fatalf("fatale: %v", err)          // Formato ed exit
logger.Fatalln("errore fatale")           // Con newline
```

Il layer di compatibilità fornisce diversi benefici importanti per i team che
adottano il sistema di logging di Clue. Abilita un'integrazione senza soluzione
di continuità con le basi di codice esistenti che si affidano al logger della
libreria standard, permettendo ai team di mantenere la funzionalità mentre
transitano a Clue. Questo rende possibile migrare gradualmente diverse parti
di un'applicazione al logging strutturato senza interrompere le operazioni.

Il layer assicura una gestione consistente dei log attraverso sia i percorsi
di codice nuovi che legacy, mantenendo un'esperienza di logging unificata.
Tutti i log, sia da componenti moderni che legacy, fluiscono attraverso la
stessa pipeline e ricevono la stessa formattazione ed elaborazione. Inoltre,
mantenendo la compatibilità con l'interfaccia di logging della libreria
standard di Go, i team possono continuare a usare pattern di logging familiari
mentre guadagnano le funzionalità avanzate del sistema di logging di Clue.

## Integrazione con Goa

Usa il logger di Clue con servizi Goa:

```go
// Crea un logger compatibile con middleware Goa
logger := log.AsGoaMiddlewareLogger(ctx)

// Usa logger nel servizio Goa
svc := myservice.New(logger)

// Aggiungi middleware di logging a tutti gli endpoint
endpoints := genmyservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)
```

L'integrazione del logging di Clue con Goa fornisce diversi benefici importanti
per il tuo servizio. L'integrazione assicura pattern di logging consistenti
attraverso tutti i tuoi servizi, rendendo più facile monitorare e debuggare
l'intero sistema. Attraverso la propagazione automatica del contesto, i log
mantengono la loro relazione con le richieste mentre fluiscono attraverso
diversi componenti del servizio.

L'integrazione gestisce automaticamente il logging di richieste e risposte,
dandoti visibilità sui dati che fluiscono attraverso le tue API. Quando si
verificano errori, vengono automaticamente tracciati e loggati con contesto
appropriato e stack trace. Questo rende il troubleshooting molto più efficiente.

Inoltre, l'integrazione include capacità di monitoraggio delle prestazioni
integrate. Traccia metriche importanti come la durata delle richieste e ti
aiuta a identificare colli di bottiglia nelle prestazioni nei tuoi servizi.
Questo approccio completo al logging e monitoraggio aiuta i team a mantenere
servizi affidabili e performanti.

## Best Practice

1. **Livelli di Log**:
   - Usa INFO per operazioni normali che necessitano di audit
   - Usa DEBUG per informazioni dettagliate necessarie durante il troubleshooting
   - Usa WARN per situazioni potenzialmente dannose che non impediscono l'operazione
   - Usa ERROR per qualsiasi condizione di errore che richiede attenzione
   - Usa FATAL solo per errori non recuperabili che impediscono l'operazione

2. **Dati Strutturati**:
   - Usa sempre logging strutturato con nomi di campo consistenti
   - Includi contesto rilevante senza dettagli eccessivi
   - Usa tipi di dati appropriati per i valori
   - Evita di loggare informazioni sensibili

3. **Prestazioni**:
   - Sfrutta il buffering per i log non di errore
   - Usa livelli di log appropriati per controllare il volume
   - Monitora volume dei log e costi di storage
   - Configura politiche di ritenzione basate sulle necessità

4. **Contesto**:
   - Propaga sempre il contesto attraverso la tua applicazione
   - Aggiungi campi rilevanti a ogni livello
   - Includi ID di correlazione per il tracciamento delle richieste
   - Mantieni consistenza nei nomi dei campi

## Per Saperne di Più

Per maggiori informazioni sul logging:

- [Pacchetto Log di Clue](https://pkg.go.dev/goa.design/clue/log)
  Documentazione completa delle capacità di logging di Clue

- [Interfaccia Logger di Go](https://pkg.go.dev/log)
  Documentazione dell'interfaccia di logging della libreria standard 