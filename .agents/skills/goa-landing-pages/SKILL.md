---
name: goa-landing-pages
description: >-
  Design, write, distill, or review landing pages on goa.design (/, /chorus/,
  /highbay/, and companion ecosystem pages). Use whenever creating or editing
  landing-page layouts, hero headlines, quickstart cards, feature comparisons,
  SCSS spacing/cards, or localized i18n/*.yaml marketing copy so pages stay
  breezy, functional, scannable, and free of reference-manual bloat or AI copy
  tells.
---

# Goa Ecosystem Landing Pages

Use this skill alongside `PRODUCT.md`, `DESIGN.md`, `.agents/product-marketing.md`, `.agents/skills/impeccable/`, `.agents/skills/copywriting/`, and `.agents/skills/humanizer/` whenever creating, redesigning, or editing a landing page on `goa.design`.

## 1. Core Principle: Landing Page, Not Reference Manual

A landing page earns a first run in seconds; `/docs/` owns CLI flags, edge-case switches, port numbers, and architectural caveats. Before keeping any sentence, caption, toggle, or disclosure on a landing page, ask: **"Does a first-time visitor need this before running Step 1?"** If not, cut it and link the documentation guide once.

### Section & Word Budgets

- **Hero (`h1` + lead + 2 CTAs):**
  - **Two-line `h1`:** ~6–12 words per line.
  - **Lead paragraph:** **2 sentences (~25–35 words total)** stating the concrete functional loop: what the developer does, what the tool compiles or coordinates, and how the result is verified or consumed.
  - **2 primary CTAs:** Primary jump to `#install` + secondary jump to the visual walkthrough (`#views` or `.contract-demo`).
  - **No hero checklist strip:** Do not place a 3-bullet summary row beneath the hero buttons that repeats claims already made in the lead or in sections below.
- **Two-step quickstart card (`#install`):**
  - **Card header:** Short title (`Get started`) on the left; supported coding agents + a single `Setup guide →` link on the right.
  - **Two side-by-side boxes:** `1. Install` (package-manager switch + copyable command) and `2. Prompt your agent` (copyable prompt).
  - **Zero fine print inside the card:** No footnote hints beneath Step 1 or Step 2 (no `-global` flags, `127.0.0.1` port notes, or daemon caveats), no secondary syntax toggles (`/skill` vs `$skill`), and no `<details>` fine-print drawers inside `#install`.
- **Visual product walkthrough first:**
  - Place the interactive product demonstration (`#views` studio or `.contract-demo`) **immediately below `#install`**, before prose comparison tables (`#contrast`). Show the real contract, generated code, or UI stages before arguing against alternatives.
  - Give each visual tab a 1-sentence caption (≤15 words) and omit footnotes about how screenshots were captured.
- **Comparisons, code lanes, capabilities, and FAQ:**
  - Omit section intro paragraphs when the heading and column titles already explain the structure (e.g., `Without X vs. with X`, `How X compares`). Where an intro adds essential context (e.g., linking the reference repository for a `~70%` measurement), keep it to **1 sentence (≤18 words)**.
  - Keep comparison cells, capability descriptions, and FAQ answers to **1–2 short sentences (≤25 words)**; link `/docs/...` for deeper caveats (`protoc`, sandbox boundaries, holdout evaluators).
  - Give code columns **one** short caption above the `<pre><code>` block. Never sandwich a code block between both a top caption and a bottom paragraph, and never follow code columns with a separate footnote strip repeating the same metrics.

---

## 2. Headline & Copy Rules

Read `.agents/product-marketing.md` (especially `## Learnings`) before proposing headlines or rewrites, and show headline options to the user before editing when copy direction is open.

1. **Never frame tooling as restricting the user's coding agent:**
   - Avoid lines like *"Give your coding agents one way to build."* Developers value what their coding agents can build; restriction framing triggers *"Why would I limit my agent to one way?"*
   - Frame value around **keeping coding agents fast as the codebase grows, skipping hand-written plumbing, or shipping verified services**, never around narrowing the agent.
2. **State concrete functionality, not just downstream promises:**
   - Pair any outcome headline immediately with what the product actually *is and does* (e.g., confirming a short contract in the browser, compiling ~70% of HTTP/MCP/validation code in Go, and testing handlers in a separate Git copy).
3. **Zero AI writing tells across all five locales (`en`, `es`, `fr`, `it`, `ja`):**
   - **Zero em dashes (`—`)** or spaced hyphens used as punctuation in landing-page copy. Split into two short sentences or use a plain conjunction.
   - **Zero `"X, not Y"` / `"not X, it's Y"` / `"no X, no Y"` contrast tails** (e.g., avoid *"generated, not prompted"* or *"no model in the loop"*; write *"in zero model tokens"* or *"writes only the handlers"*).
   - **Zero slogan-fragment headings** (e.g., avoid *"One layout. Compiled contracts. Enforced boundaries."*; write *"Inside each repository"*).
   - **Zero internal symbol soup in prose:** Keep long test identifiers (`TestSeededPayloadBloatFailsTheBudget`) and CLI flag matrices out of marketing prose.

---

## 3. Google-Caliber Layout & Technical Guardrails

1. **Generous whitespace & unboxed columns:**
   - Use `88px` desktop (`52px` mobile) vertical padding between landing-page sections.
   - Reserve bordered cards for interactive containers (`#install`, `.contract-demo`, `.highbay-studio`, and individual `<pre>` code panes). Present comparisons, code lanes, capabilities, and FAQs as open multi-column grids separated by whitespace and `1px` hairline dividers.
   - When aligning open multi-column headings and code blocks, use CSS `subgrid` preceded by an explicit `grid-template-rows` fallback.
2. **Legibility & hit-testing:**
   - Enforce a minimum `.75rem` (`12px`) font size on all badges, tabs, and interactive labels across mobile breakpoints (`≤640px`).
   - Never override `[hidden]` with `display: block !important` on stacked grid panels (`grid-area: 1 / 1`); hidden panels later in DOM order will intercept pointer clicks over active controls. Verify interactive controls with Playwright `.click({ trial: true })`.
3. **Shared callers, anchors, and locales:**
   - Before deleting any `i18n` key or CSS class, grep `layouts/` and `content/` (`layouts/index.html`, `layouts/chorus/section.html`, `layouts/shortcodes/`) to ensure no sibling page or doc shortcode references it.
   - Preserve public section anchor IDs (`#install`, `#views`, `#contrast`, `#codegen`, `#llm-stack`, `#capabilities`) and keep `layouts/*/section.markdown.md`, `content/{en,es,fr,it,ja}/`, and `i18n/{en,es,fr,it,ja}.yaml` in full parity with locale-prefixed links (`/es/...`, `/fr/...`, `/it/...`, `/ja/...`).
   - Replace obsolete Playwright assertions of removed sub-widgets in `tests/site.pw.ts` rather than keeping UI clutter alive to satisfy old tests.

---

## 4. Verification Checklist

Before finishing any landing-page change, run:

```bash
# 1. Impeccable setup & anti-pattern check (must exit 0 with zero anti-patterns)
.agents/skills/impeccable/scripts/impeccable doctor --json </dev/null
.agents/skills/impeccable/scripts/impeccable detect --no-advisory assets/scss/ layouts/index.html layouts/chorus/ layouts/highbay/ </dev/null

# 2. Production Hugo build across all 5 locales, unit tests, and internal link check
PATH="$PWD/bin:$PWD/node_modules/.bin:$PATH" BROWSERSLIST_ROOT_PATH=. hugo --minify </dev/null
npm test </dev/null
npm run check:links </dev/null

# 3. Desktop (1440px) & mobile (390px) light/dark Playwright suite
npx playwright test --timeout=60000 </dev/null
```

Keep explicit `assets/scss/...` paths in `DESIGN.md` (never bare filenames like `_dark_theme.scss`) and refresh `.impeccable/design.json` whenever `DESIGN.md` changes.
