---
title: Overriding Error Serialization
linkTitle: Overriding Serialization
weight: 6
description: "Customize how Goa serializes errors by implementing custom error formatters and handling specific error types with tailored responses."
---

In Goa, errors are automatically handled by the framework, providing a
consistent way to communicate issues such as validation errors, internal server
errors, or custom business logic errors. However, there may be cases where you
want to customize how these errors are serialized or presented to the client.
This section explains how to override the default error serialization in Goa
for any type of error, including the built-in validation errors.

## Customizing Error Serialization

Goa provides the ability to customize how errors are serialized by implementing a
custom error formatter function. This formatter receives the error object and can
inspect its properties to determine how it should be serialized in the response.
The formatter can handle any type of error, including:

- Built-in Goa validation errors
- Custom service errors defined in your DSL
- Standard Go errors
- Third-party error types

The formatter returns a response object that determines both the structure of the
error payload and the HTTP status code to use. This gives you complete control
over how errors are presented to API clients.

### Example: Custom Error Serialization for Specific Error Types

Consider a scenario where you want to customize the serialization of specific
error types, such as missing field errors or custom business logic errors. You
can achieve this by defining custom error types and a corresponding error
formatter.

#### Step 1: Define Custom Error Types

First, define custom error types that will be used to serialize specific errors.
These types should implement the `Statuser` interface to return the appropriate
HTTP status code.

```go
// missingFieldError is the type used to serialize missing required field errors.
type missingFieldError string

// StatusCode returns 400 (BadRequest).
func (missingFieldError) StatusCode() int {
    return http.StatusBadRequest
}

// customBusinessError is the type used to serialize custom business logic errors.
type customBusinessError string

// StatusCode returns 422 (Unprocessable Entity).
func (customBusinessError) StatusCode() int {
    return http.StatusUnprocessableEntity
}
```

#### Step 2: Implement the Custom Error Formatter

Next, implement a custom error formatter that inspects the error and converts it
into the appropriate custom error type based on the error's properties.

```go
// customErrorResponse converts err into a custom error type based on the error's properties.
func customErrorResponse(ctx context.Context, err error) Statuser {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case "missing_field":
            return missingFieldError(serr.Message)
        case "business_error":
            return customBusinessError(serr.Message)
        default:
            // Use Goa default for other errors
            return goahttp.NewErrorResponse(err)
        }
    }
    // Use Goa default for all other error types
    return goahttp.NewErrorResponse(err)
}
```

#### Step 3: Use the Custom Error Formatter

Finally, use the custom error formatter when instantiating your HTTP server or
handler. This ensures that your custom error serialization logic is applied to
all errors returned by your service.

```go
var (
    appServer *appsvr.Server
)
{
    eh := errorHandler(logger)
    appServer = appsvr.New(appEndpoints, mux, dec, enc, eh, customErrorResponse)
    // ...
}
```

### Benefits of Custom Error Serialization

- **Consistency**: Custom error serialization allows you to maintain consistency in how errors are presented across your API including validation errors.
- **Clarity**: You can provide more descriptive error messages or additional context that helps clients understand and resolve issues specific to your use case.
- **Flexibility**: You can tailor error responses to meet specific requirements, such as integrating with existing client-side error handling logic or supporting custom business rules.

## Summary

Custom error serialization in Goa provides a powerful way to tailor error
responses to your specific needs while maintaining consistency across your API.
By implementing custom error formatters and integrating them with Goa's error
handling mechanisms, you can create more meaningful and actionable error
responses for your clients.

Now that you understand how to customize error serialization, proceed to the
next section on [Best Practices](../7-best-practices) to learn recommended
patterns and strategies for implementing robust error handling in your Goa
services.
