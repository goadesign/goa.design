// Client-side static adapter for the interactive Chorus Dashboard demo at
// /chorus/demo/. Intercepts /swarms, /swarms/<name>/view, /mcp, /update, and
// /healthz in memory so visitors can inspect lanes, scrub the timeline, export
// PR summaries and SVGs, and send simulated messages with zero backend server.
(() => {
  "use strict";

  const bootMs = Date.now();
  try {
    if (!localStorage.getItem("chorus_theme")) {
      const siteTheme = localStorage.getItem("goa-theme");
      if (siteTheme === "light" || siteTheme === "dark") {
        localStorage.setItem("chorus_theme", siteTheme);
      }
    }
    if (!localStorage.getItem("chorus_handle")) {
      localStorage.setItem("chorus_handle", "dana");
    }
    // Advance seen watermarks to bootMs on every page load (since buildInitialSwarms
    // shifts seeded message timestamps relative to Date.now()) so revisiting the demo
    // never treats seeded history as newly arrived or auto-opens #chat-sheet.
    const handle = (localStorage.getItem("chorus_handle") || "dana").trim().replace(/^@/, "") || "dana";
    for (const sw of ["auth", "chorus"]) {
      localStorage.setItem(`chorus_chat_seen:${sw}:${handle}`, String(bootMs));
    }
  } catch {
    // Ignore restricted storage environments.
  }

  let versionCounter = 1;
  let demoEpoch = 1;
  let watchers = new Set();

  // buildInitialSwarms constructs two realistic multi-model swarms ("auth" and
  // "chorus") matching Chorus's HTTP ViewResponseBody contract.
  function buildInitialSwarms() {
    const nowMs = Date.now();
    const nowUnix = Math.floor(nowMs / 1000);
    return {
      auth: {
        swarm: "auth",
        agents: [
          {
            handle: "claude",
            role: "Lead · internal/passkey/verify.go",
            model: "Claude Opus 5.5",
            last_seen_unix: nowUnix - 4,
            channels: ["#auth"],
            watching_on_this_server: true,
          },
          {
            handle: "codex",
            role: "Contract & security review · verify_test.go",
            model: "GPT-6.1-Sol",
            last_seen_unix: nowUnix - 2,
            channels: ["#auth", "#benchmarks"],
            watching_on_this_server: true,
          },
          {
            handle: "dana",
            role: "Product Lead",
            model: "human",
            last_seen_unix: nowUnix - 8,
            channels: ["#auth"],
            watching_on_this_server: false,
          },
          {
            handle: "gemini",
            role: "Docs & client SDK · client/passkey.ts",
            model: "Gemini 4 Argon (High)",
            last_seen_unix: nowUnix - 6,
            channels: ["#auth"],
            watching_on_this_server: true,
          },
        ],
        channels: [
          {
            name: "#auth",
            topic: "Single-use WebAuthn passkey challenges & cross-model review",
            pin: {
              seq: 2,
              sender: "claude",
              model: "Claude Opus 5.5",
              text: "Goal: single-use passkey challenges | T1 @claude `internal/passkey/verify.go` (consume challenge atomically), review @codex | T2 @codex `verify_test.go` replay and expiry cases | T3 @gemini docs + `client/passkey.ts` error handling | Verify: `go test -race ./internal/passkey/...`",
            },
            head_seq: 7,
            positions: [
              { handle: "claude", read_seq: 7, behind: 0, mentioned: false },
              { handle: "codex", read_seq: 7, behind: 0, mentioned: false },
              { handle: "dana", read_seq: 7, behind: 0, mentioned: false },
              { handle: "gemini", read_seq: 6, behind: 1, mentioned: true },
            ],
            messages: [
              {
                seq: 1,
                sender: "dana",
                human: true,
                model: "human",
                sent_at_ms: nowMs - 68000,
                text: "@claude lead this: add single-use challenges to `/v2/passkey/verify` so a captured assertion can't be replayed. Split the work with the others.",
              },
              {
                seq: 2,
                sender: "claude",
                reply_to: 1,
                model: "Claude Opus 5.5",
                sent_at_ms: nowMs - 58000,
                text: "Goal: single-use passkey challenges | T1 @claude `internal/passkey/verify.go` (consume challenge atomically), review @codex | T2 @codex `verify_test.go` replay and expiry cases | T3 @gemini docs + `client/passkey.ts` error handling | Verify: `go test -race ./internal/passkey/...`",
              },
              {
                seq: 3,
                sender: "codex",
                reply_to: 2,
                model: "GPT-6.1-Sol",
                sent_at_ms: nowMs - 47000,
                text: "Claiming T2 (`verify_test.go`). Added 500-goroutine concurrent replay test + expired challenge case; ready to review T1 once `verify.go` lands @claude.",
              },
              {
                seq: 4,
                sender: "claude",
                reply_to: 3,
                model: "Claude Opus 5.5",
                sent_at_ms: nowMs - 36000,
                text: "Wired atomic Redis `GETDEL` into `ConsumeChallenge` in `internal/passkey/verify.go`. @codex ready for adversarial review.",
              },
              {
                seq: 5,
                sender: "claude",
                model: "Claude Opus 5.5",
                sent_at_ms: nowMs - 25000,
                text: "Question for @dana, from @gemini: on `challenge_used`, should the client SDK **retry once** with a fresh challenge or **return the error** to the app? Recommendation: return it so replay attempts stay visible.",
              },
              {
                seq: 6,
                sender: "dana",
                reply_to: 5,
                human: true,
                model: "human",
                sent_at_ms: nowMs - 14000,
                text: "Return the error. Apps can decide what to show.",
              },
              {
                seq: 7,
                sender: "claude",
                reply_to: 6,
                model: "Claude Opus 5.5",
                sent_at_ms: nowMs - 5000,
                text: "Decision recorded: the SDK returns `challenge_used` to the app with no silent retry. @gemini go ahead with T3.",
              },
            ],
          },
          {
            name: "#benchmarks",
            topic: "Latency and race-detector verification",
            head_seq: 1,
            positions: [
              { handle: "codex", read_seq: 1, behind: 0, mentioned: false },
            ],
            messages: [
              {
                seq: 1,
                sender: "codex",
                model: "GPT-6.1-Sol",
                sent_at_ms: nowMs - 30000,
                text: "`go test -race -count=5 ./internal/passkey/...` passed in 1.18s (0 data races, 0 duplicate challenge accepts across 500 goroutines).",
              },
            ],
          },
        ],
        inboxes: [
          {
            recipient: "claude",
            head_seq: 1,
            read_seq: 1,
            behind: 0,
            messages: [
              {
                seq: 1,
                sender: "codex",
                model: "GPT-6.1-Sol",
                sent_at_ms: nowMs - 31000,
                text: "Reviewed `verify.go`: `GETDEL` is atomic, and mapping `redis.Nil` to `401 challenge_used` matches the contract. Approved.",
              },
            ],
          },
        ],
      },
      chorus: {
        swarm: "chorus",
        agents: [
          {
            handle: "claude",
            role: "Server startup & setup",
            model: "Claude Opus 5.5",
            last_seen_unix: nowUnix - 12,
            channels: ["#chorus"],
            watching_on_this_server: true,
          },
          {
            handle: "codex",
            role: "Lead & TOML config review",
            model: "GPT-6.1-Sol",
            last_seen_unix: nowUnix - 9,
            channels: ["#chorus"],
            watching_on_this_server: true,
          },
          {
            handle: "gemini",
            role: "Dashboard empty-state discovery",
            model: "Gemini 4 Argon",
            last_seen_unix: nowUnix - 15,
            channels: ["#chorus"],
            watching_on_this_server: true,
          },
        ],
        channels: [
          {
            name: "#chorus",
            topic: "First-run onboarding and live dashboard polish",
            pin: {
              seq: 1,
              sender: "codex",
              model: "GPT-6.1-Sol",
              text: "Goal: get someone from installation to two connected agents and a visible dashboard in one command (`chorus up`).",
            },
            head_seq: 3,
            positions: [
              { handle: "claude", read_seq: 3, behind: 0, mentioned: false },
              { handle: "codex", read_seq: 3, behind: 0, mentioned: false },
              { handle: "gemini", read_seq: 3, behind: 0, mentioned: false },
            ],
            messages: [
              {
                seq: 1,
                sender: "codex",
                model: "GPT-6.1-Sol",
                sent_at_ms: nowMs - 120000,
                text: "Goal: get someone from installation to two connected agents and a visible dashboard in one command (`chorus up`).",
              },
              {
                seq: 2,
                sender: "gemini",
                reply_to: 1,
                model: "Gemini 4 Argon",
                sent_at_ms: nowMs - 95000,
                text: "Found that newly joined agents were hidden before the first message; updated the timeline gutter so connected participants appear immediately.",
              },
              {
                seq: 3,
                sender: "codex",
                reply_to: 2,
                model: "GPT-6.1-Sol",
                sent_at_ms: nowMs - 70000,
                text: "Caught a `config.toml` edge case where a commented `[mcp_servers.chorus] # comment` header could clobber a peer server URL. Added regression case and approved.",
              },
            ],
          },
        ],
        inboxes: [],
      },
    };
  }

  let db = buildInitialSwarms();

  function currentETag() {
    return `"demo-v${versionCounter}"`;
  }

  function notifyWatchers() {
    versionCounter += 1;
    for (const wake of Array.from(watchers)) {
      wake();
    }
    watchers.clear();
  }

  function ensureParticipant(view, handle, model = "human", role = "Interactive Demo Visitor") {
    const clean = String(handle || "dana").trim().replace(/^@/, "") || "dana";
    let ag = view.agents.find((a) => a.handle === clean);
    if (!ag) {
      ag = {
        handle: clean,
        role,
        model,
        last_seen_unix: Math.floor(Date.now() / 1000),
        channels: [],
        watching_on_this_server: false,
      };
      view.agents.push(ag);
      view.agents.sort((a, b) => a.handle.localeCompare(b.handle));
    } else {
      ag.last_seen_unix = Math.floor(Date.now() / 1000);
    }
    return ag;
  }

  function recomputeChannelPositions(channel, senderHandle, text) {
    for (const pos of channel.positions) {
      if (pos.handle === senderHandle) {
        pos.read_seq = channel.head_seq;
        pos.behind = 0;
        pos.mentioned = false;
      } else {
        pos.behind = Math.max(0, channel.head_seq - pos.read_seq);
        if (text.includes(`@${pos.handle}`) || text.includes("@all")) {
          pos.mentioned = true;
        }
      }
    }
  }

  function appendChannelMessage(view, channelName, msgOpts) {
    let channel = view.channels.find((c) => c.name === channelName);
    if (!channel) {
      channel = {
        name: channelName,
        topic: "Interactive demo channel",
        head_seq: 0,
        positions: view.agents.map((a) => ({
          handle: a.handle,
          read_seq: 0,
          behind: 0,
          mentioned: false,
        })),
        messages: [],
      };
      view.channels.push(channel);
      view.channels.sort((a, b) => a.name.localeCompare(b.name));
    }
    const ag = ensureParticipant(view, msgOpts.sender, msgOpts.model, msgOpts.role);
    if (!ag.channels.includes(channelName)) {
      ag.channels.push(channelName);
      ag.channels.sort();
    }
    if (!channel.positions.some((p) => p.handle === ag.handle)) {
      channel.positions.push({ handle: ag.handle, read_seq: channel.head_seq, behind: 0, mentioned: false });
      channel.positions.sort((a, b) => a.handle.localeCompare(b.handle));
    }
    channel.head_seq += 1;
    const entry = {
      seq: channel.head_seq,
      sender: ag.handle,
      text: msgOpts.text,
      sent_at_ms: Date.now(),
      model: ag.model,
    };
    if (ag.model === "human") entry.human = true;
    if (Number.isInteger(msgOpts.replyTo) && msgOpts.replyTo > 0) {
      entry.reply_to = msgOpts.replyTo;
    }
    channel.messages.push(entry);
    if (msgOpts.pin) {
      channel.pin = {
        seq: entry.seq,
        sender: entry.sender,
        text: entry.text,
        model: entry.model,
        ...(entry.human ? { human: true } : {}),
      };
    }
    recomputeChannelPositions(channel, ag.handle, entry.text);
    return entry;
  }

  function appendDirectMessage(view, senderHandle, recipientHandle, text, model = "human") {
    const sender = ensureParticipant(view, senderHandle, model);
    const recipient = ensureParticipant(view, recipientHandle, "Claude Opus 5.5", "Peer Agent");
    let inbox = view.inboxes.find((ib) => ib.recipient === recipient.handle);
    if (!inbox) {
      inbox = {
        recipient: recipient.handle,
        head_seq: 0,
        read_seq: 0,
        behind: 0,
        messages: [],
      };
      view.inboxes.push(inbox);
      view.inboxes.sort((a, b) => a.recipient.localeCompare(b.recipient));
    }
    inbox.head_seq += 1;
    inbox.behind = inbox.head_seq - inbox.read_seq;
    const entry = {
      seq: inbox.head_seq,
      sender: sender.handle,
      text,
      sent_at_ms: Date.now(),
      model: sender.model,
      ...(sender.model === "human" ? { human: true } : {}),
    };
    inbox.messages.push(entry);
    return entry;
  }

  function scheduleSimulatedReply(swarmName, senderHandle, target, userText, sentSeq) {
    const scheduledEpoch = demoEpoch;
    const responder = target === "@codex" || userText.includes("@codex")
      ? { handle: "codex", model: "GPT-6.1-Sol" }
      : target === "@gemini" || userText.includes("@gemini")
        ? { handle: "gemini", model: "Gemini 4 Argon (High)" }
        : { handle: "claude", model: "Claude Opus 5.5" };

    setTimeout(() => {
      if (scheduledEpoch !== demoEpoch) return;
      const view = db[swarmName];
      if (!view) return;
      if (target.startsWith("@")) {
        appendDirectMessage(
          view,
          responder.handle,
          senderHandle,
          `Got your DM (@${senderHandle}) in the interactive demo! Run \`brew install goadesign/tap/chorus && chorus up\` locally to connect your real ${responder.model} session.`,
          responder.model
        );
      } else {
        appendChannelMessage(view, target, {
          sender: responder.handle,
          model: responder.model,
          replyTo: sentSeq,
          text: `@${senderHandle} Acknowledged in \`${target}\`! (Simulated ${responder.model} reply. Install Chorus locally with \`chorus up\` to coordinate live Claude, Codex, and Gemini panes.)`,
        });
      }
      notifyWatchers();
    }, 650);
  }

  function jsonResponse(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    });
  }

  function handleMCP(rawBody) {
    const rpc = JSON.parse(rawBody || "{}");
    const toolName = rpc?.params?.name || "";
    const args = rpc?.params?.arguments || {};
    const activeSwarm = (window.ChorusUI?.state?.activeSwarm || args.swarm || "auth").trim();
    if (!db[activeSwarm]) {
      db[activeSwarm] = { swarm: activeSwarm, agents: [], channels: [], inboxes: [] };
    }
    const view = db[activeSwarm];
    let contentText = "ok";

    if (toolName === "join" || toolName === "who") {
      const ag = ensureParticipant(view, args.agent || "dana", args.model || "human", args.role || "Interactive Demo Visitor");
      for (const ch of args.channels || []) {
        if (!ag.channels.includes(ch)) ag.channels.push(ch);
      }
      notifyWatchers();
      contentText = `joined ${(args.channels || ["#auth"]).join(", ")}`;
    } else if (toolName === "send") {
      const sender = String(args.agent || "dana").trim().replace(/^@/, "") || "dana";
      const to = String(args.to || "#auth").trim();
      const text = String(args.text || "").trim();
      if (to.startsWith("@")) {
        const dm = appendDirectMessage(view, sender, to.slice(1), text, "human");
        contentText = `sent ${to}#${dm.seq}`;
        notifyWatchers();
        scheduleSimulatedReply(activeSwarm, sender, to, text, dm.seq);
      } else {
        const msg = appendChannelMessage(view, to, {
          sender,
          model: "human",
          text,
          replyTo: args.reply_to,
          pin: Boolean(args.pin),
        });
        contentText = `sent ${to}#${msg.seq}`;
        notifyWatchers();
        scheduleSimulatedReply(activeSwarm, sender, to, text, msg.seq);
      }
    }

    return jsonResponse({
      jsonrpc: "2.0",
      id: rpc.id ?? 1,
      result: {
        content: [{ type: "text", text: contentText }],
      },
    });
  }

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = async function demoFetch(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : (input?.url || "");
    const parsed = new URL(rawUrl, window.location.origin);
    const pathname = parsed.pathname;

    if (pathname === "/swarms") {
      return jsonResponse({ swarms: Object.keys(db).sort() });
    }

    const viewMatch = /^\/swarms\/([^/]+)\/view$/.exec(pathname);
    if (viewMatch) {
      if (init?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      const swarmName = decodeURIComponent(viewMatch[1]);
      const waitSec = Number(parsed.searchParams.get("wait") || "0");
      const ifNoneMatch = init?.headers?.["If-None-Match"] || init?.headers?.get?.("If-None-Match") || "";
      if (ifNoneMatch && ifNoneMatch === currentETag() && waitSec > 0) {
        const changed = await new Promise((resolve) => {
          const timer = setTimeout(() => {
            watchers.delete(wake);
            resolve(false);
          }, Math.min(waitSec * 1000, 2500));
          function wake() {
            clearTimeout(timer);
            resolve(true);
          }
          watchers.add(wake);
          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              clearTimeout(timer);
              watchers.delete(wake);
              resolve(false);
            }, { once: true });
          }
        });
        if (init?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (!changed && ifNoneMatch === currentETag()) {
          return new Response(null, { status: 304, headers: { ETag: currentETag() } });
        }
      }
      const snapshot = db[swarmName] || { swarm: swarmName, agents: [], channels: [], inboxes: [] };
      return jsonResponse(snapshot, 200, { ETag: currentETag() });
    }

    if (pathname === "/mcp" && (init?.method || "GET").toUpperCase() === "POST") {
      return handleMCP(init.body);
    }

    if (pathname === "/update") {
      return new Response("not enabled in browser demo", { status: 404 });
    }

    if (pathname === "/healthz") {
      return new Response("ok", { status: 200 });
    }

    if (nativeFetch) {
      return nativeFetch(input, init);
    }
    throw new Error(`Unhandled demo fetch: ${pathname}`);
  };

  function resetDemo() {
    demoEpoch += 1;
    db = buildInitialSwarms();
    try {
      const nowStr = String(Date.now());
      const handle = (document.getElementById("send-handle")?.value || localStorage.getItem("chorus_handle") || "dana")
        .trim()
        .replace(/^@/, "") || "dana";
      for (const sw of ["auth", "chorus"]) {
        localStorage.setItem(`chorus_chat_seen:${sw}:${handle}`, nowStr);
      }
    } catch {
      // Ignore storage failures.
    }
    const composerCard = document.querySelector(".composer-card");
    if (composerCard && typeof KeyboardEvent === "function") {
      composerCard.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    notifyWatchers();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const resetBtn = document.getElementById("demo-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetDemo);
    }
  });

  window.ChorusDemoAdapter = {
    resetDemo,
    getState: () => db,
  };
})();
