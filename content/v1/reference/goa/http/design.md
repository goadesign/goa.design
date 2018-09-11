+++
date="2018-09-06T11:21:50-07:00"
description="github.com/goadesign/goa/http/design"
+++


# design
`import "github.com/goadesign/goa/http/design"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func ErrorResponseBody(a *EndpointExpr, v *ErrorExpr) *design.AttributeExpr](#ErrorResponseBody)
* [func ExtractRouteWildcards(path string) []string](#ExtractRouteWildcards)
* [func ExtractWildcards(path string) []string](#ExtractWildcards)
* [func NameMap(encoded string) (string, string)](#NameMap)
* [func RequestBody(a *EndpointExpr) *design.AttributeExpr](#RequestBody)
* [func ResponseBody(a *EndpointExpr, resp *HTTPResponseExpr) *design.AttributeExpr](#ResponseBody)
* [func RunInvalidHTTPDSL(t *testing.T, dsl func()) error](#RunInvalidHTTPDSL)
* [func StreamingBody(e *EndpointExpr) *design.AttributeExpr](#StreamingBody)
* [type EndpointExpr](#EndpointExpr)
  * [func (e *EndpointExpr) Description() string](#EndpointExpr.Description)
  * [func (e *EndpointExpr) EvalName() string](#EndpointExpr.EvalName)
  * [func (e *EndpointExpr) Finalize()](#EndpointExpr.Finalize)
  * [func (e *EndpointExpr) HasAbsoluteRoutes() bool](#EndpointExpr.HasAbsoluteRoutes)
  * [func (e *EndpointExpr) Name() string](#EndpointExpr.Name)
  * [func (e *EndpointExpr) PathParams() *design.MappedAttributeExpr](#EndpointExpr.PathParams)
  * [func (e *EndpointExpr) Prepare()](#EndpointExpr.Prepare)
  * [func (e *EndpointExpr) QueryParams() *design.MappedAttributeExpr](#EndpointExpr.QueryParams)
  * [func (e *EndpointExpr) Validate() error](#EndpointExpr.Validate)
* [type ErrorExpr](#ErrorExpr)
  * [func (e *ErrorExpr) Dup() *ErrorExpr](#ErrorExpr.Dup)
  * [func (e *ErrorExpr) EvalName() string](#ErrorExpr.EvalName)
  * [func (e *ErrorExpr) Finalize(a *EndpointExpr)](#ErrorExpr.Finalize)
  * [func (e *ErrorExpr) Validate() *eval.ValidationErrors](#ErrorExpr.Validate)
* [type FileServerExpr](#FileServerExpr)
  * [func (f *FileServerExpr) EvalName() string](#FileServerExpr.EvalName)
  * [func (f *FileServerExpr) Finalize()](#FileServerExpr.Finalize)
  * [func (f *FileServerExpr) IsDir() bool](#FileServerExpr.IsDir)
* [type HTTPResponseExpr](#HTTPResponseExpr)
  * [func (r *HTTPResponseExpr) Dup() *HTTPResponseExpr](#HTTPResponseExpr.Dup)
  * [func (r *HTTPResponseExpr) EvalName() string](#HTTPResponseExpr.EvalName)
  * [func (r *HTTPResponseExpr) Finalize(a *EndpointExpr, svcAtt *design.AttributeExpr)](#HTTPResponseExpr.Finalize)
  * [func (r *HTTPResponseExpr) Prepare()](#HTTPResponseExpr.Prepare)
  * [func (r *HTTPResponseExpr) Validate(e *EndpointExpr) *eval.ValidationErrors](#HTTPResponseExpr.Validate)
* [type RootExpr](#RootExpr)
  * [func RunHTTPDSL(t *testing.T, dsl func()) *RootExpr](#RunHTTPDSL)
  * [func (r *RootExpr) DependsOn() []eval.Root](#RootExpr.DependsOn)
  * [func (r *RootExpr) EvalName() string](#RootExpr.EvalName)
  * [func (r *RootExpr) Packages() []string](#RootExpr.Packages)
  * [func (r *RootExpr) Schemes() []string](#RootExpr.Schemes)
  * [func (r *RootExpr) Service(name string) *ServiceExpr](#RootExpr.Service)
  * [func (r *RootExpr) ServiceFor(s *design.ServiceExpr) *ServiceExpr](#RootExpr.ServiceFor)
  * [func (r *RootExpr) WalkSets(walk eval.SetWalker)](#RootExpr.WalkSets)
* [type RouteExpr](#RouteExpr)
  * [func (r *RouteExpr) EvalName() string](#RouteExpr.EvalName)
  * [func (r *RouteExpr) FullPaths() []string](#RouteExpr.FullPaths)
  * [func (r *RouteExpr) IsAbsolute() bool](#RouteExpr.IsAbsolute)
  * [func (r *RouteExpr) Params() []string](#RouteExpr.Params)
  * [func (r *RouteExpr) Validate() *eval.ValidationErrors](#RouteExpr.Validate)
* [type ServiceExpr](#ServiceExpr)
  * [func (svc *ServiceExpr) CanonicalEndpoint() *EndpointExpr](#ServiceExpr.CanonicalEndpoint)
  * [func (svc *ServiceExpr) Description() string](#ServiceExpr.Description)
  * [func (svc *ServiceExpr) Endpoint(name string) *EndpointExpr](#ServiceExpr.Endpoint)
  * [func (svc *ServiceExpr) EndpointFor(name string, m *design.MethodExpr) *EndpointExpr](#ServiceExpr.EndpointFor)
  * [func (svc *ServiceExpr) Error(name string) *design.ErrorExpr](#ServiceExpr.Error)
  * [func (svc *ServiceExpr) EvalName() string](#ServiceExpr.EvalName)
  * [func (svc *ServiceExpr) FullPaths() []string](#ServiceExpr.FullPaths)
  * [func (svc *ServiceExpr) HTTPError(name string) *ErrorExpr](#ServiceExpr.HTTPError)
  * [func (svc *ServiceExpr) Name() string](#ServiceExpr.Name)
  * [func (svc *ServiceExpr) Parent() *ServiceExpr](#ServiceExpr.Parent)
  * [func (svc *ServiceExpr) Prepare()](#ServiceExpr.Prepare)
  * [func (svc *ServiceExpr) Schemes() []string](#ServiceExpr.Schemes)
  * [func (svc *ServiceExpr) URITemplate() string](#ServiceExpr.URITemplate)
  * [func (svc *ServiceExpr) Validate() error](#ServiceExpr.Validate)
* [type Val](#Val)


#### <a name="pkg-files">Package files</a>
[aliases.go](/src/github.com/goadesign/goa/http/design/aliases.go) [body_types.go](/src/github.com/goadesign/goa/http/design/body_types.go) [endpoint.go](/src/github.com/goadesign/goa/http/design/endpoint.go) [error.go](/src/github.com/goadesign/goa/http/design/error.go) [file_server.go](/src/github.com/goadesign/goa/http/design/file_server.go) [init.go](/src/github.com/goadesign/goa/http/design/init.go) [response.go](/src/github.com/goadesign/goa/http/design/response.go) [root.go](/src/github.com/goadesign/goa/http/design/root.go) [service.go](/src/github.com/goadesign/goa/http/design/service.go) [testing.go](/src/github.com/goadesign/goa/http/design/testing.go) [val.go](/src/github.com/goadesign/goa/http/design/val.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // FormatDate describes RFC3339 date values.
    FormatDate = design.FormatDate
    // FormatDateTime describes RFC3339 date time values.
    FormatDateTime = design.FormatDateTime
    // FormatUUID describes RFC4122 UUID values.
    FormatUUID = design.FormatUUID
    // FormatEmail describes RFC5322 email addresses.
    FormatEmail = design.FormatEmail
    // FormatHostname describes RFC1035 Internet hostnames.
    FormatHostname = design.FormatHostname
    // FormatIPv4 describes RFC2373 IPv4 address values.
    FormatIPv4 = design.FormatIPv4
    // FormatIPv6 describes RFC2373 IPv6 address values.
    FormatIPv6 = design.FormatIPv6
    // FormatIP describes RFC2373 IPv4 or IPv6 address values.
    FormatIP = design.FormatIP
    // FormatURI describes RFC3986 URI values.
    FormatURI = design.FormatURI
    // FormatMAC describes IEEE 802 MAC-48, EUI-48 or EUI-64 MAC address values.
    FormatMAC = design.FormatMAC
    // FormatCIDR describes RFC4632 and RFC4291 CIDR notation IP address values.
    FormatCIDR = design.FormatCIDR
    // FormatRegexp describes regular expression syntax accepted by RE2.
    FormatRegexp = design.FormatRegexp
    // FormatJSON describes JSON text.
    FormatJSON = design.FormatJSON
    // FormatRFC1123 describes RFC1123 date time values.
    FormatRFC1123 = design.FormatRFC1123
)
```
``` go
const (
    // NoStreamKind represents no payload or result stream in method.
    NoStreamKind = design.NoStreamKind
    // ClientStreamKind represents client sends a streaming payload to method.
    ClientStreamKind = design.ClientStreamKind
    // ServerStreamKind represents server sends a streaming result from method.
    ServerStreamKind = design.ServerStreamKind
    // BidirectionalStreamKind represents client and server sending payload and
    // result respectively via a stream.
    BidirectionalStreamKind = design.BidirectionalStreamKind
)
```
``` go
const (
    // OAuth2Kind identifies a "OAuth2" security scheme.
    OAuth2Kind = design.OAuth2Kind
    // BasicAuthKind means "basic" security scheme.
    BasicAuthKind = design.BasicAuthKind
    // APIKeyKind means "apiKey" security scheme.
    APIKeyKind = design.APIKeyKind
    // JWTKind means an "apiKey" security scheme, with support for
    // TokenPath and Scopes.
    JWTKind = design.JWTKind
    // NoKind means to have no security for this endpoint.
    NoKind = design.NoKind
)
```
``` go
const (
    // AuthorizationCodeFlowKind identifies a OAuth2 authorization code
    // flow.
    AuthorizationCodeFlowKind = design.AuthorizationCodeFlowKind
    // ImplicitFlowKind identifiers a OAuth2 implicit flow.
    ImplicitFlowKind = design.ImplicitFlowKind
    // PasswordFlowKind identifies a Resource Owner Password flow.
    PasswordFlowKind = design.PasswordFlowKind
    // ClientCredentialsFlowKind identifies a OAuth Client Credentials flow.
    ClientCredentialsFlowKind = design.ClientCredentialsFlowKind
)
```
``` go
const (
    // BooleanKind represents a boolean.
    BooleanKind = design.BooleanKind
    // IntKind represents a signed integer.
    IntKind = design.IntKind
    // Int32Kind represents a signed 32-bit integer.
    Int32Kind = design.Int32Kind
    // Int64Kind represents a signed 64-bit integer.
    Int64Kind = design.Int64Kind
    // UIntKind represents an unsigned integer.
    UIntKind = design.UIntKind
    // UInt32Kind represents an unsigned 32-bit integer.
    UInt32Kind = design.UInt32Kind
    // UInt64Kind represents an unsigned 64-bit integer.
    UInt64Kind = design.UInt64Kind
    // Float32Kind represents a 32-bit floating number.
    Float32Kind = design.Float32Kind
    // Float64Kind represents a 64-bit floating number.
    Float64Kind = design.Float64Kind
    // StringKind represents a JSON string.
    StringKind = design.StringKind
    // BytesKind represent a series of bytes (binary data).
    BytesKind = design.BytesKind
    // ArrayKind represents a JSON array.
    ArrayKind = design.ArrayKind
    // ObjectKind represents a JSON object.
    ObjectKind = design.ObjectKind
    // MapKind represents a JSON object where the keys are not known in
    // advance.
    MapKind = design.MapKind
    // UserTypeKind represents a user type.
    UserTypeKind = design.UserTypeKind
    // ResultTypeKind represents a result type.
    ResultTypeKind = design.ResultTypeKind
    // AnyKind represents an unknown type.
    AnyKind = design.AnyKind
)
```
``` go
const (
    // Boolean is the type for a JSON boolean.
    Boolean = design.Boolean
    // Int is the type for a signed integer.
    Int = design.Int
    // Int32 is the type for a signed 32-bit integer.
    Int32 = design.Int32
    // Int64 is the type for a signed 64-bit integer.
    Int64 = design.Int64
    // UInt is the type for an unsigned integer.
    UInt = design.UInt
    // UInt32 is the type for an unsigned 32-bit integer.
    UInt32 = design.UInt32
    // UInt64 is the type for an unsigned 64-bit integer.
    UInt64 = design.UInt64
    // Float32 is the type for a 32-bit floating number.
    Float32 = design.Float32
    // Float64 is the type for a 64-bit floating number.
    Float64 = design.Float64
    // String is the type for a JSON string.
    String = design.String
    // Bytes is the type for binary data.
    Bytes = design.Bytes
    // Any is the type for an arbitrary JSON value (interface{} in Go).
    Any = design.Any
)
```
``` go
const (
    StatusContinue           = 100 // RFC 7231, 6.2.1
    StatusSwitchingProtocols = 101 // RFC 7231, 6.2.2
    StatusProcessing         = 102 // RFC 2518, 10.1

    StatusOK                   = 200 // RFC 7231, 6.3.1
    StatusCreated              = 201 // RFC 7231, 6.3.2
    StatusAccepted             = 202 // RFC 7231, 6.3.3
    StatusNonAuthoritativeInfo = 203 // RFC 7231, 6.3.4
    StatusNoContent            = 204 // RFC 7231, 6.3.5
    StatusResetContent         = 205 // RFC 7231, 6.3.6
    StatusPartialContent       = 206 // RFC 7233, 4.1
    StatusMultiStatus          = 207 // RFC 4918, 11.1
    StatusAlreadyReported      = 208 // RFC 5842, 7.1
    StatusIMUsed               = 226 // RFC 3229, 10.4.1

    StatusMultipleChoices  = 300 // RFC 7231, 6.4.1
    StatusMovedPermanently = 301 // RFC 7231, 6.4.2
    StatusFound            = 302 // RFC 7231, 6.4.3
    StatusSeeOther         = 303 // RFC 7231, 6.4.4
    StatusNotModified      = 304 // RFC 7232, 4.1
    StatusUseProxy         = 305 // RFC 7231, 6.4.5

    StatusTemporaryRedirect = 307 // RFC 7231, 6.4.7
    StatusPermanentRedirect = 308 // RFC 7538, 3

    StatusBadRequest                   = 400 // RFC 7231, 6.5.1
    StatusUnauthorized                 = 401 // RFC 7235, 3.1
    StatusPaymentRequired              = 402 // RFC 7231, 6.5.2
    StatusForbidden                    = 403 // RFC 7231, 6.5.3
    StatusNotFound                     = 404 // RFC 7231, 6.5.4
    StatusMethodNotAllowed             = 405 // RFC 7231, 6.5.5
    StatusNotAcceptable                = 406 // RFC 7231, 6.5.6
    StatusProxyAuthRequired            = 407 // RFC 7235, 3.2
    StatusRequestTimeout               = 408 // RFC 7231, 6.5.7
    StatusConflict                     = 409 // RFC 7231, 6.5.8
    StatusGone                         = 410 // RFC 7231, 6.5.9
    StatusLengthRequired               = 411 // RFC 7231, 6.5.10
    StatusPreconditionFailed           = 412 // RFC 7232, 4.2
    StatusRequestEntityTooLarge        = 413 // RFC 7231, 6.5.11
    StatusRequestURITooLong            = 414 // RFC 7231, 6.5.12
    StatusUnsupportedResultType        = 415 // RFC 7231, 6.5.13
    StatusRequestedRangeNotSatisfiable = 416 // RFC 7233, 4.4
    StatusExpectationFailed            = 417 // RFC 7231, 6.5.14
    StatusTeapot                       = 418 // RFC 7168, 2.3.3
    StatusUnprocessableEntity          = 422 // RFC 4918, 11.2
    StatusLocked                       = 423 // RFC 4918, 11.3
    StatusFailedDependency             = 424 // RFC 4918, 11.4
    StatusUpgradeRequired              = 426 // RFC 7231, 6.5.15
    StatusPreconditionRequired         = 428 // RFC 6585, 3
    StatusTooManyRequests              = 429 // RFC 6585, 4
    StatusRequestHeaderFieldsTooLarge  = 431 // RFC 6585, 5
    StatusUnavailableForLegalReasons   = 451 // RFC 7725, 3

    StatusInternalServerError           = 500 // RFC 7231, 6.6.1
    StatusNotImplemented                = 501 // RFC 7231, 6.6.2
    StatusBadGateway                    = 502 // RFC 7231, 6.6.3
    StatusServiceUnavailable            = 503 // RFC 7231, 6.6.4
    StatusGatewayTimeout                = 504 // RFC 7231, 6.6.5
    StatusHTTPVersionNotSupported       = 505 // RFC 7231, 6.6.6
    StatusVariantAlsoNegotiates         = 506 // RFC 2295, 8.1
    StatusInsufficientStorage           = 507 // RFC 4918, 11.5
    StatusLoopDetected                  = 508 // RFC 5842, 7.2
    StatusNotExtended                   = 510 // RFC 2774, 7
    StatusNetworkAuthenticationRequired = 511 // RFC 6585, 6
)
```
``` go
const (
    // DefaultView is the name of the default result type view.
    DefaultView = design.DefaultView
)
```

