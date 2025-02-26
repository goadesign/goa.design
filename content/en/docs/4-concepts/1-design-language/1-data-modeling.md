---
title: "Data Modeling"
linkTitle: "Data Modeling"
weight: 1
description: >
  Define your service's data structures using Goa's comprehensive type system. Create type definitions that match your domain model while ensuring data integrity through validation rules and constraints.
---

Goa provides a powerful type system that allows you to model your domain with precision and clarity. From simple primitives to complex nested structures, the DSL offers a natural way to express data relationships, constraints, and validation rules.

## Basic Types

The foundation of Goa's type system starts with primitive types and basic type definitions. These building blocks allow you to create simple yet expressive data structures.

### Primitive Types
Goa provides a rich set of built-in primitive types that serve as the foundation for all data modeling:

```go
Boolean  // JSON boolean
Int      // Signed integer
Int32    // Signed 32-bit integer 
Int64    // Signed 64-bit integer
UInt     // Unsigned integer
UInt32   // Unsigned 32-bit integer
UInt64   // Unsigned 64-bit integer
Float32  // 32-bit floating number
Float64  // 64-bit floating number
String   // JSON string
Bytes    // Binary data
Any      // Arbitrary JSON value
```

### Type Definition
The Type DSL function is the primary way to define structured data types. It supports attributes, validations, and documentation:

```go
var Person = Type("Person", func() {
    Description("A person")
    
    // Basic attribute
    Attribute("name", String)
    
    // Attribute with validation
    Attribute("age", Int32, func() {
        Minimum(0)
        Maximum(120)
    })
    
    // Required fields
    Required("name", "age")
})
```

## Complex Types

When modeling real-world domains, you often need more sophisticated data structures. Goa provides comprehensive support for collections and nested types.

### Arrays
Arrays allow you to define ordered collections of any type, with optional validation rules:

```go
var Names = ArrayOf(String, func() {
    // Validate array elements
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

### Maps
Maps provide key-value associations with type safety and validation for both keys and values:

```go
var Config = MapOf(String, Int32, func() {
    // Key validation
    Key(func() {
        Pattern("^[a-z]+$")
    })
    // Value validation 
    Elem(func() {
        Minimum(0)
    })
})
```

## Type Composition

Goa supports sophisticated type composition patterns that enable code reuse and clean separation of concerns.

### Reference
Use Reference to set default properties for attributes from another type. When an attribute in the current type has the same name as one in the referenced type, it inherits the referenced attribute's properties. Multiple references can be specified, with properties being looked up in order of appearance:

```go
var Employee = Type("Employee", func() {
    // Reuse attribute definitions from Person
    Reference(Person)
    Attribute("name") // No need to define the name attribute again
    Attribute("age")  // No need to define the age attribute again

    // Add new attributes
    Attribute("employeeID", String, func() {
        Format(FormatUUID)
    })
})
```

### Extend

`Extend` creates a new type based on an existing one, perfect for modeling
hierarchical relationships. As opposed to `Reference`, `Extend` automatically
inherits all attributes from the base type. 

```go
var Manager = Type("Manager", func() {
    // Extend base type
    Extend(Employee)
    
    // Add manager-specific fields
    Attribute("reports", ArrayOf(Employee))
})
```

## Validation Rules

Goa provides comprehensive validation capabilities to ensure data integrity and enforce business rules:
Here are the key validation rules available in Goa:

### String Validations
- `Pattern(regex)` - Validates against a regular expression
- `MinLength(n)` - Minimum string length
- `MaxLength(n)` - Maximum string length
- `Format(format)` - Validates against predefined formats (email, URI, etc)

### Numeric Validations  
- `Minimum(n)` - Minimum value (inclusive)
- `Maximum(n)` - Maximum value (inclusive)
- `ExclusiveMinimum(n)` - Minimum value (exclusive) 
- `ExclusiveMaximum(n)` - Maximum value (exclusive)

### Array and Map Validations
- `MinLength(n)` - Minimum number of elements
- `MaxLength(n)` - Maximum number of elements

### Object Validations
- `Required("field1", "field2")` - Required fields

### Generic Validations
- `Enum(value1, value2)` - Restricts to enumerated values

Additionally array and map elements can be validated using the same rules as for
attributes.

The validation rules can be combined to create comprehensive validation logic:

```go
var UserProfile = Type("UserProfile", func() {
    Attribute("username", String, func() {
        Pattern("^[a-z0-9]+$") // Regex pattern
        MinLength(3)           // Minimum string length
        MaxLength(50)          // Maximum string length
    })
    
    Attribute("email", String, func() {
        Format(FormatEmail)    // Built-in format
    })
    
    Attribute("age", Int32, func() {
        Minimum(18)            // Minimum value
        ExclusiveMaximum(150)  // Exclusive maximum value
    })
    
    Attribute("tags", ArrayOf(String, func() { Enum("tag1", "tag2", "tag3") }), func() {
                              // Enum values for array elements
        MinLength(1)          // Minimum array length
        MaxLength(10)         // Maximum array length
    })
    
    Attribute("settings", MapOf(String, String), func() {
        MaxLength(20)         // Maximum map length
    })

    Required("username", "email", "age") // Required fields
})
```

## Custom Types

Create reusable custom types to encapsulate domain-specific formats and validation rules:

```go
// Define custom format
var UUID = Type("UUID", String, func() {
    Format(FormatUUID)
    Description("RFC 4122 UUID")
})

