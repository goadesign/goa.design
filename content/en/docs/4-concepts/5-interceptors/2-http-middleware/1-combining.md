---
title: Combining Middleware and Interceptors
weight: 1
description: >
  Learn powerful patterns for combining HTTP middleware with Goa interceptors to create robust and maintainable services.
---

# Combining Middleware and Interceptors

HTTP middleware and Goa interceptors can work together to create powerful, layered solutions. This guide explores patterns and strategies for combining them effectively.

## Core Concepts

### Data Flow
The typical flow of data through middleware and interceptors:

```
HTTP Request → HTTP Middleware → Goa Transport → Goa Interceptors → Service Method
     └────────────────┴───────────────┴─────────────────────┴────────────────┘
                            Response Flow
```

### Shared Context
The `context.Context` is the primary mechanism for sharing data:

```go
// HTTP middleware adds data
func EnrichContext(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Add HTTP-specific data
        ctx := r.Context()
        ctx = context.WithValue(ctx, "http.start_time", time.Now())
        ctx = context.WithValue(ctx, "http.method", r.Method)
        ctx = context.WithValue(ctx, "http.path", r.URL.Path)
        
        // Continue with enriched context
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Goa interceptor uses the data
var _ = Service("api", func() {
    Interceptor("RequestLogger", func() {
        Description("Logs request details with HTTP context")
        
        Request(func() {
            // Access HTTP context in implementation
            Attribute("method")
            Attribute("path")
            Attribute("duration")
        })
    })
})

// Implementation uses both
func (i *Interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    // Access HTTP data from context
    startTime := ctx.Value("http.start_time").(time.Time)
    method := ctx.Value("http.method").(string)
    path := ctx.Value("http.path").(string)
    
    // Call service
    res, err := next(ctx, info.RawPayload())
    
    // Log with combined data
    duration := time.Since(startTime)
    log.Printf("HTTP %s %s completed in %v", method, path, duration)
    
    return res, err
}
```

## Common Patterns

### 1. Authentication Chain

Combine HTTP authentication with business authorization:

```go
// HTTP middleware handles JWT validation
func JWTAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        
        // Validate JWT
        claims, err := validateJWT(token)
        if err != nil {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        
        // Add claims to context
        ctx := context.WithValue(r.Context(), "jwt.claims", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Goa interceptor handles authorization
var _ = Service("api", func() {
    Interceptor("Authorizer", func() {
        Description("Checks permissions using JWT claims")
        
        Request(func() {
            // Access claims in implementation
            Attribute("claims")
            Attribute("resource")
            Attribute("action")
        })
    })
})

// Implementation combines both
func (i *Interceptors) Authorizer(ctx context.Context, info *AuthorizerInfo, next goa.Endpoint) (any, error) {
    // Get claims from HTTP context
    claims := ctx.Value("jwt.claims").(JWTClaims)
    
    // Check permissions
    if !hasPermission(claims, info.Resource(), info.Action()) {
        return nil, goa.NewErrorf(goa.ErrForbidden, "insufficient permissions")
    }
    
    return next(ctx, info.RawPayload())
}
```

### 2. Observability Stack

Build comprehensive observability by combining HTTP and business metrics:

```go
// HTTP middleware captures request metrics
func HTTPMetrics(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Create recording response writer
        rec := newRecordingResponseWriter(w)
        
        // Process request
        next.ServeHTTP(rec, r)
        
        // Record HTTP metrics
        duration := time.Since(start)
        metrics.RecordHTTPMetrics(
            r.Method,
            r.URL.Path,
            rec.StatusCode(),
            duration,
            rec.BytesWritten(),
        )
    })
}

// Goa interceptor adds business context
var _ = Service("api", func() {
    Interceptor("BusinessMetrics", func() {
        Description("Records business-level metrics")
        
        Request(func() {
            Attribute("operation")
        })
        Response(func() {
            Attribute("status")
            Attribute("result")
        })
    })
})

// Implementation combines metrics
func (i *Interceptors) BusinessMetrics(ctx context.Context, info *BusinessMetricsInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // Call service
    res, err := next(ctx, info.RawPayload())
    
    // Record business metrics
    duration := time.Since(start)
    metrics.RecordBusinessMetrics(
        info.Operation(),
        duration,
        err == nil,
    )
    
    return res, err
}
```

