---
title: "Understanding Plugins"
linkTitle: "Plugins"
description: "A comprehensive guide to understanding, using, and creating Goa plugins for extending and customizing code generation"
weight: 1
---

Goa plugins extend and customize the functionality of your APIs. Whether you need to add
rate limiting, integrate monitoring tools, or generate code in different languages, 
plugins provide a flexible way to enhance Goa's capabilities. This guide will walk you 
through understanding and creating plugins, starting with the fundamentals and building up
to advanced usage.

## Plugin Basics

Before diving into the technical details, let's understand what plugins can do and how
they work with Goa. A plugin typically provides three main capabilities:

First, plugins add new design functions to Goa's DSL. These functions let users configure
additional features in their API designs. For example, a rate limiting plugin might add
functions like `RateLimit()` and `Burst()` that users can call to configure request
limits:

```go
var _ = Service("calculator", func() {
    // Configure rate limiting using the plugin's DSL functions
    RateLimit(100, func() {      // Allow 100 requests...
        Period("1m")             // ...per minute
        Burst(20)                // ...with bursts up to 20
    })
    
    Method("add", func() {
        // Regular Goa DSL continues here
        Payload(func() {
            Field(1, "a", Int)
            Field(2, "b", Int)
        })
        Result(Int)
    })
})
```

Second, plugins create custom expressions that store and validate this configuration.
These expressions integrate with Goa's internal representation of your API design,
ensuring that all settings are valid and consistent.

Third, plugins generate additional code based on their configuration. This might include
middleware, helper functions, or configuration files. For example, our rate limiting
plugin would generate middleware code that enforces the configured limits:

```go
// Generated rate limiting middleware
type calculatorRateMiddleware struct {
    limiter *rate.Limiter
    next    Service
}

func NewRateMiddleware() Middleware {
    // Create a rate limiter: 100 requests per minute, burst of 20
    limiter := rate.NewLimiter(rate.Every(time.Minute), 100)
    limiter.SetBurst(20)
    
    return func(next Service) Service {
        return &calculatorRateMiddleware{
            limiter: limiter,
            next:    next,
        }
    }
}
```

This generated code seamlessly integrates with Goa's standard output, requiring minimal
setup from users.

## Foundation: The Goa Design Language

To create effective plugins, you need to understand how Goa's design language works.
While it looks like regular Go code, Goa's DSL (Domain-Specific Language) provides a
structured way to define your services, methods, and their properties.

Here's a simple example of Goa's design language:

```go
var _ = Service("calculator", func() {
    Description("A basic calculator service")
    
    Method("add", func() {
        // Define the input parameters
        Payload(func() {
            Field(1, "a", Int, "First number to add")
            Field(2, "b", Int, "Second number to add")
        })
        // Define the output
        Result(Int, "The sum of a and b")
    })
})
```

This code defines a calculator service with an addition method. Each function like
`Service()`, `Method()`, and `Field()` is part of Goa's DSL. When Goa processes this
design, it creates an internal representation called an "expression tree":

```
Service("calculator")
    └── Method("add")
        ├── Payload
        │   ├── Field("a")
        │   └── Field("b")
        └── Result(Int)
```

## Creating New DSL Functions

When building a plugin, you'll need to create DSL functions that users can call in their
API designs. These functions often need to store and validate configuration, which is done
through custom expressions. Let's understand this process step by step.

### Understanding Expressions

An expression represents a piece of your API design in Goa. When users write DSL
functions, these functions create and configure expressions. Here's how it works:

```go
var _ = Service("calculator", func() {    // Creates a ServiceExpr
    Method("add", func() {                // Creates a MethodExpr
        Payload(func() {                  // Creates a PayloadExpr
            Field(1, "x", Int)            // Configures the payload
        })
    })
})
```

For your plugin, you'll define custom expressions to store configuration. For example, a
rate limiting plugin might define:

```go
// RateExpr stores rate limiting configuration for a service
type RateExpr struct {
    Service  *expr.ServiceExpr // The service this applies to
    Requests int               // Requests per period
    Period   string            // Time period (e.g., "1m")
    Burst    int               // Maximum burst size
}
```

### Expression Interfaces

Your expressions must implement certain interfaces to work with Goa's design processing.
The most basic requirement is the `Expression` interface, which provides identification:

```go
// Required for all expressions
type Expression interface {
    // EvalName returns a descriptive name for error messages
    EvalName() string    // e.g., "service calculator"
}
```

Depending on your needs, you can implement additional interfaces:

```go
// Optional - implement if your expression has child DSL functions
type Source interface {
    DSL() func()        // Returns the DSL function to execute
}

// Optional - implement if you need to prepare data before validation
type Preparer interface {
    Prepare()           // Called in the preparation phase
}

// Optional - implement if your expression needs validation
type Validator interface {
    Validate() error    // Called in the validation phase
}

// Optional - implement if you need post-validation processing
type Finalizer interface {
    Finalize()          // Called in the finalization phase
}
```

Here's a complete example showing how these interfaces work together in our rate limiting
plugin:

