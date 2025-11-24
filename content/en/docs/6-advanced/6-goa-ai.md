---
title: "Building AI Agent Backends with Goa-AI"
linkTitle: "AI Agent Backends"
weight: 6
description: >
  Learn how to build AI agent backends using Goa-AI, a design-first toolkit that bridges Goa with the Model Context Protocol (MCP) for streamlined development.
---

As AI agents become increasingly sophisticated, the backends that power them need to keep up. Building these backends traditionally involves juggling tool definitions, JSON schemas, and implementation code—all while keeping everything in sync. Goa-AI eliminates this complexity by bringing Goa's design-first approach to AI agent development.

## Understanding Goa-AI

[Goa-AI](https://github.com/goadesign/goa-ai) is a design-first toolkit for building AI agent backends in Go. It bridges the power of Goa's microservices framework with the Model Context Protocol (MCP), creating a seamless development experience for AI-powered applications.

By defining your AI tools once in Goa's DSL, Goa-AI automatically generates:
- Complete backend servers with type-safe handlers
- JSON schemas compatible with AI models
- JSON-RPC transport over HTTP
- Automatic error mapping and handling
- Server-Sent Events (SSE) support for real-time updates

To get started with Goa-AI, you'll need:
- Go 1.24 or later
- Goa v3.22.2 or later

```bash
# Install Goa-AI
go get goa.design/goa-ai@latest
```

### Why Goa-AI?

Traditional AI agent backend development suffers from several pain points:

1. **Schema Drift**: Tool definitions, JSON schemas, and implementations can easily fall out of sync
2. **Boilerplate Code**: Writing JSON-RPC handlers, error mapping, and validation code is tedious
3. **Type Safety**: Without strong typing, runtime errors are common
4. **Real-time Updates**: Implementing streaming progress updates requires significant plumbing

Goa-AI solves these problems by:
- Defining everything in one place using Goa's expressive DSL
- Generating all boilerplate code automatically
- Leveraging Go's type system for compile-time safety
- Providing first-class support for streaming and real-time updates

## The Model Context Protocol (MCP)

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard that enables seamless communication between AI language models and backend services. It provides a structured way for AI agents to:

- Discover available tools and their capabilities
- Invoke backend functions with proper type validation
- Receive structured responses and error information
- Stream real-time progress updates to users

Goa-AI implements MCP using JSON-RPC 2.0 over HTTP, making your AI tools accessible from any MCP-compatible client.

## Creating Your First AI Tool

Let's create a simple weather service that AI agents can use to get weather information. This example demonstrates the key concepts of Goa-AI:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("weather", func() {
    Description("Weather information service for AI agents")

    // Define a method that AI agents can call
    Method("get_weather", func() {
        Description("Get current weather for a location")

        Payload(func() {
            Field(1, "location", String, "City name or coordinates", func() {
                Example("San Francisco")
            })
            Field(2, "units", String, "Temperature units (celsius or fahrenheit)", func() {
                Default("celsius")
            })
            Required("location")
        })

        Result(func() {
            Field(1, "temperature", Float64, "Current temperature")
            Field(2, "conditions", String, "Weather conditions")
            Field(3, "humidity", Int, "Humidity percentage")
            Required("temperature", "conditions", "humidity")
        })

        Error("not_found", func() {
            Description("Location not found")
        })

        HTTP(func() {
            POST("/weather")
            Response(StatusOK)
            Response("not_found", StatusNotFound)
        })
    })
})
```

From this single design, Goa-AI generates:
- A type-safe service interface
- JSON schemas for the AI model
- HTTP handlers with automatic request/response encoding
- Error mapping between Go errors and HTTP status codes
- Client code for testing

## Implementing the Service

Here's all the code you need to write to implement the weather service:

```go
package weather

import (
    "context"
    weather "myapp/gen/weather"
)

type Service struct {
    // Your dependencies (API clients, databases, etc.)
}

func (s *Service) GetWeather(ctx context.Context, p *weather.GetWeatherPayload) (*weather.GetWeatherResult, error) {
    // Your business logic here
    temp, conditions, humidity, err := s.fetchWeather(p.Location, p.Units)
    if err != nil {
        return nil, weather.MakeNotFound(err)
    }

    return &weather.GetWeatherResult{
        Temperature: temp,
        Conditions:  conditions,
        Humidity:    humidity,
    }, nil
}
```

Notice how clean this is—no JSON parsing, no schema validation, no HTTP handling. Goa-AI handles all of that for you.

## Streaming Real-Time Updates

One of Goa-AI's most powerful features is first-class support for Server-Sent Events (SSE), allowing your AI agents to push real-time progress updates to users. This is especially useful for long-running operations.

Here's how to define a streaming method:

```go
Method("analyze_document", func() {
    Description("Analyze a document and stream progress updates")

    Payload(func() {
        Field(1, "document_url", String, "URL of the document to analyze")
        Required("document_url")
    })

    StreamingResult(func() {
        Field(1, "progress", Int, "Progress percentage (0-100)")
        Field(2, "status", String, "Current status message")
        Field(3, "result", String, "Final analysis result")
    })

    HTTP(func() {
        POST("/analyze")
        Response(StatusOK)
    })
})
```

And the implementation:

```go
func (s *Service) AnalyzeDocument(ctx context.Context, p *weather.AnalyzeDocumentPayload, stream weather.AnalyzeDocumentServerStream) error {
    // Send progress updates as work proceeds
    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 10,
        Status:   "Downloading document...",
    })

    doc, err := s.downloadDocument(p.DocumentURL)
    if err != nil {
        return err
    }

    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 50,
        Status:   "Analyzing content...",
    })

    result := s.analyzeContent(doc)

    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 100,
        Status:   "Complete",
        Result:   result,
    })

    return stream.Close()
}
```

The AI agent and end users receive these updates in real-time, providing a much better user experience for long-running operations.

## Type Safety and Error Handling

Goa-AI leverages Go's type system to ensure your AI tools are robust and reliable. The generated code provides:

**Compile-Time Type Safety**
```go
// Generated interface - your contract with the AI
type Service interface {
    GetWeather(context.Context, *GetWeatherPayload) (*GetWeatherResult, error)
}

