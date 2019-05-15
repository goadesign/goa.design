+++
date="2019-05-09T20:22:44-07:00"
description="github.com/goadesign/goa/goagen/gen_app"
+++


# genapp
`import "github.com/goadesign/goa/goagen/gen_app"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>
Package genapp provides the generator for the handlers, context data structures and tests of a goa
application. It generates the glue between user code and the low level router.




## <a name="pkg-index">Index</a>
* [Variables](#pkg-variables)
* [func Generate() (files []string, err error)](#Generate)
* [type ContextTemplateData](#ContextTemplateData)
  * [func (c *ContextTemplateData) HasParamAndHeader(name string) bool](#ContextTemplateData.HasParamAndHeader)
  * [func (c *ContextTemplateData) IsPathParam(param string) bool](#ContextTemplateData.IsPathParam)
  * [func (c *ContextTemplateData) IterateResponses(it func(*design.ResponseDefinition) error) error](#ContextTemplateData.IterateResponses)
  * [func (c *ContextTemplateData) MustValidate(name string) bool](#ContextTemplateData.MustValidate)
* [type ContextsWriter](#ContextsWriter)
  * [func NewContextsWriter(filename string) (*ContextsWriter, error)](#NewContextsWriter)
  * [func (w *ContextsWriter) Execute(data *ContextTemplateData) error](#ContextsWriter.Execute)
* [type ControllerTemplateData](#ControllerTemplateData)
* [type ControllersWriter](#ControllersWriter)
  * [func NewControllersWriter(filename string) (*ControllersWriter, error)](#NewControllersWriter)
  * [func (w *ControllersWriter) Execute(data []*ControllerTemplateData) error](#ControllersWriter.Execute)
  * [func (w *ControllersWriter) WriteInitService(encoders, decoders []*EncoderTemplateData) error](#ControllersWriter.WriteInitService)
* [type EncoderTemplateData](#EncoderTemplateData)
  * [func BuildEncoders(info []*design.EncodingDefinition, encoder bool) ([]*EncoderTemplateData, error)](#BuildEncoders)
* [type Generator](#Generator)
  * [func NewGenerator(options ...Option) *Generator](#NewGenerator)
  * [func (g *Generator) Cleanup()](#Generator.Cleanup)
  * [func (g *Generator) Generate() (_ []string, err error)](#Generator.Generate)
* [type MediaTypesWriter](#MediaTypesWriter)
  * [func NewMediaTypesWriter(filename string) (*MediaTypesWriter, error)](#NewMediaTypesWriter)
  * [func (w *MediaTypesWriter) Execute(mt *design.MediaTypeDefinition) error](#MediaTypesWriter.Execute)
* [type ObjectType](#ObjectType)
* [type Option](#Option)
  * [func API(API *design.APIDefinition) Option](#API)
  * [func NoTest(noTest bool) Option](#NoTest)
  * [func OutDir(outDir string) Option](#OutDir)
  * [func Target(target string) Option](#Target)
* [type ResourceData](#ResourceData)
* [type ResourcesWriter](#ResourcesWriter)
  * [func NewResourcesWriter(filename string) (*ResourcesWriter, error)](#NewResourcesWriter)
  * [func (w *ResourcesWriter) Execute(data *ResourceData) error](#ResourcesWriter.Execute)
* [type SecurityWriter](#SecurityWriter)
  * [func NewSecurityWriter(filename string) (*SecurityWriter, error)](#NewSecurityWriter)
  * [func (w *SecurityWriter) Execute(schemes []*design.SecuritySchemeDefinition) error](#SecurityWriter.Execute)
* [type TestMethod](#TestMethod)
  * [func (t *TestMethod) Escape(s string) string](#TestMethod.Escape)
* [type UserTypesWriter](#UserTypesWriter)
  * [func NewUserTypesWriter(filename string) (*UserTypesWriter, error)](#NewUserTypesWriter)
  * [func (w *UserTypesWriter) Execute(t *design.UserTypeDefinition) error](#UserTypesWriter.Execute)


#### <a name="pkg-files">Package files</a>
[doc.go](/src/github.com/goadesign/goa/goagen/gen_app/doc.go) [encoding.go](/src/github.com/goadesign/goa/goagen/gen_app/encoding.go) [generator.go](/src/github.com/goadesign/goa/goagen/gen_app/generator.go) [options.go](/src/github.com/goadesign/goa/goagen/gen_app/options.go) [test_generator.go](/src/github.com/goadesign/goa/goagen/gen_app/test_generator.go) [writers.go](/src/github.com/goadesign/goa/goagen/gen_app/writers.go) 



## <a name="pkg-variables">Variables</a>
``` go
var WildcardRegex = regexp.MustCompile("(?:[^/]*/:([^/]+))+")
```
WildcardRegex is the regex used to capture path parameters.



## <a name="Generate">func</a> [Generate](/src/target/generator.go?s=946:989#L38)
``` go
func Generate() (files []string, err error)
```
Generate is the generator entry point called by the meta generator.




## <a name="ContextTemplateData">type</a> [ContextTemplateData](/src/target/writers.go?s=2129:2610#L76)
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
    DefaultPkg   string
    Security     *design.SecurityDefinition
}

```
ContextTemplateData contains all the information used by the template to render the context
code for an action.










