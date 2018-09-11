+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/http/codegen/openapi"
+++


# openapi
`import "github.com/goadesign/goa/http/codegen/openapi"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func ExtensionsFromExpr(mdata design.MetadataExpr) map[string]interface{}](#ExtensionsFromExpr)
* [func GenerateResultTypeDefinition(api *design.APIExpr, mt *design.ResultTypeExpr, view string)](#GenerateResultTypeDefinition)
* [func GenerateServiceDefinition(api *design.APIExpr, res *httpdesign.ServiceExpr)](#GenerateServiceDefinition)
* [func GenerateTypeDefinition(api *design.APIExpr, ut *design.UserTypeExpr)](#GenerateTypeDefinition)
* [func GenerateTypeDefinitionWithName(api *design.APIExpr, ut *design.UserTypeExpr, typeName string)](#GenerateTypeDefinitionWithName)
* [func ResultTypeRef(api *design.APIExpr, mt *design.ResultTypeExpr, view string) string](#ResultTypeRef)
* [func ResultTypeRefWithPrefix(api *design.APIExpr, mt *design.ResultTypeExpr, view string, prefix string) string](#ResultTypeRefWithPrefix)
* [func TypeRef(api *design.APIExpr, ut *design.UserTypeExpr) string](#TypeRef)
* [func TypeRefWithPrefix(api *design.APIExpr, ut *design.UserTypeExpr, prefix string) string](#TypeRefWithPrefix)
* [type ExternalDocs](#ExternalDocs)
* [type Header](#Header)
* [type Info](#Info)
  * [func (i Info) MarshalJSON() ([]byte, error)](#Info.MarshalJSON)
* [type Items](#Items)
* [type Link](#Link)
* [type Media](#Media)
* [type Operation](#Operation)
  * [func (o Operation) MarshalJSON() ([]byte, error)](#Operation.MarshalJSON)
* [type Parameter](#Parameter)
  * [func (p Parameter) MarshalJSON() ([]byte, error)](#Parameter.MarshalJSON)
* [type Path](#Path)
  * [func (p Path) MarshalJSON() ([]byte, error)](#Path.MarshalJSON)
* [type Response](#Response)
  * [func (r Response) MarshalJSON() ([]byte, error)](#Response.MarshalJSON)
* [type Schema](#Schema)
  * [func APISchema(api *design.APIExpr, r *httpdesign.RootExpr) *Schema](#APISchema)
  * [func AttributeTypeSchema(api *design.APIExpr, at *design.AttributeExpr) *Schema](#AttributeTypeSchema)
  * [func AttributeTypeSchemaWithPrefix(api *design.APIExpr, at *design.AttributeExpr, prefix string) *Schema](#AttributeTypeSchemaWithPrefix)
  * [func NewSchema() *Schema](#NewSchema)
  * [func TypeSchema(api *design.APIExpr, t design.DataType) *Schema](#TypeSchema)
  * [func TypeSchemaWithPrefix(api *design.APIExpr, t design.DataType, prefix string) *Schema](#TypeSchemaWithPrefix)
  * [func (s *Schema) Dup() *Schema](#Schema.Dup)
  * [func (s *Schema) JSON() ([]byte, error)](#Schema.JSON)
  * [func (s *Schema) Merge(other *Schema)](#Schema.Merge)
* [type Scope](#Scope)
* [type SecurityDefinition](#SecurityDefinition)
  * [func (s SecurityDefinition) MarshalJSON() ([]byte, error)](#SecurityDefinition.MarshalJSON)
* [type Tag](#Tag)
  * [func (t Tag) MarshalJSON() ([]byte, error)](#Tag.MarshalJSON)
* [type Type](#Type)
* [type V2](#V2)
  * [func NewV2(root *httpdesign.RootExpr) (*V2, error)](#NewV2)


#### <a name="pkg-files">Package files</a>
[json_schema.go](/src/github.com/goadesign/goa/http/codegen/openapi/json_schema.go) [openapi_v2.go](/src/github.com/goadesign/goa/http/codegen/openapi/openapi_v2.go) [openapi_v2_builder.go](/src/github.com/goadesign/goa/http/codegen/openapi/openapi_v2_builder.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // Array represents a JSON array.
    Array Type = "array"
    // Boolean represents a JSON boolean.
    Boolean = "boolean"
    // Integer represents a JSON number without a fraction or exponent part.
    Integer = "integer"
    // Number represents any JSON number. Number includes integer.
    Number = "number"
    // Null represents the JSON null value.
    Null = "null"
    // Object represents a JSON object.
    Object = "object"
    // String represents a JSON string.
    String = "string"
    // File is an extension used by Swagger to represent a file download.
    File = "file"
)
```
``` go
const SchemaRef = "https://json-schema.org/draft-04/hyper-schema"
```
SchemaRef is the JSON Hyper-schema standard href.


