+++
title="goa/goagen/codegen"
description="godoc for goa/goagen/codegen"
categories=["godoc"]
tags=["godoc","codegen"]
+++

# codegen
    import "github.com/goadesign/goa/goagen/codegen"

Package codegen contains common code used by all code generators.
Each sub-package corresponds to a code generator.
The "meta" sub-package is the generator generator: it contains code that compiles and runs
a specific generator tool that uses the user metadata.




## Constants
``` go
const Version = "0.0.1"
```
Version of generator tools.


## Variables
``` go
var (
    // OutputDir is the path to the directory the generated files should be
    // written to.
    OutputDir string

    // DesignPackagePath is the path to the user Go design package.
    DesignPackagePath string

    // Debug toggles debug mode.
    // If debug mode is enabled then the generated files are not
    // cleaned up upon failure.
    // Also logs additional debug information.
    // Set this flag to true prior to calling Generate.
    Debug bool

    // NoFormat causes "goimports" to be skipped when true.
    NoFormat bool

    // CommandName is the name of the command being run.
    CommandName string
)
```
``` go
var (

    // DefaultFuncMap is the FuncMap used to initialize all source file templates.
    DefaultFuncMap = template.FuncMap{
        "add":           func(a, b int) int { return a + b },
        "commandLine":   CommandLine,
        "comment":       Comment,
        "goify":         Goify,
        "gonative":      GoNativeType,
        "gopkgtypename": GoPackageTypeName,
        "gopkgtyperef":  GoPackageTypeRef,
        "gotypedef":     GoTypeDef,
        "gotypename":    GoTypeName,
        "gotyperef":     GoTypeRef,
        "join":          strings.Join,
        "mediaTypeMarshalerImpl": MediaTypeMarshalerImpl,
        "recursiveValidate":      RecursiveChecker,
        "tabs":                   Tabs,
        "tempvar":                Tempvar,
        "title":                  strings.Title,
        "toLower":                strings.ToLower,
        "typeMarshaler":          MediaTypeMarshaler,
        "userTypeMarshalerImpl":  UserTypeMarshalerImpl,
        "validationChecker":      ValidationChecker,
        "versionPkg":             VersionPackage,
    }
)
```
``` go
var (
    // TempCount holds the value appended to variable names to make them unique.
    TempCount int
)
```

## func AttributeMarshaler
``` go
func AttributeMarshaler(att *design.AttributeDefinition, versioned bool, defaultPkg string, context, source, target string) string
```
AttributeMarshaler produces the Go code that initiliazes the variable named with the value of
target which holds an interface{} with the content of the variable named with the value of source
which contains an instance of the attribute type data structure. The attribute view is used to
render child attributes if there are any. As with TypeMarshaler the code renders media type links
and runs any validation defined on the type definition.
versioned indicates whether the code is being generated from a version package (true) or from the
default package defaultPkg (false).

The generated code assumes that there is a variable called "err" of type error that it can use
to record errors.


## func CommandLine
``` go
func CommandLine() string
```
CommandLine return the command used to run this process.


## func Comment
``` go
func Comment(elems ...string) string
```
Comment produces line comments by concatenating the given strings and producing 80 characters
long lines starting with "//"


## func GoNativeType
``` go
func GoNativeType(t design.DataType) string
```
GoNativeType returns the Go built-in type from which instances of t can be initialized.


## func GoPackageTypeName
``` go
func GoPackageTypeName(t design.DataType, required []string, versioned bool, defPkg string, tabs int) string
```
GoPackageTypeName returns the Go type name for a data type.
versioned indicates whether the type is being referenced from a version package (true) or the
default package defPkg (false).
required only applies when referring to a user type that is an object defined inline. In this
case the type (Object) does not carry the required field information defined in the parent
(anonymous) attribute.
tabs is used to properly tabulate the object struct fields and only applies to this case.


