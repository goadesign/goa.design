// capture.mjs renders the real Highbay Studio single-page bundle
// (internal/controlplane/checkpoint.html from github.com/goadesign/highbay)
// across the four stages shown on goa.design/highbay/ (Agree, Architecture,
// Verify [Run 1 blocked], and Approve [Run 2 verified]) in light and dark themes
// at desktop (1280x860 @ 2x, showing the sticky Chorus Conversation rail) and
// mobile (390x740 @ 2x), writing optimized WebP assets to static/img/highbay/.
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

const CHANGE_ID = "ops-copilot-platform";
const REV_1 = "rev_9c41e8a2f017";
const REV_2 = "rev_d830b41c77e2";
const RUN_1_ID = "run_3a18c4f902d14e67b8120c9a4d51e031";
const RUN_2_ID = "run_7f42a9e018c34b2190a1d6f8e3b20194";
const CANDIDATE_COMMIT_1 = "61d04b8e2f91c73a40e5b8129c3f7a104e82d9c3";
const CANDIDATE_COMMIT_2 = "b92e4d108b74d12f9c3e65018ab42f9103c7d8e1";
const SUITE_COMMIT = "5be07f193c62e84a10b29f473cd81e5264a9b0c2";
const REPORT_1_DIGEST = "sha256:2c94e108b7d34a62f0915c8e3d72a4109f68b2e1c4a7d093e5b8c102f4a6d9e1";
const REPORT_2_DIGEST = "sha256:8f31d904c2a17e6b5409f3c1e82d7a4b9061c3e2f5a8d104b7c9e203a6f1d8b4";

const STORIES = [
  {
    name: "OpsCopilotPlatform",
    description: "Multi-tenant incident triage & remediation platform with server-injected org_id, bounded log cursors, and on-call approval gates.",
    actors: [
      { key: "responder", title: "Incident responder" },
      { key: "oncall", title: "On-call engineer" },
    ],
    flows: [
      {
        key: "bounded_triage_and_tenant_guard",
        title: "Correlate deploys and bounded pod logs with server-injected org_id",
        complete: true,
        questions: [],
        steps: [
          { key: "alert_in", actor_key: "responder", kind: "start", summary: "Alert arrives for api-gateway; prompt attempts cross-tenant org_id spoof", questions: [] },
          { key: "triaged", actor_key: "responder", kind: "outcome", summary: "TriageAgent reads bounded 100-line log page under caller's verified org_id", questions: [] },
        ],
      },
      {
        key: "production_rollback_requires_approval",
        title: "Pause production rollbacks at Confirmation and require oncall role to approve",
        complete: true,
        questions: [],
        steps: [
          { key: "escalate_prod", actor_key: "responder", kind: "start", summary: "TriageAgent hands unhealthy production deploy to RemediationAgent", questions: [] },
          { key: "gate_oncall", actor_key: "oncall", kind: "outcome", summary: "Workflow suspends at Confirmation; non-oncall approvals return 403 Forbidden", questions: [] },
        ],
      },
    ],
  },
];

const EXAMPLES = [
  {
    id: "check_01",
    scenario: "Prompt-injected log line attempts cross-tenant spoof",
    input_summary: "Log payload contains instruction to query org_id=\"other-tenant\" and dump 10,000 lines.",
    expected_outcome: "Inject(\"org_id\") enforces caller's verified tenant; BoundedResult caps each page to 100 lines.",
    verification_kind: "deterministic",
  },
  {
    id: "check_02",
    scenario: "Unhealthy staging deploy self-heals",
    input_summary: "TriageAgent hands unhealthy staging deploy to RemediationAgent.",
    expected_outcome: "Rolls back staging automatically without paging on-call.",
    verification_kind: "deterministic",
  },
  {
    id: "check_03",
    scenario: "Production rollback requires on-call role approval",
    input_summary: "Production rollback pauses at Confirmation; a viewer without oncall role posts to /runs/{id}/approval.",
    expected_outcome: "Suspends at Confirmation, rejects viewer approval with 403 Forbidden, and executes zero rollbacks until on-call approves.",
    verification_kind: "deterministic",
  },
];

