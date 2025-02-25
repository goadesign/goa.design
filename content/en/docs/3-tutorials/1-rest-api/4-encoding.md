---
title: Customizing Request/Response Encoding
linkTitle: Encoding
weight: 4
description: "Master Goa's encoding system by learning how to customize request/response encoding, support multiple content types like JSON and MessagePack, and implement custom serialization logic."
---

After implementing your Concerts service, you might want to level up your API by customizing how data is encoded and decoded. Whether you need better performance with binary formats, special data handling, or support for different content types, this guide will show you how to make it happen! 🚀

## Default Behavior

Out of the box, your Concerts service comes equipped with Goa's standard encoders and decoders. These handle the most common formats you'll need:

- JSON (application/json) - Perfect for web browsers and most API clients
- XML (application/xml) - Great for legacy systems and enterprise integration
- Gob (application/gob) - Efficient for Go-to-Go communication

This works great for many applications, but let's explore how to customize it for your specific needs!

## Modifying the Server Setup

First, let's look at our current `main.go` server setup. This is where the magic happens for handling different content types:

```go
func main() {
    // ... service initialization ...

    // Default encoders and decoders
    mux := goahttp.NewMuxer()
    handler := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,  // Default request decoder
        goahttp.ResponseEncoder, // Default response encoder
        nil,
        nil,
    )
}
```

### Adding Custom Content Types

Let's supercharge our Concerts service by adding MessagePack support! MessagePack is a binary format that's faster and more compact than JSON - perfect for high-performance APIs. Here's how to implement it:

```go
package main

import (
    "context"
    "net/http"
    
    "github.com/vmihailenco/msgpack/v5"
    goahttp "goa.design/goa/v3/http"
    "strings"
)

type (
    // MessagePack encoder implementation
    msgpackEnc struct {
        w http.ResponseWriter
    }

    // MessagePack decoder implementation
    msgpackDec struct {
        r *http.Request
    }
)

// Custom encoder constructor - this creates our MessagePack encoder
func msgpackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &msgpackEnc{w: w}
}

func (e *msgpackEnc) Encode(v any) error {
    w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(e.w).Encode(v)
}

// Custom decoder constructor - this handles incoming MessagePack data
func msgpackDecoder(r *http.Request) goahttp.Decoder {
    return &msgpackDec{r: r}
}

func (d *msgpackDec) Decode(v any) error {
    return msgpack.NewDecoder(d.r.Body).Decode(v)
}

func main() {
    // ... service initialization ...

    // Smart encoder selection based on what the client wants (Accept header)
    encodeFunc := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        accept := ctx.Value(goahttp.AcceptTypeKey).(string)
        
        // Parse Accept header which may contain multiple types with q-values
        // For example: "application/json;q=0.9,application/msgpack"
        types := strings.Split(accept, ",")
        for _, t := range types {
            mt := strings.TrimSpace(strings.Split(t, ";")[0])
            switch mt {
            case "application/msgpack":
                return msgpackEncoder(ctx, w)
            case "application/json", "*/*":
                return goahttp.ResponseEncoder(ctx, w)
            }
        }
        
        // When in doubt, JSON is our friend!
        return goahttp.ResponseEncoder(ctx, w)
    }

    // Smart decoder selection based on what the client is sending (Content-Type)
    decodeFunc := func(r *http.Request) goahttp.Decoder {
        if r.Header.Get("Content-Type") == "application/msgpack" {
            return msgpackDecoder(r)
        }
        return goahttp.RequestDecoder(r)
    }

    // Wire up our custom encoder/decoder
    handler := genhttp.New(
        endpoints,
        mux,
        decodeFunc,
        encodeFunc,
        nil,
        nil,
    )
}
```

## Using Different Content Types

Now that we've added MessagePack support, let's see how to use it! Here are some examples showing both JSON and MessagePack in action:

```bash
# Create a concert using good old JSON
curl -X POST http://localhost:8080/concerts \
    -H "Content-Type: application/json" \
    -d '{"artist":"The Beatles","venue":"O2 Arena"}'

# Get a concert in MessagePack format - great for high-performance clients!
curl http://localhost:8080/concerts/123 \
    -H "Accept: application/msgpack" \
    --output concert.msgpack

# Create a concert using MessagePack data
curl -X POST http://localhost:8080/concerts \
    -H "Content-Type: application/msgpack" \
    --data-binary @concert.msgpack
```

## Best Practices

### Content Negotiation

Content negotiation is a key aspect of building flexible APIs that can serve different client needs. Here's how to implement it effectively:

- Always respect the Accept header to determine the client's preferred response format
- Use JSON as a sensible default format when client preferences aren't specified
- Return a `406 Not Acceptable` status code for unsupported format requests
- Clearly document all supported content types in your API documentation

### Performance Considerations

Choose the appropriate encoding format based on your specific use case:

- JSON: Ideal for web applications and debugging due to its human-readable nature
- MessagePack/Protocol Buffers: Recommended for service-to-service communication where performance is critical
- Binary formats: Consider for large payloads to reduce bandwidth and improve transfer speeds
- Implement response caching for frequently accessed resources to reduce encoding overhead

### Error Handling

Implement robust error handling to ensure reliable data exchange:

- Validate Content-Type headers before processing request bodies
- Provide clear, actionable error messages that help clients diagnose issues
- Maintain consistent error response structures across your API
- Document common error scenarios and their corresponding responses

### Testing

Implement comprehensive tests to ensure reliable encoding and decoding:

- Test each supported content type with valid and invalid payloads
- Verify error responses for unsupported content types and malformed data
- Ensure proper handling of Accept and Content-Type headers
- Include edge cases in your test suite (empty bodies, charset variations)
- Set up automated tests to catch encoding-related regressions

See the [Content Negotiation](../../4-concepts/3-http/1-content) section for
more details on how to customize content negotiation in Goa.

## Summary

Congratulations! 🎉 You've learned how to:
- Support efficient binary formats like MessagePack
- Handle custom content types like a pro
- Implement special encoding logic
- Master content negotiation

Your Concerts API is now ready to handle data exchange in multiple formats,
making it more versatile and performant. Whether your clients prefer JSON for
simplicity or MessagePack for speed, you've got them covered!

This completes our REST API tutorial series. You now have a fully functional
Concerts API with custom encoding support that's ready for the real world!