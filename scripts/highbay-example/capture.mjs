// capture.mjs renders the real Highbay Views single-page bundle
// (internal/controlplane/checkpoint.html from github.com/goadesign/highbay)
// across the three stages shown on goa.design/highbay/ (Agree, Build, Approve)
// in light and dark themes at desktop (1440x960 @ 1.5x) and mobile (390x780 @ 2x),
// measures callout marker coordinates into pins.json, and writes optimized WebP
// assets to static/img/highbay/.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HIGHBAY_DIR = process.env.HIGHBAY || path.resolve(REPO_ROOT, "../highbay");
const CHECKPOINT_HTML = path.join(HIGHBAY_DIR, "internal/controlplane/checkpoint.html");
const OUT_IMG_DIR = path.join(REPO_ROOT, "static/img/highbay");

if (!fs.existsSync(CHECKPOINT_HTML)) {
  throw new Error(`checkpoint.html not found at ${CHECKPOINT_HTML}; set HIGHBAY=/path/to/highbay`);
}
fs.mkdirSync(OUT_IMG_DIR, { recursive: true });

const checkpointBody = fs.readFileSync(CHECKPOINT_HTML, "utf8");

const CHANGE_ID = "refunds-instant-credit";
const REV_1 = "rev_9c41e8a2f017";
const REV_2 = "rev_d830b41c77e2";
const RUN_ID = "run_7f42a9e018c34b2190a1d6f8e3b20194";
const CANDIDATE_COMMIT = "a41c9e208b74d12f9c3e65018ab42f9103c7d8e1";
const SUITE_COMMIT = "5be07f193c62e84a10b29f473cd81e5264a9b0c2";
const REPORT_DIGEST = "sha256:8f31d904c2a17e6b5409f3c1e82d7a4b9061c3e2f5a8d104b7c9e203a6f1d8b4";

const STORIES = [
  {
    name: "Refunds",
    description: "Instant store-credit refunds within the policy threshold and manager review above it.",
    actors: [
      { key: "customer", title: "Customer" },
      { key: "manager", title: "Support manager" },
    ],
    flows: [
      {
        key: "instant_credit",
        title: "Issue instant store credit within the $50 subtotal limit",
        complete: true,
        questions: [],
        steps: [
          { key: "ask", actor_key: "customer", kind: "start", summary: "Customer requests a refund on a $48.00 item (+$4.32 tax)", questions: [] },
          { key: "credit", actor_key: "customer", kind: "outcome", summary: "Service issues $52.32 store credit immediately", questions: [] },
        ],
      },
      {
        key: "manager_review",
        title: "Queue refunds above $50 subtotal for manager approval",
        complete: true,
        questions: [],
        steps: [
          { key: "ask_over", actor_key: "customer", kind: "start", summary: "Customer requests a refund on a $65.00 item (+$5.85 tax)", questions: [] },
          { key: "queue", actor_key: "manager", kind: "outcome", summary: "Request enters manager review queue without issuing credit", questions: [] },
        ],
      },
    ],
  },
];

const EXAMPLES = [
  {
    id: "check_01",
    scenario: "Order under $50 pre-tax subtotal",
    input_summary: "Customer requests a refund for a $48.00 item plus $4.32 sales tax ($52.32 charged).",
    expected_outcome: "Approved immediately for $52.32 in store credit.",
    verification_kind: "deterministic",
  },
  {
    id: "check_02",
    scenario: "Order above $50 pre-tax subtotal",
    input_summary: "Customer requests a refund for a $65.00 item plus $5.85 sales tax ($70.85 charged).",
    expected_outcome: "Queued for manager review; no credit is issued yet.",
    verification_kind: "deterministic",
  },
];

const CONFIRMED_ANSWERS = [
  {
    id: "tax_in_limit",
    question: "Does the $50 instant-credit limit count sales tax?",
    answer: "Count the pre-tax item subtotal so local tax rates never push an identical order into manager review.",
  },
];

