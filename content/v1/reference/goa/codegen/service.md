+++
date="2018-09-06T11:21:48-07:00"
description="github.com/goadesign/goa/codegen/service"
+++


# service
`import "github.com/goadesign/goa/codegen/service"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func AuthFuncsFile(genpkg string, root *design.RootExpr) *codegen.File](#AuthFuncsFile)
* [func ClientFile(service *design.ServiceExpr) *codegen.File](#ClientFile)
* [func ConvertFile(root *design.RootExpr, service *design.ServiceExpr) (*codegen.File, error)](#ConvertFile)
* [func EndpointFile(genpkg string, service *design.ServiceExpr) *codegen.File](#EndpointFile)
* [func File(genpkg string, service *design.ServiceExpr) *codegen.File](#File)
* [func ViewsFile(genpkg string, service *design.ServiceExpr) *codegen.File](#ViewsFile)
* [type ConvertData](#ConvertData)
* [type Data](#Data)
  * [func (s *Data) Method(name string) *MethodData](#Data.Method)
* [type EndpointMethodData](#EndpointMethodData)
* [type EndpointsData](#EndpointsData)
* [type ErrorInitData](#ErrorInitData)
* [type InitArgData](#InitArgData)
* [type InitData](#InitData)
* [type MethodData](#MethodData)
* [type ProjectedTypeData](#ProjectedTypeData)
* [type RequirementData](#RequirementData)
* [type SchemeData](#SchemeData)
* [type ServicesData](#ServicesData)
  * [func (d ServicesData) Get(name string) *Data](#ServicesData.Get)
* [type StreamData](#StreamData)
* [type UserTypeData](#UserTypeData)
* [type ValidateData](#ValidateData)
* [type ViewData](#ViewData)
* [type ViewedResultTypeData](#ViewedResultTypeData)


#### <a name="pkg-files">Package files</a>
[auth_funcs.go](/src/github.com/goadesign/goa/codegen/service/auth_funcs.go) [client.go](/src/github.com/goadesign/goa/codegen/service/client.go) [convert.go](/src/github.com/goadesign/goa/codegen/service/convert.go) [endpoint.go](/src/github.com/goadesign/goa/codegen/service/endpoint.go) [service.go](/src/github.com/goadesign/goa/codegen/service/service.go) [service_data.go](/src/github.com/goadesign/goa/codegen/service/service_data.go) [views.go](/src/github.com/goadesign/goa/codegen/service/views.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // EndpointsStructName is the name of the generated endpoints data
    // structure.
    EndpointsStructName = "Endpoints"

    // ServiceInterfaceName is the name of the generated service interface.
    ServiceInterfaceName = "Service"
)
```
``` go
const (
    // ClientStructName is the name of the generated client data structure.
    ClientStructName = "Client"
)
```

## <a name="pkg-variables">Variables</a>
``` go
var Services = make(ServicesData)
```
Services holds the data computed from the design needed to generate the code
of the services.



## <a name="AuthFuncsFile">func</a> [AuthFuncsFile](/src/target/auth_funcs.go?s=254:324#L14)
``` go
func AuthFuncsFile(genpkg string, root *design.RootExpr) *codegen.File
```
AuthFuncsFile returns a file that contains a dummy implementation of the
authorization functions needed to instantiate the service endpoints.



## <a name="ClientFile">func</a> [ClientFile](/src/target/client.go?s=272:330#L16)
``` go
func ClientFile(service *design.ServiceExpr) *codegen.File
```
ClientFile returns the client file for the given service.



## <a name="ConvertFile">func</a> [ConvertFile](/src/target/convert.go?s=645:736#L30)
``` go
func ConvertFile(root *design.RootExpr, service *design.ServiceExpr) (*codegen.File, error)
```
ConvertFile returns the file containing the conversion and creation functions
if any.