```go
// RateExpr represents rate limiting configuration
type RateExpr struct {
    Service  *expr.ServiceExpr
    Requests int
    Period   string
    Burst    int
    
    // Internal state
    prepared bool
    dsl      func()
}

// Required: Implement Expression interface
func (r *RateExpr) EvalName() string {
    return fmt.Sprintf("rate limit for service %q", r.Service.Name)
}

// Optional: Implement Source if your expression has child DSL
func (r *RateExpr) DSL() func() {
    return r.dsl  // Returns the DSL function to configure this expression
}

// Optional: Implement Preparer for setup
func (r *RateExpr) Prepare() {
    if !r.prepared {
        // Set sensible defaults
        if r.Period == "" {
            r.Period = "1m"
        }
        if r.Burst == 0 {
            r.Burst = r.Requests
        }
        r.prepared = true
    }
}

// Optional: Implement Validator for validation
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)

    if r.Requests <= 0 {
        errors.Add(r, "requests must be positive, got %d", r.Requests)
    }

    if _, err := time.ParseDuration(r.Period); err != nil {
        errors.Add(r, "invalid period %q: %s", r.Period, err)
    }

    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// Optional: Implement Finalizer for post-processing
func (r *RateExpr) Finalize() {
    // Perform any final processing after validation
}
```

### Creating DSL Functions

With your expressions defined, you can create DSL functions that users will call in their
designs. These functions create and configure your expressions:

```go
// RateLimit is a DSL function that creates and configures a RateExpr
func RateLimit(requests int, fn func()) {
    if current := eval.Current(); current != nil {
        if svc, ok := current.(*expr.ServiceExpr); ok {
            // Create our expression
            rate := &RateExpr{
                Service:  svc,
                Requests: requests,
                dsl:     fn,
            }
            // Execute the DSL function to configure it
            if eval.Execute(fn, rate) {
                // Store it in the service's metadata
                svc.Meta = append(svc.Meta, rate)
            }
        }
    }
}
```

This pattern provides several benefits:
1. Type-safe configuration storage
2. Validation during design processing
3. Clear error messages when something goes wrong
4. Integration with Goa's expression tree

## The Eval Package: Goa's Plugin Engine

Now that we understand expressions and DSL functions, let's explore how Goa processes
them. The `eval` package is the engine that powers Goa's plugin system, processing
designs in four phases:

1. **Initial Execution**: First, it runs all the DSL functions you've written, building up
   the expression tree that represents your API design.

2. **Preparation**: Next, it prepares the expressions, handling tasks like resolving
   inheritance between types and flattening nested structures.

3. **Validation**: Then, it validates all expressions to ensure they follow the rules of
   the DSL and make logical sense.

4. **Finalization**: Finally, it performs any necessary cleanup, such as setting default
   values or resolving references between different parts of your design.

Let's see this in action with our rate limiter plugin:

```go
// In your design file:
var _ = Service("api", func() {
    RateLimit(100, func() {     // Creates a RateExpr
        Period("1m")            // Configures the period
        Burst(20)               // Sets burst size
    })
})

// Behind the scenes, here's what happens:

// 1. Initial Execution
// - Creates a RateExpr with requests=100
// - Executes the DSL function, setting period="1m" and burst=20
// - Links the RateExpr to the ServiceExpr

// 2. Preparation
func (r *RateExpr) Prepare() {
    if !r.prepared {
        // Set default period if not specified
        if r.Period == "" {
            r.Period = "1m"
        }
        // Set default burst if not specified
        if r.Burst == 0 {
            r.Burst = r.Requests
        }
        r.prepared = true
    }
}

// 3. Validation
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)
    
    // Validate requests
    if r.Requests <= 0 {
        errors.Add(r, "requests must be positive, got %d", r.Requests)
    }
    
    // Validate period format
    if _, err := time.ParseDuration(r.Period); err != nil {
        errors.Add(r, "invalid period %q: %s", r.Period, err)
    }
    
    // Validate burst size
    if r.Burst < 0 {
        errors.Add(r, "burst must be non-negative, got %d", r.Burst)
    }
    
    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// 4. Finalization
func (r *RateExpr) Finalize() {
    // Convert period to normalized form
    if duration, err := time.ParseDuration(r.Period); err == nil {
        r.normalizedPeriod = duration
    }
    
    // Ensure burst doesn't exceed requests
    if r.Burst > r.Requests {
        r.Burst = r.Requests
    }
}
```

This example shows how the eval package orchestrates the design processing:
1. During **Initial Execution**, it processes the DSL functions in order:
   - First `RateLimit(100)` creates the base expression
   - Then `Period("1m")` and `Burst(20)` configure it
   - The expression is attached to its parent service

2. In the **Preparation** phase, it sets up defaults:
   - Sets default period to "1m" if not specified
   - Sets default burst to match requests if not specified
   - Marks the expression as prepared to avoid duplicate work

3. During **Validation**, it checks all the rules:
   - Ensures requests is positive
   - Validates period format
   - Checks burst is non-negative
   - Collects all errors before reporting them

4. Finally, in **Finalization**, it:
   - Normalizes the period to a duration
   - Adjusts burst to not exceed requests
   - Resolves any cross-references

This process ensures that by the time code generation begins:
- All expressions are fully configured
- All values are validated
- All cross-references are resolved
- All defaults are set appropriately

### Essential Eval Package Functions

To work with this system effectively, you'll use several essential functions from the
`eval` package. Let's explore each one in detail:

#### 1. Current() Expression

The `Current()` function returns the expression that's currently being processed in the
DSL execution. This is crucial for context-aware DSL functions:

