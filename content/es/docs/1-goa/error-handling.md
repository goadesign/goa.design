---
title: Tratamiento de errores
weight: 6
description: "Complete guide to error handling in Goa - defining errors, transport mapping, custom types, and best practices."
llm_optimized: true
aliases:
---

Goa proporciona un sólido sistema de gestión de errores que le permite definir, gestionar y comunicar errores de forma eficaz en todos sus servicios. Esta guía abarca desde las definiciones básicas de errores hasta la personalización avanzada.

## Descripción general

Goa adopta un enfoque de "pilas incluidas" para el manejo de errores, donde los errores pueden ser definidos con información mínima (sólo un nombre) mientras que también soporta tipos de error completamente personalizados cuando es necesario.

Características principales:
- Definiciones de errores a nivel de servicio y a nivel de método
- Tipos de error predeterminados y personalizados
- Asignación de códigos de estado específicos del transporte (HTTP/gRPC)
- Funciones de ayuda generadas para la creación de errores
- Generación automática de documentación

---

## Definición de errores

### Errores a nivel de API

Defina errores reutilizables a nivel de API con asignaciones de transporte:

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

### Errores a nivel de servicio

Los errores a nivel de servicio están disponibles para todos los métodos dentro de un servicio:

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

### Errores a nivel de método

Los errores específicos de un método se refieren a un método en particular:

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

## Tipos de error

### Default ErrorResult

El tipo por defecto `ErrorResult` incluye campos estándar:

- **Nombre**: El nombre del error tal y como se define en la DSL
- **ID**: Identificador único para la instancia de error
- **Mensaje**: Mensaje descriptivo del error
- **Temporal**: Si el error es transitorio
- **Tiempo de espera**: Si el error fue causado por un tiempo de espera
- **Fallo**: Si el error fue un fallo del servidor

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "Division by zero")
    Error("ServiceUnavailable", ErrorResult, "Service temporarily unavailable", func() {
        Temporary()
    })
})
```

Funciones de ayuda generadas:

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

### Tipos de error personalizados

Para obtener información más detallada sobre los errores, defina tipos de error personalizados:

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

**Importante**: Cuando utilice tipos personalizados para varios errores en el mismo método, debe especificar qué atributo contiene el nombre del error utilizando `Meta("struct:error:name")`.

### Propiedades de error

Las propiedades de error informan a los clientes sobre las características del error (sólo disponible con `ErrorResult`):

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

Manejo del lado del cliente:

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

## Asignación de transporte

### Códigos de estado HTTP

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

### Códigos de estado gRPC

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

### Combinación de HTTP y gRPC

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

## Produciendo y Consumiendo Errores

### Produciendo Errores

Uso de funciones de ayuda generadas:

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

Uso de tipos de error personalizados:

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

### Consumir errores

Manejo de errores por defecto:

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

Manejo de errores personalizados:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if dbz, ok := err.(*gendivider.DivByZero); ok {
        fmt.Printf("Division by zero: %s (dividend was %d)\n", dbz.Message, dbz.Dividend)
    }
}
```

---

## Error Serialization

Personaliza la serialización de errores proporcionando un formateador personalizado:

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

## Mejores prácticas

### 1. Nomenclatura de errores coherente

Utilice nombres claros y descriptivos:

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

### 2. Prefiera ErrorResult en lugar de tipos personalizados

Utilice el tipo por defecto `ErrorResult` para la mayoría de los errores. Reserve los tipos personalizados para escenarios que requieran un contexto adicional:

```go
// Simple errors - use ErrorResult
Error("InvalidInput", ErrorResult, "Invalid input provided.")

// Complex errors needing extra context - use custom types
Error("InvalidOperation", InvalidOperation, "Unsupported operation.")
```

### 3. Utilizar propiedades de error

Aproveche `Temporary()`, `Timeout()` y `Fault()` para proporcionar metadatos:

```go
Error("ServiceUnavailable", ErrorResult, func() {
    Description("Service is temporarily unavailable")
    Temporary()
})
```

### 4. Documente los errores minuciosamente

Proporcione descripciones claras:

```go
Error("AuthenticationFailed", ErrorResult, func() {
    Description("AuthenticationFailed is returned when user credentials are invalid.")
})
```

### 5. Implementar un mapeo de errores adecuado

Asigne errores de forma coherente en todos los transportes:

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

### 6. Prueba de gestión de errores

Escribe pruebas para verificar el comportamiento ante errores:

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

### 7. Consideraciones de seguridad

- Nunca exponga detalles internos del sistema en los errores
- Sanitize todos los mensajes de error
- Registre internamente los errores detallados pero devuelva mensajes seguros a los clientes

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

## Ver también

- [DSL Reference: Error Handling](dsl-reference/#error-handling-design-level) - Definiciones de error a nivel de diseño
- [Guía HTTP](http-guide/) - Asignación de códigos de estado HTTP y respuestas de error
- [Guía gRPC](grpc-guide/#error-handling) - Mapeo de códigos de estado gRPC
- [Documentación de Clue](../3-ecosystem/clue/) - Registro de errores y observabilidad
