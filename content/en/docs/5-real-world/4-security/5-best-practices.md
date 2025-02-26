---
title: Security Best Practices
description: Learn essential security best practices for your Goa API
weight: 5
---

Building a secure API involves more than just adding authentication. You need to 
think about security at every level of your application, from how you handle user 
input to how you protect your server from attacks. This guide will walk you through 
essential security practices for your Goa API, with practical examples you can 
implement today.

## Foundational Security Principles

### Defense in Depth

Security isn't about having a single strong lock - it's about having multiple layers 
of protection. If one layer fails, the others are still there to protect your 
application. Here's how to implement multiple security layers in your Goa service:

```go
// First layer use HTTPS
var _ = Service("secure_service", func() {
    Security(JWTAuth, func() { // Second layer: Require valid authentication
        Scope("api:write")     // Third layer: Check specific permissions
    })
    
    // Fourth layer: Validate all input
    Method("secureEndpoint", func() {
        Payload(func() {
            Field(1, "data", String)
            MaxLength("data", 1000)  // Prevent large payloads
        })
    })
})
```

This code demonstrates how to layer multiple security controls. Think of it like a 
medieval castle - you have the moat (HTTPS), the outer wall (authentication), the 
inner wall (authorization), and finally, the careful inspection of all visitors 
(input validation).

For rate limiting, you'll want to implement it using middleware on your Goa HTTP
server.  Here's how to add rate limiting to your service:

```go
package main

import (
    "context"
    "net/http"
    "time"
    
    "golang.org/x/time/rate"
    goahttp "goa.design/goa/v3/http"
    "goa.design/goa/v3/middleware"
)

// RateLimiter creates middleware that limits request rate
func RateLimiter(limit rate.Limit, burst int) middleware.Middleware {
    limiter := rate.NewLimiter(limit, burst)
    
    return func(h http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                http.Error(w, "Too many requests", http.StatusTooManyRequests)
                return
            }
            h.ServeHTTP(w, r)
        })
    }
}

func main() {
    // ... logger, instrumentation setup ...

    // Create service & endpoints
    svc := NewService()
    endpoints := gen.NewEndpoints(svc)
    
    mux := goahttp.NewMuxer()
    
    // Create server
    server := gen.NewServer(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    
    // Mount generated handlers
    gen.Mount(mux, server)
    
    // Add middleware to the server handler chain
    var handler http.Handler = mux
    handler = RateLimiter(rate.Every(time.Second/100), 10)(handler) // 100 req/sec
    handler = log.HTTP(ctx)(handler)                                // Add logging
    
    // Create and start HTTP server
    srv := &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }
    
    // ... graceful shutdown code ...
}
```

For per-endpoint rate limiting, you can apply the rate limiter directly to specific endpoints:

```go
// RateLimitEndpoint wraps an endpoint with rate limiting
func RateLimitEndpoint(limit rate.Limit, burst int) func(goa.Endpoint) goa.Endpoint {
    limiter := rate.NewLimiter(limit, burst)
    
    return func(endpoint goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            if !limiter.Allow() {
                return nil, fmt.Errorf("rate limit exceeded")
            }
            return endpoint(ctx, req)
        }
    }
}

func main() {
    // ... service setup code ...

    // Create endpoints
    endpoints := &gen.Endpoints{
        Forecast: RateLimitEndpoint(rate.Every(time.Second), 10)(
            gen.NewForecastEndpoint(svc),
        ),
        TestAll: gen.NewTestAllEndpoint(svc),  // No rate limit
        TestSmoke: RateLimitEndpoint(rate.Every(time.Minute), 5)(
            gen.NewTestSmokeEndpoint(svc),
        ),
    }

    // ... rest of server setup ...
}
```

This approach:

1. Allows fine-grained control over which endpoints have rate limiting
2. Can use different limits for different endpoints
3. Keeps the rate limiting logic close to the endpoint definition
4. Follows Goa's endpoint middleware pattern

### Secure by Default

One of the most important security principles is to start with secure defaults. It's 
much safer to start with everything locked down and then selectively open access, 
rather than starting open and trying to lock things down later. Here's how to set 
secure defaults in your Goa API:

```go
var _ = API("secure_api", func() {
    // Require authentication by default
    Security(JWTAuth)
})
```

