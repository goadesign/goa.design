+++
title="goa/design/apidsl"
description="godoc for goa/design/apidsl"
categories=["godoc"]
tags=["godoc","apidsl"]
+++

# apidsl
    import "github.com/goadesign/goa/design/apidsl"

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




## Constants
``` go
const (
    Continue           = "Continue"
    SwitchingProtocols = "SwitchingProtocols"

    OK                   = "OK"
    Created              = "Created"
    Accepted             = "Accepted"
    NonAuthoritativeInfo = "NonAuthoritativeInfo"
    NoContent            = "NoContent"
    ResetContent         = "ResetContent"
    PartialContent       = "PartialContent"

    MultipleChoices   = "MultipleChoices"
    MovedPermanently  = "MovedPermanently"
    Found             = "Found"
    SeeOther          = "SeeOther"
    NotModified       = "NotModified"
    UseProxy          = "UseProxy"
    TemporaryRedirect = "TemporaryRedirect"

    BadRequest                   = "BadRequest"
    Unauthorized                 = "Unauthorized"
    PaymentRequired              = "PaymentRequired"
    Forbidden                    = "Forbidden"
    NotFound                     = "NotFound"
    MethodNotAllowed             = "MethodNotAllowed"
    NotAcceptable                = "NotAcceptable"
    ProxyAuthRequired            = "ProxyAuthRequired"
    RequestTimeout               = "RequestTimeout"
    Conflict                     = "Conflict"
    Gone                         = "Gone"
    LengthRequired               = "LengthRequired"
    PreconditionFailed           = "PreconditionFailed"
    RequestEntityTooLarge        = "RequestEntityTooLarge"
    RequestURITooLong            = "RequestURITooLong"
    UnsupportedMediaType         = "UnsupportedMediaType"
    RequestedRangeNotSatisfiable = "RequestedRangeNotSatisfiable"
    ExpectationFailed            = "ExpectationFailed"
    Teapot                       = "Teapot"
    UnprocessableEntity          = "UnprocessableEntity"

    InternalServerError     = "InternalServerError"
    NotImplemented          = "NotImplemented"
    BadGateway              = "BadGateway"
    ServiceUnavailable      = "ServiceUnavailable"
    GatewayTimeout          = "GatewayTimeout"
    HTTPVersionNotSupported = "HTTPVersionNotSupported"
)
```
List of all built-in response names.


## Variables
``` go
var SupportedValidationFormats = []string{
    "cidr",
    "date-time",
    "email",
    "hostname",
    "ipv4",
    "ipv6",
    "mac",
    "regexp",
    "uri",
}
```
SupportedValidationFormats lists the supported formats for use with the
Format DSL.


## func API
``` go
func API(name string, dsl func()) *design.APIDefinition
```
API implements the top level API DSL. It defines the API name, default description and other
default global property values for all API versions. Here is an example showing all the possible
API sub-definitions:


	API("API name", func() {
		Title("title")				// API title used in documentation
		Description("description")		// API description used in documentation
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
		BaseParams(func() {			// Common parameters to all API actions
			Param("param")
		})
		Consumes("application/xml", "text/xml", func() {
			Package("github.com/raphael/goa-middleware/encoding/xml")
		})
		Consumes("application/json")
		Produces("application/vnd.golang.gob", func() {
			Package("github.com/raphael/goa-middleware/encoding/gob")
		})
		Produces("application/json")
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
		Trait("Authenticated", func() {		// Traits define DSL that can be run anywhere
			Headers(func() {
				Header("header")
				Required("header")
			})
		})
	}


## func APIVersion
``` go
func APIVersion(versions ...string)
```
APIVersion define the API version(s) that expose this resource.


## func Action
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
			PUT("/:id"),				// Full action path is built by appending "/:id" to parent resource base path
			PUT("//orgs/:org/accounts/:id"),	// The // prefix indicates an absolute path
		)
		Params(func() {					// Params describe the action parameters
			Param("org", String)			// Parameters may correspond to path wildcards
			Param("id", Integer)
			Param("sort", func() {			// or URL query string values.
				Enum("asc", "desc")
			})
		})
		Headers(func() {				// Headers describe relevant action headers
			Header("Authorization", String)
			Header("X-Account", Integer)
			Required("Authorization", "X-Account")
		})
		Payload(UpdatePayload)				// Payload describes the HTTP request body (here using a type)
		Response(NoContent)				// Each possible HTTP response is described via Response
		Response(NotFound)
	})


