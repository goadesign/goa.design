+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/http/codegen"
+++


# codegen
`import "github.com/goadesign/goa/http/codegen"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Variables](#pkg-variables)
* [func ClientCLIFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File](#ClientCLIFiles)
* [func ClientFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File](#ClientFiles)
* [func ClientTypeFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File](#ClientTypeFiles)
* [func ExampleCLI(genpkg string, root *httpdesign.RootExpr) *codegen.File](#ExampleCLI)
* [func ExampleServerFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File](#ExampleServerFiles)
* [func OpenAPIFiles(root *httpdesign.RootExpr) ([]*codegen.File, error)](#OpenAPIFiles)
* [func PathFiles(root *httpdesign.RootExpr) []*codegen.File](#PathFiles)
* [func RunHTTPDSL(t *testing.T, dsl func()) *httpdesign.RootExpr](#RunHTTPDSL)
* [func ServerFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File](#ServerFiles)
* [func ServerTypeFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File](#ServerTypeFiles)
* [type EndpointData](#EndpointData)
  * [func (e *EndpointData) NeedServerResponse() bool](#EndpointData.NeedServerResponse)
* [type ErrorData](#ErrorData)
* [type ErrorGroupData](#ErrorGroupData)
* [type FileServerData](#FileServerData)
* [type HeaderData](#HeaderData)
* [type InitArgData](#InitArgData)
* [type InitData](#InitData)
* [type MultipartData](#MultipartData)
* [type ParamData](#ParamData)
* [type PayloadData](#PayloadData)
* [type RequestData](#RequestData)
* [type ResponseData](#ResponseData)
* [type ResultData](#ResultData)
* [type RouteData](#RouteData)
* [type ServiceData](#ServiceData)
  * [func (svc *ServiceData) Endpoint(name string) *EndpointData](#ServiceData.Endpoint)
* [type ServicesData](#ServicesData)
  * [func (d ServicesData) Get(name string) *ServiceData](#ServicesData.Get)
* [type StreamData](#StreamData)
* [type TypeData](#TypeData)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/http/codegen/client.go) [client_cli.go](/src/github.com/goadesign/goa/http/codegen/client_cli.go) [client_types.go](/src/github.com/goadesign/goa/http/codegen/client_types.go) [example_cli.go](/src/github.com/goadesign/goa/http/codegen/example_cli.go) [example_server.go](/src/github.com/goadesign/goa/http/codegen/example_server.go) [funcs.go](/src/github.com/goadesign/goa/http/codegen/funcs.go) [openapi.go](/src/github.com/goadesign/goa/http/codegen/openapi.go) [paths.go](/src/github.com/goadesign/goa/http/codegen/paths.go) [server.go](/src/github.com/goadesign/goa/http/codegen/server.go) [server_types.go](/src/github.com/goadesign/goa/http/codegen/server_types.go) [service_data.go](/src/github.com/goadesign/goa/http/codegen/service_data.go) [testing.go](/src/github.com/goadesign/goa/http/codegen/testing.go) [typedef.go](/src/github.com/goadesign/goa/http/codegen/typedef.go) 



## <a name="pkg-variables">Variables</a>
``` go
var HTTPServices = make(ServicesData)
```
HTTPServices holds the data computed from the design needed to generate the
transport code of the services.



## <a name="ClientCLIFiles">func</a> [ClientCLIFiles](/src/target/client_cli.go?s=3574:3651#L124)
``` go
func ClientCLIFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File
```
ClientCLIFiles returns the client HTTP CLI support file.



## <a name="ClientFiles">func</a> [ClientFiles](/src/target/client.go?s=236:310#L14)
``` go
func ClientFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File
```
ClientFiles returns the client HTTP transport files.



## <a name="ClientTypeFiles">func</a> [ClientTypeFiles](/src/target/client_types.go?s=180:258#L11)
``` go
func ClientTypeFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File
```
ClientTypeFiles returns the HTTP transport client types files.



## <a name="ExampleCLI">func</a> [ExampleCLI](/src/target/example_cli.go?s=197:268#L13)
``` go
func ExampleCLI(genpkg string, root *httpdesign.RootExpr) *codegen.File
```
ExampleCLI returns an example client tool main implementation.



## <a name="ExampleServerFiles">func</a> [ExampleServerFiles](/src/target/example_server.go?s=224:305#L15)
``` go
func ExampleServerFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File
```
ExampleServerFiles returns and example main and dummy service
implementations.



## <a name="OpenAPIFiles">func</a> [OpenAPIFiles](/src/target/openapi.go?s=393:462#L23)
``` go
func OpenAPIFiles(root *httpdesign.RootExpr) ([]*codegen.File, error)
```
OpenAPIFiles returns the files for the OpenAPIFile spec of the given HTTP API.



## <a name="PathFiles">func</a> [PathFiles](/src/target/paths.go?s=166:223#L12)
``` go
func PathFiles(root *httpdesign.RootExpr) []*codegen.File
```
PathFiles returns the service path files.



## <a name="RunHTTPDSL">func</a> [RunHTTPDSL](/src/target/testing.go?s=200:262#L12)
``` go
func RunHTTPDSL(t *testing.T, dsl func()) *httpdesign.RootExpr
```
RunHTTPDSL returns the HTTP DSL root resulting from running the given DSL.



## <a name="ServerFiles">func</a> [ServerFiles](/src/target/server.go?s=262:336#L16)
``` go
func ServerFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File
```
ServerFiles returns all the server HTTP transport files.



## <a name="ServerTypeFiles">func</a> [ServerTypeFiles](/src/target/server_types.go?s=172:250#L11)
``` go
func ServerTypeFiles(genpkg string, root *httpdesign.RootExpr) []*codegen.File
```
ServerTypeFiles returns the HTTP transport type files.




## <a name="EndpointData">type</a> [EndpointData](/src/target/service_data.go?s=3188:5935#L85)
``` go
type EndpointData struct {
    // Method contains the related service method data.
    Method *service.MethodData
    // ServiceName is the name of the service exposing the endpoint.
    ServiceName string
    // ServiceVarName is the goified service name (first letter lowercase).
    ServiceVarName string
    // ServicePkgName is the name of the service package.
    ServicePkgName string
    // Payload describes the method HTTP payload.
    Payload *PayloadData
    // Result describes the method HTTP result.
    Result *ResultData
    // Errors describes the method HTTP errors.
    Errors []*ErrorGroupData
    // Routes describes the possible routes for this endpoint.
    Routes []*RouteData
    // BasicScheme is the basic auth security scheme if any.
    BasicScheme *service.SchemeData
    // HeaderSchemes lists all the security requirement schemes that
    // apply to the method and are encoded in the request header.
    HeaderSchemes []*service.SchemeData
    // BodySchemes lists all the security requirement schemes that
    // apply to the method and are encoded in the request body.
    BodySchemes []*service.SchemeData
    // QuerySchemes lists all the security requirement schemes that
    // apply to the method and are encoded in the request query
    // string.
    QuerySchemes []*service.SchemeData

    // MountHandler is the name of the mount handler function.
    MountHandler string
    // HandlerInit is the name of the constructor function for the
    // http handler function.
    HandlerInit string
    // RequestDecoder is the name of the request decoder function.
    RequestDecoder string
    // ResponseEncoder is the name of the response encoder function.
    ResponseEncoder string
    // ErrorEncoder is the name of the error encoder function.
    ErrorEncoder string
    // MultipartRequestDecoder indicates the request decoder for multipart
    // content type.
    MultipartRequestDecoder *MultipartData
    // ServerStream holds the data to render the server struct which
    // implements the server stream interface.
    ServerStream *StreamData

    // ClientStruct is the name of the HTTP client struct.
    ClientStruct string
    // EndpointInit is the name of the constructor function for the
    // client endpoint.
    EndpointInit string
    // RequestInit is the request builder function.
    RequestInit *InitData
    // RequestEncoder is the name of the request encoder function.
    RequestEncoder string
    // ResponseDecoder is the name of the response decoder function.
    ResponseDecoder string
    // MultipartRequestEncoder indicates the request encoder for multipart
    // content type.
    MultipartRequestEncoder *MultipartData
    // ClientStream holds the data to render the client struct which
    // implements the client stream interface.
    ClientStream *StreamData
}

