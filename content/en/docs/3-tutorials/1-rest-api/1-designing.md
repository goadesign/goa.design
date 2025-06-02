---
title: Designing a REST API
linkTitle: Designing
weight: 1
description: "Learn to design a complete REST API for managing concerts using Goa, including CRUD operations, pagination, proper HTTP mappings, and error handling."
---

This tutorial walks you through designing a REST API for managing music concerts using Goa. You'll learn how to create a complete API design that includes common operations, proper HTTP mappings, and error handling.

## What We'll Build

We'll create a `concerts` service that provides these standard REST operations:

| Operation | HTTP Method | Path | Description |
|-----------|------------|------|-------------|
| List | GET | /concerts | Get all concerts with pagination |
| Create | POST | /concerts | Add a new concert |
| Show | GET | /concerts/{id} | Get a single concert |
| Update | PUT | /concerts/{id} | Modify a concert |
| Delete | DELETE | /concerts/{id} | Remove a concert |

## The Design File

First let's create a new Go module to host our service.

```bash
mkdir concerts
cd concerts
go mod init concerts
```

Create a new file at `design/design.go` with the following content:

```go
package design

import (
	. "goa.design/goa/v3/dsl"
)

// API definition
var _ = API("concerts", func() {
	Title("Concert Management API")
	Description("A simple API for managing music concert information")
	Version("1.0")

	Server("concerts", func() {
		Description("Concert management server")
		Host("localhost", func() {
			URI("http://localhost:8080")
		})
	})
})

// Service definition
var _ = Service("concerts", func() {
	Description("The concerts service manages music concert data. It provides CRUD operations for concert information including artist details, venues, dates, and pricing.")

	Method("list", func() {
		Description("List concerts with optional pagination. Returns an array of concerts sorted by date.")
		Meta("openapi:summary", "List all concerts")

		Payload(func() {
			Attribute("page", Int, "Page number for pagination", func() {
				Minimum(1)
				Default(1)
				Example(1)
				Description("Must be 1 or greater")
			})
			Attribute("limit", Int, "Number of items per page", func() {
				Minimum(1)
				Maximum(100)
				Default(10)
				Example(10)
				Description("Must be between 1 and 100")
			})
		})

		Result(ArrayOf(Concert), func() {
			Description("Array of concerts")
		})

		HTTP(func() {
			GET("/concerts")

			Param("page", Int, "Page number", func() {
				Minimum(1)
				Example(1)
			})
			Param("limit", Int, "Number of items per page", func() {
				Minimum(1)
				Maximum(100)
				Example(10)
			})

			Response(StatusOK)
		})
	})

	Method("create", func() {
		Description("Create a new concert entry. All fields are required to ensure complete concert information.")
		Meta("openapi:summary", "Create a new concert")

		Payload(ConcertPayload, "Concert information to create")

		Result(Concert, "The newly created concert")

		Error("bad_request", ErrorResult, "Invalid input data provided")

		HTTP(func() {
			POST("/concerts")

			Response(StatusCreated)
			Response("bad_request", StatusBadRequest)
		})
	})

	Method("show", func() {
		Description("Get a single concert by its unique ID.")
		Meta("openapi:summary", "Get concert by ID")

		Payload(func() {
			Attribute("concertID", String, "Unique concert identifier", func() {
				Format(FormatUUID)
				Example("550e8400-e29b-41d4-a716-446655440000")
			})
			Required("concertID")
		})

		Result(Concert, "The requested concert")

		Error("not_found", ErrorResult, "Concert with the specified ID was not found")

		HTTP(func() {
			GET("/concerts/{concertID}")

			Response(StatusOK)
			Response("not_found", StatusNotFound)
		})
	})

	Method("update", func() {
		Description("Update an existing concert by ID. Only provided fields will be updated.")
		Meta("openapi:summary", "Update concert")

		Payload(func() {
			Extend(ConcertData)
			Attribute("concertID", String, "ID of the concert to update", func() {
				Format(FormatUUID)
				Example("550e8400-e29b-41d4-a716-446655440000")
			})
			Required("concertID")
		})

		Result(Concert, "The updated concert with all current information")

		Error("not_found", ErrorResult, "Concert with the specified ID was not found")
		Error("bad_request", ErrorResult, "Invalid update data provided")

		HTTP(func() {
			PUT("/concerts/{concertID}")

			Response(StatusOK)
			Response("not_found", StatusNotFound)
			Response("bad_request", StatusBadRequest)
		})
	})

	Method("delete", func() {
		Description("Remove a concert from the system by ID. This operation cannot be undone.")
		Meta("openapi:summary", "Delete concert")

		Payload(func() {
			Attribute("concertID", String, "ID of the concert to remove", func() {
				Format(FormatUUID)
				Example("550e8400-e29b-41d4-a716-446655440000")
			})
			Required("concertID")
		})

		Error("not_found", ErrorResult, "Concert with the specified ID was not found")

		HTTP(func() {
			DELETE("/concerts/{concertID}")

			Response(StatusNoContent)
			Response("not_found", StatusNotFound)
		})
	})
})

// Data Types
var ConcertData = Type("ConcertData", func() {
	Description("Concert information fields.")

	Attribute("artist", String, "Name of the performing artist or band", func() {
		MinLength(1)
		MaxLength(200)
		Example("The White Stripes")
		Description("The main performer for this concert")
	})

	Attribute("date", String, "Concert date in ISO 8601 format (YYYY-MM-DD)", func() {
		Format(FormatDate)
		Example("2024-12-25")
		Description("The date when the concert will take place")
	})

	Attribute("venue", String, "Name and location of the concert venue", func() {
		MinLength(1)
		MaxLength(300)
		Example("Madison Square Garden, New York, NY")
		Description("The venue where the concert will be held")
	})

	Attribute("price", Int, "Ticket price in US dollars (cents)", func() {
		Minimum(0)
		Maximum(100000) // $1000 max
		Example(7500)   // $75.00
		Description("Base ticket price in cents (e.g., 7500 = $75.00)")
	})
})

var ConcertPayload = Type("ConcertPayload", func() {
	Description("Concert information required for creating a new concert entry.")

	Extend(ConcertData)

	// All fields required for creation
	Required("artist", "date", "venue", "price")
})

var Concert = Type("Concert", func() {
	Description("Complete concert information including system-generated ID.")

	Attribute("id", String, "Unique concert identifier", func() {
		Format(FormatUUID)
		Example("550e8400-e29b-41d4-a716-446655440000")
		Description("System-generated unique identifier")
	})

	Extend(ConcertData)

	Required("id", "artist", "date", "venue", "price")
})
```

