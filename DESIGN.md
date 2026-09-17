---
name: Goa
description: A professional specification-led identity for Go services and AI agents.
colors:
  doc-link-color: "#2255c5"
  doc-link-hover: "#163d95"
  button-bg: "#2255c5"
  button-hover: "#193f96"
  button-text: "#ffffff"
  color-bg: "#ffffff"
  color-bg-alt: "#f3f6fa"
  color-bg-elevated: "#ffffff"
  color-text: "#35465c"
  color-text-heading: "#172b45"
  color-text-muted: "#526278"
  color-border-subtle: "#dce3ec"
  color-highlight: "#eaf0fd"
  doc-inline-code-bg: "#eef2f7"
  doc-inline-code-text: "#293f75"
  selection: "#cbdcfb"
  doc-link-color-dark: "#a9c5ff"
  doc-link-hover-dark: "#d4e2ff"
  button-bg-dark: "#a9c5ff"
  button-hover-dark: "#d4e2ff"
  button-text-dark: "#142133"
  color-bg-dark: "#142133"
  color-bg-alt-dark: "#192a40"
  color-bg-elevated-dark: "#1b2d43"
  color-text-dark: "#cfdae8"
  color-text-heading-dark: "#edf2f9"
  color-text-muted-dark: "#b0bfd1"
  color-border-subtle-dark: "#35475e"
  color-highlight-dark: "#293f60"
  doc-inline-code-bg-dark: "#243953"
  doc-inline-code-text-dark: "#c2d5ff"
  selection-dark: "#3c567e"
typography:
  display:
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2.625rem, 4.35vw, 4rem)"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-.035em"
  display-compact:
    fontSize: "3.1rem"
  display-mobile:
    fontSize: "clamp(2.625rem, 8vw, 3.75rem)"
  display-narrow:
    fontSize: "2.55rem"
  headline:
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.9rem, 3vw, 2.65rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  title:
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2rem, 3vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.65
  article:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.125rem"
    lineHeight: 1.75
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: ".95rem"
    fontWeight: 650
    lineHeight: 1.65
  navigation:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: ".875rem"
    lineHeight: 1.65
  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: ".875rem"
    lineHeight: 1.7
  hero-lead:
    fontSize: "1.16rem"
    lineHeight: 1.75
  hero-lead-mobile:
    fontSize: "1.05rem"
  benefit-title:
    fontFamily: '"Manrope", sans-serif'
    fontSize: "1.08rem"
    fontWeight: 700
    lineHeight: 1.5
  benefit-body:
    fontSize: ".98rem"
    lineHeight: 1.7
  framework-title:
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "2.4rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  framework-purpose:
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.65
  subsection-title:
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.7rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.025em"
  demonstration-code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: ".8rem"
    lineHeight: 1.8
  output-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: ".92rem"
    fontWeight: 700
    lineHeight: "normal"
    letterSpacing: "0"
  output-label:
    fontSize: ".77rem"
    lineHeight: 1.65
  install-command:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: ".86rem"
    lineHeight: 1.8
  install-prompt:
    fontSize: "1.02rem"
    lineHeight: 1.7
  mcp-code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: ".85rem"
    lineHeight: 1.8
  faq-question:
    fontFamily: '"Manrope", sans-serif'
    fontSize: "1.07rem"
    fontWeight: 700
    lineHeight: 1.5
  faq-answer:
    fontSize: ".96rem"
    lineHeight: 1.75
rounded:
  inline: "4px"
  navigation: "5px"
  control: "6px"
  panel: "8px"
  demonstration: "14px"
spacing:
  "1": ".5rem"
  "2": ".75rem"
  "3": "1rem"
  "4": "1.25rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "2.5rem"
  "8": "3rem"
  column-gap: "64px"
  column-gap-compact: "36px"
  section-band: "64px"
  section-open: "88px"
  section-mobile: "48px"