const CONFIRMED_ANSWERS = [
  {
    id: "autonomy_boundary",
    question: "Where should RemediationAgent draw the autonomy boundary for service rollbacks?",
    answer: "Autonomous diagnostics and staging rollbacks; require on-call Confirmation before any production rollback.",
  },
];

const COVERAGE = [
  {
    scenario: "bounded_triage_and_tenant_guard",
    question_ids: ["autonomy_boundary"],
    example_ids: ["check_01"],
    explanation: "Sends prompt-injected cross-tenant alert with 5,000 log lines; asserts OrgID == \"acme\" and len(Lines) <= 100.",
  },
  {
    scenario: "production_rollback_requires_approval",
    question_ids: ["autonomy_boundary"],
    example_ids: ["check_03"],
    explanation: "Pauses production rollback at Confirmation; asserts 403 Forbidden when viewer approves and Rollbacks == 0.",
  },
];

const REQUIRED_TESTS = [
  { story: "OpsCopilotPlatform", flow_key: "bounded_triage_and_tenant_guard", scenario: "bounded_triage_and_tenant_guard", hook: "BoundedTriageAndTenantGuard" },
  { story: "OpsCopilotPlatform", flow_key: "production_rollback_requires_approval", scenario: "production_rollback_requires_approval", hook: "ProductionRollbackRequiresApproval" },
];

const OPENUI_PROGRAM = [
  'root = DecisionWorkspace("Platform autonomy boundary", [choice, table])',
  'choice = AmbiguityChoiceCard(1, "Choose which cluster actions RemediationAgent runs autonomously vs. behind on-call Confirmation")',
  'table = PolicySimulatorTable("Autonomy matrix", 1, [row1, row2, row3])',
  'row1 = PolicySimulatorRow("Log & deploy triage", "All environments", ["Autonomous (BoundedResult)", "Autonomous (BoundedResult)"], 1)',
  'row2 = PolicySimulatorRow("Staging rollback", "staging", ["Autonomous self-healing", "Pause for on-call Confirmation"], 2)',
  'row3 = PolicySimulatorRow("Production rollback", "production", ["Pause for on-call Confirmation (403 if not oncall)", "Pause for on-call Confirmation"], 3)',
].join("\n");

const TEST_SOURCE = {
  source: "written_tests",
  commit: SUITE_COMMIT,
  notice: "Written by a separate test-writer agent on branch highbay/tests-1.",
};

