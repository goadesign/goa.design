---
title: Quickstart
weight: 1
description: "Complete guide to installing Goa and building your first service - from setup to running a working HTTP endpoint."
llm_optimized: true
aliases:
---

This guide walks you through installing Goa and creating your first service. By the end, you'll have a working HTTP API that you can extend and customize.

## Prerequisites

Before you begin, ensure your environment meets these requirements:

- **Go 1.18 or later** - Goa leverages modern Go features
- **Go Modules enabled** - This is the default in Go 1.16+, but verify with `GO111MODULE=on` if needed
- **curl or any HTTP client** - For testing your service

## Installation

Install the Goa packages and CLI tool:

```bash
# Pull the Goa packages
go get goa.design/goa/v3/...

# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Verify the installation
goa version
```

You should see the current Goa version (e.g., `v3.x.x`). If the `goa` command isn't found, ensure your Go bin directory is in your PATH:

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

---

## Create Your First Service

Now let's build a simple "hello world" service that demonstrates Goa's design-first approach.

### 1. Project Setup

Create a new directory and initialize a Go module:

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> **Note:** We're using a simple module name `hello` for this guide. In real projects, you'd typically use a domain name like `github.com/yourusername/hello-goa`. The concepts work exactly the same way.

### 2. Design Your API

Goa uses a powerful DSL (Domain Specific Language) to describe your API. Create a design directory and file:

```bash
mkdir design
```

Create `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("A simple service that says hello.")

    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "A greeting message")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Let's break down what this design does:

- **`Service("hello", ...)`** - Defines a new service named "hello"
- **`Method("sayHello", ...)`** - Defines a method within the service
- **`Payload(String, ...)`** - Specifies the input: a string representing the name to greet
- **`Result(String, ...)`** - Specifies the output: a greeting message
- **`HTTP(func() { GET("/hello/{name}") })`** - Maps the method to an HTTP GET endpoint where `{name}` is automatically bound to the payload

This declarative approach means you describe *what* your API does, and Goa handles the implementation details: parameter binding, routing, validation, and OpenAPI documentation.

### 3. Generate Code

Transform your design into a fully functional service structure:

```bash
goa gen hello/design
```

This creates a `gen` folder containing:
- Service interfaces and endpoints
- HTTP transport layer (handlers, encoders, decoders)
- OpenAPI/Swagger specifications
- Client code

Now scaffold a working implementation:

```bash
goa example hello/design
```

> **Important:** The `gen` command regenerates the `gen/` folder each time you run it. The `example` command creates starter implementation files that you own and customize - Goa won't overwrite them on subsequent runs.

Your project structure now looks like this:

```
hello-goa/
├── cmd/
│   ├── hello/           # Server executable
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli/       # CLI client
│       ├── http.go
│       └── main.go
├── design/
│   └── design.go        # Your API design
├── gen/                 # Generated code (don't edit)
│   ├── hello/
│   └── http/
└── hello.go             # Your service implementation
```

### 4. Implement the Service

Open `hello.go` and find the `SayHello` method. Replace it with your implementation:

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
    log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Hello, %s!", name), nil
}
```

That's all the business logic you need - Goa handles everything else.

### 5. Run and Test

First, download dependencies:

```bash
go mod tidy
```

Start the server:

```bash
go run ./cmd/hello --http-port=8080
```

You should see:

```
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

Test with curl (in a new terminal):

```bash
curl http://localhost:8080/hello/Alice
```

Response:

```
"Hello, Alice!"
```

🎉 Congratulations! You've built your first Goa service.

#### Using the Generated CLI Client

Goa also generated a command-line client. Try it:

```bash
go run ./cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Explore available commands:

```bash
go run ./cmd/hello-cli --help
```

---

## Ongoing Development

As your service evolves, you'll modify the design and regenerate code:

```bash
# After updating design/design.go
goa gen hello/design
```

Key points:
- **`gen/` folder** - Regenerated each time; never edit these files directly
- **Your implementation files** - Yours to customize; Goa won't overwrite them
- **New methods** - Add to your design, regenerate, then implement the new method stubs

---

## Next Steps

You've learned the fundamentals of Goa's design-first approach. Continue your journey:

- **[DSL Reference](./dsl-reference.md)** - Complete guide to Goa's design language
- **[HTTP Guide](./http-guide.md)** - Deep dive into HTTP transport features
- **[gRPC Guide](./grpc-guide.md)** - Build gRPC services with Goa
- **[Error Handling](./error-handling.md)** - Define and handle errors properly
- **[Code Generation](./code-generation.md)** - Understand what Goa generates and how to customize it
