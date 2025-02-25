---
title: Basic Authentication
description: Learn how to implement Basic Authentication in your Goa API
weight: 1
---

# Basic Authentication in Goa

Basic Authentication is a simple authentication scheme built into the HTTP protocol. 
While it's one of the simplest forms of authentication, it's still widely used, 
especially for internal APIs or development environments.

## How Basic Auth Works

When using Basic Authentication:

1. The client combines the username and password with a colon (username:password)
2. This string is then base64 encoded
3. The encoded string is sent in the Authorization header:
   `Authorization: Basic base64(username:password)`

## Implementing Basic Auth in Goa

### 1. Define the Security Scheme

First, define your Basic Auth security scheme in your design package:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// BasicAuth defines our security scheme
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Use your username and password to access the API")
})
```

### 2. Apply the Security Scheme

You can apply Basic Auth at different levels:

```go
// API level - applies to all services and methods
var _ = API("secure_api", func() {
    Security(BasicAuth)
})

// Service level - applies to all methods in the service
var _ = Service("secure_service", func() {
    Security(BasicAuth)
})

// Method level - applies only to this method
Method("secure_method", func() {
    Security(BasicAuth)
})
```

### 3. Define the Payload

For methods that use Basic Auth, you need to define the payload to include username 
and password fields:

```go
Method("login", func() {
    Security(BasicAuth)
    Payload(func() {
        // These special DSL functions are recognized by Goa
        Username("username", String, "Username for authentication")
        Password("password", String, "Password for authentication")
        Required("username", "password")
    })
    Result(String)
    HTTP(func() {
        POST("/login")
        // Response defines what happens after successful authentication
        Response(StatusOK)
    })
})
```

### 4. Implement the Security Handler

When Goa generates the code, you'll need to implement a security handler. Here's an 
example:

```go
// SecurityBasicAuthFunc implements the authorization logic for Basic Auth
func (s *service) BasicAuth(ctx context.Context, user, pass string) (context.Context, error) {
    // Implement your authentication logic here
    if user == "admin" && pass == "secret" {
        // Authentication successful
        return ctx, nil
    }
    // Authentication failed
    return ctx, basic.Unauthorized("invalid credentials")
}
```

## Best Practices for Basic Auth

1. **Always Use HTTPS**
   Basic Auth sends credentials base64 encoded (not encrypted). Always use HTTPS to 
   protect credentials in transit.

2. **Secure Password Storage**
   - Never store passwords in plain text
   - Use strong hashing algorithms (like bcrypt)
   - Add salt to password hashes
   - Consider using a secure password management library

3. **Rate Limiting**
   Implement rate limiting to prevent brute force attacks:

   ```go
   var _ = Service("secure_service", func() {
       Security(BasicAuth)
       
       // Add rate limiting annotation
       Meta("ratelimit:limit", "60")
       Meta("ratelimit:window", "1m")
   })
   ```

4. **Error Messages**
   Don't reveal whether the username or password was incorrect. Use generic messages:

   ```go
   return ctx, basic.Unauthorized("invalid credentials")
   ```

5. **Logging**
   Log authentication attempts but never log passwords:

   ```go
   func (s *service) BasicAuth(ctx context.Context, user, pass string) (context.Context, error) {
       // Good: Log only the username and result
       log.Printf("Authentication attempt for user: %s", user)
       
       // Bad: Never do this
       // log.Printf("Password attempt: %s", pass)
   }
   ```

## Example Implementation

Here's a complete example showing how to implement Basic Auth in a Goa service:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication for API access")
})

var _ = API("secure_api", func() {
    Title("Secure API Example")
    Description("API demonstrating Basic Authentication")
    
    // Apply Basic Auth to all endpoints by default
    Security(BasicAuth)
})

var _ = Service("secure_service", func() {
    Description("A secure service requiring authentication")
    
    Method("getData", func() {
        Description("Get protected data")
        
        // Define the security requirements
        Security(BasicAuth)
        
        // Define the payload (credentials will be added automatically)
        Payload(func() {
            // Add any additional payload fields here
            Field(1, "query", String, "Search query")
        })
        
        // Define the result
        Result(ArrayOf(String))
        
        // Define the HTTP transport
        HTTP(func() {
            GET("/data")
            Response(StatusOK)
            Response(StatusUnauthorized, func() {
                Description("Invalid credentials")
            })
        })
    })
    
    // Example of a public endpoint
    Method("health", func() {
        Description("Health check endpoint")
        NoSecurity()
        Result(String)
        HTTP(func() {
            GET("/health")
        })
    })
})
```

## Generated Code

Goa generates several components for Basic Auth:

1. **Security Types**
   - Types for credentials
   - Error types for authentication failures

2. **Middleware**
   - Extracts credentials from requests
   - Calls your security handler
   - Handles authentication errors

3. **OpenAPI Documentation**
   - Documents security requirements
   - Shows required fields
   - Documents error responses

## Common Issues and Solutions

### 1. Credentials Not Being Sent

If credentials aren't being sent, check:
- The `Authorization` header format
- Base64 encoding
- URL encoding of special characters

### 2. Always Getting Unauthorized

Common causes:
- Missing `Security()` in design
- Incorrect implementation of security handler
- Middleware order issues

### 3. CORS Issues

For browser-based clients, ensure proper CORS configuration:

```go
var _ = Service("secure_service", func() {
    HTTP(func() {
        // Allow credentials in CORS
        Meta("cors:expose_headers", "Authorization")
        Meta("cors:allow_credentials", "true")
    })
})
```

## Next Steps

- Learn about [API Key Authentication](2-api-key.md)
- Explore [JWT Authentication](3-jwt.md)
- Understand [OAuth2 Authentication](4-oauth2.md)
- Read about [Security Best Practices](5-best-practices.md)