## <a name="EndpointFile">func</a> [EndpointFile](/src/target/endpoint.go?s=2061:2136#L70)
``` go
func EndpointFile(genpkg string, service *design.ServiceExpr) *codegen.File
```
EndpointFile returns the endpoint file for the given service.



## <a name="File">func</a> [File](/src/target/service.go?s=161:228#L12)
``` go
func File(genpkg string, service *design.ServiceExpr) *codegen.File
```
File returns the service file for the given service.



## <a name="ViewsFile">func</a> [ViewsFile](/src/target/views.go?s=238:310#L12)
``` go
func ViewsFile(genpkg string, service *design.ServiceExpr) *codegen.File
```
ViewsFile returns the views file for the given service containing types
to render result types with more than one view appropriately.




## <a name="ConvertData">type</a> [ConvertData](/src/target/convert.go?s=218:551#L15)
``` go
type ConvertData struct {
    // Name is the name of the function.
    Name string
    // ReceiverTypeRef is a reference to the receiver type.
    ReceiverTypeRef string
    // TypeRef is a reference to the external type.
    TypeRef string
    // TypeName is the name of the external type.
    TypeName string
    //  Code is the function code.
    Code string
}

```
ConvertData contains the info needed to render convert and create functions.










## <a name="Data">type</a> [Data](/src/target/service_data.go?s=995:2317#L32)
``` go
type Data struct {
    // Name is the service name.
    Name string
    // Description is the service description.
    Description string
    // StructName is the service struct name.
    StructName string
    // VarName is the service variable name (first letter in
    // lowercase).
    VarName string
    // PkgName is the name of the package containing the generated
    // service code.
    PkgName string
    // ViewsPkg is the name of the package containing the view types.
    ViewsPkg string
    // Methods lists the service interface methods.
    Methods []*MethodData
    // Schemes is the list of security schemes required by the
    // service methods.
    Schemes []*SchemeData
    // UserTypes lists the type definitions that the service
    // depends on.
    UserTypes []*UserTypeData
    // ErrorTypes lists the error type definitions that the service
    // depends on.
    ErrorTypes []*UserTypeData
    // Errors list the information required to generate error init
    // functions.
    ErrorInits []*ErrorInitData
    // ProjectedTypes lists the types which uses pointers for all fields to
    // define view specific validation logic.
    ProjectedTypes []*ProjectedTypeData
    // ViewedResultTypes lists all the viewed method result types.
    ViewedResultTypes []*ViewedResultTypeData
    // Scope initialized with all the service types.
    Scope *codegen.NameScope
}

```
Data contains the data used to render the code related to a
single service.










### <a name="Data.Method">func</a> (\*Data) [Method](/src/target/service_data.go?s=13648:13694#L380)
``` go
func (s *Data) Method(name string) *MethodData
```
Method returns the service method data for the method with the given name,
nil if there isn't one.




## <a name="EndpointMethodData">type</a> [EndpointMethodData](/src/target/endpoint.go?s=895:1755#L36)
``` go
type EndpointMethodData struct {
    *MethodData
    // ArgName is the name of the argument used to initialize the client
    // struct method field.
    ArgName string
    // ClientVarName is the corresponding client struct field name.
    ClientVarName string
    // ServiceName is the name of the owner service.
    ServiceName string
    // ServiceVarName is the name of the owner service Go interface.
    ServiceVarName string
    // Errors list the possible errors defined in the design if any.
    Errors []*ErrorInitData
    // Requirements list the security requirements that apply to the
    // endpoint. One requirement contains a list of schemes, the
    // incoming requests must validate at least one scheme in each
    // requirement to be authorized.
    Requirements []*RequirementData
    // Schemes contains the security schemes types used by the
    // method.
    Schemes []string
}

```
EndpointMethodData describes a single endpoint method.










