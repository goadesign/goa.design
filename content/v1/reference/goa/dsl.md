+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/dsl"
+++


# dsl
`import "github.com/goadesign/goa/dsl"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



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
* [func ClientCredentialsFlow(tokenURL, refreshURL string)](#ClientCredentialsFlow)
* [func CollectionOf(v interface{}, adsl ...func()) *design.ResultTypeExpr](#CollectionOf)
* [func Contact(fn func())](#Contact)
* [func ContentType(typ string)](#ContentType)
* [func ConvertTo(obj interface{})](#ConvertTo)
* [func CreateFrom(obj interface{})](#CreateFrom)
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
* [func Format(f design.ValidationFormat)](#Format)
* [func ImplicitFlow(authorizationURL, refreshURL string)](#ImplicitFlow)
* [func JWTSecurity(name string, fn ...func()) *design.SchemeExpr](#JWTSecurity)
* [func Key(fn func())](#Key)
* [func License(fn func())](#License)
* [func MapOf(k, v interface{}, fn ...func()) *design.Map](#MapOf)
* [func MaxLength(val int)](#MaxLength)
* [func Maximum(val interface{})](#Maximum)
* [func Metadata(name string, value ...string)](#Metadata)
* [func Method(name string, fn func())](#Method)
* [func MinLength(val int)](#MinLength)
* [func Minimum(val interface{})](#Minimum)
* [func Name(name string)](#Name)
* [func NoSecurity()](#NoSecurity)
* [func OAuth2Security(name string, fn ...func()) *design.SchemeExpr](#OAuth2Security)
* [func Param(name string, args ...interface{})](#Param)
* [func Password(name string, args ...interface{})](#Password)
* [func PasswordFlow(tokenURL, refreshURL string)](#PasswordFlow)
* [func Pattern(p string)](#Pattern)
* [func Payload(val interface{}, args ...interface{})](#Payload)
* [func Reference(t design.DataType)](#Reference)
* [func Required(names ...string)](#Required)
* [func Result(val interface{}, args ...interface{})](#Result)
* [func ResultType(identifier string, fn func()) *design.ResultTypeExpr](#ResultType)
* [func Scope(name string, desc ...string)](#Scope)
* [func Security(args ...interface{})](#Security)
* [func Server(url string, fn ...func())](#Server)
* [func Service(name string, fn func()) *design.ServiceExpr](#Service)
* [func StreamingPayload(val interface{}, args ...interface{})](#StreamingPayload)
* [func StreamingResult(val interface{}, args ...interface{})](#StreamingResult)
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
[api.go](/src/github.com/goadesign/goa/dsl/api.go) [attribute.go](/src/github.com/goadesign/goa/dsl/attribute.go) [convert.go](/src/github.com/goadesign/goa/dsl/convert.go) [description.go](/src/github.com/goadesign/goa/dsl/description.go) [error.go](/src/github.com/goadesign/goa/dsl/error.go) [metadata.go](/src/github.com/goadesign/goa/dsl/metadata.go) [method.go](/src/github.com/goadesign/goa/dsl/method.go) [payload.go](/src/github.com/goadesign/goa/dsl/payload.go) [result.go](/src/github.com/goadesign/goa/dsl/result.go) [result_type.go](/src/github.com/goadesign/goa/dsl/result_type.go) [security.go](/src/github.com/goadesign/goa/dsl/security.go) [service.go](/src/github.com/goadesign/goa/dsl/service.go) [user_type.go](/src/github.com/goadesign/goa/dsl/user_type.go) [validation.go](/src/github.com/goadesign/goa/dsl/validation.go) [value.go](/src/github.com/goadesign/goa/dsl/value.go) 





## <a name="API">func</a> [API](/src/target/api.go?s=1129:1177#L36)
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



## <a name="APIKey">func</a> [APIKey](/src/target/security.go?s=11022:11075#L408)
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



## <a name="APIKeySecurity">func</a> [APIKeySecurity](/src/target/security.go?s=1259:1324#L61)
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



## <a name="AccessToken">func</a> [AccessToken](/src/target/security.go?s=11978:12028#L437)
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



## <a name="ArrayOf">func</a> [ArrayOf](/src/target/user_type.go?s=3905:3960#L129)
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



## <a name="Attribute">func</a> [Attribute](/src/target/attribute.go?s=4186:4234#L114)
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



## <a name="Attributes">func</a> [Attributes](/src/target/result_type.go?s=12914:12940#L417)
``` go
func Attributes(fn func())
```
Attributes implements the result type Attributes DSL. See ResultType.



## <a name="AuthorizationCodeFlow">func</a> [AuthorizationCodeFlow](/src/target/security.go?s=14483:14556#L522)
``` go
func AuthorizationCodeFlow(authorizationURL, tokenURL, refreshURL string)
```
AuthorizationCodeFlow defines an authorizationCode OAuth2 flow as described
in section 1.3.1 of RFC 6749.

AuthorizationCodeFlow must be used in OAuth2Security.

AuthorizationCodeFlow accepts three arguments: the authorization, token and
refresh URLs.



## <a name="BasicAuthSecurity">func</a> [BasicAuthSecurity](/src/target/security.go?s=423:491#L21)
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



## <a name="ClientCredentialsFlow">func</a> [ClientCredentialsFlow](/src/target/security.go?s=16606:16661#L592)
``` go
func ClientCredentialsFlow(tokenURL, refreshURL string)
```
ClientCredentialsFlow defines an clientCredentials OAuth2 flow as described
in section 1.3.4 of RFC 6749.

ClientCredentialsFlow must be used in OAuth2Security.

ClientCredentialsFlow accepts two arguments: the token and refresh URLs.



## <a name="CollectionOf">func</a> [CollectionOf](/src/target/result_type.go?s=7875:7946#L255)
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



## <a name="Contact">func</a> [Contact](/src/target/api.go?s=1916:1939#L68)
``` go
func Contact(fn func())
```
Contact sets the API contact information.



## <a name="ContentType">func</a> [ContentType](/src/target/result_type.go?s=4719:4747#L145)
``` go
func ContentType(typ string)
```
ContentType sets the value of the Content-Type response header. By default
the ID of the result type is used.

ContentType may appear in a ResultType expression.
ContentType accepts one argument: the mime type as defined by RFC 6838.


	var _ = ResultType("application/vnd.myapp.mytype") {
	    ContentType("application/json")
	}



## <a name="ConvertTo">func</a> [ConvertTo](/src/target/convert.go?s=2207:2238#L64)
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



## <a name="CreateFrom">func</a> [CreateFrom](/src/target/convert.go?s=4740:4772#L139)
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



## <a name="Default">func</a> [Default](/src/target/attribute.go?s=6310:6339#L201)
``` go
func Default(def interface{})
```
Default sets the default value for an attribute.



## <a name="Description">func</a> [Description](/src/target/description.go?s=343:369#L18)
``` go
func Description(d string)
```
Description sets the expression description.

Description must appear in API, Docs, Type or Attribute.

Description accepts one arguments: the description string.

Example:


	API("adder", func() {
	    Description("Adder API")
	})



## <a name="Docs">func</a> [Docs](/src/target/api.go?s=2783:2803#L108)
``` go
func Docs(fn func())
```
Docs provides external documentation URLs.

Docs must appear in an API, Service, Method or Attribute expressions.

Docs takes a single argument which is the defining DSL.

Example:


	var _ = API("cellar", func() {
	    Docs(func() {
	        Description("Additional documentation")
	        URL("<a href="https://goa.design">https://goa.design</a>")
	    })
	})



## <a name="Elem">func</a> [Elem](/src/target/user_type.go?s=6793:6813#L233)
``` go
func Elem(fn func())
```
Elem makes it possible to specify validations for array and map values.



## <a name="Email">func</a> [Email](/src/target/api.go?s=4393:4417#L183)
``` go
func Email(email string)
```
Email sets the contact email.



## <a name="Enum">func</a> [Enum](/src/target/validation.go?s=232:262#L14)
``` go
func Enum(vals ...interface{})
```
Enum adds a "enum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor76">https://json-schema.org/latest/json-schema-validation.html#anchor76</a>.



## <a name="Error">func</a> [Error](/src/target/error.go?s=933:977#L31)
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



## <a name="Example">func</a> [Example](/src/target/attribute.go?s=8021:8054#L252)
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



## <a name="Extend">func</a> [Extend](/src/target/result_type.go?s=12484:12514#L401)
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



## <a name="Fault">func</a> [Fault](/src/target/error.go?s=2973:2985#L122)
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



## <a name="Field">func</a> [Field](/src/target/attribute.go?s=5973:6034#L190)
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



## <a name="Format">func</a> [Format](/src/target/validation.go?s=3056:3094#L88)
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



## <a name="ImplicitFlow">func</a> [ImplicitFlow](/src/target/security.go?s=15225:15279#L546)
``` go
func ImplicitFlow(authorizationURL, refreshURL string)
```
ImplicitFlow defines an implicit OAuth2 flow as described in section 1.3.2
of RFC 6749.

ImplicitFlow must be used in OAuth2Security.

ImplicitFlow accepts two arguments: the authorization and refresh URLs.



## <a name="JWTSecurity">func</a> [JWTSecurity](/src/target/security.go?s=3666:3728#L154)
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



## <a name="Key">func</a> [Key](/src/target/user_type.go?s=6489:6508#L219)
``` go
func Key(fn func())
```
Key makes it possible to specify validations for map keys.



## <a name="License">func</a> [License](/src/target/api.go?s=2181:2204#L81)
``` go
func License(fn func())
```
License sets the API license information.



## <a name="MapOf">func</a> [MapOf](/src/target/user_type.go?s=5196:5250#L175)
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



## <a name="MaxLength">func</a> [MaxLength](/src/target/validation.go?s=7300:7323#L218)
``` go
func MaxLength(val int)
```
MaxLength adds a "maxItems" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor42">https://json-schema.org/latest/json-schema-validation.html#anchor42</a>.



## <a name="Maximum">func</a> [Maximum](/src/target/validation.go?s=5470:5499#L161)
``` go
func Maximum(val interface{})
```
Maximum adds a "maximum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor17">https://json-schema.org/latest/json-schema-validation.html#anchor17</a>.



## <a name="Metadata">func</a> [Metadata](/src/target/metadata.go?s=5319:5362#L130)
``` go
func Metadata(name string, value ...string)
```
Metadata is a set of key/value pairs that can be assigned to an object. Each
value consists of a slice of strings so that multiple invocation of the
Metadata function on the same target using the same key builds up the slice.
Metadata may be set on attributes, result types, endpoints, responses,
services and API definitions.

While keys can have any value the following names are handled explicitly by
goa when set on attributes or types.

type:generate:force forces the code generation for the type it is defined
on. By default goa only generates types that are used explicitly by the
service methods. This metadata key makes it possible to override this
behavior and forces goa to generate the corresponding struct. The value is
a slice of strings that lists the names of the services for which to
generate the struct. If left empty then the struct is generated for all
services.


	package design
	
	var ExternalType = Type("ExternalType", func() {
	        Attribute("name", String)
	        Metadata("type:generate:force", service1, service2)
	})
	
	var _ = Service("service1", func() {
	        ...
	})
	
	var _ = Service("service2", func() {
	        ...
	})

struct:error:name identifies the attribute of a result type used to select
the returned error when multiple errors are defined on the same method.
The value of the field corresponding to the attribute with the
struct:error:name metadata is matched against the names of the method
errors as defined in the design. This makes it possible to define distinct
transport mappings for the various errors (for example to return different
HTTP status codes). There must be one and exactly one attribute with the
struct:error:name metadata defined on result types used to define error
results.


	var CustomErrorType = ResultType("application/vnd.goa.error", func() {
	        Attribute("message", String, "Error returned.", func() {
	                Metadata("struct:error:name")
	        })
	        Attribute("occurred_at", DateTime, "Time error occurred.")
	})
	
	var _ = Service("MyService", func() {
	        Error("internal_error", CustomErrorType)
	        Error("bad_request", CustomErrorType)
	})

`struct:field:name`: overrides the Go struct field name generated by default
by goa.  Applicable to attributes only.


	Metadata("struct:field:name", "MyName")

`struct:field:origin`: overrides the name of the value used to initialize an
attribute value. For example if the attributes describes an HTTP header this
metadata specifies the name of the header in case it's different from the name
of the attribute. Applicable to attributes only.


	Metadata("struct:field:origin", "X-API-Version")

`struct:tag:xxx`: sets the struct field tag xxx on generated Go structs.
Overrides tags that goa would otherwise set.  If the metadata value is a
slice then the strings are joined with the space character as separator.
Applicable to attributes only.


	Metadata("struct:tag:json", "myName,omitempty")
	Metadata("struct:tag:xml", "myName,attr")

`swagger:generate`: specifies whether Swagger specification should be
generated. Defaults to true.
Applicable to services, methods and file servers.


	Metadata("swagger:generate", "false")

`swagger:summary`: sets the Swagger operation summary field.
Applicable to endpoints.


	Metadata("swagger:summary", "Short summary of what endpoint does")

`swagger:example`: specifies whether to generate random example. Defaults to
true.
Applicable to API (for global setting) or individual attributes.


	Metadata("swagger:example", "false")

`swagger:tag:xxx`: sets the Swagger object field tag xxx.
Applicable to services and endpoints.


	Metadata("swagger:tag:Backend")
	Metadata("swagger:tag:Backend:desc", "Description of Backend")
	Metadata("swagger:tag:Backend:url", "<a href="https://example.com">https://example.com</a>")
	Metadata("swagger:tag:Backend:url:desc", "See more docs here")

`swagger:extension:xxx`: sets the Swagger extensions xxx. It can have any
valid JSON format value.
Applicable to:
api as within the info and tag object,
service within the paths object,
endpoint as within the path-item object,
route as within the operation object,
param as within the parameter object,
response as within the response object
and security as within the security-scheme object.
See <a href="https://github.com/OAI/OpenAPI-Specification/blob/master/guidelines/EXTENSIONS.md">https://github.com/OAI/OpenAPI-Specification/blob/master/guidelines/EXTENSIONS.md</a>.


	Metadata("swagger:extension:x-api", `{"foo":"bar"}`)

The special key names listed above may be used as follows:


	var Account = Type("Account", func() {
	        Attribute("service", String, "Name of service", func() {
	                // Override default name
	                Metadata("struct:field:name", "ServiceName")
	        })
	})



## <a name="Method">func</a> [Method](/src/target/method.go?s=595:630#L27)
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



## <a name="MinLength">func</a> [MinLength](/src/target/validation.go?s=6687:6710#L196)
``` go
func MinLength(val int)
```
MinLength adds a "minItems" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor45">https://json-schema.org/latest/json-schema-validation.html#anchor45</a>.



## <a name="Minimum">func</a> [Minimum](/src/target/validation.go?s=4256:4285#L126)
``` go
func Minimum(val interface{})
```
Minimum adds a "minimum" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor21">https://json-schema.org/latest/json-schema-validation.html#anchor21</a>.



## <a name="Name">func</a> [Name](/src/target/api.go?s=4165:4187#L171)
``` go
func Name(name string)
```
Name sets the contact or license name.



## <a name="NoSecurity">func</a> [NoSecurity](/src/target/security.go?s=7560:7577#L297)
``` go
func NoSecurity()
```
NoSecurity removes the need for an endpoint to perform authorization.

NoSecurity must appear in Method.



## <a name="OAuth2Security">func</a> [OAuth2Security](/src/target/security.go?s=2395:2460#L106)
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



## <a name="Param">func</a> [Param](/src/target/api.go?s=3954:3998#L162)
``` go
func Param(name string, args ...interface{})
```
Param defines a server URL parameter.



## <a name="Password">func</a> [Password](/src/target/security.go?s=9537:9584#L365)
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



## <a name="PasswordFlow">func</a> [PasswordFlow](/src/target/security.go?s=15928:15974#L569)
``` go
func PasswordFlow(tokenURL, refreshURL string)
```
PasswordFlow defines an Resource Owner Password Credentials OAuth2 flow as
described in section 1.3.3 of RFC 6749.

PasswordFlow must be used in OAuth2Security.

PasswordFlow accepts two arguments: the token and refresh URLs.



## <a name="Pattern">func</a> [Pattern](/src/target/validation.go?s=3662:3684#L106)
``` go
func Pattern(p string)
```
Pattern adds a "pattern" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor33">https://json-schema.org/latest/json-schema-validation.html#anchor33</a>.



## <a name="Payload">func</a> [Payload](/src/target/payload.go?s=1941:1991#L72)
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



## <a name="Reference">func</a> [Reference](/src/target/result_type.go?s=11365:11398#L364)
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



## <a name="Required">func</a> [Required](/src/target/validation.go?s=7912:7942#L240)
``` go
func Required(names ...string)
```
Required adds a "required" validation to the attribute.
See <a href="https://json-schema.org/latest/json-schema-validation.html#anchor61">https://json-schema.org/latest/json-schema-validation.html#anchor61</a>.



## <a name="Result">func</a> [Result](/src/target/result.go?s=2036:2085#L74)
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



## <a name="ResultType">func</a> [ResultType](/src/target/result_type.go?s=2090:2158#L64)
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



## <a name="Scope">func</a> [Scope](/src/target/security.go?s=13672:13711#L491)
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



## <a name="Security">func</a> [Security](/src/target/security.go?s=6219:6253#L239)
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



## <a name="Server">func</a> [Server](/src/target/api.go?s=3382:3419#L137)
``` go
func Server(url string, fn ...func())
```
Server defines an API host.



## <a name="Service">func</a> [Service](/src/target/service.go?s=1695:1751#L41)
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



## <a name="StreamingPayload">func</a> [StreamingPayload](/src/target/payload.go?s=3529:3588#L127)
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



## <a name="StreamingResult">func</a> [StreamingResult](/src/target/result.go?s=3609:3667#L133)
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



## <a name="Temporary">func</a> [Temporary](/src/target/error.go?s=1892:1908#L71)
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



## <a name="TermsOfService">func</a> [TermsOfService](/src/target/api.go?s=3197:3230#L128)
``` go
func TermsOfService(terms string)
```
TermsOfService describes the API terms of services or links to them.



## <a name="Timeout">func</a> [Timeout](/src/target/error.go?s=2421:2435#L96)
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



## <a name="Title">func</a> [Title](/src/target/api.go?s=1531:1553#L50)
``` go
func Title(val string)
```
Title sets the API title used by the generated documentation and code comments.



## <a name="Token">func</a> [Token](/src/target/security.go?s=12826:12870#L464)
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



## <a name="Type">func</a> [Type](/src/target/user_type.go?s=1867:1926#L51)
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



## <a name="TypeName">func</a> [TypeName](/src/target/result_type.go?s=4044:4070#L121)
``` go
func TypeName(name string)
```
TypeName makes it possible to set the Go struct name for a type or result
type in the generated code. By default goa uses the name (type) or identifier
(result type) given in the DSL and computes a valid Go identifier from it.
This function makes it possible to override that and provide a custom name.
name must be a valid Go identifier.



## <a name="URL">func</a> [URL](/src/target/api.go?s=4802:4822#L202)
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



## <a name="Username">func</a> [Username](/src/target/security.go?s=8648:8695#L337)
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



## <a name="Value">func</a> [Value](/src/target/value.go?s=334:361#L19)
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



## <a name="Version">func</a> [Version](/src/target/api.go?s=1735:1759#L59)
``` go
func Version(ver string)
```
Version specifies the API version. One design describes one version.



## <a name="View">func</a> [View](/src/target/result_type.go?s=5778:5816#L181)
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
