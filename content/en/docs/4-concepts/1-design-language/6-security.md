---
title: "Security"
linkTitle: "Security"
weight: 6
description: "Define authentication and authorization schemes for your services using Goa's security DSL, including JWT, API keys, Basic Auth, and OAuth2."
---

## Security Overview

When securing APIs, it's important to understand two distinct concepts:

- **Authentication** (AuthN): Verifies the identity of a client ("Who are you?")
- **Authorization** (AuthZ): Determines what an authenticated client can do ("What are you allowed to do?")

Goa provides DSL constructs to define both authentication and authorization requirements for your services.

## Security Schemes

### JWT (JSON Web Token)

JWT is an open standard ([RFC 7519](https://tools.ietf.org/html/rfc7519)) that defines a compact way to securely transmit information between parties as a JSON object. JWTs are often used for both authentication and authorization:

1. **Authentication**: The JWT itself proves the bearer has been authenticated because it was issued by a trusted authority (signed with a secret key)
2. **Authorization**: The JWT can carry claims (like user roles or permissions) that services can use to make authorization decisions

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT-based authentication and authorization")
    // Scopes define permissions that can be checked against JWT claims
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

#### Understanding Scopes

Scopes are named permissions that represent what actions a client is allowed to perform. When using JWTs:

1. The authentication server includes granted scopes in the JWT when issued
2. Your service validates these scopes against the required scopes for each endpoint
3. If the JWT doesn't contain the required scopes, the request is denied

### API Keys

API keys are simple string tokens that clients include with their requests. While commonly called "API Key Authentication", they are more accurately described as an authorization mechanism:

- They don't prove identity (can be easily shared or stolen)
- They primarily serve to identify the source of requests and enforce rate limiting
- They're simpler than JWTs but offer less security and flexibility

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key-based request authorization")
})
```

Common uses for API keys:
- Rate limiting by client
- Usage tracking
- Simple project/team identification
- Basic access control for public APIs

### Basic Authentication

Basic Authentication is a simple authentication scheme built into the HTTP protocol:

- Clients send credentials (username/password) with each request
- Credentials are Base64 encoded, but not encrypted (requires HTTPS)
- Provides true authentication but no built-in authorization mechanism

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Username/password authentication")
    // Scopes here define permissions that can be granted after successful authentication
    Scope("api:read", "Read-only access")
})
```

### OAuth2

OAuth2 is a comprehensive authorization framework that supports multiple flows for different types of applications. It separates:

1. Authentication (handled by an authorization server)
2. Authorization (grants specific permissions via access tokens)
3. Resource access (using the access tokens)

```go
var OAuth2Auth = OAuth2Security("oauth2", func() {
    // Define the OAuth2 flow endpoints
    AuthorizationCodeFlow(
        "http://auth.example.com/authorize",  // Where to request authorization
        "http://auth.example.com/token",      // Where to exchange code for token
        "http://auth.example.com/refresh",    // Where to refresh expired tokens
    )
    // Define available permissions
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

## Applying Security Schemes

Security schemes can be applied at different levels:

### Method Level Security

Secure individual methods with one or more schemes:

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, func() {
        Scope("api:read")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    
    HTTP(func() {
        GET("/secure")
        Response(StatusOK)
    })
})
```

### Multiple Schemes

Combine multiple security schemes for enhanced security:

```go
Method("doubly_secure", func() {
    Security(JWTAuth, APIKeyAuth, func() {
        Scope("api:write")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    
    HTTP(func() {
        POST("/secure")
        Param("key:k")  // API key in query parameter
        Response(StatusOK)
    })
})
```

## Transport-Specific Configuration

### HTTP Security Configuration

Configure how security credentials are transmitted over HTTP:

```go
Method("secure_endpoint", func() {
    Security(JWTAuth)
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    HTTP(func() {
        GET("/secure")
        Header("token:Authorization") // JWT in Authorization header
        Response(StatusOK)
        Response("unauthorized", StatusUnauthorized)
    })
})
```

### gRPC Security Configuration