## func ArrayOf
``` go
func ArrayOf(t design.DataType) *design.Array
```
ArrayOf creates an array type from its element type. The result can be used anywhere a type can.
Examples:


	var Bottle = Type("bottle", func() {
		Attribute("name")
	})
	
	var Bottles = ArrayOf(Bottle)
	
	Action("update", func() {
		Params(func() {
			Param("ids", ArrayOf(Integer))
		})
		Payload(ArrayOf(Bottle))  // Equivalent to Payload(Bottles)
	})

If you are looking to return a collection of elements in a Response
clause, refer to CollectionOf.  ArrayOf creates a type, where
CollectionOf creates a media type.


## func Attribute
``` go
func Attribute(name string, args ...interface{})
```
Attribute implements the attribute definition DSL. An attribute describes a data structure
recursively. Attributes are used for describing request headers, parameters and payloads -
response bodies and headers - media types and types. An attribute definition is recursive:
attributes may include other attributes. At the basic level an attribute has a name,
a type and optionally a default value and validation rules. The type of an attribute can be one of:

* The primitive types Boolean, Integer, Number or String.

* A type defined via the Type function.

* A media type defined via the MediaType function.

* An object described recursively with child attributes.

* An array defined using the ArrayOf function.

* An hashmap defined using the HashOf function.

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


## func Attributes
``` go
func Attributes(dsl func())
```
Attributes implements the media type attributes dsl. See MediaType.


## func BaseParams
``` go
func BaseParams(dsl func())
```
BaseParams defines the API base path parameters. These parameters may correspond to wildcards in
the BasePath or URL query string values.
The DSL for describing each Param is the Attribute DSL.


## func BasePath
``` go
func BasePath(val string)
```
BasePath defines the API base path, i.e. the common path prefix to all the API actions.
The path may define wildcards (see Routing for a description of the wildcard syntax).
The corresponding parameters must be described using BaseParams.


## func CONNECT
``` go
func CONNECT(path string) *design.RouteDefinition
```
CONNECT creates a route using the GET HTTP method.


## func CanonicalActionName
``` go
func CanonicalActionName(a string)
```
CanonicalActionName sets the name of the action used to compute the resource collection and
resource collection items hrefs. See Resource.


## func CollectionOf
``` go
func CollectionOf(v interface{}, dsl ...func()) *design.MediaTypeDefinition
```
CollectionOf creates a collection media type from its element media type. A collection media
type represents the content of responses that return a collection of resources such as "list"
actions. This function can be called from any place where a media type can be used.
The resulting media type identifier is built from the element media type by appending the media
type parameter "type" with value "collection".


## func Consumes
``` go
func Consumes(args ...interface{})
```
Consumes adds a MIME type to the list of MIME types the APIs supports when accepting requests.
Consumes may also specify the path of the decoding package.
The package must expose a DecoderFactory method that returns an object which implements
goa.DecoderFactory.


## func Contact
``` go
func Contact(dsl func())
```
Contact sets the API contact information.


## func DELETE
``` go
func DELETE(path string) *design.RouteDefinition
```
DELETE creates a route using the DELETE HTTP method.


## func Default
``` go
func Default(def interface{})
```
Default sets the default value for an attribute.


