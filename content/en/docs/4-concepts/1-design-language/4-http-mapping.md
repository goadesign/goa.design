---
title: "HTTP Transport Mapping"
linkTitle: "HTTP Mapping"
weight: 4
description: >
  Define how your service methods map to HTTP endpoints. Learn how to map payloads to HTTP requests and responses.
---

This section explains how service method payloads are mapped to HTTP endpoints
using the [HTTP](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP) transport DSL.
The payload types define the shape of the data passed as arguments to service
methods, while the HTTP expressions specify how to build this data from various
parts of an incoming HTTP request.

## HTTP Request State

An HTTP request is composed of four parts:

1. **URL Path Parameters**  
   For example, in the route `/bottle/{id}`, the `{id}` is a path parameter.

2. **URL Query String Parameters**

3. **HTTP Headers**

4. **HTTP Request Body**

The [HTTP expressions](https://goa.design/reference/dsl/http/) guide how the generated code decodes the request into the expected payload:

- **`Param` Expression:** Loads values from path or query string parameters.
- **`Header` Expression:** Loads values from HTTP headers.
- **`Body` Expression:** Loads values from the request body.

The next sections describe these expressions in more detail.

---

## Mapping Payloads with Non-Object Types

When the payload type is a primitive (e.g. `String`, integer types, `Float`,
`Boolean`, or `Bytes`), an array, or a map, the value is loaded from the first
defined element in the following order:

1. The first URL path parameter (if defined)
2. Otherwise, the first query string parameter (if defined)
3. Otherwise, the first header (if defined)
4. Otherwise, the request body

### Restrictions

- **Path Parameters & Headers:** Must be defined using primitive types or arrays of primitives.
- **Query String Parameters:** Can be primitives, arrays, or maps (with primitives as elements).
- **Arrays in Paths and Headers:** Represented as comma-separated values.

### Examples

#### 1. Simple "Get by Identifier" (Integer Identifier)

```go
Method("show", func() {
    Payload(Int)
    HTTP(func() {
        GET("/{id}")
    })
})
```

| Generated method | Example request | Corresponding call |
| ---------------- | --------------- | ------------------ |
| `Show(int)`      | `GET /1`      | `Show(1)`          |

#### 2. Bulk "Delete by Identifiers" (String Identifiers)

```go
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
```

| Generated method     | Example request | Corresponding call                     |
| -------------------- | --------------- | -------------------------------------- |
| `Delete([]string)`   | `DELETE /a,b`   | `Delete([]string{"a", "b"})`           |

> **Note:** The actual name of the path parameter is not significant.

#### 3. Array in Query String

```go
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
```

| Generated method   | Example request          | Corresponding call                  |
| ------------------ | ------------------------ | ----------------------------------- |
| `List([]string)`   | `GET /?filter=a&filter=b`| `List([]string{"a", "b"})`          |

#### 4. Float in Header

```go
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
```

| Generated method   | Example request          | Corresponding call |
| ------------------ | ------------------------ | ------------------ |
| `List(float32)`    | `GET /` with header `version=1.0` | `List(1.0)` |

#### 5. Map in Body

```go
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
```

| Generated method          | Example request                    | Corresponding call                                         |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `Create(map[string]int)`  | `POST / {"a": 1, "b": 2}`           | `Create(map[string]int{"a": 1, "b": 2})`                   |

---

## Mapping Payloads with Object Types

For payloads defined as objects (with multiple attributes), HTTP expressions
allow you to specify where each attribute is loaded from. Some attributes can
come from the URL path, others from query parameters, headers, or the body. The
same type restrictions apply:

- **Path and Header Attributes:** Must be primitives or arrays of primitives.
- **Query String Attributes:** Can be primitives, arrays, or maps (with primitives as elements).

### Using the `Body` Expression

The `Body` expression specifies which payload attribute corresponds to the HTTP
request body. If you omit the `Body` expression, any attributes not mapped to a
path, query, or header are automatically assumed to come from the body.

#### Example: Mixing Path and Body

Given the payload:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
})
```

The following HTTP expression maps the `id` attribute to a path parameter and the remaining attributes to the request body:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("/{id}")
    })
})
```

| Generated method         | Example request                   | Corresponding call                                  |
| ------------------------ | --------------------------------- | --------------------------------------------------- |
| `Create(*CreatePayload)` | `POST /1 {"name": "a", "age": 2}` | `Create(&CreatePayload{ID: 1, Name: "a", Age: 2})`  |

### Using `Body` for Non-Object Types

The `Body` expression also supports cases where the request body is not an object (for example, an array or a map).

#### Example: Map in Body

Consider the following payload:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
})
```

Using the HTTP expression below, the `rates` attribute is loaded directly from the body:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
    HTTP(func() {
        PUT("/{id}")
        Body("rates")
    })
})
```

| Generated method         | Example request               | Corresponding call                                                         | 
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `Rate(*RatePayload)`     | `PUT /1 {"a": 0.5, "b": 1.0}` | `Rate(&RatePayload{ID: 1, Rates: map[string]float64{"a": 0.5, "b": 1.0}})` |

Without the `Body` expression, the request body would be interpreted as an object with a single field named `rates`.

---

## Mapping HTTP Element Names to Attribute Names

The expressions `Param`, `Header`, and `Body` allow you to map HTTP element
names (e.g., query string keys, header names, or body field names) to payload
attribute names. The mapping syntax is:

```go
"attribute name:element name"
```

For example:

```go
Header("version:X-Api-Version")
```

In this case, the `version` attribute will be loaded from the `X-Api-Version` HTTP header.

### Mapping Fields in the Request Body

The `Body` expression also supports an alternative syntax that explicitly lists
the body attributes and their corresponding HTTP field names. This is useful for
specifying a mapping between incoming field names and payload attribute names.

#### Example

```go
Method("create", func() {
    Payload(func() {
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("")
        Body(func() {
            Attribute("name:n")
            Attribute("age:a")
        })
    })
})
```

| Generated method         | Example request            | Corresponding call                                  |
| ------------------------ | -------------------------- | --------------------------------------------------- |
| `Create(*CreatePayload)` | `POST / {"n": "a", "a": 2}`  | `Create(&CreatePayload{Name: "a", Age: 2})`          |

---

This guide should help you map your service methods to HTTP endpoints
effectively, providing clear instructions on how to extract and map the
different parts of an HTTP request to your service payloads.