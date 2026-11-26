# Highbay page example and UI screenshots

The [Highbay page](https://goa.design/highbay/) and [Highbay guide](https://goa.design/docs/3-ecosystem/highbay/) show a single illustrative feature request—instant store-credit refunds up to $50—moving through four views of Highbay's browser interface:

1. **Agree** (`agree-*.webp`): answering the open policy question on the Change Card, comparing the `$48.00 subtotal + $4.32 tax` boundary order under each option, and confirming examples.
2. **Architecture** (`architecture-*.webp`): previewing the C4 containers, Goa-AI agent budgets, and `Confirmation` tool guardrails declared by the agreed Go design before workers run.
3. **Build** (`build-*.webp`): assigning separate coding agents (`Claude Code` and `Codex`) to the builder and test-writer roles under the confirmed agreement.
4. **Approve** (`approve-*.webp`): inspecting scenario results mapped to `Story` flows (`3 of 3` declared scenarios in this fixture), recording human approval, and merging into the local branch.

`capture.mjs` serves `internal/controlplane/checkpoint.html` directly from a local `goadesign/highbay` checkout against contract-exact JSON fixture responses for those four views, opens each view in headless Google Chrome across light and dark themes at desktop (`1440×960` @ 1.5x) and mobile (`390×780` @ 2x), records callout pin coordinates in `pins.json`, and converts the captures to WebP under `static/img/highbay/`.

## Regenerate

From the repository root (with `playwright` installed and `cwebp` on `PATH`):

```bash
HIGHBAY=/path/to/highbay node scripts/highbay-example/capture.mjs
```

The published screenshots were captured from `github.com/goadesign/highbay` commit `86b62ebb2bbb394577acbd2ff4cc8e6b3bb2246e`.
