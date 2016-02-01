+++
title="middleware/cors"
description="godoc for middleware/cors"
categories=["godoc"]
tags=["godoc","cors"]
+++

# cors
    import "github.com/goadesign/middleware/cors"

Package cors provides a goa middleware that implements the Cross-Origin Resource Sharing (CORS)
standard as defined by W3C (<a href="http://www.w3.org/TR/access-control/">http://www.w3.org/TR/access-control/</a>). CORS implements a mechanism
to enable client-side cross-origin requests.

### Middleware DSL
This package implements a DSL that allows goa applications to define precisely all aspects of
CORS request handling. The DSL makes it possible to define the set of CORS resources exposed to
given origins. For each CORS resource it is possible to specify the allowed CORS request HTTP
methods and headers and all other CORS response properties. Additionnally CORS resources may be
equipped with a "Check" function which gets invoked by the middleware prior to handling a CORS
request. If this function returns false then the entire middleware is bypassed.

Here is an example of a CORS specification:


	New(func() {
		Origin("<a href="https://goa.design">https://goa.design</a>", func () {     // This function defines CORS resources for the <a href="https://goa.design">https://goa.design</a> origin.
			Resource("/private", func() {      // "/private" is the path of the CORS resource
				Headers("X-Shared-Secret") // One or more authorized headers
				Methods("GET", "POST")     // One or more authorized HTTP methods
				Expose("X-Time")           // One or more headers exposed to clients
				MaxAge(600)                // How long to cache a prefligh request response
				Credentials(true)          // Sets Access-Control-Allow-Credentials header
				Vary("Http-Origin")        // Sets Vary header
				Check(func(ctx *Context) bool { // Optional function that causes the middleware to be bypassed when returning false.
					if ctx.Request.Header().Get("X-Client") == "api" {
						return false
					}
					return true
				})
			})
		})
		// Origins can be defined using regular expression with OriginRegex:
		OrignRegex(regexp.MustCompile("^https?://([^\.]\.)?goa.design$"), func () {
			Resource("/public/*", func() {
				Methods("GET")
			})
			// Each origin may expose any number of CORS resources.
			Resource("/public/actions/*", func() {
				Methods("GET", "POST", "PUT", "DELETE")
			})
		})
	}}

### CORS Middleware and the Vary HTTP Header
The middleware automatically sets the "Vary" header to "Origin" unless the DSL defines a custom
value for it. The idea is to prevent caching of responses coming from different origins. Ideally
the application should make an effort at normalizing the value used in the  "Vary" header. See
<a href="https://www.fastly.com/blog/best-practices-for-using-the-vary-header">https://www.fastly.com/blog/best-practices-for-using-the-vary-header</a>.

### CORS Usage in goa
A goa service wanting to leverage this package to add support for CORS requests needs to do two
things. First the service should mount the CORS middleware using for example:


	spec := cors.New(func() {
		// ... CORS DSL goes here
	})
	service.Use(cors.Middleware(spec))

Secondly the service should mount the preflight controller. This controller takes care of
handling CORS preflight requests. It should be mounted *last* to avoid collisions in the low
level router between the service OPTIONS handler and the preflight controller handlers.


	cors.MountPreflightController(service, spec)






## func Check
``` go
func Check(check CheckFunc)
```
Check sets a function that must return true if the request is to be treated as a valid CORS
request.


## func Credentials
``` go
func Credentials(val bool)
```
Credentials sets the Access-Control-Allow-Credentials response header.


## func Expose
``` go
func Expose(headers ...string)
```
Expose defines the HTTP headers in the resource response that can be exposed to the client.


## func Headers
``` go
func Headers(headers ...string)
```
Headers defines the HTTP headers that will be allowed in the CORS resource request.
Use "*" to allow for any headerResources in the actual request.


## func MaxAge
``` go
func MaxAge(age int)
```
MaxAge sets the Access-Control-Max-Age response header.


