---
title: "Single Page Application Integration"
weight: 3
---

# Single Page Application Integration

By embedding your React application directly into the Go binary using
`go:embed`, you get the best of both worlds - modern frontend development and
Go's excellent deployment story. Your entire application, from the backend API
to the React frontend, becomes a single self-contained executable. No more
juggling multiple deployment artifacts or configuring web servers to serve
static files - just build, ship, and run a single binary! This dramatically
simplifies deployment and ensures your frontend and backend versions are always
in sync.

## Project Structure

A production project structure with a React SPA typically looks like:

```
myapp/
├── design/
│   └── design.go    # API design
├── gen/             # Generated Goa code
├── services/
│   └── myapp/
│       ├── myapp.go
│       └── ui/
│           ├── build/    # Production build
│           ├── src/      # React source
│           └── public/   # Static assets
│               ├── favicon.ico
│               └── robots.txt
└── cmd/             # Main application
    └── myapp/
        └── main.go
```

## Design

Define your service to handle both API endpoints and serve the SPA:

```go
var _ = Service("myapp", func() {
    Description("The myapp service serves the myapp front end.")
    
    // Serve the React app
    Files("/ui/{*filepath}", "ui/build")
    
    // Serve static assets directly
    Files("/robots.txt", "ui/public/robots.txt")
    Files("/favicon.ico", "ui/public/favicon.ico")
    
    // Handle UI paths
    Method("home", func() {
        HTTP(func() {
            GET("/")
            GET("/ui")
            Redirect("/ui/", StatusMovedPermanently) // Redirect root to /ui/
        })
    })
    
    // API endpoints
    Method("list_widgets", func() {
        Description("List widgets.")
        Result(ArrayOf(Widget))
        HTTP(func() {
            GET("/api/widgets")
            Response(StatusOK)
        })
    })
    
    // ... additional API endpoints
})
```

The design:
- Serves the React app under `/ui`
- Handles static assets like favicon.ico
- Provides root redirects
- Keeps API endpoints under `/api` prefix
- Supports client-side routing via wildcard path

## Implementation 

### Service Structure

The service implementation embeds the React build and handles API requests:

```go
package front

import (
    "embed"
    "context"
)

//go:embed ui/build
var UIBuildFS embed.FS

type Service struct {
    // Service dependencies
}

func New() *Service {
    return &Service{}
}

// Home implements the redirect handler
func (svc *Service) Home(ctx context.Context) error {
    return nil
}

// API method implementations
func (svc *Service) ListWidgets(ctx context.Context) ([]*Widget, error) {
    // Implementation
}
```

### Main Function Setup

Configure the service in main:

```go
func main() {
    // Create service & endpoints
    svc := myapp.New()
    endpoints := genmyapp.NewEndpoints(svc)
    
    // Create transport
    mux := goahttp.NewMuxer()
    server := genserver.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil,
        nil,
        http.FS(myapp.UIBuildFS),  // Serve UI
    )
    genserver.Mount(mux, server)
    
    // Start server
    if err := http.ListenAndServe(":8000", mux); err != nil {
        log.Fatal(err)
    }
}
```

## Development Workflow

For local development:

1. Run React development server:
```bash
cd services/myapp/ui
npm start
```

2. Configure proxy in package.json:
```json
{
  "proxy": "http://localhost:8000"
}
```

3. Run Go service:
```bash
go run myapp/cmd/myapp
```

## Build Process

1. Build React app:
```bash
cd services/front/ui && npm run build
```

2. Build Go binary:
```bash
go build ./cmd/myapp
```

## Best Practices

1. **API Organization**
   - Keep all API endpoints under `/api` prefix
   - Use consistent error responses
   - Group related endpoints logically

2. **SPA Serving**
   - Serve the SPA under a specific path (e.g., `/ui`)
   - Handle root redirects for clean URLs
   - Support client-side routing

3. **Development**
   - Use React's development server with proxy during development
   - Keep the UI code close to the service that serves it
   - Implement proper CORS handling for API calls

4. **Production**
   - Always build the React app before building the Go binary
   - Consider implementing cache headers for static assets
   - Use proper logging and instrumentation
   - Handle graceful shutdowns