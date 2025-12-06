---
title: HTTP Guide
weight: 4
description: "Complete guide to HTTP transport in Goa - routing, content negotiation, WebSocket, SSE, CORS, and static content."
llm_optimized: true
aliases:
  - /en/docs/4-concepts/3-http/
  - /en/docs/4-concepts/3-http/1-content/
  - /en/docs/4-concepts/3-http/2-routing/
  - /en/docs/4-concepts/3-http/3-websocket/
  - /en/docs/4-concepts/3-http/4-cors/
  - /en/docs/3-tutorials/1-rest-api/
  - /en/docs/3-tutorials/1-rest-api/1-designing/
  - /en/docs/3-tutorials/1-rest-api/2-implementing/
  - /en/docs/3-tutorials/1-rest-api/3-running/
  - /en/docs/3-tutorials/1-rest-api/4-encoding/
  - /en/docs/3-tutorials/4-streaming/
  - /en/docs/3-tutorials/4-streaming/1-introduction/
  - /en/docs/3-tutorials/4-streaming/2-designing/
  - /en/docs/3-tutorials/4-streaming/3-server-side/
  - /en/docs/3-tutorials/4-streaming/4-client-side/
  - /en/docs/3-tutorials/4-streaming/5-bidirectional/
  - /en/docs/3-tutorials/4-streaming/6-views/
  - /en/docs/3-tutorials/4-streaming/7-raw-binary/
  - /en/docs/3-tutorials/4-streaming/8-sse/
  - /en/docs/3-tutorials/5-static-content/
  - /en/docs/3-tutorials/5-static-content/1-serving-files/
  - /en/docs/3-tutorials/5-static-content/2-template-integration/
  - /en/docs/3-tutorials/5-static-content/3-single-page-apps/
  - /docs/4-concepts/3-http/
  - /docs/3-tutorials/1-rest-api/
  - /docs/3-tutorials/4-streaming/
  - /docs/3-tutorials/5-static-content/
---

This guide covers HTTP-specific features in Goa, from basic routing to advanced topics like WebSocket streaming and content negotiation.

## HTTP Routing

### Basic Routing

Routes are defined using the `HTTP` function within a Service:

```go
var _ = Service("calculator", func() {
    HTTP(func() {
        Path("/calculator")  // Base path for all endpoints
    })

    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
        })
        Result(Int)
        HTTP(func() {
            POST("/add")  // POST /calculator/add
        })
    })
})
```

Goa supports all standard HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`.

A single method can handle multiple HTTP methods or paths:

```go
Method("manage_user", func() {
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // Create
        PUT("/users/{user_id}") // Update
        Response(StatusOK)
        Response(StatusCreated)
    })
})
```

### Path Parameters

Capture dynamic values from the URL:

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "user_id", String, "User ID")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // Maps to payload.UserID
    })
})
```

Map URL parameter names to payload field names:

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "id", Int, "User ID")
    })
    HTTP(func() {
        GET("/users/{user_id:id}")  // URL uses user_id, maps to payload.ID
    })
})
```

### Query Parameters

Define query parameters with the `Param` function:

```go
Method("list_users", func() {
    Payload(func() {
        Field(1, "page", Int, "Page number", func() {
            Default(1)
            Minimum(1)
        })
        Field(2, "per_page", Int, "Items per page", func() {
            Default(20)
            Minimum(1)
            Maximum(100)
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        Param("page")
        Param("per_page")
    })
})
```

### Wildcards

Capture all remaining path segments:

```go
Method("serve_files", func() {
    Payload(func() {
        Field(1, "path", String, "Path to file")
    })
    HTTP(func() {
        GET("/files/*path")  // Matches /files/docs/image.png
    })
})
```

### Service Relationships

Use `Parent` to establish service hierarchies:

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/users/{user_id}")
        CanonicalMethod("get")  // Override default "show"
    })
    
    Method("get", func() {
        Payload(func() {
            Field(1, "user_id", String)
        })
        HTTP(func() {
            GET("")  // GET /users/{user_id}
        })
    })
})

var _ = Service("posts", func() {
    Parent("users")  // Inherit parent's path
    
    Method("list", func() {
        // user_id inherited from parent
        HTTP(func() {
            GET("/posts")  // GET /users/{user_id}/posts
        })
    })
})
```

### Path Prefix Hierarchy

Combine prefixes at API and service levels:

```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // Global prefix
    })
})

var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1/users")  // Service prefix
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")  // Final: /api/v1/users/{id}
        })
    })
})
```

---

## Content Negotiation

### Built-in Encoders

Goa's default encoders support:
- JSON (`application/json`, `*+json`)
- XML (`application/xml`, `*+xml`)
- Gob (`application/gob`, `*+gob`)
- HTML (`text/html`)
- Plain text (`text/plain`)

Response content type is determined by:
1. `Accept` header
2. `Content-Type` header (if no Accept)
3. Default (JSON)

Set a default response content type:

```go
Method("create", func() {
    HTTP(func() {
        POST("/media")
        Response(StatusCreated, func() {
            ContentType("application/json")
        })
    })
})
```

### Custom Encoders

Create custom encoders for specialized formats:

```go
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    enc.w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(enc.w).Encode(v)
}

func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

Register custom encoders when creating the server:

```go
func main() {
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r)
        }
    }
    
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w)
    }
    
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

