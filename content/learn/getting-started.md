+++
title = "Getting Started"
weight = 2

[menu.main]
name = "Getting Started"
parent = "learn"
+++

This guide walks you through writing a complete service in Goa. The simple
service implements the basic example found in the
[GitHub repository](https://github.com/goadesign/examples/tree/master/basic). The
instructions assume the use of Go modules and as such require Go version 1.11 or
greater.

## Prerequisites

The instructions below create a new project under your home directory. You can
replace `$HOME` with any other location. The guide assumes a Go setup that uses
Go modules (the default starting with Go 1.13).

```bash
cd $HOME
mkdir -p calc/design
cd calc
go mod init calc
```

Next install Goa:

```bash
go install goa.design/goa/v3/cmd/goa@v3
```

The service makes use of gRPC and as such requires both `protoc` and
`protoc-gen-go`.

* Download the `protoc` binary from [releases](https://github.com/google/protobuf/releases).
* Make sure `protoc` is in your path.
* Install the protoc plugin for Go:

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
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
	Description("Service for multiplying numbers, a Goa teaser")
    Server("calc", func() {
        Host("localhost", func() {
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})

var _ = Service("calc", func() {
	Description("The calc service performs operations on numbers.")

	Method("multiply", func() {
		Payload(func() {
			Field(1, "a", Int, "Left operand")
			Field(2, "b", Int, "Right operand")
			Required("a", "b")
		})

		Result(Int)

		HTTP(func() {
			GET("/multiply/{a}/{b}")
		})

		GRPC(func() {
		})
	})

	Files("/openapi.json", "./gen/http/openapi.json")
})
```

The design describes a service named `calc` defining a single method `multiply`.
`multiply` takes a payload as input that consists of two integers and returns an
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
goa gen calc/design
```

The command outputs the names of the files it generates. If the target
directory is not specified, the command generates the files in the current
working directory. The generated files should look like this:

```
gen
├── calc
│   ├── client.go
│   ├── endpoints.go
│   └── service.go
├── grpc
│   ├── calc
│   │   ├── client
│   │   │   ├── cli.go
│   │   │   ├── client.go
│   │   │   ├── encode_decode.go
│   │   │   └── types.go
│   │   ├── pb
│   │   │   ├── calc.pb.go
│   │   │   └── calc.proto
│   │   └── server
│   │       ├── encode_decode.go
│   │       ├── server.go
│   │       └── types.go
│   └── cli
│       └── calc
│           └── cli.go
└── http
    ├── calc
    │   ├── client
    │   │   ├── cli.go
    │   │   ├── client.go
    │   │   ├── encode_decode.go
    │   │   ├── paths.go
    │   │   └── types.go
    │   └── server
    │       ├── encode_decode.go
    │       ├── paths.go
    │       ├── server.go
    │       └── types.go
    ├── cli
    │   └── calc
    │       └── cli.go
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
goa example calc/design
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
```

`calc.go` contains a dummy implementation of the `multiply` method described in the
design. The only thing left for us to do is to provide the actual
implementation, build, and run the server and client.

Open the file `calc.go` and implement the `Multiply` method:

```go
func (s *calcsrvc) Multiply(ctx context.Context, p *calc.MultiplyPayload) (res int, err error) {
  return p.A * p.B, nil
}
```

The `goa example` command uses the optional
[Server DSL](https://godoc.org/goa.design/goa/dsl#Server)
described in the design to generate buildable server and client files.
It builds one directory in `cmd` for each `Server` DSL specified in the
design. Here we defined a single server `calc` which listens for HTTP
requests on port 8000.

## Complete file and folder summary

Below is a summary of all the files and folders created when running `goa gen` and `goa example`.

<details>
    <summary>Files and folders</summary>

| File/Folder  | Description|
|---|---|
| `/calc.go`| A placeholder implementation of your service. You can write your actual business logic here. You might think this file belongs in the `/cmd/calc` folder with the API implementation, instead of in the root of the project. But Goa puts the API implementation in the `cmd` folder and all service implementations in the root. |
| `/cmd`| Contains working placeholder server and CLI code. Think of the `cmd` folder as your `implementation` folder. |
| `/cmd/calc`| A Go package containing your API that you can compile and run to have a working server.  |
| `/cmd/calc/main.go`| The server implementation that you can change to your liking. Add your favorite logger and database manager here. |
| `/cmd/calc-cli`| A Go package containing a CLI tool that you can compile and call from the terminal to make requests to the server above.|
| `/gen`| Contains all definition and communication code for HTTP, gRPC, and schemas. Think of the `gen` folder as your `definitions` folder.
| `/gen/calc` | Contains transport-independent service code.  |
| `/gen/calc/client.go`  | Can be imported by client code to make calls to the server.  |
| `/gen/calc/endpoints.go` | Exposes the service code to the transport layers.|
| `/gen/grpc`| Contains the server and client code which connects the protoc-generated gRPC server and client code, along with the logic to encode and decode requests and responses. |
| `/gen/grpc/calc/pb` | Contains the protocol buffer files that describe the band gRPC service. |
| `/gen/grpc/calc/pb/goagen_app_calc_grpc.pb.go`| The output of the protoc tool.  |
| `/gen/grpc/cli`  | Contains the CLI code to build gRPC requests from a terminal. |
| `/gen/http`   | All HTTP-related transport code, for server and client.          |
| `/gen/http/openapi3.yaml`  | The OpenAPI version 3 schema (next to .json schemas, and version 1 schemas). |
</details>

## Building and Running the Service

The generated server and client code are built and run as follows:

```bash
go build ./cmd/calc && go build ./cmd/calc-cli

# Run the server

./calc
[calcapi] 21:35:36 HTTP "Multiply" mounted on GET /multiply/{a}/{b}
[calcapi] 21:35:36 HTTP "./gen/http/openapi.json" mounted on GET /openapi.json
[calcapi] 21:35:36 serving gRPC method calc.Calc/Multiply
[calcapi] 21:35:36 HTTP server listening on "localhost:8000"
[calcapi] 21:35:36 gRPC server listening on "localhost:8080"

# Run the client

# Contact HTTP server
$ ./calc-cli --url="http://localhost:8000" calc multiply --a 1 --b 2
2

# Contact gRPC server
$ ./calc-cli --url="grpc://localhost:8080" calc multiply --message '{"a": 1, "b": 2}'
2
```

## Some useful functions

You're now able to design, build, and run a simple service. You might want to extend it with some common OpenAPI objects. Below are a few useful Goa functions for this.

### Meta
If you can't find a function in the Goa documentation that corresponds to an OpenAPI field you are expecting, you can probably add it with the [`Meta`](https://pkg.go.dev/goa.design/goa/dsl#Meta) function. `Meta` will add a field and value to any object.

For example, here's how you can change the default `operationId` value for a method, which is normally `serviceName#methodPath`:

```go
Method("multiply", func() {
  Meta("openapi:operationId", "numbers#crunch")
```

### Tag

The [`Tag`](https://pkg.go.dev/goa.design/goa/dsl#Tag) function in Goa has a different meaning to in OpenAPI, so you need to use the `Meta` function again, in the `HTTP` section of a method.

```go
var _ = Service("calc", func() {
	Method("multiply", func() {
		HTTP(func() {
			Meta("openapi:tag:Number operations")
```

### Extensions

OpenAPI supports fields that are not in the specification. These [extensions](https://swagger.io/docs/specification/openapi-extensions/) allow you to add custom data to your schema. They start with `x-`.

```go
Method("multiply", func() {
  Meta("openapi:extension:x-synonym", "times")
```

## Summary

As you can see, Goa accelerates service development by making it possible to write
the single source of truth from which server and client code as well as
documentation is automatically generated. The ability to focus on API design
enables a robust and scalable development process where teams can review and
agree on APIs prior to starting the implementation. Once the design is finalized
the generated code takes care of all the laborious work involved in writing the
marshaling and unmarshaling of data including input validation (try calling the
calc service using a non-integer value for example).

## Next Steps

This example only touches on the basics of Goa, the <a href="../../design/overview">design overview</a> covers many other aspects.

You may also want to take a look at the other [examples](https://github.com/goadesign/examples). The DSL package [GoDoc](https://godoc.org/goa.design/goa/dsl) includes many code snippets and provides a great reference when writing designs.

If you need help, use the Go Slack group:
- Register for the group at https://invite.slack.golangbridge.org.
- Log in at https://gophers.slack.com.
- Join the Goa channel to ask questions about the framework.

But one of the fastest ways to find out how to do something, especially when using `Meta`, is to search the test cases, after cloning the [source code](https://github.com/goadesign/goa).



