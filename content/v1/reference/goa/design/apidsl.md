+++
date="2018-09-10T17:03:12-07:00"
description="github.com/goadesign/goa/design/apidsl"
+++


# apidsl
`import "github.com/goadesign/goa/design/apidsl"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>
Package apidsl implements the goa design language.

The goa design language provides a simple way to describe an API design. The language consists of
global Go functions that can be nested to build up *definitions*. The root definition is the API
definition. This definition is what the language builds as it executes. There are 3 other top level
definitions: the resource, media type and type definitions all created using the corresponding
global functions (Resource, MediaType and Type).

Resource definitions describe the API resources. This includes the default media type used to
represent the resource as well as all the actions that can be run on it.

Media type definitions describe the media types used throughout the API. A media type describes
the body of HTTP responses by listing their attributes (think object fields) in a recursive manner.
This description can also include JSON schema-like validation rules that goa uses to produce
validation code. A Media type definition also describes one or more *views* and for each view which
fields to render. Finally a media type definition may also define *links* to other resources. The
media type used to render the link on a resource defines a special "link" view used by default by
goa to render the "links" child attributes.

The last top level definition is the type definition. Type definitions describe data structures
in a similar way that media type definitions describe response body attributes. In fact, media
type definitions are a special kind of type definitions that add views and links. Type definitions
can be used to describe the request payloads as a whole or any attribute appearing anywhere
(payloads, media types, headers, params etc.) and as with media type definitions they can include
validation rules that goa leverages to validate attributes of that type.

Package apidsl also provides a generic DSL engine that other DSLs can plug into. Adding a DSL
implementation consists of registering the root DSL object in the design package Roots variable.
The runner iterates through all root DSL definitions and executes the definition sets they expose.

In general there should be one root definition per DSL (the built-in API DSL uses the APIDefinition
as root definition). The root definition can in turn list sets of definitions where a set defines
a unit of execution and allows to control the ordering of execution. Each definition set consists
of a list of definitions. Definitions must implement the design.Definition interface and may
additionally implement the design.Source and design.Validate interfaces.




## <a name="pkg-index">Index</a>
* [Variables](#pkg-variables)
* [func API(name string, dsl func()) *design.APIDefinition](#API)
* [func APIKeySecurity(name string, dsl ...func()) *design.SecuritySchemeDefinition](#APIKeySecurity)
* [func AccessCodeFlow(authorizationURL, tokenURL string)](#AccessCodeFlow)
* [func Action(name string, dsl func())](#Action)
* [func ApplicationFlow(tokenURL string)](#ApplicationFlow)
* [func ArrayOf(v interface{}, dsl ...func()) *design.Array](#ArrayOf)
* [func Attribute(name string, args ...interface{})](#Attribute)
* [func Attributes(apidsl func())](#Attributes)
* [func BasePath(val string)](#BasePath)
* [func BasicAuthSecurity(name string, dsl ...func()) *design.SecuritySchemeDefinition](#BasicAuthSecurity)
* [func CONNECT(path string, dsl ...func()) *design.RouteDefinition](#CONNECT)
* [func CanonicalActionName(a string)](#CanonicalActionName)
* [func CollectionOf(v interface{}, paramAndDSL ...interface{}) *design.MediaTypeDefinition](#CollectionOf)
* [func Consumes(args ...interface{})](#Consumes)
* [func Contact(dsl func())](#Contact)
* [func ContentType(typ string)](#ContentType)
* [func Credentials()](#Credentials)
* [func DELETE(path string, dsl ...func()) *design.RouteDefinition](#DELETE)
* [func Default(def interface{})](#Default)
* [func DefaultMedia(val interface{}, viewName ...string)](#DefaultMedia)
* [func Description(d string)](#Description)
* [func Docs(dsl func())](#Docs)
* [func Email(email string)](#Email)
* [func Enum(val ...interface{})](#Enum)
* [func Example(exp interface{})](#Example)
* [func Expose(vals ...string)](#Expose)
* [func Files(path, filename string, dsls ...func())](#Files)
* [func Format(f string)](#Format)
* [func Function(fn string)](#Function)
* [func GET(path string, dsl ...func()) *design.RouteDefinition](#GET)
* [func HEAD(path string, dsl ...func()) *design.RouteDefinition](#HEAD)
* [func HashOf(k, v interface{}, dsls ...func()) *design.Hash](#HashOf)
* [func Header(name string, args ...interface{})](#Header)
* [func Headers(params ...interface{})](#Headers)
* [func Host(host string)](#Host)
* [func ImplicitFlow(authorizationURL string)](#ImplicitFlow)
* [func JWTSecurity(name string, dsl ...func()) *design.SecuritySchemeDefinition](#JWTSecurity)
* [func License(dsl func())](#License)
* [func Link(name string, view ...string)](#Link)
* [func Links(apidsl func())](#Links)
* [func MaxAge(val uint)](#MaxAge)
* [func MaxLength(val int)](#MaxLength)
* [func Maximum(val interface{})](#Maximum)
* [func Media(val interface{}, viewName ...string)](#Media)
* [func MediaType(identifier string, apidsl func()) *design.MediaTypeDefinition](#MediaType)
* [func Member(name string, args ...interface{})](#Member)
* [func Metadata(name string, value ...string)](#Metadata)
* [func Methods(vals ...string)](#Methods)
* [func MinLength(val int)](#MinLength)
* [func Minimum(val interface{})](#Minimum)
* [func MultipartForm()](#MultipartForm)
* [func Name(name string)](#Name)
* [func NoExample()](#NoExample)
* [func NoSecurity()](#NoSecurity)
* [func OAuth2Security(name string, dsl ...func()) *design.SecuritySchemeDefinition](#OAuth2Security)
* [func OPTIONS(path string, dsl ...func()) *design.RouteDefinition](#OPTIONS)
* [func OptionalPayload(p interface{}, dsls ...func())](#OptionalPayload)
* [func Origin(origin string, dsl func())](#Origin)
* [func PATCH(path string, dsl ...func()) *design.RouteDefinition](#PATCH)
* [func POST(path string, dsl ...func()) *design.RouteDefinition](#POST)
* [func PUT(path string, dsl ...func()) *design.RouteDefinition](#PUT)
* [func Package(path string)](#Package)
* [func Param(name string, args ...interface{})](#Param)
* [func Params(dsl func())](#Params)
* [func Parent(p string)](#Parent)
* [func PasswordFlow(tokenURL string)](#PasswordFlow)
* [func Pattern(p string)](#Pattern)
* [func Payload(p interface{}, dsls ...func())](#Payload)
* [func Produces(args ...interface{})](#Produces)
* [func Query(parameterName string)](#Query)
* [func ReadOnly()](#ReadOnly)
* [func Reference(t design.DataType)](#Reference)
* [func Required(names ...string)](#Required)
* [func Resource(name string, dsl func()) *design.ResourceDefinition](#Resource)
* [func Response(name string, paramsAndDSL ...interface{})](#Response)
* [func ResponseTemplate(name string, p interface{})](#ResponseTemplate)
* [func Routing(routes ...*design.RouteDefinition)](#Routing)
* [func Scheme(vals ...string)](#Scheme)
* [func Scope(name string, desc ...string)](#Scope)
* [func Security(scheme interface{}, dsl ...func())](#Security)
* [func Status(status int)](#Status)
* [func TRACE(path string, dsl ...func()) *design.RouteDefinition](#TRACE)
* [func TermsOfService(terms string)](#TermsOfService)
* [func Title(val string)](#Title)
* [func TokenURL(tokenURL string)](#TokenURL)
* [func Trait(name string, val ...func())](#Trait)
* [func Type(name string, dsl func()) *design.UserTypeDefinition](#Type)
* [func TypeName(name string)](#TypeName)
* [func URL(url string)](#URL)
* [func UseTrait(names ...string)](#UseTrait)
* [func Version(ver string)](#Version)
* [func View(name string, apidsl ...func())](#View)


#### <a name="pkg-files">Package files</a>
[action.go](/src/github.com/goadesign/goa/design/apidsl/action.go) [api.go](/src/github.com/goadesign/goa/design/apidsl/api.go) [attribute.go](/src/github.com/goadesign/goa/design/apidsl/attribute.go) [current.go](/src/github.com/goadesign/goa/design/apidsl/current.go) [doc.go](/src/github.com/goadesign/goa/design/apidsl/doc.go) [init.go](/src/github.com/goadesign/goa/design/apidsl/init.go) [media_type.go](/src/github.com/goadesign/goa/design/apidsl/media_type.go) [metadata.go](/src/github.com/goadesign/goa/design/apidsl/metadata.go) [resource.go](/src/github.com/goadesign/goa/design/apidsl/resource.go) [response.go](/src/github.com/goadesign/goa/design/apidsl/response.go) [security.go](/src/github.com/goadesign/goa/design/apidsl/security.go) [type.go](/src/github.com/goadesign/goa/design/apidsl/type.go) 



## <a name="pkg-variables">Variables</a>
``` go
var SupportedValidationFormats = []string{
    "cidr",
    "date",
    "date-time",
    "email",
    "hostname",
    "ipv4",
    "ipv6",
    "ip",
    "mac",
    "regexp",
    "rfc1123",
    "uri",
}
```
SupportedValidationFormats lists the supported formats for use with the
Format DSL.



## <a name="API">func</a> [API](/src/target/api.go?s=2533:2588#L73)
``` go
func API(name string, dsl func()) *design.APIDefinition
```
API implements the top level API DSL. It defines the API name, default description and other
default global property values. Here is an example showing all the possible API sub-definitions:


		API("API name", func() {
			Title("title")				// API title used in documentation
			Description("description")		// API description used in documentation
			Version("2.0")				// API version being described
			TermsOfService("terms")
			Contact(func() {			// API Contact information
				Name("contact name")
				Email("contact email")
				URL("contact URL")
			})
			License(func() {			// API Licensing information
				Name("license name")
				URL("license URL")
			})
		 	Docs(func() {
				Description("doc description")
				URL("doc URL")
			})
			Host("goa.design")			// API hostname
			Scheme("http")
			BasePath("/base/:param")		// Common base path to all API actions
			Params(func() {				// Common parameters to all API actions
				Param("param")
			})
			Security("JWT")
			Origin("<a href="https://swagger.goa.design">https://swagger.goa.design</a>", func() { // Define CORS policy, may be prefixed with "*" wildcard
				Headers("X-Shared-Secret")           // One or more authorized headers, use "*" to authorize all
				Methods("GET", "POST")               // One or more authorized HTTP methods
				Expose("X-Time")                     // One or more headers exposed to clients
				MaxAge(600)                          // How long to cache a prefligh request response
				Credentials()                        // Sets Access-Control-Allow-Credentials header
			})
			Consumes("application/xml") // Built-in encoders and decoders
			Consumes("application/json")
			Produces("application/gob")
			Produces("application/json", func() {   // Custom encoder
				Package("github.com/goadesign/goa/encoding/json")
			})
			ResponseTemplate("static", func() {	// Response template for use by actions
				Description("description")
				Status(404)
				MediaType("application/json")
			})
			ResponseTemplate("dynamic", func(arg1, arg2 string) {
				Description(arg1)
				Status(200)
				MediaType(arg2)
			})
	             NoExample()                             // Prevent automatic generation of examples
			Trait("Authenticated", func() {		// Traits define DSL that can be run anywhere
				Headers(func() {
					Header("header")
					Required("header")
				})
			})
		}



## <a name="APIKeySecurity">func</a> [APIKeySecurity](/src/target/security.go?s=3719:3799#L140)
``` go
func APIKeySecurity(name string, dsl ...func()) *design.SecuritySchemeDefinition
```
APIKeySecurity defines an "apiKey" security scheme available throughout the API.

Example:


	 APIKeySecurity("key", func() {
	      Description("Shared secret")
	      Header("Authorization")
	})



## <a name="AccessCodeFlow">func</a> [AccessCodeFlow](/src/target/security.go?s=9012:9066#L321)
``` go
func AccessCodeFlow(authorizationURL, tokenURL string)
```
AccessCodeFlow defines an "access code" OAuth2 flow.  Use within an OAuth2Security definition.



## <a name="Action">func</a> [Action](/src/target/action.go?s=4058:4094#L95)
``` go
func Action(name string, dsl func())
```
Action implements the action definition DSL. Action definitions describe specific API endpoints
including the URL, HTTP method and request parameters (via path wildcards or query strings) and
payload (data structure describing the request HTTP body). An action belongs to a resource and
"inherits" default values from the resource definition including the URL path prefix, default
response media type and default payload attribute properties (inherited from the attribute with
identical name in the resource default media type). Action definitions also describe all the
possible responses including the HTTP status, headers and body. Here is an example showing all
the possible sub-definitions:


	Action("Update", func() {
	    Description("Update account")
	    Docs(func() {
	        Description("Update docs")
	        URL("http//cellarapi.com/docs/actions/update")
	    })
	    Scheme("http")
	    Routing(
	        PUT("/:id"),                     // Action path is relative to parent resource base path
	        PUT("//orgs/:org/accounts/:id"), // The // prefix indicates an absolute path
	    )
	    Params(func() {                      // Params describe the action parameters
	        Param("org", String)             // Parameters may correspond to path wildcards
	        Param("id", Integer)
	        Param("sort", func() {           // or URL query string values.
	            Enum("asc", "desc")
	        })
	    })
	    Security("oauth2", func() {          // Security sets the security scheme used to secure requests
	        Scope("api:read")
	        Scope("api:write")
	    })
	    Headers(func() {                     // Headers describe relevant action headers
	        Header("Authorization", String)
	        Header("X-Account", Integer)
	        Required("Authorization", "X-Account")
	    })
	    Payload(UpdatePayload)                // Payload describes the HTTP request body
	    // OptionalPayload(UpdatePayload)     // OptionalPayload defines an HTTP request body which may be omitted
	    Response(NoContent)                   // Each possible HTTP response is described via Response
	    Response(NotFound)
	})



## <a name="ApplicationFlow">func</a> [ApplicationFlow](/src/target/security.go?s=9465:9502#L334)
``` go
func ApplicationFlow(tokenURL string)
```
ApplicationFlow defines an "application" OAuth2 flow.  Use within an OAuth2Security definition.



## <a name="ArrayOf">func</a> [ArrayOf](/src/target/type.go?s=2546:2602#L85)
``` go
func ArrayOf(v interface{}, dsl ...func()) *design.Array
```
ArrayOf creates an array type from its element type. The result can be used
anywhere a type can. Examples:


	var Bottle = Type("bottle", func() {
		Attribute("name")
	})
	
	Action("update", func() {
		Params(func() {
			Param("ids", ArrayOf(Integer))
		})
		Payload(ArrayOf(Bottle))
	})

ArrayOf accepts an optional DSL as second argument which allows providing
validations for the elements of the array:


	Action("update", func() {
		Params(func() {
			Param("ids", ArrayOf(Integer, func() {
				Minimum(1)
			}))
		})
		Payload(ArrayOf(Bottle))
	})

If you are looking to return a collection of elements in a Response clause,
refer to CollectionOf. ArrayOf creates a type, where CollectionOf creates a
media type.



## <a name="Attribute">func</a> [Attribute](/src/target/attribute.go?s=2543:2591#L82)
``` go
func Attribute(name string, args ...interface{})
```
Attribute can be used in: View, Type, Attribute, Attributes

Attribute implements the attribute definition DSL. An attribute describes a data structure
recursively. Attributes are used for describing request headers, parameters and payloads -
response bodies and headers - media types	 and types. An attribute definition is recursive:
attributes may include other attributes. At the basic level an attribute has a name,
a type and optionally a default value and validation rules. The type of an attribute can be one of:

* The primitive types Boolean, Integer, Number, DateTime, UUID or String.

* A type defined via the Type function.

* A media type defined via the MediaType function.

* An object described recursively with child attributes.

* An array defined using the ArrayOf function.

* An hashmap defined using the HashOf function.

* The special type Any to indicate that the attribute may take any of the types listed above.

Attributes can be defined using the Attribute, Param, Member or Header functions depending
on where the definition appears. The syntax for all these DSL is the same.
Here are some examples:


	Attribute("name")					// Defines an attribute of type String
	
	Attribute("name", func() {
		Pattern("^foo")					// Adds a validation rule to the attribute
	})
	
	Attribute("name", Integer)				// Defines an attribute of type Integer
	
	Attribute("name", Integer, func() {
		Default(42)					// With a default value
	})
	
	Attribute("name", Integer, "description")		// Specifies a description
	
	Attribute("name", Integer, "description", func() {
		Enum(1, 2)					// And validation rules
	})

Nested attributes:


	Attribute("nested", func() {
		Description("description")
		Attribute("child")
		Attribute("child2", func() {
			// ....
		})
		Required("child")
	})

Here are all the valid usage of the Attribute function:


	Attribute(name string, dataType DataType, description string, dsl func())
	
	Attribute(name string, dataType DataType, description string)
	
	Attribute(name string, dataType DataType, dsl func())
	
	Attribute(name string, dataType DataType)
	
	Attribute(name string, dsl func())	// dataType is String or Object (if DSL defines child attributes)
	
	Attribute(name string)			// dataType is String



## <a name="Attributes">func</a> [Attributes](/src/target/media_type.go?s=10584:10614#L320)
``` go
func Attributes(apidsl func())
```
Attributes implements the media type attributes apidsl. See MediaType.



## <a name="BasePath">func</a> [BasePath](/src/target/api.go?s=4147:4172#L128)
``` go
func BasePath(val string)
```
BasePath defines the API base path, i.e. the common path prefix to all the API actions.
The path may define wildcards (see Routing for a description of the wildcard syntax).
The corresponding parameters must be described using Params.



## <a name="BasicAuthSecurity">func</a> [BasicAuthSecurity](/src/target/security.go?s=2644:2727#L94)
``` go
func BasicAuthSecurity(name string, dsl ...func()) *design.SecuritySchemeDefinition
```
BasicAuthSecurity defines a "basic" security scheme for the API.

Example:


	BasicAuthSecurity("password", func() {
	    Description("Use your own password!")
	})



## <a name="CONNECT">func</a> [CONNECT](/src/target/action.go?s=7130:7194#L207)
``` go
func CONNECT(path string, dsl ...func()) *design.RouteDefinition
```
CONNECT creates a route using the CONNECT HTTP method.



## <a name="CanonicalActionName">func</a> [CanonicalActionName](/src/target/resource.go?s=5177:5211#L118)
``` go
func CanonicalActionName(a string)
```
CanonicalActionName sets the name of the action used to compute the resource collection and
resource collection items hrefs. See Resource.



## <a name="CollectionOf">func</a> [CollectionOf](/src/target/media_type.go?s=13056:13144#L386)
``` go
func CollectionOf(v interface{}, paramAndDSL ...interface{}) *design.MediaTypeDefinition
```
CollectionOf creates a collection media type from its element media type and an optional
identifier. A collection media type represents the content of responses that return a collection
of resources such as "list" actions. This function can be called from any place where a media
type can be used.

If an identifier isn't provided then the resulting media type identifier is built from the
element media type by appending the media type parameter "type" with value "collection".

Examples:


	// Define a collection media type using the default generated identifier
	// (e.g. "vnd.goa.bottle; type=collection" assuming the identifier of BottleMedia
	// is "vnd.goa.bottle") and the default views (i.e. inherited from the BottleMedia
	// views).
	var col = CollectionOf(BottleMedia)
	
	// Another collection media type using the same element media type but defining a
	// different default view.
	var col2 = CollectionOf(BottleMedia, "vnd.goa.bottle.alternate; type=collection;", func() {
	    View("default", func() {
	        Attribute("id")
	        Attribute("name")
	    })
	})



## <a name="Consumes">func</a> [Consumes](/src/target/api.go?s=10327:10361#L352)
``` go
func Consumes(args ...interface{})
```
Consumes adds a MIME type to the list of MIME types the APIs supports when accepting requests.
Consumes may also specify the path of the decoding package.
The package must expose a DecoderFactory method that returns an object which implements
goa.DecoderFactory.



## <a name="Contact">func</a> [Contact](/src/target/api.go?s=8476:8500#L273)
``` go
func Contact(dsl func())
```
Contact sets the API contact information.



## <a name="ContentType">func</a> [ContentType](/src/target/media_type.go?s=7479:7507#L212)
``` go
func ContentType(typ string)
```
ContentType sets the value of the Content-Type response header. By default the ID of the media
type is used.


	ContentType("application/json")



## <a name="Credentials">func</a> [Credentials](/src/target/api.go?s=7141:7159#L219)
``` go
func Credentials()
```
Credentials sets the allow credentials response header. Used in Origin DSL.



## <a name="DELETE">func</a> [DELETE](/src/target/action.go?s=6279:6342#L174)
``` go
func DELETE(path string, dsl ...func()) *design.RouteDefinition
```
DELETE creates a route using the DELETE HTTP method.



## <a name="Default">func</a> [Default](/src/target/attribute.go?s=7804:7833#L282)
``` go
func Default(def interface{})
```
Default can be used in: Attribute

Default sets the default value for an attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor10">https://json-schema.org/latest/json-schema-validation.html#anchor10</a>.



## <a name="DefaultMedia">func</a> [DefaultMedia](/src/target/resource.go?s=4051:4105#L85)
``` go
func DefaultMedia(val interface{}, viewName ...string)
```
DefaultMedia sets a resource default media type by identifier or by reference using a value
returned by MediaType:


	var _ = Resource("bottle", func() {
		DefaultMedia(BottleMedia)
		// ...
	})
	
	var _ = Resource("region", func() {
		DefaultMedia("vnd.goa.region")
		// ...
	})

The default media type is used to build OK response definitions when no specific media type is
given in the Response function call. The default media type is also used to set the default
properties of attributes listed in action payloads and params. So if a media type defines an
attribute "name" with associated validations then simply calling Attribute("name") inside a
request Payload or Param defines the attribute with the same type and validations.



## <a name="Description">func</a> [Description](/src/target/api.go?s=3271:3297#L100)
``` go
func Description(d string)
```
Description sets the definition description.
Description can be called inside API, Resource, Action, MediaType, Attribute, Response or ResponseTemplate



## <a name="Docs">func</a> [Docs](/src/target/api.go?s=8937:8958#L295)
``` go
func Docs(dsl func())
```
Docs provides external documentation pointers.



## <a name="Email">func</a> [Email](/src/target/api.go?s=9599:9623#L326)
``` go
func Email(email string)
```
Email sets the contact email.



## <a name="Enum">func</a> [Enum](/src/target/attribute.go?s=9959:9988#L351)
``` go
func Enum(val ...interface{})
```
Enum can be used in: Attribute, Header, Param, HashOf, ArrayOf

Enum adds a "enum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor76">https://json-schema.org/latest/json-schema-validation.html#anchor76</a>.



## <a name="Example">func</a> [Example](/src/target/attribute.go?s=8796:8825#L314)
``` go
func Example(exp interface{})
```
Example can be used in: Attribute, Header, Param, HashOf, ArrayOf

Example sets the example of an attribute to be used for the documentation:


	Attributes(func() {
		Attribute("ID", Integer, func() {
			Example(1)
		})
		Attribute("name", String, func() {
			Example("Cabernet Sauvignon")
		})
		Attribute("price", String) //If no Example() is provided, goa generates one that fits your specification
	})

If you do not want an auto-generated example for an attribute, add NoExample() to it.



## <a name="Expose">func</a> [Expose](/src/target/api.go?s=6791:6818#L205)
``` go
func Expose(vals ...string)
```
Expose sets the origin exposed headers. Used in Origin DSL.



## <a name="Files">func</a> [Files](/src/target/action.go?s=1336:1385#L38)
``` go
func Files(path, filename string, dsls ...func())
```
Files defines an API endpoint that serves static assets. The logic for what to do when the
filename points to a file vs. a directory is the same as the standard http package ServeFile
function. The path may end with a wildcard that matches the rest of the URL (e.g. *filepath). If
it does the matching path is appended to filename to form the full file path, so:


	Files("/index.html", "/www/data/index.html")

Returns the content of the file "/www/data/index.html" when requests are sent to "/index.html"
and:


	Files("/assets/*filepath", "/www/data/assets")

returns the content of the file "/www/data/assets/x/y/z" when requests are sent to
"/assets/x/y/z".
The file path may be specified as a relative path to the current path of the process.
Files support setting a description, security scheme and doc links via additional DSL:


	Files("/index.html", "/www/data/index.html", func() {
	    Description("Serve home page")
	    Docs(func() {
	        Description("Download docs")
	        URL("http//cellarapi.com/docs/actions/download")
	    })
	    Security("oauth2", func() {
	        Scope("api:read")
	    })
	})



## <a name="Format">func</a> [Format](/src/target/attribute.go?s=12622:12643#L427)
``` go
func Format(f string)
```
Format can be used in: Attribute, Header, Param, HashOf, ArrayOf

Format adds a "format" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor104">https://json-schema.org/latest/json-schema-validation.html#anchor104</a>.
The formats supported by goa are:

"date": RFC3339 date

"date-time": RFC3339 date time

"email": RFC5322 email address

"hostname": RFC1035 internet host name

"ipv4", "ipv6", "ip": RFC2373 IPv4, IPv6 address or either

"uri": RFC3986 URI

"mac": IEEE 802 MAC-48, EUI-48 or EUI-64 MAC address

"cidr": RFC4632 or RFC4291 CIDR notation IP address

"regexp": RE2 regular expression

"rfc1123": RFC1123 date time



## <a name="Function">func</a> [Function](/src/target/api.go?s=12293:12317#L418)
``` go
func Function(fn string)
```
Function sets the Go function name used to instantiate the encoder or decoder. Defaults to
NewEncoder / NewDecoder.



## <a name="GET">func</a> [GET](/src/target/action.go?s=5181:5241#L130)
``` go
func GET(path string, dsl ...func()) *design.RouteDefinition
```
GET creates a route using the GET HTTP method.



## <a name="HEAD">func</a> [HEAD](/src/target/action.go?s=5454:5515#L141)
``` go
func HEAD(path string, dsl ...func()) *design.RouteDefinition
```
HEAD creates a route using the HEAD HTTP method.



## <a name="HashOf">func</a> [HashOf](/src/target/type.go?s=4137:4195#L137)
``` go
func HashOf(k, v interface{}, dsls ...func()) *design.Hash
```
HashOf creates a hash map from its key and element types. The result can be
used anywhere a type can. Examples:


	var Bottle = Type("bottle", func() {
		Attribute("name")
	})
	
	var RatedBottles = HashOf(String, Bottle)
	
	Action("updateRatings", func() {
		Payload(func() {
			Member("ratings", HashOf(String, Integer))
			Member("bottles", RatedBottles)
			// Member("bottles", "RatedBottles") // can use name of user type
	})

HashOf accepts optional DSLs as third and fourth argument which allows
providing validations for the keys and values of the hash respectively:


		var RatedBottles = HashOf(String, Bottle, func() {
	         Pattern("[a-zA-Z]+") // Validate bottle names
	     })
	
	     func ValidateKey() {
	         Pattern("^foo")
	     }
	
	     func TypeValue() {
	         Metadata("struct:field:type", "json.RawMessage", "encoding/json")
	     }
	
		var Mappings = HashOf(String, String, ValidateKey, TypeValue)



## <a name="Header">func</a> [Header](/src/target/attribute.go?s=7066:7111#L251)
``` go
func Header(name string, args ...interface{})
```
Header can be used in: Headers, APIKeySecurity, JWTSecurity

Header is an alias of Attribute for the most part.

Within an APIKeySecurity or JWTSecurity definition, Header
defines that an implementation must check the given header to get
the API Key.  In this case, no `args` parameter is necessary.



## <a name="Headers">func</a> [Headers](/src/target/action.go?s=8166:8201#L241)
``` go
func Headers(params ...interface{})
```
Headers implements the DSL for describing HTTP headers. The DSL syntax is identical to the one
of Attribute. Here is an example defining a couple of headers with validations:


	Headers(func() {
		Header("Authorization")
		Header("X-Account", Integer, func() {
			Minimum(1)
		})
		Required("Authorization")
	})

Headers can be used inside Action to define the action request headers, Response to define the
response headers or Resource to define common request headers to all the resource actions.



## <a name="Host">func</a> [Host](/src/target/api.go?s=7598:7620#L236)
``` go
func Host(host string)
```
Host sets the API hostname.



## <a name="ImplicitFlow">func</a> [ImplicitFlow](/src/target/security.go?s=10218:10260#L358)
``` go
func ImplicitFlow(authorizationURL string)
```
ImplicitFlow defines an "implicit" OAuth2 flow.  Use within an OAuth2Security definition.



## <a name="JWTSecurity">func</a> [JWTSecurity](/src/target/security.go?s=6477:6554#L232)
``` go
func JWTSecurity(name string, dsl ...func()) *design.SecuritySchemeDefinition
```
JWTSecurity defines an APIKey security scheme, with support for Scopes and a TokenURL.

Since Scopes and TokenURLs are not compatible with the Swagger specification, the swagger
generator inserts comments in the description of the different elements on which they are
defined.

Example:


	JWTSecurity("jwt", func() {
	    Header("Authorization")
	    TokenURL("<a href="https://example.com/token">https://example.com/token</a>")
	    Scope("my_system:write", "Write to the system")
	    Scope("my_system:read", "Read anything in there")
	})



## <a name="License">func</a> [License](/src/target/api.go?s=8704:8728#L284)
``` go
func License(dsl func())
```
License sets the API license information.



## <a name="Link">func</a> [Link](/src/target/media_type.go?s=11280:11318#L339)
``` go
func Link(name string, view ...string)
```
Link adds a link to a media type. At the minimum a link has a name corresponding to one of the
media type attribute names. A link may also define the view used to render the linked-to
attribute. The default view used to render links is "link". Examples:


	Link("origin")		// Use the "link" view of the "origin" attribute
	Link("account", "tiny")	// Use the "tiny" view of the "account" attribute



## <a name="Links">func</a> [Links](/src/target/media_type.go?s=10761:10786#L327)
``` go
func Links(apidsl func())
```
Links implements the media type links apidsl. See MediaType.



## <a name="MaxAge">func</a> [MaxAge](/src/target/api.go?s=6973:6994#L212)
``` go
func MaxAge(val uint)
```
MaxAge sets the cache expiry for preflight request responses. Used in Origin DSL.



## <a name="MaxLength">func</a> [MaxLength](/src/target/attribute.go?s=16865:16888#L559)
``` go
func MaxLength(val int)
```
MaxLength can be used in: Attribute, Header, Param, HashOf, ArrayOf

MaxLength adds a "maxItems" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor42">https://json-schema.org/latest/json-schema-validation.html#anchor42</a>.



## <a name="Maximum">func</a> [Maximum](/src/target/attribute.go?s=15173:15202#L510)
``` go
func Maximum(val interface{})
```
Maximum can be used in: Attribute, Header, Param, HashOf, ArrayOf

Maximum adds a "maximum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor17">https://json-schema.org/latest/json-schema-validation.html#anchor17</a>.



## <a name="Media">func</a> [Media](/src/target/media_type.go?s=5157:5204#L135)
``` go
func Media(val interface{}, viewName ...string)
```
Media sets a response media type by name or by reference using a value returned by MediaType:


	Response("NotFound", func() {
		Status(404)
		Media("application/json")
	})

If Media uses a media type defined in the design then it may optionally specify a view name:


	Response("OK", func() {
		Status(200)
		Media(BottleMedia, "tiny")
	})

Specifying a media type is useful for responses that always return the same view.

Media can be used inside Response or ResponseTemplate.



## <a name="MediaType">func</a> [MediaType](/src/target/media_type.go?s=3006:3082#L67)
``` go
func MediaType(identifier string, apidsl func()) *design.MediaTypeDefinition
```
MediaType is a top level DSL which can also be used in ResponseTemplate.

MediaType implements the media type definition DSL. A media type definition describes the
representation of a resource used in a response body.

Media types are defined with a unique identifier as defined by RFC6838. The identifier also
defines the default value for the Content-Type header of responses. The ContentType DSL allows
overridding the default as shown in the example below.

The media type definition includes a listing of all the potential attributes that can appear in
the body. Views specify which of the attributes are actually rendered so that the same media type
definition may represent multiple rendering of a given resource representation.

All media types must define a view named "default". This view is used to render the media type in
response bodies when no other view is specified.

A media type definition may also define links to other media types. This is done by first
defining an attribute for the linked-to media type and then referring to that attribute in the
Links DSL. Views may then elect to render one or the other or both. Links are rendered using the
special "link" view. Media types that are linked to must define that view. Here is an example
showing all the possible media type sub-definitions:


	MediaType("application/vnd.goa.example.bottle", func() {
	    Description("A bottle of wine")
	    TypeName("BottleMedia")         // Override default generated name
	    ContentType("application/json") // Override default Content-Type header value
	    Attributes(func() {
	        Attribute("id", Integer, "ID of bottle")
	        Attribute("href", String, "API href of bottle")
	        Attribute("account", Account, "Owner account")
	        Attribute("origin", Origin, "Details on wine origin")
	        Links(func() {
	            Link("account")         // Defines link to Account media type
	            Link("origin", "tiny")  // Set view used to render link if not "link"
	        })
	        Required("id", "href")
	    })
	    View("default", func() {
	        Attribute("id")
	        Attribute("href")
	        Attribute("links")          // Renders links
	    })
	    View("extended", func() {
	        Attribute("id")
	        Attribute("href")
	        Attribute("account")        // Renders account inline
	        Attribute("origin")         // Renders origin inline
	        Attribute("links")          // Renders links
	    })
	 })

This function returns the media type definition so it can be referred to throughout the apidsl.



## <a name="Member">func</a> [Member](/src/target/attribute.go?s=7414:7459#L267)
``` go
func Member(name string, args ...interface{})
```
Member can be used in: Payload

Member is an alias of Attribute.



## <a name="Metadata">func</a> [Metadata](/src/target/metadata.go?s=3313:3356#L78)
``` go
func Metadata(name string, value ...string)
```
Metadata is a set of key/value pairs that can be assigned to an object. Each value consists of a
slice of strings so that multiple invocation of the Metadata function on the same target using
the same key builds up the slice. Metadata may be set on attributes, media types, actions,
responses, resources and API definitions.

While keys can have any value the following names are handled explicitly by goagen when set on
attributes.

`struct:field:name`: overrides the Go struct field name generated by default by goagen.
Applicable to attributes only.


	Metadata("struct:field:name", "MyName")

`struct:field:type`: overrides the Go struct field type generated by default by goagen.
The second optional tag value specifies the Go import path to the package defining the
type if not built-in. Applicable to attributes only.


	Metadata("struct:field:type", "[]byte")
	Metadata("struct:field:type", "json.RawMessage", "encoding/json")
	Metadata("struct:field:type", "mypackage.MyType", "github.com/me/mypackage")

`struct:tag:xxx`: sets the struct field tag xxx on generated Go structs.  Overrides tags that
goagen would otherwise set.  If the metadata value is a slice then the strings are joined with
the space character as separator.
Applicable to attributes only.


	Metadata("struct:tag:json", "myName,omitempty")
	Metadata("struct:tag:xml", "myName,attr")

`swagger:generate`: specifies whether Swagger specification should be generated. Defaults to
true.
Applicable to resources, actions and file servers.


	Metadata("swagger:generate", "false")

`swagger:summary`: sets the Swagger operation summary field.
Applicable to actions.


	Metadata("swagger:summary", "Short summary of what action does")

`swagger:tag:xxx`: sets the Swagger object field tag xxx.
Applicable to resources and actions.


	Metadata("swagger:tag:Backend")
	Metadata("swagger:tag:Backend:desc", "Quick description of what 'Backend' is")
	Metadata("swagger:tag:Backend:url", "<a href="https://example.com">https://example.com</a>")
	Metadata("swagger:tag:Backend:url:desc", "See more docs here")

`swagger:extension:xxx`: sets the Swagger extensions xxx. It can have any valid JSON format value.
Applicable to
api as within the info and tag object,
resource as within the paths object,
action as within the path-item object,
route as within the operation object,
param as within the parameter object,
response as within the response object
and security as within the security-scheme object.
See <a href="https://github.com/OAI/OpenAPI-Specification/blob/master/guidelines/EXTENSIONS.md">https://github.com/OAI/OpenAPI-Specification/blob/master/guidelines/EXTENSIONS.md</a>.


	Metadata("swagger:extension:x-api", `{"foo":"bar"}`)

The special key names listed above may be used as follows:


	var Account = Type("Account", func() {
	        Attribute("service", String, "Name of service", func() {
	                // Override default name to avoid clash with built-in 'Service' field.
	                Metadata("struct:field:name", "ServiceName")
	        })
	})



## <a name="Methods">func</a> [Methods](/src/target/api.go?s=6630:6658#L198)
``` go
func Methods(vals ...string)
```
Methods sets the origin allowed methods. Used in Origin DSL.



## <a name="MinLength">func</a> [MinLength](/src/target/attribute.go?s=16231:16254#L542)
``` go
func MinLength(val int)
```
MinLength can be used in: Attribute, Header, Param, HashOf, ArrayOf

MinLength adds a "minItems" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor45">https://json-schema.org/latest/json-schema-validation.html#anchor45</a>.



## <a name="Minimum">func</a> [Minimum](/src/target/attribute.go?s=14120:14149#L478)
``` go
func Minimum(val interface{})
```
Minimum can be used in: Attribute, Header, Param, HashOf, ArrayOf

Minimum adds a "minimum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor21">https://json-schema.org/latest/json-schema-validation.html#anchor21</a>.



## <a name="MultipartForm">func</a> [MultipartForm](/src/target/action.go?s=15425:15445#L457)
``` go
func MultipartForm()
```
MultipartForm can be used in: Action

MultipartForm implements the action multipart form DSL. An action multipart form indicates that
the HTTP request body should be encoded using multipart form data as described in
<a href="https://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.2">https://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.2</a>.



## <a name="Name">func</a> [Name](/src/target/api.go?s=9339:9361#L314)
``` go
func Name(name string)
```
Name sets the contact or license name.



## <a name="NoExample">func</a> [NoExample](/src/target/attribute.go?s=9535:9551#L336)
``` go
func NoExample()
```
NoExample can be used in: Attribute, Header, Param, HashOf, ArrayOf

NoExample sets the example of an attribute to be blank for the documentation. It is used when
users don't want any custom or auto-generated example



## <a name="NoSecurity">func</a> [NoSecurity](/src/target/security.go?s=2007:2024#L67)
``` go
func NoSecurity()
```
NoSecurity resets the authentication schemes for an Action or a Resource. It also prevents
fallback to Resource or API-defined Security.



## <a name="OAuth2Security">func</a> [OAuth2Security](/src/target/security.go?s=5352:5432#L190)
``` go
func OAuth2Security(name string, dsl ...func()) *design.SecuritySchemeDefinition
```
OAuth2Security defines an OAuth2 security scheme. The child DSL must define one and exactly one
flow. One of AccessCodeFlow, ImplicitFlow, PasswordFlow or ApplicationFlow. Each flow defines
endpoints for retrieving OAuth2 authorization codes and/or refresh and access tokens. The
endpoint URLs may be complete or may be just a path in which case the API scheme and host are
used to build the full URL. See for example [Aaron Parecki's
writeup](<a href="https://aaronparecki.com/2012/07/29/2/oauth2-simplified">https://aaronparecki.com/2012/07/29/2/oauth2-simplified</a>) for additional details on
OAuth2 flows.

The OAuth2 DSL also allows for defining scopes that must be associated with the incoming request
token for successful authorization.

Example:


	OAuth2Security("googAuth", func() {
	    AccessCodeFlow("/authorization", "/token")
	 // ImplicitFlow("/authorization")
	 // PasswordFlow("/token"...)
	 // ApplicationFlow("/token")
	
	    Scope("my_system:write", "Write to the system")
	    Scope("my_system:read", "Read anything in there")
	})



## <a name="OPTIONS">func</a> [OPTIONS](/src/target/action.go?s=6564:6628#L185)
``` go
func OPTIONS(path string, dsl ...func()) *design.RouteDefinition
```
OPTIONS creates a route using the OPTIONS HTTP method.



## <a name="OptionalPayload">func</a> [OptionalPayload](/src/target/action.go?s=13344:13395#L388)
``` go
func OptionalPayload(p interface{}, dsls ...func())
```
OptionalPayload implements the action optional payload DSL. The function works identically to the
Payload DSL except it sets a bit in the action definition to denote that the payload is not
required. Example:


	OptionalPayload(BottlePayload)		// Request payload is described by the BottlePayload type and is optional



## <a name="Origin">func</a> [Origin](/src/target/api.go?s=5801:5839#L165)
``` go
func Origin(origin string, dsl func())
```
Origin defines the CORS policy for a given origin. The origin can use a wildcard prefix
such as "https://*.mydomain.com". The special value "*" defines the policy for all origins
(in which case there should be only one Origin DSL in the parent resource).
The origin can also be a regular expression wrapped into "/".
Example:


	Origin("<a href="https://swagger.goa.design">https://swagger.goa.design</a>", func() { // Define CORS policy, may be prefixed with "*" wildcard
	        Headers("X-Shared-Secret")           // One or more authorized headers, use "*" to authorize all
	        Methods("GET", "POST")               // One or more authorized HTTP methods
	        Expose("X-Time")                     // One or more headers exposed to clients
	        MaxAge(600)                          // How long to cache a prefligh request response
	        Credentials()                        // Sets Access-Control-Allow-Credentials header
	})
	
	Origin("/(api|swagger)[.]goa[.]design/", func() {}) // Define CORS policy with a regular expression



## <a name="PATCH">func</a> [PATCH](/src/target/action.go?s=7413:7475#L218)
``` go
func PATCH(path string, dsl ...func()) *design.RouteDefinition
```
PATCH creates a route using the PATCH HTTP method.



## <a name="POST">func</a> [POST](/src/target/action.go?s=5729:5790#L152)
``` go
func POST(path string, dsl ...func()) *design.RouteDefinition
```
POST creates a route using the POST HTTP method.



## <a name="PUT">func</a> [PUT](/src/target/action.go?s=6002:6062#L163)
``` go
func PUT(path string, dsl ...func()) *design.RouteDefinition
```
PUT creates a route using the PUT HTTP method.



## <a name="Package">func</a> [Package](/src/target/api.go?s=12074:12099#L410)
``` go
func Package(path string)
```
Package sets the Go package path to the encoder or decoder. It must be used inside a
Consumes or Produces DSL.



## <a name="Param">func</a> [Param](/src/target/attribute.go?s=7561:7605#L274)
``` go
func Param(name string, args ...interface{})
```
Param can be used in: Params

Param is an alias of Attribute.



## <a name="Params">func</a> [Params](/src/target/action.go?s=11413:11436#L336)
``` go
func Params(dsl func())
```
Params describe the action parameters, either path parameters identified via wildcards or query
string parameters if there is no corresponding path parameter. Each parameter is described via
the Param function which uses the same DSL as the Attribute DSL. Here is an example:


	Params(func() {
		Param("id", Integer)		// A path parameter defined using e.g. GET("/:id")
		Param("sort", String, func() {	// A query string parameter
			Enum("asc", "desc")
		})
	})

Params can be used inside Action to define the action parameters, Resource to define common
parameters to all the resource actions or API to define common parameters to all the API actions.

If Params is used inside Resource or Action then the resource base media type attributes provide
default values for all the properties of params with identical names. For example:


	var BottleMedia = MediaType("application/vnd.bottle", func() {
	    Attributes(func() {
	        Attribute("name", String, "The name of the bottle", func() {
	            MinLength(2) // BottleMedia has one attribute "name" which is a
	                         // string that must be at least 2 characters long.
	        })
	    })
	    View("default", func() {
	        Attribute("name")
	    })
	})
	
	var _ = Resource("Bottle", func() {
	    DefaultMedia(BottleMedia) // Resource "Bottle" uses "BottleMedia" as default
	    Action("show", func() {   // media type.
	        Routing(GET("/:name"))
	        Params(func() {
	            Param("name") // inherits type, description and validation from
	                          // BottleMedia "name" attribute
	        })
	    })
	})



## <a name="Parent">func</a> [Parent](/src/target/resource.go?s=4943:4964#L110)
``` go
func Parent(p string)
```
Parent sets the resource parent. The parent resource is used to compute the path to the resource
actions as well as resource collection item hrefs. See Resource.



## <a name="PasswordFlow">func</a> [PasswordFlow](/src/target/security.go?s=9844:9878#L346)
``` go
func PasswordFlow(tokenURL string)
```
PasswordFlow defines a "password" OAuth2 flow.  Use within an OAuth2Security definition.



## <a name="Pattern">func</a> [Pattern](/src/target/attribute.go?s=13457:13479#L456)
``` go
func Pattern(p string)
```
Pattern can be used in: Attribute, Header, Param, HashOf, ArrayOf

Pattern adds a "pattern" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor33">https://json-schema.org/latest/json-schema-validation.html#anchor33</a>.



## <a name="Payload">func</a> [Payload](/src/target/action.go?s=12934:12977#L378)
``` go
func Payload(p interface{}, dsls ...func())
```
Payload implements the action payload DSL. An action payload describes the HTTP request body
data structure. The function accepts either a type or a DSL that describes the payload members
using the Member DSL which accepts the same syntax as the Attribute DSL. This function can be
called passing in a type, a DSL or both. Examples:


	Payload(BottlePayload)		// Request payload is described by the BottlePayload type
	
	Payload(func() {		// Request payload is an object and is described inline
		Member("Name")
	})
	
	Payload(BottlePayload, func() {	// Request payload is described by merging the inline
		Required("Name")	// definition into the BottlePayload type.
	})



## <a name="Produces">func</a> [Produces](/src/target/api.go?s=10783:10817#L364)
``` go
func Produces(args ...interface{})
```
Produces adds a MIME type to the list of MIME types the APIs can encode responses with.
Produces may also specify the path of the encoding package.
The package must expose a EncoderFactory method that returns an object which implements
goa.EncoderFactory.



## <a name="Query">func</a> [Query](/src/target/security.go?s=8475:8507#L305)
``` go
func Query(parameterName string)
```
Query defines that an APIKeySecurity or JWTSecurity implementation must check in the query
parameter named "parameterName" to get the api key.



## <a name="ReadOnly">func</a> [ReadOnly](/src/target/attribute.go?s=9224:9239#L326)
``` go
func ReadOnly()
```
ReadOnly can be used in: Attribute
ReadOnly sets the readOnly property of an attribute to true. It is used when attributes are computed in the API and
are not expected from the client



## <a name="Reference">func</a> [Reference](/src/target/media_type.go?s=6558:6591#L181)
``` go
func Reference(t design.DataType)
```
Reference sets a type or media type reference. The value itself can be a type or a media type.
The reference type attributes define the default properties for attributes with the same name in
the type using the reference. So for example if a type is defined as such:


	var Bottle = Type("bottle", func() {
		Attribute("name", func() {
			MinLength(3)
		})
		Attribute("vintage", Integer, func() {
			Minimum(1970)
		})
		Attribute("somethingelse")
	})

Declaring the following media type:


	var BottleMedia = MediaType("vnd.goa.bottle", func() {
		Reference(Bottle)
		Attributes(func() {
			Attribute("id", Integer)
			Attribute("name")
			Attribute("vintage")
		})
	})

defines the "name" and "vintage" attributes with the same type and validations as defined in
the Bottle type.



## <a name="Required">func</a> [Required](/src/target/attribute.go?s=17462:17492#L576)
``` go
func Required(names ...string)
```
Required can be used in: Attributes, Headers, Payload, Type, Params

Required adds a "required" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor61">https://json-schema.org/latest/json-schema-validation.html#anchor61</a>.



## <a name="Resource">func</a> [Resource](/src/target/resource.go?s=2764:2829#L49)
``` go
func Resource(name string, dsl func()) *design.ResourceDefinition
```
Resource implements the resource definition dsl. There is one resource definition per resource
exposed by the API. The resource dsl allows setting the resource default media type. This media
type is used to render the response body of actions that return the OK response (unless the
action overrides the default). The default media type also sets the properties of the request
payload attributes with the same name. See DefaultMedia.

The resource dsl also allows listing the supported resource collection and resource collection
item actions. Each action corresponds to a specific API endpoint. See Action.

The resource dsl can also specify a parent resource. Parent resources have two effects.
First, they set the prefix of all resource action paths to the parent resource href. Note that
actions can override the path using an absolute path (that is a path starting with "//").
Second, goa uses the parent resource href coupled with the resource BasePath if any to build
hrefs to the resource collection or resource collection items. By default goa uses the show
action if present to compute a resource href (basically concatenating the parent resource href
with the base path and show action path). The resource definition may specify a canonical action
via CanonicalActionName to override that default. Here is an example of a resource definition:


	Resource("bottle", func() {
		Description("A wine bottle")	// Resource description
		DefaultMedia(BottleMedia)	// Resource default media type
		BasePath("/bottles")		// Common resource action path prefix if not ""
		Parent("account")		// Name of parent resource if any
		CanonicalActionName("get")	// Name of action that returns canonical representation if not "show"
		UseTrait("Authenticated")	// Included trait if any, can appear more than once
	
		Origin("<a href="https://swagger.goa.design">https://swagger.goa.design</a>", func() { // Define CORS policy, may be prefixed with "*" wildcard
			Headers("X-Shared-Secret")           // One or more authorized headers, use "*" to authorize all
			Methods("GET", "POST")               // One or more authorized HTTP methods
			Expose("X-Time")                     // One or more headers exposed to clients
			MaxAge(600)                          // How long to cache a prefligh request response
			Credentials()                        // Sets Access-Control-Allow-Credentials header
		})
	
		Response(Unauthorized, ErrorMedia) // Common responses to all actions
		Response(BadRequest, ErrorMedia)
	
		Action("show", func() {		// Action definition, can appear more than once
			// ... Action dsl
		})
	})



## <a name="Response">func</a> [Response](/src/target/response.go?s=3470:3525#L73)
``` go
func Response(name string, paramsAndDSL ...interface{})
```
Response implements the response definition DSL. Response takes the name of the response as
first parameter. goa defines all the standard HTTP status name as global variables so they can be
readily used as response names. The response body data type can be specified as second argument.
If a type is specified it overrides any type defined by in the response media type. Response also
accepts optional arguments that correspond to the arguments defined by the corresponding response
template (the response template with the same name) if there is one, see ResponseTemplate.

A response may also optionally use an anonymous function as last argument to specify the response
status code, media type and headers overriding what the default response or response template
specifies:


	Response(OK, "text/plain")              // OK response template accepts one argument:
	                                        // the media type identifier
	
	Response(OK, BottleMedia)               // or a media type defined in the design
	
	Response(OK, "application/vnd.bottle")  // optionally referred to by identifier
	
	Response(OK, func() {
	        Media("application/vnd.bottle") // Alternatively media type is set with Media
	})
	
	Response(OK, BottleMedia, func() {
	        Headers(func() {                // Headers list the response HTTP headers
	                Header("X-Request-Id")  // Header syntax is identical to Attribute's
	        })
	})
	
	Response(OK, BottleMedia, func() {
	        Status(201)                     // Set response status (overrides template's)
	})
	
	Response("MyResponse", func() {         // Define custom response (using no template)
	        Description("This is my response")
	        Media(BottleMedia)
	        Headers(func() {
	                Header("X-Request-Id", func() {
	                        Pattern("[a-f0-9]+")
	                })
	        })
	        Status(200)
	})

goa defines a default response template for all the HTTP status code. The default template simply sets
the status code. So if an action can return NotFound for example all it has to do is specify
Response(NotFound) - there is no need to specify the status code as the default response already
does it, in other words:


	Response(NotFound)

is equivalent to:


	Response(NotFound, func() {
		Status(404)
	})

goa also defines a default response template for the OK response which takes a single argument:
the identifier of the media type used to render the response. The API DSL can define additional
response templates or override the default OK response template using ResponseTemplate.

The media type identifier specified in a response definition via the Media function can be
"generic" such as "text/plain" or "application/json" or can correspond to the identifier of a
media type defined in the API DSL. In this latter case goa uses the media type definition to
generate helper response methods. These methods know how to render the views defined on the media
type and run the validations defined in the media type during rendering.



## <a name="ResponseTemplate">func</a> [ResponseTemplate](/src/target/api.go?s=13910:13959#L451)
``` go
func ResponseTemplate(name string, p interface{})
```
ResponseTemplate defines a response template that action definitions can use to describe their
responses. The template may specify the HTTP response status, header specification and body media
type. The template consists of a name and an anonymous function. The function is called when an
action uses the template to define a response. Response template functions accept string
parameters they can use to define the response fields. Here is an example of a response template
definition that uses a function with one argument corresponding to the name of the response body
media type:


	ResponseTemplate(OK, func(mt string) {
		Status(200)				// OK response uses status code 200
		Media(mt)				// Media type name set by action definition
		Headers(func() {
			Header("X-Request-Id", func() {	// X-Request-Id header contains a string
				Pattern("[0-9A-F]+")	// Regexp used to validate the response header content
			})
			Required("X-Request-Id")	// Header is mandatory
		})
	})

This template can the be used by actions to define the OK response as follows:


	Response(OK, "vnd.goa.example")

goa comes with a set of predefined response templates (one per standard HTTP status code). The
OK template is the only one that accepts an argument. It is used as shown in the example above to
set the response media type. Other predefined templates do not use arguments. ResponseTemplate
makes it possible to define additional response templates specific to the API.



## <a name="Routing">func</a> [Routing](/src/target/action.go?s=4954:5001#L120)
``` go
func Routing(routes ...*design.RouteDefinition)
```
Routing lists the action route. Each route is defined with a function named after the HTTP method.
The route function takes the path as argument. Route paths may use wildcards as described in the
[httptreemux](<a href="https://godoc.org/github.com/dimfeld/httptreemux">https://godoc.org/github.com/dimfeld/httptreemux</a>) package documentation. These
wildcards define parameters using the `:name` or `*name` syntax where `:name` matches a path
segment and `*name` is a catch-all that matches the path until the end.



## <a name="Scheme">func</a> [Scheme](/src/target/api.go?s=7829:7856#L248)
``` go
func Scheme(vals ...string)
```
Scheme sets the API URL schemes.



## <a name="Scope">func</a> [Scope](/src/target/security.go?s=7225:7264#L261)
``` go
func Scope(name string, desc ...string)
```
Scope defines an authorization scope. Used within SecurityScheme, a description may be provided
explaining what the scope means. Within a Security block, only a scope is needed.



## <a name="Security">func</a> [Security](/src/target/security.go?s=807:855#L22)
``` go
func Security(scheme interface{}, dsl ...func())
```
Security defines an authentication requirements to access a goa Action.  When defined on a
Resource, it applies to all Actions, unless overriden by individual actions.  When defined at the
API level, it will apply to all resources by default, following the same logic.

The scheme refers to previous definitions of either OAuth2Security, BasicAuthSecurity,
APIKeySecurity or JWTSecurity.  It can be a string, corresponding to the first parameter of
those definitions, or a SecuritySchemeDefinition, returned by those same functions. Examples:


	Security(BasicAuth)
	
	Security("oauth2", func() {
	    Scope("api:read")  // Requires "api:read" oauth2 scope
	})



## <a name="Status">func</a> [Status](/src/target/response.go?s=4682:4705#L115)
``` go
func Status(status int)
```
Status sets the Response status.



## <a name="TRACE">func</a> [TRACE](/src/target/action.go?s=6847:6909#L196)
``` go
func TRACE(path string, dsl ...func()) *design.RouteDefinition
```
TRACE creates a route using the TRACE HTTP method.



## <a name="TermsOfService">func</a> [TermsOfService](/src/target/api.go?s=7305:7338#L226)
``` go
func TermsOfService(terms string)
```
TermsOfService describes the API terms of services or links to them.



## <a name="Title">func</a> [Title](/src/target/api.go?s=16256:16278#L528)
``` go
func Title(val string)
```
Title sets the API title used by generated documentation, JSON Hyper-schema, code comments etc.



## <a name="TokenURL">func</a> [TokenURL](/src/target/security.go?s=10897:10927#L373)
``` go
func TokenURL(tokenURL string)
```
TokenURL defines a URL to get an access token.  If you are defining OAuth2 flows, use
`ImplicitFlow`, `PasswordFlow`, `AccessCodeFlow` or `ApplicationFlow` instead. This will set an
endpoint where you can obtain a JWT with the JWTSecurity scheme. The URL may be a complete URL
or just a path in which case the API scheme and host are used to build the full URL.



## <a name="Trait">func</a> [Trait](/src/target/api.go?s=16482:16520#L536)
``` go
func Trait(name string, val ...func())
```
Trait defines an API trait. A trait encapsulates arbitrary DSL that gets executed wherever the
trait is called via the UseTrait function.



## <a name="Type">func</a> [Type](/src/target/type.go?s=1127:1188#L30)
``` go
func Type(name string, dsl func()) *design.UserTypeDefinition
```
Type implements the type definition dsl. A type definition describes a data structure consisting
of attributes. Each attribute has a type which can also refer to a type definition (or use a
primitive type or nested attibutes). The dsl syntax for define a type definition is the
Attribute dsl, see Attribute.

On top of specifying any attribute type, type definitions can also be used to describe the data
structure of a request payload. They can also be used by media type definitions as reference, see
Reference. Here is an example:


	Type("createPayload", func() {
		Description("Type of create and upload action payloads")
		Attribute("name", String, "name of bottle")
		Attribute("origin", Origin, "Details on wine origin")  // See Origin definition below
		Required("name")
	})
	
	var Origin = Type("origin", func() {
		Description("Origin of bottle")
		Attribute("Country")
	})

This function returns the newly defined type so the value can be used throughout the dsl.



## <a name="TypeName">func</a> [TypeName](/src/target/media_type.go?s=7134:7160#L198)
``` go
func TypeName(name string)
```
TypeName can be used in: MediaType

TypeName makes it possible to set the Go struct name for a media type in the
generated code. By default goagen uses the identifier to compute a valid Go
identifier. This function makes it possible to override that and provide a
custom name. name must be a valid Go identifier.



## <a name="URL">func</a> [URL](/src/target/api.go?s=9785:9805#L335)
``` go
func URL(url string)
```
URL can be used in: Contact, License, Docs

URL sets the contact, license, or Docs URL.



## <a name="UseTrait">func</a> [UseTrait](/src/target/api.go?s=17283:17313#L560)
``` go
func UseTrait(names ...string)
```
UseTrait executes the API trait with the given name. UseTrait can be used inside a Resource,
Action, Type, MediaType or Attribute DSL.  UseTrait takes a variable number
of trait names.



## <a name="Version">func</a> [Version](/src/target/api.go?s=3023:3047#L92)
``` go
func Version(ver string)
```
Version specifies the API version. One design describes one version.



## <a name="View">func</a> [View](/src/target/media_type.go?s=8390:8430#L238)
``` go
func View(name string, apidsl ...func())
```
View can be used in: MediaType, Response

View adds a new view to a media type. A view has a name and lists attributes that are
rendered when the view is used to produce a response. The attribute names must appear in the
media type definition. If an attribute is itself a media type then the view may specify which
view to use when rendering the attribute using the View function in the View apidsl. If not
specified then the view named "default" is used. Examples:


	View("default", func() {
		Attribute("id")		// "id" and "name" must be media type attributes
		Attribute("name")
	})
	
	View("extended", func() {
		Attribute("id")
		Attribute("name")
		Attribute("origin", func() {
			View("extended")	// Use view "extended" to render attribute "origin"
		})
	})








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
