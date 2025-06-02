---
title: Running the Concerts Service
linkTitle: Running
weight: 3
description: "Learn how to run your Goa-based Concerts service, test the REST endpoints using HTTP requests, and explore the auto-generated OpenAPI documentation."
---

You've designed your API and implemented the service methods. Now it's time to
run the Concerts service and test its endpoints.

## 1. Start the Server

From your project root, build and run your app:

```bash
go run cmd/concerts/main.go
```

The service listens on port 8080 by default (unless modified in `main.go`). You should see output like:

```
"List" mounted on GET /concerts
"Create" mounted on POST /concerts
"Show" mounted on GET /concerts/{concertID}
"Update" mounted on PUT /concerts/{concertID}
"Delete" mounted on DELETE /concerts/{concertID}
Starting concerts service on :8080
```

## 2. Test the Endpoints

Let's explore your shiny new API! You can interact with your service using popular HTTP tools:

- `curl` for quick command-line testing
- [HTTPie](https://httpie.org) for a more user-friendly CLI experience
- [Postman](https://www.postman.com/) for a powerful GUI interface with request history and collections

Pick your favorite tool and let's start making some requests! 🚀
We'll use `curl` for these examples since it's universally available on most
systems. However, feel free to adapt the examples to your preferred HTTP client,
the concepts remain the same regardless of the tool you use.

Here's what we'll test:
- Creating a new concert (`POST`)
- Listing all concerts with pagination (`GET`)
- Retrieving a specific concert (`GET`)
- Updating concert details (`PUT`)
- Deleting a concert (`DELETE`)

### Create a Concert

Let's create a new concert! This request sends a POST with the concert details
in JSON format. The server will generate a unique ID and return the complete
concert object.

Note that prices are stored in cents (e.g., 8500 = $85.00):

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The White Stripes",
    "date": "2024-12-25",
    "venue": "Madison Square Garden, New York, NY",
    "price": 8500
  }'
```

Let's create another one to illustrate pagination:

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "Pink Floyd",
    "date": "2025-07-15", 
    "venue": "The O2 Arena, London, UK",
    "price": 12000
  }'
```

### List Concerts

Get all concerts with optional pagination parameters:

- `page`: Page number (default: 1, minimum: 1)
- `limit`: Results per page (default: 10, range: 1-100)

The list endpoint supports pagination to help you manage large sets of concert data efficiently. You can control how many results you see per page and which page to view.

Retrieve all concerts (uses default pagination):

```bash
curl http://localhost:8080/concerts
```

Get one result per page:

```bash
curl "http://localhost:8080/concerts?page=1&limit=1"
```

Get page 2 with 5 results:

```bash
curl "http://localhost:8080/concerts?page=2&limit=5"
```

### Show a Concert

When you need detailed information about a specific concert, use the show endpoint. This is useful for displaying individual concert details or verifying information after creation/updates.

Replace `<concertID>` with an ID returned from create (e.g., `550e8400-e29b-41d4-a716-446655440000`):

```bash
curl http://localhost:8080/concerts/<concertID>
```

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "artist": "The White Stripes",
  "date": "2024-12-25",
  "venue": "Madison Square Garden, New York, NY",
  "price": 8500
}
```

### Update a Concert

Need to change concert details? The update endpoint lets you modify existing concert information. You only need to include the fields you want to update - other fields will retain their current values.

Update multiple fields:

```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The White Stripes",
    "date": "2024-12-26",
    "venue": "Madison Square Garden, New York, NY",
    "price": 9000
  }'
```

Update just the price:

```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "price": 9500
  }'
```

### Delete a Concert

If a concert needs to be removed from the system (perhaps it was cancelled or entered by mistake), use the delete endpoint. This operation is permanent, so use it with care!

```bash
curl -X DELETE http://localhost:8080/concerts/<concertID>
```

## 3. Error Handling

The API returns consistent error responses with appropriate HTTP status codes:

### Not Found (404)
When requesting a concert that doesn't exist:

```bash
curl http://localhost:8080/concerts/invalid-id
```

Response:
```json
{
  "message": "Concert with ID invalid-id not found",
  "code": "not_found"
}
```

### Bad Request (400)
When creating a concert with invalid data:

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "",
    "date": "invalid-date",
    "venue": "",
    "price": -100
  }'
```

The API will return validation errors for:
- Empty artist names (must be 1-200 characters)
- Invalid date formats (must be YYYY-MM-DD)
- Empty venue names (must be 1-300 characters)
- Negative prices (must be ≥ 0 and ≤ 100000 cents)

## 4. Access API Documentation

Goa automatically generates OpenAPI documentation for your API. Once your service is running, you can access the specifications directly:

### OpenAPI Specifications

- **OpenAPI 3.0 JSON**: `http://localhost:8080/openapi3.json`
- **OpenAPI 3.0 YAML**: `http://localhost:8080/openapi3.yaml`

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

