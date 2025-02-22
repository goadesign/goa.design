---
title: "HTTP Advanced Topics"
linkTitle: "HTTP Advanced Topics"
weight: 3
description: "Learn HTTP-specific features and patterns in Goa, building upon the REST API basics with advanced topics and real-world scenarios."
---

This section covers HTTP-specific features and patterns in Goa, complementing
the [Basic REST API](../1-rest-api) tutorial with more advanced topics.

## Before You Begin

Make sure you've completed:
1. The [Basic REST API](../1-rest-api) tutorial for foundational concepts
2. The [Error Handling](../3-error-handling) section for HTTP error responses
3. The [Streaming](../4-streaming) section for streaming (WebSocket) design

## Advanced HTTP Topics

### 1. [Content Negotiation](./1-content)
Master HTTP content handling:
- Multiple content types
- Accept header processing
- Custom encoders/decoders
- Versioning via content types

### 2. [Advanced Routing](./2-routing)
Complex URL patterns and routing scenarios:
- Path parameters
- Query string handling
- Optional parameters
- Wildcard routes

### 3. [WebSocket Integration](./3-websocket)
Add WebSocket support to your services:
- Connection handling
- Message formats
- Error handling
- Client implementations

## Related Topics

- For file uploads and downloads, see [Static Content](../../3-tutorials/5-static-content)
- For error responses, see [Error Handling](../../3-tutorials/3-error-handling)
- For security patterns, see [Security](../../4-concepts/5-security)
- For encoding details, see [HTTP Encoding](../../4-concepts/4-http-encoding)
- For middleware patterns, see [Middleware](../../5-interceptors/2-http-middleware)
