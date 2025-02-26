---
title: "Single Page Application Integration"
linkTitle: Single Page Application
weight: 3
description: "Learn to embed and serve Single Page Applications (SPAs) in your Goa service, including React integration, client-side routing support, and production deployment strategies."
---

For simple applications, you can embed your React application directly into the Go binary using
`go:embed`. This approach combines the benefits of modern frontend development with
Go's streamlined deployment capabilities. By packaging your entire application - both
the backend API and React frontend - into a single self-contained executable, you
eliminate the need to manage separate deployment artifacts or configure additional
web servers for static file serving. Simply build the binary, deploy it, and run
it. This approach significantly simplifies deployment while ensuring your frontend
and backend versions remain synchronized.

## Project Structure

A project structure with a React SPA might look like:

```
myapp/
├── cmd/                  # Main application
├── design/               # Shared design constructs
│   ├── design.go         # Imports non-API service designs
│   └── shared/           # Shared design constructs
├── gen/                  # Generated Goa code for non-API services
└── services/
    ├── api/
    │   ├── design/       # API design
    │   ├── gen/          # Generated Goa code
    │   ├── api.go        # API implementation
    │   └── ui/
    │       ├── build/    # UI build
    │       ├── src/      # React source
    │       └── public/   # Static assets
    ├── service1/         # Other services
    :
```

The design organization follows a specific pattern to maintain clean separation of concerns:

1. The public HTTP API service (`services/api`) has its own `design` package and
   `gen` directory. This isolation keeps the generated OpenAPI specification
   focused solely on the public API endpoints.

2. All other service designs are imported into the top-level `design` package
   and their code is generated into the root `gen` directory. This approach
   simplifies code generation to just two commands:
   - `goa gen myapp/services/api/design` for the public API
   - `goa gen myapp/design` for all other services

This structure makes it clear which endpoints are part of the public API while
keeping the code generation process efficient.

Additionally the top level design package may include shared design constructs
that are used by all services.

The `ui/` directory contains the React application and static assets that gets
embedded into the Go binary.

## Design

Define your service to handle both API endpoints and serve the SPA. During
development, you'll need to configure CORS to allow your React development
server to communicate with your Goa backend:

```go
var _ = Service("myapp", func() {
    Description("The myapp service serves the myapp front end and API.")
    
    // Configure CORS for development
    cors.Origin("http://localhost:3000", func() {
        cors.Headers("Content-Type")
        cors.Methods("GET", "POST", "PUT", "DELETE")
        cors.Credentials()
    })
    
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

The design serves several purposes:
1. Configures CORS for development with React's default port
2. Mounts the React application under `/ui`
3. Handles static assets and redirects
4. Provides API endpoints under `/api`
5. Supports client-side routing through wildcard paths

Refer to the [CORS](https://github.com/goadesign/plugins/tree/master/cors)
plugin for more details on setting up CORS.

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

1. Configure the React development server in package.json:
```json
{
  "proxy": "http://localhost:8000"
}
```

2. Run React development server:
```bash
cd services/api/ui
npm start
```

3. Run Go service:
```bash
go run myapp/cmd/myapp
```

The proxy configuration in package.json works with the CORS settings to enable seamless development. The React development server forwards API requests to your Goa backend while serving the UI directly.

## Build Process

1. Build React app:
```bash
cd services/api/ui && npm run build
```

2. Build Go binary:
```bash
go build myapp/cmd/myapp
```

## Best Practices

1. **API Organization**
   When organizing your API endpoints, follow a consistent structure by placing
   all API endpoints under an `/api` prefix. This makes it clear which routes
   are for the API versus static content. Additionally, ensure your error
   responses follow a standardized format across all endpoints to provide a
   consistent experience for API consumers. Finally, organize related endpoints
   into logical groups based on their functionality or resource type to maintain
   a clean and intuitive API structure.

2. **CORS Configuration**
   When configuring CORS in production, be specific about which origins are
   allowed to access your API - avoid using wildcards and explicitly list
   trusted domains. Implement appropriate caching of preflight requests to
   reduce unnecessary OPTIONS requests and improve performance. Only expose the
   HTTP headers and methods that your API actually needs, following the
   principle of least privilege. Finally, carefully consider the security
   implications of enabling credentials mode, as it allows cookies and
   authentication headers to be included in cross-origin requests - only enable
   this if specifically required by your application's security model.

3. **SPA Serving**
   When serving your SPA, it's important to serve it under a dedicated path
   (such as `/ui`) to clearly separate it from your API routes. You should also
   implement proper handling of root redirects to ensure clean, user-friendly
   URLs. Additionally, your server configuration needs to support client-side
   routing by properly handling all routes defined in your frontend application
   and returning the main `index.html` file for those routes.

4. **Development**
   During development, use React's development server with the proxy
   configuration to route API requests to your Go service. This provides hot
   reloading and other development features while still allowing seamless
   communication with your backend. Keep your UI code organized close to the
   service that serves it to maintain a clear relationship between frontend and
   backend components. Additionally, implement proper CORS (Cross-Origin
   Resource Sharing) handling for your API calls to ensure secure communication
   between the frontend and backend during development and production.

5. **Production**
   For production deployments, there are several important considerations to
   keep in mind. First, ensure you always build your React application before
   building the Go binary - this ensures the latest frontend code is embedded in
   your service. Implement appropriate cache headers for static assets like
   JavaScript, CSS and images to improve performance and reduce server load. Set
   up comprehensive logging and instrumentation to monitor your application's
   health and performance in production. Finally, implement proper graceful
   shutdown handling to ensure in-flight requests complete successfully when the
   service needs to stop.