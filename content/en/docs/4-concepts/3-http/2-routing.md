---
title: "HTTP Routing"
linkTitle: "Routing"
weight: 2
description: "Learn how Goa handles HTTP routing, including path patterns, parameters, wildcards, and best practices for designing clean URLs."
menu:
  main:
    parent: "HTTP Advanced Topics"
    weight: 2
---

Goa provides a powerful routing system that maps HTTP requests to your service methods. This guide covers:

- Basic routing concepts and service definitions
- HTTP methods and URL patterns
- Parameter handling (path, query, and wildcards)
- Response status codes
- Best practices for API design
- Service relationships and nested resources

## Basic Routing

In Goa, routes are defined in your design using the `HTTP` function within a Service definition. The `HTTP` function allows you to specify how your service methods are exposed over HTTP.

Here's a basic example:

```go
var _ = Service("calculator", func() {
    // Define service-wide HTTP settings
    HTTP(func() {
        // Set a base path for all endpoints in this service
        Path("/calculator")
    })

    Method("add", func() {
        // Define method payload
        Payload(func() {
            // Field order matters - tag 1 is first
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
        })
        // Define method result
        Result(Int)
        // Define HTTP transport
        HTTP(func() {
            POST("/add")     // Handles POST /calculator/add
        })
    })
})
```

The above example:
1. Creates a service named "calculator"
2. Sets a base path "/calculator" for all endpoints
3. Defines an "add" method that:
   - Takes two integers as input
   - Returns an integer
   - Is accessible via HTTP POST at "/calculator/add"

## HTTP Methods and Paths

Goa supports all standard HTTP methods through dedicated DSL functions: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, and `TRACE`. A single service method can handle multiple HTTP methods or paths:

```go
Method("manage_user", func() {
    Description("Create or update a user")
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // Create user
        PUT("/users/{user_id}") // Update existing user
        Response(StatusOK)      // 200 for updates
        Response(StatusCreated) // 201 for creation
    })
})
```

## Parameter Handling

### Path Parameters

You can capture dynamic values from the URL path using parameters. Path parameters are defined using curly braces `{parameter_name}` and are automatically mapped to payload fields.

```go
Method("get_user", func() {
    Description("Retrieve a user by their ID")
    Payload(func() {
        // The user_id field will be populated from the URL path
        Field(1, "user_id", String, "User ID from the URL path")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // Maps {user_id} to payload.UserID
    })
})
```

### Parameter Types and Mapping

In Goa, parameter types are defined in the payload definition, not in the URL pattern. The URL pattern only defines how to map transport names to payload fields.

1. **Simple Payload with Primitive Type**
   ```go
   Method("get_user", func() {
       // When payload is a primitive type, it maps directly to the path parameter
       Payload(String, "User ID")
       Result(User)
       HTTP(func() {
           GET("/users/{user_id}")  // user_id value becomes the payload
       })
   })
   ```

2. **Structured Payload with Direct Mapping**
   ```go
   Method("get_user", func() {
       Payload(func() {
           // Parameter type (Int) is defined here in the payload
           Field(1, "user_id", Int, "User ID")
       })
       Result(User)
       HTTP(func() {
           GET("/users/{user_id}")  // Maps directly to payload.UserID
       })
   })
   ```

3. **Transport Name Mapping**
   ```go
   Method("get_user", func() {
       Payload(func() {
           // Internal field name is "id"
           Field(1, "id", Int, "User ID")
       })
       HTTP(func() {
           // Use user_id in URL but map to payload.ID
           GET("/users/{user_id:id}")
       })
   })
   ```

The `{name:field}` syntax in the path pattern is used for name mapping only:
- `name` is what appears in the URL
- `field` is the name of the field in your payload

For primitive payloads, the path parameter value becomes the entire payload:

```go
Method("download", func() {
    // Entire payload is a string representing the file path
    Payload(String, "Path to file")
    HTTP(func() {
        GET("/files/{*path}")  // Captured path becomes the payload
    })
}

Method("get_version", func() {
    // Payload is a simple integer
    Payload(Int, "API version number")
    HTTP(func() {
        GET("/api/{version}")  // version number becomes the payload
    })
})
```

When using structured payloads, you can combine path parameters with other payload fields:

```go
Method("update_user_profile", func() {
    Payload(func() {
        // Path parameter
        Field(1, "id", Int, "User ID")
        // Body fields
        Field(2, "name", String, "User's name")
        Field(3, "email", String, "User's email")
    })
    HTTP(func() {
        PUT("/users/{user_id:id}")  // Maps URL's user_id to payload.ID
        Body("name", "email")       // These fields come from request body
    })
})

### Query Parameters

Query string parameters are defined using the `Param` function and must correspond to payload fields. You can set default values and validation rules:

```go
Method("list_users", func() {
    Description("List users with pagination")
    Payload(func() {
        Field(1, "page", Int, "Page number", func() {
            Default(1)        // Default to page 1
            Minimum(1)        // Page must be positive
        })
        Field(2, "per_page", Int, "Items per page", func() {
            Default(20)       // Default to 20 items
            Minimum(1)
            Maximum(100)      // Limit maximum items
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        // Map payload fields to query parameters
        Param("page")
        Param("per_page")
    })
})

### Wildcards and Catch-all Routes

For flexible path matching, use the asterisk syntax (`*path`) to capture all remaining path segments. The captured value is available in the payload:

```go
Method("serve_files", func() {
    Description("Serve static files from a directory")
    Payload(func() {
        // The path field will contain all segments after /files/
        Field(1, "path", String, "Path to the file")
    })
    HTTP(func() {
        GET("/files/*path")    // Matches /files/docs/image.png
    })
})
```

## API Design Best Practices

### Resource Naming

Use nouns to represent resources and let HTTP methods define the actions:

```go
HTTP(func() {
    // Good - HTTP method indicates the action
    GET("/articles")        // List articles
    POST("/articles")       // Create article
    GET("/articles/{id}")   // Get one article
    PUT("/articles/{id}")   // Update article
    DELETE("/articles/{id}") // Delete article

    // Avoid - action in URL
    GET("/list-articles")
    POST("/create-article")
})
```

### Consistent Pluralization

Use plural nouns for collection endpoints and maintain consistency:

```go
HTTP(func() {
    // Good - consistent use of plural
    GET("/users")          // List users
    GET("/users/{id}")     // Get one user
    POST("/users")         // Create user
    
    // Avoid mixing singular and plural
    GET("/user")          // Don't use singular
    GET("/users/{id}")    // Don't mix conventions
})
```

### Path Prefix Hierarchy

Goa allows you to define path prefixes at different levels of your API design:

1. **API Level** - Applies to all services:
```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // Global prefix for all services
    })
})
```

2. **Service Level** - Applies to all methods in a service:
```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1/users")  // Prefix for all methods in this service
    })
})
```

The final URL path is constructed by combining these prefixes in order. For example:

```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // API-level prefix
    })

    Service("users", func() {
        HTTP(func() {
            Path("/v1/users")  // Service-level prefix
        })

        Method("show", func() {
            Payload(func() {
                Field(1, "id", Int)
            })
            HTTP(func() {
                GET("/{id}")  // Method path
            })
        })
    })
})
```

This results in the path `/api/v1/users/{id}` for the show method.

### API Versioning

Version your API using path prefixes:

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1")  // All endpoints will be under /v1
    })
    
    Method("list", func() {
        HTTP(func() {
            GET("/users")  // Final path: /v1/users
        })
    })
})
```

## Service Relationships

### Parent Services

Goa provides the `Parent` DSL to establish relationships between services. When you specify a parent service:
1. The parent service's canonical path is used as a prefix for all the child service's HTTP endpoints
2. Parent method payload attributes that map to path parameters are automatically merged into child method payloads

### Canonical Methods

By default, Goa uses the "show" method as the canonical method for a service.
The canonical method's HTTP path is used as the prefix for all child service
endpoints. You can override this using the `CanonicalMethod` function in the
service's HTTP expression.

Here's an example:

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/users/{user_id}")
        // Override the default "show" method
        CanonicalMethod("get")
    })
    
    Method("get", func() {
        Payload(func() {
            Field(1, "user_id", String)
        })
        HTTP(func() {
            GET("")  // Results in /users/{user_id}
        })
    })
})

var _ = Service("posts", func() {
    // Specify users as the parent service
    Parent("users")
    
    Method("list", func() {
        // user_id is automatically inherited from parent's canonical method payload
        HTTP(func() {
            GET("/posts")  // Results in /users/{user_id}/posts
        })
    })
})
```