Configure security for gRPC transport:

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, APIKeyAuth)
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    GRPC(func() {
        Metadata(func() {
            Attribute("token:authorization")  // JWT in metadata
            Attribute("api_key:x-api-key")   // API key in metadata
        })
        Response(CodeOK)
        Response("unauthorized", CodeUnauthenticated)
    })
})
```

## Error Handling

Define security-related errors consistently:

```go
Service("secure_service", func() {
    Error("unauthorized", String, "Invalid credentials")
    Error("forbidden", String, "Invalid scopes")
    
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
        Response("forbidden", StatusForbidden)
    })
    
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
        Response("forbidden", CodePermissionDenied)
    })
})
```

## Best Practices

{{< alert title="Security Implementation Guidelines" color="primary" >}}
**Authentication Design**
- Use appropriate security schemes for your use case
- Implement proper token validation
- Secure credential storage
- Use HTTPS in production

**Authorization Design**
- Define clear scope hierarchies
- Use fine-grained permissions
- Implement role-based access control
- Validate all security requirements

**General Tips**
- Document security requirements
- Implement proper error handling
- Use secure defaults
- Regular security audits
{{< /alert >}}

## Implementing Security

When you define security schemes in your design, Goa generates an `Auther`
interface specific to your design that your service must implement. This
interface defines methods for each security scheme you've specified:

```go
// Auther defines the security requirements for the service.
type Auther interface {
    // BasicAuth implements the authorization logic for basic auth.
    BasicAuth(context.Context, string, string, *security.BasicScheme) (context.Context, error)
    
    // JWTAuth implements the authorization logic for JWT tokens.
    JWTAuth(context.Context, string, *security.JWTScheme) (context.Context, error)
    
    // APIKeyAuth implements the authorization logic for API keys.
    APIKeyAuth(context.Context, string, *security.APIKeyScheme) (context.Context, error)
    
    // OAuth2Auth implements the authorization logic for OAuth2.
    OAuth2Auth(context.Context, string, *security.OAuth2Scheme) (context.Context, error)
}
```

Your service must implement these methods to handle the
authentication/authorization logic. Here's how to implement each:

### Basic Auth Implementation

```go
// BasicAuth implements the authorization logic  for the "basic" security scheme.
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    // Store auth info in context for later use
    ctx = contextWithAuthInfo(ctx, authInfo{
        user: user,
    })
    return ctx, nil
}
```

### JWT Implementation

```go
// JWTAuth implements the authorization logic for the "jwt" security scheme.
func (s *svc) JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error) {
    claims := make(jwt.MapClaims)
    
    // Parse and validate JWT token
    _, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (interface{}, error) { 
        return Key, nil 
    })
    if err != nil {
        return ctx, ErrInvalidToken
    }

    // Validate required scopes
    if claims["scopes"] == nil {
        return ctx, ErrInvalidTokenScopes
    }
    scopes, ok := claims["scopes"].([]any)
    if !ok {
        return ctx, ErrInvalidTokenScopes
    }
    scopesInToken := make([]string, len(scopes))
    for _, scp := range scopes {
        scopesInToken = append(scopesInToken, scp.(string))
    }
    if err := scheme.Validate(scopesInToken); err != nil {
        return ctx, securedservice.InvalidScopes(err.Error())
    }

    // Store claims in context
    ctx = contextWithAuthInfo(ctx, authInfo{
        claims: claims,
    })
    return ctx, nil
}
```

### API Key Implementation

```go
// APIKeyAuth implements the authorization logic for service "secured_service"
// for the "api_key" security scheme.
func (s *securedServicesrvc) APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error) {
    if key != "my_awesome_api_key" {
        return ctx, ErrUnauthorized
    }
    ctx = contextWithAuthInfo(ctx, authInfo{
        key: key,
    })
    return ctx, nil
}
```

### Creating JWT Tokens

When implementing a sign-in endpoint that issues tokens:

```go
// Signin creates a valid JWT token for authentication
func (s *svc) Signin(ctx context.Context, p *gensvc.SigninPayload) (*gensvc.Creds, error) {
    // Create JWT token with claims
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "nbf":    time.Date(2015, 10, 10, 12, 0, 0, 0, time.UTC).Unix(),
        "iat":    time.Now().Unix(),
        "scopes": []string{"api:read", "api:write"},
    })

    // Sign the token
    t, err := token.SignedString(Key)
    if err != nil {
        return nil, err
    }
    
    return &gensvc.Creds{
        JWT:        t,
        OauthToken: t,
        APIKey:     "my_awesome_api_key",
    }, nil
}
```

### How It Works
When you implement security schemes in your Goa service, here's how the authentication and authorization flow works:

1. Goa generates endpoint wrappers that handle security scheme validation
2. Each endpoint wrapper calls the appropriate auth functions you've implemented
3. Your auth functions validate credentials and return an enhanced context
4. If auth succeeds, the endpoint handler is called with the enhanced context
5. If auth fails, an error is returned to the client

For example, with multiple schemes:

```go
// Generated endpoint wrapper
func NewDoublySecureEndpoint(s Service, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc) goa.Endpoint {
    return func(ctx context.Context, req any) (any, error) {
        p := req.(*DoublySecurePayload)
        
        // Validate JWT first
        ctx, err = authJWTFn(ctx, p.Token, &sc)
        if err == nil {
            // Then validate API key
            ctx, err = authAPIKeyFn(ctx, p.Key, &sc)
        }
        if err != nil {
            return nil, err
        }
        
        // Call service method if both auth checks pass
        return s.DoublySecure(ctx, p)
    }
}
```