## <a name="pkg-variables">Variables</a>
``` go
var (
    // Definitions contains the generated JSON schema definitions
    Definitions map[string]*Schema
)
```


## <a name="ExtensionsFromExpr">func</a> [ExtensionsFromExpr](/src/target/openapi_v2_builder.go?s=3005:3078#L121)
``` go
func ExtensionsFromExpr(mdata design.MetadataExpr) map[string]interface{}
```
ExtensionsFromExpr generates swagger extensions from the given metadata
expression.



## <a name="GenerateResultTypeDefinition">func</a> [GenerateResultTypeDefinition](/src/target/json_schema.go?s=9236:9330#L263)
``` go
func GenerateResultTypeDefinition(api *design.APIExpr, mt *design.ResultTypeExpr, view string)
```
GenerateResultTypeDefinition produces the JSON schema corresponding to the
given media type and given view.



## <a name="GenerateServiceDefinition">func</a> [GenerateServiceDefinition](/src/target/json_schema.go?s=5877:5957#L164)
``` go
func GenerateServiceDefinition(api *design.APIExpr, res *httpdesign.ServiceExpr)
```
GenerateServiceDefinition produces the JSON schema corresponding to the given
service. It stores the results in cachedSchema.



## <a name="GenerateTypeDefinition">func</a> [GenerateTypeDefinition](/src/target/json_schema.go?s=9634:9707#L275)
``` go
func GenerateTypeDefinition(api *design.APIExpr, ut *design.UserTypeExpr)
```
GenerateTypeDefinition produces the JSON schema corresponding to the given
type.



## <a name="GenerateTypeDefinitionWithName">func</a> [GenerateTypeDefinitionWithName](/src/target/json_schema.go?s=9886:9984#L281)
``` go
func GenerateTypeDefinitionWithName(api *design.APIExpr, ut *design.UserTypeExpr, typeName string)
```
GenerateTypeDefinitionWithName produces the JSON schema corresponding to the given
type with provided type name.



## <a name="ResultTypeRef">func</a> [ResultTypeRef](/src/target/json_schema.go?s=7611:7697#L223)
``` go
func ResultTypeRef(api *design.APIExpr, mt *design.ResultTypeExpr, view string) string
```
ResultTypeRef produces the JSON reference to the media type definition with
the given view.



## <a name="ResultTypeRefWithPrefix">func</a> [ResultTypeRefWithPrefix](/src/target/json_schema.go?s=7907:8018#L229)
``` go
func ResultTypeRefWithPrefix(api *design.APIExpr, mt *design.ResultTypeExpr, view string, prefix string) string
```
ResultTypeRefWithPrefix produces the JSON reference to the media type definition with
the given view and adds the provided prefix to the type name



## <a name="TypeRef">func</a> [TypeRef](/src/target/json_schema.go?s=8496:8561#L243)
``` go
func TypeRef(api *design.APIExpr, ut *design.UserTypeExpr) string
```
TypeRef produces the JSON reference to the type definition.



## <a name="TypeRefWithPrefix">func</a> [TypeRefWithPrefix](/src/target/json_schema.go?s=8823:8913#L252)
``` go
func TypeRefWithPrefix(api *design.APIExpr, ut *design.UserTypeExpr, prefix string) string
```
TypeRefWithPrefix produces the JSON reference to the type definition and adds the provided prefix
to the type name




## <a name="ExternalDocs">type</a> [ExternalDocs](/src/target/openapi_v2.go?s=14616:14924#L237)
``` go
type ExternalDocs struct {
    // Description is a short description of the target documentation.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    // URL for the target documentation.
    URL string `json:"url" yaml:"url"`
}

```
ExternalDocs allows referencing an external document for extended
documentation.










