+++
date = "2016-01-30T11:01:06-05:00"
title = "Getting Started with goa"
+++

The best way to experience goa is to develop a service end-to-end, from design to implementation. So
let's write a simplistic service implementing a tiny subset of the [cellar](cellar.html) example that
can be found in the github repository. The code deals with wine bottles, more specifically it makes
it possible to retrieve pre-existing wine bottle models through simple GET requests.

The first thing to do when writing a goa service is to describe the API using the goa design
language. Create a new directory under `$GOPATH/src` for the new goa service, for example
`$GOPATH/src/cellar`. In that directory create a design sub directory and the file design/design.go
with the following content:  

```go
package design

import (
        . "github.com/goadesign/goa/design"
        . "github.com/goadesign/goa/design/apidsl"
)

var _ = API("cellar", func() {
        Title("The virtual wine cellar")
        Description("A basic example of an API implemented with goa")
        Scheme("http")
        Host("localhost:8080")
})

var _ = Resource("bottle", func() {
        BasePath("/bottles")
        DefaultMedia(BottleMedia)
        Action("show", func() {
                Description("Retrieve bottle with given id")
                Routing(GET("/:bottleID"))
                Params(func() {
                        Param("bottleID", Integer, "Bottle ID")
                })
                Response(OK)
                Response(NotFound)
        })
})

var BottleMedia = MediaType("application/vnd.goa.example.bottle+json", func() {
        Description("A bottle of wine")
        Attributes(func() {
                Attribute("id", Integer, "Unique bottle ID")
                Attribute("href", String, "API href for making requests on the bottle")
                Attribute("name", String, "Name of wine")
        })
        View("default", func() {
                Attribute("id")
                Attribute("href")
                Attribute("name")
        })
})
```

Let's break this down:

* We define a design package and use an anonymous variable to declare the API, however we could also have used a package init function. The actual name of the package could be anything, design is just a convention.

* The API function declares our API, which takes two arguments: the name of the API and an anonymous function that defines additional properties. In this cellar example, we use a title and a description.

* The Resource function then declares a "bottle" resource. The function also takes a name and an anonymous function. Properties defined in the anonymous function includes all the actions supported by the resource as well as a default media type used to render the resource in responses.

* Each resource action is declared using the Action function which follows the same pattern of name and anonymous function. Actions are defined in resources, they represent specific API endpoints complete with an HTTP method, a URL as well as parameter, payload and response definitions. The parameters may be defined using wildcards in the URL or may correspond to query strings appended to the URL. The payload describes the data structure of the request body if any. Here we define a single action (show) but resources may define an arbitrary number of them.

* The Action function defines the action endpoint, parameters, payload (not used here) and responses. goa defines default response templates for all standard HTTP status codes. A response template defines the response HTTP status code, its media type if any (which describes the response body data structure) and headers it may define. The ResponseTemplate APIdesign language function (not used here) makes it possible to define additional response templates or override the existing ones.

* Finally, we define the resource media type as a global variable so we can refer to it when declaring the OK response. A media type has an identifier as defined by RFC 6838 and describes the attributes of the response body (the JSON object fields in goa).

The media type data structure is described using the Attribute design language function. This
function makes it possible to provide a recursive definition of the fields of the data structure. At
each level it defines the name and type of the fields as well as their validation rules (not used
here).

The apidsl package GoDoc lists all the goa design language keywords together with a description and
example usage. Now that we have a design for our API we can use the goagen tool to generate all the
boilerplate code. The tool takes the path to the Go package as argument (the same path you'd use if
you were to import the design package in a Go source file). So for example if you created the design
package under `$GOPATH/src/cellar`, the command line would be:

```bash
$ goagen bootstrap -d cellar/design
```

The tool outputs the names of the files it generates - by default it generates the files in the current working directory. The list should look something like this:

```bash
app
app/contexts.go
app/controllers.go
app/hrefs.go
app/media_types.go
app/user_types.go
main.go
bottle.go
client
client/cellar-cli
client/cellar-cli/main.go
client/cellar-cli/commands.go
client/client.go
client/bottle.go
swagger
swagger/swagger.json
swagger/swagger.go
```

Note how goagen generated a main for our app as well as a skeleton controller (bottle.go). These two
files are meant to help bootstrap a new development, they won't be re-generated (by default) if
already present (re-run the tool again and note how it only generates the files under the "app",
"client" and "swagger" directories this time). This behavior and many other aspects are configurable
via command line arguments, see the goagen docs for details.

Back to the list of generated files:

* The app directory contains the generated code that glues the low level HTTP router to your code.
* The client directory contains the generated code that implements a client Go package as well as a CLI tool that can be used to make requests to the goa service.
* The swagger directory contains a swagger specification of the API together with the implementation of a controller that serves the file when requests are sent to `/swagger.json`.

As discussed above the main.go and bottle.go files provide a starting point for implementing the
service entry point and the bottle controller respectively. Looking at the content of the app
package:

* `controllers.go` contains the controller interface type definitions. There is one such interface per resource defined in the design language. The file also contains the code that "mount" implementations of these controller interfaces onto the service. The exact meaning of "mounting" a controller is discussed further below.
* `contexts.go` contains the context data structure definitions. Contexts play a similar role to Martini's martini.Context, goji's web.C or echo's echo.Context to take a few arbitrary examples: they are given as first argument to all controller actions and provide helper methods to access the request state or write the response.
* `hrefs.go` provide global functions for building resource hrefs. Resource hrefs make it possible for responses to link to related resources. goa knows how to build these hrefs by looking at the request path for the resource "canonical" action (by default the "show" action). See the Action design language function for additional information.
* `media_types.go` contains the media type data structures used by resource actions to build the responses. These data structures also expose methods that can be called to instantiate them from raw data or dump them back to raw data performing all the validations defined in the design language in both cases.
* `user_types.go` contains the data structures defined via the "Type" design language function. Such types may be used to define a request payload or response media types.

Now that goagen did its work the only thing left for us to do is to provide an implementation of the
bottle controller. The type definition generated by goagen is:

```go
type BottleController interface {
        goa.Controller
        Show(*ShowBottleContext) error
}
```

Simple enough... Let's take a look at the definition of `ShowBottleContext` in `app/contexts.go`:

```go
// ShowBottleContext provides the bottle show action context.
type ShowBottleContext struct {
        *goa.Context
        BottleID int
}
```

The context data structure contains the id of the bottle declared as an int since that's the type
specified in the design language. It also contains an anonymous field which gives access to the raw
underlying request and response states (including access to the http.Request and http.ResponseWriter
objects). The goa context data structure also implements the golang context.Context interface which
makes it possible to carry deadlines and cancelation signals for example across different goroutines
involved in handling the request.

The same file also defines two methods on the context data structure:

```go
// NotFound sends a HTTP response with status code 404.
func (c *ShowBottleContext) NotFound() error {
        return c.Respond(404, nil)
}

// OK sends a HTTP response with status code 200.
func (c *ShowBottleContext) OK(resp *BottleMedia) error {
        r, err := resp.Dump()
        if err != nil {
                return fmt.Errorf("invalid response: %s", err)
        }
        return c.JSON(200, r)
}
```

goagen also generated an empty implementation of the controller in bottle.go so all we have left to
do is provide an actual implementation. Open the file bottle.go and replace the existing Show method
with:

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
the bottle and swagger controllers and runs the HTTP server.

```go
func main() {
        // Create service
        service := goa.New("cellar")

        // Setup middleware
        service.Use(middleware.RequestID())
        service.Use(middleware.LogRequest())
        service.Use(middleware.Recover())

        // Mount "bottles" controller
        c := NewBottleController()
        app.MountBottleController(service, c)

        // Mount swagger spec provider controller
        swagger.MountController(service)

        // Run service, listen on port 8080
        service.ListenAndServe(":8080")
}
```

Mounting a controller onto a service registers all the controller action endpoints with the router.
The code also makes sure that there is no conflict between routes of different actions.

The goa router requires that all routes form a tree so that for example using a route /foo/:id and a
route /foo/:fooID/bar/:id in the same application is not permitted. Instead use /foo/:fooID for the
first route for example.

Now compile and run the service:

```bash
$ go build -o cellar
$ ./cellar
```

This should produce something like:

```bash
INFO[11-28|20:49:21] mount                           app=API ctrl=Bottle action=Show route="GET /bottles/:bottleID"
INFO[11-28|20:49:21] mount                           app=API ctrl=Swagger action=Show route="GET /swagger.json"
INFO[11-28|20:49:21] listen                          app=API addr=:8080
```

You can now test the app using curl for example:

```bash
$ curl -i localhost:8080/bottles/1
HTTP/1.1 200 OK
Date: Tue, 20 Oct 2015 01:03:51 GMT
Content-Length: 47
Content-Type: application/vnd.goa.example.bottle+json; charset=utf-8

{"href":"/bottles/1","id":1,"name":"Bottle #1"}

$ curl -i localhost:8080/bottles/0
HTTP/1.1 404 NotFound
Date: Mon, 27 Jul 2015 04:35:22 GMT
Content-Length: 0
Content-Type: text/plain; charset=utf-8
```

You can exercise the validation code generated by goagen by passing an invalid (non-integer) id:

```bash
$ curl -i localhost:8080/bottles/a

HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: Tue, 20 Oct 2015 01:16:40 GMT
Content-Length: 120

[{"id":1,"title":"invalid parameter value","msg":"invalid value \"a\" for parameter \"bottleID\",
 must be a integer"}]
```

Finally request the swagger specification with (response ommitted for the sake of brevity):

```bash
$ curl -i localhost:8080/swagger.json
```

Instead of using curl, let's use the generated CLI tool to make requests to the service. First let's compile the CLI client:

```bash
$ cd client/cellar-cli
$ go build -o cellar-cli
$ ./cellar-cli
```

The command above prints the cli usage. The --help flag also provides contextual help:

```bash
$ ./cellar-cli show bottle --help
```

The command above shows how to call the show bottle action:

```bash
$ ./cellar-cli --dump show bottle /bottles/1
GET http://localhost:8080/bottles/1
Content-Type: application/json
User-Agent: cellar-cli/1.0
==> HTTP/1.1 200 OK
Content-Length: 47
Content-Type: application/vnd.goa.example.bottle+json; charset=utf-8
Date: Sun, 29 Nov 2015 05:03:10 GMT

{"href":"/bottles/1","id":1,"name":"Bottle #1"}
```

That's it! congratulations on writing you first goa service!

This example only covers a fraction of what goa can do but is hopefully enough to illustrate the
benefits of design-based API development.
