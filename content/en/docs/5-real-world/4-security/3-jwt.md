---
title: JWT Authentication
description: Learn how to implement JWT Authentication in your Goa API
weight: 3
---

# JWT Authentication in Goa

[JSON Web Tokens (JWT)](https://jwt.io/introduction) provide a secure way to
transmit claims between parties. They're particularly useful in microservices
architectures where you need to pass authentication and authorization
information between services. JWTs are self-contained tokens that can include
user information, permissions, and other claims.

## How JWT Auth Works

1. Client authenticates and receives a JWT
2. JWT is included in subsequent requests (usually in Authorization header)
3. Server validates the JWT signature and claims
4. If valid, the request is processed with the claims' context

For a detailed explanation of the JWT authentication flow, see the 
[JWT Authentication Flow Guide](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow).

## JWT Structure

A JWT consists of three parts (see [JWT.io Debugger](https://jwt.io/#debugger-io) for live examples):
1. Header (algorithm & token type)
2. Payload (claims)
3. Signature

Example JWT:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

For more information about JWT claims, see the 
[JWT Claims Documentation](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims).

## Understanding Scopes

### What Are Scopes?

Scopes are permissions that determine what actions a client can perform with an API. 
Think of scopes as a way to implement granular access control. For example:
- A mobile app might have `read` scope to view data
- An admin dashboard might have both `read` and `write` scopes
- A backup service might have `backup` scope

### How Scopes Work

1. **Definition**: Scopes are defined in your security scheme
2. **Assignment**: When generating a token, you include the granted scopes
3. **Validation**: When processing a request, you verify the token has the required scopes

Here's a real-world analogy:
- A hotel key card (JWT) might have different access levels (scopes):
  - `room:access` - Access to your room only
  - `pool:access` - Access to the swimming pool
  - `gym:access` - Access to the gym
  - `all:access` - Full access to all facilities

### Scope Format

Scopes typically follow a pattern like `resource:action`. Common examples:
```
api:read        # Read-only access to API
api:write       # Write access to API
users:create    # Ability to create users
admin:*         # Full admin access
```

### Scope Inheritance

Scopes can be hierarchical. For example:
- If a method requires `api:read`, a token with `admin:*` might also be valid
- If a method requires multiple scopes, the token must have ALL required scopes

Example of scope hierarchy:
```
admin:*           # Full admin access (includes all admin scopes)
├── admin:read    # Read admin resources
├── admin:write   # Modify admin resources
└── admin:delete  # Delete admin resources
```

### Implementing Scopes in Goa

#### 1. Define Available Scopes

First, define what scopes exist in your API:

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT authentication with scopes")
    
    // Define all available scopes
    Scope("api:read", "Read access to API resources")
    Scope("api:write", "Write access to API resources")
    Scope("api:admin", "Full administrative access")
    Scope("users:read", "Read user profiles")
    Scope("users:write", "Modify user profiles")
})
```

#### 2. Apply Scopes to Methods

Then, specify which scopes are required for each endpoint:

```go
var _ = Service("users", func() {
    // List users - requires read access
    Method("list", func() {
        Security(JWTAuth, func() {
            // Only needs read access
            Scope("users:read")
        })
    })
    
    // Update user - requires write access
    Method("update", func() {
        Security(JWTAuth, func() {
            // Needs both read and write access
            Scope("users:read", "users:write")
        })
    })
    
    // Delete user - requires admin access
    Method("delete", func() {
        Security(JWTAuth, func() {
            Scope("api:admin")
        })
    })
})
```

#### 3. Include Scopes in Tokens

When generating tokens, include the granted scopes:

```go
func GenerateUserToken(user *User) (string, error) {
    // Determine scopes based on user role
    var scopes []string
    switch user.Role {
    case "admin":
        scopes = []string{"api:admin", "users:read", "users:write"}
    case "editor":
        scopes = []string{"users:read", "users:write"}
    default:
        scopes = []string{"users:read"}
    }
    
    claims := Claims{
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(time.Hour * 24).Unix(),
            IssuedAt:  time.Now().Unix(),
            Subject:   user.ID,
        },
        Scopes: scopes,  // Include scopes in token
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(jwtSecret))
}
```

#### 4. Validate Scopes

When processing requests, validate that the token has the required scopes:

```go
func validateScopes(tokenScopes []string, requiredScopes []string) error {
    // Create a map of the token's scopes for efficient lookup
    scopeMap := make(map[string]bool)
    for _, scope := range tokenScopes {
        scopeMap[scope] = true
    }
    
    // Special case: admin scope grants all access
    if scopeMap["api:admin"] {
        return nil
    }
    
    // Check each required scope
    for _, required := range requiredScopes {
        if !scopeMap[required] {
            return fmt.Errorf("missing required scope: %s", required)
        }
    }
    
    return nil
}
```

### Best Practices for Scopes

1. **Naming Convention**
   - Use consistent patterns (`resource:action`)
   - Keep names lowercase and use colons as separators
   - Be descriptive but concise

2. **Granularity**
   - Make scopes specific enough for fine-grained control
   - But not so specific that they become unmanageable
   - Consider grouping related actions

3. **Documentation**
   - Document what each scope allows
   - Provide examples of when to use each scope
   - Explain any scope hierarchies

4. **Security**
   - Always validate scopes on the server
   - Don't trust client-side scope checking
   - Consider scope expiration with tokens

5. **Management**
   - Implement scope rotation for sensitive operations
   - Monitor scope usage
   - Regularly audit scope assignments

## Implementing JWT Auth in Goa

### 1. Define the Security Scheme

First, define your JWT security scheme in your design package. 

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// JWTAuth defines our security scheme
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT authentication")
    
    // Define scopes for authorization
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

### 2. Apply the Security Scheme

JWT auth can be applied at different levels with specific scope requirements. 

```go
// API level - applies to all services and methods
var _ = API("secure_api", func() {
    Security(JWTAuth, func() {
        Scope("api:read")  // Default minimum scope
    })
})

