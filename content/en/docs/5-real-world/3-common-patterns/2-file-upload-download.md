---
title: File Uploads & Downloads
weight: 2
description: "Learn how to implement efficient file upload and download functionality in Goa using streaming"
---

When building web services, handling file uploads and downloads is a common
requirement. Whether you're building a file sharing service, an image upload
API, or a document management system, you'll need to handle binary file
transfers efficiently.

This section demonstrates how to implement file upload and download
functionality in Goa using streaming to handle binary files efficiently. The
approach shown here uses direct HTTP streaming, allowing both server and client
code to process content without loading the entire payload into memory. This is
particularly important when dealing with large files, as loading them entirely
into memory could cause performance issues or even crash your service.

## Design Overview

The key to implementing efficient file uploads and downloads in Goa is using two
special DSL functions that modify how Goa handles HTTP request and response
bodies:

- `SkipRequestBodyEncodeDecode`: Used for uploads to bypass request body
  encoding/decoding. This allows direct streaming of uploaded files without first
  loading them into memory.
- `SkipResponseBodyEncodeDecode`: Used for downloads to bypass response body
  encoding/decoding. This enables streaming files directly from disk to the client
  without buffering the entire file in memory.

These functions tell Goa to skip generating encoders and decoders for the HTTP
request and response bodies, instead providing direct access to the underlying
IO streams. This is crucial for handling large files efficiently.

## Implementation Example

Let's walk through implementing a complete service that handles both file uploads and downloads. We'll create a service that:
- Accepts file uploads via multipart form data
- Stores files on disk
- Allows downloading previously uploaded files
- Handles errors appropriately
- Uses streaming for efficiency

### API Design

First, we need to define the API and service in your design package. This is
where we specify the endpoints, their parameters, and how they map to HTTP:

```go
var _ = API("upload_download", func() {
    Description("File upload and download example")
})

var _ = Service("updown", func() {
    Description("Service for handling file uploads and downloads")

    // Upload endpoint
    Method("upload", func() {
        Payload(func() {
            // Define headers and parameters needed for upload
            // content_type is required for parsing multipart form data
            Attribute("content_type", String, "Content-Type header with multipart boundary")
            // dir specifies where to store the uploaded files
            Attribute("dir", String, "Upload directory path")
        })

        HTTP(func() {
            POST("/upload/{*dir}")  // POST endpoint with directory as URL parameter
            Header("content_type:Content-Type")  // Map content_type to Content-Type header
            SkipRequestBodyEncodeDecode()  // Enable streaming for uploads
        })
    })

    // Download endpoint
    Method("download", func() {
        Payload(String)  // Filename to download
        
        Result(func() {
            // We'll return the file size in the Content-Length header
            Attribute("length", Int64, "Content length in bytes")
            Required("length")
        })

        HTTP(func() {
            GET("/download/{*filename}")  // GET endpoint with filename as URL parameter
            SkipResponseBodyEncodeDecode()  // Enable streaming for downloads
            Response(func() {
                Header("length:Content-Length")  // Map length to Content-Length header
            })
        })
    })
})
```

This design creates two endpoints:
1. `POST /upload/{dir}` - Accepts file uploads and stores them in the specified directory
2. `GET /download/{filename}` - Streams the requested file to the client

### Service Implementation

Now let's look at implementing the service that handles these endpoints. The
implementation will need to process multipart form data for file uploads,
efficiently stream files both to and from disk, properly manage system resources
like file handles and memory, and handle errors in a robust way. This requires
careful attention to detail to ensure files are processed correctly and
resources are cleaned up, even in error cases.

The service implementation will demonstrate best practices for handling large
file uploads and downloads in a production environment. We'll see how to parse
multipart boundaries, stream data in chunks to avoid memory issues, and properly
close resources using defer statements.

Here's the implementation with detailed explanations:

```go
// service struct holds configuration for our upload/download service
type service struct {
    dir string  // Base directory for storing files
}

// Upload implementation handles file uploads via multipart form data
func (s *service) Upload(ctx context.Context, p *updown.UploadPayload, req io.ReadCloser) error {
    // Always close the request body when we're done
    defer req.Close()

    // Parse the multipart form data from the request
    // This requires the Content-Type header with boundary parameter
    _, params, err := mime.ParseMediaType(p.ContentType)
    if err != nil {
        return err  // Invalid Content-Type header
    }
    mr := multipart.NewReader(req, params["boundary"])

    // Process each file in the multipart form
    for {
        part, err := mr.NextPart()
        if err == io.EOF {
            break  // No more files
        }
        if err != nil {
            return err  // Error reading part
        }
        
        // Create the destination file
        // Join the base directory with the uploaded filename
        dst := filepath.Join(s.dir, part.FileName())
        f, err := os.Create(dst)
        if err != nil {
            return err  // Error creating file
        }
        defer f.Close()  // Ensure file is closed even if we return early

        // Stream the file content from the request to disk
        // io.Copy handles the streaming efficiently
        if _, err := io.Copy(f, part); err != nil {
            return err  // Error writing file
        }
    }
    return nil
}

// Download implementation streams files from disk to the client
func (s *service) Download(ctx context.Context, filename string) (*updown.DownloadResult, io.ReadCloser, error) {
    // Construct the full file path
    path := filepath.Join(s.dir, filename)
    
    // Get file information (mainly for the size)
    fi, err := os.Stat(path)
    if err != nil {
        return nil, nil, err  // File not found or other error
    }

    // Open the file for reading
    f, err := os.Open(path)
    if err != nil {
        return nil, nil, err  // Error opening file
    }

    // Return the file size and the file reader
    // The caller is responsible for closing the reader
    return &updown.DownloadResult{Length: fi.Size()}, f, nil
}
```

