---
title: Custom HTTP Middleware
weight: 2
description: >
  Learn how to create HTTP middleware that works effectively with Goa services, with practical examples and integration patterns.
---

Goa services use standard Go HTTP handlers, which means you can use any HTTP
middleware that follows Go's standard middleware pattern. This guide shows you
how to create effective HTTP middleware that works well with Goa services, with
examples drawn from real-world usage.

HTTP middleware should focus on HTTP protocol concerns like headers, cookies, and
request/response manipulation. For business logic and type-safe access to your
service's payloads and results, use Goa interceptors instead. Interceptors
provide direct access to your service's domain types and are better suited for
business-level concerns.

## Common Patterns

Here are some common middleware patterns that are particularly useful when
building Goa services. These patterns use standard Go HTTP middleware techniques
and can be combined with Goa's generated HTTP handlers.

### 1. Response Writer Wrapper

The standard `http.ResponseWriter` interface doesn't provide access to response
metadata after writing. This pattern shows how to capture that information:

```go
type responseWriter struct {
    http.ResponseWriter
    status int
    size   int64
}

func (rw *responseWriter) WriteHeader(status int) {
    rw.status = status
    rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    size, err := rw.ResponseWriter.Write(b)
    rw.size += int64(size)
    return size, err
}

func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Create wrapper
        rw := &responseWriter{
            ResponseWriter: w,
            status:        http.StatusOK,
        }
        
        start := time.Now()
        next.ServeHTTP(rw, r)
        duration := time.Since(start)
        
        // Record metrics
        metrics.RecordHTTPMetrics(r.Method, r.URL.Path, rw.status, rw.size, duration)
    })
}
```

This pattern plays an essential role in several key areas of HTTP request
handling. It enables accurate collection of HTTP-level metrics by capturing
response status codes and sizes. The pattern also facilitates comprehensive
logging of response data, giving you visibility into what your service returns
to clients. Additionally, it provides a foundation for implementing response
transformations, allowing you to modify or enrich responses before they reach
the client.

Note that if you need to access or modify the actual payload data (not just HTTP
metadata), consider using a Goa interceptor instead. Interceptors provide
type-safe access to your service's domain types without having to parse the raw
HTTP body.

### 2. Path-Based Filtering

When working with Goa services, you often need to handle different endpoints
differently. This pattern shows how to apply middleware selectively:

```go
func PathFilterMiddleware(next http.Handler) http.Handler {
    // Pre-compile regex for efficiency
    noLogRegexp := regexp.MustCompile(`^/(healthz|livez|metrics)$`)
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip processing for health check and metrics endpoints
        if noLogRegexp.MatchString(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }
        
        // Process other requests
        // ... your middleware logic here ...
        next.ServeHTTP(w, r)
    })
}
```

Path-based filtering is particularly useful when you need to handle different
endpoints in distinct ways. For example, you can exclude health check endpoints
from your logging pipeline to reduce noise, apply specialized processing for API
routes versus static file routes, and optimize middleware performance by
skipping unnecessary processing on certain paths. This selective application of
middleware helps keep your service efficient and well-organized.

### 3. Rate Limiting

When protecting your API from excessive usage, rate limiting is a common HTTP-level concern that belongs in middleware:

```go
type RateLimiter struct {
    requests map[string]*tokenBucket
    mu       sync.RWMutex
    rate     float64
    capacity int64
}

func NewRateLimiter(rate float64, capacity int64) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string]*tokenBucket),
        rate:     rate,
        capacity: capacity,
    }
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Get client identifier (e.g., IP address)
            clientID := r.RemoteAddr
            
            // Check rate limit
            if !limiter.Allow(clientID) {
                w.Header().Set("Retry-After", "60")
                http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
                return
            }
            
            // Add rate limit headers
            limit := strconv.FormatInt(limiter.capacity, 10)
            w.Header().Set("X-RateLimit-Limit", limit)
            w.Header().Set("X-RateLimit-Remaining", 
                strconv.FormatInt(limiter.Remaining(clientID), 10))
            
            next.ServeHTTP(w, r)
        })
    }
}
```

This middleware demonstrates handling a pure HTTP protocol concern:
- Managing request rates through token bucket algorithm
- Setting appropriate rate limit headers
- Returning standard HTTP 429 status when limits are exceeded
- Operating purely at the HTTP protocol level without business logic