## <a name="EndpointsData">type</a> [EndpointsData](/src/target/endpoint.go?s=223:833#L15)
``` go
type EndpointsData struct {
    // Name is the service name.
    Name string
    // Description is the service description.
    Description string
    // VarName is the endpoint struct name.
    VarName string
    // ClientVarName is the client struct name.
    ClientVarName string
    // ServiceVarName is the service interface name.
    ServiceVarName string
    // Methods lists the endpoint struct methods.
    Methods []*EndpointMethodData
    // ClientInitArgs lists the arguments needed to instantiate the client.
    ClientInitArgs string
    // Schemes contains the security schemes types used by the
    // method.
    Schemes []string
}

```
EndpointsData contains the data necessary to render the
service endpoints struct template.










## <a name="ErrorInitData">type</a> [ErrorInitData](/src/target/service_data.go?s=2411:2967#L72)
``` go
type ErrorInitData struct {
    // Name is the name of the init function.
    Name string
    // Description is the error description.
    Description string
    // ErrName is the name of the error.
    ErrName string
    // TypeName is the error struct type name.
    TypeName string
    // TypeRef is the reference to the error type.
    TypeRef string
    // Temporary indicates whether the error is temporary.
    Temporary bool
    // Timeout indicates whether the error is due to timeouts.
    Timeout bool
    // Fault indicates whether the error is server-side fault.
    Fault bool
}

```
ErrorInitData describes an error returned by a service method of type
ErrorResult.










## <a name="InitArgData">type</a> [InitArgData](/src/target/service_data.go?s=12654:12784#L343)
``` go
type InitArgData struct {
    // Name is the argument name.
    Name string
    // Ref is the reference to the argument type.
    Ref string
}

```
InitArgData represents a single constructor argument.










## <a name="InitData">type</a> [InitData](/src/target/service_data.go?s=12135:12593#L327)
``` go
type InitData struct {
    // Name is the name of the constructor function.
    Name string
    // Description is the function description.
    Description string
    // Args lists arguments to this function.
    Args []*InitArgData
    // ReturnTypeRef is the reference to the return type.
    ReturnTypeRef string
    // Code is the transformation code.
    Code string
    // Helpers contain the helpers used in the transformation code.
    Helpers []*codegen.TransformFunctionData
}

```
InitData contains the data to render a constructor.










## <a name="MethodData">type</a> [MethodData](/src/target/service_data.go?s=3020:5187#L92)
``` go
type MethodData struct {
    // Name is the method name.
    Name string
    // Description is the method description.
    Description string
    // VarName is the Go method name.
    VarName string
    // Payload is the name of the payload type if any,
    Payload string
    // PayloadDef is the payload type definition if any.
    PayloadDef string
    // PayloadRef is a reference to the payload type if any,
    PayloadRef string
    // PayloadDesc is the payload type description if any.
    PayloadDesc string
    // PayloadEx is an example of a valid payload value.
    PayloadEx interface{}
    // StreamingPayload is the name of the streaming payload type if any.
    StreamingPayload string
    // StreamingPayloadDef is the streaming payload type definition if any.
    StreamingPayloadDef string
    // StreamingPayloadRef is a reference to the streaming payload type if any.
    StreamingPayloadRef string
    // StreamingPayloadDesc is the streaming payload type description if any.
    StreamingPayloadDesc string
    // StreamingPayloadEx is an example of a valid streaming payload value.
    StreamingPayloadEx interface{}
    // Result is the name of the result type if any.
    Result string
    // ResultDef is the result type definition if any.
    ResultDef string
    // ResultRef is the reference to the result type if any.
    ResultRef string
    // ResultDesc is the result type description if any.
    ResultDesc string
    // ResultEx is an example of a valid result value.
    ResultEx interface{}
    // Errors list the possible errors defined in the design if any.
    Errors []*ErrorInitData
    // Requirements contains the security requirements for the
    // method.
    Requirements []*RequirementData
    // Schemes contains the security schemes types used by the
    // method.
    Schemes []string
    // ViewedResult contains the data required to generate the code handling
    // views if any.
    ViewedResult *ViewedResultTypeData
    // ServerStream indicates that the service method receives a payload
    // stream or sends a result stream or both.
    ServerStream *StreamData
    // ClientStream indicates that the service method receives a result
    // stream or sends a payload result or both.
    ClientStream *StreamData
}

```
MethodData describes a single service method.