## Usage

After implementing the service and generating the code with `goa gen`, you can
use the service in several ways. Here's how to use the generated CLI tool for
testing:

```bash
# First, start the server in one terminal
$ go run cmd/upload_download/main.go

# In another terminal, upload a file
# The --stream flag tells the CLI to stream the file directly from disk
$ go run cmd/upload_download-cli/main.go updown upload \
    --stream /path/to/file.jpg \
    --dir uploads

# Download a previously uploaded file
# The output is redirected to a new file
$ go run cmd/upload_download-cli/main.go updown download file.jpg > downloaded.jpg
```

For real applications, you'll typically call these endpoints using HTTP clients.
Here's an example using `curl`:

```bash
# Upload a file
$ curl -X POST -F "file=@/path/to/file.jpg" http://localhost:8080/upload/uploads

# Download a file
$ curl http://localhost:8080/download/file.jpg -o downloaded.jpg
```

## Key Points and Best Practices

1. Use `SkipRequestBodyEncodeDecode` for uploads to:
   - Bypass request body decoder generation
   - Get direct access to the HTTP request body reader
   - Stream large files without memory issues
   - Handle multipart form data efficiently

2. Use `SkipResponseBodyEncodeDecode` for downloads to:
   - Bypass response body encoder generation
   - Stream responses directly to clients
   - Handle large files efficiently
   - Set proper Content-Length headers

3. The service implementations receive and return `io.Reader` interfaces, allowing for efficient streaming of data. This is crucial for:
   - Memory efficiency
   - Performance with large files
   - Handling multiple concurrent uploads/downloads

4. Always remember to properly handle resources:
   - Close readers and files using `defer`
   - Handle errors appropriately at each step
   - Validate file paths and types for security
   - Set appropriate file permissions
   - Consider implementing rate limiting for production use

5. Security Considerations:
   - Validate file types and sizes
   - Sanitize filenames to prevent directory traversal attacks
   - Implement authentication and authorization
   - Consider using virus scanning for uploaded files
   - Set proper CORS headers if needed

This approach allows you to handle large file uploads and downloads efficiently
in your Goa services while maintaining clean, type-safe APIs. The streaming
approach ensures your service remains responsive and resource-efficient even
when handling large files or multiple concurrent transfers.

## Common Issues and Solutions

Memory usage issues can be a common problem when handling file uploads and
downloads. The most frequent cause is reading entire files into memory instead
of streaming them. To avoid this, make sure you're properly using streaming
approaches with the appropriate Goa settings. Double check that you've used both
`SkipRequestBodyEncodeDecode` and `SkipResponseBodyEncodeDecode` functions - these
are crucial for enabling efficient streaming. Additionally, keep an eye out for
memory leaks that can occur when resources like file handles or readers aren't
properly closed. Regular monitoring of memory usage patterns can help catch
these issues early.

When dealing with performance optimization, there are several key strategies to
consider. For very large files, implementing chunked uploads can significantly
improve reliability and allow for better error recovery. Using appropriate
buffer sizes with `io.Copy` helps balance memory usage with throughput - too
small buffers can hurt performance while too large ones waste memory. For
long-running transfers, implementing progress tracking gives users valuable
feedback and helps detect stalled transfers early. Finally, enabling compression
for large files, especially text-based ones, can dramatically reduce transfer
times and bandwidth usage, though the CPU overhead should be considered.

When implementing file uploads and downloads, you'll need to handle several
common error scenarios. Invalid Content-Type headers can occur when clients send
files with incorrect or missing MIME types. Multipart form data may have missing
or malformed boundaries, making it impossible to properly parse the request.
System-level issues like running out of disk space or having insufficient file
permissions can also interrupt transfers. Network interruptions are particularly
important to handle gracefully, as file transfers often take longer than typical
API requests and are more susceptible to connection drops or timeouts.

Remember to test your implementation thoroughly with various file sizes and
types, and under different network conditions to ensure robust operation in
production.

## Production Storage Considerations

While this example demonstrates file handling using the local file system for
simplicity, production services often require more sophisticated storage
solutions. The principles of streaming and efficient memory usage remain the
same, but you might want to consider:

- Cloud object storage services (like AWS S3, Google Cloud Storage, or Azure Blob
  Storage) for scalability and reliability
- Distributed file systems for high availability and fault tolerance
- Content delivery networks (CDNs) for efficient global file distribution
- Database storage for smaller files that need transactional guarantees

The service implementation can be adapted to use these alternatives by replacing
the file system operations with appropriate client libraries while maintaining
the streaming approach. For example, when using cloud storage, you would stream
the upload directly to the storage service and generate pre-signed URLs for
downloads instead of serving the files directly.