```
EndpointData contains the data used to render the code related to a
single service HTTP endpoint.










### <a name="EndpointData.NeedServerResponse">func</a> (\*EndpointData) [NeedServerResponse](/src/target/service_data.go?s=21394:21442#L583)
``` go
func (e *EndpointData) NeedServerResponse() bool
```
NeedServerResponse returns true if server response has a body or a header.
It is used when initializing the result in the server response encoding.




## <a name="ErrorData">type</a> [ErrorData](/src/target/service_data.go?s=8194:8381#L218)
``` go
type ErrorData struct {
    // Name is the error name.
    Name string
    // Ref is a reference to the error type.
    Ref string
    // Response is the error response data.
    Response *ResponseData
}

```
ErrorData contains the error information required to generate the
transport decode (client) and encode (server) code.










## <a name="ErrorGroupData">type</a> [ErrorGroupData](/src/target/service_data.go?s=7894:8065#L209)
``` go
type ErrorGroupData struct {
    // StatusCode is the response HTTP status code.
    StatusCode string
    // Errors contains the information for each error.
    Errors []*ErrorData
}

```
ErrorGroupData contains the error information required to generate
the transport decode (client) and encode (server) code for all errors
with responses using a given HTTP status code.










## <a name="FileServerData">type</a> [FileServerData](/src/target/service_data.go?s=6005:6521#L157)
``` go
type FileServerData struct {
    // MountHandler is the name of the mount handler function.
    MountHandler string
    // RequestPaths is the set of HTTP paths to the server.
    RequestPaths []string
    // Root is the root server file path.
    FilePath string
    // Dir is true if the file server servers files under a
    // directory, false if it serves a single file.
    IsDir bool
    // PathParam is the name of the parameter used to capture the
    // path for file servers that serve files under a directory.
    PathParam string
}