```go
// Get the expression currently being processed
func Current() Expression

// Example usage in a DSL function:
func RateLimit(requests int) {
    // Get the current expression (should be a Service)
    if current := eval.Current(); current != nil {
        // Check if we're in the right context
        if svc, ok := current.(*expr.ServiceExpr); ok {
            // We're inside a Service definition
            // ... configure rate limiting for this service
        } else {
            // Wrong context - RateLimit must be used within a Service
            eval.ReportError("RateLimit must be used within a Service")
        }
    }
}
```

This function is particularly useful when:
- Validating the context where your DSL function is used
- Accessing the parent expression that contains your configuration
- Mutating the parent expression (e.g. to attach sub-expressions)

#### 2. Execute(fn func(), def Expression) bool

The `Execute` function runs a DSL function in the context of a specific expression. It
handles the setup and cleanup of the execution context:

```go
// Execute a DSL function in the context of an expression
// Returns true if execution was successful
func Execute(fn func(), def Expression) bool

// Example usage:
func RateLimit(requests int, fn func()) {
    if current := eval.Current(); current != nil {
        if svc, ok := current.(*expr.ServiceExpr); ok {
            // Create our configuration expression
            rate := &RateExpr{
                Service:  svc,
                Requests: requests,
            }
            
            // Execute the DSL function with our expression as context
            if eval.Execute(fn, rate) {
                // DSL executed successfully, store the configuration
                svc.Meta = append(svc.Meta, rate)
            }
            // Note: if Execute returns false, an error was already reported
        }
    }
}

// Used like this:
var _ = Service("api", func() {
    RateLimit(100, func() {
        Period("1m")
        Burst(20)
    })
})
```

Key points about `Execute`:
- It temporarily sets the provided expression as the current expression
- It runs the DSL function in this context
- It restores the previous context when done
- It returns false if any errors occurred during execution

#### 3. Error Reporting Functions

The `eval` package provides several functions for reporting errors during DSL execution:

##### ReportError(fm string, vals ...any)

`ReportError` is used to report errors during DSL execution. It formats the error message
using the provided format string and values and automatically wraps it with the current
expression context:

```go
// Report an error during DSL execution
func ReportError(fm string, vals ...any)
```

Example usage:

```go
func Period(duration string) {
    if rate, ok := eval.Current().(*RateExpr); ok {
        if _, err := time.ParseDuration(duration); err != nil {
            eval.ReportError(
                "invalid duration %q: must be a valid duration (e.g., '1m', '1h')",
                duration)
        }
        rate.Period = duration
    }
}
```

When used in a design like this:

```go
var _ = Service("orders", func() {
    RateLimit(100, func() {
        Period("2x")  // Invalid duration
    })
})

// The error output will be:
// /path/to/design/design.go:42: rate limit for service "orders": invalid duration "2x": must be a valid duration (e.g., '1m', '1h')
//
// The error message includes:
// - The file and line number where the error occurred
// - The expression context ("rate limit for service 'orders'")
// - The specific error message
// - Helpful guidance for fixing the issue
```

##### IncompatibleDSL()

`IncompatibleDSL` reports that a DSL function was used in the wrong context. This is a
convenience function for a common error case:

```go
// IncompatibleDSL should be called by DSL functions when they are invoked in an
// incorrect context (e.g. "Params" in "Service").
func IncompatibleDSL() {
    ReportError("invalid use of %s", caller())
}
```

Here's how to use it in your DSL functions:

```go
func Burst(n int) {
    if rate, ok := eval.Current().(*RateExpr); ok {
        rate.Burst = n
    } else {
        // Burst() was called outside of a RateLimit block
        eval.IncompatibleDSL()
    }
}
```

When used in an invalid context, like this:

```go
var _ = Service("orders", func() {
    Burst(20)  // Error: called outside RateLimit
})
```

It produces an error message like:

```
/path/to/design/design.go:42: invalid use of Burst
```

The error indicates:
- The file and line where the DSL function was incorrectly used
- The name of the function that was used in the wrong context

This is particularly useful when:
- A DSL function must be used within a specific parent (e.g., `Burst` within `RateLimit`)
- The current expression is not of the expected type
- A function requires specific context that isn't present

#### 4. Register(r Root) error

`Register` adds a new root expression to the DSL. Root expressions are the entry points
for your DSL and control the execution order:

```go
// Register a new root expression
func Register(r Root) error

// Example of a root expression:
type RateLimitRoot struct {
    *expr.RootExpr
    // Additional fields specific to your plugin
}

// Implement the Root interface
func (r *RateLimitRoot) WalkSets(w eval.SetWalker) {
    // Define the order of expression evaluation
    w.Walk(r.Services)
}

func (r *RateLimitRoot) DependsOn() []eval.Root {
    // Specify dependencies on other plugins
    return []eval.Root{
        &security.Root{},
    }
}

func (r *RateLimitRoot) Packages() []string {
    // Return import paths needed by generated code
    return []string{
        "golang.org/x/time/rate",
    }
}

// Register the root in your plugin's init function
func init() {
    root := &RateLimitRoot{
        RootExpr: &expr.RootExpr{},
    }
    if err := eval.Register(root); err != nil {
        panic(err) // or handle error appropriately
    }
}
```

Important aspects of root expressions:
- They control the order of DSL execution through `WalkSets`
- They declare dependencies on other plugins
- They specify required packages for generated code
- They're typically registered during package initialization

