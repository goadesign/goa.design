---
title: "Service Design"
linkTitle: "Service Design"
weight: 2
description: "Learn how to design gRPC services in Goa, including service definitions, message types, and type system"
---

This guide explains how to design gRPC services using Goa's DSL, focusing on
service definitions and message types. For a comprehensive overview of Goa's
type system and data modeling capabilities, please refer to the [Data
Modeling](/docs/concepts/design-language/data-modeling) guide.

## Service Definition

A Goa gRPC service is defined using the `Service` DSL with the `GRPC` transport enabled:

```go
var _ = Service("calculator", func() {
    Description("The Calculator service performs arithmetic operations")

    // Enable gRPC transport
    GRPC(func() {
        // Service-level gRPC settings
        Metadata("package", "calculator.v1")
        Metadata("go.package", "calculatorpb")
    })

    // Service methods...
})
```

### Method Definition

Methods define the operations your service provides. The `GRPC` DSL can be used
at the method level to customize request/response handling:

```go
Method("add", func() {
    Description("Add two numbers")

    // Input message
    Payload(func() {
        Field(1, "a", Int, "First operand")
        Field(2, "b", Int, "Second operand")
        Required("a", "b")
    })

    // Output message
    Result(func() {
        Field(1, "sum", Int, "Result of addition")
        Required("sum")
    })

    // Method-specific gRPC settings
    GRPC(func() {
        // Define success response
        Response(CodeOK)
        
        // Define error responses
        Response("not_found", CodeNotFound)
        Response("invalid_argument", CodeInvalidArgument)
    })
})
```

### Request-Response Customization

The `GRPC` DSL provides several functions to customize how data is transmitted:

#### Message Customization

Use `Message` to customize which payload fields go into the gRPC request message:

```go
var CreatePayload = Type("CreatePayload", func() {
    Field(1, "name", String, "Name of account")
    TokenField(2, "token", String, "JWT token")
    Field(3, "metadata", String, "Additional info")
})

Method("create", func() {
    Payload(CreatePayload)
    
    GRPC(func() {
        // Only include specific fields in request message
        Message(func() {
            Attribute("name")
            Attribute("metadata")
        })
        Response(CodeOK)
    })
})
```

#### Metadata Handling

Use `Metadata` to specify which payload fields should be sent as gRPC metadata instead of in the message body:

```go
Method("create", func() {
    Payload(CreatePayload)
    
    GRPC(func() {
        // Send token in metadata
        Metadata(func() {
            Attribute("token")
        })
        Response(CodeOK)
    })
})
```

> Note: Security-related attributes (defined using `TokenField` or with
> `Security` scheme) are automatically included in the request metadata unless
> explicitly included in the message using `Message`.

#### Response Headers and Trailers

Control response metadata using `Headers` and `Trailers`:

```go
var CreateResult = ResultType("application/vnd.create", func() {
    Field(1, "name", String, "Resource name")
    Field(2, "id", String, "Resource ID")
    Field(3, "status", String, "Processing status")
})

Method("create", func() {
    Result(CreateResult)
    
    GRPC(func() {
        Response(func() {
            Code(CodeOK)
            // Send ID in response headers
            Headers(func() {
                Attribute("id")
            })
            // Send status in trailers
            Trailers(func() {
                Attribute("status")
            })
        })
    })
})
```

## Message Types in gRPC

When designing gRPC services, you'll use Goa's type system to define your
message types. The main difference from regular type definitions is the use of
the `Field` DSL instead of `Attribute` to specify Protocol Buffer field numbers.

### Field Numbering

Follow Protocol Buffer best practices for field numbers:

1. Use numbers 1-15 for frequently occurring fields (1-byte encoding)
2. Use numbers 16-2047 for less frequent fields (2-byte encoding)
3. Reserve numbers for backward compatibility

```go
Method("createUser", func() {
    Payload(func() {
        // Frequently used fields (1-byte encoding)
        Field(1, "id", String)
        Field(2, "name", String)
        Field(3, "email", String)

        // Less frequently used fields (2-byte encoding)
        Field(16, "preferences", func() {
            Field(1, "theme", String)
            Field(2, "language", String)
        })
    })
})
```

### Using Complex Types

You can use all the type system features described in the [Data Modeling](/docs/concepts/design-language/data-modeling) guide in your gRPC services. Here's how to use some common patterns:

#### Structs and Nested Types

```go
var Address = Type("Address", func() {
    Field(1, "street", String)
    Field(2, "city", String)
    Field(3, "country", String)
    Required("street", "city", "country")
})

var User = Type("User", func() {
    Field(1, "id", String)
    Field(2, "name", String)
    Field(3, "address", Address)  // Nested type
    Required("id", "name")
})
```

#### OneOf Types

Use `OneOf` for mutually exclusive fields:

```go
var ContactInfo = Type("ContactInfo", func() {
    OneOf("contact", func() {
        Field(1, "email", String)
        Field(2, "phone", String)
        Field(3, "address", Address)
    })
})
```

## Best Practices

### Forward Compatibility

Design messages for future extensibility:

1. Use optional fields for new additions
2. Reserve field numbers and names
3. Group related fields in nested messages

```go
var UserProfile = Type("UserProfile", func() {
    // Current version fields
    Field(1, "basic_info", func() {
        Field(1, "name", String)
        Field(2, "email", String)
    })

    // Reserved for future use
    Reserved(2, 3, 4)
    ReservedNames("location", "department")

    // Extension point
    Field(5, "extensions", MapOf(String, Any))
})
```

### Documentation

Add comprehensive documentation:

```go
var _ = Service("users", func() {
    Description("The users service manages user accounts and profiles")

    Method("create", func() {
        Description("Create a new user account")

        Payload(func() {
            Field(1, "username", String, "Unique username for the account")
            Field(2, "email", String, "Primary email address")
            Field(3, "full_name", String, "User's full name")
            Example("username", "johndoe")
            Example("email", "john@example.com")
        })

        Result(func() {
            Field(1, "id", String, "Unique identifier for the created user")
            Field(2, "created_at", String, func() {
                Format(FormatDateTime)
                Description("Timestamp of account creation")
            })
        })
    })
})
```

For more information about validation rules, built-in formats, and examples,
refer to the [Data Modeling](/docs/concepts/design-language/data-modeling) guide. 