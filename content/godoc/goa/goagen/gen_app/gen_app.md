+++
title="goa/goagen/gen_app"
description="godoc for goa/goagen/gen_app"
categories=["godoc"]
tags=["godoc","gen_app"]
+++

# genapp
    import "github.com/goadesign/goa/goagen/gen_app"





## Variables
``` go
var (
    // TargetPackage is the name of the generated Go package.
    TargetPackage string
)
```
``` go
var WildcardRegex = regexp.MustCompile("(?:[^/]*/:([^/]+))+")
```
WildcardRegex is the regex used to capture path parameters.


## func AppOutputDir
``` go
func AppOutputDir() string
```
AppOutputDir returns the directory containing the generated files.


## func AppPackagePath
``` go
func AppPackagePath() (string, error)
```
AppPackagePath returns the Go package path to the generated package.


## func BuildEncoderMap
``` go
func BuildEncoderMap(info []*design.EncodingDefinition, encoder bool) (map[string]*EncoderTemplateData, error)
```
BuildEncoderMap builds the template data needed to render the given encoding definitions.
This extra map is needed to handle the case where a single encoding definition maps to multiple
encoding packages. The data is indexed by encoder Go package path.


## func Generate
``` go
func Generate(api *design.APIDefinition) (files []string, err error)
```
Generate is the generator entry point called by the meta generator.


## func MergeResponses
``` go
func MergeResponses(l, r map[string]*design.ResponseDefinition) map[string]*design.ResponseDefinition
```
MergeResponses merge the response maps overriding the first argument map entries with the
second argument map entries in case of collision.



## type Command
``` go
type Command struct {
    *codegen.BaseCommand
}
```
Command is the goa application code generator command line data structure.









### func NewCommand
``` go
func NewCommand() *Command
```
NewCommand instantiates a new command.




### func (\*Command) RegisterFlags
``` go
func (c *Command) RegisterFlags(r codegen.FlagRegistry)
```
RegisterFlags registers the command line flags with the given registry.



### func (\*Command) Run
``` go
func (c *Command) Run() ([]string, error)
```
Run simply calls the meta generator.



## type ContextTemplateData
``` go
type ContextTemplateData struct {
    Name         string // e.g. "ListBottleContext"
    ResourceName string // e.g. "bottles"
    ActionName   string // e.g. "list"
    Params       *design.AttributeDefinition
    Payload      *design.UserTypeDefinition
    Headers      *design.AttributeDefinition
    Routes       []*design.RouteDefinition
    Responses    map[string]*design.ResponseDefinition
    API          *design.APIDefinition
    Version      *design.APIVersionDefinition
    DefaultPkg   string
}
```
ContextTemplateData contains all the information used by the template to render the context
code for an action.











### func (\*ContextTemplateData) IsPathParam
``` go
func (c *ContextTemplateData) IsPathParam(param string) bool
```
IsPathParam returns true if the given parameter name corresponds to a path parameter for all
the context action routes. Such parameter is required but does not need to be validated as
httprouter takes care of that.



### func (\*ContextTemplateData) MustValidate
``` go
func (c *ContextTemplateData) MustValidate(name string) bool
```
MustValidate returns true if code that checks for the presence of the given param must be
generated.



### func (\*ContextTemplateData) Versioned
``` go
func (c *ContextTemplateData) Versioned() bool
```
Versioned returns true if the context was built from an API version.



## type ContextsWriter
``` go
type ContextsWriter struct {
    *codegen.SourceFile
    CtxTmpl     *template.Template
    CtxNewTmpl  *template.Template
    CtxRespTmpl *template.Template
    PayloadTmpl *template.Template
}
```
ContextsWriter generate codes for a goa application contexts.









### func NewContextsWriter
``` go
func NewContextsWriter(filename string) (*ContextsWriter, error)
```
NewContextsWriter returns a contexts code writer.
Contexts provide the glue between the underlying request data and the user controller.




### func (\*ContextsWriter) Execute
``` go
func (w *ContextsWriter) Execute(data *ContextTemplateData) error
```
Execute writes the code for the context types to the writer.



## type ControllerTemplateData
``` go
type ControllerTemplateData struct {
    Resource   string                          // Lower case plural resource name, e.g. "bottles"
    Actions    []map[string]interface{}        // Array of actions, each action has keys "Name", "Routes", "Context" and "Unmarshal"
    Version    *design.APIVersionDefinition    // Controller API version
    EncoderMap map[string]*EncoderTemplateData // Encoder data indexed by package path
    DecoderMap map[string]*EncoderTemplateData // Decoder data indexed by package path
}
```
ControllerTemplateData contains the information required to generate an action handler.











