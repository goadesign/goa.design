---
title: "Customization"
linkTitle: "Customization"
weight: 7
description: "Learn how to customize and extend Goa's code generation using metadata and plugins."
---

## Overview

Metadata allows you to control and customize code generation through simple
tags. Use the `Meta` function to add metadata to your design elements.

### Basic Type Generation Control

By default, Goa only generates types that are used by service methods. If you
define a type in your design but don't reference it in any method parameters or
results, Goa will skip generating it. 

The `"type:generate:force"` metadata tag overrides this behavior. It takes
service names as arguments to specify which services should include the type in
their generated code. If no service names are provided, the type will be
generated for all services:

```go
var MyType = Type("MyType", func() {
    // Force type generation in service1 and service2, even if unused
    Meta("type:generate:force", "service1", "service2")
    Attribute("name", String)
})

var OtherType = Type("OtherType", func() {
    // Force type generation in all services
    Meta("type:generate:force")
    Attribute("id", String)
})
```

### Package Organization

You can control where types are generated using package metadata. By default,
types are generated in their respective service packages, but you can generate
them in a shared package. This is particularly useful when multiple services
need to work with the same Go structs, such as when sharing business logic or
data access code. By generating types in a shared package, you avoid having to
convert between duplicate type definitions across services:

```go
var CommonType = Type("CommonType", func() {
    // Generate in shared types package
    Meta("struct:pkg:path", "types")
    
    Attribute("id", String)
    Attribute("createdAt", String)
})
```

This creates a structure like:
```
project/
├── gen/
│   └── types/              # Shared types package
│       └── common_type.go # Generated from CommonType
```

{{< alert title="Important Notes" color="primary" >}}
- All related types must use the same package path
- Types that reference each other must be in the same package
- The `types` package is commonly used for shared types
- Using a shared package eliminates the need to copy or convert between duplicate type definitions when services share code
{{< /alert >}}

### Field Customization

By default, Goa generates field names by converting attribute names to
CamelCase. For example, an attribute named "user_id" would become "UserID" in
the generated struct. 

Goa also provides default type mappings from design types to Go types:
- `String` → `string`
- `Int` → `int`
- `Int32` → `int32`
- `Int64` → `int64`
- `Float32` → `float32`
- `Float64` → `float64`
- `Boolean` → `bool`
- `Bytes` → `[]byte`
- `Any` → `any`

You can customize individual fields using several metadata tags:

- `struct:field:name`: Override the generated field name
- `struct:field:type`: Override the generated field type
- `struct:tag:*`: Add custom struct tags

Here's an example combining these:

```go
var Message = Type("Message", func() {
    Meta("struct:pkg:path", "types")
    
    Attribute("id", String, func() {
        // Override field name
        Meta("struct:field:name", "ID")
        // Add custom MessagePack tag
        Meta("struct:tag:msgpack", "id,omitempty")
        // Override type with custom type
        Meta("struct:field:type", "bison.ObjectId", "github.com/globalsign/mgo/bson", "bison")
    })
})
```

This generates the following Go struct:

```go
type Message struct {
    ID bison.ObjectId `msgpack:"id,omitempty"`
}
```

{{< alert title="Important Limitations" color="primary" >}}
When using `struct:field:type`:
- The overridden type must support the same marshaling/unmarshaling as the original type
- Goa generates encoding/decoding code based on the original type definition
- Incompatible marshaling behavior will cause runtime errors
{{< /alert >}}

## Protocol Buffer Customization

When working with Protocol Buffers, you can customize the generated protobuf
code using several metadata keys:

### Message Type Names

The `struct:name:proto` metadata allows you to override the generated protobuf
message name. By default, Goa uses the type name from your design:

```go
var MyType = Type("MyType", func() {
    // Changes the protobuf message name to "CustomProtoType"
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "name", String)
})
```

### Field Types

The `struct:field:proto` metadata lets you override the generated protobuf field
type. This is particularly useful when working with well-known protobuf types or
types from other proto files. It accepts up to four arguments:

1. The protobuf type name
2. (Optional) The proto file import path
3. (Optional) The Go type name
4. (Optional) The Go package import path

```go
var MyType = Type("MyType", func() {
    // Simple type override
    Field(1, "status", Int32, func() {
        // Changes from default sint32 to int32
        Meta("struct:field:proto", "int32")
    })

    // Using Google's well-known timestamp type
    Field(2, "created_at", Timestamp, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",           // Proto type
            "google/protobuf/timestamp.proto",     // Proto import
            "Timestamp",                           // Go type
            "google.golang.org/protobuf/types/known/timestamppb") // Go import
    })
})
```