components:
  button-primary:
    backgroundColor: "{colors.button-bg}"
    textColor: "{colors.button-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: ".7rem 1.1rem"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
    textColor: "{colors.button-text}"
  button-primary-dark:
    backgroundColor: "{colors.button-bg-dark}"
    textColor: "{colors.button-text-dark}"
  button-primary-dark-hover:
    backgroundColor: "{colors.button-hover-dark}"
    textColor: "{colors.button-text-dark}"
  button-copy:
    backgroundColor: "{colors.color-bg}"
    textColor: "{colors.color-text}"
    rounded: "{rounded.control}"
    padding: ".5rem .65rem"
  button-theme:
    backgroundColor: "{colors.color-bg}"
    textColor: "{colors.color-text}"
    rounded: "{rounded.control}"
    width: "36px"
    height: "36px"
  input-search:
    backgroundColor: "{colors.color-bg-alt}"
    textColor: "{colors.color-text}"
    rounded: "{rounded.control}"
    width: "9rem"
  input-search-focus:
    backgroundColor: "{colors.color-bg}"
    textColor: "{colors.color-text}"
  navigation-link:
    textColor: "{colors.color-text-muted}"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: ".4rem .65rem"
  navigation-link-hover:
    backgroundColor: "{colors.color-bg-alt}"
    textColor: "{colors.color-text-heading}"
  navigation-link-active:
    backgroundColor: "{colors.color-highlight}"
    textColor: "{colors.doc-link-color}"
    borderInlineStart: "2px solid {colors.doc-link-color}"
  docs-disclosure:
    textColor: "{colors.color-text-heading}"
    rounded: "{rounded.control}"
    padding: ".75rem 1rem"
  card-note:
    backgroundColor: "{colors.color-bg-alt}"
    textColor: "{colors.color-text}"
    rounded: "{rounded.panel}"
    padding: "1.2rem"
  chip-scope:
    backgroundColor: "{colors.color-bg-alt}"
    textColor: "{colors.color-text-muted}"
    rounded: "{rounded.inline}"
    padding: ".15rem .45rem"
  contract-demo:
    backgroundColor: "{colors.color-bg-elevated}"
    rounded: "{rounded.demonstration}"
  code-switch:
    backgroundColor: "{colors.color-bg-alt}"
    textColor: "{colors.color-text-muted}"
    padding: ".95rem 1.2rem"
  code-switch-selected:
    backgroundColor: "{colors.color-highlight}"
    textColor: "{colors.doc-link-color}"
  generated-output:
    textColor: "{colors.color-text}"
    typography: "{typography.output-label}"
    padding: "1.1rem 1.4rem .8rem"
  install-command:
    backgroundColor: "{colors.color-bg-alt}"
    textColor: "{colors.color-text-heading}"
    border: "1px solid {colors.doc-link-color}"
    typography: "{typography.install-command}"
    rounded: "{rounded.panel}"
    padding: "1.15rem"
  button-copy-install:
    backgroundColor: "{colors.color-bg}"
    textColor: "{colors.color-text}"
    rounded: "{rounded.control}"
    width: "42px"
    height: "42px"
  button-copy-install-hover:
    textColor: "{colors.doc-link-color}"
  mcp-example:
    backgroundColor: "{colors.color-bg-alt}"
    typography: "{typography.mcp-code}"
    rounded: "{rounded.panel}"
    padding: "1.2rem 1.4rem"
  registry-provider:
    backgroundColor: "{colors.color-bg-alt}"
    rounded: "{rounded.control}"
    padding: ".6rem .5rem"
  registry-node:
    backgroundColor: "{colors.color-highlight}"
    textColor: "{colors.color-text-heading}"
    rounded: "{rounded.panel}"
    padding: "1.1rem .5rem"
  brand-mark-header:
    textColor: "#000000"
    backgroundColor: "#ffffff"
    width: "52px"
    height: "52px"
  brand-mark-footer:
    textColor: "#000000"
    backgroundColor: "#ffffff"
    width: "40px"
    height: "40px"
  sponsor-banner:
    backgroundColor: "{colors.color-bg-elevated}"
    rounded: "{rounded.panel}"
    aspectRatio: "2 / 1"
  company-logo:
    backgroundColor: "{colors.color-bg-alt}"
    rounded: "{rounded.panel}"
    height: "116px"
    padding: "16px"