const COVERAGE = [
  {
    scenario: "instant_credit",
    question_ids: ["tax_in_limit"],
    example_ids: ["check_01"],
    explanation: "Submits a $48.00 subtotal + $4.32 tax refund and asserts status == \"credit\" and cents == 5232.",
  },
  {
    scenario: "manager_review",
    question_ids: ["tax_in_limit"],
    example_ids: ["check_02"],
    explanation: "Submits a $65.00 subtotal + $5.85 tax refund and asserts status == \"pending_review\" with zero credit issued.",
  },
];

const REQUIRED_TESTS = [
  { story: "Refunds", flow_key: "instant_credit", scenario: "instant_credit", hook: "InstantCredit" },
  { story: "Refunds", flow_key: "manager_review", scenario: "manager_review", hook: "ManagerReview" },
];

const OPENUI_PROGRAM = [
  'root = DecisionWorkspace("Refund limit", [choice, table])',
  'choice = AmbiguityChoiceCard(1, "Local sales tax changes whether orders near $50 wait for a manager")',
  'table = PolicySimulatorTable("Threshold comparison", 1, [row1, row2])',
  'row1 = PolicySimulatorRow("Order near the limit", "$48.00 subtotal + $4.32 tax ($52.32)", ["Instant $52.32 credit", "Queued for manager"], 1)',
  'row2 = PolicySimulatorRow("Order above the limit", "$65.00 subtotal + $5.85 tax ($70.85)", ["Queued for manager", "Queued for manager"], 2)',
].join("\n");

