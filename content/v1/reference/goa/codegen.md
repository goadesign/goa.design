+++
date="2018-09-06T11:21:48-07:00"
description="github.com/goadesign/goa/codegen"
+++


# codegen
`import "github.com/goadesign/goa/codegen"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [func Add(a, b int) int](#Add)
* [func AddImport(section *SectionTemplate, imprt *ImportSpec)](#AddImport)
* [func AttributeTags(parent, att *design.AttributeExpr) string](#AttributeTags)
* [func CheckVersion(ver string) error](#CheckVersion)
* [func CommandLine() string](#CommandLine)
* [func Comment(elems ...string) string](#Comment)
* [func Diff(t *testing.T, s1, s2 string) string](#Diff)
* [func FormatTestCode(t *testing.T, code string) string](#FormatTestCode)
* [func GoNativeTypeName(t design.DataType) string](#GoNativeTypeName)
* [func Goify(str string, firstUpper bool) string](#Goify)
* [func GoifyAtt(att *design.AttributeExpr, name string, upper bool) string](#GoifyAtt)
* [func HasValidations(att *design.AttributeExpr, ignoreRequired bool) bool](#HasValidations)
* [func Indent(s, prefix string) string](#Indent)
* [func KebabCase(name string) string](#KebabCase)
* [func RecursiveValidationCode(att *design.AttributeExpr, req, ptr, def bool, target string) string](#RecursiveValidationCode)
* [func RegisterPlugin(name string, cmd string, p GenerateFunc)](#RegisterPlugin)
* [func RegisterPluginFirst(name string, cmd string, p GenerateFunc)](#RegisterPluginFirst)
* [func RegisterPluginLast(name string, cmd string, p GenerateFunc)](#RegisterPluginLast)
* [func RunDSL(t *testing.T, dsl func()) *design.RootExpr](#RunDSL)
* [func RunDSLWithFunc(t *testing.T, dsl func(), fn func()) *design.RootExpr](#RunDSLWithFunc)
* [func SectionCode(t *testing.T, section *SectionTemplate) string](#SectionCode)
* [func SectionCodeFromImportsAndMethods(t *testing.T, importSection *SectionTemplate, methodSection *SectionTemplate) string](#SectionCodeFromImportsAndMethods)
* [func SnakeCase(name string) string](#SnakeCase)
* [func TemplateFuncs() map[string]interface{}](#TemplateFuncs)
* [func ValidationCode(att *design.AttributeExpr, req, ptr, def bool, target, context string) string](#ValidationCode)
* [func Walk(a *design.AttributeExpr, walker func(*design.AttributeExpr) error) error](#Walk)
* [func WalkMappedAttr(ma *design.MappedAttributeExpr, it MappedAttributeWalker) error](#WalkMappedAttr)
* [func WalkType(u design.UserType, walker func(*design.AttributeExpr) error) error](#WalkType)
* [func WrapText(text string, maxChars int) string](#WrapText)
* [type File](#File)
  * [func RunPlugins(cmd, genpkg string, roots []eval.Root, genfiles []*File) ([]*File, error)](#RunPlugins)
  * [func (f *File) Render(dir string) (string, error)](#File.Render)
  * [func (f *File) Section(name string) []*SectionTemplate](#File.Section)
* [type GenerateFunc](#GenerateFunc)
* [type Hasher](#Hasher)
* [type ImportSpec](#ImportSpec)
  * [func NewImport(name, path string) *ImportSpec](#NewImport)
  * [func SimpleImport(path string) *ImportSpec](#SimpleImport)
  * [func (s *ImportSpec) Code() string](#ImportSpec.Code)
* [type MappedAttributeWalker](#MappedAttributeWalker)
* [type NameScope](#NameScope)
  * [func NewNameScope() *NameScope](#NewNameScope)
  * [func (s *NameScope) GoFullTypeName(att *design.AttributeExpr, pkg string) string](#NameScope.GoFullTypeName)
  * [func (s *NameScope) GoFullTypeRef(att *design.AttributeExpr, pkg string) string](#NameScope.GoFullTypeRef)
  * [func (s *NameScope) GoTypeDef(att *design.AttributeExpr, useDefault bool) string](#NameScope.GoTypeDef)
  * [func (s *NameScope) GoTypeName(att *design.AttributeExpr) string](#NameScope.GoTypeName)
  * [func (s *NameScope) GoTypeRef(att *design.AttributeExpr) string](#NameScope.GoTypeRef)
  * [func (s *NameScope) HashedUnique(key Hasher, name string, suffix ...string) string](#NameScope.HashedUnique)
  * [func (s *NameScope) Unique(name string, suffix ...string) string](#NameScope.Unique)
* [type SectionTemplate](#SectionTemplate)
  * [func Header(title, pack string, imports []*ImportSpec) *SectionTemplate](#Header)
  * [func (s *SectionTemplate) Write(w io.Writer) error](#SectionTemplate.Write)
* [type TransformFunctionData](#TransformFunctionData)
  * [func AppendHelpers(oldH, newH []*TransformFunctionData) []*TransformFunctionData](#AppendHelpers)
  * [func GoTypeTransform(source, target design.DataType, sourceVar, targetVar, sourcePkg, targetPkg string, unmarshal bool, scope *NameScope) (string, []*TransformFunctionData, error)](#GoTypeTransform)


#### <a name="pkg-files">Package files</a>
[file.go](/src/github.com/goadesign/goa/codegen/file.go) [funcs.go](/src/github.com/goadesign/goa/codegen/funcs.go) [goify.go](/src/github.com/goadesign/goa/codegen/goify.go) [header.go](/src/github.com/goadesign/goa/codegen/header.go) [import.go](/src/github.com/goadesign/goa/codegen/import.go) [plugin.go](/src/github.com/goadesign/goa/codegen/plugin.go) [scope.go](/src/github.com/goadesign/goa/codegen/scope.go) [testing.go](/src/github.com/goadesign/goa/codegen/testing.go) [transform.go](/src/github.com/goadesign/goa/codegen/transform.go) [types.go](/src/github.com/goadesign/goa/codegen/types.go) [validation.go](/src/github.com/goadesign/goa/codegen/validation.go) [walk.go](/src/github.com/goadesign/goa/codegen/walk.go) 


## <a name="pkg-constants">Constants</a>
``` go
const Gendir = "gen"
```
Gendir is the name of the subdirectory of the output directory that contains
the generated files. This directory is wiped and re-written each time goa is
run.




## <a name="Add">func</a> [Add](/src/target/funcs.go?s=1820:1842#L83)
``` go
func Add(a, b int) int
```
Add adds two integers and returns the sum of the two.



## <a name="AddImport">func</a> [AddImport](/src/target/header.go?s=494:553#L23)
``` go
func AddImport(section *SectionTemplate, imprt *ImportSpec)
```
AddImport adds an import to a section template that was generated with
Header.



## <a name="AttributeTags">func</a> [AttributeTags](/src/target/types.go?s=962:1022#L45)
``` go
func AttributeTags(parent, att *design.AttributeExpr) string
```
AttributeTags computes the struct field tags from its metadata if any.



## <a name="CheckVersion">func</a> [CheckVersion](/src/target/funcs.go?s=452:487#L23)
``` go
func CheckVersion(ver string) error
```
CheckVersion returns an error if the ver is empty, contains an incorrect value or
a version number that is not compatible with the version of this repo.



## <a name="CommandLine">func</a> [CommandLine](/src/target/funcs.go?s=771:796#L36)
``` go
func CommandLine() string
```
CommandLine return the command used to run this process.



## <a name="Comment">func</a> [Comment](/src/target/funcs.go?s=1067:1103#L49)
``` go
func Comment(elems ...string) string
```
Comment produces line comments by concatenating the given strings and producing 80 characters
long lines starting with "//"



## <a name="Diff">func</a> [Diff](/src/target/testing.go?s=2964:3009#L108)
``` go
func Diff(t *testing.T, s1, s2 string) string
```
Diff returns a diff between s1 and s2. It uses the diff tool if installed
otherwise degrades to using the dmp package.



## <a name="FormatTestCode">func</a> [FormatTestCode](/src/target/testing.go?s=2519:2572#L93)
``` go
func FormatTestCode(t *testing.T, code string) string
```
FormatTestCode formats the given Go code. The code must correspond to the
content of a valid Go source file (i.e. start with "package")



## <a name="GoNativeTypeName">func</a> [GoNativeTypeName](/src/target/types.go?s=226:273#L13)
``` go
func GoNativeTypeName(t design.DataType) string
```
GoNativeTypeName returns the Go built-in type corresponding to the given
primitive type. GoNativeType panics if t is not a primitive type.



## <a name="Goify">func</a> [Goify](/src/target/goify.go?s=419:465#L15)
``` go
func Goify(str string, firstUpper bool) string
```
Goify makes a valid Go identifier out of any string. It does that by removing
any non letter and non digit character and by making sure the first character
is a letter or "_". Goify produces a "CamelCase" version of the string, if
firstUpper is true the first character of the identifier is uppercase
otherwise it's lowercase.



## <a name="GoifyAtt">func</a> [GoifyAtt](/src/target/goify.go?s=2637:2709#L102)
``` go
func GoifyAtt(att *design.AttributeExpr, name string, upper bool) string
```
GoifyAtt honors any struct:field:name metadata set on the attribute and calls
Goify with the tag value if present or the given name otherwise.



## <a name="HasValidations">func</a> [HasValidations](/src/target/validation.go?s=1666:1738#L49)
``` go
func HasValidations(att *design.AttributeExpr, ignoreRequired bool) bool
```
HasValidations returns true if the given attribute or any of its children
recursively has validations. If ignoreRequired is true then HasValidation
does not consider "Required" validations. This is necessary to know whether
validation code should be generated for types that don't use pointers to
define required fields.



## <a name="Indent">func</a> [Indent](/src/target/funcs.go?s=1502:1538#L65)
``` go
func Indent(s, prefix string) string
```
Indent inserts prefix at the beginning of each non-empty line of s. The
end-of-line marker is NL.



## <a name="KebabCase">func</a> [KebabCase](/src/target/funcs.go?s=2741:2775#L122)
``` go
func KebabCase(name string) string
```
KebabCase produces the kebab-case version of the given CamelCase string.



## <a name="RecursiveValidationCode">func</a> [RecursiveValidationCode](/src/target/validation.go?s=6311:6408#L202)
``` go
func RecursiveValidationCode(att *design.AttributeExpr, req, ptr, def bool, target string) string
```
RecursiveValidationCode produces Go code that runs the validations defined in
the given attribute and its children recursively against the value held by
the variable named target. See ValidationCode for a description of the
arguments and their effects.



## <a name="RegisterPlugin">func</a> [RegisterPlugin](/src/target/plugin.go?s=1174:1234#L35)
``` go
func RegisterPlugin(name string, cmd string, p GenerateFunc)
```
RegisterPlugin adds the plugin to the list of plugins to be invoked with the
given command.



## <a name="RegisterPluginFirst">func</a> [RegisterPluginFirst](/src/target/plugin.go?s=1875:1940#L54)
``` go
func RegisterPluginFirst(name string, cmd string, p GenerateFunc)
```
RegisterPluginFirst adds the plugin to the beginning of the list of plugins
to be invoked with the given command. If more than one plugins are registered
using this, the plugins will be sorted alphabetically by their names. If two
plugins have same names, then they are sorted by registration order.



## <a name="RegisterPluginLast">func</a> [RegisterPluginLast](/src/target/plugin.go?s=2572:2636#L73)
``` go
func RegisterPluginLast(name string, cmd string, p GenerateFunc)
```
RegisterPluginLast adds the plugin to the end of the list of plugins
to be invoked with the given command. If more than one plugins are registered
using this, the plugins will be sorted alphabetically by their names. If two
plugins have same names, then they are sorted by registration order.



## <a name="RunDSL">func</a> [RunDSL](/src/target/testing.go?s=259:313#L19)
``` go
func RunDSL(t *testing.T, dsl func()) *design.RootExpr
```
RunDSL returns the DSL root resulting from running the given DSL.



## <a name="RunDSLWithFunc">func</a> [RunDSLWithFunc](/src/target/testing.go?s=934:1007#L41)
``` go
func RunDSLWithFunc(t *testing.T, dsl func(), fn func()) *design.RootExpr
```
RunDSLWithFunc returns the DSL root resulting from running the given DSL.
It executes a function to add any top-level types to the design Root before
running the DSL.



## <a name="SectionCode">func</a> [SectionCode](/src/target/testing.go?s=1527:1590#L62)
``` go
func SectionCode(t *testing.T, section *SectionTemplate) string
```
SectionCode generates and formats the code for the given section.



## <a name="SectionCodeFromImportsAndMethods">func</a> [SectionCodeFromImportsAndMethods](/src/target/testing.go?s=1771:1893#L67)
``` go
func SectionCodeFromImportsAndMethods(t *testing.T, importSection *SectionTemplate, methodSection *SectionTemplate) string
```
SectionCodeFromImportsAndMethods generates and formats the code for given import and method definition sections.



## <a name="SnakeCase">func</a> [SnakeCase](/src/target/funcs.go?s=2009:2043#L89)
``` go
func SnakeCase(name string) string
```
SnakeCase produces the snake_case version of the given CamelCase string.



## <a name="TemplateFuncs">func</a> [TemplateFuncs](/src/target/funcs.go?s=153:196#L14)
``` go
func TemplateFuncs() map[string]interface{}
```
TemplateFuncs lists common template helper functions.



## <a name="ValidationCode">func</a> [ValidationCode](/src/target/validation.go?s=3253:3350#L96)
``` go
func ValidationCode(att *design.AttributeExpr, req, ptr, def bool, target, context string) string
```
ValidationCode produces Go code that runs the validations defined in the
given attribute definition if any against the content of the variable named
target. The generated code assumes that there is a pre-existing "err"
variable of type error. It initializes that variable in case a validation
fails.

req indicates whether the attribute is required (true) or optional (false) in
which case target is a pointer if ptr is false and def is false or def is
true and there's no default value.

ptr indicates whether the data structure described by att uses pointers to
hold all attributes (even required ones) so that they may be properly
validated.

def indicates whether non required attributes that have a default value should
not be pointers.


	req | ptr | def | pointer?
	 T  |  F  |  F  | F
	 T  |  F  |  T  | F
	 T  |  T  |  F  | T
	 T  |  T  |  T  | T
	 F  |  F  |  F  | T
	 F  |  F  |  T  | F if has default value, T otherwise
	 F  |  T  |  F  | T
	 F  |  T  |  T  | T

context is used to produce helpful messages in case of error.



## <a name="Walk">func</a> [Walk](/src/target/walk.go?s=504:586#L12)
``` go
func Walk(a *design.AttributeExpr, walker func(*design.AttributeExpr) error) error
```
Walk traverses the data structure recursively and calls the given function
once on each attribute starting with a.



## <a name="WalkMappedAttr">func</a> [WalkMappedAttr](/src/target/walk.go?s=1217:1300#L26)
``` go
func WalkMappedAttr(ma *design.MappedAttributeExpr, it MappedAttributeWalker) error
```
WalkMappedAttr iterates over the mapped attributes. It calls the given
function giving each attribute as it iterates. WalkMappedAttr stops if there
is no more attribute to iterate over or if the iterator function returns an
error in which case it returns the error.



## <a name="WalkType">func</a> [WalkType](/src/target/walk.go?s=786:866#L18)
``` go
func WalkType(u design.UserType, walker func(*design.AttributeExpr) error) error
```
WalkType traverses the data structure recursively and calls the given function
once on each attribute starting with the user type attribute.



## <a name="WrapText">func</a> [WrapText](/src/target/funcs.go?s=3022:3069#L133)
``` go
func WrapText(text string, maxChars int) string
```
WrapText produces lines with text capped at maxChars
it will keep words intact and respects newlines.




## <a name="File">type</a> [File](/src/target/file.go?s=513:735#L30)
``` go
type File struct {
    // SectionTemplates is the list of file section templates in
    // order of rendering.
    SectionTemplates []*SectionTemplate
    // Path returns the file path relative to the output directory.
    Path string
}

