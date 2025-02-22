---
title: Casi Comuni
weight: 3
description: >
  Esplora i casi d'uso più comuni per gli interceptor Goa, inclusi logging, metriche, caching e rate limiting.
---

Questa sezione presenta alcuni dei casi d'uso più comuni per gli interceptor Goa, fornendo esempi pratici e linee guida per l'implementazione.

## Logging

Il logging è uno dei casi d'uso più comuni per gli interceptor. Un interceptor di logging può registrare dettagli sulle richieste e le risposte:

```go
func LoggingInterceptor(logger *log.Logger) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            // Registra i dettagli della richiesta
            reqID := uuid.New()
            logger.Printf("[%s] richiesta: %v", reqID, req)
            
            start := time.Now()
            res, err := e(ctx, req)
            duration := time.Since(start)
            
            if err != nil {
                // Registra gli errori
                logger.Printf("[%s] errore dopo %v: %v", reqID, duration, err)
                return nil, err
            }
            
            // Registra la risposta
            logger.Printf("[%s] risposta dopo %v: %v", reqID, duration, res)
            return res, nil
        }
    }
}
```

### Migliori Pratiche per il Logging

{{< alert title="Linee Guida per il Logging" color="primary" >}}
**Do**
- Usa ID di correlazione
- Registra tempi e durate
- Includi contesto rilevante
- Gestisci dati sensibili

**Don't**
- Registrare dati personali
- Creare log troppo verbosi
- Ignorare gli errori di logging
- Dimenticare i limiti di dimensione
{{< /alert >}}

## Metriche

Gli interceptor di metriche raccolgono dati sulle prestazioni e l'utilizzo del servizio:

```go
type Metrics struct {
    requestCount   *prometheus.CounterVec
    requestLatency *prometheus.HistogramVec
    errorCount     *prometheus.CounterVec
}

func NewMetrics() *Metrics {
    return &Metrics{
        requestCount: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Name: "requests_total",
                Help: "Numero totale di richieste",
            },
            []string{"method"},
        ),
        requestLatency: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Name: "request_duration_seconds",
                Help: "Latenza delle richieste in secondi",
            },
            []string{"method"},
        ),
        errorCount: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Name: "errors_total",
                Help: "Numero totale di errori",
            },
            []string{"method", "type"},
        ),
    }
}

func MetricsInterceptor(metrics *Metrics) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            method := goa.MethodName(ctx)
            
            // Incrementa il contatore delle richieste
            metrics.requestCount.WithLabelValues(method).Inc()
            
            start := time.Now()
            res, err := e(ctx, req)
            duration := time.Since(start)
            
            // Registra la latenza
            metrics.requestLatency.WithLabelValues(method).Observe(duration.Seconds())
            
            if err != nil {
                // Incrementa il contatore degli errori
                errorType := reflect.TypeOf(err).String()
                metrics.errorCount.WithLabelValues(method, errorType).Inc()
            }
            
            return res, err
        }
    }
}
```

## Caching

L'interceptor di caching può memorizzare i risultati delle chiamate per migliorare le prestazioni:

```go
type Cache interface {
    Get(key string) (interface{}, bool)
    Set(key string, value interface{}, ttl time.Duration)
}

func CachingInterceptor(cache Cache, ttl time.Duration) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            // Genera la chiave di cache
            key := generateCacheKey(ctx, req)
            
            // Controlla la cache
            if value, found := cache.Get(key); found {
                return value, nil
            }
            
            // Esegui la chiamata
            res, err := e(ctx, req)
            if err != nil {
                return nil, err
            }
            
            // Memorizza il risultato in cache
            cache.Set(key, res, ttl)
            return res, nil
        }
    }
}

func generateCacheKey(ctx context.Context, req interface{}) string {
    // Implementa la logica per generare una chiave univoca
    return fmt.Sprintf("%v-%v", goa.MethodName(ctx), req)
}
```

## Rate Limiting

L'interceptor di rate limiting può proteggere il servizio dal sovraccarico:

```go
type RateLimiter struct {
    tokens     chan struct{}
    interval   time.Duration
    maxTokens  int
}

func NewRateLimiter(rate int, interval time.Duration) *RateLimiter {
    rl := &RateLimiter{
        tokens:    make(chan struct{}, rate),
        interval:  interval,
        maxTokens: rate,
    }
    
    // Riempie il bucket dei token
    for i := 0; i < rate; i++ {
        rl.tokens <- struct{}{}
    }
    
    go rl.refill()
    return rl
}

func (rl *RateLimiter) refill() {
    ticker := time.NewTicker(rl.interval)
    for range ticker.C {
        for i := len(rl.tokens); i < rl.maxTokens; i++ {
            rl.tokens <- struct{}{}
        }
    }
}

func RateLimitInterceptor(rl *RateLimiter) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            select {
            case <-rl.tokens:
                // Procedi con la richiesta
                return e(ctx, req)
            default:
                // Rate limit superato
                return nil, &goa.ServiceError{
                    Name:    "rate_limit_exceeded",
                    Message: "Troppe richieste, riprova più tardi",
                }
            }
        }
    }
}
```

## Autenticazione

L'interceptor di autenticazione può verificare le credenziali e gestire l'autorizzazione:

```go
type Authenticator interface {
    Authenticate(ctx context.Context, token string) (User, error)
}

func AuthInterceptor(auth Authenticator) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            // Estrai il token
            token := extractToken(ctx)
            if token == "" {
                return nil, &goa.ServiceError{
                    Name:    "unauthorized",
                    Message: "Token di autenticazione mancante",
                }
            }
            
            // Verifica il token
            user, err := auth.Authenticate(ctx, token)
            if err != nil {
                return nil, &goa.ServiceError{
                    Name:    "unauthorized",
                    Message: "Token di autenticazione non valido",
                }
            }
            
            // Aggiungi l'utente al contesto
            ctx = context.WithValue(ctx, "user", user)
            return e(ctx, req)
        }
    }
}

func extractToken(ctx context.Context) string {
    // Implementa la logica per estrarre il token dal contesto
    return ""
}
```

## Combinazione degli Interceptor

Esempio di come combinare diversi interceptor in un'applicazione:

```go
func main() {
    // Inizializza i componenti
    logger := log.New(os.Stdout, "", log.LstdFlags)
    metrics := NewMetrics()
    cache := NewCache()
    rateLimiter := NewRateLimiter(100, time.Second)
    auth := NewAuthenticator()

    // Crea gli interceptor
    logging := LoggingInterceptor(logger)
    metricsInt := MetricsInterceptor(metrics)
    caching := CachingInterceptor(cache, 5*time.Minute)
    rateLimit := RateLimitInterceptor(rateLimiter)
    authentication := AuthInterceptor(auth)

    // Crea gli endpoint
    endpoints := service.NewEndpoints(svc)

    // Applica gli interceptor nell'ordine corretto
    endpoints.Use(logging)         // Prima il logging
    endpoints.Use(metricsInt)      // Poi le metriche
    endpoints.Use(rateLimit)       // Poi il rate limiting
    endpoints.Use(authentication)  // Poi l'autenticazione
    endpoints.Use(caching)         // Infine il caching
}
```

## Conclusione

Gli interceptor sono strumenti potenti per implementare funzionalità trasversali. Quando li utilizzi:
- Considera l'ordine di applicazione
- Mantieni la semplicità
- Monitora le prestazioni
- Testa accuratamente
- Documenta il comportamento 