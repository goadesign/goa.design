---
title: "Debugging and Profiling"
linkTitle: "Debugging"
description: "Runtime debugging and profiling with Clue"
weight: 6
---

Runtime debugging and profiling are essential for understanding service behavior
and diagnosing issues in production environments. Clue provides a comprehensive
set of tools that help you investigate problems, analyze performance, and
monitor system behavior without impacting your service's operation.

## Overview

Clue's debugging toolkit includes several powerful features:

- **Dynamic Log Control**: Adjust log levels at runtime without restarts
- **Payload Logging**: Capture and analyze request/response data
- **Go Profiling**: Built-in support for Go's pprof tooling
- **Memory Analysis**: Track and analyze memory usage patterns
- **Custom Debugging**: Extensible framework for service-specific debugging

## Debug Log Control

Dynamic log level control allows you to adjust logging verbosity in running
services. This is particularly useful when investigating issues in production
environments:

```go
// Mount debug log enabler
// This adds endpoints for controlling log levels
debug.MountDebugLogEnabler(mux)

// Add debug middleware to HTTP handlers
// This enables dynamic debug logging for HTTP requests
handler = debug.HTTP()(handler)

// Add debug interceptor to gRPC server
// This enables dynamic debug logging for gRPC calls
svr := grpc.NewServer(
    grpc.UnaryInterceptor(debug.UnaryServerInterceptor()))
```

Control debug logging through HTTP endpoints:
```bash
# Enable debug logs for detailed investigation
curl "http://localhost:8080/debug?debug-logs=on"

# Disable debug logs when investigation is complete
curl "http://localhost:8080/debug?debug-logs=off"

# Check current debug logging state
curl "http://localhost:8080/debug"
```

## Payload Logging

Payload logging captures request and response content for debugging API integration
issues. It only activates when debug log level is enabled, making it a powerful
tool when combined with dynamic log level control. This allows you to:

1. Enable debug logging when needed: `curl "http://localhost:8080/debug?debug-logs=on"`
2. See detailed payload information for requests
3. Disable debug logging when done: `curl "http://localhost:8080/debug?debug-logs=off"`

Here's how to set it up:

```go
// Enable payload logging for all endpoints
// This captures request and response bodies for analysis
// Note: Payloads are only logged when debug level is active
endpoints := genapi.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())

// Example debug log output showing captured payload
// Only appears when debug logging is enabled
{
    "level": "debug",
    "msg": "request payload",
    "path": "/users",
    "method": "POST",
    "payload": {
        "name": "John Doe",
        "email": "john@example.com"
    }
}
```

This approach provides several benefits:

- **Performance**: No payload logging overhead in normal operation
- **Security**: Sensitive payload data only exposed when explicitly enabled
- **Flexibility**: Enable/disable payload logging at runtime
- **Debugging**: Full request/response context when needed

Typical debugging workflow:
```bash
# 1. Enable debug logging when investigating an issue
curl "http://localhost:8080/debug?debug-logs=on"

# 2. Reproduce the issue - payloads will be logged
# 3. Analyze the logged payloads

# 4. Disable debug logging when investigation is complete
curl "http://localhost:8080/debug?debug-logs=off"
```

## Profiling Endpoints

Go's pprof profiling tools provide deep insights into service performance. Clue
makes it easy to expose these endpoints:

```go
// Mount all pprof handlers at once
// This enables the full suite of Go profiling tools
debug.MountDebugPprof(mux)

// Or mount specific handlers for more control
mux.HandleFunc("/debug/pprof/", pprof.Index)          // Profile index
mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline) // Command line
mux.HandleFunc("/debug/pprof/profile", pprof.Profile) // CPU profile
mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)   // Symbol lookup
mux.HandleFunc("/debug/pprof/trace", pprof.Trace)     // Execution trace
```

Use these endpoints with Go's profiling tools:

```bash
# Collect and analyze CPU profile
go tool pprof http://localhost:8080/debug/pprof/profile
# Opens interactive pprof shell for CPU analysis

# Analyze heap memory usage
go tool pprof http://localhost:8080/debug/pprof/heap
# Shows memory allocation patterns

# Investigate goroutine behavior
go tool pprof http://localhost:8080/debug/pprof/goroutine
# Displays goroutine stacks and states

# Capture execution trace
curl -o trace.out http://localhost:8080/debug/pprof/trace
go tool trace trace.out
# Opens detailed execution visualization
```

For more information about profiling:
- [Profiling Go Programs](https://go.dev/blog/pprof)
  Official Go blog post about pprof usage
- [Runtime pprof](https://pkg.go.dev/runtime/pprof)
  Package documentation for pprof
- [Debugging Performance Issues](https://golang.org/doc/diagnostics.html)
  Go's official diagnostics documentation

## Custom Debug Endpoints

Create service-specific debug endpoints to expose important runtime information:

```go
// Debug configuration endpoint
// Exposes current service configuration
type Config struct {
    LogLevel      string            `json:"log_level"`      // Current logging level
    Features      map[string]bool   `json:"features"`       // Feature flag states
    RateLimit     int              `json:"rate_limit"`      // Current rate limits
    Dependencies  []string         `json:"dependencies"`    // Service dependencies
}

func debugConfig(w http.ResponseWriter, r *http.Request) {
    cfg := Config{
        LogLevel: log.GetLevel(r.Context()),
        Features: getFeatureFlags(),
        RateLimit: getRateLimit(),
        Dependencies: getDependencies(),
    }
    
    json.NewEncoder(w).Encode(cfg)
}

// Debug metrics endpoint
// Provides real-time service metrics
func debugMetrics(w http.ResponseWriter, r *http.Request) {
    metrics := struct {
        Goroutines  int     `json:"goroutines"`     // Active goroutines
        Memory      uint64  `json:"memory_bytes"`    // Current memory usage
        Uptime      int64   `json:"uptime_seconds"`  // Service uptime
        Requests    int64   `json:"total_requests"`  // Request count
    }{
        Goroutines: runtime.NumGoroutine(),
        Memory:     getMemoryUsage(),
        Uptime:     getUptime(),
        Requests:   getRequestCount(),
    }
    
    json.NewEncoder(w).Encode(metrics)
}

// Mount debug endpoints
mux.HandleFunc("/debug/config", debugConfig)
mux.HandleFunc("/debug/metrics", debugMetrics)
```

## Memory Analysis

Memory issues can be challenging to diagnose in production environments. Clue provides tools to monitor and analyze memory usage patterns in real time:

```go
// Memory statistics endpoint
// Provides detailed memory usage information
type MemStats struct {
    Alloc      uint64  `json:"alloc"`          // Currently allocated bytes
    TotalAlloc uint64  `json:"total_alloc"`    // Total bytes allocated
    Sys        uint64  `json:"sys"`            // Total memory obtained
    NumGC      uint32  `json:"num_gc"`         // Number of GC cycles
    PauseTotalNs uint64  `json:"pause_total_ns"` // Total GC pause time
}

func debugMemory(w http.ResponseWriter, r *http.Request) {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    stats := MemStats{
        Alloc:      m.Alloc,
        TotalAlloc: m.TotalAlloc,
        Sys:        m.Sys,
        NumGC:      m.NumGC,
        PauseTotalNs: m.PauseTotalNs,
    }
    
    json.NewEncoder(w).Encode(stats)
}

// Manual GC trigger for testing
// Use with caution in production
func debugGC(w http.ResponseWriter, r *http.Request) {
    runtime.GC()
    w.Write([]byte("GC triggered"))
}
```

Key metrics to monitor:
- **Alloc**: Currently allocated heap memory
- **TotalAlloc**: Cumulative allocation since startup
- **Sys**: Total memory obtained from system
- **NumGC**: Number of completed GC cycles
- **PauseTotalNs**: Total time spent in GC pauses

For more information about memory management:
- [Memory Management](https://golang.org/doc/gc-guide)
  Comprehensive guide to Go's garbage collection
- [Runtime Statistics](https://pkg.go.dev/runtime#MemStats)
  Detailed documentation of memory statistics
- [Memory Profiling](https://golang.org/doc/diagnostics#memory)
  Guide to memory profiling in Go

## Goroutine Analysis

Goroutine leaks and deadlocks can cause serious production issues. These tools help you track and debug goroutine behavior:

```go
// Goroutine statistics endpoint
// Provides detailed information about goroutine states
type GoroutineStats struct {
    Count     int      `json:"count"`      // Total goroutines
    Blocked   int      `json:"blocked"`    // Blocked goroutines
    Running   int      `json:"running"`    // Running goroutines
    Waiting   int      `json:"waiting"`    // Waiting goroutines
    Stacktrace []string `json:"stacktrace"` // All goroutine stacks
}

func debugGoroutines(w http.ResponseWriter, r *http.Request) {
    // Capture all goroutine stacks
    buf := make([]byte, 2<<20)
    n := runtime.Stack(buf, true)
    
    // Analyze goroutine states
    stats := GoroutineStats{
        Count:     runtime.NumGoroutine(),
        Stacktrace: strings.Split(string(buf[:n]), "\n"),
    }
    
    json.NewEncoder(w).Encode(stats)
}
```

Common goroutine issues to watch for:
- Steadily increasing goroutine count
- Large numbers of blocked goroutines
- Long-running goroutines
- Deadlocked goroutines
- Resource leaks in goroutines

For more information about goroutines:
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
  Best practices for goroutine management
- [Runtime Scheduler](https://golang.org/doc/go1.14#runtime)
  Understanding Go's goroutine scheduler
- [Deadlock Detection](https://golang.org/doc/articles/race_detector)
  Using Go's race detector

## Security Considerations

Debug endpoints can expose sensitive information. Always implement proper security measures:

```go
// Debug middleware with authentication
// Ensures only authorized access to debug endpoints
func debugAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify debug token from headers
        token := r.Header.Get("X-Debug-Token")
        if !validateDebugToken(token) {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// Rate limiting for debug endpoints
// Prevents abuse and resource exhaustion
func debugRateLimit(next http.Handler) http.Handler {
    // Allow 10 requests per second
    limiter := rate.NewLimiter(rate.Every(time.Second), 10)
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
```

## Best Practices

1. **Security**:
   - Always secure debug endpoints in production
   - Use strong authentication mechanisms
   - Implement rate limiting to prevent abuse
   - Monitor and audit debug endpoint access
   - Restrict debug information to authorized users

2. **Performance**:
   - Keep debug overhead minimal
   - Use sampling for high-volume data
   - Implement efficient data collection
   - Monitor impact on service performance
   - Cache debug data when appropriate

3. **Data Collection**:
   - Collect relevant debugging information
   - Structure debug output consistently
   - Include sufficient context for analysis
   - Remove sensitive data from debug output
   - Implement data retention policies

4. **Operations**:
   - Document all debug features thoroughly
   - Train operations team on debug tools
   - Establish debugging procedures
   - Monitor debug feature usage
   - Regular review of debug data

## Learn More

For more detailed information about debugging and profiling:

- [Clue Debug Package](https://pkg.go.dev/goa.design/clue/debug)
  Complete documentation of Clue's debugging capabilities

- [Go pprof Documentation](https://pkg.go.dev/runtime/pprof)
  Official documentation for Go's profiling tools

- [Profiling Go Programs](https://blog.golang.org/pprof)
  Comprehensive guide to profiling Go applications

- [Debugging Go Code](https://golang.org/doc/diagnostics)
  Official Go debugging documentation

- [Runtime Statistics](https://golang.org/pkg/runtime)
  Go runtime statistics and debugging interfaces 