// If your implementation doesn't match, it won't compile
func (s *service) GetWeather(ctx context.Context, p *GetWeatherPayload) (*GetWeatherResult, error) {
    // Implementation
}
```

**Automatic Error Mapping**
```go
// Define custom errors in your design
Error("rate_limited", func() {
    Description("Too many requests")
})

// Use them in your implementation
if s.isRateLimited(ctx) {
    return nil, weather.MakeRateLimited(errors.New("rate limit exceeded"))
}

// Goa-AI automatically maps to appropriate HTTP status codes
```

**Request Validation**
All request validation is automatic. If the AI model sends invalid data, Goa-AI returns a proper error response before your code even runs.

## Integration with AI Models

Goa-AI generates JSON schemas that are compatible with major AI platforms:

**OpenAI Function Calling**
```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name or coordinates"
      },
      "units": {
        "type": "string",
        "description": "Temperature units (celsius or fahrenheit)",
        "default": "celsius"
      }
    },
    "required": ["location"]
  }
}
```

**Anthropic Claude Tools**
The same schema works with Claude's tool use feature, allowing your backend to serve multiple AI platforms.

## Project Structure

A typical Goa-AI project follows a clear organization:

```
├── design/              # Your AI tool designs
│   └── weather.go      # Service definitions
├── gen/                # Generated code (never edit)
│   └── weather/        # Service interfaces and types
│       ├── service.go  # Service interface
│       ├── endpoints.go # Transport-agnostic endpoints
│       └── http/       # HTTP transport
├── weather.go          # Your implementation
└── cmd/
    └── server/
        └── main.go     # Server setup
```

## Best Practices

When building AI agent backends with Goa-AI:

1. **Design First**: Always start with the design. Think about what tools the AI needs and how they should work together.

2. **Rich Descriptions**: Use detailed descriptions in your design. These become part of the AI's understanding of your tools:
   ```go
   Field(1, "location", String, "City name (e.g., 'San Francisco') or coordinates (e.g., '37.7749,-122.4194')")
   ```

3. **Provide Examples**: Examples help AI models understand expected formats:
   ```go
   Field(1, "date", String, "Date in ISO 8601 format", func() {
       Example("2025-01-15T10:30:00Z")
   })
   ```

4. **Use Streaming for Long Operations**: If an operation takes more than a few seconds, use streaming to provide progress updates.

5. **Define Appropriate Errors**: Create specific error types for different failure modes:
   ```go
   Error("invalid_location")
   Error("rate_limited")
   Error("service_unavailable")
   ```

6. **Version Your APIs**: As your AI tools evolve, use versioning to maintain compatibility:
   ```go
   var _ = Service("weather_v2", func() {
       // New version with additional features
   })
   ```

## Example: Multi-Tool AI Assistant

Here's a more complete example showing multiple tools working together:

```go
package design

import . "goa.design/goa/v3/dsl"

// Document search tool
var _ = Service("search", func() {
    Description("Search through documents")

    Method("search_documents", func() {
        Payload(func() {
            Field(1, "query", String, "Search query")
            Field(2, "max_results", Int, "Maximum results to return", func() {
                Default(10)
            })
            Required("query")
        })

        Result(ArrayOf(func() {
            Field(1, "title", String)
            Field(2, "content", String)
            Field(3, "relevance", Float64)
        }))

        HTTP(func() {
            POST("/search")
        })
    })
})

// Email composition tool
var _ = Service("email", func() {
    Description("Email management")

    Method("send_email", func() {
        Payload(func() {
            Field(1, "to", String, "Recipient email address")
            Field(2, "subject", String, "Email subject")
            Field(3, "body", String, "Email body")
            Required("to", "subject", "body")
        })

        Result(func() {
            Field(1, "message_id", String)
            Field(2, "sent_at", String)
        })

        Error("invalid_address")

        HTTP(func() {
            POST("/email/send")
        })
    })
})

// Calendar scheduling tool
var _ = Service("calendar", func() {
    Description("Calendar and scheduling")

    Method("create_event", func() {
        Payload(func() {
            Field(1, "title", String, "Event title")
            Field(2, "start_time", String, "ISO 8601 timestamp")
            Field(3, "duration_minutes", Int, "Event duration")
            Field(4, "attendees", ArrayOf(String), "Attendee emails")
            Required("title", "start_time", "duration_minutes")
        })

        Result(func() {
            Field(1, "event_id", String)
            Field(2, "calendar_url", String)
        })

        Error("time_conflict")

        HTTP(func() {
            POST("/calendar/events")
        })
    })
})
```

With these three services, an AI agent can search documents, send emails, and schedule meetings—all through a type-safe, well-documented interface.

## Learn More

- [Goa-AI GitHub Repository](https://github.com/goadesign/goa-ai)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Goa Documentation](https://goa.design/docs)
- [JSON-RPC Tutorial](../../3-tutorials/3-jsonrpc-service)

## Next Steps

Now that you understand Goa-AI, you can:
- Explore the [examples](https://github.com/goadesign/goa-ai/tree/main/examples) in the repository
- Learn about [JSON-RPC](../../3-tutorials/3-jsonrpc-service) which powers Goa-AI
- Join the discussion in [Goa Slack](https://gophers.slack.com/messages/goa) (#goa channel)
- Read about [Model Context Protocol](https://modelcontextprotocol.io) to understand the standard