## <a name="pkg-variables">Variables</a>
``` go
var (
    // Root holds the root expression built on process initialization.
    Root = &RootExpr{Design: design.Root}

    // WildcardRegex is the regular expression used to capture path
    // parameters.
    WildcardRegex = regexp.MustCompile(`/{\*?([a-zA-Z0-9_]+)}`)

    // ErrorResult is the built-in result type for error responses.
    ErrorResult = design.ErrorResult

    // Empty represents empty values.
    Empty = design.Empty
)
```


## <a name="ErrorResponseBody">func</a> [ErrorResponseBody](/src/target/body_types.go?s=4007:4082#L137)
``` go
func ErrorResponseBody(a *EndpointExpr, v *ErrorExpr) *design.AttributeExpr
```
ErrorResponseBody returns an attribute describing the response body of a
given error. If the DSL defines a body explicitly via the Body function then
the corresponding attribute is returned. Otherwise the attribute is computed
by removing the attributes of the error used to define headers and
parameters.



## <a name="ExtractRouteWildcards">func</a> [ExtractRouteWildcards](/src/target/endpoint.go?s=2597:2645#L76)
``` go
func ExtractRouteWildcards(path string) []string
```
ExtractRouteWildcards returns the names of the wildcards that appear in path.



## <a name="ExtractWildcards">func</a> [ExtractWildcards](/src/target/root.go?s=3834:3877#L153)
``` go
func ExtractWildcards(path string) []string
```
ExtractWildcards returns the names of the wildcards that appear in path.



