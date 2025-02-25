---
title: "Health Checks"
description: "Implementing health checks with Clue"
weight: 5
---

# Health Checks

Health checks are crucial for service monitoring and orchestration. They help
ensure your service is functioning correctly and all its dependencies are
available. Clue provides a standard health check system that monitors service
dependencies and reports their status, making it easy to integrate with
container orchestrators and monitoring systems.

## Overview

Clue's health check system provides comprehensive service health monitoring:

- **Dependency Monitoring**: Tracks the health of databases, caches, and other services
- **Standard Endpoints**: HTTP endpoints compatible with Kubernetes and other platforms
- **Detailed Status**: Rich status information including uptime and version
- **Custom Checks**: Support for business-specific health criteria
- **Flexible Configuration**: Customizable timeouts, paths, and response formats

## Basic Setup

Setting up health checks in your service is straightforward. Here's a basic example:

```go
// Create health checker
checker := health.NewChecker()

// Mount health check endpoint
// This creates a GET /health endpoint that returns service status
mux.Handle("GET", "/health", health.Handler(checker))
```

With this basic setup in place, your service gains several essential health
monitoring capabilities. You get a standardized health check endpoint that
external systems can reliably query to check your service's status. The endpoint
returns responses in JSON format, making it easy for monitoring tools to parse
and process the health data. The system uses standard HTTP status codes to
clearly indicate whether your service is healthy or experiencing issues.
Additionally, it automatically aggregates the status of all your service's
dependencies, giving you a comprehensive view of your system's health at a
glance.

## Response Format

The health check endpoint returns a JSON response that includes the status of
all monitored dependencies:

```json
{
    "status": {
        "PostgreSQL": "OK",
        "Redis": "OK",
        "PaymentService": "NOT OK"
    },
    "uptime": 3600,
    "version": "1.0.0"
}
```

The response includes:
- **status**: Map of dependency names to their current status
- **uptime**: Service uptime in seconds
- **version**: Service version information

HTTP status codes:
- **200 OK**: All dependencies are healthy
- **503 Service Unavailable**: One or more dependencies are unhealthy

## Implementing Health Checks

To make a service or dependency health-checkable, implement the `Pinger`
interface. This interface is simple but powerful:

```go
// Pinger interface
type Pinger interface {
    Name() string                    // Unique identifier for the dependency
    Ping(context.Context) error      // Check if dependency is healthy
}

// Database health check
// Example implementation for a PostgreSQL database
type DBClient struct {
    db *sql.DB
}

func (c *DBClient) Name() string {
    return "PostgreSQL"
}

func (c *DBClient) Ping(ctx context.Context) error {
    // Use database's built-in ping functionality
    return c.db.PingContext(ctx)
}

// Redis health check
// Example implementation for a Redis cache
type RedisClient struct {
    client *redis.Client
}

func (c *RedisClient) Name() string {
    return "Redis"
}

func (c *RedisClient) Ping(ctx context.Context) error {
    // Use Redis PING command
    return c.client.Ping(ctx).Err()
}
```

When implementing health checks, there are several important factors to
consider. First and foremost, health checks should be lightweight and execute
quickly to avoid impacting your service's performance. This is especially
important since health checks may be called frequently by monitoring systems.

Proper timeout handling is also critical. Each health check should respect
timeouts passed via context and return promptly if the timeout is reached. This
prevents health checks from hanging and potentially cascading into broader
system issues.

The error messages returned by health checks should be clear and actionable.
When a check fails, the error message should provide enough detail for operators
to understand and address the issue quickly. This might include specific error
codes, component states, or troubleshooting hints.

For health checks that are resource-intensive or hit external services, consider
implementing a caching mechanism. This can help reduce load while still
providing reasonably current health status. The cache duration should be
balanced against your needs for accuracy - shorter durations give more current
results but increase load.

## Downstream Services

Monitoring the health of downstream services is crucial for distributed systems.
Here's how to implement health checks for different types of services:

```go
// HTTP service health check
type ServiceClient struct {
    name   string
    client *http.Client
    url    string
}

func (c *ServiceClient) Name() string {
    return c.name
}

func (c *ServiceClient) Ping(ctx context.Context) error {
    // Create request with context for timeout handling
    req, err := http.NewRequestWithContext(ctx,
        "GET", c.url+"/health", nil)
    if err != nil {
        return err
    }
    
    // Perform health check request
    resp, err := c.client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    // Check response status
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("service unhealthy: %d", resp.StatusCode)
    }
    
    return nil
}

// gRPC service health check
type GRPCClient struct {
    name string
    conn *grpc.ClientConn
}

func (c *GRPCClient) Name() string {
    return c.name
}

func (c *GRPCClient) Ping(ctx context.Context) error {
    // Use standard gRPC health checking protocol
    return c.conn.Invoke(ctx,
        "/grpc.health.v1.Health/Check",
        &healthpb.HealthCheckRequest{},
        &healthpb.HealthCheckResponse{})
}
```

## Custom Health Checks

Beyond basic connectivity checks, you can implement custom health checks for
business-specific requirements:

```go
// Custom business logic check
type BusinessCheck struct {
    store *Store
}

func (c *BusinessCheck) Name() string {
    return "BusinessLogic"
}

func (c *BusinessCheck) Ping(ctx context.Context) error {
    // Check critical business conditions
    ok, err := c.store.CheckConsistency(ctx)
    if err != nil {
        return err
    }
    if !ok {
        return errors.New("data inconsistency detected")
    }
    return nil
}

// System resource check
type ResourceCheck struct {
    threshold float64
}

func (c *ResourceCheck) Name() string {
    return "SystemResources"
}

func (c *ResourceCheck) Ping(ctx context.Context) error {
    // Check memory usage
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    memoryUsage := float64(m.Alloc) / float64(m.Sys)
    if memoryUsage > c.threshold {
        return fmt.Errorf("memory usage too high: %.2f", memoryUsage)
    }
    
    return nil
}
```

## Kubernetes Integration

Configure your service's health checks in Kubernetes using probes. This example shows both liveness and readiness probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myservice
spec:
  template:
    spec:
      containers:
      - name: myservice
        image: myservice:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 3
          periodSeconds: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Best Practices

1. **Dependency Checks**:
   - Include all critical dependencies
   - Set appropriate timeouts
   - Handle transient failures
   - Monitor check performance

2. **Response Times**:
   - Keep checks lightweight
   - Use concurrent checks
   - Cache results when appropriate
   - Monitor check latency

3. **Error Handling**:
   - Provide clear error messages
   - Include error context
   - Log check failures
   - Alert on repeated failures

4. **Security**:
   - Secure health endpoints
   - Limit exposed information
   - Monitor access patterns
   - Use appropriate authentication

## Learn More

For more information about health checks:

- [Clue Health Package](https://pkg.go.dev/goa.design/clue/health)
  Complete documentation of Clue's health check capabilities

- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
  Official Kubernetes documentation on probe configuration

- [Health Check Patterns](https://microservices.io/patterns/observability/health-check-api.html)
  Common patterns and best practices for health check APIs 