These settings ensure that every endpoint in your API requires authentication by 
default. For transport security (HTTPS), you'll configure this at the server level 
in your implementation:

```go
func main() {
    // ... service and endpoint setup ...

    // Create TLS configuration
    tlsConfig := &tls.Config{
        MinVersion: tls.VersionTLS12,
        CurvePreferences: []tls.CurveID{
            tls.X25519,
            tls.CurveP256,
        },
        PreferServerCipherSuites: true,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
        },
    }

    // Create HTTPS server with secure configuration
    srv := &http.Server{
        Addr:      ":443",
        Handler:   handler,
        TLSConfig: tlsConfig,
        
        // Set timeouts to prevent slow-loris attacks
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }
    
    // Start server with TLS
    log.Printf("HTTPS server listening on %s", srv.Addr)
    if err := srv.ListenAndServeTLS("cert.pem", "key.pem"); err != nil {
        log.Fatalf("failed to start HTTPS server: %v", err)
    }
}
```

This implementation:

1. Uses TLS 1.2 or higher
2. Configures secure cipher suites
3. Sets appropriate timeouts
4. Uses modern elliptic curves
5. Follows security best practices for HTTPS configuration

You can also combine this with other security middleware like rate limiting:

### Principle of Least Privilege

When it comes to permissions, less is more. Every user and service should have 
exactly the permissions they need to do their job - no more, no less. This limits 
the potential damage if any single account is compromised. Here's how to implement 
fine-grained permissions in your API:

```go
var _ = Service("user_service", func() {
    // Regular users can read their own profile
    Method("getProfile", func() {
        Security(OAuth2Auth, func() {
            Scope("profile:read")
        })
        
        // Implementation ensures users can only read their own profile
        Payload(func() {
            UserID("id", String, "Profile to read")
        })
    })
    
    // Only users with write permission can update profiles
    Method("updateProfile", func() {
        Security(OAuth2Auth, func() {
            Scope("profile:write")
        })
    })
    
    // Administrative operations require special privileges
    Method("deleteUser", func() {
        Security(OAuth2Auth, func() {
            Scope("admin")
        })
    })
})
```

This example shows how to create a hierarchy of permissions. Regular users can read 
their own data, users with elevated privileges can make changes, and only 
administrators can perform dangerous operations like deletions.

## Authentication Security

Proper authentication is your API's first line of defense. Let's look at how to 
implement secure authentication practices.

### Token Management

Tokens are like digital keys to your API. Just like physical keys, they need to be 
created securely, checked carefully, and managed throughout their lifecycle. Here's 
how to implement secure token handling:

```go
// Generate a new token with appropriate security measures
func GenerateToken(user *User) (string, error) {
    now := time.Now()
    claims := &Claims{
        StandardClaims: jwt.StandardClaims{
            // Token is valid starting now
            IssuedAt:  now.Unix(),
            // Token expires in 24 hours
            ExpiresAt: now.Add(time.Hour * 24).Unix(),
            // Identify who issued the token
            Issuer:    "your-api",
            // Identify who the token belongs to
            Subject:   user.ID,
        },
        // Include user's permissions
        Scopes: user.Permissions,
    }
    
    // Use a secure signing method (ECDSA is more secure than HMAC)
    token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
    return token.SignedString(privateKey)
}

// Validate incoming tokens thoroughly
func ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, 
        func(token *jwt.Token) (interface{}, error) {
            // Always verify the signing method
            if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
                return nil, fmt.Errorf("unexpected signing method")
            }
            return publicKey, nil
        })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        // Perform additional validation
        if err := validateClaims(claims); err != nil {
            return nil, err
        }
        return claims, nil
    }
    
    return nil, fmt.Errorf("invalid token")
}
```

## Password Handling

Implement secure password handling:

```go
// Hash passwords using strong algorithms
func HashPassword(password string) (string, error) {
    // Use bcrypt with appropriate cost
    hash, err := bcrypt.GenerateFromPassword(
        []byte(password), 
        bcrypt.DefaultCost,
    )
    if err != nil {
        return "", err
    }
    return string(hash), nil
}

// Verify passwords
func VerifyPassword(hashedPassword, password string) error {
    return bcrypt.CompareHashAndPassword(
        []byte(hashedPassword), 
        []byte(password),
    )
}
```

### 3. API Key Management

