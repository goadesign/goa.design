---
title: "Server-Sent Events"
linkTitle: "SSE"
weight: 8
description: >
  Learn how to implement Server-Sent Events (SSE) endpoints in your Goa services.
---

Server-Sent Events (SSE) is a HTTP-based server-to-client streaming protocol
that enables real-time updates from the server to the client. Goa provides
native support for implementing SSE endpoints, making it easy to add real-time
streaming capabilities to your services.

## Overview

SSE is particularly useful for scenarios where you need to push updates from the
server to the client. Think of it like a one-way radio broadcast - the server
sends messages, and clients receive them. This makes it perfect for:

- Real-time notifications that keep users informed
- Live data feeds that update automatically
- Progress updates for long-running operations
- Event streaming for monitoring and logging

The protocol is built on standard HTTP, which means it's simple to implement and
works well with modern web browsers and HTTP clients. When a connection is lost,
clients automatically attempt to reconnect, making it reliable for real-time
applications.

### When to Use SSE in Goa

Goa provides three main streaming options:

1. **Server-Sent Events (SSE)**: One-way server-to-client streaming over HTTP
2. **WebSocket**: Bi-directional streaming with full-duplex communication
3. **gRPC**: High-performance RPC with streaming support

Choose SSE when:
- You only need server-to-client communication
- You want to leverage HTTP's simplicity and compatibility
- You need automatic reconnection handling
- You're building a web application that needs real-time updates

## Implementation

### Design

Let's create a complete SSE service. First, create a new file in your `design`
package (e.g., `design/sse.go`):

```go
package design

import . "goa.design/goa/v3/dsl"

// Event represents a message sent via SSE
var Event = Type("Event", func() {
    Description("A notification message sent via SSE")
    Attribute("message", String, "Message body")
    Attribute("timestamp", Int, "Unix timestamp")
    Required("message", "timestamp")
})

// SSEService defines the SSE service
var _ = Service("sse", func() {
    Description("Service that demonstrates Server-Sent Events")

    Method("stream", func() {
        Description("Stream events using Server-Sent Events")
        StreamingResult(Event) // SSE methods must use StreamingResult
        HTTP(func() {
            GET("/events/stream")
            ServerSentEvents() // Use SSE instead of WebSocket
        })
    })
})
```

### Code Generation

After defining the design, generate the service code:

```bash
goa gen github.com/yourusername/yourproject/design
```

This will create:
- Service interface and implementation stubs
- HTTP server and client code
- OpenAPI specification
- Example client code

### Server Implementation

Create a new file for your service implementation (e.g., `sse.go`):

```go
package sse

import (
    "context"
    "time"

    "github.com/yourusername/yourproject/gen/sse"
)

type Service struct {
    // Add any dependencies here
}

// NewService creates a new SSE service
func NewService() *Service {
    return &Service{}
}

// Stream implements the SSE endpoint
func (s *Service) Stream(ctx context.Context, stream sse.StreamServerStream) error {
    // Send a message every second
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            // Create and send an event
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

### Customizing SSE Events

The SSE protocol gives us several ways to customize how events are sent. Think of
these as different channels on our radio broadcast - we can send different types
of messages, keep track of message order, and control how clients reconnect.

Here's how we can customize our events:

```go
ServerSentEvents(func() {
    SSEEventData("message") // The actual message content
    SSEEventType("type")    // What kind of message it is
    SSEEventID("id")        // A unique identifier for the message
    SSEEventRetry("retry")  // How long to wait before reconnecting
})
```

Let's break down what each field does:

- **Data Field** (`SSEEventData`): This is the main content of your message. It
  can be any type of data that can be converted to JSON. If you don't specify
  this, the entire event object will be sent as the data.

- **Event Type** (`SSEEventType`): This lets you categorize your messages. For
  example, you might have "notification" messages and "alert" messages. Clients
  can listen for specific types of messages.

- **Event ID** (`SSEEventID`): This is like a message number. It helps clients
  keep track of which messages they've received, which is especially useful if the
  connection is lost and needs to be restored.

- **Retry Interval** (`SSEEventRetry`): This tells clients how long to wait
  before trying to reconnect if the connection is lost.

Here's a complete example that uses all these features:

```go
var Event = Type("Event", func() {
    Description("A notification message sent via SSE")
    Attribute("message", String, "Message body")
    Attribute("type", String, "Event type (e.g., 'notification', 'alert')")
    Attribute("id", String, "Unique event identifier")
    Attribute("retry", Int, "Reconnection delay in milliseconds")
    Required("message", "type", "id")
})