## func DefaultMedia
``` go
func DefaultMedia(val interface{})
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
properties of attributes listed in action payloads. So if a media type defines an attribute
"name" with associated validations then simply calling Attribute("name") inside a request
Payload defines the payload attribute with the same type and validations.


## func Description
``` go
func Description(d string)
```
Description sets the definition description.
Description can be called inside API, Resource, Action or MediaType.


## func Docs
``` go
func Docs(dsl func())
```
Docs provides external documentation pointers.


## func Email
``` go
func Email(email string)
```
Email sets the contact email.


## func Enum
``` go
func Enum(val ...interface{})
```
Enum adds a "enum" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor76">http://json-schema.org/latest/json-schema-validation.html#anchor76</a>.


## func Format
``` go
func Format(f string)
```
Format adds a "format" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor104">http://json-schema.org/latest/json-schema-validation.html#anchor104</a>.
The formats supported by goa are:

"date-time": RFC3339 date time

"email": RFC5322 email address

"hostname": RFC1035 internet host name

"ipv4" and "ipv6": RFC2373 IPv4 and IPv6 address

"uri": RFC3986 URI

"mac": IEEE 802 MAC-48, EUI-48 or EUI-64 MAC address

"cidr": RFC4632 or RFC4291 CIDR notation IP address

"regexp": RE2 regular expression


## func GET
``` go
func GET(path string) *design.RouteDefinition
```
GET creates a route using the GET HTTP method.


## func HEAD
``` go
func HEAD(path string) *design.RouteDefinition
```
HEAD creates a route using the HEAD HTTP method.


## func HashOf
``` go
func HashOf(k, v design.DataType) *design.Hash
```
HashOf creates a hash map from its key and element types. The result can be used anywhere a type
can. Examples:


	var Bottle = Type("bottle", func() {
		Attribute("name")
	})
	
	var RatedBottles = HashOf(String, Bottle)
	
	Action("updateRatings", func() {
		Payload(func() {
			Member("ratings", HashOf(String, Integer))  // Artificial examples...
			Member("bottles", RatedBottles)
	})


## func Header
``` go
func Header(name string, args ...interface{})
```
Header is an alias of Attribute.


## func Headers
``` go
func Headers(dsl func())
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


## func Host
``` go
func Host(host string)
```
Host sets the API hostname.


## func InitDesign
``` go
func InitDesign()
```
InitDesign initializes the Design global variable and loads the built-in
response templates. This is a public function mainly so it can be used in tests.


## func License
``` go
func License(dsl func())
```
License sets the API license information.


## func Link
``` go
func Link(name string, view ...string)
```
Link adds a link to a media type. At the minimum a link has a name corresponding to one of the
media type attribute names. A link may also define the view used to render the linked-to
attribute. The default view used to render links is "link". Examples:


	Link("origin")		// Use the "link" view of the "origin" attribute
	Link("account", "tiny")	// Use the "tiny" view of the "account" attribute


## func Links
``` go
func Links(dsl func())
```
Links implements the media type links dsl. See MediaType.


## func MaxLength
``` go
func MaxLength(val int)
```
MaxLength adss a "maxItems" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor42">http://json-schema.org/latest/json-schema-validation.html#anchor42</a>.


## func Maximum
``` go
func Maximum(val interface{})
```
Maximum adds a "maximum" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor17">http://json-schema.org/latest/json-schema-validation.html#anchor17</a>.


## func Media
``` go
func Media(val interface{})
```
Media sets a response media type by name or by reference using a value returned by MediaType:


	Response("NotFound", func() {
		Status(404)
		Media("application/json")
	})

Media can be used inside Response or ResponseTemplate.


## func MediaType
``` go
func MediaType(identifier string, dsl func()) *design.MediaTypeDefinition
```
MediaType implements the media type definition dsl. A media type definition describes the
representation of a resource used in a response body. This includes listing all the *potential*
resource attributes that can appear in the body. Views specify which of the attributes are
actually rendered so that the same media type definition may represent multiple rendering of a
given resource representation.

All media types must define a view named "default". This view is used to render the media type in
response bodies when no other view is specified.

A media type definition may also define links to other media types. This is done by first
defining an attribute for the linked-to media type and then referring to that attribute in the
Links dsl. Views may then elect to render one or the other or both. Links are rendered using the
special "link" view. Media types that are linked to must define that view. Here is an example
showing all the possible media type sub-definitions:


	MediaType("application/vnd.goa.example.bottle", func() {
		Description("A bottle of wine")
		APIVersion("1.0")
		TypeName("BottleMedia") 		// Optionally override the default generated name
		Attributes(func() {
			Attribute("id", Integer, "ID of bottle")
			Attribute("href", String, "API href of bottle")
			Attribute("account", Account, "Owner account")
			Attribute("origin", Origin, "Details on wine origin")
			Links(func() {
				Link("account")		// Defines a link to the Account media type
				Link("origin", "tiny")	// Overrides the default view used to render links
			})
			Required("id", "href")
		})
		View("default", func() {
			Attribute("id")
			Attribute("href")
			Attribute("links")	// Default view renders links
		})
		View("extended", func() {
			Attribute("id")
			Attribute("href")
			Attribute("account")	// Extended view renders account inline
			Attribute("origin")	// Extended view renders origin inline
			Attribute("links")	// Extended view also renders links
		})
	})