## Understanding the Design

For a complete reference of all DSL functions used in this tutorial, check out
the [Goa DSL documentation](https://pkg.go.dev/goa.design/goa/v3/dsl). Each
function is thoroughly documented with detailed explanations and practical
examples.

### 1. API Definition
The design starts with an API definition that sets up the overall service:
- **Title and Description**: Clear identification of what the API does
- **Version**: API version for client compatibility
- **Server Configuration**: Default host and port settings

### 2. Service Structure
The service consists of five main methods that follow RESTful conventions:
- **list**: GET `/concerts` with pagination support
- **create**: POST `/concerts` to add new concerts
- **show**: GET `/concerts/{id}` to retrieve specific concerts
- **update**: PUT `/concerts/{id}` to modify concerts
- **delete**: DELETE `/concerts/{id}` to remove concerts

### 3. Key Features

#### HTTP Mappings
Our API follows RESTful conventions with intuitive HTTP mappings:
- `GET` requests for retrieving data (listing and showing concerts)
- `POST` for creating new concerts
- `PUT` for updating existing concerts
- `DELETE` for removing concerts
- Query parameters (`page` and `limit`) handle pagination
- Path parameters capture resource IDs (e.g., `/concerts/{concertID}`)

#### Data Validation
Goa provides comprehensive built-in validation:
- **Concert IDs**: Must be valid UUIDs with examples provided
- **Artist names**: 1-200 characters with meaningful examples
- **Concert dates**: ISO 8601 format (YYYY-MM-DD) validation
- **Venues**: 1-300 characters for full venue descriptions
- **Ticket prices**: Non-negative integers, maximum $1000 (stored in cents)
- **Pagination**: Page ≥ 1, Limit 1-100 with sensible defaults

#### Error Handling
The API handles errors gracefully with:
- **Named error types**: `not_found` and `bad_request` with clear descriptions
- **Appropriate HTTP status codes**: 404 for not found, 400 for bad requests, etc.
- **Consistent error response format** using `ErrorResult`
- **Detailed error messages** for better debugging

#### Type Architecture
The design uses a layered type approach for maximum flexibility:
- **ConcertData**: Base type with all concert fields, no required constraints
- **ConcertPayload**: For creation - extends base type and requires all fields
- **Concert**: For responses - complete concert with ID and all details

This structure allows creation payloads to require complete data while update payloads can be partial, providing a clean and intuitive API experience.

#### OpenAPI Integration
The design includes OpenAPI-specific metadata:
- **Summary annotations** for better documentation
- **Detailed descriptions** for each endpoint and field
- **Examples** that appear in generated documentation
- **Clear parameter descriptions** for API consumers

## Next Steps

Now that you have a complete API design, proceed to the [Implementation
Tutorial](./2-implementing) to learn how to bring this design to life with Goa's
code generation.
