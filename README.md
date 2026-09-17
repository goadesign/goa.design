# goa.design

This repository contains the source code of [https://goa.design](https://goa.design). The site is
a static website built using [hugo](http://gohugo.io).

## Product and presentation

Goa is one ecosystem with two entry points: **services** and **AI agents**.
The site speaks equally to developers using coding agents and developers
building agents into products. [PRODUCT.md](PRODUCT.md) records that positioning;
[DESIGN.md](DESIGN.md) defines the shared landing-page and documentation theme.

Public claims should explain the mechanism: an explicit Go design, deterministic
code generation, typed implementation boundaries, and compiler/test feedback.
Do not infer a productivity multiplier or token saving from generated line counts.

## Documentation structure

English source lives under `content/en/docs/`:

- `ai-development.md`: the shared coding-agent workflow and checked catalog example.
- `1-goa/`: service quickstart, implementation guides, and references.
- `2-goa-ai/`: agent quickstart, implementation guides, and references.
- `3-ecosystem/`: Clue, Pulse, and Model.

Translations mirror these paths under `content/{it,ja,fr,es}/docs/`. Navigation
groups are declared with `nav_group` and `weight` in page front matter. Existing
page URLs remain stable when their navigation order changes.

Hugo publishes an `index.md` version of the landing page and every documentation page, plus a localized
`llms.txt` index from the same sources. The page-copy control remains available
for copying rendered content. `layouts/_partials/` contains current Docsy
partial overrides; the documentation layout is under `layouts/docs/`.

## Local design skills

Repository-scoped skills live in `.agents/skills/`:

- `frontend-design`: visual hierarchy, typography, and interface craft.
- `goa-service-designer`: design-first application examples and generated-code ownership.

The skill directories include their licenses. Read [AGENTS.md](AGENTS.md) before
changing content or UI.

## Verification

```bash
npm ci
npm test
PATH="$PWD/bin:$PWD/node_modules/.bin:$PATH" BROWSERSLIST_ROOT_PATH=. hugo --minify
npm run check:links
npm run test:browser
```

Browser checks use the installed Google Chrome through Playwright and serve
`public/` locally on port 1314. They cover the two entry paths, the contract
example selector, mobile navigation, page copying, theme persistence, search,
localized routes, skill installation copying, server-rendered positioning, structured data,
and Markdown outputs. Screenshots are written to the ignored
`.impeccable/review/` directory.

The bundled Manrope font is self-hosted; its license is in `static/fonts/`.
No font service is required to render the site.

The original brand mark lives in `static/img/goa-logo.png`. Run
`node scripts/render-brand.mjs` to regenerate favicons, the footer/avatar SVG,
and social images from that mark and the local font. The monochrome letter paths
in `assets/icons/logo.svg` supply the Safari pinned-tab mask. The script uses the same
installed Chrome as the browser tests and needs no image-processing service.

The Goa and Goa-AI README banners share `scripts/readme-banner.html`, using the
site's Manrope font, navy and blue palette, and original badge. Run
`make readme-banner` to render four light/dark and desktop/mobile PNGs per
framework in `static/img/social/`. Copy `goa-banner*.png` into the Goa
repository's `docs/` directory and `goa-ai-banner*.png` into Goa-AI's `docs/img/`.
Each README uses GitHub's
`#gh-light-mode-only` and `#gh-dark-mode-only` link markers for theme selection,
with a `picture` element inside each link for the mobile variant. Keep theme
selection separate from width queries: GitHub's `themed-picture` component
replaces theme media queries and discards any width condition they contain.
The desktop compositions show the generated transports or shared tool contracts,
while the mobile compositions keep the headlines and framework capabilities
legible. The PNGs are rendered at twice their layout dimensions.

The first paragraph, capability explanations, and FAQ answers are plain,
server-rendered text. Homepage `SoftwareSourceCode` structured data identifies
the two repositories; it mirrors the visible content. Markdown and `llms.txt`
provide focused context for coding tools and do not imply a search-ranking guarantee.

## Contributing

Is that typo bugging you? us too! If you want to do something about it:

1. [Fork](https://help.github.com/articles/fork-a-repo/) and [clone](https://help.github.com/articles/cloning-a-repository/) the repo
2. Open a terminal, `cd` into the cloned repo, run `make prereqs`, then run `make start` (or `make serve`)
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
docker run --name goadocs --volume .:/go/src/app -p 1313:1313 -e BIND=0.0.0.0 -it golang:latest bash;
# in the container:
curl -fsSL https://deb.nodesource.com/setup_26.x | bash -;
apt install -y nodejs;
cd /go/src/app;
make prereqs;
make start;
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
docker rmi golang:latest;
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

# 2) Translate changed English docs to every language supported by DeepL
./scripts/translate --lang IT --lang FR --lang ES content/en/docs/
```

Notes:

- The full workflow is documented in `scripts/TRANSLATION.md`.
- The script uses a cache file (`.translation-cache.json`, gitignored) so only changed English files are reprocessed.
- **Japanese (`JA`) is updated manually**: first run
  `./scripts/translate --dry-run --lang JA ...`, update the listed files, then
  run `./scripts/translate --lang JA ...` to record the English revision you
  translated.
- UI strings live under `i18n/*.yaml` and are maintained manually.