### <a name="ContextTemplateData.HasParamAndHeader">func</a> (\*ContextTemplateData) [HasParamAndHeader](/src/target/writers.go?s=5395:5460#L153)
``` go
func (c *ContextTemplateData) HasParamAndHeader(name string) bool
```
HasParamAndHeader returns true if the generated struct field name for the given header name
matches the generated struct field name of a param in c.Params.




### <a name="ContextTemplateData.IsPathParam">func</a> (\*ContextTemplateData) [IsPathParam](/src/target/writers.go?s=4924:4984#L131)
``` go
func (c *ContextTemplateData) IsPathParam(param string) bool
```
IsPathParam returns true if the given parameter name corresponds to a path parameter for all
the context action routes. Such parameter is required but does not need to be validated as
httptreemux takes care of that.




### <a name="ContextTemplateData.IterateResponses">func</a> (\*ContextTemplateData) [IterateResponses](/src/target/writers.go?s=6119:6214#L176)
``` go
func (c *ContextTemplateData) IterateResponses(it func(*design.ResponseDefinition) error) error
```
IterateResponses iterates through the responses sorted by status code.




### <a name="ContextTemplateData.MustValidate">func</a> (\*ContextTemplateData) [MustValidate](/src/target/writers.go?s=5921:5981#L171)
``` go
func (c *ContextTemplateData) MustValidate(name string) bool
```
MustValidate returns true if code that checks for the presence of the given param must be
generated.




## <a name="ContextsWriter">type</a> [ContextsWriter](/src/target/writers.go?s=373:619#L21)
``` go
type ContextsWriter struct {
    *codegen.SourceFile
    CtxTmpl     *template.Template
    CtxNewTmpl  *template.Template
    CtxRespTmpl *template.Template
    PayloadTmpl *template.Template
    Finalizer   *codegen.Finalizer
    Validator   *codegen.Validator
}

```
ContextsWriter generate codes for a goa application contexts.







### <a name="NewContextsWriter">func</a> [NewContextsWriter](/src/target/writers.go?s=6662:6726#L195)
``` go
func NewContextsWriter(filename string) (*ContextsWriter, error)
```
NewContextsWriter returns a contexts code writer.
Contexts provide the glue between the underlying request data and the user controller.





### <a name="ContextsWriter.Execute">func</a> (\*ContextsWriter) [Execute](/src/target/writers.go?s=7009:7074#L208)
``` go
func (w *ContextsWriter) Execute(data *ContextTemplateData) error
```
Execute writes the code for the context types to the writer.




## <a name="ControllerTemplateData">type</a> [ControllerTemplateData](/src/target/writers.go?s=2705:3335#L91)
``` go
type ControllerTemplateData struct {
    API            *design.APIDefinition          // API definition
    Resource       string                         // Lower case plural resource name, e.g. "bottles"
    Actions        []map[string]interface{}       // Array of actions, each action has keys "Name", "DesignName", "Routes", "Context" and "Unmarshal"
    FileServers    []*design.FileServerDefinition // File servers
    Encoders       []*EncoderTemplateData         // Encoder data
    Decoders       []*EncoderTemplateData         // Decoder data
    Origins        []*design.CORSDefinition       // CORS policies
    PreflightPaths []string
}

```
ControllerTemplateData contains the information required to generate an action handler.










## <a name="ControllersWriter">type</a> [ControllersWriter](/src/target/writers.go?s=817:1033#L34)
``` go
type ControllersWriter struct {
    *codegen.SourceFile
    CtrlTmpl  *template.Template
    MountTmpl *template.Template

    Finalizer *codegen.Finalizer
    Validator *codegen.Validator
    // contains filtered or unexported fields
}

```
ControllersWriter generate code for a goa application handlers.
Handlers receive a HTTP request, create the action context, call the action code and send the
resulting HTTP response.







