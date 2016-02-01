+++
title="goa/goagen/gen_swagger"
date="2016-01-31"
description="godoc for goa/goagen/gen_swagger"
categories=["godoc"]
tags=["godoc","gen_swagger"]
+++

# genswagger
    import "github.com/goadesign/goa/goagen/gen_swagger"

Package genswagger provides a generator for the JSON swagger controller.
The swagger controller responds to GET /swagger requests with the API JSON Hyper-swagger.
This JSON swagger can be used to generate API documentation, ruby and Go API clients.
See the blog post (<a href="https://blog.heroku.com/archives/2014/1/8/json_swagger_for_heroku_platform_api">https://blog.heroku.com/archives/2014/1/8/json_swagger_for_heroku_platform_api</a>)
describing how Heroku leverages the JSON Hyper-swagger standard (<a href="http://json-swagger.org/latest/json-swagger-hypermedia.html">http://json-swagger.org/latest/json-swagger-hypermedia.html</a>)
for more information.






## func Generate
``` go
func Generate(api *design.APIDefinition) (files []string, err error)
```
Generate is the generator entry point called by the meta generator.



## type Command
``` go
type Command struct {
    *codegen.BaseCommand
}
```
Command is the goa application code generator command line data structure.
It implements meta.Command.









### func NewCommand
``` go
func NewCommand() *Command
```
NewCommand instantiates a new command.




### func (\*Command) Run
``` go
func (c *Command) Run() ([]string, error)
```
Run simply calls the meta generator.



## type ExternalDocs
``` go
type ExternalDocs struct {
    // Description is a short description of the target documentation.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty"`
    // URL for the target documentation.
    URL string `json:"url"`
}
```
ExternalDocs allows referencing an external resource for extended documentation.











## type Generator
``` go
type Generator struct{}
```
Generator is the swagger code generator.











### func (\*Generator) Generate
``` go
func (g *Generator) Generate(api *design.APIDefinition) (_ []string, err error)
```
Generate produces the skeleton main.



## type Header
``` go
type Header struct {
    // Description is`a brief description of the parameter.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty"`
    //  Type of the header. it is limited to simple types (that is, not an object).
    Type string `json:"type,omitempty"`
    // Format is the extending format for the previously mentioned type.
    Format string `json:"format,omitempty"`
    // Items describes the type of items in the array if type is "array".
    Items *Items `json:"items,omitempty"`
    // CollectionFormat determines the format of the array if type array is used.
    // Possible values are csv, ssv, tsv, pipes and multi.
    CollectionFormat string `json:"collectionFormat,omitempty"`
    // Default declares the value of the parameter that the server will use if none is
    // provided, for example a "count" to control the number of results per page might
    // default to 100 if not supplied by the client in the request.
    Default          interface{}   `json:"default,omitempty"`
    Maximum          float64       `json:"maximum,omitempty"`
    ExclusiveMaximum bool          `json:"exclusiveMaximum,omitempty"`
    Minimum          float64       `json:"minimum,omitempty"`
    ExclusiveMinimum bool          `json:"exclusiveMinimum,omitempty"`
    MaxLength        int           `json:"maxLength,omitempty"`
    MinLength        int           `json:"minLength,omitempty"`
    Pattern          string        `json:"pattern,omitempty"`
    MaxItems         int           `json:"maxItems,omitempty"`
    MinItems         int           `json:"minItems,omitempty"`
    UniqueItems      bool          `json:"uniqueItems,omitempty"`
    Enum             []interface{} `json:"enum,omitempty"`
    MultipleOf       float64       `json:"multipleOf,omitempty"`
}
```
Header represents a header parameter.











## type Info
``` go
type Info struct {
    Title          string                    `json:"title,omitempty"`
    Description    string                    `json:"description,omitempty"`
    TermsOfService string                    `json:"termsOfService,omitempty"`
    Contact        *design.ContactDefinition `json:"contact,omitempty"`
    License        *design.LicenseDefinition `json:"license,omitempty"`
    Version        string                    `json:"version"`
}
```
Info provides metadata about the API. The metadata can be used by the clients if needed,
and can be presented in the Swagger-UI for convenience.











## type Items
``` go
type Items struct {
    //  Type of the items. it is limited to simple types (that is, not an object).
    Type string `json:"type,omitempty"`
    // Format is the extending format for the previously mentioned type.
    Format string `json:"format,omitempty"`
    // Items describes the type of items in the array if type is "array".
    Items *Items `json:"items,omitempty"`
    // CollectionFormat determines the format of the array if type array is used.
    // Possible values are csv, ssv, tsv, pipes and multi.
    CollectionFormat string `json:"collectionFormat,omitempty"`
    // Default declares the value of the parameter that the server will use if none is
    // provided, for example a "count" to control the number of results per page might
    // default to 100 if not supplied by the client in the request.
    Default          interface{}   `json:"default,omitempty"`
    Maximum          float64       `json:"maximum,omitempty"`
    ExclusiveMaximum bool          `json:"exclusiveMaximum,omitempty"`
    Minimum          float64       `json:"minimum,omitempty"`
    ExclusiveMinimum bool          `json:"exclusiveMinimum,omitempty"`
    MaxLength        int           `json:"maxLength,omitempty"`
    MinLength        int           `json:"minLength,omitempty"`
    Pattern          string        `json:"pattern,omitempty"`
    MaxItems         int           `json:"maxItems,omitempty"`
    MinItems         int           `json:"minItems,omitempty"`
    UniqueItems      bool          `json:"uniqueItems,omitempty"`
    Enum             []interface{} `json:"enum,omitempty"`
    MultipleOf       float64       `json:"multipleOf,omitempty"`
}
```
Items is a limited subset of JSON-Schema's items object. It is used by parameter
definitions that are not located in "body".











## type Operation
``` go
type Operation struct {
    // Tags is a list of tags for API documentation control. Tags can be used for
    // logical grouping of operations by resources or any other qualifier.
    Tags []string `json:"tags,omitempty"`
    // Summary is a short summary of what the operation does. For maximum readability
    // in the swagger-ui, this field should be less than 120 characters.
    Summary string `json:"summary,omitempty"`
    // Description is a verbose explanation of the operation behavior.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty"`
    // ExternalDocs points to additional external documentation for this operation.
    ExternalDocs *ExternalDocs `json:"externalDocs,omitempty"`
    // OperationID is a unique string used to identify the operation.
    OperationID string `json:"operationId,omitempty"`
    // Consumes is a list of MIME types the operation can consume.
    Consumes []string `json:"consumes,omitempty"`
    // Produces is a list of MIME types the operation can produce.
    Produces []string `json:"produces,omitempty"`
    // Parameters is a list of parameters that are applicable for this operation.
    Parameters []*Parameter `json:"parameters,omitempty"`
    // Responses is the list of possible responses as they are returned from executing
    // this operation.
    Responses map[string]*Response `json:"responses,omitempty"`
    // Schemes is the transfer protocol for the operation.
    Schemes []string `json:"schemes,omitempty"`
    // Deprecated declares this operation to be deprecated.
    Deprecated bool `json:"deprecated,omitempty"`
    // Secury is a declaration of which security schemes are applied for this operation.
    Security []map[string][]string `json:"security,omitempty"`
}
```
Operation describes a single API operation on a path.











## type Parameter
``` go
type Parameter struct {
    // Name of the parameter. Parameter names are case sensitive.
    Name string `json:"name"`
    // In is the location of the parameter.
    // Possible values are "query", "header", "path", "formData" or "body".
    In string `json:"in"`
    // Description is`a brief description of the parameter.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty"`
    // Required determines whether this parameter is mandatory.
    Required bool `json:"required"`

    Schema *genschema.JSONSchema `json:"schema,omitempty"`

    //  Type of the parameter. Since the parameter is not located at the request body,
    // it is limited to simple types (that is, not an object).
    Type string `json:"type,omitempty"`
    // Format is the extending format for the previously mentioned type.
    Format string `json:"format,omitempty"`
    // AllowEmptyValue sets the ability to pass empty-valued parameters.
    // This is valid only for either query or formData parameters and allows you to
    // send a parameter with a name only or an empty value. Default value is false.
    AllowEmptyValue bool `json:"allowEmptyValue,omitempty"`
    // Items describes the type of items in the array if type is "array".
    Items *Items `json:"items,omitempty"`
    // CollectionFormat determines the format of the array if type array is used.
    // Possible values are csv, ssv, tsv, pipes and multi.
    CollectionFormat string `json:"collectionFormat,omitempty"`
    // Default declares the value of the parameter that the server will use if none is
    // provided, for example a "count" to control the number of results per page might
    // default to 100 if not supplied by the client in the request.
    Default          interface{}   `json:"default,omitempty"`
    Maximum          float64       `json:"maximum,omitempty"`
    ExclusiveMaximum bool          `json:"exclusiveMaximum,omitempty"`
    Minimum          float64       `json:"minimum,omitempty"`
    ExclusiveMinimum bool          `json:"exclusiveMinimum,omitempty"`
    MaxLength        int           `json:"maxLength,omitempty"`
    MinLength        int           `json:"minLength,omitempty"`
    Pattern          string        `json:"pattern,omitempty"`
    MaxItems         int           `json:"maxItems,omitempty"`
    MinItems         int           `json:"minItems,omitempty"`
    UniqueItems      bool          `json:"uniqueItems,omitempty"`
    Enum             []interface{} `json:"enum,omitempty"`
    MultipleOf       float64       `json:"multipleOf,omitempty"`
}
```
Parameter describes a single operation parameter.











## type Path
``` go
type Path struct {
    // Ref allows for an external definition of this path item.
    Ref string `json:"$ref,omitempty"`
    // Get defines a GET operation on this path.
    Get *Operation `json:"get,omitempty"`
    // Put defines a PUT operation on this path.
    Put *Operation `json:"put,omitempty"`
    // Post defines a POST operation on this path.
    Post *Operation `json:"post,omitempty"`
    // Delete defines a DELETE operation on this path.
    Delete *Operation `json:"delete,omitempty"`
    // Options defines a OPTIONS operation on this path.
    Options *Operation `json:"options,omitempty"`
    // Head defines a HEAD operation on this path.
    Head *Operation `json:"head,omitempty"`
    // Patch defines a PATCH operation on this path.
    Patch *Operation `json:"patch,omitempty"`
    // Parameters is the list of parameters that are applicable for all the operations
    // described under this path.
    Parameters []*Parameter `json:"parameters,omitempty"`
}
```
Path holds the relative paths to the individual endpoints.











## type Response
``` go
type Response struct {
    // Description of the response. GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty"`
    // Schema is a definition of the response structure. It can be a primitive,
    // an array or an object. If this field does not exist, it means no content is
    // returned as part of the response. As an extension to the Schema Object, its root
    // type value may also be "file".
    Schema *genschema.JSONSchema `json:"schema,omitempty"`
    // Headers is a list of headers that are sent with the response.
    Headers map[string]*Header `json:"headers,omitempty"`
    // Ref references a global API response.
    // This field is exclusive with the other fields of Response.
    Ref string `json:"$ref,omitempty"`
}
```
Response describes an operation response.











## type Scope
``` go
type Scope struct {
    // Description for scope
    Description string `json:"description,omitempty"`
}
```
Scope corresponds to an available scope for an OAuth2 security scheme.











## type SecurityDefinition
``` go
type SecurityDefinition struct {
    // Type of the security scheme. Valid values are "basic", "apiKey" or "oauth2".
    Type string `json:"type"`
    // Description for security scheme
    Description string `json:"description,omitempty"`
    // Name of the header or query parameter to be used when type is "apiKey".
    Name string `json:"name,omitempty"`
    // In is the location of the API key when type is "apiKey".
    // Valid values are "query" or "header".
    In string `json:"in"`
    // Flow is the flow used by the OAuth2 security scheme when type is "oauth2"
    // Valid values are "implicit", "password", "application" or "accessCode".
    Flow string `json:"flow,omitempty"`
    // The oauth2 authorization URL to be used for this flow.
    AuthorizationURL string `json:"authorizationUrl,omitempty"`
    // TokenURL  is the token URL to be used for this flow.
    TokenURL string `json:"tokenUrl,omitempty"`
    // Scopes list the  available scopes for the OAuth2 security scheme.
    Scopes map[string]*Scope `json:"scopes,omitempty"`
}
```
SecurityDefinition allows the definition of a security scheme that can be used by the
operations. Supported schemes are basic authentication, an API key (either as a header or
as a query parameter) and OAuth2's common flows (implicit, password, application and
access code).











## type Swagger
``` go
type Swagger struct {
    Swagger             string                           `json:"swagger,omitempty"`
    Info                *Info                            `json:"info,omitempty"`
    Host                string                           `json:"host,omitempty"`
    BasePath            string                           `json:"basePath,omitempty"`
    Schemes             []string                         `json:"schemes,omitempty"`
    Consumes            []string                         `json:"consumes,omitempty"`
    Produces            []string                         `json:"produces,omitempty"`
    Paths               map[string]*Path                 `json:"paths"`
    Definitions         map[string]*genschema.JSONSchema `json:"definitions,omitempty"`
    Parameters          map[string]*Parameter            `json:"parameters,omitempty"`
    Responses           map[string]*Response             `json:"responses,omitempty"`
    SecurityDefinitions map[string]*SecurityDefinition   `json:"securityDefinitions,omitempty"`
    Security            []map[string][]string            `json:"security,omitempty"`
    Tags                []*Tag                           `json:"tags,omitempty"`
    ExternalDocs        *ExternalDocs                    `json:"externalDocs,omitempty"`
}
```
Swagger represents an instance of a swagger object.
See <a href="https://swagger.io/specification/">https://swagger.io/specification/</a>









### func New
``` go
func New(api *design.APIDefinition) (*Swagger, error)
```
New creates a Swagger spec from an API definition.




## type Tag
``` go
type Tag struct {
    // Name of the tag.
    Name string `json:"name,omitempty"`
    // Description is a short description of the tag.
    // GFM syntax can be used for rich text representation.
    Description string `json:"description,omitempty"`
    // ExternalDocs is additional external documentation for this tag.
    ExternalDocs *ExternalDocs `json:"externalDocs,omitempty"`
}
```
Tag allows adding meta data to a single tag that is used by the Operation Object. It is
not mandatory to have a Tag Object per tag used there.

















- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
