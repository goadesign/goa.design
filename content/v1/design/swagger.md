+++
date = "2016-01-30T11:01:06-05:00"
title = "Leveraging Swagger"
weight = 4

[menu.v1]
name = "Swagger"
parent = "design.v1"
+++

[goagen](/implement/goagen) can generate the Swagger specification of an API given its design.
The service hosted at [https://swagger.goa.design](https://swagger.goa.design) runs `goagen swagger`
on a given (public) Github repository and renders the corresponding Swagger UI. This provides a
convenient way to quickly look at an API definition of an open source goa service and experiment
with it.

## Try It! Buttons and CORS

The Swagger UI renders "Try It!" buttons under each operation. Clicking on these buttons causes the
UI to send the corresponding API request to the host defined in the design. The host must thus be
actively running and hosting the API for the buttons to work. The HTTP responses must also contain
CORS headers that authorize the UI JavaScript to access the JSON in the responses. The CORS package
[reference](/reference/goa/cors) describes the details for how to setup CORS in a goa service.