These functions work together to provide a robust framework for DSL execution:
1. `Register` sets up your plugin's root expression
2. `Current` and `Execute` manage the execution context
3. `ReportError` and `IncompatibleDSL` handle error cases
4. The root expression controls the overall execution flow

## Creating Your First Plugin

Let's put our knowledge into practice by creating a rate limiting plugin. We'll build it
step by step, explaining each component and its role in the plugin system.

### Setting Up the Project

First, create a new directory for your plugin with this structure:

```
ratelimit/
├── dsl/
│   ├── dsl.go      # Your DSL functions (RateLimit, Period, etc.)
│   └── types.go    # Expression types for storing configuration
├── generate.go     # Code generation logic
├── plugin.go       # Plugin registration
└── templates/      # Code templates for generation
    └── middleware.go.tmpl
```

This structure separates concerns:
- The `dsl` package contains the functions users will call in their designs
- Expression types store and validate the configuration
- Code generation logic produces the actual middleware
- Templates define how the generated code will look

### Step 1: Creating the DSL

Let's start with the DSL functions in `dsl/dsl.go`. These are the functions that users
will call in their API designs:

```go
package dsl

import (
    "goa.design/goa/v3/eval"
    "goa.design/goa/v3/expr"
)

// RateLimit defines rate limiting configuration for a service.
// Example:
//
//    var _ = Service("calculator", func() {
//        RateLimit(100, func() {  // 100 requests...
//            Period("1m")         // ...per minute
//            Burst(20)           // ...with bursts up to 20
//        })
//    })
func RateLimit(requests int, fn func()) {
    // Get the current expression being processed
    if current := eval.Current(); current != nil {
        // Check if we're in a Service context
        if svc, ok := current.(*expr.ServiceExpr); ok {
            // Create our rate limit configuration
            rate := &RateExpr{
                Service:  svc,
                Requests: requests,
            }
            // Execute the DSL function to configure the rate limit
            if eval.Execute(fn, rate) {
                // Store our configuration in the service's metadata
                svc.Meta = append(svc.Meta, rate)
            }
        } else {
            eval.ReportError("RateLimit must be used within a Service")
        }
    }
}

// Period sets the time window for the rate limit.
// Valid time units are "s", "m", "h" (seconds, minutes, hours).
func Period(duration string) {
    // Get the current expression (should be our RateExpr)
    if rate, ok := eval.Current().(*RateExpr); ok {
        rate.Period = duration
    } else {
        eval.IncompatibleDSL()
    }
}

// Burst sets the maximum number of requests allowed to exceed the rate limit.
func Burst(n int) {
    if rate, ok := eval.Current().(*RateExpr); ok {
        rate.Burst = n
    } else {
        eval.IncompatibleDSL()
    }
}
```

### Step 2: Defining Expression Types

Next, in `dsl/types.go`, we define the types that store our configuration:

```go
package dsl

import (
    "time"
    "goa.design/goa/v3/eval"
    "goa.design/goa/v3/expr"
)

// RateExpr stores rate limiting configuration for a service.
type RateExpr struct {
    // The service this rate limit applies to
    Service *expr.ServiceExpr
    // Number of allowed requests
    Requests int
    // Time period (e.g., "1m", "1h")
    Period string
    // Maximum burst size
    Burst int
}

// EvalName returns a descriptive name for error messages
func (r *RateExpr) EvalName() string {
    return "Rate limit for " + r.Service.Name
}

// Validate ensures the configuration is valid
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)
    
    // Requests must be positive
    if r.Requests <= 0 {
        errors.Add(r, "requests must be positive, got %d", r.Requests)
    }
    
    // Period must be a valid duration
    if _, err := time.ParseDuration(r.Period); err != nil {
        errors.Add(r, "invalid period format %q, use 's', 'm', or 'h'", r.Period)
    }
    
    // Burst must be non-negative
    if r.Burst < 0 {
        errors.Add(r, "burst must be non-negative, got %d", r.Burst)
    }
    
    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}
```

### Step 3: Implementing Code Generation

The code generation function in `generate.go` creates the actual middleware. When you run `goa gen`, Goa calls each plugin's `Generate` function to produce the necessary code files. Here's how it works:

```go
// Generate is called by Goa during code generation. It receives:
// - genpkg: The package path where generated code will be placed
// - roots: Array of root expressions containing the complete API design
// It must return ALL files that should exist after generation, including unmodified ones.
// Files not returned will be removed, allowing plugins to delete files from previous generations.
func Generate(genpkg string, roots []eval.Root) ([]*codegen.File, error) {
    var files []*codegen.File
    
    for _, root := range roots {
        if r, ok := root.(*expr.RootExpr); ok {
            // Generate middleware for each service with rate limiting
            for _, svc := range r.Services {
                if rate := findRateLimit(svc); rate != nil {
                    f := generateMiddleware(genpkg, svc, rate)
                    files = append(files, f)
                }
            }
        }
    }
    
    return files, nil
}

// generateMiddleware creates the rate limiting middleware file
func generateMiddleware(genpkg string, svc *expr.ServiceExpr, rate *RateExpr) *codegen.File {
    // Define where the generated file will go
    path := filepath.Join(codegen.Gendir, "ratelimit", 
        codegen.SnakeCase(svc.Name)+".go")
    
    // Prepare data for the template
    data := map[string]interface{}{
        "Service": svc,
        "Rate":    rate,
        "Package": genpkg,
    }
    
    // Create a section from our template
    section := &codegen.SectionTemplate{
        Name:    "ratelimit",
        Source: middlewareT,
        Data:    data,
        FuncMap: template.FuncMap{
            "goifyName": codegen.Goify,
        },
    }
    
    return &codegen.File{
        Path:             path,
        SectionTemplates: []*codegen.SectionTemplate{section},
    }
}
```

