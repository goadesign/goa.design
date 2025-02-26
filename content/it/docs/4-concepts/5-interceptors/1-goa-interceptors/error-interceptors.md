---
title: Interceptor di Errore
weight: 3
description: >
  Impara come gli interceptor Goa possono gestire gli errori in modo centralizzato, fornendo logging, trasformazione e recupero dagli errori.
---

Gli interceptor di errore sono un componente cruciale del sistema di middleware di Goa, che permettono di gestire gli errori in modo centralizzato e coerente. Questi interceptor possono intercettare, registrare, trasformare e potenzialmente recuperare dagli errori che si verificano durante l'esecuzione del servizio.

## Gestione Base degli Errori

Un interceptor di errore base può registrare e potenzialmente trasformare gli errori:

```go
func ErrorHandler(logger *log.Logger) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            res, err := e(ctx, req)
            if err != nil {
                // Registra l'errore
                logger.Printf("errore: %v", err)
                
                // Opzionalmente, trasforma l'errore
                if _, ok := err.(*CustomError); !ok {
                    err = &CustomError{
                        Original: err,
                        Message: "Si è verificato un errore interno",
                    }
                }
            }
            return res, err
        }
    }
}
```

## Tipi di Errori

### 1. Errori di Validazione
Gestione degli errori che si verificano durante la validazione dei dati:

```go
func ValidationErrorHandler(e goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        res, err := e(ctx, req)
        if err != nil {
            if ve, ok := err.(*ValidationError); ok {
                return nil, &goa.ServiceError{
                    Name:    "validation_error",
                    Message: ve.Error(),
                    Details: ve.Fields,
                }
            }
        }
        return res, err
    }
}
```

### 2. Errori di Business Logic
Gestione degli errori specifici del dominio:

```go
func BusinessErrorHandler(e goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        res, err := e(ctx, req)
        if err != nil {
            switch be := err.(type) {
            case *NotFoundError:
                return nil, &goa.ServiceError{
                    Name:    "not_found",
                    Message: be.Error(),
                }
            case *ConflictError:
                return nil, &goa.ServiceError{
                    Name:    "conflict",
                    Message: be.Error(),
                }
            }
        }
        return res, err
    }
}
```

### 3. Errori di Sistema
Gestione degli errori tecnici e di sistema:

```go
func SystemErrorHandler(e goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        res, err := e(ctx, req)
        if err != nil {
            if se, ok := err.(*SystemError); ok {
                // Registra l'errore di sistema
                log.Printf("errore di sistema: %v", se)
                
                // Restituisci un errore generico all'utente
                return nil, &goa.ServiceError{
                    Name:    "internal_error",
                    Message: "Si è verificato un errore interno",
                }
            }
        }
        return res, err
    }
}
```

## Recupero dagli Errori

Gli interceptor possono implementare logiche di recupero dagli errori:

```go
func RetryHandler(maxRetries int) func(goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            var lastErr error
            for i := 0; i < maxRetries; i++ {
                res, err := e(ctx, req)
                if err == nil {
                    return res, nil
                }
                
                // Verifica se l'errore è recuperabile
                if !isRetryable(err) {
                    return nil, err
                }
                
                lastErr = err
                // Attendi prima del prossimo tentativo
                time.Sleep(backoff(i))
            }
            return nil, fmt.Errorf("massimi tentativi raggiunti: %v", lastErr)
        }
    }
}

func backoff(attempt int) time.Duration {
    return time.Duration(math.Pow(2, float64(attempt))) * time.Second
}

func isRetryable(err error) bool {
    // Implementa la logica per determinare se un errore è recuperabile
    return false
}
```

## Catena di Gestione degli Errori

Gli interceptor di errore possono essere combinati in una catena:

```go
func main() {
    // Crea gli interceptor di errore
    validation := ValidationErrorHandler()
    business := BusinessErrorHandler()
    system := SystemErrorHandler()
    retry := RetryHandler(3)

    // Crea gli endpoint
    endpoints := service.NewEndpoints(svc)

    // Applica gli interceptor nell'ordine desiderato
    endpoints.Use(system)      // Prima gli errori di sistema
    endpoints.Use(business)    // Poi gli errori di business
    endpoints.Use(validation)  // Infine gli errori di validazione
    endpoints.Use(retry)       // Wrapper di retry esterno
}
```

## Migliori Pratiche

{{< alert title="Gestione degli Errori" color="primary" >}}
**Design**
- Definisci una chiara gerarchia degli errori
- Usa tipi di errore specifici
- Mantieni messaggi di errore informativi
- Considera la sicurezza

**Implementazione**
- Registra gli errori in modo appropriato
- Implementa il recupero quando possibile
- Mantieni la coerenza tra i trasporti
- Gestisci i timeout

**Considerazioni Generali**
- Non esporre dettagli sensibili
- Fornisci messaggi utili agli utenti
- Mantieni traccia degli errori
- Monitora i pattern di errore
{{< /alert >}}

## Conclusione

Gli interceptor di errore sono fondamentali per:
- Gestione centralizzata degli errori
- Coerenza nella risposta agli errori
- Logging e monitoraggio
- Recupero e resilienza

Implementa questi pattern considerando:
- Le esigenze degli utenti
- I requisiti di sicurezza
- La manutenibilità
- Le prestazioni del sistema 