// Use custom type
var Resource = Type("Resource", func() {
    Attribute("id", UUID)
    Attribute("name", String)
})
```

See the [Type DSL](https://pkg.go.dev/goa.design/goa/v3/dsl#Type) for more details.

## Built-in Formats

Goa includes a comprehensive set of predefined formats for common data patterns. These formats provide automatic validation and clear semantic meaning:

- `FormatDate` - RFC3339 date values
- `FormatDateTime` - RFC3339 date time values
- `FormatUUID` - RFC4122 UUID values
- `FormatEmail` - RFC5322 email addresses
- `FormatHostname` - RFC1035 Internet hostnames
- `FormatIPv4` - RFC2373 IPv4 address values
- `FormatIPv6` - RFC2373 IPv6 address values
- `FormatIP` - RFC2373 IPv4 or IPv6 address values
- `FormatURI` - RFC3986 URI values
- `FormatMAC` - IEEE 802 MAC-48, EUI-48 or EUI-64 MAC address values
- `FormatCIDR` - RFC4632 and RFC4291 CIDR notation IP address values
- `FormatRegexp` - Regular expression syntax accepted by RE2
- `FormatJSON` - JSON text
- `FormatRFC1123` - RFC1123 date time values

## Attribute vs Field DSL

Goa provides two equivalent ways to define type attributes: `Attribute` and `Field`. The main difference is that `Field` takes an additional tag parameter which is used for gRPC message field numbers.

### Attribute DSL
Used when you don't need gRPC support or when defining types that won't be used in gRPC messages:

```go
var Person = Type("Person", func() {
    Attribute("name", String)
    Attribute("age", Int32)
})
```

### Field DSL
Used when defining types that will be used in gRPC messages. The first argument is the field number tag:

```go
var Person = Type("Person", func() {
    Field(1, "name", String)
    Field(2, "age", Int32)
})
```

Both DSLs support the same features for validation, documentation, and examples. Choose based on whether you need gRPC support in your service.

## Examples

The Example DSL allows you to provide sample values for your types and attributes. These examples are used in the generated documentation and can help API consumers understand the expected data formats.

### Adding Examples to Attributes

```go
var User = Type("User", func() {
    Attribute("name", String, func() {
        Example("John Doe")
    })
    
    Attribute("age", Int32, func() {
        Example(25)
        Minimum(0)
        Maximum(120)
    })
    
    // Multiple examples
    Attribute("email", String, func() {
        Example("work", "john@work.com")
        Example("personal", "john@gmail.com")
        Format(FormatEmail)
    })
})
```

### Complex Type Examples

For complex types, you can provide complete examples showing how multiple attributes work together:

```go
var Address = Type("Address", func() {
    Description("Mailing address")
    
    Attribute("street", String)
    Attribute("city", String)
    Attribute("state", String)
    Attribute("postal_code", String)
    
    Required("street", "city", "state", "postal_code")
    
    Example("Home Address", func() {
        Description("Example of a residential address")
        Value(Val{
            "street": "123 Main St",
            "city": "Boston",
            "state": "MA",
            "postal_code": "02101",
        })
    })
    
    Example("Business Address", func() {
        Description("Example of a business address")
        Value(Val{
            "street": "1 Enterprise Ave",
            "city": "San Francisco",
            "state": "CA",
            "postal_code": "94105",
        })
    })
})
```

### Examples with Arrays and Maps

```go
var Order = Type("Order", func() {
    Attribute("id", Int64)
    Attribute("items", ArrayOf(String))
    Attribute("metadata", MapOf(String, String))
    
    Example("Simple Order", func() {
        Description("Basic order with a few items")
        Value(Val{
            "id": 1001,
            "items": []string{"SKU123", "SKU456"},
            "metadata": map[string]string{
                "priority": "high",
                "shipping": "express",
            },
        })
    })
})
```

### Using Examples in Documentation

Examples are automatically included in the generated OpenAPI documentation, making it easier for API consumers to understand the expected data formats. They can also be used in testing to verify that the API handles typical use cases correctly.

Best practices for examples:
- Provide realistic, meaningful examples
- Include multiple examples for complex types
- Add descriptions to explain the context
- Cover edge cases and different variations
- Use examples to demonstrate validation rules

## Best Practices

When designing your data models, following these guidelines will help create maintainable and robust services:

{{< alert title="Design Guidelines" color="primary" >}}
**Type Organization**
- Group related types together
- Use meaningful field names and descriptions
- Follow consistent naming conventions
- Keep types focused and cohesive

**Validation Strategy**
- Add appropriate constraints for each field
- Define required fields explicitly
- Use format validators for standard formats
- Consider domain-specific validation rules

**Type Composition**
- Break down complex types into smaller components
- Use extension for specialization
- Create reusable base types
- Maintain clear type hierarchies
{{< /alert >}}