The code generation process follows these steps:

1. When you run `goa gen`, Goa processes all registered plugins in sequence
2. For each plugin, Goa calls its `Generate` function with:
   - The target package path (`genpkg`)
   - The complete API design (`roots`)
3. Your plugin's `Generate` function:
   - Examines the design to find services using your plugin
   - Creates appropriate code files using templates
   - Must return ALL files that should exist, even unmodified ones
   - Can remove files by not including them in the return value
4. Goa manages the files:
   - Creates or updates files returned by `Generate`
   - Removes any previously generated files that weren't returned
   - Places all files in your project's `gen` directory:
   ```
   gen/
   ├── calculator/   # Main service code
   ├── http/        # HTTP transport
   ├── cors/        # CORS plugin code
   └── ratelimit/   # Rate limiting code
   ```

This process ensures that your plugin's code generation integrates seamlessly with Goa's standard output and provides complete control over file lifecycle, including the ability to remove files when they're no longer needed.

### Step 4: Creating the Template

The template in `templates/middleware.go.tmpl` defines how the generated code will look:

```go
{{ define "ratelimit" }}
// Code generated by goa v3 ratelimit plugin; DO NOT EDIT.
package {{ .Package }}

import (
    "context"
    "time"
    "golang.org/x/time/rate"
)

// {{ goifyName .Service.Name "middleware" }} implements rate limiting for the 
// {{ .Service.Name }} service.
type {{ goifyName .Service.Name "middleware" }} struct {
    limiter *rate.Limiter
    next    Service
}

// New{{ goifyName .Service.Name "middleware" }} creates a new rate limiting middleware.
func New{{ goifyName .Service.Name "middleware" }}() Middleware {
    limiter := rate.NewLimiter(
        rate.Every({{ .Rate.Period }}),
        {{ .Rate.Requests }},
    )
    limiter.SetBurst({{ .Rate.Burst }})
    
    return func(next Service) Service {
        return &{{ goifyName .Service.Name "middleware" }}{
            limiter: limiter,
            next:    next,
        }
    }
}

// Handle implements the middleware interface.
func (m *{{ goifyName .Service.Name "middleware" }}) Handle(ctx context.Context, next func(context.Context) error) error {
    if err := m.limiter.Wait(ctx); err != nil {
        return err
    }
    return next(ctx)
}
{{ end }}
```

### Step 5: Registering the Plugin

Finally, register the plugin with Goa. There are three registration functions available, each affecting when your plugin runs relative to other plugins:

```go
package ratelimit

import "goa.design/goa/v3/codegen"

// Option 1: Standard Registration (middle)
func init() {
    // Registers the plugin to run in the middle, sorted alphabetically by name
    codegen.RegisterPlugin("ratelimit", "gen", nil, Generate)
}

// Option 2: First Registration
func init() {
    // Registers the plugin to run before other non-first plugins
    codegen.RegisterPluginFirst("ratelimit", "gen", nil, Generate)
}

// Option 3: Last Registration (recommended for most plugins)
func init() {
    // Registers the plugin to run after other non-last plugins
    codegen.RegisterPluginLast("ratelimit", "gen", nil, Generate)
}
```

The registration functions take these parameters:
- `name`: A unique identifier for your plugin
- `cmd`: The Goa command this plugin works with (usually "gen", can be "example")
- `pre`: An optional preparation function (can be nil)
- `p`: The main generation function

#### Plugin Execution Order

Goa maintains three ordered lists of plugins:
1. **First plugins**: Run before standard plugins (registered with `RegisterPluginFirst`)
2. **Standard plugins**: Run in the middle (registered with `RegisterPlugin`)
3. **Last plugins**: Run after standard plugins (registered with `RegisterPluginLast`)

Within each list, plugins are sorted alphabetically by name. For example:

```go
// These plugins run in this order:
codegen.RegisterPluginFirst("auth", "gen", nil, Generate)     // 1. auth (first)
codegen.RegisterPluginFirst("cache", "gen", nil, Generate)    // 2. cache (first)
codegen.RegisterPlugin("metrics", "gen", nil, Generate)       // 3. metrics (standard)
codegen.RegisterPlugin("tracing", "gen", nil, Generate)       // 4. tracing (standard)
codegen.RegisterPluginLast("cors", "gen", nil, Generate)      // 5. cors (last)
codegen.RegisterPluginLast("ratelimit", "gen", nil, Generate) // 6. ratelimit (last)
```

#### Choosing the Right Registration Function

Choose your registration function based on your plugin's dependencies and effects:

1. Use `RegisterPluginFirst` when your plugin:
   - Needs to modify the design before other plugins see it
   - Provides functionality that other plugins depend on
   - Must run before specific built-in generators

2. Use `RegisterPlugin` (standard) when your plugin:
   - Is independent of other plugins
   - Doesn't have specific ordering requirements
   - Works with the default Goa-generated code

3. Use `RegisterPluginLast` when your plugin:
   - Needs to see the final state after other plugins
   - Modifies or wraps code generated by other plugins
   - Adds cross-cutting concerns like middleware