Method("stream", func() {
    Description("Stream events using Server-Sent Events")
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSEEventData("message")
            SSEEventType("type")
            SSEEventID("id")
            SSEEventRetry("retry") // Only sent if the retry field it not nil
        })
    })
})
```

When this endpoint sends events, they'll look like this:
```
event: notification
id: 123
data: {"message": "Hello"}

event: alert
id: 124
data: {"message": "Warning"}
```

### Handling Last-Event-Id

One of the most powerful features of SSE is the ability to resume streaming from
where you left off if the connection is lost. This is handled through the
`Last-Event-Id` header. Think of it like a bookmark - when a client reconnects,
it can tell the server "I last received message number X, please send me
everything after that."

#### Why Use Last-Event-Id?

The `Last-Event-Id` feature is crucial for building reliable real-time
applications. It ensures that clients don't miss any messages when their
connection drops, and it helps maintain the correct order of messages. This is
especially important for applications where missing or out-of-order messages
could cause problems.

#### Implementation

Let's implement `Last-Event-Id` support in our service:

1. First, we modify our design to accept the last event ID:

```go
Method("stream", func() {
    Description("Stream events using Server-Sent Events")
    Payload(func() {
        Attribute("startID", String, "ID of the last event received", func() {
            Description("Used to resume streaming from a specific event")
            Example("123")
        })
    })
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSERequestID("startID") // Maps the Last-Event-Id header to startID
        })
    })
})
```

2. Then, we implement the server logic to handle resuming from a specific event:

```go
func (s *svc) Stream(ctx context.Context, p *svc.StreamPayload, stream svc.StreamServerStream) error {
    // Get the last event ID from the payload
    lastID := p.StartID

    // If we have a last ID, skip events until we find it
    if lastID != "" {
        // Skip events until we find the last received event
        for ev := range s.events {
            if ev.ID == lastID {
                break
            }
        }
    }

    // Start streaming new events
    for ev := range s.events {
        if err := stream.Send(ev); err != nil {
            return err
        }
    }
    return nil
}
```

3. Finally, we implement a client that can handle reconnection:

```javascript
class EventSourceWithRetry extends EventSource {
    constructor(url) {
        super(url);
        this.lastEventId = null;
        
        // Store the last event ID
        this.addEventListener('message', (event) => {
            if (event.lastEventId) {
                this.lastEventId = event.lastEventId;
            }
        });
    }

    // Override the default reconnection behavior
    reconnect() {
        if (this.lastEventId) {
            // Create new EventSource with Last-Event-Id header
            const headers = new Headers();
            headers.append('Last-Event-Id', this.lastEventId);
            return new EventSourceWithRetry(this.url, { headers });
        }
        return new EventSourceWithRetry(this.url);
    }
}