## <a name="NameMap">func</a> [NameMap](/src/target/root.go?s=4375:4420#L167)
``` go
func NameMap(encoded string) (string, string)
```
NameMap returns the attribute and HTTP element name encoded in the given
string. The encoding uses a simple "attribute:element" notation which allows
to map header or body field names to underlying attributes. The second
element of the encoding is optional in which case both the element and
attribute have the same name.



## <a name="RequestBody">func</a> [RequestBody](/src/target/body_types.go?s=416:471#L15)
``` go
func RequestBody(a *EndpointExpr) *design.AttributeExpr
```
RequestBody returns an attribute describing the request body of the given
endpoint. If the DSL defines a body explicitly via the Body function then the
corresponding attribute is used. Otherwise the attribute is computed by
removing the attributes of the method payload used to define headers and
parameters.



## <a name="ResponseBody">func</a> [ResponseBody](/src/target/body_types.go?s=3374:3454#L123)
``` go
func ResponseBody(a *EndpointExpr, resp *HTTPResponseExpr) *design.AttributeExpr
```
ResponseBody returns an attribute representing the response body for the
given endpoint and response. If the DSL defines a body explicitly via the
Body function then the corresponding attribute is used. Otherwise the
attribute is computed by removing the attributes of the method payload used
to define headers.