// Service level - applies to all methods in the service
var _ = Service("secure_service", func() {
    Security(JWTAuth, func() {
        Scope("api:write")  // Require write scope
    })
})

// Method level - applies only to this method
Method("secure_method", func() {
    Security(JWTAuth, func() {
        Scope("api:read", "api:write")  // Require both scopes
    })
})
```

### 3. Define the Payload

For methods that use JWT auth, include the token in the payload.

```go
Method("getData", func() {
    Security(JWTAuth, func() {
        Scope("api:read")
    })
    
    Payload(func() {
        Token("token", String, func() {
            Description("JWT used for authentication")
        })
        Required("token")
        
        // Additional payload fields
        Field(1, "query", String, "Search query")
    })
    
    Result(ArrayOf(String))
    
    HTTP(func() {
        GET("/data")
        // Map the token to the Authorization header
        Header("token:Authorization")
    })
})
```

### 4. Implement the Security Handler

When Goa generates the code, you'll need to implement a JWT security handler. This example 
uses the [golang-jwt/jwt](https://github.com/golang-jwt/jwt) library, which is the 
recommended JWT library for Go.

```go
// SecurityJWTFunc implements the authorization logic for JWT auth
func (s *service) JWTAuth(ctx context.Context, token string, 
    scheme *security.JWTScheme) (context.Context, error) {
    
    // Parse and validate the JWT
    claims, err := s.parseAndValidateJWT(token)
    if err != nil {
        return ctx, jwt.Unauthorized("invalid token")
    }
    
    // Validate required scopes
    if !hasRequiredScopes(claims.Scopes, scheme.RequiredScopes) {
        return ctx, jwt.Unauthorized("insufficient scopes")
    }
    
    // Add claims to context
    ctx = context.WithValue(ctx, "jwt_claims", claims)
    return ctx, nil
}

func (s *service) parseAndValidateJWT(token string) (*Claims, error) {
    // Parse the JWT using your preferred library
    // Example using golang-jwt/jwt:
    claims := &Claims{}
    parsedToken, err := jwt.ParseWithClaims(token, claims, 
        func(token *jwt.Token) (interface{}, error) {
            // Validate signing method
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", 
                    token.Header["alg"])
            }
            return []byte(s.config.JWTSecret), nil
        })
    
    if err != nil || !parsedToken.Valid {
        return nil, err
    }
    return claims, nil
}

// Claims defines your custom JWT claims
type Claims struct {
    jwt.StandardClaims
    UserID string   `json:"uid"`
    Scopes []string `json:"scopes"`
}

