---
title: "Designing gRPC Services"
linkTitle: "Designing"
weight: 1
description: "Learn to design gRPC services with Goa, including service definition, method annotations, protobuf generation, and proper gRPC status code mappings."
---

In this tutorial, you'll **design** a simple gRPC service with Goa. While Goa is
often used for REST endpoints, it also has first-class support for **gRPC**
transports. You'll see how to:

- Define a service and methods in the Goa DSL.
- Annotate them for gRPC, ensuring the generated code produces `.proto` files.
- Validate payloads and map errors to gRPC status codes.

## What We'll Build

We'll create a **`greeter`** service that has a single method called `SayHello`.
The method receives a name in the payload and returns a greeting message. We'll
also show how to **qualify** gRPC responses with standard gRPC codes.

| Method   | gRPC RPC      | Description                                 |
|----------|---------------|---------------------------------------------|
| SayHello | rpc SayHello  | Return a greeting given a user-provided name |

## 1. Create a New Module & Folder

Create a fresh Go module for this project `grpcgreeter`:

```bash
mkdir grpcgreeter
cd grpcgreeter
go mod init grpcgreeter
```

Inside this folder, set up a `design/` directory to hold your DSL files:

```bash
mkdir design
```

## 2. Write the Service Design

Create a file named `design/greeter.go` with the following content:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// Define a gRPC-based greeter service.
var _ = Service("greeter", func() {
    Description("A simple gRPC service that says hello.")

    Method("SayHello", func() {
        Description("Send a greeting to a user.")

        // Define the request payload (what the client sends).
        Payload(func() {
            Field(1, "name", String, "Name of the user to greet", func() {
                Example("Alice")
                MinLength(1)
            })
            Required("name")
        })

        // Define the result (what the server returns).
        Result(func() {
            Field(1, "greeting", String, "A friendly greeting message")
            Required("greeting")
        })

        // Indicate this method should be exposed via gRPC.
        GRPC(func() {
            // The default code for a successful response is CodeOK (0).
            // You can also define custom mappings if needed:
            // Response(CodeOK)
        })
    })
})
```

### Key Points

- We use `Method("SayHello", ...)` to define the remote procedure call.
- **Payload** specifies the input fields. In gRPC terms, this becomes the request
  message.
- **Result** defines the output fields. In gRPC terms, this becomes the response
  message.
- Adding **`GRPC(func() {...})`** ensures the generated code includes `.proto`
  definitions and stubs for this method.
- We use `Field(1, "name", String, ...)` to define the fields in the request and
  response messages. The numbers are the tags in the generated `.proto` file.
  Note that this replaces the use of `Attribute` for defining fields in HTTP
  methods. Methods that support both HTTP and gRPC transports can use `Field`
  for defining fields (the tag is ignored for HTTP).

## 3. Next Steps

With your **gRPC service design** in place, proceed to the next tutorial:

- [Implementing the Service](./2-implementing.md):
  Generate code, wire up your custom logic, and learn how to run a gRPC server in
  Goa.
- [Running the Service](./3-running.md):
  Explore how to use the official gRPC CLI or other tools to call your endpoints
  and ensure everything works correctly.

You've now **designed** a minimal gRPC service using Goa. The DSL approach gives
you a **single source of truth** for request/response types, validations, and
gRPC status mappings—making your service **easy to evolve** and **maintain** over
time!
