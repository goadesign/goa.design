+++
date="2018-09-10T17:03:12-07:00"
description="github.com/goadesign/goa/goagen/codegen"
+++


# codegen
`import "github.com/goadesign/goa/goagen/codegen"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>
Package codegen contains common code used by all code generators.
Each sub-package corresponds to a code generator.
The "meta" sub-package is the generator generator: it contains code that compiles and runs
a specific generator tool that uses the user metadata.




## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func Add(a, b int) int](#Add)
* [func CanonicalParams(r *design.ResourceDefinition) []string](#CanonicalParams)
* [func CanonicalTemplate(r *design.ResourceDefinition) string](#CanonicalTemplate)
* [func CheckVersion(ver string) error](#CheckVersion)
* [func CommandLine() string](#CommandLine)
* [func Comment(elems ...string) string](#Comment)
* [func GoNativeType(t design.DataType) string](#GoNativeType)
* [func GoTypeDef(ds design.DataStructure, tabs int, jsonTags, private bool) string](#GoTypeDef)
* [func GoTypeDesc(t design.DataType, upper bool) string](#GoTypeDesc)
* [func GoTypeName(t design.DataType, required []string, tabs int, private bool) string](#GoTypeName)
* [func GoTypeRef(t design.DataType, required []string, tabs int, private bool) string](#GoTypeRef)
* [func GoTypeTransform(source, target *design.UserTypeDefinition, targetPkg, funcName string) (string, error)](#GoTypeTransform)
* [func GoTypeTransformName(source, target *design.UserTypeDefinition, suffix string) string](#GoTypeTransformName)
* [func Goify(str string, firstUpper bool) string](#Goify)
* [func GoifyAtt(att *design.AttributeDefinition, name string, firstUpper bool) string](#GoifyAtt)
* [func Indent(s, prefix string) string](#Indent)
* [func IndentBytes(b, prefix []byte) []byte](#IndentBytes)
* [func KebabCase(name string) string](#KebabCase)
* [func PackageName(path string) (string, error)](#PackageName)
* [func PackagePath(path string) (string, error)](#PackagePath)
* [func PackageSourcePath(pkg string) (string, error)](#PackageSourcePath)
* [func ParseDSL()](#ParseDSL)
* [func PrintVal(t design.DataType, val interface{}) string](#PrintVal)
* [func Publicizer(att *design.AttributeDefinition, sourceField, targetField string, dereference bool, depth int, init bool) string](#Publicizer)
* [func RecursivePublicizer(att *design.AttributeDefinition, source, target string, depth int) string](#RecursivePublicizer)
* [func Run(generators ...generator)](#Run)
* [func RunTemplate(tmpl *template.Template, data interface{}) string](#RunTemplate)
* [func SnakeCase(name string) string](#SnakeCase)
* [func Tabs(depth int) string](#Tabs)
* [func Tempvar() string](#Tempvar)
* [func ValidationChecker(att *design.AttributeDefinition, nonzero, required, hasDefault bool, target, context string, depth int, private bool) string](#ValidationChecker)
* [func WriteTabs(buf *bytes.Buffer, count int)](#WriteTabs)
* [type Finalizer](#Finalizer)
  * [func NewFinalizer() *Finalizer](#NewFinalizer)
  * [func (f *Finalizer) Code(att *design.AttributeDefinition, target string, depth int) string](#Finalizer.Code)
* [type ImportSpec](#ImportSpec)
  * [func AttributeImports(att *design.AttributeDefinition, imports []*ImportSpec, seen []*design.AttributeDefinition) []*ImportSpec](#AttributeImports)
  * [func NewImport(name, path string) *ImportSpec](#NewImport)
  * [func SimpleImport(path string) *ImportSpec](#SimpleImport)
  * [func (s *ImportSpec) Code() string](#ImportSpec.Code)
* [type Package](#Package)
  * [func PackageFor(source string) (*Package, error)](#PackageFor)
  * [func (p *Package) Abs() string](#Package.Abs)
  * [func (p *Package) Compile(bin string) (string, error)](#Package.Compile)
  * [func (p *Package) CreateSourceFile(name string) (*SourceFile, error)](#Package.CreateSourceFile)
  * [func (p *Package) OpenSourceFile(name string) (*SourceFile, error)](#Package.OpenSourceFile)
* [type SourceFile](#SourceFile)
  * [func SourceFileFor(path string) (*SourceFile, error)](#SourceFileFor)
  * [func (f *SourceFile) Abs() string](#SourceFile.Abs)
  * [func (f *SourceFile) Close()](#SourceFile.Close)
  * [func (f *SourceFile) ExecuteTemplate(name, source string, funcMap template.FuncMap, data interface{}) error](#SourceFile.ExecuteTemplate)
  * [func (f *SourceFile) FormatCode() error](#SourceFile.FormatCode)
  * [func (f *SourceFile) Write(b []byte) (int, error)](#SourceFile.Write)
  * [func (f *SourceFile) WriteHeader(title, pack string, imports []*ImportSpec) error](#SourceFile.WriteHeader)
* [type Validator](#Validator)
  * [func NewValidator() *Validator](#NewValidator)
  * [func (v *Validator) Code(att *design.AttributeDefinition, nonzero, required, hasDefault bool, target, context string, depth int, private bool) string](#Validator.Code)
* [type Workspace](#Workspace)
  * [func NewWorkspace(prefix string) (*Workspace, error)](#NewWorkspace)
  * [func WorkspaceFor(source string) (*Workspace, error)](#WorkspaceFor)
  * [func (w *Workspace) Delete()](#Workspace.Delete)
  * [func (w *Workspace) NewPackage(goPath string) (*Package, error)](#Workspace.NewPackage)
  * [func (w *Workspace) Reset() error](#Workspace.Reset)


#### <a name="pkg-files">Package files</a>
[doc.go](/src/github.com/goadesign/goa/goagen/codegen/doc.go) [finalizer.go](/src/github.com/goadesign/goa/goagen/codegen/finalizer.go) [helpers.go](/src/github.com/goadesign/goa/goagen/codegen/helpers.go) [import_spec.go](/src/github.com/goadesign/goa/goagen/codegen/import_spec.go) [publicizer.go](/src/github.com/goadesign/goa/goagen/codegen/publicizer.go) [run.go](/src/github.com/goadesign/goa/goagen/codegen/run.go) [types.go](/src/github.com/goadesign/goa/goagen/codegen/types.go) [validation.go](/src/github.com/goadesign/goa/goagen/codegen/validation.go) [workspace.go](/src/github.com/goadesign/goa/goagen/codegen/workspace.go) 


## <a name="pkg-constants">Constants</a>
``` go
const TransformMapKey = "transform:key"
```
TransformMapKey is the name of the metadata used to specify the key for mapping fields when
generating the code that transforms one data structure into another.


## <a name="pkg-variables">Variables</a>
``` go
var (

    // DefaultFuncMap is the FuncMap used to initialize all source file templates.
    DefaultFuncMap = template.FuncMap{
        "add":                 func(a, b int) int { return a + b },
        "commandLine":         CommandLine,
        "comment":             Comment,
        "goify":               Goify,
        "goifyatt":            GoifyAtt,
        "gonative":            GoNativeType,
        "gotypedef":           GoTypeDef,
        "gotypename":          GoTypeName,
        "gotypedesc":          GoTypeDesc,
        "gotyperef":           GoTypeRef,
        "join":                strings.Join,
        "recursivePublicizer": RecursivePublicizer,
        "tabs":                Tabs,
        "tempvar":             Tempvar,
        "title":               strings.Title,
        "toLower":             strings.ToLower,
        "validationChecker":   ValidationChecker,
    }
)
```
``` go
var Reserved = map[string]bool{
    "byte":       true,
    "complex128": true,
    "complex64":  true,
    "float32":    true,
    "float64":    true,
    "int":        true,
    "int16":      true,
    "int32":      true,
    "int64":      true,
    "int8":       true,
    "rune":       true,
    "string":     true,
    "uint16":     true,
    "uint32":     true,
    "uint64":     true,
    "uint8":      true,

    "break":       true,
    "case":        true,
    "chan":        true,
    "const":       true,
    "continue":    true,
    "default":     true,
    "defer":       true,
    "else":        true,
    "fallthrough": true,
    "for":         true,
    "func":        true,
    "go":          true,
    "goto":        true,
    "if":          true,
    "import":      true,
    "interface":   true,
    "map":         true,
    "package":     true,
    "range":       true,
    "return":      true,
    "select":      true,
    "struct":      true,
    "switch":      true,
    "type":        true,
    "var":         true,

    "fmt":  true,
    "http": true,
    "json": true,
    "os":   true,
    "url":  true,
    "time": true,
}
```
Reserved golang keywords and package names

``` go
var (
    // TempCount holds the value appended to variable names to make them unique.
    TempCount int
)
```


## <a name="Add">func</a> [Add](/src/target/helpers.go?s=2809:2831#L110)
``` go
func Add(a, b int) int
```
Add adds two integers and returns the sum of the two.



## <a name="CanonicalParams">func</a> [CanonicalParams](/src/target/helpers.go?s=3296:3355#L120)
``` go
func CanonicalParams(r *design.ResourceDefinition) []string
```
CanonicalParams returns the list of parameter names needed to build the canonical href to the
resource. It returns nil if the resource does not have a canonical action.



## <a name="CanonicalTemplate">func</a> [CanonicalTemplate](/src/target/helpers.go?s=2979:3038#L114)
``` go
func CanonicalTemplate(r *design.ResourceDefinition) string
```
CanonicalTemplate returns the resource URI template as a format string suitable for use in the
fmt.Printf function family.



## <a name="CheckVersion">func</a> [CheckVersion](/src/target/helpers.go?s=321:356#L17)
``` go
func CheckVersion(ver string) error
```
CheckVersion returns an error if the ver is empty, contains an incorrect value or
a version number that is not compatible with the version of this repo.



## <a name="CommandLine">func</a> [CommandLine](/src/target/helpers.go?s=650:675#L30)
``` go
func CommandLine() string
```
CommandLine return the command used to run this process.



## <a name="Comment">func</a> [Comment](/src/target/helpers.go?s=1700:1736#L64)
``` go
func Comment(elems ...string) string
```
Comment produces line comments by concatenating the given strings and producing 80 characters
long lines starting with "//"



## <a name="GoNativeType">func</a> [GoNativeType](/src/target/types.go?s=7585:7628#L227)
``` go
func GoNativeType(t design.DataType) string
```
GoNativeType returns the Go built-in type from which instances of t can be initialized.



## <a name="GoTypeDef">func</a> [GoTypeDef](/src/target/types.go?s=2088:2168#L66)
``` go
func GoTypeDef(ds design.DataStructure, tabs int, jsonTags, private bool) string
```
GoTypeDef returns the Go code that defines a Go type which matches the data structure
definition (the part that comes after `type foo`).
tabs is the number of tab character(s) used to tabulate the definition however the first
line is never indented.
jsonTags controls whether to produce json tags.
private controls whether the field is a pointer or not. All fields in the struct are


	pointers for a private struct.



## <a name="GoTypeDesc">func</a> [GoTypeDesc](/src/target/types.go?s=8755:8808#L267)
``` go
func GoTypeDesc(t design.DataType, upper bool) string
```
GoTypeDesc returns the description of a type.  If no description is defined
for the type, one will be generated.



## <a name="GoTypeName">func</a> [GoTypeName](/src/target/types.go?s=6457:6541#L195)
``` go
func GoTypeName(t design.DataType, required []string, tabs int, private bool) string
```
GoTypeName returns the Go type name for a data type.
tabs is used to properly tabulate the object struct fields and only applies to this case.
This function assumes the type is in the same package as the code accessing it.
required only applies when referring to a user type that is an object defined inline. In this
case the type (Object) does not carry the required field information defined in the parent
(anonymous) attribute.



## <a name="GoTypeRef">func</a> [GoTypeRef](/src/target/types.go?s=5716:5799#L176)
``` go
func GoTypeRef(t design.DataType, required []string, tabs int, private bool) string
```
GoTypeRef returns the Go code that refers to the Go type which matches the given data type
(the part that comes after `var foo`)
required only applies when referring to a user type that is an object defined inline. In this
case the type (Object) does not carry the required field information defined in the parent
(anonymous) attribute.
tabs is used to properly tabulate the object struct fields and only applies to this case.
This function assumes the type is in the same package as the code accessing it.



## <a name="GoTypeTransform">func</a> [GoTypeTransform](/src/target/types.go?s=15201:15308#L512)
``` go
func GoTypeTransform(source, target *design.UserTypeDefinition, targetPkg, funcName string) (string, error)
```
GoTypeTransform produces Go code that initializes the data structure defined by target from an
instance of the data structure described by source. The algorithm matches object fields by name
or using the value of the "transform:key" attribute metadata when present.
The function returns an error if target is not compatible with source (different type, fields of
different type etc). It ignores fields in target that don't have a match in source.



## <a name="GoTypeTransformName">func</a> [GoTypeTransformName](/src/target/types.go?s=16798:16887#L556)
``` go
func GoTypeTransformName(source, target *design.UserTypeDefinition, suffix string) string
```
GoTypeTransformName generates a valid Go identifer that is adequate for naming the type
transform function that creates an instance of the data structure described by target from an
instance of the data strucuture described by source.



## <a name="Goify">func</a> [Goify](/src/target/types.go?s=11590:11636#L375)
``` go
func Goify(str string, firstUpper bool) string
```
Goify makes a valid Go identifier out of any string.
It does that by removing any non letter and non digit character and by making sure the first
character is a letter or "_".
Goify produces a "CamelCase" version of the string, if firstUpper is true the first character
of the identifier is uppercase otherwise it's lowercase.



## <a name="GoifyAtt">func</a> [GoifyAtt](/src/target/types.go?s=11022:11105#L361)
``` go
func GoifyAtt(att *design.AttributeDefinition, name string, firstUpper bool) string
```
GoifyAtt honors any struct:field:name metadata set on the attribute and calls Goify with the tag
value if present or the given name otherwise.



## <a name="Indent">func</a> [Indent](/src/target/helpers.go?s=2121:2157#L80)
``` go
func Indent(s, prefix string) string
```
Indent inserts prefix at the beginning of each non-empty line of s. The
end-of-line marker is NL.



## <a name="IndentBytes">func</a> [IndentBytes](/src/target/helpers.go?s=2327:2368#L86)
``` go
func IndentBytes(b, prefix []byte) []byte
```
IndentBytes inserts prefix at the beginning of each non-empty line of b.
The end-of-line marker is NL.



## <a name="KebabCase">func</a> [KebabCase](/src/target/helpers.go?s=4451:4485#L170)
``` go
func KebabCase(name string) string
```
KebabCase produces the kebab-case version of the given CamelCase string.



## <a name="PackageName">func</a> [PackageName](/src/target/workspace.go?s=9536:9581#L349)
``` go
func PackageName(path string) (string, error)
```
PackageName returns the name of a package at the given path



## <a name="PackagePath">func</a> [PackagePath](/src/target/workspace.go?s=8557:8602#L314)
``` go
func PackagePath(path string) (string, error)
```
PackagePath returns the Go package path for the directory that lives under the given absolute
file path.



## <a name="PackageSourcePath">func</a> [PackageSourcePath](/src/target/workspace.go?s=9158:9208#L334)
``` go
func PackageSourcePath(pkg string) (string, error)
```
PackageSourcePath returns the absolute path to the given package source.



## <a name="ParseDSL">func</a> [ParseDSL](/src/target/run.go?s=840:855#L32)
``` go
func ParseDSL()
```
ParseDSL will run the DSL engine and analyze any imported `design`
package, creating your `design.APIDefinition` along the way.



## <a name="PrintVal">func</a> [PrintVal](/src/target/finalizer.go?s=2931:2987#L112)
``` go
func PrintVal(t design.DataType, val interface{}) string
```
PrintVal prints the given value corresponding to the given data type.
The value is already checked for the compatibility with the data type.



## <a name="Publicizer">func</a> [Publicizer](/src/target/publicizer.go?s=2244:2372#L74)
``` go
func Publicizer(att *design.AttributeDefinition, sourceField, targetField string, dereference bool, depth int, init bool) string
```
Publicizer publicizes a single attribute based on the type.



## <a name="RecursivePublicizer">func</a> [RecursivePublicizer](/src/target/publicizer.go?s=1354:1452#L49)
``` go
func RecursivePublicizer(att *design.AttributeDefinition, source, target string, depth int) string
```
RecursivePublicizer produces code that copies fields from the private struct to the
public struct



## <a name="Run">func</a> [Run](/src/target/run.go?s=573:606#L24)
``` go
func Run(generators ...generator)
```
Run runs all generators passed as parameter. Call ParseDSL first to
fill `design.Design`.  Each `goa` generator lives in its own
`goagen/gen_something` package in `generator.go` and has a
`Generator` object which implements the interface required here.


	codegen.Run(
	  &genapp.Generator{
	    API: design.Design,
	    Target: "app",
	  },
	  &genmain.Generator{
	    API: design.Design,
	  },
	)



## <a name="RunTemplate">func</a> [RunTemplate](/src/target/types.go?s=17417:17483#L575)
``` go
func RunTemplate(tmpl *template.Template, data interface{}) string
```
RunTemplate executs the given template with the given input and returns
the rendered string.



## <a name="SnakeCase">func</a> [SnakeCase](/src/target/helpers.go?s=3719:3753#L137)
``` go
func SnakeCase(name string) string
```
SnakeCase produces the snake_case version of the given CamelCase string.



## <a name="Tabs">func</a> [Tabs](/src/target/helpers.go?s=2597:2624#L100)
``` go
func Tabs(depth int) string
```
Tabs returns a string made of depth tab characters.



## <a name="Tempvar">func</a> [Tempvar](/src/target/types.go?s=17238:17259#L568)
``` go
func Tempvar() string
```
Tempvar generates a unique variable name.



## <a name="ValidationChecker">func</a> [ValidationChecker](/src/target/validation.go?s=9729:9876#L326)
``` go
func ValidationChecker(att *design.AttributeDefinition, nonzero, required, hasDefault bool, target, context string, depth int, private bool) string
```
ValidationChecker produces Go code that runs the validation defined in the given attribute
definition against the content of the variable named target recursively.
context is used to keep track of recursion to produce helpful error messages in case of type
validation error.
The generated code assumes that there is a pre-existing "err" variable of type
error. It initializes that variable in case a validation fails.
Note: we do not want to recurse here, recursion is done by the marshaler/unmarshaler code.



## <a name="WriteTabs">func</a> [WriteTabs](/src/target/types.go?s=17088:17132#L561)
``` go
func WriteTabs(buf *bytes.Buffer, count int)
```
WriteTabs is a helper function that writes count tabulation characters to buf.




## <a name="Finalizer">type</a> [Finalizer](/src/target/finalizer.go?s=166:361#L12)
``` go
type Finalizer struct {
    // contains filtered or unexported fields
}