---

# Design System: Goa

## Overview

**Creative North Star: "A software specification brought to life"**

Readable contracts, their generated outputs, and the behavior developers own
give Goa its visual identity. The presentation is professional and precise:
generous landing-page spacing leads into a quiet, denser documentation
environment. Real source code is the focal artifact; the original round Goa
badge anchors both surfaces in black and white.

Goa and Goa-AI share one identity and equally prominent service and AI-agent
entry points. Developers using coding agents and developers building agents
into products are equally important audiences; [PRODUCT.md](PRODUCT.md) owns
that distinction and the product claims.

**Key Characteristics:**

- Real contracts and generated outputs provide the visual focus.
- Equal filled actions introduce services and AI agents.
- Manrope headings pair with system body text and monospace code.
- Shared semantic colors support light and dark reading surfaces.
- Native controls and local scrolling keep dense content usable.
- Selectable commands, visible answers, and simple topology make value extractable.

Source of truth: `assets/scss/_variables_project.scss`, `_dark_theme.scss`,
`_styles_project.scss`, `_custom.scss`, `_syntax_light.scss`, and
`_syntax_dark.scss`; `layouts/index.html`, `layouts/docs/baseof.html`, and
`layouts/_partials/guru-widget.html`. The canonical mark is
`static/img/goa-logo.png`; `scripts/render-brand.mjs` derives browser and social
assets from it. The letter paths in `assets/icons/logo.svg` supply the monochrome
Safari pinned-tab mask. Copy and extraction behavior live in `i18n/en.yaml`,
`static/js/skill-install.js`, `layouts/home.markdown.md`, `layouts/home.llms.txt`,
and `layouts/partials/hooks/head-end.html`. The frontmatter records implemented
values. `.impeccable/design.json` adds component previews and metadata; its
generated tonal ramps are preview aids, not additional shipped colors.

## Colors

Action blue sits against cool white or navy surfaces, with separate heading,
body, and muted text roles.

### Primary

- **Action blue:** the second hero line, benefit titles, framework names,
  links, filled calls to action, selected navigation and code tabs, installer
  border, workflow markers, registry connectors, output checks, and keyboard
  focus. Dark mode uses pale blue with navy text on filled actions. Reuse this
  color for emphasis; keep section headings and reading text in their ink roles.
- Link hover and button hover are separate roles even where a theme gives
  them the same value.

### Neutral

- **Canvas and alternate surface:** page backgrounds, section bands, code,
  search, tables, and notes.
- **Elevated surface:** the contract demonstration and menus; elevation is
  tonal rather than a shadow.
- **Heading, body, and muted ink:** titles, reading text, and supporting labels.
- **Subtle border and highlight:** structural dividers and selected navigation.
- Inline code and text selection have their own foreground/background roles.

Unsuffixed tokens are light-theme CSS custom properties without the leading
`--`; `-dark` records the corresponding `[data-theme="dark"]` value. Code-block
and diagram backgrounds share the alternate-surface values. Syntax token
colors remain in the Chroma stylesheets and are not additional brand accents.

**The Shared Roles Rule.** Switch semantic color values between themes while
keeping the same component structure and hierarchy.

The saved theme wins; a fresh visit defaults to dark. Text contrast and focus
visibility must be checked in both themes when colors change.

## Typography

**Display Font:** self-hosted Manrope, with the system sans-serif fallback.
**Body Font:** the system sans-serif stack.
**Label/Mono Font:** system sans-serif labels; system monospace for code,
commands, and filenames.

Manrope supplies clear, compact headings without making reading text depend on
a web font. Its variable font file is `/fonts/manrope-latin.ttf`, loaded with
`font-display: swap` and weights 400–800. Keep language fallbacks intact.

