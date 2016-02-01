+++
title="goa/dslengine"
date="2016-01-31"
description="godoc for goa/dslengine"
categories=["godoc"]
tags=["godoc","dslengine"]
+++

# dslengine
    import "github.com/goadesign/goa/dslengine"






## func Caller
``` go
func Caller() string
```
Caller returns the name of calling function.


## func CanUse
``` go
func CanUse(client, provider Versioned) error
```
CanUse returns nil if the provider supports all the versions supported by the client or if the
provider is unversioned.


## func Execute
``` go
func Execute(dsl func(), def Definition) bool
```
Execute runs the given DSL to initialize the given definition. It returns true on success.
It returns false and appends to Errors on failure.
Note that `Run` takes care of calling `Execute` on all definitions that implement Source.
This function is intended for use by definitions that run the DSL at declaration time rather than
store the DSL for execution by the dsl (usually simple independent definitions).
The DSL should use ReportError to record DSL execution errors.


## func IncompatibleDSL
``` go
func IncompatibleDSL(dslFunc string)
```
IncompatibleDSL should be called by DSL functions when they are
invoked in an incorrect context (e.g. "Params" in "Resource").


## func InvalidArgError
``` go
func InvalidArgError(expected string, actual interface{})
```
InvalidArgError records an invalid argument error.
It is used by DSL functions that take dynamic arguments.


## func ReportError
``` go
func ReportError(fm string, vals ...interface{})
```
ReportError records a DSL error for reporting post DSL execution.


## func Run
``` go
func Run() error
```
Run runs the given root definitions. It iterates over the definition sets multiple times to
first execute the DSL, the validate the resulting definitions and finally finalize them.
The executed DSL may append new roots to the Roots Design package variable to have them be
executed (last) in the same run.


## func TopLevelDefinition
``` go
func TopLevelDefinition(failItNotTopLevel bool) bool
```
TopLevelDefinition returns true if the currently evaluated DSL is a root
DSL (i.e. is not being run in the context of another definition).



## type Definition
``` go
type Definition interface {
    // Context is used to build error messages that refer to the definition.
    Context() string
}
```
Definition is the common interface implemented by all definitions.









### func CurrentDefinition
``` go
func CurrentDefinition() Definition
```
CurrentDefinition returns the definition whose initialization DSL is currently being executed.




## type DefinitionSet
``` go
type DefinitionSet []Definition
```
DefinitionSet contains DSL definitions that are executed as one unit.
The slice elements may implement the Validate an, Source interfaces to enable the
corresponding behaviors during DSL execution.











## type EnumValidationDefinition
``` go
type EnumValidationDefinition struct {
    Values []interface{}
}
```
EnumValidationDefinition represents an enum validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor76">http://json-schema.org/latest/json-schema-validation.html#anchor76</a>.











