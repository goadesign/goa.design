+++
date = "2016-01-30T11:01:06-05:00"
title = "Vendoring goa Services"
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
- package: golang.org/x/tools/go/ast/astutil
- package: gopkg.in/yaml.v2
```

running `glide install` installs `goagen` in the `vendor` directory so that running:

```bash
go build ./vendor/github.com/goadesign/goa/goagen
```

always produces the same generator tool which can then be used with:

```bash
./vendor/github.com/goadesign/goa/goagen app -d <import path to design package>
```
