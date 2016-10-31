+++
date = "2016-01-30T11:01:06-05:00"
title = "Vendoring goa Services"
weight = 5

[menu.main]
name = "Vendoring goa Services"
parent = "design"
+++

Code generation makes vendoring a little more complicated as the generation tool also needs to be
vendored to guarantee that the generated code stays compatible with other dependencies. As an
example here is an extract of what a [glide](https://github.com/Masterminds/glide) YAML file may
look like:

```yaml
package: github.com/foo/bar
import:
- package: github.com/goadesign/goa
  vcs: git
  version: master
  subpackages:
  - client
  - design
  - design/apidsl
  - dslengine
  - goagen
  - middleware
- package: golang.org/x/tools
  subpackages:
  - go/ast/astutil
- package: gopkg.in/yaml.v2
```

running `glide install` installs `goagen` in the `vendor` directory so that running:

```bash
cd ./vendor/github.com/goadesign/goa/goagen
go build
cd ../../../../../
```

always produces the same generator tool which can then be used with:

```bash
./vendor/github.com/goadesign/goa/goagen/goagen app -d <import path to design package>
```

Bootstrapping a project using vendoring can be done following these steps (assuming the design is
already written):

1. Generate the initial code with the `goagen boostrap` command
2. Run `glide create`, this produces `glide.yaml`
3. Edit `glide.yaml` and add the entries listed above
4. Run `glide install`

You now have a `vendor` directory that contains the sources for `goagen`, compile them and use the
tool as described above. Don't forget to recompile the tool after each `glide update` that updates
`goa`.

# Vendoring Clients

Another issue to be aware of is that using a vendored goa causes the code generation tool generated
by `goagen` to also use the vendored goa. This isn't an issue (and is actually a good thing) until
you need to invoke `goagen` on non-vendored designs. This may happen if you are trying to generate
the client of a dependent service for example. In this case the `design` package of the non-vendored
service ends up using the non-vendored goa which means that the design gets initialized in the
"wrong" `design` package.

The symptoms of the problem above is goagen crashing with a panic because the design it is trying to
use is not initialized (the `design.Design` variable of the vendored goa `design` package is nil).
The best way to resolve this issue is to vendor the dependent `design` packages as well (which is
probably a good thing to do in the first place).

# Code-based generation and vendoring

Another approach to vendoring consists of invoking the generators
programmatically instead of via the `goagen` command line tool.

By writing a small glue package in your repository, your preferred
vendoring tool will be able to trace import dependencies and vendor
everything for you.

The result is simplified versioning and makes dependencies explicit to
the vendoring utility.

For the impatients, here is a concise version of what we'll see here:

```
$ mkdir -p $GOPATH/src/github.com/your/pkg/design
$ cd !$
$ # Create your design in the `design` package
$ # Paste the content of `gen/main.go` below to `...github.com/your/pkg/gen/main.go`
$ go run gen/main.go      # generates all the things
$ govendor init           # creates the vendor/ dir
$ govendor add +e         # pull needed packages in
```

And you're set. Everyone in your team will be able to deterministically
regenerate your code if they tweak the design, without version conflicts.

We do this by creating a small package that invokes `goagen`'s code
generation functions:


```
cd $GOPATH/src/github.com/your/pkg
mkdir gen
```

Then put this content into `gen/main.go`:

```
package main

import (
	_ "github.com/your/pkg/design"

	"github.com/goadesign/goa/design"
	"github.com/goadesign/goa/goagen/codegen"
	genapp "github.com/goadesign/goa/goagen/gen_app"
	genclient "github.com/goadesign/goa/goagen/gen_client"
	genjs "github.com/goadesign/goa/goagen/gen_js"
	genmain "github.com/goadesign/goa/goagen/gen_main"
	genschema "github.com/goadesign/goa/goagen/gen_schema"
	genswagger "github.com/goadesign/goa/goagen/gen_swagger"
)

func main() {
	codegen.ParseDSL()
	codegen.Run(
		&genmain.Generator{
			API:    design.Design,
			Target: "app",
		},
		&genswagger.Generator{
			API: design.Design,
		},
		&genapp.Generator{
			API:    design.Design,
			OutDir: "app",
			Target: "app",
			NoTest: true,
		},
		&genclient.Generator{
			API: design.Design,
		},
		&genschema.Generator{
			API: design.Design,
		},
		&genjs.Generator{
			API: design.Design,
		},
	)
}
```

Remove the generators you don't need from the `Run()` call.

The code above will cause all the `goa` code generation packages to be
vendored appropriately.

With `govendor` (you can use whatever vendoring tool you want in a
similar way), you can simply do this:

```
$ govendor init
$ govendor list
 e  github.com/dimfeld/httppath
 e  github.com/goadesign/goa/design
 e  github.com/goadesign/goa/design/apidsl
 e  github.com/goadesign/goa/dslengine
 e  github.com/goadesign/goa/goagen/codegen
 e  github.com/goadesign/goa/goagen/gen_app
 e  github.com/goadesign/goa/goagen/gen_client
 e  github.com/goadesign/goa/goagen/gen_js
 e  github.com/goadesign/goa/goagen/gen_main
 e  github.com/goadesign/goa/goagen/gen_schema
 e  github.com/goadesign/goa/goagen/gen_swagger
 e  github.com/goadesign/goa/goagen/utils
 e  github.com/goadesign/goa/version
 e  github.com/manveru/faker
 e  github.com/satori/go.uuid
 e  github.com/zach-klippenstein/goregen
 e  golang.org/x/tools/go/ast/astutil
 e  gopkg.in/yaml.v2
 l  github.com/your/pkg/design
pl  github.com/your/pkg/gen
```

and another quick run will vendor all you need to generate your code next time:

```
$ govendor add +ext
$ wc -l vendor/vendor.json
181 vendor/vendor.json
```

This gives you control over when to change the code generation
packages using your vendoring tool of choice.

Any future runs will deterministically generate the same code, on
anyone's machine, unless you explicitly upgrade `goa`.


## Generate your code

The next step is to actually generate your code based on the design
you wrote. Run your `gen/main.go` this way:

```
$ cd $GOPATH/src/github.com/your/pkg
$ go run gen/main.go

...
swagger/swagger.json
...
app/contexts.go
...
tool/yourapi-cli/main.go
tool/cli/commands.go
...
client/client.go
...
schema/schema.json
...
js/client.js
```

While you're at it, put that line near the top of `your/pkg/main.go`:

```
//go:generate go run gen/main.go
```

Next time, you only need to remember to run `go generate`. See
[this article](https://blog.golang.org/generate) for more info..


## Vendoring dependencies of _generated_ code

Once you've generated your code once, you'll see that there are more
dependencies:

```
$ govendor list
$ govendor list
 v  github.com/dimfeld/httppath
 v  github.com/goadesign/goa/design
 v  github.com/goadesign/goa/design/apidsl
 v  github.com/goadesign/goa/dslengine
 v  github.com/goadesign/goa/goagen/codegen
 v  github.com/goadesign/goa/goagen/gen_app
 v  github.com/goadesign/goa/goagen/gen_client
 v  github.com/goadesign/goa/goagen/gen_js
 v  github.com/goadesign/goa/goagen/gen_main
 v  github.com/goadesign/goa/goagen/gen_schema
 v  github.com/goadesign/goa/goagen/gen_swagger
 v  github.com/goadesign/goa/goagen/utils
 v  github.com/goadesign/goa/version
 v  github.com/manveru/faker
 v  github.com/satori/go.uuid
 v  github.com/zach-klippenstein/goregen
 v  golang.org/x/tools/go/ast/astutil
 v  gopkg.in/yaml.v2
 e  github.com/armon/go-metrics
 e  github.com/dimfeld/httppath
 e  github.com/dimfeld/httptreemux
 e  github.com/goadesign/goa
 e  github.com/goadesign/goa/client
 e  github.com/goadesign/goa/middleware
 e  github.com/goadesign/goa/uuid
 e  github.com/inconshreveable/mousetrap
 e  github.com/satori/go.uuid
 e  github.com/spf13/cobra
 e  github.com/spf13/pflag
 e  golang.org/x/net/context
 e  golang.org/x/net/websocket
pl  github.com/your/pkg
 l  github.com/your/pkg/app
 l  github.com/your/pkg/client
 l  github.com/your/pkg/design
pl  github.com/your/pkg/gen
 l  github.com/your/pkg/js
 l  github.com/your/pkg/tool/cli
 ```

See how we now have other external dependencies we need to pull in
(marked `e` for `external`).  They include the `goadesign/goa`
package - which holds runtime functions for goa services - to help you
write your business logic.

Vendor all of that in with:

```
$ govendor add +e
$
```

You're all good!

Not only are the code generation packages vendored but also `goa`, its
dependencies and your own dependencies.
