
# design
    import "github.com/goadesign/goa/design"

Package design defines types which describe the data types used by action controllers.
These are the data structures of the request payloads and parameters as well as the response
payloads.
There are primitive types corresponding to the JSON primitive types (bool, string, integer and
number), array types which represent a collection of another type and object types corresponding
to JSON objects (i.e. a map indexed by strings where each value may be any of the data types).
On top of these the package also defines "user types" and "media types". Both these types are
named objects with additional properties (a description and for media types the media type
identifier, links and views).




## Constants
``` go
const (
    // BooleanKind represents a JSON bool.
    BooleanKind = iota + 1
    // IntegerKind represents a JSON integer.
    IntegerKind
    // NumberKind represents a JSON number including integers.
    NumberKind
    // StringKind represents a JSON string.
    StringKind
    // DateTimeKind represents a JSON string that is parsed as a Go time.Time
    DateTimeKind
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
)
```
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

    // Any is the type for an arbitrary JSON value (interface{} in Go).
    Any = Primitive(AnyKind)
)
```

## Variables
``` go
var (
    // Design is the API definition created via DSL.
    Design *APIDefinition

    // WildcardRegex is the regular expression used to capture path parameters.
    WildcardRegex = regexp.MustCompile(`/(?::|\*)([a-zA-Z0-9_]+)`)

    // GeneratedMediaTypes contains DSL definitions that were created by the design DSL and
    // need to be executed as a second pass.
    // An example of this are media types defined with CollectionOf: the element media type
    // must be defined first then the definition created by CollectionOf must execute.
    GeneratedMediaTypes MediaTypeRoot

    // DefaultDecoders contains the decoding definitions used when no Consumes DSL is found.
    DefaultDecoders []*EncodingDefinition

    // DefaultEncoders contains the encoding definitions used when no Produces DSL is found.
    DefaultEncoders []*EncodingDefinition

    // KnownEncoders contains the list of encoding packages and factories known by goa indexed
    // by MIME type.
    KnownEncoders = map[string][3]string{
        "application/json":      [3]string{"json", "JSONEncoderFactory", "JSONDecoderFactory"},
        "application/xml":       [3]string{"xml", "XMLEncoderFactory", "XMLDecoderFactory"},
        "text/xml":              [3]string{"xml", "XMLEncoderFactory", "XMLDecoderFactory"},
        "application/gob":       [3]string{"gob", "GobEncoderFactory", "GobDecoderFactory"},
        "application/x-gob":     [3]string{"gob", "GobEncoderFactory", "GobDecoderFactory"},
        "application/binc":      [3]string{"github.com/goadesign/middleware/encoding/binc", "EncoderFactory", "DecoderFactory"},
        "application/x-binc":    [3]string{"github.com/goadesign/middleware/encoding/binc", "EncoderFactory", "DecoderFactory"},
        "application/x-cbor":    [3]string{"github.com/goadesign/middleware/encoding/cbor", "EncoderFactory", "DecoderFactory"},
        "application/cbor":      [3]string{"github.com/goadesign/middleware/encoding/cbor", "EncoderFactory", "DecoderFactory"},
        "application/msgpack":   [3]string{"github.com/goadesign/middleware/encoding/msgpack", "EncoderFactory", "DecoderFactory"},
        "application/x-msgpack": [3]string{"github.com/goadesign/middleware/encoding/msgpack", "EncoderFactory", "DecoderFactory"},
    }

    // JSONContentTypes is a slice of default Content-Type headers that will use stdlib
    // encoding/json to unmarshal unless overwritten using SetDecoder
    JSONContentTypes = []string{"application/json"}

    // XMLContentTypes is a slice of default Content-Type headers that will use stdlib
    // encoding/xml to unmarshal unless overwritten using SetDecoder
    XMLContentTypes = []string{"application/xml", "text/xml"}

    // GobContentTypes is a slice of default Content-Type headers that will use stdlib
    // encoding/gob to unmarshal unless overwritten using SetDecoder
    GobContentTypes = []string{"application/gob", "application/x-gob"}
)
```

## func CanonicalIdentifier
``` go
func CanonicalIdentifier(identifier string) string
```
CanonicalIdentifier returns the media type identifier sans suffix
which is what the DSL uses to store and lookup media types.


## func ExtractWildcards
``` go
func ExtractWildcards(path string) []string
```
ExtractWildcards returns the names of the wildcards that appear in path.


## func HasKnownEncoder
``` go
func HasKnownEncoder(mimeType string) bool
```
HasKnownEncoder returns true if the encoder for the given MIME type is known by goa.
MIME types with unknown encoders must be associated with a package path explicitly in the DSL.


## func IsGoaEncoder
``` go
func IsGoaEncoder(pkgPath string) bool
```
IsGoaEncoder returns true if the encoder for the given MIME type is implemented in the goa
package.



## type APIDefinition
``` go
type APIDefinition struct {
    // APIVersionDefinition contains the default values for properties across all versions.
    *APIVersionDefinition
    // APIVersions contain the API properties indexed by version.
    APIVersions map[string]*APIVersionDefinition
    // Exposed resources indexed by name
    Resources map[string]*ResourceDefinition
    // Types indexes the user defined types by name.
    Types map[string]*UserTypeDefinition
    // MediaTypes indexes the API media types by canonical identifier.
    MediaTypes map[string]*MediaTypeDefinition
    // contains filtered or unexported fields
}
```
APIDefinition defines the global properties of the API.











### func (\*APIDefinition) Context
``` go
func (a *APIDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*APIDefinition) Example
``` go
func (a *APIDefinition) Example(dt DataType) interface{}
```
Example returns a random value for the given data type.
If the data type has validations then the example value validates them.
Example returns the same random value for a given api name (the random
generator is seeded after the api name).



