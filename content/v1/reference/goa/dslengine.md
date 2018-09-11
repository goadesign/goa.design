+++
date="2018-09-11T15:21:35-07:00"
description="github.com/goadesign/goa/dslengine"
+++


# dslengine
`import "github.com/goadesign/goa/dslengine"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func Execute(dsl func(), def Definition) bool](#Execute)
* [func FailOnError(err error)](#FailOnError)
* [func IncompatibleDSL()](#IncompatibleDSL)
* [func InvalidArgError(expected string, actual interface{})](#InvalidArgError)
* [func IsTopLevelDefinition() bool](#IsTopLevelDefinition)
* [func PrintFilesOrFail(files []string, err error)](#PrintFilesOrFail)
* [func Register(r Root)](#Register)
* [func ReportError(fm string, vals ...interface{})](#ReportError)
* [func Reset()](#Reset)
* [func Run() error](#Run)
* [type Definition](#Definition)
  * [func CurrentDefinition() Definition](#CurrentDefinition)
* [type DefinitionSet](#DefinitionSet)
* [type Error](#Error)
  * [func (de *Error) Error() string](#Error.Error)
* [type Finalize](#Finalize)
* [type MetadataDefinition](#MetadataDefinition)
* [type MultiError](#MultiError)
  * [func (m MultiError) Error() string](#MultiError.Error)
* [type Root](#Root)
  * [func SortRoots() ([]Root, error)](#SortRoots)
* [type SetIterator](#SetIterator)
* [type Source](#Source)
* [type TopLevelDefinition](#TopLevelDefinition)
  * [func (t *TopLevelDefinition) Context() string](#TopLevelDefinition.Context)
* [type TraitDefinition](#TraitDefinition)
  * [func (t *TraitDefinition) Context() string](#TraitDefinition.Context)
  * [func (t *TraitDefinition) DSL() func()](#TraitDefinition.DSL)
* [type Validate](#Validate)
* [type ValidationDefinition](#ValidationDefinition)
  * [func (v *ValidationDefinition) AddRequired(required []string)](#ValidationDefinition.AddRequired)
  * [func (v *ValidationDefinition) Context() string](#ValidationDefinition.Context)
  * [func (v *ValidationDefinition) Dup() *ValidationDefinition](#ValidationDefinition.Dup)
  * [func (v *ValidationDefinition) HasRequiredOnly() bool](#ValidationDefinition.HasRequiredOnly)
  * [func (v *ValidationDefinition) Merge(other *ValidationDefinition)](#ValidationDefinition.Merge)
* [type ValidationErrors](#ValidationErrors)
  * [func (verr *ValidationErrors) Add(def Definition, format string, vals ...interface{})](#ValidationErrors.Add)
  * [func (verr *ValidationErrors) AddError(def Definition, err error)](#ValidationErrors.AddError)
  * [func (verr *ValidationErrors) AsError() *ValidationErrors](#ValidationErrors.AsError)
  * [func (verr *ValidationErrors) Error() string](#ValidationErrors.Error)
  * [func (verr *ValidationErrors) Merge(err *ValidationErrors)](#ValidationErrors.Merge)


#### <a name="pkg-files">Package files</a>
[definitions.go](/src/github.com/goadesign/goa/dslengine/definitions.go) [runner.go](/src/github.com/goadesign/goa/dslengine/runner.go) [validation.go](/src/github.com/goadesign/goa/dslengine/validation.go) 





## <a name="Execute">func</a> [Execute](/src/target/runner.go?s=3042:3087#L126)
``` go
func Execute(dsl func(), def Definition) bool
```
Execute runs the given DSL to initialize the given definition. It returns true on success.
It returns false and appends to Errors on failure.
Note that `Run` takes care of calling `Execute` on all definitions that implement Source.
This function is intended for use by definitions that run the DSL at declaration time rather than
store the DSL for execution by the dsl engine (usually simple independent definitions).
The DSL should use ReportError to record DSL execution errors.



## <a name="FailOnError">func</a> [FailOnError](/src/target/runner.go?s=4722:4749#L183)
``` go
func FailOnError(err error)
```
FailOnError will exit with code 1 if `err != nil`. This function
will handle properly the MultiError this dslengine provides.



## <a name="IncompatibleDSL">func</a> [IncompatibleDSL](/src/target/runner.go?s=5357:5379#L207)
``` go
func IncompatibleDSL()
```
IncompatibleDSL should be called by DSL functions when they are
invoked in an incorrect context (e.g. "Params" in "Resource").



## <a name="InvalidArgError">func</a> [InvalidArgError](/src/target/runner.go?s=5593:5650#L214)
``` go
func InvalidArgError(expected string, actual interface{})
```
InvalidArgError records an invalid argument error.
It is used by DSL functions that take dynamic arguments.



## <a name="IsTopLevelDefinition">func</a> [IsTopLevelDefinition](/src/target/runner.go?s=3654:3686#L148)
``` go
func IsTopLevelDefinition() bool
```
IsTopLevelDefinition returns true if the currently evaluated DSL is a root
DSL (i.e. is not being run in the context of another definition).



## <a name="PrintFilesOrFail">func</a> [PrintFilesOrFail](/src/target/runner.go?s=5112:5160#L200)
``` go
func PrintFilesOrFail(files []string, err error)
```
PrintFilesOrFail will print the file list. Use it with a
generator's `Generate()` function to output the generated list of
files or quit on error.



## <a name="Register">func</a> [Register](/src/target/runner.go?s=1097:1118#L53)
``` go
func Register(r Root)
```
Register adds a DSL Root to be executed by Run.



## <a name="ReportError">func</a> [ReportError](/src/target/runner.go?s=4188:4236#L163)
``` go
func ReportError(fm string, vals ...interface{})
```
ReportError records a DSL error for reporting post DSL execution.



## <a name="Reset">func</a> [Reset](/src/target/runner.go?s=1503:1515#L70)
``` go
func Reset()
```
Reset uses the registered RootFuncs to re-initialize the DSL roots.
This is useful to tests.



## <a name="Run">func</a> [Run](/src/target/runner.go?s=1859:1875#L81)
``` go
func Run() error
```
Run runs the given root definitions. It iterates over the definition sets
multiple times to first execute the DSL, the validate the resulting
definitions and finally finalize them. The executed DSL may register new
roots to have them be executed (last) in the same run.




## <a name="Definition">type</a> [Definition](/src/target/definitions.go?s=113:232#L8)
``` go
type Definition interface {
    // Context is used to build error messages that refer to the definition.
    Context() string
}
```
Definition is the common interface implemented by all definitions.







### <a name="CurrentDefinition">func</a> [CurrentDefinition](/src/target/runner.go?s=3364:3399#L138)
``` go
func CurrentDefinition() Definition
```
CurrentDefinition returns the definition whose initialization DSL is currently being executed.





## <a name="DefinitionSet">type</a> [DefinitionSet](/src/target/definitions.go?s=445:471#L16)
``` go
type DefinitionSet []Definition
```
DefinitionSet contains DSL definitions that are executed as one unit.
The slice elements may implement the Validate an, Source interfaces to enable the
corresponding behaviors during DSL execution.










## <a name="Error">type</a> [Error](/src/target/runner.go?s=589:653#L30)
``` go
type Error struct {
    GoError error
    File    string
    Line    int
}

