---
title: Error Propagation
weight: 2
---

# Error Propagation

This guide explains how errors propagate through different layers of a Goa service, from the business
logic to the client.

## Overview

Error propagation in Goa follows a clear path:
1. Business logic generates an error
2. Error is matched to its design definition
3. Transport layer transforms the error
4. Client receives and interprets the error

## Error Flow

### 1. Business Logic Layer

Errors typically originate in your service implementation:

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // Business logic may return errors in several ways:
    
    // 1. Using generated helper functions (for ErrorResult)
    if !hasEnoughFunds(p.Amount) {
        return nil, payment.MakeInsufficientFunds(
            fmt.Errorf("account balance %d below required amount %d", balance, p.Amount))
    }
    
    // 2. Returning custom error types
    if err := validateCard(p.Card); err != nil {
        return nil, &payment.PaymentError{
            Name:    "card_expired",
            Message: err.Error(),
        }
    }
    
    // 3. Propagating errors from downstream services
    result, err := s.processor.ProcessPayment(ctx, p)
    if err != nil {
        // Wrap external errors in your domain errors
        return nil, payment.MakeProcessingFailed(fmt.Errorf("payment processor error: %w", err))
    }
    
    return result, nil
}
```

### 2. Error Matching

The Goa runtime matches returned errors to their design definitions:

```go
var _ = Service("payment", func() {
    // Errors defined here are matched by name
    Error("insufficient_funds")
    Error("card_expired")
    Error("processing_failed", func() {
        // Properties influence error handling
        Temporary()
        Fault()
    })
})
```

The matching process:
1. For `ErrorResult`: Uses the error name from the generated `MakeXXX` function
2. For custom types: Uses the field marked with `struct:error:name`
3. For unknown errors: Treated as internal server errors

### 3. Transport Layer

Once matched, errors are transformed according to transport-specific rules:

```go
var _ = Service("payment", func() {
    HTTP(func() {
        // HTTP mapping rules
        Response("insufficient_funds", StatusPaymentRequired)
        Response("card_expired", StatusUnprocessableEntity)
        Response("processing_failed", StatusServiceUnavailable)
    })
    
    GRPC(func() {
        // gRPC mapping rules
        Response("insufficient_funds", CodeFailedPrecondition)
        Response("card_expired", CodeInvalidArgument)
        Response("processing_failed", CodeUnavailable)
    })
})
```

The transport layer:
1. Applies the appropriate status code
2. Formats the error message and details
3. Serializes the response

### 4. Client Reception

Clients receive strongly-typed errors that match the design:

```go
client := payment.NewClient(endpoint)
result, err := client.Process(ctx, payload)
if err != nil {
    switch e := err.(type) {
    case *payment.InsufficientFundsError:
        // Handle insufficient funds (includes error properties)
        if e.Temporary {
            return retry(ctx, payload)
        }
        return promptForTopUp(e.Message)
        
    case *payment.CardExpiredError:
        // Handle expired card
        return promptForNewCard(e.Message)
        
    case *payment.ProcessingFailedError:
        // Handle processing failure
        if e.Temporary {
            return retryWithBackoff(ctx, payload)
        }
        return reportSystemError(e)
        
    default:
        // Handle unexpected errors
        return handleUnknownError(err)
    }
}
```

## Best Practices

1. **Error Wrapping**
   - Wrap external errors in your domain errors
   - Preserve root cause using `fmt.Errorf("...%w", err)`
   - Add context relevant to your domain

2. **Consistent Propagation**
   - Use generated helper functions when possible
   - Maintain error properties through the chain
   - Don't mix error types unnecessarily

3. **Transport Considerations**
   - Define appropriate status codes for each transport
   - Include relevant headers/metadata
   - Consider client requirements

4. **Client Experience**
   - Provide strongly-typed errors
   - Include sufficient context for handling
   - Document retry strategies

## Error Transformation Example

Here's a complete example of how an error transforms through the system:

```go
// 1. Business Logic (Service Implementation)
if !hasEnoughFunds(amount) {
    return nil, payment.MakeInsufficientFunds(
        fmt.Errorf("balance %d below required %d", balance, amount))
}

// 2. Error Definition (Design)
var _ = Service("payment", func() {
    Error("insufficient_funds", func() {
        Description("Account has insufficient funds")
        Temporary()  // Can retry after top-up
    })
})

// 3. Transport Mapping (Design)
HTTP(func() {
    Response("insufficient_funds", StatusPaymentRequired)
})

// 4. Client Reception
result, err := client.Process(ctx, payload)
if err != nil {
    if e, ok := err.(*payment.InsufficientFundsError); ok {
        if e.Temporary {
            // Wait for retry-after header duration
            time.Sleep(retryAfter)
            return retry(ctx, payload)
        }
    }
}
```

## Conclusion

Goa's error propagation system ensures that:
- Errors maintain their semantic meaning across layers
- Transport-specific details are handled automatically
- Clients receive strongly-typed, actionable errors
- Error handling remains consistent across your API