This function returns the media type definition so it can be referred to throughout the dsl.


## func Member
``` go
func Member(name string, args ...interface{})
```
Member is an alias of Attribute.


## func Metadata
``` go
func Metadata(name string, value ...string)
```
Metadata is a set of key/value pairs that can be assigned
to an object. Each value consists of a slice of stirngs so
that multiple invocation of the Metadata function on the
same target using the same key builds up the slice.

While keys can have any value the following names are
handled explicitly by goagen:

"struct:tag=xxx": sets the struct field tag xxx on generated structs.


	Overrides tags that goagen would otherwise set.
	If the metadata value is a slice then the
	strings are joined with the space character as
	separator.

"swagger:tag=xxx": sets the Swagger object field tag xxx. The value


	must be one to three strings. The first string is
	the tag description while the second and third strings
	are the documentation url and description for the tag.
	Subsequent calls to Metadata on the same attribute
	with key "swagger:tag" builds up the Swagger tag list.

Usage:


	Metadata("struct:tag=json", "myName,omitempty")
	Metadata("struct:tag=xml", "myName,attr")
	Metadata("swagger:tag=backend")


## func MinLength
``` go
func MinLength(val int)
```
MinLength adss a "minItems" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor45">http://json-schema.org/latest/json-schema-validation.html#anchor45</a>.


## func Minimum
``` go
func Minimum(val interface{})
```
Minimum adds a "minimum" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor21">http://json-schema.org/latest/json-schema-validation.html#anchor21</a>.


## func Name
``` go
func Name(name string)
```
Name sets the contact or license name.


## func PATCH
``` go
func PATCH(path string) *design.RouteDefinition
```
PATCH creates a route using the PATCH HTTP method.


## func POST
``` go
func POST(path string) *design.RouteDefinition
```
POST creates a route using the POST HTTP method.


## func PUT
``` go
func PUT(path string) *design.RouteDefinition
```
PUT creates a route using the PUT HTTP method.


## func Package
``` go
func Package(path string)
```
Package sets the Go package path to the encoder or decoder. It must be used inside a
Consumes or Produces DSL.


## func Param
``` go
func Param(name string, args ...interface{})
```
Param is an alias of Attribute.


## func Params
``` go
func Params(dsl func())
```
Params describe the action parameters, either path parameters identified via wildcards or query
string parameters. Each parameter is described via the `Param` function which uses the same DSL
as the Attribute DSL. Here is an example:


	Params(func() {
		Param("id", Integer)		// A path parameter defined using e.g. GET("/:id")
		Param("sort", String, func() {	// A query string parameter
			Enum("asc", "desc")
		})
	})

Params can be used inside Action to define the action parameters or Resource to define common
parameters to all the resource actions.


## func Parent
``` go
func Parent(p string)
```
Parent sets the resource parent. The parent resource is used to compute the path to the resource
actions as well as resource collection item hrefs. See Resource.


## func Pattern
``` go
func Pattern(p string)
```
Pattern adds a "pattern" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor33">http://json-schema.org/latest/json-schema-validation.html#anchor33</a>.


## func Payload
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


## func Produces
``` go
func Produces(args ...interface{})
```
Produces adds a MIME type to the list of MIME types the APIs can encode responses with.
Produces may also specify the path of the encoding package.
The package must expose a EncoderFactory method that returns an object which implements
goa.EncoderFactory.


## func Reference
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


## func Required
``` go
func Required(names ...string)
```
Required adds a "required" validation to the attribute.
See <a href="http://json-schema.org/latest/json-schema-validation.html#anchor61">http://json-schema.org/latest/json-schema-validation.html#anchor61</a>.


