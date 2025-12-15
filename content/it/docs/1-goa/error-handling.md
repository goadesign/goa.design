---
title: Gestione degli errori
weight: 6
description: "Complete guide to error handling in Goa - defining errors, transport mapping, custom types, and best practices."
llm_optimized: true
aliases:
---

Goa offre un robusto sistema di gestione degli errori che consente di definire, gestire e comunicare efficacemente gli errori nei servizi. Questa guida copre tutto, dalle definizioni di base degli errori alla personalizzazione avanzata.

## Panoramica

Goa adotta un approccio "batterie incluse" alla gestione degli errori, in cui gli errori possono essere definiti con informazioni minime (solo un nome), pur supportando tipi di errore completamente personalizzati, quando necessario.

Caratteristiche principali:
- Definizione degli errori a livello di servizio e di metodo
- Tipi di errore predefiniti e personalizzati
- Mappatura dei codici di stato specifici per il trasporto (HTTP/gRPC)
- Funzioni helper generate per la creazione di errori
- Generazione automatica della documentazione

---

## Definizione degli errori

### Errori a livello API

Definire errori riutilizzabili a livello di API con mappature di trasporto:

```go
var _ = API("calc", func() {
    Error("invalid_argument")
    HTTP(func() {
        Response("invalid_argument", StatusBadRequest)
    })
})

var _ = Service("divider", func() {
    Error("invalid_argument")  // Reuses API-level definition
    
    Method("divide", func() {
        Error("div_by_zero", DivByZero, "Division by zero")
    })
})
```

### Errori a livello di servizio

Gli errori a livello di servizio sono disponibili per tutti i metodi di un servizio:

```go
var _ = Service("calc", func() {
    Error("invalid_arguments", ErrorResult, "Invalid arguments provided")
    
    Method("divide", func() {
        // Can return invalid_arguments without explicitly declaring it
    })

    Method("multiply", func() {
        // Can also return invalid_arguments
    })
})
```

### Errori a livello di metodo

Gli errori specifici di un metodo sono legati a un particolare metodo:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Required("quotient")
        })
        Error("div_by_zero")  // Only available to this method
    })
})
```

---

## Tipi di errore

### Risultato dell'errore predefinito

Il tipo predefinito `ErrorResult` include campi standard:

- **Name**: Il nome dell'errore come definito nel DSL
- **ID**: Identificatore univoco dell'istanza di errore
- **Messaggio**: Messaggio descrittivo dell'errore
- **Temporaneo**: Se l'errore è transitorio
- **Timeout**: Se l'errore è stato causato da un timeout
- **Fault**: Se l'errore è stato causato da un errore lato server

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "Division by zero")
    Error("ServiceUnavailable", ErrorResult, "Service temporarily unavailable", func() {
        Temporary()
    })
})
```

Funzioni helper generate:

```go
// MakeDivByZero builds a goa.ServiceError from an error
func MakeDivByZero(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "DivByZero", false, false, false)
}

// MakeServiceUnavailable builds a goa.ServiceError from an error
func MakeServiceUnavailable(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "ServiceUnavailable", true, false, false)
}
```

### Tipi di errore personalizzati

Per informazioni più dettagliate sugli errori, definire tipi di errore personalizzati:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero is the error returned when using value 0 as divisor.")
    Field(1, "message", String, "Error message")
    Field(2, "dividend", Int, "Dividend that was used")
    Field(3, "name", String, "Error name", func() {
        Meta("struct:error:name")  // Required for multiple custom errors
    })
    Required("message", "dividend", "name")
})

var _ = Service("divider", func() {
    Method("divide", func() {
        Error("DivByZero", DivByZero, "Division by zero")
    })
})
```

**Importante**: Quando si usano tipi personalizzati per più errori nello stesso metodo, è necessario specificare quale attributo contiene il nome dell'errore usando `Meta("struct:error:name")`.

### Proprietà dell'errore

Le proprietà di errore informano i client sulle caratteristiche dell'errore (disponibili solo con `ErrorResult`):

```go
var _ = Service("calc", func() {
    Error("service_unavailable", ErrorResult, func() {
        Description("Service is temporarily unavailable")
        Temporary()  // Client should retry
    })

    Error("request_timeout", ErrorResult, func() {
        Description("Request timed out")
        Timeout()    // Deadline exceeded
    })

    Error("internal_error", ErrorResult, func() {
        Description("Internal server error")
        Fault()      // Server-side issue
    })
})
```

Gestione lato client:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if e, ok := err.(*goa.ServiceError); ok {
        if e.Temporary {
            return retry(ctx, func() error {
                res, err = client.Divide(ctx, payload)
                return err
            })
        }
        if e.Fault {
            log.Error("server fault detected", "error", e)
            alertAdmins(e)
        }
    }
}
```

---

## Mappatura del trasporto

### Codici di stato HTTP

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("Division by zero error")
    })

    HTTP(func() {
        Response("DivByZero", StatusBadRequest)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("Integer division has a remainder")
        })

        HTTP(func() {
            POST("/divide/integral")
            Response("HasRemainder", StatusExpectationFailed)
        })
    })
})
```

## Codici di stato gRPC

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("Division by zero error")
    })

    GRPC(func() {
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder")

        GRPC(func() {
            Response("HasRemainder", CodeUnknown)
        })
    })
})
```

### HTTP e gRPC combinati

```go
var _ = Service("divider", func() {
    Error("DivByZero")

    Method("divide", func() {
        HTTP(func() {
            POST("/divide")
            Response("DivByZero", StatusUnprocessableEntity)
        })

        GRPC(func() {
            Response("DivByZero", CodeInvalidArgument)
        })
    })
})
```