```
Finalizer is the code generator for the 'Finalize' type methods.







### <a name="NewFinalizer">func</a> [NewFinalizer](/src/target/finalizer.go?s=419:449#L19)
``` go
func NewFinalizer() *Finalizer
```
NewFinalizer instantiates a finalize code generator.





### <a name="Finalizer.Code">func</a> (\*Finalizer) [Code](/src/target/finalizer.go?s=1098:1188#L44)
``` go
func (f *Finalizer) Code(att *design.AttributeDefinition, target string, depth int) string
```
Code produces Go code that sets the default values for fields recursively for the given
attribute.




## <a name="ImportSpec">type</a> [ImportSpec](/src/target/import_spec.go?s=124:176#L10)
``` go
type ImportSpec struct {
    Name string
    Path string
}

```
ImportSpec defines a generated import statement.







### <a name="AttributeImports">func</a> [AttributeImports](/src/target/import_spec.go?s=813:940#L35)
``` go
func AttributeImports(att *design.AttributeDefinition, imports []*ImportSpec, seen []*design.AttributeDefinition) []*ImportSpec
```
AttributeImports constructs a new ImportsSpec slice from an existing slice and adds in imports specified in
struct:field:type Metadata tags.


### <a name="NewImport">func</a> [NewImport](/src/target/import_spec.go?s=215:260#L16)
``` go
func NewImport(name, path string) *ImportSpec
```
NewImport creates an import spec.


### <a name="SimpleImport">func</a> [SimpleImport](/src/target/import_spec.go?s=377:419#L21)
``` go
func SimpleImport(path string) *ImportSpec
```
SimpleImport creates an import with no explicit path component.





### <a name="ImportSpec.Code">func</a> (\*ImportSpec) [Code](/src/target/import_spec.go?s=517:551#L26)
``` go
func (s *ImportSpec) Code() string
```
Code returns the Go import statement for the ImportSpec.




## <a name="Package">type</a> [Package](/src/target/workspace.go?s=532:648#L35)
``` go
type Package struct {
    // (Go) Path of package
    Path string
    // Workspace containing package
    Workspace *Workspace
}