## func Methods
``` go
func Methods(methods ...string)
```
Methods defines the HTTP methods allowed for the resource.


## func Middleware
``` go
func Middleware(spec Specification) goa.Middleware
```
Middleware returns a goa middleware which implements the given CORS specification.


## func MountPreflightController
``` go
func MountPreflightController(service goa.Service, spec Specification)
```
MountPreflightController mounts the handlers for the CORS preflight requests onto service.


## func Origin
``` go
func Origin(origin string, dsl func())
```
Origin defines a group of CORS resources for the given origin.


## func OriginRegex
``` go
func OriginRegex(origin *regexp.Regexp, dsl func())
```
OriginRegex defines a group of CORS resources for the origins matching the given regex.


## func Resource
``` go
func Resource(path string, dsl func())
```
Resource defines a resource subject to CORS requests. The resource is defined using its URL
path. The path can finish with the "*" wildcard character to indicate that all path under the
given prefix target the resource.


## func Vary
``` go
func Vary(headers ...string)
```
Vary is a list of HTTP headers to add to the 'Vary' header.



## type CheckFunc
``` go
type CheckFunc func(*goa.Context) bool
```
CheckFunc is the signature of the user provided function invoked by the middleware to
check whether to handle CORS headers.











## type ResourceDefinition
``` go
type ResourceDefinition struct {
    // Origin defines the origin that may access the CORS resource.
    // One and only one of Origin or OriginRegexp must be set.
    Origin string

    // OriginRegexp defines the origins that may access the CORS resource.
    // One and only one of Origin or OriginRegexp must be set.
    OriginRegexp *regexp.Regexp

    // Path is the resource URL path.
    Path string

    // IsPathPrefix is true if Path is a path prefix, false if it's an exact match.
    IsPathPrefix bool

    // Headers contains the allowed CORS request headers.
    Headers []string

    // Methods contains the allowed CORS request methods.
    Methods []string

    // Expose contains the headers that should be exposed to clients.
    Expose []string

    // MaxAge defines the value of the Access-Control-Max-Age header CORS requeets
    // response header.
    MaxAge int

    // Credentials defines the value of the Access-Control-Allow-Credentials CORS
    // requests response header.
    Credentials bool

    // Vary defines the value of the Vary response header.
    // See https://www.fastly.com/blog/best-practices-for-using-the-vary-header.
    Vary []string

    // Check is an optional user provided functions that causes CORS handling to be
    // bypassed when it return false.
    Check CheckFunc
}
```
ResourceDefinition represents a CORS resource as defined by its path (or path prefix).











### func (\*ResourceDefinition) FillHeaders
``` go
func (res *ResourceDefinition) FillHeaders(origin string, header http.Header)
```
FillHeaders initializes the given header with the resource CORS headers. origin is the request
origin.



### func (\*ResourceDefinition) OriginAllowed
``` go
func (res *ResourceDefinition) OriginAllowed(origin string) bool
```
OriginAllowed returns true if the resource is accessible to the given origin.



### func (\*ResourceDefinition) PathMatches
``` go
func (res *ResourceDefinition) PathMatches(path string) bool
```
PathMatches returns true if the resource lives under the given path.



## type Specification
``` go
type Specification []*ResourceDefinition
```
Specification contains the information needed to handle CORS requests.









### func New
``` go
func New(dsl func()) (Specification, error)
```
New runs the given CORS specification DSL and returns the built-up data structure.




### func (Specification) PathResource
``` go
func (v Specification) PathResource(path string) *ResourceDefinition
```
PathResource returns the resource under the given path if any.



### func (Specification) RequestResource
``` go
func (v Specification) RequestResource(ctx *goa.Context, origin string) *ResourceDefinition
```
RequestResource returns the resource targeted by the CORS request defined in ctx.



### func (Specification) String
``` go
func (v Specification) String() string
```
String returns a human friendly representation of the CORS specification.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md))