```
A File contains the logic to generate a complete file.







### <a name="RunPlugins">func</a> [RunPlugins](/src/target/plugin.go?s=3103:3192#L91)
``` go
func RunPlugins(cmd, genpkg string, roots []eval.Root, genfiles []*File) ([]*File, error)
```
RunPlugins executes the plugins registered with the given command in the order
they were registered.





### <a name="File.Render">func</a> (\*File) [Render](/src/target/file.go?s=1870:1919#L69)
``` go
func (f *File) Render(dir string) (string, error)
```
Render executes the file section templates and writes the resulting bytes to
an output file. The path of the output file is computed by appending the file
path to dir. If a file already exists with the computed path then Render
happens the smallest integer value greater than 1 to make it unique. Renders
returns the computed path.




### <a name="File.Section">func</a> (\*File) [Section](/src/target/file.go?s=1330:1384#L54)
``` go
func (f *File) Section(name string) []*SectionTemplate
```
Section returns the section templates with the given name or nil if not found.




## <a name="GenerateFunc">type</a> [GenerateFunc](/src/target/plugin.go?s=434:517#L12)
``` go
type GenerateFunc func(genpkg string, roots []eval.Root, files []*File) ([]*File, error)
```
GenerateFunc makes it possible to modify the files generated by the
goa code generators and other plugins. A GenerateFunc accepts the Go
import path of the "gen" package, the design roots as well as the
currently generated files (produced initially by the goa generators
and potentially modified by previously run plugins) and returns a new
set of files.










## <a name="Hasher">type</a> [Hasher](/src/target/scope.go?s=353:469#L20)
``` go
type Hasher interface {
    // Hash computes a unique instance hash suitable for indexing
    // in a map.
    Hash() string
}
```
Hasher is the interface implemented by the objects that must be
scoped.










## <a name="ImportSpec">type</a> [ImportSpec](/src/target/import.go?s=92:215#L7)
``` go
type ImportSpec struct {
    // Name of imported package if needed.
    Name string
    // Go import path of package.
    Path string
}

