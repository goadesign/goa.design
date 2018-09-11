+++
date="2018-09-10T17:03:12-07:00"
description="github.com/goadesign/goa/design"
+++


# design
`import "github.com/goadesign/goa/design"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>
Package design defines types which describe the data types used by action controllers.
These are the data structures of the request payloads and parameters as well as the response
payloads.
There are primitive types corresponding to the JSON primitive types (bool, string, integer and
number), array types which represent a collection of another type and object types corresponding
to JSON objects (i.e. a map indexed by strings where each value may be any of the data types).
On top of these the package also defines "user types" and "media types". Both these types are
named objects with additional properties (a description and for media types the media type
identifier, links and views).




## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func CanonicalIdentifier(identifier string) string](#CanonicalIdentifier)
* [func ExtractWildcards(path string) []string](#ExtractWildcards)
* [func HasFile(dt DataType) bool](#HasFile)
* [func HasKnownEncoder(mimeType string) bool](#HasKnownEncoder)
* [func UserTypes(dt DataType) map[string]*UserTypeDefinition](#UserTypes)
* [type APIDefinition](#APIDefinition)
  * [func NewAPIDefinition() *APIDefinition](#NewAPIDefinition)
  * [func (a *APIDefinition) Context() string](#APIDefinition.Context)
  * [func (a *APIDefinition) DSL() func()](#APIDefinition.DSL)
  * [func (a *APIDefinition) DSLName() string](#APIDefinition.DSLName)
  * [func (a *APIDefinition) DependsOn() []dslengine.Root](#APIDefinition.DependsOn)
  * [func (a *APIDefinition) Finalize()](#APIDefinition.Finalize)
  * [func (a *APIDefinition) IterateMediaTypes(it MediaTypeIterator) error](#APIDefinition.IterateMediaTypes)
  * [func (a *APIDefinition) IterateResources(it ResourceIterator) error](#APIDefinition.IterateResources)
  * [func (a *APIDefinition) IterateResponses(it ResponseIterator) error](#APIDefinition.IterateResponses)
  * [func (a *APIDefinition) IterateSets(iterator dslengine.SetIterator)](#APIDefinition.IterateSets)
  * [func (a *APIDefinition) IterateUserTypes(it UserTypeIterator) error](#APIDefinition.IterateUserTypes)
  * [func (a *APIDefinition) MediaTypeWithIdentifier(id string) *MediaTypeDefinition](#APIDefinition.MediaTypeWithIdentifier)
  * [func (a *APIDefinition) PathParams() *AttributeDefinition](#APIDefinition.PathParams)
  * [func (a *APIDefinition) RandomGenerator() *RandomGenerator](#APIDefinition.RandomGenerator)
  * [func (a *APIDefinition) Reset()](#APIDefinition.Reset)
  * [func (a *APIDefinition) Validate() error](#APIDefinition.Validate)
* [type ActionDefinition](#ActionDefinition)
  * [func (a *ActionDefinition) AllParams() *AttributeDefinition](#ActionDefinition.AllParams)
  * [func (a *ActionDefinition) CanonicalScheme() string](#ActionDefinition.CanonicalScheme)
  * [func (a *ActionDefinition) Context() string](#ActionDefinition.Context)
  * [func (a *ActionDefinition) EffectiveSchemes() []string](#ActionDefinition.EffectiveSchemes)
  * [func (a *ActionDefinition) Finalize()](#ActionDefinition.Finalize)
  * [func (a *ActionDefinition) HasAbsoluteRoutes() bool](#ActionDefinition.HasAbsoluteRoutes)
  * [func (a *ActionDefinition) IterateHeaders(it HeaderIterator) error](#ActionDefinition.IterateHeaders)
  * [func (a *ActionDefinition) IterateResponses(it ResponseIterator) error](#ActionDefinition.IterateResponses)
  * [func (a *ActionDefinition) PathParams() *AttributeDefinition](#ActionDefinition.PathParams)
  * [func (a *ActionDefinition) UserTypes() map[string]*UserTypeDefinition](#ActionDefinition.UserTypes)
  * [func (a *ActionDefinition) Validate() *dslengine.ValidationErrors](#ActionDefinition.Validate)
  * [func (a *ActionDefinition) ValidateParams() *dslengine.ValidationErrors](#ActionDefinition.ValidateParams)
  * [func (a *ActionDefinition) WebSocket() bool](#ActionDefinition.WebSocket)
* [type ActionIterator](#ActionIterator)
* [type Array](#Array)
  * [func (a *Array) CanHaveDefault() bool](#Array.CanHaveDefault)
  * [func (a *Array) GenerateExample(r *RandomGenerator, seen []string) interface{}](#Array.GenerateExample)
  * [func (a *Array) HasAttributes() bool](#Array.HasAttributes)
  * [func (a *Array) IsArray() bool](#Array.IsArray)
  * [func (a *Array) IsCompatible(val interface{}) bool](#Array.IsCompatible)
  * [func (a *Array) IsHash() bool](#Array.IsHash)
  * [func (a *Array) IsObject() bool](#Array.IsObject)
  * [func (a *Array) IsPrimitive() bool](#Array.IsPrimitive)
  * [func (a *Array) Kind() Kind](#Array.Kind)
  * [func (a *Array) MakeSlice(s []interface{}) interface{}](#Array.MakeSlice)
  * [func (a *Array) Name() string](#Array.Name)
  * [func (a *Array) ToArray() *Array](#Array.ToArray)
  * [func (a *Array) ToHash() *Hash](#Array.ToHash)
  * [func (a *Array) ToObject() Object](#Array.ToObject)
* [type ArrayVal](#ArrayVal)
  * [func (a ArrayVal) ToSlice() []interface{}](#ArrayVal.ToSlice)
* [type AttributeDefinition](#AttributeDefinition)
  * [func DupAtt(att *AttributeDefinition) *AttributeDefinition](#DupAtt)
  * [func (a *AttributeDefinition) AddValues(values []interface{})](#AttributeDefinition.AddValues)
  * [func (a *AttributeDefinition) AllNonZero() []string](#AttributeDefinition.AllNonZero)
  * [func (a *AttributeDefinition) AllRequired() (required []string)](#AttributeDefinition.AllRequired)
  * [func (a *AttributeDefinition) Context() string](#AttributeDefinition.Context)
  * [func (a *AttributeDefinition) DSL() func()](#AttributeDefinition.DSL)
  * [func (a *AttributeDefinition) Definition() *AttributeDefinition](#AttributeDefinition.Definition)
  * [func (a *AttributeDefinition) GenerateExample(rand *RandomGenerator, seen []string) interface{}](#AttributeDefinition.GenerateExample)
  * [func (a *AttributeDefinition) HasDefaultValue(attName string) bool](#AttributeDefinition.HasDefaultValue)
  * [func (a *AttributeDefinition) Inherit(parent *AttributeDefinition, seen ...map[*AttributeDefinition]struct{})](#AttributeDefinition.Inherit)
  * [func (a *AttributeDefinition) IsFile(attName string) bool](#AttributeDefinition.IsFile)
  * [func (a *AttributeDefinition) IsInterface(attName string) bool](#AttributeDefinition.IsInterface)
  * [func (a *AttributeDefinition) IsNonZero(attName string) bool](#AttributeDefinition.IsNonZero)
  * [func (a *AttributeDefinition) IsPrimitivePointer(attName string) bool](#AttributeDefinition.IsPrimitivePointer)
  * [func (a *AttributeDefinition) IsReadOnly() bool](#AttributeDefinition.IsReadOnly)
  * [func (a *AttributeDefinition) IsRequired(attName string) bool](#AttributeDefinition.IsRequired)
  * [func (a *AttributeDefinition) Merge(other *AttributeDefinition) *AttributeDefinition](#AttributeDefinition.Merge)
  * [func (a *AttributeDefinition) SetDefault(def interface{})](#AttributeDefinition.SetDefault)
  * [func (a *AttributeDefinition) SetExample(example interface{}) bool](#AttributeDefinition.SetExample)
  * [func (a *AttributeDefinition) SetReadOnly()](#AttributeDefinition.SetReadOnly)
  * [func (a *AttributeDefinition) Validate(ctx string, parent dslengine.Definition) *dslengine.ValidationErrors](#AttributeDefinition.Validate)
  * [func (a *AttributeDefinition) Walk(walker func(*AttributeDefinition) error) error](#AttributeDefinition.Walk)
* [type AttributeIterator](#AttributeIterator)
* [type ByFilePath](#ByFilePath)
  * [func (b ByFilePath) Len() int](#ByFilePath.Len)
  * [func (b ByFilePath) Less(i, j int) bool](#ByFilePath.Less)
  * [func (b ByFilePath) Swap(i, j int)](#ByFilePath.Swap)
* [type CORSDefinition](#CORSDefinition)
  * [func (cors *CORSDefinition) Context() string](#CORSDefinition.Context)
  * [func (cors *CORSDefinition) Validate() *dslengine.ValidationErrors](#CORSDefinition.Validate)
* [type ContactDefinition](#ContactDefinition)
  * [func (c *ContactDefinition) Context() string](#ContactDefinition.Context)
* [type ContainerDefinition](#ContainerDefinition)
* [type DataStructure](#DataStructure)
* [type DataType](#DataType)
  * [func Dup(d DataType) DataType](#Dup)
* [type DocsDefinition](#DocsDefinition)
  * [func (d *DocsDefinition) Context() string](#DocsDefinition.Context)
* [type EncodingDefinition](#EncodingDefinition)
  * [func (enc *EncodingDefinition) Context() string](#EncodingDefinition.Context)
  * [func (enc *EncodingDefinition) Validate() *dslengine.ValidationErrors](#EncodingDefinition.Validate)
* [type FileServerDefinition](#FileServerDefinition)
  * [func (f *FileServerDefinition) Context() string](#FileServerDefinition.Context)
  * [func (f *FileServerDefinition) Finalize()](#FileServerDefinition.Finalize)
  * [func (f *FileServerDefinition) IsDir() bool](#FileServerDefinition.IsDir)
  * [func (f *FileServerDefinition) Validate() *dslengine.ValidationErrors](#FileServerDefinition.Validate)
* [type FileServerIterator](#FileServerIterator)
* [type Hash](#Hash)
  * [func (h *Hash) CanHaveDefault() bool](#Hash.CanHaveDefault)
  * [func (h *Hash) GenerateExample(r *RandomGenerator, seen []string) interface{}](#Hash.GenerateExample)
  * [func (h *Hash) HasAttributes() bool](#Hash.HasAttributes)
  * [func (h *Hash) IsArray() bool](#Hash.IsArray)
  * [func (h *Hash) IsCompatible(val interface{}) bool](#Hash.IsCompatible)
  * [func (h *Hash) IsHash() bool](#Hash.IsHash)
  * [func (h *Hash) IsObject() bool](#Hash.IsObject)
  * [func (h *Hash) IsPrimitive() bool](#Hash.IsPrimitive)
  * [func (h *Hash) Kind() Kind](#Hash.Kind)
  * [func (h *Hash) MakeMap(m map[interface{}]interface{}) interface{}](#Hash.MakeMap)
  * [func (h *Hash) Name() string](#Hash.Name)
  * [func (h *Hash) ToArray() *Array](#Hash.ToArray)
  * [func (h *Hash) ToHash() *Hash](#Hash.ToHash)
  * [func (h *Hash) ToObject() Object](#Hash.ToObject)
* [type HashVal](#HashVal)
  * [func (h HashVal) ToMap() map[interface{}]interface{}](#HashVal.ToMap)
* [type HeaderIterator](#HeaderIterator)
* [type Kind](#Kind)
* [type LicenseDefinition](#LicenseDefinition)
  * [func (l *LicenseDefinition) Context() string](#LicenseDefinition.Context)
* [type LinkDefinition](#LinkDefinition)
  * [func (l *LinkDefinition) Attribute() *AttributeDefinition](#LinkDefinition.Attribute)
  * [func (l *LinkDefinition) Context() string](#LinkDefinition.Context)
  * [func (l *LinkDefinition) MediaType() *MediaTypeDefinition](#LinkDefinition.MediaType)
  * [func (l *LinkDefinition) Validate() *dslengine.ValidationErrors](#LinkDefinition.Validate)
* [type MediaTypeDefinition](#MediaTypeDefinition)
  * [func NewMediaTypeDefinition(name, identifier string, dsl func()) *MediaTypeDefinition](#NewMediaTypeDefinition)
  * [func (m *MediaTypeDefinition) ComputeViews() map[string]*ViewDefinition](#MediaTypeDefinition.ComputeViews)
  * [func (m *MediaTypeDefinition) Finalize()](#MediaTypeDefinition.Finalize)
  * [func (m *MediaTypeDefinition) IsError() bool](#MediaTypeDefinition.IsError)
  * [func (m *MediaTypeDefinition) IterateViews(it ViewIterator) error](#MediaTypeDefinition.IterateViews)
  * [func (m *MediaTypeDefinition) Kind() Kind](#MediaTypeDefinition.Kind)
  * [func (m *MediaTypeDefinition) Project(view string) (*MediaTypeDefinition, *UserTypeDefinition, error)](#MediaTypeDefinition.Project)
  * [func (m *MediaTypeDefinition) Validate() *dslengine.ValidationErrors](#MediaTypeDefinition.Validate)
* [type MediaTypeIterator](#MediaTypeIterator)
* [type MediaTypeRoot](#MediaTypeRoot)
  * [func (r MediaTypeRoot) DSLName() string](#MediaTypeRoot.DSLName)
  * [func (r MediaTypeRoot) DependsOn() []dslengine.Root](#MediaTypeRoot.DependsOn)
  * [func (r MediaTypeRoot) IterateSets(iterator dslengine.SetIterator)](#MediaTypeRoot.IterateSets)
  * [func (r MediaTypeRoot) Reset()](#MediaTypeRoot.Reset)
* [type Object](#Object)
  * [func (o Object) CanHaveDefault() bool](#Object.CanHaveDefault)
  * [func (o Object) GenerateExample(r *RandomGenerator, seen []string) interface{}](#Object.GenerateExample)
  * [func (o Object) HasAttributes() bool](#Object.HasAttributes)
  * [func (o Object) IsArray() bool](#Object.IsArray)
  * [func (o Object) IsCompatible(val interface{}) bool](#Object.IsCompatible)
  * [func (o Object) IsHash() bool](#Object.IsHash)
  * [func (o Object) IsObject() bool](#Object.IsObject)
  * [func (o Object) IsPrimitive() bool](#Object.IsPrimitive)
  * [func (o Object) IterateAttributes(it AttributeIterator) error](#Object.IterateAttributes)
  * [func (o Object) Kind() Kind](#Object.Kind)
  * [func (o Object) Merge(other Object)](#Object.Merge)
  * [func (o Object) Name() string](#Object.Name)
  * [func (o Object) ToArray() *Array](#Object.ToArray)
  * [func (o Object) ToHash() *Hash](#Object.ToHash)
  * [func (o Object) ToObject() Object](#Object.ToObject)
* [type Primitive](#Primitive)
  * [func (p Primitive) CanHaveDefault() (ok bool)](#Primitive.CanHaveDefault)
  * [func (p Primitive) GenerateExample(r *RandomGenerator, seen []string) interface{}](#Primitive.GenerateExample)
  * [func (p Primitive) HasAttributes() bool](#Primitive.HasAttributes)
  * [func (p Primitive) IsArray() bool](#Primitive.IsArray)
  * [func (p Primitive) IsCompatible(val interface{}) bool](#Primitive.IsCompatible)
  * [func (p Primitive) IsHash() bool](#Primitive.IsHash)
  * [func (p Primitive) IsObject() bool](#Primitive.IsObject)
  * [func (p Primitive) IsPrimitive() bool](#Primitive.IsPrimitive)
  * [func (p Primitive) Kind() Kind](#Primitive.Kind)
  * [func (p Primitive) Name() string](#Primitive.Name)
  * [func (p Primitive) ToArray() *Array](#Primitive.ToArray)
  * [func (p Primitive) ToHash() *Hash](#Primitive.ToHash)
  * [func (p Primitive) ToObject() Object](#Primitive.ToObject)
* [type RandomGenerator](#RandomGenerator)
  * [func NewRandomGenerator(seed string) *RandomGenerator](#NewRandomGenerator)
  * [func (r *RandomGenerator) Bool() bool](#RandomGenerator.Bool)
  * [func (r *RandomGenerator) DateTime() time.Time](#RandomGenerator.DateTime)
  * [func (r *RandomGenerator) File() string](#RandomGenerator.File)
  * [func (r *RandomGenerator) Float64() float64](#RandomGenerator.Float64)
  * [func (r *RandomGenerator) Int() int](#RandomGenerator.Int)
  * [func (r *RandomGenerator) String() string](#RandomGenerator.String)
  * [func (r *RandomGenerator) UUID() uuid.UUID](#RandomGenerator.UUID)
* [type ResourceDefinition](#ResourceDefinition)
  * [func NewResourceDefinition(name string, dsl func()) *ResourceDefinition](#NewResourceDefinition)
  * [func (r *ResourceDefinition) AllOrigins() []*CORSDefinition](#ResourceDefinition.AllOrigins)
  * [func (r *ResourceDefinition) CanonicalAction() *ActionDefinition](#ResourceDefinition.CanonicalAction)
  * [func (r *ResourceDefinition) Context() string](#ResourceDefinition.Context)
  * [func (r *ResourceDefinition) DSL() func()](#ResourceDefinition.DSL)
  * [func (r *ResourceDefinition) Finalize()](#ResourceDefinition.Finalize)
  * [func (r *ResourceDefinition) FullPath() string](#ResourceDefinition.FullPath)
  * [func (r *ResourceDefinition) IterateActions(it ActionIterator) error](#ResourceDefinition.IterateActions)
  * [func (r *ResourceDefinition) IterateFileServers(it FileServerIterator) error](#ResourceDefinition.IterateFileServers)
  * [func (r *ResourceDefinition) IterateHeaders(it HeaderIterator) error](#ResourceDefinition.IterateHeaders)
  * [func (r *ResourceDefinition) Parent() *ResourceDefinition](#ResourceDefinition.Parent)
  * [func (r *ResourceDefinition) PathParams() *AttributeDefinition](#ResourceDefinition.PathParams)
  * [func (r *ResourceDefinition) PreflightPaths() []string](#ResourceDefinition.PreflightPaths)
  * [func (r *ResourceDefinition) URITemplate() string](#ResourceDefinition.URITemplate)
  * [func (r *ResourceDefinition) UserTypes() map[string]*UserTypeDefinition](#ResourceDefinition.UserTypes)
  * [func (r *ResourceDefinition) Validate() *dslengine.ValidationErrors](#ResourceDefinition.Validate)
* [type ResourceIterator](#ResourceIterator)
* [type ResponseDefinition](#ResponseDefinition)
  * [func (r *ResponseDefinition) Context() string](#ResponseDefinition.Context)
  * [func (r *ResponseDefinition) Dup() *ResponseDefinition](#ResponseDefinition.Dup)
  * [func (r *ResponseDefinition) Finalize()](#ResponseDefinition.Finalize)
  * [func (r *ResponseDefinition) Merge(other *ResponseDefinition)](#ResponseDefinition.Merge)
  * [func (r *ResponseDefinition) Validate() *dslengine.ValidationErrors](#ResponseDefinition.Validate)
* [type ResponseIterator](#ResponseIterator)
* [type ResponseTemplateDefinition](#ResponseTemplateDefinition)
  * [func (r *ResponseTemplateDefinition) Context() string](#ResponseTemplateDefinition.Context)
* [type RouteDefinition](#RouteDefinition)
  * [func (r *RouteDefinition) Context() string](#RouteDefinition.Context)
  * [func (r *RouteDefinition) FullPath() string](#RouteDefinition.FullPath)
  * [func (r *RouteDefinition) IsAbsolute() bool](#RouteDefinition.IsAbsolute)
  * [func (r *RouteDefinition) Params() []string](#RouteDefinition.Params)
  * [func (r *RouteDefinition) Validate() *dslengine.ValidationErrors](#RouteDefinition.Validate)
* [type SecurityDefinition](#SecurityDefinition)
  * [func (s *SecurityDefinition) Context() string](#SecurityDefinition.Context)
* [type SecuritySchemeDefinition](#SecuritySchemeDefinition)
  * [func (s *SecuritySchemeDefinition) Context() string](#SecuritySchemeDefinition.Context)
  * [func (s *SecuritySchemeDefinition) DSL() func()](#SecuritySchemeDefinition.DSL)
  * [func (s *SecuritySchemeDefinition) Finalize()](#SecuritySchemeDefinition.Finalize)
  * [func (s *SecuritySchemeDefinition) Validate() error](#SecuritySchemeDefinition.Validate)
* [type SecuritySchemeKind](#SecuritySchemeKind)
* [type UserTypeDefinition](#UserTypeDefinition)
  * [func NewUserTypeDefinition(name string, dsl func()) *UserTypeDefinition](#NewUserTypeDefinition)
  * [func (u *UserTypeDefinition) CanHaveDefault() bool](#UserTypeDefinition.CanHaveDefault)
  * [func (t *UserTypeDefinition) Context() string](#UserTypeDefinition.Context)
  * [func (t *UserTypeDefinition) DSL() func()](#UserTypeDefinition.DSL)
  * [func (u *UserTypeDefinition) Finalize()](#UserTypeDefinition.Finalize)
  * [func (u *UserTypeDefinition) HasAttributes() bool](#UserTypeDefinition.HasAttributes)
  * [func (u *UserTypeDefinition) IsArray() bool](#UserTypeDefinition.IsArray)
  * [func (u *UserTypeDefinition) IsCompatible(val interface{}) bool](#UserTypeDefinition.IsCompatible)
  * [func (u *UserTypeDefinition) IsHash() bool](#UserTypeDefinition.IsHash)
  * [func (u *UserTypeDefinition) IsObject() bool](#UserTypeDefinition.IsObject)
  * [func (u *UserTypeDefinition) IsPrimitive() bool](#UserTypeDefinition.IsPrimitive)
  * [func (u *UserTypeDefinition) Kind() Kind](#UserTypeDefinition.Kind)
  * [func (u *UserTypeDefinition) Name() string](#UserTypeDefinition.Name)
  * [func (u *UserTypeDefinition) ToArray() *Array](#UserTypeDefinition.ToArray)
  * [func (u *UserTypeDefinition) ToHash() *Hash](#UserTypeDefinition.ToHash)
  * [func (u *UserTypeDefinition) ToObject() Object](#UserTypeDefinition.ToObject)
  * [func (u *UserTypeDefinition) Validate(ctx string, parent dslengine.Definition) *dslengine.ValidationErrors](#UserTypeDefinition.Validate)
  * [func (u *UserTypeDefinition) Walk(walker func(*AttributeDefinition) error) error](#UserTypeDefinition.Walk)
* [type UserTypeIterator](#UserTypeIterator)
* [type ViewDefinition](#ViewDefinition)
  * [func (v *ViewDefinition) Context() string](#ViewDefinition.Context)
  * [func (v *ViewDefinition) Validate() *dslengine.ValidationErrors](#ViewDefinition.Validate)
* [type ViewIterator](#ViewIterator)


#### <a name="pkg-files">Package files</a>
[api.go](/src/github.com/goadesign/goa/design/api.go) [definitions.go](/src/github.com/goadesign/goa/design/definitions.go) [dup.go](/src/github.com/goadesign/goa/design/dup.go) [example.go](/src/github.com/goadesign/goa/design/example.go) [random.go](/src/github.com/goadesign/goa/design/random.go) [security.go](/src/github.com/goadesign/goa/design/security.go) [types.go](/src/github.com/goadesign/goa/design/types.go) [validation.go](/src/github.com/goadesign/goa/design/validation.go) 


## <a name="pkg-constants">Constants</a>
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

``` go
const (
    // Boolean is the type for a JSON boolean.
    Boolean = Primitive(BooleanKind)

    // Integer is the type for a JSON number without a fraction or exponent part.
    Integer = Primitive(IntegerKind)

    // Number is the type for any JSON number, including integers.
    Number = Primitive(NumberKind)

    // String is the type for a JSON string.
    String = Primitive(StringKind)

    // DateTime is the type for a JSON string parsed as a Go time.Time
    // DateTime expects an RFC3339 formatted value.
    DateTime = Primitive(DateTimeKind)

    // UUID is the type for a JSON string parsed as a Go uuid.UUID
    // UUID expects an RFC4122 formatted value.
    UUID = Primitive(UUIDKind)

    // Any is the type for an arbitrary JSON value (interface{} in Go).
    Any = Primitive(AnyKind)

    // File is the type for a file. This type can only be used in a multipart definition.
    File = Primitive(FileKind)
)
```
``` go
const DefaultView = "default"
```
DefaultView is the name of the default view.


## <a name="pkg-variables">Variables</a>
``` go
var (
    // Design being built by DSL.
    Design *APIDefinition

    // GeneratedMediaTypes contains DSL definitions that were created by the design DSL and
    // need to be executed as a second pass.
    // An example of this are media types defined with CollectionOf: the element media type
    // must be defined first then the definition created by CollectionOf must execute.
    GeneratedMediaTypes MediaTypeRoot

    // ProjectedMediaTypes is a cache used by the MediaType strut Project method.
    ProjectedMediaTypes MediaTypeRoot

    // WildcardRegex is the regular expression used to capture path parameters.
    WildcardRegex = regexp.MustCompile(`/(?::|\*)([a-zA-Z0-9_]+)`)

    // DefaultDecoders contains the decoding definitions used when no Consumes DSL is found.
    DefaultDecoders []*EncodingDefinition

    // DefaultEncoders contains the encoding definitions used when no Produces DSL is found.
    DefaultEncoders []*EncodingDefinition

    // KnownEncoders contains the list of encoding packages and factories known by goa indexed
    // by MIME type.
    KnownEncoders = map[string]string{
        "application/json":      "github.com/goadesign/goa",
        "application/xml":       "github.com/goadesign/goa",
        "application/gob":       "github.com/goadesign/goa",
        "application/x-gob":     "github.com/goadesign/goa",
        "application/binc":      "github.com/goadesign/goa/encoding/binc",
        "application/x-binc":    "github.com/goadesign/goa/encoding/binc",
        "application/cbor":      "github.com/goadesign/goa/encoding/cbor",
        "application/x-cbor":    "github.com/goadesign/goa/encoding/cbor",
        "application/msgpack":   "github.com/goadesign/goa/encoding/msgpack",
        "application/x-msgpack": "github.com/goadesign/goa/encoding/msgpack",
    }

    // KnownEncoderFunctions contains the list of encoding encoder and decoder functions known
    // by goa indexed by MIME type.
    KnownEncoderFunctions = map[string][2]string{
        "application/json":      {"NewJSONEncoder", "NewJSONDecoder"},
        "application/xml":       {"NewXMLEncoder", "NewXMLDecoder"},
        "application/gob":       {"NewGobEncoder", "NewGobDecoder"},
        "application/x-gob":     {"NewGobEncoder", "NewGobDecoder"},
        "application/binc":      {"NewEncoder", "NewDecoder"},
        "application/x-binc":    {"NewEncoder", "NewDecoder"},
        "application/cbor":      {"NewEncoder", "NewDecoder"},
        "application/x-cbor":    {"NewEncoder", "NewDecoder"},
        "application/msgpack":   {"NewEncoder", "NewDecoder"},
        "application/x-msgpack": {"NewEncoder", "NewDecoder"},
    }

    // JSONContentTypes list the Content-Type header values that cause goa to encode or decode
    // JSON by default.
    JSONContentTypes = []string{"application/json"}

    // XMLContentTypes list the Content-Type header values that cause goa to encode or decode
    // XML by default.
    XMLContentTypes = []string{"application/xml"}

    // GobContentTypes list the Content-Type header values that cause goa to encode or decode
    // Gob by default.
    GobContentTypes = []string{"application/gob", "application/x-gob"}

    // ErrorMediaIdentifier is the media type identifier used for error responses.
    ErrorMediaIdentifier = "application/vnd.goa.error"

    // ErrorMedia is the built-in media type for error responses.
    ErrorMedia = &MediaTypeDefinition{
        UserTypeDefinition: &UserTypeDefinition{
            AttributeDefinition: &AttributeDefinition{
                Type:        errorMediaType,
                Description: "Error response media type",
                Example: map[string]interface{}{
                    "id":     "3F1FKVRR",
                    "status": "400",
                    "code":   "invalid_value",
                    "detail": "Value of ID must be an integer",
                    "meta":   map[string]interface{}{"timestamp": 1458609066},
                },
            },
            TypeName: "error",
        },
        Identifier: ErrorMediaIdentifier,
        Views:      map[string]*ViewDefinition{"default": errorMediaView},
    }
)
```


## <a name="CanonicalIdentifier">func</a> [CanonicalIdentifier](/src/target/api.go?s=8005:8055#L207)
``` go
func CanonicalIdentifier(identifier string) string
```
CanonicalIdentifier returns the media type identifier sans suffix
which is what the DSL uses to store and lookup media types.



## <a name="ExtractWildcards">func</a> [ExtractWildcards](/src/target/api.go?s=8616:8659#L226)
``` go
func ExtractWildcards(path string) []string
```
ExtractWildcards returns the names of the wildcards that appear in path.



## <a name="HasFile">func</a> [HasFile](/src/target/types.go?s=18476:18506#L604)
``` go
func HasFile(dt DataType) bool
```
HasFile returns true if the underlying type has any file attributes.



## <a name="HasKnownEncoder">func</a> [HasKnownEncoder](/src/target/api.go?s=8454:8496#L221)
``` go
func HasKnownEncoder(mimeType string) bool
```
HasKnownEncoder returns true if the encoder for the given MIME type is known by goa.
MIME types with unknown encoders must be associated with a package path explicitly in the DSL.



## <a name="UserTypes">func</a> [UserTypes](/src/target/types.go?s=17148:17206#L555)
``` go
func UserTypes(dt DataType) map[string]*UserTypeDefinition
```
UserTypes traverses the data type recursively and collects all the user types used to
define it. The returned map is indexed by type name.




## <a name="APIDefinition">type</a> [APIDefinition](/src/target/definitions.go?s=222:2854#L17)
``` go
type APIDefinition struct {
    // Name of API
    Name string
    // Title of API
    Title string
    // Description of API
    Description string
    // Version is the version of the API described by this design.
    Version string
    // Host is the default API hostname
    Host string
    // Schemes is the supported API URL schemes
    Schemes []string
    // BasePath is the common base path to all API endpoints
    BasePath string
    // Params define the common path parameters to all API endpoints
    Params *AttributeDefinition
    // Consumes lists the mime types supported by the API controllers
    Consumes []*EncodingDefinition
    // Produces lists the mime types generated by the API controllers
    Produces []*EncodingDefinition
    // Origins defines the CORS policies that apply to this API.
    Origins map[string]*CORSDefinition
    // TermsOfService describes or links to the API terms of service
    TermsOfService string
    // Contact provides the API users with contact information
    Contact *ContactDefinition
    // License describes the API license
    License *LicenseDefinition
    // Docs points to the API external documentation
    Docs *DocsDefinition
    // Resources is the set of exposed resources indexed by name
    Resources map[string]*ResourceDefinition
    // Types indexes the user defined types by name
    Types map[string]*UserTypeDefinition
    // MediaTypes indexes the API media types by canonical identifier
    MediaTypes map[string]*MediaTypeDefinition
    // Traits available to all API resources and actions indexed by name
    Traits map[string]*dslengine.TraitDefinition
    // Responses available to all API actions indexed by name
    Responses map[string]*ResponseDefinition
    // Response template factories available to all API actions indexed by name
    ResponseTemplates map[string]*ResponseTemplateDefinition
    // Built-in responses
    DefaultResponses map[string]*ResponseDefinition
    // Built-in response templates
    DefaultResponseTemplates map[string]*ResponseTemplateDefinition
    // DSLFunc contains the DSL used to create this definition if any
    DSLFunc func()
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // SecuritySchemes lists the available security schemes available
    // to the API.
    SecuritySchemes []*SecuritySchemeDefinition
    // Security defines security requirements for all the
    // resources and actions, unless overridden by Resource or
    // Action-level Security() calls.
    Security *SecurityDefinition
    // NoExamples indicates whether to bypass automatic example generation.
    NoExamples bool
    // contains filtered or unexported fields
}