```
Error represents an error that occurred while running the API DSL.
It contains the name of the file and line number of where the error
occurred as well as the original Go error.










### <a name="Error.Error">func</a> (\*Error) [Error](/src/target/runner.go?s=5990:6021#L229)
``` go
func (de *Error) Error() string
```
Error returns the underlying error message.




## <a name="Finalize">type</a> [Finalize](/src/target/definitions.go?s=2179:2348#L58)
``` go
type Finalize interface {
    Definition
    // Finalize is run by the DSL runner once the definition DSL has executed and the
    // definition has been validated.
    Finalize()
}
```
Finalize is the interface implemented by definitions that require an additional pass
after the DSL has executed (e.g. to merge generated definitions or initialize default
values)










## <a name="MetadataDefinition">type</a> [MetadataDefinition](/src/target/definitions.go?s=2545:2583#L70)
``` go
type MetadataDefinition map[string][]string
```
MetadataDefinition is a set of key/value pairs










## <a name="MultiError">type</a> [MultiError](/src/target/runner.go?s=717:736#L37)
``` go
type MultiError []*Error
```
MultiError collects all DSL errors. It implements error.


``` go
var (
    // Errors contains the DSL execution errors if any.
    Errors MultiError
)
```









### <a name="MultiError.Error">func</a> (MultiError) [Error](/src/target/runner.go?s=5788:5822#L220)
``` go
func (m MultiError) Error() string
```
Error returns the error message.




## <a name="Root">type</a> [Root](/src/target/definitions.go?s=662:1393#L21)
``` go
type Root interface {
    // DSLName is displayed by the runner upon executing the DSL.
    // Registered DSL roots must have unique names.
    DSLName() string
    // DependsOn returns the list of other DSL roots this root depends on.
    // The DSL engine uses this function to order execution of the DSLs.
    DependsOn() []Root
    // IterateSets implements the visitor pattern: is is called by the engine so the
    // DSL can control the order of execution. IterateSets calls back the engine via
    // the given iterator as many times as needed providing the DSL definitions that
    // must be run for each callback.
    IterateSets(SetIterator)
    // Reset restores the root to pre DSL execution state.
    // This is mainly used by tests.
    Reset()
}
```
Root is the interface implemented by the DSL root objects.
These objects contains all the definition sets created by the DSL and can
be passed to the dsl engine for execution.







### <a name="SortRoots">func</a> [SortRoots](/src/target/runner.go?s=8636:8668#L338)
``` go
func SortRoots() ([]Root, error)
```
SortRoots orders the DSL roots making sure dependencies are last. It returns an error if there
is a dependency cycle.





## <a name="SetIterator">type</a> [SetIterator](/src/target/definitions.go?s=2452:2491#L67)
``` go
type SetIterator func(s DefinitionSet) error
```
SetIterator is the function signature used to iterate over definition sets with
IterateSets.










## <a name="Source">type</a> [Source](/src/target/definitions.go?s=1869:1985#L49)
``` go
type Source interface {
    Definition
    // DSL returns the DSL used to initialize the definition if any.
    DSL() func()
}
```
Source is the interface implemented by definitions that can be initialized via DSL.










## <a name="TopLevelDefinition">type</a> [TopLevelDefinition](/src/target/runner.go?s=3936:3968#L156)
``` go
type TopLevelDefinition struct{}

