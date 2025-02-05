---
title: "Introduction"
weight: 1
---

# Introduction

Streaming is a powerful feature that allows APIs to handle large volumes of data
and real-time updates efficiently. In Goa, streaming support enables you to
define endpoints that can send or receive a sequence of results, enhancing the
responsiveness and scalability of your services.

## Why Streaming Matters

- **Efficiency:** Streaming reduces the overhead of multiple HTTP requests by
  allowing continuous data transmission over a single connection.
- **Real-Time Data:** Enables real-time data updates, which are essential for
  applications like live feeds, notifications, and data monitoring.
- **Scalability:** Handles large datasets more gracefully by processing data in
  chunks rather than loading entire datasets into memory.
- **Improved User Experience:** Provides a smoother and more responsive
  experience for users by delivering data incrementally.

## Goa's Streaming Capabilities

When working with large files or real-time data streams, loading entire payloads
into memory before processing them isn't always feasible or desirable. Goa
provides multiple approaches to handling streaming data:

Using `StreamingPayload` and `StreamingResult` when you need to:

- Stream structured data with known types
- Leverage Goa's type system and validation
- Work with gRPC streaming

Using `SkipRequestBodyEncodeDecode` and `SkipResponseBodyEncodeDecode` when you
need to:

- Stream raw binary data or unknown content types
- Implement custom streaming protocols
- Process multimedia streams

Goa supports unidirectional and bidirectional streaming over different transport
protocols, including HTTP (using WebSockets) and gRPC. By leveraging Goa's
Domain-Specific Language (DSL), you can define streaming endpoints that are
transport-agnostic, allowing seamless integration and flexibility in your
service architecture.

### Key Features

- **Unidirectional Streaming:** Allows either the server or the client to send a stream of data.
- **Bidirectional Streaming:** Enables both the server and the client to send streams of data simultaneously.
- **Transport Independence:** Defines streaming logic that works across multiple transport protocols without modification.
- **Generated Stream Interfaces:** Automatically generates server and client stream interfaces based on your streaming definitions.
- **Custom Views:** Supports multiple views for streamed results, providing flexibility in how data is presented to clients.

## Example Overview

Let's explore a `logger` service that manages log entries. We'll demonstrate
different streaming scenarios that showcase real-world use cases. See section
[Stream raw binary data over HTTP](./7-raw-binary) for an example of how to
stream raw binary data over HTTP.

### Server-Side Streaming Example

```go
var _ = Service("logger", func() {
    // Server streams log entries for a specific topic
    Method("subscribe", func() {
        Description("Stream log entries for a specific topic")
        
        Payload(func() {
            Field(1, "topic", String, "Topic of the log to subscribe to")
            Required("topic")
        })
        
        // Server streams log entries
        StreamingResult(func() {
            Field(1, "timestamp", String, "Time of reading")
            Field(2, "message", String, "Log message")
            Required("timestamp", "message")
        })

        HTTP(func() {
            GET("/logs/{topic}/stream")
            Response(StatusOK)
        })
    })
})
```

### Bidirectional Streaming Example

```go
var _ = Service("logger", func() {
    // Real-time inventory management with bidirectional streaming
    Method("subscribe", func() {
        Description("Bidirectional stream for real-time log updates and topic management")
        
        // Client streams inventory updates
        StreamingPayload(func() {
            Field(1, "topic", String, "Topic of the log to subscribe to")
            Required("topic")
        })
        
        // Server streams inventory status and alerts
        StreamingResult(func() {
            Field(1, "timestamp", String, "Time of reading")
            Field(2, "message", String, "Log message")
            Required("timestamp", "message")
        })

        HTTP(func() {
            GET("/logs/{topic}/stream")
            Response(StatusOK)
        })
    })
})
```

These examples demonstrate:

#### 1. Server-Side Streaming

A one-way streaming pattern where the server sends multiple responses to a single client request.

#### Example: Log Monitoring
    Client Request (once): "Monitor logs for 'database errors'"
    
    Server Responses (continuous):
    10:00:01 - Database connection timeout
    10:00:05 - Query execution failed
    10:00:08 - Connection pool exhausted
    (continues sending new logs as they occur)

**Key Characteristic:** After the initial request, data only flows from server to client.

#### 2. Bidirectional Streaming
A pattern allowing both sides to send multiple messages over time.

#### Example: Interactive Log Management
    Client: "Start monitoring logs for 'database'"
    Server: *sends database-related logs*
    Client: "Update filter to include 'network' too"
    Server: *sends both database and network logs*
    Client: "Remove 'database' filter"
    Server: *sends only network logs*
    (both sides continue communication)

**Key Characteristic:** Enables ongoing back-and-forth communication, where both
  client and server can send multiple messages throughout the connection's
  lifetime.

## Next Steps

With this introduction to streaming in Goa, you are now ready to delve deeper
into designing, implementing, and managing streaming endpoints. The subsequent
sections will guide you through:

- [Designing Streaming Endpoints](./2-designing)
- [Server-Side Streaming](./3-server-side)
- [Client-Side Streaming](./4-client-side)
- [Bidirectional Streaming](./5-bidirectional)
- [Handling Multiple Views](./6-views)
- [Stream raw binary data over HTTP](./7-raw-binary)
