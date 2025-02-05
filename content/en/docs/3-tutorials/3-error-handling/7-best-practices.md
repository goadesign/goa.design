---
title: Best Practices
weight: 7
---

# Best Practices

Implementing robust error handling is essential for building reliable and
maintainable APIs. Here are some best practices to follow when defining and
managing errors in your Goa-based services:

## 1. Consistent Error Naming

Descriptive Names: Use clear and descriptive names for your errors that
accurately reflect the issue. This makes it easier for developers to understand
and handle errors appropriately.

Good Example:

```go
Error("DivByZero", func() { Description("DivByZero is returned when the divisor is zero.") })
```

Bad Example:

```go
Error("Error1", func() { Description("An unspecified error occurred.") })
```

## 2. Prefer ErrorResult Over Custom Types

**Simplicity:** Use the default ErrorResult type for most errors to maintain
simplicity and consistency across your service.

**When to Use Custom Types:** Reserve custom error types for scenarios where
you need to include additional contextual information beyond what ErrorResult
provides.

Using ErrorResult:

```go
var _ = Service("calculator", func() {
    Error("InvalidInput", func() { Description("Invalid input provided.") })
})
```

or:

```go
var _ = Service("calculator", func() {
    Error("InvalidInput", ErrorResult, "Invalid input provided.")
})
```

Using Custom Types:

```go
var _ = Service("calculator", func() {
    Error("InvalidOperation", InvalidOperation, "Unsupported operation.")
})
```

## 3. Utilize DSL Features

**Error Flags:** Leverage DSL features like `Temporary()`, `Timeout()`, and
`Fault()` to provide additional metadata about errors. This enriches the error
information and aids in better client-side handling.

Example:

```go
Error("ServiceUnavailable", func() { 
    Description("ServiceUnavailable is returned when the service is temporarily unavailable.")
    Temporary()
})
```

Descriptions: Always provide meaningful descriptions for your errors to aid in
documentation and client understanding.

## 4. Document Errors Thoroughly

**Clear Descriptions:** Ensure that each error has a clear and concise
description. This helps clients understand the context and reason for the error.

**Generated Documentation:** Take advantage of Goa's ability to generate
documentation from your DSL definitions. Well-documented errors enhance the
developer experience for API consumers.

Example:

```go
Error("AuthenticationFailed", ErrorResult, Description("AuthenticationFailed is returned when user credentials are invalid."))
```

## 5. Implement Proper Error Mapping

**Transport Consistency:** Ensure that errors are consistently mapped to
appropriate transport-specific status codes (HTTP, gRPC) to provide meaningful
responses to clients.

**Automate Mappings:** Use Goa's DSL to define these mappings, reducing the risk
of inconsistencies and boilerplate code.

Example: 

```go
var _ = Service("auth", func() {
    Error("InvalidToken", func() {
        Description("InvalidToken is returned when the provided token is invalid.")
    })

    HTTP(func() {
        Response("InvalidToken", StatusUnauthorized)
    })

    GRPC(func() {
        Response("InvalidToken", CodeUnauthenticated)
    })
})
```

## 6. Test Error Handling

**Automated Tests:** Write automated tests to ensure that errors are correctly
defined, mapped, and handled. This helps catch issues early in the development
process.

**Client Simulations:** Simulate client interactions to verify that errors are
communicated as expected across different transports.

Example Test Case:

```go
func TestDivideByZero(t *testing.T) {
    svc := internal.NewDividerService()
    _, err := svc.Divide(context.Background(), &divider.DividePayload{A: 10, B: 0})
    if err == nil {
        t.Fatalf("expected error, got nil")
    }
    if serr, ok := err.(*goa.ServiceError); !ok || serr.Name != "DivByZero" {
        t.Fatalf("expected DivByZero error, got %v", err)
    }
}
```

## Conclusion

Adhering to these best practices ensures that your Goa-based services have a
robust and consistent error handling mechanism. By leveraging Goa's DSL
features, maintaining clear and descriptive error definitions, and implementing
thorough testing, you can build APIs that are both developer-friendly and
reliable for end-users.