```
FileServerData lists the data needed to generate file servers.










## <a name="HeaderData">type</a> [HeaderData](/src/target/service_data.go?s=16320:17579#L433)
``` go
type HeaderData struct {
    // Name is the name of the header key.
    Name string
    // AttributeName is the name of the corresponding attribute.
    AttributeName string
    // Description is the header description.
    Description string
    // CanonicalName is the canonical header key.
    CanonicalName string
    // FieldName is the name of the struct field that holds the
    // header value if any, empty string otherwise.
    FieldName string
    // VarName is the name of the Go variable used to read or
    // convert the header value.
    VarName string
    // TypeName is the name of the type.
    TypeName string
    // TypeRef is the reference to the type.
    TypeRef string
    // Required is true if the header is required.
    Required bool
    // Pointer is true if and only the param variable is a pointer.
    Pointer bool
    // StringSlice is true if the param type is array of strings.
    StringSlice bool
    // Slice is true if the param type is an array.
    Slice bool
    // Type describes the datatype of the variable value. Mainly used for conversion.
    Type design.DataType
    // Validate contains the validation code if any.
    Validate string
    // DefaultValue contains the default value if any.
    DefaultValue interface{}
    // Example is an example value.
    Example interface{}
}

```
HeaderData describes a HTTP request or response header.










## <a name="InitArgData">type</a> [InitArgData](/src/target/service_data.go?s=13494:14330#L346)
``` go
type InitArgData struct {
    // Name is the argument name.
    Name string
    // Description is the argument description.
    Description string
    // Reference to the argument, e.g. "&body".
    Ref string
    // FieldName is the name of the data structure field that should
    // be initialized with the argument if any.
    FieldName string
    // TypeName is the argument type name.
    TypeName string
    // TypeRef is the argument type reference.
    TypeRef string
    // Pointer is true if a pointer to the arg should be used.
    Pointer bool
    // Required is true if the arg is required to build the payload.
    Required bool
    // DefaultValue is the default value of the arg.
    DefaultValue interface{}
    // Validate contains the validation code for the argument
    // value if any.
    Validate string
    // Example is a example value
    Example interface{}
}