---

## WebSocket Integration

WebSocket enables real-time, bidirectional communication. Goa implements WebSocket through its streaming DSL.

### Streaming Patterns

**Client-to-Server Streaming:**

```go
Method("listener", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    HTTP(func() {
        GET("/listen")  // WebSocket endpoints must use GET
    })
})
```

**Server-to-Client Streaming:**

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "Update content")
        Field(2, "action", String, "Action type")
        Field(3, "timestamp", String, "When it happened")
        Required("message", "action", "timestamp")
    })
    HTTP(func() {
        GET("/subscribe")
    })
})
```

**Bidirectional Streaming:**

```go
Method("echo", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message to echo")
        Required("message")
    })
    StreamingResult(func() {
        Field(1, "message", String, "Echoed message")
        Required("message")
    })
    HTTP(func() {
        GET("/echo")
    })
})
```

### WebSocket Implementation

Server-side implementation:

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

Connection management:

```go
type ConnectionManager struct {
    connections map[string]*ManagedConnection
    mu          sync.RWMutex
}

func (cm *ConnectionManager) AddConnection(id string, stream Stream) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.connections[id] = &ManagedConnection{
        ID:       id,
        Stream:   stream,
        LastPing: time.Now(),
    }
}
```

---

## Server-Sent Events

SSE provides one-way server-to-client streaming over HTTP. It's ideal for:
- Real-time notifications
- Live data feeds
- Progress updates
- Event streaming

### SSE Design

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("timestamp", Int, "Unix timestamp")
    Required("message", "timestamp")
})

var _ = Service("sse", func() {
    Method("stream", func() {
        StreamingResult(Event)
        HTTP(func() {
            GET("/events/stream")
            ServerSentEvents()  // Use SSE instead of WebSocket
        })
    })
})
```

Customize SSE events:

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("type", String, "Event type")
    Attribute("id", String, "Event ID")
    Attribute("retry", Int, "Reconnection delay in ms")
    Required("message", "type", "id")
})

Method("stream", func() {
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSEEventData("message")
            SSEEventType("type")
            SSEEventID("id")
            SSEEventRetry("retry")
        })
    })
})
```

Handle Last-Event-Id for resumable streams:

```go
Method("stream", func() {
    Payload(func() {
        Attribute("startID", String, "Last event ID received")
    })
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSERequestID("startID")  // Maps Last-Event-Id header
        })
    })
})
```

### SSE Implementation

```go
func (s *Service) Stream(ctx context.Context, stream sse.StreamServerStream) error {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            event := &sse.Event{
                Message:   "Hello from server!",
                Timestamp: time.Now().Unix(),
            }
            if err := stream.Send(event); err != nil {
                return err
            }
        case <-ctx.Done():
            return nil
        }
    }
}
```

Browser client:

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

---

## CORS Configuration

The CORS plugin handles cross-origin requests. Import it:

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

API-level CORS:

```go
var _ = API("calc", func() {
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})
```

Service-level CORS:

```go
var _ = Service("calc", func() {
    // Allow specific origin
    cors.Origin("localhost")

    // Allow subdomain pattern
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // Allow all origins
    cors.Origin("*")

    // Allow regex pattern
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

---

## Static Content

Serve static files using the `Files` function:

```go
var _ = Service("web", func() {
    // Serve files from a directory
    Files("/static/{*path}", "./public")
    
    // Serve a specific file
    Files("/favicon.ico", "./public/favicon.ico")
})
```

For Single Page Applications, serve the index.html for all routes:

```go
var _ = Service("spa", func() {
    // API endpoints
    Method("api", func() {
        HTTP(func() {
            GET("/api/data")
        })
    })
    
    // Serve SPA - catch-all for client-side routing
    Files("/{*path}", "./dist/index.html")
})
```

---

## Best Practices

### URL Design
- Use nouns for resources: `/articles`, not `/list-articles`
- Use plural nouns consistently
- Let HTTP methods define actions
- Keep URLs hierarchical and predictable

### Error Handling
- Map errors to appropriate HTTP status codes
- Use consistent error response formats
- Include meaningful error messages

### Performance
- Use appropriate buffer sizes for WebSocket
- Implement connection pooling for high-traffic services
- Consider message batching for streaming endpoints

### Security
- Always use HTTPS in production
- Configure CORS appropriately
- Validate all input parameters
- Set appropriate timeouts for long-lived connections
