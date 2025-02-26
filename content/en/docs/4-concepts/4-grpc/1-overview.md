---
title: "gRPC Overview"
linkTitle: "Overview"
weight: 1
description: "Learn about the core concepts of gRPC in Goa and how it integrates with Protocol Buffers"
---

Goa provides first-class support for designing and implementing gRPC services. This guide introduces the core concepts of using gRPC with Goa.

## What is gRPC?

[gRPC](https://grpc.io) is a high-performance RPC (Remote Procedure Call) framework that:
- Uses Protocol Buffers for efficient serialization
- Leverages HTTP/2 for transport
- Supports multiple programming languages
- Enables streaming communication patterns

## Goa's gRPC Integration

Goa's gRPC support provides:

1. **High-Level Design**: Define services using Goa's DSL:
   - Protocol Buffer definitions (`.proto` files)
   - Server and client code
   - Type-safe interfaces
3. **Transport Support**: Full HTTP/2 and gRPC transport layer handling
4. **Validation**: Built-in request validation
5. **Error Handling**: Structured error handling with status codes

## Basic Service Structure

Let's look at how to define a basic gRPC service in Goa. The following example demonstrates a simple calculator service that adds two numbers:

```go
var _ = Service("calculator", func() {
    // Service description helps document the purpose of your service
    Description("The Calculator service performs arithmetic operations")

    // Enable and configure gRPC transport for this service
    GRPC(func() {
        // This block can contain gRPC-specific settings like timeouts, 
        // interceptors, etc.
    })

    // Define a method named "add" that will be exposed as a gRPC endpoint
    Method("add", func() {
        // Document what this method does
        Description("Add two numbers")

        // Define the input message structure (what the client sends)
        // Each Field takes: position number, field name, and type
        Payload(func() {
            Field(1, "a", Int)    // First number to add
            Field(2, "b", Int)    // Second number to add
            Required("a", "b")     // Both fields are mandatory
        })

        // Define the output message structure (what the server returns)
        Result(func() {
            Field(1, "sum", Int)  // The result of adding a + b
        })
    })
})
```

This code defines a complete gRPC service with one method. The numbers in `Field(1, ...)` are Protocol Buffer field numbers, which are required for message serialization.

## Protocol Buffer Integration

When you define types in Goa, they are automatically mapped to corresponding Protocol Buffer types. Here's how Goa types correspond to Protocol Buffer types:

| Goa Type  | Protocol Buffer Type |
|-----------|---------------------|
| Int       | int32              |
| Int32     | int32              |
| Int64     | int64              |
| UInt      | uint32             |
| UInt32    | uint32             |
| UInt64    | uint64             |
| Float32   | float              |
| Float64   | double             |
| String    | string             |
| Boolean   | bool               |
| Bytes     | bytes              |
| ArrayOf   | repeated           |
| MapOf     | map                |

## Communication Patterns

gRPC supports four different communication patterns. Let's look at each with examples:

1. **Unary RPC**: The simplest pattern - client sends one request and gets one response
   ```go
   Method("add", func() {
       Description("Simple addition method - takes two numbers and returns their sum")
       Payload(func() {
           Field(1, "x", Int, "First number")
           Field(2, "y", Int, "Second number")
       })
       Result(func() {
           Field(1, "sum", Int, "The sum of x and y")
       })
   })
   ```

2. **Server Streaming**: Client sends one request, but receives multiple responses over time
   ```go
   Method("stream", func() {
       Description("Streams countdown numbers from the given start number")
       Payload(func() {
           Field(1, "start", Int, "Number to start counting down from")
       })
       // StreamingResult indicates server will send multiple responses
       StreamingResult(func() {
           Field(1, "count", Int, "Current number in the countdown")
       })
   })
   ```

3. **Client Streaming**: Client sends multiple requests over time, server sends one response
   ```go
   Method("collect", func() {
       Description("Accepts multiple numbers and returns their sum")
       // StreamingPayload indicates client will send multiple requests
       StreamingPayload(func() {
           Field(1, "number", Int, "Number to add to the sum")
       })
       Result(func() {
           Field(1, "total", Int, "Sum of all numbers received")
       })
   })
   ```

4. **Bidirectional Streaming**: Both client and server can send multiple messages over time
   ```go
   Method("chat", func() {
       Description("Bidirectional chat where both sides can send messages")
       StreamingPayload(func() {
           Field(1, "message", String, "Chat message from client")
       })
       StreamingResult(func() {
           Field(1, "response", String, "Chat message from server")
       })
   })
   ```

Each pattern is useful for different scenarios:
- Use Unary RPC for simple request-response interactions
- Use Server Streaming when the client needs to receive a stream of data (e.g., real-time updates)
- Use Client Streaming when you need to send lots of data to the server (e.g., uploading files)
- Use Bidirectional Streaming for complex interactions like chat applications or real-time gaming

## Next Steps

The following sections provide detailed information about:
- [Service Design](../2-service-design): Detailed guide on defining services
- [Streaming Patterns](../3-streaming): In-depth streaming implementation
- [Error Handling](../4-errors): Comprehensive error handling
- [Implementation](../5-implementation): Server and client implementation
- [Transport & Configuration](../6-transport): Advanced transport topics
