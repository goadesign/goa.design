+++
title = "HTTP Transport Mapping"
weight = 2

[menu.main]
name = "HTTP Transport Mapping"
parent = "design"
+++

## Payload to HTTP request mapping

The payload types describe the shape of the data given as an argument to the
service methods. The HTTP transport specific DSL defines how the data is built
from the incoming HTTP request state.

The HTTP request state comprises four different parts:

* The URL path parameters (for example the route `/bottle/{id}` defines the `id` path parameter)
* The URL query string parameters
* The HTTP headers
* And finally the HTTP request body

The HTTP expressions drive how the generated code decodes the request into the
payload type:

* The `Param` expression defines values loaded from path or query string
  parameters.
* The `Header` expression defines values loaded from HTTP headers.
* The `Body` expression defines values loaded from the request body.

The next two sections describe the expressions in more details.

Note that the generated code provides a default decoder implementation that
ought to be sufficient in most cases however it also makes it possible to plug a
user provided decoder in the (hopefully rare) cases when that's needed.

#### Mapping payload with non-object types

When the payload type is a primitive type (i.e. one of String, any of the
integer or float types, Boolean or Bytes), an array or a map then the value is
loaded from:

* the first URL path parameter defined in the design if any
* otherwise the first query string parameter defined in the design if any
* otherwise the first header defined in the design if any
* otherwise the body

with the following restrictions:

* only primitive or array types may be used to define path parameters or headers
* only primitive, array and map types may be used to define query string parameters
* array and map types used to define path parameters, query string parameters or
  headers must use primitive types to define their elements

Arrays in paths and headers are represented using comma separated values.

Examples:

* simple "get by identifier" where identifiers are integers:

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
| Show(int)        | GET /1          | Show(1)            |

* bulk "delete by identifiers" where identifiers are strings:

```go
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
```

| Generated method   | Example request | Corresponding call         |
| ------------------ | --------------- | -------------------------- |
| Delete([]string)   | DELETE /a,b     | Delete([]string{"a", "b"}) |

> Note that in both the previous examples the name of the path parameter is
> irrelevant.

* array in query string:

```go
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
```

| Generated method | Example request         | Corresponding call       |
| ---------------- | ----------------------- | ------------------------ |
| List([]string)   | GET /?filter=a&filter=b | List([]string{"a", "b"}) |

* float in header:

```go
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
```

| Generated method | Example request     | Corresponding call |
| ---------------- | ------------------- | ------------------ |
| List(float32)    | GET / [version=1.0] | List(1.0)          |

* map in body:

```go
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
```

| Generated method       | Example request         | Corresponding call                     |
| ---------------------- | ----------------------- | -------------------------------------- |
| Create(map[string]int) | POST / {"a": 1, "b": 2} | Create(map[string]int{"a": 1, "b": 2}) |

#### Mapping payload with object types

The HTTP expressions describe how the payload object attributes are loaded from
the HTTP request state. Different attributes may be loaded from different parts
of the request: some attributes may be loaded from the request path, some from
the query string parameters and others from the body for example. The same type
restrictions apply to the path, query string and header attributes (attributes
describing path and headers must be primitives or arrays of primitives and
attributes describing query string parameters must be primitives, arrays or maps
of primitives).

The `Body` expression makes it possible to define the payload type attribute
that describes the request body. Alternatively if the `Body` expression is
omitted then all attributes that make up the payload type and that are not used
to define a path parameter, a query string parameter or a header implicitly
describe the body.

For example, given the payload:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
})
```

The following HTTP expression causes the `id` attribute to get loaded from the
path parameter while `name` and `age` are loaded from the request body:

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

| Generated method       | Example request                 | Corresponding call                               |
| ---------------------- | ------------------------------- | ------------------------------------------------ |
| Create(*CreatePayload) | POST /1 {"name": "a", "age": 2} | Create(&CreatePayload{ID: 1, Name: "a", Age: 2}) |

`Body` makes it possible to describe request bodies that are not objects such as
arrays or maps.

Consider the following payload:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
})
```

Using the following HTTP expression the rates are loaded from the body:

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

| Generated method   | Example request             | Corresponding call                                                       |
| ------------------ | --------------------------- | ------------------------------------------------------------------------ |
| Rate(*RatePayload) | PUT /1 {"a": 0.5, "b": 1.0} | Rate(&RatePayload{ID: 1, Rates: map[string]float64{"a": 0.5, "b": 1.0}}) |

Without `Body` the request body shape would be an object with a single field
`rates`.

#### Mapping HTTP element names to attribute names

The expressions used to describe the HTTP request elements `Param`, `Header` and
`Body` may provide a mapping between the names of the elements (query string
key, header name or body field name) and the corresponding payload attribute
name. The mapping is defined using the syntax `"attribute name:element name"`,
for example:

```go
Header("version:X-Api-Version")
```

The above causes the `version` attribute value to get loaded from the
`X-Api-Version` HTTP header.

The `Body` expression supports an alternative syntax where the attributes that
make up the body can be explicitly listed. This syntax allows for specifying a
mapping between the incoming data field names and the payload attribute names,
for example:

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

| Generated method       | Example request            | Corresponding call                               |
| ---------------------- | -------------------------- | ------------------------------------------------ |
| Create(*CreatePayload) | POST /1 {"n": "a", "a": 2} | Create(&CreatePayload{ID: 1, Name: "a", Age: 2}) |