## <a name="Header">type</a> [Header](/src/target/openapi_v2.go?s=10448:12707#L171)
``` go
type Header struct {
    // Description is a brief description of the parameter.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    //  Type of the header. it is limited to simple types (that is, not an object).
    Type string `json:"type,omitempty" yaml:"type,omitempty"`
    // Format is the extending format for the previously mentioned type.
    Format string `json:"format,omitempty" yaml:"format,omitempty"`
    // Items describes the type of items in the array if type is "array".
    Items *Items `json:"items,omitempty" yaml:"items,omitempty"`
    // CollectionFormat determines the format of the array if type array is used.
    // Possible values are csv, ssv, tsv, pipes and multi.
    CollectionFormat string `json:"collectionFormat,omitempty" yaml:"collectionFormat,omitempty"`
    // Default declares the value of the parameter that the server will use if none is
    // provided, for example a "count" to control the number of results per page might
    // default to 100 if not supplied by the client in the request.
    Default          interface{}   `json:"default,omitempty" yaml:"default,omitempty"`
    Maximum          *float64      `json:"maximum,omitempty" yaml:"maximum,omitempty"`
    ExclusiveMaximum bool          `json:"exclusiveMaximum,omitempty" yaml:"exclusiveMaximum,omitempty"`
    Minimum          *float64      `json:"minimum,omitempty" yaml:"minimum,omitempty"`
    ExclusiveMinimum bool          `json:"exclusiveMinimum,omitempty" yaml:"exclusiveMinimum,omitempty"`
    MaxLength        *int          `json:"maxLength,omitempty" yaml:"maxLength,omitempty"`
    MinLength        *int          `json:"minLength,omitempty" yaml:"minLength,omitempty"`
    Pattern          string        `json:"pattern,omitempty" yaml:"pattern,omitempty"`
    MaxItems         *int          `json:"maxItems,omitempty" yaml:"maxItems,omitempty"`
    MinItems         *int          `json:"minItems,omitempty" yaml:"minItems,omitempty"`
    UniqueItems      bool          `json:"uniqueItems,omitempty" yaml:"uniqueItems,omitempty"`
    Enum             []interface{} `json:"enum,omitempty" yaml:"enum,omitempty"`
    MultipleOf       float64       `json:"multipleOf,omitempty" yaml:"multipleOf,omitempty"`
}

```
Header represents a header parameter.










## <a name="Info">type</a> [Info](/src/target/openapi_v2.go?s=1840:2466#L31)
``` go
type Info struct {
    Title          string                 `json:"title,omitempty" yaml:"title,omitempty"`
    Description    string                 `json:"description,omitempty" yaml:"description,omitempty"`
    TermsOfService string                 `json:"termsOfService,omitempty" yaml:"termsOfService,omitempty"`
    Contact        *design.ContactExpr    `json:"contact,omitempty" yaml:"contact,omitempty"`
    License        *design.LicenseExpr    `json:"license,omitempty" yaml:"license,omitempty"`
    Version        string                 `json:"version" yaml:"version"`
    Extensions     map[string]interface{} `json:"-" yaml:"-"`
}

```
Info provides metadata about the API. The metadata can be used by the clients if needed,
and can be presented in the OpenAPI UI for convenience.










### <a name="Info.MarshalJSON">func</a> (Info) [MarshalJSON](/src/target/openapi_v2.go?s=18702:18745#L323)
``` go
func (i Info) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of i.




## <a name="Items">type</a> [Items](/src/target/openapi_v2.go?s=15060:17120#L247)
``` go
type Items struct {
    //  Type of the items. it is limited to simple types (that is, not an object).
    Type string `json:"type,omitempty" yaml:"type,omitempty"`
    // Format is the extending format for the previously mentioned type.
    Format string `json:"format,omitempty" yaml:"format,omitempty"`
    // Items describes the type of items in the array if type is "array".
    Items *Items `json:"items,omitempty" yaml:"items,omitempty"`
    // CollectionFormat determines the format of the array if type array is used.
    // Possible values are csv, ssv, tsv, pipes and multi.
    CollectionFormat string `json:"collectionFormat,omitempty" yaml:"collectionFormat,omitempty"`
    // Default declares the value of the parameter that the server will use if none is
    // provided, for example a "count" to control the number of results per page might
    // default to 100 if not supplied by the client in the request.
    Default          interface{}   `json:"default,omitempty" yaml:"default,omitempty"`
    Maximum          *float64      `json:"maximum,omitempty" yaml:"maximum,omitempty"`
    ExclusiveMaximum bool          `json:"exclusiveMaximum,omitempty" yaml:"exclusiveMaximum,omitempty"`
    Minimum          *float64      `json:"minimum,omitempty" yaml:"minimum,omitempty"`
    ExclusiveMinimum bool          `json:"exclusiveMinimum,omitempty" yaml:"exclusiveMinimum,omitempty"`
    MaxLength        *int          `json:"maxLength,omitempty" yaml:"maxLength,omitempty"`
    MinLength        *int          `json:"minLength,omitempty" yaml:"minLength,omitempty"`
    Pattern          string        `json:"pattern,omitempty" yaml:"pattern,omitempty"`
    MaxItems         *int          `json:"maxItems,omitempty" yaml:"maxItems,omitempty"`
    MinItems         *int          `json:"minItems,omitempty" yaml:"minItems,omitempty"`
    UniqueItems      bool          `json:"uniqueItems,omitempty" yaml:"uniqueItems,omitempty"`
    Enum             []interface{} `json:"enum,omitempty" yaml:"enum,omitempty"`
    MultipleOf       float64       `json:"multipleOf,omitempty" yaml:"multipleOf,omitempty"`
}