```
ImportSpec defines a generated import statement.







### <a name="NewImport">func</a> [NewImport](/src/target/import.go?s=256:301#L16)
``` go
func NewImport(name, path string) *ImportSpec
```
NewImport creates an import spec.


### <a name="SimpleImport">func</a> [SimpleImport](/src/target/import.go?s=418:460#L21)
``` go
func SimpleImport(path string) *ImportSpec
```
SimpleImport creates an import with no explicit path component.





### <a name="ImportSpec.Code">func</a> (\*ImportSpec) [Code](/src/target/import.go?s=558:592#L26)
``` go
func (s *ImportSpec) Code() string
```
Code returns the Go import statement for the ImportSpec.




## <a name="MappedAttributeWalker">type</a> [MappedAttributeWalker](/src/target/walk.go?s=285:381#L8)
``` go
type MappedAttributeWalker func(name, elem string, required bool, a *design.AttributeExpr) error
```
MappedAttributeWalker is the type of functions given to WalkMappedAttr. name
is the name of the attribute, elem the name of the corresponding transport
element (e.g. HTTP header). required is true if the attribute is required.










## <a name="NameScope">type</a> [NameScope](/src/target/scope.go?s=130:270#L13)
``` go
type NameScope struct {
    // contains filtered or unexported fields
}