### Hierarchy

- **Display:** landing hero, using the frontmatter's fluid display scale;
  `display-compact` applies at widths up to (1100px), `display-mobile` at
  (800px), and `display-narrow` at (420px). These change size only; weight,
  line height, and tracking remain those of `display`.
- **Headline / Title:** landing section headings / documentation page titles.
- **Hero lead:** the opening benefit and generation summary; its measure is
  (44ch), expanding to (58ch) with `hero-lead-mobile`.
- **Body / Article:** general UI and prose / long-form documentation.
  Article text changes to (1.05rem) on mobile and stays within (48rem).
- **Navigation:** compact sidebar labels; selected links add weight (600).
- **Benefit / FAQ:** Manrope terms and questions above system-font answers;
  each uses its recorded component scale.
- **Framework / Subsection:** prominent framework names, weighted purpose
  lines, and smaller MCP/registry headings. The subsection scale also appears
  in documentation section headings.
- **Code:** documentation blocks; `demonstration-code` describes hero excerpts,
  increasing to (.875rem) at widths up to (420px). Installer commands and MCP
  examples use their own readable monospace scales.
- **Output title / Label:** a system-font heading with normal line height and
  untracked text above the generated-output list.

Partial typography records specify local overrides of body text or, for
responsive display variants, the display role. They are not new font families.

## Layout

The landing container is capped at (1240px), with side gutters of (48px),
(32px) at widths up to (1100px), and (20px) at widths up to (800px). The hero
pairs text and source code in a (1fr / 1.06fr) grid. The skill installation
section uses (.88fr / 1.12fr), framework choices use equal columns, and the FAQ
uses (.6fr / 1.4fr). Hero, skill, and connection rows use `column-gap`, reducing
to `column-gap-compact` at (1100px). Benefit definitions form three open columns.

At widths up to (800px), these sections become one column, framework choices
gain a horizontal divider, and workflow steps move from four to two columns.
Open sections use `section-open`; benefits and workflow use `section-band`.
The framework band uses (72px) vertical padding. Hero padding is (80px 88px);
mobile section padding uses `section-mobile`, with connection rows at (28px).
At (420px), the two hero actions stretch and stack, and generated outputs
become one column.

The homepage's implemented sequence is benefit definition and generated
outputs, coding-agent mechanisms, skill installation, equal framework
capabilities, MCP and registry, workflow, visible FAQ, then community and
support. This describes this landing page, not a required template for docs.

Documentation uses a (1440px) container: navigation (240px), flexible article,
and outline (200px), separated by (40px). At widths up to (1200px), the
outline hides and navigation becomes (210px). At widths up to (800px), a
native disclosure precedes the article. Desktop rails are sticky at (100px);
the mobile navigation scrolls within its own panel.

Page copying and Markdown access sit beside the title and wrap on narrow
screens. Code and tables scroll locally. Shared templates preserve the
structure across English, Spanish, French, Italian, and Japanese.

### Reference decisions

Retained research informs information structure, not a borrowed visual identity:

- Svelte's documentation entry page: <https://svelte.dev/docs>. Retain
  task-oriented starting points.
- Astro's documentation: <https://docs.astro.build/en/getting-started/>.
  Retain learning/reference grouping and consistent navigation.
- Discussion of concise Svelte examples alongside prose:
  <https://news.ycombinator.com/item?id=26573680>. This is qualitative
  community feedback, not a usability study or universal endorsement.

## Elevation & Depth

The custom surfaces use tonal layering and thin borders. Navigation, tables,
search focus, and the inline Guru launcher explicitly remove shadows; the
contract demonstration is framed without a drop shadow. Menus overlay only
while open. There is no custom shadow scale or motion timing scale to inherit.

**The Visible Focus Rule.** Interactive controls retain a visible keyboard
outline; the shared outline is (3px) with a (4px) offset, and the code switch
places that outline inside its selected label.

