---
title: "Getting Started with Interceptors"
description: "Learn how to create and use Goa interceptors"
weight: 1
---

# Getting Started with Interceptors

This guide will walk you through creating and using your first Goa interceptor.
We'll create a simple logging interceptor that records the timing of method
calls.

## Defining an Interceptor

Interceptors are defined in your design using the `Interceptor` function. Here's
a simple logging interceptor:

```go
var RequestLogger = Interceptor("RequestLogger", func() {
    Description("Logs incoming requests and their timing")
    
    // We want to read the method status from the result
    ReadResult(func() {
        Attribute("status", Int, "Returned status code") // Business logic status code - not HTTP
    })
    
    // We'll add timing information to the result
    WriteResult(func() {
        Attribute("processedAt", String, "When the request was processed")
        Attribute("duration", Int, "Processing duration in milliseconds")
    })
})
```

The `Interceptor` DSL defines a new interceptor named `RequestLogger`. Using
`ReadResult` and `WriteResult`, it specifies which fields it needs to access
from the result - in this case reading a result status code and writing timing
information. Goa also has equivalent DSL to read and write payloads.

## Applying Interceptors

You can apply interceptors at both the service and method level:

```go
var _ = Service("calculator", func() {
    // Apply to all methods in the service
    ServerInterceptor(RequestLogger)
    
    Method("add", func() {
        // Method-specific interceptor
        ServerInterceptor(ValidateNumbers)
        
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
    })
})
```

The example shows how to apply interceptors in the service design using
`ServerInterceptor`. You can attach them at both the service level (affecting
all methods) or method level (affecting just that method).

This creates a simple logging system that can track timing across your service
operations while maintaining type safety through Goa's generated code.

## Implementing the Interceptor

The generated code will provide you with type-safe interfaces for implementing
your interceptor. Here's how to implement the logging interceptor:

```go
func (i *ServerInterceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // Call the next interceptor or the final endpoint
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Access the result through the type-safe interface
    r := info.Result(res)
    
    // Add our timing information
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

Let's break down how this interceptor works:

1. The function signature follows Goa's interceptor pattern:
   - Takes a context, type-safe info object, and the next endpoint
   - Returns the result and any error

2. Timing capture:

   ```go
   start := time.Now()
   ```

   Records when the request started

3. Calling the next handler:

   ```go
   res, err := next(ctx, info.RawPayload())
   ```

   - Executes the next interceptor or final endpoint
   - Passes through the original payload
   - Returns early if there's an error

4. Accessing the result:
   ```go
   r := info.Result(res)
   ```
   Uses the generated type-safe interface to access the result

5. Adding timing information:
   ```go
   r.SetProcessedAt(time.Now().Format(time.RFC3339))
   r.SetDuration(int(time.Since(start).Milliseconds()))
   ```
   - Records when processing completed
   - Calculates and stores the total duration
   - Uses generated setters for type safety

6. Returns the modified result:
   ```go
   return res, nil
   ```
   Passes the enriched response back up the chain


## Using the Interceptor

Once you've defined your interceptor, Goa generates the necessary code to wire
it into your service. Here's how the generated code is structured:

1. First, Goa generates a `ServerInterceptors` interface that defines all server-side interceptors:

```go
// ServerInterceptors defines the interface for all server-side interceptors
type ServerInterceptors interface {
    RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error)
    // ... other interceptors ...
}
```

2. For each interceptor, Goa generates type-safe info structures and interfaces:

```go
// Info structure provides metadata about the interception
type RequestLoggerInfo struct {
    service    string
    method     string
    callType   goa.InterceptorCallType
    rawPayload any
}

// Type-safe interface for accessing the result
type RequestLoggerResult interface {
    Status() int
    SetProcessedAt(string)
    SetDuration(int)
}
```

3. Implement the `ServerInterceptors` interface in your service:

```go
type interceptors struct {
    logger *log.Logger
}

func NewInterceptors(logger *log.Logger) *interceptors {
    return &interceptors{logger: logger}
}

func (i *interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    // Implementation from earlier example
    start := time.Now()
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    r := info.Result(res)
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

4. Goa generates wrapper functions to apply interceptors to your endpoints:

```go
func main() {
    // Create your service implementation
    svc := NewService()
    
    // Create interceptors
    interceptors := NewInterceptors(log.Default())
    
    // Create endpoints with interceptors
    endpoints := NewEndpoints(svc, interceptors)
    
    // ... Proceed as usual ...
}
```

The generated code provides several key benefits:

- Type-safe access to payloads and results through generated interfaces
- Automatic wrapping of endpoints in the correct order
- Clear separation between interceptor definition and implementation
- Proper handling of different call types (unary, server streaming, client streaming, bidirectional)

The generated interfaces and wrappers ensure that your interceptors are properly
integrated into the request processing pipeline while maintaining type safety
throughout the entire chain.

## Interceptor Execution Order

When multiple interceptors are applied, they execute in the following order:

1. Service-level interceptors (in order of declaration)
2. Method-level interceptors (in order of declaration)
3. The actual endpoint
4. Method-level interceptors (in reverse order)
5. Service-level interceptors (in reverse order)

This means that interceptors wrap around both the request and response flow.

## Next Steps

Now that you understand the basics:

- Learn about different [Types of Interceptors](../2-interceptor-types)
- Learn about [Interceptor Implementation](3-interceptor-implementation) details and patterns
- Check out [Best Practices](../4-best-practices) for production use