```
Package represents a temporary Go package







### <a name="PackageFor">func</a> [PackageFor](/src/target/workspace.go?s=4097:4145#L162)
``` go
func PackageFor(source string) (*Package, error)
```
PackageFor returns the package for the given source file.





### <a name="Package.Abs">func</a> (\*Package) [Abs](/src/target/workspace.go?s=4451:4481#L175)
``` go
func (p *Package) Abs() string
```
Abs returns the absolute path to the package source directory




### <a name="Package.Compile">func</a> (\*Package) [Compile](/src/target/workspace.go?s=5259:5312#L199)
``` go
func (p *Package) Compile(bin string) (string, error)
```
Compile compiles a package and returns the path to the compiled binary.




### <a name="Package.CreateSourceFile">func</a> (\*Package) [CreateSourceFile](/src/target/workspace.go?s=4658:4726#L181)
``` go
func (p *Package) CreateSourceFile(name string) (*SourceFile, error)
```
CreateSourceFile creates a Go source file in the given package. If the file
already exists it is overwritten.




### <a name="Package.OpenSourceFile">func</a> (\*Package) [OpenSourceFile](/src/target/workspace.go?s=4922:4988#L188)
``` go
func (p *Package) OpenSourceFile(name string) (*SourceFile, error)
```
OpenSourceFile opens an existing file to append to it. If the file does not
exist OpenSourceFile creates it.




## <a name="SourceFile">type</a> [SourceFile](/src/target/workspace.go?s=701:878#L43)
``` go
type SourceFile struct {
    // Name of the source file
    Name string
    // Package containing source file
    Package *Package
    // contains filtered or unexported fields
}

