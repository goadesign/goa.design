+++
title = "Plugins"
weight = 1

[menu.main]
name = "Plugins"
parent = "extend"
+++

[Goa plugins](https://godoc.org/github.com/goadesign/plugins) make it possible
to create new DSLs and accompanying generators. They run before rendering the
final artifacts which makes it possible to alter the templates exposed by the
Goa code generators, thereby, producing new kinds of outputs from any DSL.

[Goa plugins repository](https://github.com/goadesign/plugins) houses a set of
public goa plugins. Refer to the README in every plugin for instructions on
how to use it.

## Building Your Own Plugin

Plugins can be used to do a few different things:

* A plugin may add its own DSL which is used alongside with the existing Goa
  DSL. The plugin DSL may produce completely different code or modify the
  existing code produced by Goa code generators.

* A plugin may provide a
  [GenerateFunc](https://godoc.org/goa.design/goa/v3/codegen#GenerateFunc) to
  modify the Goa generated files or to generate new files and return them to the
  final artifact generation.

```go
type GenerateFunc func(genpkg string, roots []eval.Root, files []*File) ([]*File, error)
```

* A plugin may provide a
  [PrepareFunc](https://godoc.org/goa.design/goa/v3/codegen#PrepareFunc), to modify
  the design prior to the code being generated.

```go
type PrepareFunc func(genpkg string, roots []eval.Root) error
```

Plugins register themselves using one of the
[RegisterPlugin](https://godoc.org/goa.design/goa/v3/codegen#RegisterPlugin),
[RegisterPluginFirst](https://godoc.org/goa.design/goa/v3/codegen#RegisterPluginFirst),
or
[RegisterPluginLast](https://godoc.org/goa.design/goa/v3/codegen#RegisterPlugin)
functions.

## CORS Plugin

One of the built-in plugins is the
[CORS plugin](https://github.com/goadesign/plugins/tree/v3/cors) which adds
the ability to define CORS properties on HTTP endpoints and uses the
corresponding expressions to generate code that implements CORS for the API.

The CORS plugin adds its own
[DSL](https://godoc.org/github.com/goadesign/plugins/cors/dsl)
which can be used in the design as shown below:

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
	Description("The calc service exposes public endpoints that defines CORS policy.")
	// Add CORS policy using the CORS DSLs
	cors.Origin("/.*localhost.*/", func() {
		cors.Headers("X-Shared-Secret")
		cors.Methods("GET", "POST")
		cors.Expose("X-Time", "X-Api-Version")
		cors.MaxAge(100)
		cors.Credentials()
	})

	Method("multiply", func() {
		Description("Multiply multiplies the two integer parameters and returns the results.")
		Payload(func() {
			Attribute("a", Int, func() {
				Description("Left operand")
			})
			Attribute("b", Int, func() {
				Description("Right operand")
			})
			Required("a", "b")
		})
		Result(Int)
		HTTP(func() {
			GET("/multiply/{a}/{b}")
			Response(StatusOK)
		})
	})
})
```

The design above sets up a CORS policy on all the endpoints defined in the
`calc` service.

The CORS plugin registers itself by calling the `RegisterPlugin` function in the
Goa `codegen` package and adds its own code
[generator](https://godoc.org/github.com/goadesign/plugins/cors#Generate) which
implements the `GenerateFunc` type.

```go
package cors

import (
	"goa.design/goa/v3/codegen"
	"goa.design/goa/v3/eval"
)

func init() {
	codegen.RegisterPlugin("cors", "gen", nil, Generate)
}

// Generate produces server code that handle preflight requests and updates
// the HTTP responses with the appropriate CORS headers.
func Generate(genpkg string, roots []eval.Root, files []*codegen.File) ([]*codegen.File, error) {
...
}
```
```go
// cors/dsl/cors.go

package dsl

// Register code generators for the CORS plugin
import _ "goa.design/plugins/v3/cors"
```

This generator modifies the generated HTTP server code to handle preflight
requests by mounting the `CORS` endpoint.

The Goa code generation algorithms then invoke the function which modifies the
generated HTTP server package.