### 3. Caching Strategy

Implement multi-level caching with HTTP and business logic:

```go
// HTTP middleware handles response caching
func HTTPCache(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := generateCacheKey(r)
        
        // Check HTTP cache
        if cached := httpCache.Get(key); cached != nil {
            writeFromCache(w, cached)
            return
        }
        
        // Continue with flag in context
        ctx := context.WithValue(r.Context(), "cache.key", key)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Goa interceptor handles business caching
var _ = Service("api", func() {
    Interceptor("BusinessCache", func() {
        Description("Implements business-level caching")
        
        Request(func() {
            Attribute("cacheKey")
            Attribute("cacheTTL")
        })
    })
})

// Implementation combines caching strategies
func (i *Interceptors) BusinessCache(ctx context.Context, info *BusinessCacheInfo, next goa.Endpoint) (any, error) {
    // Get cache key from HTTP context
    httpKey := ctx.Value("cache.key").(string)
    
    // Check business cache
    if cached := businessCache.Get(httpKey); cached != nil {
        return cached, nil
    }
    
    // Call service
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Cache result
    businessCache.Set(httpKey, res, info.CacheTTL())
    
    return res, nil
}
```

## Best Practices

### 1. Context Management

- Use typed context keys
- Document context dependencies
- Handle missing context values gracefully

```go
// Define typed context keys
type contextKey string

const (
    RequestIDKey   contextKey = "request_id"
    UserClaimsKey  contextKey = "user_claims"
    TraceIDKey     contextKey = "trace_id"
)

// Use typed keys in middleware
func WithRequestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := uuid.New().String()
        ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Safe context access in interceptors
func (i *Interceptors) Logger(ctx context.Context, info *LoggerInfo, next goa.Endpoint) (any, error) {
    requestID, _ := ctx.Value(RequestIDKey).(string)
    if requestID == "" {
        requestID = "unknown"
    }
    
    // Use requestID safely
    return next(ctx, info.RawPayload())
}
```

### 2. Error Handling

- Define clear error boundaries
- Maintain consistent error formats
- Preserve error context

```go
// HTTP middleware error handling
func ErrorBoundary(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                // Log panic
                log.Printf("panic: %v", err)
                
                // Return 500
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}

// Goa error handling
var _ = Service("api", func() {
    Error("not_found", ErrorResult)
    Error("invalid_input", ErrorResult)
    
    Interceptor("ErrorHandler", func() {
        Description("Handles business errors")
        
        Error("not_found")
        Error("invalid_input")
    })
})
```

### 3. Testing

Write tests that verify the integration:

```go
func TestMiddlewareInterceptorIntegration(t *testing.T) {
    // Create test service
    svc := NewService()
    
    // Create middleware chain
    handler := JWTAuth(
        HTTPMetrics(
            // ... other middleware
        ),
    )
    
    // Create interceptor chain
    endpoints := NewEndpoints(svc)
    endpoints.Use(BusinessMetrics)
    
    // Create test server
    server := httptest.NewServer(handler)
    defer server.Close()
    
    // Test cases
    tests := []struct {
        name           string
        token          string
        expectedStatus int
        expectedBody   string
    }{
        // ... test cases
    }
    
    // Run tests
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Make request
            req, _ := http.NewRequest("GET", server.URL, nil)
            req.Header.Set("Authorization", tt.token)
            
            // Verify response
            resp, err := http.DefaultClient.Do(req)
            if err != nil {
                t.Fatal(err)
            }
            
            // Check status
            if resp.StatusCode != tt.expectedStatus {
                t.Errorf("got status %d, want %d", resp.StatusCode, tt.expectedStatus)
            }
            
            // Check metrics
            // ... verify both HTTP and business metrics were recorded
        })
    }
}
```

## Next Steps

- Review [Custom Middleware](./custom) implementation details
- Explore real-world examples in [Observability](@/docs/5-real-world/2-observability)
- Learn about Goa's [Error Handling](@/docs/4-concepts/4-error-handling)

The effective combination of HTTP middleware and Goa interceptors allows you to build robust, maintainable services that handle both HTTP-specific concerns and business logic in a clean, organized way. 