## <a name="ProjectedTypeData">type</a> [ProjectedTypeData](/src/target/service_data.go?s=11224:12076#L306)
``` go
type ProjectedTypeData struct {
    // the projected type
    *UserTypeData
    // Validations lists the validation functions to run on the projected type.
    // If the projected type corresponds to a result type then a validation
    // function for each view is generated. For user types, only one validation
    // function is generated.
    Validations []*ValidateData
    // Projections contains the code to create a projected type based on
    // views. If the projected type corresponds to a result type, then a
    // function for each view is generated.
    Projections []*InitData
    // TypeInits contains the code to convert a projected type to its
    // corresponding service type. If the projected type corresponds to a
    // result type, then a function for each view is generated.
    TypeInits []*InitData
    // ViewsPkg is the views package name.
    ViewsPkg string
}

```
ProjectedTypeData contains the data used to generate a projected type for
the corresponding user type or result type in the service package. The
generated type uses pointers for all fields. It also contains the data
to generate view-based validation logic and transformation functions to
convert a projected type to its corresponding service type and vice versa.










## <a name="RequirementData">type</a> [RequirementData](/src/target/service_data.go?s=6760:6910#L186)
``` go
type RequirementData struct {
    // Schemes list the requirement schemes.
    Schemes []*SchemeData
    // Scopes list the required scopes.
    Scopes []string
}

```
RequirementData lists the schemes and scopes defined by a single
security requirement.










## <a name="SchemeData">type</a> [SchemeData](/src/target/service_data.go?s=7389:9259#L210)
``` go
type SchemeData struct {
    // Kind is the type of scheme, one of "Basic", "APIKey", "JWT"
    // or "OAuth2".
    Type string
    // SchemeName is the name of the scheme.
    SchemeName string
    // Name refers to a header or parameter name, based on In's
    // value.
    Name string
    // UsernameField is the name of the payload field that should be
    // initialized with the basic auth username if any.
    UsernameField string
    // UsernamePointer is true if the username field is a pointer.
    UsernamePointer bool
    // UsernameAttr is the name of the attribute that contains the
    // username.
    UsernameAttr string
    // UsernameRequired specifies whether the attribute that
    // contains the username is required.
    UsernameRequired bool
    // PasswordField is the name of the payload field that should be
    // initialized with the basic auth password if any.
    PasswordField string
    // PasswordPointer is true if the password field is a pointer.
    PasswordPointer bool
    // PasswordAttr is the name of the attribute that contains the
    // password.
    PasswordAttr string
    // PasswordRequired specifies whether the attribute that
    // contains the password is required.
    PasswordRequired bool
    // CredField contains the name of the payload field that should
    // be initialized with the API key, the JWT token or the OAuth2
    // access token.
    CredField string
    // CredPointer is true if the credential field is a pointer.
    CredPointer bool
    // CredRequired specifies if the key is a required attribute.
    CredRequired bool
    // KeyAttr is the name of the attribute that contains
    // the security tag (for APIKey, OAuth2, and JWT schemes).
    KeyAttr string
    // Scopes lists the scopes that apply to the scheme.
    Scopes []string
    // Flows describes the OAuth2 flows.
    Flows []*design.FlowExpr
    // In indicates the request element that holds the credential.
    In string
}

```
SchemeData describes a single security scheme.










## <a name="ServicesData">type</a> [ServicesData](/src/target/service_data.go?s=879:908#L28)
``` go
type ServicesData map[string]*Data
```
ServicesData encapsulates the data computed from the service designs.










### <a name="ServicesData.Get">func</a> (ServicesData) [Get](/src/target/service_data.go?s=13325:13369#L366)
``` go
func (d ServicesData) Get(name string) *Data
```
Get retrieves the data for the service with the given name computing it if
needed. It returns nil if there is no service with the given name.