func hasRequiredScopes(tokenScopes, requiredScopes []string) bool {
    scopeMap := make(map[string]bool)
    for _, scope := range tokenScopes {
        scopeMap[scope] = true
    }
    
    for _, required := range requiredScopes {
        if !scopeMap[required] {
            return false
        }
    }
    return true
}
```

## Best Practices for JWT Auth

For comprehensive JWT security best practices, see the 
[OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html).

### 1. Token Generation

Generate JWTs with appropriate claims and expiration. For more information about JWT 
signing methods, see the [JWT Signing Algorithms Overview](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-signing-algorithms).

```go
func GenerateJWT(userID string, scopes []string) (string, error) {
    claims := Claims{
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(time.Hour * 24).Unix(),
            IssuedAt:  time.Now().Unix(),
            Issuer:    "your-api",
        },
        UserID: userID,
        Scopes: scopes,
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(jwtSecret))
}
```

### 2. Token Validation

Implement comprehensive token validation following the 
[JWT Best Practices RFC](https://datatracker.ietf.org/doc/html/rfc8725):

```go
func ValidateToken(tokenString string) (*Claims, error) {
    // Parse the token
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, 
        func(token *jwt.Token) (interface{}, error) {
            // Validate the signing method
            if _, ok := token.Method.(*jwt.SigningMethodHS256); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", 
                    token.Header["alg"])
            }
            return []byte(jwtSecret), nil
        })
    
    if err != nil {
        return nil, err
    }
    
    // Type assert the claims
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        // Additional validation
        if err := validateCustomClaims(claims); err != nil {
            return nil, err
        }
        return claims, nil
    }
    
    return nil, fmt.Errorf("invalid token")
}

func validateCustomClaims(claims *Claims) error {
    // Validate issuer
    if claims.Issuer != "your-api" {
        return fmt.Errorf("invalid issuer")
    }
    
    // Validate other custom requirements
    return nil
}
```

### 3. Token Refresh

Implement token refresh to maintain user sessions. For more information about refresh 
tokens, see the
[Auth0 Refresh Token Guide](https://auth0.com/docs/secure/tokens/refresh-tokens).

```go
Method("refresh", func() {
    Description("Refresh an existing JWT token")
    
    Security(JWTAuth)
    
    Payload(func() {
        Token("token", String)
        Required("token")
    })
    
    Result(func() {
        Field(1, "token", String, "New JWT token")
        Field(2, "expires_at", String, "Token expiration time")
        Required("token", "expires_at")
    })
    
    HTTP(func() {
        POST("/auth/refresh")
        Response(StatusOK)
        Response(StatusUnauthorized)
    })
})
```

## Generated Code

Goa generates several components for JWT auth:

1. **Security Types**
   - JWT token types
   - Scope validation
   - Error types

2. **Middleware**
   - Token extraction
   - Scope validation
   - Error handling

3. **OpenAPI Documentation**
   - Security schemes
   - Scope requirements
   - Error responses

## Common Issues and Solutions

### 1. Token Validation Errors

Common token validation issues:
- Expired tokens
- Invalid signatures
- Wrong algorithm
- Missing required claims

Solution: Implement comprehensive validation:

```go
func validateToken(token *jwt.Token) error {
    if err := validateSignature(token); err != nil {
        return err
    }
    if err := validateExpiration(token); err != nil {
        return err
    }
    if err := validateClaims(token); err != nil {
        return err
    }
    return nil
}
```

### 2. Scope Validation

Ensure proper scope checking:

```go
func validateScopes(tokenScopes []string, requiredScopes []string) error {
    scopeMap := make(map[string]bool)
    for _, scope := range tokenScopes {
        scopeMap[scope] = true
    }
    
    for _, required := range requiredScopes {
        if !scopeMap[required] {
            return fmt.Errorf("missing required scope: %s", required)
        }
    }
    return nil
}
```

### 3. Token Refresh Strategy

Implement a robust refresh strategy:

```go
func refreshToken(oldToken string) (string, error) {
    // Validate old token
    claims, err := validateToken(oldToken)
    if err != nil {
        return "", err
    }
    
    // Check if refresh is allowed
    if time.Unix(claims.ExpiresAt, 0).Sub(time.Now()) > 
        time.Hour*24*7 {
        return "", fmt.Errorf("token too old to refresh")
    }
    
    // Generate new token
    return GenerateJWT(claims.UserID, claims.Scopes)
}
```

## Next Steps

- Learn about [OAuth2 Authentication](4-oauth2.md)
- Explore [API Key Authentication](2-api-key.md)
- Read about [Security Best Practices](5-best-practices.md)