This generates the following protobuf definition:

```protobuf
import "google/protobuf/timestamp.proto";

message MyType {
    int32 status = 1;
    google.protobuf.Timestamp created_at = 2;
}
```

### Import Paths

The `protoc:include` metadata specifies import paths used when invoking the
protoc compiler. You can set it at either the API or service level:

```go
var _ = API("calc", func() {
    // Global import paths for all services
    Meta("protoc:include", 
        "/usr/include",
        "/usr/local/include")
})

var _ = Service("calculator", func() {
    // Service-specific import paths
    Meta("protoc:include", 
        "/usr/local/include/google/protobuf")
    
    // ... service methods ...
})
```

When set on an API definition, the import paths apply to all services. When set
on a service, the paths only apply to that specific service.

{{< alert title="Important Notes" color="primary" >}}
- The `struct:field:proto` metadata must provide all necessary import information when using external proto types
- Import paths in `protoc:include` should point to directories containing .proto files
- Service-level import paths are additional to API-level paths, not replacements
{{< /alert >}}

## OpenAPI Specification Control

### Basic OpenAPI Settings

Control the generation and formatting of OpenAPI specifications:

```go
var _ = API("MyAPI", func() {
    // Control OpenAPI generation
    Meta("openapi:generate", "false")
    
    // Format JSON output
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
})
```

