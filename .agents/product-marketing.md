# Product Marketing Context: goa.design

Read alongside `PRODUCT.md` (ecosystem positioning and evidence boundaries), `DESIGN.md` (visual tokens and component rules), and `.agents/skills/goa-landing-pages/SKILL.md` (landing-page density and layout rules).

## Surfaces & Audiences

- **`/` (Goa & Goa-AI):** Go contract compiler for HTTP, gRPC, JSON-RPC, OpenAPI 3.2, MCP servers, AI agents, and tool registries. Speaks equally to developers using coding agents to build services and developers building AI agents into products.
- **`/chorus/` (Chorus):** Local MCP peer-coordination server giving multiple coding agents (`Claude Code`, `Codex`, `Gemini`, `Cursor`) shared `#channels`, `@agent` DMs, a pinned task board, and zero-token `chorus watch` wakeups.
- **`/highbay/` (Highbay):** Guided browser workspace and local MCP server that gives developers browser checkpoints (change card, architecture diagram, test report) while giving coding agents a built-in Go architecture playbook, 70% generated service/MCP/schema code (measured on the `Orders` reference service), locked contracts, and a separate tester worktree.

## Learnings

Active lessons from maintainer reviews—apply these by default and do not re-propose rejected framings:

1. **Never frame standardization as restricting the coding agent (`/highbay/`):**
   - *Rejected:* `"Give your coding agents one way to build."` — Sounds like handcuffing the agent (*"Why do you want my agent to only have one way to build?"*).
   - *Rejected:* `"Consistent architecture across the platform your coding agent builds."` — Abstract AI-slop noun stack.
   - *What works:* Split value clearly between **For you** (guided browser development: settle edge cases on a one-page change card, inspect the architecture diagram, merge from the test report) and **For the model** (built-in Go playbook, 70% of server/schema code generated, locked contract and tests, and a separate tester worktree).
2. **Describe what capabilities enable, not unfamiliar internal names:**
   - *Rejected:* Exposing Goa/DSL insider names (`Inject`, `Clue`, `Pulse`, `BoundedResult`, `Confirmation`, `highbay://golden-path`) as marketing labels to readers who do not know them yet.
   - *What works:* State what they enable in plain backend language (*auth & server-side tenant isolation so prompts cannot spoof another customer*, *OpenTelemetry tracing & readiness probes*, *Redis token rate limits & event streams*, *human approval pauses & durable runs*).
3. **Make every word count—never turn a landing page into a CLI manual:**
   - *Rejected:* Putting CLI flag caveats (`highbay setup -global skips Chorus`), port notes (`127.0.0.1`), `/highbay | $highbay (Codex)` prefix switches, `<details>` setup drawers, 3-bullet hero summary strips, double code captions, or internal test names (`TestSeededPayloadBloatFailsTheBudget`) on a landing page.
   - *What works:* Two-sentence hero copy per lane, a two-box `#install` card (`1. Install` + `2. Prompt your agent` + one `Setup guide →` header link to `/docs/`), visual walkthrough immediately below `#install`, and single-sentence comparison, capability, and FAQ items.
4. **Eliminate AI contrast and punctuation tells (apply `humanizer`):**
   - *Rejected:* Em dashes (`—`), `"~70% of the code generated, not prompted"`, `"no model in the loop"`, noun-pile fragments, and three-fragment headings (*"One layout. Compiled contracts. Enforced boundaries."*).
   - *What works:* Direct active sentences (*"in zero model tokens"*, *"writes only the handlers"*) and plain-English headings (*"From prompt to verified merge"*, *"What the built-in Go playbook wires up"*).
5. **State round numbers cleanly once and ground them:**
   - Write `70%` without a leading tilde (`~70%` weakens a round figure that already reads as an estimate), avoid repeating `70%` across every section of the page, and cite the reproducible source (`Orders` example/reference service) where `70%` is introduced (including standalone `<meta name="description">` tags).