For our rate limiting plugin, we should use `RegisterPluginLast` because:
- It generates middleware that wraps service endpoints
- It should run after the main service code is generated
- It doesn't affect how other plugins generate their code

```go
package ratelimit

import "goa.design/goa/v3/codegen"

func init() {
    // Register as a last plugin since we're generating middleware
    codegen.RegisterPluginLast("ratelimit", "gen", nil, Generate)
}
```

This ensures our rate limiting middleware can properly wrap any other middleware or handlers generated by other plugins.

### Using Your Plugin

Now users can use your plugin in their designs:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "path/to/ratelimit/dsl"
)

var _ = Service("calculator", func() {
    RateLimit(100, func() {
        Period("1m")
        Burst(20)
    })
    
    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int)
            Field(2, "b", Int)
        })
        Result(Int)
    })
})
```

When they run `goa gen`, your plugin will:
1. Process the rate limit configuration
2. Validate the settings
3. Generate the middleware code
4. Place it in the correct location in their project

## Advanced Plugin Topics

Now that you understand the basics of creating plugins, let's explore some advanced
techniques that will help you build more sophisticated plugins.

### Working with Expression Trees

When developing plugins, you often need to navigate and analyze the expression tree that
Goa builds from the design. Here's how to effectively work with expressions:

```go
// Find methods that need validation in a service
func findMethodsToValidate(svc *expr.ServiceExpr) []*expr.MethodExpr {
    var methods []*expr.MethodExpr
    
    for _, method := range svc.Methods {
        // Check if the method has a payload that needs validation
        if method.Payload != nil && needsValidation(method.Payload) {
            methods = append(methods, method)
        }
        
        // Check if the result needs validation
        if method.Result != nil && needsValidation(method.Result) {
            methods = append(methods, method)
        }
    }
    
    return methods
}

// Check if an attribute needs validation
func needsValidation(attr *expr.AttributeExpr) bool {
    // Check for validation rules in metadata
    if meta := attr.Meta; meta != nil {
        if _, ok := meta["validate"]; ok {
            return true
        }
    }
    
    // For objects, check each field
    if obj, ok := attr.Type.(*expr.Object); ok {
        for _, field := range *obj {
            if needsValidation(field.Attribute) {
                return true
            }
        }
    }
    
    return false
}
```

### Context-Aware DSL Functions

Your DSL functions should be aware of their context and behave appropriately. Here's how
to create context-sensitive functions:

```go
// MaxItems can be used in different contexts
func MaxItems(n int) {
    switch current := eval.Current().(type) {
    case *ArrayExpr:
        // Used directly on an array type
        current.MaxItems = n
        
    case *ValidationExpr:
        // Used within a validation block
        if arr, ok := current.Target.Type.(*expr.Array); ok {
            current.MaxItems = &n
        } else {
            eval.ReportError("MaxItems can only be used with array types")
        }
        
    default:
        eval.IncompatibleDSL()
    }
}

// Example usage:
var _ = Service("storage", func() {
    Method("list", func() {
        // Direct usage on an array
        Payload(ArrayOf(String, func() {
            MaxItems(100)  // Limit array size
        }))
        
        // Usage in validation
        Validate(func() {
            MaxItems(50)   // Different context, same function
        })
    })
})
```

### Plugin Dependencies

Sometimes your plugin might depend on other plugins. Here's how to handle dependencies:

```go
// Root expression for a validation plugin
type ValidationRoot struct {
    *RootExpr
}

// DependsOn indicates this plugin needs the security plugin
func (r *ValidationRoot) DependsOn() []eval.Root {
    return []eval.Root{
        // This plugin requires the security plugin
        &security.Root{},
    }
}