### func (\*APIDefinition) IterateMediaTypes
``` go
func (a *APIDefinition) IterateMediaTypes(it MediaTypeIterator) error
```
IterateMediaTypes calls the given iterator passing in each media type sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateMediaTypes returns that
error.



### func (\*APIDefinition) IterateResources
``` go
func (a *APIDefinition) IterateResources(it ResourceIterator) error
```
IterateResources calls the given iterator passing in each resource sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateResources returns that
error.



### func (\*APIDefinition) IterateSets
``` go
func (a *APIDefinition) IterateSets(iterator dslengine.SetIterator)
```
IterateSets goes over all the definition sets of the API: The API definition itself, each
version definition, user types, media types and finally resources.



### func (\*APIDefinition) IterateUserTypes
``` go
func (a *APIDefinition) IterateUserTypes(it UserTypeIterator) error
```
IterateUserTypes calls the given iterator passing in each user type sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateUserTypes returns that
error.



### func (\*APIDefinition) IterateVersions
``` go
func (a *APIDefinition) IterateVersions(it VersionIterator) error
```
IterateVersions calls the given iterator passing in each API version definition sorted
alphabetically by version name. It first calls the iterator on the embedded version definition
which contains the definitions for all the unversioned resources.
Iteration stops if an iterator returns an error and in this case IterateVersions returns that
error.



### func (\*APIDefinition) MediaTypeWithIdentifier
``` go
func (a *APIDefinition) MediaTypeWithIdentifier(id string) *MediaTypeDefinition
```
MediaTypeWithIdentifier returns the media type with a matching
media type identifier. Two media type identifiers match if their
values sans suffix match. So for example "application/vnd.foo+xml",
"application/vnd.foo+json" and "application/vnd.foo" all match.



### func (\*APIDefinition) SupportsNoVersion
``` go
func (a *APIDefinition) SupportsNoVersion() bool
```
SupportsNoVersion returns true if the API is unversioned.



### func (\*APIDefinition) SupportsVersion
``` go
func (a *APIDefinition) SupportsVersion(ver string) bool
```
SupportsVersion returns true if the object supports the given version.



### func (\*APIDefinition) Validate
``` go
func (a *APIDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the API definition is consistent: all resource parent names resolve to
an actual resource.



### func (\*APIDefinition) Versions
``` go
func (a *APIDefinition) Versions() (versions []string)
```
Versions returns an array of supported versions.



## type APIVersionDefinition
``` go
type APIVersionDefinition struct {
    // API name
    Name string
    // API Title
    Title string
    // API description
    Description string
    // API version if any
    Version string
    // API hostname
    Host string
    // API URL schemes
    Schemes []string
    // Common base path to all API actions
    BasePath string
    // Common path parameters to all API actions
    BaseParams *AttributeDefinition
    // Consumes lists the mime types supported by the API controllers.
    Consumes []*EncodingDefinition
    // Produces lists the mime types generated by the API controllers.
    Produces []*EncodingDefinition
    // TermsOfService describes or links to the API terms of service
    TermsOfService string
    // Contact provides the API users with contact information
    Contact *ContactDefinition
    // License describes the API license
    License *LicenseDefinition
    // Docs points to the API external documentation
    Docs *DocsDefinition
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
    // DSLFunc contains the DSL used to create this definition if any.
    DSLFunc func()
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
}
```
APIVersionDefinition defines the properties of the API for a given version.











### func (\*APIVersionDefinition) Context
``` go
func (v *APIVersionDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*APIVersionDefinition) DSL
``` go
func (v *APIVersionDefinition) DSL() func()
```
DSL returns the initialization DSL.



### func (\*APIVersionDefinition) Finalize
``` go
func (v *APIVersionDefinition) Finalize()
```
Finalize sets the Consumes and Produces fields to the defaults if empty.



### func (\*APIVersionDefinition) IsDefault
``` go
func (v *APIVersionDefinition) IsDefault() bool
```
IsDefault returns true if the version definition applies to all versions (i.e. is the API
definition).



### func (\*APIVersionDefinition) IterateMediaTypes
``` go
func (v *APIVersionDefinition) IterateMediaTypes(it MediaTypeIterator) error
```
IterateMediaTypes calls the given iterator passing in each media type sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateMediaTypes returns that
error.



