+++
date = "2016-01-30T11:01:06-05:00"
title = "Extending goa with Plugin DSLs"
weight = 2
+++

goa plugins make it possible to create new DSL and accompanying generators. Since DSLs are nothing
more than Go functions their syntax is completely open. Plugins also make it possible to generate
new kinds of outputs from any DSL. For example new generators that target different languages from
the goa API design language.

The combination of these two dimensions make goa plugins very powerful allowing to create new DSLs
and generators that target any use case where generating code, documentation, configuration or
anything else is useful.

Another interesting aspect is that DSLs complete each other. It is not necessary to write a new DSL
from scratch, one may add a few new keywords to the built-in API DSL for example. The new DSL
implementation can create new artifacts or change how existing artifacts are created.

## Extending the DSL

goa DSLs consist of Go package functions that construct recursive data structures called
*definitions*. The roots of these definitions must be recorded in the goa *dslengine* package via
the
[Register](http://goa.design/reference/goa/dslengine/#func-register-a-name-dslengine-register-a:1e0eb94feca2c8be53d3bd77a1934133)
function. The actual content of the definitions is completely up to you. The generators use them to
create the artifacts so they should contain all the required information to do the generation.

### First Exposure

Here is an example of a function defining a new DSL function `Model` that accepts a name and creates
a `ModelDefinition` data structure:

```go
package modeldsl

// ModelDefinition describes a model defined via DSL.
type ModelDefinition struct {
	// Name is the model name
	Name string
}

// The definition built by the DSL
var model *ModelDefinition

// Model creates a new model with the given name.
func Model(name string) {
	model = &ModelDefinition{Name: name}
}
```
As you can see, nothing special - just a package function `Model` that builds a data structure
`ModelDefinition` and stores it in a package variable.

A common pattern used to implement expressive DSLs is to accept an anonymous function as last
argument of the DSL function. This function argument can then call other DSL functions to build
up the data structure. Expanding on the example above, let's add a new field to the model - say
`Type` which can be one of `"TEXT"` or `"INTEGER"`. Let's introduce a new DSL function `Type` that
makes it possible to specify the value for that field:
```go
package modeldsl


// ModelDefinition describes a model.
type ModelDefinition struct {
	// Name is the model name
	Name string
	// Type is the model type
	Type string
}

// The definition built by the DSL
var model *ModelDefinition

// Model creates a new model with the given name.
func Model(name string, dsl func()) {
	model = &ModelDefinition{Name: name}
	dsl()
}

// Type sets the type of the model being built.
func Type(value string) {
	if value != "TEXT" && value != "INTEGER" {
		panic("invalid DSL!")
	}
	model.Type = value
}
```
With the above our users can now describe their models using something like:
```go
var _ = Model("bottle", func() {
	Type("TEXT")
}
```
Looking good! Another common pattern used to build DSLs are variadic functions. Such functions make
it possible to define optional arguments. Expanding again our DSL, we now want to allow users to
define models with type `VARCHAR` however that type also requires an extra length value. We could
model this by allowing an extra - optional - argument to our `Type` function:
```go
// Type sets the type of the model being built.
func Type(value string, extra ...interface{}) {
	if value != "TEXT" && value != "INTEGER" && value != "VARCHAR" {
		panic("invalid DSL!")
	}
	if value == "VARCHAR" {
		if len(extra) == 0 {
			panic("invalid DSL!")
		}
		length, ok := extra[0].(int)
		if !ok {
			panic("invalid DSL!")
		}
		model.TypeLen = length // TypeLen is a int field on ModelDefinition
	}
	model.Type = value
}
```
OK, stepping back a bit: DSLs are nothing more than package functions that build package variables.
There are a few common patterns used to make the DSLs easier to use such as anonymous functions as
argument or variadic functions. The example above also used `interface{}` as argument type making
it possible for the DSL user to pass in any value which can be also very helpful to build
powerful DSLs.

### Plugging Into the goa DSL Engine

While the DSL above works it is clearly fairly limited, it builds only one data structure and
doesn't handle errors very gracefully. Errors and error reporting is crucial when writing a DSL as
they are the first thing users experience. goa comes with a DSL engine that helps with building
the recursive data structures and provide a standard framework for recording and reporting errors.

#### DSL Engine Execution Flow

Before jumping into the details of implementing a DSL on top of the goa engine it is helpful to
understand the steps involved during execution at a high level. Backing off: what is executing a
DSL? two things:

1. The `Go` runtime evaluates the global variables when the generator program loads. This causes
   all the DSL functions called that way to get run and produce a first set of definitions.
2. Some of these functions may save anonymous functions in the definition data structures for
   deferred execution. The goa DSL engine runs these functions that may create and initialize
   additional definitions.

In the example above the `Type` function ran the provided `dsl` anonymous function right away. This
is not always possible as the code may rely on other definitions being created first. In this case
a common pattern consists of storing the dsl function inside the definition itself. The goa DSL
engine then takes care of running that function once all "top level" definitions have been created.

The flow of execution is thus:

1. The `Go` runtime evaluates the design package variables which create the first set of definitions.
2. The goa DSL engine traverses this first set and runs embedded anonymous function (second pass).
3. The goa DSL engine makes another pass to validate the definitions.
4. The goa DSL engine makes a final pass to finalize the definitions.

Validation and finalization are discussed in more details below, they do what you would expect
though which is validating that definitions are consistent, not missing information etc. and
giving the opportunity to massage their content before the generators consume them.

A final note on the execution flow: if errors happen at any of the stages then the execution is
stopped after that stage completes. This allows reporting multiple errors at once while avoiding
to start the execution of a stage with invalid data.

#### DSL Definitions

The definitions built by a DSL executed by the goa engine must all implement the `dslengine`
[Definition](https://godoc.org/github.com/goadesign/goa/dslengine#Definition) interface. This
interface defines a single method `Context()` which returns a string used by the engine to build
error messages. The value of the string should help users understand where the error occurred. In
the example above the method could return the model name.

The `dslengine` package defines 4 additional interfaces that definitions may optionally implement:

The [Source](https://godoc.org/github.com/goadesign/goa/dslengine#Source) interface must be
implemented by definitions that are built with a DSL function that accepts an anonymous function
as last argument. The `DSL()` function returns this anonymous function so that the goa DSL engine
may execute it in phase 2.

The [Validate](https://godoc.org/github.com/goadesign/goa/dslengine#Validate)
interface exposes the `Validate()` method which is called by the goa DSL engine once
all the definitions have been built - in phase 3. The implementation must return a meaningful error
in case the definition is inconsistent or missing information (i.e. the user didn't use the DSL
correctly). In the example above the check for whether a type has the right value could be done in
the `Validate()` function.

The [Finalize](https://godoc.org/github.com/goadesign/goa/dslengine#Finalize) function is the
function called in phase 4. It may set default values in definition fields for example or
denormalize fields into data structures that are easier to consume by the generators.

Going back to the example, here is how the `ModelDefinition` data structure could be implemented
to take advantage of the DSL engine:
```go
// ModelDefinition describes a model.
type ModelDefinition struct {
	// dsl that initializes the model
	dsl func()
	// Name is the model name
	Name string
	// Type is the model type
	Type string
	// TypeLen is the len of VARCHAR types
	TypeLen int
	// GenType is used by the code generator
	GenType string
}

// Context returns the part of the error message used to identify the model.
func (m *ModelDefinition) Context() string {
	return fmt.Sprintf("model %s", m.Name)
}

// Source returns the user defined DSL.
func (m *ModelDefinition) DSL() func() {
	return m.dsl
}

// Validate makes sure the model type is correct.
func (m *ModelDefinition) Validate() error {
	if m.Type != "TEXT" && m.Type != "INTEGER" && m.Type != "VARCHAR" {
		return fmt.Errorf("invalid model type %#v, must be one of TEXT, INTEGER or VARCHAR", m.Type)
	}
	if m.Type == "VARCHAR" {
		if m.TypeLen == 0 {
			return fmt.Errorf("invalid VARCHAR length, must be greater than 0 and lesser than 256")
		}
	}
	return nil
}

// Finalize computes the type name and stores it for the generator to use.
func (m *ModelDefinition) Finalize() {
	if m.Type == "VARCHAR" {
		m.GenType = fmt.Sprintf("VARCHAR(%d)", m.TypeLen)
	} else {
		m.GenType = m.Type
	}
}
```
Given the data structure above the goa DSL engine takes care of calling each method in the right
order and also of reporting errors in a consistent way to the user.

#### The DSL Roots

The last piece of the puzzle when creating a new DSL is to define the DSL *roots* that the DSL
engine executes. The roots must be registerd with the `dslengine` package using the
[Register](http://goa.design/reference/goa/dslengine.html#func-register-a-name-dslengine-register-a:1e0eb94feca2c8be53d3bd77a1934133)
function. DSL roots implement the [Root](http://goa.design/reference/goa/dslengine.html#type-root-a-name-dslengine-root-a:1e0eb94feca2c8be53d3bd77a1934133)
interface which exposes the `IterateSets` method that the engine uses to iterate through the
definitions for execution. `IterateSets` returns a slice of definitions allowing you to control the order in
which different types of definitions should be executed.

Imagine that the DSL in the example above was extended to make it possible to define the model
types rather than having a hard coded list. Presumably the type definitions would have to be run
first before the model definitions. This could be done by having the DSL root `IterateSets` method
first return all type definitions then all model definitions:

```go
package modeldsl

// Root is the data structure built by the DSL.
type Root struct {
	Models []*ModelDefinition
	Types []*TypeDefinition
}

// dslRoot contains the instance of Root built by the DSL
var dslRoot = &Root{}

// IterateSets first returns the type definitions then the model definitions.
func (r *Root) IterateSets(it dslengine.SetIterator) {
	err := it(r.Types)
	if err != nil {
		return // The errors will be reported to the user by the DSL engine.
	}
	it(r.Models)
}
```
Tying it all together the DSL functions would initialize the `dslRoot` variable, for example:
```go
// Model creates a new model with the given name.
func Model(name string, dsl func()) {
	model = &ModelDefinition{Name: name, dsl: dsl}
	dslRoot.Models = append(dslRoot.Models, model)
}
```

### Implementing DSL Functions

This section covers additional information helpful to implement DSL functions. These include error
reporting, details on the engine context stack and additional helper functions that are useful
when implementing DSLs.

#### Reporting Errors

Real DSL implementations should not rely on `panic` to report user error. Instead the `dslengine`
package exposes a few functions that take care of reporting the error message together with
contextual information including the line and column numbers of where the error occurred.

The main error reporting function is
[ReportError](https://godoc.org/github.com/goadesign/goa/dslengine#ReportError) which works very
much like `fmt.Errorf`. Simply provide a error message optionally formatted a la `fmt.Sprintf`.

Another useful function is
[InvalidArgError](https://godoc.org/github.com/goadesign/goa/dslengine#InvalidArgError) which as its
name indicates is meant to be called when a DSL function is called with incorrect arguments. This
happens for example when the Go function parameters use `interface{}` to allow for an expressive
DSL. The DSL function code validates the input and uses
[InvalidArgError](https://godoc.org/github.com/goadesign/goa/dslengine#InvalidArgError) to report
invalid values.

Another function is
[IncompatibleDSL](https://godoc.org/github.com/goadesign/goa/dslengine#IncompatibleDSL). The use
case for this function is covered in the paragraph below.

All the error reporting functions build user friendly error messages and append them to the
`dslengine` package [Errors](https://godoc.org/github.com/goadesign/goa/dslengine#Errors) variable.

#### The Context Stack

While not strictly required to implement a DSL it may be useful to be aware of how the engine
works to take full advantage of it. A particularly interesting concept is the context stack. When
the engine executes it adds the currently executed definition to the context stack - that's the
definition that implements the `Source` interface and whose DSL is being executed. The current
definition at the top of the context stack can be retrieved via the [CurrentDefinition](https://godoc.org/github.com/goadesign/goa/dslengine#CurrentDefinition)
function.

This is useful to validate that a DSL function is being called in the right context,
for example in the Model DSL above you wouldn't want `Type` to be called anywhere else but when
the `Model` function is executed. The `Type` function could check as follows:
```go
// Type sets the type of the model being built.
func Type(value string, extra ...interface{}) {
  model, ok := dslengine.CurrentDefinition().(*ModelDefinition)
  if !ok {
    panic("invalid use of the Type function")
  }
  // ... initialize "model"
}
```
In fact this case is so common that `dslengine` exposes an [IncompatibleDSL](https://godoc.org/github.com/goadesign/goa/dslengine#IncompatibleDSL)
function that DSL implementations can call in this case:
```go
// Type sets the type of the model being built.
func Type(value string, extra ...interface{}) {
  model, ok := dslengine.CurrentDefinition().(*ModelDefinition)
  if !ok {
    dslengine.IncompatibleDSL("Type")
    return
  }
  // ... initialize "model"
}
```
`IncompatibleDSL` uses the value returned by the current definition `Context` method to build a
nice error message.

##### Running DSLs

The [Execute](https://godoc.org/github.com/goadesign/goa/dslengine#Execute) function takes an
anonymous function and a definition as argument. It appends the definition to the context stack
and executes the DSL. If the DSL reports errors it returns false otherwise returns true. This
function is useful to run DSL that don't depend on anything else and can be run when the Go
runtime does the initial evaluation of the global variables rather than when the goa DSL engine
runs the source definitions.

#### Integrating DSLs

DSL implementations make take advantage of definitions defined by other DSLs by simply importing the
corresponding package. For example a DSL that extends the goa API DSL can use the same definitions
used by goa itself. This makes it possible to easily add new keywords and extend any DSL. As an
example let's add a `Cluster` function to the existing
[API](https://godoc.org/github.com/goadesign/goa/design/apidsl#API) function of the goa DSL. This
function takes a string and initializes a `ClusterDefinition`:

```go
package clusterdsl

import "github.com/goadesign/goa/design/apidsl"

// ClusterDefinition defines a cluster.
type ClusterDefinition struct {
	// Name of cluster
	Name string
	// API is the goa API DSL definition that belongs to cluster.
	API *apidsl.APIDefinition
}

// Root is the DSL root.
type Root struct {
	Clusters []*ClusterDefinition
}

// DSL root
var dslRoot &Root{}

// Register the DSL root with the DSL engine.
func init() {
	dslengine.Roots = append(dslengine.Roots, dslRoot)
}

// Cluster defines a cluster for an API.
func Cluster(name string) {
	api, ok := dslengine.CurrentDefinition().(*apidsl.APIDefinition)
	if !ok {
		dslengine.InvalidDSL("Cluster")
		return
	}
	c := &ClusterDefinition{Name: name, API: api}
	dslRoot.Clusters = append(dslRoot.Clusters, c)
}
```
The generator will have access to the goa API definition to generate the artifacts.

#### Attributes

The goa API DSL defines an [attribute
definition](https://godoc.org/github.com/goadesign/goa/design#AttributeDefinition) data structure
which represents a generic field. Attributes have a type and may contain other attributes (if the
type is [Object](https://godoc.org/github.com/goadesign/design#Object)). They also define validation
rules (required fields and for each field additional validations). Attributes are useful to many
DSLs and having the ability to define attributes inside plugin data structures is a common scenario.
This scenario is supported via the use of the `ContainerDefinition` interface. Basically, the
`Attribute` DSL checks whether the including parent is an attribute itself, a media type or a
generic/plugin Container definition.

### Wrapping-up

Writing a DSL consists of writing public package functions that build up definitions. The goa
[dslengine](https://godoc.org/github.com/goadesign/goa/dslengine) package provides a simple
framework for executing the DSL and reporting errors to users. Definition data structures may
implement a number of interfaces to plug into the engine and take advantage of the execution
lifecycle. The DSL must register its root objects in the DSL engine package
[Roots](https://godoc.org/github.com/goadesign/goa/dslengine#Roots) variable for the engine to
execute the DSL.

Now that we have a DSL and that it creates definitions the next step is to actually use them to
produce outputs. Enter generators.