## <a name="StreamData">type</a> [StreamData](/src/target/service_data.go?s=5386:6662#L151)
``` go
type StreamData struct {
    // Interface is the name of the stream interface.
    Interface string
    // VarName is the name of the struct type that implements the stream
    // interface.
    VarName string
    // SendName is the name of the send function.
    SendName string
    // SendDesc is the description for the send function.
    SendDesc string
    // SendTypeName is the type name sent through the stream.
    SendTypeName string
    // SendTypeRef is the reference to the type sent through the stream.
    SendTypeRef string
    // RecvName is the name of the receive function.
    RecvName string
    // RecvDesc is the description for the recv function.
    RecvDesc string
    // RecvTypeName is the type name received from the stream.
    RecvTypeName string
    // RecvTypeRef is the reference to the type received from the stream.
    RecvTypeRef string
    // MustClose indicates whether the stream should implement the Close()
    // function.
    MustClose bool
    // EndpointStruct is the name of the endpoint struct that holds a payload
    // reference (if any) and the endpoint server stream. It is set only if the
    // client sends a normal payload and server streams a result.
    EndpointStruct string
    // Kind is the kind of the stream (payload or result or bidirectional).
    Kind design.StreamKind
}

```
StreamData is the data used to generate client and server interfaces that
a streaming endpoint implements. It is initialized if a method defines a
streaming payload or result or both.










## <a name="UserTypeData">type</a> [UserTypeData](/src/target/service_data.go?s=6972:7335#L194)
``` go
type UserTypeData struct {
    // Name is the type name.
    Name string
    // VarName is the corresponding Go type name.
    VarName string
    // Description is the type human description.
    Description string
    // Def is the type definition Go code.
    Def string
    // Ref is the reference to the type.
    Ref string
    // Type is the underlying type.
    Type design.UserType
}

```
UserTypeData contains the data describing a data type.










## <a name="ValidateData">type</a> [ValidateData](/src/target/service_data.go?s=12849:13173#L351)
``` go
type ValidateData struct {
    // Name is the validation function name.
    Name string
    // Ref is the reference to the type on which the validation function
    // is defined.
    Ref string
    // Description is the description for the validation function.
    Description string
    // Validate is the validation code.
    Validate string
}

```
ValidateData contains data to render a validate function.










## <a name="ViewData">type</a> [ViewData](/src/target/service_data.go?s=10713:10838#L294)
``` go
type ViewData struct {
    // Name is the view name.
    Name string
    // Description is the view description.
    Description string
}

```
ViewData contains data about a result type view.










## <a name="ViewedResultTypeData">type</a> [ViewedResultTypeData](/src/target/service_data.go?s=9670:10657#L266)
``` go
type ViewedResultTypeData struct {
    // the viewed result type
    *UserTypeData
    // Views lists the views defined on the viewed result type.
    Views []*ViewData
    // Validate is the validation run on the viewed result type.
    Validate *ValidateData
    // Init is the constructor code to initialize a viewed result type from
    // a result type.
    Init *InitData
    // ResultInit is the constructor code to initialize a result type
    // from the viewed result type.
    ResultInit *InitData
    // FullName is the fully qualified name of the viewed result type.
    FullName string
    // FullRef is the complete reference to the viewed result type
    // (including views package name).
    FullRef string
    // IsCollection indicates whether the viewed result type is a collection.
    IsCollection bool
    // ViewName is the view name to use to render the result type. It is set
    // only if the result type has at most one view.
    ViewName string
    // ViewsPkg is the views package name.
    ViewsPkg string
}

```
ViewedResultTypeData contains the data used to generate a viewed result type
(i.e. a method result type with more than one view). The viewed result
type holds the projected type and a view based on which it creates the
projected type. It also contains the code to validate the viewed result
type and the functions to initialize a viewed result type from a result
type and vice versa.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