### func (\*APIVersionDefinition) IterateResources
``` go
func (v *APIVersionDefinition) IterateResources(it ResourceIterator) error
```
IterateResources calls the given iterator passing in each resource sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateResources returns that
error.



### func (\*APIVersionDefinition) IterateResponses
``` go
func (v *APIVersionDefinition) IterateResponses(it ResponseIterator) error
```
IterateResponses calls the given iterator passing in each response sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateResponses returns that
error.



### func (\*APIVersionDefinition) IterateUserTypes
``` go
func (v *APIVersionDefinition) IterateUserTypes(it UserTypeIterator) error
```
IterateUserTypes calls the given iterator passing in each user type sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateUserTypes returns that
error.



## type ActionDefinition
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
    // Request headers that need to be made available to action
    Headers *AttributeDefinition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
}
```
ActionDefinition defines a resource action.
It defines both an HTTP endpoint and the shape of HTTP requests and responses made to
that endpoint.
The shape of requests is defined via "parameters", there are path parameters
parameters and a payload parameter (request body).
(i.e. portions of the URL that define parameter values), query string











### func (\*ActionDefinition) AllParams
``` go
func (a *ActionDefinition) AllParams() *AttributeDefinition
```
AllParams returns the path and query string parameters of the action across all its routes.



### func (\*ActionDefinition) Context
``` go
func (a *ActionDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*ActionDefinition) HasAbsoluteRoutes
``` go
func (a *ActionDefinition) HasAbsoluteRoutes() bool
```
HasAbsoluteRoutes returns true if all the action routes are absolute.



### func (\*ActionDefinition) PathParams
``` go
func (a *ActionDefinition) PathParams(version *APIVersionDefinition) *AttributeDefinition
```
PathParams returns the path parameters of the action across all its routes.



### func (\*ActionDefinition) Validate
``` go
func (a *ActionDefinition) Validate(version *APIVersionDefinition) *dslengine.ValidationErrors
```
Validate tests whether the action definition is consistent: parameters have unique names and it has at least
one response.



### func (\*ActionDefinition) ValidateParams
``` go
func (a *ActionDefinition) ValidateParams(version *APIVersionDefinition) *dslengine.ValidationErrors
```
ValidateParams checks the action parameters (make sure they have names, members and types).



## type ActionIterator
``` go
type ActionIterator func(a *ActionDefinition) error
```
ActionIterator is the type of functions given to IterateActions.











## type Array
``` go
type Array struct {
    ElemType *AttributeDefinition
}
```
Array is the type for a JSON array.











### func (\*Array) Dup
``` go
func (a *Array) Dup() DataType
```
Dup calls Dup on the array ElemType and creates an array with the result.



### func (\*Array) Example
``` go
func (a *Array) Example(r *RandomGenerator) interface{}
```
Example produces a random array value.



### func (\*Array) IsArray
``` go
func (a *Array) IsArray() bool
```
IsArray returns true.



### func (\*Array) IsCompatible
``` go
func (a *Array) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.



### func (\*Array) IsHash
``` go
func (a *Array) IsHash() bool
```
IsHash returns false.



### func (\*Array) IsObject
``` go
func (a *Array) IsObject() bool
```
IsObject returns false.



### func (\*Array) IsPrimitive
``` go
func (a *Array) IsPrimitive() bool
```
IsPrimitive returns false.



### func (\*Array) Kind
``` go
func (a *Array) Kind() Kind
```
Kind implements DataKind.



### func (\*Array) Name
``` go
func (a *Array) Name() string
```
Name returns the type name.



### func (\*Array) ToArray
``` go
func (a *Array) ToArray() *Array
```
ToArray returns a.



### func (\*Array) ToHash
``` go
func (a *Array) ToHash() *Hash
```
ToHash returns nil.



### func (\*Array) ToObject
``` go
func (a *Array) ToObject() Object
```
ToObject returns nil.



## type AttributeDefinition
``` go
type AttributeDefinition struct {
    // Attribute type
    Type DataType
    // Attribute reference type if any
    Reference DataType
    // Optional description
    Description string
    // Optional validation functions
    Validations []dslengine.ValidationDefinition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Optional member default value
    DefaultValue interface{}
    // Optional view used to render Attribute (only applies to media type attributes).
    View string
    // List of API versions that use the attribute.
    APIVersions []string
    // NonZeroAttributes lists the names of the child attributes that cannot have a
    // zero value (and thus whose presence does not need to be validated).
    NonZeroAttributes map[string]bool
    // DSLFunc contains the initialization DSL. This is used for user types.
    DSLFunc func()
}
```
AttributeDefinition defines a JSON object member with optional description, default
value and validations.











### func (\*AttributeDefinition) AllNonZero
``` go
func (a *AttributeDefinition) AllNonZero() []string
```
AllNonZero returns the complete list of all non-zero attribute name.



### func (\*AttributeDefinition) AllRequired
``` go
func (a *AttributeDefinition) AllRequired() (required []string)
```
AllRequired returns the list of all required fields from the underlying object.
An attribute type can be itself an attribute (e.g. a MediaTypeDefinition or a UserTypeDefinition)
This happens when the DSL uses references for example. So traverse the hierarchy and collect
all the required validations.



### func (\*AttributeDefinition) Context
``` go
func (a *AttributeDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*AttributeDefinition) DSL
``` go
func (a *AttributeDefinition) DSL() func()
```
DSL returns the initialization DSL.