```
InitArgData represents a single constructor argument.










## <a name="InitData">type</a> [InitData](/src/target/service_data.go?s=11818:13433#L305)
``` go
type InitData struct {
    // Name is the constructor function name.
    Name string
    // Description is the function description.
    Description string
    // ServerArgs is the list of constructor arguments for server
    // side code.
    ServerArgs []*InitArgData
    // ClientArgs is the list of constructor arguments for client
    // side code.
    ClientArgs []*InitArgData
    // CLIArgs is the list of arguments that should be initialized
    // from CLI flags. This is used for implicit attributes which
    // as the time of writing is only used for the basic auth
    // username and password.
    CLIArgs []*InitArgData
    // ReturnTypeName is the qualified (including the package name)
    // name of the payload, result or error type.
    ReturnTypeName string
    // ReturnTypeRef is the qualified (including the package name)
    // reference to the payload, result or error type.
    ReturnTypeRef string
    // ReturnTypeAttribute is the name of the attribute initialized
    // by this constructor when it only initializes one attribute
    // (i.e. body was defined with Body("name") syntax).
    ReturnTypeAttribute string
    // ReturnIsStruct is true if the return type is a struct.
    ReturnIsStruct bool
    // ReturnIsPrimitivePointer indicates whether the return type is
    // a primitive pointer.
    ReturnIsPrimitivePointer bool
    // ServerCode is the code that builds the payload from the
    // request on the server when it contains user types.
    ServerCode string
    // ClientCode is the code that builds the payload or result type
    // from the request or response state on the client when it
    // contains user types.
    ClientCode string
}

```
InitData contains the data required to render a constructor.










## <a name="MultipartData">type</a> [MultipartData](/src/target/service_data.go?s=18412:18885#L496)
``` go
type MultipartData struct {
    // FuncName is the name used to generate function type.
    FuncName string
    // InitName is the name of the constructor.
    InitName string
    // VarName is the name of the variable referring to the function.
    VarName string
    // ServiceName is the name of the service.
    ServiceName string
    // MethodName is the name of the method.
    MethodName string
    // Payload is the payload data required to generate encoder/decoder.
    Payload *PayloadData
}

```
MultipartData contains the data needed to render multipart encoder/decoder.










## <a name="ParamData">type</a> [ParamData](/src/target/service_data.go?s=14672:16257#L385)
``` go
type ParamData struct {
    // Name is the name of the mapping to the actual variable name.
    Name string
    // AttributeName is the name of the corresponding attribute.
    AttributeName string
    // Description is the parameter description
    Description string
    // FieldName is the name of the struct field that holds the
    // param value.
    FieldName string
    // VarName is the name of the Go variable used to read or
    // convert the param value.
    VarName string
    // ServiceField is true if there is a corresponding attribute in
    // the service types.
    ServiceField bool
    // Type is the datatype of the variable.
    Type design.DataType
    // TypeName is the name of the type.
    TypeName string
    // TypeRef is the reference to the type.
    TypeRef string
    // Required is true if the param is required.
    Required bool
    // Pointer is true if and only the param variable is a pointer.
    Pointer bool
    // StringSlice is true if the param type is array of strings.
    StringSlice bool
    // Slice is true if the param type is an array.
    Slice bool
    // MapStringSlice is true if the param type is a map of string
    // slice.
    MapStringSlice bool
    // Map is true if the param type is a map.
    Map bool
    // Validate contains the validation code if any.
    Validate string
    // DefaultValue contains the default value if any.
    DefaultValue interface{}
    // Example is an example value.
    Example interface{}
    // MapQueryParams indicates that the query params must be mapped
    // to the entire payload (empty string) or a payload attribute
    // (attribute name).
    MapQueryParams *string
}

```
ParamData describes a HTTP request parameter.










## <a name="PayloadData">type</a> [PayloadData](/src/target/service_data.go?s=6654:7058#L174)
``` go
type PayloadData struct {
    // Name is the name of the payload type.
    Name string
    // Ref is the fully qualified reference to the payload type.
    Ref string
    // Request contains the data for the corresponding HTTP request.
    Request *RequestData
    // DecoderReturnValue is a reference to the decoder return value
    // if there is no payload constructor (i.e. if Init is nil).
    DecoderReturnValue string
}

```
PayloadData contains the payload information required to generate the
transport decode (server) and encode (client) code.










## <a name="RequestData">type</a> [RequestData](/src/target/service_data.go?s=8421:9531#L228)
``` go
type RequestData struct {
    // PathParams describes the information about params that are
    // present in the request path.
    PathParams []*ParamData
    // QueryParams describes the information about the params that
    // are present in the request query string.
    QueryParams []*ParamData
    // Headers contains the HTTP request headers used to build the
    // method payload.
    Headers []*HeaderData
    // ServerBody describes the request body type used by server
    // code. The type is generated using pointers for all fields so
    // that it can be validated.
    ServerBody *TypeData
    // ClientBody describes the request body type used by client
    // code. The type does NOT use pointers for every fields since
    // no validation is required.
    ClientBody *TypeData
    // PayloadInit contains the data required to render the
    // payload constructor used by server code if any.
    PayloadInit *InitData
    // MustValidate is true if the request body or at least one
    // parameter or header requires validation.
    MustValidate bool
    // Multipart if true indicates the request is a multipart request.
    Multipart bool
}