Unlike CORS (which is handled by Goa's plugin system), rate limiting is a 
protocol-specific concern that fits well in custom HTTP middleware.

## Integration Examples

These examples show how to integrate HTTP middleware with Goa's generated handlers
to add common functionality. Remember that these middleware focus on HTTP-level
concerns - for business logic, use Goa interceptors instead.

### 1. Organization Context

For multi-tenant services, you often need to validate and inject organization
information. This middleware handles the HTTP aspects of organization validation:

```go
func OrganizationMiddleware(orgService OrganizationService) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract org name from path or header
            orgName := extractOrgName(r)
            
            // Convert org name to ID
            orgID, err := orgService.GetOrgID(r.Context(), orgName)
            if err != nil {
                http.Error(w, "Invalid organization", http.StatusBadRequest)
                return
            }
            
            // Add org ID to context
            ctx := context.WithValue(r.Context(), "org.id", orgID)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

Note: If you need to perform business logic validation or access typed payloads
based on the organization, implement that in a Goa interceptor where you have
direct access to your service's domain types.

### 2. Request Timeout

Implement request-level timeouts to maintain service stability:

```go
func TimeoutMiddleware(timeout time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), timeout)
            defer cancel()
            
            done := make(chan struct{})
            go func() {
                next.ServeHTTP(w, r.WithContext(ctx))
                close(done)
            }()
            
            select {
            case <-done:
                return
            case <-ctx.Done():
                w.WriteHeader(http.StatusGatewayTimeout)
                return
            }
        })
    }
}
```

### 3. Authorization Cookie

Handle WebSocket authentication by converting header-based auth to cookie-based auth:

```go
func AuthorizationCookieMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if websocket.IsWebSocketUpgrade(r) {
            // Extract token from Authorization header
            token := r.Header.Get("Authorization")
            if token != "" {
                // Set ephemeral cookie for WebSocket auth
                http.SetCookie(w, &http.Cookie{
                    Name:     "Authorization",
                    Value:    token,
                    Path:     "/",
                    HttpOnly: true,
                    Secure:   true,
                    SameSite: http.SameSiteStrictMode,
                })
            }
        }
        
        next.ServeHTTP(w, r)
    })
}
```

## Complete Example

Here's how to combine these middleware patterns with a Goa HTTP server:

```go
func main() {
    // Create Goa HTTP handler
    mux := goahttp.NewMuxer()
    server := genhttp.New(endpoints, mux, decoder, encoder, eh, eh)
    genhttp.Mount(mux, server)
    
    // Build middleware chain from outermost to innermost
    mux.Use(AuthorizationCookieMiddleware)
    mux.Use(OrganizationMiddleware(orgService))
    mux.Use(TimeoutMiddleware(30 * time.Second))
    mux.Use(PathFilterMiddleware)
    mux.Use(MetricsMiddleware)
    
    // Create server with timeouts
    httpServer := &http.Server{
        Addr:              ":8080",
        Handler:           mux,
        ReadHeaderTimeout: 10 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       120 * time.Second,
    }
}
```

## Testing Custom Middleware

Test your middleware using Clue's [mock package](https://github.com/goadesign/clue/tree/main/mock):

```go
// Import Clue's mock package
import (
    "github.com/goadesign/clue/mock"
)

func TestOrganizationMiddleware(t *testing.T) {
    // Create mock org service using Clue's mock package
    mockOrgService := &mockOrgService{mock.New()}
    
    tests := []struct {
        name     string
        orgName  string
        setup    func(*mockOrgService)
        wantErr  bool
        wantCode int
    }{
        {
            name:    "valid organization",
            orgName: "test-org",
            setup: func(m *mockOrgService) {
                m.Set("GetOrgID", func(ctx context.Context, name string) (string, error) {
                    if name == "test-org" {
                        return "org-123", nil
                    }
                    return "", fmt.Errorf("unknown org")
                })
            },
            wantErr:  false,
            wantCode: http.StatusOK,
        },
        {
            name:    "invalid organization",
            orgName: "invalid-org",
            setup: func(m *mockOrgService) {
                m.Set("GetOrgID", func(ctx context.Context, name string) (string, error) {
                    return "", fmt.Errorf("unknown org")
                })
            },
            wantErr:  true,
            wantCode: http.StatusBadRequest,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create fresh mock for each test
            mock := &mockOrgService{mock.New()}
            if tt.setup != nil {
                tt.setup(mock)
            }
            
            // Create middleware
            mw := OrganizationMiddleware(mock)
            
            // Create test request
            req := httptest.NewRequest("GET", "/", nil)
            req.Header.Set("X-Organization", tt.orgName)
            
            // Create response recorder
            rec := httptest.NewRecorder()
            
            // Create test handler
            handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                // Verify org ID in context
                orgID := r.Context().Value("org.id")
                if orgID != "org-123" && !tt.wantErr {
                    t.Errorf("expected org ID org-123, got %v", orgID)
                }
                w.WriteHeader(http.StatusOK)
            })
            
            // Execute middleware
            mw(handler).ServeHTTP(rec, req)
            
            // Check response
            if rec.Code != tt.wantCode {
                t.Errorf("expected status code %d, got %d", tt.wantCode, rec.Code)
            }
            
            // Verify all expected calls were made
            if mock.HasMore() {
                t.Error("not all expected operations were performed")
            }
        })
    }
}

// Mock implementation using Clue's mock package
// This shows how to properly structure a mock using Clue
type mockOrgService struct {
    *mock.Mock // Embed Clue's Mock type
}

// GetOrgID implements the mock using Clue's Next pattern
func (m *mockOrgService) GetOrgID(ctx context.Context, name string) (string, error) {
    if f := m.Next("GetOrgID"); f != nil {
        return f.(func(context.Context, string) (string, error))(ctx, name)
    }
    return "", errors.New("unexpected call to GetOrgID")
}
```

This example demonstrates several key features of Clue's mock package:

1. **Type-Safe Mocking**: Clue provides type-safe mock implementations
2. **Sequence Control**: Use `Add` for ordered expectations
3. **Default Behaviors**: Use `Set` for consistent responses
4. **Verification**: Use `HasMore` to ensure all expectations were met

## Best Practices

1. **Keep Middleware Focused**: Each middleware should handle one specific HTTP concern. Use Goa interceptors for business logic.
2. **Use Middleware Options**: Make middleware configurable through functional options.
3. **Handle Errors Gracefully**: Return appropriate HTTP status codes and error messages.
4. **Optimize Performance**: Pre-compile regular expressions and use object pools.
5. **Test Edge Cases**: Test error conditions, timeouts, and concurrent requests.
6. **Document Behavior**: Document any headers or context values your middleware uses.
7. **Separate Concerns**: Use HTTP middleware for protocol concerns and Goa interceptors for business logic.

## Next Steps

- Review [HTTP Transport](@/docs/4-concepts/3-http) for more details on Goa's HTTP handling
- Learn about [Interceptors](@/docs/4-concepts/5-interceptors) for handling business logic
- Explore [Observability](@/docs/5-real-world/2-observability) for monitoring patterns
- Check out [Security](@/docs/5-real-world/3-security) for security best practices 