## func Resource
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
		APIVersion("v1")		// API version exposing this resource, can appear more than once.
	
		Action("show", func() {		// Action definition, can appear more than once
			// ... Action dsl
		})
	})


## func Response
``` go
func Response(name string, paramsAndDSL ...interface{})
```
Response implements the response definition DSL. Response takes the name of the response as
first parameter. goa defines all the standard HTTP status name as global variables so they can be
readily used as response names. Response also accepts optional arguments that correspond to the
arguments defined by the corresponding response template (the response template with the same
name) if there is one, see ResponseTemplate.

A response may also optionally use an anonymous function as last argument to specify the response
status code, media type and headers overriding what the default response or response template
specifies:


	Response(OK, "vnd.goa.bottle", func() {	// OK response template accepts one argument: the media type identifier
		Headers(func() {		// Headers list the response HTTP headers, see Headers
			Header("X-Request-Id")
		})
	})
	
	Response(NotFound, func() {
		Status(404)			// Not necessary as defined by default NotFound response.
		Media("application/json")	// Override NotFound response default of "text/plain"
	})
	
	Response(Created, func() {
		Media(BottleMedia)
	})

goa defines a default response for all the HTTP status code. The default response simply sets
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


## func ResponseTemplate
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


## func Routing
``` go
func Routing(routes ...*design.RouteDefinition)
```
Routing lists the action route. Each route is defined with a function named after the HTTP method.
The route function takes the path as argument. Route paths may use wildcards as described in the
[httprouter](<a href="https://godoc.org/github.com/julienschmidt/httprouter">https://godoc.org/github.com/julienschmidt/httprouter</a>) package documentation. These
wildcards define parameters using the `:name` or `*name` syntax where `:name` matches a path
segment and `*name` is a catch-all that matches the path until the end.


## func Scheme
``` go
func Scheme(vals ...string)
```
Scheme sets the API URL schemes.


## func Status
``` go
func Status(status int)
```
Status sets the Response status.


## func TRACE
``` go
func TRACE(path string) *design.RouteDefinition
```
TRACE creates a route using the TRACE HTTP method.


## func TermsOfService
``` go
func TermsOfService(terms string)
```
TermsOfService describes the API terms of services or links to them.


## func Title
``` go
func Title(val string)
```
Title sets the API title used by generated documentation, JSON Hyper-schema, code comments etc.


## func Trait
``` go
func Trait(name string, val ...func())
```
Trait defines an API trait. A trait encapsulates arbitrary DSL that gets executed wherever the
trait is called via the UseTrait function.


## func Type
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
		APIVersion("1.0")
		Attribute("name", String, "name of bottle")
		Attribute("origin", Origin, "Details on wine origin")  // See Origin definition below
		Required("name")
	})
	
	var Origin = Type("origin", func() {
		Description("Origin of bottle")
		Attribute("Country")
	})

This function returns the newly defined type so the value can be used throughout the dsl.


## func TypeName
``` go
func TypeName(name string)
```
TypeName makes it possible to set the Go struct name for a type or media type in the generated
code. By default goagen uses the name (type) or identifier (media type) given in the dsl and
computes a valid Go identifier from it. This function makes it possible to override that and
provide a custom name. name must be a valid Go identifier.


## func URL
``` go
func URL(url string)
```
URL sets the contact or license URL.


## func UseTrait
``` go
func UseTrait(name string)
```
UseTrait executes the API trait with the given name. UseTrait can be used inside a Resource,
Action or Attribute DSL.


## func Version
``` go
func Version(ver string, dsl func()) *design.APIVersionDefinition
```
Version is the top level design language function which defines the API global property values
for a given version. The DSL used to define the property values is identical to the one used by
the API function.


## func View
``` go
func View(name string, dsl ...func())
```
View adds a new view to a media type. A view has a name and lists attributes that are
rendered when the view is used to produce a response. The attribute names must appear in the
media type definition. If an attribute is itself a media type then the view may specify which
view to use when rendering the attribute using the View function in the View dsl. If not
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
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
