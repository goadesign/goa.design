+++
date="2019-03-09T22:12:52-08:00"
description="github.com/goadesign/goa/goagen/gen_schema"
+++


# genschema
`import "github.com/goadesign/goa/goagen/gen_schema"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>
Package genschema provides a generator for the JSON schema controller.
The schema controller responds to GET /schema requests with the API JSON Hyper-schema.
This JSON schema can be used to generate API documentation, ruby and Go API clients.
See the blog post (<a href="https://blog.heroku.com/archives/2014/1/8/json_schema_for_heroku_platform_api">https://blog.heroku.com/archives/2014/1/8/json_schema_for_heroku_platform_api</a>)
describing how Heroku leverages the JSON Hyper-schema standard (<a href="http://json-schema.org/latest/json-schema-hypermedia.html">http://json-schema.org/latest/json-schema-hypermedia.html</a>)
for more information.




## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func Generate() (files []string, err error)](#Generate)
* [func GenerateMediaTypeDefinition(api *design.APIDefinition, mt *design.MediaTypeDefinition, view string)](#GenerateMediaTypeDefinition)
* [func GenerateResourceDefinition(api *design.APIDefinition, r *design.ResourceDefinition)](#GenerateResourceDefinition)
* [func GenerateTypeDefinition(api *design.APIDefinition, ut *design.UserTypeDefinition)](#GenerateTypeDefinition)
* [func MediaTypeRef(api *design.APIDefinition, mt *design.MediaTypeDefinition, view string) string](#MediaTypeRef)
* [func TypeRef(api *design.APIDefinition, ut *design.UserTypeDefinition) string](#TypeRef)
* [type Generator](#Generator)
  * [func NewGenerator(options ...Option) *Generator](#NewGenerator)
  * [func (g *Generator) Cleanup()](#Generator.Cleanup)
  * [func (g *Generator) Generate() (_ []string, err error)](#Generator.Generate)
* [type JSONLink](#JSONLink)
* [type JSONMedia](#JSONMedia)
* [type JSONSchema](#JSONSchema)
  * [func APISchema(api *design.APIDefinition) *JSONSchema](#APISchema)
  * [func NewJSONSchema() *JSONSchema](#NewJSONSchema)
  * [func TypeSchema(api *design.APIDefinition, t design.DataType) *JSONSchema](#TypeSchema)
  * [func (s *JSONSchema) Dup() *JSONSchema](#JSONSchema.Dup)
  * [func (s *JSONSchema) JSON() ([]byte, error)](#JSONSchema.JSON)
  * [func (s *JSONSchema) Merge(other *JSONSchema)](#JSONSchema.Merge)
* [type JSONType](#JSONType)
* [type Option](#Option)
  * [func API(API *design.APIDefinition) Option](#API)
  * [func OutDir(outDir string) Option](#OutDir)


#### <a name="pkg-files">Package files</a>
[doc.go](/src/github.com/goadesign/goa/goagen/gen_schema/doc.go) [generator.go](/src/github.com/goadesign/goa/goagen/gen_schema/generator.go) [json_schema.go](/src/github.com/goadesign/goa/goagen/gen_schema/json_schema.go) [options.go](/src/github.com/goadesign/goa/goagen/gen_schema/options.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // JSONArray represents a JSON array.
    JSONArray JSONType = "array"
    // JSONBoolean represents a JSON boolean.
    JSONBoolean = "boolean"
    // JSONInteger represents a JSON number without a fraction or exponent part.
    JSONInteger = "integer"
    // JSONNumber represents any JSON number. Number includes integer.
    JSONNumber = "number"
    // JSONNull represents the JSON null value.
    JSONNull = "null"
    // JSONObject represents a JSON object.
    JSONObject = "object"
    // JSONString represents a JSON string.
    JSONString = "string"
    // JSONFile is an extension used by Swagger to represent a file download.
    JSONFile = "file"
)
```
``` go
const SchemaRef = "http://json-schema.org/draft-04/hyper-schema"
```
SchemaRef is the JSON Hyper-schema standard href.


## <a name="pkg-variables">Variables</a>
``` go
var (
    // Definitions contains the generated JSON schema definitions
    Definitions map[string]*JSONSchema
)
```


