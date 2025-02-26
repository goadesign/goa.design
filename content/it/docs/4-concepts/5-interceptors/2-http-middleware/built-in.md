---
title: Middleware Integrati
weight: 3
description: >
  Esplora i middleware HTTP integrati in Goa, inclusi quelli per la gestione delle sessioni, la compressione, il CORS e la sicurezza di base.
---

Goa fornisce una serie di middleware HTTP pronti all'uso che coprono i casi d'uso più comuni. Questi middleware sono stati testati e ottimizzati per funzionare al meglio con l'architettura di Goa.

## Middleware di Sicurezza

### 1. Middleware di Autenticazione Base

```go
func BasicAuth(username, password string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user, pass, ok := r.BasicAuth()
            if !ok || user != username || pass != password {
                w.Header().Set("WWW-Authenticate", "Basic realm=Restricted")
                http.Error(w, "Non autorizzato", http.StatusUnauthorized)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### 2. Middleware di Sicurezza delle Intestazioni

```go
func SecurityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Imposta header di sicurezza comuni
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        w.Header().Set("Content-Security-Policy", "default-src 'self'")
        
        next.ServeHTTP(w, r)
    })
}
```

## Middleware CORS

Il middleware CORS gestisce le richieste Cross-Origin Resource Sharing:

```go
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            origin := r.Header.Get("Origin")
            
            // Verifica se l'origine è consentita
            allowed := false
            for _, o := range allowedOrigins {
                if o == origin || o == "*" {
                    allowed = true
                    break
                }
            }
            
            if allowed {
                w.Header().Set("Access-Control-Allow-Origin", origin)
                w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
                
                // Gestisci le richieste preflight
                if r.Method == "OPTIONS" {
                    w.WriteHeader(http.StatusOK)
                    return
                }
            }
            
            next.ServeHTTP(w, r)
        })
    }
}
```

## Middleware di Compressione

Il middleware di compressione gestisce automaticamente la compressione delle risposte:

```go
func Compression(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verifica se il client supporta la compressione
        if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
            next.ServeHTTP(w, r)
            return
        }
        
        // Crea un writer compresso
        gz := gzip.NewWriter(w)
        defer gz.Close()
        
        // Sostituisci il ResponseWriter con uno che supporta la compressione
        gzw := &gzipResponseWriter{
            ResponseWriter: w,
            Writer:        gz,
        }
        
        // Imposta l'header Content-Encoding
        w.Header().Set("Content-Encoding", "gzip")
        
        next.ServeHTTP(gzw, r)
    })
}

type gzipResponseWriter struct {
    http.ResponseWriter
    io.Writer
}

func (gzw *gzipResponseWriter) Write(data []byte) (int, error) {
    return gzw.Writer.Write(data)
}
```

## Middleware di Logging

Il middleware di logging registra i dettagli delle richieste HTTP:

```go
func RequestLogging(logger *log.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            
            // Crea un response writer che traccia lo status code
            rw := &responseWriter{ResponseWriter: w}
            
            // Processa la richiesta
            next.ServeHTTP(rw, r)
            
            // Registra i dettagli della richiesta
            duration := time.Since(start)
            logger.Printf(
                "%s %s %s %d %s",
                r.Method,
                r.RequestURI,
                r.RemoteAddr,
                rw.status,
                duration,
            )
        })
    }
}

type responseWriter struct {
    http.ResponseWriter
    status int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.status = code
    rw.ResponseWriter.WriteHeader(code)
}
```

## Middleware di Rate Limiting

Il middleware di rate limiting protegge il servizio dal sovraccarico:

```go
func RateLimit(requests int, window time.Duration) func(http.Handler) http.Handler {
    limiter := rate.NewLimiter(rate.Every(window/time.Duration(requests)), requests)
    
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                http.Error(w, "Troppe richieste", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

## Middleware di Recupero

Il middleware di recupero gestisce i panic e previene i crash del server:

```go
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                // Registra lo stack trace
                log.Printf("panic: %v\n%s", err, debug.Stack())
                
                // Restituisci un errore 500
                http.Error(w, "Errore interno del server", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

## Utilizzo dei Middleware

Esempio di come utilizzare i middleware integrati insieme:

```go
func main() {
    // Crea il logger
    logger := log.New(os.Stdout, "", log.LstdFlags)
    
    // Crea il mux
    mux := http.NewServeMux()
    
    // Aggiungi gli handler
    mux.Handle("/api/", apiHandler)
    
    // Crea la catena di middleware
    handler := Recovery(
        SecurityHeaders(
            RequestLogging(logger)(
                CORS([]string{"*"})(
                    Compression(
                        RateLimit(100, time.Minute)(
                            mux,
                        ),
                    ),
                ),
            ),
        ),
    )
    
    // Avvia il server
    log.Fatal(http.ListenAndServe(":8080", handler))
}
```

## Migliori Pratiche

{{< alert title="Utilizzo dei Middleware Integrati" color="primary" >}}
**Do**
- Usa i middleware nell'ordine corretto
- Configura appropriatamente i middleware
- Monitora le prestazioni
- Testa la configurazione

**Don't**
- Duplicare la funzionalità dei middleware
- Ignorare gli errori dei middleware
- Dimenticare di configurare i logger
- Trascurare il monitoraggio
{{< /alert >}}

## Conclusione

I middleware integrati di Goa forniscono:
- Funzionalità essenziali pronte all'uso
- Implementazioni testate e ottimizzate
- Integrazione seamless con Goa
- Base solida per le applicazioni

Usa questi middleware come punto di partenza e personalizzali secondo le tue esigenze specifiche. 