---
title: "Debugging"
description: "Debugging e profiling runtime con Clue"
weight: 6
---

Il debugging e il profiling runtime sono essenziali per comprendere il comportamento
del servizio e diagnosticare problemi in ambienti di produzione. Clue fornisce un
set completo di strumenti che ti aiutano a investigare problemi, analizzare le
prestazioni e monitorare il comportamento del sistema senza impattare l'operatività
del tuo servizio.

## Panoramica

Il toolkit di debugging di Clue include diverse funzionalità potenti:

- **Controllo Log Dinamico**: Regola i livelli di log a runtime senza riavvii
- **Logging dei Payload**: Cattura e analizza dati di richieste/risposte
- **Profiling Go**: Supporto integrato per gli strumenti pprof di Go
- **Analisi Memoria**: Traccia e analizza pattern di utilizzo memoria
- **Debug Personalizzato**: Framework estensibile per debugging specifico del servizio

## Controllo Log di Debug

Il controllo dinamico del livello di log permette di regolare la verbosità dei log
nei servizi in esecuzione. Questo è particolarmente utile quando si investigano
problemi in ambienti di produzione:

```go
// Monta abilitatore log di debug
// Questo aggiunge endpoint per controllare i livelli di log
debug.MountDebugLogEnabler(mux)

// Aggiungi middleware di debug agli handler HTTP
// Questo abilita il logging di debug dinamico per le richieste HTTP
handler = debug.HTTP()(handler)

// Aggiungi interceptor di debug al server gRPC
// Questo abilita il logging di debug dinamico per le chiamate gRPC
svr := grpc.NewServer(
    grpc.UnaryInterceptor(debug.UnaryServerInterceptor()))
```

Controlla il logging di debug attraverso endpoint HTTP:
```bash
# Abilita log di debug per investigazione dettagliata
curl "http://localhost:8080/debug?debug-logs=on"

# Disabilita log di debug quando l'investigazione è completa
curl "http://localhost:8080/debug?debug-logs=off"

# Controlla stato corrente del logging di debug
curl "http://localhost:8080/debug"
```

## Logging dei Payload

Il logging dei payload cattura il contenuto delle richieste e risposte per il debugging
di problemi di integrazione API. Si attiva solo quando il livello di log di debug è
abilitato, rendendolo uno strumento potente quando combinato con il controllo dinamico
del livello di log. Questo permette di:

1. Abilitare il logging di debug quando necessario: `curl "http://localhost:8080/debug?debug-logs=on"`
2. Vedere informazioni dettagliate sui payload delle richieste
3. Disabilitare il logging di debug quando finito: `curl "http://localhost:8080/debug?debug-logs=off"`

Ecco come configurarlo:

```go
// Abilita logging dei payload per tutti gli endpoint
// Questo cattura i body delle richieste e risposte per analisi
// Nota: I payload sono loggati solo quando il livello debug è attivo
endpoints := genapi.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())

// Esempio di output log di debug che mostra il payload catturato
// Appare solo quando il logging di debug è abilitato
{
    "level": "debug",
    "msg": "payload richiesta",
    "path": "/users",
    "method": "POST",
    "payload": {
        "name": "John Doe",
        "email": "john@example.com"
    }
}
```

Questo approccio fornisce diversi benefici:

- **Prestazioni**: Nessun overhead di logging dei payload in operazione normale
- **Sicurezza**: Dati sensibili dei payload esposti solo quando esplicitamente abilitato
- **Flessibilità**: Abilita/disabilita logging dei payload a runtime
- **Debugging**: Contesto completo di richiesta/risposta quando necessario

Flusso di lavoro tipico di debugging:
```bash
# 1. Abilita logging di debug quando investighi un problema
curl "http://localhost:8080/debug?debug-logs=on"

# 2. Riproduci il problema - i payload saranno loggati
# 3. Analizza i payload loggati

# 4. Disabilita logging di debug quando l'investigazione è completa
curl "http://localhost:8080/debug?debug-logs=off"
```

## Endpoint di Profiling

Gli strumenti di profiling pprof di Go forniscono insight profondi nelle prestazioni
del servizio. Clue rende facile esporre questi endpoint:

```go
// Monta tutti gli handler pprof in una volta
// Questo abilita la suite completa di strumenti di profiling Go
debug.MountDebugPprof(mux)

// Oppure monta handler specifici per maggior controllo
mux.HandleFunc("/debug/pprof/", pprof.Index)          // Indice profili
mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline) // Linea comando
mux.HandleFunc("/debug/pprof/profile", pprof.Profile) // Profilo CPU
mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)   // Lookup simboli
mux.HandleFunc("/debug/pprof/trace", pprof.Trace)     // Traccia esecuzione
```

