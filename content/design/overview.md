+++
title = "Design Overview"
weight = 1

[menu.main]
name = "Design Overview"
parent = "design"
+++

The following sections describe how to use the goa DSL to describe services.
They provide an overview of the key concepts. Review the
[GoDocs](https://godoc.org/goa.design/goa/dsl) for a complete reference.

## API Expression

The [API](https://godoc.org/goa.design/goa/dsl#API) function is an optional
top-level DSL which lists the global properties of the API such as a name, a
description and a version number. `API` may define one or more
[Servers](https://godoc.org/goa.design/goa/dsl#Server) potentially exposing
different sets of services. A single service may be exposed by any number (or
no) server. If `Server` is omitted then a single server is automatically defined
that exposes all the services defined in the design. The `Server` expression is
used when generating command-line clients and OpenAPI specifications.

```go
var _ = API("calc", func() {
    Title("Calculator Service")
    Description("A service for adding numbers, a goa teaser")

    // Server describes a single process listening for client requests. The DSL
    // defines the set of services that the server hosts as well as hosts details.
    Server("calc", func() {
        Description("calc hosts the Calculator Service.")

        // List the services hosted by this server.
        Services("calc")

        // List the Hosts and their transport URLs.
        Host("development", func() {
            Description("Development hosts.")
            // Transport specific URLs, supported schemes are:
            // 'http', 'https', 'grpc' and 'grpcs' with the respective default
            // ports: 80, 443, 8080, 8443.
            URI("http://localhost:8000/calc")
            URI("grpc://localhost:8080")
        })

        Host("production", func() {
            Description("Production hosts.")
            // URIs can be parameterized using {param} notation.
            URI("https://{version}.goa.design/calc")
            URI("grpcs://{version}.goa.design")

            // Variable describes a URI variable.
            Variable("version", String, "API version", func() {
                // URL parameters must have a default value and/or an
                // enum validation.
                Default("v1")
            })
        })
    })
})
```

## Service Expression

The [Service](https://godoc.org/goa.design/goa/dsl#Service) function defines a
group of methods. This maps to a resource in REST or a
[service declaration](https://grpc.io/docs/guides/concepts.html#service-definition)
in gRPC. A service may define common error responses to all the service methods.
See [Handling Errors](/design/handling_errors/) for additional information on
defining errors.

```go
var _ = Service("calc", func() {
    Description("The calc service performs operations on numbers")

    // Method describes a service method (endpoint)
    Method("add", func() {
        // Payload describes the method payload.
        // Here the payload is an object that consists of two fields.
        Payload(func() {
            // Field describes an object field given a field index, a field
            // name, a type and a description.
            Field(1, "a", Int, "Left operand")
            Field(2, "b", Int, "Right operand")
            // Required list the names of fields that are required.
            Required("a", "b")
        })

        // Result describes the method result.
        // Here the result is a simple integer value.
        Result(Int)

        // HTTP describes the HTTP transport mapping.
        HTTP(func() {
            // Requests to the service consist of HTTP GET requests.
            // The payload fields are encoded as path parameters.
            GET("/add/{a}/{b}")
            // Responses use a "200 OK" HTTP status.
            // The result is encoded in the response body (default).
            Response(StatusOK)
        })

        // GRPC describes the gRPC transport mapping.
        GRPC(func() {
            // Responses use a "OK" gRPC code.
            // The result is encoded in the response message (default).
            Response(CodeOK)
        })
    })

    // Serve the file with relative path ./gen/http/openapi.json for
    // requests sent to /swagger.json.
    Files("/swagger.json", "./gen/http/openapi.json")
})
```

## Method Expression

The service methods are described using [Method](https://godoc.org/goa.design/goa/dsl#Method).
This function defines the method payload (input) and result (output) types. It
may also list an arbitrary number of error return values. An error return value
has a name and optionally a type. Omitting the payload or result type has the
same effect as using the built-in type `Empty` which maps to an empty body in
HTTP and to the `Empty` message in gRPC. Omitting an error type has the same
effect as using the default error type
[ErrorResult](https://godoc.org/goa.design/goa/expr#ErrorResult).

```go
Method("divide", func() {
    Description("Divide returns the integral division of two integers.")
    Payload(func() {
        Attribute("a", Int, "Left operand")
        Attribute("b", Int, "Right operand")
        Required("a", "b")
    })
    Result(Int)

    // Error defines an error result.
    Error("DivByZero")

    HTTP(func() {
        GET("/div/{a}/{b}")
        // The HTTP status code for responses corresponding to
        // the "DivByZero" error is 400 Bad Request.
        // The default response for successful requests is
        // 200 OK.
        Response("DivByZero", StatusBadRequest)
    })

    GRPC(func() {
        // The gRPC code for results corresponding to the
        // "DivByZero" error is 3 (INVALID_ARGUMENT).
        // The default response for successful requests is
        // 0 OK.
        Response("DivByZero", CodeInvalidArgument)
    })
})
```

The payload, result and error types define the input and output of the method
*independently of the transport*. In other words the payload and result types
should include all the fields that are required by the business logic including
fields that are mapped to HTTP headers, URL parameters etc.

### gRPC Expression

The [gRPC](https://godoc.org/goa.design/goa/dsl#GRPC) function defines the
mapping of the payload and result type attributes to the gRPC message and
metadata.

```go
    Method("update", func() {
        Description("Change account name")
        Payload(UpdateAccount)
        Result(Empty)
        Error("NotFound")
        Error("BadRequest")

        // gRPC transport
        GRPC(func() {
            Response("NotFound", CodeNotFound)
            Response("BadRequest", CodeInvalidArgument)
        })
    })
```

### HTTP Expression

The [HTTP](https://godoc.org/goa.design/goa/dsl#HTTP) function defines the
mapping of the payload and result type attributes to the HTTP request path and
query string values as well as the HTTP request and response bodies. The `HTTP`
function also defines other HTTP-specific properties such as the request path
and the response HTTP status codes.

```go
    Method("update", func() {
        Description("Change account name")
        Payload(UpdateAccount)
        Result(Empty)
        Error("NotFound")
        Error("BadRequest")

        // HTTP transport
        HTTP(func() {
            PUT("/{accountID}")    // "accountID" UpdateAccount attribute
            Body(func() {
                Attribute("name")  // "name" UpdateAccount attribute
                Required("name")
            })
            Response(StatusNoContent)
            Response("NotFound", StatusNotFound)
            Response("BadRequest", StatusBadRequest)
        })
    })
```

### Method Payload Type

In the example above the `accountID` HTTP request path parameter is defined by
the attribute of the `UpdateAccount` type with the same name. The HTTP request
body is defined as an object which contains the `name` attribute of the
`UpdateAccount` payload type.

Any attribute that is not explicitly mapped by the `HTTP` function is implicitly
mapped to request body attributes. This makes it simple to define mappings where
only one of the fields for the payload type is mapped to a HTTP header for
example.

The body attributes may also be listed explicitly using the `Body` function.
This function accepts either a DSL listing the corresponding payload type
attributes names or a string which corresponds to the name of a single payload
type attribute that defines the shape of the request body as a whole. The latter
makes it possible to use arbitrary types to describe the request body (arrays
and maps for example).

Here is an example of a HTTP mapping that defines the shape of the request body
implicitly:

```go
HTTP(func() {
    PUT("/{accountID}")       // The "accountID" payload type attribute.
    Response(StatusNoContent) // All other payload type attributes are
                              // mapped to the request body.
})
```

Another example which uses the name of payload type attribute to define the
shape of the request body:

```go
HTTP(func() {
    PUT("/")
    Body("names") // Assumes payload type has attribute "names"
    Response(StatusNoContent)
})
```

### Method Result Type

While a service may only define one result type the `HTTP` function may list
multiple responses. Each response defines the HTTP status code, response body
shape (if any) and may also list HTTP headers. The `Tag` DSL function makes it
possible to define an attribute of the result type that is used to determine
which HTTP response to send. The function specifies the name of a result type
attribute and the value the attribute must have for the response in which the
tag is defined to be used to write the HTTP response.

By default, the shape of the body of responses with HTTP status code 200 is
described by the method result type. The `HTTP` function may optionally use
result type attributes to define response headers. Any attribute of the result
type that is not explicitly used to define a response header defines a field of
the response body implicitly. This alleviates the need to repeat all the result
type attributes to define the body since in most cases only a few would map to
headers.

The response body may also be explicitly described using the function `Body`.
The function works identically as when used to describe the request body: it may
be given a list of result type attributes in which case the body shape is an
object or the name of a specific attribute in which case the response body shape
is dictated by the type of the attribute.

Assuming the following type definition:

```go
var Account = Type("Account", func() {
    Attribute("name", String, "Name of account.")
})
```

and the following method design:

```go
Method("index", func() {
    Description("Index all accounts")
    Payload(ListAccounts)
    Result(func() {
        Attribute("marker", String, "Pagination marker")
        Attribute("accounts", CollectionOf(Account), "list of accounts")
    })
    HTTP(func() {
        GET("")
        Response(StatusOK, func() {
            Header("marker")
            Body("accounts")
        })
    })
})
```

The HTTP response body for requests sent to the "index" method are of the form
`[{"name":"foo"},{"name":"bar"}]`. The same example but with the line defining
the response body removed (`Body("accounts")`) produces response bodies of the
form: `{"accounts":[{"name":"foo"},{"name":"bar"}]}` since the shape of the
response body is now an object containing all the attributes of the result type
not used to defined headers (only `accounts` is left).

## Data Types

Goa supports primitive types, array, map, and object types.

The following table lists the supported **primitive** types and their
representation in the generated HTTP and gRPC transport code.

| Primitive |      HTTP     |   gRPC    |
|-----------|---------------|-----------|
| `Boolean` |   `bool`      |  `bool`   |
| `Int`     |   `int`       |  `sint32` |
| `Int32`   |   `int32`     |  `sint32` |
| `Int64`   |   `int64`     |  `sint64` |
| `UInt`    |   `uint`      |  `uint32` |
| `UInt32`  |   `uint32`    |  `uint32` |
| `UInt64`  |   `uint64`    |  `uint64` |
| `Float32` |   `float32`   |  `float`  |
| `Float64` |   `float64`   |  `double` |
| `String`  |   `string`    |  `string` |
| `Bytes`   |   `[]byte`    |  `bytes`  |
| `Any`     | `interface{}` |     *     |
 \* - Not supported


**User-defined types** can be defined in Goa using
[Type](https://godoc.org/goa.design/goa/dsl#Type) or
[ResultType](https://godoc.org/goa.design/goa/dsl#ResultType). A result type is
a type that also defines a set of "views". Each view lists the attributes
(fields) that should be rendered when marshaling a result type instance using
the view. For example a HTTP API may define a endpoint that lists a collection
of entity and another that retrieves specific entities. It may be desirable to
limit the number of fields marshaled in the list while keeping all the fields
when returning a specific entity. Views make it possible to define a single
result type that supports both these scenarios. Note that since views only apply
to rendering using a result type in a method payload does not make sense: types
can be used both in payloads and results while result types should only be used
in results.

**Maps** can be defined with
[MapOf](https://godoc.org/goa.design/goa/dsl#MapOf). The syntax is
`MapOf(<KeyType>, <ElemType>)` where `<KeyType>` can be a primitive, array, or
user type and `<ElemType>` can be a primitive, array, user type, or map. Map
types are represented as Go `map` in the HTTP transport and protocol buffer
[map](https://developers.google.com/protocol-buffers/docs/proto3#maps) in the
gRPC transport. Note that the protocol buffer language only supports primitives
(except floats or bytes) as map keys.

**Arrays** can be defined in two ways:
* [ArrayOf](https://godoc.org/goa.design/goa/dsl#ArrayOf) which accepts any type
  and returns a type.
* [CollectionOf](https://godoc.org/goa/design/goa/dsl#CollectionOf) which
  only accepts result types and returns a result type.

The result type returned by `CollectionOf` contains the same views as the result
type given as argument. Each view simply renders an array where each element
has been projected using the corresponding element view.

## Transport-to-Service Type Mapping

The following sections describes how transport-specific requests and responses
are mapped to the transport-independent payload and result types.

### Payload-to-Request Mapping

The [Payload](https://godoc.org/goa.design/goa/dsl#Payload) function describes
the shape of the data given as an argument to the service methods. The `HTTP`
and `GRPC` functions define how the payload is built from the incoming request
(server-side) and how the request is built from the payload (client-side).

For **HTTP**,

* The [Param](https://godoc.org/goa.design/goa/dsl#Param) function defines
  values loaded from path or query string parameters.
* The [Header](https://godoc.org/goa.design/goa/dsl#Header) function defines
  values loaded from HTTP headers.
* The [Body](https://godoc.org/goa.design/goa/dsl#Body) function defines values
  loaded from the request body.

By default, the payload attributes are mapped to HTTP request body. When the
payload type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define path parameters or
  headers. `array` types must use primitive types to define their elements.
* only `primitive`, `array`, and `map` types may be used to define query string
  parameters. `array` and `map` types must use primitive types to define their
  elements.

For **gRPC**,

* The [Message](https://godoc.org/goa.design/goa/dsl#Message) function defines
  values loaded from a gRPC message.
* The [Metadata](https://godoc.org/goa.design/goa/dsl#Metadata) function defines
  values loaded from a gRPC request
  [metadata](https://grpc.io/docs/guides/concepts.html#metadata).

By default, the payload attributes are mapped to gRPC message. When the
payload type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define gRPC metadata

### Result-To-Response Mapping

The [Result](https://godoc.org/goa.design/goa/dsl#Result) function describes the
shape of the return data of the service methods. The `HTTP` and `GRPC` functions
define how the response is built from the result type (server-side) and how the
result is built from the response (client-side).

For **HTTP**,

* The [Header](https://godoc.org/goa.design/goa/dsl#Header) function defines
  values loaded from HTTP headers.
* The [Body](https://godoc.org/goa.design/goa/dsl#Body) function defines values
  loaded from the response body.

By default, the result attributes are mapped to HTTP response body. When the
result type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define response headers.
  `array` types must use primitive types to define their elements.

For **gRPC**,

* The [Message](https://godoc.org/goa.design/goa/dsl#Message) function defines
  values loaded into a gRPC message.
* The [Headers](https://godoc.org/goa.design/goa/dsl#Headers) function defines
  values loaded into a gRPC header metadata.
* The [Trailers](https://godoc.org/goa.design/goa/dsl#Trailers) function defines
  values loaded into a gRPC trailer metadata.

By default, the result attributes are mapped to gRPC message. When the
result type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define gRPC header/trailer
  metadata
