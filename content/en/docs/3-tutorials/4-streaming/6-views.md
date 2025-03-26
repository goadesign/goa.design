# Goa View and Tag DSLs: Response Control System---

## The View System

The View system in Goa gives you precise control over which data appears in API responses. It creates a clean separation between your internal data models and what gets exposed to API consumers.

### Key Benefits of Views

1. **Client-Controlled Data Retrieval**: Views allow clients to request only the data they need, reducing bandwidth usage and simplifying responses for different contexts.

2. **Implementation Hiding**: You can keep internal fields used for business logic or status determination hidden from API consumers.

3. **Field Selection**: Define which subset of fields from a ResultType should appear in different contexts, creating tailored representations.

### Working with View Selection

#### Static View Selection in Design

When you want a consistent, predictable response format for a specific endpoint, you can statically define the view in your design:

```go
Method("getResource", func() {
    Payload(func() {
        Attribute("id", String)
        Required("id")
    })
    // Explicitly select the "some_view" view for this method
    Result(Resource, func() {
        View("some_view") 
    })
    HTTP(func() {
        GET("/resources/{id}/minimal")
        Response(StatusOK)
    })
})
```

With this approach, the endpoint always returns the specified view regardless of other conditions.

#### Dynamic View Selection in Implementation

When your design doesn't specify a fixed view, the implementation code must select which view to use:

```go
// Implementation code for GetResource
func (s *serviceImpl) GetResource(ctx context.Context, p *service.GetResourcePayload) (*service.Resource, string, error) {
    // Fetch resource data
    resource, err := s.repository.Find(p.ID)
    if err != nil {
        return nil, "", err
    }
    
    // Map to response type
    res := &service.Resource{
        ID:   resource.ID,
        Name: resource.Name,
        ID2:  resource.SecondaryID,
    }
    
    // Return resource with the desired view
    return res, "default", nil
}
```

The key is that with dynamic view selection, your implementation explicitly returns the view name as the second return value.

### Selecting Views Based on Context

Your implementation can choose different views based on business rules or user permissions:

```go
func (s *serviceImpl) GetResource(ctx context.Context, p *service.GetResourcePayload) (*service.Resource, string, error) {
    // Fetch resource data
    resource, err := s.repository.Find(p.ID)
    if err != nil {
        return nil, "", err
    }
    
    // Populate response
    res := &service.Resource{
        ID:   resource.ID,
        Name: resource.Name,
        ID2:  resource.SecondaryID,
    }
    
    // Select view based on user role
    if isAdmin(ctx) {
        return res, "default", nil  // Admins get the default view with more fields
    }
    
    return res, "some_view", nil  // Others get the minimal view
}
```

### Client-Controlled View Selection

You can also let clients specify which view they want through a parameter:

```go
var _ = Service("service", func() {
    Method("getResource", func() {
        Payload(func() {
            Attribute("id", String, "Unique identifier of the resource")
            // Add view parameter
            Attribute("view", String, "View to render", func() {
                Enum("default", "some_view")
                Default("default")
            })
            Required("id")
        })
        Result(Resource)
        HTTP(func() {
            GET("/resources/{id}")
            Param("view")  // Map query parameter to payload
            Response(StatusOK)
        })
    })
})
```

Implementation:

```go
func (s *serviceImpl) GetResource(ctx context.Context, p *service.GetResourcePayload) (*service.Resource, string, error) {
    // Fetch resource data
    resource, err := s.repository.Find(p.ID)
    if err != nil {
        return nil, "", err
    }
    
    // Populate response
    res := &service.Resource{
        ID:   resource.ID,
        Name: resource.Name,
        ID2:  resource.SecondaryID,
    }
    
    // Use view from client request
    return res, p.View, nil
}
```

## Combining Tags with Views

While views control which fields appear in responses, Tags allow you to determine which HTTP status code to use based on result content.

### Using Tags with the Modified Example

Let's enhance our example to use Tags for HTTP status selection:

```go
var Resource = ResultType("application/vnd.goa.resource", "Resource", func() {
    Attributes(func() {
        Attribute("name", String, "Name of the resource")
        Attribute("id", String, "Unique identifier of the resource")
        Attribute("id2", String, "Unique identifier of the resource")
        
        // Internal attribute for status determination
        Attribute("outcome", String, func() {
            Description("Internal field for response status")
            Meta("struct:tag:json", "-")  // Hide from JSON
        })
    })
    
    View("default", func() {
        Attribute("name")
        Attribute("id")
        // "outcome" intentionally excluded
    })
    
    View("some_view", func() {
        Description("Some useful view")
        Attribute("id")
        // "outcome" intentionally excluded
    })
})

var _ = Service("service", func() {
    Method("getResource", func() {
        Payload(func() {
            Attribute("id", String, "Unique identifier of the resource")
            Required("id")
        })
        Result(Resource)
        HTTP(func() {
            GET("/resources/{id}")
            
            Response(StatusOK, func() {
                Tag("outcome", "found")
            })
            
            Response(StatusNotFound, func() {
                Tag("outcome", "not_found")
            })
        })
    })
})
```

Implementation with Tags:

```go
func (s *serviceImpl) GetResource(ctx context.Context, p *service.GetResourcePayload) (*service.Resource, string, error) {
    // Attempt to fetch resource data
    resource, err := s.repository.Find(p.ID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            // Return a resource with outcome set for 404
            return &service.Resource{
                ID:      p.ID,
                Outcome: "not_found",
            }, "some_view", nil
        }
        return nil, "", err
    }
    
    // Resource found - return with outcome for 200
    res := &service.Resource{
        ID:      resource.ID,
        Name:    resource.Name,
        ID2:     resource.SecondaryID,
        Outcome: "found",
    }
    
    return res, "default", nil
}
```

In this example:
1. The `outcome` field determines which HTTP status code to use
2. This field is excluded from all views, so it's never sent to clients
3. The implementation selects both the appropriate view and sets the outcome for proper HTTP status

### Advanced Usage: Overriding Views Based on Status

You can also specify different views for different status responses:

```go
HTTP(func() {
    GET("/resources/{id}")
    
    Response(StatusOK, func() {
        Tag("outcome", "found")
        // Use default view for found resources
        View("default")
    })
    
    Response(StatusNotFound, func() {
        Tag("outcome", "not_found")
        // Use minimal view for not found
        View("some_view")
    })
})
```

With this approach, you don't need to specify the view in your implementation's return value if you want to use the view defined in the design:

```go
func (s *serviceImpl) GetResource(ctx context.Context, p *service.GetResourcePayload) (*service.Resource, string, error) {
    // Attempt to fetch resource data
    resource, err := s.repository.Find(p.ID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            // Return with outcome for 404 - view is determined by design
            return &service.Resource{
                ID:      p.ID,
                Outcome: "not_found",
            }, "", nil
        }
        return nil, "", err
    }
    
    // Resource found - view is determined by design
    res := &service.Resource{
        ID:      resource.ID,
        Name:    resource.Name,
        ID2:     resource.SecondaryID,
        Outcome: "found",
    }
    
    return res, "", nil
}
```

## Practical Benefits

This combination of Views and Tags creates a clean separation of concerns:

1. **HTTP Semantics**: Use proper HTTP status codes based on resource state
2. **Clean Domain Model**: Clients see only relevant fields without implementation details
3. **Contextual Data**: Provide different views based on status or client preferences
4. **Implementation Simplicity**: Focus on business logic rather than HTTP details

By leveraging both Views and Tags, you build APIs that provide appropriate HTTP semantics while keeping your response models clean and focused on the domain.