+++
date = "2016-01-30T11:01:06-05:00"
title = "Authoring Plugins"
tags = ["plugins"]
categories = ["Plugins"]
+++

# Extending goa with Plugins

## What are goa Plugins?

goa plugins act on two different levels:

* They make it possible to extend goa with new DSLs. The syntax for the DSLs is completely up to
  you which means new DSLs can be created that describe anything. Examples are database models,
  runtime environments, related services that may not be implemented using the goa runtime etc.
* Plugins also make it possible to generate new kinds of outputs from any DSL. For example new
  generators that target different languages and use the built-in API DSL.

The combination of these two dimensions make goa plugins very powerful allowing to create new DSLs and
generators that target any use case where generating code, documentation, configuration or
anything else is useful.

Another interesting aspect is that DSLs complete each other. It is not necessary to write a new DSL
from scratch, one may add a few new keywords to the built-in API DSL for example. The new DSL
implementation can create new artefacts or change how existing artefacts are created.

## Extending the DSL

goa DSLs consist of Go package functions that construct recursive data structures called
*definitions*. The roots of these definitions must be recorded in the goa *dslengine* package *Roots*
variable. The actual content of the definitions is completely up to you. The generators use them to
create the artefacts so they should contain all the required information.

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
OK stepping back a bit: DSLs are nothing more than package functions that build package variables.
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
understand the steps involved during execution at a high level. Backing off a bit: what is
executing a DSL? two things:

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
func (m *ModelDefinition) Validate() erorr {
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
engine executes. The roots must be stored in the `dslengine` package `Roots` variabler. DSL roots
implement the [Root](https://godoc.org/github.com/goadesign/goa/dslengine#Root) interface which
exposes the `IterateSets` method that the engine uses to iterate through the definitions for
execution. `IterateSets` returns a slice of definitions allowing you to control the order in
which different types of definitions should be executed.

Imagine that the DSL in the example above was extended to make it possible to define the model
types rather than having a hard coded list. Presumably the type definitions would have to be run 
first before the model defintions. This could be done by having the DSL root `IterateSets` method
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

The main error reporting function is [ReportError](https://godoc.org/github.com/goadesign/goa/dslengine#ReportError)
which works very much like `fmt.Errorf`. Simply provide a error message optionally formatted a la
`fmt.Sprintf`.

Another useful function is [InvalidArgError](https://godoc.org/github.com/goadesign/goa/dslengine#InvalidArgError)
which as its name indicates is meant to be called when a DSL function is called with incorrect
arguments. This happens for example when the Go function parameters use `interface{}` to allow for
an expressive DSL. The DSL function code validates the input and uses [InvalidArgError](https://godoc.org/github.com/goadesign/goa/dslengine#InvalidArgError)
to report invalid values.

Another function is [IncompatibelDSL](https://godoc.org/github.com/goadesign/goa/dslengine#IncompatibleDSL).
The use case for this function is covered in the paragraph below.
 `
All the error reporting functions build user friendly error messages and append them to the
`dslengine` package [Errors](https://godoc.org/github.com/goadesign/goa/dslengine#Errors) variable.

#### The Context Stack

While not strictly required to implement a DSL it may be useful to be aware of how the engine
works to take full advantage of it. A particulary interesting concept is the context stack. When
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
In fact this case is so common that `dslengine` exposes a [IncompatibleDSL](https://godoc.org/github.com/goadesign/goa/dslengine#IncompatibleDSL)
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

#### Versioned DSL Definitions

Some definitions may represent versioned concepts like an API. For these cases the DSL engine
defines the [Versioned](https://godoc.org/github.com/goadesign/goa/dslengine#Versioned) interface
which such definitions should implement. The DSL engine also provides a [CanUse](https://godoc.org/github.com/goadesign/goa/dslengine#CanUse)
function that given two versioned definitions checks whether the second definition can be used
to define the first. The rules it uses to check for compatiblity are:

* Versioned definitions may use other versioned definitions that support the exact same set of versions.
* Versioned definitions may use unversioned definitions.
* Unversioned definitions may only use other unversioned definitions.

#### Integrating DSLs

DSL implementations make take advantage of definitions defined by other DSLs by simply importing
the corresponding package. For example a DSL that extends the goa API DSL can use the same
definitions used by goa itself. This makes it possible to easily add new keywords and extend any
DSL. As an example let's add a `Cluster` function to the existing [API](https://godoc.org/github.com/goadesign/goa/design/apidsl#API)
function of the goa DSL. This function takes a string and initializes a `ClusterDefinition`:
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

The goa API DSL defines an [attribute definition](https://godoc.org/github.com/goadesign/goa/design#AttributeDefinition)
data structure which represents a generic field. Attributes have a type and may contain other
attributes (if the type is [Object](https://godoc.org/github.com/goadesign/design#Object)). They
also define validation rules (required fields and for each field additional validations). Attributes
are useful to many DSLs and having the ability to define attributes inside plugin data structures
is a common scenario. This scenario is supported via the use of the `ContainerDefinition`
interface. Basically the `Attribute` DSL checks whether the including parent is an attribute itself,
a media type or a generic/plugin Container definition.

### Wrapping-up

Writing a DSL consists of writing public package functions that build up definitions. The goa
[dslengine](https://godoc.org/github.com/goadesign/goa/dslengine) package provides a simple
framework for executing the DSL and reporting errors to users. Definition data structures may
implement a number of interfaces to plug into the engine and take advantage of the execution
lifecycle. The DSL must register its root objects in the DSL engine package [Roots](https://godoc.org/github.com/goadesign/goa/dslengine#Roots)
variable for the engine to execute the DSL.

Now that we have a DSL and that it creates definitions the next step is to actually use them to 
produce outputs. Enters generators.

## Generators

Generators consume the DSL output (the definitions) and produce artifacts from it. What a generator
produce is entirely up to you. Generators can be written for new DSLs or existing DSLs.

### Implementing a Generator

A generator is simply a package that implements the `Generate` function:
```go
func Generate(definitions []interface{}) ([]string, error)
```
Where `definitions` is the list of root definitions created by the DSL and stored in the DSL
engine [Roots](https://godoc.org/github.com/goadesign/goa/dslengine#Roots) variable.
This function should return the list of generated filenames in case of success and a descriptive
error otherwise.

#### Writing Generators for the goa API DSL

The goa API DSL stores an instance of [APIDefinition](https://godoc.org/github.com/goadesign/goa/design#APIDefinition)
in the first element of the DSL engine Roots slice so that generators that work off of that DSL
output can safely do:

```go
import "github.com/goadesign/goa/design"

// Generate generates artifacts from goa API DSL definitions.
func Generate(definitions []interface{}) ([]string, error) {
	api := definitions[0].(*design.APIDefinition)
	// ... use api to generate stuff
}
```

The `Generate` method can take advantage of the `APIDefinition` `IterateXXX` methods to iterate
through the API resources, media types and types to guarantee that the order doesn't change between
two invocations of the function (thereby generating different outputs even if the design hasn't changed).

Writing generators for the goa API DSL requires handling the corresponding definitions. These are
all defined in the goa [design](https://godoc.org/github.com/goadesign/goa/design) package.

#### Metadata

A simple way to tack on information to existing definitions for the benefit of generators is to use
metadata. The goa design language allows defining metadata on a number of definitions: API,
Resource, Action, Response and Attribute (which means Type and MediaType as well since these
definitions are attributes). The DSL engine package defines the metadata definition data structure -
[MetadataDefinition](https://godoc.org/github.com/goadesign/goa/dslengine#MetadataDefinition).

#### Writing the Artifacts

The output directory is available through the [codegen](https://godoc.org/github.com/goadesign/goa/goagen/codegen)
package [OutputDir](https://godoc.org/github.com/goadesign/goa/goagen/codegen#OutputDir) global
variable. Generators should write all the artifacts in that directory (they may create 
sub-directories as needed).

The [codegen](https://godoc.org/github.com/goadesign/goa/goagen/codegen) package comes with a number
of helper functions that help deal with generating Go code. For example it contains functions that
can produce the code for definining a data structure given an instance of the [design](https://godoc.org/github.com/goadesign/goa/design)
package [DataStructure](https://godoc.org/github.com/goadesign/goa/design#DataStructure) interface.

### Integrating With `goagen`

`goagen` is the tool used to generate the artifacts from DSLs in goa. The `gen` subcommand allows
specifying a Go package path to a generator package - that is a package that implements the
`Generate` function. This command accepts two flags:

```
--pkg-path=PKG-PATH specifies the Go package path to the plugin package.
--pkg-name=PKG-NAME specifies the Go package name of the plugin package. It defaults to the name of the inner most directory in the Go package path.
```

### Example

Let's implement a generator that traverses the definitions created by the goa API DSL and creates
a single file `names.txt` containing the names of the API resources sorted in alphabetical order.
If a resource has a metadata pair with the key "genresnames/name" then the plugin uses the metadata
value instead.

```go
package genresnames

import (
		"io/ioutil"
		"os"
		"path/filepath"
		"strings"

		"github.com/goadesign/goa/design"
		"github.com/goadesign/goa/goagen/codegen"
		"github.com/spf13/cobra"
		)

// Generate is the function called by goagen to generate the names file.
func Generate(definitions []interface{}) ([]string, error) {
	api := definitions[0].(*design.APIDefinition)
	// Make sure to parse the common flags so that codegen.OutputDir gets properly
	// initialized.
	root := cobra.Command{Use: "goagen", Run: func(*cobra.Command, []string) { files, err = WriteNames(api) }
	codegen.RegisterFlags(root)
	// This is where you'd register specific flags for this generator
	root.Execute()
	return
}

// WriteNames creates the names.txt file.
func WriteNames(api *design.APIDefinition) ([]string, error) {
	 // Now iterate through the resources to gather their names
	names := make([]string, len(api.Resources))
	i := 0
	api.IterateResources(func(res *design.ResourceDefinition) error {
		if n, ok := res.Metadata["genresnames/name"]; ok {
			names[i] = n[0]
		} else {
			names[i] = res.Name
		}
		i++
		return nil
	})
	content := strings.Join(names, "\n")

	// Write the output file and return its name
	outputFile := filepath.Join(codegen.OutputDir, "names.txt")
	ioutil.WriteFile(outputFile, []byte(content), 0755)
	return []string{outputFile}, nil
}
```

Invoke the `genresnames` generator with:
```
goagen gen -d /path/to/your/design --pkg-path=/go/path/to/genresnamnes
```