Implement secure API key handling:

```go
// Generate secure API keys
func GenerateAPIKey() string {
    // Use crypto/rand for secure random generation
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        panic(err)
    }
    return base64.URLEncoding.EncodeToString(bytes)
}

// Store API keys securely
func StoreAPIKey(key string) error {
    // Hash the key before storage
    hashedKey := sha256.Sum256([]byte(key))
    
    // Store in database
    return db.StoreKey(hex.EncodeToString(hashedKey[:]))
}
```

## Authorization Best Practices

### 1. Role-Based Access Control (RBAC)

Implement RBAC using scopes:

```go
var _ = Service("admin", func() {
    // Define roles and permissions
    Security(OAuth2Auth, func() {
        Scope("admin:read", "Read admin resources")
        Scope("admin:write", "Modify admin resources")
        Scope("admin:delete", "Delete admin resources")
    })
    
    Method("getUsers", func() {
        Security(OAuth2Auth, func() {
            Scope("admin:read")
        })
    })
    
    Method("createUser", func() {
        Security(OAuth2Auth, func() {
            Scope("admin:write")
        })
    })
    
    Method("deleteUser", func() {
        Security(OAuth2Auth, func() {
            Scope("admin:delete")
        })
    })
})
```

### 2. Resource-Based Authorization

Implement resource-level authorization:

```go
func (s *service) authorizeResource(ctx context.Context, 
    resourceID string) error {
    
    // Get user from context
    user := auth.UserFromContext(ctx)
    
    // Get resource
    resource, err := s.db.GetResource(resourceID)
    if err != nil {
        return err
    }
    
    // Check ownership or permissions
    if !canAccess(user, resource) {
        return fmt.Errorf("unauthorized access to resource")
    }
    
    return nil
}
```

## Input Validation and Sanitization

### 1. Request Validation

Define comprehensive validation rules:

```go
var _ = Type("UserInput", func() {
    Field(1, "username", String, func() {
        Pattern("^[a-zA-Z0-9_]{3,30}$")
        Example("john_doe")
    })
    
    Field(2, "email", String, func() {
        Format(FormatEmail)
        Example("john@example.com")
    })
    
    Field(3, "age", Int, func() {
        Minimum(18)
        Maximum(150)
        Example(25)
    })
    
    Field(4, "website", String, func() {
        Format(FormatURI)
        Example("https://example.com")
    })
    
    Required("username", "email", "age")
})
```

### 2. Content Security

Implement content security measures:

```go
var _ = Service("content", func() {
    HTTP(func() {
        Response(func() {
            // Set Content Security Policy
            Header("Content-Security-Policy", String, 
                "default-src 'self'")
            
            // Prevent MIME type sniffing
            Header("X-Content-Type-Options", String, "nosniff")
            
            // Control frame embedding
            Header("X-Frame-Options", String, "DENY")
        })
    })
})
```

## Rate Limiting and DOS Protection

### 1. Rate Limiting Configuration

Implement rate limiting at multiple levels:

```go
var _ = Service("api", func() {
    // Global rate limit
    Meta("ratelimit:limit", "1000")
    Meta("ratelimit:window", "1h")
    
    // Method-specific rate limits
    Method("expensive", func() {
        Meta("ratelimit:limit", "10")
        Meta("ratelimit:window", "1m")
    })
})
```

### 2. DOS Protection

Implement DOS protection measures:

```go
var _ = Service("api", func() {
    // Limit payload size
    MaxLength("request_body", 1024*1024)  // 1MB limit
    
    // Timeout for long operations
    Meta("timeout", "30s")
    
    // Pagination limits
    Method("list", func() {
        Payload(func() {
            Field(1, "page", Int, func() {
                Minimum(1)
            })
            Field(2, "per_page", Int, func() {
                Minimum(1)
                Maximum(100)
            })
        })
    })
})
```

## Error Handling and Logging

### 1. Secure Error Handling

Implement secure error responses:

```go
var _ = Service("api", func() {
    Error("unauthorized", func() {
        Description("Authentication failed")
        // Don't expose internal details
        Field(1, "message", String, "Authentication required")
    })
    
    Error("validation_error", func() {
        Description("Invalid input")
        Field(1, "fields", ArrayOf(String), "Invalid fields")
    })
    
    Method("secure", func() {
        Error("unauthorized")
        Error("validation_error")
        HTTP(func() {
            Response("unauthorized", StatusUnauthorized)
            Response("validation_error", StatusBadRequest)
        })
    })
})
```