```
Items is a limited subset of JSON-Schema's items object. It is used by parameter
definitions that are not located in "body".










## <a name="Link">type</a> [Link](/src/target/json_schema.go?s=2980:3671#L65)
``` go
type Link struct {
    Title        string  `json:"title,omitempty" yaml:"title,omitempty"`
    Description  string  `json:"description,omitempty" yaml:"description,omitempty"`
    Rel          string  `json:"rel,omitempty" yaml:"rel,omitempty"`
    Href         string  `json:"href,omitempty" yaml:"href,omitempty"`
    Method       string  `json:"method,omitempty" yaml:"method,omitempty"`
    Schema       *Schema `json:"schema,omitempty" yaml:"schema,omitempty"`
    TargetSchema *Schema `json:"targetSchema,omitempty" yaml:"targetSchema,omitempty"`
    ResultType   string  `json:"mediaType,omitempty" yaml:"mediaType,omitempty"`
    EncType      string  `json:"encType,omitempty" yaml:"encType,omitempty"`
}

```
Link represents a "link" field in a JSON hyper schema.










## <a name="Media">type</a> [Media](/src/target/json_schema.go?s=2741:2918#L59)
``` go
type Media struct {
    BinaryEncoding string `json:"binaryEncoding,omitempty" yaml:"binaryEncoding,omitempty"`
    Type           string `json:"type,omitempty" yaml:"type,omitempty"`
}

```
Media represents a "media" field in a JSON hyper schema.










## <a name="Operation">type</a> [Operation](/src/target/openapi_v2.go?s=3846:6019#L67)
``` go
type Operation struct {
    // Tags is a list of tags for API documentation control. Tags
    // can be used for logical grouping of operations by services or
    // any other qualifier.
    Tags []string `json:"tags,omitempty" yaml:"tags,omitempty"`
    // Summary is a short summary of what the operation does. For maximum readability
    // in the swagger-ui, this field should be less than 120 characters.
    Summary string `json:"summary,omitempty" yaml:"summary,omitempty"`
    // Description is a verbose explanation of the operation behavior.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    // ExternalDocs points to additional external documentation for this operation.
    ExternalDocs *ExternalDocs `json:"externalDocs,omitempty" yaml:"externalDocs,omitempty"`
    // OperationID is a unique string used to identify the operation.
    OperationID string `json:"operationId,omitempty" yaml:"operationId,omitempty"`
    // Consumes is a list of MIME types the operation can consume.
    Consumes []string `json:"consumes,omitempty" yaml:"consumes,omitempty"`
    // Produces is a list of MIME types the operation can produce.
    Produces []string `json:"produces,omitempty" yaml:"produces,omitempty"`
    // Parameters is a list of parameters that are applicable for this operation.
    Parameters []*Parameter `json:"parameters,omitempty" yaml:"parameters,omitempty"`
    // Responses is the list of possible responses as they are returned from executing
    // this operation.
    Responses map[string]*Response `json:"responses,omitempty" yaml:"responses,omitempty"`
    // Schemes is the transfer protocol for the operation.
    Schemes []string `json:"schemes,omitempty" yaml:"schemes,omitempty"`
    // Deprecated declares this operation to be deprecated.
    Deprecated bool `json:"deprecated,omitempty" yaml:"deprecated,omitempty"`
    // Security is a declaration of which security schemes are applied for this operation.
    Security []map[string][]string `json:"security,omitempty" yaml:"security,omitempty"`
    // Extensions defines the swagger extensions.
    Extensions map[string]interface{} `json:"-" yaml:"-"`
}