// Usage
const eventSource = new EventSourceWithRetry('/events/stream');
```

#### Best Practices

When implementing `Last-Event-Id`, keep these points in mind:

1. **Event ID Format**: Choose a format that makes sense for your application.
   Sequential numbers are good for maintaining order, while UUIDs are better for
   uniqueness. Make sure your IDs contain enough information to uniquely identify
   events.

2. **Storage Considerations**: Decide how long you want to keep track of old
   events. You might want to store the last event ID in the browser's localStorage
   to survive page refreshes, or you might want to implement a cleanup mechanism
   for old event IDs.

3. **Error Handling**: Plan for cases where the last event ID is no longer
   available. Maybe the server has cleaned up old events, or maybe the ID is
   invalid. Have a fallback mechanism for these situations.

4. **Performance**: Be mindful of how you store and look up events. You might
   want to use a sliding window approach, where you only keep the most recent
   events in memory.

## Client Usage

### Browser Client

Connecting to an SSE endpoint is straightforward. Here's a basic example using the
browser's `EventSource` API:

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received event:', data);
};

eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

### Go Client

Goa generates client code that you can use in your Go applications:

```go
package main

import (
    "context"
    "log"

    "github.com/yourusername/yourproject/gen/sse"
    "github.com/yourusername/yourproject/gen/sse/client"
)

func main() {
    // Create a new client
    c := client.NewClient("http://localhost:8080")

    // Create a context
    ctx := context.Background()

    // Start streaming
    stream, err := c.Stream(ctx)
    if err != nil {
        log.Fatal(err)
    }

    // Receive events
    for {
        event, err := stream.Recv()
        if err != nil {
            log.Fatal(err)
        }
        log.Printf("Received: %+v", event)
    }
}
```

## Testing

### Server Tests

Here's how to test your SSE endpoint:

```go
func TestStream(t *testing.T) {
    // Create a new service
    svc := NewService()

    // Create a test context
    ctx := context.Background()

    // Create a test stream
    stream := &TestStream{
        events: make(chan *sse.Event),
        errors: make(chan error),
    }

    // Start streaming in a goroutine
    go func() {
        err := svc.Stream(ctx, stream)
        if err != nil {
            stream.errors <- err
        }
    }()

    // Receive events
    for i := 0; i < 5; i++ {
        select {
        case event := <-stream.events:
            if event.Message == "" {
                t.Error("Expected message, got empty string")
            }
        case err := <-stream.errors:
            t.Fatal(err)
        case <-time.After(time.Second):
            t.Fatal("Timeout waiting for event")
        }
    }
}

type TestStream struct {
    events chan *sse.Event
    errors chan error
}

func (s *TestStream) Send(event *sse.Event) error {
    s.events <- event
    return nil
}

func (s *TestStream) Close() error {
    close(s.events)
    close(s.errors)
    return nil
}
```

### Client Tests

For client-side testing, you can use a mock server:

```go
func TestClient(t *testing.T) {
    // Create a test server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Set SSE headers
        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Connection", "keep-alive")

        // Send test events
        for i := 0; i < 5; i++ {
            fmt.Fprintf(w, "data: {\"message\":\"test %d\"}\n\n", i)
            w.(http.Flusher).Flush()
            time.Sleep(100 * time.Millisecond)
        }
    }))
    defer server.Close()

    // Create a client
    c := client.NewClient(server.URL)

    // Start streaming
    stream, err := c.Stream(context.Background())
    if err != nil {
        t.Fatal(err)
    }

    // Receive events
    for i := 0; i < 5; i++ {
        event, err := stream.Recv()
        if err != nil {
            t.Fatal(err)
        }
        if event.Message != fmt.Sprintf("test %d", i) {
            t.Errorf("Expected message 'test %d', got '%s'", i, event.Message)
        }
    }
}
```

## Limitations

While SSE is powerful, it does have some limitations to be aware of:

- It's a one-way street - servers can send to clients, but clients can't send back
- It's limited to text-based data (though you can send JSON)
- Browsers limit the number of concurrent SSE connections
- While browsers handle reconnection automatically, custom clients need to implement their own reconnection logic

## See Also

- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Example Implementation](https://github.com/goadesign/examples/tree/master/sse)
- [Goa Design Documentation](/docs/4-concepts/design)
- [Goa Streaming Tutorial](/docs/3-tutorials/4-streaming) 