## func GoPackageTypeRef
``` go
func GoPackageTypeRef(t design.DataType, required []string, versioned bool, defPkg string, tabs int) string
```
GoPackageTypeRef returns the Go code that refers to the Go type which matches the given data type.
versioned indicates whether the type is being referenced from a version package (true) or the
default package defPkg (false).
required only applies when referring to a user type that is an object defined inline. In this
case the type (Object) does not carry the required field information defined in the parent
(anonymous) attribute.
tabs is used to properly tabulate the object struct fields and only applies to this case.


## func GoTypeDef
``` go
func GoTypeDef(ds design.DataStructure, versioned bool, defPkg string, tabs int, jsonTags bool) string
```
GoTypeDef returns the Go code that defines a Go type which matches the data structure
definition (the part that comes after `type foo`).
versioned indicates whether the type is being referenced from a version package (true) or the
default package (false).
tabs is the number of tab character(s) used to tabulate the definition however the first
line is never indented.
jsonTags controls whether to produce json tags.


## func GoTypeName
``` go
func GoTypeName(t design.DataType, required []string, tabs int) string
```
GoTypeName returns the Go type name for a data type.
tabs is used to properly tabulate the object struct fields and only applies to this case.
This function assumes the type is in the same package as the code accessing it.
required only applies when referring to a user type that is an object defined inline. In this
case the type (Object) does not carry the required field information defined in the parent
(anonymous) attribute.


## func GoTypeRef
``` go
func GoTypeRef(t design.DataType, required []string, tabs int) string
```
GoTypeRef returns the Go code that refers to the Go type which matches the given data type
(the part that comes after `var foo`)
required only applies when referring to a user type that is an object defined inline. In this
case the type (Object) does not carry the required field information defined in the parent
(anonymous) attribute.
tabs is used to properly tabulate the object struct fields and only applies to this case.
This function assumes the type is in the same package as the code accessing it.


## func Goify
``` go
func Goify(str string, firstUpper bool) string
```
Goify makes a valid Go identifier out of any string.
It does that by removing any non letter and non digit character and by making sure the first
character is a letter or "_".
Goify produces a "CamelCase" version of the string, if firstUpper is true the first character
of the identifier is uppercase otherwise it's lowercase.


## func Indent
``` go
func Indent(s, prefix string) string
```
Indent inserts prefix at the beginning of each non-empty line of s. The
end-of-line marker is NL.


## func IndentBytes
``` go
func IndentBytes(b, prefix []byte) []byte
```
IndentBytes inserts prefix at the beginning of each non-empty line of b.
The end-of-line marker is NL.


## func MediaTypeMarshaler
``` go
func MediaTypeMarshaler(mt *design.MediaTypeDefinition, versioned bool, defaultPkg, context, source, target, view string) string
```
MediaTypeMarshaler produces the Go code that initializes the variable named target which holds a
an interface{} with the content of the variable named source which contains an instance of the
media type data structure. The code runs any validation defined on the media type definition.
Also view is used to know which fields to copy and which ones to omit and for fields that are
media types which view to use to render it. The rendering also takes care of following links.
The generated code assumes that there is a variable called "err" of type error that it can use
to record errors.
versioned indicates whether the code is being generated from a version package (true) or from the
default package defaultPkg (false).


## func MediaTypeMarshalerImpl
``` go
func MediaTypeMarshalerImpl(mt *design.MediaTypeDefinition, versioned bool, defaultPkg, view string) string
```
MediaTypeMarshalerImpl returns the Go code for a function that marshals and validates instances
of the given media type into raw values using the given view to render the attributes.


## func PackageName
``` go
func PackageName(path string) (string, error)
```
PackageName returns the name of a package at the given path


## func PackagePath
``` go
func PackagePath(path string) (string, error)
```
PackagePath returns the Go package path for the directory that lives under the given absolute
file path.


## func PackagePrefix
``` go
func PackagePrefix(ut *design.UserTypeDefinition, versioned bool, pkg string) string
```
PackagePrefix returns the package prefix to use to access ut from ver given it lives in the
package pkg.