Reduced-motion preferences disable animations, transitions, and smooth
scrolling. The landing presentation has no looping decorative motion.

## Shapes

The canonical Goa badge is the original (540 × 540) PNG restored unchanged
from commit `247fee7`. It retains the dark Goa lettering, play symbol, pale
circular backing, and subtle rim. Both themes use the same artwork, shown at
(52 × 52px) in the header and (40 × 40px) in the footer. The header uses the
badge alone, without repeating the Goa name beside it.
The brand renderer reads this image to derive favicons, avatars, and social
images; it never replaces the source artwork.

Small, gently rounded corners distinguish inline code and badges, navigation,
controls, reading panels, and the larger contract demonstration. Their actual
radii are recorded in frontmatter; most boundaries are single-pixel rules.
Section separation also uses spacing and background bands. Sponsor banners keep their own
artwork and native aspect ratio. Company marks sit on theme-aware alternate
surfaces without white backing tiles.

## Components

### Buttons

Filled, compact, and equal in prominence. Both service and agent entry points
use `button-primary`, with a minimum height of (46px). Hover changes the fill
and border together. Copy controls use the canvas background and a subtle
border that turns blue on hover; the theme control is a compact square.

### Inputs / Fields

Search uses an alternate surface, muted placeholder, and subtle border. Focus
changes to the canvas background and action-colored border without a shadow.
Its header width adapts from (9rem) to (7rem), then (8.5rem) on mobile.

### Chips

Documentation scope labels are small, passive badges on an alternate surface;
they have no selected or hover behavior.

### Cards / Containers

Documentation notes use a bordered alternate surface. Informational and primary
notes, LLM information banners, and blockquotes have a three-pixel blue leading
border. Code blocks use the same semantic surface with local scrolling. Landing framework choices and
benefit definitions use open columns with dividers or spacing. The installer
and MCP code use the panel radius; registry providers use the control radius
and the central registry uses the panel radius. These functional boundaries
do not introduce a decorative card grid.

### Sponsors and trusted companies

Sponsor and company rows and their headings are horizontally centered.
Sponsor banners occupy two equal columns within (960px), retain their native
(2:1) aspect ratio, and have no added white padding. They become a single column
below (600px). Company marks use four equal columns, becoming two below (800px),
with (116px) tiles on the alternate theme surface. Wide and stacked marks have
explicit optical sizes; Cluster's source image is cropped to its full visible
mark, including the tagline, without the oversized outer whitespace.

Company images blend into their tiles: multiply in light mode, grayscale and
inverted screen blending with (1.35) brightness and (.9) opacity in dark mode. This preserves the
colored originals in light mode and uses quiet monochrome marks in dark mode.
Hover changes the tile border to the action color; keyboard focus remains visible.

### Navigation

The original Goa badge leads the header and repeats in the footer; services and agents
are peer links.
Sidebar groups distinguish quickstarts, guides, and references. Active links
combine a tinted background, blue text, a two-pixel leading border, and increased
weight. The border preserves the existing text alignment. Mobile uses
native `details`/`summary`; the same navigation remains visible on desktop.

### GitHub repositories

A compact GitHub group sits beneath the two primary hero actions, on its own
row before the designer-skill link. The GitHub icon identifies the destination;
separate Goa and Goa-AI links open their repositories. Native anchors have
(46px) minimum height, visible keyboard focus, and a subtle surface change on
hover. Their small arrows move (2px) on hover with reduced-motion preferences
respected. The homepage Markdown exposes both repository URLs as well.

### Contract demonstration

A native radio group switches between real Goa and Goa-AI excerpts, commands,
and six generated-output entries per example. The service excerpt includes
HTTP, gRPC, and JSON-RPC declarations; its outputs name transports, typed
clients, service interfaces, validation and codecs, OpenAPI and Protocol
Buffers, and command-line clients. The agent example names schemas, payload
codecs, service bindings, tool descriptors, runtime registrations, and
`AGENTS_QUICKSTART.md`.