```
NameScope defines a naming scope.







### <a name="NewNameScope">func</a> [NewNameScope](/src/target/scope.go?s=518:548#L28)
``` go
func NewNameScope() *NameScope
```
NewNameScope creates an empty name scope.





### <a name="NameScope.GoFullTypeName">func</a> (\*NameScope) [GoFullTypeName](/src/target/scope.go?s=4335:4415#L172)
``` go
func (s *NameScope) GoFullTypeName(att *design.AttributeExpr, pkg string) string
```
GoFullTypeName returns the Go type name of the given data type qualified with
the given package name if applicable and if not the empty string.




### <a name="NameScope.GoFullTypeRef">func</a> (\*NameScope) [GoFullTypeRef](/src/target/scope.go?s=3858:3937#L160)
``` go
func (s *NameScope) GoFullTypeRef(att *design.AttributeExpr, pkg string) string
```
GoFullTypeRef returns the Go code that refers to the Go type which matches
the given attribute type defined in the given package if a user type.




### <a name="NameScope.GoTypeDef">func</a> (\*NameScope) [GoTypeDef](/src/target/scope.go?s=2036:2116#L96)
``` go
func (s *NameScope) GoTypeDef(att *design.AttributeExpr, useDefault bool) string
```
GoTypeDef returns the Go code that defines a Go type which matches the data
structure definition (the part that comes after `type foo`).




### <a name="NameScope.GoTypeName">func</a> (\*NameScope) [GoTypeName](/src/target/scope.go?s=4081:4145#L166)
``` go
func (s *NameScope) GoTypeName(att *design.AttributeExpr) string
```
GoTypeName returns the Go type name of the given attribute type.




### <a name="NameScope.GoTypeRef">func</a> (\*NameScope) [GoTypeRef](/src/target/scope.go?s=3577:3640#L153)
``` go
func (s *NameScope) GoTypeRef(att *design.AttributeExpr) string
```
GoTypeRef returns the Go code that refers to the Go type which matches the
given attribute type.




### <a name="NameScope.HashedUnique">func</a> (\*NameScope) [HashedUnique](/src/target/scope.go?s=979:1061#L42)
``` go
func (s *NameScope) HashedUnique(key Hasher, name string, suffix ...string) string
```
HashedUnique builds the unique name for key using name and - if not unique -
appending suffix and - if still not unique - a counter value. It returns
the same value when called multiple times for a key returning the same hash.




### <a name="NameScope.Unique">func</a> (\*NameScope) [Unique](/src/target/scope.go?s=1587:1651#L72)
``` go
func (s *NameScope) Unique(name string, suffix ...string) string
```
Unique returns a unique name for the given name. If given name not unique
the suffix is appended. It still not unique, a counter value is added to
the name until unique.




## <a name="SectionTemplate">type</a> [SectionTemplate](/src/target/file.go?s=880:1244#L40)
``` go
type SectionTemplate struct {
    // Name is the name reported when parsing the source fails.
    Name string
    // Source is used to create the text/template.Template that
    // renders the section text.
    Source string
    // FuncMap lists the functions used to render the templates.
    FuncMap map[string]interface{}
    // Data used as input of template.
    Data interface{}
}

