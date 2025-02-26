---
title: Middleware Personalizzati
weight: 3
description: >
  Impara come creare middleware HTTP personalizzati in Goa per implementare funzionalità specifiche della tua applicazione.
---

I middleware HTTP personalizzati ti permettono di estendere le funzionalità di Goa per soddisfare le esigenze specifiche della tua applicazione. Questa sezione mostra come creare middleware personalizzati efficaci e robusti.

## Struttura Base

Un middleware HTTP personalizzato segue questa struttura base:

```go
func CustomMiddleware(config Config) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Pre-processing
            // Modifica la richiesta o imposta header
            
            next.ServeHTTP(w, r)
            
            // Post-processing
            // Modifica la risposta o aggiungi header
        })
    }
}
```

## Esempi Pratici

### 1. Middleware di Tracciamento delle Richieste

```go
type RequestTracker struct {
    activeRequests int64
    mu            sync.Mutex
}

func (rt *RequestTracker) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Incrementa il contatore delle richieste attive
        rt.mu.Lock()
        rt.activeRequests++
        current := rt.activeRequests
        rt.mu.Unlock()
        
        // Aggiungi l'informazione agli header di risposta
        w.Header().Set("X-Active-Requests", strconv.FormatInt(current, 10))
        
        // Processa la richiesta
        next.ServeHTTP(w, r)
        
        // Decrementa il contatore
        rt.mu.Lock()
        rt.activeRequests--
        rt.mu.Unlock()
    })
}
```

### 2. Middleware di Validazione del Content Type

```go
func ValidateContentType(allowedTypes []string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Verifica solo le richieste POST, PUT e PATCH
            if r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH" {
                contentType := r.Header.Get("Content-Type")
                
                valid := false
                for _, t := range allowedTypes {
                    if strings.HasPrefix(contentType, t) {
                        valid = true
                        break
                    }
                }
                
                if !valid {
                    http.Error(w,
                        "Content-Type non supportato",
                        http.StatusUnsupportedMediaType)
                    return
                }
            }
            
            next.ServeHTTP(w, r)
        })
    }
}
```

### 3. Middleware di Cache Personalizzato

```go
type CacheConfig struct {
    TTL           time.Duration
    MaxSize       int
    IgnorePaths   []string
    CacheKeyFunc  func(*http.Request) string
}

func CustomCache(config CacheConfig) func(http.Handler) http.Handler {
    cache := make(map[string]cacheEntry)
    var mu sync.RWMutex
    
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Verifica se il path deve essere ignorato
            for _, path := range config.IgnorePaths {
                if strings.HasPrefix(r.URL.Path, path) {
                    next.ServeHTTP(w, r)
                    return
                }
            }
            
            // Genera la chiave di cache
            key := config.CacheKeyFunc(r)
            
            // Controlla la cache
            mu.RLock()
            if entry, found := cache[key]; found && !entry.Expired() {
                mu.RUnlock()
                w.WriteHeader(entry.StatusCode)
                for k, v := range entry.Headers {
                    w.Header()[k] = v
                }
                w.Write(entry.Body)
                return
            }
            mu.RUnlock()
            
            // Cattura la risposta
            rw := &responseWriter{ResponseWriter: w}
            next.ServeHTTP(rw, r)
            
            // Memorizza in cache
            mu.Lock()
            cache[key] = cacheEntry{
                Body:       rw.body.Bytes(),
                Headers:    w.Header(),
                StatusCode: rw.status,
                CreatedAt:  time.Now(),
            }
            mu.Unlock()
        })
    }
}

type cacheEntry struct {
    Body       []byte
    Headers    http.Header
    StatusCode int
    CreatedAt  time.Time
}

func (e *cacheEntry) Expired() bool {
    return time.Since(e.CreatedAt) > e.TTL
}
```

### 4. Middleware di Autenticazione JWT

```go
type JWTConfig struct {
    SecretKey     []byte
    TokenHeader   string
    TokenType     string
    ErrorHandler  func(w http.ResponseWriter, r *http.Request, err error)
}

func JWTAuth(config JWTConfig) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Estrai il token
            authHeader := r.Header.Get(config.TokenHeader)
            if authHeader == "" {
                config.ErrorHandler(w, r, errors.New("token mancante"))
                return
            }
            
            // Verifica il tipo di token
            parts := strings.Split(authHeader, " ")
            if len(parts) != 2 || parts[0] != config.TokenType {
                config.ErrorHandler(w, r, errors.New("formato token non valido"))
                return
            }
            
            // Valida il token
            token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
                return config.SecretKey, nil
            })
            
            if err != nil || !token.Valid {
                config.ErrorHandler(w, r, errors.New("token non valido"))
                return
            }
            
            // Aggiungi i claims al contesto
            ctx := context.WithValue(r.Context(), "claims", token.Claims)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

## Migliori Pratiche

{{< alert title="Sviluppo di Middleware Personalizzati" color="primary" >}}
**Design**
- Mantieni una singola responsabilità
- Fornisci opzioni di configurazione
- Gestisci gli errori in modo appropriato
- Documenta il comportamento

**Implementazione**
- Usa mutex per la concorrenza
- Implementa il cleanup delle risorse
- Gestisci tutti i metodi HTTP
- Testa tutti gli scenari

**Prestazioni**
- Minimizza le allocazioni
- Usa buffer pools quando appropriato
- Implementa il caching quando possibile
- Monitora l'utilizzo delle risorse
{{< /alert >}}

## Composizione dei Middleware

Esempio di come combinare middleware personalizzati:

```go
func main() {
    // Configura i middleware
    tracker := &RequestTracker{}
    contentTypes := []string{"application/json", "application/xml"}
    cacheConfig := CacheConfig{
        TTL:         5 * time.Minute,
        MaxSize:     1000,
        IgnorePaths: []string{"/api/private"},
        CacheKeyFunc: func(r *http.Request) string {
            return r.Method + r.URL.Path
        },
    }
    jwtConfig := JWTConfig{
        SecretKey:   []byte("your-secret-key"),
        TokenHeader: "Authorization",
        TokenType:   "Bearer",
        ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
            http.Error(w, err.Error(), http.StatusUnauthorized)
        },
    }
    
    // Crea la catena di middleware
    handler := tracker.Middleware(
        ValidateContentType(contentTypes)(
            CustomCache(cacheConfig)(
                JWTAuth(jwtConfig)(
                    yourHandler,
                ),
            ),
        ),
    )
    
    // Avvia il server
    http.ListenAndServe(":8080", handler)
}
```

## Conclusione

I middleware personalizzati ti permettono di:
- Implementare logica specifica dell'applicazione
- Estendere le funzionalità di base di Goa
- Mantenere il codice modulare e riutilizzabile
- Separare le preoccupazioni trasversali

Quando sviluppi middleware personalizzati:
- Segui le migliori pratiche
- Mantieni il codice testabile
- Documenta il comportamento
- Considera le prestazioni 