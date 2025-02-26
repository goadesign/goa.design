---
title: "Error Handling"
linkTitle: "Error Handling"
weight: 4
description: "Learn how to handle errors in gRPC services with Goa, including status codes, error definitions, and error propagation"
---

This guide explains how to handle errors in gRPC services using Goa.

## Error Types

### Status Codes

gRPC uses status codes to indicate errors. Goa provides built-in mappings to these codes:

```go
Method("divide", func() {
    // Define possible errors
    Error("division_by_zero")
    Error("invalid_input")

    GRPC(func() {
        // Map errors to gRPC status codes
        Response(CodeOK)
        Response("division_by_zero", CodeInvalidArgument)
        Response("invalid_input", CodeInvalidArgument)
    })
})
```

Common status code mappings:

| Goa Error | gRPC Status Code | Use Case |
|-----------|-----------------|-----------|
| `not_found` | `CodeNotFound` | Resource doesn't exist |
| `invalid_argument` | `CodeInvalidArgument` | Invalid input |
| `internal_error` | `CodeInternal` | Server error |
| `unauthenticated` | `CodeUnauthenticated` | Missing/invalid credentials |
| `permission_denied` | `CodePermissionDenied` | Insufficient permissions |

## Error Definitions

### Basic Error Definition

Define errors at the service or method level:

```go
var _ = Service("users", func() {
    // Service-level errors
    Error("not_found", func() {
        Description("User not found")
    })
    Error("invalid_input")

    Method("getUser", func() {
        // Method-specific error
        Error("profile_incomplete")

        GRPC(func() {
            // Map all possible errors
            Response(CodeOK)
            Response("not_found", CodeNotFound)
            Response("invalid_input", CodeInvalidArgument)
            Response("profile_incomplete", CodeFailedPrecondition)
        })
    })
})
```

## Error Implementation

### Returning Errors

When implementing your service methods, you'll want to handle various types of errors. For input validation, it's best to define these constraints directly in your Goa DSL:

```go
var _ = Service("users", func() {
    Method("createUser", func() {
        Payload(func() {
            Field(1, "name", String, "User's full name")
            Field(2, "age", Int, "User's age")
            Field(3, "email", String, "User's email")
            
            // Define validation rules in the DSL
            Required("name", "age", "email")
            Minimum("age", 0)
            Maximum("age", 150)
            Pattern("email", "^[^@]+@[^@]+$")
        })
        
        Error("database_error")
        Error("duplicate_email")
        
        GRPC(func() {
            Response(CodeOK)
            Response("database_error", CodeInternal)
            Response("duplicate_email", CodeAlreadyExists)
        })
    })
})
```

For runtime errors that can't be validated through the DSL (like database conflicts, external service failures, or business logic violations), use the generated error constructors:

```go
func (s *users) CreateUser(ctx context.Context, p *users.CreateUserPayload) (*users.User, error) {
    // Check if email already exists
    exists, err := s.db.EmailExists(ctx, p.Email)
    if err != nil {
        // Wrap database errors
        return nil, users.MakeDatabaseError(fmt.Errorf("failed to check email: %w", err))
    }
    if exists {
        // Return business logic error
        return nil, users.MakeDuplicateEmail(fmt.Sprintf("email %s is already registered", p.Email))
    }
    
    // Create user in database
    user, err := s.db.CreateUser(ctx, p)
    if err != nil {
        return nil, users.MakeDatabaseError(fmt.Errorf("failed to create user: %w", err))
    }
    
    return user, nil
}
```

### Error Handling in Streaming

When working with streaming gRPC methods, error handling becomes more complex as you need to handle both stream-related errors and business logic errors. Here's an example showing how to handle different types of errors in a streaming service method:

```go
func (s *service) StreamData(stream service.StreamDataServerStream) error {
    for {
        data, err := getData()
        if err != nil {
            if isRateLimitError(err) {
                return service.MakeRateLimitExceeded(err)
            }
            return service.MakeInternalError(err)
        }

        if err := stream.Send(data); err != nil {
            if isStreamInterrupted(err) {
                return service.MakeStreamInterrupted(err)
            }
            return err
        }
    }
}
```

## Error Handling Patterns

### Wrapping Errors

When dealing with errors from external packages or lower-level components, it's important to provide context while maintaining the appropriate gRPC status codes. Here's how to wrap errors while preserving the error chain:

```go
func (s *service) ProcessData(ctx context.Context, p *service.ProcessDataPayload) (*service.Result, error) {
    result, err := s.processor.Process(p.Data)
    if err != nil {
        switch {
        case errors.Is(err, ErrInvalidFormat):
            return nil, service.MakeInvalidInput(fmt.Errorf("invalid data format: %w", err))
        case errors.Is(err, ErrProcessingFailed):
            return nil, service.MakeInternalError(fmt.Errorf("processing failed: %w", err))
        default:
            return nil, service.MakeInternalError(err)
        }
    }
    return result, nil
}
```

### Error Recovery

In long-running operations or batch processing, it's often desirable to implement error recovery mechanisms to handle transient failures. Here's an example showing how to implement retry logic and batch processing with error tracking:

```go
func (s *service) ProcessBatch(stream service.ProcessBatchServerStream) error {
    var processed, failed int

    for {
        payload, err := stream.Recv()
        if err == io.EOF {
            // Send final status
            return stream.SendAndClose(&service.BatchResult{
                Processed: processed,
                Failed:    failed,
            })
        }
        if err != nil {
            return service.MakeStreamInterrupted(err)
        }

        // Process with error recovery
        if err := s.processWithRetry(payload); err != nil {
            failed++
            // Log error but continue processing
            log.Printf("Failed to process item: %v", err)
            continue
        }
        processed++
    }
}

func (s *service) processWithRetry(payload *service.Payload) error {
    var err error
    for retries := 0; retries < 3; retries++ {
        err = s.process(payload)
        if err == nil {
            return nil
        }
        // Only retry on transient errors
        if !isTransientError(err) {
            return err
        }
        time.Sleep(time.Second * time.Duration(retries+1))
    }
    return err
}
```

## Best Practices

### Error Design Guidelines

1. **Define API-Level Common Errors**
   
   Define common errors at the API level to ensure consistency across all
   services and enable reuse. This reduces duplication and ensures uniform error
   handling:

   ```go
   var _ = API("myapi", func() {
       // Common errors shared across the API
       Error("unauthorized", func() {
           Description("Request requires authentication")
       })
       Error("not_found")  // Uses default ErrorResult type
       Error("validation_error", ValidationError, "Validation failed")

       // Define common HTTP mappings
       HTTP(func() {
           Response("unauthorized", StatusUnauthorized)
           Response("not_found", StatusNotFound)
           Response("validation_error", StatusBadRequest)
       })
   })
   ```

2. **Map Errors to Appropriate Status Codes**
   
   Choose appropriate gRPC status codes based on the error's semantic meaning, not just its source:

   ```go
   var _ = Service("users", func() {
       Method("createUser", func() {
           Error("invalid_input")
           Error("email_taken")
           Error("database_error")

           GRPC(func() {
               // Map to semantic gRPC codes
               Response("invalid_input", CodeInvalidArgument)
               Response("email_taken", CodeAlreadyExists)
               Response("database_error", CodeInternal)  // Hide implementation details
           })
       })
   })
   ```

3. **Document Error Conditions**
   
   Provide clear descriptions and examples for each error type to help API consumers handle errors appropriately:

   ```go
   var _ = Service("payment", func() {
       Method("processPayment", func() {
           Error("insufficient_funds", func() {
               Description("Account has insufficient funds for the transaction")
               Example(func() {
                   Value(Val{
                       "message": "Insufficient funds",
                       "balance": 50.00,
                       "required": 100.00,
                   })
               })
           })
           
           Error("card_declined", func() {
               Description("Payment card was declined by the provider")
               Meta("docs:example", "Card expired or invalid")
           })
       })
   })
   ```

4. **Error Hierarchy and Inheritance**
   
   Structure errors hierarchically to allow for both general and specific error handling:

   ```go
   var _ = Service("orders", func() {
       // Service-level error that applies to all methods
       Error("database_error")

       Method("placeOrder", func() {
           // Method-specific errors
           Error("inventory_unavailable")
           Error("payment_failed")
           
           // Can still use service-level errors
           // No need to redefine database_error
       })
   })
   ```

Following these best practices helps you maintain consistency across your API
while providing clear error information to clients. It enables effective error
handling and keeps your API documentation clear and useful. Additionally, it
allows you to hide implementation details while exposing meaningful error
information to consumers. The ability to reuse errors across methods and
services also helps reduce code duplication in your API design.