### func (\*EnumValidationDefinition) Context
``` go
func (v *EnumValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type Error
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











### func (\*Error) Error
``` go
func (de *Error) Error() (res string)
```
Error returns the underlying error message.



## type Finalize
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











## type FormatValidationDefinition
``` go
type FormatValidationDefinition struct {
    Format string
}
```
FormatValidationDefinition represents a format validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor104">http://json-schema.org/latest/json-schema-validation.html#anchor104</a>.











### func (\*FormatValidationDefinition) Context
``` go
func (f *FormatValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type MaxLengthValidationDefinition
``` go
type MaxLengthValidationDefinition struct {
    MaxLength int
}
```
MaxLengthValidationDefinition represents an maximum length validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor26">http://json-schema.org/latest/json-schema-validation.html#anchor26</a>.











### func (\*MaxLengthValidationDefinition) Context
``` go
func (m *MaxLengthValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type MaximumValidationDefinition
``` go
type MaximumValidationDefinition struct {
    Max float64
}
```
MaximumValidationDefinition represents a maximum value validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor17">http://json-schema.org/latest/json-schema-validation.html#anchor17</a>.











### func (\*MaximumValidationDefinition) Context
``` go
func (m *MaximumValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type MetadataDefinition
``` go
type MetadataDefinition map[string][]string
```
MetadataDefinition is a set of key/value pairs











## type MinLengthValidationDefinition
``` go
type MinLengthValidationDefinition struct {
    MinLength int
}
```
MinLengthValidationDefinition represents an minimum length validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor29">http://json-schema.org/latest/json-schema-validation.html#anchor29</a>.











### func (\*MinLengthValidationDefinition) Context
``` go
func (m *MinLengthValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type MinimumValidationDefinition
``` go
type MinimumValidationDefinition struct {
    Min float64
}
```
MinimumValidationDefinition represents an minimum value validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor21">http://json-schema.org/latest/json-schema-validation.html#anchor21</a>.











### func (\*MinimumValidationDefinition) Context
``` go
func (m *MinimumValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type MultiError
``` go
type MultiError []*Error
```
MultiError collects all DSL errors. It implements error.





``` go
var (
    // Errors contains the DSL execution errors if any.
    Errors MultiError

    // Roots contains the root definition sets built by the DSLs.
    // DSL implementations should append to it to ensure the DSL gets executed by the runner.
    // Note that a root definition is a different concept from a "top level" definition (i.e. a
    // definition that is an entry point in the DSL). In particular a root definition may include
    // an arbitrary number of definition sets forming a tree of definitions.
    // For example the API DSL only has one root definition (the API definition) but many top level
    // definitions (API, Version, Type, MediaType etc.) all defining a definition set.
    Roots []Root
)
```






### func (MultiError) Error
``` go
func (m MultiError) Error() string
```
Error returns the error message.



## type PatternValidationDefinition
``` go
type PatternValidationDefinition struct {
    Pattern string
}
```
PatternValidationDefinition represents a pattern validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor33">http://json-schema.org/latest/json-schema-validation.html#anchor33</a>











### func (\*PatternValidationDefinition) Context
``` go
func (f *PatternValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type RequiredValidationDefinition
``` go
type RequiredValidationDefinition struct {
    Names []string
}
```
RequiredValidationDefinition represents a required validation as described at
<a href="http://json-schema.org/latest/json-schema-validation.html#anchor61">http://json-schema.org/latest/json-schema-validation.html#anchor61</a>.











### func (\*RequiredValidationDefinition) Context
``` go
func (r *RequiredValidationDefinition) Context() string
```
Context returns the generic definition name used in error messages.



## type Root
``` go
type Root interface {
    // IterateSets calls the given iterator passing in each definition set sorted in
    // execution order.
    IterateSets(SetIterator)
}
```
Root is the interface implemented by the DSL root objects held by the Roots variable.
These objects contains all the definition sets created by the DSL and can be passed to
the dsl for execution.











## type SetIterator
``` go
type SetIterator func(s DefinitionSet) error
```
SetIterator is the function signature used to iterate over definition sets with
IterateSets.











## type Source
``` go
type Source interface {
    Definition
    // DSL returns the DSL used to initialize the definition if any.
    DSL() func()
}
```
Source is the interface implemented by definitions that can be initialized via DSL.











## type TraitDefinition
``` go
type TraitDefinition struct {
    // Trait name
    Name string
    // Trait DSL
    DSLFunc func()
}
```
TraitDefinition defines a set of reusable properties.











### func (\*TraitDefinition) Context
``` go
func (t *TraitDefinition) Context() string
```
Context returns the generic definition name used in error messages.



### func (\*TraitDefinition) DSL
``` go
func (t *TraitDefinition) DSL() func()
```
DSL returns the initialization DSL.



## type Validate
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











## type ValidationDefinition
``` go
type ValidationDefinition interface {
    Definition
}
```
ValidationDefinition is the common interface for all validation data structures.
It doesn't expose any method and simply exists to help with documentation.











## type ValidationErrors
``` go
type ValidationErrors struct {
    Errors      []error
    Definitions []Definition
}
```
ValidationErrors records the errors encountered when running Validate.











### func (\*ValidationErrors) Add
``` go
func (verr *ValidationErrors) Add(def Definition, format string, vals ...interface{})
```
Add adds a validation error to the target.
Add "flattens" validation errors so that the recorded errors are never ValidationErrors
themselves.



### func (\*ValidationErrors) AsError
``` go
func (verr *ValidationErrors) AsError() *ValidationErrors
```
AsError returns an error if there are validation errors, nil otherwise.



### func (\*ValidationErrors) Error
``` go
func (verr *ValidationErrors) Error() string
```
Error implements the error interface.



### func (\*ValidationErrors) Merge
``` go
func (verr *ValidationErrors) Merge(err *ValidationErrors)
```
Merge merges validation errors into the target.



## type Versioned
``` go
type Versioned interface {
    Definition
    // Versions returns an array of supported versions if the object is versioned, nil
    // othewise.
    Versions() []string
    // SupportsVersion returns true if the object supports the given version.
    SupportsVersion(ver string) bool
    // SupportsNoVersion returns true if the object is unversioned.
    SupportsNoVersion() bool
}
```
Versioned is implemented by potentially versioned definitions such as API resources.

















- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