## <a name="RunInvalidHTTPDSL">func</a> [RunInvalidHTTPDSL](/src/target/testing.go?s=530:584#L29)
``` go
func RunInvalidHTTPDSL(t *testing.T, dsl func()) error
```
RunInvalidHTTPDSL returns the error resulting from running the given DSL.



## <a name="StreamingBody">func</a> [StreamingBody](/src/target/body_types.go?s=2465:2522#L96)
``` go
func StreamingBody(e *EndpointExpr) *design.AttributeExpr
```
StreamingBody TODO




## <a name="EndpointExpr">type</a> [EndpointExpr](/src/target/endpoint.go?s=574:2111#L22)
``` go
type EndpointExpr struct {
    eval.DSLFunc
    // MethodExpr is the underlying method expression.
    MethodExpr *design.MethodExpr
    // Service is the parent service.
    Service *ServiceExpr
    // Endpoint routes
    Routes []*RouteExpr
    // MapQueryParams - when not nil - indicates that the HTTP
    // request query string parameters are used to build a map.
    //    - If the value is the empty string then the map is stored
    //      in the method payload (which must be of type Map)
    //    - If the value is a non-empty string then the map is
    //      stored in the payload attribute with the corresponding
    //      name (which must of be of type Map)
    MapQueryParams *string
    // Params defines the HTTP request path and query parameters.
    Params *design.MappedAttributeExpr
    // Headers defines the HTTP request headers.
    Headers *design.MappedAttributeExpr
    // Body describes the HTTP request body.
    Body *design.AttributeExpr
    // StreamingBody describes the body transferred through the websocket
    // stream.
    StreamingBody *design.AttributeExpr
    // Responses is the list of all the possible success HTTP
    // responses.
    Responses []*HTTPResponseExpr
    // HTTPErrors is the list of all the possible error HTTP
    // responses.
    HTTPErrors []*ErrorExpr
    // MultipartRequest indicates that the request content type for
    // the endpoint is a multipart type.
    MultipartRequest bool
    // Metadata is a set of key/value pairs with semantic that is
    // specific to each generator, see dsl.Metadata.
    Metadata design.MetadataExpr
}

```
EndpointExpr describes a service endpoint. It embeds a
MethodExpr and adds HTTP specific properties.

