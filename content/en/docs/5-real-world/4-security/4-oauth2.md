---
title: OAuth2 Authentication
description: Learn how to implement OAuth2 Authentication in your Goa API
weight: 4
---

OAuth2 is a widely-used protocol that enables applications to securely access data on 
behalf of users without needing their passwords. Think of it like a hotel key card 
system - guests get temporary access to specific areas without having the master key.

Goa provides two ways to work with OAuth2:

1. **Implementing an OAuth2 Provider**: Create your own authorization server that 
   issues tokens to client applications. This is like being the hotel - you issue and 
   manage the key cards.

2. **Using OAuth2 to Secure Services**: Protect your API endpoints using OAuth2 
   tokens, typically from an external provider like Google or your own OAuth2 
   provider. This is like being a shop in the hotel that accepts the hotel's key 
   cards.

Let's explore both approaches in detail.

## Part 1: Implementing an OAuth2 Provider

If you want to create your own OAuth2 authorization server (like Google's or 
GitHub's), Goa provides a complete implementation through its 
[goadesign/oauth2](https://github.com/goadesign/oauth2) package. This implementation 
focuses on the Authorization Code flow, which is the most secure and widely-used 
OAuth2 flow.

### Understanding the Provider Flow

When you implement an OAuth2 provider, you're creating a system that handles three 
main types of requests:

1. **Authorization Request** (from the user)
   - Example: User clicks "Login with MyService" on a client app
   - Your provider shows a permission screen
   - After approval, you send an authorization code to the client app

2. **Token Exchange** (from the client app)
   - Client app sends back the authorization code
   - Your provider validates it and returns access/refresh tokens

3. **Token Refresh** (from the client app)
   - Client app sends a refresh token when access token expires
   - Your provider issues a new access token

### Implementing the Provider

#### Step 1: Define the Provider API

First, create the OAuth2 provider endpoints in your design. This code sets up the 
basic structure of your OAuth2 provider service:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "github.com/goadesign/oauth2"  // Import the OAuth2 provider package
)

var _ = API("oauth2_provider", func() {
    Title("OAuth2 Provider API")
    Description("OAuth2 authorization server implementation")
})

var OAuth2Provider = OAuth2("/oauth2/authorize", "/oauth2/token", func() {
    Description("OAuth2 provider endpoints")
    
    // Configure the authorization code flow
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // Define available scopes
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

This design code:
- Creates a new API specifically for OAuth2 provider functionality
- Defines two main endpoints: "/oauth2/authorize" for user authorization and 
  "/oauth2/token" for token management
- Sets up the authorization code flow with its required endpoints
- Defines two basic scopes that clients can request

#### Step 2: Implement the Provider Interface

The Provider interface is the heart of your OAuth2 implementation. It defines the 
core methods that handle the OAuth2 flow:

```go
type Provider interface {
    // Authorize handles the initial permission request
    Authorize(clientID, scope, redirectURI string) (code string, err error)

    // Exchange trades authorization code for tokens
    Exchange(clientID, code, redirectURI string) (refreshToken, accessToken string, 
        expiresIn int, err error)

    // Refresh provides new access tokens
    Refresh(refreshToken, scope string) (newRefreshToken, accessToken string, 
        expiresIn int, err error)

    // Authenticate verifies client credentials
    Authenticate(clientID, clientSecret string) error
}
```

Each method serves a specific purpose:
- `Authorize`: Called when a user approves access, generates a temporary code
- `Exchange`: Converts the temporary code into access and refresh tokens
- `Refresh`: Issues new access tokens when old ones expire
- `Authenticate`: Validates client credentials before any token operations

#### Step 3: Create the Provider Controller

The controller connects your HTTP endpoints to your Provider implementation:

```go
func NewOAuth2ProviderController(service *goa.Service, provider oauth2.Provider) *OAuth2ProviderController {
    return &OAuth2ProviderController{
        ProviderController: oauth2.NewProviderController(service, provider),
    }
}
```

This controller:
- Takes your Provider implementation as input
- Handles all HTTP routing and request processing
- Manages error responses and status codes
- Ensures OAuth2 protocol compliance

### Provider Security Considerations

When implementing an OAuth2 provider, you need robust security measures. Here are key 
components with their implementations:

#### Token Management

The TokenStore provides secure storage and management of access and refresh tokens:

```go
type TokenStore struct {
    accessTokens  map[string]*TokenInfo
    refreshTokens map[string]*TokenInfo
    mu           sync.RWMutex
}

func (s *TokenStore) StoreToken(info *TokenInfo) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.accessTokens[info.AccessToken] = info
    if info.RefreshToken != "" {
        s.refreshTokens[info.RefreshToken] = info
    }
    return nil
}
```

This implementation:
- Uses separate maps for access and refresh tokens
- Implements thread-safe token storage with a mutex
- Handles both token types in a single operation
- Provides atomic updates to prevent race conditions

#### Client Management

The Client struct manages information about registered OAuth2 clients:

```go
type Client struct {
    ID          string   // Unique identifier for the client
    Secret      string   // Client's secret key for authentication
    RedirectURI string   // Authorized redirect URI
    Scopes      []string // Allowed scopes for this client
    Type        string   // "confidential" or "public"
}
```

This structure:
- Stores essential client credentials
- Tracks allowed redirect URIs to prevent phishing
- Maintains a list of permitted scopes
- Distinguishes between confidential (server-side) and public (client-side) apps

## Part 2: Using OAuth2 to Secure Your Services

If you want to protect your API endpoints using OAuth2 (either your own provider or 
an external one like Google), Goa makes this straightforward.

### Securing Your API

#### Step 1: Define the Security Scheme

This code tells Goa how to protect your API with OAuth2:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var OAuth2Auth = OAuth2Security("oauth2", func() {
    Description("OAuth2 authentication")
    
    // Define which OAuth2 flows you support
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // Define required scopes
    Scope("api:read", "Read access to API")
    Scope("api:write", "Write access to API")
})
```

The security scheme above establishes the core OAuth2 configuration for your
API. By naming it "oauth2", you create a clear identifier that can be referenced
throughout your API design. The scheme specifies your supported OAuth2 flow,
which in this case is the Authorization Code flow - one of the most secure
options available. It also defines the available scopes that clients can request
when accessing your API, allowing for granular access control. Finally, it
configures the necessary authentication endpoints that clients will interact
with during the OAuth2 flow, including authorization, token exchange, and
refresh token endpoints. This comprehensive setup provides everything needed to
implement OAuth2 security in your Goa API.

#### Step 2: Protect Your Endpoints

Here's how to apply OAuth2 security to your API endpoints:

```go
var _ = Service("secure_api", func() {
    Description("API protected by OAuth2")
    
    Method("getData", func() {
        Description("Get protected data")
        
        // Require OAuth2 with specific scope
        Security(OAuth2Auth, func() {
            Scope("api:read")
        })
        
        Payload(func() {
            AccessToken("token", String, "OAuth2 access token")
            Required("token")
        })
        
        HTTP(func() {
            GET("/data")
            Response(StatusOK)
            Response(StatusUnauthorized)
        })
    })
})
```

The endpoint definition above demonstrates how to create a secure API endpoint
using OAuth2 authentication. When a client makes a request to this endpoint,
they must provide a valid OAuth2 access token that includes the "api:read"
scope. The endpoint configuration specifies where this access token should be
included in the request, typically in the Authorization header. To handle both
successful and failed authentication attempts, the endpoint is set up with
appropriate HTTP response codes - returning 200 OK when authentication succeeds
and 401 Unauthorized when it fails. This comprehensive setup ensures that your
API endpoint is properly protected while following OAuth2 best practices.

#### Step 3: Implement Token Validation

This security handler validates incoming OAuth2 tokens:

```go
func (s *service) OAuth2Auth(ctx context.Context, token string, 
    scheme *security.OAuth2Scheme) (context.Context, error) {
    
    // Validate token with your OAuth2 provider
    claims, err := s.validateToken(token)
    if err != nil {
        return ctx, oauth2.Unauthorized("invalid token")
    }
    
    // Check required scopes
    if !hasRequiredScopes(claims.Scopes, scheme.RequiredScopes) {
        return ctx, oauth2.Unauthorized("insufficient scopes")
    }
    
    return ctx, nil
}
```

When a request comes in, this security handler first extracts the OAuth2 token
from the request. It then validates this token by making a call to your OAuth2
provider to ensure the token is legitimate and hasn't expired.

Once validated, the handler verifies that the token includes all the required
scopes for the requested operation. For example, if an endpoint requires the
"api:read" scope, the handler checks that this scope is present in the token's
claims.

If any validation fails - whether the token is invalid, expired, or missing
required scopes - the handler returns an appropriate OAuth2 error response. This
helps client applications understand exactly what went wrong.

For successful requests, the handler adds the validated claims to the request
context. This makes the claims available to your endpoint handlers, allowing
them to access information about the authenticated user and their permissions.

## Best Practices

Whether you're implementing a provider or securing a service, follow these guidelines:

1. **Token Security**
   - Use short-lived access tokens
   - Implement token rotation
   - Securely store tokens

2. **Scope Management**
   - Define granular scopes
   - Validate all requested scopes
   - Follow the principle of least privilege

3. **Error Handling**
   - Return standard OAuth2 error responses
   - Don't leak sensitive information in errors
   - Log security events appropriately

## Learning More

OAuth2 is a complex topic with many security considerations. Here are some valuable 
resources:

- The [OAuth 2.0 Security Best Practices](https://oauth.net/2/security-best-practices/) 
  document is essential reading
- The [OAuth 2.0 Threat Model](https://datatracker.ietf.org/doc/html/rfc6819) 
  helps understand security risks

## Next Steps

- [JWT Authentication](3-jwt.md) - Often used with OAuth2
- [API Key Authentication](2-api-key.md) - A simpler alternative
- [Security Best Practices](5-best-practices.md) - General security guidelines