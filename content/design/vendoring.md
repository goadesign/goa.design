+++
date = "2016-01-30T11:01:06-05:00"
title = "Vendoring goa Services"
weight = 4
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
