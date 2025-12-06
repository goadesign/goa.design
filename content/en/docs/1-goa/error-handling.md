---
title: Error Handling
weight: 6
description: "Complete guide to error handling in Goa - defining errors, transport mapping, custom types, and best practices."
llm_optimized: true
aliases:
  - /en/docs/3-tutorials/3-error-handling/
  - /en/docs/3-tutorials/3-error-handling/1-introduction/
  - /en/docs/3-tutorials/3-error-handling/2-defining-errors/
  - /en/docs/3-tutorials/3-error-handling/3-error-types/
  - /en/docs/3-tutorials/3-error-handling/4-transport-mapping/
  - /en/docs/3-tutorials/3-error-handling/5-consuming-errors/
  - /en/docs/3-tutorials/3-error-handling/6-overriding-serialization/
  - /en/docs/3-tutorials/3-error-handling/7-best-practices/
  - /en/docs/5-real-world/1-error-handling/
  - /en/docs/5-real-world/1-error-handling/1-domain-vs-transport/
  - /en/docs/5-real-world/1-error-handling/2-error-propagation/
  - /en/docs/5-real-world/1-error-handling/3-error-serialization/
  - /docs/3-tutorials/3-error-handling/
  - /docs/5-real-world/1-error-handling/
---

Goa provides a robust error handling system that enables you to define, manage, and communicate errors effectively across your services. This guide covers everything from basic error definitions to advanced customization.

## Overview

Goa takes a "batteries included" approach to error handling where errors can be defined with minimal information (just a name) while also supporting completely custom error types when needed.

Key features:
- Service-level and method-level error definitions
- Default and custom error types
- Transport-specific status code mapping (HTTP/gRPC)
- Generated helper functions for error creation
- Automatic documentation generation

---

## Defining Errors

### API-Level Errors

Define reusable errors at the API level with transport mappings:

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

### Service-Level Errors

Service-level errors are available to all methods within a service:

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

### Method-Level Errors

Method-specific errors are scoped to a particular method:

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

## Error Types

### Default ErrorResult

The default `ErrorResult` type includes standard fields:

- **Name**: The error name as defined in the DSL
- **ID**: Unique identifier for the error instance
- **Message**: Descriptive error message
- **Temporary**: Whether the error is transient
- **Timeout**: Whether the error was caused by a timeout
- **Fault**: Whether the error was a server-side fault

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "Division by zero")
    Error("ServiceUnavailable", ErrorResult, "Service temporarily unavailable", func() {
        Temporary()
    })
})
```

Generated helper functions:

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

### Custom Error Types

For more detailed error information, define custom error types:

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

**Important**: When using custom types for multiple errors in the same method, you must specify which attribute contains the error name using `Meta("struct:error:name")`.

### Error Properties

Error properties inform clients about error characteristics (only available with `ErrorResult`):

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

Client-side handling:

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

### HTTP Status Codes

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

### gRPC Status Codes

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

### Combined HTTP and gRPC

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

## Producing and Consuming Errors

### Producing Errors

Using generated helper functions:

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

Using custom error types:

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

### Consuming Errors

Handling default errors:

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

Handling custom errors:

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

Customize error serialization by providing a custom formatter:

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

## Best Practices

### 1. Consistent Error Naming

Use clear, descriptive names:

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

### 2. Prefer ErrorResult Over Custom Types

Use the default `ErrorResult` for most errors. Reserve custom types for scenarios requiring additional context:

```go
// Simple errors - use ErrorResult
Error("InvalidInput", ErrorResult, "Invalid input provided.")

// Complex errors needing extra context - use custom types
Error("InvalidOperation", InvalidOperation, "Unsupported operation.")
```

### 3. Use Error Properties

Leverage `Temporary()`, `Timeout()`, and `Fault()` to provide metadata:

```go
Error("ServiceUnavailable", ErrorResult, func() {
    Description("Service is temporarily unavailable")
    Temporary()
})
```

### 4. Document Errors Thoroughly

Provide clear descriptions:

```go
Error("AuthenticationFailed", ErrorResult, func() {
    Description("AuthenticationFailed is returned when user credentials are invalid.")
})
```

### 5. Implement Proper Error Mapping

Map errors consistently across transports:

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

### 6. Test Error Handling

Write tests to verify error behavior:

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

### 7. Security Considerations

- Never expose internal system details in errors
- Sanitize all error messages
- Log detailed errors internally but return safe messages to clients

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