```
RequestData describes a request.










## <a name="ResponseData">type</a> [ResponseData](/src/target/service_data.go?s=9573:11750#L257)
``` go
type ResponseData struct {
    // StatusCode is the return code of the response.
    StatusCode string
    // Description is the response description.
    Description string
    // Headers provides information about the headers in the
    // response.
    Headers []*HeaderData
    // ErrorHeader contains the value of the response "goa-error"
    // header if any.
    ErrorHeader string
    // ServerBody is the type of the response body used by server code, nil if
    // body should be empty. The type does NOT use pointers for all fields.
    // If the method result is a result type and the response data describes a
    // success response, then this field contains a type for every view in the
    // result type. The type name is suffixed with the name of the view (except
    // for "default" view where no suffix is added). A constructor is also
    // generated server side for each view to transform the result type to the
    // corresponding response body type. If method result is not a result type
    // or if the response describes an error response, then this field
    // contains at most one item.
    ServerBody []*TypeData
    // ClientBody is the type of the response body used by client
    // code, nil if body should be empty. The type uses pointers for
    // all fields so they can be validated.
    ClientBody *TypeData
    // Init contains the data required to render the result or error
    // constructor if any.
    ResultInit *InitData
    // TagName is the name of the attribute used to test whether the
    // response is the one to use.
    TagName string
    // TagValue is the value the result attribute named by TagName
    // must have for this response to be used.
    TagValue string
    // TagRequired is true if the tag attribute is required.
    TagRequired bool
    // MustValidate is true if at least one header requires validation.
    MustValidate bool
    // ResultAttr sets the response body from the specified result type
    // attribute. This field is set when the design uses Body("name") syntax
    // to set the response body and the result type is an object.
    ResultAttr string
    // ViewedResult indicates whether the response body type is a result type.
    ViewedResult *service.ViewedResultTypeData
}

```
ResponseData describes a response.










## <a name="ResultData">type</a> [ResultData](/src/target/service_data.go?s=7189:7695#L188)
``` go
type ResultData struct {
    // Name is the name of the result type.
    Name string
    // Ref is the reference to the result type.
    Ref string
    // IsStruct is true if the result type is a user type defining
    // an object.
    IsStruct bool
    // Inits contains the data required to render the result
    // constructors if any.
    Inits []*InitData
    // Responses contains the data for the corresponding HTTP
    // responses.
    Responses []*ResponseData
    // View is the view used to render the result.
    View string
}

```
ResultData contains the result information required to generate the
transport decode (client) and encode (server) code.










## <a name="RouteData">type</a> [RouteData](/src/target/service_data.go?s=14366:14619#L374)
``` go
type RouteData struct {
    // Verb is the HTTP method.
    Verb string
    // Path is the fullpath including wildcards.
    Path string
    // PathInit contains the information needed to render and call
    // the path constructor for the route.
    PathInit *InitData
}