In this example:
1. The `users` service specifies "get" as its canonical method instead of the default "show"
2. The canonical method's path (`/users/{user_id}`) becomes the prefix for all child service endpoints
3. The `posts` service inherits this prefix and the `user_id` parameter from the parent's canonical method
4. The final path for the `list` method becomes `/users/{user_id}/posts`

### Nested Resources

Express resource relationships through nested paths. This can be done either using the Parent DSL (as shown above) or by explicitly defining nested paths:

```go
var _ = Service("social", func() {
    // Define methods for user resources
    Method("list_users", func() {
        HTTP(func() {
            GET("/users")  // List all users
        })
    })

    Method("get_user", func() {
        Payload(func() {
            Field(1, "user_id", String, "User ID")
        })
        HTTP(func() {
            GET("/users/{user_id}")  // Get a specific user
        })
    })

    // Methods for posts under a user
    Method("list_user_posts", func() {
        Payload(func() {
            Field(1, "user_id", String, "User ID")
            Field(2, "limit", Int, "Maximum number of posts to return")
        })
        HTTP(func() {
            GET("/users/{user_id}/posts")  // List posts for a user
            Param("limit")  // Query parameter
        })
    })

    Method("create_user_post", func() {
        Payload(func() {
            Field(1, "user_id", String, "User ID")
            Field(2, "title", String, "Post title")
            Field(3, "content", String, "Post content")
        })
        HTTP(func() {
            POST("/users/{user_id}/posts")  // Create a post for a user
            Body("title", "content")  // These fields go in the request body
        })
    })

    // Methods for comments under a post
    Method("list_post_comments", func() {
        Payload(func() {
            Field(1, "user_id", String, "User ID")
            Field(2, "post_id", String, "Post ID")
        })
        HTTP(func() {
            GET("/users/{user_id}/posts/{post_id}/comments")  // List comments on a post
        })
    })
})
```

This approach:
1. Creates a clear hierarchy in your URLs (users → posts → comments)
2. Makes relationships between resources explicit
3. Maintains consistency in how nested resources are accessed
4. Allows for proper scoping of operations (e.g., posts within a specific user)

You can also use service-wide path prefixes to group related endpoints:

```go
var _ = Service("social", func() {
    HTTP(func() {
        Path("/v1/social")  // Prefix for all endpoints in this service
    })
    
    Method("list_users", func() {
        HTTP(func() {
            GET("/users")  // Final path: /v1/social/users
        })
    })
    
    Method("get_user_posts", func() {
        HTTP(func() {
            GET("/users/{user_id}/posts")  // Final path: /v1/social/users/{user_id}/posts
        })
    })
})
```

## Generated Code

Goa generates all the necessary routing code based on your design. The generated code includes:

1. **URL Mapping**: Routes HTTP requests to the appropriate service methods
2. **Parameter Handling**: 
   - Extracts and validates path parameters
   - Processes query parameters
   - Handles request bodies
3. **Content Negotiation**: 
   - Handles Accept headers
   - Manages response formats
4. **Error Handling**:
   - Maps errors to HTTP status codes
   - Generates consistent error responses

This means you can focus on implementing your business logic while Goa handles
all the HTTP transport details.