### 2. Security Logging

Implement secure logging practices:

```go
func (s *service) logSecurityEvent(ctx context.Context, 
    eventType string, details map[string]interface{}) {
    
    // Add security context
    details["ip_address"] = getClientIP(ctx)
    details["user_id"] = getUserID(ctx)
    details["timestamp"] = time.Now().UTC()
    
    // Never log sensitive data
    delete(details, "password")
    delete(details, "token")
    
    // Log with appropriate level
    s.logger.WithFields(details).Info(eventType)
}
```

## HTTPS and Transport Security

### 1. HTTPS Configuration

Enforce HTTPS usage:

```go
var _ = API("secure_api", func() {
    // Require HTTPS
    Meta("transport", "https")
    
    HTTP(func() {
        // Redirect HTTP to HTTPS
        Meta("redirect_http", "true")
        
        // Set HSTS header
        Response(func() {
            Header("Strict-Transport-Security", 
                String, 
                "max-age=31536000; includeSubDomains")
        })
    })
})
```

### 2. Certificate Management

Implement proper certificate handling:

```go
func setupTLS() *tls.Config {
    return &tls.Config{
        MinVersion: tls.VersionTLS12,
        CurvePreferences: []tls.CurveID{
            tls.X25519,
            tls.CurveP256,
        },
        PreferServerCipherSuites: true,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
        },
    }
}
```

## Security Testing

### 1. Security Test Cases

Write security-focused tests:

```go
func TestSecurityHandling(t *testing.T) {
    tests := []struct {
        name          string
        token         string
        expectedCode  int
        expectedBody  string
    }{
        {
            name: "valid_token",
            token: generateValidToken(),
            expectedCode: http.StatusOK,
        },
        {
            name: "expired_token",
            token: generateExpiredToken(),
            expectedCode: http.StatusUnauthorized,
        },
        {
            name: "invalid_signature",
            token: generateTokenWithInvalidSignature(),
            expectedCode: http.StatusUnauthorized,
        },
        {
            name: "missing_token",
            token: "",
            expectedCode: http.StatusUnauthorized,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

### 2. Security Scanning

Implement security scanning in your pipeline:

```yaml
# Example GitHub Actions workflow
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Run Gosec Security Scanner
      uses: securego/gosec@master
      with:
        args: ./...
    
    - name: Run Nancy for Dependency Scanning
      uses: sonatype-nexus-community/nancy-github-action@main
    
    - name: Run OWASP ZAP Scan
      uses: zaproxy/action-full-scan@v0.3.0
```

## Monitoring and Incident Response

### 1. Security Monitoring

Implement security monitoring:

```go
func monitorSecurityEvents(ctx context.Context) {
    // Monitor authentication failures
    go monitorAuthFailures(ctx)
    
    // Monitor rate limit breaches
    go monitorRateLimits(ctx)
    
    // Monitor suspicious patterns
    go monitorSuspiciousActivity(ctx)
}

func monitorAuthFailures(ctx context.Context) {
    threshold := 5
    window := time.Minute * 5
    
    for {
        select {
        case <-ctx.Done():
            return
        default:
            failures := getRecentAuthFailures(window)
            if failures > threshold {
                alertSecurityTeam("High authentication failure rate detected")
            }
            time.Sleep(time.Minute)
        }
    }
}
```

### 2. Incident Response

Prepare incident response handlers:

```go
func handleSecurityIncident(incident *SecurityIncident) {
    // Log incident details
    logSecurityIncident(incident)
    
    // Alert security team
    alertSecurityTeam(incident)
    
    // Take immediate action
    switch incident.Type {
    case "brute_force_attempt":
        blockIP(incident.SourceIP)
    case "api_key_compromise":
        revokeAPIKey(incident.APIKey)
    case "unauthorized_access":
        terminateUserSessions(incident.UserID)
    }
    
    // Create incident report
    createIncidentReport(incident)
}
```

## Next Steps

- Review your API's security implementation against these best practices
- Implement missing security controls
- Regularly update and test your security measures
- Stay informed about new security threats and mitigations
- Consider a professional security audit 