```
Operation describes a single API operation on a path.










### <a name="Operation.MarshalJSON">func</a> (Operation) [MarshalJSON](/src/target/openapi_v2.go?s=18982:19030#L333)
``` go
func (o Operation) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of o.




## <a name="Parameter">type</a> [Parameter](/src/target/openapi_v2.go?s=6076:9400#L102)
``` go
type Parameter struct {
    // Name of the parameter. Parameter names are case sensitive.
    Name string `json:"name" yaml:"name"`
    // In is the location of the parameter.
    // Possible values are "query", "header", "path", "formData" or "body".
    In string `json:"in" yaml:"in"`
    // Description is a brief description of the parameter.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    // Required determines whether this parameter is mandatory.
    Required bool `json:"required" yaml:"required"`
    // Schema defining the type used for the body parameter, only if "in" is body
    Schema *Schema `json:"schema,omitempty" yaml:"schema,omitempty"`

    //  Type of the parameter. Since the parameter is not located at the request body,
    // it is limited to simple types (that is, not an object).
    Type string `json:"type,omitempty" yaml:"type,omitempty"`
    // Format is the extending format for the previously mentioned type.
    Format string `json:"format,omitempty" yaml:"format,omitempty"`
    // AllowEmptyValue sets the ability to pass empty-valued parameters.
    // This is valid only for either query or formData parameters and allows you to
    // send a parameter with a name only or an empty value. Default value is false.
    AllowEmptyValue bool `json:"allowEmptyValue,omitempty" yaml:"allowEmptyValue,omitempty"`
    // Items describes the type of items in the array if type is "array".
    Items *Items `json:"items,omitempty" yaml:"items,omitempty"`
    // CollectionFormat determines the format of the array if type array is used.
    // Possible values are csv, ssv, tsv, pipes and multi.
    CollectionFormat string `json:"collectionFormat,omitempty" yaml:"collectionFormat,omitempty"`
    // Default declares the value of the parameter that the server will use if none is
    // provided, for example a "count" to control the number of results per page might
    // default to 100 if not supplied by the client in the request.
    Default          interface{}   `json:"default,omitempty" yaml:"default,omitempty"`
    Maximum          *float64      `json:"maximum,omitempty" yaml:"maximum,omitempty"`
    ExclusiveMaximum bool          `json:"exclusiveMaximum,omitempty" yaml:"exclusiveMaximum,omitempty"`
    Minimum          *float64      `json:"minimum,omitempty" yaml:"minimum,omitempty"`
    ExclusiveMinimum bool          `json:"exclusiveMinimum,omitempty" yaml:"exclusiveMinimum,omitempty"`
    MaxLength        *int          `json:"maxLength,omitempty" yaml:"maxLength,omitempty"`
    MinLength        *int          `json:"minLength,omitempty" yaml:"minLength,omitempty"`
    Pattern          string        `json:"pattern,omitempty" yaml:"pattern,omitempty"`
    MaxItems         *int          `json:"maxItems,omitempty" yaml:"maxItems,omitempty"`
    MinItems         *int          `json:"minItems,omitempty" yaml:"minItems,omitempty"`
    UniqueItems      bool          `json:"uniqueItems,omitempty" yaml:"uniqueItems,omitempty"`
    Enum             []interface{} `json:"enum,omitempty" yaml:"enum,omitempty"`
    MultipleOf       float64       `json:"multipleOf,omitempty" yaml:"multipleOf,omitempty"`
    // Extensions defines the swagger extensions.
    Extensions map[string]interface{} `json:"-" yaml:"-"`
}

```
Parameter describes a single operation parameter.