## type ControllersWriter
``` go
type ControllersWriter struct {
    *codegen.SourceFile
    CtrlTmpl      *template.Template
    MountTmpl     *template.Template
    UnmarshalTmpl *template.Template
}
```
ControllersWriter generate code for a goa application handlers.
Handlers receive a HTTP request, create the action context, call the action code and send the
resulting HTTP response.









### func NewControllersWriter
``` go
func NewControllersWriter(filename string) (*ControllersWriter, error)
```
NewControllersWriter returns a handlers code writer.
Handlers provide the glue between the underlying request data and the user controller.




### func (\*ControllersWriter) Execute
``` go
func (w *ControllersWriter) Execute(data []*ControllerTemplateData) error
```
Execute writes the handlers GoGenerator



## type EncoderTemplateData
``` go
type EncoderTemplateData struct {
    // PackagePath is the Go package path to the package implmenting the encoder / decoder.
    PackagePath string
    // PackageName is the name of the Go package implementing the encoder / decoder.
    PackageName string
    // Factory is the name of the package variable implementing the decoder / encoder factory.
    Factory string
    // MIMETypes is the list of supported MIME types.
    MIMETypes []string
    // Default is true if this encoder / decoder should be set as the default.
    Default bool
}
```
EncoderTemplateData containes the data needed to render the registration code for a single
encoder or decoder package.











## type Generator
``` go
type Generator struct {
    // contains filtered or unexported fields
}
```
Generator is the application code generator.











### func (\*Generator) Cleanup
``` go
func (g *Generator) Cleanup()
```
Cleanup removes the entire "app" directory if it was created by this generator.



### func (\*Generator) Generate
``` go
func (g *Generator) Generate(api *design.APIDefinition) (_ []string, err error)
```
Generate the application code, implement codegen.Generator.



## type MediaTypeTemplateData
``` go
type MediaTypeTemplateData struct {
    MediaType  *design.MediaTypeDefinition
    Versioned  bool
    DefaultPkg string
}
```
MediaTypeTemplateData contains all the information used by the template to redner the
media types code.











## type MediaTypesWriter
``` go
type MediaTypesWriter struct {
    *codegen.SourceFile
    MediaTypeTmpl *template.Template
}
```
MediaTypesWriter generate code for a goa application media types.
Media types are data structures used to render the response bodies.









### func NewMediaTypesWriter
``` go
func NewMediaTypesWriter(filename string) (*MediaTypesWriter, error)
```
NewMediaTypesWriter returns a contexts code writer.
Media types contain the data used to render response bodies.




### func (\*MediaTypesWriter) Execute
``` go
func (w *MediaTypesWriter) Execute(data *MediaTypeTemplateData) error
```
Execute writes the code for the context types to the writer.



## type ResourceData
``` go
type ResourceData struct {
    Name              string                      // Name of resource
    Identifier        string                      // Identifier of resource media type
    Description       string                      // Description of resource
    Type              *design.MediaTypeDefinition // Type of resource media type
    CanonicalTemplate string                      // CanonicalFormat represents the resource canonical path in the form of a fmt.Sprintf format.
    CanonicalParams   []string                    // CanonicalParams is the list of parameter names that appear in the resource canonical path in order.
}
```
ResourceData contains the information required to generate the resource GoGenerator











## type ResourcesWriter
``` go
type ResourcesWriter struct {
    *codegen.SourceFile
    ResourceTmpl *template.Template
}
```
ResourcesWriter generate code for a goa application resources.
Resources are data structures initialized by the application handlers and passed to controller
actions.









### func NewResourcesWriter
``` go
func NewResourcesWriter(filename string) (*ResourcesWriter, error)
```
NewResourcesWriter returns a contexts code writer.
Resources provide the glue between the underlying request data and the user controller.




### func (\*ResourcesWriter) Execute
``` go
func (w *ResourcesWriter) Execute(data *ResourceData) error
```
Execute writes the code for the context types to the writer.



## type UserTypeTemplateData
``` go
type UserTypeTemplateData struct {
    UserType   *design.UserTypeDefinition
    Versioned  bool
    DefaultPkg string
}
```
UserTypeTemplateData contains all the information used by the template to redner the
media types code.











## type UserTypesWriter
``` go
type UserTypesWriter struct {
    *codegen.SourceFile
    UserTypeTmpl *template.Template
}
```
UserTypesWriter generate code for a goa application user types.
User types are data structures defined in the DSL with "Type".









### func NewUserTypesWriter
``` go
func NewUserTypesWriter(filename string) (*UserTypesWriter, error)
```
NewUserTypesWriter returns a contexts code writer.
User types contain custom data structured defined in the DSL with "Type".




### func (\*UserTypesWriter) Execute
``` go
func (w *UserTypesWriter) Execute(data *UserTypeTemplateData) error
```
Execute writes the code for the context types to the writer.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
