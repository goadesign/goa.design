---
title: "Content Negotiation"
linkTitle: "Content Negotiation"
weight: 1
description: "Learn how to handle multiple content types, process Accept headers, and implement custom encoders/decoders in Goa HTTP services."
menu:
  main:
    parent: "HTTP Advanced Topics"
    weight: 1
---

Content negotiation allows your HTTP services to support multiple content types
and formats. Goa provides a flexible encoding and decoding strategy that makes
it possible to associate arbitrary encoders and decoders with HTTP response and
request content types.

## Server Construction

The generated HTTP server constructor accepts encoder and decoder functions as
arguments, allowing for custom implementations:

```go
// New instantiates HTTP handlers for all the service endpoints
func New(
    e *divider.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(context.Context, err error) goahttp.Statuser,
) *Server
```

The default Goa encoder and decoder are provided by the Goa `http` package and
can be used like this:

```go
import (
    // ...
    "goa.design/goa/v3/http"
)

// ...

server := calcsvr.New(endpoints, mux, http.RequestDecoder, http.ResponseEncoder, nil, nil)
```

## Content Type Support

Content type support in Goa determines how data is serialized and deserialized
across the network boundary. The encoding and decoding roles switch between
client and server, in order of execution:

- Client-side encoding prepares request bodies to send
- Server-side decoding processes incoming request bodies
- Server-side encoding handles response bodies sent to clients
- Client-side decoding processes received response bodies

### Built-in Encoders/Decoders

The default Goa encoders and decoders support several common content types.
These include:
- JSON and JSON variants (`application/json`, `*+json`)
- XML and XML variants (`application/xml`, `*+xml`)
- Gob and Gob variants (`application/gob`, `*+gob`)
- HTML (`text/html`)
- Plain text (`text/plain`)

The suffix matching pattern allows for content type variants, such as
`application/ld+json`, `application/hal+json`, and `application/vnd.api+json`.

### Response Content Types

The default response encoder implements a content negotiation strategy that
considers multiple factors in sequence:

- First, it examines the `Accept` header of the incoming request to determine
  the client's preferred content types.
- Next, it looks at the `Content-Type` header of the request if the Accept
  header isn't present.
- Finally, it falls back to a default content type for the response if neither
  header provides usable information.

On the server side, the encoder processes the client's `Accept` header to
determine content type preferences. It then selects the most appropriate encoder
based on the available supported types. When no suitable match is found among
the accepted types, the encoder defaults to using JSON.

For client-side operations, the decoder processes the received response based on
the content type specified in the response headers. When encountering unknown
content types, it safely falls back to JSON decoding to maintain compatibility.

### Request Content Types

Request content type handling follows a simpler negotiation process than
responses. The process primarily relies on the `Content-Type` header of the
request, with a fallback to a default content type when necessary.

On the server side, the decoder begins by inspecting the request's
`Content-Type` header. Based on this value, it selects the appropriate decoder
implementation—whether that's JSON, XML, or gob. In cases where the
`Content-Type` header is missing or specifies an unsupported format, the decoder
defaults to JSON to ensure request processing can continue.

For client-side operations, the encoder sets the content type based on the
request configuration and encodes the request body accordingly. When no specific
content type is provided, it defaults to JSON encoding to maintain consistent
behavior.

In all cases, if encoding or decoding fails, Goa invokes the error handler that
was registered during the HTTP server's creation, allowing for graceful error
handling and appropriate client feedback.

### Setting Default Content Types

Use the `ContentType` DSL to specify a default response content type:

```go
var _ = Service("media", func() {
    Method("create", func() {
        HTTP(func() {
            POST("/media")
            Response(StatusCreated, func() {
                // Override response content type
                ContentType("application/json")
            })
        })
    })
})
```

When set, this overrides any content type specified in request headers, but not the `Accept` header value.

## Custom Encoders/Decoders

When Goa's built-in encoders don't meet your needs, you can implement custom
encoders and decoders. You might need custom encoders to support specialized
formats like MessagePack or BSON that aren't included in Goa's defaults. They're
also useful when you need to optimize encoding performance for your specific use
case, add compression or encryption layers to your responses, or maintain
compatibility with legacy or proprietary formats used by existing systems.

### Creating a Custom Encoder

An encoder must implement the `Encoder` interface defined in the Goa `http`
package and provide a constructor function:

```go
// Encoder interface for response encoding
type Encoder interface {
    Encode(v any) error
}

// Constructor function
func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

The constructor function must return an `Encoder` and an error:

```go
// Constructor signature
func(ctx context.Context, w http.ResponseWriter) (goahttp.Encoder, error)

// Example MessagePack encoder
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    // Set content type header
    enc.w.Header().Set("Content-Type", "application/msgpack")
    
    // Use MessagePack encoding
    return msgpack.NewEncoder(enc.w).Encode(v)
}

// Constructor function
func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

The context contains both `ContentTypeKey` and `AcceptTypeKey` values, allowing for content type negotiation.