// Packages returns the import paths needed by this plugin
func (r *ValidationRoot) Packages() []string {
    return []string{
        "goa.design/plugins/v3/security",
        "goa.design/plugins/v3/validation",
    }
}
```

### Advanced Error Handling

Error handling in plugins should be informative and helpful. Here's how to
create detailed error messages:

```go
func (v *ValidationExpr) Validate() error {
    errors := new(eval.ValidationErrors)
    
    // Group related validations
    if err := v.validateBasicRules(); err != nil {
        if verr, ok := err.(*eval.ValidationErrors); ok {
            errors.Merge(verr)
        }
    }
    
    // Add context to errors
    if v.Maximum != nil && v.Minimum != nil {
        if *v.Maximum < *v.Minimum {
            errors.Add(v, 
                "maximum (%d) cannot be less than minimum (%d)",
                *v.Maximum, *v.Minimum)
        }
    }
    
    // Validate nested expressions
    for _, rule := range v.Rules {
        if err := rule.Validate(); err != nil {
            if verr, ok := err.(*eval.ValidationErrors); ok {
                // Preserve error context when merging
                errors.Merge(verr)
            } else {
                errors.Add(v, "invalid rule: %s", err)
            }
        }
    }
    
    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// Helper for grouping related validations
func (v *ValidationExpr) validateBasicRules() error {
    errors := new(eval.ValidationErrors)
    
    // Check required fields
    if v.Pattern != "" {
        if _, err := regexp.Compile(v.Pattern); err != nil {
            errors.Add(v, "invalid pattern %q: %s", v.Pattern, err)
        }
    }
    
    return errors
}
```

### Advanced Code Generation

For complex plugins, you might need to generate multiple files or handle
different transport layers:

```go
func Generate(genpkg string, roots []eval.Root) ([]*codegen.File, error) {
    var files []*codegen.File
    
    for _, root := range roots {
        if r, ok := root.(*expr.RootExpr); ok {
            // Generate service-specific files
            for _, svc := range r.Services {
                // Generate main service file
                if f := generateService(genpkg, svc); f != nil {
                    files = append(files, f)
                }
                
                // Generate transport-specific code
                if f := generateHTTP(genpkg, svc); f != nil {
                    files = append(files, f)
                }
                if f := generateGRPC(genpkg, svc); f != nil {
                    files = append(files, f)
                }
                
                // Generate documentation
                if f := generateDocs(genpkg, svc); f != nil {
                    files = append(files, f)
                }
            }
        }
    }
    
    return files, nil
}

// Generate transport-specific code
func generateHTTP(genpkg string, svc *expr.ServiceExpr) *codegen.File {
    path := filepath.Join(codegen.Gendir, "http",
        codegen.SnakeCase(svc.Name)+".go")
    
    data := map[string]interface{}{
        "Service": svc,
        "Package": path.Base(genpkg),
    }
    
    sections := []*codegen.SectionTemplate{
        {
            Name:    "http-handler",
            Source: httpHandlerT,
            Data:    data,
            FuncMap: template.FuncMap{
                "routeName": func(m *expr.MethodExpr) string {
                    return codegen.Goify(m.Name, true) + "Handler"
                },
            },
        },
        {
            Name:    "http-client",
            Source:  httpClientT,
            Data:    data,
        },
    }
    
    return &codegen.File{
        Path:             path,
        SectionTemplates: sections,
    }
}
```

These advanced techniques will help you create more sophisticated plugins that can:
- Navigate and analyze complex designs
- Provide context-aware DSL functions
- Handle dependencies between plugins
- Generate comprehensive error messages
- Produce multiple output files for different purposes

## Best Practices for Plugin Development

Let's explore best practices that will help you create high-quality, maintainable plugins.
These guidelines are based on experience with real-world Goa plugins.

### Design Principles

When designing your plugin's interface, follow these principles:

1. **Keep It Simple**
   - Focus on solving one problem well
   - Make the most common use case the easiest to implement
   - Provide sensible defaults for optional settings

2. **Be Consistent with Goa**
   - Follow Goa's DSL style and naming conventions
   - Use similar patterns to Goa's built-in functions
   - Maintain consistency in error messages and documentation

Example of a well-designed DSL:

```go
var _ = Service("orders", func() {
    // Simple, common case
    RateLimit(100)
    
    // More complex case with options
    RateLimit(100, func() {
        Period("1m")
        Burst(20)
    })
})
```

### Code Organization

Structure your plugin code for clarity and maintainability:

```
plugin-name/
├── dsl/
│   ├── dsl.go       # Public DSL functions
│   ├── types.go     # Expression types
│   └── internal.go  # Internal helpers
├── generate/
│   ├── generate.go  # Main generation logic
│   └── helpers.go   # Generation helpers
├── templates/       # Code templates
│   ├── client.go.tmpl
│   └── server.go.tmpl
├── example/         # Example usage
│   └── design/
│       └── design.go
└── README.md       # Clear documentation
```

### Error Handling

Implement comprehensive error handling to help users fix issues quickly. Goa
provides a specialized `ValidationErrors` type for collecting and managing
validation errors:

```go
// ValidationErrors collects multiple validation errors along with their contexts
type ValidationErrors struct {
    Errors      []error      // The actual errors
    Expressions []Expression // The expressions where errors occurred
}

// Example of using ValidationErrors in a validate function
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)
    
    // Add individual errors with context
    if r.Requests <= 0 {
        errors.Add(r, "requests must be positive, got %d", r.Requests)
    }
    
    // Validate nested configuration
    if err := r.validatePeriod(); err != nil {
        if verr, ok := err.(*eval.ValidationErrors); ok {
            // Merge errors from nested validation
            errors.Merge(verr)
        } else {
            // Add single error with context
            errors.AddError(r, err)
        }
    }
    
    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// Helper function showing nested validation