Usa questi endpoint con gli strumenti di profiling di Go:

```bash
# Raccogli e analizza profilo CPU
go tool pprof http://localhost:8080/debug/pprof/profile
# Apre shell interattiva pprof per analisi CPU

# Analizza utilizzo memoria heap
go tool pprof http://localhost:8080/debug/pprof/heap
# Mostra pattern di allocazione memoria

# Investiga comportamento goroutine
go tool pprof http://localhost:8080/debug/pprof/goroutine
# Visualizza stack e stati delle goroutine

# Cattura traccia esecuzione
curl -o trace.out http://localhost:8080/debug/pprof/trace
go tool trace trace.out
# Apre visualizzazione dettagliata esecuzione
```

Per maggiori informazioni sul profiling:
- [Profiling Programmi Go](https://go.dev/blog/pprof)
  Post ufficiale blog Go sull'uso di pprof
- [Runtime pprof](https://pkg.go.dev/runtime/pprof)
  Documentazione pacchetto per pprof
- [Debugging Problemi Prestazioni](https://golang.org/doc/diagnostics.html)
  Documentazione ufficiale diagnostica Go

## Endpoint di Debug Personalizzati

Crea endpoint di debug specifici del servizio per esporre informazioni runtime importanti:

```go
// Endpoint configurazione debug
// Espone configurazione corrente servizio
type Config struct {
    LogLevel      string            `json:"log_level"`      // Livello logging corrente
    Features      map[string]bool   `json:"features"`       // Stati feature flag
    RateLimit     int              `json:"rate_limit"`      // Limiti rate correnti
    Dependencies  []string         `json:"dependencies"`    // Dipendenze servizio
}

func debugConfig(w http.ResponseWriter, r *http.Request) {
    cfg := Config{
        LogLevel: log.GetLevel(r.Context()),
        Features: getFeatureFlags(),
        RateLimit: getRateLimit(),
        Dependencies: getDependencies(),
    }
    
    json.NewEncoder(w).Encode(cfg)
}

// Endpoint metriche debug
// Fornisce metriche servizio in tempo reale
func debugMetrics(w http.ResponseWriter, r *http.Request) {
    metrics := struct {
        Goroutines  int     `json:"goroutines"`     // Goroutine attive
        Memory      uint64  `json:"memory_bytes"`    // Utilizzo memoria corrente
        Uptime      int64   `json:"uptime_seconds"`  // Uptime servizio
        Requests    int64   `json:"total_requests"`  // Conteggio richieste
    }{
        Goroutines: runtime.NumGoroutine(),
        Memory:     getMemoryUsage(),
        Uptime:     getUptime(),
        Requests:   getRequestCount(),
    }
    
    json.NewEncoder(w).Encode(metrics)
}

// Monta endpoint debug
mux.HandleFunc("/debug/config", debugConfig)
mux.HandleFunc("/debug/metrics", debugMetrics)
```

## Analisi Memoria

I problemi di memoria possono essere difficili da diagnosticare in ambienti di
produzione. Clue fornisce strumenti per monitorare e analizzare pattern di utilizzo
memoria in tempo reale:

```go
// Endpoint statistiche memoria
// Fornisce informazioni dettagliate utilizzo memoria
type MemStats struct {
    Alloc      uint64  `json:"alloc"`          // Byte attualmente allocati
    TotalAlloc uint64  `json:"total_alloc"`    // Byte totali allocati
    Sys        uint64  `json:"sys"`            // Memoria totale ottenuta
    NumGC      uint32  `json:"num_gc"`         // Numero cicli GC
    PauseTotalNs uint64  `json:"pause_total_ns"` // Tempo totale pause GC
}

func debugMemory(w http.ResponseWriter, r *http.Request) {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    stats := MemStats{
        Alloc:      m.Alloc,
        TotalAlloc: m.TotalAlloc,
        Sys:        m.Sys,
        NumGC:      m.NumGC,
        PauseTotalNs: m.PauseTotalNs,
    }
    
    json.NewEncoder(w).Encode(stats)
}

// Trigger GC manuale per testing
// Usa con cautela in produzione
func debugGC(w http.ResponseWriter, r *http.Request) {
    runtime.GC()
    w.Write([]byte("GC attivato"))
}
```

Metriche chiave da monitorare:
- **Alloc**: Memoria heap attualmente allocata
- **TotalAlloc**: Allocazione cumulativa dall'avvio
- **Sys**: Memoria totale ottenuta dal sistema
- **NumGC**: Numero di cicli GC completati
- **PauseTotalNs**: Tempo totale speso in pause GC

Per maggiori informazioni sulla gestione della memoria:
- [Gestione Memoria](https://golang.org/doc/gc-guide)
  Guida completa alla garbage collection di Go
- [Statistiche Runtime](https://pkg.go.dev/runtime#MemStats)
  Documentazione dettagliata statistiche memoria
- [Profiling Memoria](https://golang.org/doc/diagnostics#memory)
  Guida al profiling memoria in Go

## Analisi Goroutine

Leak di goroutine e deadlock possono causare seri problemi in produzione. Questi
strumenti ti aiutano a tracciare e debuggare il comportamento delle goroutine:

```go
// Endpoint statistiche goroutine
// Fornisce informazioni dettagliate sugli stati delle goroutine
type GoroutineStats struct {
    Count     int      `json:"count"`      // Totale goroutine
    Blocked   int      `json:"blocked"`    // Goroutine bloccate
    Running   int      `json:"running"`    // Goroutine in esecuzione
    Waiting   int      `json:"waiting"`    // Goroutine in attesa
    Stacktrace []string `json:"stacktrace"` // Stack tutte le goroutine
}

func debugGoroutines(w http.ResponseWriter, r *http.Request) {
    // Cattura stack di tutte le goroutine
    buf := make([]byte, 2<<20)
    n := runtime.Stack(buf, true)
    
    // Analizza stati goroutine
    stats := GoroutineStats{
        Count:     runtime.NumGoroutine(),
        Stacktrace: strings.Split(string(buf[:n]), "\n"),
    }
    
    json.NewEncoder(w).Encode(stats)
}
```

Problemi comuni delle goroutine da monitorare:
- Conteggio goroutine in costante aumento
- Grande numero di goroutine bloccate
- Goroutine di lunga durata
- Goroutine in deadlock
- Leak di risorse nelle goroutine

Per maggiori informazioni sulle goroutine:
- [Pattern di Concorrenza Go](https://go.dev/blog/pipelines)
  Best practice per gestione goroutine
- [Scheduler Runtime](https://golang.org/doc/go1.14#runtime)
  Comprendere lo scheduler delle goroutine di Go
- [Rilevamento Deadlock](https://golang.org/doc/articles/race_detector)
  Usare il race detector di Go

## Considerazioni di Sicurezza

Gli endpoint di debug possono esporre informazioni sensibili. Implementa sempre
misure di sicurezza appropriate:

```go
// Middleware debug con autenticazione
// Assicura solo accesso autorizzato agli endpoint debug
func debugAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verifica token debug dagli header
        token := r.Header.Get("X-Debug-Token")
        if !validateDebugToken(token) {
            http.Error(w, "Non autorizzato", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// Rate limiting per endpoint debug
// Previene abuso ed esaurimento risorse
func debugRateLimit(next http.Handler) http.Handler {
    // Permetti 10 richieste al secondo
    limiter := rate.NewLimiter(rate.Every(time.Second), 10)
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            http.Error(w, "Troppe Richieste", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
```

## Best Practice

1. **Sicurezza**:
   - Proteggi sempre gli endpoint debug in produzione
   - Usa meccanismi di autenticazione forti
   - Implementa rate limiting per prevenire abusi
   - Monitora e audita accesso agli endpoint debug
   - Limita informazioni debug a utenti autorizzati

2. **Prestazioni**:
   - Mantieni overhead debug minimo
   - Usa campionamento per dati ad alto volume
   - Implementa raccolta dati efficiente
   - Monitora impatto sulle prestazioni del servizio
   - Usa cache per dati debug quando appropriato

3. **Raccolta Dati**:
   - Raccogli informazioni debug rilevanti
   - Struttura output debug in modo consistente
   - Includi contesto sufficiente per analisi
   - Rimuovi dati sensibili dall'output debug
   - Implementa politiche di ritenzione dati

4. **Operazioni**:
   - Documenta tutte le funzionalità debug accuratamente
   - Addestra team operativo sugli strumenti debug
   - Stabilisci procedure di debugging
   - Monitora utilizzo funzionalità debug
   - Revisione regolare dei dati debug

## Per Saperne di Più

Per informazioni più dettagliate su debugging e profiling:

- [Pacchetto Debug di Clue](https://pkg.go.dev/goa.design/clue/debug)
  Documentazione completa delle capacità di debugging di Clue

- [Documentazione pprof Go](https://pkg.go.dev/runtime/pprof)
  Documentazione ufficiale per gli strumenti di profiling Go

- [Profiling Programmi Go](https://blog.golang.org/pprof)
  Guida completa al profiling di applicazioni Go

- [Debugging Codice Go](https://golang.org/doc/diagnostics)
  Documentazione ufficiale debugging Go

- [Statistiche Runtime](https://golang.org/pkg/runtime)
  Statistiche runtime Go e interfacce debugging 