It defines both an HTTP endpoint and the shape of HTTP requests and
responses made to that endpoint. The shape of requests is defined via
"parameters", there are path parameters (i.e. portions of the URL
that define parameter values), query string parameters and a payload
parameter (request body).










### <a name="EndpointExpr.Description">func</a> (\*EndpointExpr) [Description](/src/target/endpoint.go?s=2931:2974#L91)
``` go
func (e *EndpointExpr) Description() string
```
Description of HTTP endpoint




### <a name="EndpointExpr.EvalName">func</a> (\*EndpointExpr) [EvalName](/src/target/endpoint.go?s=3085:3125#L96)
``` go
func (e *EndpointExpr) EvalName() string
```
EvalName returns the generic expression name used in error messages.




### <a name="EndpointExpr.Finalize">func</a> (\*EndpointExpr) [Finalize](/src/target/endpoint.go?s=14609:14642#L456)
``` go
func (e *EndpointExpr) Finalize()
```
Finalize is run post DSL execution. It merges response definitions, creates
implicit endpoint parameters and initializes querystring parameters. It also
flattens the error responses and makes sure the error types are all user
types so that the response encoding code can properly use the type to infer
the response that it needs to build.




### <a name="EndpointExpr.HasAbsoluteRoutes">func</a> (\*EndpointExpr) [HasAbsoluteRoutes](/src/target/endpoint.go?s=3444:3491#L110)
``` go
func (e *EndpointExpr) HasAbsoluteRoutes() bool
```
HasAbsoluteRoutes returns true if all the endpoint routes are absolute.




### <a name="EndpointExpr.Name">func</a> (\*EndpointExpr) [Name](/src/target/endpoint.go?s=2831:2867#L86)
``` go
func (e *EndpointExpr) Name() string
```
Name of HTTP endpoint




### <a name="EndpointExpr.PathParams">func</a> (\*EndpointExpr) [PathParams](/src/target/endpoint.go?s=3696:3759#L121)
``` go
func (e *EndpointExpr) PathParams() *design.MappedAttributeExpr
```
PathParams computes a mapped attribute containing the subset of e.Params that
describe path parameters.




### <a name="EndpointExpr.Prepare">func</a> (\*EndpointExpr) [Prepare](/src/target/endpoint.go?s=5106:5138#L171)
``` go
func (e *EndpointExpr) Prepare()
```
Prepare computes the request path and query string parameters as well as the
headers and body taking into account the inherited values from the service.




### <a name="EndpointExpr.QueryParams">func</a> (\*EndpointExpr) [QueryParams](/src/target/endpoint.go?s=4263:4327#L140)
``` go
func (e *EndpointExpr) QueryParams() *design.MappedAttributeExpr
```
QueryParams computes a mapped attribute containing the subset of e.Params
that describe query parameters.




### <a name="EndpointExpr.Validate">func</a> (\*EndpointExpr) [Validate](/src/target/endpoint.go?s=6788:6827#L238)
``` go
func (e *EndpointExpr) Validate() error
```
Validate validates the endpoint expression.




## <a name="ErrorExpr">type</a> [ErrorExpr](/src/target/error.go?s=185:489#L11)
``` go
type ErrorExpr struct {
    // ErrorExpr is the underlying goa design error expression.
    *design.ErrorExpr
    // Name of error, we need a separate copy of the name to match it
    // up with the appropriate ErrorExpr.
    Name string
    // Response is the corresponding HTTP response.
    Response *HTTPResponseExpr
}

```
ErrorExpr defines a HTTP error response including its name,
status, headers and result type.










