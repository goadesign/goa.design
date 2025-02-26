---
title: Writing Service Clients
weight: 2
---

When building microservices, a common challenge is how to structure the
communication between services. This section covers best practices for writing
clients to Goa services, focusing on creating maintainable and testable client
implementations.

## Client Design Philosophy

The recommended approach for building clients to Goa services follows these key principles:

1. **Single Responsibility**: Create one client per downstream service, rather than a shared client library
2. **Narrow Interfaces**: Define interfaces that expose only the methods needed by the consuming service
3. **Implementation Independence**: Support different transport protocols (gRPC, HTTP) behind the same interface
4. **Testability**: Enable easy mocking for testing through well-defined interfaces

This approach helps avoid creating distributed monoliths where services become
tightly coupled through shared client libraries.

## Client Structure

A typical Goa service client consists of:

1. A client interface defining the service contract
2. Data types representing the domain models
3. A concrete implementation using the generated Goa client
4. Factory functions for creating client instances

Let's look at a complete example of a weather forecasting service client:

```go
package forecaster

import (
	"context"

	"google.golang.org/grpc"

	"goa.design/clue/debug"
	genforecast "goa.design/clue/example/weather/services/forecaster/gen/forecaster"
	gengrpcclient "goa.design/clue/example/weather/services/forecaster/gen/grpc/forecaster/client"
)

type (
	// Client is a client for the forecast service.
	Client interface {
		// GetForecast gets the forecast for the given location.
		GetForecast(ctx context.Context, lat, long float64) (*Forecast, error)
	}

	// Forecast represents the forecast for a given location.
	Forecast struct {
		// Location is the location of the forecast.
		Location *Location
		// Periods is the forecast for the location.
		Periods []*Period
	}

	// Location represents the geographical location of a forecast.
	Location struct {
		// Lat is the latitude of the location.
		Lat float64
		// Long is the longitude of the location.
		Long float64
		// City is the city of the location.
		City string
		// State is the state of the location.
		State string
	}

	// Period represents a forecast period.
	Period struct {
		// Name is the name of the forecast period.
		Name string
		// StartTime is the start time of the forecast period in RFC3339 format.
		StartTime string
		// EndTime is the end time of the forecast period in RFC3339 format.
		EndTime string
		// Temperature is the temperature of the forecast period.
		Temperature int
		// TemperatureUnit is the temperature unit of the forecast period.
		TemperatureUnit string
		// Summary is the summary of the forecast period.
		Summary string
	}

	// client is the client implementation.
	client struct {
		genc *genforecast.Client
	}
)

// New instantiates a new forecast service client.
func New(cc *grpc.ClientConn) Client {
	c := gengrpcclient.NewClient(cc, grpc.WaitForReady(true))
	forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
	return &client{genc: genforecast.NewClient(forecast)}
}

// GetForecast returns the forecast for the given location.
func (c *client) GetForecast(ctx context.Context, lat, long float64) (*Forecast, error) {
	res, err := c.genc.Forecast(ctx, &genforecast.ForecastPayload{Lat: lat, Long: long})
	if err != nil {
		return nil, err
	}
	l := Location(*res.Location)
	ps := make([]*Period, len(res.Periods))
	for i, p := range res.Periods {
		pval := Period(*p)
		ps[i] = &pval
	}
	return &Forecast{&l, ps}, nil
}
```

Let's break down the key components:

### Client Interface

The interface defines the contract that consumers will use:

```go
type Client interface {
    GetForecast(ctx context.Context, lat, long float64) (*Forecast, error)
}
```

This narrow interface only exposes the methods needed by consumers, hiding implementation details and making it easier to maintain and test.

### Domain Types

The client package defines its own domain types (`Forecast`, `Location`,
`Period`) rather than exposing the generated types. This provides:

- Isolation from generated code changes
- A cleaner, more focused API
- Better control over the exposed data model

### Implementation

The concrete implementation uses the generated Goa client internally while
presenting the simplified interface to consumers:

```go
type client struct {
    genc *genforecast.Client
}
```

### Factory Function

The `New` function instantiates the client with the appropriate
transport-specific configuration:

```go
func New(cc *grpc.ClientConn) Client {
    c := gengrpcclient.NewClient(cc, grpc.WaitForReady(true))
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    return &client{genc: genforecast.NewClient(forecast)}
}
```

## HTTP Clients

While the example above shows a gRPC client, HTTP clients follow the same
pattern but with different initialization. Let's look at how HTTP clients work
in detail.

### Goa-Generated HTTP Client

Goa generates a complete HTTP client implementation for your service. Here's
what a typical generated HTTP client looks like:

```go
// Client lists the service endpoint HTTP clients.
type Client struct {
    // ForecastDoer is the HTTP client used to make requests to the forecast endpoint.
    ForecastDoer goahttp.Doer

    // Configuration fields
    RestoreResponseBody bool
    scheme             string
    host               string
    encoder            func(*http.Request) goahttp.Encoder
    decoder            func(*http.Response) goahttp.Decoder
}

// NewClient instantiates HTTP clients for all the service servers.
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client {
    return &Client{
        ForecastDoer:        doer,
        RestoreResponseBody: restoreBody,
        scheme:             scheme,
        host:               host,
        decoder:            dec,
        encoder:            enc,
    }
}

// Forecast returns an endpoint that makes HTTP requests to the service forecast server.
func (c *Client) Forecast() goa.Endpoint {
    var (
        decodeResponse = DecodeForecastResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v any) (any, error) {
        req, err := c.BuildForecastRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        resp, err := c.ForecastDoer.Do(req)
        if err != nil {
            return nil, goahttp.ErrRequestError("front", "forecast", err)
        }
        return decodeResponse(resp)
    }
}
```

The generated client provides:
- A `Doer` interface for each endpoint allowing customization of HTTP client behavior
- Built-in request encoding and response decoding
- Endpoint-specific request builders and response decoders
- Support for middleware through the `Doer` interface

### Creating Your Client Interface

To create a clean client interface using the generated HTTP client, you would write:

```go
func NewHTTP(doer goa.Doer) Client {
    // Create the generated HTTP client
    c := genhttpclient.NewClient(
        "http",                    // scheme
        "weather-service:8080",    // host
        doer,                      // HTTP client
        goahttp.RequestEncoder,    // request encoder
        goahttp.ResponseDecoder,   // response decoder
        false,                     // restore response body
    )
    
    // Wrap with payload logging if needed
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    
    // Return your client implementation
    return &client{genc: genforecast.NewClient(forecast)}
}
```

### Customizing HTTP Behavior

The `goa.Doer` interface (satisfied by `*http.Client`) allows you to customize various HTTP behaviors:

```go
// Example of creating a client with custom timeouts
httpClient := &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 100,
        IdleConnTimeout:     90 * time.Second,
    },
}

// Create your client with the custom HTTP client
client := NewHTTP(httpClient)
```

## Testing with Mocks

The client interface makes it easy to create mocks for testing. The Clue
framework provides a mock generator called `cmg` (Clue Mock Generator) that
automatically creates mocks for your client interfaces.

### Installing the Mock Generator

Install the Clue Mock Generator using:

```bash
go install goa.design/clue/mock/cmd/cmg
```

### Generating Mocks

You can generate mocks for one or multiple packages using the Go package path syntax:

```bash
cmg gen goa.design/clue/example/weather/services/...
```

This command will generate mock implementations for all interfaces in the
specified packages. For a single package, you can use:

```bash
cmg gen ./example/weather/services/forecaster
```

### Using Generated Mocks

The generated mocks provide two ways to define mock behavior:

1. **Permanent Mocks**: Set a permanent mock function for a method that will always be used
2. **Sequential Mocks**: Add mock functions to a sequence that will be consumed in order

Here's an example showing both approaches:

```go
func TestWeatherService(t *testing.T) {
    // Create a new mock client
    mock := NewMockClient()
    
    // Set a permanent mock for GetForecast
    mock.Set("GetForecast", func(ctx context.Context, lat, long float64) (*Forecast, error) {
        return &Forecast{
            Location: &Location{Lat: lat, Long: long},
            Periods: []*Period{
                {
                    Temperature: 72,
                    Summary:    "Sunny",
                },
            },
        }, nil
    })

    // Test the permanent mock
    forecast, err := mock.GetForecast(ctx, 37.7749, -122.4194)
    if err != nil {
        t.Fatal(err)
    }
    
    // Add sequential mocks for different test cases
    mock.Add("GetForecast", func(ctx context.Context, lat, long float64) (*Forecast, error) {
        return &Forecast{
            Location: &Location{Lat: lat, Long: long},
            Periods: []*Period{{Temperature: 65, Summary: "Cloudy"}},
        }, nil
    })
    
    mock.Add("GetForecast", func(ctx context.Context, lat, long float64) (*Forecast, error) {
        return nil, errors.New("service unavailable")
    })

    // First call returns the cloudy forecast
    forecast1, _ := mock.GetForecast(ctx, 37.7749, -122.4194)
    
    // Second call returns the error
    forecast2, err := mock.GetForecast(ctx, 37.7749, -122.4194)
    
    // After consuming the sequence, falls back to permanent mock
    forecast3, _ := mock.GetForecast(ctx, 37.7749, -122.4194)
    
    // Check if all sequential mocks were consumed
    if mock.HasMore() {
        t.Error("Not all sequential mocks were consumed")
    }
}
```

The mock implementation provides thread-safe access to the mock functions and
sequences through a mutex, making it safe to use in concurrent tests. The `Next`
method internally handles the logic of either returning the next sequential mock
or falling back to the permanent mock if the sequence is exhausted.

## Best Practices

1. **Keep interfaces focused**: Only expose methods that are actually needed by consumers
2. **Handle errors appropriately**: Translate transport-specific errors into domain-appropriate errors
3. **Use context**: Pass context through for cancellation and deadline propagation
4. **Configure timeouts**: Set appropriate timeouts for your use case
5. **Use middleware**: Leverage middleware for cross-cutting concerns like logging and metrics
6. **Version carefully**: Consider the impact of changes on consumers

By following these patterns, you can create maintainable, testable clients that
promote good service boundaries and prevent unwanted coupling between services.