function makeState(stage) {
  const isAgree = stage === "agree";
  const isApprove = stage === "approve";

  const approvalItem = {
    approved_by: "dana@acme.dev",
    artifacts: {},
    candidate_commit: CANDIDATE_COMMIT,
    environment: "sim",
    report_digest: REPORT_DIGEST,
    scenario_count: 3,
    suite_commit: SUITE_COMMIT,
    suite_id: "refunds_acceptance",
    test_source: {
      source: "written_tests",
      commit: SUITE_COMMIT,
      notice: "These tests were written by a separate agent on this machine and are not isolated from the builder.",
    },
  };

  const card = isAgree
    ? {
        change_id: CHANGE_ID,
        prompt: "Let customers request instant store-credit refunds up to $50; send larger requests to a manager.",
        summary: "Issue instant store-credit refunds up to $50 pre-tax and route larger requests to a manager.",
        status: "needs_confirmation",
        request_revision: REV_1,
        ambiguities: [
          {
            id: "tax_in_limit",
            question: "Does the $50 instant-credit limit count sales tax?",
            options: [
              "Count the pre-tax item subtotal so local tax rates never push an identical order into manager review.",
              "Count the full charged total, including sales tax, against the $50 limit.",
            ],
            draft_option:
              "Count the pre-tax item subtotal so local tax rates never push an identical order into manager review.",
          },
        ],
        examples: EXAMPLES,
        preserved_behaviors: ["Existing full-order cancellations before shipment keep refunding the original card."],
        stories: STORIES,
        ui_composition: {
          composed_for_revision: REV_1,
          program: OPENUI_PROGRAM,
        },
      }
    : {
        change_id: CHANGE_ID,
        prompt: "Let customers request instant store-credit refunds up to $50; send larger requests to a manager.",
        summary: "Issue instant store-credit refunds up to $50 pre-tax and route larger requests to a manager.",
        status: "confirmed",
        confirmed_by: "dana@acme.dev",
        request_revision: REV_2,
        answers: {
          tax_in_limit:
            "Count the pre-tax item subtotal so local tax rates never push an identical order into manager review.",
        },
        examples: EXAMPLES,
        preserved_behaviors: ["Existing full-order cancellations before shipment keep refunding the original card."],
        stories: STORIES,
        ...(isApprove ? { approval: approvalItem } : {}),
      };

  const changes = {
    approval_available: isApprove,
    version: `v-${stage}`,
    changes: [
      {
        change_id: CHANGE_ID,
        request_revision: card.request_revision,
        saved_at: "2026-11-25T18:12:00Z",
        status: card.status,
        summary: card.summary,
        ...(isApprove
          ? {
              latest_verification: {
                inputs_current: true,
                run_id: RUN_ID,
                state: "passed",
              },
            }
          : {}),
      },
    ],
  };

  const build = isAgree
    ? { change_id: CHANGE_ID, drafted_before_drop: false, build: { state: "not_started" } }
    : {
        change_id: CHANGE_ID,
        drafted_before_drop: false,
        build: {
          state: "started",
          in_force: true,
          request_revision: REV_2,
          started_at: "2026-11-25T18:14:00Z",
          answers: CONFIRMED_ANSWERS,
          examples: EXAMPLES,
          coverage_statements: COVERAGE,
          required_test_count: 2,
          required_tests: REQUIRED_TESTS,
          builder: {
            read: true,
            branch: "highbay/build-1",
            head_commit: CANDIDATE_COMMIT,
            last_check_at: "2026-11-25T18:18:10Z",
            last_check_passed: true,
          },
          test_writer: {
            read: true,
            report: 1,
            tests: {
              state: "accepted",
              commit: SUITE_COMMIT,
              checked_at: "2026-11-25T18:16:40Z",
              not_judged:
                "Highbay checked that these tests build into the generated test program and declare every required scenario; it did not judge what they assert.",
            },
          },
          taking: isApprove
            ? {
                state: "passed",
                run_id: RUN_ID,
                candidate_commit: CANDIDATE_COMMIT,
                candidate_branch: "highbay/build-1",
                base_in_branch: true,
                tests: {
                  source: "written_tests",
                  branch: "highbay/tests-1",
                  commit: SUITE_COMMIT,
                },
              }
            : { state: "building" },
        },
      };

  const team = {
    team: "refunds-service",
    herdr_mode: "attached",
    chorus_status: "connected",
    dismissed_notices: [],
    saved_choices: {
      builder: { client: "claude", program: "claude", model: "claude-sonnet-4-6", thinking: "high", yolo: true },
      test_writer: { client: "codex", program: "codex", model: "gpt-5.4", thinking: "high", yolo: true },
    },
    roles: [
      { role: "guide", handle: "guide", state: "waiting", attention: "none", watcher: "held", assignment: "nothing_owed" },
      {
        role: "builder",
        handle: "builder",
        state: isApprove ? "waiting" : "working",
        attention: "none",
        watcher: "held",
        assignment: "nothing_owed",
      },
      {
        role: "test_writer",
        handle: "test-writer",
        state: "waiting",
        attention: "none",
        watcher: "held",
        assignment: "nothing_owed",
      },
    ],
  };

  const options = {
    build_roles: ["builder", "test_writer"],
    agents: [
      {
        client: "claude",
        program: "claude",
        title: "Claude Code",
        models: ["claude-sonnet-4-6", "claude-opus-4-6"],
        efforts: ["medium", "high"],
        model_supported: true,
        thinking_supported: true,
        yolo_supported: true,
        headless_supported: true,
      },
      {
        client: "codex",
        program: "codex",
        title: "Codex",
        models: ["gpt-5.4"],
        efforts: ["medium", "high"],
        model_supported: true,
        thinking_supported: true,
        yolo_supported: true,
        headless_supported: true,
      },
    ],
  };

  const report = {
    report_digest: REPORT_DIGEST,
    passed: true,
    suite_failed: false,
    counts: { required: 3, passed: 3, failed: 0, harness_error: 0, not_run: 0 },
    scenarios: [
      {
        id: "starts_and_listens",
        outcome: "passed",
        checks: [
          { name: "readyz_ok", passed: true },
        ],
      },
      {
        id: "instant_credit",
        outcome: "passed",
        checks: [
          { name: "status_is_instant_credit", passed: true },
          { name: "credited_5232_cents_with_tax", passed: true },
        ],
      },
      {
        id: "manager_review",
        outcome: "passed",
        checks: [
          { name: "status_is_pending_review", passed: true },
          { name: "no_store_credit_issued", passed: true },
        ],
      },
    ],
  };

  const verificationStatus = {
    run_id: RUN_ID,
    change_id: CHANGE_ID,
    request_revision: REV_2,
    candidate_commit: CANDIDATE_COMMIT,
    suite_commit: SUITE_COMMIT,
    accepted_at: "2026-11-25T18:19:05Z",
    inputs_current: true,
    test_source: approvalItem.test_source,
    state: {
      type: "completed",
      value: {
        suite_id: "refunds_acceptance",
        environment: "sim",
        report,
      },
    },
  };

  const verificationReview = {
    ...verificationStatus,
    review: {
      approval: {
        state: "recorded",
        ...approvalItem,
      },
      story_context: {
        state: "recorded",
        build_number: 1,
        build_started_at: "2026-11-25T18:14:00Z",
        stories: STORIES,
        mapping: { state: "mapped", required_tests: REQUIRED_TESTS },
        test_coverage: {
          state: "recorded",
          report: 1,
          answers: CONFIRMED_ANSWERS,
          examples: EXAMPLES,
          coverage_statements: COVERAGE,
        },
      },
    },
  };

  return { card, changes, build, team, options, verificationStatus, verificationReview };
}