### <a name="ErrorExpr.Dup">func</a> (\*ErrorExpr) [Dup](/src/target/error.go?s=2107:2143#L80)
``` go
func (e *ErrorExpr) Dup() *ErrorExpr
```
Dup creates a copy of the error expression.




### <a name="ErrorExpr.EvalName">func</a> (\*ErrorExpr) [EvalName](/src/target/error.go?s=565:602#L23)
``` go
func (e *ErrorExpr) EvalName() string
```
EvalName returns the generic definition name used in error messages.




### <a name="ErrorExpr.Finalize">func</a> (\*ErrorExpr) [Finalize](/src/target/error.go?s=1373:1418#L49)
``` go
func (e *ErrorExpr) Finalize(a *EndpointExpr)
```
Finalize looks up the corresponding method error expression.




### <a name="ErrorExpr.Validate">func</a> (\*ErrorExpr) [Validate](/src/target/error.go?s=733:786#L29)
``` go
func (e *ErrorExpr) Validate() *eval.ValidationErrors
```
Validate makes sure there is a error expression that matches the HTTP error
expression.




## <a name="FileServerExpr">type</a> [FileServerExpr](/src/target/file_server.go?s=155:603#L13)
``` go
type FileServerExpr struct {
    // Service is the parent service.
    Service *ServiceExpr
    // Description for docs
    Description string
    // Docs points to the service external documentation
    Docs *design.DocsExpr
    // FilePath is the file path to the static asset(s)
    FilePath string
    // RequestPaths is the list of HTTP paths that serve the assets.
    RequestPaths []string
    // Metadata is a list of key/value pairs
    Metadata design.MetadataExpr
}

```
FileServerExpr defines an endpoint that servers static assets.










### <a name="FileServerExpr.EvalName">func</a> (\*FileServerExpr) [EvalName](/src/target/file_server.go?s=679:721#L30)
``` go
func (f *FileServerExpr) EvalName() string
```
EvalName returns the generic definition name used in error messages.




### <a name="FileServerExpr.Finalize">func</a> (\*FileServerExpr) [Finalize](/src/target/file_server.go?s=928:963#L40)
``` go
func (f *FileServerExpr) Finalize()
```
Finalize normalizes the request path.




### <a name="FileServerExpr.IsDir">func</a> (\*FileServerExpr) [IsDir](/src/target/file_server.go?s=1419:1456#L58)
``` go
func (f *FileServerExpr) IsDir() bool
```
IsDir returns true if the file server serves a directory, false otherwise.




## <a name="HTTPResponseExpr">type</a> [HTTPResponseExpr](/src/target/response.go?s=3581:4169#L81)
``` go
type HTTPResponseExpr struct {
    // HTTP status
    StatusCode int
    // Response description
    Description string
    // Headers describe the HTTP response headers.
    Headers *design.MappedAttributeExpr
    // Response body if any
    Body *design.AttributeExpr
    // Response Content-Type header value
    ContentType string
    // Tag the value a field of the result must have for this
    // response to be used.
    Tag [2]string
    // Parent expression, one of EndpointExpr, ServiceExpr or
    // RootExpr.
    Parent eval.Expression
    // Metadata is a list of key/value pairs
    Metadata design.MetadataExpr
}

```
HTTPResponseExpr defines a HTTP response including its status code,
headers and result type.










### <a name="HTTPResponseExpr.Dup">func</a> (\*HTTPResponseExpr) [Dup](/src/target/response.go?s=7931:7981#L226)
``` go
func (r *HTTPResponseExpr) Dup() *HTTPResponseExpr
```
Dup creates a copy of the response expression.




### <a name="HTTPResponseExpr.EvalName">func</a> (\*HTTPResponseExpr) [EvalName](/src/target/response.go?s=4245:4289#L104)
``` go
func (r *HTTPResponseExpr) EvalName() string
```
EvalName returns the generic definition name used in error messages.




### <a name="HTTPResponseExpr.Finalize">func</a> (\*HTTPResponseExpr) [Finalize](/src/target/response.go?s=6994:7076#L192)
``` go
func (r *HTTPResponseExpr) Finalize(a *EndpointExpr, svcAtt *design.AttributeExpr)
```
Finalize sets the response result type from its type if the type is a result
type and no result type is already specified.




### <a name="HTTPResponseExpr.Prepare">func</a> (\*HTTPResponseExpr) [Prepare](/src/target/response.go?s=4518:4554#L114)
``` go
func (r *HTTPResponseExpr) Prepare()
```
Prepare makes sure the response is initialized even if not done explicitly
by design.




### <a name="HTTPResponseExpr.Validate">func</a> (\*HTTPResponseExpr) [Validate](/src/target/response.go?s=4769:4844#L122)
``` go
func (r *HTTPResponseExpr) Validate(e *EndpointExpr) *eval.ValidationErrors
```
Validate checks that the response definition is consistent: its status is set
and the result type definition if any is valid.




