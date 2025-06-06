---
title: Domain Vs Transport
weight: 1
description: "Learn about the distinction between domain errors and transport errors in Goa, and how to effectively map between them."
---

When designing error handling in Goa, it's important to understand the
distinction between domain errors and their transport representation. This
separation allows you to maintain clean domain logic while ensuring proper error
communication across different protocols.

## Domain Errors

Domain errors represent business logic failures in your application. They are
protocol-agnostic and focus on what went wrong from a business logic
perspective. Goa's default `ErrorResult` type is often sufficient for expressing
domain errors - custom error types are optional and only needed for specialized
cases.

### Using Default Error Type

The default `ErrorResult` type combined with meaningful names, descriptions, and
error properties can effectively express most domain errors:

```go
var _ = Service("payment", func() {
    // Define domain errors using default ErrorResult type
    Error("insufficient_funds", ErrorResult, func() {
        Description("Account has insufficient funds for the transaction")
        // Error properties help define error characteristics
        Temporary()  // Error may resolve if user adds funds
    })

    Error("card_expired", ErrorResult, func() {
        Description("Payment card has expired")
        // This is a permanent error until card is updated
    })

    Error("processing_failed", ErrorResult, func() {
        Description("Payment processing system temporarily unavailable")
        Temporary()  // Can retry later
        Fault()      // Server-side issue
    })
    
    Method("process", func() {
        // ... method definition
    })
})
```

Domain errors should:
- Have clear, descriptive names that reflect the business scenario
- Include meaningful descriptions for documentation and debugging
- Use error properties to indicate error characteristics
- Be independent of how they will be transmitted

### Custom Error Types (Optional)

For cases where additional structured error data is needed, you can define custom error types. See the
[main error handling documentation](_index.md#custom-error-types) for detailed information about
custom error types, including important requirements for the `name` field and the `struct:error:name`
metadata.

```go
// Custom type for when extra error context is required
var PaymentError = Type("PaymentError", func() {
    Description("PaymentError represents a failure in payment processing")
    Field(1, "message", String, "Human-readable error message")
    Field(2, "code", String, "Internal error code")
    Field(3, "transaction_id", String, "Failed transaction ID")
    Field(4, "name", String, "Error name for transport mapping", func() {
        Meta("struct:error:name")
    })
    Required("message", "code", "name")
})
```

## Transport Mapping

Transport mappings define how domain errors are represented in specific
protocols. This includes status codes, headers, and response formats.

### HTTP Transport

```go
var _ = Service("payment", func() {
    // Define domain errors
    Error("insufficient_funds", PaymentError)
    Error("card_expired", PaymentError)
    Error("processing_failed", PaymentError)
    
    HTTP(func() {
        // Map domain errors to HTTP status codes
        Response("insufficient_funds", StatusPaymentRequired, func() {
            // Add payment-specific headers
            Header("Retry-After")
            // Customize error response format
            Body(func() {
                Attribute("error_code")
                Attribute("message")
            })
        })
        Response("card_expired", StatusUnprocessableEntity)
        Response("processing_failed", StatusServiceUnavailable)
    })
})
```

### gRPC Transport

```go
var _ = Service("payment", func() {
    // Same domain errors
    Error("insufficient_funds", PaymentError)
    Error("card_expired", PaymentError)
    Error("processing_failed", PaymentError)
    
    GRPC(func() {
        // Map to gRPC status codes
        Response("insufficient_funds", CodeFailedPrecondition)
        Response("card_expired", CodeInvalidArgument)
        Response("processing_failed", CodeUnavailable)
    })
})
```

## Benefits of Separation

This separation of concerns provides several advantages:

1. **Protocol Independence**
   - Domain errors remain focused on business logic
   - Same error can be mapped differently for different protocols
   - Easy to add new transport protocols

2. **Consistent Error Handling**
   - Centralized error definitions
   - Uniform error handling across services
   - Clear mapping between domain and transport errors

3. **Better Documentation**
   - Domain errors document business rules
   - Transport mappings document API behavior
   - Clear separation helps API consumers

## Implementation Example

Here's how this separation works in practice:

### Using Default ErrorResult

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // Domain logic
    if !hasEnoughFunds(p.Amount) {
        // Return error using generated helper function
        return nil, payment.MakeInsufficientFunds(
            fmt.Errorf("account balance %d below required amount %d", balance, p.Amount))
    }
    
    if isSystemOverloaded() {
        // Return error for temporary system issue
        return nil, payment.MakeProcessingFailed(
            fmt.Errorf("payment system temporarily unavailable"))
    }
    
    // More processing...
}
```

### Using Custom Error Type (When Additional Context Needed)

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // Domain logic
    if !hasEnoughFunds(p.Amount) {
        // Return domain error with additional context
        return nil, &payment.PaymentError{
            Name:          "insufficient_funds",
            Message:       "Account balance too low for transaction",
            Code:         "FUNDS_001",
            TransactionID: txID,
        }
    }
    
    // More processing...
}
```

The transport layer automatically:
1. Maps the domain error to the appropriate status code
2. Formats the error response according to the protocol
3. Includes any protocol-specific headers or metadata

## Best Practices

1. **Domain First**
   - Design errors based on business requirements
   - Use domain terminology in error messages
   - Include relevant context for debugging

2. **Consistent Mapping**
   - Use appropriate status codes for each protocol
   - Maintain consistent mappings across services
   - Document the mapping rationale

3. **Error Properties**
   - Use error properties (`Temporary()`, `Timeout()`, `Fault()`) to indicate error characteristics
   - Consider implementing similar properties in custom error types
   - Document how properties affect client behavior

4. **Documentation**
   - Document both domain meaning and transport behavior
   - Include examples of error responses
   - Explain retry strategies and client handling

## Conclusion

By separating domain errors from their transport representation, Goa enables you to:
- Maintain clean domain logic
- Provide protocol-appropriate error responses
- Support multiple protocols consistently
- Scale your error handling as your API grows

