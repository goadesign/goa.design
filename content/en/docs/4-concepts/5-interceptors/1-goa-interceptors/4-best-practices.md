---
title: "Interceptor Best Practices"
description: "Guidelines and best practices for implementing Goa interceptors"
weight: 4
---

This guide covers best practices and guidelines for implementing interceptors in your Goa services.

## Design Time Best Practices

### 1. Keep Interceptors Focused

Interceptors should follow the single responsibility principle. Each interceptor
should handle one specific cross-cutting concern, such as logging, metrics, or
authentication. This makes them:

- Easier to maintain and update independently
- Simpler to test in isolation 
- More reusable across different services
- Clearer in their purpose and behavior
- Easier to compose together in different combinations

For example, instead of creating one large interceptor that handles both logging
and metrics, create two separate focused interceptors that can be used together
when needed. This separation of concerns leads to more maintainable and flexible
code.

Here's an example showing the difference between focused and unfocused interceptors:

```go
// Good: Focused interceptors
var Auth = Interceptor("Auth", func() {
    Description("Handles authentication only")
    ReadPayload(func() {
        Attribute("token", String)
    })
})

var Metrics = Interceptor("Metrics", func() {
    Description("Collects metrics only")
    ReadResult(func() {
        Attribute("status", Int)
    })
})

// Bad: Too many responsibilities
var AuthAndMetrics = Interceptor("AuthAndMetrics", func() {
    Description("Handles both auth and metrics")
    // Mixing concerns makes the interceptor harder to maintain
})
```

The focused interceptors are easier to test, maintain, and can be composed in
different combinations as needed.

### 2. Choose Appropriate Scope

Consider carefully whether an interceptor should apply to an entire service or
just specific methods. Service-level interceptors are good for consistent
cross-cutting concerns, while method-level interceptors are better for specific
requirements.

This example shows how to apply interceptors at different scopes:

```go
var _ = Service("users", func() {
    // Good: Auth applies to all methods
    ServerInterceptor(Auth)
    
    Method("list", func() {
        // Good: Metrics only needed for list
        ServerInterceptor(Metrics)
    })
})
```

Authentication is applied service-wide because it's needed everywhere, while
metrics collection is only applied to the list method where it's relevant.

### 3. Use Descriptive Names and Documentation

Clear naming and documentation help other developers understand the purpose and
behavior of your interceptors. The name should indicate what the interceptor
does, and the description should explain its purpose and any important details.

Compare these examples:

```go
// Good: Clear name and description
var RequestValidator = Interceptor("RequestValidator", func() {
    Description("Validates incoming requests against business rules")
    ReadPayload(func() {
        Attribute("data")
    })
})

// Bad: Unclear purpose
var Handler = Interceptor("Handler", func() {
    Description("Handles stuff")
    ReadPayload(func() {
        Attribute("data")
    })
})
```

The well-named interceptor makes its purpose clear and provides useful documentation.

## Implementation Best Practices

### 1. Handle Errors Gracefully

Define your errors at design time using Goa's error DSL. This ensures type
safety and consistent error handling across your service. The error definitions
become part of your API contract and generate appropriate helper functions.

Here's how to define and use errors properly:

```go
// In your design
var _ = Service("users", func() {
    // Define service-specific errors
    Error("unauthorized", ErrorResult, "Authentication failed")
    Error("invalid_token", ErrorResult, "Invalid or malformed token")
    
    // Use errors in interceptor design
    var Auth = Interceptor("Auth", func() {
        Error("unauthorized")
        Error("invalid_token")
        ReadPayload(func() {
            Attribute("token")
        })
    })
    
    ServerInterceptor(Auth)
})

// In your implementation
func (i *ServerInterceptors) Auth(ctx context.Context, info *AuthInfo, next goa.Endpoint) (any, error) {
    p := info.Payload()
    
    // Use design-time errors
    token := p.Token()
    if token == "" {
        return nil, genservice.MakeUnauthorized(fmt.Errorf("authentication token required"))
    }
    
    claims, err := validateToken(token)
    if err != nil {
        return nil, genservice.MakeInvalidToken(err.Error())
    }
    
    return next(ctx, info.RawPayload())
}
```

The generated `Make*` functions ensure that your errors match the design and
include proper error codes and metadata. This approach provides better error
handling than generic errors and helps maintain API consistency.

