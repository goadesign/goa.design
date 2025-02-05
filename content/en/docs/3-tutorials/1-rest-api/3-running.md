---
title: Running
weight: 3
---

# Running the Concerts Service

You've **designed** your API and **implemented** the service methods. Now it's
time to **run** the Concerts service. This tutorial shows how to start the server,
test its endpoints, and take advantage of the auto-generated **OpenAPI** docs.

## 1. Start the Server

From your project root, simply build and run your app. For example, if your
`main.go` is in `cmd/concerts/main.go`, you can do:

```bash
go run concerts/cmd/concerts
```

When it starts, the service **listens on port 8080** by default (unless you
modified the code in `main.go` to use another port).

## 2. Test the Endpoints

You can now **send requests** to the service using tools like `curl`, HTTPie, or
Postman:

- **List concerts** (GET):

```bash
curl http://localhost:8080/concerts
```

- **Create a concert** (POST):

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Rolling Stones",
    "date": "2025-05-01",
    "venue": "Wembley Stadium",
    "price": 150
  }'
```

- **Show a concert** (GET), assuming you have a `concertID` returned from create:

```bash
curl http://localhost:8080/concerts/<concertID>
```

- **Update** (PUT):

```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Beatles",
    "venue": "Madison Square Garden"
  }'
```

- **Delete** (DELETE):

```bash
curl -X DELETE http://localhost:8080/concerts/<concertID>
```

## 3. Viewing Your Goa API Documentation

Goa automatically generates OpenAPI documentation files for your API in both
version 2.x and 3.0.0 formats. These files are located in the `gen/http/`
directory and contain comprehensive descriptions of your:

- API routes
- Request payloads
- Response formats

### Using Swagger UI to View and Test Your API

Swagger UI provides an interactive interface to explore and test your API. Here's how to set it up locally:

#### Prerequisites

- **Docker**: For running the Swagger UI container.

#### Steps to Set Up Swagger UI

1. **Run the Swagger UI container** and map the container’s port to your host:

```bash
docker run -p 8081:8080 swaggerapi/swagger-ui
```

2. **Access Swagger UI** by opening `http://localhost:8081` in your browser.

3. Load your API documentation by entering the URL where your OpenAPI file is
   hosted (i.e. `http://localhost:8080/openapi3.yaml`).

Once loaded, you’ll see an **interactive** documentation page for your Concerts
API. You can inspect available endpoints, view payload and response schemas,
and even send test requests from the browser.

#### Other Options

- **Redoc**: Another open-source UI for OpenAPI specs.
- **OpenAPI Generator**: Generate client libraries in languages like Python,
  TypeScript, or Java.
- **Speakeasy**: Generate client libraries in languages like Python,
  TypeScript, or Java, see [Speakeasy](https://arc.net/l/quote/bwsorqsa).
- **Serve OpenAPI from Your Service**: Add a route in your `main.go` to serve
  `openapi3.yaml` at `/docs/openapi3.yaml` (for example).

## 4. Next Steps

The [Transport Mapping](../4-concepts/1-design-language/3-transport-mapping) section provides a
detailed guide on mapping your service's payloads and results to HTTP transport
elements. You'll learn how to:

- Map fields to URL path parameters
- Include data in query strings
- Set and read HTTP headers
- Structure request and response bodies
- Handle different content types
- Configure custom encoders and decoders

In a production setting, you might also:

- **Secure endpoints** with authentication and authorization, see
  [Security](../5-real-world/1-security).
- **Add logs or tracing** to see how your service behaves in real time, see
  [Observability](../5-real-world/2-observability).
- **Rate limit** access to the service with [Interceptors](../4-concepts/3-interceptors).

With your service running and responding to requests, you have a
**fully operational** Goa-based Concerts API.

Congratulations—you’ve built and tested a **complete** RESTful service using
Goa’s design-first approach!