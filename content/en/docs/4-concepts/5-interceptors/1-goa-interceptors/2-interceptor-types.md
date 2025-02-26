---
title: "Types of Interceptors"
description: "Understanding different types of Goa interceptors and their use cases"
weight: 2
---

Goa supports several types of interceptors to handle different scenarios. This guide explains the different types and when to use them.

## Core Concepts

When designing interceptors, there are three key dimensions to consider:

1. Server-side vs Client-side:
   - Server-side interceptors run on the service implementation
   - Client-side interceptors run in the generated client

2. Payload vs Result access:
   - Payload: access/modify the incoming request
   - Result: access/modify the outgoing response

3. Read vs Write access:
   - Read: inspect data without modification
   - Write: modify or enrich data

Interceptors only need to reference the attributes they want to access by name -
they don't need to redefine the complete attribute definition or description.
The method design must include these attributes in its payload and result types.

## Basic Patterns

### Read-Only Access

Use this when you need to inspect but not modify data. Perfect for monitoring,
logging, and validation:

```go
var Monitor = Interceptor("Monitor", func() {
    Description("Collects metrics without modifying the data")
    
    // Read request size from payload
    ReadPayload(func() {
        Attribute("size")        // Type and description come from payload type
    })
    
    // Read response status from result
    ReadResult(func() {
        Attribute("status")      // Type and description come from result type
    })
})
```

The `ReadPayload` and `ReadResult` DSL functions declare read-only access to payload and result attributes:
- The interceptor only needs to list the attribute names it wants to access
- Types and descriptions are inherited from the method's payload and result types
- Multiple attributes can be listed in a single `ReadPayload` or `ReadResult` block
- The interceptor implementation receives these attributes as read-only fields

### Write Access

Use this pattern when the interceptor needs to modify or add data:

```go
var Enricher = Interceptor("Enricher", func() {
    Description("Adds context information to requests and responses")
    
    // Add request ID to payload
    WritePayload(func() {
        Attribute("requestID")   // Must be defined in payload type
    })
    
    // Add timing to result
    WriteResult(func() {
        Attribute("processedAt") // Must be defined in result type
    })
})
```

The `WritePayload` and `WriteResult` DSL functions declare write access:
- Listed attributes can be modified by the interceptor implementation
- The method's payload and result types must include these attributes
- Multiple write blocks can be defined if needed
- Write access implicitly includes read access to the same attributes

### Combined Access

When an interceptor needs both read and write access, combine the patterns:

```go
var DataProcessor = Interceptor("DataProcessor", func() {
    Description("Processes both requests and responses")
    
    // Transform request data
    ReadPayload(func() {
        Attribute("rawData")     // Input data from payload
        Attribute("format")      // Current format
    })
    WritePayload(func() {
        Attribute("processed")   // Transformed data
        Attribute("newFormat")   // New format
    })
    
    // Transform response data
    ReadResult(func() {
        Attribute("status")      // Response status
        Attribute("data")        // Response data
    })
    WriteResult(func() {
        Attribute("enriched")    // Enriched response
        Attribute("metadata")    // Added metadata
    })
})
```

Key points about combining access patterns:
- Read and write blocks can be mixed freely for both payload and result
- Each block can list multiple attributes
- The same attribute can appear in both read and write blocks
- The order of blocks doesn't affect the implementation

## Server-Side Interceptors

Server interceptors execute on the service implementation side, running after
the request has been decoded but before the service method is called. They're
perfect for implementing cross-cutting concerns like logging, metrics
collection, request enrichment, and response transformation.

Here's an example of a server-side caching interceptor that caches responses for
GET requests:

```go
var Cache = Interceptor("Cache", func() {
    Description("Implements response caching for GET requests")
    
    // We need to read the record ID to use as cache key
    ReadPayload(func() {
        Attribute("recordID")    // UUID from payload type
    })
    
    // We'll add caching metadata to the response
    WriteResult(func() {
        Attribute("cachedAt")    // String from result type
        Attribute("ttl")         // Int from result type
    })
})
```

This server-side interceptor demonstrates:
- How to combine read access to payload with write access to result
- That interceptors can be applied at the service level
- The separation between attribute declaration in the DSL and implementation logic
- That attribute types are defined by the method, not the interceptor

The service design must include these attributes:

```go
var _ = Service("catalog", func() {
    // Apply caching to all methods in the service
    ServerInterceptor(Cache)
    
    Method("get", func() {
        Payload(func() {
            // Define attribute used by Cache interceptor
            Attribute("recordID", UUID, "Record identifier for cache key")
        })
        Result(func() {
            // Define attributes used by Cache interceptor
            Attribute("cachedAt", String, "When the response was cached")
            Attribute("ttl", Int, "Time-to-live in seconds")
            // Other result fields...
        })
        HTTP(func() {
            GET("/{recordID}")
            Response(StatusOK)
        })
    })
})
```

