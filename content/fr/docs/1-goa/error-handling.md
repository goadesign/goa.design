---
title: Gestion des erreurs
weight: 6
description: "Complete guide to error handling in Goa - defining errors, transport mapping, custom types, and best practices."
llm_optimized: true
aliases:
---

Goa fournit un système robuste de gestion des erreurs qui vous permet de définir, de gérer et de communiquer les erreurs de manière efficace à travers vos services. Ce guide couvre tous les aspects, depuis les définitions de base des erreurs jusqu'à la personnalisation avancée.

## Vue d'ensemble

Goa adopte une approche "batteries incluses" pour la gestion des erreurs où les erreurs peuvent être définies avec un minimum d'informations (juste un nom) tout en supportant des types d'erreurs complètement personnalisés si nécessaire.

Caractéristiques principales :
- Définitions d'erreurs au niveau du service et de la méthode
- Types d'erreurs par défaut et personnalisés
- Correspondance des codes d'état spécifiques au transport (HTTP/gRPC)
- Fonctions d'aide générées pour la création d'erreurs
- Génération automatique de documentation

---

## Définition des erreurs

### Erreurs au niveau de l'API

Définir des erreurs réutilisables au niveau de l'API avec des correspondances de transport :

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

### Erreurs au niveau du service

Les erreurs au niveau du service sont disponibles pour toutes les méthodes d'un service :

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

### Erreurs au niveau de la méthode

Les erreurs spécifiques à une méthode sont liées à une méthode particulière :

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

## Types d'erreurs

### Résultat d'erreur par défaut

Le type `ErrorResult` par défaut comprend des champs standard :

- **Nom** : Le nom de l'erreur tel qu'il est défini dans la DSL
- **ID** : Identifiant unique de l'instance d'erreur
- **Message** : Message d'erreur descriptif
- **Temporary** : Si l'erreur est transitoire
- **Timeout** : Si l'erreur a été causée par un dépassement de délai
- **Fault** : Si l'erreur a été causée par un délai d'attente : Si l'erreur est due à une erreur côté serveur

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "Division by zero")
    Error("ServiceUnavailable", ErrorResult, "Service temporarily unavailable", func() {
        Temporary()
    })
})
```

Fonctions d'aide générées :

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

### Types d'erreurs personnalisés

Pour obtenir des informations plus détaillées sur les erreurs, définissez des types d'erreur personnalisés :

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

**Important** : Lorsque vous utilisez des types personnalisés pour plusieurs erreurs dans la même méthode, vous devez spécifier l'attribut qui contient le nom de l'erreur en utilisant `Meta("struct:error:name")`.

### Propriétés des erreurs

Les propriétés d'erreur informent les clients des caractéristiques de l'erreur (disponible uniquement avec `ErrorResult`) :

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

Traitement côté client :

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

## Transport Mapping

### Codes d'état HTTP

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

### Codes d'état gRPC

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

### HTTP et gRPC combinés

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

## Produire et consommer des erreurs

### Produire des erreurs

Utilisation des fonctions d'aide générées :

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

Utilisation de types d'erreurs personnalisés :

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

### Consommer des erreurs

Gestion des erreurs par défaut :

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

Gestion des erreurs personnalisées :

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if dbz, ok := err.(*gendivider.DivByZero); ok {
        fmt.Printf("Division by zero: %s (dividend was %d)\n", dbz.Message, dbz.Dividend)
    }
}
```

---

## Erreur de sérialisation

Personnaliser la sérialisation des erreurs en fournissant un formateur personnalisé :

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

## Meilleures pratiques

### 1. Nommer les erreurs de manière cohérente

Utiliser des noms clairs et descriptifs :

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

### 2. Préférer ErrorResult aux types personnalisés

Utilisez le type par défaut `ErrorResult` pour la plupart des erreurs. Réservez les types personnalisés aux scénarios nécessitant un contexte supplémentaire :

```go
// Simple errors - use ErrorResult
Error("InvalidInput", ErrorResult, "Invalid input provided.")

// Complex errors needing extra context - use custom types
Error("InvalidOperation", InvalidOperation, "Unsupported operation.")
```

### 3. Utiliser les propriétés d'erreur

Utilisez `Temporary()`, `Timeout()` et `Fault()` pour fournir des métadonnées :

```go
Error("ServiceUnavailable", ErrorResult, func() {
    Description("Service is temporarily unavailable")
    Temporary()
})
```

### 4. Documenter minutieusement les erreurs

Fournissez des descriptions claires :

```go
Error("AuthenticationFailed", ErrorResult, func() {
    Description("AuthenticationFailed is returned when user credentials are invalid.")
})
```

### 5. Mettre en œuvre un mappage d'erreurs approprié

Mettez en correspondance les erreurs de manière cohérente entre les différents modes de transport :

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

### 6. Tester la gestion des erreurs

Rédigez des tests pour vérifier le comportement en cas d'erreur :

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

### 7. Considérations de sécurité

- Ne jamais exposer les détails du système interne dans les erreurs
- Assainir tous les messages d'erreur
- Enregistrer les erreurs détaillées en interne, mais renvoyer des messages sûrs aux clients

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

## Voir aussi

- [Référence DSL : Traitement des erreurs](dsl-reference/#error-handling-design-level) - Définitions des erreurs au niveau de la conception
- [Guide HTTP](http-guide/) - Correspondance des codes d'état HTTP et réponses d'erreur
- [Guide gRPC](grpc-guide/#error-handling) - Correspondance des codes d'état gRPC
- [Documentation Clue](../3-ecosystem/clue/) - Journalisation des erreurs et observabilité