### 2. Preserve Context Values

When working with context in interceptors, it's important to properly manage and
preserve context values. Many libraries and tools (like tracers, loggers, or
authentication) store information in the context. Your interceptor should:

- Derive new contexts rather than creating fresh ones
- Preserve existing values when adding new ones
- Clean up resources properly using defer
- Pass the enriched context to the next handler

Here's an example of proper context handling:

```go
func (i *ServerInterceptors) Tracer(ctx context.Context, info *TracerInfo, next goa.Endpoint) (any, error) {
    // Good: Derive new context, preserve existing values
    ctx, span := tracer.Start(ctx, info.Method())
    defer span.End()
    
    return next(ctx, info.RawPayload())
}
```

This approach ensures that:
- Existing context values (like request IDs or auth info) are preserved
- Resources are properly cleaned up even if errors occur
- Downstream handlers have access to all necessary context information

## Performance Best Practices

Since interceptors run on every request, their performance impact is multiplied
across your service. Following these practices helps ensure your interceptors
remain efficient at scale.

### 1. Minimize Allocations

Memory allocations can significantly impact performance, especially under high
load. Use object pools, preallocate where possible, and avoid unnecessary
allocations in your interceptors. Common techniques include:

- Using sync.Pool for frequently allocated objects
- Preallocating slices with known capacity
- Reusing objects across requests
- Avoiding unnecessary string concatenations

Here's an example of efficient object management:

```go
func (i *ServerInterceptors) Metrics(ctx context.Context, info *MetricsInfo, next goa.Endpoint) (any, error) {
    // Good: Reuse objects
    labels := i.getLabelsFromPool()
    defer i.putLabelsToPool(labels)
    
    // Bad: Create new objects each time
    // labels := make(map[string]string)
    
    return next(ctx, info.RawPayload())
}
```

This approach reduces garbage collection pressure and improves overall service
performance, especially during high-traffic periods.

### 2. Use Appropriate Caching

Caching can dramatically improve performance, but it needs to be implemented
carefully. Consider:

- Cache duration and expiration strategy
- Cache key design
- Memory usage and eviction policies
- Cache invalidation mechanisms
- Concurrent access patterns

Here's an example of effective cache usage:

```go
func (i *ClientInterceptors) Cache(ctx context.Context, info *CacheInfo, next goa.Endpoint) (any, error) {
    p := info.Payload()
    
    // Good: Use appropriate cache duration
    if cached := i.cache.Get(p.CacheKey()); cached != nil {
        if !isExpired(cached, p.TTL()) {
            return cached, nil
        }
    }
    
    return next(ctx, info.RawPayload())
}
```

This pattern ensures efficient cache usage while maintaining data freshness and
managing memory effectively.

### 3. Avoid Blocking Operations

Blocking operations in interceptors can create bottlenecks and reduce service
throughput. Best practices include:

- Moving slow operations to goroutines
- Using buffered channels
- Implementing timeouts
- Handling errors asynchronously
- Using non-blocking algorithms where possible

Here's how to handle potentially blocking operations:

```go
func (i *ServerInterceptors) AsyncLogger(ctx context.Context, info *AsyncLoggerInfo, next goa.Endpoint) (any, error) {
    // Good: Non-blocking logging
    go func() {
        if err := i.logAsync(info.Method(), info.Payload()); err != nil {
            i.errorHandler(err)
        }
    }()
    
    return next(ctx, info.RawPayload())
}
```

This approach prevents logging operations from blocking the request pipeline while
ensuring all operations are still performed.

## Conclusion

Goa interceptors provide a powerful way to handle cross-cutting concerns in your
services while maintaining clean, maintainable code. Their design-first approach,
combined with type-safe code generation, helps you build robust services that are
easy to evolve over time. Key benefits include:

- Type safety throughout your interceptor chain
- Clear separation of concerns in your codebase
- Compile-time validation of interceptor usage
- Flexible composition of cross-cutting behaviors
- High performance through generated code
- Excellent testing support

By following these best practices and leveraging Goa's interceptor capabilities,
you can build services that are both maintainable and performant, while keeping
your business logic clean and focused. Whether you're implementing authentication,
logging, metrics collection, or other cross-cutting concerns, interceptors provide
a structured and type-safe way to achieve your goals.