```
APIDefinition defines the global properties of the API.







### <a name="NewAPIDefinition">func</a> [NewAPIDefinition](/src/target/definitions.go?s=13310:13348#L370)
``` go
func NewAPIDefinition() *APIDefinition
```
NewAPIDefinition returns a new design with built-in response templates.





### <a name="APIDefinition.Context">func</a> (\*APIDefinition) [Context](/src/target/definitions.go?s=17472:17512#L519)
``` go
func (a *APIDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="APIDefinition.DSL">func</a> (\*APIDefinition) [DSL](/src/target/definitions.go?s=21159:21195#L655)
``` go
func (a *APIDefinition) DSL() func()
```
DSL returns the initialization DSL.




### <a name="APIDefinition.DSLName">func</a> (\*APIDefinition) [DSLName](/src/target/definitions.go?s=15241:15281#L447)
``` go
func (a *APIDefinition) DSLName() string
```
DSLName is the name of the DSL as displayed to the user during execution.




### <a name="APIDefinition.DependsOn">func</a> (\*APIDefinition) [DependsOn](/src/target/definitions.go?s=15391:15443#L452)
``` go
func (a *APIDefinition) DependsOn() []dslengine.Root
```
DependsOn returns the other roots this root depends on, nothing for APIDefinition.




### <a name="APIDefinition.Finalize">func</a> (\*APIDefinition) [Finalize](/src/target/definitions.go?s=21369:21403#L661)
``` go
func (a *APIDefinition) Finalize()
```
Finalize sets the Consumes and Produces fields to the defaults if empty.
Also it records built-in media types that are used by the user design.




### <a name="APIDefinition.IterateMediaTypes">func</a> (\*APIDefinition) [IterateMediaTypes](/src/target/definitions.go?s=18099:18168#L539)
``` go
func (a *APIDefinition) IterateMediaTypes(it MediaTypeIterator) error
```
IterateMediaTypes calls the given iterator passing in each media type sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateMediaTypes returns that
error.




### <a name="APIDefinition.IterateResources">func</a> (\*APIDefinition) [IterateResources](/src/target/definitions.go?s=20371:20438#L618)
``` go
func (a *APIDefinition) IterateResources(it ResourceIterator) error
```
IterateResources calls the given iterator passing in each resource sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateResources returns that
error.




### <a name="APIDefinition.IterateResponses">func</a> (\*APIDefinition) [IterateResponses](/src/target/definitions.go?s=19117:19184#L577)
``` go
func (a *APIDefinition) IterateResponses(it ResponseIterator) error
```
IterateResponses calls the given iterator passing in each response sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateResponses returns that
error.




### <a name="APIDefinition.IterateSets">func</a> (\*APIDefinition) [IterateSets](/src/target/definitions.go?s=15582:15649#L458)
``` go
func (a *APIDefinition) IterateSets(iterator dslengine.SetIterator)
```
IterateSets calls the given iterator possing in the API definition, user types, media types and
finally resources.




### <a name="APIDefinition.IterateUserTypes">func</a> (\*APIDefinition) [IterateUserTypes](/src/target/definitions.go?s=18617:18684#L558)
``` go
func (a *APIDefinition) IterateUserTypes(it UserTypeIterator) error
```
IterateUserTypes calls the given iterator passing in each user type sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateUserTypes returns that
error.




### <a name="APIDefinition.MediaTypeWithIdentifier">func</a> (\*APIDefinition) [MediaTypeWithIdentifier](/src/target/definitions.go?s=19914:19993#L605)
``` go
func (a *APIDefinition) MediaTypeWithIdentifier(id string) *MediaTypeDefinition
```
MediaTypeWithIdentifier returns the media type with a matching
media type identifier. Two media type identifiers match if their
values sans suffix match. So for example "application/vnd.foo+xml",
"application/vnd.foo+json" and "application/vnd.foo" all match.




### <a name="APIDefinition.PathParams">func</a> (\*APIDefinition) [PathParams](/src/target/definitions.go?s=17655:17712#L527)
``` go
func (a *APIDefinition) PathParams() *AttributeDefinition
```
PathParams returns the base path parameters of a.




### <a name="APIDefinition.RandomGenerator">func</a> (\*APIDefinition) [RandomGenerator](/src/target/definitions.go?s=19502:19560#L594)
``` go
func (a *APIDefinition) RandomGenerator() *RandomGenerator
```
RandomGenerator is seeded after the API name. It's used to generate examples.




### <a name="APIDefinition.Reset">func</a> (\*APIDefinition) [Reset](/src/target/definitions.go?s=17330:17361#L513)
``` go
func (a *APIDefinition) Reset()
```
Reset sets all the API definition fields to their zero value except the default responses and
default response templates.




### <a name="APIDefinition.Validate">func</a> (\*APIDefinition) [Validate](/src/target/validation.go?s=1519:1559#L67)
``` go
func (a *APIDefinition) Validate() error
```
Validate tests whether the API definition is consistent: all resource parent names resolve to
an actual resource.




## <a name="ActionDefinition">type</a> [ActionDefinition](/src/target/definitions.go?s=8126:9282#L225)
``` go
type ActionDefinition struct {
    // Action name, e.g. "create"
    Name string
    // Action description, e.g. "Creates a task"
    Description string
    // Docs points to the API external documentation
    Docs *DocsDefinition
    // Parent resource
    Parent *ResourceDefinition
    // Specific action URL schemes
    Schemes []string
    // Action routes
    Routes []*RouteDefinition
    // Map of possible response definitions indexed by name
    Responses map[string]*ResponseDefinition
    // Path and query string parameters
    Params *AttributeDefinition
    // Query string parameters only
    QueryParams *AttributeDefinition
    // Payload blueprint (request body) if any
    Payload *UserTypeDefinition
    // PayloadOptional is true if the request payload is optional, false otherwise.
    PayloadOptional bool
    // PayloadOptional is true if the request payload is multipart, false otherwise.
    PayloadMultipart bool
    // Request headers that need to be made available to action
    Headers *AttributeDefinition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Security defines security requirements for the action
    Security *SecurityDefinition
}

```
ActionDefinition defines a resource action.
It defines both an HTTP endpoint and the shape of HTTP requests and responses made to
that endpoint.
The shape of requests is defined via "parameters", there are path parameters
parameters and a payload parameter (request body).
(i.e. portions of the URL that define parameter values), query string










### <a name="ActionDefinition.AllParams">func</a> (\*ActionDefinition) [AllParams](/src/target/definitions.go?s=44123:44182#L1505)
``` go
func (a *ActionDefinition) AllParams() *AttributeDefinition
```
AllParams returns the path and query string parameters of the action across all its routes.




### <a name="ActionDefinition.CanonicalScheme">func</a> (\*ActionDefinition) [CanonicalScheme](/src/target/definitions.go?s=44889:44940#L1535)
``` go
func (a *ActionDefinition) CanonicalScheme() string
```
CanonicalScheme returns the preferred scheme for making requests. Favor secure schemes.




### <a name="ActionDefinition.Context">func</a> (\*ActionDefinition) [Context](/src/target/definitions.go?s=43382:43425#L1477)
``` go
func (a *ActionDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="ActionDefinition.EffectiveSchemes">func</a> (\*ActionDefinition) [EffectiveSchemes](/src/target/definitions.go?s=45301:45355#L1554)
``` go
func (a *ActionDefinition) EffectiveSchemes() []string
```
EffectiveSchemes return the URL schemes that apply to the action. Looks recursively into action
resource, parent resources and API.




### <a name="ActionDefinition.Finalize">func</a> (\*ActionDefinition) [Finalize](/src/target/definitions.go?s=46113:46150#L1588)
``` go
func (a *ActionDefinition) Finalize()
```
Finalize inherits security scheme and action responses from parent and top level design.




### <a name="ActionDefinition.HasAbsoluteRoutes">func</a> (\*ActionDefinition) [HasAbsoluteRoutes](/src/target/definitions.go?s=44652:44703#L1525)
``` go
func (a *ActionDefinition) HasAbsoluteRoutes() bool
```
HasAbsoluteRoutes returns true if all the action routes are absolute.




### <a name="ActionDefinition.IterateHeaders">func</a> (\*ActionDefinition) [IterateHeaders](/src/target/definitions.go?s=47477:47543#L1638)
``` go
func (a *ActionDefinition) IterateHeaders(it HeaderIterator) error
```
IterateHeaders iterates over the resource-level and action-level headers,
calling the given iterator passing in each response sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateHeaders returns that
error.




### <a name="ActionDefinition.IterateResponses">func</a> (\*ActionDefinition) [IterateResponses](/src/target/definitions.go?s=48042:48112#L1652)
``` go
func (a *ActionDefinition) IterateResponses(it ResponseIterator) error
```
IterateResponses calls the given iterator passing in each response sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateResponses returns that
error.




### <a name="ActionDefinition.PathParams">func</a> (\*ActionDefinition) [PathParams](/src/target/definitions.go?s=43727:43787#L1491)
``` go
func (a *ActionDefinition) PathParams() *AttributeDefinition
```
PathParams returns the path parameters of the action across all its routes.




### <a name="ActionDefinition.UserTypes">func</a> (\*ActionDefinition) [UserTypes](/src/target/definitions.go?s=46617:46686#L1611)
``` go
func (a *ActionDefinition) UserTypes() map[string]*UserTypeDefinition
```
UserTypes returns all the user types used by the action payload and parameters.




### <a name="ActionDefinition.Validate">func</a> (\*ActionDefinition) [Validate](/src/target/validation.go?s=9078:9143#L324)
``` go
func (a *ActionDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the action definition is consistent: parameters have unique names and it has at least
one response.




### <a name="ActionDefinition.ValidateParams">func</a> (\*ActionDefinition) [ValidateParams](/src/target/validation.go?s=11535:11606#L402)
``` go
func (a *ActionDefinition) ValidateParams() *dslengine.ValidationErrors
```
ValidateParams checks the action parameters (make sure they have names, members and types).




### <a name="ActionDefinition.WebSocket">func</a> (\*ActionDefinition) [WebSocket](/src/target/definitions.go?s=45801:45844#L1574)
``` go
func (a *ActionDefinition) WebSocket() bool
```
WebSocket returns true if the action scheme is "ws" or "wss" or both (directly or inherited
from the resource or API)




## <a name="ActionIterator">type</a> [ActionIterator](/src/target/definitions.go?s=12774:12820#L357)
``` go
type ActionIterator func(a *ActionDefinition) error
```
ActionIterator is the type of functions given to IterateActions.










## <a name="Array">type</a> [Array](/src/target/types.go?s=3754:3803#L90)
``` go
type Array struct {
    ElemType *AttributeDefinition
}

```
Array is the type for a JSON array.










### <a name="Array.CanHaveDefault">func</a> (\*Array) [CanHaveDefault](/src/target/types.go?s=10990:11027#L351)
``` go
func (a *Array) CanHaveDefault() bool
```
CanHaveDefault returns true if the array type can have a default value.
The array type can have a default value only if the element type can
have a default value.




### <a name="Array.GenerateExample">func</a> (\*Array) [GenerateExample](/src/target/types.go?s=11539:11617#L372)
``` go
func (a *Array) GenerateExample(r *RandomGenerator, seen []string) interface{}
```
GenerateExample produces a random array value.




### <a name="Array.HasAttributes">func</a> (\*Array) [HasAttributes](/src/target/types.go?s=10299:10335#L326)
``` go
func (a *Array) HasAttributes() bool
```
HasAttributes returns true if the array's element type is user defined.




### <a name="Array.IsArray">func</a> (\*Array) [IsArray](/src/target/types.go?s=10483:10513#L334)
``` go
func (a *Array) IsArray() bool
```
IsArray returns true.




### <a name="Array.IsCompatible">func</a> (\*Array) [IsCompatible](/src/target/types.go?s=11132:11182#L356)
``` go
func (a *Array) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.




### <a name="Array.IsHash">func</a> (\*Array) [IsHash](/src/target/types.go?s=10556:10585#L337)
``` go
func (a *Array) IsHash() bool
```
IsHash returns false.




### <a name="Array.IsObject">func</a> (\*Array) [IsObject](/src/target/types.go?s=10408:10439#L331)
``` go
func (a *Array) IsObject() bool
```
IsObject returns false.




### <a name="Array.IsPrimitive">func</a> (\*Array) [IsPrimitive](/src/target/types.go?s=10171:10205#L323)
``` go
func (a *Array) IsPrimitive() bool
```
IsPrimitive returns false.




### <a name="Array.Kind">func</a> (\*Array) [Kind](/src/target/types.go?s=10009:10036#L315)
``` go
func (a *Array) Kind() Kind
```
Kind implements DataKind.




### <a name="Array.MakeSlice">func</a> (\*Array) [MakeSlice](/src/target/types.go?s=11971:12025#L383)
``` go
func (a *Array) MakeSlice(s []interface{}) interface{}
```
MakeSlice examines the key type from the Array and create a slice with builtin type if possible.
The idea is to avoid generating []interface{} and produce more known types.




### <a name="Array.Name">func</a> (\*Array) [Name](/src/target/types.go?s=10090:10119#L318)
``` go
func (a *Array) Name() string
```
Name returns the type name.




### <a name="Array.ToArray">func</a> (\*Array) [ToArray](/src/target/types.go?s=10701:10733#L343)
``` go
func (a *Array) ToArray() *Array
```
ToArray returns a.




### <a name="Array.ToHash">func</a> (\*Array) [ToHash](/src/target/types.go?s=10771:10801#L346)
``` go
func (a *Array) ToHash() *Hash
```
ToHash returns nil.




### <a name="Array.ToObject">func</a> (\*Array) [ToObject](/src/target/types.go?s=10629:10662#L340)
``` go
func (a *Array) ToObject() Object
```
ToObject returns nil.




## <a name="ArrayVal">type</a> [ArrayVal](/src/target/types.go?s=3879:3901#L95)
``` go
type ArrayVal []interface{}
```
ArrayVal is the value of an array used to specify the default value.










### <a name="ArrayVal.ToSlice">func</a> (ArrayVal) [ToSlice](/src/target/types.go?s=19335:19376#L646)
``` go
func (a ArrayVal) ToSlice() []interface{}
```
ToSlice converts an ArrayVal to a slice.




## <a name="AttributeDefinition">type</a> [AttributeDefinition](/src/target/definitions.go?s=11177:12004#L316)
``` go
type AttributeDefinition struct {
    // Attribute type
    Type DataType
    // Attribute reference type if any
    Reference DataType
    // Optional description
    Description string
    // Optional validations
    Validation *dslengine.ValidationDefinition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Optional member default value
    DefaultValue interface{}
    // Optional member example value
    Example interface{}
    // Optional view used to render Attribute (only applies to media type attributes).
    View string
    // NonZeroAttributes lists the names of the child attributes that cannot have a
    // zero value (and thus whose presence does not need to be validated).
    NonZeroAttributes map[string]bool
    // DSLFunc contains the initialization DSL. This is used for user types.
    DSLFunc func()
}

```
AttributeDefinition defines a JSON object member with optional description, default
value and validations.







### <a name="DupAtt">func</a> [DupAtt](/src/target/dup.go?s=219:277#L11)
``` go
func DupAtt(att *AttributeDefinition) *AttributeDefinition
```
DupAtt creates a copy of the given attribute.





### <a name="AttributeDefinition.AddValues">func</a> (\*AttributeDefinition) [AddValues](/src/target/definitions.go?s=31185:31246#L1013)
``` go
func (a *AttributeDefinition) AddValues(values []interface{})
```
AddValues adds the Enum values to the attribute's validation definition.
It also performs any conversion needed for HashVal and ArrayVal types.




### <a name="AttributeDefinition.AllNonZero">func</a> (\*AttributeDefinition) [AllNonZero](/src/target/definitions.go?s=31692:31743#L1031)
``` go
func (a *AttributeDefinition) AllNonZero() []string
```
AllNonZero returns the complete list of all non-zero attribute name.




### <a name="AttributeDefinition.AllRequired">func</a> (\*AttributeDefinition) [AllRequired](/src/target/definitions.go?s=29875:29938#L967)
``` go
func (a *AttributeDefinition) AllRequired() (required []string)
```
AllRequired returns the list of all required fields from the underlying object.
An attribute type can be itself an attribute (e.g. a MediaTypeDefinition or a UserTypeDefinition)
This happens when the DSL uses references for example. So traverse the hierarchy and collect
all the required validations.




### <a name="AttributeDefinition.Context">func</a> (\*AttributeDefinition) [Context](/src/target/definitions.go?s=29499:29545#L959)
``` go
func (a *AttributeDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="AttributeDefinition.DSL">func</a> (\*AttributeDefinition) [DSL](/src/target/definitions.go?s=38405:38447#L1281)
``` go
func (a *AttributeDefinition) DSL() func()
```
DSL returns the initialization DSL.




### <a name="AttributeDefinition.Definition">func</a> (\*AttributeDefinition) [Definition](/src/target/types.go?s=31181:31244#L1019)
``` go
func (a *AttributeDefinition) Definition() *AttributeDefinition
```
Definition returns the underlying attribute definition.
Note that this function is "inherited" by both UserTypeDefinition and
MediaTypeDefinition.




### <a name="AttributeDefinition.GenerateExample">func</a> (\*AttributeDefinition) [GenerateExample](/src/target/definitions.go?s=34121:34216#L1105)
``` go
func (a *AttributeDefinition) GenerateExample(rand *RandomGenerator, seen []string) interface{}
```
GenerateExample returns the value of the Example field if not nil. Otherwise it traverses the
attribute type and recursively generates an example. The result is saved in the Example field.




### <a name="AttributeDefinition.HasDefaultValue">func</a> (\*AttributeDefinition) [HasDefaultValue](/src/target/definitions.go?s=30497:30563#L990)
``` go
func (a *AttributeDefinition) HasDefaultValue(attName string) bool
```
HasDefaultValue returns true if the given attribute has a default value.




### <a name="AttributeDefinition.Inherit">func</a> (\*AttributeDefinition) [Inherit](/src/target/definitions.go?s=38140:38249#L1271)
``` go
func (a *AttributeDefinition) Inherit(parent *AttributeDefinition, seen ...map[*AttributeDefinition]struct{})
```
Inherit merges the properties of existing target type attributes with the argument's.
The algorithm is recursive so that child attributes are also merged.




### <a name="AttributeDefinition.IsFile">func</a> (\*AttributeDefinition) [IsFile](/src/target/definitions.go?s=33228:33285#L1078)
``` go
func (a *AttributeDefinition) IsFile(attName string) bool
```
IsFile returns true if the attribute is of type File or if any its children attributes (if any) is.




### <a name="AttributeDefinition.IsInterface">func</a> (\*AttributeDefinition) [IsInterface](/src/target/definitions.go?s=32869:32931#L1066)
``` go
func (a *AttributeDefinition) IsInterface(attName string) bool
```
IsInterface returns true if the field generated for the given attribute has
an interface type that should not be referenced as a "*interface{}" pointer.
The target attribute must be an object.




### <a name="AttributeDefinition.IsNonZero">func</a> (\*AttributeDefinition) [IsNonZero](/src/target/definitions.go?s=31986:32046#L1043)
``` go
func (a *AttributeDefinition) IsNonZero(attName string) bool
```
IsNonZero returns true if the given string matches the name of a non-zero
attribute, false otherwise.




### <a name="AttributeDefinition.IsPrimitivePointer">func</a> (\*AttributeDefinition) [IsPrimitivePointer](/src/target/definitions.go?s=32255:32324#L1049)
``` go
func (a *AttributeDefinition) IsPrimitivePointer(attName string) bool
```
IsPrimitivePointer returns true if the field generated for the given attribute should be a
pointer to a primitive type. The target attribute must be an object.




### <a name="AttributeDefinition.IsReadOnly">func</a> (\*AttributeDefinition) [IsReadOnly](/src/target/definitions.go?s=35294:35341#L1160)
``` go
func (a *AttributeDefinition) IsReadOnly() bool
```
IsReadOnly returns true if attribute is read-only (set using SetReadOnly() method)




### <a name="AttributeDefinition.IsRequired">func</a> (\*AttributeDefinition) [IsRequired](/src/target/definitions.go?s=30255:30316#L980)
``` go
func (a *AttributeDefinition) IsRequired(attName string) bool
```
IsRequired returns true if the given string matches the name of a required
attribute, false otherwise.




### <a name="AttributeDefinition.Merge">func</a> (\*AttributeDefinition) [Merge](/src/target/definitions.go?s=37358:37442#L1243)
``` go
func (a *AttributeDefinition) Merge(other *AttributeDefinition) *AttributeDefinition
```
Merge merges the argument attributes into the target and returns the target overriding existing
attributes with identical names.
This only applies to attributes of type Object and Merge panics if the
argument or the target is not of type Object.




### <a name="AttributeDefinition.SetDefault">func</a> (\*AttributeDefinition) [SetDefault](/src/target/definitions.go?s=30801:30858#L1000)
``` go
func (a *AttributeDefinition) SetDefault(def interface{})
```
SetDefault sets the default for the attribute. It also converts HashVal
and ArrayVal to map and slice respectively.




### <a name="AttributeDefinition.SetExample">func</a> (\*AttributeDefinition) [SetExample](/src/target/definitions.go?s=33625:33691#L1091)
``` go
func (a *AttributeDefinition) SetExample(example interface{}) bool
```
SetExample sets the custom example. SetExample also handles the case when the user doesn't
want any example or any auto-generated example.




### <a name="AttributeDefinition.SetReadOnly">func</a> (\*AttributeDefinition) [SetReadOnly](/src/target/definitions.go?s=35056:35099#L1152)
``` go
func (a *AttributeDefinition) SetReadOnly()
```
SetReadOnly sets the attribute's ReadOnly field as true.




### <a name="AttributeDefinition.Validate">func</a> (\*AttributeDefinition) [Validate](/src/target/validation.go?s=13212:13319#L456)
``` go
func (a *AttributeDefinition) Validate(ctx string, parent dslengine.Definition) *dslengine.ValidationErrors
```
Validate tests whether the attribute definition is consistent: required fields exist.
Since attributes are unaware of their context, additional context information can be provided
to be used in error messages.
The parent definition context is automatically added to error messages.




### <a name="AttributeDefinition.Walk">func</a> (\*AttributeDefinition) [Walk](/src/target/types.go?s=31416:31497#L1025)
``` go
func (a *AttributeDefinition) Walk(walker func(*AttributeDefinition) error) error
```
Walk traverses the data structure recursively and calls the given function once
on each attribute starting with the attribute returned by Definition.




## <a name="AttributeIterator">type</a> [AttributeIterator](/src/target/types.go?s=16460:16523#L532)
``` go
type AttributeIterator func(string, *AttributeDefinition) error
```
AttributeIterator is the type of the function given to IterateAttributes.










## <a name="ByFilePath">type</a> [ByFilePath](/src/target/definitions.go?s=51839:51878#L1796)
``` go
type ByFilePath []*FileServerDefinition
```
ByFilePath makes FileServerDefinition sortable for code generators.










### <a name="ByFilePath.Len">func</a> (ByFilePath) [Len](/src/target/definitions.go?s=51948:51977#L1799)
``` go
func (b ByFilePath) Len() int
```



### <a name="ByFilePath.Less">func</a> (ByFilePath) [Less](/src/target/definitions.go?s=52006:52045#L1800)
``` go
func (b ByFilePath) Less(i, j int) bool
```



### <a name="ByFilePath.Swap">func</a> (ByFilePath) [Swap](/src/target/definitions.go?s=51880:51914#L1798)
``` go
func (b ByFilePath) Swap(i, j int)
```



## <a name="CORSDefinition">type</a> [CORSDefinition](/src/target/definitions.go?s=5372:5878#L150)
``` go
type CORSDefinition struct {
    // Parent API or resource
    Parent dslengine.Definition
    // Origin
    Origin string
    // List of authorized headers, "*" authorizes all
    Headers []string
    // List of authorized HTTP methods
    Methods []string
    // List of headers exposed to clients
    Exposed []string
    // How long to cache a prefligh request response
    MaxAge uint
    // Sets Access-Control-Allow-Credentials header
    Credentials bool
    // Sets Whether the Origin string is a regular expression
    Regexp bool
}

```
CORSDefinition contains the definition for a specific origin CORS policy.










### <a name="CORSDefinition.Context">func</a> (\*CORSDefinition) [Context](/src/target/definitions.go?s=29083:29127#L949)
``` go
func (cors *CORSDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="CORSDefinition.Validate">func</a> (\*CORSDefinition) [Validate](/src/target/validation.go?s=7140:7206#L262)
``` go
func (cors *CORSDefinition) Validate() *dslengine.ValidationErrors
```
Validate makes sure the CORS definition origin is valid.




## <a name="ContactDefinition">type</a> [ContactDefinition](/src/target/definitions.go?s=2917:3204#L83)
``` go
type ContactDefinition struct {
    // Name of the contact person/organization
    Name string `json:"name,omitempty"`
    // Email address of the contact person/organization
    Email string `json:"email,omitempty"`
    // URL pointing to the contact information
    URL string `json:"url,omitempty"`
}

```
ContactDefinition contains the API contact information.










### <a name="ContactDefinition.Context">func</a> (\*ContactDefinition) [Context](/src/target/definitions.go?s=40374:40418#L1356)
``` go
func (c *ContactDefinition) Context() string
```
Context returns the generic definition name used in error messages.




## <a name="ContainerDefinition">type</a> [ContainerDefinition](/src/target/definitions.go?s=12183:12320#L342)
``` go
type ContainerDefinition interface {
    // Attribute returns the container definition embedded attribute.
    Attribute() *AttributeDefinition
}
```
ContainerDefinition defines a generic container definition that contains attributes.
This makes it possible for plugins to use attributes in their own data structures.










## <a name="DataStructure">type</a> [DataStructure](/src/target/types.go?s=3084:3614#L75)
``` go
type DataStructure interface {
    // Definition returns the data structure definition.
    Definition() *AttributeDefinition
    // Walk traverses the data structure recursively and calls the given function once
    // on each attribute starting with the attribute returned by Definition.
    // User type and media type attributes are traversed once even for recursive
    // definitions to avoid infinite recursion.
    // Walk stops and returns the error if the function returns a non-nil error.
    Walk(func(*AttributeDefinition) error) error
}
```
DataStructure is the interface implemented by all data structure types.
That is attribute definitions, user types and media types.










## <a name="DataType">type</a> [DataType](/src/target/types.go?s=1209:2942#L34)
``` go
type DataType interface {
    // Kind of data type, one of the Kind enum.
    Kind() Kind
    // Name returns the type name.
    Name() string
    // IsPrimitive returns true if the underlying type is one of the primitive types.
    IsPrimitive() bool
    // HasAttributes returns true if the underlying type has any attributes.
    HasAttributes() bool
    // IsObject returns true if the underlying type is an object, a user type which
    // is an object or a media type whose type is an object.
    IsObject() bool
    // IsArray returns true if the underlying type is an array, a user type which
    // is an array or a media type whose type is an array.
    IsArray() bool
    // IsHash returns true if the underlying type is a hash map, a user type which
    // is a hash map or a media type whose type is a hash map.
    IsHash() bool
    // ToObject returns the underlying object if any (i.e. if IsObject returns true),
    // nil otherwise.
    ToObject() Object
    // ToArray returns the underlying array if any (i.e. if IsArray returns true),
    // nil otherwise.
    ToArray() *Array
    // ToHash returns the underlying hash map if any (i.e. if IsHash returns true),
    // nil otherwise.
    ToHash() *Hash
    // CanHaveDefault returns whether the data type can have a default value.
    CanHaveDefault() bool
    // IsCompatible checks whether val has a Go type that is
    // compatible with the data type.
    IsCompatible(val interface{}) bool
    // GenerateExample returns a random value for the given data type.
    // If the data type has validations then the example value validates them.
    // seen keeps track of the user and media types that have been traversed via
    // recursion to prevent infinite loops.
    GenerateExample(r *RandomGenerator, seen []string) interface{}
}
```
DataType is the common interface to all types.







### <a name="Dup">func</a> [Dup](/src/target/dup.go?s=104:133#L6)
``` go
func Dup(d DataType) DataType
```
Dup creates a copy the given data type.





## <a name="DocsDefinition">type</a> [DocsDefinition](/src/target/definitions.go?s=3513:3689#L101)
``` go
type DocsDefinition struct {
    // Description of documentation.
    Description string `json:"description,omitempty"`
    // URL to documentation.
    URL string `json:"url,omitempty"`
}

```
DocsDefinition points to external documentation.










### <a name="DocsDefinition.Context">func</a> (\*DocsDefinition) [Context](/src/target/definitions.go?s=40798:40839#L1372)
``` go
func (d *DocsDefinition) Context() string
```
Context returns the generic definition name used in error messages.




## <a name="EncodingDefinition">type</a> [EncodingDefinition](/src/target/definitions.go?s=5945:6689#L170)
``` go
type EncodingDefinition struct {
    // MIMETypes is the set of possible MIME types for the content being encoded or decoded.
    MIMETypes []string
    // PackagePath is the path to the Go package that implements the encoder/decoder.
    // The package must expose a `EncoderFactory` or `DecoderFactory` function
    // that the generated code calls. The methods must return objects that implement
    // the goa.EncoderFactory or goa.DecoderFactory interface respectively.
    PackagePath string
    // Function is the name of the Go function used to instantiate the encoder/decoder.
    // Defaults to NewEncoder and NewDecoder respecitively.
    Function string
    // Encoder is true if the definition is for a encoder, false if it's for a decoder.
    Encoder bool
}

```
EncodingDefinition defines an encoder supported by the API.










### <a name="EncodingDefinition.Context">func</a> (\*EncodingDefinition) [Context](/src/target/definitions.go?s=29301:29348#L954)
``` go
func (enc *EncodingDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="EncodingDefinition.Validate">func</a> (\*EncodingDefinition) [Validate](/src/target/validation.go?s=7633:7702#L277)
``` go
func (enc *EncodingDefinition) Validate() *dslengine.ValidationErrors
```
Validate validates the encoding MIME type and Go package path if set.




## <a name="FileServerDefinition">type</a> [FileServerDefinition](/src/target/definitions.go?s=9358:9892#L259)
``` go
type FileServerDefinition struct {
    // Parent resource
    Parent *ResourceDefinition
    // Description for docs
    Description string
    // Docs points to the API external documentation
    Docs *DocsDefinition
    // FilePath is the file path to the static asset(s)
    FilePath string
    // RequestPath is the HTTP path that servers the assets.
    RequestPath string
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Security defines security requirements for the file server.
    Security *SecurityDefinition
}

```
FileServerDefinition defines an endpoint that servers static assets.










### <a name="FileServerDefinition.Context">func</a> (\*FileServerDefinition) [Context](/src/target/definitions.go?s=50852:50899#L1763)
``` go
func (f *FileServerDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="FileServerDefinition.Finalize">func</a> (\*FileServerDefinition) [Finalize](/src/target/definitions.go?s=51133:51174#L1773)
``` go
func (f *FileServerDefinition) Finalize()
```
Finalize inherits security scheme from parent and top level design.




### <a name="FileServerDefinition.IsDir">func</a> (\*FileServerDefinition) [IsDir](/src/target/definitions.go?s=51670:51713#L1791)
``` go
func (f *FileServerDefinition) IsDir() bool
```
IsDir returns true if the file server serves a directory, false otherwise.




### <a name="FileServerDefinition.Validate">func</a> (\*FileServerDefinition) [Validate](/src/target/validation.go?s=10719:10788#L377)
``` go
func (f *FileServerDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks the file server is properly initialized.




## <a name="FileServerIterator">type</a> [FileServerIterator](/src/target/definitions.go?s=12900:12954#L360)
``` go
type FileServerIterator func(f *FileServerDefinition) error
```
FileServerIterator is the type of functions given to IterateFileServers.










## <a name="Hash">type</a> [Hash](/src/target/types.go?s=4024:4104#L101)
``` go
type Hash struct {
    KeyType  *AttributeDefinition
    ElemType *AttributeDefinition
}

```
Hash is the type for a hash map.










### <a name="Hash.CanHaveDefault">func</a> (\*Hash) [CanHaveDefault](/src/target/types.go?s=14986:15022#L490)
``` go
func (h *Hash) CanHaveDefault() bool
```
CanHaveDefault returns true if the hash type can have a default value.
The hash type can have a default value only if both the key type and
the element type can have a default value.




### <a name="Hash.GenerateExample">func</a> (\*Hash) [GenerateExample](/src/target/types.go?s=15655:15732#L512)
``` go
func (h *Hash) GenerateExample(r *RandomGenerator, seen []string) interface{}
```
GenerateExample returns a random hash value.




### <a name="Hash.HasAttributes">func</a> (\*Hash) [HasAttributes](/src/target/types.go?s=14226:14261#L465)
``` go
func (h *Hash) HasAttributes() bool
```
HasAttributes returns true if the either hash's key type is user defined
or the element type is user defined.




### <a name="Hash.IsArray">func</a> (\*Hash) [IsArray](/src/target/types.go?s=14443:14472#L473)
``` go
func (h *Hash) IsArray() bool
```
IsArray returns false.




### <a name="Hash.IsCompatible">func</a> (\*Hash) [IsCompatible](/src/target/types.go?s=15162:15211#L495)
``` go
func (h *Hash) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.




### <a name="Hash.IsHash">func</a> (\*Hash) [IsHash](/src/target/types.go?s=14515:14543#L476)
``` go
func (h *Hash) IsHash() bool
```
IsHash returns true.




### <a name="Hash.IsObject">func</a> (\*Hash) [IsObject](/src/target/types.go?s=14368:14398#L470)
``` go
func (h *Hash) IsObject() bool
```
IsObject returns false.




### <a name="Hash.IsPrimitive">func</a> (\*Hash) [IsPrimitive](/src/target/types.go?s=14058:14091#L461)
``` go
func (h *Hash) IsPrimitive() bool
```
IsPrimitive returns false.




### <a name="Hash.Kind">func</a> (\*Hash) [Kind](/src/target/types.go?s=13901:13927#L455)
``` go
func (h *Hash) Kind() Kind
```
Kind implements DataKind.




### <a name="Hash.MakeMap">func</a> (\*Hash) [MakeMap](/src/target/types.go?s=16147:16212#L523)
``` go
func (h *Hash) MakeMap(m map[interface{}]interface{}) interface{}
```
MakeMap examines the key type from a Hash and create a map with builtin type if possible.
The idea is to avoid generating map[interface{}]interface{}, which cannot be handled by json.Marshal.




### <a name="Hash.Name">func</a> (\*Hash) [Name](/src/target/types.go?s=13980:14008#L458)
``` go
func (h *Hash) Name() string
```
Name returns the type name.




### <a name="Hash.ToArray">func</a> (\*Hash) [ToArray](/src/target/types.go?s=14659:14690#L482)
``` go
func (h *Hash) ToArray() *Array
```
ToArray returns nil.




### <a name="Hash.ToHash">func</a> (\*Hash) [ToHash](/src/target/types.go?s=14750:14779#L485)
``` go
func (h *Hash) ToHash() *Hash
```
ToHash returns the underlying hash map.




### <a name="Hash.ToObject">func</a> (\*Hash) [ToObject](/src/target/types.go?s=14586:14618#L479)
``` go
func (h *Hash) ToObject() Object
```
ToObject returns nil.




## <a name="HashVal">type</a> [HashVal](/src/target/types.go?s=4177:4212#L107)
``` go
type HashVal map[interface{}]interface{}
```
HashVal is the value of a hash used to specify the default value.










### <a name="HashVal.ToMap">func</a> (HashVal) [ToMap](/src/target/types.go?s=19653:19705#L662)
``` go
func (h HashVal) ToMap() map[interface{}]interface{}
```
ToMap converts a HashVal to a map.




## <a name="HeaderIterator">type</a> [HeaderIterator](/src/target/definitions.go?s=13026:13105#L363)
``` go
type HeaderIterator func(name string, isRequired bool, h *AttributeDefinition) error
```
HeaderIterator is the type of functions given to IterateHeaders.










## <a name="Kind">type</a> [Kind](/src/target/types.go?s=1146:1155#L31)
``` go
type Kind uint
```
A Kind defines the JSON type that a DataType represents.


``` go
const (
    // BooleanKind represents a JSON bool.
    BooleanKind Kind = iota + 1
    // IntegerKind represents a JSON integer.
    IntegerKind
    // NumberKind represents a JSON number including integers.
    NumberKind
    // StringKind represents a JSON string.
    StringKind
    // DateTimeKind represents a JSON string that is parsed as a Go time.Time
    DateTimeKind
    // UUIDKind represents a JSON string that is parsed as a Go uuid.UUID
    UUIDKind
    // AnyKind represents a generic interface{}.
    AnyKind
    // ArrayKind represents a JSON array.
    ArrayKind
    // ObjectKind represents a JSON object.
    ObjectKind
    // HashKind represents a JSON object where the keys are not known in advance.
    HashKind
    // UserTypeKind represents a user type.
    UserTypeKind
    // MediaTypeKind represents a media type.
    MediaTypeKind
    // FileKind represents a file.
    FileKind
)
```









## <a name="LicenseDefinition">type</a> [LicenseDefinition](/src/target/definitions.go?s=3275:3457#L93)
``` go
type LicenseDefinition struct {
    // Name of license used for the API
    Name string `json:"name,omitempty"`
    // URL to the license used for the API
    URL string `json:"url,omitempty"`
}

```
LicenseDefinition contains the license information for the API.










### <a name="LicenseDefinition.Context">func</a> (\*LicenseDefinition) [Context](/src/target/definitions.go?s=40586:40630#L1364)
``` go
func (l *LicenseDefinition) Context() string
```
Context returns the generic definition name used in error messages.




## <a name="LinkDefinition">type</a> [LinkDefinition](/src/target/definitions.go?s=9983:10234#L277)
``` go
type LinkDefinition struct {
    // Link name
    Name string
    // View used to render link if not "link"
    View string
    // URITemplate is the RFC6570 URI template of the link Href.
    URITemplate string

    // Parent media Type
    Parent *MediaTypeDefinition
}

```
LinkDefinition defines a media type link, it specifies a URL to a related resource.










### <a name="LinkDefinition.Attribute">func</a> (\*LinkDefinition) [Attribute](/src/target/definitions.go?s=52479:52536#L1817)
``` go
func (l *LinkDefinition) Attribute() *AttributeDefinition
```
Attribute returns the linked attribute.




### <a name="LinkDefinition.Context">func</a> (\*LinkDefinition) [Context](/src/target/definitions.go?s=52159:52200#L1803)
``` go
func (l *LinkDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="LinkDefinition.MediaType">func</a> (\*LinkDefinition) [MediaType](/src/target/definitions.go?s=52694:52751#L1828)
``` go
func (l *LinkDefinition) MediaType() *MediaTypeDefinition
```
MediaType returns the media type of the linked attribute.




### <a name="LinkDefinition.Validate">func</a> (\*LinkDefinition) [Validate](/src/target/validation.go?s=17663:17726#L604)
``` go
func (l *LinkDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the link definition is consistent: it has a media type or the name of an
attribute part of the parent media type.




## <a name="MediaTypeDefinition">type</a> [MediaTypeDefinition](/src/target/types.go?s=4906:5476#L124)
``` go
type MediaTypeDefinition struct {
    // A media type is a type
    *UserTypeDefinition
    // Identifier is the RFC 6838 media type identifier.
    Identifier string
    // ContentType identifies the value written to the response "Content-Type" header.
    // Defaults to Identifier.
    ContentType string
    // Links list the rendered links indexed by name.
    Links map[string]*LinkDefinition
    // Views list the supported views indexed by name.
    Views map[string]*ViewDefinition
    // Resource this media type is the canonical representation for if any
    Resource *ResourceDefinition
}

```
MediaTypeDefinition describes the rendering of a resource using property and link
definitions. A property corresponds to a single member of the media type,
it has a name and a type as well as optional validation rules. A link has a
name and a URL that points to a related resource.
Media types also define views which describe which members and links to render when
building the response body for the corresponding view.







### <a name="NewMediaTypeDefinition">func</a> [NewMediaTypeDefinition](/src/target/types.go?s=22334:22419#L737)
``` go
func NewMediaTypeDefinition(name, identifier string, dsl func()) *MediaTypeDefinition
```
NewMediaTypeDefinition creates a media type definition but does not
execute the DSL.





### <a name="MediaTypeDefinition.ComputeViews">func</a> (\*MediaTypeDefinition) [ComputeViews](/src/target/types.go?s=23198:23269#L762)
``` go
func (m *MediaTypeDefinition) ComputeViews() map[string]*ViewDefinition
```
ComputeViews returns the media type views recursing as necessary if the media type is a
collection.




### <a name="MediaTypeDefinition.Finalize">func</a> (\*MediaTypeDefinition) [Finalize](/src/target/types.go?s=23523:23563#L775)
``` go
func (m *MediaTypeDefinition) Finalize()
```
Finalize sets the value of ContentType to the identifier if not set.




### <a name="MediaTypeDefinition.IsError">func</a> (\*MediaTypeDefinition) [IsError](/src/target/types.go?s=22810:22854#L751)
``` go
func (m *MediaTypeDefinition) IsError() bool
```
IsError returns true if the media type is implemented via a goa struct.




### <a name="MediaTypeDefinition.IterateViews">func</a> (\*MediaTypeDefinition) [IterateViews](/src/target/types.go?s=23977:24042#L788)
``` go
func (m *MediaTypeDefinition) IterateViews(it ViewIterator) error
```
IterateViews calls the given iterator passing in each attribute sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateViews returns that
error.




### <a name="MediaTypeDefinition.Kind">func</a> (\*MediaTypeDefinition) [Kind](/src/target/types.go?s=22667:22708#L748)
``` go
func (m *MediaTypeDefinition) Kind() Kind
```
Kind implements DataKind.




### <a name="MediaTypeDefinition.Project">func</a> (\*MediaTypeDefinition) [Project](/src/target/types.go?s=24696:24797#L811)
``` go
func (m *MediaTypeDefinition) Project(view string) (*MediaTypeDefinition, *UserTypeDefinition, error)
```
Project creates a MediaTypeDefinition containing the fields defined in the given view.  The
resuling media type only defines the default view and its identifier is modified to indicate that
it was projected by adding the view as id parameter.  links is a user type of type Object where
each key corresponds to a linked media type as defined by the media type "links" attribute.




### <a name="MediaTypeDefinition.Validate">func</a> (\*MediaTypeDefinition) [Validate](/src/target/validation.go?s=15959:16027#L547)
``` go
func (m *MediaTypeDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the media type definition is consistent: its identifier is a valid media
type identifier.




## <a name="MediaTypeIterator">type</a> [MediaTypeIterator](/src/target/definitions.go?s=12524:12576#L351)
``` go
type MediaTypeIterator func(m *MediaTypeDefinition) error
```
MediaTypeIterator is the type of functions given to IterateMediaTypes.










## <a name="MediaTypeRoot">type</a> [MediaTypeRoot](/src/target/api.go?s=288:338#L14)
``` go
type MediaTypeRoot map[string]*MediaTypeDefinition
```
MediaTypeRoot is the data structure that represents the additional DSL definition root
that contains the media type definition set created by CollectionOf index by canonical id.










### <a name="MediaTypeRoot.DSLName">func</a> (MediaTypeRoot) [DSLName](/src/target/api.go?s=8879:8918#L236)
``` go
func (r MediaTypeRoot) DSLName() string
```
DSLName is displayed to the user when the DSL executes.




### <a name="MediaTypeRoot.DependsOn">func</a> (MediaTypeRoot) [DependsOn](/src/target/api.go?s=9057:9108#L241)
``` go
func (r MediaTypeRoot) DependsOn() []dslengine.Root
```
DependsOn return the DSL roots the generated media types DSL root depends on, that's the API DSL.




### <a name="MediaTypeRoot.IterateSets">func</a> (MediaTypeRoot) [IterateSets](/src/target/api.go?s=9221:9287#L246)
``` go
func (r MediaTypeRoot) IterateSets(iterator dslengine.SetIterator)
```
IterateSets iterates over the one generated media type definition set.




### <a name="MediaTypeRoot.Reset">func</a> (MediaTypeRoot) [Reset](/src/target/api.go?s=9699:9729#L264)
``` go
func (r MediaTypeRoot) Reset()
```
Reset deletes all the keys.




## <a name="Object">type</a> [Object](/src/target/types.go?s=3946:3984#L98)
``` go
type Object map[string]*AttributeDefinition
```
Object is the type for a JSON object.










### <a name="Object.CanHaveDefault">func</a> (Object) [CanHaveDefault](/src/target/types.go?s=13018:13055#L422)
``` go
func (o Object) CanHaveDefault() bool
```
CanHaveDefault returns false.




### <a name="Object.GenerateExample">func</a> (Object) [GenerateExample](/src/target/types.go?s=13521:13599#L438)
``` go
func (o Object) GenerateExample(r *RandomGenerator, seen []string) interface{}
```
GenerateExample returns a random value of the object.




### <a name="Object.HasAttributes">func</a> (Object) [HasAttributes](/src/target/types.go?s=12474:12510#L401)
``` go
func (o Object) HasAttributes() bool
```
HasAttributes returns true.




### <a name="Object.IsArray">func</a> (Object) [IsArray](/src/target/types.go?s=12629:12659#L407)
``` go
func (o Object) IsArray() bool
```
IsArray returns false.




### <a name="Object.IsCompatible">func</a> (Object) [IsCompatible](/src/target/types.go?s=13327:13377#L432)
``` go
func (o Object) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.




### <a name="Object.IsHash">func</a> (Object) [IsHash](/src/target/types.go?s=12703:12732#L410)
``` go
func (o Object) IsHash() bool
```
IsHash returns false.




### <a name="Object.IsObject">func</a> (Object) [IsObject](/src/target/types.go?s=12554:12585#L404)
``` go
func (o Object) IsObject() bool
```
IsObject returns true.




### <a name="Object.IsPrimitive">func</a> (Object) [IsPrimitive](/src/target/types.go?s=12390:12424#L398)
``` go
func (o Object) IsPrimitive() bool
```
IsPrimitive returns false.




### <a name="Object.IterateAttributes">func</a> (Object) [IterateAttributes](/src/target/types.go?s=16732:16793#L537)
``` go
func (o Object) IterateAttributes(it AttributeIterator) error
```
IterateAttributes calls the given iterator passing in each attribute sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateObject returns that
error.




### <a name="Object.Kind">func</a> (Object) [Kind](/src/target/types.go?s=12227:12254#L392)
``` go
func (o Object) Kind() Kind
```
Kind implements DataKind.




### <a name="Object.Merge">func</a> (Object) [Merge](/src/target/types.go?s=13175:13210#L425)
``` go
func (o Object) Merge(other Object)
```
Merge copies other's attributes into o overridding any pre-existing attribute with the same name.




### <a name="Object.Name">func</a> (Object) [Name](/src/target/types.go?s=12309:12338#L395)
``` go
func (o Object) Name() string
```
Name returns the type name.




### <a name="Object.ToArray">func</a> (Object) [ToArray](/src/target/types.go?s=12866:12898#L416)
``` go
func (o Object) ToArray() *Array
```
ToArray returns nil.




### <a name="Object.ToHash">func</a> (Object) [ToHash](/src/target/types.go?s=12938:12968#L419)
``` go
func (o Object) ToHash() *Hash
```
ToHash returns nil.




### <a name="Object.ToObject">func</a> (Object) [ToObject](/src/target/types.go?s=12794:12827#L413)
``` go
func (o Object) ToObject() Object
```
ToObject returns the underlying object.




## <a name="Primitive">type</a> [Primitive](/src/target/types.go?s=3697:3711#L87)
``` go
type Primitive Kind
```
Primitive is the type for null, boolean, integer, number, string, and time.










### <a name="Primitive.CanHaveDefault">func</a> (Primitive) [CanHaveDefault](/src/target/types.go?s=8351:8396#L248)
``` go
func (p Primitive) CanHaveDefault() (ok bool)
```
CanHaveDefault returns whether the primitive can have a default value.




### <a name="Primitive.GenerateExample">func</a> (Primitive) [GenerateExample](/src/target/types.go?s=9388:9469#L290)
``` go
func (p Primitive) GenerateExample(r *RandomGenerator, seen []string) interface{}
```
GenerateExample returns an instance of the given data type.




### <a name="Primitive.HasAttributes">func</a> (Primitive) [HasAttributes](/src/target/types.go?s=7758:7797#L227)
``` go
func (p Primitive) HasAttributes() bool
```
HasAttributes returns false.




### <a name="Primitive.IsArray">func</a> (Primitive) [IsArray](/src/target/types.go?s=7922:7955#L233)
``` go
func (p Primitive) IsArray() bool
```
IsArray returns false.




### <a name="Primitive.IsCompatible">func</a> (Primitive) [IsCompatible](/src/target/types.go?s=8545:8598#L257)
``` go
func (p Primitive) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.




### <a name="Primitive.IsHash">func</a> (Primitive) [IsHash](/src/target/types.go?s=7999:8031#L236)
``` go
func (p Primitive) IsHash() bool
```
IsHash returns false.




### <a name="Primitive.IsObject">func</a> (Primitive) [IsObject](/src/target/types.go?s=7843:7877#L230)
``` go
func (p Primitive) IsObject() bool
```
IsObject returns false.




### <a name="Primitive.IsPrimitive">func</a> (Primitive) [IsPrimitive](/src/target/types.go?s=7671:7708#L224)
``` go
func (p Primitive) IsPrimitive() bool
```
IsPrimitive returns true.




### <a name="Primitive.Kind">func</a> (Primitive) [Kind](/src/target/types.go?s=7249:7279#L201)
``` go
func (p Primitive) Kind() Kind
```
Kind implements DataKind.




### <a name="Primitive.Name">func</a> (Primitive) [Name](/src/target/types.go?s=7336:7368#L204)
``` go
func (p Primitive) Name() string
```
Name returns the JSON type name.




### <a name="Primitive.ToArray">func</a> (Primitive) [ToArray](/src/target/types.go?s=8152:8187#L242)
``` go
func (p Primitive) ToArray() *Array
```
ToArray returns nil.




### <a name="Primitive.ToHash">func</a> (Primitive) [ToHash](/src/target/types.go?s=8227:8260#L245)
``` go
func (p Primitive) ToHash() *Hash
```
ToHash returns nil.




### <a name="Primitive.ToObject">func</a> (Primitive) [ToObject](/src/target/types.go?s=8075:8111#L239)
``` go
func (p Primitive) ToObject() Object
```
ToObject returns nil.




## <a name="RandomGenerator">type</a> [RandomGenerator](/src/target/random.go?s=339:422#L17)
``` go
type RandomGenerator struct {
    Seed string
    // contains filtered or unexported fields
}

```
RandomGenerator generates consistent random values of different types given a seed.
The random values are consistent in that given the same seed the same random values get
generated.







### <a name="NewRandomGenerator">func</a> [NewRandomGenerator](/src/target/random.go?s=515:568#L24)
``` go
func NewRandomGenerator(seed string) *RandomGenerator
```
NewRandomGenerator returns a random value generator seeded from the given string value.





### <a name="RandomGenerator.Bool">func</a> (\*RandomGenerator) [Bool](/src/target/random.go?s=1591:1628#L68)
``` go
func (r *RandomGenerator) Bool() bool
```
Bool produces a random boolean.




### <a name="RandomGenerator.DateTime">func</a> (\*RandomGenerator) [DateTime](/src/target/random.go?s=1155:1201#L54)
``` go
func (r *RandomGenerator) DateTime() time.Time
```
DateTime produces a random date.




### <a name="RandomGenerator.File">func</a> (\*RandomGenerator) [File](/src/target/random.go?s=1812:1851#L78)
``` go
func (r *RandomGenerator) File() string
```
File produces a random file.




### <a name="RandomGenerator.Float64">func</a> (\*RandomGenerator) [Float64](/src/target/random.go?s=1706:1749#L73)
``` go
func (r *RandomGenerator) Float64() float64
```
Float64 produces a random float64 value.




### <a name="RandomGenerator.Int">func</a> (\*RandomGenerator) [Int](/src/target/random.go?s=938:973#L43)
``` go
func (r *RandomGenerator) Int() int
```
Int produces a random integer.




### <a name="RandomGenerator.String">func</a> (\*RandomGenerator) [String](/src/target/random.go?s=1036:1077#L48)
``` go
func (r *RandomGenerator) String() string
```
String produces a random string.




### <a name="RandomGenerator.UUID">func</a> (\*RandomGenerator) [UUID](/src/target/random.go?s=1476:1518#L63)
``` go
func (r *RandomGenerator) UUID() uuid.UUID
```
UUID produces a random UUID.




## <a name="ResourceDefinition">type</a> [ResourceDefinition](/src/target/definitions.go?s=3844:5291#L111)
``` go
type ResourceDefinition struct {
    // Resource name
    Name string
    // Schemes is the supported API URL schemes
    Schemes []string
    // Common URL prefix to all resource action HTTP requests
    BasePath string
    // Path and query string parameters that apply to all actions.
    Params *AttributeDefinition
    // Name of parent resource if any
    ParentName string
    // Optional description
    Description string
    // Default media type, describes the resource attributes
    MediaType string
    // Default view name if default media type is MediaTypeDefinition
    DefaultViewName string
    // Exposed resource actions indexed by name
    Actions map[string]*ActionDefinition
    // FileServers is the list of static asset serving endpoints
    FileServers []*FileServerDefinition
    // Action with canonical resource path
    CanonicalActionName string
    // Map of response definitions that apply to all actions indexed by name.
    Responses map[string]*ResponseDefinition
    // Request headers that apply to all actions.
    Headers *AttributeDefinition
    // Origins defines the CORS policies that apply to this resource.
    Origins map[string]*CORSDefinition
    // DSLFunc contains the DSL used to create this definition if any.
    DSLFunc func()
    // metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Security defines security requirements for the Resource,
    // for actions that don't define one themselves.
    Security *SecurityDefinition
}

```
ResourceDefinition describes a REST resource.
It defines both a media type and a set of actions that can be executed through HTTP
requests.







### <a name="NewResourceDefinition">func</a> [NewResourceDefinition](/src/target/definitions.go?s=22392:22463#L702)
``` go
func NewResourceDefinition(name string, dsl func()) *ResourceDefinition
```
NewResourceDefinition creates a resource definition but does not
execute the DSL.





### <a name="ResourceDefinition.AllOrigins">func</a> (\*ResourceDefinition) [AllOrigins](/src/target/definitions.go?s=26176:26235#L827)
``` go
func (r *ResourceDefinition) AllOrigins() []*CORSDefinition
```
AllOrigins compute all CORS policies for the resource taking into account any API policy.
The result is sorted alphabetically by policy origin.




### <a name="ResourceDefinition.CanonicalAction">func</a> (\*ResourceDefinition) [CanonicalAction](/src/target/definitions.go?s=24543:24607#L773)
``` go
func (r *ResourceDefinition) CanonicalAction() *ActionDefinition
```
CanonicalAction returns the canonical action of the resource if any.
The canonical action is used to compute hrefs to resources.




### <a name="ResourceDefinition.Context">func</a> (\*ResourceDefinition) [Context](/src/target/definitions.go?s=22636:22681#L711)
``` go
func (r *ResourceDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="ResourceDefinition.DSL">func</a> (\*ResourceDefinition) [DSL](/src/target/definitions.go?s=27375:27416#L889)
``` go
func (r *ResourceDefinition) DSL() func()
```
DSL returns the initialization DSL.




### <a name="ResourceDefinition.Finalize">func</a> (\*ResourceDefinition) [Finalize](/src/target/definitions.go?s=27678:27717#L896)
``` go
func (r *ResourceDefinition) Finalize()
```
Finalize is run post DSL execution. It merges response definitions, creates implicit action
parameters, initializes querystring parameters, sets path parameters as non zero attributes
and sets the fallbacks for security schemes.




### <a name="ResourceDefinition.FullPath">func</a> (\*ResourceDefinition) [FullPath](/src/target/definitions.go?s=25200:25246#L795)
``` go
func (r *ResourceDefinition) FullPath() string
```
FullPath computes the base path to the resource actions concatenating the API and parent resource
base paths as needed.




### <a name="ResourceDefinition.IterateActions">func</a> (\*ResourceDefinition) [IterateActions](/src/target/definitions.go?s=23339:23407#L735)
``` go
func (r *ResourceDefinition) IterateActions(it ActionIterator) error
```
IterateActions calls the given iterator passing in each resource action sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateActions returns that
error.




### <a name="ResourceDefinition.IterateFileServers">func</a> (\*ResourceDefinition) [IterateFileServers](/src/target/definitions.go?s=23850:23926#L754)
``` go
func (r *ResourceDefinition) IterateFileServers(it FileServerIterator) error
```
IterateFileServers calls the given iterator passing each resource file server sorted by file
path. Iteration stops if an iterator returns an error and in this case IterateFileServers returns
that error.




### <a name="ResourceDefinition.IterateHeaders">func</a> (\*ResourceDefinition) [IterateHeaders](/src/target/definitions.go?s=24274:24342#L767)
``` go
func (r *ResourceDefinition) IterateHeaders(it HeaderIterator) error
```
IterateHeaders calls the given iterator passing in each response sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateHeaders returns that
error.




### <a name="ResourceDefinition.Parent">func</a> (\*ResourceDefinition) [Parent](/src/target/definitions.go?s=25846:25903#L816)
``` go
func (r *ResourceDefinition) Parent() *ResourceDefinition
```
Parent returns the parent resource if any, nil otherwise.




### <a name="ResourceDefinition.PathParams">func</a> (\*ResourceDefinition) [PathParams](/src/target/definitions.go?s=22834:22896#L719)
``` go
func (r *ResourceDefinition) PathParams() *AttributeDefinition
```
PathParams returns the base path parameters of r.




### <a name="ResourceDefinition.PreflightPaths">func</a> (\*ResourceDefinition) [PreflightPaths](/src/target/definitions.go?s=26671:26725#L850)
``` go
func (r *ResourceDefinition) PreflightPaths() []string
```
PreflightPaths returns the paths that should handle OPTIONS requests.




### <a name="ResourceDefinition.URITemplate">func</a> (\*ResourceDefinition) [URITemplate](/src/target/definitions.go?s=24906:24955#L785)
``` go
func (r *ResourceDefinition) URITemplate() string
```
URITemplate returns a URI template to this resource.
The result is the empty string if the resource does not have a "show" action
and does not define a different canonical action.




### <a name="ResourceDefinition.UserTypes">func</a> (\*ResourceDefinition) [UserTypes](/src/target/definitions.go?s=28278:28349#L919)
``` go
func (r *ResourceDefinition) UserTypes() map[string]*UserTypeDefinition
```
UserTypes returns all the user types used by the resource action payloads and parameters.




### <a name="ResourceDefinition.Validate">func</a> (\*ResourceDefinition) [Validate](/src/target/validation.go?s=5843:5910#L213)
``` go
func (r *ResourceDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the resource definition is consistent: action names are valid and each action is
valid.




## <a name="ResourceIterator">type</a> [ResourceIterator](/src/target/definitions.go?s=12396:12446#L348)
``` go
type ResourceIterator func(r *ResourceDefinition) error
```
ResourceIterator is the type of functions given to IterateResources.










## <a name="ResponseDefinition">type</a> [ResponseDefinition](/src/target/definitions.go?s=6777:7408#L186)
``` go
type ResponseDefinition struct {
    // Response name
    Name string
    // HTTP status
    Status int
    // Response description
    Description string
    // Response body type if any
    Type DataType
    // Response body media type if any
    MediaType string
    // Response view name if MediaType is MediaTypeDefinition
    ViewName string
    // Response header definitions
    Headers *AttributeDefinition
    // Parent action or resource
    Parent dslengine.Definition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Standard is true if the response definition comes from the goa default responses
    Standard bool
}

```
ResponseDefinition defines a HTTP response status and optional validation rules.










### <a name="ResponseDefinition.Context">func</a> (\*ResponseDefinition) [Context](/src/target/definitions.go?s=41293:41338#L1390)
``` go
func (r *ResponseDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="ResponseDefinition.Dup">func</a> (\*ResponseDefinition) [Dup](/src/target/definitions.go?s=41994:42048#L1420)
``` go
func (r *ResponseDefinition) Dup() *ResponseDefinition
```
Dup returns a copy of the response definition.




### <a name="ResponseDefinition.Finalize">func</a> (\*ResponseDefinition) [Finalize](/src/target/definitions.go?s=41708:41747#L1405)
``` go
func (r *ResponseDefinition) Finalize()
```
Finalize sets the response media type from its type if the type is a media type and no media
type is already specified.




### <a name="ResponseDefinition.Merge">func</a> (\*ResponseDefinition) [Merge](/src/target/definitions.go?s=42389:42450#L1435)
``` go
func (r *ResponseDefinition) Merge(other *ResponseDefinition)
```
Merge merges other into target. Only the fields of target that are not already set are merged.




### <a name="ResponseDefinition.Validate">func</a> (\*ResponseDefinition) [Validate](/src/target/validation.go?s=14829:14896#L514)
``` go
func (r *ResponseDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the response definition is consistent: its status is set and the media
type definition if any is valid.




## <a name="ResponseIterator">type</a> [ResponseIterator](/src/target/definitions.go?s=13181:13231#L366)
``` go
type ResponseIterator func(r *ResponseDefinition) error
```
ResponseIterator is the type of functions given to IterateResponses.










## <a name="ResponseTemplateDefinition">type</a> [ResponseTemplateDefinition](/src/target/definitions.go?s=7590:7756#L212)
``` go
type ResponseTemplateDefinition struct {
    // Response template name
    Name string
    // Response template function
    Template func(params ...string) *ResponseDefinition
}

```
ResponseTemplateDefinition defines a response template.
A response template is a function that takes an arbitrary number
of strings and returns a response definition.










### <a name="ResponseTemplateDefinition.Context">func</a> (\*ResponseTemplateDefinition) [Context](/src/target/definitions.go?s=43140:43193#L1469)
``` go
func (r *ResponseTemplateDefinition) Context() string
```
Context returns the generic definition name used in error messages.




## <a name="RouteDefinition">type</a> [RouteDefinition](/src/target/definitions.go?s=10746:11059#L303)
``` go
type RouteDefinition struct {
    // Verb is the HTTP method, e.g. "GET", "POST", etc.
    Verb string
    // Path is the URL path e.g. "/tasks/:id"
    Path string
    // Parent is the action this route applies to.
    Parent *ActionDefinition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
}

```
RouteDefinition represents an action route.










### <a name="RouteDefinition.Context">func</a> (\*RouteDefinition) [Context](/src/target/definitions.go?s=53251:53293#L1849)
``` go
func (r *RouteDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="RouteDefinition.FullPath">func</a> (\*RouteDefinition) [FullPath](/src/target/definitions.go?s=53720:53763#L1861)
``` go
func (r *RouteDefinition) FullPath() string
```
FullPath returns the action full path computed by concatenating the API and resource base paths
with the action specific path.




### <a name="RouteDefinition.IsAbsolute">func</a> (\*RouteDefinition) [IsAbsolute](/src/target/definitions.go?s=54256:54299#L1881)
``` go
func (r *RouteDefinition) IsAbsolute() bool
```
IsAbsolute returns true if the action path should not be concatenated to the resource and API
base paths.




### <a name="RouteDefinition.Params">func</a> (\*RouteDefinition) [Params](/src/target/definitions.go?s=53499:53542#L1855)
``` go
func (r *RouteDefinition) Params() []string
```
Params returns the route parameters.
For example for the route "GET /foo/:fooID" Params returns []string{"fooID"}.




### <a name="RouteDefinition.Validate">func</a> (\*RouteDefinition) [Validate](/src/target/validation.go?s=15193:15257#L526)
``` go
func (r *RouteDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the route definition is consistent: it has a parent.




## <a name="SecurityDefinition">type</a> [SecurityDefinition](/src/target/security.go?s=721:941#L28)
``` go
type SecurityDefinition struct {
    // Scheme defines the Security Scheme used for this action.
    Scheme *SecuritySchemeDefinition

    // Scopes are scopes required for this action
    Scopes []string `json:"scopes,omitempty"`
}

```
SecurityDefinition defines security requirements for an Action










### <a name="SecurityDefinition.Context">func</a> (\*SecurityDefinition) [Context](/src/target/security.go?s=1014:1059#L37)
``` go
func (s *SecurityDefinition) Context() string
```
Context returns the generic definition name used in error messages.




## <a name="SecuritySchemeDefinition">type</a> [SecuritySchemeDefinition](/src/target/security.go?s=1284:2708#L43)
``` go
type SecuritySchemeDefinition struct {
    // Kind is the sort of security scheme this object represents
    Kind SecuritySchemeKind
    // DSLFunc is an optional DSL function
    DSLFunc func()

    // Scheme is the name of the security scheme, referenced in
    // Security() declarations. Ex: "googAuth", "my_big_token", "jwt".
    SchemeName string `json:"scheme"`

    // Type is one of "apiKey", "oauth2" or "basic", according to the
    // Swagger specs. We also support "jwt".
    Type string `json:"type"`
    // Description describes the security scheme. Ex: "Google OAuth2"
    Description string `json:"description"`
    // In determines whether it is in the "header" or in the "query"
    // string that we will find an `apiKey`.
    In string `json:"in,omitempty"`
    // Name refers to a header or parameter name, based on In's value.
    Name string `json:"name,omitempty"`
    // Scopes is a list of available scopes for this scheme, along
    // with their textual description.
    Scopes map[string]string `json:"scopes,omitempty"`
    // Flow determines the oauth2 flow to use for this scheme.
    Flow string `json:"flow,omitempty"`
    // TokenURL holds the URL for refreshing tokens with oauth2 or JWT
    TokenURL string `json:"token_url,omitempty"`
    // AuthorizationURL holds URL for retrieving authorization codes with oauth2
    AuthorizationURL string `json:"authorization_url,omitempty"`
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
}

```
SecuritySchemeDefinition defines a security scheme used to
authenticate against the API being designed. See
<a href="https://swagger.io/specification/#securityDefinitionsObject">https://swagger.io/specification/#securityDefinitionsObject</a> for more
information.










### <a name="SecuritySchemeDefinition.Context">func</a> (\*SecuritySchemeDefinition) [Context](/src/target/security.go?s=2884:2935#L82)
``` go
func (s *SecuritySchemeDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="SecuritySchemeDefinition.DSL">func</a> (\*SecuritySchemeDefinition) [DSL](/src/target/security.go?s=2742:2789#L77)
``` go
func (s *SecuritySchemeDefinition) DSL() func()
```
DSL returns the DSL function




### <a name="SecuritySchemeDefinition.Finalize">func</a> (\*SecuritySchemeDefinition) [Finalize](/src/target/security.go?s=3694:3739#L111)
``` go
func (s *SecuritySchemeDefinition) Finalize()
```
Finalize makes the TokenURL and AuthorizationURL complete if needed.




### <a name="SecuritySchemeDefinition.Validate">func</a> (\*SecuritySchemeDefinition) [Validate](/src/target/security.go?s=3292:3343#L98)
``` go
func (s *SecuritySchemeDefinition) Validate() error
```
Validate ensures that TokenURL and AuthorizationURL are valid URLs.




## <a name="SecuritySchemeKind">type</a> [SecuritySchemeKind](/src/target/security.go?s=172:199#L12)
``` go
type SecuritySchemeKind int
```
SecuritySchemeKind is a type of security scheme, according to the
swagger specs.


``` go
const (
    // OAuth2SecurityKind means "oauth2" security type.
    OAuth2SecurityKind SecuritySchemeKind = iota + 1
    // BasicAuthSecurityKind means "basic" security type.
    BasicAuthSecurityKind
    // APIKeySecurityKind means "apiKey" security type.
    APIKeySecurityKind
    // JWTSecurityKind means an "apiKey" security type, with support for TokenPath and Scopes.
    JWTSecurityKind
    // NoSecurityKind means to have no security for this endpoint.
    NoSecurityKind
)
```









## <a name="UserTypeDefinition">type</a> [UserTypeDefinition](/src/target/types.go?s=4324:4458#L111)
``` go
type UserTypeDefinition struct {
    // A user type is an attribute definition.
    *AttributeDefinition
    // Name of type
    TypeName string
}

```
UserTypeDefinition is the type for user defined types that are not media types
(e.g. payload types).







### <a name="NewUserTypeDefinition">func</a> [NewUserTypeDefinition](/src/target/types.go?s=20036:20107#L679)
``` go
func NewUserTypeDefinition(name string, dsl func()) *UserTypeDefinition
```
NewUserTypeDefinition creates a user type definition but does not
execute the DSL.





### <a name="UserTypeDefinition.CanHaveDefault">func</a> (\*UserTypeDefinition) [CanHaveDefault](/src/target/types.go?s=21724:21774#L717)
``` go
func (u *UserTypeDefinition) CanHaveDefault() bool
```
CanHaveDefault calls CanHaveDefault on the user type underlying data type.




### <a name="UserTypeDefinition.Context">func</a> (\*UserTypeDefinition) [Context](/src/target/definitions.go?s=40973:41018#L1377)
``` go
func (t *UserTypeDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="UserTypeDefinition.DSL">func</a> (\*UserTypeDefinition) [DSL](/src/target/definitions.go?s=41157:41198#L1385)
``` go
func (t *UserTypeDefinition) DSL() func()
```
DSL returns the initialization DSL.




### <a name="UserTypeDefinition.Finalize">func</a> (\*UserTypeDefinition) [Finalize](/src/target/types.go?s=22029:22068#L725)
``` go
func (u *UserTypeDefinition) Finalize()
```
Finalize merges base type attributes.




### <a name="UserTypeDefinition.HasAttributes">func</a> (\*UserTypeDefinition) [HasAttributes](/src/target/types.go?s=20683:20732#L696)
``` go
func (u *UserTypeDefinition) HasAttributes() bool
```
HasAttributes calls the HasAttributes on the user type underlying data type.




### <a name="UserTypeDefinition.IsArray">func</a> (\*UserTypeDefinition) [IsArray](/src/target/types.go?s=20990:21033#L702)
``` go
func (u *UserTypeDefinition) IsArray() bool
```
IsArray calls IsArray on the user type underlying data type.




### <a name="UserTypeDefinition.IsCompatible">func</a> (\*UserTypeDefinition) [IsCompatible](/src/target/types.go?s=21869:21932#L720)
``` go
func (u *UserTypeDefinition) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with u.




### <a name="UserTypeDefinition.IsHash">func</a> (\*UserTypeDefinition) [IsHash](/src/target/types.go?s=21142:21184#L705)
``` go
func (u *UserTypeDefinition) IsHash() bool
```
IsHash calls IsHash on the user type underlying data type.




### <a name="UserTypeDefinition.IsObject">func</a> (\*UserTypeDefinition) [IsObject](/src/target/types.go?s=20834:20878#L699)
``` go
func (u *UserTypeDefinition) IsObject() bool
```
IsObject calls IsObject on the user type underlying data type.




### <a name="UserTypeDefinition.IsPrimitive">func</a> (\*UserTypeDefinition) [IsPrimitive](/src/target/types.go?s=20505:20552#L693)
``` go
func (u *UserTypeDefinition) IsPrimitive() bool
```
IsPrimitive calls IsPrimitive on the user type underlying data type.




### <a name="UserTypeDefinition.Kind">func</a> (\*UserTypeDefinition) [Kind](/src/target/types.go?s=20262:20302#L687)
``` go
func (u *UserTypeDefinition) Kind() Kind
```
Kind implements DataKind.




### <a name="UserTypeDefinition.Name">func</a> (\*UserTypeDefinition) [Name](/src/target/types.go?s=20364:20406#L690)
``` go
func (u *UserTypeDefinition) Name() string
```
Name returns the JSON type name.




### <a name="UserTypeDefinition.ToArray">func</a> (\*UserTypeDefinition) [ToArray](/src/target/types.go?s=21437:21482#L711)
``` go
func (u *UserTypeDefinition) ToArray() *Array
```
ToArray calls ToArray on the user type underlying data type.




### <a name="UserTypeDefinition.ToHash">func</a> (\*UserTypeDefinition) [ToHash](/src/target/types.go?s=21574:21617#L714)
``` go
func (u *UserTypeDefinition) ToHash() *Hash
```
ToHash calls ToHash on the user type underlying data type.




### <a name="UserTypeDefinition.ToObject">func</a> (\*UserTypeDefinition) [ToObject](/src/target/types.go?s=21296:21342#L708)
``` go
func (u *UserTypeDefinition) ToObject() Object
```
ToObject calls ToObject on the user type underlying data type.




### <a name="UserTypeDefinition.Validate">func</a> (\*UserTypeDefinition) [Validate](/src/target/validation.go?s=15523:15629#L536)
``` go
func (u *UserTypeDefinition) Validate(ctx string, parent dslengine.Definition) *dslengine.ValidationErrors
```
Validate checks that the user type definition is consistent: it has a name and the attribute
backing the type is valid.




### <a name="UserTypeDefinition.Walk">func</a> (\*UserTypeDefinition) [Walk](/src/target/types.go?s=31706:31786#L1031)
``` go
func (u *UserTypeDefinition) Walk(walker func(*AttributeDefinition) error) error
```
Walk traverses the data structure recursively and calls the given function once
on each attribute starting with the attribute returned by Definition.




## <a name="UserTypeIterator">type</a> [UserTypeIterator](/src/target/definitions.go?s=12652:12702#L354)
``` go
type UserTypeIterator func(m *UserTypeDefinition) error
```
UserTypeIterator is the type of functions given to IterateUserTypes.










## <a name="ViewDefinition">type</a> [ViewDefinition](/src/target/definitions.go?s=10521:10695#L293)
``` go
type ViewDefinition struct {
    // Set of properties included in view
    *AttributeDefinition
    // Name of view
    Name string
    // Parent media Type
    Parent *MediaTypeDefinition
}

```
ViewDefinition defines which members and links to render when building a response.
The view is a JSON object whose property names must match the names of the parent media
type members.
The members fields are inherited from the parent media type but may be overridden.










### <a name="ViewDefinition.Context">func</a> (\*ViewDefinition) [Context](/src/target/definitions.go?s=52903:52944#L1835)
``` go
func (v *ViewDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="ViewDefinition.Validate">func</a> (\*ViewDefinition) [Validate](/src/target/validation.go?s=18705:18768#L641)
``` go
func (v *ViewDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the view definition is consistent: it has a  parent media type and the
underlying definition type is consistent.




## <a name="ViewIterator">type</a> [ViewIterator](/src/target/types.go?s=23729:23774#L783)
``` go
type ViewIterator func(*ViewDefinition) error
```
ViewIterator is the type of the function given to IterateViews.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
