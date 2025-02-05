---
title: Designing
weight: 1
---

# Designing a Comprehensive REST API with Goa

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

Create a new file at `design/concerts.go` with the following content:

```go
package design

import (
  . "goa.design/goa/v3/dsl"
)

// Service definition
var _ = Service("concerts", func() {
  Description("The concerts service manages music concert data.")

  Method("list", func() {
    Description("List upcoming concerts with optional pagination.")
    
    Payload(func() {
      Attribute("page", Int, "Page number", func() {
        Minimum(1)
        Default(1)
      })
      Attribute("limit", Int, "Items per page", func() {
        Minimum(1)
        Maximum(100)
        Default(10)
      })
    })

    Result(ArrayOf(Concert))

    HTTP(func() {
      GET("/concerts")

      // Query parameters for pagination
      Param("page", Int, "Page number", func() {
        Minimum(1)
      })
      Param("limit", Int, "Number of items per page", func() {
        Minimum(1)
        Maximum(100)
      })

      Response(StatusOK) // No need to specify the Body, it's inferred from the Result
    })
  })

  Method("create", func() {
    Description("Create a new concert entry.")
    
    Payload(ConcertPayload)
    Result(Concert)

    HTTP(func() {
      POST("/concerts")
      Response(StatusCreated)
    })
  })

  Method("show", func() {
    Description("Get a single concert by ID.")
    
    Payload(func() {
      Attribute("concertID", String, "Concert UUID", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert)
    Error("not_found")

    HTTP(func() {
      GET("/concerts/{concertID}")
      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("update", func() {
    Description("Update an existing concert by ID.")

    Payload(func() {
      Extend(ConcertPayload)
      Attribute("concertID", String, "ID of the concert to update.", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert, "The updated concert.")

    Error("not_found", ErrorResult, "Concert not found")

    HTTP(func() {
      PUT("/concerts/{concertID}")

      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("delete", func() {
    Description("Remove a concert from the system by ID.")

    Payload(func() {
      Attribute("concertID", String, "ID of the concert to remove.", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Error("not_found", ErrorResult, "Concert not found")

    HTTP(func() {
      DELETE("/concerts/{concertID}")

      Response(StatusNoContent)
      Response("not_found", StatusNotFound)
    })
  })
})

// Data Types
var ConcertPayload = Type("ConcertPayload", func() {
  Description("Data needed to create/update a concert.")

  Attribute("artist", String, "Performing artist/band", func() {
    MinLength(1)
    Example("The Beatles")
  })
  Attribute("date", String, "Concert date (YYYY-MM-DD)", func() {
    Pattern(`^\d{4}-\d{2}-\d{2}$`)
    Example("2024-01-01")
  })
  Attribute("venue", String, "Concert venue", func() {
    MinLength(1)
    Example("The O2 Arena")
  })
  Attribute("price", Int, "Ticket price (USD)", func() {
    Minimum(1)
    Example(100)
  })
})

var Concert = Type("Concert", func() {
  Description("A concert with all its details.")
  Extend(ConcertPayload)
  
  Attribute("id", String, "Unique concert ID", func() {
    Format(FormatUUID)
  })
  Required("id", "artist", "date", "venue", "price")
})
```

## Understanding the Design

For a complete reference of all DSL functions used in this tutorial, check out
the [Goa DSL documentation](https://pkg.go.dev/goa.design/goa/v3/dsl). Each
function is thoroughly documented with detailed explanations and practical
examples.

### 1. Basic Structure
The design consists of three main parts:
- Service definition (`Service("concerts")`)
- Methods (list, create, show, etc.)
- Data types (`Concert` and `ConcertPayload`)

### 2. Key Features

#### HTTP Mappings
Our API follows RESTful conventions with intuitive HTTP mappings:
- GET requests for retrieving data (listing and showing concerts)
- POST for creating new concerts
- PUT for updating existing concerts
- DELETE for removing concerts
- Query parameters (`page` and `limit`) handle pagination
- Path parameters capture resource IDs (e.g., `/concerts/{concertID}`)

#### Data Validation
Goa provides built-in validation to ensure data integrity:
- Concert IDs must be valid UUIDs
- Artist and venue names can't be empty
- Concert dates must follow the YYYY-MM-DD format
- Ticket prices must be positive numbers
- Pagination parameters have sensible limits (e.g., max 100 items per page)

#### Error Handling
The API handles errors gracefully with:
- Named error types that clearly indicate what went wrong (e.g., "not_found")
- Appropriate HTTP status codes (404 for not found, 201 for creation, etc.)
- Consistent error response format across all endpoints

#### Type Reuse
We've structured our types to avoid duplication:
- `ConcertPayload` defines the common fields needed for creation/updates
- `Concert` extends `ConcertPayload` and adds the ID field
- This approach ensures consistency between input and stored data

## Next Steps

Now that you have a complete API design, proceed to the [Implementation
Tutorial](./2-implementing) to learn how to bring this design to life with Goa's
code generation.