```
TopLevelDefinition represents the top-level file definitions, done
with `var _ = `.  An instance of this object is returned by
`CurrentDefinition()` when at the top-level.










### <a name="TopLevelDefinition.Context">func</a> (\*TopLevelDefinition) [Context](/src/target/runner.go?s=4049:4094#L160)
``` go
func (t *TopLevelDefinition) Context() string
```
Context tells the DSL engine which context we're in when showing
errors.




## <a name="TraitDefinition">type</a> [TraitDefinition](/src/target/definitions.go?s=2644:2733#L73)
``` go
type TraitDefinition struct {
    // Trait name
    Name string
    // Trait DSL
    DSLFunc func()
}

```
TraitDefinition defines a set of reusable properties.










### <a name="TraitDefinition.Context">func</a> (\*TraitDefinition) [Context](/src/target/definitions.go?s=4195:4237#L110)
``` go
func (t *TraitDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="TraitDefinition.DSL">func</a> (\*TraitDefinition) [DSL](/src/target/definitions.go?s=4370:4408#L118)
``` go
func (t *TraitDefinition) DSL() func()
```
DSL returns the initialization DSL.




## <a name="Validate">type</a> [Validate](/src/target/definitions.go?s=1530:1778#L40)
``` go
type Validate interface {
    Definition
    // Validate returns nil if the definition contains no validation error.
    // The Validate implementation may take advantage of ValidationErrors to report
    // more than one errors at a time.
    Validate() error
}
```
Validate is the interface implemented by definitions that can be validated.
Validation is done by the DSL dsl post execution.










## <a name="ValidationDefinition">type</a> [ValidationDefinition](/src/target/definitions.go?s=2805:4120#L81)
``` go
type ValidationDefinition struct {
    // Values represents an enum validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor76.
    Values []interface{}
    // Format represents a format validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor104.
    Format string
    // PatternValidationDefinition represents a pattern validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor33
    Pattern string
    // Minimum represents an minimum value validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor21.
    Minimum *float64
    // Maximum represents a maximum value validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor17.
    Maximum *float64
    // MinLength represents an minimum length validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor29.
    MinLength *int
    // MaxLength represents an maximum length validation as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor26.
    MaxLength *int
    // Required list the required fields of object attributes as described at
    // http://json-schema.org/latest/json-schema-validation.html#anchor61.
    Required []string
}

```
ValidationDefinition contains validation rules for an attribute.










### <a name="ValidationDefinition.AddRequired">func</a> (\*ValidationDefinition) [AddRequired](/src/target/definitions.go?s=5391:5452#L154)
``` go
func (v *ValidationDefinition) AddRequired(required []string)
```
AddRequired merges the required fields from other into v




### <a name="ValidationDefinition.Context">func</a> (\*ValidationDefinition) [Context](/src/target/definitions.go?s=4503:4550#L123)
``` go
func (v *ValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="ValidationDefinition.Dup">func</a> (\*ValidationDefinition) [Dup](/src/target/definitions.go?s=6058:6116#L184)
``` go
func (v *ValidationDefinition) Dup() *ValidationDefinition
```
Dup makes a shallow dup of the validation.




### <a name="ValidationDefinition.HasRequiredOnly">func</a> (\*ValidationDefinition) [HasRequiredOnly](/src/target/definitions.go?s=5751:5804#L170)
``` go
func (v *ValidationDefinition) HasRequiredOnly() bool
```
HasRequiredOnly returns true if the validation only has the Required field with a non-zero value.




### <a name="ValidationDefinition.Merge">func</a> (\*ValidationDefinition) [Merge](/src/target/definitions.go?s=4607:4672#L128)
``` go
func (v *ValidationDefinition) Merge(other *ValidationDefinition)
```
Merge merges other into v.




## <a name="ValidationErrors">type</a> [ValidationErrors](/src/target/validation.go?s=123:202#L9)
``` go
type ValidationErrors struct {
    Errors      []error
    Definitions []Definition
}

```
ValidationErrors records the errors encountered when running Validate.










### <a name="ValidationErrors.Add">func</a> (\*ValidationErrors) [Add](/src/target/validation.go?s=780:865#L33)
``` go
func (verr *ValidationErrors) Add(def Definition, format string, vals ...interface{})
```
Add adds a validation error to the target.




### <a name="ValidationErrors.AddError">func</a> (\*ValidationErrors) [AddError](/src/target/validation.go?s=1082:1147#L40)
``` go
func (verr *ValidationErrors) AddError(def Definition, err error)
```
AddError adds a validation error to the target.
AddError "flattens" validation errors so that the recorded errors are never ValidationErrors
themselves.




### <a name="ValidationErrors.AsError">func</a> (\*ValidationErrors) [AsError](/src/target/validation.go?s=1486:1543#L51)
``` go
func (verr *ValidationErrors) AsError() *ValidationErrors
```
AsError returns an error if there are validation errors, nil otherwise.




### <a name="ValidationErrors.Error">func</a> (\*ValidationErrors) [Error](/src/target/validation.go?s=245:289#L15)
``` go
func (verr *ValidationErrors) Error() string
```
Error implements the error interface.




### <a name="ValidationErrors.Merge">func</a> (\*ValidationErrors) [Merge](/src/target/validation.go?s=526:584#L24)
``` go
func (verr *ValidationErrors) Merge(err *ValidationErrors)
```
Merge merges validation errors into the target.








- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