## <a name="RootExpr">type</a> [RootExpr](/src/target/root.go?s=610:1552#L30)
``` go
type RootExpr struct {
    // Design is the transport agnostic root expression.
    Design *design.RootExpr
    // Path is the common request path prefix to all the service
    // HTTP endpoints.
    Path string
    // Params defines the HTTP request path and query parameters
    // common to all the API endpoints.
    Params *design.MappedAttributeExpr
    // Headers defines the HTTP request headers common to to all the
    // API endpoints.
    Headers *design.MappedAttributeExpr
    // Consumes lists the mime types supported by the API
    // controllers.
    Consumes []string
    // Produces lists the mime types generated by the API
    // controllers.
    Produces []string
    // HTTPServices contains the services created by the DSL.
    HTTPServices []*ServiceExpr
    // HTTPErrors lists the error HTTP responses.
    HTTPErrors []*ErrorExpr
    // Metadata is a set of key/value pairs with semantic that is
    // specific to each generator.
    Metadata design.MetadataExpr
}

```
RootExpr is the data structure built by the top level HTTP DSL.







### <a name="RunHTTPDSL">func</a> [RunHTTPDSL](/src/target/testing.go?s=166:217#L11)
``` go
func RunHTTPDSL(t *testing.T, dsl func()) *RootExpr
```
RunHTTPDSL returns the http DSL root resulting from running the given DSL.





### <a name="RootExpr.DependsOn">func</a> (\*RootExpr) [DependsOn](/src/target/root.go?s=3504:3546#L142)
``` go
func (r *RootExpr) DependsOn() []eval.Root
```
DependsOn is a no-op as the DSL runs when loaded.




### <a name="RootExpr.EvalName">func</a> (\*RootExpr) [EvalName](/src/target/root.go?s=2660:2696#L107)
``` go
func (r *RootExpr) EvalName() string
```
EvalName is the expression name used by the evaluation engine to display
error messages.




### <a name="RootExpr.Packages">func</a> (\*RootExpr) [Packages](/src/target/root.go?s=3632:3670#L145)
``` go
func (r *RootExpr) Packages() []string
```
Packages returns the Go import path to this and the dsl packages.




### <a name="RootExpr.Schemes">func</a> (\*RootExpr) [Schemes](/src/target/root.go?s=1625:1662#L59)
``` go
func (r *RootExpr) Schemes() []string
```
Schemes returns the list of HTTP schemes used by the API servers.




### <a name="RootExpr.Service">func</a> (\*RootExpr) [Service](/src/target/root.go?s=2082:2134#L83)
``` go
func (r *RootExpr) Service(name string) *ServiceExpr
```
Service returns the service with the given name if any.




### <a name="RootExpr.ServiceFor">func</a> (\*RootExpr) [ServiceFor](/src/target/root.go?s=2334:2399#L94)
``` go
func (r *RootExpr) ServiceFor(s *design.ServiceExpr) *ServiceExpr
```
ServiceFor creates a new or returns the existing service definition for the
given service.




### <a name="RootExpr.WalkSets">func</a> (\*RootExpr) [WalkSets](/src/target/root.go?s=2793:2841#L112)
``` go
func (r *RootExpr) WalkSets(walk eval.SetWalker)
```
WalkSets iterates through the service to finalize and validate them.




## <a name="RouteExpr">type</a> [RouteExpr](/src/target/endpoint.go?s=2174:2512#L62)
``` go
type RouteExpr struct {
    // Method is the HTTP method, e.g. "GET", "POST", etc.
    Method string
    // Path is the URL path e.g. "/tasks/{id}"
    Path string
    // Endpoint is the endpoint this route applies to.
    Endpoint *EndpointExpr
    // Metadata is an arbitrary set of key/value pairs, see
    // dsl.Metadata
    Metadata design.MetadataExpr
}

```
RouteExpr represents an endpoint route (HTTP endpoint).










### <a name="RouteExpr.EvalName">func</a> (\*RouteExpr) [EvalName](/src/target/endpoint.go?s=21539:21576#L661)
``` go
func (r *RouteExpr) EvalName() string
```
EvalName returns the generic definition name used in error messages.




### <a name="RouteExpr.FullPaths">func</a> (\*RouteExpr) [FullPaths](/src/target/endpoint.go?s=24157:24197#L740)
``` go
func (r *RouteExpr) FullPaths() []string
```
FullPaths returns the endpoint full paths computed by concatenating the API and
service base paths with the endpoint specific paths.




### <a name="RouteExpr.IsAbsolute">func</a> (\*RouteExpr) [IsAbsolute](/src/target/endpoint.go?s=24628:24665#L757)
``` go
func (r *RouteExpr) IsAbsolute() bool
```
IsAbsolute returns true if the endpoint path should not be concatenated to
the service and API base paths.




### <a name="RouteExpr.Params">func</a> (\*RouteExpr) [Params](/src/target/endpoint.go?s=23683:23720#L717)
``` go
func (r *RouteExpr) Params() []string
```
Params returns all the route parameters across all the base paths. For
example for the route "GET /foo/{fooID:foo_id}" Params returns
[]string{"fooID:foo_id"}.




### <a name="RouteExpr.Validate">func</a> (\*RouteExpr) [Validate](/src/target/endpoint.go?s=21850:21903#L668)
``` go
func (r *RouteExpr) Validate() *eval.ValidationErrors
```
Validate validates a route expression by ensuring that the route parameters
can be inferred from the method payload and there is no duplicate parameters
in an absolute route.