### <a name="NewControllersWriter">func</a> [NewControllersWriter](/src/target/writers.go?s=9583:9653#L298)
``` go
func NewControllersWriter(filename string) (*ControllersWriter, error)
```
NewControllersWriter returns a handlers code writer.
Handlers provide the glue between the underlying request data and the user controller.





### <a name="ControllersWriter.Execute">func</a> (\*ControllersWriter) [Execute](/src/target/writers.go?s=10238:10311#L321)
``` go
func (w *ControllersWriter) Execute(data []*ControllerTemplateData) error
```
Execute writes the handlers GoGenerator




### <a name="ControllersWriter.WriteInitService">func</a> (\*ControllersWriter) [WriteInitService](/src/target/writers.go?s=9927:10020#L311)
``` go
func (w *ControllersWriter) WriteInitService(encoders, decoders []*EncoderTemplateData) error
```
WriteInitService writes the initService function




## <a name="EncoderTemplateData">type</a> [EncoderTemplateData](/src/target/writers.go?s=4180:4695#L114)
``` go
type EncoderTemplateData struct {
    // PackagePath is the Go package path to the package implmenting the encoder/decoder.
    PackagePath string
    // PackageName is the name of the Go package implementing the encoder/decoder.
    PackageName string
    // Function is the name of the package function implementing the decoder/encoder factory.
    Function string
    // MIMETypes is the list of supported MIME types.
    MIMETypes []string
    // Default is true if this encoder/decoder should be set as the default.
    Default bool
}

```
EncoderTemplateData contains the data needed to render the registration code for a single
encoder or decoder package.







### <a name="BuildEncoders">func</a> [BuildEncoders](/src/target/encoding.go?s=368:467#L14)
``` go
func BuildEncoders(info []*design.EncodingDefinition, encoder bool) ([]*EncoderTemplateData, error)
```
BuildEncoders builds the template data needed to render the given encoding definitions.
This extra map is needed to handle the case where a single encoding definition maps to multiple
encoding packages. The data is indexed by mime type.





## <a name="Generator">type</a> [Generator](/src/target/generator.go?s=488:873#L28)
``` go
type Generator struct {
    API    *design.APIDefinition // The API definition
    OutDir string                // Path to output directory
    Target string                // Name of generated package
    NoTest bool                  // Whether to skip test generation
    // contains filtered or unexported fields
}

```
Generator is the application code generator.







### <a name="NewGenerator">func</a> [NewGenerator](/src/target/generator.go?s=269:316#L16)
``` go
func NewGenerator(options ...Option) *Generator
```
NewGenerator returns an initialized instance of an Application Generator





### <a name="Generator.Cleanup">func</a> (\*Generator) [Cleanup](/src/target/generator.go?s=2923:2952#L117)
``` go
func (g *Generator) Cleanup()
```
Cleanup removes the entire "app" directory if it was created by this generator.




### <a name="Generator.Generate">func</a> (\*Generator) [Generate](/src/target/generator.go?s=1868:1922#L68)
``` go
func (g *Generator) Generate() (_ []string, err error)
```
Generate the application code, implement codegen.Generator.




## <a name="MediaTypesWriter">type</a> [MediaTypesWriter](/src/target/writers.go?s=1597:1717#L59)
``` go
type MediaTypesWriter struct {
    *codegen.SourceFile
    MediaTypeTmpl *template.Template
    Validator     *codegen.Validator
}

```
MediaTypesWriter generate code for a goa application media types.
Media types are data structures used to render the response bodies.







### <a name="NewMediaTypesWriter">func</a> [NewMediaTypesWriter](/src/target/writers.go?s=12305:12373#L384)
``` go
func NewMediaTypesWriter(filename string) (*MediaTypesWriter, error)
```
NewMediaTypesWriter returns a contexts code writer.
Media types contain the data used to render response bodies.





### <a name="MediaTypesWriter.Execute">func</a> (\*MediaTypesWriter) [Execute](/src/target/writers.go?s=12611:12683#L393)
``` go
func (w *MediaTypesWriter) Execute(mt *design.MediaTypeDefinition) error
```
Execute writes the code for the context types to the writer.




## <a name="ObjectType">type</a> [ObjectType](/src/target/test_generator.go?s=1219:1343#L60)
``` go
type ObjectType struct {
    Label       string
    Name        string
    Type        string
    Pointer     string
    Validatable bool
}

```
ObjectType structure










## <a name="Option">type</a> [Option](/src/target/options.go?s=97:125#L6)
``` go
type Option func(*Generator)
```
Option a generator option definition







