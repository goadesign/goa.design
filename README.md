test
# goa.design

This repository contains the source code of [https://goa.design](https://goa.design). The site is
a static website built using [hugo](http://gohugo.io).

## Contributing

Is that typo bugging you? us too! If you want to do something about it:

1. [Fork](https://help.github.com/articles/fork-a-repo/) and [clone](https://help.github.com/articles/cloning-a-repository/) the repo
2. Open a terminal, `cd` into the cloned repo and run `make`
3. Edit the content of the markdown files in the `/content` directory.
4. Submit a [Pull Request](https://help.github.com/articles/using-pull-requests/)

`make` starts a server on your box that "live-loads" all changes you make to the content (that is
the page should refresh itself each time you save a content page). Once `make` complete simply open
a browser to [http://localhost:1313](http://localhost:1313) and browse to the page you are editing.

## Translations

Translations are kept under the `content` directory. Each language has its own top level directory
and its own branch both named after the [language
code](http://www.sitepoint.com/web-foundations/iso-2-letter-language-codes/).

To contribute to an existing translation:

1. Fork and Clone the repo.
2. Checkout the language specific branch.
3. Make your changes in the branch in `content/<code>`.
4. Send Pull Requests to the branch.
5. When the translation is ready send a PR to the `master` branch.

To start a new translation:

1. Open a new issue describing the new language being translated to
2. [Figure out your language code](http://www.sitepoint.com/web-foundations/iso-2-letter-language-codes/). For example: `ja`, `zh`, `es`, `de`, ...etc.
3. A team member will make a new branch. For example `fr` or `ja`.
4. Fork the branch and add the required files, see below.
5. Send PRs to the branch (this can be work in progress).
6. When the translation is ready send a PR to the `master` branch.

The files that support a given language are:

* `layouts/<code>/`: contains the layout pages
* `layouts/section/<code>.html`: contains the index page
* `layouts/partials/<code>/`: contains the partials files
