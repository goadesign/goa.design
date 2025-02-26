---
title: "Types and Validation"
description: "Understanding how Goa handles types, pointers, and validation in generated code"
weight: 8
---

## Validation Enforcement

Goa takes a pragmatic approach to validation, balancing performance with
robustness. The framework validates data at system boundaries while trusting
internal operations:

* **Server-side**: Validates incoming requests
* **Client-side**: Validates incoming responses
* **Internal code**: Trusted to maintain invariants

This approach ensures your code always receives valid data while avoiding
unnecessary validation overhead for internal operations.

## Generated Struct Fields and Pointers

The code generation algorithms in Goa carefully consider when to use pointers
for struct fields. The goal is to minimize pointer usage while maintaining type
safety and proper null handling.

### Rules for Primitive Types

When Goa generates code, it needs to make decisions about how to represent
fields in the generated structs. One of the key decisions is whether to use a
pointer (*) or a direct value (-) for primitive types (like `string`, `int`,
`bool`, etc.).

#### Understanding the Terms

Before diving into the rules, let's clarify the key terms:

- **Payload/Result**: These are the method arguments and return values in your service design
  - Payload: The data your service method receives (e.g., `method (payload *CreateUserPayload)`)
  - Result: The data your service method returns (e.g., `returns (UserResult)`)

- **Request/Response Bodies**: These are the HTTP or gRPC transport-level structures
  - Request Body: The data structure that carries the incoming HTTP/gRPC request data
  - Response Body: The data structure that carries the outgoing HTTP/gRPC response data

For example, in a REST API:
```go
// In your design:
var _ = Service("users", func() {
    Method("create", func() {
        Payload(func() {
            Field(1, "name", String)  // This is a payload field
            Required("name")
        })
        Result(func() {
            Field(1, "id", Int)      // This is a result field
        })
        HTTP(func() {
            POST("/users")
            Response(StatusOK)
        })
    })
})

// Goa generates:
type CreatePayload struct {
    Name string            // Payload field
}

type CreateRequestBody struct {
    Name *string           // Request body field
}

type CreateResult struct {
    ID int                // Result field
}

type CreateResponseBody struct {
    ID int                // Response body field
}
```

The rules vary depending on:
1. Whether the field is required or has a default value
2. Where the field is being used (payload, request, response)
3. Which side of the communication it's on (server or client)

Here's a detailed breakdown:

| Properties | Payload/Result | Request Body (Server) | Response Body (Server) | Request Body (Client) | Response Body (Client) |
|------------|---------------|----------------------|---------------------|-------------------|-------------------|
| Required OR Default | Direct (-) | Pointer (*) | Direct (-) | Direct (-) | Pointer (*) |
| Not Required, No Default | Pointer (*) | Pointer (*) | Pointer (*) | Pointer (*) | Pointer (*) |

Let's break this down with examples:

1. **Required or Default Value Fields**:
   - In most cases, these use direct values (not pointers)
   - Example: A required `name string` field in a payload will be generated as `Name string`
   - Exception: Server request bodies and client response bodies use pointers for better null handling

2. **Optional Fields (Not Required, No Default)**:
   - Always use pointers across all contexts
   - Example: An optional `age int` field will be generated as `Age *int`
   - This allows distinguishing between an unset value (nil) and zero value (0)

3. **Special Types**:
   - Objects (structs): Always use pointers regardless of required/optional status
   - Arrays and Maps: Never use pointers as they are already reference types
   - Example: `[]string` or `map[string]int` (not `*[]string` or `*map[string]int`)

The reasoning behind these rules:
- Pointers allow for explicit nil values, useful for optional fields
- Direct values are more efficient when we know a value will always be present
- The asymmetry in request/response handling helps with proper serialization and validation

**Example Scenario**:
```go
// For a design with these fields:
//   - name:     string (required)
//   - age:      int    (optional)
//   - hobbies:  []string
//   - metadata: map[string]string

// The generated struct in the service package would look like:
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

## Default Value Handling

Default values specified in the design are used in two key scenarios:

### 1. During Marshaling (Outgoing Data)

When marshaling data for output, default values play an important role in
handling nil values. For array and map fields that are nil, the default values
specified in the design are used to initialize them. However, this doesn't apply
to primitive fields since they cannot be nil - they always have their zero value
(0 for numbers, "" for strings, etc).

### 2. During Unmarshaling (Incoming Data)

When unmarshaling incoming data, default values are only applied to optional
fields that are missing from the input. If a required field is missing, this
will trigger a validation error instead of applying a default value. For gRPC
specifically, there is special handling for default values during unmarshaling -
see the [gRPC Unmarshaling](../4-grpc/7-unmarshalling) section for
details.

### Best Practices

* Use default values to provide sensible fallbacks for optional fields
* Consider the impact on API versioning when changing default values
* Document default values clearly in your API specification 