This affects how the OpenAPI JSON is formatted:
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "MyAPI",
    "version": "1.0"
  }
}
```

### Operation and Type Customization

You can customize how operations and types appear in the OpenAPI spec using
several metadata keys:

#### Operation IDs

The `openapi:operationId` metadata lets you customize how operation IDs are
generated. It supports special placeholders that get replaced with actual
values:

- `{service}` - replaced with the service name
- `{method}` - replaced with the method name
- `(#{routeIndex})` - replaced with the route index (only when a method has multiple routes)

For example:
```go
var _ = Service("UserService", func() {
    Method("ListUsers", func() {
        // Generates operationId: "users/list"
        Meta("openapi:operationId", "users/list")  // Static value
    })
    
    Method("CreateUser", func() {
        // Generates operationId: "UserService.CreateUser"
        Meta("openapi:operationId", "{service}.{method}")
    })
    
    Method("UpdateUser", func() {
        // For multiple routes, generates:
        // - "UserService_UpdateUser_1" (first route)
        // - "UserService_UpdateUser_2" (second route)
        Meta("openapi:operationId", "{service}_{method}_{#routeIndex}")
        
        HTTP(func() {
            PUT("/users/{id}")   // First route
            PATCH("/users/{id}") // Second route
        })
    })
})
```

#### Operation Summaries

By default, if no summary is provided via metadata, Goa generates a summary by:
1. Using the method's description if one is defined
2. If no description exists, using the HTTP method and path (e.g., "GET /users/{id}")

The `openapi:summary` metadata allows you to override this default behavior. The
summary appears at the top of each operation and should provide a brief
description of what the operation does.

You can use:
- A static string
- The special placeholder `{path}` which gets replaced with the operation's HTTP path

```go
var _ = Service("UserService", func() {
    Method("CreateUser", func() {
        // Uses this description as the default summary
        Description("Create a new user in the system")
        
        HTTP(func() {
            POST("/users")
        })
    })
    
    Method("UpdateUser", func() {
        // Overrides the default summary
        Meta("openapi:summary", "Handle PUT request to {path}")
        
        HTTP(func() {
            PUT("/users/{id}")
        })
    })
    
    Method("ListUsers", func() {
        // No description or summary metadata
        // Default summary will be: "GET /users"
        
        HTTP(func() {
            GET("/users")
        })
    })
})
```

This generates the following OpenAPI specification:
```json
{
  "paths": {
    "/users": {
      "post": {
        "summary": "Create a new user in the system",
        "operationId": "UserService.CreateUser",
        // ... other operation details ...
      },
      "get": {
        "summary": "GET /users",
        "operationId": "UserService.ListUsers",
        // ... other operation details ...
      }
    },
    "/users/{id}": {
      "put": {
        "summary": "Handle PUT request to /users/{id}",
        "operationId": "UserService.UpdateUser",
        // ... other operation details ...
      }
    }
  }
}
```

{{< alert title="Best Practices" color="primary" >}}
- Keep summaries concise but descriptive
- Use consistent wording across related operations
- Consider including key parameters or constraints in the summary
- Use {path} when the HTTP path provides important context
{{< /alert >}}

#### Type Names

The `openapi:typename` metadata allows you to override how a type appears in the
OpenAPI specification, without affecting the Go type name:

```go
var User = Type("User", func() {
    // In OpenAPI spec, this type will be named "CustomUser"
    Meta("openapi:typename", "CustomUser")
    
    Attribute("id", Int)
    Attribute("name", String)
})
```

#### Example Generation

Goa allows you to specify examples for your types in the design. If no examples
are specified, Goa generates random examples by default. The `openapi:example`
metadata lets you disable this example generation behavior:

```go
var User = Type("User", func() {
    // Specify an example (this will be used in the OpenAPI spec)
    Example(User{
        ID:   123,
        Name: "John Doe",
    })
    
    Attribute("id", Int)
    Attribute("name", String)
})

var Account = Type("Account", func() {
    // Disable example generation for this type
    // No examples will appear in the OpenAPI spec
    Meta("openapi:example", "false")
    
    Attribute("id", Int)
    Attribute("balance", Float64)
})

var _ = API("MyAPI", func() {
    // Disable example generation for all types
    Meta("openapi:example", "false")
})
```

{{< alert title="Note" color="primary" >}}
- By default, Goa generates random examples for types without explicit examples
- Use the `Example()` DSL to specify custom examples
- Use `Meta("openapi:example", "false")` to prevent any example generation
- Setting `openapi:example` to false at the API level affects all types
{{< /alert >}}

### Tags and Extensions

You can add tags and custom extensions to your OpenAPI specification at both the
service and method levels. Tags help group related operations, while extensions
allow you to add custom metadata to your API specification.

#### Service-Level Tags

When applied at the service level, tags are available to all methods in that service:

```go
var _ = Service("UserService", func() {
    // Define tags for the entire service
    HTTP(func() {
        // Add a simple tag
        Meta("openapi:tag:Users")
        
        // Add a tag with description
        Meta("openapi:tag:Backend:desc", "Backend API Operations")
        
        // Add documentation URL to the tag
        Meta("openapi:tag:Backend:url", "http://example.com/docs")
        Meta("openapi:tag:Backend:url:desc", "API Documentation")
    })
    
    // All methods in this service will inherit these tags
    Method("CreateUser", func() {
        HTTP(func() {
            POST("/users")
        })
    })
    
    Method("ListUsers", func() {
        HTTP(func() {
            GET("/users")
        })
    })
})
```

#### Method-Level Tags

You can also apply tags to specific methods, either adding to or overriding service-level tags:

```go
var _ = Service("UserService", func() {
    Method("AdminOperation", func() {
        HTTP(func() {
            // Add additional tags just for this method
            Meta("openapi:tag:Admin")
            Meta("openapi:tag:Admin:desc", "Administrative Operations")
            
            POST("/admin/users")
        })
    })
})
```

#### Custom Extensions

Extensions can be added at multiple levels to customize different parts of the OpenAPI specification:

```go
var _ = API("MyAPI", func() {
    // API-level extension
    Meta("openapi:extension:x-api-version", `"1.0"`)
})

var _ = Service("UserService", func() {
    // Service-level extension
    HTTP(func() {
        Meta("openapi:extension:x-service-class", `"premium"`)
    })
    
    Method("CreateUser", func() {
        // Method-level extension
        HTTP(func() {
            Meta("openapi:extension:x-rate-limit", `{"rate": 100, "burst": 200}`)
            POST("/users")
        })
    })
})
```

This generates the following OpenAPI specification:
```json
{
  "info": {
    "x-api-version": "1.0"
  },
  "tags": [
    {
      "name": "Users",
      "description": "User management operations"
    },
    {
      "name": "Backend",
      "description": "Backend API Operations",
      "externalDocs": {
        "description": "API Documentation",
        "url": "http://example.com/docs"
      }
    },
    {
      "name": "Admin",
      "description": "Administrative Operations"
    }
  ],
  "paths": {
    "/users": {
      "post": {
        "tags": ["Users", "Backend"],
        "x-service-class": "premium",
        "x-rate-limit": {
          "rate": 100,
          "burst": 200
        }
      },
      "get": {
        "tags": ["Users", "Backend"]
      }
    },
    "/admin/users": {
      "post": {
        "tags": ["Users", "Backend", "Admin"],
        "x-service-class": "premium"
      }
    }
  }
}
```

{{< alert title="Important Notes" color="primary" >}}
- Service-level tags apply to all methods in the service
- Method-level tags are added to service-level tags
- Extensions can be added at API, service, and method levels
- Extension values must be valid JSON strings
- Tags help organize and group related operations in API documentation
{{< /alert >}}