### <a name="Parameter.MarshalJSON">func</a> (Parameter) [MarshalJSON](/src/target/openapi_v2.go?s=19132:19180#L338)
``` go
func (p Parameter) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of p.




## <a name="Path">type</a> [Path](/src/target/openapi_v2.go?s=2532:3785#L42)
``` go
type Path struct {
    // Ref allows for an external definition of this path item.
    Ref string `json:"$ref,omitempty" yaml:"$ref,omitempty"`
    // Get defines a GET operation on this path.
    Get *Operation `json:"get,omitempty" yaml:"get,omitempty"`
    // Put defines a PUT operation on this path.
    Put *Operation `json:"put,omitempty" yaml:"put,omitempty"`
    // Post defines a POST operation on this path.
    Post *Operation `json:"post,omitempty" yaml:"post,omitempty"`
    // Delete defines a DELETE operation on this path.
    Delete *Operation `json:"delete,omitempty" yaml:"delete,omitempty"`
    // Options defines a OPTIONS operation on this path.
    Options *Operation `json:"options,omitempty" yaml:"options,omitempty"`
    // Head defines a HEAD operation on this path.
    Head *Operation `json:"head,omitempty" yaml:"head,omitempty"`
    // Patch defines a PATCH operation on this path.
    Patch *Operation `json:"patch,omitempty" yaml:"patch,omitempty"`
    // Parameters is the list of parameters that are applicable for all the operations
    // described under this path.
    Parameters []*Parameter `json:"parameters,omitempty" yaml:"parameters,omitempty"`
    // Extensions defines the swagger extensions.
    Extensions map[string]interface{} `json:"-" yaml:"-"`
}

```
Path holds the relative paths to the individual endpoints.










### <a name="Path.MarshalJSON">func</a> (Path) [MarshalJSON](/src/target/openapi_v2.go?s=18842:18885#L328)
``` go
func (p Path) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of p.




## <a name="Response">type</a> [Response](/src/target/openapi_v2.go?s=9449:10403#L153)
``` go
type Response struct {
    // Description of the response. GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    // Schema is a definition of the response structure. It can be a primitive,
    // an array or an object. If this field does not exist, it means no content is
    // returned as part of the response. As an extension to the Schema Object, its root
    // type value may also be "file".
    Schema *Schema `json:"schema,omitempty" yaml:"schema,omitempty"`
    // Headers is a list of headers that are sent with the response.
    Headers map[string]*Header `json:"headers,omitempty" yaml:"headers,omitempty"`
    // Ref references a global API response.
    // This field is exclusive with the other fields of Response.
    Ref string `json:"$ref,omitempty" yaml:"$ref,omitempty"`
    // Extensions defines the swagger extensions.
    Extensions map[string]interface{} `json:"-" yaml:"-"`
}

```
Response describes an operation response.










### <a name="Response.MarshalJSON">func</a> (Response) [MarshalJSON](/src/target/openapi_v2.go?s=19282:19329#L343)
``` go
func (r Response) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of r.




## <a name="Schema">type</a> [Schema](/src/target/json_schema.go?s=279:2631#L18)
``` go
type Schema struct {
    Schema string `json:"$schema,omitempty" yaml:"$schema,omitempty"`
    // Core schema
    ID           string             `json:"id,omitempty" yaml:"id,omitempty"`
    Title        string             `json:"title,omitempty" yaml:"title,omitempty"`
    Type         Type               `json:"type,omitempty" yaml:"type,omitempty"`
    Items        *Schema            `json:"items,omitempty" yaml:"items,omitempty"`
    Properties   map[string]*Schema `json:"properties,omitempty" yaml:"properties,omitempty"`
    Definitions  map[string]*Schema `json:"definitions,omitempty" yaml:"definitions,omitempty"`
    Description  string             `json:"description,omitempty" yaml:"description,omitempty"`
    DefaultValue interface{}        `json:"default,omitempty" yaml:"default,omitempty"`
    Example      interface{}        `json:"example,omitempty" yaml:"example,omitempty"`

    // Hyper schema
    Media     *Media  `json:"media,omitempty" yaml:"media,omitempty"`
    ReadOnly  bool    `json:"readOnly,omitempty" yaml:"readOnly,omitempty"`
    PathStart string  `json:"pathStart,omitempty" yaml:"pathStart,omitempty"`
    Links     []*Link `json:"links,omitempty" yaml:"links,omitempty"`
    Ref       string  `json:"$ref,omitempty" yaml:"$ref,omitempty"`

    // Validation
    Enum                 []interface{} `json:"enum,omitempty" yaml:"enum,omitempty"`
    Format               string        `json:"format,omitempty" yaml:"format,omitempty"`
    Pattern              string        `json:"pattern,omitempty" yaml:"pattern,omitempty"`
    Minimum              *float64      `json:"minimum,omitempty" yaml:"minimum,omitempty"`
    Maximum              *float64      `json:"maximum,omitempty" yaml:"maximum,omitempty"`
    MinLength            *int          `json:"minLength,omitempty" yaml:"minLength,omitempty"`
    MaxLength            *int          `json:"maxLength,omitempty" yaml:"maxLength,omitempty"`
    MinItems             *int          `json:"minItems,omitempty" yaml:"minItems,omitempty"`
    MaxItems             *int          `json:"maxItems,omitempty" yaml:"maxItems,omitempty"`
    Required             []string      `json:"required,omitempty" yaml:"required,omitempty"`
    AdditionalProperties bool          `json:"additionalProperties,omitempty" yaml:"additionalProperties,omitempty"`

    // Union
    AnyOf []*Schema `json:"anyOf,omitempty" yaml:"anyOf,omitempty"`
}

