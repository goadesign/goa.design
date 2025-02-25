---
linkTitle: Security
title: Security
weight: 4
description: Learn how to secure your HTTP Goa APIs using various authentication methods
---

# Security in Goa

Goa provides robust security features that allow you to protect your APIs at multiple 
levels. Whether you need basic authentication, API keys, JWT tokens, or OAuth2, Goa's 
security DSL makes it straightforward to implement secure endpoints.

This section will guide you through Goa's security features, from basic concepts to 
advanced implementations. We'll cover each authentication method in detail and provide 
best practices for securing your APIs.

## Understanding Security in Goa

Security in Goa is implemented through security schemes - reusable definitions that 
specify how authentication and authorization should work. Think of these schemes as 
templates that define how your API will verify the identity of clients trying to 
access your endpoints.

These schemes can be applied at three different levels, providing flexible security 
configuration:

- **API level**: When applied at the API level, the security scheme becomes the default 
  for all endpoints in your API. This is useful when you want consistent security 
  across your entire API.

- **Service level**: Services can override the API-level security or define their own 
  security if none is defined at the API level. This allows you to have different 
  security requirements for different groups of related endpoints.

- **Method level**: Individual methods (endpoints) can override both API and service 
  level security. This gives you the finest level of control, allowing specific 
  endpoints to use different security schemes or no security at all.

## Available Security Schemes

Goa supports several common security mechanisms through dedicated DSL functions. Each 
scheme is designed for specific use cases:

### Basic Authentication

Basic authentication is one of the simplest forms of API security, where clients 
provide a username and password. While simple, it should only be used over HTTPS to 
ensure credentials are encrypted during transmission.

[Learn more about Basic Authentication →](1-basic-auth.md)

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication using username and password")
})
```

### API Key Authentication

API keys provide a simple way to authenticate clients using a single token. They're 
commonly passed in headers or query parameters. This method is popular for public APIs 
that need to track usage or implement rate limiting.

[Learn more about API Key Authentication →](2-api-key.md)

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Secures endpoint by requiring an API key.")
})
```

### JWT (JSON Web Token) Authentication

JWT authentication is ideal for stateless authentication using signed tokens that can 
carry claims. JWTs are perfect for microservices architectures where you need to 
pass authentication and authorization information between services.

[Learn more about JWT Authentication →](3-jwt.md)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Secures endpoint by requiring a valid JWT token.")
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

### OAuth2 Authentication

OAuth2 provides a comprehensive solution for delegated authorization. It's ideal when 
you need to allow third-party applications to access your API on behalf of your users.

[Learn more about OAuth2 Authentication →](4-oauth2.md)

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("OAuth2 authentication")
    ImplicitFlow("/authorization")
    Scope("api:write", "Write access")
    Scope("api:read", "Read access")
})
```

## Security Hierarchy Example

Let's examine a complete example that demonstrates how security schemes can be applied 
at different levels. This example shows the flexibility of Goa's security system and 
how different security requirements can be combined:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// Define our security schemes
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic authentication")
})

var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Secures endpoint by requiring an API key.")
})

var JWTAuth = JWTSecurity("jwt", func() {
    Description("Secures endpoint by requiring a valid JWT token.")
})

// Apply security at the API level
var _ = API("hierarchy", func() {
    Title("Security Example API")
    Description("This API demonstrates the effect of using Security at the API, " +
        "Service or Method levels")

    // Set basic auth as the default security scheme for all endpoints
    Security(BasicAuth)
})
```

### Default Service with Basic Auth

This service inherits the API-level basic authentication. Notice how the payload must 
include username and password fields:

```go
var _ = Service("default_service", func() {
    Method("default", func() {
        Description("The default service default_method is secured with basic " +
            "authentication")
        // Define the expected payload for basic auth
        Payload(func() {
            Username("username")  // Special DSL for username field
            Password("password")  // Special DSL for password field
            Required("username", "password")
        })
        HTTP(func() { GET("/default") })
    })
})
```

### Service with Mixed Security

This service demonstrates how to override security at both service and method levels, 
showing the flexibility of Goa's security system:

```go
var _ = Service("api_key_service", func() {
    Description("The svc service is secured with API key based authentication")
    HTTP(func() { Path("/svc") })

    // Override API-level security for this entire service
    Security(APIKeyAuth)

    Method("default", func() {
        // This method uses the service-level API key security
        Payload(func() {
            APIKey("api_key", "key", String, func() {
                Description("API key used for authentication")
            })
            Required("key")
        })
        HTTP(func() { GET("/default") })
    })

    Method("secure", func() {
        // Override service-level security for this specific method
        Security(JWTAuth)
        Description("This method requires a valid JWT token.")
        Payload(func() {
            Token("token", String, func() {
                Description("JWT used for authentication")
            })
            Required("token")
        })
        HTTP(func() { GET("/secure") })
    })

    Method("unsecure", func() {
        Description("This method is not secured.")
        // Remove all security requirements for this method
        NoSecurity()
    })
})
```

## Removing Security with NoSecurity()

Sometimes you need to make certain endpoints publicly accessible, such as health checks 
or public documentation endpoints. The `NoSecurity()` function removes any security 
requirements from a method:

```go
Method("health", func() {
    Description("Public health check endpoint")
    NoSecurity()
    HTTP(func() { GET("/health") })
})
```

## Best Practices

When implementing security in your Goa services, follow these guidelines for the best 
results:

[Learn more about Security Best Practices →](5-best-practices.md)

1. Define security schemes at the API level for consistent default behavior
2. Override security at the service level only when a service needs different 
   authentication
3. Use method-level security sparingly, for exceptional cases
4. Always use `NoSecurity()` explicitly when making endpoints public
5. Include clear descriptions in your security schemes to help API consumers
6. Always use HTTPS in production
7. Implement rate limiting for API key authentication
8. Use appropriate token expiration times for JWT tokens
9. Regularly rotate secrets and keys
10. Log and monitor authentication failures

## Generated Code

Goa automatically generates the necessary code to enforce your security requirements. 
The generated code provides several benefits:

### Generated Security Features

When you define security requirements in your Goa design, the framework
generates comprehensive security middleware that handles all the essential
authentication tasks. This middleware automatically extracts credentials from
incoming requests, validates them against your defined requirements, manages
authentication errors, and enforces any scope requirements you've specified for
OAuth2 or JWT authentication.

The security definitions are also reflected in the generated OpenAPI/Swagger
documentation, making it easy for API consumers to understand your
authentication requirements. The documentation clearly outlines what
authentication methods are supported, what scopes are required for different
endpoints, the expected format for credentials, and what error responses clients
should handle.

To ensure type safety and maintainability, Goa generates strongly typed
interfaces and structures for working with security. This includes type-safe
interfaces for implementing security handlers, strongly typed credential
structures that match your security schemes, helper functions for accessing
security information from the request context, and pre-defined error types for
handling various security-related failures. This type safety helps catch
potential security implementation issues at compile time rather than runtime.

This means you can focus on defining your security requirements declaratively,
while Goa handles the implementation details. The generated code is type-safe
and follows Go best practices.
