+++
date = "2016-01-30T11:01:06-05:00"
title = "Leveraging Swagger"
+++

[goagen](../implement/goagen.md) can generate the Swagger specification of an API given its design.
The service hosted at [http://swagger.goa.design](http://swagger.goa.design) runs `goagen swagger`
on a given (public) github repository and renders the corresponding Swagger UI. This provides a
convenient way to quickly look at an API definition of an open source goa service and experiment
with it.

## Try It! Buttons and CORS

The Swagger UI renders "Try It!" buttons under each operation. Clicking on these buttons causes the
UI to send the corresponding API request to the host defined in the design. The host must thus be
actively running and hosting the API for the buttons to work. The HTTP responses must also contain
CORS headers that authorize the UI JavaScript to access the JSON in the responses. The cors package
[reference](../reference/middleware/cors.html) describes the details for how to setup CORS
middleware in a goa service. Here is an example that mounts the CORS middleware on a goa service to
authorize requests from the `swagger.goa.design` domain:

```go
package main

import (
        "github.com/goadesign/goa"
        "github.com/middleware/cors"
)

func main() {
        // Create goa application
        service := goa.New("cellar")

        // Setup CORS to allow for swagger UI.
        spec, err := cors.New(func() {
                cors.Origin("http://swagger.goa.design", func() {
                        cors.Resource("*", func() {
                                cors.Methods("GET", "POST", "PUT", "PATCH", "DELETE")
                        })
                })
        })
        if err != nil {
                panic(err)
        }

        // Mount CORS middleware
        service.Use(cors.Middleware(spec))

        // Setup other middleware
        service.Use(goa.RequestID())
        service.Use(goa.Recover())

        // Mount controllers onto application
        // ...

        // Mount CORS preflight controllers
        // Must be mounted last to avoid clashes with existing API OPTIONS
        // endpoints.
        cors.MountPreflightController(service, spec)

        // Run service
        service.ListenAndServe(":8080")
}
```
