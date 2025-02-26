---
linkTitle: Http Middleware
title: Http Middleware
weight: 2
description: >
  Learn how to use HTTP middleware with Goa services to handle protocol-level concerns like logging, metrics, tracing, and request context.
---

HTTP middleware in Goa services handles protocol-level concerns like logging, metrics, tracing, and request context management. This guide shows you how to effectively use middleware in your Goa services.

## Core Concepts

HTTP middleware wraps HTTP handlers to form a processing chain. Each middleware can perform actions before and after the request is handled:

```go
func ExampleMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Pre-processing
        // e.g., logging, metrics, tracing

        next.ServeHTTP(w, r)

        // Post-processing
        // e.g., response logging, cleanup
    })
}
```

## Common Middleware Stack

A typical Goa service uses the following middleware stack:

```go
// Create base HTTP handler
handler := mux

// Add standard middleware chain
handler = debug.HTTP()(handler)                    // Debug logging control
handler = otelhttp.NewHandler(handler, "service")  // OpenTelemetry instrumentation
handler = log.HTTP(ctx)(handler)                   // Request logging
handler = goahttpmiddleware.RequestID()(handler)   // Request ID generation
handler = goahttpmiddleware.PopulateRequestContext()(handler)  // Goa context population
```

## Essential Middleware Types

### 1. Observability Middleware

Handles logging, metrics, and tracing:

```go
// Logging middleware with path filtering
handler = log.HTTP(ctx, 
    log.WithPathFilter(regexp.MustCompile(`^/(healthz|metrics)$`)))(handler)

// OpenTelemetry tracing middleware
handler = otelhttp.NewHandler(handler, "service-name",
    otelhttp.WithMessageEvents(otelhttp.ReadEvents, otelhttp.WriteEvents))
```

### 2. Context Management

Enriches the request context with useful information:

```go
func ContextEnrichmentMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Add request-scoped values
        ctx := r.Context()
        ctx = context.WithValue(ctx, "request.start", time.Now())
        ctx = context.WithValue(ctx, "request.id", r.Header.Get("X-Request-ID"))
        
        // Continue with enriched context
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 3. Security Middleware

Handles authentication and request validation:

```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Set security headers
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        
        next.ServeHTTP(w, r)
    })
}
```

## Best Practices

### 1. Middleware Order

Order your middleware carefully - typically from outermost to innermost:

1. Panic recovery
2. Request ID generation
3. Logging/Tracing
4. Security headers
5. Authentication
6. Context population
7. Business logic

### 2. Performance Optimization

Optimize middleware for performance:

```go
func OptimizedMiddleware(next http.Handler) http.Handler {
    // Pre-compile expensive objects
    pathRegex := regexp.MustCompile(`^/api/v\d+/`)
    
    // Use sync.Pool for frequently allocated objects
    bufPool := sync.Pool{
        New: func() interface{} {
            return new(bytes.Buffer)
        },
    }
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip middleware for non-matching paths
        if !pathRegex.MatchString(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }
        
        // Use pooled resources
        buf := bufPool.Get().(*bytes.Buffer)
        buf.Reset()
        defer bufPool.Put(buf)
        
        next.ServeHTTP(w, r)
    })
}
```

### 3. Error Handling

Handle errors consistently:

```go
func ErrorHandlingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                // Log error with request context
                log.Printf("panic recovered: %v", err)
                
                // Return 500 response
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

## Integration with Goa Services

When integrating middleware with a Goa service:

```go
func main() {
    // 1. Create base muxer
    mux := goahttp.NewMuxer()
    
    // 2. Create and mount Goa server
    server := genhttp.New(endpoints, mux, decoder, encoder, eh, eh)
    genhttp.Mount(mux, server)
    
    // 3. Add middleware stack
    handler := mux
    handler = debug.HTTP()(handler)                // Debug logging
    handler = otelhttp.NewHandler(handler, "svc")  // Tracing
    handler = log.HTTP(ctx)(handler)               // Request logging
    handler = goahttpmiddleware.RequestID()(handler) // Request ID
    
    // 4. Create HTTP server with timeouts
    httpServer := &http.Server{
        Addr:              ":8080",
        Handler:           handler,
        ReadHeaderTimeout: 10 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       120 * time.Second,
    }
}
```

## Testing

Test middleware in isolation and as part of the chain:

```go
func TestMiddleware(t *testing.T) {
    // Create test handler
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })
    
    // Add middleware
    handler = YourMiddleware(handler)
    
    // Create test request
    req := httptest.NewRequest("GET", "/test", nil)
    rec := httptest.NewRecorder()
    
    // Test
    handler.ServeHTTP(rec, req)
    
    // Assert results
    if rec.Code != http.StatusOK {
        t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
    }
}
```

## Next Steps

- Learn about [HTTP Transport](@/docs/4-concepts/3-http) in Goa
- Explore [Observability](@/docs/5-real-world/2-observability) patterns
- Review [Security](@/docs/5-real-world/3-security) best practices

HTTP middleware is a powerful tool for handling protocol-specific concerns in your
Goa services. By following these patterns and best practices, you can create
clean, maintainable, and efficient HTTP processing pipelines.

