---
title: "Template Integration"
linkTitle: Template Integration
weight: 2
description: "Integrate Go's template engine with Goa to render dynamic HTML content, including template composition, data passing, and proper error handling."
---

Goa services can render dynamic HTML content using Go's standard `html/template`
package. This guide shows you how to integrate template rendering into your Goa
service.

## Design

First, define the service endpoints that will render HTML templates:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("front", func() {
    Description("Front-end web service with template rendering")

    Method("home", func() {
        Description("Render the home page")
        
        Payload(func() {
            Field(1, "name", String, "Name to display on homepage")
            Required("name")
        })
        
        Result(Bytes)
        
        HTTP(func() {
            GET("/")
            Response(StatusOK, func() {
                ContentType("text/html")
            })
        })
    })
})
```

## Implementation

### Service Structure

Create a service that manages template rendering:

```go
package front

import (
    "context"
    "embed"
    "html/template"
    "bytes"
    "fmt"

    genfront "myapp/gen/front" // replace with your generated package name
)

//go:embed templates/*.html
var templateFS embed.FS

type Service struct {
    tmpl *template.Template
}

func New() (*Service, error) {
    tmpl, err := template.ParseFS(templateFS, "templates/*.html")
    if err != nil {
        return nil, fmt.Errorf("failed to parse templates: %w", err)
    }
    
    return &Service{tmpl: tmpl}, nil
}
```

### Template Rendering

Implement the service methods to render templates:

```go
func (svc *Service) Home(ctx context.Context, p *genfront.HomePayload) ([]byte, error) {
    // Prepare data for the template
    data := map[string]interface{}{
        "Title":   "Welcome",
        "Content": "Welcome to " + p.Name + "!",
    }
    
    // Create a buffer to store the rendered template
    var buf bytes.Buffer
    
    // Render the template to the buffer
    if err := svc.tmpl.ExecuteTemplate(&buf, "home.html", data); err != nil {
        return nil, fmt.Errorf("failed to render template: %w", err)
    }
    
    return buf.Bytes(), nil
}
```

### Template Structure

Create your HTML templates in the `templates` directory:

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
</head>
<body>
    {{block "content" .}}{{end}}
</body>
</html>

<!-- templates/home.html -->
{{template "base.html" .}}
{{define "content"}}
    <h1>{{.Title}}</h1>
    <p>{{.Content}}</p>
{{end}}
```

### Server Setup

Set up your server with the template service:

```go
func main() {
    // Create the service
    svc := front.New()
    
    // Initialize HTTP server
    endpoints := genfront.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genserver.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    genserver.Mount(server, mux)
    
    // Start the server
    if err := http.ListenAndServe(":8080", mux); err != nil {
        log.Fatalf("failed to start server: %v", err)
    }
}
```

## Optional: Combined Static and Dynamic Content

If you need to serve both static files and dynamic templates, you can combine
them in your service design:

```go
var _ = Service("front", func() {
    // Dynamic template endpoints
    Method("home", func() {
        HTTP(func() {
            GET("/")
            Response(StatusOK, func() {
                ContentType("text/html")
            })
        })
    })
    
    // Static file serving
    Files("/static/{*filepath}", "public/static")
})
```

This setup serves:
- Dynamic content from templates at the root path (/)
- Static files (CSS, JS, images) from the /static path
- All files under public/static will be available at /static/

## Best Practices

1. **Template Organization**
   - Use template composition with a base layout
   - Keep templates in a dedicated directory
   - Use the embed.FS to bundle templates with your binary

2. **Error Handling**
   - Parse templates during service initialization
   - Return meaningful errors when template rendering fails
   - Set appropriate HTTP response codes and headers

3. **Performance**
   - Parse templates once at startup
   - Use template caching in production
   - Consider implementing template reloading in development