### <a name="API">func</a> [API](/src/target/options.go?s=152:194#L9)
``` go
func API(API *design.APIDefinition) Option
```
API The API definition


### <a name="NoTest">func</a> [NoTest](/src/target/options.go?s=538:569#L30)
``` go
func NoTest(noTest bool) Option
```
NoTest Whether to skip test generation


### <a name="OutDir">func</a> [OutDir](/src/target/options.go?s=280:313#L16)
``` go
func OutDir(outDir string) Option
```
OutDir Path to output directory


### <a name="Target">func</a> [Target](/src/target/options.go?s=406:439#L23)
``` go
func Target(target string) Option
```
Target Name of generated package





## <a name="ResourceData">type</a> [ResourceData](/src/target/writers.go?s=3426:4051#L103)
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










## <a name="ResourcesWriter">type</a> [ResourcesWriter](/src/target/writers.go?s=1369:1452#L52)
``` go
type ResourcesWriter struct {
    *codegen.SourceFile
    ResourceTmpl *template.Template
}

```
ResourcesWriter generate code for a goa application resources.
Resources are data structures initialized by the application handlers and passed to controller
actions.







### <a name="NewResourcesWriter">func</a> [NewResourcesWriter](/src/target/writers.go?s=11793:11859#L369)
``` go
func NewResourcesWriter(filename string) (*ResourcesWriter, error)
```
NewResourcesWriter returns a contexts code writer.
Resources provide the glue between the underlying request data and the user controller.





### <a name="ResourcesWriter.Execute">func</a> (\*ResourcesWriter) [Execute](/src/target/writers.go?s=12061:12120#L378)
``` go
func (w *ResourcesWriter) Execute(data *ResourceData) error
```
Execute writes the code for the context types to the writer.




## <a name="SecurityWriter">type</a> [SecurityWriter](/src/target/writers.go?s=1105:1187#L44)
``` go
type SecurityWriter struct {
    *codegen.SourceFile
    SecurityTmpl *template.Template
}

```
SecurityWriter generate code for action-level security handlers.







### <a name="NewSecurityWriter">func</a> [NewSecurityWriter](/src/target/writers.go?s=11197:11261#L354)
``` go
func NewSecurityWriter(filename string) (*SecurityWriter, error)
```
NewSecurityWriter returns a security functionality code writer.
Those functionalities are there to support action-middleware related to security.





### <a name="SecurityWriter.Execute">func</a> (\*SecurityWriter) [Execute](/src/target/writers.go?s=11482:11564#L363)
``` go
func (w *SecurityWriter) Execute(schemes []*design.SecuritySchemeDefinition) error
```
Execute adds the different security schemes and middleware supporting functions.




## <a name="TestMethod">type</a> [TestMethod](/src/target/test_generator.go?s=509:1012#L30)
``` go
type TestMethod struct {
    Name              string
    Comment           string
    ResourceName      string
    ActionName        string
    ControllerName    string
    ContextVarName    string
    ContextType       string
    RouteVerb         string
    FullPath          string
    Status            int
    ReturnType        *ObjectType
    ReturnsErrorMedia bool
    Params            []*ObjectType
    QueryParams       []*ObjectType
    Headers           []*ObjectType
    Payload           *ObjectType
    // contains filtered or unexported fields
}

```
TestMethod structure










### <a name="TestMethod.Escape">func</a> (\*TestMethod) [Escape](/src/target/test_generator.go?s=1046:1090#L51)
``` go
func (t *TestMethod) Escape(s string) string
```
Escape escapes given string.




## <a name="UserTypesWriter">type</a> [UserTypesWriter](/src/target/writers.go?s=1855:2006#L67)
``` go
type UserTypesWriter struct {
    *codegen.SourceFile
    UserTypeTmpl *template.Template
    Finalizer    *codegen.Finalizer
    Validator    *codegen.Validator
}

```
UserTypesWriter generate code for a goa application user types.
User types are data structures defined in the DSL with "Type".







### <a name="NewUserTypesWriter">func</a> [NewUserTypesWriter](/src/target/writers.go?s=13354:13420#L421)
``` go
func NewUserTypesWriter(filename string) (*UserTypesWriter, error)
```
NewUserTypesWriter returns a contexts code writer.
User types contain custom data structured defined in the DSL with "Type".





### <a name="UserTypesWriter.Execute">func</a> (\*UserTypesWriter) [Execute](/src/target/writers.go?s=13704:13773#L434)
``` go
func (w *UserTypesWriter) Execute(t *design.UserTypeDefinition) error
```
Execute writes the code for the context types to the writer.








- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