### func (\*AttributeDefinition) Definition
``` go
func (a *AttributeDefinition) Definition() *AttributeDefinition
```
Definition returns the underlying attribute definition.
Note that this function is "inherited" by both UserTypeDefinition and
MediaTypeDefinition.



### func (\*AttributeDefinition) Dup
``` go
func (a *AttributeDefinition) Dup() *AttributeDefinition
```
Dup returns a copy of the attribute definition.
Note: the primitive underlying types are not duplicated for simplicity.



### func (\*AttributeDefinition) Example
``` go
func (a *AttributeDefinition) Example(r *RandomGenerator) interface{}
```
Example returns a random instance of the attribute that validates.



### func (\*AttributeDefinition) Inherit
``` go
func (a *AttributeDefinition) Inherit(parent *AttributeDefinition)
```
Inherit merges the properties of existing target type attributes with the argument's.
The algorithm is recursive so that child attributes are also merged.



### func (\*AttributeDefinition) IsNonZero
``` go
func (a *AttributeDefinition) IsNonZero(attName string) bool
```
IsNonZero returns true if the given string matches the name of a non-zero
attribute, false otherwise.



### func (\*AttributeDefinition) IsPrimitivePointer
``` go
func (a *AttributeDefinition) IsPrimitivePointer(attName string) bool
```
IsPrimitivePointer returns true if the field generated for the given attribute should be a
pointer to a primitive type. The target attribute must be an object.



### func (\*AttributeDefinition) IsRequired
``` go
func (a *AttributeDefinition) IsRequired(attName string) bool
```
IsRequired returns true if the given string matches the name of a required
attribute, false otherwise.



### func (\*AttributeDefinition) Merge
``` go
func (a *AttributeDefinition) Merge(other *AttributeDefinition) *AttributeDefinition
```
Merge merges the argument attributes into the target and returns the target overriding existing
attributes with identical names.
This only applies to attributes of type Object and Merge panics if the
argument or the target is not of type Object.



### func (\*AttributeDefinition) Validate
``` go
func (a *AttributeDefinition) Validate(ctx string, parent dslengine.Definition) *dslengine.ValidationErrors
```
Validate tests whether the attribute definition is consistent: required fields exist.
Since attributes are unaware of their context, additional context information can be provided
to be used in error messages.
The parent definition context is automatically added to error messages.



## type AttributeIterator
``` go
type AttributeIterator func(string, *AttributeDefinition) error
```
AttributeIterator is the type of the function given to IterateAttributes.











## type ContactDefinition
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