## func PackageSourcePath
``` go
func PackageSourcePath(pkg string) (string, error)
```
PackageSourcePath returns the absolute path to the given package source.


## func RecursiveChecker
``` go
func RecursiveChecker(att *design.AttributeDefinition, nonzero, required bool, target, context string, depth int) string
```
RecursiveChecker produces Go code that runs the validation checks recursively over the given
attribute.


## func RegisterFlags
``` go
func RegisterFlags(r FlagRegistry)
```
RegisterFlags registers the global flags.


## func RunTemplate
``` go
func RunTemplate(tmpl *template.Template, data interface{}) string
```
RunTemplate executs the given template with the given input and returns
the rendered string.


## func Tabs
``` go
func Tabs(depth int) string
```
Tabs returns a string made of depth tab characters.


## func Tempvar
``` go
func Tempvar() string
```
Tempvar generates a unique variable name.


## func TypeMarshaler
``` go
func TypeMarshaler(t design.DataType, versioned bool, defaultPkg, context, source, target string) string
```
TypeMarshaler produces the Go code that initializes the variable named target which is an
interface{} with the content of the variable named source which contains an instance of the type
data structure.
The code takes care of rendering media types according to the view defined on the attribute
if any. It also renders media type links. Finally it validates the results using any type
validation that is defined on the type attributes (if the type contains attributes).
The generated code assumes that there is a variable called "err" of type error that it can use
to record errors.
versioned indicates whether the code is being generated from a version package (true) or from the
default package defaultPkg (false).


## func UserTypeMarshalerImpl
``` go
func UserTypeMarshalerImpl(u *design.UserTypeDefinition, versioned bool, defaultPkg string) string
```
UserTypeMarshalerImpl returns the Go code for a function that marshals and validates instances
of the given user type into raw values using the given view to render the attributes.


## func ValidationChecker
``` go
func ValidationChecker(att *design.AttributeDefinition, nonzero, required bool, target, context string, depth int) string
```
ValidationChecker produces Go code that runs the validation defined in the given attribute
definition against the content of the variable named target recursively.
context is used to keep track of recursion to produce helpful error messages in case of type
validation error.
The generated code assumes that there is a pre-existing "err" variable of type
error. It initializes that variable in case a validation fails.
Note: we do not want to recurse here, recursion is done by the marshaler/unmarshaler code.


## func VersionPackage
``` go
func VersionPackage(version string) string
```
VersionPackage computes a given version package name.
v1 => v1, V1 => v1, 1 => v1, 1.0 => v1 if unique - v1dot0 otherwise.


## func WriteTabs
``` go
func WriteTabs(buf *bytes.Buffer, count int)
```
WriteTabs is a helper function that writes count tabulation characters to buf.



## type BaseCommand
``` go
type BaseCommand struct {
    CmdName        string
    CmdDescription string
}
```
BaseCommand provides the basic logic for all commands. It implements
the Command interface.
Commands may then specialize to provide the specific Run behavior.









### func NewBaseCommand
``` go
func NewBaseCommand(name, desc string) *BaseCommand
```
NewBaseCommand instantiates a base command.




### func (\*BaseCommand) Description
``` go
func (b *BaseCommand) Description() string
```
Description returns the command description.



### func (\*BaseCommand) Name
``` go
func (b *BaseCommand) Name() string
```
Name returns the command name.



### func (\*BaseCommand) RegisterFlags
``` go
func (b *BaseCommand) RegisterFlags(r FlagRegistry)
```
RegisterFlags is a dummy implementation, override in sub-command.



### func (\*BaseCommand) Run
``` go
func (b *BaseCommand) Run() ([]string, error)
```
Run is a dummy implementation, override in sub-command.



## type Command
``` go
type Command interface {
    // Name of the command
    Name() string

    // Description returns the description used by the goa tool help.
    Description() string

    // RegisterFlags initializes the given registry flags with all
    // the flags relevant to this command.
    RegisterFlags(r FlagRegistry)

    // Run generates the generator code then compiles and runs it.
    // It returns the list of generated files.
    // Run uses the variables initialized by the command line defined in RegisterFlags.
    Run() ([]string, error)
}
```
Command is the interface implemented by all generation goa commands.
There is one command per generation target (i.e. app, docs, etc.)