let currentStage = "agree";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const p = url.pathname;
  const state = makeState(currentStage);

  const json = (status, body) => {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(payload);
  };

  if (req.method === "GET" && p === "/views") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(checkpointBody);
    return;
  }
  if (req.method === "GET" && p === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "POST" && p === "/project/browser-session") {
    json(201, { project_name: "refunds-service", session: "demo-session-token" });
    return;
  }
  if (req.method === "GET" && p === "/changes") {
    json(200, state.changes);
    return;
  }
  if (req.method === "GET" && p === "/change-updates") {
    // Hold long-poll open cleanly until tab closes so the page stays calm.
    req.on("close", () => {});
    return;
  }
  if (req.method === "GET" && p === `/changes/${CHANGE_ID}`) {
    json(200, state.card);
    return;
  }
  if (req.method === "GET" && p === `/changes/${CHANGE_ID}/build`) {
    json(200, state.build);
    return;
  }
  if (req.method === "GET" && p === "/team") {
    json(200, state.team);
    return;
  }
  if (req.method === "GET" && p === "/team/agent-options") {
    json(200, state.options);
    return;
  }
  if (req.method === "GET" && p === "/workspace/story/refresh") {
    json(200, { state: "succeeded", draft_folder: ".highbay-draft", message: "Story ready.", stories: STORIES });
    return;
  }
  if (req.method === "GET" && p === `/changes/${CHANGE_ID}/verifications`) {
    json(200, { change_id: CHANGE_ID, runs: currentStage === "approve" ? [state.verificationStatus] : [] });
    return;
  }
  if (req.method === "GET" && p === `/verifications/${RUN_ID}`) {
    json(200, state.verificationStatus);
    return;
  }
  if (req.method === "GET" && p === `/verifications/${RUN_ID}/review`) {
    json(200, state.verificationReview);
    return;
  }
  if (req.method === "GET" && p === "/live-target") {
    json(200, { live_target: { state: "none" } });
    return;
  }
  if (req.method === "GET" && p === "/cp1/model") {
    json(200, { connection: { kind: "none" } });
    return;
  }
  if (req.method === "GET" && p === "/traces") {
    json(200, { has_more: false, spans: [] });
    return;
  }
  console.error("UNHANDLED:", req.method, p);
  json(404, { id: "not_found", name: "not_found", message: `Unhandled ${req.method} ${p}`, fault: false, temporary: false, timeout: false });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/views#link=demo-link`;

const SIZES = {
  desktop: { width: 1440, height: 960, scale: 1.5 },
  mobile: { width: 390, height: 780, scale: 2 },
};

const browser = await chromium.launch({ channel: "chrome" });
const pins = {};

