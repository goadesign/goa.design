+++
date = "2016-04-07T11:01:06-05:00"
title = "Getting Started with goa"
weight = 2

[menu.main]
name = "はじめのガイド"
parent = "learn"
+++

This guide walks you through writing a complete service in goa. The simple service implements a
small subset of the [cellar](../cellar) example found in the [github
repository](https://github.com/goadesign/goa-cellar). The service deals with wine bottles, more
specifically it makes it possible to retrieve pre-existing wine bottle models through simple GET
requests.

# Prerequisite

Install `goa` and `goagen`:

```
go get -u github.com/goadesign/goa/...
```

# Design

The first thing to do when writing a goa service is to describe the API using the goa design
language. Create a new directory under `$GOPATH/src` for the new goa service, for example
`$GOPATH/src/cellar`. In that directory create a design sub directory and the file
`design/design.go` with the following content:

```go
package design                                     // The convention consists of naming the design
                                                   // package "design"
import (
        . "github.com/goadesign/goa/design"        // Use . imports to enable the DSL
        . "github.com/goadesign/goa/design/apidsl"
)

var _ = API("cellar", func() {                     // API defines the microservice endpoint and
        Title("The virtual wine cellar")           // other global properties. There should be one
        Description("A simple goa service")        // and exactly one API definition appearing in
        Scheme("http")                             // the design.
        Host("localhost:8080")
})

var _ = Resource("bottle", func() {                // Resources group related API endpoints
        BasePath("/bottles")                       // together. They map to REST resources for REST
        DefaultMedia(BottleMedia)                  // services.

        Action("show", func() {                    // Actions define a single API endpoint together
                Description("Get bottle by id")    // with its path, parameters (both path
                Routing(GET("/:bottleID"))         // parameters and querystring values) and payload
                Params(func() {                    // (shape of the request body).
                        Param("bottleID", Integer, "Bottle ID")
                })
                Response(OK)                       // Responses define the shape and status code
                Response(NotFound)                 // of HTTP responses.
        })
})

// BottleMedia defines the media type used to render bottles.
var BottleMedia = MediaType("application/vnd.goa.example.bottle+json", func() {
        Description("A bottle of wine")
        Attributes(func() {                         // Attributes define the media type shape.
                Attribute("id", Integer, "Unique bottle ID")
                Attribute("href", String, "API href for making requests on the bottle")
                Attribute("name", String, "Name of wine")
                Required("id", "href", "name")
        })
        View("default", func() {                    // View defines a rendering of the media type.
                Attribute("id")                     // Media types may have multiple views and must
                Attribute("href")                   // have a "default" view.
                Attribute("name")
        })
})
```

Let's break this down:

* We define a `design` package and use an anonymous variable to declare the API, we could have used
  a package init function as well. The actual name of the package could be anything, `design` is
  just a convention.

* The API function declares our API, which takes two arguments: the name of the API and an anonymous
  function that defines additional properties. In this cellar example, we use a title and a
  description.

* The Resource function then declares a `bottle` resource. The function also takes a name and an
  anonymous function. Properties defined in the anonymous function includes all the actions
  supported by the resource as well as a default media type used to render the resource in
  responses.

* Each resource action is declared using the `Action` function which follows the same pattern of
  name and anonymous function. Actions are defined in resources, they represent specific API
  endpoints complete with an HTTP method, a URL as well as parameter, payload and response
  definitions. The parameters may be defined using wildcards in the URL or may correspond to query
  strings appended to the URL. The payload describes the data structure of the request body if any.
  Here we define a single action (`show`) but resources may define an arbitrary number of them.

* The `Action` function defines the action endpoint, parameters, payload (not used here) and
  responses. goa defines default response templates for all standard HTTP status codes. A response
  template defines the response HTTP status code, its media type if any (which describes the
  response body shape) and headers it may define. The `ResponseTemplate` design language function
  (not used here) makes it possible to define additional response templates or override the existing
  ones.

* Finally, we define the resource media type as a global variable so we can refer to it when
  declaring the OK response. A media type has an identifier as defined by RFC 6838 and describes the
  attributes of the response body (the JSON object fields in goa).

The media type data structure is described using the `Attribute` design language function. This
function makes it possible to provide a recursive definition of the fields of the data structure. At
each level it defines the name and type of the fields as well as their validation rules (not used
here).

The [apidsl package reference](/reference/goa/design/apidsl/) lists all the goa design language
keywords together with a description and example usage.

# Implement

Now that we have a design for our API we can use the `goagen` tool to generate all the boilerplate
code. The tool takes the generation target and the import path to the Go design package as argument.
Here we are starting a new service so we are going to use the `bootstrap` target to generate a
complete implementation. If you created the design package under `$GOPATH/src/cellar`, the command
line is:

```bash
goagen bootstrap -d cellar/design
```

The tool outputs the names of the files it generates - by default it generates the files in the
current working directory. The list should look something like this:

```bash
app
app/contexts.go
app/controllers.go
app/hrefs.go
app/media_types.go
app/user_types.go
app/test
app/test/bottle.go
main.go
bottle.go
tool/cellar-cli
tool/cli
client
client
tool/cellar-cli/main.go
tool/cli/commands.go
client/client.go
client/bottle.go
client/datatypes.go
swagger
swagger/swagger.json
swagger/swagger.yaml
```

Note how `goagen` generated a `main.go` for our app as well as a skeleton controller (`bottle.go`). These
two files are meant to help bootstrap a new development, they won't be re-generated (by default) if
already present (re-run the tool again and note how it only generates the files under the `app`,
`client`, `tool` and `swagger` directories this time). This behavior and many other aspects are
configurable via command line arguments, see the goagen docs for details.

Back to the list of generated files:

* The `app` directory contains the generated code that glues the low level HTTP router to your code.
* The `client` directory contains the generated code that implements a client Go package.
* The `tool` directory contains a CLI tool that can be used to make requests to the cellar service.
* The `swagger` directory contains a swagger specification of the API both in JSON and YAML formats.

As discussed above the `main.go` and `bottle.go` files provide a starting point for implementing the
service entry point and the bottle controller respectively. Looking at the content of the `app`
package:

* `controllers.go` contains the controller interface type definitions. There is one such interface
  per resource defined in the design language. The file also contains the code that "mounts"
  implementations of these controller interfaces onto the service. The exact meaning of "mounting" a
  controller is discussed further below.

* `contexts.go` contains the context data structure definitions. Contexts play a similar role to
  Martini's `martini.Context`, goji's `web.C` or echo's `echo.Context` to take a few arbitrary
  examples: they are given as first argument to all controller actions and provide helper methods to
  access the request state and write the response.

* `hrefs.go` provide global functions for building resource hrefs. Resource hrefs make it possible
  for responses to link to related resources. goa knows how to build these hrefs by looking at the
  request path for the resource "canonical" action (by default the `show` action). See the
  [Action](http://goa.design/reference/goa/design/apidsl/#func-action-a-name-apidsl-action-a)
  design language function for additional information.

* `media_types.go` contains the media type data structures used by resource actions to build the
  responses. There is one such data structure generated per view defined in the design.

* `user_types.go` contains the data structures defined via the
  [Type](http://goa.design/reference/goa/design/apidsl/#func-type-a-name-apidsl-type-a)
  design language function. Such types may be used to define request payloads and response media
  types.

* `test/bottle.go` contains test helpers that make it convenient to test the controller code by
  making it possible to call the action implementations with controller input and validate the
  resulting media types.

Now that `goagen` did its work the only thing left for us to do is to provide an implementation of
the `bottle` controller. The type definition generated by `goagen` is:

```go
type BottleController interface {
        goa.Muxer
        Show(*ShowBottleContext) error
}
```

Simple enough... Let's take a look at the definition of `ShowBottleContext` in `app/contexts.go`:

```go
// ShowBottleContext provides the bottle show action context.
type ShowBottleContext struct {
        context.Context
        *goa.ResponseData
        *goa.RequestData
        BottleID int
}
```

The context data structure contains the id of the bottle declared as an int since that's the type
specified in the design language. It also contains anonymous fields which give access to the raw
underlying request and response states (including access to the http.Request and http.ResponseWriter
objects). The goa context data structure also implements the golang context.Context interface which
makes it possible to carry deadlines and cancelation signals for example across different goroutines
involved in handling the request.

The same file also defines two methods on the context data structure:

```go
// OK sends a HTTP response with status code 200.
func (ctx *ShowBottleContext) OK(r *GoaExampleBottle) error {
        ctx.ResponseData.Header().Set("Content-Type", "application/vnd.goa.example.bottle")
        return ctx.Service.Send(ctx.Context, 200, r)
}

// NotFound sends a HTTP response with status code 404.
func (ctx *ShowBottleContext) NotFound() error {
        ctx.ResponseData.WriteHeader(404)
        return nil
}
```

goagen also generated an empty implementation of the controller in `bottle.go` so all we have left
to do is provide an actual implementation. Open the file `bottle.go` and replace the existing `Show`
method with:

```go
// Show implements the "show" action of the "bottles" controller.
func (c *BottleController) Show(ctx *app.ShowBottleContext) error {
        if ctx.BottleID == 0 {
                // Emulate a missing record with ID 0
                return ctx.NotFound()
        }
        // Build the resource using the generated data structure
        bottle := app.GoaExampleBottle{
                ID:   ctx.BottleID,
                Name: fmt.Sprintf("Bottle #%d", ctx.BottleID),
                Href: app.BottleHref(ctx.BottleID),
        }

        // Let the generated code produce the HTTP response using the
        // media type described in the design (BottleMedia).
        return ctx.OK(&bottle)
}
```

Before we build and run the app, let's take a peek at main.go: the file contains a default
implementation of main that instantiates a new goa service, initializes default middleware, mounts
the bottle controller and runs the HTTP server.

```go
func main() {
        // Create service
        service := goa.New("cellar")

        // Mount middleware
        service.Use(middleware.RequestID())
        service.Use(middleware.LogRequest(true))
        service.Use(middleware.ErrorHandler(service, true))
        service.Use(middleware.Recover())

        // Mount "bottle" controller
        c := NewBottleController(service)
        app.MountBottleController(service, c)

        // Start service
        if err := service.ListenAndServe(":8080"); err != nil {
                service.LogError("startup", "err", err)
        }
}
```

Mounting a controller onto a service registers all the controller action endpoints with the router.
The code also makes sure that there is no conflict between routes of different actions.

Now compile and run the service:

```bash
go build -o cellar
./cellar
```

This should produce something like:

```bash
2016/04/10 16:20:37 [INFO] mount ctrl=Bottle action=Show route=GET /bottles/:bottleID
2016/04/10 16:20:37 [INFO] listen transport=http addr=:8080
```

You can now test the app using curl for example:

```bash
curl -i localhost:8080/bottles/1

HTTP/1.1 200 OK
Content-Type: application/vnd.goa.example.bottle
Date: Sun, 10 Apr 2016 23:21:19 GMT
Content-Length: 48

{"href":"/bottles/1","id":1,"name":"Bottle #1"}
```

```
curl -i localhost:8080/bottles/0

HTTP/1.1 404 Not Found
Date: Sun, 10 Apr 2016 23:22:05 GMT
Content-Length: 0
Content-Type: text/plain; charset=utf-8
```

You can exercise the validation code generated by goagen by passing an invalid (non-integer) id:

```bash
curl -i localhost:8080/bottles/n

HTTP/1.1 400 Bad Request
Content-Type: application/vnd.api.error+json
Date: Sun, 10 Apr 2016 23:22:46 GMT
Content-Length: 117

{"code":"invalid_request","status":400,"detail":"invalid value \"n\" for parameter \"bottleID\", must be a integer"}
```

Instead of using curl, let's use the generated CLI tool to make requests to the service. First let's
compile the CLI client:

```bash
cd tool/cellar-cli
go build -o cellar-cli
./cellar-cli
```

The command above prints the cli usage. The --help flag also provides contextual help:

```bash
./cellar-cli show bottle --help
```

The command above shows how to call the show bottle action:

```bash
./cellar-cli show bottle /bottles/1
2016/04/10 16:26:34 [INFO] started id=Vglid/lF GET=http://localhost:8080/bottles/1
2016/04/10 16:26:34 [INFO] completed id=Vglid/lF status=200 time=773.145µs
{"href":"/bottles/1","id":1,"name":"Bottle #1"}
```

That's it! congratulations on writing you first goa service!

This basic example only covers a fraction of what goa can do. Read on to learn more about how to
design microservices and how to take advantage of the goa package and sub-packages to implement it.

More examples can be found in [github](https://github.com/goadesign/examples).
