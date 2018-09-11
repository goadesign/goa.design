+++
date="2018-09-06T11:21:50-07:00"
description="github.com/goadesign/goa/http/dsl"
+++


# dsl
`import "github.com/goadesign/goa/http/dsl"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>
Package dsl implements the goa DSL used to define HTTP APIs.

The HTTP DSL adds a "HTTP" function to the DSL constructs that require HTTP
specific information. These include the API, Service, Method and Error DSLs.

For example:


	var _ = API("name", func() {
	    Description("Optional description")
	    // HTTP specific properties
	    HTTP(func() {
	        // Base path for all the API requests.
	        Path("/path")
	    })
	})

The HTTP function defines the mapping of the data type attributes used
in the generic DSL to HTTP parameters (for requests), headers and body fields.

For example:


	var _ = Service("name", func() {
	    Method("name", func() {
	        Payload(PayloadType)     // has attributes rq1, rq2, rq3 and rq4
	        Result(ResultType)       // has attributes rp1 and rp2
	        Error("name", ErrorType) // has attributes er1 and er2
	
	        HTTP(func() {
	            GET("/{rq1}")    // rq1 read from path parameter
	            Param("rq2")     // rq2 read from query string
	            Header("rq3")    // rq3 read from header
	            Body(func() {
	                Attribute("rq4") // rq4 read from body field, default
	            })
	            Response(StatusOK, func() {
	                Header("rp1")    // rp1 written to header
	                Body(func() {
	                    Attribute("rp2") // rp2 written to body field, default
	                })
	            })
	            Response(StatusBadRequest, func() {
	                Header("er1")    // er1 written to header
	                Body(func() {
	                    Attribute("er2") // er2 written to body field, default
	                })
	            })
	        })
	    })
	})

By default the payload, result and error type attributes define the request and
response body fields respectively. Any attribute that is not explicitly mapped
is used to define the request or response body. The default response status code
is 200 OK for response types other than Empty and 204 NoContent for the Empty
response type. The default response status code for errors is 400.

The example above can thus be simplified to:


	var _ = Service("name", func() {
	    Method("name", func() {
	        Payload(PayloadType)     // has attributes rq1, rq2, rq3 and rq4
	        Result(ResultType)       // has attributes rp1 and rp2
	        Error("name", ErrorType) // has attributes er1 and er2
	
	        HTTP(func() {
	            GET("/{rq1}")    // rq1 read from path parameter
	            Param("rq2")     // rq2 read from query string
	            Header("rq3")    // rq3 read from header
	            Response(StatusOK, func() {
	                Header("rp1")    // rp1 written to header
	            })
	            Response("name", StatusBadRequest, func() {
	                Header("er1")    // er1 written to header
	            })
	        })
	    })
	})




## <a name="pkg-index">Index</a>
* [func API(name string, fn func()) *design.APIExpr](#API)
* [func APIKey(scheme, name string, args ...interface{})](#APIKey)
* [func APIKeySecurity(name string, fn ...func()) *design.SchemeExpr](#APIKeySecurity)
* [func AccessToken(name string, args ...interface{})](#AccessToken)
* [func ArrayOf(v interface{}, fn ...func()) *design.Array](#ArrayOf)
* [func Attribute(name string, args ...interface{})](#Attribute)
* [func Attributes(fn func())](#Attributes)
* [func AuthorizationCodeFlow(authorizationURL, tokenURL, refreshURL string)](#AuthorizationCodeFlow)
* [func BasicAuthSecurity(name string, fn ...func()) *design.SchemeExpr](#BasicAuthSecurity)
* [func Body(args ...interface{})](#Body)
* [func CONNECT(path string) *httpdesign.RouteExpr](#CONNECT)
* [func CanonicalMethod(name string)](#CanonicalMethod)
* [func ClientCredentialsFlow(tokenURL, refreshURL string)](#ClientCredentialsFlow)
* [func Code(code int)](#Code)
* [func CollectionOf(v interface{}, adsl ...func()) *design.ResultTypeExpr](#CollectionOf)
* [func Consumes(args ...string)](#Consumes)
* [func Contact(fn func())](#Contact)
* [func ContentType(typ string)](#ContentType)
* [func ConvertTo(obj interface{})](#ConvertTo)
* [func CreateFrom(obj interface{})](#CreateFrom)
* [func DELETE(path string) *httpdesign.RouteExpr](#DELETE)
* [func Default(def interface{})](#Default)
* [func Description(d string)](#Description)
* [func Docs(fn func())](#Docs)
* [func Elem(fn func())](#Elem)
* [func Email(email string)](#Email)
* [func Enum(vals ...interface{})](#Enum)
* [func Error(name string, args ...interface{})](#Error)
* [func Example(args ...interface{})](#Example)
* [func Extend(t design.DataType)](#Extend)
* [func Fault()](#Fault)
* [func Field(tag interface{}, name string, args ...interface{})](#Field)
* [func Files(path, filename string, fns ...func())](#Files)
* [func Format(f design.ValidationFormat)](#Format)
* [func GET(path string) *httpdesign.RouteExpr](#GET)
* [func HEAD(path string) *httpdesign.RouteExpr](#HEAD)
* [func HTTP(fn func())](#HTTP)
* [func Header(name string, args ...interface{})](#Header)
* [func Headers(args interface{})](#Headers)
* [func ImplicitFlow(authorizationURL, refreshURL string)](#ImplicitFlow)
* [func JWTSecurity(name string, fn ...func()) *design.SchemeExpr](#JWTSecurity)
* [func Key(fn func())](#Key)
* [func License(fn func())](#License)
* [func MapOf(k, v interface{}, fn ...func()) *design.Map](#MapOf)
* [func MapParams(args ...interface{})](#MapParams)
* [func MaxLength(val int)](#MaxLength)
* [func Maximum(val interface{})](#Maximum)
* [func Metadata(name string, value ...string)](#Metadata)
* [func Method(name string, fn func())](#Method)
* [func MinLength(val int)](#MinLength)
* [func Minimum(val interface{})](#Minimum)
* [func MultipartRequest()](#MultipartRequest)
* [func Name(name string)](#Name)
* [func NoSecurity()](#NoSecurity)
* [func OAuth2Security(name string, fn ...func()) *design.SchemeExpr](#OAuth2Security)
* [func OPTIONS(path string) *httpdesign.RouteExpr](#OPTIONS)
* [func PATCH(path string) *httpdesign.RouteExpr](#PATCH)
* [func POST(path string) *httpdesign.RouteExpr](#POST)
* [func PUT(path string) *httpdesign.RouteExpr](#PUT)
* [func Param(name string, args ...interface{})](#Param)
* [func Params(args interface{})](#Params)
* [func Parent(name string)](#Parent)
* [func Password(name string, args ...interface{})](#Password)
* [func PasswordFlow(tokenURL, refreshURL string)](#PasswordFlow)
* [func Path(val string)](#Path)
* [func Pattern(p string)](#Pattern)
* [func Payload(val interface{}, args ...interface{})](#Payload)
* [func Produces(args ...string)](#Produces)
* [func Reference(t design.DataType)](#Reference)
* [func Required(names ...string)](#Required)
* [func Response(val interface{}, args ...interface{})](#Response)
* [func Result(val interface{}, args ...interface{})](#Result)
* [func ResultType(identifier string, fn func()) *design.ResultTypeExpr](#ResultType)
* [func Scope(name string, desc ...string)](#Scope)
* [func Security(args ...interface{})](#Security)
* [func Server(url string, fn ...func())](#Server)
* [func Service(name string, fn func()) *design.ServiceExpr](#Service)
* [func StreamingPayload(val interface{}, args ...interface{})](#StreamingPayload)
* [func StreamingResult(val interface{}, args ...interface{})](#StreamingResult)
* [func TRACE(path string) *httpdesign.RouteExpr](#TRACE)
* [func Tag(name, value string)](#Tag)
* [func Temporary()](#Temporary)
* [func TermsOfService(terms string)](#TermsOfService)
* [func Timeout()](#Timeout)
* [func Title(val string)](#Title)
* [func Token(name string, args ...interface{})](#Token)
* [func Type(name string, args ...interface{}) design.UserType](#Type)
* [func TypeName(name string)](#TypeName)
* [func URL(url string)](#URL)
* [func Username(name string, args ...interface{})](#Username)
* [func Value(val interface{})](#Value)
* [func Version(ver string)](#Version)
* [func View(name string, adsl ...func())](#View)


#### <a name="pkg-files">Package files</a>
[aliases.go](/src/github.com/goadesign/goa/http/dsl/aliases.go) [description.go](/src/github.com/goadesign/goa/http/dsl/description.go) [doc.go](/src/github.com/goadesign/goa/http/dsl/doc.go) [file_server.go](/src/github.com/goadesign/goa/http/dsl/file_server.go) [http.go](/src/github.com/goadesign/goa/http/dsl/http.go) [metadata.go](/src/github.com/goadesign/goa/http/dsl/metadata.go) [response.go](/src/github.com/goadesign/goa/http/dsl/response.go) [value.go](/src/github.com/goadesign/goa/http/dsl/value.go) 





## <a name="API">func</a> [API](/src/target/aliases.go?s=1360:1408#L42)
``` go
func API(name string, fn func()) *design.APIExpr
```
API defines a network service API. It provides the API name, description and other global
properties. There may only be one API declaration in a given design package.

API is a top level DSL.
API takes two arguments: the name of the API and the defining DSL.

Example:


	var _ = API("adder", func() {
	    Title("title")                // Title used in documentation
	    Description("description")    // Description used in documentation
	    Version("2.0")                // Version of API
	    TermsOfService("terms")       // Terms of use
	    Contact(func() {              // Contact info
	        Name("contact name")
	        Email("contact email")
	        URL("contact URL")
	    })
	    License(func() {              // License
	        Name("license name")
	        URL("license URL")
	    })
	    Docs(func() {                 // Documentation links
	        Description("doc description")
	        URL("doc URL")
	    })
	}



## <a name="APIKey">func</a> [APIKey](/src/target/aliases.go?s=2783:2836#L84)
``` go
func APIKey(scheme, name string, args ...interface{})
```
APIKey defines the attribute used to provide the API key to an endpoint
secured with API keys. The parameters and usage of APIKey are the same as the
goa DSL Attribute function except that it accepts an extra first argument
corresponding to the name of the API key security scheme.

The generated code produced by goa uses the value of the corresponding
payload field to set the API key value.

APIKey must appear in Payload or Type.

Example:


	Method("secured_read", func() {
	    Security(APIKeyAuth)
	    Payload(func() {
	        APIKey("api_key", "key", String, "API key used to perform authorization")
	        Required("key")
	    })
	    Result(String)
	    HTTP(func() {
	        GET("/")
	        Param("key:k") // Provide the key as a query string param "k"
	    })
	})
	
	Method("secured_write", func() {
	    Security(APIKeyAuth)
	    Payload(func() {
	        APIKey("api_key", "key", String, "API key used to perform authorization")
	        Attribute("data", String, "Data to be written")
	        Required("key", "data")
	    })
	    HTTP(func() {
	        POST("/")
	        Header("key:Authorization") // Provide the key in Authorization header (default)
	    })
	})



## <a name="APIKeySecurity">func</a> [APIKeySecurity](/src/target/aliases.go?s=3259:3324#L102)
``` go
func APIKeySecurity(name string, fn ...func()) *design.SchemeExpr
```
APIKeySecurity defines an API key security scheme where a key must be
provided by the client to perform authorization.

APIKeySecurity is a top level DSL.

APIKeySecurity takes a name as first argument and an optional DSL as
second argument.

Example:


	var APIKey = APIKeySecurity("key", func() {
	      Description("Shared secret")
	})



## <a name="AccessToken">func</a> [AccessToken](/src/target/aliases.go?s=4164:4214#L130)
``` go
func AccessToken(name string, args ...interface{})
```
AccessToken defines the attribute used to provide the access token to an
endpoint secured with OAuth2. The parameters and usage of AccessToken are the
same as the goa DSL Attribute function.

The generated code produced by goa uses the value of the corresponding
payload field to initialize the Authorization header.

AccessToken must appear in Payload or Type.

Example:


	Method("secured", func() {
	    Security(OAuth2)
	    Payload(func() {
	        AccessToken("token", String, "OAuth2 access token used to perform authorization")
	        Required("token")
	    })
	    Result(String)
	    HTTP(func() {
	        // The "Authorization" header is defined implicitly.
	        GET("/")
	    })
	})



## <a name="ArrayOf">func</a> [ArrayOf](/src/target/aliases.go?s=5157:5212#L158)
``` go
func ArrayOf(v interface{}, fn ...func()) *design.Array
```
ArrayOf creates an array type from its element type.

ArrayOf may be used wherever types can.
The first argument of ArrayOf is the type of the array elements specified by
name or by reference.
The second argument of ArrayOf is an optional function that defines
validations for the array elements.

Examples:


	var Names = ArrayOf(String, func() {
	    Pattern("[a-zA-Z]+") // Validates elements of the array
	})
	
	var Account = Type("Account", func() {
	    Attribute("bottles", ArrayOf(Bottle), "Account bottles", func() {
	        MinLength(1) // Validates array as a whole
	    })
	})

Note: CollectionOf and ArrayOf both return array types. CollectionOf returns
a result type where ArrayOf returns a user type. In general you want to use
CollectionOf if the argument is a result type and ArrayOf if it is a user
type.



## <a name="Attribute">func</a> [Attribute](/src/target/aliases.go?s=9353:9401#L266)
``` go
func Attribute(name string, args ...interface{})
```
Attribute describes a field of an object.

An attribute has a name, a type and optionally a default value, an example
value and validation rules.

The type of an attribute can be one of:

* The primitive types Boolean, Float32, Float64, Int, Int32, Int64, UInt,


	UInt32, UInt64, String or Bytes.

* A user type defined via the Type function.

* An array defined using the ArrayOf function.

* An map defined using the MapOf function.

* An object defined inline using Attribute to define the type fields


	recursively.

* The special type Any to indicate that the attribute may take any of the


	types listed above.

Attribute must appear in ResultType, Type, Attribute or Attributes.

Attribute accepts one to four arguments, the valid usages of the function
are:


	Attribute(name)       // Attribute of type String with no description, no
	                      // validation, default or example value
	
	Attribute(name, fn)   // Attribute of type object with inline field
	                      // definitions, description, validations, default
	                      // and/or example value
	
	Attribute(name, type) // Attribute with no description, no validation,
	                      // no default or example value
	
	Attribute(name, type, fn) // Attribute with description, validations,
	                          // default and/or example value
	
	Attribute(name, type, description)     // Attribute with no validation,
	                                       // default or example value
	
	Attribute(name, type, description, fn) // Attribute with description,
	                                       // validations, default and/or
	                                       // example value

Where name is a string indicating the name of the attribute, type specifies
the attribute type (see above for the possible values), description a string
providing a human description of the attribute and fn the defining DSL if
any.

When defining the type inline using Attribute recursively the function takes
the second form (name and DSL defining the type). The description can be
provided using the Description function in this case.

Examples:


	Attribute("name")
	
	Attribute("driver", Person)         // Use type defined with Type function
	
	Attribute("driver", "Person")       // May also use the type name
	
	Attribute("name", String, func() {
	    Pattern("^foo")                 // Adds a validation rule
	})
	
	Attribute("driver", Person, func() {
	    Required("name")                // Add required field to list of
	})                                  // fields already required in Person
	
	Attribute("name", String, func() {
	    Default("bob")                  // Sets a default value
	})
	
	Attribute("name", String, "name of driver") // Sets a description
	
	Attribute("age", Int32, "description", func() {
	    Minimum(2)                       // Sets both a description and
	                                     // validations
	})

The definition below defines an attribute inline. The resulting type
is an object with three attributes "name", "age" and "child". The "child"
attribute is itself defined inline and has one child attribute "name".


	Attribute("driver", func() {           // Define type inline
	    Description("Composite attribute") // Set description
	
	    Attribute("name", String)          // Child attribute
	    Attribute("age", Int32, func() {   // Another child attribute
	        Description("Age of driver")
	        Default(42)
	        Minimum(2)
	    })
	    Attribute("child", func() {        // Defines a child attribute
	        Attribute("name", String)      // Grand-child attribute
	        Required("name")
	    })
	
	    Required("name", "age")            // List required attributes
	})



## <a name="Attributes">func</a> [Attributes](/src/target/aliases.go?s=9510:9536#L271)
``` go
func Attributes(fn func())
```
Attributes implements the result type Attributes DSL. See ResultType.



## <a name="AuthorizationCodeFlow">func</a> [AuthorizationCodeFlow](/src/target/aliases.go?s=9833:9906#L282)
``` go
func AuthorizationCodeFlow(authorizationURL, tokenURL, refreshURL string)
```
AuthorizationCodeFlow defines an authorizationCode OAuth2 flow as described
in section 1.3.1 of RFC 6749.

AuthorizationCodeFlow must be used in OAuth2Security.

AuthorizationCodeFlow accepts three arguments: the authorization, token and
refresh URLs.



## <a name="BasicAuthSecurity">func</a> [BasicAuthSecurity](/src/target/aliases.go?s=10329:10397#L299)
``` go
func BasicAuthSecurity(name string, fn ...func()) *design.SchemeExpr
```
BasicAuthSecurity defines a basic authentication security scheme.

BasicAuthSecurity is a top level DSL.

BasicAuthSecurity takes a name as first argument and an optional DSL as
second argument.

Example:


	var Basic = BasicAuthSecurity("basicauth", func() {
	    Description("Use your own password!")
	})



## <a name="Body">func</a> [Body](/src/target/http.go?s=20350:20380#L607)
``` go
func Body(args ...interface{})
```
Body describes a HTTP request or response body.

Body must appear in a Method HTTP expression to define the request body or in
an Error or Result HTTP expression to define the response body. If Body is
absent then the body is built using the HTTP endpoint request or response
type attributes not used to describe parameters (request only) or headers.

Body accepts one argument which describes the shape of the body, it can be:


	- The name of an attribute of the request or response type. In this case the
	  attribute type describes the shape of the body.
	
	- A function listing the body attributes. The attributes inherit the
	  properties (description, type, validations etc.) of the request or
	  response type attributes with identical names.

Assuming the type:


	var CreatePayload = Type("CreatePayload", func() {
	    Attribute("name", String, "Name of account")
	})

The following:


	Method("create", func() {
	    Payload(CreatePayload)
	})

is equivalent to:


	Method("create", func() {
	    Payload(CreatePayload)
	    HTTP(func() {
	        Body(func() {
	            Attribute("name")
	        })
	    })
	})



## <a name="CONNECT">func</a> [CONNECT](/src/target/http.go?s=9080:9127#L270)
``` go
func CONNECT(path string) *httpdesign.RouteExpr
```
CONNECT creates a route using the CONNECT HTTP method. See GET.



## <a name="CanonicalMethod">func</a> [CanonicalMethod](/src/target/http.go?s=23212:23245#L722)
``` go
func CanonicalMethod(name string)
```
CanonicalMethod sets the name of the service canonical method. The canonical
method endpoint path is used to prefix the paths to any child service
endpoint. The default value is "show".



## <a name="ClientCredentialsFlow">func</a> [ClientCredentialsFlow](/src/target/aliases.go?s=10697:10752#L309)
``` go
func ClientCredentialsFlow(tokenURL, refreshURL string)
```
ClientCredentialsFlow defines an clientCredentials OAuth2 flow as described
in section 1.3.4 of RFC 6749.

ClientCredentialsFlow must be used in OAuth2Security.

ClientCredentialsFlow accepts two arguments: the token and refresh URLs.



## <a name="Code">func</a> [Code](/src/target/response.go?s=7437:7456#L232)
``` go
func Code(code int)
```
Code sets the Response status code.



## <a name="CollectionOf">func</a> [CollectionOf](/src/target/aliases.go?s=11805:11876#L340)
``` go
func CollectionOf(v interface{}, adsl ...func()) *design.ResultTypeExpr
```
CollectionOf creates a collection result type from its element result type. A
collection result type represents the content of responses that return a
collection of values such as listings. The expression accepts an optional DSL
as second argument that allows specifying which view(s) of the original result
type apply.

The resulting result type identifier is built from the element result type by
appending the result type parameter "type" with value "collection".

CollectionOf must appear wherever ResultType can.

CollectionOf takes the element result type as first argument and an optional
DSL as second argument.

Example:


	var DivisionResult = ResultType("application/vnd.goa.divresult", func() {
	    Attributes(func() {
	        Attribute("value", Float64)
	    })
	    View("default", func() {
	        Attribute("value")
	    })
	})
	
	var MultiResults = CollectionOf(DivisionResult)



## <a name="Consumes">func</a> [Consumes](/src/target/http.go?s=4863:4892#L126)
``` go
func Consumes(args ...string)
```
Consumes adds a MIME type to the list of MIME types the APIs supports when
accepting requests. While the DSL supports any MIME type, the code generator
only knows to generate the code for "application/json", "application/xml" and
"application/gob". The service code must provide the decoders for other MIME
types.

Consumes must appear in the HTTP expression of API.

Consumes accepts one or more strings corresponding to the MIME types.

Example:


	API("cellar", func() {
	    // ...
	    HTTP(func() {
	        Consumes("application/json", "application/xml")
	        // ...
	    })
	})



## <a name="Contact">func</a> [Contact](/src/target/aliases.go?s=11964:11987#L345)
``` go
func Contact(fn func())
```
Contact sets the API contact information.



## <a name="ContentType">func</a> [ContentType](/src/target/response.go?s=8151:8179#L259)
``` go
func ContentType(typ string)
```
ContentType sets the value of the Content-Type response header. By default
the ID of the result type is used.

ContentType may appear in a ResultType or a Response expression.
ContentType accepts one argument: the mime type as defined by RFC 6838.


	   var _ = ResultType("application/vnd.myapp.mytype") {
	       ContentType("application/json")
	   }
	
	   var _ = Method("add", func() {
		  HTTP(func() {
	           Response(OK, func() {
	               ContentType("application/json")
	           })
	       })
	   })



## <a name="ConvertTo">func</a> [ConvertTo](/src/target/aliases.go?s=14144:14175#L405)
``` go
func ConvertTo(obj interface{})
```
ConvertTo specifies an external type that instances of the generated struct
are converted into. The generated struct is equipped with a method that makes
it possible to instantiate the external type. The default algorithm used to
match the external type fields to the design attributes is as follows:


	1. Look for an attribute with the same name as the field
	2. Look for an attribute with the same name as the field but with the
	   first letter being lowercase
	3. Look for an attribute with a name corresponding to the snake_case
	   version of the field name

This algorithm does not apply if the attribute is equipped with the
"struct.field.external" metadata. In this case the matching is done by
looking up the field with a name corresponding to the value of the metadata.
If the value of the metadata is "-" the attribute isn't matched and no
conversion code is generated for it. In all other cases it is an error if no
match is found or if the matching field type does not correspond to the
attribute type.

ConvertTo must appear in Type or ResutType.

ConvertTo accepts one arguments: an instance of the external type.

Example:

Service design:


	var Bottle = Type("bottle", func() {
	    Description("A bottle")
	    ConvertTo(models.Bottle{})
	    // The "rating" attribute is matched to the external
	    // typ "Rating" field.
	    Attribute("rating", Int)
	    Attribute("name", String, func() {
	        // The "name" attribute is matched to the external
	        // type "MyName" field.
	        Metadata("struct.field.external", "MyName")
	    })
	    Attribute("vineyard", String, func() {
	        // The "vineyard" attribute is not converted.
	        Metadata("struct.field.external", "-")
	    })
	})

External (i.e. non design) package:


	package model
	
	type Bottle struct {
	    Rating int
	    // Mapped field
	    MyName string
	    // Additional fields are OK
	    Description string
	}



## <a name="CreateFrom">func</a> [CreateFrom](/src/target/aliases.go?s=16316:16348#L465)
``` go
func CreateFrom(obj interface{})
```
CreateFrom specifies an external type that instances of the generated struct
can be initialized from. The generated struct is equipped with a method that
initializes its fields from an instance of the external type. The default
algorithm used to match the external type fields to the design attributes is
as follows:


	1. Look for an attribute with the same name as the field
	2. Look for an attribute with the same name as the field but with the
	   first letter being lowercase
	3. Look for an attribute with a name corresponding to the snake_case
	   version of the field name

This algorithm does not apply if the attribute is equipped with the
"struct.field.external" metadata. In this case the matching is done by
looking up the field with a name corresponding to the value of the metadata.
If the value of the metadata is "-" the attribute isn't matched and no
conversion code is generated for it. In all other cases it is an error if no
match is found or if the matching field type does not correspond to the
attribute type.

CreateFrom must appear in Type or ResutType.

CreateFrom accepts one arguments: an instance of the external type.

Example:

Service design:


	var Bottle = Type("bottle", func() {
	    Description("A bottle")
	    CreateFrom(models.Bottle{})
	    Attribute("rating", Int)
	    Attribute("name", String, func() {
	        // The "name" attribute is matched to the external
	        // type "MyName" field.
	        Metadata("struct.field.external", "MyName")
	    })
	    Attribute("vineyard", String, func() {
	        // The "vineyard" attribute is not initialized by the
	        // generated constructor method.
	        Metadata("struct.field.external", "-")
	    })
	})

External (i.e. non design) package:


	package model
	
	type Bottle struct {
	    Rating int
	    // Mapped field
	    MyName string
	    // Additional fields are OK
	    Description string
	}



## <a name="DELETE">func</a> [DELETE](/src/target/http.go?s=8637:8683#L255)
``` go
func DELETE(path string) *httpdesign.RouteExpr
```
DELETE creates a route using the DELETE HTTP method. See GET.



## <a name="Default">func</a> [Default](/src/target/aliases.go?s=16427:16456#L470)
``` go
func Default(def interface{})
```
Default sets the default value for an attribute.



## <a name="Description">func</a> [Description](/src/target/description.go?s=455:481#L22)
``` go
func Description(d string)
```
Description sets the expression description.

Description must appear in API, Service, Endpoint, Files, Response, Type,
ResultType or Attribute.

Description accepts a single argument which is the description value.

Example:


	var _ = API("cellar", func() {
	    Description("The wine cellar API")
	})



## <a name="Docs">func</a> [Docs](/src/target/http.go?s=7012:7032#L195)
``` go
func Docs(fn func())
```
Docs provides external documentation URLs for methods.



## <a name="Elem">func</a> [Elem](/src/target/aliases.go?s=16555:16575#L475)
``` go
func Elem(fn func())
```
Elem makes it possible to specify validations for array and map values.



## <a name="Email">func</a> [Email](/src/target/aliases.go?s=16628:16652#L480)
``` go
func Email(email string)
```
Email sets the contact email.



## <a name="Enum">func</a> [Enum](/src/target/aliases.go?s=16802:16832#L486)
``` go
func Enum(vals ...interface{})
```
Enum adds a "enum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor76">https://json-schema.org/latest/json-schema-validation.html#anchor76</a>.



## <a name="Error">func</a> [Error](/src/target/aliases.go?s=17717:17761#L513)
``` go
func Error(name string, args ...interface{})
```
Error describes a method error return value. The description includes a
unique name (in the scope of the method), an optional type, description and
DSL that further describes the type. If no type is specified then the
built-in ErrorResult type is used. The DSL syntax is identical to the
Attribute DSL.

Error must appear in the Service (to define error responses that apply to all
the service methods) or Method expressions.

See Attribute for details on the Error arguments.

Example:


	var _ = Service("divider", func() {
	    Error("invalid_arguments") // Uses type ErrorResult
	
	    // Method which uses the default type for its response.
	    Method("divide", func() {
	        Payload(DivideRequest)
	        Error("div_by_zero", DivByZero, "Division by zero")
	    })
	})



## <a name="Example">func</a> [Example](/src/target/aliases.go?s=19169:19202#L554)
``` go
func Example(args ...interface{})
```
Example provides an example value for a type, a parameter, a header or any
attribute. Example supports two syntaxes: one syntax accepts two arguments
where the first argument is a summary describing the example and the second a
value provided directly or via a DSL which may also specify a long
description. The other syntax accepts a single argument and is equivalent to
using the first syntax where the summary is the string "default".

If no example is explicitly provided in an attribute expression then a random
example is generated unless the "swagger:example" metadata is set to "false".
See Metadata.

Example must appear in a Attributes or Attribute expression DSL.

Example takes one or two arguments: an optional summary and the example value
or defining DSL.

Examples:


	Params(func() {
		Param("ZipCode:zip-code", String, "Zip code filter", func() {
			Example("Santa Barbara", "93111")
			Example("93117") // same as Example("default", "93117")
		})
	})
	
	Attributes(func() {
		Attribute("ID", Int64, "ID is the unique bottle identifier")
		Example("The first bottle", func() {
			Description("This bottle has an ID set to 1")
			Value(Val{"ID": 1})
		})
		Example("Another bottle", func() {
			Description("This bottle has an ID set to 5")
			Value(Val{"ID": 5})
		})
	})



## <a name="Extend">func</a> [Extend](/src/target/aliases.go?s=19966:19996#L580)
``` go
func Extend(t design.DataType)
```
Extend adds the parameter type attributes to the type using Extend. The
parameter type must be an object.

Extend may be used in Type or ResultType. Extend accepts a single argument:
the type or result type containing the attributes to be copied.

Example:


	var CreateBottlePayload = Type("CreateBottlePayload", func() {
	   Attribute("name", String, func() {
	      MinLength(3)
	   })
	   Attribute("vintage", Int32, func() {
	      Minimum(1970)
	   })
	})
	
	var UpdateBottlePayload = Type("UpatePayload", func() {
	    Atribute("id", String, "ID of bottle to update")
	    Extend(CreateBottlePayload) // Adds attributes "name" and "vintage"
	})



## <a name="Fault">func</a> [Fault](/src/target/aliases.go?s=20334:20346#L598)
``` go
func Fault()
```
Fault qualifies an error type as describing errors due to a server-side
fault.

Fault must appear in a Error expression.

Fault takes no argument.

Example:


	var _ = Service("divider", func() {
	     Error("internal_error", func() {
	             Fault()
	     })
	})



## <a name="Field">func</a> [Field](/src/target/aliases.go?s=20743:20804#L616)
``` go
func Field(tag interface{}, name string, args ...interface{})
```
Field is syntactic sugar to define an attribute with the "rpc:tag" metadata
set with the value of the first argument.

Field must appear wherever Attribute can.

Field takes the same arguments as Attribute with the addition of the tag
value as first argument.

Example:


	Field(1, "ID", String, func() {
	    Pattern("[0-9]+")
	})



## <a name="Files">func</a> [Files](/src/target/file_server.go?s=1552:1600#L47)
``` go
func Files(path, filename string, fns ...func())
```
Files defines a endpoint that serves static assets. The logic for what to do
when the filename points to a file vs. a directory is the same as the
standard http package ServeFile function. The path may end with a wildcard
that matches the rest of the URL (e.g. *filepath). If it does the matching
path is appended to filename to form the full file path, so:


	Files("/index.html", "/www/data/index.html")

returns the content of the file "/www/data/index.html" when requests are sent
to "/index.html" and:


	Files("/assets/*filepath", "/www/data/assets")

returns the content of the file "/www/data/assets/x/y/z" when requests are
sent to "/assets/x/y/z".

Files must appear in Service.

Files accepts 2 arguments and an optional DSL. The first argument is the
request path which may use a wildcard starting with *. The second argument is
the path on disk to the files being served. The file path may be absolute or
relative to the current path of the process.  The DSL allows setting a
description and documentation.

Example:


	var _ = Service("bottle", func() {
	    Files("/index.html", "/www/data/index.html", func() {
	        Description("Serve home page")
	        Docs(func() {
	            Description("Additional documentation")
	            URL("<a href="https://goa.design">https://goa.design</a>")
	        })
	    })
	})



## <a name="Format">func</a> [Format](/src/target/aliases.go?s=21545:21583#L648)
``` go
func Format(f design.ValidationFormat)
```
Format adds a "format" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor104">https://json-schema.org/latest/json-schema-validation.html#anchor104</a>.
The formats supported by goa are:

FormatDate: RFC3339 date

FormatDateTime: RFC3339 date time

FormatUUID: RFC4122 uuid

FormatEmail: RFC5322 email address

FormatHostname: RFC1035 internet host name

FormatIPv4, FormatIPv6, FormatIP: RFC2373 IPv4, IPv6 address or either

FormatURI: RFC3986 URI

FormatMAC: IEEE 802 MAC-48, EUI-48 or EUI-64 MAC address

FormatCIDR: RFC4632 or RFC4291 CIDR notation IP address

FormatRegexp: RE2 regular expression

FormatJSON: JSON text

FormatRFC1123: RFC1123 date time



## <a name="GET">func</a> [GET](/src/target/http.go?s=8083:8126#L235)
``` go
func GET(path string) *httpdesign.RouteExpr
```
GET defines a route using the GET HTTP method. The route may use wildcards to
define path parameters. Wildcards start with '{' or with '{*' and end with
'}'. They must appear after a '/'.

A wildcard that starts with '{' matches a section of the path (the value in
between two slashes).

A wildcard that starts with '{*' matches the rest of the path. Such wildcards
must terminate the path.

GET must appear in a method HTTP function.

GET accepts one argument which is the request path.

Example:


	var _ = Service("Manager", func() {
	    Method("GetAccount", func() {
	        Payload(GetAccount)
	        Result(Account)
	        HTTP(func() {
	            GET("/{accountID}/details")
	            GET("/{*accountPath}")
	        })
	    })
	})



## <a name="HEAD">func</a> [HEAD](/src/target/http.go?s=8220:8264#L240)
``` go
func HEAD(path string) *httpdesign.RouteExpr
```
HEAD creates a route using the HEAD HTTP method. See GET.



## <a name="HTTP">func</a> [HTTP](/src/target/http.go?s=3806:3826#L90)
``` go
func HTTP(fn func())
```
HTTP defines HTTP transport specific properties on a API, a service or a
single method. The function maps the request and response types to HTTP
properties such as parameters (via path wildcards or query strings), request
or response headers, request or response bodies as well as response status
code. HTTP also defines HTTP specific properties such as the method endpoint
URLs and HTTP methods.

As a special case HTTP may be used to define the response generated for
invalid requests and internal errors (errors returned by the service
methods that don't match any of the error responses defined in the design).
This is the only use of HTTP allowed in the API expression. The attributes of
the built in invalid request error are "id", "status", "code", "detail" and
"meta", see ErrorResult.

The functions that appear in HTTP such as Header, Param or Body may take
advantage of the request or response types (depending on whether they appear
when describing the HTTP request or response). The properties of the header,
parameter or body attributes inherit the properties of the attributes with the
same names that appear in the request or response types. The functions may
also define new attributes or override the existing request or response type
attributes.

HTTP must appear in API, a Service or an Method expression.

HTTP accepts a single argument which is the defining DSL function.

Example:


	var _ = API("calc", func() {
	    HTTP(func() {
	        Response(InvalidRequest, func() {
	            Header("Error-Code:code") // Use the "code" attribute of the
	                                      // invalid error struct to set the
	                                      // value of the Error-Code header.
	        })
	    })
	}

Example:


	var _ = Service("calculator", func() {
	    Error(ErrAuthFailure)
	
	    HTTP(func() {
	        Path("/calc")      // Prefix to all request paths
	        Error(ErrAuthFailure, StatusUnauthorized) // Define
	                           // ErrAuthFailure HTTP response status code.
	        Parent("account")  // Parent service, used to prefix request
	                           // paths.
	        CanonicalMethod("add") // Method whose path is used to prefix
	                               // the paths of child service.
	    })
	
	    Method("add", func() {
	        Description("Add two operands")
	        Payload(Operands)
	        Error(ErrBadRequest, ErrorResult)
	
	        HTTP(func() {
	            GET("/add/{left}/{right}") // Define HTTP route. The "left"
	                                       // and "right" parameter properties
	                                       // are inherited from the
	                                       // corresponding Operands attributes.
	            Param("req:requestID")     // Use "requestID" attribute to
	                                       // define "req" query string
	            Header("requestID:X-RequestID")  // Use "requestID" attribute
	                                             // of Operands to define shape
	                                             // of X-RequestID header
	            Response(StatusNoContent)        // Use status 204 on success
	            Error(ErrBadRequest, BadRequest) // Use status code 400 for
	                                             // ErrBadRequest responses
	        })
	
	    })
	})



## <a name="Header">func</a> [Header](/src/target/http.go?s=12360:12405#L369)
``` go
func Header(name string, args ...interface{})
```
Header describes a single HTTP header. The properties (description, type,
validation etc.) of a header are inherited from the request or response type
attribute with the same name by default.

Header must appear in the API HTTP expression (to define request headers
common to all the API endpoints), a specific method HTTP expression (to
define request headers), a Result expression (to define the response
headers) or an Error expression (to define the error response headers). Header
may also appear in a Headers expression.

Header accepts the same arguments as the Attribute function. The header name
may define a mapping between the attribute name and the HTTP header name when
they differ. The mapping syntax is "name of attribute:name of header".

Example:


	var _ = Service("account", func() {
	    Method("create", func() {
	        Payload(CreatePayload)
	        Result(Account)
	        HTTP(func() {
	            Header("auth:Authorization", String, "Auth token", func() {
	                Pattern("^Bearer [^ ]+$")
	            })
	            Response(StatusCreated, func() {
	                Header("href") // Inherits description, type, validations
	                               // etc. from Account href attribute
	            })
	        })
	    })
	})



## <a name="Headers">func</a> [Headers](/src/target/http.go?s=10474:10504#L315)
``` go
func Headers(args interface{})
```
Headers groups a set of Header expressions. It makes it possible to list
required headers using the Required function.

Headers must appear in an API or Service HTTP expression to define request
headers common to all the API or service methods. Headers may also appear
in a method, response or error HTTP expression to define the HTTP endpoint
request and response headers.

Headers accepts one argument: Either a function listing the headers or a user
type which must be an object and whose attributes define the headers.

Example:


	var _ = API("cellar", func() {
	    HTTP(func() {
	        Headers(func() {
	            Header("version:Api-Version", String, "API version", func() {
	                Enum("1.0", "2.0")
	            })
	            Required("version")
	        })
	    })
	})



## <a name="ImplicitFlow">func</a> [ImplicitFlow](/src/target/aliases.go?s=21827:21881#L658)
``` go
func ImplicitFlow(authorizationURL, refreshURL string)
```
ImplicitFlow defines an implicit OAuth2 flow as described in section 1.3.2
of RFC 6749.

ImplicitFlow must be used in OAuth2Security.

ImplicitFlow accepts two arguments: the authorization and refresh URLs.



## <a name="JWTSecurity">func</a> [JWTSecurity](/src/target/aliases.go?s=22758:22820#L684)
``` go
func JWTSecurity(name string, fn ...func()) *design.SchemeExpr
```
JWTSecurity defines an HTTP security scheme where a JWT is passed in the
request Authorization header as a bearer token to perform auth. This scheme
supports defining scopes that endpoint may require to authorize the request.
The scheme also supports specifying a token URL used to retrieve token
values.

Since scopes are not compatible with the Swagger specification, the swagger
generator inserts comments in the description of the different elements on
which they are defined.

JWTSecurity is a top level DSL.

JWTSecurity takes a name as first argument and an optional DSL as second
argument.

Example:


	var JWT = JWTSecurity("jwt", func() {
	    Scope("system:write", "Write to the system")
	    Scope("system:read", "Read anything in there")
	})



## <a name="Key">func</a> [Key](/src/target/aliases.go?s=22925:22944#L689)
``` go
func Key(fn func())
```
Key makes it possible to specify validations for map keys.



## <a name="License">func</a> [License](/src/target/aliases.go?s=23008:23031#L694)
``` go
func License(fn func())
```
License sets the API license information.



## <a name="MapOf">func</a> [MapOf](/src/target/aliases.go?s=23652:23706#L718)
``` go
func MapOf(k, v interface{}, fn ...func()) *design.Map
```
MapOf creates a map from its key and element types.

MapOf may be used wherever types can.
MapOf takes two arguments: the key and value types either by name of by reference.

Example:


	var ReviewByID = MapOf(Int64, String, func() {
	    Key(func() {
	        Minimum(1)           // Validates keys of the map
	    })
	    Value(func() {
	        Pattern("[a-zA-Z]+") // Validates values of the map
	    })
	})
	
	var Review = Type("Review", func() {
	    Attribute("ratings", MapOf(Bottle, Int32), "Bottle ratings")
	})



## <a name="MapParams">func</a> [MapParams](/src/target/http.go?s=17525:17560#L523)
``` go
func MapParams(args ...interface{})
```
MapParams describes the query string parameters in a HTTP request.

MapParams must appear in a Method HTTP expression to map the query string
parameters with the Method's Payload.

MapParams accepts one optional argument which specifes the Payload
attribute to which the query string parameters must be mapped. This Payload
attribute must be a map. If no argument is specified, the query string
parameters are mapped with the entire Payload (the Payload must be a map).

Example:


	 var _ = Service("account", func() {
	     Method("index", func() {
	         Payload(MapOf(String, Int))
	         HTTP(func() {
	             GET("/")
	             MapParams()
	         })
	     })
	})
	
	var _ = Service("account", func() {
	    Method("show", func() {
	        Payload(func() {
	            Attribute("p", MapOf(String, String))
	            Attribute("id", String)
	        })
	        HTTP(func() {
	            GET("/{id}")
	            MapParams("p")
	        })
	    })
	})



## <a name="MaxLength">func</a> [MaxLength](/src/target/aliases.go?s=23878:23901#L724)
``` go
func MaxLength(val int)
```
MaxLength adds a "maxItems" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor42">https://json-schema.org/latest/json-schema-validation.html#anchor42</a>.



## <a name="Maximum">func</a> [Maximum](/src/target/aliases.go?s=24059:24088#L730)
``` go
func Maximum(val interface{})
```
Maximum adds a "maximum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor17">https://json-schema.org/latest/json-schema-validation.html#anchor17</a>.



## <a name="Metadata">func</a> [Metadata](/src/target/metadata.go?s=2201:2244#L58)
``` go
func Metadata(name string, value ...string)
```
Metadata is a set of key/value pairs that can be assigned to an object. Each
value consists of a slice of strings so that multiple invocation of the
Metadata function on the same target using the same key builds up the slice.
Metadata may be set on fields, methods, responses and service expressions.

While keys can have any value the following names are handled explicitly by
goa when set on fields.

`struct:field:name`: overrides the Go struct field name generated by default
by goa. Applicable to fields only.


	Metadata("struct:field:name", "MyName")

`struct:tag:xxx`: sets the struct field tag xxx on generated Go structs.
Overrides tags that goa would otherwise set. If the metadata value is a
slice then the strings are joined with the space character as separator.
Applicable to fields only.


	Metadata("struct:tag:json", "myName,omitempty")
	Metadata("struct:tag:xml", "myName,attr")

`swagger:tag:xxx`: sets the Swagger object field tag xxx.
Applicable to services and endpoints.


	Metadata("swagger:tag:Backend")
	Metadata("swagger:tag:Backend:desc", "description of 'Backend'")
	Metadata("swagger:tag:Backend:url", "<a href="https://example.com">https://example.com</a>")
	Metadata("swagger:tag:Backend:url:desc", "See more docs here")

`swagger:summary`: sets the Swagger operation summary field.
Applicable to endpoints.


	Metadata("swagger:summary", "Short summary of what endpoint does")

`swagger:extension:xxx`: defines a swagger extension value.
Applicable to all constructs that support Metadata.


	Metadata("swagger:extension:x-apis-json", `{"URL": "<a href="https://goa.design">https://goa.design</a>"}`)

The special key names listed above may be used as follows:


	var Account = Type("Account", func() {
	        Field("service", String, "Name of service", func() {
	                // Override default name
	                Metadata("struct:field:name", "ServiceName")
	        })
	})



## <a name="Method">func</a> [Method](/src/target/aliases.go?s=24634:24669#L753)
``` go
func Method(name string, fn func())
```
Method defines a single service method.

Method must appear in a Service expression.

Method takes two arguments: the name of the method and the defining DSL.

Example:


	Method("add", func() {
	    Description("The add method returns the sum of A and B")
	    Docs(func() {
	        Description("Add docs")
	        URL("http//adder.goa.design/docs/endpoints/add")
	    })
	    Payload(Operands)
	    Result(Sum)
	    Error(ErrInvalidOperands)
	})



## <a name="MinLength">func</a> [MinLength](/src/target/aliases.go?s=24832:24855#L759)
``` go
func MinLength(val int)
```
MinLength adds a "minItems" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor45">https://json-schema.org/latest/json-schema-validation.html#anchor45</a>.



## <a name="Minimum">func</a> [Minimum](/src/target/aliases.go?s=25013:25042#L765)
``` go
func Minimum(val interface{})
```
Minimum adds a "minimum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor21">https://json-schema.org/latest/json-schema-validation.html#anchor21</a>.



## <a name="MultipartRequest">func</a> [MultipartRequest](/src/target/http.go?s=18922:18945#L559)
``` go
func MultipartRequest()
```
MultipartRequest indicates that HTTP requests made to the method use
MIME multipart encoding as defined in RFC 2046.

MultipartRequest must appear in a HTTP endpoint expression.

goa generates a custom encoder that writes the payload for requests made to
HTTP endpoints that use MultipartRequest. The generated encoder accept a
user provided function that does the actual mapping of the payload to the
multipart content. The user provided function accepts a multipart writer
and a reference to the payload and is responsible for encoding the payload.
goa also generates a custom decoder that reads back the multipart content
into the payload struct. The generated decoder also accepts a user provided
function that takes a multipart reader and a reference to the payload struct
as parameter. The user provided decoder is responsible for decoding the
multipart content into the payload. The example command generates a default
implementation for the user decoder and encoder.



## <a name="Name">func</a> [Name](/src/target/aliases.go?s=25108:25130#L770)
``` go
func Name(name string)
```
Name sets the contact or license name.



## <a name="NoSecurity">func</a> [NoSecurity](/src/target/aliases.go?s=25265:25282#L777)
``` go
func NoSecurity()
```
NoSecurity removes the need for an endpoint to perform authorization.

NoSecurity must appear in Method.



## <a name="OAuth2Security">func</a> [OAuth2Security](/src/target/aliases.go?s=25994:26059#L800)
``` go
func OAuth2Security(name string, fn ...func()) *design.SchemeExpr
```
OAuth2Security defines an OAuth2 security scheme. The DSL provided as second
argument defines the specific flows supported by the scheme. The supported
flow types are ImplicitFlow, PasswordFlow, ClientCredentialsFlow, and
AuthorizationCodeFlow. The DSL also defines the scopes that may be
associated with the incoming request tokens.

OAuth2Security is a top level DSL.

OAuth2Security takes a name as first argument and a DSL as second argument.

Example:


	var OAuth2 = OAuth2Security("googauth", func() {
	    ImplicitFlow("/authorization")
	
	    Scope("api:write", "Write acess")
	    Scope("api:read", "Read access")
	})



## <a name="OPTIONS">func</a> [OPTIONS](/src/target/http.go?s=8786:8833#L260)
``` go
func OPTIONS(path string) *httpdesign.RouteExpr
```
OPTIONS creates a route using the OPTIONS HTTP method. See GET.



## <a name="PATCH">func</a> [PATCH](/src/target/http.go?s=9227:9272#L275)
``` go
func PATCH(path string) *httpdesign.RouteExpr
```
PATCH creates a route using the PATCH HTTP method. See GET.



## <a name="POST">func</a> [POST](/src/target/http.go?s=8359:8403#L245)
``` go
func POST(path string) *httpdesign.RouteExpr
```
POST creates a route using the POST HTTP method. See GET.



## <a name="PUT">func</a> [PUT](/src/target/http.go?s=8496:8539#L250)
``` go
func PUT(path string) *httpdesign.RouteExpr
```
PUT creates a route using the PUT HTTP method. See GET.



## <a name="Param">func</a> [Param](/src/target/http.go?s=16115:16159#L475)
``` go
func Param(name string, args ...interface{})
```
Param describes a single HTTP request path or query string parameter.

Param must appear in the API HTTP expression (to define request parameters
common to all the API endpoints), a service HTTP expression to define common
parameters to all the service methods or a specific method HTTP
expression. Param may also appear in a Params expression.

Param accepts the same arguments as the Function Attribute.

The name may be of the form "name of attribute:name of parameter" to define a
mapping between the attribute and parameter names when they differ.

Example:


	var ShowPayload = Type("ShowPayload", func() {
	    Attribute("id", UInt64, "Account ID")
	    Attribute("version", String, "Version", func() {
	        Enum("1.0", "2.0")
	    })
	})
	
	var _ = Service("account", func() {
	    HTTP(func() {
	        Path("/{parentID}")
	        Param("parentID", UInt64, "ID of parent account")
	    })
	    Method("show", func() {  // default response type.
	        Payload(ShowPayload)
	        Result(AccountResult)
	        HTTP(func() {
	            GET("/{id}")           // HTTP request uses ShowPayload "id"
	                                   // attribute to define "id" parameter.
	            Params(func() {        // Params makes it possible to group
	                                   // Param expressions.
	                Param("version:v") // "version" of ShowPayload to define
	                                   // path and query string parameters.
	                                   // Query string "v" maps to attribute
	                                   // "version" of ShowPayload.
	                Param("csrf", String) // HTTP only parameter not defined in
	                                      // ShowPayload
	                Required("crsf")   // Params makes it possible to list the
	                                   // required parameters.
	            })
	        })
	    })
	})



## <a name="Params">func</a> [Params](/src/target/http.go?s=13515:13544#L406)
``` go
func Params(args interface{})
```
Params groups a set of Param expressions. It makes it possible to list
required parameters using the Required function.

Params must appear in an API or Service HTTP expression to define the API or
service base path and query string parameters. Params may also appear in an
method HTTP expression to define the HTTP endpoint path and query string
parameters.

Params accepts one argument: Either a function listing the parameters or a
user type which must be an object and whose attributes define the parameters.

Example:


	var _ = API("cellar", func() {
	    HTTP(func() {
	        Params(func() {
	            Param("version", String, "API version", func() {
	                Enum("1.0", "2.0")
	            })
	            Required("version")
	        })
	    })
	})



## <a name="Parent">func</a> [Parent](/src/target/http.go?s=22868:22892#L710)
``` go
func Parent(name string)
```
Parent sets the name of the parent service. The parent service canonical
method path is used as prefix for all the service HTTP endpoint paths.



## <a name="Password">func</a> [Password](/src/target/aliases.go?s=26852:26899#L827)
``` go
func Password(name string, args ...interface{})
```
Password defines the attribute used to provide the password to an endpoint
secured with basic authentication. The parameters and usage of Password are
the same as the goa DSL Attribute function.

The generated code produced by goa uses the value of the corresponding
payload field to compute the basic authentication Authorization header value.

Password must appear in Payload or Type.

Example:


	Method("login", func() {
	    Security(Basic)
	    Payload(func() {
	        Username("user", String)
	        Password("pass", String)
	    })
	    HTTP(func() {
	        // The "Authorization" header is defined implicitly.
	        POST("/login")
	    })
	})



## <a name="PasswordFlow">func</a> [PasswordFlow](/src/target/aliases.go?s=27176:27222#L837)
``` go
func PasswordFlow(tokenURL, refreshURL string)
```
PasswordFlow defines an Resource Owner Password Credentials OAuth2 flow as
described in section 1.3.3 of RFC 6749.

PasswordFlow must be used in OAuth2Security.

PasswordFlow accepts two arguments: the token and refresh URLs.



## <a name="Path">func</a> [Path](/src/target/http.go?s=6226:6247#L168)
``` go
func Path(val string)
```
Path defines an API or service base path, i.e. a common path prefix to all
the API or service methods. The path may define wildcards (see GET for a
description of the wildcard syntax). The corresponding parameters must be
described using Params. Multiple base paths may be defined for services.



## <a name="Pattern">func</a> [Pattern](/src/target/aliases.go?s=27400:27422#L843)
``` go
func Pattern(p string)
```
Pattern adds a "pattern" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor33">https://json-schema.org/latest/json-schema-validation.html#anchor33</a>.



## <a name="Payload">func</a> [Payload](/src/target/aliases.go?s=29312:29362#L911)
``` go
func Payload(val interface{}, args ...interface{})
```
Payload defines the data type of an method input. Payload also makes the
input required.

Payload must appear in a Method expression.

Payload takes one to three arguments. The first argument is either a type or
a DSL function. If the first argument is a type then an optional description
may be passed as second argument. Finally a DSL may be passed as last
argument that further specializes the type by providing additional
validations (e.g. list of required attributes)

The valid usage for Payload are thus:


	Payload(Type)
	
	Payload(func())
	
	Payload(Type, "description")
	
	Payload(Type, func())
	
	Payload(Type, "description", func())

Examples:


	Method("upper"), func() {
	    // Use primitive type.
	    Payload(String)
	}
	
	Method("upper"), func() {
	    // Use primitive type.and description
	    Payload(String, "string to convert to uppercase")
	}
	
	Method("upper"), func() {
	    // Use primitive type, description and validations
	    Payload(String, "string to convert to uppercase", func() {
	        Pattern("^[a-z]")
	    })
	}
	
	Method("add", func() {
	    // Define payload data structure inline
	    Payload(func() {
	        Description("Left and right operands to add")
	        Attribute("left", Int32, "Left operand")
	        Attribute("right", Int32, "Left operand")
	        Required("left", "right")
	    })
	})
	
	Method("add", func() {
	    // Define payload type by reference to user type
	    Payload(Operands)
	})
	
	Method("divide", func() {
	    // Specify additional required attributes on user type.
	    Payload(Operands, func() {
	        Required("left", "right")
	    })
	})



## <a name="Produces">func</a> [Produces](/src/target/http.go?s=5720:5749#L155)
``` go
func Produces(args ...string)
```
Produces adds a MIME type to the list of MIME types the APIs supports when
writing responses. While the DSL supports any MIME type, the code generator
only knows to generate the code for "application/json", "application/xml" and
"application/gob". The service code must provide the encoders for other MIME
types.

Produces must appear in the HTTP expression of API.

Produces accepts one or more strings corresponding to the MIME types.

Example:


	API("cellar", func() {
	    // ...
	    HTTP(func() {
	        Produces("application/json", "application/xml")
	        // ...
	    })
	})



## <a name="Reference">func</a> [Reference](/src/target/aliases.go?s=30617:30650#L952)
``` go
func Reference(t design.DataType)
```
Reference sets a type or result type reference. The value itself can be a
type or a result type. The reference type attributes define the default
properties for attributes with the same name in the type using the reference.

Reference may be used in Type or ResultType, it may appear multiple times in
which case attributes are looked up in each reference in order of appearance
in the DSL.

Reference accepts a single argument: the type or result type containing the
attributes that define the default properties of the attributes of the type
or result type that uses Reference.

Example:


	var Bottle = Type("bottle", func() {
		Attribute("name", String, func() {
			MinLength(3)
		})
		Attribute("vintage", Int32, func() {
			Minimum(1970)
		})
		Attribute("somethingelse", String)
	})
	
	var BottleResult = ResultType("vnd.goa.bottle", func() {
		Reference(Bottle)
		Attributes(func() {
			Attribute("id", UInt64, "ID is the bottle identifier")
	
			// The type and validation of "name" and "vintage" are
			// inherited from the Bottle type "name" and "vintage"
			// attributes.
			Attribute("name")
			Attribute("vintage")
		})
	})



## <a name="Required">func</a> [Required](/src/target/aliases.go?s=30808:30838#L958)
``` go
func Required(names ...string)
```
Required adds a "required" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor61">https://json-schema.org/latest/json-schema-validation.html#anchor61</a>.



## <a name="Response">func</a> [Response](/src/target/response.go?s=5035:5086#L148)
``` go
func Response(val interface{}, args ...interface{})
```
Response describes a single HTTP response. Response describes both success and
error responses. When describing an error response the first argument is the
name of the error.

While a service method may only define a single result type Response may be
called multiple times to define multiple success HTTP responses. In this case
the Tag expression makes it possible to specify the name of a field in the
method result type and a value that the field must have for the
corresponding response to be sent. The tag field must be of type String.

Response allows specifying the response status code as an argument or via the
Code expression, headers via the Header and ContentType expressions and body
via the Body expression.

By default success HTTP responses use status code 200 and error HTTP responses
use status code 400. Also by default the responses use the method result
type (success responses) or error type (error responses) to define the
response body shape.

Additionally if the response type is a result type then the "Content-Type"
response header is set with the corresponding content type (either the value
set with ContentType in the result type DSL or the result type identifier).

In other words given the following type:


	var AccountResult = ResultType("application/vnd.goa.account", func() {
	    Attributes(func() {
	        Attribute("href", String, "Account API href")
	        Attribute("name", String, "Account name")
	    })
	    View("default", func() {
	        Attribute("href")
	        Attribute("name")
	    })
	})

the following:


	Method("show", func() {
	    Response(AccountResult)
	})

is equivalent to:


	Method("show", func() {
	    Response(AccountResult)
	    HTTP(func() {
	        Response(func() {
	            Code(StatusOK)
	            ContentType("application/vnd.goa.account")
	            Body(AccountResult)
	        })
	    })
	})

Also by default attributes of the response type that are not used to define
headers are used to define the response body shape.

The following:


	Method("show", func() {
	    Response(ShowResponse)
	    HTTP(func() {
	        Response(func() {
	            Header("href")
	        })
	    })
	})

is thus equivalent to:


	Method("show", func() {
	    Response(ShowResponse)
	    HTTP(func() {
	        Response(func() {
	            Code(StatusOK)
	            ContentType("application/vnd.goa.account")
	            Header("href", String, "Account API href")
	            Body(func() {
	                Attribute("name", String, "Account name")
	            })
	        })
	    })
	})

Response must appear in a API or service HTTP expression to define error
responses common to all the API or service methods. Response may also appear
in an method HTTP expression to define both the success and error responses
specific to the method.

Response takes one to three arguments. Success responses accept a status code
or a function as first argument. If the first argument is a status code then
a function may be given as second argument. The valid invocations are thus:

* Response(func)

* Response(status)

* Response(status, func)

Error responses additionally accept the name of the error as first argument.

* Response(error_name, func)

* Response(error_name, status)

* Response(error_name, status, func)

Example:


	Method("create", func() {
	    Payload(CreatePayload)
	    Result(CreateResult)
	    Error("an_error")
	
	    HTTP(func() {
	        Response(func() {
	            Description("Response used when item already exists")
	            Code(StatusNoContent) // HTTP status code set using Code
	            Body(Empty)           // Override method result type
	        })
	
	        Response(StatusCreated, func () { // Uses HTTP status code 201 Created and
	            Tag("outcome", "created")     // CreateResult type to describe body
	        })
	
	        Response(StatusAccepted, func() {
	            Tag("outcome", "accepted")    // Tag identifies result struct field and field
	                                          // value used to identify how to encode response.
	            Description("Response used for async creations")
	            Body(func() {
	                Attribute("taskHref", String, "API href to async task")
	            })
	        })
	
	        Response("an_error", StatusConflict) // Override default of 400
	    })
	})



## <a name="Result">func</a> [Result](/src/target/aliases.go?s=32831:32880#L1028)
``` go
func Result(val interface{}, args ...interface{})
```
Result defines the data type of a method output.

Result must appear in a Method expression.

Result takes one to three arguments. The first argument is either a type or a
DSL function. If the first argument is a type then an optional description
may be passed as second argument. Finally a DSL may be passed as last
argument that further specializes the type by providing additional
validations (e.g. list of required attributes) The DSL may also specify a
view when the first argument is a result type corresponding to the view
rendered by this method. If no view is specified then the generated code
defines response methods for all views.

The valid syntax for Result is thus:


	Result(Type)
	
	Result(func())
	
	Result(Type, "description")
	
	Result(Type, func())
	
	Result(Type, "description", func())

Examples:


	// Define result using primitive type
	Method("add", func() {
	    Result(Int32)
	})
	
	// Define result using primitive type and description
	Method("add", func() {
	    Result(Int32, "Resulting sum")
	})
	
	// Define result using primitive type, description and validations.
	Method("add", func() {
	    Result(Int32, "Resulting sum", func() {
	        Minimum(0)
	    })
	})
	
	// Define result using object defined inline
	Method("add", func() {
	    Result(func() {
	        Description("Result defines a single field which is the sum.")
	        Attribute("value", Int32, "Resulting sum")
	        Required("value")
	    })
	})
	
	// Define result type using user type
	Method("add", func() {
	    Result(Sum)
	})
	
	// Specify view and required attributes on result type
	Method("add", func() {
	    Result(Sum, func() {
	        View("default")
	        Required("value")
	    })
	})



## <a name="ResultType">func</a> [ResultType](/src/target/aliases.go?s=34789:34857#L1080)
``` go
func ResultType(identifier string, fn func()) *design.ResultTypeExpr
```
ResultType defines a result type used to describe a method response.

Result types have a unique identifier as described in RFC 6838. The
identifier defines the default value for the Content-Type header of HTTP
responses.

The result type expression includes a listing of all the response attributes.
Views specify which of the attributes are actually rendered so that the same
result type expression may represent multiple rendering of a given response.

All result types have a view named "default". This view is used to render the
result type in responses when no other view is specified. If the default view
is not explicitly described in the DSL then one is created that lists all the
result type attributes.

ResultType is a top level DSL.

ResultType accepts two arguments: the result type identifier and the defining
DSL.

Example:


	var BottleMT = ResultType("application/vnd.goa.example.bottle", func() {
	    Description("A bottle of wine")
	    TypeName("BottleResult")         // Override generated type name
	    ContentType("application/json") // Override Content-Type header
	
	    Attributes(func() {
	        Attribute("id", Int, "ID of bottle")
	        Attribute("href", String, "API href of bottle")
	        Attribute("account", Account, "Owner account")
	        Attribute("origin", Origin, "Details on wine origin")
	        Required("id", "href")
	    })
	
	    View("default", func() {        // Explicitly define default view
	        Attribute("id")
	        Attribute("href")
	    })
	
	    View("extended", func() {       // Define "extended" view
	        Attribute("id")
	        Attribute("href")
	        Attribute("account")
	        Attribute("origin")
	    })
	 })



## <a name="Scope">func</a> [Scope](/src/target/aliases.go?s=35612:35651#L1106)
``` go
func Scope(name string, desc ...string)
```
Scope has two uses: in JWTSecurity or OAuth2Security it defines a scope
supported by the scheme. In Security it lists required scopes.

Scope must appear in Security, JWTSecurity or OAuth2Security.

Scope accepts one or two arguments: the first argument is the scope name and
when used in JWTSecurity or OAuth2Security the second argument is a
description.

Example:


	var JWT = JWTSecurity("JWT", func() {
	    Scope("api:read", "Read access") // Defines a scope
	    Scope("api:write", "Write access")
	})
	
	Method("secured", func() {
	    Security(JWT, func() {
	        Scope("api:read") // Required scope for auth
	    })
	})



## <a name="Security">func</a> [Security](/src/target/aliases.go?s=37739:37773#L1167)
``` go
func Security(args ...interface{})
```
Security defines authentication requirements to access an API, a service or a
service method.

The requirement refers to one or more OAuth2Security, BasicAuthSecurity,
APIKeySecurity or JWTSecurity security scheme. If the schemes include a
OAuth2Security or JWTSecurity scheme then required scopes may be listed by
name in the Security DSL. All the listed schemes must be validated by the
client for the request to be authorized. Security may appear multiple times
in the same scope in which case the client may validate any one of the
requirements for the request to be authorized.

Security must appear in a API, Service or Method expression.

Security accepts an arbitrary number of security schemes as argument
specified by name or by reference and an optional DSL function as last
argument.

Examples:


	var _ = API("calc", func() {
	    // All API endpoints are secured via basic auth by default.
	    Security(BasicAuth)
	})
	
	var _ = Service("calculator", func() {
	    // Override default API security requirements. Accept either basic
	    // auth or OAuth2 access token with "api:read" scope.
	    Security(BasicAuth)
	    Security("oauth2", func() {
	        Scope("api:read")
	    })
	
	    Method("add", func() {
	        Description("Add two operands")
	
	        // Override default service security requirements. Require
	        // both basic auth and OAuth2 access token with "api:write"
	        // scope.
	        Security(BasicAuth, "oauth2", func() {
	            Scope("api:write")
	        })
	
	        Payload(Operands)
	        Error(ErrBadRequest, ErrorResult)
	    })
	
	    Method("health-check", func() {
	        Description("Check health")
	
	        // Remove need for authorization for this endpoint.
	        NoSecurity()
	
	        Payload(Operands)
	        Error(ErrBadRequest, ErrorResult)
	    })
	})



## <a name="Server">func</a> [Server](/src/target/aliases.go?s=37833:37870#L1172)
``` go
func Server(url string, fn ...func())
```
Server defines an API host.



## <a name="Service">func</a> [Service](/src/target/aliases.go?s=39522:39578#L1209)
``` go
func Service(name string, fn func()) *design.ServiceExpr
```
Service defines a group of related methods. Refer to the transport specific
DSLs to learn how to provide transport specific information.

Service is as a top level expression.
Service accepts two arguments: the name of the service (which must be unique
in the design package) and its defining DSL.

Example:


	var _ = Service("divider", func() {
	    Description("divider service") // Optional description
	
	    DefaultType(DivideResult) // Default response type for the service
	                              // methods. Also defines default
	                              // properties (type, description and
	                              // validations) for attributes with
	                              // identical names in request types.
	
	    Error("Unauthorized", Unauthorized) // Error response that applies to
	                                        // all methods
	
	    Method("divide", func() {     // Defines a single method
	        Description("The divide method returns the division of A and B")
	        Request(DivideRequest)    // Request type listing all request
	                                  // parameters in its attributes.
	        Response(DivideResponse)  // Response type.
	        Error("DivisionByZero", DivByZero) // Error, has a name and
	                                           // optionally a type
	                                           // (DivByZero) describes the
	                                           // error response.
	    })
	})



## <a name="StreamingPayload">func</a> [StreamingPayload](/src/target/aliases.go?s=40941:41000#L1256)
``` go
func StreamingPayload(val interface{}, args ...interface{})
```
StreamingPayload defines a method that accepts a stream of instances of the
given type.

StreamingPayload must appear in a Method expression.

The arguments to a StreamingPayload DSL is same as the Payload DSL.

Examples:


	   // Method payload is the JWT token and the method streaming payload is a
	   // stream of strings.
	   Method("upper", func() {
	       Payload(func() {
	           Token("token", String, func() {
						      Description("JWT used for authentication")
							})
					})
	       StreamingPayload(String)
	   })
	
	   // Method streaming payload is a stream of string with validation set
			// on each
	   Method("upper"), func() {
	       StreamingPayload(String, "string to convert to uppercase", func() {
	           Pattern("^[a-z]")
	       })
	   }
	
	   // Method payload is a stream of objects defined inline
	   Method("add", func() {
	       StreamingPayload(func() {
	           Description("Left and right operands to add")
	           Attribute("left", Int32, "Left operand")
	           Attribute("right", Int32, "Left operand")
	           Required("left", "right")
	       })
	   })
	
	   // Method payload is a stream of user type
	   Method("add", func() {
	       StreamingPayload(Operands)
	   })



## <a name="StreamingResult">func</a> [StreamingResult](/src/target/aliases.go?s=42348:42406#L1306)
``` go
func StreamingResult(val interface{}, args ...interface{})
```
StreamingResult defines a method that streams instances of the given type.

StreamingResult must appear in a Method expression.

The arguments to a StreamingResult DSL is same as the Result DSL.

Examples:


	// Method result is a stream of integers
	Method("add", func() {
	    StreamingResult(Int32)
	})
	
	Method("add", func() {
	    StreamingResult(Int32, "Resulting sum")
	})
	
	// Method result is a stream of integers with validation set on each
	Method("add", func() {
	    StreamingResult(Int32, "Resulting sum", func() {
	        Minimum(0)
	    })
	})
	
	// Method result is a stream of objects defined inline
	Method("add", func() {
	    StreamingResult(func() {
	        Description("Result defines a single field which is the sum.")
	        Attribute("value", Int32, "Resulting sum")
	        Required("value")
	    })
	})
	
	// Method result is a stream of user type
	Method("add", func() {
	    StreamingResult(Sum)
	})
	
	// Method result is a stream of result type with a view
	Method("add", func() {
	    StreamingResult(Sum, func() {
	        View("default")
	        Required("value")
	    })
	})



## <a name="TRACE">func</a> [TRACE](/src/target/http.go?s=8933:8978#L265)
``` go
func TRACE(path string) *httpdesign.RouteExpr
```
TRACE creates a route using the TRACE HTTP method. See GET.



## <a name="Tag">func</a> [Tag](/src/target/response.go?s=7225:7253#L222)
``` go
func Tag(name, value string)
```
Tag identifies a method result type field and a value. The algorithm that
encodes the result into the HTTP response iterates through the responses and
uses the first response that has a matching tag (that is for which the result
field with the tag name matches the tag value). There must be one and only
one response with no Tag expression, this response is used when no other tag
matches.

Tag must appear in Response.

Tag accepts two arguments: the name of the field and the (string) value.

Example:


	Method("create", func() {
	    Result(CreateResult)
	    HTTP(func() {
	        Response(StatusCreated, func() {
	            Tag("outcome", "created") // Assumes CreateResult has attribute
	                                      // "outcome" which may be "created"
	                                      // or "accepted"
	        })
	
	        Response(StatusAccepted, func() {
	            Tag("outcome", "accepted")
	        })
	
	        Response(StatusOK)            // Default response if "outcome" is
	                                      // neither "created" nor "accepted"
	    })
	})



## <a name="Temporary">func</a> [Temporary](/src/target/aliases.go?s=42781:42797#L1324)
``` go
func Temporary()
```
Temporary qualifies an error type as describing temporary (i.e. retryable)
errors.

Temporary must appear in a Error expression.

Temporary takes no argument.

Example:


	var _ = Service("divider", func() {
	     Error("request_timeout", func() {
	             Temporary()
	     })
	})



## <a name="TermsOfService">func</a> [TermsOfService](/src/target/aliases.go?s=42892:42925#L1329)
``` go
func TermsOfService(terms string)
```
TermsOfService describes the API terms of services or links to them.



## <a name="Timeout">func</a> [Timeout](/src/target/aliases.go?s=43248:43262#L1346)
``` go
func Timeout()
```
Timeout qualifies an error type as describing errors due to timeouts.

Timeout must appear in a Error expression.

Timeout takes no argument.

Example:


	   var _ = Service("divider", func() {
		   Error("request_timeout", func() {
			   Timeout()
		   })
	   })



## <a name="Title">func</a> [Title](/src/target/aliases.go?s=43366:43388#L1351)
``` go
func Title(val string)
```
Title sets the API title used by the generated documentation and code comments.



## <a name="Token">func</a> [Token](/src/target/aliases.go?s=44110:44154#L1377)
``` go
func Token(name string, args ...interface{})
```
Token defines the attribute used to provide the JWT to an endpoint secured
via JWT. The parameters and usage of Token are the same as the goa DSL
Attribute function.

The generated code produced by goa uses the value of the corresponding
payload field to initialize the Authorization header.

Example:


	Method("secured", func() {
	    Security(JWT)
	    Payload(func() {
	        Token("token", String, "JWT token used to perform authorization")
	        Required("token")
	    })
	    Result(String)
	    HTTP(func() {
	        // The "Authorization" header is defined implicitly.
	        GET("/")
	    })
	})



## <a name="Type">func</a> [Type](/src/target/aliases.go?s=45980:46039#L1424)
``` go
func Type(name string, args ...interface{}) design.UserType
```
Type defines a user type. A user type has a unique name and may be an alias
to an existing type or may describe a completely new type using a list of
attributes (object fields). Attribute types may themselves be user type.
When a user type is defined as an alias to another type it may define
additional validations - for example it a user type which is an alias of
String may define a validation pattern that all instances of the type
must match.

Type is a top level definition.

Type takes two or three arguments: the first argument is the name of the type.
The name must be unique. The second argument is either another type or a
function. If the second argument is a type then there may be a function passed
as third argument.

Example:


	// simple alias
	var MyString = Type("MyString", String)
	
	// alias with description and additional validation
	var Hostname = Type("Hostname", String, func() {
	    Description("A host name")
	    Format(FormatHostname)
	})
	
	// new type
	var SumPayload = Type("SumPayload", func() {
	    Description("Type sent to add method")
	
	    Attribute("a", String)                 // string attribute "a"
	    Attribute("b", Int32, "operand")       // attribute with description
	    Attribute("operands", ArrayOf(Int32))  // array attribute
	    Attribute("ops", MapOf(String, Int32)) // map attribute
	    Attribute("c", SumMod)                 // attribute using user type
	    Attribute("len", Int64, func() {       // attribute with validation
	        Minimum(1)
	    })
	
	    Required("a")                          // Required attributes
	    Required("b", "c")
	})



## <a name="TypeName">func</a> [TypeName](/src/target/aliases.go?s=46431:46457#L1433)
``` go
func TypeName(name string)
```
TypeName makes it possible to set the Go struct name for a type or result
type in the generated code. By default goa uses the name (type) or identifier
(result type) given in the DSL and computes a valid Go identifier from it.
This function makes it possible to override that and provide a custom name.
name must be a valid Go identifier.



## <a name="URL">func</a> [URL](/src/target/aliases.go?s=46785:46805#L1450)
``` go
func URL(url string)
```
URL sets the contact, license or external documentation URL.

URL must appear in Contact, License or Docs

URL accepts a single argument which is the URL.

Example:


	Docs(func() {
	    Description("Additional information")
	    URL("<a href="https://goa.design">https://goa.design</a>")
	})



## <a name="Username">func</a> [Username](/src/target/aliases.go?s=47572:47619#L1477)
``` go
func Username(name string, args ...interface{})
```
Username defines the attribute used to provide the username to an endpoint
secured with basic authentication. The parameters and usage of Username are
the same as the goa DSL Attribute function.

The generated code produced by goa uses the value of the corresponding
payload field to compute the basic authentication Authorization header value.

Username must appear in Payload or Type.

Example:


	Method("login", func() {
	    Security(Basic)
	    Payload(func() {
	        Username("user", String)
	        Password("pass", String)
	    })
	    HTTP(func() {
	        // The "Authorization" header is defined implicitly.
	        POST("/login")
	    })
	})



## <a name="Value">func</a> [Value](/src/target/value.go?s=332:359#L21)
``` go
func Value(val interface{})
```
Value sets the example value.

Value must appear in Example.

Value takes one argument: the example value.

Example:


	Example("A simple bottle", func() {
		Description("This bottle has an ID set to 1")
		Value(Val{"ID": 1})
	})



## <a name="Version">func</a> [Version](/src/target/aliases.go?s=47726:47750#L1482)
``` go
func Version(ver string)
```
Version specifies the API version. One design describes one version.



## <a name="View">func</a> [View](/src/target/aliases.go?s=48678:48716#L1514)
``` go
func View(name string, adsl ...func())
```
View adds a new view to a result type. A view has a name and lists attributes
that are rendered when the view is used to produce a response. The attribute
names must appear in the result type expression. If an attribute is itself a
result type then the view may specify which view to use when rendering the
attribute using the View function in the View DSL. If not specified then the
view named "default" is used.

View must appear in a ResultType expression.

View accepts two arguments: the view name and its defining DSL.

Examples:


	View("default", func() {
		// "id" and "name" must be result type attributes
		Attribute("id")
		Attribute("name")
	})
	
	View("extended", func() {
		Attribute("id")
		Attribute("name")
		Attribute("origin", func() {
			// Use view "extended" to render attribute "origin"
			View("extended")
		})
	})








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
