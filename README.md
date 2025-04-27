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

### Run the documentation using Docker without having to install Go

Run in a terminal:

```bash
cd goa.design;
docker run --name goadocs --volume .:/go/src/app -p 1313:1313 -it golang:1.24.2 bash;
# in the container:
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -;
apt install -y nodejs;
cd /go/src/app;
make;
```

To run the container in the future:

```bash
docker start goadocs;
docker exec -it goadocs bash;
cd /go/src/app;
```

To remove the container:

```bash
docker stop goadocs;
docker rm goadocs;
docker rmi golang:1.24.2;
```

## Translations

Translations are kept under the `content` directory. Each language has its own file extension of
the form `<code>.md` where `<code>` is the ISO 2 letter
[language code](http://www.sitepoint.com/web-foundations/iso-2-letter-language-codes/).

To contribute to an existing translation:

1. Fork and Clone the repo.
2. Checkout the language specific branch (named after the language code).
3. Make your changes in the branch in `content/<code>`.
4. Send Pull Requests to the branch.
5. When the translation is ready send a PR to the `master` branch.

To start a new translation:

1. Open a new issue describing the new language being translated to
2. [Figure out your language code](http://www.sitepoint.com/web-foundations/iso-2-letter-language-codes/).
   For example: `ja`, `zh`, `es`, `de`, ...etc.
3. A team member will make a new branch. For example `fr` or `ja`.
4. Fork the branch and add the required files, see below.
5. Send PRs to the branch (this can be work in progress).
6. When the translation is ready send a PR to the `master` branch.

The files that support a given language are:

* `layouts/<code>/`: contains the layout pages
* `layouts/partials/<code>/`: contains the partials files