---

## Produzione e consumo di errori

### Produzione di errori

Utilizzo delle funzioni helper generate:

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, gendivider.MakeDivByZero(fmt.Errorf("divisor cannot be zero"))
    }
    if p.Dividend%p.Divisor != 0 {
        return 0, gendivider.MakeHasRemainder(fmt.Errorf("remainder is %d", p.Dividend%p.Divisor))
    }
    return p.Dividend / p.Divisor, nil
}
```

Utilizzo di tipi di errore personalizzati:

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, &gendivider.DivByZero{
            Name:     "DivByZero",
            Message:  "divisor cannot be zero",
            Dividend: p.Dividend,
        }
    }
    return p.Dividend / p.Divisor, nil
}
```

### Consumare gli errori

Gestione degli errori predefiniti:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case "HasRemainder":
            // Handle remainder error
        case "DivByZero":
            // Handle division by zero
        default:
            // Handle unknown errors
        }
    }
}
```

Gestione degli errori personalizzati:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if dbz, ok := err.(*gendivider.DivByZero); ok {
        fmt.Printf("Division by zero: %s (dividend was %d)\n", dbz.Message, dbz.Dividend)
    }
}
```

---

## Errore di serializzazione

Personalizzare la serializzazione degli errori fornendo un formattatore personalizzato:

```go
type CustomErrorResponse struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

func (r *CustomErrorResponse) StatusCode() int {
    switch r.Code {
    case "VALIDATION_ERROR":
        return http.StatusBadRequest
    case "NOT_FOUND":
        return http.StatusNotFound
    default:
        return http.StatusInternalServerError
    }
}

func customErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case goa.MissingField:
            return &CustomErrorResponse{
                Code:    "MISSING_FIELD",
                Message: fmt.Sprintf("The field '%s' is required", *serr.Field),
                Details: map[string]string{"field": *serr.Field},
            }
        default:
            return &CustomErrorResponse{
                Code:    "VALIDATION_ERROR",
                Message: serr.Message,
            }
        }
    }
    return &CustomErrorResponse{
        Code:    "INTERNAL_ERROR",
        Message: err.Error(),
    }
}

// Use when creating the server
server = calcsvr.New(endpoints, mux, dec, enc, eh, customErrorFormatter)
```

---

## Migliori pratiche

### 1. Denominazione coerente degli errori

Utilizzate nomi chiari e descrittivi:

```go
// Good
Error("DivByZero", func() {
    Description("DivByZero is returned when the divisor is zero.")
})

// Bad
Error("Error1", func() {
    Description("An unspecified error occurred.")
})
```

### 2. Preferire ErrorResult ai tipi personalizzati

Utilizzare l'opzione predefinita `ErrorResult` per la maggior parte degli errori. Riservare i tipi personalizzati agli scenari che richiedono un contesto aggiuntivo:

```go
// Simple errors - use ErrorResult
Error("InvalidInput", ErrorResult, "Invalid input provided.")

// Complex errors needing extra context - use custom types
Error("InvalidOperation", InvalidOperation, "Unsupported operation.")
```

### 3. Utilizzare le proprietà di errore

Sfruttare `Temporary()`, `Timeout()` e `Fault()` per fornire metadati:

```go
Error("ServiceUnavailable", ErrorResult, func() {
    Description("Service is temporarily unavailable")
    Temporary()
})
```

### 4. Documentare accuratamente gli errori

Fornire descrizioni chiare:

```go
Error("AuthenticationFailed", ErrorResult, func() {
    Description("AuthenticationFailed is returned when user credentials are invalid.")
})
```

### 5. Implementare una corretta mappatura degli errori

Mappare gli errori in modo coerente tra i vari trasporti:

```go
var _ = Service("auth", func() {
    Error("InvalidToken", func() {
        Description("InvalidToken is returned when the provided token is invalid.")
    })

    HTTP(func() {
        Response("InvalidToken", StatusUnauthorized)
    })

    GRPC(func() {
        Response("InvalidToken", CodeUnauthenticated)
    })
})
```

### 6. Testare la gestione degli errori

Scrivere i test per verificare il comportamento in caso di errore:

```go
func TestDivideByZero(t *testing.T) {
    svc := internal.NewDividerService()
    _, err := svc.Divide(context.Background(), &divider.DividePayload{A: 10, B: 0})
    if err == nil {
        t.Fatalf("expected error, got nil")
    }
    if serr, ok := err.(*goa.ServiceError); !ok || serr.Name != "DivByZero" {
        t.Fatalf("expected DivByZero error, got %v", err)
    }
}
```

### 7. Considerazioni sulla sicurezza

- Non esporre mai i dettagli interni del sistema negli errori
- Sanitizzare tutti i messaggi di errore
- Registrare internamente gli errori dettagliati, ma restituire ai clienti messaggi sicuri

```go
func secureErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
    log.Printf("Error: %+v", err)  // Log full details
    
    if serr, ok := err.(*goa.ServiceError); ok && serr.Fault {
        // Return generic message for server faults
        return &CustomErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "An internal error occurred",
        }
    }
    // Return specific message for validation errors
    return formatValidationError(err)
}
```

---

## Vedi anche

- [DSL Reference: Error Handling](dsl-reference/#error-handling-design-level) - Definizioni degli errori a livello di progetto
- [Guida HTTP](http-guide/) - Mappatura dei codici di stato HTTP e risposte agli errori
- [Guida gRPC](grpc-guide/#error-handling) - Mappatura dei codici di stato gRPC
- [Documentazione Clue](../3-ecosystem/clue/) - Registrazione degli errori e osservabilità