try {
  for (const stage of ["agree", "build", "approve"]) {
    currentStage = stage;
    pins[stage] = {};
    for (const theme of ["light", "dark"]) {
      for (const [sizeName, spec] of Object.entries(SIZES)) {
        const viewport = { width: spec.width, height: spec.height };
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: spec.scale,
          colorScheme: theme,
        });
        const page = await context.newPage();
        page.on("pageerror", (err) => console.error("PAGEERROR:", err));
        await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
        try {
          await page.waitForSelector('[data-state="cp1-change-card"]', { state: "attached", timeout: 5000 });
        } catch (err) {
          console.error("DEBUG DOM:", await page.evaluate(() => ({
            attrs: [...document.querySelectorAll("[data-session], [data-state]")].map((n) => ({ id: n.id, session: n.getAttribute("data-session"), state: n.getAttribute("data-state") })),
            text: document.body.innerText.slice(0, 600),
          })));
          throw err;
        }

        if (stage === "agree") {
          await page.getByRole("button", { name: "Agree", exact: true }).click().catch(() => {});
          await page.waitForTimeout(250);
          // Select the pre-tax subtotal choice option so the simulator highlights it
          // and the primary action updates to "Confirm Intent & Lock Examples".
          const firstChoice = page.locator(".shadcn-choice-option").first();
          if ((await firstChoice.count()) > 0) {
            await firstChoice.click();
          }
          await page.waitForTimeout(250);
        } else if (stage === "build") {
          await page.getByRole("button", { name: "Build", exact: true }).click().catch(() => {});
          await page.waitForTimeout(400);
        } else if (stage === "approve") {
          await page.getByRole("button", { name: "Approve", exact: true }).click();
          await page.waitForTimeout(450);
        }

        // Blur active focus ring and reset scroll to top for a clean capture.
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          window.scrollTo({ top: 0, behavior: "instant" });
        });
        await page.waitForTimeout(200);

        const baseName = `${stage}-${sizeName}-${theme}`;
        const pngPath = path.join(__dirname, `${baseName}.png`);
        const webpPath = path.join(OUT_IMG_DIR, `${baseName}.webp`);
        await page.screenshot({ path: pngPath, fullPage: false });
        execFileSync("cwebp", ["-quiet", "-q", "82", "-m", "6", pngPath, "-o", webpPath]);
        fs.unlinkSync(pngPath);

        const measured = await page.evaluate(([w, h, stg]) => {
          const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
          const afterRight = (el, gapPx = 22) => {
            if (!el) return null;
            const range = document.createRange();
            range.selectNodeContents(el);
            const r = range.getBoundingClientRect();
            return {
              x: +clamp(((r.right + gapPx) / w) * 100, 4, 95).toFixed(2),
              y: +clamp(((r.top + r.height * 0.5) / h) * 100, 5, 95).toFixed(2),
            };
          };
          const beforeLeft = (el, gapPx = 20) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
              x: +clamp(((r.left - gapPx) / w) * 100, 4, 95).toFixed(2),
              y: +clamp(((r.top + r.height * 0.5) / h) * 100, 5, 95).toFixed(2),
            };
          };
          const inViewByText = (selector, re) =>
            [...document.querySelectorAll(selector)].find((n) => {
              if (!re.test((n.textContent || "").trim())) return false;
              const r = n.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < h - 24;
            });
          if (stg === "agree") {
            const simBadge = inViewByText("span, div", /^Question 1$/i);
            const simHeading = inViewByText("h3, h4, strong", /^Threshold comparison$/i);
            return {
              1: afterRight(inViewByText("h2, h3", /^Review & Confirm Change Intent$/i), 20),
              2: afterRight(simBadge || simHeading, 20),
              3: beforeLeft(inViewByText("button", /Confirm Intent|Jump to/i), 20),
            };
          }
          if (stg === "build") {
            return {
              1: afterRight(inViewByText("h3, h4, legend, strong", /^Builder$/i), 20),
              2: afterRight(inViewByText("h3, h4, legend, strong", /^Test writer$/i), 20),
              3: beforeLeft(inViewByText("span, div", /^Building$/i), 20),
            };
          }
          return {
            1: beforeLeft(inViewByText("button", /^Merge into current branch$/i), 20),
            2: afterRight(inViewByText("h3, h4, strong, p", /^Agreed flows and their tests$/i), 20),
            3: afterRight(inViewByText("p, span, strong", /^3 of 3 declared tests passed\.$/i), 20),
          };
        }, [viewport.width, viewport.height, stage]);

        pins[stage][`${sizeName}-${theme}`] = measured;
        const sizeKb = (fs.statSync(webpPath).size / 1024).toFixed(1);
        console.log(`${baseName}.webp (${sizeKb} KB)`, measured);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(__dirname, "pins.json"), JSON.stringify(pins, null, 2) + "\n");