Equal-width labels show selection through a blue-tinted surface, blue text, and
a blue bottom border.
Keyboard focus follows the radio input onto its visible label. Output entries
use small checks drawn with borders in the link color. Keep source readable
and selectable; the code area has a minimum height of (244px), and outputs use
body ink with gaps of (.55rem .7rem).

### Skill installation

The explanation sits beside a selectable one-command installer and a concrete
task prompt. The command is
`npx skills add goadesign/goa --skill goa-service-designer`; visible guidance
says to run it in the application project with Node.js and npm available.
The command wraps anywhere inside its bordered alternate surface. Its square
copy control contains a (20px) outline SVG; hover changes ink and border to the
link color. Success announces “Command copied.” in a `role="status"` region;
clipboard failure selects the command and says “Select and copy the command.”
The hint reserves (2.6em) minimum height and leaves the command available.

### MCP and registry

Two connection rows pair explanatory copy with real source and a simple
provider-to-registry-to-application topology. MCP remains selectable code on
an alternate surface. The topology uses three monospace provider labels,
thin SVG connectors, and an action-bordered highlighted registry node. Its
accessible label states the relationship; connectors are decorative.

Public MCP examples rely on the framework's default protocol version. The
version string in `MCP("catalog", "1.0.0")` labels the server; do not present it
as a protocol version or add a protocol-version argument.

### Extractable copy and FAQ

The first viewport reads “Let agents reason. Let Goa generate.” The second line
uses the theme's blue accent. The same treatment appears on the second line of
both repository banners and the Goa social card. Benefit titles and the Goa /
Goa-AI framework names repeat the accent; workflow numbers sit in quiet circular
blue-tinted markers. This gives the major sections a shared emphasis without
coloring every heading.

Its opening
paragraph states the coding-agent benefit and full HTTP/gRPC/JSON-RPC, typed
client, validation, and specification scope, followed by Goa-AI agents, MCP
servers, and tool registries. Keep that scope in the mobile opening paragraph
as well as the generated-output list.

**The Extractable Value Rule.** Put benefits, generation scope, and ownership in
visible text that remains useful without an interaction or an image.

Definition lists express benefits, framework capabilities, and visible FAQ
answers; an ordered list expresses the four-step workflow. Explain how
generation reduces authored contract code, concentrates context, and produces
compiler feedback while application behavior and tests remain authored work.
Keep developers using coding agents distinct from developers building agents
into products, with equally prominent service and agent entry points.

Homepage Markdown and `llms.txt` reuse translated copy and expose the installer
and documentation paths. Two `SoftwareSourceCode` entities describe Goa and
Goa-AI; canonical, language alternate, and Markdown links make the corresponding
representations discoverable. Keep public claims aligned with visible copy and
the limits in PRODUCT.md.

### Inline Guru

The landing hero contains a Goa Guru link before the widget loads. The widget
launcher is then placed into that same slot, with static positioning, a
transparent wrapper background, and no shadow. The external widget owns its
chat UI; these local overrides do not define a new site-wide component palette.

## Do's and Don'ts

### Do:

- **Do** use the original round black-and-white Goa badge and shared service/agent identity.
- **Do** give both entry points the same filled action treatment.
- **Do** show real, selectable source code with its generated outputs.
- **Do** preserve native keyboard behavior, visible focus, and local overflow.
- **Do** check both themes, narrow layouts, and translated pages after UI changes.
- **Do** retain the full generation summary in the mobile opening paragraph.
- **Do** keep installer commands and FAQ answers selectable and useful to humans and LLMs.

### Don't:

- **Don't** replace the code demonstration with a raster composition.
- **Don't** turn syntax colors into unrelated interface accents.
- **Don't** position the Guru launcher over reading content.
- **Don't** present unmeasured productivity or token savings as visual proof.
- **Don't** add decorative gradients or card grids to the approved landing system.
- **Don't** name an MCP protocol version in public copy or examples.