```
SourceFile represents a single Go source file







### <a name="SourceFileFor">func</a> [SourceFileFor](/src/target/workspace.go?s=5898:5950#L223)
``` go
func SourceFileFor(path string) (*SourceFile, error)
```
SourceFileFor returns a SourceFile for the file at the given path.





### <a name="SourceFile.Abs">func</a> (\*SourceFile) [Abs](/src/target/workspace.go?s=8017:8050#L299)
``` go
func (f *SourceFile) Abs() string
```
Abs returne the source file absolute filename




### <a name="SourceFile.Close">func</a> (\*SourceFile) [Close](/src/target/workspace.go?s=6786:6814#L256)
``` go
func (f *SourceFile) Close()
```
Close closes the underlying OS file.




### <a name="SourceFile.ExecuteTemplate">func</a> (\*SourceFile) [ExecuteTemplate](/src/target/workspace.go?s=8179:8286#L304)
``` go
func (f *SourceFile) ExecuteTemplate(name, source string, funcMap template.FuncMap, data interface{}) error
```
ExecuteTemplate executes the template and writes the output to the file.




### <a name="SourceFile.FormatCode">func</a> (\*SourceFile) [FormatCode](/src/target/workspace.go?s=6961:7000#L263)
``` go
func (f *SourceFile) FormatCode() error
```
FormatCode performs the equivalent of "goimports -w" on the source file.




### <a name="SourceFile.Write">func</a> (\*SourceFile) [Write](/src/target/workspace.go?s=6665:6714#L251)
``` go
func (f *SourceFile) Write(b []byte) (int, error)
```
Write implements io.Writer so that variables of type *SourceFile can be
used in template.Execute.




### <a name="SourceFile.WriteHeader">func</a> (\*SourceFile) [WriteHeader](/src/target/workspace.go?s=6204:6285#L236)
``` go
func (f *SourceFile) WriteHeader(title, pack string, imports []*ImportSpec) error
```
WriteHeader writes the generic generated code header.




## <a name="Validator">type</a> [Validator](/src/target/validation.go?s=1269:1420#L55)
``` go
type Validator struct {
    // contains filtered or unexported fields
}

