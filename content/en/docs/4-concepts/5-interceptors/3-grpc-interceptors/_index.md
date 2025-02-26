---
title: gRPC Interceptors
weight: 4
description: >
  Learn how to create gRPC interceptors that work effectively with Goa services, with practical examples and integration patterns.
---

Goa services use standard gRPC interceptors, which means you can use any gRPC
interceptor that follows the standard pattern. This guide shows you how to create
effective gRPC interceptors that work well with Goa services, with examples drawn
from real-world usage.

gRPC interceptors should focus on protocol-level concerns like metadata handling,
connection management, and message transformation. For business logic and type-safe
access to your service's payloads and results, use Goa interceptors instead.
Goa interceptors provide direct access to your service's domain types and are better
suited for business-level concerns.

## Types of Interceptors

gRPC supports two types of interceptors, each serving different use cases:

1. **Unary Interceptors**: Handle single request/response RPCs, like traditional
   API calls. These are simpler to implement and are the most common type.

2. **Stream Interceptors**: Handle streaming RPCs where either the client, server,
   or both can send multiple messages. These require more complex handling of the
   stream lifecycle.

## Common Use Cases

Here are some common scenarios where gRPC interceptors are particularly useful:

1. **Metadata Propagation**: Handling trace IDs, request IDs, and other metadata
3. **Logging**: Recording RPC method calls and their outcomes
4. **Monitoring**: Collecting metrics about RPC calls
5. **Error Handling**: Converting between gRPC and domain errors
6. **Rate Limiting**: Controlling the rate of incoming requests
7. **Load Shedding**: Protecting services during high load

## Best Practices

When implementing gRPC interceptors for Goa services:

1. **Focus on Protocol Concerns**: Use gRPC interceptors for protocol-level
   operations like metadata handling. Use Goa interceptors for business logic.

2. **Handle Context Properly**: Always respect context cancellation and propagate
   context values correctly.

3. **Be Consistent**: Apply the same interceptor patterns across your service for
   predictable behavior.

4. **Consider Performance**: Interceptors run on every request, so keep them
   efficient.

5. **Error Handling**: Use appropriate gRPC status codes and include relevant
   error details.

6. **Testing**: Test interceptors thoroughly, including error cases and context
   cancellation.

## Integration with Goa

Here's how to integrate gRPC interceptors with a Goa service:

```go
func main() {
    // Create gRPC server with interceptors
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            // Protocol-level concerns in gRPC interceptors
            MetadataInterceptor(),
            LoggingInterceptor(),
            MonitoringInterceptor(),
        )),
        grpc.StreamInterceptor(grpc_middleware.ChainStreamServer(
            StreamMetadataInterceptor(),
            StreamLoggingInterceptor(),
            StreamMonitoringInterceptor(),
        )),
    )

    // Register Goa gRPC server
    pb.RegisterServiceServer(srv, server)
}
```

This example demonstrates:
- Chaining multiple interceptors using the `go-grpc-middleware` package
- Separating unary and stream interceptors
- Focusing on protocol-level concerns

## Next Steps

- Learn about [Unary Interceptors](@/docs/4-concepts/5-interceptors/3-grpc-interceptors/1-unary.md)
- Explore [Stream Interceptors](@/docs/4-concepts/5-interceptors/3-grpc-interceptors/2-stream.md)
- Review [Goa Interceptors](@/docs/4-concepts/5-interceptors/1-overview.md) for business logic
- Check out [Error Handling](@/docs/4-concepts/4-error-handling.md) for error conversion strategies

