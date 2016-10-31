+++
date = "2016-03-02T11:01:06-05:00"
title = "goa Plugin Generators"
weight = 1

[menu.main]
name = "ジェネレータプラグイン"
parent = "extend"
+++

goa Plugins make it possible to generate new kinds of outputs from any DSL. The possibilities are
really endless, clients in different languages, domain specific type conversions, database bindings
etc.

# Generators

Generators consume the data structures produced by DSLs to generate artifacts.
Generators can be written for existing and new DSLs (see [goa Plugin DSLs](/extend/dsls) for
information on how to create new DSLs). The generated artifacts can be anything, the DSL engine
provides the generation orchestration and is oblivious of the actual output.

## Implementing a Generator

A generator consists of a Go package that implements the `Generate` function:
```go
func Generate() ([]string, error)
```
The function returns the list of generated filenames in case of success or a descriptive
error otherwise. The generator accesses the DSL output data structures directly from the
corresponding DSL packages. For example the goa API DSL exposes a `Design` package variable of type
[APIDefinition](http://goa.design/reference/goa/design.html#type-apidefinition-a-name-design-apidefinition-a:83772ba7ad0304b1562d08f190539946)
that contains the built-up API definition.

### Writing Generators for the goa API DSL

On top of the [Design](http://goa.design/reference/goa/design.html#variables:83772ba7ad0304b1562d08f190539946)
package variable the goa DSL also exposes [GeneratedMediaTypes](http://goa.design/reference/goa/design.html#variables:83772ba7ad0304b1562d08f190539946)
which contains the set of media types that was generated dynamically by the engine rather than
defined by the user (this happens when a Media Type is use inline with
[CollectionOf](http://goa.design/reference/goa/design/apidsl.html#func-collectionof-a-name-apidsl-collectionof-a:aab4f9d6f98ed71f45bd470427dde2a7).

A generator wanting to act on a goa API DSL output would thus look like this:
```go
import "github.com/goadesign/goa/design"

// Generate generates artifacts from goa API DSL definitions.
func Generate() ([]string, error) {
	api := design.Design
	// ... use api to generate stuff
	genMedia := design.GeneratedMediaTypes
	// ... user genMedia to generate stuff
}
```
The `Generate` method can take advantage of the `APIDefinition` `IterateXXX` methods to iterate
through the API resources, media types and types to guarantee that the order doesn't change between
two invocations of the function (thereby generating different outputs even if the design hasn't
changed).

#### Metadata

A simple way to tack on information to existing definitions for the benefit of generators is to use
metadata. The goa design language allows defining metadata on a number of definitions: API,
Resource, Action, Response and Attribute (which means Type and MediaType as well since these
definitions are attributes). Here is an example defining a "pseudo" metadata value on a resource:

```go
var _ = Resource("Bottle", func() {
	Description("A bottle of wine")
	Metadata("pseudo:port")
	// ...
}
```

The DSL engine package defines the metadata definition data structure -
[MetadataDefinition](https://godoc.org/github.com/goadesign/goa/dslengine#MetadataDefinition).

#### Writing the Artifacts

The [codegen](https://godoc.org/github.com/goadesign/goa/goagen/codegen) package comes with a number
of helper functions that help deal with generating Go code. For example it contains functions that
can produce the code for defining a data structure given an instance of the
[design](https://godoc.org/github.com/goadesign/goa/design) package
[DataStructure](https://godoc.org/github.com/goadesign/goa/design#DataStructure) interface.

### Integrating With `goagen`

`goagen` is the tool used to generate the artifacts from DSLs in goa. The `gen` subcommand allows
specifying a Go package path to a generator package - that is a package that implements the
`Generate` function. This command accepts one flag:

```bash
--pkg-path=PKG-PATH specifies the Go package import path to the plugin package.
```

### Example

Let's implement a generator that traverses the definitions created by the goa API DSL and creates
a single file `names.txt` containing the names of the API resources sorted in alphabetical order.
If a resource has a metadata pair with the key "pseudo" then the plugin uses the metadata value
instead.

```go
package genresnames

import (
	"flag"
	"github.com/goadesign/goa/design"
	"github.com/goadesign/goa/goagen/codegen"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

func Generate() ([]string, error) {
	var (
		ver    string
		outDir string
	)
	set := flag.NewFlagSet("app", flag.PanicOnError)
	set.String("design", "", "") // Consume design argument so Parse doesn't complain
	set.StringVar(&ver, "version", "", "")
	set.StringVar(&outDir, "out", "", "")
	set.Parse(os.Args[2:])

	// First check compatibility
	if err := codegen.CheckVersion(ver); err != nil {
		return nil, err
	}

	return WriteNames(design.Design, outDir)
}

// WriteNames creates the names.txt file.
func WriteNames(api *design.APIDefinition, outDir string) ([]string, error) {
	// Now iterate through the resources to gather their names
	names := make([]string, len(api.Resources))
	i := 0
	api.IterateResources(func(res *design.ResourceDefinition) error {
		if n, ok := res.Metadata["pseudo"]; ok {
			names[i] = n[0]
		} else {
			names[i] = res.Name
		}
		i++
		return nil
	})

	content := strings.Join(names, "\n")
	// Write the output file and return its name
	outputFile := filepath.Join(outDir, "names.txt")
	if err := ioutil.WriteFile(outputFile, []byte(content), 0755); err != nil {
		return nil, err
	}
	return []string{outputFile}, nil
}

```

Invoke the `genresnames` generator with:
```bash
goagen gen -d /path/to/your/design --pkg-path=/go/path/to/genresnames
```