## Client-Side Interceptors

Client interceptors execute on the client side before requests are sent to the
server. They enable client-side behaviors like request enrichment, response
processing, and client-side caching.

Here's an example of a client-side interceptor that adds client context and
tracks rate limits:

```go
var ClientContext = Interceptor("ClientContext", func() {
    Description("Enriches requests with client context and tracks rate limits")
    
    // Add client context to outgoing requests
    WritePayload(func() {
        Attribute("clientVersion")  // String from payload type
        Attribute("clientID")       // UUID from payload type
        Attribute("region")         // String from payload type
    })
    
    // Track rate limiting information from responses
    ReadResult(func() {
        Attribute("rateLimit")           // From result type
        Attribute("rateLimitRemaining")  // From result type
        Attribute("rateLimitReset")      // From result type
    })
})
```

This client-side interceptor illustrates:
- How client interceptors modify outgoing requests using `WritePayload`
- How they can read response data using `ReadResult`
- That the same DSL patterns work for both client and server interceptors
- The importance of declaring all needed attributes in the method design

The service must define these attributes:

```go
var _ = Service("inventory", func() {
    // Ensure all client calls include context information
    ClientInterceptor(ClientContext)
    
    Method("list", func() {
        Payload(func() {
            // Business logic attributes
            Attribute("page", Int, "Page number")
            Attribute("perPage", Int, "Items per page")
            
            // Required by ClientContext interceptor
            Attribute("clientVersion", String, "Version of the client library")
            Attribute("clientID", UUID, "Unique identifier for this client instance")
            Attribute("region", String, "Geographic region of the client")
        })
        Result(func() {
            // Business logic attributes
            Attribute("items", ArrayOf(Item))
            
            // Required by ClientContext interceptor
            Attribute("rateLimit", Int, "Current rate limit")
            Attribute("rateLimitRemaining", Int, "Remaining requests in current window")
            Attribute("rateLimitReset", Int, "When the rate limit window resets")
        })
    })
})
```

## Streaming Interceptors

Streaming interceptors handle streaming methods where either the payload,
result, or both are streams of messages. They use special streaming variants of
the access patterns:

- `ReadStreamingPayload`/`WriteStreamingPayload`: For client streams
- `ReadStreamingResult`/`WriteStreamingResult`: For server streams

Here's an example showing different streaming interceptor patterns:

```go
// SERVER-SIDE interceptor that WRITES to streaming RESULTS
var ServerProgressTracker = Interceptor("ServerProgressTracker", func() {
    Description("Adds progress information to server stream responses")
    
    WriteStreamingResult(func() {
        Attribute("percentComplete")  // Float32 from streaming result type
        Attribute("itemsProcessed")   // Int from streaming result type
    })
})

// CLIENT-SIDE interceptor that WRITES to streaming PAYLOADS
var ClientMetadataEnricher = Interceptor("ClientMetadataEnricher", func() {
    Description("Enriches outgoing client stream messages with metadata")
    
    WriteStreamingPayload(func() {
        Attribute("clientTimestamp")  // From streaming payload type
        Attribute("clientRegion")     // From streaming payload type
    })
})
```

The streaming interceptor DSL introduces special patterns:
- `ReadStreamingPayload`/`WriteStreamingPayload` for client streams
- `ReadStreamingResult`/`WriteStreamingResult` for server streams
- These patterns work the same way as their non-streaming counterparts
- The difference is they apply to each message in the stream
- The same attribute declaration rules apply: list only names, types come from the method

Example service using streaming interceptors:

```go
var _ = Service("fileProcessor", func() {
    // Server streaming example
    Method("processFile", func() {
        Description("Process a file with progress updates")
        Payload(FileRequest)              // Single request
        StreamingResult(func() {          // Multiple responses
            // Business logic fields
            Attribute("data", Bytes)
            
            // Required by ServerProgressTracker
            Attribute("percentComplete", Float32)
            Attribute("itemsProcessed", Int)
        })
        ServerInterceptor(ServerProgressTracker)
    })
    
    // Client streaming example
    Method("uploadFile", func() {
        Description("Upload a file in chunks")
        StreamingPayload(func() {         // Multiple requests
            // Business logic fields
            Attribute("chunk", Bytes)
            
            // Required by ClientMetadataEnricher
            Attribute("clientTimestamp", Int)
            Attribute("clientRegion", String)
        })
        Result(UploadResult)              // Single response
        ClientInterceptor(ClientMetadataEnricher)
    })
})
```

## Next Steps

- Learn about [Interceptor Implementation](3-interceptor-implementation) details and patterns
- Learn about [Best Practices](../4-best-practices) for implementing interceptors