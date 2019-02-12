+++
title = "Introduction to goa2"
+++

goa2 makes it possible to describe the services in a transport agnostic way.
The service methods DSLs each describe the method input and output types.
Transport specific DSL then describe how the method input is built from
incoming data and how the output is serialized. For example, a method may
specify that it accepts an object composed of two fields as input then the
HTTP specific DSL may specify that one of the attributes is read from the
incoming request headers while the others from the request body.

This clean decoupling means that the same service implementation can expose
endpoints accessible via multiple transports such as HTTP and/or gRPC.
goa2 takes care of generating all the transport specific code including
encoding, decoding, and validations. User code only has to focus on the actual
service method implementations.

## Support for gRPC

In addition to HTTP, goa2 supports [gRPC](https://grpc.io/).
[goa GRPC DSL](https://godoc.org/goa.design/goa/dsl#GRPC) can be used to
generate [gRPC service definition](https://grpc.io/docs/guides/concepts.html#service-definition)
using protocol buffer. The code generator compiles the generated service
definition using the [protocol buffer compiler](https://developers.google.com/protocol-buffers/docs/proto3#generating) with the gRPC plugin and generates a Go file consisting of
protocol buffer types, gRPC server, and client code. goa then hooks up the
gRPC client and server code with the goa generated client and server code.
goa uses the [proto3 syntax](https://developers.google.com/protocol-buffers/docs/proto3)
for generating gRPC service definitions.
