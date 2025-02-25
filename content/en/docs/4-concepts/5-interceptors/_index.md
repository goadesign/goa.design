---
linkTitle: Interceptors & Middleware
title: Interceptors & Middleware
weight: 5
---

# Interceptors & Middleware

Building modern APIs requires processing requests at different layers of your 
application. Goa provides a comprehensive solution that combines type-safe 
interceptors with traditional middleware patterns, giving you the best of both worlds.

## Understanding the Different Approaches

When processing requests in a Goa service, you have three complementary tools at 
your disposal. Each serves a specific purpose and works together with the others 
to create a complete request processing pipeline.

### The Power of Type-Safe Interceptors

At the heart of Goa's design is its unique interceptor system. Unlike traditional 
middleware, Goa interceptors provide compile-time safe access to your service's 
domain types. This fundamental difference becomes clear when comparing traditional 
middleware with Goa interceptors:

```go
// Traditional middleware must work with raw bytes or interface{},
// making it error-prone and requiring type assertions
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Hope the body contains what you expect!
        data := parseBody(r)
        // Type assertions and error handling needed
    })
}

// Goa interceptors provide type-safe access to your domain types,
// with compile-time checks and generated helper methods
func (i *Interceptor) Process(ctx context.Context, info *ProcessInfo, next goa.Endpoint) (any, error) {
    // Direct access to typed payload fields
    amount := info.Amount()
    if amount > 1000 {
        // Use generated error constructors
        return nil, goa.MakeInvalidAmount(fmt.Errorf("Amount exceeds maximum"))
    }
    // Continue processing with type safety
}
```

### Transport-Specific Middleware

While Goa interceptors handle business logic, you'll still need to deal with 
transport-specific concerns. For this, Goa integrates seamlessly with standard 
Go middleware patterns:

1. [HTTP Middleware](./2-http-middleware) uses the standard `http.Handler` pattern 
   for HTTP-specific tasks like compression, CORS, and session management.

2. [gRPC Interceptors](./3-grpc-interceptors) handle RPC-specific needs like 
   streaming operations and metadata management using standard gRPC patterns.

## Combining All Three Approaches

Let's look at a real-world example of how these three components work together in 
a payment processing service. Each layer handles what it does best, creating a 
clean separation of concerns.

First, we set up HTTP middleware to handle protocol-level concerns:

```go
func main() {
    // Create the base HTTP muxer
    mux := goahttp.NewMuxer()
    
    // Build the middleware chain from inside out
    handler := mux
    
    // Add observability with OpenTelemetry
    handler = otelhttp.NewHandler(handler, "payment-svc")
    
    // Enable debug tooling and logging
    handler = debug.HTTP()(handler)
    handler = log.HTTP(ctx)(handler)
    
    // Mount debug endpoints for runtime control
    debug.MountDebugLogEnabler(debug.Adapt(mux))
    debug.MountPprofHandlers(debug.Adapt(mux))
}
```

Next, we define our business logic using Goa interceptors. These provide type-safe 
validation and processing:

```go
var _ = Service("payment", func() {
    // Define a type-safe payment validator
    var ValidatePayment = Interceptor("ValidatePayment", func() {
        Description("Validates payment details")
        
        // Specify which payload fields we need to access
        ReadPayload(func() {
            Attribute("amount")
            Attribute("currency")
        })
        
        // Define possible validation errors
        Error("invalid_amount")
        Error("unsupported_currency")
    })
    
    Method("process", func() {
        // Apply the validator to this method
        ServerInterceptor(ValidatePayment)
        
        // Define the method's payload
        Payload(func() {
            Attribute("amount", Int)
            Attribute("currency", String)
            Required("amount", "currency")
        })
    })
})
```

Finally, we set up gRPC interceptors for RPC-specific concerns:

```go
func setupGRPC() *grpc.Server {
    return grpc.NewServer(
        grpc.UnaryInterceptor(
            grpc_middleware.ChainUnaryServer(
                // Add RPC-level features
                grpc_recovery.UnaryServerInterceptor(),   // Panic recovery
                grpc_prometheus.UnaryServerInterceptor,   // Metrics
                grpc_ctxtags.UnaryServerInterceptor(),   // Context tagging
            ),
        ),
    )
}
```

## The Middleware Chain

Understanding how these components work together requires understanding their 
execution order. Goa processes requests through a carefully ordered chain that 
maximizes the benefits of each layer.

### Order of Operations

1. Transport-specific middleware runs first, handling protocol-level concerns like 
   request tracing and logging. This ensures we have proper observability from the 
   start of request processing.

2. Goa interceptors run next, providing type-safe access to your domain types for 
   business-level validation and transformation.

3. Finally, your service logic executes, receiving fully validated and transformed 
   data.

The response follows the reverse path, allowing each layer to process the response 
appropriately. Here's what this looks like in a typical payment processing flow:

```
Request Processing:
─────────────────────────────────────────────────────────────────────────────>
OpenTelemetry → Debug/Logging → Business Validation → Rate Limiting → Payment

Response Processing:
<─────────────────────────────────────────────────────────────────────────────
Payment → Rate Limiting → Business Validation → Response Logging → Tracing
```

This layered approach provides several benefits:

1. Observability wraps all operations, giving you complete visibility into request 
   processing.

2. Debug tooling is available when needed, making it easier to diagnose issues.

3. Business validation occurs with full type safety, reducing errors and improving 
   maintainability.

4. Each layer focuses on its specific responsibilities, leading to cleaner, more 
   maintainable code.

## Next Steps

Now that you understand how the different pieces fit together, dive deeper into 
each component:

Start with [Goa Interceptors](./1-goa-interceptors) to learn about type-safe 
request processing, then explore HTTP and gRPC middleware patterns in their 
respective sections.