### func (\*ContactDefinition) Context
``` go
func (c *ContactDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type DataStructure
``` go
type DataStructure interface {
    // Definition returns the data structure definition.
    Definition() *AttributeDefinition
}
```
DataStructure is the interface implemented by all data structure types.
That is attribute definitions, user types and media types.











## type DataType
``` go
type DataType interface {
    // Kind of data type, one of the Kind enum.
    Kind() Kind
    // Name returns the type name.
    Name() string
    // IsPrimitive returns true if the underlying type is one of the primitive types.
    IsPrimitive() bool
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
    // IsCompatible checks whether val has a Go type that is
    // compatible with the data type.
    IsCompatible(val interface{}) bool
    // Dup creates a copy of the type. This is only relevant for types that are
    // DSLDefinition (i.e. have an attribute definition).
    Dup() DataType
    // Example returns a random value for the given data type.
    // If the data type has validations then the example value validates them.
    Example(r *RandomGenerator) interface{}
}
```
DataType is the common interface to all types.











## type DocsDefinition
``` go
type DocsDefinition struct {
    // Description of documentation.
    Description string `json:"description,omitempty"`
    // URL to documentation.
    URL string `json:"url,omitempty"`
}
```
DocsDefinition points to external documentation.











### func (\*DocsDefinition) Context
``` go
func (d *DocsDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type EncodingDefinition
``` go
type EncodingDefinition struct {
    // MIMETypes is the set of possible MIME types for the content being encoded or decoded.
    MIMETypes []string
    // PackagePath is the path to the Go package that implements the encoder / decoder.
    // The package must expose a `EncoderFactory` or `DecoderFactory` function
    // that the generated code calls. The methods must return objects that implement
    // the goa.EncoderFactory or goa.DecoderFactory interface respectively.
    PackagePath string
}
```
EncodingDefinition defines an encoder supported by the API.











### func (\*EncodingDefinition) Context
``` go
func (enc *EncodingDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*EncodingDefinition) SupportingPackages
``` go
func (enc *EncodingDefinition) SupportingPackages() map[string][]string
```
SupportingPackages returns the package paths to the packages that implements the encoders and
decoders that support the MIME types in the definition.
The return value maps the package path to the corresponding list of supported MIME types.
It is nil if no package could be found for *any* of the MIME types in the definition (in which
case the definition is invalid).



### func (\*EncodingDefinition) Validate
``` go
func (enc *EncodingDefinition) Validate() *dslengine.ValidationErrors
```
Validate validates the encoding MIME type and Go package path if set.



## type Hash
``` go
type Hash struct {
    KeyType  *AttributeDefinition
    ElemType *AttributeDefinition
}
```
Hash is the type for a hash map.











### func (\*Hash) Dup
``` go
func (h *Hash) Dup() DataType
```
Dup creates a copy of h.



### func (\*Hash) Example
``` go
func (h *Hash) Example(r *RandomGenerator) interface{}
```
Example returns a random hash value.



### func (\*Hash) IsArray
``` go
func (h *Hash) IsArray() bool
```
IsArray returns false.



### func (\*Hash) IsCompatible
``` go
func (h *Hash) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.



### func (\*Hash) IsHash
``` go
func (h *Hash) IsHash() bool
```
IsHash returns true.



### func (\*Hash) IsObject
``` go
func (h *Hash) IsObject() bool
```
IsObject returns false.



### func (\*Hash) IsPrimitive
``` go
func (h *Hash) IsPrimitive() bool
```
IsPrimitive returns false.



### func (\*Hash) Kind
``` go
func (h *Hash) Kind() Kind
```
Kind implements DataKind.



### func (\*Hash) Name
``` go
func (h *Hash) Name() string
```
Name returns the type name.



### func (\*Hash) ToArray
``` go
func (h *Hash) ToArray() *Array
```
ToArray returns nil.



### func (\*Hash) ToHash
``` go
func (h *Hash) ToHash() *Hash
```
ToHash returns the underlying hash map.



### func (\*Hash) ToObject
``` go
func (h *Hash) ToObject() Object
```
ToObject returns nil.



## type Kind
``` go
type Kind uint
```
A Kind defines the JSON type that a DataType represents.











## type LicenseDefinition
``` go
type LicenseDefinition struct {
    // Name of license used for the API
    Name string `json:"name,omitempty"`
    // URL to the license used for the API
    URL string `json:"url,omitempty"`
}
```
LicenseDefinition contains the license information for the API.











### func (\*LicenseDefinition) Context
``` go
func (l *LicenseDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type LinkDefinition
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











### func (\*LinkDefinition) Attribute
``` go
func (l *LinkDefinition) Attribute() *AttributeDefinition
```
Attribute returns the linked attribute.



### func (\*LinkDefinition) Context
``` go
func (l *LinkDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*LinkDefinition) MediaType
``` go
func (l *LinkDefinition) MediaType() *MediaTypeDefinition
```
MediaType returns the media type of the linked attribute.



### func (\*LinkDefinition) Validate
``` go
func (l *LinkDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the link definition is consistent: it has a media type or the name of an
attribute part of the parent media type.



## type MediaTypeDefinition
``` go
type MediaTypeDefinition struct {
    // A media type is a type
    *UserTypeDefinition
    // Identifier is the RFC 6838 media type identifier.
    Identifier string
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









### func NewMediaTypeDefinition
``` go
func NewMediaTypeDefinition(name, identifier string, dsl func()) *MediaTypeDefinition
```
NewMediaTypeDefinition creates a media type definition but does not
execute the DSL.




### func (\*MediaTypeDefinition) ComputeViews
``` go
func (m *MediaTypeDefinition) ComputeViews() map[string]*ViewDefinition
```
ComputeViews returns the media type views recursing as necessary if the media type is a
collection.



### func (\*MediaTypeDefinition) Dup
``` go
func (m *MediaTypeDefinition) Dup() DataType
```
Dup returns a copy of m.



### func (\*MediaTypeDefinition) Kind
``` go
func (m *MediaTypeDefinition) Kind() Kind
```
Kind implements DataKind.



### func (\*MediaTypeDefinition) Validate
``` go
func (m *MediaTypeDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the media type definition is consistent: its identifier is a valid media
type identifier.



## type MediaTypeIterator
``` go
type MediaTypeIterator func(m *MediaTypeDefinition) error
```
MediaTypeIterator is the type of functions given to IterateMediaTypes.











## type MediaTypeRoot
``` go
type MediaTypeRoot map[string]*MediaTypeDefinition
```
MediaTypeRoot is the data structure that represents the additional DSL definition root
that contains the media type definition set created by CollectionOf.











### func (MediaTypeRoot) IterateSets
``` go
func (r MediaTypeRoot) IterateSets(iterator dslengine.SetIterator)
```
IterateSets iterates over the one generated media type definition set.



## type Object
``` go
type Object map[string]*AttributeDefinition
```
Object is the type for a JSON object.











### func (Object) Dup
``` go
func (o Object) Dup() DataType
```
Dup creates a copy of o.



### func (Object) Example
``` go
func (o Object) Example(r *RandomGenerator) interface{}
```
Example returns a random value of the object.



### func (Object) IsArray
``` go
func (o Object) IsArray() bool
```
IsArray returns false.



### func (Object) IsCompatible
``` go
func (o Object) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.



### func (Object) IsHash
``` go
func (o Object) IsHash() bool
```
IsHash returns false.



### func (Object) IsObject
``` go
func (o Object) IsObject() bool
```
IsObject returns true.



### func (Object) IsPrimitive
``` go
func (o Object) IsPrimitive() bool
```
IsPrimitive returns false.



### func (Object) IterateAttributes
``` go
func (o Object) IterateAttributes(it AttributeIterator) error
```
IterateAttributes calls the given iterator passing in each attribute sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateObject returns that
error.



### func (Object) Kind
``` go
func (o Object) Kind() Kind
```
Kind implements DataKind.



### func (Object) Merge
``` go
func (o Object) Merge(other Object)
```
Merge copies other's attributes into o overridding any pre-existing attribute with the same name.



### func (Object) Name
``` go
func (o Object) Name() string
```
Name returns the type name.



### func (Object) ToArray
``` go
func (o Object) ToArray() *Array
```
ToArray returns nil.



### func (Object) ToHash
``` go
func (o Object) ToHash() *Hash
```
ToHash returns nil.



### func (Object) ToObject
``` go
func (o Object) ToObject() Object
```
ToObject returns the underlying object.



## type Primitive
``` go
type Primitive Kind
```
Primitive is the type for null, boolean, integer, number, string, and time.











### func (Primitive) Dup
``` go
func (p Primitive) Dup() DataType
```
Dup returns the primitive type.



### func (Primitive) Example
``` go
func (p Primitive) Example(r *RandomGenerator) interface{}
```
Example returns an instance of the given data type.



### func (Primitive) IsArray
``` go
func (p Primitive) IsArray() bool
```
IsArray returns false.



### func (Primitive) IsCompatible
``` go
func (p Primitive) IsCompatible(val interface{}) (ok bool)
```
IsCompatible returns true if val is compatible with p.



### func (Primitive) IsHash
``` go
func (p Primitive) IsHash() bool
```
IsHash returns false.



### func (Primitive) IsObject
``` go
func (p Primitive) IsObject() bool
```
IsObject returns false.



### func (Primitive) IsPrimitive
``` go
func (p Primitive) IsPrimitive() bool
```
IsPrimitive returns true.



### func (Primitive) Kind
``` go
func (p Primitive) Kind() Kind
```
Kind implements DataKind.



### func (Primitive) Name
``` go
func (p Primitive) Name() string
```
Name returns the type name.



### func (Primitive) ToArray
``` go
func (p Primitive) ToArray() *Array
```
ToArray returns nil.



### func (Primitive) ToHash
``` go
func (p Primitive) ToHash() *Hash
```
ToHash returns nil.



### func (Primitive) ToObject
``` go
func (p Primitive) ToObject() Object
```
ToObject returns nil.



## type RandomGenerator
``` go
type RandomGenerator struct {
    Seed string
    // contains filtered or unexported fields
}
```
RandomGenerator generates consistent random values of different types given a seed.
The random values are consistent in that given the same seed the same random values get
generated.









### func NewRandomGenerator
``` go
func NewRandomGenerator(seed string) *RandomGenerator
```
NewRandomGenerator returns a random value generator seeded from the given string value.




### func (\*RandomGenerator) Bool
``` go
func (r *RandomGenerator) Bool() bool
```
Bool produces a random boolean.



### func (\*RandomGenerator) DateTime
``` go
func (r *RandomGenerator) DateTime() time.Time
```
DateTime produces a random date.



### func (\*RandomGenerator) Float64
``` go
func (r *RandomGenerator) Float64() float64
```
Float64 produces a random float64 value.



### func (\*RandomGenerator) Int
``` go
func (r *RandomGenerator) Int() int
```
Int produces a random integer.



### func (\*RandomGenerator) String
``` go
func (r *RandomGenerator) String() string
```
String produces a random string.



## type ResourceDefinition
``` go
type ResourceDefinition struct {
    // Resource name
    Name string
    // Common URL prefix to all resource action HTTP requests
    BasePath string
    // Object describing each parameter that appears in BasePath if any
    BaseParams *AttributeDefinition
    // Name of parent resource if any
    ParentName string
    // Optional description
    Description string
    // API versions that expose this resource.
    APIVersions []string
    // Default media type, describes the resource attributes
    MediaType string
    // Exposed resource actions indexed by name
    Actions map[string]*ActionDefinition
    // Action with canonical resource path
    CanonicalActionName string
    // Map of response definitions that apply to all actions indexed by name.
    Responses map[string]*ResponseDefinition
    // Path and query string parameters that apply to all actions.
    Params *AttributeDefinition
    // Request headers that apply to all actions.
    Headers *AttributeDefinition
    // DSLFunc contains the DSL used to create this definition if any.
    DSLFunc func()
    // metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
}
```
ResourceDefinition describes a REST resource.
It defines both a media type and a set of actions that can be executed through HTTP
requests.
A resource is versioned so that multiple versions of the same resource may be exposed
by the API.









### func NewResourceDefinition
``` go
func NewResourceDefinition(name string, dsl func()) *ResourceDefinition
```
NewResourceDefinition creates a resource definition but does not
execute the DSL.




### func (\*ResourceDefinition) CanonicalAction
``` go
func (r *ResourceDefinition) CanonicalAction() *ActionDefinition
```
CanonicalAction returns the canonical action of the resource if any.
The canonical action is used to compute hrefs to resources.



### func (\*ResourceDefinition) Context
``` go
func (r *ResourceDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*ResourceDefinition) DSL
``` go
func (r *ResourceDefinition) DSL() func()
```
DSL returns the initialization DSL.



### func (\*ResourceDefinition) Finalize
``` go
func (r *ResourceDefinition) Finalize()
```
Finalize is run post DSL execution. It merges response definitions, creates implicit action
parameters, initializes querystring parameters and sets path parameters as non zero attributes.



### func (\*ResourceDefinition) FullPath
``` go
func (r *ResourceDefinition) FullPath(version *APIVersionDefinition) string
```
FullPath computes the base path to the resource actions concatenating the API and parent resource
base paths as needed.



### func (\*ResourceDefinition) IterateActions
``` go
func (r *ResourceDefinition) IterateActions(it ActionIterator) error
```
IterateActions calls the given iterator passing in each resource action sorted in alphabetical order.
Iteration stops if an iterator returns an error and in this case IterateActions returns that
error.



### func (\*ResourceDefinition) Parent
``` go
func (r *ResourceDefinition) Parent() *ResourceDefinition
```
Parent returns the parent resource if any, nil otherwise.



### func (\*ResourceDefinition) SupportsNoVersion
``` go
func (r *ResourceDefinition) SupportsNoVersion() bool
```
SupportsNoVersion returns true if the resource is exposed by an unversioned API.



### func (\*ResourceDefinition) SupportsVersion
``` go
func (r *ResourceDefinition) SupportsVersion(version string) bool
```
SupportsVersion returns true if the resource is exposed by the given API version.
An empty string version means no version.



### func (\*ResourceDefinition) URITemplate
``` go
func (r *ResourceDefinition) URITemplate(version *APIVersionDefinition) string
```
URITemplate returns a httprouter compliant URI template to this resource.
The result is the empty string if the resource does not have a "show" action
and does not define a different canonical action.



### func (\*ResourceDefinition) Validate
``` go
func (r *ResourceDefinition) Validate(version *APIVersionDefinition) *dslengine.ValidationErrors
```
Validate tests whether the resource definition is consistent: action names are valid and each action is
valid.



### func (\*ResourceDefinition) Versions
``` go
func (r *ResourceDefinition) Versions() []string
```
Versions returns the API versions that expose the resource.



## type ResourceIterator
``` go
type ResourceIterator func(r *ResourceDefinition) error
```
ResourceIterator is the type of functions given to IterateResources.











## type ResponseDefinition
``` go
type ResponseDefinition struct {
    // Response name
    Name string
    // HTTP status
    Status int
    // Response description
    Description string
    // Response body media type if any
    MediaType string
    // Response header definitions
    Headers *AttributeDefinition
    // Parent action or resource
    Parent dslengine.Definition
    // Metadata is a list of key/value pairs
    Metadata dslengine.MetadataDefinition
    // Standard is true if the response definition comes from the goa default responses
    Standard bool
    // Global is true if the response definition comes from the global API properties
    Global bool
}
```
ResponseDefinition defines a HTTP response status and optional validation rules.











### func (\*ResponseDefinition) Context
``` go
func (r *ResponseDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*ResponseDefinition) Dup
``` go
func (r *ResponseDefinition) Dup() *ResponseDefinition
```
Dup returns a copy of the response definition.



### func (\*ResponseDefinition) Merge
``` go
func (r *ResponseDefinition) Merge(other *ResponseDefinition)
```
Merge merges other into target. Only the fields of target that are not already set are merged.



### func (\*ResponseDefinition) Validate
``` go
func (r *ResponseDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the response definition is consistent: its status is set and the media
type definition if any is valid.



## type ResponseIterator
``` go
type ResponseIterator func(r *ResponseDefinition) error
```
ResponseIterator is the type of functions given to IterateResponses.











## type ResponseTemplateDefinition
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











### func (\*ResponseTemplateDefinition) Context
``` go
func (r *ResponseTemplateDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type RouteDefinition
``` go
type RouteDefinition struct {
    // Verb is the HTTP method, e.g. "GET", "POST", etc.
    Verb string
    // Path is the URL path e.g. "/tasks/:id"
    Path string
    // Parent is the action this route applies to.
    Parent *ActionDefinition
}
```
RouteDefinition represents an action route.











### func (\*RouteDefinition) Context
``` go
func (r *RouteDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*RouteDefinition) FullPath
``` go
func (r *RouteDefinition) FullPath(version *APIVersionDefinition) string
```
FullPath returns the action full path computed by concatenating the API and resource base paths
with the action specific path.



### func (\*RouteDefinition) IsAbsolute
``` go
func (r *RouteDefinition) IsAbsolute() bool
```
IsAbsolute returns true if the action path should not be concatenated to the resource and API
base paths.



### func (\*RouteDefinition) Params
``` go
func (r *RouteDefinition) Params(version *APIVersionDefinition) []string
```
Params returns the route parameters.
For example for the route "GET /foo/:fooID" Params returns []string{"fooID"}.



### func (\*RouteDefinition) Validate
``` go
func (r *RouteDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the route definition is consistent: it has a parent.



## type UserTypeDefinition
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









### func NewUserTypeDefinition
``` go
func NewUserTypeDefinition(name string, dsl func()) *UserTypeDefinition
```
NewUserTypeDefinition creates a user type definition but does not
execute the DSL.




### func (\*UserTypeDefinition) Context
``` go
func (t *UserTypeDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*UserTypeDefinition) DSL
``` go
func (t *UserTypeDefinition) DSL() func()
```
DSL returns the initialization DSL.



### func (\*UserTypeDefinition) Dup
``` go
func (u *UserTypeDefinition) Dup() DataType
```
Dup returns a copy of u.



### func (\*UserTypeDefinition) Finalize
``` go
func (u *UserTypeDefinition) Finalize()
```
Finalize merges base type attributes.



### func (\*UserTypeDefinition) IsArray
``` go
func (u *UserTypeDefinition) IsArray() bool
```
IsArray calls IsArray on the user type underlying data type.



### func (\*UserTypeDefinition) IsCompatible
``` go
func (u *UserTypeDefinition) IsCompatible(val interface{}) bool
```
IsCompatible returns true if val is compatible with p.



### func (\*UserTypeDefinition) IsHash
``` go
func (u *UserTypeDefinition) IsHash() bool
```
IsHash calls IsHash on the user type underlying data type.



### func (\*UserTypeDefinition) IsObject
``` go
func (u *UserTypeDefinition) IsObject() bool
```
IsObject calls IsObject on the user type underlying data type.



### func (\*UserTypeDefinition) IsPrimitive
``` go
func (u *UserTypeDefinition) IsPrimitive() bool
```
IsPrimitive calls IsPrimitive on the user type underlying data type.



### func (\*UserTypeDefinition) Kind
``` go
func (u *UserTypeDefinition) Kind() Kind
```
Kind implements DataKind.



### func (\*UserTypeDefinition) Name
``` go
func (u *UserTypeDefinition) Name() string
```
Name returns the JSON type name.



### func (\*UserTypeDefinition) SupportsNoVersion
``` go
func (u *UserTypeDefinition) SupportsNoVersion() bool
```
SupportsNoVersion returns true if the resource is exposed by an unversioned API.



### func (\*UserTypeDefinition) SupportsVersion
``` go
func (u *UserTypeDefinition) SupportsVersion(version string) bool
```
SupportsVersion returns true if the type is exposed by the given API version.
An empty string version means no version.



### func (\*UserTypeDefinition) ToArray
``` go
func (u *UserTypeDefinition) ToArray() *Array
```
ToArray calls ToArray on the user type underlying data type.



### func (\*UserTypeDefinition) ToHash
``` go
func (u *UserTypeDefinition) ToHash() *Hash
```
ToHash calls ToHash on the user type underlying data type.



### func (\*UserTypeDefinition) ToObject
``` go
func (u *UserTypeDefinition) ToObject() Object
```
ToObject calls ToObject on the user type underlying data type.



### func (\*UserTypeDefinition) Validate
``` go
func (u *UserTypeDefinition) Validate(ctx string, parent dslengine.Definition) *dslengine.ValidationErrors
```
Validate checks that the user type definition is consistent: it has a name and all user and media
types used in fields support the API versions that use the type.



### func (\*UserTypeDefinition) Versions
``` go
func (u *UserTypeDefinition) Versions() []string
```
Versions returns all the API versions that use the type.



## type UserTypeIterator
``` go
type UserTypeIterator func(m *UserTypeDefinition) error
```
UserTypeIterator is the type of functions given to IterateUserTypes.











## type VersionIterator
``` go
type VersionIterator func(v *APIVersionDefinition) error
```
VersionIterator is the type of functions given to IterateVersions.











## type ViewDefinition
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











### func (\*ViewDefinition) Context
``` go
func (v *ViewDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*ViewDefinition) Validate
``` go
func (v *ViewDefinition) Validate() *dslengine.ValidationErrors
```
Validate checks that the view definition is consistent: it has a  parent media type and the
underlying definition type is consistent.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)