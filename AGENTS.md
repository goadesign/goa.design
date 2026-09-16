# Working on goa.design

Read `PRODUCT.md` for audience and positioning and `DESIGN.md` for the visual
system before changing public copy or UI.

## Local skills

- `.agents/skills/frontend-design/`: layout, typography, and visual execution.
- `.agents/skills/goa-service-designer/`: verify Goa design examples and the
  boundary between generated contracts and application code.

## Content

- Present one ecosystem with equal service and AI-agent entry points.
- Distinguish using a coding agent from building an agent into a product.
- Ground capability claims in Goa or Goa-AI source and runnable examples.
- Do not publish numeric productivity or token savings without a reproducible
  measurement and its limits.
- English source lives in `content/en/docs/`. Keep corresponding translated
  pages and `i18n/*.yaml` aligned when changing shared messaging.
- Preserve existing URLs and section anchors or provide redirects.
- Put the first successful task before advanced runtime details.

## Implementation and checks

- Hugo and Docsy own the static build. Prefer templates and CSS over new
  runtime dependencies.
- `layouts/_partials/` is the current Docsy partial override location.
- Use `make serve` for development; it includes the repository's Sass wrapper.
- Run `npm test` and a production Hugo build for site changes.
- Run the browser checks for navigation, theme, or responsive layout changes.
- Check desktop and mobile in both themes, including translated pages.