## type FlagRegistry
``` go
type FlagRegistry interface {
    // Flags returns the command flag set
    Flags() *pflag.FlagSet
}
```
FlagRegistry is the interface implemented by cobra.Command to register flags.











## type ImportSpec
``` go
type ImportSpec struct {
    Name string
    Path string
}
```
ImportSpec defines a generated import statement.









### func NewImport
``` go
func NewImport(name, path string) *ImportSpec
```
NewImport creates an import spec.


### func SimpleImport
``` go
func SimpleImport(path string) *ImportSpec
```
SimpleImport creates an import with no explicit path component.




### func (\*ImportSpec) Code
``` go
func (s *ImportSpec) Code() string
```
Code returns the Go import statement for the ImportSpec.



## type Package
``` go
type Package struct {
    // (Go) Path of package
    Path string
    // Workspace containing package
    Workspace *Workspace
}
```
Package represents a temporary Go package









### func PackageFor
``` go
func PackageFor(source string) (*Package, error)
```
PackageFor returns the package for the given source file.




### func (\*Package) Abs
``` go
func (p *Package) Abs() string
```
Abs returns the absolute path to the package source directory



### func (\*Package) Compile
``` go
func (p *Package) Compile(bin string) (string, error)
```
Compile compiles a package and returns the path to the compiled binary.



### func (\*Package) CreateSourceFile
``` go
func (p *Package) CreateSourceFile(name string) *SourceFile
```
CreateSourceFile creates a Go source file in the given package.



## type SourceFile
``` go
type SourceFile struct {
    // Name of the source file
    Name string
    // Package containing source file
    Package *Package
}
```
SourceFile represents a single Go source file









### func SourceFileFor
``` go
func SourceFileFor(path string) (*SourceFile, error)
```
SourceFileFor returns a SourceFile for the file at the given path.




### func (\*SourceFile) Abs
``` go
func (f *SourceFile) Abs() string
```
Abs returne the source file absolute filename



### func (\*SourceFile) ExecuteTemplate
``` go
func (f *SourceFile) ExecuteTemplate(name, source string, funcMap template.FuncMap, data interface{}) error
```
ExecuteTemplate executes the template and writes the output to the file.



### func (\*SourceFile) FormatCode
``` go
func (f *SourceFile) FormatCode() error
```
FormatCode runs "goimports -w" on the source file.



### func (\*SourceFile) Write
``` go
func (f *SourceFile) Write(b []byte) (int, error)
```
Write implements io.Writer so that variables of type *SourceFile can be
used in template.Execute.



### func (\*SourceFile) WriteHeader
``` go
func (f *SourceFile) WriteHeader(title, pack string, imports []*ImportSpec) error
```
WriteHeader writes the generic generated code header.



## type Workspace
``` go
type Workspace struct {
    // Path is the absolute path to the workspace directory.
    Path string
    // contains filtered or unexported fields
}
```
Workspace represents a temporary Go workspace









### func NewWorkspace
``` go
func NewWorkspace(prefix string) (*Workspace, error)
```
NewWorkspace returns a newly created temporary Go workspace.
Use Delete to delete the corresponding temporary directory when done.


### func WorkspaceFor
``` go
func WorkspaceFor(source string) (*Workspace, error)
```
WorkspaceFor returns the Go workspace for the given Go source file.




### func (\*Workspace) Delete
``` go
func (w *Workspace) Delete()
```
Delete deletes the workspace temporary directory.



### func (\*Workspace) NewPackage
``` go
func (w *Workspace) NewPackage(goPath string) (*Package, error)
```
NewPackage creates a new package in the workspace. It deletes any pre-existing package.
goPath is the go package path used to import the package.



### func (\*Workspace) Reset
``` go
func (w *Workspace) Reset() error
```
Reset removes all content from the workspace.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md))
