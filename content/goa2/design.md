+++
title = "Design Overview"
weight = 3

[menu.main]
name = "Design Overview"
parent = "goa2"
+++

## Design DSL




## Data Types

goa2 supports primitive types, array, map, and object types.

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


**User-defined types** can be defined in goa2 using the [Type](https://godoc.org/goa.design/goa/dsl#Type)
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

## Transport-Service Type Mapping


## Validations


## Error Handling


## Middleware