### Creating a Custom Decoder

A decoder must implement the `goahttp.Decoder` interface and provide a constructor function:

```go
// Constructor signature
func(r *http.Request) (goahttp.Decoder, error)

// Example MessagePack decoder
type MessagePackDecoder struct {
    r *http.Request
}

func (dec *MessagePackDecoder) Decode(v interface{}) error {
    return msgpack.NewDecoder(dec.r.Body).Decode(v)
}

// Constructor function
func NewMessagePackDecoder(r *http.Request) goahttp.Decoder {
    return &MessagePackDecoder{r: r}
}
```

The constructor has access to the request object and can inspect its state to determine the appropriate decoder.

### Registering Custom Encoders/Decoders

Use your custom encoder/decoder when creating the HTTP server:

```go
func main() {
    // Create endpoints
    endpoints := myapi.NewEndpoints(svc)
    
    // Create decoder factory
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r) // Default Goa decoder
        }
    }
    
    // Create encoder factory
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w) // Default Goa encoder
    }
    
    // Create HTTP server with custom encoder/decoder
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

### Best Practices for Custom Encoders

1. **Error Handling**
   - Return meaningful errors when encoding/decoding fails
   - Consider implementing custom error types for specific failures
   - Properly handle nil values and edge cases

2. **Performance**
   - Consider buffering for large payloads
   - Implement pooling for frequently used objects
   - Profile and optimize hot paths

3. **Headers**
   - Set appropriate Content-Type headers
   - Handle Content-Length when needed
   - Consider adding custom headers for metadata

4. **Content Negotiation**
   - Respect Accept headers in encoder selection
   - Provide clear error messages for unsupported formats
   - Consider implementing quality values (q-values) support

## Content Type Negotiation

### Accept Header Processing

Goa automatically handles Accept header processing:

1. Client sends Accept header with preferred types
2. Goa matches against supported content types
3. Best matching content type is selected
4. Response is encoded accordingly

Example Accept header processing:

```go
Accept: application/json;q=0.9, application/xml;q=0.8
```

Goa will:
1. Parse quality values
2. Check against supported types
3. Choose highest quality supported match
4. Use default if no match (usually application/json)

### Versioning via Content Types

Use content types for API versioning:

```go
var _ = Service("versioned", func() {
    HTTP(func() {
        Response(func() {
            ContentType(
                "application/vnd.api.v1+json",
                "application/vnd.api.v2+json"
            )
        })
    })
})
```

## Best Practices

{{< alert title="Content Type Guidelines" color="primary" >}}
1. **Default Content Type**: Always provide a default content type
2. **Content Type Order**: List preferred types first
3. **Versioning**: Consider using content types for versioning
4. **Error Responses**: Use consistent error response formats
5. **Documentation**: Document supported content types clearly
{{< /alert >}}

## Testing Content Negotiation

Testing custom encoders and decoders requires careful validation of content type
handling and negotiation. Here's how to effectively test content negotiation
using Clue's [mock package](https://github.com/goadesign/clue/tree/main/mock):

```go
// Import Clue's mock package
import (
    "github.com/goadesign/clue/mock"
)

// Mock encoder implementation using Clue's mock package
// This shows how to properly structure a mock encoder using Clue
type mockEncoder struct {
    *mock.Mock // Embed Clue's Mock type
}

// Encode implements the mock using Clue's Next pattern
func (m *mockEncoder) Encode(v interface{}) error {
    if f := m.Next("Encode"); f != nil {
        return f.(func(interface{}) error)(v)
    }
    return errors.New("unexpected call to Encode")
}

// Mock decoder implementation using Clue's mock package
// This shows how to properly structure a mock decoder using Clue
type mockDecoder struct {
    *mock.Mock // Embed Clue's Mock type
}

// Decode implements the mock using Clue's Next pattern
func (m *mockDecoder) Decode(v interface{}) error {
    if f := m.Next("Decode"); f != nil {
        return f.(func(interface{}) error)(v)
    }
    return errors.New("unexpected call to Decode")
}