```
Validator is the code generator for the 'Validate' type methods.







### <a name="NewValidator">func</a> [NewValidator](/src/target/validation.go?s=1478:1508#L63)
``` go
func NewValidator() *Validator
```
NewValidator instantiates a validate code generator.





### <a name="Validator.Code">func</a> (\*Validator) [Code](/src/target/validation.go?s=2256:2405#L93)
``` go
func (v *Validator) Code(att *design.AttributeDefinition, nonzero, required, hasDefault bool, target, context string, depth int, private bool) string
```
Code produces Go code that runs the validation checks recursively over the given attribute.




## <a name="Workspace">type</a> [Workspace](/src/target/workspace.go?s=338:483#L27)
``` go
type Workspace struct {
    // Path is the absolute path to the workspace directory.
    Path string
    // contains filtered or unexported fields
}

```
Workspace represents a temporary Go workspace







### <a name="NewWorkspace">func</a> [NewWorkspace](/src/target/workspace.go?s=1951:2003#L81)
``` go
func NewWorkspace(prefix string) (*Workspace, error)
```
NewWorkspace returns a newly created temporary Go workspace.
Use Delete to delete the corresponding temporary directory when done.


### <a name="WorkspaceFor">func</a> [WorkspaceFor](/src/target/workspace.go?s=2519:2571#L100)
``` go
func WorkspaceFor(source string) (*Workspace, error)
```
WorkspaceFor returns the Go workspace for the given Go source file.





### <a name="Workspace.Delete">func</a> (\*Workspace) [Delete](/src/target/workspace.go?s=3178:3206#L123)
``` go
func (w *Workspace) Delete()
```
Delete deletes the workspace temporary directory.




### <a name="Workspace.NewPackage">func</a> (\*Workspace) [NewPackage](/src/target/workspace.go?s=3805:3868#L152)
``` go
func (w *Workspace) NewPackage(goPath string) (*Package, error)
```
NewPackage creates a new package in the workspace. It deletes any pre-existing package.
goPath is the go package path used to import the package.




### <a name="Workspace.Reset">func</a> (\*Workspace) [Reset](/src/target/workspace.go?s=3339:3372#L131)
``` go
func (w *Workspace) Reset() error
```
Reset removes all content from the workspace.








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
