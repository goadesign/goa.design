---
title: "API Definition"
linkTitle: "API"
weight: 2
description: >
  Define your API's global properties using Goa's API DSL. Configure metadata, documentation, servers, and global settings.
---

## API Definition

The `API` function is a top-level DSL that defines the global properties of your service. It acts as the root of your design and establishes the foundation for all other components. Each design package can contain only one API declaration, which serves as the entry point for your service definition.

### Purpose and Usage

The API definition serves several important purposes:
- Provides metadata for API documentation
- Configures server endpoints and variables
- Establishes global settings for all services
- Defines documentation and licensing information
- Sets up contact and support details

### Basic Structure

Here's a minimal API definition:

```go
var _ = API("calculator", func() {
    Title("Calculator API")
    Description("A simple calculator service")
    Version("1.0.0")
})
```

This creates an API named "calculator" with basic documentation. The API name should be a valid Go identifier as it's used in generated code.

### Complete Example

Here's a comprehensive example showing all available API options with detailed explanations:

```go
var _ = API("bookstore", func() {
    // Basic API information - used in OpenAPI documentation
    Title("Bookstore API")
    Description(`A modern bookstore management API.
    
This API provides endpoints for:
- Managing books and inventory
- Processing orders
- Customer management
- Analytics and reporting`)
    Version("2.0.0")
    
    // Terms of service - legal requirements and usage terms
    TermsOfService("https://example.com/terms")
    
    // Contact information - who to reach for support
    Contact(func() {
        Name("API Support")
        Email("support@example.com")
        URL("https://example.com/support")
    })
    
    // License information - how the API can be used
    License(func() {
        Name("Apache 2.0")
        URL("https://www.apache.org/licenses/LICENSE-2.0.html")
    })
    
    // Documentation - detailed guides and references
    Docs(func() {
        Description(`Comprehensive API documentation including:
- Getting started guides
- Authentication details
- API reference
- Best practices
- Example code`)
        URL("https://example.com/docs")
    })
    
    // Server definitions - where the API can be accessed
    Server("production", func() {
        Description("Production server")
        
        // Multiple hosts with variables
        Host("production", func() {
            Description("Production host")
            // Variables in URIs are replaced at runtime
            URI("https://{version}.api.example.com")
            URI("grpcs://{version}.grpc.example.com")
            
            // Define the version variable
            Variable("version", String, "API version", func() {
                Default("v2")
                Enum("v1", "v2")
            })
        })
    })
    
    // Development server for testing
    Server("development", func() {
        Description("Development server")
        
        Host("localhost", func() {
            // Local development endpoints
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})
```

### API Properties in Detail

#### Basic Metadata
These properties are essential for API documentation and discovery:

- `Title`: A short, descriptive name for your API
- `Description`: A detailed explanation of what your API does
- `Version`: The API version, typically following semantic versioning
- `TermsOfService`: Link to your terms of service document

Example with markdown support:
```go
Title("Order Management API")
Description(`
# Order Management API

This API allows you to:
- Create and manage orders
- Track shipments
- Process returns
- Generate invoices

## Rate Limits
- 1000 requests per hour for authenticated users
- 100 requests per hour for anonymous users
`)
```

#### Contact Information
Contact information helps API consumers reach out for support:

```go
Contact(func() {
    Name("API Team")
    Email("api@example.com")
    URL("https://example.com/contact")
})
```

This information appears in the API documentation and helps users get assistance when needed.

#### License Information
Specify how your API can be used:

```go
License(func() {
    Name("MIT")
    URL("https://opensource.org/licenses/MIT")
})
```

The license information is crucial for users to understand usage rights and restrictions.

#### Documentation Links
Provide additional documentation resources:

```go
Docs(func() {
    Description(`Detailed documentation including:
- API Reference
- Integration Guides
- Best Practices
- Example Code`)
    URL("https://example.com/docs")
})
```

### Server Configuration

Servers define the endpoints where your API can be accessed. You can define multiple servers for different environments:

```go
Server("main", func() {
    Description("Main API server")
    
    // Production host
    Host("production", func() {
        Description("Production endpoints")
        // Support both HTTP and gRPC
        URI("https://api.example.com")
        URI("grpcs://grpc.example.com")
    })
    
    // Regional host with variables
    Host("regional", func() {
        Description("Regional endpoints")
        URI("https://{region}.api.example.com")
        
        // Define the region variable
        Variable("region", String, "Geographic region", func() {
            Description("AWS region for the API endpoint")
            Default("us-east")
            Enum("us-east", "us-west", "eu-central")
        })
    })
})
```

Variables in URIs allow for flexible configuration and can be used to:
- Support multiple regions
- Handle different API versions
- Configure environment-specific settings
- Manage multiple tenants

### Best Practices

{{< alert title="API Design Guidelines" color="primary" >}}
**Documentation**
- Provide clear, concise titles and descriptions
- Use markdown formatting for rich documentation
- Include comprehensive contact information
- Link to detailed external documentation
- Specify license and terms of service clearly

**Versioning**
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Include version in server URLs for API versioning
- Plan for version transitions and backwards compatibility
- Document breaking changes between versions

**Server Configuration**
- Define all production and development servers
- Use variables for flexible configuration
- Include both HTTP and gRPC endpoints when needed
- Document server environments and their purposes
- Provide sensible defaults for variables
- Consider regional and scaling requirements

**General Tips**
- Keep descriptions focused and relevant
- Use consistent naming conventions
- Plan for future expansion
- Consider security implications
- Document rate limits and usage quotas
{{< /alert >}}

### API-Level Errors

The API DSL allows you to define errors at the API level that can be reused across all services and methods. This promotes consistency in error handling and reduces duplication in your design.

#### Purpose and Benefits

Defining errors at the API level establishes a consistent vocabulary and structure that can be reused throughout your services. This centralized approach ensures uniform error handling while simplifying documentation and transport mappings. Rather than defining similar errors multiple times, you can reference these shared definitions wherever needed, promoting consistency and maintainability across your entire API.

#### How Error Definition Works

When you define an error at the API level, you establish:
1. A unique error identifier
2. The error's data structure (type)
3. Documentation and description
4. Optional transport-specific behavior

Here's a simple example, given the following API definition:
```go
var _ = API("bookstore", func() {
    Error("unauthorized", ErrorResult, "Authentication failed")
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
    })
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
    })
})
```

Services and methods can reference API-level errors by name:

```go
var _ = Service("billing", func() {
    Error("unauthorized") // No need to specify the error type, description or transport mappings again
})
```

#### Error Inheritance

Services and methods can reference API-level errors by name. When they do:
- They inherit all properties of the API-level error
- They can add transport-specific mappings
- They cannot modify the error's structure
- They can provide additional documentation

This inheritance model ensures consistency while allowing flexibility in how errors are used.

#### Default Error Type

If you don't specify a type for an error, Goa uses its built-in `ErrorResult` type. This type includes:
- An error message
- An error ID
- Optional temporary/timeout flags
- Optional stack of error causes

You can use this default type for simple errors or define custom types for more complex error scenarios.

#### Transport Mappings

API-level errors can define how they should be represented in different transport protocols. For example:
- HTTP status codes and headers
- gRPC status codes
- Custom error serialization

These mappings are inherited when the error is used in services and methods.

#### Best Practices for Error Design

{{< alert title="Error Design Guidelines" color="primary" >}}
**Error Organization**
- Define common, reusable errors at the API level
- Use clear, descriptive error names

**Error Usage**
- Reference API errors instead of redefining them
- Add context-specific documentation when reusing errors
{{< /alert >}}

#### Common Patterns

Some common patterns for API-level errors include:
1. Authentication/authorization errors
2. Resource not found errors
3. Validation errors (on top of the validation rules defined in the design)
4. Rate limiting errors
5. Server-side errors

By defining these common patterns at the API level, you ensure consistent error handling throughout your services.
