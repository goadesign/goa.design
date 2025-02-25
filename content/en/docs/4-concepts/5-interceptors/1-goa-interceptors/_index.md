---
linkTitle: Goa Interceptors
title: Goa Interceptors
description: "Learn about Goa's type-safe interceptor system for cross-cutting concerns"
weight: 1
---

# Overview

Goa interceptors provide a powerful, type-safe mechanism for injecting
cross-cutting concerns into your service methods. They allow you to intercept
and modify both requests and responses at both the client and server side, with
full type safety and excellent IDE support.

## What are Interceptors?

Interceptors are components that allow you to add behavior that executes before,
after, or around your service methods. They can:

- Read and modify incoming requests
- Read and modify outgoing responses
- Handle errors
- Add context information
- Implement cross-cutting concerns like logging, monitoring, or data transformation

## Key Features

- **Type Safety**: All interceptor interactions are fully typed with generated helper types
- **Flexible Placement**: Can be applied at both service and method levels
- **Bi-directional**: Support for both client-side and server-side interception
- **Streaming Support**: Full support for unary and streaming operations
- **Clean DSL**: Clear, declarative syntax for defining interceptors
- **Explicit Access Control**: Clear specification of which payload and result fields can be accessed

## Basic Example

Here's a simple example of defining a client-side retry interceptor:

```go
var RetryPolicy = Interceptor("RetryPolicy", func() {
    Description("Implements exponential backoff retry for failed operations")
    
    // Track retry attempts in result
    WriteResult(func() {
        Attribute("attempts")
    })
})

var _ = Service("payment", func() {
    // Apply retry policy to all service methods
    ClientInterceptor(RetryPolicy)
    
    Method("process", func() {
        Payload(func() {
            Attribute("amount", Int, "Payment amount")
            Attribute("currency", String, "Payment currency")
        })
        Result(func() {
            Attribute("id", String, "Transaction ID")
            Attribute("status", String, "Transaction status")
            Attribute("attempts", Int, "Number of retry attempts made")
        })
        // Method-specific configuration...
    })
})
```
In this example, we define a `RetryPolicy` interceptor that implements
exponential backoff for failed operations. Let's break down the key components:

1. **Interceptor Definition**:

   ```go
   var RetryPolicy = Interceptor("RetryPolicy", func() {
   ```

   This creates a new interceptor named "RetryPolicy".

2. **Result Modification**:

   ```go
   WriteResult(func() {
       Attribute("attempts")
   })
   ```

   The interceptor declares that it will write to an "attempts" field in the
   response, tracking how many retries were needed.

3. **Service Application**:

   ```go
   ClientInterceptor(RetryPolicy)
   ```

   The interceptor is applied at the service level, meaning it will affect all methods in the service.

4. **Method Definition**:

   The `process` method shows how the interceptor integrates with the service:
   - The payload defines the payment details (amount and currency)
   - The result includes the standard transaction fields (id, status)
   - The `attempts` field in the result allows the retry interceptor to report its activity

When implemented, this interceptor will automatically retry failed operations
with increasing delays between attempts, providing resilience against transient
failures.

## When to Use Interceptors

Interceptors are ideal for several common use cases in service architectures:

- **Client Resilience**: Implement retry policies and circuit breakers
- **Resource Management**: Rate limiting and request throttling
- **Monitoring**: Track operation metrics and performance
- **Data Transformation**: Modify or enrich data as it flows through your system
- **Correlation**: Add request correlation and tracing IDs
- **Caching**: Implement client-side or server-side caching
- **Validation**: Add custom validation rules beyond Goa's built-in validation
- **Error Handling**: Standardize error responses and recovery strategies

Note that for security concerns like authentication and authorization, you
should use Goa's built-in security DSL instead of interceptors, as it provides
more robust and specialized security features.

## Next Steps

- Learn how to [Get Started](1-getting-started) with interceptors
- Explore different [Types of Interceptors](2-interceptor-types) for specific scenarios
- Learn about [Interceptor Implementation](3-interceptor-implementation) details and patterns
- Review [Best Practices](4-best-practices) for using interceptors effectively

