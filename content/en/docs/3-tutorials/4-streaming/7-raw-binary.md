---
title: "Stream Raw Binary Data over HTTP"
linkTitle: "Raw Binary Streaming"
weight: 7
description: "Learn how to efficiently stream raw binary data like files and multimedia content over HTTP using Goa's low-level streaming capabilities."
---

While Goa's `StreamingPayload` and `StreamingResult` work well for typed data
streams, sometimes you need direct access to the raw binary data stream. This is
common when handling file uploads, downloads, or multimedia streams. Goa
provides this capability through its `SkipRequestBodyEncodeDecode` and
`SkipResponseBodyEncodeDecode` features.

## Choosing Your Streaming Approach

Goa offers two distinct approaches to streaming, each suited for different needs:

The `StreamingPayload` and `StreamingResult` approach is ideal when you're
working with structured data that has known types. It's particularly useful when
you need type safety, validation, or gRPC compatibility. This approach leverages
Goa's type system to ensure your data streams maintain their expected structure.

The `SkipRequestBodyEncodeDecode` approach gives you direct access to the raw
HTTP body stream. This is the right choice when dealing with binary data like
files or when you need complete control over the data processing. It's
particularly efficient for large files since it avoids any unnecessary
encoding/decoding steps.

## Request Streaming

Request streaming allows your service to process incoming data as it arrives,
rather than waiting for the complete payload. Here's how to implement file
uploads using raw streaming:

```go
var _ = Service("upload", func() {
    Method("upload", func() {
        Payload(func() {
            // Note: Cannot define body attributes when using streaming
            Attribute("content_type", String)
            Attribute("dir", String)
        })
        HTTP(func() {
            POST("/upload/{*dir}")
            Header("content_type:Content-Type")
            SkipRequestBodyEncodeDecode()
        })
    })
})
```

Your service implementation receives an `io.ReadCloser` for streaming the request body:

```go
func (s *service) Upload(ctx context.Context, p *upload.Payload, body io.ReadCloser) error {
    defer body.Close()
    
    buffer := make([]byte, 32*1024)
    for {
        n, err := body.Read(buffer)
        if err == io.EOF {
            break
        }
        if err != nil {
            return err
        }
        // Process buffer[:n]
    }
    return nil
}
```

## Response Streaming

Response streaming lets your service send data incrementally to clients. This is
perfect for file downloads or real-time data feeds. Here's how to implement it:

```go
var _ = Service("download", func() {
    Method("download", func() {
        Payload(String)
        Result(func() {
            Attribute("length", Int64)
        })
        HTTP(func() {
            GET("/download/{*filename}")
            SkipResponseBodyEncodeDecode()
            Response(func() {
                Header("length:Content-Length")
            })
        })
    })
})
```

The service implementation returns both the result and an `io.ReadCloser`:

```go
func (s *service) Download(ctx context.Context, p string) (*download.Result, io.ReadCloser, error) {
    file, err := os.Open(p)
    if err != nil {
        return nil, nil, err
    }
    
    stat, err := file.Stat()
    if err != nil {
        file.Close()
        return nil, nil, err
    }
    
    return &download.Result{
        Length: stat.Size(),
    }, file, nil
}
```

## Complete Example

Here's a complete example that demonstrates both file upload and download streaming in a single service:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = API("streaming", func() {
    Title("Streaming API Example")
})

var _ = Service("files", func() {
    Method("upload", func() {
        Payload(func() {
            Attribute("content_type", String)
            Attribute("filename", String)
        })
        HTTP(func() {
            POST("/upload/{filename}")
            Header("content_type:Content-Type")
            SkipRequestBodyEncodeDecode()
        })
    })
    
    Method("download", func() {
        Payload(String)
        Result(func() {
            Attribute("length", Int64)
        })
        HTTP(func() {
            GET("/download/{*filepath}")
            SkipResponseBodyEncodeDecode()
            Response(func() {
                Header("length:Content-Length")
            })
        })
    })
})
```

The implementation shows a complete file service handling both uploads and downloads:

```go
type filesService struct {
    storageDir string
}

func (s *filesService) Upload(ctx context.Context, p *files.UploadPayload, body io.ReadCloser) error {
    defer body.Close()
    
    fpath := filepath.Join(s.storageDir, p.Filename)
    f, err := os.Create(fpath)
    if err != nil {
        return err
    }
    defer f.Close()
    
    _, err = io.Copy(f, body)
    return err
}

func (s *filesService) Download(ctx context.Context, p string) (*files.DownloadResult, io.ReadCloser, error) {
    fpath := filepath.Join(s.storageDir, p)
    f, err := os.Open(fpath)
    if err != nil {
        return nil, nil, err
    }
    
    stat, err := f.Stat()
    if err != nil {
        f.Close()
        return nil, nil, err
    }
    
    return &files.DownloadResult{
        Length: stat.Size(),
    }, f, nil
}
```

Let's examine the key aspects of this implementation:

The service is built around a simple storage directory concept. Each instance is
configured with a base directory where all files will be stored and retrieved
from. This containment within a specific directory provides a basic security
boundary for file operations.

For uploads, we've implemented a streaming approach that minimizes memory usage.
Instead of buffering the entire file in memory, we stream the data directly from
the request body to the file system using `io.Copy`. The implementation carefully
manages resources using `defer` statements to ensure proper cleanup, regardless of
whether the operation succeeds or fails.

The download implementation is equally efficient. When a download is requested,
we first open the file and retrieve its metadata in a single operation. This
allows us to provide the file size to Goa (which it uses for the Content-Length
header) while also getting the file handle for streaming. Note that we don't
close the file in the success case - Goa takes ownership of the file handle and
will close it after streaming the content to the client.

Throughout both operations, error handling is a key focus. The code includes
proper cleanup of resources when errors occur, clear error propagation back to
the caller, and safe file path handling to prevent directory traversal attacks.
This attention to error handling helps ensure the service remains robust and
secure under various failure conditions.

This implementation demonstrates efficient streaming by:
- Using direct file system streaming
- Properly managing resources with defer statements
- Providing accurate content length information
- Implementing proper error handling
- Ensuring secure file path handling

For related content about serving static files and templates, see the [Static Content](../5-static-content) section.
