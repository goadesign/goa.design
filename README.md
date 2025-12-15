# goa.design

This repository contains the source code of [https://goa.design](https://goa.design). The site is
a static website built using [hugo](http://gohugo.io).

## Documentation structure

The main documentation lives under `content/en/docs/` (English source of truth):

- `content/en/docs/1-goa/`: Goa framework docs
- `content/en/docs/2-goa-ai/`: Goa-AI docs (agents, toolsets, runtime, MCP, etc.)
- `content/en/docs/3-ecosystem/`: Ecosystem docs (e.g., Clue, Pulse, Model)

Translated content mirrors the same structure under `content/{lang}/docs/` (for example `content/it/docs/`, `content/fr/docs/`).

## Contributing

Is that typo bugging you? us too! If you want to do something about it:

1. [Fork](https://help.github.com/articles/fork-a-repo/) and [clone](https://help.github.com/articles/cloning-a-repository/) the repo
2. Open a terminal, `cd` into the cloned repo and run `make start` (or `make serve`)
3. Edit the content of the markdown files in the `content/` directory.
4. Submit a [Pull Request](https://help.github.com/articles/using-pull-requests/)

`make serve` starts a server on your box that "live-loads" all changes you make to the content (that is
the page should refresh itself each time you save a content page). Once `make` complete simply open
a browser to [http://localhost:1313](http://localhost:1313) and browse to the page you are editing.

### Diagrams

Some diagrams are generated from the Model DSL and committed under `static/images/diagrams/`.

Generate/update diagrams:

```bash
make diagrams
```

### Run the documentation using Docker without having to install Go

Run in a terminal:

```bash
cd goa.design;
docker run --name goadocs --volume .:/go/src/app -p 1313:1313 -e BIND=0.0.0.0 -it golang:1.24.2 bash;
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

Translations are kept under the `content/` directory:

- English source: `content/en/docs/`
- Translations: `content/{lang}/docs/` (same paths as English)

### Translating docs (recommended)

We provide a translation helper script backed by DeepL:

```bash
# 1) Configure API key
cp .env.example .env
${EDITOR:-vi} .env

# 2) Translate changed English docs to all supported languages
./scripts/translate content/en/docs/
```

Notes:

- The full workflow is documented in `scripts/TRANSLATION.md`.
- The script uses a cache file (`.translation-cache.json`, gitignored) so only changed English files are reprocessed.
- **Japanese (`JA`) is not auto-translated**: `./scripts/translate --lang JA ...` will print which files need a **manual update** and record the English hash so only future changes are re-flagged.
- UI strings live under `i18n/*.yaml` and are maintained manually.