## <a name="ServiceExpr">type</a> [ServiceExpr](/src/target/service.go?s=380:1398#L20)
``` go
type ServiceExpr struct {
    eval.DSLFunc
    // ServiceExpr is the service expression that backs this
    // service.
    ServiceExpr *design.ServiceExpr
    // Common URL prefixes to all service endpoint HTTP requests
    Paths []string
    // Params defines the HTTP request path and query parameters
    // common to all the service endpoints.
    Params *design.MappedAttributeExpr
    // Headers defines the HTTP request headers common to all the
    // service endpoints.
    Headers *design.MappedAttributeExpr
    // Name of parent service if any
    ParentName string
    // Endpoint with canonical service path
    CanonicalEndpointName string
    // HTTPEndpoints is the list of service endpoints.
    HTTPEndpoints []*EndpointExpr
    // HTTPErrors lists HTTP errors that apply to all endpoints.
    HTTPErrors []*ErrorExpr
    // FileServers is the list of static asset serving endpoints
    FileServers []*FileServerExpr
    // Metadata is a set of key/value pairs with semantic that is
    // specific to each generator.
    Metadata design.MetadataExpr
}

```
ServiceExpr describes a HTTP service. It defines both a result
type and a set of endpoints that can be executed through HTTP
requests. ServiceExpr embeds a ServiceExpr and adds HTTP specific
properties.










### <a name="ServiceExpr.CanonicalEndpoint">func</a> (\*ServiceExpr) [CanonicalEndpoint](/src/target/service.go?s=2997:3054#L116)
``` go
func (svc *ServiceExpr) CanonicalEndpoint() *EndpointExpr
```
CanonicalEndpoint returns the canonical endpoint of the service if any.
The canonical endpoint is used to compute hrefs to services.




### <a name="ServiceExpr.Description">func</a> (\*ServiceExpr) [Description](/src/target/service.go?s=1539:1583#L55)
``` go
func (svc *ServiceExpr) Description() string
```
Description of service (service)




### <a name="ServiceExpr.Endpoint">func</a> (\*ServiceExpr) [Endpoint](/src/target/service.go?s=2378:2437#L92)
``` go
func (svc *ServiceExpr) Endpoint(name string) *EndpointExpr
```
Endpoint returns the service endpoint with the given name or nil if there
isn't one.




### <a name="ServiceExpr.EndpointFor">func</a> (\*ServiceExpr) [EndpointFor](/src/target/service.go?s=2594:2678#L102)
``` go
func (svc *ServiceExpr) EndpointFor(name string, m *design.MethodExpr) *EndpointExpr
```
EndpointFor builds the endpoint for the given method.




### <a name="ServiceExpr.Error">func</a> (\*ServiceExpr) [Error](/src/target/service.go?s=2095:2155#L81)
``` go
func (svc *ServiceExpr) Error(name string) *design.ErrorExpr
```
Error returns the error with the given name.




### <a name="ServiceExpr.EvalName">func</a> (\*ServiceExpr) [EvalName](/src/target/service.go?s=5101:5142#L192)
``` go
func (svc *ServiceExpr) EvalName() string
```
EvalName returns the generic definition name used in error messages.




### <a name="ServiceExpr.FullPaths">func</a> (\*ServiceExpr) [FullPaths](/src/target/service.go?s=3648:3692#L137)
``` go
func (svc *ServiceExpr) FullPaths() []string
```
FullPaths computes the base paths to the service endpoints concatenating the
API and parent service base paths as needed.




### <a name="ServiceExpr.HTTPError">func</a> (\*ServiceExpr) [HTTPError](/src/target/service.go?s=4868:4925#L182)
``` go
func (svc *ServiceExpr) HTTPError(name string) *ErrorExpr
```
HTTPError returns the service HTTP error with given name if any.




### <a name="ServiceExpr.Name">func</a> (\*ServiceExpr) [Name](/src/target/service.go?s=1431:1468#L50)
``` go
func (svc *ServiceExpr) Name() string
```
Name of service (service)




### <a name="ServiceExpr.Parent">func</a> (\*ServiceExpr) [Parent](/src/target/service.go?s=4625:4670#L172)
``` go
func (svc *ServiceExpr) Parent() *ServiceExpr
```
Parent returns the parent service if any, nil otherwise.




### <a name="ServiceExpr.Prepare">func</a> (\*ServiceExpr) [Prepare](/src/target/service.go?s=5292:5325#L200)
``` go
func (svc *ServiceExpr) Prepare()
```
Prepare initializes the error responses.




### <a name="ServiceExpr.Schemes">func</a> (\*ServiceExpr) [Schemes](/src/target/service.go?s=1679:1721#L60)
``` go
func (svc *ServiceExpr) Schemes() []string
```
Schemes returns the service endpoint HTTP schemes.




### <a name="ServiceExpr.URITemplate">func</a> (\*ServiceExpr) [URITemplate](/src/target/service.go?s=3349:3393#L127)
``` go
func (svc *ServiceExpr) URITemplate() string
```
URITemplate returns a URI template to this service.
The result is the empty string if the service does not have a "show" endpoint
and does not define a different canonical endpoint.




### <a name="ServiceExpr.Validate">func</a> (\*ServiceExpr) [Validate](/src/target/service.go?s=5440:5480#L207)
``` go
func (svc *ServiceExpr) Validate() error
```
Validate makes sure the service is valid.




## <a name="Val">type</a> [Val](/src/target/val.go?s=109:140#L5)
``` go
type Val map[string]interface{}
```
Val is the type used to provide the value of examples for attributes that are
objects.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