func TestContentNegotiation(t *testing.T) {
    // Create mock encoder and decoder using Clue's mock package
    encoder := &mockEncoder{mock.New()}
    decoder := &mockDecoder{mock.New()}
    
    tests := []struct {
        name         string
        contentType  string
        accept       string
        setupEncoder func(*mockEncoder)
        setupDecoder func(*mockDecoder)
        input        interface{}
        wantErr      bool
    }{
        {
            name:        "JSON content type",
            contentType: "application/json",
            accept:      "application/json",
            setupEncoder: func(e *mockEncoder) {
                // Use Clue's Set method for permanent behavior
                e.Set("Encode", func(v interface{}) error {
                    // Verify JSON encoding
                    _, ok := v.(json.Marshaler)
                    if !ok {
                        return fmt.Errorf("value does not implement json.Marshaler")
                    }
                    return nil
                })
            },
            setupDecoder: func(d *mockDecoder) {
                // Use Clue's Set method for permanent behavior
                d.Set("Decode", func(v interface{}) error {
                    // Verify JSON decoding
                    _, ok := v.(json.Unmarshaler)
                    if !ok {
                        return fmt.Errorf("value does not implement json.Unmarshaler")
                    }
                    return nil
                })
            },
            input:   &TestStruct{ID: "test"},
            wantErr: false,
        },
        {
            name:        "MessagePack content type",
            contentType: "application/msgpack",
            accept:      "application/msgpack",
            setupEncoder: func(e *mockEncoder) {
                // Use Clue's Add method for sequence-specific behavior
                e.Add("Encode", func(v interface{}) error {
                    // Verify MessagePack encoding
                    _, ok := v.(msgpack.Marshaler)
                    if !ok {
                        return fmt.Errorf("value does not implement msgpack.Marshaler")
                    }
                    return nil
                })
            },
            setupDecoder: func(d *mockDecoder) {
                // Use Clue's Add method for sequence-specific behavior
                d.Add("Decode", func(v interface{}) error {
                    // Verify MessagePack decoding
                    _, ok := v.(msgpack.Unmarshaler)
                    if !ok {
                        return fmt.Errorf("value does not implement msgpack.Unmarshaler")
                    }
                    return nil
                })
            },
            input:   &TestStruct{ID: "test"},
            wantErr: false,
        },
        {
            name:        "unsupported content type",
            contentType: "application/unknown",
            accept:      "application/unknown",
            setupEncoder: func(e *mockEncoder) {
                // Demonstrate error handling with Clue mocks
                e.Set("Encode", func(v interface{}) error {
                    return fmt.Errorf("unsupported content type")
                })
            },
            setupDecoder: func(d *mockDecoder) {
                // Demonstrate error handling with Clue mocks
                d.Set("Decode", func(v interface{}) error {
                    return fmt.Errorf("unsupported content type")
                })
            },
            input:   &TestStruct{ID: "test"},
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create fresh Clue mocks for each test case
            encoder := &mockEncoder{mock.New()}
            decoder := &mockDecoder{mock.New()}
            
            if tt.setupEncoder != nil {
                tt.setupEncoder(encoder)
            }
            if tt.setupDecoder != nil {
                tt.setupDecoder(decoder)
            }
            
            // Create request with content type
            req := httptest.NewRequest("POST", "/", nil)
            req.Header.Set("Content-Type", tt.contentType)
            req.Header.Set("Accept", tt.accept)
            
            // Create response recorder
            rec := httptest.NewRecorder()
            
            // Create encoder function
            encoderFn := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
                return encoder
            }
            
            // Create decoder function
            decoderFn := func(r *http.Request) goahttp.Decoder {
                return decoder
            }
            
            // Create handler with custom encoder/decoder
            handler := goahttp.RequestDecoder(decoderFn)
            
            // Test request decoding
            err := handler(req, tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("RequestDecoder() error = %v, wantErr %v", err, tt.wantErr)
            }
            
            // Use Clue's HasMore method to verify all expected calls were made
            if encoder.HasMore() {
                t.Error("not all expected encoder operations were performed")
            }
            if decoder.HasMore() {
                t.Error("not all expected decoder operations were performed")
            }
        })
    }
}
```

This example demonstrates several key features of Clue's
[mock package](https://github.com/goadesign/clue/tree/main/mock):

1. **Type-Safe Mocking**: The mock implementations (`mockEncoder` and `mockDecoder`) provide type-safe interfaces by embedding Clue's `Mock` type.
2. **Flexible Behavior Definition**: 
   - Use `Set` for permanent behaviors (see JSON content type test)
   - Use `Add` for sequence-specific behaviors (see MessagePack content type test)
3. **Comprehensive Verification**: The `HasMore` method ensures all expected operations were performed
4. **Error Handling**: Demonstrate proper error cases and validation (see unsupported content type test)

The test cases provide thorough coverage of essential content negotiation
scenarios. They validate JSON content negotiation using permanent mock
behaviors, ensuring consistent handling of this common format. The tests also
verify MessagePack content negotiation through sequence-specific behaviors,
demonstrating support for binary formats. Error conditions are tested by
validating proper handling of unsupported content types. Finally, the test suite
ensures proper cleanup by verifying that all mock expectations are met during
test execution.

The tests verify:
1. Content type handling through request/response headers
2. Encoder/decoder selection based on content types
3. Error handling for unsupported formats
4. Proper implementation of marshaling interfaces
5. Complete verification of expected operations

## Next Steps

- Review [Error Handling](../../3-tutorials/3-error-handling) for error response formats
- Explore [Streaming](../../3-tutorials/4-streaming) for streaming content types
- Check out [Static Content](../../3-tutorials/5-static-content) for file uploads/downloads
- Learn about [Interceptors](../../4-concepts/5-interceptors) for business logic handling