```
A SectionTemplate is a template and accompanying render data. The
template format is described in the (stdlib) text/template package.







### <a name="Header">func</a> [Header](/src/target/header.go?s=111:182#L8)
``` go
func Header(title, pack string, imports []*ImportSpec) *SectionTemplate
```
Header returns a Go source file header section template.





### <a name="SectionTemplate.Write">func</a> (\*SectionTemplate) [Write](/src/target/file.go?s=2876:2926#L120)
``` go
func (s *SectionTemplate) Write(w io.Writer) error
```
Write writes the section to the given writer.




## <a name="TransformFunctionData">type</a> [TransformFunctionData](/src/target/transform.go?s=793:918#L35)
``` go
type TransformFunctionData struct {
    Name          string
    ParamTypeRef  string
    ResultTypeRef string
    Code          string
}

```
TransformFunctionData describes a helper function used to transform
user types. These are necessary to prevent potential infinite
recursion when a type attribute is defined recursively. For example:


	var Recursive = Type("Recursive", func() {
	    Attribute("r", "Recursive")
	}

Transforming this type requires generating an intermediary function:


	 func recursiveToRecursive(r *Recursive) *service.Recursive {
	     var t service.Recursive
	     if r.R != nil {
	         t.R = recursiveToRecursive(r.R)
	     }
	}







### <a name="AppendHelpers">func</a> [AppendHelpers](/src/target/transform.go?s=18744:18824#L575)
``` go
func AppendHelpers(oldH, newH []*TransformFunctionData) []*TransformFunctionData
```
AppendHelpers takes care of only appending helper functions from newH that
are not already in oldH.


### <a name="GoTypeTransform">func</a> [GoTypeTransform](/src/target/transform.go?s=3434:3613#L101)
``` go
func GoTypeTransform(source, target design.DataType, sourceVar, targetVar, sourcePkg, targetPkg string, unmarshal bool, scope *NameScope) (string, []*TransformFunctionData, error)
```
GoTypeTransform produces Go code that initializes the data structure defined
by target from an instance of the data structure described by source. The
data structures can be objects, arrays or maps. The algorithm matches object
fields by name and ignores object fields in target that don't have a match in
source. The matching and generated code leverage mapped attributes so that
attribute names may use the "name:elem" syntax to define the name of the
design attribute and the name of the corresponding generated Go struct field.
The function returns an error if target is not compatible with source
(different type, fields of different type etc).

sourceVar and targetVar contain the name of the variables that hold the
source and target data structures respectively.

sourcePkg and targetPkg contain the name of the Go package that defines the
source or target type respectively in case it's not the same package as where
the generated code lives.

unmarshal if true indicates whether the code is being generated to
initialize a type from unmarshaled data, otherwise to initialize a type that
is marshaled:


	  if unmarshal is true (unmarshal)
	    - The source type uses pointers for all fields - even required ones.
	    - The target type do not use pointers for primitive fields that have
				 default values even when not required.
	
	  if unmarshal is false (marshal)
	    - The source type used do not use pointers for primitive fields that
				 have default values even when not required.
	    - The target type fields are initialized with their default values
				 (if any) when source field is a primitive pointer and nil or a
				 non-primitive type and nil.

scope is used to compute the name of the user types when initializing fields
that use them.









- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
