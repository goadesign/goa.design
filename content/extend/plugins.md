+++
title = "Plugins"
weight = 1

[menu.main]
name = "Plugins"
parent = "extend"
+++

[goa plugins](https://godoc.org/github.com/goadesign/plugins) makes it possible to
create new DSLs and accompanying generators. They run before rendering
the final artifacts which makes it possible to alter the templates
exposed by the goa code generators, thereby, producing new kinds of outputs
from any DSL.

[goa plugins repository](https://github.com/goadesign/plugins) houses all the goa
plugins. Refer to the README in every plugin for instructions on how to use the
plugin.

## Build Your Own Plugin

The important steps to write your own plugin are:

* A plugin may adds its own DSLs which must be usable along with the existing
  goa DSLs. The plugin DSLs may produce completely different code or modify
  the existing code from goa code generators.
* A plugin code generator may implement the [GenerateFunc type](https://godoc.org/goa.design/goa/codegen#GenerateFunc)
  if it wants to modify the goa generated files or to generate new files and
  return them to the final artifact generation.
```go
type GenerateFunc func(genpkg string, roots []eval.Root, files []*File) ([]*File, error)
```

* A plugin may implement the [PrepareFunc type](https://godoc.org/goa.design/goa/codegen#PrepareFunc),
  which runs before the goa code generators, if it wants to modify the existing
  design roots (for e.g. add custom validations) or to prepare the plugin for
  execution.
```go
type PrepareFunc func(genpkg string, roots []eval.Root) error
```

* A plugin must register itself to the goa code generator using one of
  [RegisterPlugin](https://godoc.org/goa.design/goa/codegen#RegisterPlugin),
  [RegisterPluginFirst](https://godoc.org/goa.design/goa/codegen#RegisterPluginFirst),
  or [RegisterPluginLast](https://godoc.org/goa.design/goa/codegen#RegisterPlugin)
  functions.

Let us look at the [CORS plugin](https://github.com/goadesign/plugins/tree/master/cors)
to understand more about writing a custom plugin.

The CORS plugin adds its own [DSLs](https://godoc.org/github.com/goadesign/plugins/cors/dsl)
which can be used in the design along with the other DSLs as shown below:

```go
package design

import (
	. "goa.design/goa/dsl"
	cors "goa.design/plugins/cors/dsl"
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

	Method("add", func() {
		Description("Add adds up the two integer parameters and returns the results.")
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
			GET("/add/{a}/{b}")
			Response(StatusOK)
		})
	})
})
```

The above design sets up a CORS policy on all the endpoints defined in the
`calc` service.

The CORS plugin registers itself to goa code generator by calling the
`RegisterPlugin` function in the goa `codegen` package and adds its own
[code generator](https://godoc.org/github.com/goadesign/plugins/cors#Generate)
which implements the `GenerateFunc` type.
```go
package cors

import (
	"goa.design/goa/codegen"
	"goa.design/goa/eval"
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
import _ "goa.design/plugins/cors"
```
This generator modifies the generated HTTP server code to handle preflight
requests by mounting the `CORS` endpoint.

Now when we run the [goa gen command](/v2/getting-started/#code-generation),
we will observe the following code generation changes in the HTTP server
package which we would normally not find if we didn't use the CORS DSLs in the
design.

```go
// gen/http/calc/server/server.go

package server

...

// Mount configures the mux to serve the calc endpoints.
func Mount(mux goahttp.Muxer, h *Server) {
	MountAddHandler(mux, h.Add)
	MountCORSHandler(mux, h.CORS)
}

...

// MountCORSHandler configures the mux to serve the CORS endpoints for the
// service calc.
func MountCORSHandler(mux goahttp.Muxer, h http.Handler) {
	h = handleCalcOrigin(h)
  ...
	mux.Handle("OPTIONS", "/add/{a}/{b}", f)
}

...

// handleCalcOrigin applies the CORS response headers corresponding to the
// origin for the service calc.
func handleCalcOrigin(h http.Handler) http.Handler {
  ...
}
```
