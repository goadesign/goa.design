# Highbay page example and UI screenshots

The [Highbay page](https://goa.design/highbay/) and [Highbay guide](https://goa.design/docs/3-ecosystem/highbay/) show a single feature request—instant store-credit refunds up to $50—moving through Highbay's three human checkpoints:

1. **Agree** (`agree-*.webp`): reviewing the plain-language Change Card, comparing edge cases in the generated decision table (`$48.00 subtotal + $4.32 tax`), and locking concrete examples.
2. **Build** (`build-*.webp`): running `test-writer` (`.highbay-tests` on `highbay/tests-1`) and `builder` (`.highbay-build` on `highbay/build-1`) with separate coding-agent models while Highbay checks compiled acceptance tests.
3. **Approve** (`approve-*.webp`): inspecting verified scenario outcomes (`3/3` passed, including holdout checks kept hidden from the builder), Story flow coverage, and merging both branches in one click.

`capture.mjs` serves `internal/controlplane/checkpoint.html` directly from a local `goadesign/highbay` checkout against contract-exact JSON fixtures for those three stages, opens each stage in headless Google Chrome across light and dark themes at desktop (`1440×960` @ 1.5x) and mobile (`390×780` @ 2x), records callout pin coordinates in `pins.json`, and converts the captures to WebP under `static/img/highbay/`.

## Regenerate

From the repository root (with `playwright` installed and `cwebp` on `PATH`):

```bash
HIGHBAY=/path/to/highbay node scripts/highbay-example/capture.mjs
```

The published screenshots were captured from `github.com/goadesign/highbay` commit `86b62ebb2bbb394577acbd2ff4cc8e6b3bb2246e`.