```
Schema represents an instance of a JSON schema.
See <a href="https://json-schema.org/documentation.html">https://json-schema.org/documentation.html</a>







### <a name="APISchema">func</a> [APISchema](/src/target/json_schema.go?s=5061:5128#L130)
``` go
func APISchema(api *design.APIExpr, r *httpdesign.RootExpr) *Schema
```
APISchema produces the API JSON hyper schema.


### <a name="AttributeTypeSchema">func</a> [AttributeTypeSchema](/src/target/json_schema.go?s=16477:16556#L501)
``` go
func AttributeTypeSchema(api *design.APIExpr, at *design.AttributeExpr) *Schema
```
AttributeTypeSchema produces the JSON schema corresponding to the given attribute.


### <a name="AttributeTypeSchemaWithPrefix">func</a> [AttributeTypeSchemaWithPrefix](/src/target/json_schema.go?s=16757:16861#L507)
``` go
func AttributeTypeSchemaWithPrefix(api *design.APIExpr, at *design.AttributeExpr, prefix string) *Schema
```
AttributeTypeSchemaWithPrefix produces the JSON schema corresponding to the given attribute
and adds the provided prefix to the type name


### <a name="NewSchema">func</a> [NewSchema](/src/target/json_schema.go?s=4595:4619#L111)
``` go
func NewSchema() *Schema
```
NewSchema instantiates a new JSON schema.


### <a name="TypeSchema">func</a> [TypeSchema](/src/target/json_schema.go?s=10234:10297#L293)
``` go
func TypeSchema(api *design.APIExpr, t design.DataType) *Schema
```
TypeSchema produces the JSON schema corresponding to the given data type.


### <a name="TypeSchemaWithPrefix">func</a> [TypeSchemaWithPrefix](/src/target/json_schema.go?s=10479:10567#L299)
``` go
func TypeSchemaWithPrefix(api *design.APIExpr, t design.DataType, prefix string) *Schema
```
TypeSchemaWithPrefix produces the JSON schema corresponding to the given data type
and adds the provided prefix to the type name





### <a name="Schema.Dup">func</a> (\*Schema) [Dup](/src/target/json_schema.go?s=14187:14217#L415)
``` go
func (s *Schema) Dup() *Schema
```
Dup creates a shallow clone of the given schema.




### <a name="Schema.JSON">func</a> (\*Schema) [JSON](/src/target/json_schema.go?s=4899:4938#L122)
``` go
func (s *Schema) JSON() ([]byte, error)
```
JSON serializes the schema into JSON.
It makes sure the "$schema" standard field is set if needed prior to
delegating to the standard // JSON marshaler.




### <a name="Schema.Merge">func</a> (\*Schema) [Merge](/src/target/json_schema.go?s=13487:13524#L382)
``` go
func (s *Schema) Merge(other *Schema)
```
Merge does a two level deep merge of other into s.




## <a name="Scope">type</a> [Scope](/src/target/openapi_v2.go?s=14399:14524#L230)
``` go
type Scope struct {
    // Description for scope
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
}

