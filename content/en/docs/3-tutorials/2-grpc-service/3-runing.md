---
title: "Running the Service"
weight: 3
---

# Running and Testing the gRPC Service

After designing and implementing your gRPC-based Goa service, you’ll want to
**run** it locally and confirm it works as expected. In this tutorial, we’ll:

1. **Launch** the gRPC server.
2. **Test** the service using gRPC tools.
3. **Review** common next steps for real-world usage.

## 1. Launch the Server

From your project’s root (e.g., `grpcgreeter/`), run the `main.go` you created in
the `cmd/greeter/` folder:

```bash
go run grpcgreeter/cmd/greeter
```

If everything is set up correctly, the service **listens** on port `8090` (as
specified in `main.go`).

You should see a log message like:

```
gRPC greeter service listening on :8090
```

This indicates the service is active and **ready** to receive gRPC requests.

## 2. Test the Service

### gRPC CLI

If you have the official gRPC CLI tool installed (`brew install grpc` on MacOS),
you can simply test your service with:

```bash
grpc_cli call localhost:8090 SayHello "name: 'Alice'"
```

This sends an RPC to the `SayHello` method with the `name` field set to `"Alice"`.
This works because the service is configured to enable server reflection.

### gRPCurl

[gRPCurl](https://github.com/fullstorydev/grpcurl) (`brew install grpcurl` on
MacOS) is another popular tool that can be used to test gRPC services:

```bash
grpcurl -plaintext -d '{"name": "Alice"}' localhost:8090 greeter.Greeter/SayHello
```

### Custom Client

You can also write a **small Go client** using the generated client code. For
instance:

```go
package main

import (
	"context"
	"fmt"
	"log"

	gengreeter "grpcgreeter/gen/greeter"
	genclient "grpcgreeter/gen/grpc/greeter/client"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Set up a connection to the server
	conn, err := grpc.Dial("localhost:8090", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Create a gRPC client using Goa's generated code
	grpcc := genclient.NewClient(conn)
	c := gengreeter.NewClient(grpcc.SayHello())

	// Make the RPC call
	res, err := c.SayHello(context.Background(), &gengreeter.SayHelloPayload{"Alice"})
	if err != nil {
		log.Fatalf("Error calling SayHello: %v", err)
	}

	// Print the response
	fmt.Printf("Server response: %s\n", res.Greeting)
}
```

Compile and run this client, and it should print the greeting returned by your
service.

## 3. Common Next Steps

- **Secure endpoints** with authentication and authorization, see
  [Security](../5-real-world/1-security).
- **Add logs** to your service methods to track incoming requests or use
  a distributed tracing system (like OpenTelemetry) for deeper insights, see
  [Observability](../5-real-world/2-observability).
- **Return gRPC status codes** when errors occur. Goa allows you to specify
  error mappings in the DSL (e.g., `Response(CodeNotFound)`), aligning with
  typical gRPC patterns.

---

That’s it! You now have a **running gRPC service** built with Goa, tested either
via the official gRPC CLI or a custom Go client. Continue exploring the DSL to
add more features—like **streaming**, **authentication interceptors**, or
**automatic code generation** for multiple environments. You’re well on your
way to a **robust** Go-based microservices architecture with minimal boilerplate!