## <a name="Generate">func</a> [Generate](/src/target/generator.go?s=726:769#L34)
``` go
func Generate() (files []string, err error)
```
Generate is the generator entry point called by the meta generator.



## <a name="GenerateMediaTypeDefinition">func</a> [GenerateMediaTypeDefinition](/src/target/json_schema.go?s=8071:8175#L261)
``` go
func GenerateMediaTypeDefinition(api *design.APIDefinition, mt *design.MediaTypeDefinition, view string)
```
GenerateMediaTypeDefinition produces the JSON schema corresponding to the given media type and
given view.



## <a name="GenerateResourceDefinition">func</a> [GenerateResourceDefinition](/src/target/json_schema.go?s=5266:5354#L169)
``` go
func GenerateResourceDefinition(api *design.APIDefinition, r *design.ResourceDefinition)
```
GenerateResourceDefinition produces the JSON schema corresponding to the given API resource.
It stores the results in cachedSchema.



## <a name="GenerateTypeDefinition">func</a> [GenerateTypeDefinition](/src/target/json_schema.go?s=8479:8564#L272)
``` go
func GenerateTypeDefinition(api *design.APIDefinition, ut *design.UserTypeDefinition)
```
GenerateTypeDefinition produces the JSON schema corresponding to the given type.



## <a name="MediaTypeRef">func</a> [MediaTypeRef](/src/target/json_schema.go?s=7244:7340#L239)
``` go
func MediaTypeRef(api *design.APIDefinition, mt *design.MediaTypeDefinition, view string) string
```
MediaTypeRef produces the JSON reference to the media type definition with the given view.



## <a name="TypeRef">func</a> [TypeRef](/src/target/json_schema.go?s=7740:7817#L252)
``` go
func TypeRef(api *design.APIDefinition, ut *design.UserTypeDefinition) string
```
TypeRef produces the JSON reference to the type definition.




## <a name="Generator">type</a> [Generator](/src/target/generator.go?s=463:653#L27)
``` go
type Generator struct {
    API    *design.APIDefinition // The API definition
    OutDir string                // Path to output directory
    // contains filtered or unexported fields
}

```
Generator is the application code generator.







### <a name="NewGenerator">func</a> [NewGenerator](/src/target/generator.go?s=282:329#L16)
``` go
func NewGenerator(options ...Option) *Generator
```
NewGenerator returns an initialized instance of a JavaScript Client Generator





### <a name="Generator.Cleanup">func</a> (\*Generator) [Cleanup](/src/target/generator.go?s=1968:1997#L85)
``` go
func (g *Generator) Cleanup()
```
Cleanup removes all the files generated by this generator during the last invokation of Generate.




### <a name="Generator.Generate">func</a> (\*Generator) [Generate](/src/target/generator.go?s=1171:1225#L52)
``` go
func (g *Generator) Generate() (_ []string, err error)
```
Generate produces the skeleton main.




## <a name="JSONLink">type</a> [JSONLink](/src/target/json_schema.go?s=2293:2799#L64)
``` go
type JSONLink struct {
    Title        string      `json:"title,omitempty"`
    Description  string      `json:"description,omitempty"`
    Rel          string      `json:"rel,omitempty"`
    Href         string      `json:"href,omitempty"`
    Method       string      `json:"method,omitempty"`
    Schema       *JSONSchema `json:"schema,omitempty"`
    TargetSchema *JSONSchema `json:"targetSchema,omitempty"`
    MediaType    string      `json:"mediaType,omitempty"`
    EncType      string      `json:"encType,omitempty"`
}

```
JSONLink represents a "link" field in a JSON hyper schema.










## <a name="JSONMedia">type</a> [JSONMedia](/src/target/json_schema.go?s=2100:2227#L58)
``` go
type JSONMedia struct {
    BinaryEncoding string `json:"binaryEncoding,omitempty"`
    Type           string `json:"type,omitempty"`
}

```
JSONMedia represents a "media" field in a JSON hyper schema.










