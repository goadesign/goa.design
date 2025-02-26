---
title: First Service
weight: 2
description: "Create your first Goa service with this hands-on tutorial, covering service design, code generation, implementation, and testing of a simple HTTP endpoint."
---

## Prerequisites

Ready to build something awesome? This guide assumes you have `curl` installed. Any other HTTP client will work as well.

## 1. Create a New Module

Let's start our journey by setting up a fresh workspace for your first Goa service:

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> Note: While we're using a simple module name `hello` for this guide, in real-world projects
> you'd typically use a domain name like `github.com/yourusername/hello-goa`. Don't worry -
> the concepts you'll learn work exactly the same way!

## 2. Design Your First Service

Now comes the exciting part - designing your service! Goa's powerful DSL will help you create
a clean, professional API in just a few lines of code.

1. **Add a `design` Folder**

```bash
mkdir design
```

2. **Create a Design File** (`design/design.go`):

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

- `Service("hello", ...)` defines a new service named "hello"
- Inside the service, we define a single method `sayHello` that:
  - Takes a string `Payload` - this will be the name we want to greet
  - Returns a string `Result` - our greeting message
  - Maps to an HTTP GET endpoint at `/hello/{name}` where `{name}` will be automatically bound to our payload

This simple design showcases Goa's declarative approach - we describe _what_ we want our API to do, and Goa handles all the implementation details like parameter binding, routing, and OpenAPI documentation.

## 3. Generate Code

Here's where the magic happens! Let's use Goa's code generator to transform your design into
a fully functional service structure:

```bash
goa gen hello/design
```

This creates a `gen` folder containing everything you need - endpoints, transport logic, and even
OpenAPI specs. Pretty cool, right?

Now, let's scaffold a working service with the `example` command:

```bash
goa example hello/design
```

> Note: Think of the `example` command as your starting point - it gives you a working implementation
> that you can build upon. While you'll re-run `gen` when your design changes, the code from `example`
> is yours to customize and enhance.

Here's what you'll find in your `hello-goa` folder:

```
hello-goa
├── cmd
│   ├── hello
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli
│       ├── http.go
│       └── main.go
├── design
│   └── design.go
├── gen
│   ├── ...
│   └── http
└── hello.go
```

## 4. Implement the Service

Time to bring your service to life! Edit the `hello.go` file and replace the
`SayHello` method with this welcoming implementation:

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
	log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Hello, %s!", name), nil
}
```

You're almost there - and wasn't that surprisingly simple?

## 5. Run & Test

### Launch the Server

First, let's get all our dependencies in order:

```bash
go mod tidy
```

Now for the moment of truth - let's bring your service online:

```bash
go run hello/cmd/hello --http-port=8080
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

### Call the Service

Open a new terminal and let's see your service in action:

```bash
curl http://localhost:8080/hello/Alice
"Hello, Alice!"
```

🎉 Amazing! You've just created and deployed your first Goa service. This is just the beginning
of what you can build with Goa!

### Using the CLI Client

Want to try something even cooler? Goa automatically generated a command-line client for you.
Give it a spin:

```bash
go run hello/cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Curious about what else the CLI can do? Check out all the features:

```bash
go run hello/cmd/hello-cli --help
```

## 6. Ongoing Development

### Edit DSL → Regenerate

As your service grows, you'll want to add new features. Whenever you update your design with
new methods, fields, or errors, just run:

```bash
goa gen hello/design
```

Your service code is yours to evolve - Goa won't touch anything outside the `gen` folder,
so feel free to enhance and customize to your heart's content!

## 7. Next Steps

Ready to take your Goa skills to the next level? Dive into our [Tutorials](../3-tutorials) where
you'll learn to build powerful REST APIs, gRPC services, and much more. The possibilities are endless!