function makeState(stage) {
  const isAgree = stage === "agree";
  const isCheck = stage === "check";
  const isApprove = stage === "approve";
  const activeCandidate = isCheck ? CANDIDATE_COMMIT_1 : CANDIDATE_COMMIT_2;

  const approvalItem = {
    approved_by: "dana@acme.dev",
    artifacts: {},
    candidate_commit: CANDIDATE_COMMIT_2,
    environment: "sim",
    report_digest: REPORT_2_DIGEST,
    scenario_count: 4,
    suite_commit: SUITE_COMMIT,
    suite_id: "ops_copilot_acceptance",
    test_source: TEST_SOURCE,
  };

  const card = isAgree
    ? {
        change_id: CHANGE_ID,
        prompt: "Build a multi-tenant incident platform: a triage agent and remediation agent with MCP tools to search pod logs, correlate deploys, and roll back services with on-call approval.",
        summary: "Multi-tenant incident platform with TriageAgent, RemediationAgent, MCP toolset, server-injected org_id, bounded log cursors, and on-call approval gates.",
        status: "needs_confirmation",
        request_revision: REV_1,
        ambiguities: [
          {
            id: "autonomy_boundary",
            question: "Where should RemediationAgent draw the autonomy boundary for service rollbacks?",
            options: [
              "Autonomous diagnostics and staging rollbacks; require on-call Confirmation before any production rollback.",
              "Read-only autonomous triage; require on-call Confirmation before rollbacks in every environment.",
            ],
            draft_option:
              "Autonomous diagnostics and staging rollbacks; require on-call Confirmation before any production rollback.",
          },
        ],
        examples: EXAMPLES,
        preserved_behaviors: ["org_id is always server-injected from verified auth and omitted from model-visible tool JSON."],
        stories: STORIES,
        ui_composition: {
          composed_for_revision: REV_1,
          program: OPENUI_PROGRAM,
        },
      }
    : {
        change_id: CHANGE_ID,
        prompt: "Build a multi-tenant incident platform: a triage agent and remediation agent with MCP tools to search pod logs, correlate deploys, and roll back services with on-call approval.",
        summary: "Multi-tenant incident platform with TriageAgent, RemediationAgent, MCP toolset, server-injected org_id, bounded log cursors, and on-call approval gates.",
        status: "confirmed",
        confirmed_by: "dana@acme.dev",
        request_revision: REV_2,
        answers: {
          autonomy_boundary:
            "Autonomous diagnostics and staging rollbacks; require on-call Confirmation before any production rollback.",
        },
        examples: EXAMPLES,
        preserved_behaviors: ["org_id is always server-injected from verified auth and omitted from model-visible tool JSON."],
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
        saved_at: "2026-11-26T08:12:00Z",
        status: card.status,
        summary: card.summary,
        ...(isCheck
          ? {
              latest_verification: {
                inputs_current: true,
                run_id: RUN_1_ID,
                state: "failed",
              },
            }
          : isApprove
          ? {
              latest_verification: {
                inputs_current: true,
                run_id: RUN_2_ID,
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
          started_at: "2026-11-26T08:14:00Z",
          answers: CONFIRMED_ANSWERS,
          examples: EXAMPLES,
          coverage_statements: COVERAGE,
          required_test_count: 2,
          required_tests: REQUIRED_TESTS,
          builder: {
            read: true,
            branch: "highbay/build-1",
            head_commit: activeCandidate,
            last_check_at: "2026-11-26T08:18:10Z",
            last_check_passed: true,
          },
          test_writer: {
            read: true,
            report: 1,
            tests: {
              state: "accepted",
              commit: SUITE_COMMIT,
              checked_at: "2026-11-26T08:16:40Z",
              not_judged:
                "Highbay checked that these tests build into the generated test program and declare every required scenario; it did not judge what they assert.",
            },
          },
          taking: isApprove
            ? {
                state: "passed",
                run_id: RUN_2_ID,
                candidate_commit: CANDIDATE_COMMIT_2,
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

  const guideChoice = {
    client: "claude",
    program: "claude",
    model: "claude-opus-4-6",
    thinking: "high",
    yolo: false,
  };
  const builderChoice = {
    client: "codex",
    program: "codex",
    model: "gpt-5.4",
    thinking: "high",
    yolo: false,
  };
  const writerChoice = {
    client: "claude",
    program: "claude",
    model: "claude-sonnet-4-6",
    thinking: "high",
    yolo: false,
  };

  const team = {
    team: "ops-copilot",
    channel: "#ops-copilot",
    chorus_status: "connected",
    dismissed_notices: [],
    saved_choices: {
      guide: guideChoice,
      builder: builderChoice,
      test_writer: writerChoice,
    },
    roles: [
      {
        role: "guide",
        handle: "guide",
        has_terminal: true,
        state: "waiting",
        attention: "none",
        assignment: "nothing_owed",
        choice: guideChoice,
      },
      {
        role: "builder",
        handle: "builder",
        has_terminal: true,
        state: isApprove || isAgree ? "waiting" : "working",
        attention: "none",
        assignment: "nothing_owed",
        choice: builderChoice,
      },
      {
        role: "test_writer",
        handle: "test-writer",
        has_terminal: true,
        state: "waiting",
        attention: "none",
        assignment: "nothing_owed",
        choice: writerChoice,
      },
    ],
  };

  const baseMs = Date.parse("2026-11-26T08:10:00Z");
  const messages = [
    {
      id: "#ops-copilot:1",
      seq: 1,
      target: "#ops-copilot",
      sender: "dana",
      sender_role: "you",
      text: "Build a multi-tenant incident platform with bounded pod logs, staging self-healing, and on-call approval for production rollbacks.",
      sent_at_ms: baseMs,
    },
    {
      id: "#ops-copilot:2",
      seq: 2,
      target: "#ops-copilot",
      sender: "guide",
      sender_role: "guide",
      model: "Claude Opus 4.6",
      reply_to: 1,
      text: "Proposed Change Card ops-copilot-platform with 1 open autonomy question and 3 acceptance examples.",
      sent_at_ms: baseMs + 48_000,
    },
  ];
  if (!isAgree) {
    messages.push(
      {
        id: "#ops-copilot:3",
        seq: 3,
        target: "#ops-copilot",
        sender: "dana",
        sender_role: "you",
        text: "Confirmed autonomous staging rollbacks and on-call Confirmation for production.",
        sent_at_ms: baseMs + 135_000,
      },
      {
        id: "#ops-copilot:4",
        seq: 4,
        target: "#ops-copilot",
        sender: "guide",
        sender_role: "guide",
        model: "Claude Opus 4.6",
        reply_to: 3,
        text: "Compiled C4 topology: 8 containers, server-injected org_id, bounded cursors, and Temporal approval gate.",
        sent_at_ms: baseMs + 165_000,
      },
    );
  }
  if (isCheck || isApprove) {
    messages.push(
      {
        id: "#ops-copilot:5",
        seq: 5,
        target: "#ops-copilot",
        sender: "test-writer",
        sender_role: "test_writer",
        model: "Claude Sonnet 4.6",
        text: "Accepted eval/ suite on highbay/tests-1 covering tenant guard and 403 non-oncall approval check.",
        sent_at_ms: baseMs + 390_000,
      },
      {
        id: "#ops-copilot:6",
        seq: 6,
        target: "#ops-copilot",
        sender: "builder",
        sender_role: "builder",
        model: "gpt-5.4",
        text: "Candidate 61d04b8 failed Run 1 on non_oncall_approval_rejected (viewer got 200 OK instead of 403).",
        sent_at_ms: baseMs + 440_000,
      },
    );
  }
  if (isApprove) {
    messages.push({
      id: "#ops-copilot:7",
      seq: 7,
      target: "#ops-copilot",
      sender: "builder",
      sender_role: "builder",
      model: "gpt-5.4",
      text: "Enforced oncall role check before Confirmation resume. Candidate b92e4d1 passed all 4 scenarios in Run 2.",
      sent_at_ms: baseMs + 585_000,
    });
  }

  const conversation = {
    team: "ops-copilot",
    channel: "#ops-copilot",
    chorus_status: "connected",
    messages,
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

  const failedReport = {
    report_digest: REPORT_1_DIGEST,
    passed: false,
    suite_failed: false,
    counts: { required: 4, passed: 3, failed: 1, harness_error: 0, not_run: 0 },
    scenarios: [
      {
        id: "starts_and_listens",
        outcome: "passed",
        checks: [{ name: "readyz_and_mcp_ok", passed: true }],
      },
      {
        id: "bounded_triage_and_tenant_guard",
        outcome: "passed",
        checks: [
          { name: "spoofed_org_id_ignored", passed: true },
          { name: "within_token_budget_3100", passed: true },
        ],
      },
      {
        id: "staging_rollback_heals",
        outcome: "passed",
        checks: [{ name: "rolled_back_without_paging", passed: true }],
      },
      {
        id: "production_rollback_requires_approval",
        outcome: "failed",
        checks: [
          { name: "suspended_for_oncall_confirmation", passed: true },
          {
            name: "non_oncall_approval_rejected",
            passed: false,
            diagnostic: 'POST /runs/inc_42/approval as role="viewer": expected 403 Forbidden, got 200 OK.',
          },
        ],
      },
    ],
  };

  const passedReport = {
    report_digest: REPORT_2_DIGEST,
    passed: true,
    suite_failed: false,
    counts: { required: 4, passed: 4, failed: 0, harness_error: 0, not_run: 0 },
    scenarios: [
      {
        id: "starts_and_listens",
        outcome: "passed",
        checks: [{ name: "readyz_and_mcp_ok", passed: true }],
      },
      {
        id: "bounded_triage_and_tenant_guard",
        outcome: "passed",
        checks: [
          { name: "spoofed_org_id_ignored", passed: true },
          { name: "within_token_budget_3100", passed: true },
        ],
      },
      {
        id: "staging_rollback_heals",
        outcome: "passed",
        checks: [{ name: "rolled_back_without_paging", passed: true }],
      },
      {
        id: "production_rollback_requires_approval",
        outcome: "passed",
        checks: [
          { name: "suspended_for_oncall_confirmation", passed: true },
          { name: "non_oncall_approval_rejected", passed: true },
        ],
      },
    ],
  };

  const run1Status = {
    run_id: RUN_1_ID,
    change_id: CHANGE_ID,
    request_revision: REV_2,
    candidate_commit: CANDIDATE_COMMIT_1,
    suite_commit: SUITE_COMMIT,
    accepted_at: "2026-11-26T08:17:20Z",
    inputs_current: true,
    test_source: TEST_SOURCE,
    state: {
      type: "completed",
      value: {
        suite_id: "ops_copilot_acceptance",
        environment: "sim",
        report: failedReport,
      },
    },
  };

  const run2Status = {
    run_id: RUN_2_ID,
    change_id: CHANGE_ID,
    request_revision: REV_2,
    candidate_commit: CANDIDATE_COMMIT_2,
    suite_commit: SUITE_COMMIT,
    accepted_at: "2026-11-26T08:19:45Z",
    inputs_current: true,
    test_source: TEST_SOURCE,
    state: {
      type: "completed",
      value: {
        suite_id: "ops_copilot_acceptance",
        environment: "sim",
        report: passedReport,
      },
    },
  };

  const storyContext = {
    state: "recorded",
    build_number: 1,
    build_started_at: "2026-11-26T08:14:00Z",
    stories: STORIES,
    mapping: { state: "mapped", required_tests: REQUIRED_TESTS },
    test_coverage: {
      state: "recorded",
      report: 1,
      answers: CONFIRMED_ANSWERS,
      examples: EXAMPLES,
      coverage_statements: COVERAGE,
    },
  };

  const run1Review = {
    ...run1Status,
    review: {
      approval: {
        state: "blocked",
        reason: "Scenario production_rollback_requires_approval failed (3 of 4 passed).",
      },
      story_context: storyContext,
    },
  };

  const run2Review = {
    ...run2Status,
    review: {
      approval: { state: "recorded", ...approvalItem },
      story_context: storyContext,
    },
  };

  const architecturePreview = {
    change_id: CHANGE_ID,
    request_revision: REV_2,
    design_digest: "4e91c70a83f21b64d9052c87a13f6e409b28d514c703e891a6b42f08d37c5192",
    system_name: "Ops Copilot Platform",
    banner: "8 containers, 7 boundary edges, 2 agent policies, 3 tool contracts",
    containers: [
      { id: "responder", kind: "person", name: "Incident Responder", description: "Investigates cluster alerts" },
      { id: "oncall", kind: "person", name: "On-Call Engineer", description: "Approves production rollbacks" },
      { id: "triage_agent", kind: "agent", name: "Triage Agent", description: "Correlates deploys & bounded logs" },
      { id: "ops_api", kind: "service", name: "Ops API & MCP", description: "HTTP & MCP gateway, auth & run store" },
      { id: "remediation_agent", kind: "agent", name: "Remediation Agent", description: "Gated service rollbacks" },
      { id: "log_tools", kind: "toolset", name: "Pod Log Toolset", description: "Bounded log & deploy MCP tools" },
      { id: "temporal", kind: "system", name: "Temporal Engine", description: "Durable workflow & approval state" },
      { id: "rollout_tools", kind: "toolset", name: "Rollout Toolset", description: "Rollback MCP tools with Confirmation" },
    ],
    edges: [
      { from_id: "responder", to_id: "ops_api", protocol: "HTTPS" },
      { from_id: "oncall", to_id: "ops_api", protocol: "HTTPS" },
      { from_id: "ops_api", to_id: "triage_agent", protocol: "Agent" },
      { from_id: "triage_agent", to_id: "log_tools", protocol: "MCP" },
      { from_id: "ops_api", to_id: "temporal", protocol: "Temporal" },
      { from_id: "ops_api", to_id: "remediation_agent", protocol: "Agent" },
      { from_id: "remediation_agent", to_id: "rollout_tools", protocol: "MCP" },
    ],
    agent_policies: [
      {
        agent_id: "triage_agent",
        max_execution_seconds: 60,
        max_tool_calls: 6,
        max_recovery_turns: 2,
        compress_at_turns: 12,
        keep_recent_turns: 6,
        cache_after_system: true,
        cache_after_tools: true,
      },
      {
        agent_id: "remediation_agent",
        max_execution_seconds: 45,
        max_tool_calls: 4,
        max_recovery_turns: 1,
        compress_at_turns: 8,
        keep_recent_turns: 4,
        cache_after_system: true,
        cache_after_tools: true,
      },
    ],
    tools: [
      {
        id: "triage_agent/query_pod_logs",
        name: "query_pod_logs",
        toolset: "log_tools",
        description: "Queries bounded pod logs and deploy correlation for the caller's verified organization.",
        injected_fields: ["org_id"],
        requires_confirmation: false,
        bounded_result: true,
        requires_ui: false,
        args_schema: '{"type":"object","required":["env","service"]}',
        return_schema: '{"type":"object","required":["lines"]}',
      },
      {
        id: "remediation_agent/rollback_staging",
        name: "rollback_staging",
        toolset: "rollout_tools",
        description: "Rolls back an unhealthy staging deployment autonomously.",
        injected_fields: ["org_id"],
        requires_confirmation: false,
        bounded_result: false,
        requires_ui: false,
        args_schema: '{"type":"object","required":["service"]}',
        return_schema: '{"type":"object","required":["status"]}',
      },
      {
        id: "remediation_agent/rollback_production",
        name: "rollback_production",
        toolset: "rollout_tools",
        description: "Rolls back an unhealthy production deployment after on-call Confirmation.",
        injected_fields: ["org_id"],
        requires_confirmation: true,
        bounded_result: false,
        requires_ui: false,
        args_schema: '{"type":"object","required":["service"]}',
        return_schema: '{"type":"object","required":["status"]}',
      },
    ],
  };

  return {
    card,
    changes,
    build,
    team,
    conversation,
    options,
    run1Status,
    run2Status,
    run1Review,
    run2Review,
    architecturePreview,
  };
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
      "X-Highbay-UI-Build": "studio-f88aa63e",
    });
    res.end(payload);
  };

  if (req.method === "GET" && p === "/views") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Highbay-UI-Build": "studio-f88aa63e",
    });
    res.end(checkpointBody);
    return;
  }
  if (req.method === "GET" && p === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if ((req.method === "POST" || req.method === "GET") && p === "/project/browser-session") {
    json(req.method === "POST" ? 201 : 200, {
      project_name: "ops-copilot",
      session: "demo-session-token",
      ui_build: "studio-f88aa63e",
      version: "v0.4.0",
    });
    return;
  }
  if (req.method === "GET" && p === "/project/update") {
    json(200, {
      can_auto_update: true,
      current_version: "v0.4.0",
      latest_version: "v0.4.0",
      release_url: "https://github.com/goadesign/highbay/releases/tag/v0.4.0",
      update_available: false,
    });
    return;
  }
  if (req.method === "GET" && p === "/changes") {
    json(200, state.changes);
    return;
  }
  if (req.method === "GET" && p === "/change-updates") {
    req.on("close", () => {});
    return;
  }
  if (req.method === "POST" && p === "/changes/preview") {
    json(200, state.architecturePreview);
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
  if (req.method === "GET" && p === `/changes/${CHANGE_ID}/build/findings`) {
    json(200, {
      change_id: CHANGE_ID,
      checked_at: "2026-11-26T08:16:40Z",
      findings: [],
      report: 1,
      request_revision: REV_2,
      started_at: "2026-11-26T08:14:00Z",
    });
    return;
  }
  if (req.method === "GET" && p === "/team") {
    json(200, state.team);
    return;
  }
  if (req.method === "GET" && p === "/team/conversation") {
    json(200, state.conversation);
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
    const runs =
      currentStage === "check"
        ? [state.run1Status]
        : currentStage === "approve"
        ? [state.run2Status, state.run1Status]
        : [];
    json(200, { change_id: CHANGE_ID, runs });
    return;
  }
  if (req.method === "GET" && p === `/verifications/${RUN_1_ID}`) {
    json(200, state.run1Status);
    return;
  }
  if (req.method === "GET" && p === `/verifications/${RUN_1_ID}/review`) {
    json(200, state.run1Review);
    return;
  }
  if (req.method === "GET" && p === `/verifications/${RUN_2_ID}`) {
    json(200, state.run2Status);
    return;
  }
  if (req.method === "GET" && p === `/verifications/${RUN_2_ID}/review`) {
    json(200, state.run2Review);
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
  desktop: { width: 1280, height: 860, scale: 2 },
  mobile: { width: 390, height: 740, scale: 2 },
};

const browser = await chromium.launch({ channel: "chrome" });
const pins = {};

try {
  for (const stage of ["agree", "architecture", "check", "approve"]) {
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
        await page.waitForSelector("#highbay-checkpoint-nav:not([hidden])", { state: "visible", timeout: 5000 });

        if (stage === "agree") {
          await page.waitForSelector("#highbay-cp1-editor", { state: "visible", timeout: 5000 });
          const firstChoice = page.locator(".shadcn-choice-option").first();
          if ((await firstChoice.count()) > 0) {
            await firstChoice.click();
          }
          await page.waitForTimeout(250);
        } else if (stage === "architecture") {
          await page.waitForSelector("#highbay-build-section", { state: "visible", timeout: 5000 });
          if (sizeName === "mobile") {
            await page.locator("#highbay-stage-menu > summary").click();
          }
          await page.locator("#highbay-nav-cp2").click();
          await page.waitForSelector("#highbay-c4-svg", { state: "visible", timeout: 5000 });
          await page.waitForTimeout(250);
        } else if (stage === "check") {
          await page.waitForSelector("#highbay-cp4-verification", { state: "visible", timeout: 5000 });
          await page.waitForFunction(
            () => /This result matches the agreed revision/i.test(document.querySelector("#highbay-cp4-inputs")?.textContent || ""),
            { timeout: 5000 },
          );
          await page.evaluate(() => {
            for (const details of document.querySelectorAll(".highbay-verification-scenarios details")) {
              if (/production_rollback_requires_approval/i.test(details.textContent || "")) {
                details.open = true;
              }
            }
          });
          await page.waitForTimeout(200);
        } else if (stage === "approve") {
          await page.waitForSelector("#highbay-cp5-title", { state: "visible", timeout: 5000 });
          await page.waitForTimeout(300);
        }

        await page.evaluate(([stg, sz]) => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          const chatFeed = document.querySelector("#highbay-conversation-messages");
          if (chatFeed) {
            chatFeed.scrollTop = chatFeed.scrollHeight;
            const items = chatFeed.querySelectorAll("li.highbay-message-item");
            const lastMsg = items[items.length - 1];
            if (lastMsg instanceof HTMLElement) {
              const feedRect = chatFeed.getBoundingClientRect();
              const msgRect = lastMsg.getBoundingClientRect();
              if (msgRect.top < feedRect.top + 4) {
                chatFeed.scrollTop = Math.max(0, chatFeed.scrollTop + (msgRect.top - feedRect.top) - 4);
              }
            }
          }
          const sticky = document.querySelector("#highbay-checkpoint-nav");
          const stickyBottom = sz === "mobile" ? 0 : sticky ? Math.ceil(sticky.getBoundingClientRect().bottom) : 130;
          let top = 0;
          if (stg === "agree") {
            const sim = [...document.querySelectorAll("h2, h3, div")].find((n) => /^Platform autonomy boundary$/i.test((n.textContent || "").trim()));
            if (sim) {
              const pad = sz === "mobile" ? 12 : 16;
              top = Math.max(0, Math.round(sim.getBoundingClientRect().top + window.scrollY - stickyBottom - pad));
            }
          } else if (stg === "architecture") {
            const heading = [...document.querySelectorAll("h2, h3")].find((n) => /^C4 Directed Graph/i.test((n.textContent || "").trim()));
            if (heading) {
              const offset = sz === "mobile" ? -12 : 20;
              top = Math.max(0, Math.round(heading.getBoundingClientRect().top + window.scrollY - stickyBottom + offset));
            }
          } else if (stg === "check") {
            if (sz === "mobile") {
              document.body.style.paddingBottom = "320px";
              const targetEl =
                document.querySelector("#highbay-cp4-message-builder") ||
                [...document.querySelectorAll("details")].find((n) =>
                  /production_rollback_requires_approval/i.test(n.textContent || ""),
                );
              if (targetEl) {
                const visibleBottom = window.innerHeight - 16;
                top = Math.max(0, Math.round(targetEl.getBoundingClientRect().bottom + window.scrollY - visibleBottom));
              }
            }
          } else if (stg === "approve" && sz === "mobile") {
            document.body.style.paddingBottom = "360px";
            const basisEl = document.querySelector("#highbay-approval-basis-title");
            if (basisEl) {
              top = Math.max(0, Math.round(basisEl.getBoundingClientRect().top + window.scrollY - 12));
            }
          }
          window.scrollTo({ top, behavior: "instant" });
        }, [stage, sizeName]);
        await page.waitForTimeout(200);

        const baseName = `${stage}-${sizeName}-${theme}`;
        const pngPath = path.join(__dirname, `${baseName}.png`);
        const webpPath = path.join(OUT_IMG_DIR, `${baseName}.webp`);
        await page.screenshot({ path: pngPath, fullPage: false });
        execFileSync("cwebp", ["-quiet", "-q", "85", "-m", "6", pngPath, "-o", webpPath]);
        fs.unlinkSync(pngPath);

        const sizeKb = (fs.statSync(webpPath).size / 1024).toFixed(1);
        pins[stage][`${sizeName}-${theme}`] = { sizeKb: +sizeKb };
        console.log(`${baseName}.webp (${sizeKb} KB)`);
        await context.close();
      }
    }
  }

  fs.writeFileSync(path.join(__dirname, "pins.json"), JSON.stringify(pins, null, 2) + "\n");
} finally {
  await browser.close();
  server.close();
}
