---
title: Encoding
weight: 4
---

# Customizing Response Encoding

After implementing your Concerts service, you might need to customize how data
is encoded and decoded. This tutorial shows you how to work with Goa's flexible
encoding system, allowing you to support different content types and implement
custom serialization logic.

## Default Behavior

By default, the Concerts service we built uses Goa's standard encoders and decoders, which handle:
- JSON (application/json)
- XML (application/xml)
- Gob (application/gob)

Let's look at how to customize this for your needs.

## Modifying the Server Setup

Recall our `main.go` server setup:

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

Let's modify our Concerts service to support MessagePack encoding for better performance:

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

// Custom encoder constructor
func msgpackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &msgpackEnc{w: w}
}

func (e *msgpackEnc) Encode(v any) error {
    w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(e.w).Encode(v)
}

// Custom decoder constructor
func msgpackDecoder(r *http.Request) goahttp.Decoder {
    return &msgpackDec{r: r}
}

func (d *msgpackDec) Decode(v any) error {
    return msgpack.NewDecoder(d.r.Body).Decode(v)
}

func main() {
    // ... service initialization ...

    // Custom encoder selection based on Accept header
    encodeFunc := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        accept := ctx.Value(goahttp.AcceptTypeKey).(string)
        
        // Parse Accept header which may contain multiple types with q-values
        // e.g., "application/json;q=0.9,application/msgpack"
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
        
        // Default to JSON if no supported type found
        return goahttp.ResponseEncoder(ctx, w)
    }

    // Custom decoder selection based on Content-Type
    decodeFunc := func(r *http.Request) goahttp.Decoder {
        if r.Header.Get("Content-Type") == "application/msgpack" {
            return msgpackDecoder(r)
        }
        return goahttp.RequestDecoder(r)
    }

    // Use custom encoder/decoder
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

Now you can interact with your API using different content types:

```bash
# Create concert using JSON
curl -X POST http://localhost:8080/concerts \
    -H "Content-Type: application/json" \
    -d '{"artist":"The Beatles","venue":"O2 Arena"}'

# Get concert specifying Accept header
curl http://localhost:8080/concerts/123 \
    -H "Accept: application/msgpack" \
    --output concert.msgpack

# Create concert using MessagePack
curl -X POST http://localhost:8080/concerts \
    -H "Content-Type: application/msgpack" \
    --data-binary @concert.msgpack
```

## Best Practices

1. **Content Negotiation**
   - Always check Accept headers for responses
   - Provide sensible defaults (usually JSON)
   - Return 406 Not Acceptable for unsupported types

2. **Performance**
   - Use appropriate encoder for the use case
   - Consider binary formats for large payloads
   - Implement caching when possible

3. **Error Handling**
   - Validate Content-Type headers
   - Return clear error messages
   - Maintain consistent error formats

4. **Testing**
   - Test with different Content-Types
   - Verify error responses
   - Check header handling

## Summary

By customizing encoders and decoders, you can:
- Support efficient binary formats like MessagePack
- Handle custom content types
- Implement special encoding logic
- Control content negotiation

This completes our REST API tutorial series. You now have a fully functional
Concerts API with custom encoding support!