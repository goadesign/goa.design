---
title: Running the Concerts Service
linkTitle: Running
weight: 3
description: "Learn how to run your Goa-based Concerts service, test the REST endpoints using HTTP requests, and explore the auto-generated OpenAPI documentation."
---

You've designed your API and implemented the service methods. Now it's time to run the Concerts service and test its endpoints.

{{< alert title="In This Tutorial" color="primary" >}}
1. Start the server
2. Test the endpoints with HTTP requests
3. Explore the auto-generated OpenAPI documentation
{{< /alert >}}

## 1. Start the Server

From your project root, build and run your app:

```bash
go run concerts/cmd/concerts
```

The service listens on port 8080 by default (unless modified in `main.go`).

## 2. Test the Endpoints

You can send requests to the service using tools like `curl`, HTTPie, or Postman.

### List Concerts
```bash
curl http://localhost:8080/concerts
```

### Create a Concert
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

### Show a Concert
Replace `<concertID>` with an ID returned from create:
```bash
curl http://localhost:8080/concerts/<concertID>
```

### Update a Concert
```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Beatles",
    "venue": "Madison Square Garden"
  }'
```

### Delete a Concert
```bash
curl -X DELETE http://localhost:8080/concerts/<concertID>
```

## 3. Access API Documentation

Goa automatically generates OpenAPI documentation for your API in both version 2.x and 3.0.0 formats. These files are located in the `gen/http/` directory.

### Using Swagger UI

{{< alert title="Quick Setup" color="primary" >}}
1. **Prerequisites**
   - Docker installed on your system

2. **Start Swagger UI**
   ```bash
   docker run -p 8081:8080 swaggerapi/swagger-ui
   ```

3. **View Documentation**
   - Open `http://localhost:8081` in your browser
   - Enter `http://localhost:8080/openapi3.yaml` in the Swagger UI
{{< /alert >}}

### Alternative Documentation Tools

- **Redoc**: Another popular OpenAPI documentation viewer
- **OpenAPI Generator**: Generate client libraries in various languages
- **Speakeasy**: Generate SDKs with enhanced developer experience

## Next Steps

Now that you've explored the basic API operations, learn more about how Goa handles [HTTP encoding and decoding](../4-encoding) to understand how requests and responses are processed.