```
Scope corresponds to an available scope for an OAuth2 security scheme.










## <a name="SecurityDefinition">type</a> [SecurityDefinition](/src/target/openapi_v2.go?s=13001:14321#L206)
``` go
type SecurityDefinition struct {
    // Type of the security scheme. Valid values are "basic", "apiKey" or "oauth2".
    Type string `json:"type" yaml:"type"`
    // Description for security scheme
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    // Name of the header or query parameter to be used when type is "apiKey".
    Name string `json:"name,omitempty" yaml:"name,omitempty"`
    // In is the location of the API key when type is "apiKey".
    // Valid values are "query" or "header".
    In string `json:"in,omitempty" yaml:"in,omitempty"`
    // Flow is the flow used by the OAuth2 security scheme when type is "oauth2"
    // Valid values are "implicit", "password", "application" or "accessCode".
    Flow string `json:"flow,omitempty" yaml:"flow,omitempty"`
    // The oauth2 authorization URL to be used for this flow.
    AuthorizationURL string `json:"authorizationUrl,omitempty" yaml:"authorizationUrl,omitempty"`
    // TokenURL  is the token URL to be used for this flow.
    TokenURL string `json:"tokenUrl,omitempty" yaml:"tokenUrl,omitempty"`
    // Scopes list the  available scopes for the OAuth2 security scheme.
    Scopes map[string]string `json:"scopes,omitempty" yaml:"scopes,omitempty"`
    // Extensions defines the swagger extensions.
    Extensions map[string]interface{} `json:"-" yaml:"-"`
}

```
SecurityDefinition allows the definition of a security scheme that can be used by the
operations. Supported schemes are basic authentication, an API key (either as a header or
as a query parameter) and OAuth2's common flows (implicit, password, application and
access code).










### <a name="SecurityDefinition.MarshalJSON">func</a> (SecurityDefinition) [MarshalJSON](/src/target/openapi_v2.go?s=19430:19487#L348)
``` go
func (s SecurityDefinition) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of s.




## <a name="Tag">type</a> [Tag](/src/target/openapi_v2.go?s=17274:17826#L277)
``` go
type Tag struct {
    // Name of the tag.
    Name string `json:"name,omitempty" yaml:"name,omitempty"`
    // Description is a short description of the tag.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty" yaml:"description,omitempty"`
    // ExternalDocs is additional external documentation for this tag.
    ExternalDocs *ExternalDocs `json:"externalDocs,omitempty" yaml:"externalDocs,omitempty"`
    // Extensions defines the swagger extensions.
    Extensions map[string]interface{} `json:"-" yaml:"-"`
}

```
Tag allows adding meta data to a single tag that is used by the Operation Object. It is
not mandatory to have a Tag Object per tag used there.










### <a name="Tag.MarshalJSON">func</a> (Tag) [MarshalJSON](/src/target/openapi_v2.go?s=19598:19640#L353)
``` go
func (t Tag) MarshalJSON() ([]byte, error)
```
MarshalJSON returns the JSON encoding of t.




## <a name="Type">type</a> [Type](/src/target/json_schema.go?s=2666:2677#L56)
``` go
type Type string
```
Type is the JSON type enum.










## <a name="V2">type</a> [V2](/src/target/openapi_v2.go?s=184:1684#L12)
``` go
type V2 struct {
    Swagger             string                         `json:"swagger,omitempty" yaml:"swagger,omitempty"`
    Info                *Info                          `json:"info,omitempty" yaml:"info,omitempty"`
    Host                string                         `json:"host,omitempty" yaml:"host,omitempty"`
    BasePath            string                         `json:"basePath,omitempty" yaml:"basePath,omitempty"`
    Schemes             []string                       `json:"schemes,omitempty" yaml:"schemes,omitempty"`
    Consumes            []string                       `json:"consumes,omitempty" yaml:"consumes,omitempty"`
    Produces            []string                       `json:"produces,omitempty" yaml:"produces,omitempty"`
    Paths               map[string]interface{}         `json:"paths" yaml:"paths"`
    Definitions         map[string]*Schema             `json:"definitions,omitempty" yaml:"definitions,omitempty"`
    Parameters          map[string]*Parameter          `json:"parameters,omitempty" yaml:"parameters,omitempty"`
    Responses           map[string]*Response           `json:"responses,omitempty" yaml:"responses,omitempty"`
    SecurityDefinitions map[string]*SecurityDefinition `json:"securityDefinitions,omitempty" yaml:"securityDefinitions,omitempty"`
    Tags                []*Tag                         `json:"tags,omitempty" yaml:"tags,omitempty"`
    ExternalDocs        *ExternalDocs                  `json:"externalDocs,omitempty" yaml:"externalDocs,omitempty"`
}

```
V2 represents an instance of a Swagger object.
See <a href="https://github.com/OAI/OpenAPI-Specification">https://github.com/OAI/OpenAPI-Specification</a>







### <a name="NewV2">func</a> [NewV2](/src/target/openapi_v2_builder.go?s=323:373#L19)
``` go
func NewV2(root *httpdesign.RootExpr) (*V2, error)
```
NewV2 returns the OpenAPI v2 specification for the given API.









- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
