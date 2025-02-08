---
title: Serving Files
linkTitle: Serving Files
weight: 1
description: "Master Goa's file serving capabilities to efficiently deliver static assets like HTML, CSS, JavaScript, and images through HTTP endpoints with proper path resolution."
---

Goa provides a straightforward way to serve static assets such as HTML, CSS,
JavaScript, and images through the `Files` function in the service DSL. This
function allows you to map HTTP paths to directories or specific files on disk,
enabling your service to deliver static content efficiently.

## Using the `Files` Function

The `Files` function defines an endpoint that serves static assets via HTTP. It
behaves similarly to the standard `http.ServeFile` function, handling requests
to serve files or directories based on the defined path.

### Syntax

```go
Files(path, filename string, dsl ...func())
```

- **path:** The HTTP request path. It can include a wildcard (e.g., `{*filepath}`) to match variable segments of the URL.
- **filename:** The file system path to the directory or file to serve.
- **dsl:** Optional DSL function to provide additional metadata such as descriptions and documentation.

### Examples

#### Serving a Single File

To serve a single file, define the `Files` function with a specific path and the file's location on disk.

```go
var _ = Service("web", func() {
    Files("/index.html", "/www/data/index.html", func() {
        // All optional, but useful for OpenAPI spec
        Description("Serve home page.")
        Docs(func() {
            Description("Additional documentation")
            URL("https://goa.design")
        })
    })
})
```

In this example:

- **Path:** `/index.html` - Requests to `/index.html` will serve the file located at `/www/data/index.html`.
- **Filename:** `/www/data/index.html` - Absolute path to the file on disk.
- **DSL Functions:** Provide a description and additional documentation for the endpoint.

#### Serving Static Assets with Wildcard

To serve multiple files from a directory, use a wildcard in the path.

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "/www/data/static", func() {
        Description("Serve static assets like CSS, JS, and images.")
    })
})
```

In this example:

- **Path:** `/static/{*path}` - The `{*path}` wildcard matches any subpath after `/static/`, allowing dynamic file serving.
- **Filename:** `/www/data/static` - Directory containing static assets.
- **Description:** Provides a description for the endpoint.

#### Path Resolution

When using a wildcard path like `/static/{*path}`, Goa combines the wildcard value with the base directory to locate the file:

1. The wildcard portion of the URL path is extracted
2. This is appended to the base directory specified in `Filename`
3. The resulting path is used to look up the file

For example, with the configuration:

```go
Files("/static/{*path}", "/www/data/static")
```

If the URL path is `/static/css/style.css`, Goa will resolve to `/www/data/static/css/style.css`.

## Handling Index Files

When serving directories, ensure that index files (e.g., `index.html`) are
correctly mapped. If you do not explicitly map `index.html` under a wildcard
path, the underlying `http.ServeFile` call will return a redirect to `./`
instead of the `index.html` file.

### Example

```go
var _ = Service("bottle", func() {
    Files("/static/{*path}", "/www/data/static", func() {
        Description("Serve static assets for the SPA.")
    })
    Files("/index.html", "/www/data/index.html", func() {
        Description("Serve the SPA's index.html for client-side routing.")
    })
})
```

This configuration ensures that requests to `/index.html` serve the `index.html`
file, while requests to `/static/*` serve files from the static directory.

## Integration with Service Implementation

When implementing static file serving in your Goa service, you have several
options for managing and serving the files:

* Using the File System: In your service implementation, use the file system to
  serve embedded files.

* Using Embedded Files: The `embed` package in Go 1.16+ allows you to embed
  static files directly into your binary, making deployment simpler and more
  reliable.

### Example Service Implementation

This example demonstrates how to serve static files using the `embed` package.

Assuming the following design:

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "static")
})
```

The service implementation can be:

```go
package web

import (
    "embed"
    // ... other imports ...
)

//go:embed static
var StaticFS embed.FS

// ... other service code ...
```

### Main Function Setup

In the main function, configure the HTTP server to serve static files by:

1. Creating a `http.FS` instance from the embedded `StaticFS` using `http.FS(web.StaticFS)`
2. Passing this file system instance as the last argument to the generated `New`
   function
3. This allows the HTTP server to efficiently serve the embedded static files
   through the endpoints defined with `Files` in the design

The file system instance provides access to the embedded files while maintaining
proper file system semantics and security.

```go
func main() {
    // Other setup code...
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil,
        nil,
        http.FS(web.StaticFS), // Pass the embedded file system
    )
    genhttp.Mount(mux, server)
    // Start the server...
}
```

In this setup:

- **go:embed:** Embeds the `static` directory into the binary.
- **http.FS:** Provides the embedded file system to the server for serving static files.

## Summary

Using the `Files` function in Goa allows you to efficiently serve static content
in your services. By defining specific paths and file locations, you can manage
the delivery of static assets seamlessly. Ensure proper mapping of index files
and utilize embedded file systems for streamlined deployments.