func (r *RateExpr) validatePeriod() error {
    errors := new(eval.ValidationErrors)
    
    if r.Period != "" {
        if _, err := time.ParseDuration(r.Period); err != nil {
            // Add formats error with proper context
            errors.Add(r, 
                "invalid period %q: must be a valid duration (e.g., '1m', '1h')",
                r.Period)
        }
    }
    
    return errors
}
```

The `ValidationErrors` type provides several key features:
1. **Error Collection**: Accumulates multiple errors during validation:
   ```go
   errors := new(eval.ValidationErrors)
   errors.Add(expr, "first error: %v", val1)
   errors.Add(expr, "second error: %v", val2)
   ```

2. **Context Preservation**: Each error is associated with its expression:
   ```go
   // The error message includes the expression name:
   // "rate limit for service 'api': requests must be positive, got -1"
   errors.Add(rateExpr, "requests must be positive, got %d", requests)
   ```

3. **Error Merging**: Combine errors from nested validations:
   ```go
   func (v *ValidationExpr) Validate() error {
       errors := new(eval.ValidationErrors)
       
       // Validate basic configuration
       if err := v.validateBasic(); err != nil {
           if verr, ok := err.(*eval.ValidationErrors); ok {
               errors.Merge(verr)  // Merge nested validation errors
           }
       }
       
       // Validate each rule
       for _, rule := range v.Rules {
           if err := rule.Validate(); err != nil {
               if verr, ok := err.(*eval.ValidationErrors); ok {
                   errors.Merge(verr)  // Merge errors from each rule
               } else {
                   errors.AddError(v, err)  // Add single error
               }
           }
       }
       
       return errors
   }
   ```

4. **Flattened Error Messages**: The `Error()` method produces clear, structured output:
   ```go
   // Output format:
   // rate limit for service 'api': requests must be positive, got -1
   // rate limit for service 'api': invalid period "2x", use "s", "m", or "h"
   ```

Best practices for using `ValidationErrors`:

1. **Create Early**: Create the errors container at the start of validation
   ```go
   func (e *Expr) Validate() error {
       errors := new(eval.ValidationErrors)
       // ... validation logic ...
   }
   ```

2. **Add Context**: Always provide the expression when adding errors
   ```go
   errors.Add(e, "value %v is invalid", value)  // Good
   errors.AddError(e, fmt.Errorf("invalid"))    // Also good
   ```

3. **Handle Nested Validation**: Properly merge errors from sub-validations
   ```go
   if err := subExpr.Validate(); err != nil {
       if verr, ok := err.(*eval.ValidationErrors); ok {
           errors.Merge(verr)
       } else {
           errors.AddError(e, err)
       }
   }
   ```

4. **Return Early**: Return nil if no errors occurred
   ```go
   if len(errors.Errors) > 0 {
       return errors
   }
   return nil
   ```

This structured approach to error handling helps users understand and fix issues in their API designs by:
- Collecting all validation errors instead of stopping at the first one
- Providing clear context about where each error occurred
- Maintaining the relationship between errors and their expressions
- Producing well-formatted error messages

### Code Generation

Follow these practices when generating code:

1. **Use Templates Effectively**
   ```go
   // Break down complex templates into smaller, focused sections
   sections := []*codegen.SectionTemplate{
       {
           Name:   "types",
           Source: typesT,
           Data:   data,
       },
       {
           Name:   "encoders",
           Source: encodersT,
           Data:   data,
       },
   }
   ```

2. **Generate Clean Code**
   ```go
   // Add clear comments in templates
   {{ define "types" }}
   // {{ .TypeName }} implements the rate limiting configuration.
   // It is safe for concurrent use.
   type {{ .TypeName }} struct {
       limiter *rate.Limiter
       config  *Config
   }
   
   // Config stores the rate limiting parameters.
   type Config struct {
       Requests int           // Maximum requests per period
       Period   time.Duration // Time period for the limit
       Burst    int          // Maximum burst size
   }
   {{ end }}
   ```

3. **Include Documentation**
   ```go
   // In templates, generate package documentation
   {{ define "header" }}
   // Package {{ .Package }} provides rate limiting functionality.
   //
   // It implements a token bucket algorithm to control request rates.
   // Usage:
   //     limiter := New(100, time.Minute)  // 100 requests per minute
   //     if err := limiter.Wait(ctx); err != nil {
   //         return err
   //     }
   package {{ .Package }}
   {{ end }}
   ```

### Testing

Implement comprehensive tests for your plugin:

```go
func TestRateLimitDSL(t *testing.T) {
    cases := []struct {
        name     string
        design   func()
        wantErr  bool
        errMsg   string
    }{
        {
            name: "basic rate limit",
            design: func() {
                Service("test", func() {
                    RateLimit(100)
                })
            },
        },
        {
            name: "invalid rate limit",
            design: func() {
                Service("test", func() {
                    RateLimit(-1)
                })
            },
            wantErr: true,
            errMsg:  "requests must be positive",
        },
    }
    
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            // Reset the design
            eval.Reset()
            
            // Run the test
            err := eval.RunDSL(tc.design)
            
            // Check results
            if tc.wantErr {
                if err == nil {
                    t.Error("expected error, got nil")
                } else if !strings.Contains(err.Error(), tc.errMsg) {
                    t.Errorf("expected error containing %q, got %q",
                        tc.errMsg, err.Error())
                }
            } else if err != nil {
                t.Errorf("unexpected error: %v", err)
            }
        })
    }
}
```

### Documentation

Provide clear, comprehensive documentation:

1. **README.md**
   - Clear description of the plugin's purpose
   - Installation instructions
   - Basic usage examples
   - Configuration options
   - Common use cases

2. **Code Comments**
   ```go
   // RateLimit applies rate limiting to a service or method.
   // It allows specifying the maximum number of requests allowed per time period.
   //
   // Examples:
   //
   //    var _ = Service("api", func() {
   //        // Simple usage: 100 requests per minute
   //        RateLimit(100)
   //
   //        // Advanced usage: custom period and burst
   //        RateLimit(100, func() {
   //            Period("1m")
   //            Burst(20)
   //        })
   func RateLimit(requests int, fn ...func()) { ... }
   ```

3. **Examples**
   - Provide working examples in the `example` directory
   - Include common use cases and advanced scenarios
   - Add comments explaining key concepts


## Conclusion

Plugins are a powerful way to extend Goa's capabilities. By understanding the
plugin architecture and following best practices, you can create robust plugins
that enhance Goa's code generation to meet your specific needs.

For real-world examples and inspiration, check out the
[official plugins repository](https://github.com/goadesign/plugins).
