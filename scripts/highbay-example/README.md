# Highbay page fixture and UI screenshots

The [Highbay page](https://goa.design/highbay/) and [Highbay ecosystem guide](https://goa.design/docs/3-ecosystem/highbay/) walk through an illustrative multi-tenant incident platform (`ops-copilot`)—triage and remediation agents with MCP tools for cursor-bounded pod logs, autonomous staging rollbacks (`rollback_staging`), and on-call-approved production rollbacks (`rollback_production`)—moving through four views of Highbay's browser interface (`internal/controlplane/checkpoint.html`):

1. **Agree** (`agree-*.webp`): answering the open autonomy-boundary question on the Change Card (`autonomous staging recovery vs. on-call Confirmation for production rollbacks`) and confirming concrete acceptance examples.
2. **Architecture** (`architecture-*.webp`): previewing the planar C4 container graph (`Incident Responder`, `On-Call Engineer`, `Ops API & MCP`, `Triage Agent`, `Remediation Agent`, `Pod Log Toolset`, `Temporal Engine`, `Rollout Toolset`), evaluated Goa-AI `RunPolicy` budgets, and tool contracts before handler code is written.
3. **Check — Run 1 Failed** (`check-*.webp`): inspecting a blocked verification report (`3 of 4` scenarios passed) where `production_rollback_requires_approval` fails because `POST /runs/inc_42/approval` as `role="viewer"` returned `200 OK` instead of `403 Forbidden`.
4. **Approve — Run 2 Verified** (`approve-*.webp`): inspecting the passing report (`4 of 4` scenarios passed) after the `oncall` role check is enforced, recording human approval, and merging into the current Git branch.

`capture.mjs` serves `internal/controlplane/checkpoint.html` directly from a local `goadesign/highbay` checkout against an in-process HTTP state fixture (`ops-copilot` is a site walkthrough fixture, not a checked-in module in `goadesign/highbay`), renders each view in headless Google Chrome across light and dark themes at desktop (`1040×845` @ 2x) and mobile (`390×740` @ 2x), writes compressed WebP files under `static/img/highbay/`, and records asset sizes in `pins.json`.

## Regenerate

From the repository root (with `playwright` installed and `cwebp` on `PATH`):

```bash
HIGHBAY=/path/to/highbay node scripts/highbay-example/capture.mjs
```

The published screenshots were captured from `github.com/goadesign/highbay` commit `c02267861d63db3efbaf246853591a0a823dea78`.
