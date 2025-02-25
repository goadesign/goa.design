---
title: "Cross-Origin Resource Sharing (CORS)"
description: "Configure CORS policies in your Goa services using the CORS plugin"
weight: 4
---

# Cross-Origin Resource Sharing (CORS)

Cross-Origin Resource Sharing (CORS) is a security feature implemented by web
browsers that controls how web pages in one domain can request and interact with
resources in a different domain. When building APIs that need to be accessed by
web applications hosted on different domains, proper CORS configuration is
essential. You can learn more about CORS on
[MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

Goa provides a powerful
[CORS plugin](https://github.com/goadesign/plugins/tree/v3/cors) that makes it
easy to define and implement CORS policies for your services. The plugin handles
all the necessary HTTP headers and preflight requests automatically, allowing
you to focus on defining your access policies.

## Setting Up the CORS Plugin

To use CORS functionality in your Goa design, you'll need to import both the
CORS plugin and the standard Goa DSL packages:

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

## Defining CORS Policies

CORS policies can be defined at two levels in your Goa design:

1. API-level: These policies apply globally to all endpoints across all services
2. Service-level: These policies apply only to endpoints within a specific service

The CORS plugin provides several functions to configure various aspects of your CORS policy:

- `Origin`: Specifies allowed origins (domains) that can access your API
- `Methods`: Defines allowed HTTP methods
- `Headers`: Specifies allowed HTTP headers
- `Expose`: Lists headers that browsers are allowed to access
- `MaxAge`: Sets how long browsers should cache preflight request results
- `Credentials`: Enables sending cookies and HTTP authentication information

### Example: Service-Level CORS Configuration

Here's an example showing different ways to configure CORS at the service level:

```go
var _ = Service("calc", func() {
    // Allow requests only from "localhost"
    cors.Origin("localhost")

    // Allow requests from any subdomain of domain.com
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // Allow requests from any origin
    cors.Origin("*")

    // Allow requests from origins matching a regular expression
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

### Complete Design Example

Here's a complete example showing how to implement CORS at both API and service
levels in a calculator service:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = API("calc", func() {
    Title("CORS Example Calc API")
    Description("This API demonstrates the use of the goa CORS plugin")
    
    // API-level CORS policy
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})

var _ = Service("calc", func() {
    Description("The calc service exposes public endpoints that defines CORS policy.")
    
    // Service-level CORS policy
    cors.Origin("/.*localhost.*/", func() {
        cors.Methods("GET", "POST")
        cors.Expose("X-Time", "X-Api-Version")
        cors.MaxAge(100)
    })

    Method("add", func() {
        // ... Same as usual ...
    })
})
```

## How It Works

When you enable the CORS plugin in your design, Goa automatically:

1. Generates a CORS handler that processes preflight (OPTIONS) requests from
   browsers
2. Adds appropriate CORS headers to all HTTP endpoint responses based on your
   policy definitions
3. Handles the complex logic of matching origins against patterns and regular
   expressions
4. Manages caching headers and credentials as specified in your design

The plugin takes care of all the low-level CORS implementation details, allowing
you to focus on defining your security policies at a high level using the DSL.
