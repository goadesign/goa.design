# Product Marketing Context: goa.design

Read alongside `PRODUCT.md` (ecosystem positioning and evidence boundaries), `DESIGN.md` (visual tokens and component rules), and `.agents/skills/goa-landing-pages/SKILL.md` (landing-page density and layout rules).

## Surfaces & Audiences

- **`/` (Goa & Goa-AI):** Go contract compiler for HTTP, gRPC, JSON-RPC, OpenAPI 3.2, MCP servers, AI agents, and tool registries. Speaks equally to developers using coding agents to build services and developers building AI agents into products.
- **`/chorus/` (Chorus):** Local MCP peer-coordination server giving multiple coding agents (`Claude Code`, `Codex`, `Gemini`, `Cursor`) shared `#channels`, `@agent` DMs, a pinned task board, and zero-token `chorus watch` wakeups.
- **`/highbay/` (Highbay):** Local MCP workflow and browser workspace where a developer confirms a short contract, Highbay compiles ~70% of the Go service/MCP/agent code (measured on the `Orders` reference service), and a second coding agent tests handlers in a separate Git copy before merge.

## Learnings

Active lessons from maintainer reviews—apply these by default and do not re-propose rejected framings:

1. **Never frame standardization as restricting the coding agent (`/highbay/`):**
   - *Rejected:* `"Give your coding agents one way to build."` — Sounds like handcuffing the agent (*"Why do you want my agent to only have one way to build?"*).
   - *Rejected:* `"Consistent architecture across the platform your coding agent builds."` — Abstract AI-slop noun stack.
   - *What works:* Keep the agent fast as the codebase grows or state the concrete functional loop directly (confirm a short contract in the browser → compile ~70% of HTTP/MCP/validation code → test handlers in a clean Git copy).
2. **Make every word count—never turn a landing page into a CLI manual:**
   - *Rejected:* Putting CLI flag caveats (`highbay setup -global skips Chorus`), port notes (`127.0.0.1`), `/highbay | $highbay (Codex)` prefix switches, `<details>` setup drawers, 3-bullet hero summary strips, double code captions, or internal test names (`TestSeededPayloadBloatFailsTheBudget`) on a landing page.
   - *What works:* Two-sentence hero lead (~30 words), a two-box `#install` card (`1. Install` + `2. Prompt your agent` + one `Setup guide →` header link to `/docs/`), visual walkthrough immediately below `#install`, and single-sentence comparison, capability, and FAQ items.
3. **Eliminate AI contrast and punctuation tells:**
   - *Rejected:* Em dashes (`—`), `"~70% of the code generated, not prompted"`, `"no model in the loop"`, and three-fragment headings (*"One layout. Compiled contracts. Enforced boundaries."*).
   - *What works:* Direct positive statements (*"in zero model tokens"*, *"writes only the handlers"*) and plain-English headings (*"From prompt to verified merge"*, *"Inside each repository"*).
4. **Ground numeric claims where they appear standalone:**
   - When citing `~70%` in standalone `<meta name="description">` tags as well as body copy, name the reproducible source (`Orders` reference service) per `AGENTS.md`.
