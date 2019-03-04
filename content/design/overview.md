+++
title = "Design Overview"
weight = 3

[menu.main]
name = "Design Overview"
parent = "design"
+++

The following sections describe how to use the goa DSL to describe services.
They provide an overview of the key concepts. Review the [GoDocs](
https://godoc.org/goa.design/goa/dsl) for a complete reference.

## API Expression

The [API DSL](https://godoc.org/goa.design/goa/dsl#API) is an optional top-level
DSL which lists the global properties of the API such as API name, description,
its version number etc. It may define one or more [Server
expressions](https://godoc.org/goa.design/goa/dsl#Server) to describe processes
listening for client requests and the services to expose in those processes.
These `Server` expressions are used in generating command-line clients and
OpenAPI specifications.

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

The [Service DSL](https://godoc.org/goa.design/goa/dsl#Service) defines a group
of methods. This maps to a resource in REST or a [service
declaration](https://grpc.io/docs/guides/concepts.html#service-definition) in
gRPC. A service may define common error responses to all the service methods.
Refer [Handling Errors](/v2/handling_errors/) page to learn more about
error responses.

```go
var _ = Service("calc", func() {
	Description("The calc service performs operations on numbers")

	// Method describes a service method (endpoint)
	Method("add", func() {
		// Payload describes the method payload.
		// Here the payload is an object that consists of two fields.
		Payload(func() {
			// Attribute describes an object field
			Attribute("a", Int, "Left operand", func() {
				Meta("rpc:tag", "1")
			})
			Field(2, "b", Int, "Right operand")
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
			// The result is encoded in the response body.
			Response(StatusOK)
		})

		// GRPC describes the gRPC transport mapping.
		GRPC(func() {
			// Responses use a "OK" gRPC code.
			// The result is encoded in the response message.
			Response(CodeOK)
		})
	})

	// Serve the file with relative path ../../gen/http/openapi.json for
	// requests sent to /swagger.json.
	Files("/swagger.json", "../../gen/http/openapi.json")
})
```

## Method Expression

The service methods are described using [Method DSL](https://godoc.org/goa.design/goa/dsl#Method).
This function defines the method payload (input) and result (output) types.
Omitting the payload or result type has the same effect as using the built-in
type `Empty` which maps to an empty body in HTTP and to an empty message in
gRPC. The payload and result types define the input and output independently
of the transport.

```go
  Method("add", func() {
		// Payload describes the method payload.
		// Here the payload is an object that consists of two fields.
		Payload(func() {
			// Attribute describes an object field
			Attribute("a", Int, "Left operand")
			Attribute("b", Int, "Right operand")
			Required("a", "b")
		})

		// Result describes the method result.
		// Here the result is a simple integer value.
		Result(Int)
  })
```

### HTTP Expression

The [HTTP DSL](https://godoc.org/goa.design/goa/dsl#HTTP) defines the mapping of
the payload and result type attributes to the HTTP request path and query string
values as well as the HTTP request and response bodies. It also defines other
HTTP-specific properties such as the request path, the response HTTP status
codes etc.

```go
  Method("add", func() {
    // HTTP describes the HTTP transport mapping.
    HTTP(func() {
      // Requests to the service consist of HTTP GET requests.
      // The payload fields are encoded as path parameters.
      GET("/add/{a}/{b}")
      // Responses use a "200 OK" HTTP status.
      // The result is encoded in the response body.
      Response(StatusOK)
    })
  })
```

### gRPC Expression

The [gRPC DSL](https://godoc.org/goa.design/goa/dsl#GRPC) defines the mapping of
the payload and result type attributes to the gRPC message and metadata.

```go
  Method("add", func() {
    // GRPC describes the gRPC transport mapping.
    GRPC(func() {
      // Responses use a "OK" gRPC code.
      // The result is encoded in the response message.
      Response(CodeOK)
    })
  })
```

## Data Types

goa supports primitive types, array, map, and object types.

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


**User-defined types** can be defined in goa using the [Type](https://godoc.org/goa.design/goa/dsl#Type)
or the [ResultType](https://godoc.org/goa.design/goa/dsl#ResultType) DSL.
Such types are represented as Go `struct` in the HTTP transport and
[protocol buffer message](https://developers.google.com/protocol-buffers/docs/proto3#simple)
in the gRPC transport.

**Maps** are declared as `MapOf(<KeyType>, <ElemType>)` where `<KeyType>` must be a
primitive, array, or user type and `<ElemType>` must be a primitive, array,
user type, or map. Map types are represented as Go `map` in the HTTP transport
and [protocol buffer map](https://developers.google.com/protocol-buffers/docs/proto3#maps)
in the gRPC transport. Note that, [protocol buffer language](https://developers.google.com/protocol-buffers/docs/proto3#maps)
supports only primitives (except floats or bytes) as map keys.

**Arrays** can be declared in two ways:

* `ArrayOf()` which accepts any type and returns a type
* `CollectionOf()` which accepts only result types and returns a result type

The result type returned by CollectionOf contains the same views as the result
type given as argument. Each view simply renders an array where each element
has been projected using the corresponding element view.

## Transport-to-Service Type Mapping

The following sections describes how transport-specific requests and responses
are mapped to the transport-independent payload and result types.

### Payload-to-Request Mapping

[Payload DSL](https://godoc.org/goa.design/goa/dsl#Payload) describes the shape
of the data given as an argument to the service methods. The `HTTP` and `GRPC`
DSLs define how the payload is built from the incoming request (server-side)
and how the request is built from the payload (client-side).

For **HTTP**,

* [Param DSL](https://godoc.org/goa.design/goa/dsl#Param) defines values loaded
  from path or query string parameters.
* [Header DSL](https://godoc.org/goa.design/goa/dsl#Header) defines values
  loaded from HTTP headers.
* [Body DSL](https://godoc.org/goa.design/goa/dsl#Body) defines values loaded
  from the request body.

By default, the payload attributes are mapped to HTTP request body. When the
payload type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define path parameters or
  headers. `array` types must use primitive types to define their elements.
* only `primitive`, `array`, and `map` types may be used to define query string
  parameters. `array` and `map` types must use primitive types to define their
  elements.

For **gRPC**,

* [Message DSL](https://godoc.org/goa.design/goa/dsl#Message) defines values
  loaded from a gRPC message.
* [Metadata DSL](https://godoc.org/goa.design/goa/dsl#Metadata) defines values
  loaded from a gRPC request [metadata](https://grpc.io/docs/guides/concepts.html#metadata).

By default, the payload attributes are mapped to gRPC message. When the
payload type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define gRPC metadata

### Result-To-Response Mapping

[Result DSL](https://godoc.org/goa.design/goa/dsl#Result) describes the shape
of the return data of the service methods. The `HTTP` and `GRPC` DSLs define
how the response is built from the result type (server-side) and how the result
is built from the response (client-side).

For **HTTP**,

* [Header DSL](https://godoc.org/goa.design/goa/dsl#Header) defines values
  loaded from HTTP headers.
* [Body DSL](https://godoc.org/goa.design/goa/dsl#Body) defines values loaded
  from the response body.

By default, the result attributes are mapped to HTTP response body. When the
result type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define response headers.
  `array` types must use primitive types to define their elements.

For **gRPC**,

* [Message DSL](https://godoc.org/goa.design/goa/dsl#Message) defines values
  loaded into a gRPC message.
* [Headers DSL](https://godoc.org/goa.design/goa/dsl#Headers) defines values
  loaded into a gRPC header metadata.
* [Trailers DSL](https://godoc.org/goa.design/goa/dsl#Trailers) defines values
  loaded into a gRPC trailer metadata.

By default, the result attributes are mapped to gRPC message. When the
result type is a primitive type, an array or a map the following restrictions
apply:

* only `primitive` or `array` types may be used to define gRPC header/trailer
  metadata