```
RouteData describes a route.










## <a name="ServiceData">type</a> [ServiceData](/src/target/service_data.go?s=946:3079#L35)
``` go
type ServiceData struct {
    // Service contains the related service data.
    Service *service.Data
    // Endpoints describes the endpoint data for this service.
    Endpoints []*EndpointData
    // FileServers lists the file servers for this service.
    FileServers []*FileServerData
    // ServerStruct is the name of the HTTP server struct.
    ServerStruct string
    // MountPointStruct is the name of the mount point struct.
    MountPointStruct string
    // ServerInit is the name of the constructor of the server
    // struct.
    ServerInit string
    // MountServer is the name of the mount function.
    MountServer string
    // ServerService is the name of service function.
    ServerService string
    // ClientStruct is the name of the HTTP client struct.
    ClientStruct string
    // ServerBodyAttributeTypes is the list of user types used to
    // define the request, response and error response type
    // attributes in the server code.
    ServerBodyAttributeTypes []*TypeData
    // ClientBodyAttributeTypes is the list of user types used to
    // define the request, response and error response type
    // attributes in the client code.
    ClientBodyAttributeTypes []*TypeData
    // ServerTypeNames records the user type names used to define
    // the endpoint request and response bodies for server code.
    // The type name is used as the key and a bool as the value
    // which if true indicates that the type has been generated
    // in the server package.
    ServerTypeNames map[string]bool
    // ClientTypeNames records the user type names used to define
    // the endpoint request and response bodies for client code.
    // The type name is used as the key and a bool as the value
    // which if true indicates that the type has been generated
    // in the client package.
    ClientTypeNames map[string]bool
    // ServerTransformHelpers is the list of transform functions
    // required by the various server side constructors.
    ServerTransformHelpers []*codegen.TransformFunctionData
    // ClientTransformHelpers is the list of transform functions
    // required by the various client side constructors.
    ClientTransformHelpers []*codegen.TransformFunctionData
}

```
ServiceData contains the data used to render the code related to a
single service.










### <a name="ServiceData.Endpoint">func</a> (\*ServiceData) [Endpoint](/src/target/service_data.go?s=21080:21139#L572)
``` go
func (svc *ServiceData) Endpoint(name string) *EndpointData
```
Endpoint returns the service method transport data for the endpoint with the
given name, nil if there isn't one.




## <a name="ServicesData">type</a> [ServicesData](/src/target/service_data.go?s=816:852#L31)
``` go
type ServicesData map[string]*ServiceData
```
ServicesData encapsulates the data computed from the design.










### <a name="ServicesData.Get">func</a> (ServicesData) [Get](/src/target/service_data.go?s=20732:20783#L558)
``` go
func (d ServicesData) Get(name string) *ServiceData
```
Get retrieves the transport data for the service with the given name
computing it if needed. It returns nil if there is no service with the given
name.




## <a name="StreamData">type</a> [StreamData](/src/target/service_data.go?s=19011:20567#L513)
``` go
type StreamData struct {
    // VarName is the name of the struct.
    VarName string
    // Type is type of the stream (server or client).
    Type string
    // Interface is the fully qualified name of the interface that the struct
    // implements.
    Interface string
    // Endpoint is endpoint data that defines streaming payload/result.
    Endpoint *EndpointData
    // Payload is the streaming payload type sent via the stream.
    Payload *TypeData
    // Response is the successful response data for the streaming endpoint.
    Response *ResponseData
    // Scheme is the scheme used by the streaming connection (ws or wss).
    Scheme string
    // SendName is the name of the send function.
    SendName string
    // SendDesc is the description for the send function.
    SendDesc string
    // SendTypeName is the fully qualified type name sent through the stream.
    SendTypeName string
    // SendTypeRef is the fully qualified type ref sent through the stream.
    SendTypeRef string
    // RecvName is the name of the receive function.
    RecvName string
    // RecvDesc is the description for the recv function.
    RecvDesc string
    // RecvTypeName is the fully qualified type name received from the stream.
    RecvTypeName string
    // RecvTypeRef is the fully qualified type ref received from the stream.
    RecvTypeRef string
    // MustClose indicates whether to generate the Close() function for the
    // stream.
    MustClose bool
    // PkgName is the service package name.
    PkgName string
    // Kind is the kind of the stream (payload or result or bidirectional).
    Kind design.StreamKind
}

```
StreamData contains the data needed to render struct type that implements
the server and client stream interfaces.










## <a name="TypeData">type</a> [TypeData](/src/target/service_data.go?s=17649:18329#L471)
``` go
type TypeData struct {
    // Name is the type name.
    Name string
    // VarName is the Go type name.
    VarName string
    // Description is the type human description.
    Description string
    // Init contains the data needed to render and call the type
    // constructor if any.
    Init *InitData
    // Def is the type definition Go code.
    Def string
    // Ref is the reference to the type.
    Ref string
    // ValidateDef contains the validation code.
    ValidateDef string
    // ValidateRef contains the call to the validation code.
    ValidateRef string
    // Example is an example value for the type.
    Example interface{}
    // View is the view using which the type is rendered.
    View string
}

```
TypeData contains the data needed to render a type definition.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