## <a name="JSONSchema">type</a> [JSONSchema](/src/target/json_schema.go?s=246:1978#L17)
``` go
type JSONSchema struct {
    Schema string `json:"$schema,omitempty"`
    // Core schema
    ID           string                 `json:"id,omitempty"`
    Title        string                 `json:"title,omitempty"`
    Type         JSONType               `json:"type,omitempty"`
    Items        *JSONSchema            `json:"items,omitempty"`
    Properties   map[string]*JSONSchema `json:"properties,omitempty"`
    Definitions  map[string]*JSONSchema `json:"definitions,omitempty"`
    Description  string                 `json:"description,omitempty"`
    DefaultValue interface{}            `json:"default,omitempty"`
    Example      interface{}            `json:"example,omitempty"`

    // Hyper schema
    Media     *JSONMedia  `json:"media,omitempty"`
    ReadOnly  bool        `json:"readOnly,omitempty"`
    PathStart string      `json:"pathStart,omitempty"`
    Links     []*JSONLink `json:"links,omitempty"`
    Ref       string      `json:"$ref,omitempty"`

    // Validation
    Enum                 []interface{} `json:"enum,omitempty"`
    Format               string        `json:"format,omitempty"`
    Pattern              string        `json:"pattern,omitempty"`
    Minimum              *float64      `json:"minimum,omitempty"`
    Maximum              *float64      `json:"maximum,omitempty"`
    MinLength            *int          `json:"minLength,omitempty"`
    MaxLength            *int          `json:"maxLength,omitempty"`
    MinItems             *int          `json:"minItems,omitempty"`
    MaxItems             *int          `json:"maxItems,omitempty"`
    Required             []string      `json:"required,omitempty"`
    AdditionalProperties bool          `json:"additionalProperties,omitempty"`

    // Union
    AnyOf []*JSONSchema `json:"anyOf,omitempty"`
}

```
JSONSchema represents an instance of a JSON schema.
See <a href="http://json-schema.org/documentation.html">http://json-schema.org/documentation.html</a>







### <a name="APISchema">func</a> [APISchema](/src/target/json_schema.go?s=4290:4343#L129)
``` go
func APISchema(api *design.APIDefinition) *JSONSchema
```
APISchema produces the API JSON hyper schema.


### <a name="NewJSONSchema">func</a> [NewJSONSchema](/src/target/json_schema.go?s=3803:3835#L110)
``` go
func NewJSONSchema() *JSONSchema
```
NewJSONSchema instantiates a new JSON schema.


### <a name="TypeSchema">func</a> [TypeSchema](/src/target/json_schema.go?s=8832:8905#L283)
``` go
func TypeSchema(api *design.APIDefinition, t design.DataType) *JSONSchema
```
TypeSchema produces the JSON schema corresponding to the given data type.





### <a name="JSONSchema.Dup">func</a> (\*JSONSchema) [Dup](/src/target/json_schema.go?s=12409:12447#L408)
``` go
func (s *JSONSchema) Dup() *JSONSchema
```
Dup creates a shallow clone of the given schema.




### <a name="JSONSchema.JSON">func</a> (\*JSONSchema) [JSON](/src/target/json_schema.go?s=4124:4167#L121)
``` go
func (s *JSONSchema) JSON() ([]byte, error)
```
JSON serializes the schema into JSON.
It makes sure the "$schema" standard field is set if needed prior to delegating to the standard
JSON marshaler.




### <a name="JSONSchema.Merge">func</a> (\*JSONSchema) [Merge](/src/target/json_schema.go?s=11697:11742#L375)
``` go
func (s *JSONSchema) Merge(other *JSONSchema)
```
Merge does a two level deep merge of other into s.




## <a name="JSONType">type</a> [JSONType](/src/target/json_schema.go?s=2017:2032#L55)
``` go
type JSONType string
```
JSONType is the JSON type enum.










## <a name="Option">type</a> [Option](/src/target/options.go?s=100:128#L6)
``` go
type Option func(*Generator)
```
Option a generator option definition







### <a name="API">func</a> [API](/src/target/options.go?s=155:197#L9)
``` go
func API(API *design.APIDefinition) Option
```
API The API definition


### <a name="OutDir">func</a> [OutDir](/src/target/options.go?s=283:316#L16)
``` go
func OutDir(outDir string) Option
```
OutDir Path to output directory









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
