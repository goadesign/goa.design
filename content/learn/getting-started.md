+++
title = "Getting Started"
weight = 2

[menu.main]
name = "Getting Started"
parent = "learn"
+++

This guide walks you through writing a complete service in goa. The simple
service implements the basic example found in the
[github repository](https://github.com/goadesign/examples/basic). The
instructions assume the use of Go modules and as such require Go version 1.11 or
greater.

## Prerequisites

The instructions below create a new project under your home directory. You can
replace `$HOME` with any other location. The only caveat is that if you choose a
directory that lives under your `GOPATH` then you need to make sure that modules
are enabled by setting the environment variable `GO111MODULE` to `on`.

```bash
cd $HOME
mkdir -p calc/design
cd calc
go mod init calc
```

Next make sure the Goa module is installed and up-to-date:

```bash
go get -u goa.design/goa/v3
go get -u goa.design/goa/v3/...
```

## Design

In this next step we are going to design our service API. This step being
explicit is one of the key differentiator of the Goa framework: Goa lets you
think about your APIs independently of any implementation concern and then
review that design with all stakeholders before writing the implementation. This
is a big boon in larger organizations where different teams may need to
implement and consume services. Open the file `$HOME/calc/design/design.go` and
write the following code:


```go
package design

import (
	. "goa.design/goa/v3/dsl"
)

var _ = API("calc", func() {
	Title("Calculator Service")
	Description("Service for adding numbers, a goa teaser")
})

var _ = Service("calc", func() {
	Description("The calc service performs operations on numbers.")

	Method("add", func() {
		Payload(func() {
			Field(1, "a", Int, "Left operand")
			Field(2, "b", Int, "Right operand")
			Required("a", "b")
		})

		Result(Int)

		HTTP(func() {
			GET("/add/{a}/{b}")
		})

		GRPC(func() {
		})
	})

	Files("/openapi.json", "../../gen/http/openapi.json")
})
```

The design describes a service named `calc` defining a single method `add`.
`add` takes a payload as input that consists of two integers and returns an
integer. The method also describes transport mappings to both HTTP and gRPC. The
HTTP transport uses URL parameters to carry the input integers while the gRPC
transport uses a message (not explicitly shown in the design as it is the
default behavior). Both the HTTP and gRPC transports use the status code `OK` in
responses (also the default).

Finally, the design exposes a HTTP file server endpoint which serves the
generated [OpenAPI](https://www.openapis.org/) specification.

>The example above covers a fraction of what Goa can do. More examples can be
>found in the [examples repo](https://github.com/goadesign/examples). The
>[Goa DSL package GoDoc](https://godoc.org/goa.design/goa/dsl) lists all the DSL
>keywords together with a description and example usage for each.

## Code Generation

### `goa gen` Command

Now that we have a design for our service, we can run the `goa gen` command to
generate the boilerplate code. The command takes the design package import path
as an argument. It also accepts the path to the output directory as an optional
flag. Since our design package was created under the `calc` module the command
line is:

```bash
goa gen adder/design
```

The command outputs the names of the files it generates. If the target
directory is not specified, the command generates the files in the current
working directory. The generated files should look like this:

```
├── design
│   └── design.go
└── gen
    ├── calc
    │   ├── client.go
    │   ├── endpoints.go
    │   └── service.go
    ├── grpc
    │   ├── calc
    │   │   ├── client
    │   │   │   ├── client.go
    │   │   │   ├── cli.go
    │   │   │   ├── encode_decode.go
    │   │   │   └── types.go
    │   │   ├── pb
    │   │   │   ├── calc.pb.go
    │   │   │   └── calc.proto
    │   │   └── server
    │   │       ├── encode_decode.go
    │   │       ├── server.go
    │   │       └── types.go
    │   └── cli
    │       └── calc
    │           └── cli.go
    └── http
        ├── calc
        │   ├── client
        │   │   ├── client.go
        │   │   ├── cli.go
        │   │   ├── encode_decode.go
        │   │   ├── paths.go
        │   │   └── types.go
        │   └── server
        │       ├── encode_decode.go
        │       ├── paths.go
        │       ├── server.go
        │       └── types.go
        ├── cli
        │   └── calc
        │       └── cli.go
        ├── openapi.json
        └── openapi.yaml
```

The `gen` directory contains the `calc` sub-directory which houses the
transport-independent service code. The `endpoints.go` file creates a
[Goa endpoint](https://godoc.org/goa.design/goa#Endpoint) which exposes
the transport-agnostic service code to the transport layers.

The `grpc` directory contains the protocol buffer file (`pb/calc.proto`) that
describes the `calc` gRPC service as well as the output of the `protoc`
[tool](https://developers.google.com/protocol-buffers/docs/proto3#generating)
(`pb/calc.pb.go`). The directory also contains the server and client code which
hooks up the protoc-generated gRPC server and client code along with the logic
to encode and decode requests and responses. Finally the `cli` subdirectory
contains the CLI code to build gRPC requests from the command line.

The `http` sub-directory describes the HTTP transport which defines server and
client code with the logic to encode and decode requests and responses and the
CLI code to build HTTP requests from the command line. It also contains the
Open API 2.0 specification files in both json and yaml formats.

### `goa example` Command

We can now run the `goa example` command to generate a basic implementation of
the service along with buildable server files that spins up goroutines to start
a HTTP and a gRPC server and client files that can make requests to the server.

> Note: the code generated by `goa gen` cannot be edited. This directory is
> re-generated entirely from scratch each time the command is run (e.g. after
> the design has changed). This is by design to keep the interface between
> generated and non generated code clean and using standard Go constructs (i.e.
> function calls). The code generated by `goa example` however is *your* code.
> You should modify it, add tests to it etc. This command generates a starting
> point for the service to help bootstrap development - in particular it is NOT
> meant to be re-run when the design changes. Instead simply edit the files
> accordingly.

```bash
goa example adder/design
```

The `goa example` command creates the following files

```

├── calc.go
├── cmd
│   ├── calc
│   │   ├── grpc.go
│   │   ├── http.go
│   │   └── main.go
│   └── calc-cli
│       ├── grpc.go
│       ├── http.go
│       └── main.go
├── design
└── gen
```

`calc.go` contains a dummy implementation of the `add` method described in the
design. The only thing left for us to do is to provide the actual
implementation, build, and run the server and client.

Open the file `calc.go` and implement the `Add` method:

```go
func (s *calcSvc) Add(ctx context.Context, p *calcsvc.AddPayload) (int, error) {
  return p.A + p.B, nil
}
```

The `goa example` command uses the optional [Server DSL](https://godoc.org/goa.design/goa/dsl#Server)
described in the design to generate buildable server and client files.
It builds one directory in `cmd` for each `Server` DSL specified in the
design. If a `Server` DSL is not specified in the design, goa creates a default
server exposing the `calc` service in a single host listening on "localhost"
and using port 80 for HTTP endpoints and port 8080 for gRPC endpoints.

## Building and Running the Service

The generated server and client code are built and run as follows:

```bash
go build ./cmd/calc && go build ./cmd/calc-cli

# Run the server

./calc
[calc] 12:27:57 HTTP "Add" mounted on GET /add/{a}/{b}
[calc] 12:27:57 HTTP "../../gen/http/openapi.json" mounted on GET /swagger.json
[calc] 12:27:57 serving gRPC method calc.Calc/Add
[calc] 12:27:57 HTTP server listening on "localhost:8000"
[calc] 12:27:57 gRPC server listening on "localhost:8080"

# Run the client

# Contact HTTP server
$ calc-cli --url="http://localhost:8000" calc add --a 1 --b 2
3

# Contact gRPC server
$ calc-cli --url="grpc://localhost:8080" calc add --message '{"a": 1, "b": 2}'
3
```

## Summary and Next Steps

As you can Goa accelerates service development by making it possible to write
the single source of truth from which server and client code as well as
documentation is automatically generated. The ability to focus on API design
enables a robust and scalable development process where teams can review and
agree on APIs prior to starting the implementation. Once the design is finalized
the generated code takes care of all the laborious work involved in writing the
marshaling and unmarshaling of data including input validation (try calling the
calc service using a non-integer value for example).

This example only touches on the basics of Goa, the
<a href="../design/overview">design overview</a> covers many other aspects. You
may also want to take a look at the other
[examples](https://github.com/goadesign/examples). Finally, the DSL package
[GoDoc](https://godoc.org/goa.design/goa/dsl) includes many code snippets and
provides a great reference when writing designs.