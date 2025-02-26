---
title: API Key Authentication
description: Learn how to implement API Key Authentication in your Goa API
weight: 2
---

API Key authentication is a simple and popular way to secure APIs. It involves 
distributing unique keys to clients who then include these keys in their requests. 
This method is particularly useful for public APIs where you want to track usage, 
implement rate limiting, or provide different access levels to different clients.

## How API Key Auth Works

API Keys can be transmitted in several ways:
1. As a header (most common)
2. As a query parameter
3. In the request body

The most secure method is using headers, typically with a name like `X-API-Key`
or `Authorization`.

## Implementing API Key Auth in Goa

### 1. Define the Security Scheme

First, define your API Key security scheme in your design package:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// APIKeyAuth defines our security scheme
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key security")
    Header("X-API-Key")  // Specify header name
})
```

You can also use query parameters instead of headers:

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key security")
    Query("api_key")  // Specify query parameter name
})
```

### 2. Apply the Security Scheme

Like other security schemes, API Key auth can be applied at different levels:

```go
// API level - applies to all services and methods
var _ = API("secure_api", func() {
    Security(APIKeyAuth)
})

// Service level - applies to all methods in the service
var _ = Service("secure_service", func() {
    Security(APIKeyAuth)
})

// Method level - applies only to this method
Method("secure_method", func() {
    Security(APIKeyAuth)
})
```

### 3. Define the Payload

For methods that use API Key auth, include the key in the payload:

```go
Method("getData", func() {
    Security(APIKeyAuth)
    Payload(func() {
        APIKey("api_key", "key", String, func() {
            Description("API key for authentication")
            Example("abcdef123456")
        })
        Required("key")
        
        // Additional payload fields
        Field(1, "query", String, "Search query")
    })
    Result(ArrayOf(String))
    Error("unauthorized")
    HTTP(func() {
        GET("/data")
        // Map the key to the header
        Header("key:X-API-Key")
        Response("unauthorized", StatusUnauthorized)
    })
})
```

### 4. Implement the Security Handler

When Goa generates the code, you'll need to implement a security handler:

```go
// SecurityAPIKeyFunc implements the authorization logic for API Key auth
func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    // Implement your key validation logic here
    valid, err := s.validateAPIKey(key)
    if err != nil {
        return ctx, err
    }
    if !valid {
        return ctx, genservice.MakeUnauthorized(fmt.Errorf("invalid API key"))
    }
    
    // You can add key-specific data to the context
    ctx = context.WithValue(ctx, "api_key_id", key)
    return ctx, nil
}

func (s *service) validateAPIKey(key string) (bool, error) {
    // Implementation of key validation
    // This could check against a database, cache, etc.
    return key == "valid-key", nil
}
```

## Best Practices for API Key Auth

### 1. Key Generation

Generate strong, random API keys:

```go
func GenerateAPIKey() string {
    // Generate 32 random bytes
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        panic(err)
    }
    // Encode as base64
    return base64.URLEncoding.EncodeToString(bytes)
}
```

### 2. Key Storage

Store API keys securely:
- Hash keys before storing them
- Use secure key-value stores or databases
- Implement key rotation mechanisms

Example key storage schema:

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL,
    client_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### 4. Key Metadata

Associate metadata with API keys for better control:

```go
type APIKeyMetadata struct {
    ClientID    string
    Plan        string    // e.g., "free", "premium"
    Permissions []string  // e.g., ["read", "write"]
    ExpiresAt   time.Time
}

func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    metadata, err := s.getAPIKeyMetadata(key)
    if err != nil {
        return ctx, err
    }
    
    // Add metadata to context
    ctx = context.WithValue(ctx, "api_key_metadata", metadata)
    return ctx, nil
}
```

## Example Implementation

Here's a complete example showing how to implement API Key auth in a Goa service:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Authenticate using an API key")
    Header("X-API-Key")
})

var _ = API("weather_api", func() {
    Title("Weather API")
    Description("Weather forecast API with API key authentication")
    
    // Apply API key auth by default
    Security(APIKeyAuth)
})

var _ = Service("weather", func() {
    Description("Weather forecast service")
    
    Method("forecast", func() {
        Description("Get weather forecast")
        
        Payload(func() {
            // API key will be automatically included
            Field(1, "location", String, "Location to get forecast for")
            Field(2, "days", Int, "Number of days to forecast")
            Required("location")
        })
        
        Result(func() {
            Field(1, "location", String, "Location")
            Field(2, "forecast", ArrayOf(WeatherDay))
        })
        
        HTTP(func() {
            GET("/forecast/{location}")
            Param("days")
            Response(StatusOK)
            Response(StatusUnauthorized, func() {
                Description("Invalid or missing API key")
            })
            Response(StatusTooManyRequests, func() {
                Description("Rate limit exceeded")
            })
        })
    })
    
    // Public endpoint example
    Method("health", func() {
        Description("Health check endpoint")
        NoSecurity()
        Result(String)
        HTTP(func() {
            GET("/health")
        })
    })
})

// WeatherDay defines the weather forecast for a single day
var WeatherDay = Type("WeatherDay", func() {
    Field(1, "date", String, "Forecast date")
    Field(2, "temperature", Float64, "Temperature in Celsius")
    Field(3, "conditions", String, "Weather conditions")
    Required("date", "temperature", "conditions")
})
```

## Generated Code

Goa generates several components for API Key auth:

1. **Security Types**
   - Types for API key
   - Error types for authentication failures

2. **Middleware**
   - Extracts API key from request
   - Calls your security handler
   - Handles authentication errors

3. **OpenAPI Documentation**
   - Documents security requirements
   - Shows API key location (header/query)
   - Documents error responses

## Common Issues and Solutions

### 1. Key Not Being Sent

If the API key isn't being sent correctly, check:
- Header name matches exactly
- Key format is correct
- Client is actually sending the key

### 2. Performance Considerations

For high-traffic APIs:
- Cache API key validation results
- Use fast key-value stores
- Implement key prefixing for quick invalidation

Example caching implementation:

```go
func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    // Check cache first
    if metadata, found := s.cache.Get(key); found {
        return context.WithValue(ctx, "api_key_metadata", metadata), nil
    }
    
    // Validate key and get metadata
    metadata, err := s.validateAPIKey(key)
    if err != nil {
        return ctx, err
    }
    
    // Cache the result
    s.cache.Set(key, metadata, time.Minute*5)
    return context.WithValue(ctx, "api_key_metadata", metadata), nil
}
```

## Next Steps

- Learn about [JWT Authentication](3-jwt.md)
- Explore [OAuth2 Authentication](4-oauth2.md)
- Read about [Security Best Practices](5-best-practices.md)