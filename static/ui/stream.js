// Render retained messages and their disclosures from the controller's current
// snapshot. The controller owns network calls, filters, selection, and sending.
(() => {
  "use strict";

  window.ChorusStream = Object.freeze({
    render,
    inspectAgent,
    renderMessageText,
    captureScrollSnapshot,
    restoreScrollSnapshot,
    resetDisclosures,
  });

  // Configured Marked lexer instance with GFM tables, strikethrough, autolinks,
  // and line breaks enabled, and raw HTML/XML tag tokenizers disabled so raw
  // tags (<script>, <details>, <agent>) remain inert plain text tokens.
  const mdEngine = new globalThis.marked.Marked({
    gfm: true,
    breaks: true,
    tokenizer: {
      html() { return undefined; },
      tag() { return undefined; },
    },
  });

  // Single detached <textarea> used by decodeEntities to resolve standard
  // case-sensitive HTML5 named character references without parsing tags.
  const entityDecoder = document.createElement("textarea");
  entityDecoder.innerHTML = "&amp;";
  const hasNativeEntityDecoder = entityDecoder.value === "&";
  const FALLBACK_ENTITIES = Object.freeze({
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00a0",
    copy: "\u00a9",
    eacute: "\u00e9",
    Lt: "\u226a",
    Gt: "\u226b",
    ndash: "\u2013",
    mdash: "\u2014",
    hellip: "\u2026",
  });

  // Displayed previews belong only to this page visit and the retained messages
  // in the current swarm. Displaying a preview does not mean reading its text.
  const displayedPreviews = new Set();
  // Switching swarms starts a new display context even when sequence IDs match.
  let previewSwarm = "";
  // The observer is replaced after each render so removed rows are not retained.
  let previewObserver = null;
  document.addEventListener("visibilitychange", observeUnshownPreviews);
  document.addEventListener("pointerdown", (ev) => {
    const detailsEl = document.getElementById("agent-details");
    if (!detailsEl || !detailsEl.dataset?.agent || detailsEl.hidden) return;
    const t = ev.target;
    if (!t || typeof t.closest !== "function") return;
    if (detailsEl.contains(t)) return;
    if (t.closest('.tl-lane-inspect, [data-tl-lane], [data-inspect-handle], [data-focus-key^="inspect:"]')) return;
    closeAgentDrawer(detailsEl, false);
  });

  // render updates the message surfaces without keeping another copy of swarm
  // data. Disclosure choices and reading position belong to the existing DOM.
  function render(els, state, actions) {
    previewObserver?.disconnect();
    previewObserver = null;
    if (previewSwarm !== state.activeSwarm) {
      displayedPreviews.clear();
      previewSwarm = state.activeSwarm;
    }
    if (state.view === null) {
      els.mentionsEl?.replaceChildren();
      if (els.detailsEl) closeAgentDrawer(els.detailsEl, false);
      renderPin(els.pinEl, state, actions);
      els.titleEl.textContent = "Messages";
      els.subtitleEl.textContent = "Loading swarm…";
      els.streamEl.replaceChildren(empty("Loading messages", "Connecting to the swarm…"));
      return;
    }
    const entries = retainedMessages(state.view);
    const retainedKeys = new Set(entries.map(coordinate));
    for (const key of displayedPreviews) {
      if (!retainedKeys.has(key)) displayedPreviews.delete(key);
    }
    const targetEntries = selectedMessages(entries, state);
    const visible = targetEntries.filter((entry) => matches(entry, state));
    const scrollSnapshot = els.preserveScroll
      ? null
      : (els.scrollSnapshot || captureScrollSnapshot(els.streamEl, els.scrollEl));

    renderPin(els.pinEl, state, actions);
    renderMentions(els.mentionsEl, targetEntries, state, actions, entries);
    renderMessages(els.streamEl, visible, targetEntries, state, actions);
    renderInspectedAgent(els.detailsEl, state, actions, entries);

    if (!els.preserveScroll) {
      restoreScrollSnapshot(els.streamEl, els.scrollEl, scrollSnapshot);
    }
    revealSelectedMessage(els.streamEl, state, Boolean(els.revealSelection));
    previewObserver = new IntersectionObserver(exposePreviews, { root: els.scrollEl });
    observeUnshownPreviews();

    const target = state.selectedTarget;
    if (target?.kind === "channel") {
      els.titleEl.textContent = target.name;
    } else if (target?.kind === "dm") {
      els.titleEl.replaceChildren(handleBadgeNode(target.a, state), " ↔ ", handleBadgeNode(target.b, state));
    } else {
      els.titleEl.textContent = "All messages";
    }
    const sources = target?.kind === "channel"
      ? state.view.channels.filter((channel) => channel.name === target.name)
      : target?.kind === "dm"
        ? state.view.inboxes.filter((inbox) => inbox.recipient === target.a || inbox.recipient === target.b)
        : [...state.view.channels, ...state.view.inboxes];
    const count = window.ChorusUI.formatMessageCount(targetEntries.length, sources);
    els.subtitleEl.textContent = `${visible.length} of ${count.text} messages · newest first`;
    els.subtitleEl.title = count.title;
  }

  // retainedMessages attaches each message's real channel or recipient inbox.
  // A sequence number is unique only within that source, including for DMs.
  function retainedMessages(view) {
    const entries = [];
    for (const channel of view.channels) {
      for (const message of channel.messages) entries.push({ target: channel.name, message });
    }
    for (const inbox of view.inboxes) {
      for (const message of inbox.messages) entries.push({ target: `@${inbox.recipient}`, message });
    }
    entries.sort(compareEntries);
    return entries;
  }

  // selectedMessages limits the view to the chosen channel or pair of people.
  // The all-messages view preserves inbox coordinates instead of merging IDs.
  function selectedMessages(entries, state) {
    const target = state.selectedTarget;
    if (target?.kind === "channel") return entries.filter((entry) => entry.target === target.name);
    if (target?.kind !== "dm") return entries;
    return entries.filter((entry) => {
      if (!entry.target.startsWith("@")) return false;
      const sender = entry.message.sender;
      const recipient = entry.target.slice(1);
      return (sender === target.a && recipient === target.b)
        || (sender === target.b && recipient === target.a);
    });
  }

  // compareEntries gives equal-time messages from separate streams a stable
  // ascending display order; presentation reverses this to show newest on top.
  function compareEntries(a, b) {
    return a.message.sent_at_ms - b.message.sent_at_ms
      || a.target.localeCompare(b.target) || a.message.seq - b.message.seq;
  }

  // matches applies only presentation choices supplied by the controller.
  function matches(entry, state) {
    const message = entry.message;
    if (state.timeWindow && (message.sent_at_ms < state.timeWindow.startMs
      || message.sent_at_ms > state.timeWindow.endMs)) return false;
    return window.ChorusUI.matchesMessage(entry.target, message, state.filterAgent, state.searchQuery);
  }

  // findParticipant builds the live or historical participant record for handle
  // from state.view.agents and retained message entries.
  function findParticipant(handle, state, entries) {
    const reg = (state.view?.agents || []).find((a) => a.handle === handle);
    let latest = null;
    let latestModel = reg?.model || "";
    const seenChannels = new Set(reg?.channels || []);
    for (const entry of entries) {
      if (entry.message.sender === handle) {
        latest = entry;
        if (!reg?.model && entry.message.model) latestModel = entry.message.model;
        if (entry.target.startsWith("#")) seenChannels.add(entry.target);
      }
    }
    if (reg) {
      return {
        agent: { ...reg, model: reg.model || latestModel, registered: true },
        latest,
      };
    }
    if (!latest && !(state.view?.inboxes || []).some((ib) => ib.recipient === handle)) {
      return null;
    }
    return {
      agent: {
        handle,
        role: "",
        model: latestModel,
        last_seen_unix: 0,
        last_message_ms: latest ? latest.message.sent_at_ms : 0,
        channels: [...seenChannels],
        watching_on_this_server: false,
        registered: false,
      },
      latest,
    };
  }

  // isAnchorVisible reports whether node is connected and not hidden inside a
  // collapsed <details> disclosure body.
  function isAnchorVisible(node) {
    if (!node || !node.isConnected) return false;
    let cur = node;
    while (cur) {
      const details = cur.parentElement?.closest?.("details");
      if (!details) break;
      const summary = [...(details.children || [])].find((c) => c.tagName === "SUMMARY");
      if (!details.open && (!summary || !summary.contains(cur))) {
        return false;
      }
      cur = details;
    }
    return true;
  }

  // resolveAgentAnchor locates the live invoking button or timeline lane for
  // the open #agent-details popover.
  function resolveAgentAnchor(detailsEl) {
    if (!detailsEl) return null;
    const returnKey = detailsEl.dataset.returnFocusKey || "";
    if (returnKey) {
      const target = [...document.querySelectorAll("[data-focus-key]")]
        .find((node) => node.dataset.focusKey === returnKey);
      return isAnchorVisible(target) ? target : null;
    }
    const laneHandle = detailsEl.dataset.returnLane || "";
    if (laneHandle) {
      const laneNode = [...document.querySelectorAll("[data-tl-lane]")]
        .find((node) => node.dataset.tlLane === laneHandle);
      return isAnchorVisible(laneNode) ? laneNode : null;
    }
    return null;
  }

  // closeAgentDrawer clears and hides the #agent-details popover and restores
  // keyboard focus to the control that opened it when restoreFocus is true.
  function closeAgentDrawer(detailsEl, restoreFocus = true) {
    if (!detailsEl) return;
    const returnKey = detailsEl.dataset.returnFocusKey || "";
    const returnLane = detailsEl.dataset.returnLane || "";
    delete detailsEl.dataset.agent;
    delete detailsEl.dataset.returnFocusKey;
    delete detailsEl.dataset.returnLane;
    detailsEl.removeAttribute("role");
    detailsEl.removeAttribute("aria-label");
    detailsEl.hidden = true;
    detailsEl.style.left = "";
    detailsEl.style.top = "";
    detailsEl.style.maxHeight = "";
    detailsEl.replaceChildren();
    if (!restoreFocus) return;
    if (returnKey) {
      const target = [...document.querySelectorAll("[data-focus-key]")]
        .find((node) => node.dataset.focusKey === returnKey);
      if (isAnchorVisible(target)) {
        target.focus?.({ preventScroll: true });
        return;
      }
    }
    if (returnLane) {
      const laneNode = [...document.querySelectorAll("[data-tl-lane]")]
        .find((node) => node.dataset.tlLane === returnLane);
      if (isAnchorVisible(laneNode)) {
        laneNode.focus?.({ preventScroll: true });
        return;
      }
    }
    document.querySelector("svg.tl")?.focus?.({ preventScroll: true });
  }

  // inspectAgent toggles or switches the anchored #agent-details popover for
  // handle. anchorEl is the control the reader activated: a timeline lane
  // label (data-tl-lane), an Inspect action or inline @handle mention
  // (data-focus-key), or a mention inside the popover itself, which switches
  // the agent but keeps the original opener as the anchor.
  function inspectAgent(detailsEl, handle, state, actions, anchorEl) {
    if (!detailsEl || !state?.view) return;
    const clean = String(handle || "").replace(/^@/, "");
    if (!clean) return;
    const fromInsidePopover = detailsEl.contains(anchorEl);
    const invoker = fromInsidePopover ? null : anchorEl;
    const invokerKey = invoker?.dataset?.focusKey || "";
    if (detailsEl.dataset.agent === clean) {
      if (fromInsidePopover) return;
      const sameFocusKey = invokerKey && detailsEl.dataset.returnFocusKey === invokerKey;
      const sameLane = !invokerKey && !detailsEl.dataset.returnFocusKey;
      if (sameFocusKey || sameLane) {
        closeAgentDrawer(detailsEl, true);
        return;
      }
    }
    const found = findParticipant(clean, state, retainedMessages(state.view));
    if (!found) return;
    if (invokerKey) {
      detailsEl.dataset.returnFocusKey = invokerKey;
      delete detailsEl.dataset.returnLane;
    } else if (!fromInsidePopover) {
      detailsEl.dataset.returnLane = clean;
      delete detailsEl.dataset.returnFocusKey;
    } else if (!detailsEl.dataset.returnFocusKey) {
      detailsEl.dataset.returnLane = clean;
    }
    detailsEl.dataset.agent = clean;
    detailsEl.hidden = false;
    detailsEl.setAttribute("role", "dialog");
    detailsEl.setAttribute("aria-label", `Details for @${clean}`);
    showAgent(detailsEl, found.agent, state, actions, found.latest);
    const anchor = (invoker && invokerKey && isAnchorVisible(invoker))
      ? invoker
      : resolveAgentAnchor(detailsEl);
    if (anchor) {
      window.ChorusTimeline?.placeAnchored?.(detailsEl, anchor);
    }
    detailsEl.querySelector?.('[data-focus-key="close-agent"]')?.focus?.({ preventScroll: true });
  }

  // renderInspectedAgent refreshes #agent-details on live polls while an agent
  // is being inspected, or closes it if the handle or its anchor is no longer
  // present in the active view.
  function renderInspectedAgent(detailsEl, state, actions, entries) {
    const inspected = detailsEl?.dataset.agent;
    if (!inspected) {
      if (detailsEl) detailsEl.hidden = true;
      return;
    }
    const found = findParticipant(inspected, state, entries);
    const anchor = found ? resolveAgentAnchor(detailsEl) : null;
    if (found && anchor) {
      detailsEl.hidden = false;
      detailsEl.setAttribute("role", "dialog");
      detailsEl.setAttribute("aria-label", `Details for @${inspected}`);
      showAgent(detailsEl, found.agent, state, actions, found.latest);
      window.ChorusTimeline?.placeAnchored?.(detailsEl, anchor);
    } else {
      closeAgentDrawer(detailsEl, Boolean(detailsEl && detailsEl.contains(document.activeElement)));
    }
  }

  // showAgent describes current registration or historical message facts,
  // declared model, per-channel and DM sequence-position gaps and read watermarks,
  // and 1-click actions to message, filter, or copy the chorus watch command.
  function showAgent(root, agent, state, actions, latest) {
    const closeDrawer = () => closeAgentDrawer(root, true);
    root.onkeydown = (ev) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        closeDrawer();
      }
    };
    const close = iconButton("close", "Close", "close-agent", closeDrawer);

    const posSummaries = [];
    for (const ch of state.view.channels || []) {
      const p = (ch.positions || []).find((item) => item.handle === agent.handle);
      if (p) {
        posSummaries.push(p.behind > 0
          ? `${ch.name}: Position gap ${p.behind} · Read through #${p.read_seq} (head #${ch.head_seq}${p.mentioned ? ", @mentioned" : ""})`
          : `${ch.name}: Read through #${p.read_seq} (caught up)`);
      }
    }
    const inbox = (state.view.inboxes || []).find((ib) => ib.recipient === agent.handle);
    if (inbox) {
      posSummaries.push(inbox.behind > 0
        ? `DMs: Position gap ${inbox.behind} · Read through #${inbox.read_seq} (head #${inbox.head_seq})`
        : `DMs: Read through #${inbox.read_seq} (caught up)`);
    }

    const facts = element("dl", "agent-facts",
      element("dt", "", "Model"),
      element("dd", "", agent.model || "Not declared"),
      element("dt", "", agent.registered !== false ? "Last call or heartbeat" : "Last message"),
      element("dd", "", agent.registered !== false ? `${age(agent.last_seen_unix * 1000)} ago` : (latest ? `${age(latest.message.sent_at_ms)} ago` : "Unknown")),
      element("dt", "", "Watching on this server"),
      element("dd", "", agent.watching_on_this_server ? "Yes (listening)" : "No"),
      element("dt", "", "Channels"),
      element("dd", "", (agent.channels || []).join(", ") || "None"),
      element("dt", "", "Read watermarks"),
      element("dd", "", posSummaries.join(" · ") || "No channel watermarks"));

    const watchCmd = `chorus watch ${agent.handle}`;
    const copyWatchBtn = actionButton([svgIcon("copy", "icon icon-xs"), `Copy: ${watchCmd}`], `copy-watch:${agent.handle}`, async (ev) => {
      const btn = ev.currentTarget;
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
          throw new Error("clipboard unavailable");
        }
        await navigator.clipboard.writeText(watchCmd);
        btn.replaceChildren(svgIcon("check", "icon icon-xs"), `Copied: ${watchCmd}`);
      } catch {
        btn.textContent = "Copy unavailable";
      }
      setTimeout(() => {
        if (btn.isConnected) btn.replaceChildren(svgIcon("copy", "icon icon-xs"), `Copy: ${watchCmd}`);
      }, 2000);
    });
    copyWatchBtn.setAttribute("aria-live", "polite");

    const isHuman = agent.registered !== false
      ? agent.model === "human"
      : (agent.model === "human" || Boolean(latest && isFromHumanMessage(latest.message)));
    const modelHint = agent.model || "";
    const nodes = [
      element("div", "details-heading",
        element("h3", "details-agent-title",
          avatarNode(agent.handle, state, modelHint, isHuman),
          `@${agent.handle}`),
        close),
    ];
    if (agent.role) {
      const roleP = element("p", "agent-role");
      appendTextWithMentions(roleP, agent.role, {
        prefix: `agent-role:${agent.handle}`,
        count: 0,
        onInspect: (h, el) => actions?.inspectAgent?.(h, el),
      });
      nodes.push(roleP);
    }
    nodes.push(facts);
    if (latest) nodes.push(element("p", "agent-last-message", `Latest message (${latest.target}#${latest.message.seq}): `, formattedPreview(latest.message.text)));
    nodes.push(element("div", "detail-actions",
      actionButton(["Direct message ", handleBadgeNode(agent.handle, state, "", isHuman, modelHint)], `dm:${agent.handle}`, () => {
        closeAgentDrawer(root, false);
        actions.composeDM(agent.handle);
      }),
      actionButton(state.filterAgent === agent.handle ? "Clear agent filter" : ["Filter by ", handleBadgeNode(agent.handle, state, "", isHuman, modelHint)], `filter-agent:${agent.handle}`, () => actions.setFilterAgent(agent.handle)),
      copyWatchBtn));
    replaceKeepingFocus(root, nodes);
  }

  // renderPin shows the selected channel's pin without rebuilding an open
  // editor. The one editor owns its draft and original swarm/channel until
  // the reader cancels or the server confirms the update.
  function renderPin(root, state, actions) {
    const editor = root.querySelector(".pin-editor");
    if (editor) {
      const pending = editor.getAttribute("aria-busy") === "true";
      const sameSwarm = state.activeSwarm === editor.dataset.swarm
        && state.view?.swarm === editor.dataset.swarm;
      editor.querySelector("[type=submit]").disabled = pending || !sameSwarm;
      const scopeNotice = editor.querySelector(".pin-edit-scope-notice");
      scopeNotice.hidden = sameSwarm;
      scopeNotice.textContent = `Return to swarm ${editor.dataset.swarm} to update this pin.`;
      return;
    }
    const channel = state.selectedTarget?.kind === "channel"
      ? state.view?.channels.find((item) => item.name === state.selectedTarget.name) : null;
    if (!channel?.pin) {
      root.replaceChildren();
      delete root.dataset.pinKey;
      return;
    }
    const pin = channel.pin;
    const key = `${state.activeSwarm}:${channel.name}`;
    const previous = root.querySelector("details");
    const sameChannel = root.dataset.pinKey === key;
    if (!sameChannel) {
      root.dataset.pinMode = "fields";
    }
    const changed = sameChannel && root.dataset.pinSeq !== String(pin.seq);
    const updated = changed || (sameChannel && root.dataset.updated === "true");
    const disclosure = element("details", "pin-disclosure");
    disclosure.open = sameChannel && previous ? previous.open : false;
    disclosure.dataset.disclosureKey = `pin:${key}`;
    const newer = channel.messages.filter((message) => message.seq > pin.seq).length;
    const pinFromHuman = pin.human === true;
    const summary = element("summary", "pin-summary",
      svgIcon("pin", "icon icon-sm pin-icon"),
      element("strong", "pin-title", `Pin #${pin.seq} · ${cleanPinHeadline(pin.text)}`),
      element("span", "pin-meta", "by ", handleBadgeNode(pin.sender, state, "", pinFromHuman, pin.model), ` · ${newer} newer`));
    summary.dataset.focusKey = `pin:${key}`;
    if (updated) summary.append(element("span", "pin-updated", "Updated"));
    disclosure.append(summary);

    const clauses = pinClauses(pin.text);
    const raw = element("pre", "pin-raw-text", pin.text);
    const structured = renderPinStructured(clauses, key, actions);
    const rawMode = sameChannel && root.dataset.pinMode === "raw";
    raw.hidden = clauses.length > 0 && !rawMode;
    structured.hidden = clauses.length === 0 || rawMode;
    const body = element("div", "pin-body", structured, raw);
    if (clauses.length > 0) {
      const toggleBtn = element("button", "pin-raw-toggle", rawMode ? "Show structured view" : "Show original text");
      toggleBtn.type = "button";
      toggleBtn.dataset.focusKey = `pin-mode:${key}`;
      toggleBtn.addEventListener("click", () => {
        const showRaw = root.dataset.pinMode !== "raw";
        root.dataset.pinMode = showRaw ? "raw" : "fields";
        raw.hidden = !showRaw;
        structured.hidden = showRaw;
        toggleBtn.textContent = showRaw ? "Show structured view" : "Show original text";
      });
      body.append(toggleBtn);
    }
    disclosure.append(body);

    disclosure.addEventListener("toggle", () => {
      if (disclosure.open && root.contains(disclosure)) {
        root.dataset.updated = "false";
        disclosure.querySelector(".pin-updated")?.remove();
      } else if (!disclosure.open) {
        const detailsEl = document.getElementById("agent-details");
        if (detailsEl?.dataset?.returnFocusKey
          && [...disclosure.querySelectorAll("[data-focus-key]")].some((n) => n.dataset.focusKey === detailsEl.dataset.returnFocusKey)) {
          closeAgentDrawer(detailsEl, false);
        }
      }
    });
    root.dataset.pinKey = key;
    root.dataset.pinSeq = String(pin.seq);
    root.dataset.updated = String(updated);

    const wrapper = element("div", "disclosure-item pin-item", disclosure);
    const editBtn = iconButton("edit", "Edit pin", `edit-pin:${key}`, () => {
      root.replaceChildren(renderPinEditor(root, state.activeSwarm, channel.name, pin.text, key, state, actions));
      root.querySelector(".pin-edit-textarea")?.focus();
    }, "pin-edit-btn");
    wrapper.append(editBtn);
    replaceKeepingFocus(root, [wrapper]);
  }

  // renderPinStructured separates the documented fields for reading. Owners
  // remain authored text: known handles receive badges without inferred work
  // assignments, removed punctuation, or a new ownership grammar.
  function renderPinStructured(clauses, pinKey = "pin", actions = null) {
    const container = element("div", "pin-structured");
    clauses.forEach((clause, idx) => {
      const kind = clause.key.toLowerCase();
      if (kind === "goal") {
        container.append(element("div", "pin-section",
          element("h3", "pin-section-label", "Goal"),
          element("div", "pin-goal-block", formattedText(clause.value, `pin:${pinKey}:goal:${idx}`, actions))));
      } else if (kind === "owners") {
        container.append(element("div", "pin-section",
          element("h3", "pin-section-label", "Owners"),
          element("div", "pin-owner-text", formattedText(clause.value, `pin:${pinKey}:owners:${idx}`, actions))));
      } else if (kind === "verify") {
        const copyBtn = actionButton("Copy command", `copy-verify:${idx}:${clause.value}`, async (ev) => {
          const btn = ev.currentTarget;
          try {
            await navigator.clipboard.writeText(clause.value);
            btn.textContent = "Copied";
          } catch {
            btn.textContent = "Copy unavailable";
          }
        });
        copyBtn.setAttribute("aria-live", "polite");
        container.append(element("div", "pin-section",
          element("h3", "pin-section-label", "Verify"),
          element("div", "pin-verify-row", element("code", "pin-verify-code", clause.value), copyBtn)));
      }
    });
    return container;
  }

  // renderPinEditor keeps text in one form, independent of the chat composer.
  // Cancel and Escape perform no request; after submit they are disabled until
  // the server responds because removing a form cannot undo a published pin.
  function renderPinEditor(root, swarm, channelName, originalText, key, state, actions) {
    const form = element("form", "pin-editor pin-disclosure");
    form.dataset.swarm = swarm;
    form.setAttribute("aria-label", `Edit pin in ${channelName}, swarm ${swarm}`);
    const label = element("label", "pin-edit-label", `Edit pin in ${channelName} · ${swarm}`);
    label.htmlFor = "pin-edit-text";
    const textarea = element("textarea", "pin-edit-textarea", originalText);
    textarea.id = "pin-edit-text";
    textarea.rows = 5;
    textarea.dataset.focusKey = `pin-textarea:${key}`;
    textarea.setAttribute("aria-describedby", "pin-edit-help pin-edit-error");
    const help = element("p", "pin-edit-help", "Updating replaces this channel’s pinned message. Your message draft stays separate.");
    help.id = "pin-edit-help";
    const scopeNotice = element("p", "pin-edit-scope-notice");
    scopeNotice.hidden = true;
    const errEl = element("p", "pin-edit-error");
    errEl.id = "pin-edit-error";
    errEl.setAttribute("role", "alert");
    errEl.hidden = true;
    const status = element("p", "pin-edit-status");
    status.setAttribute("role", "status");

    // Closing discards only this unsent form and restores a visible control.
    const closeEditor = () => {
      if (form.getAttribute("aria-busy") === "true") return;
      root.replaceChildren();
      renderPin(root, state, actions);
      root.querySelector("details.pin-disclosure")?.setAttribute("open", "");
      const returnTo = root.querySelector(".pin-edit-btn") || document.getElementById("swarm-select");
      returnTo?.focus({ preventScroll: true });
    };

    form.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !e.isComposing) {
        e.preventDefault();
        closeEditor();
      }
    });

    const cancelBtn = element("button", "btn-text", "Cancel");
    cancelBtn.type = "button";
    cancelBtn.dataset.focusKey = `pin-cancel:${key}`;
    cancelBtn.addEventListener("click", closeEditor);

    const saveBtn = element("button", "btn-primary pin-save-btn", "Update pin");
    saveBtn.type = "submit";
    saveBtn.dataset.focusKey = `pin-save:${key}`;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (saveBtn.disabled) return;
      errEl.hidden = true;
      textarea.removeAttribute("aria-invalid");
      form.setAttribute("aria-busy", "true");
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      textarea.readOnly = true;
      status.textContent = "Updating pin…";
      try {
        await actions.updatePin(swarm, channelName, textarea.value);
        root.replaceChildren();
        renderPin(root, state, actions);
        root.querySelector(".pin-edit-btn")?.focus({ preventScroll: true });
      } catch (err) {
        errEl.textContent = err.message || "Failed to update pin.";
        errEl.hidden = false;
        textarea.setAttribute("aria-invalid", "true");
        status.textContent = "Your changes are kept here. Check the error before trying again.";
      } finally {
        form.setAttribute("aria-busy", "false");
        cancelBtn.disabled = false;
        textarea.readOnly = false;
        if (root.contains(form)) renderPin(root, state, actions);
      }
    });

    form.append(label, help, scopeNotice, textarea, errEl, status,
      element("div", "pin-edit-actions", cancelBtn, saveBtn));
    return form;
  }

  // cleanPinHeadline removes the display convention's Goal label and inline
  // markdown delimiters; the original message remains unchanged in its text
  // view and edit form.
  function cleanPinHeadline(text) {
    const goal = pinClauses(text).find((clause) => clause.key.toLowerCase() === "goal");
    return stripInlineMarkdown(headline(goal?.value || text)).replace(/^\s*Goal\s*:\s*/i, "");
  }

  // pinClauses recognizes complete labelled segments for display only. Any
  // unrecognized segment leaves the entire original message in the text view.
  function pinClauses(text) {
    const segments = text.split("|");
    if (segments.length < 2) return [];
    const clauses = [];
    for (const segment of segments) {
      const match = /^\s*(Goal|Owners|Verify)\s*:\s*([\s\S]+)$/i.exec(segment);
      if (!match) return [];
      clauses.push({ key: match[1], value: match[2].trim() });
    }
    return clauses;
  }

  // renderMentions shows written mentions of known participants and @all.
  function renderMentions(root, entries, state, actions, allEntries) {
    const mentionTargets = new Set(["all", ...state.view.agents.map((agent) => agent.handle.toLowerCase())]);
    for (const entry of allEntries) {
      mentionTargets.add(entry.message.sender.toLowerCase());
      if (entry.target.startsWith("@")) mentionTargets.add(entry.target.slice(1).toLowerCase());
    }
    const mentions = [];
    for (const entry of entries) {
      for (const handle of mentionedHandles(entry.message.text)) {
        if (mentionTargets.has(handle.toLowerCase())) mentions.push({ entry, handle });
      }
    }
    const open = root.querySelector(".mentions-disclosure")?.open === true;
    const disclosure = element("details", "mentions-disclosure");
    disclosure.open = open;
    const last = mentions.at(-1);
    const mentionsSummary = element("summary", "mentions-summary",
      ...(last
        ? ["Recent mentions: ", handleBadgeNode(last.entry.message.sender, state, "", isFromHumanMessage(last.entry.message), last.entry.message.model), " → ", handleBadgeNode(last.handle, state), ` (${age(last.entry.message.sent_at_ms)} ago) · ${mentions.length} total`]
        : ["No mentions in this view"]));
    mentionsSummary.dataset.focusKey = "mentions-summary";
    disclosure.append(mentionsSummary);
    const list = element("ul", "mention-list");
    for (const { entry, handle } of mentions.toReversed()) {
      const row = element("li", "mention-row",
        actionButton(
          [handleBadgeNode(entry.message.sender, state, "", isFromHumanMessage(entry.message), entry.message.model), " mentioned ", handleBadgeNode(handle, state), ` (${entry.target}#${entry.message.seq})`],
          `mention:${coordinate(entry)}:${handle}`,
          () => actions.revealMessage(entry.target, entry.message.seq)
        ),
        element("span", "message-time", `${age(entry.message.sent_at_ms)} ago`));
      if (entry.target.startsWith("#")) {
        const reply = entries.find((item) => item.target === entry.target && item.message.reply_to === entry.message.seq);
        if (reply) row.append(actionButton(["Reply by ", handleBadgeNode(reply.message.sender, state, "", isFromHumanMessage(reply.message), reply.message.model)], `mention-reply:${coordinate(reply)}`,
          () => actions.revealMessage(reply.target, reply.message.seq)));
      }
      list.append(row);
    }
    disclosure.append(list);
    replaceKeepingFocus(root, mentions.length > 0 ? [disclosure] : []);
  }

  // preparePreviewCue names only the text actually shown in this summary: one
  // message, or a thread's root and latest message. Hidden replies are separate.
  function preparePreviewCue(summary, first, latest = first) {
    summary.dataset.previewKey = coordinate(first);
    summary.dataset.latestPreviewKey = coordinate(latest);
    updatePreviewCue(summary);
  }

  // updatePreviewCue keeps the small dot and its accessible description tied to
  // whether this summary's previews have appeared during the current visit.
  function updatePreviewCue(summary) {
    const unshown = !displayedPreviews.has(summary.dataset.previewKey)
      || !displayedPreviews.has(summary.dataset.latestPreviewKey);
    summary.classList.toggle("has-unshown-preview", unshown);
    if (unshown) {
      summary.setAttribute("aria-description", "Preview not yet shown during this visit");
    } else {
      summary.removeAttribute("aria-description");
    }
    return unshown;
  }

  // observeUnshownPreviews also runs when a background tab becomes visible:
  // observing again requests fresh intersections even if no row moved.
  function observeUnshownPreviews() {
    if (!previewObserver || document.visibilityState !== "visible") return;
    previewObserver.disconnect();
    for (const summary of previewObserver.root.querySelectorAll("summary.has-unshown-preview")) {
      previewObserver.observe(summary);
      if (summary.classList.contains("message-summary")) {
        previewObserver.observe(summary.nextElementSibling);
      }
    }
  }

  // exposePreviews settles cues when collapsed previews or expanded message
  // text enter the visible stage. Closed threads never expose hidden replies.
  function exposePreviews(changes, observer) {
    if (observer !== previewObserver || document.visibilityState !== "visible") return;
    for (const change of changes) {
      if (!change.isIntersecting || change.intersectionRect.width <= 0
        || change.intersectionRect.height <= 0) continue;
      const summary = change.target.tagName === "SUMMARY"
        ? change.target : change.target.previousElementSibling;
      if (change.target === summary && summary.classList.contains("message-summary")
        && summary.parentElement.open) continue;
      let parent = change.target === summary
        ? summary.parentElement.parentElement : change.target.parentElement;
      while (parent && (parent.tagName !== "DETAILS" || parent.open)) parent = parent.parentElement;
      if (parent) continue;
      displayedPreviews.add(summary.dataset.previewKey);
      displayedPreviews.add(summary.dataset.latestPreviewKey);
    }
    // A thread preview and an individual message can show the same text. Keep
    // their dots consistent without retaining another map of rendered rows.
    for (const summary of observer.root.querySelectorAll("summary[data-preview-key]")) {
      if (!updatePreviewCue(summary)) {
        observer.unobserve(summary);
        if (summary.classList.contains("message-summary")) observer.unobserve(summary.nextElementSibling);
      }
    }
  }

  // isVisibleAnchorRow returns true for collapsed thread rows and visible
  // message rows, skipping expanded thread containers (whose inner message rows
  // are the real reading anchors) and hidden children inside closed disclosures.
  function isVisibleAnchorRow(node, root) {
    if (node.classList.contains("thread-disclosure") && node.open) return false;
    let parent = node.parentElement;
    while (parent && parent !== root) {
      if (parent.tagName === "DETAILS" && !parent.open) return false;
      parent = parent.parentElement;
    }
    return true;
  }

  // captureScrollSnapshot records the scroll offset and visible reading rows
  // before any section in the scrollable stage replaces its DOM children.
  function captureScrollSnapshot(root, scrollEl) {
    if (!root || !scrollEl) return { oldTop: 0, hasOpenDisclosure: false, candidates: [] };
    const oldTop = scrollEl.scrollTop;
    const hasOpenDisclosure = Boolean(root.querySelector("details[open]"));
    const rootTop = scrollEl.getBoundingClientRect().top;
    const rootBottom = scrollEl.getBoundingClientRect().bottom;
    const candidates = [...root.querySelectorAll("[data-disclosure-key]")]
      .filter((node) => {
        if (!isVisibleAnchorRow(node, root)) return false;
        const rect = node.getBoundingClientRect();
        return rect.bottom >= rootTop && rect.top <= rootBottom;
      })
      .map((node) => ({
        key: node.dataset.disclosureKey,
        version: node.dataset.anchorVersion || "",
        offset: node.getBoundingClientRect().top - rootTop,
        priority: Boolean(node.open || node.classList.contains("is-selected")),
      }));
    return { oldTop, hasOpenDisclosure, candidates };
  }

  // restoreScrollSnapshot keeps the reader's visible anchor row stationary when
  // scrolled down or reading an open/selected disclosure, while staying at the
  // newest edge when at the top with no open disclosure.
  function restoreScrollSnapshot(root, scrollEl, snapshot) {
    if (!root || !scrollEl || !snapshot) return;
    if (snapshot.oldTop <= 4 && !snapshot.hasOpenDisclosure) return;
    scrollEl.scrollTop = snapshot.oldTop;
    const afterRows = [...root.querySelectorAll("[data-disclosure-key]")].filter((node) => isVisibleAnchorRow(node, root));
    const ordered = [
      ...snapshot.candidates.filter((c) => c.priority),
      ...snapshot.candidates.filter((c) => !c.priority),
    ];
    let match = null;
    for (const cand of ordered) {
      const node = afterRows.find((row) => row.dataset.disclosureKey === cand.key && (row.dataset.anchorVersion || "") === cand.version);
      if (node) { match = { cand, node }; break; }
    }
    if (!match) {
      for (const cand of ordered) {
        const node = afterRows.find((row) => row.dataset.disclosureKey === cand.key);
        if (node) { match = { cand, node }; break; }
      }
    }
    if (match) {
      scrollEl.scrollTop += match.node.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top - match.cand.offset;
    }
  }

  // revealSelectedMessage opens the selected message's disclosure (and parent
  // thread disclosure) and scrolls it into the center of the stage when
  // shouldScroll is true (on explicit navigation such as "Jump", parent-quote
  // click, or Enter).
  function revealSelectedMessage(root, state, shouldScroll) {
    if (!shouldScroll) return;
    const selected = state.selectedMessage;
    if (!selected || !root) return;
    const node = [...root.querySelectorAll("[data-message-key]")].find((item) => item.dataset.messageKey === `${selected.target}:${selected.seq}`);
    if (node) {
      node.open = true;
      const thread = node.closest(".thread-disclosure");
      if (thread) {
        thread.open = true;
        thread.classList.remove("is-selected");
      }
      const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
      node.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    }
  }

  // resetDisclosures resets the stream's disclosure state when Jump to latest
  // returns to the live head, collapsing rows unless Expand All is active.
  function resetDisclosures(root, state) {
    if (!root) return;
    if (state?.expandAllMessages) {
      delete root.dataset.expandAll;
    } else {
      for (const d of root.querySelectorAll("details[open]")) d.open = false;
    }
  }

  // renderMessages stacks newest threads and newest messages at the top of the
  // feed so the latest conversation is immediately visible below the timeline
  // without scrolling to the bottom of the page.
  function renderMessages(root, entries, targetEntries, state, actions) {
    const prevRenderedKeys = new Set([...root.querySelectorAll("details[data-disclosure-key]")].map((node) => node.dataset.disclosureKey));
    const openKeys = new Set([...root.querySelectorAll("details[open][data-disclosure-key]")].map((node) => node.dataset.disclosureKey));
    const expandAll = state.expandAllMessages === true;
    if (root.dataset.expandAll !== String(expandAll)) {
      openKeys.clear();
      prevRenderedKeys.clear();
    }
    if (expandAll) {
      for (const entry of targetEntries) {
        const msgKey = `message:${coordinate(entry)}`;
        const threadKey = `thread:${coordinate(entry)}`;
        if (!prevRenderedKeys.has(msgKey)) openKeys.add(msgKey);
        if (!prevRenderedKeys.has(threadKey)) openKeys.add(threadKey);
      }
    }

    const byTarget = new Map();
    for (const entry of targetEntries) {
      if (!byTarget.has(entry.target)) byTarget.set(entry.target, new Map());
      byTarget.get(entry.target).set(entry.message.seq, entry);
    }

    const nodes = [];
    if (entries.length === 0) {
      nodes.push(empty(targetEntries.length === 0 ? "Waiting for the first message" : "No matching messages",
        targetEntries.length === 0 ? "Messages will appear here when someone posts." : "Change the time range, search, or filters to see more."));
    } else if (state.viewMode === "threaded") {
      const groups = threadGroups(entries, byTarget).sort((a, b) => {
        const lastA = a.at(-1).message;
        const lastB = b.at(-1).message;
        return lastB.sent_at_ms - lastA.sent_at_ms || lastB.seq - lastA.seq;
      });
      for (const group of groups) {
        nodes.push(group.length === 1 ? messageDisclosure(group[0], state, actions, byTarget, openKeys) : threadDisclosure(group, state, actions, byTarget, openKeys));
      }
    } else {
      for (const entry of entries.toReversed()) {
        nodes.push(messageDisclosure(entry, state, actions, byTarget, openKeys));
      }
    }

    replaceKeepingFocus(root, nodes);
    root.dataset.expandAll = String(expandAll);
  }

  function threadGroups(entries, byTarget) {
    const parents = new Map();
    function root(key) {
      if (!parents.has(key)) parents.set(key, key);
      let cursor = key;
      while (parents.get(cursor) !== cursor) cursor = parents.get(cursor);
      let child = key;
      while (parents.get(child) !== cursor) {
        const parent = parents.get(child);
        parents.set(child, cursor);
        child = parent;
      }
      return cursor;
    }
    for (const [target, messages] of byTarget) {
      if (!target.startsWith("#")) continue;
      for (const entry of messages.values()) {
        const parent = messages.get(entry.message.reply_to);
        if (!parent) continue;
        const a = root(coordinate(entry));
        const b = root(coordinate(parent));
        if (a !== b) parents.set(a, b);
      }
    }
    const groups = new Map();
    for (const entry of entries) {
      const key = root(coordinate(entry));
      if (!groups.has(key)) {
        const list = [];
        const colon = key.indexOf(":");
        list.rootEntry = byTarget.get(colon >= 0 ? key.slice(0, colon) : entry.target)?.get(colon >= 0 ? Number(key.slice(colon + 1)) : entry.message.seq) || entry;
        groups.set(key, list);
      }
      groups.get(key).push(entry);
    }
    return [...groups.values()];
  }

  // threadDisclosure keeps the original root headline and the newest reply
  // visible in a consistent M3 list-row layout (32px avatar, primary headline,
  // supporting latest-reply line, and metadata).
  function threadDisclosure(entries, state, actions, byTarget, openKeys) {
    const first = entries.rootEntry || entries[0];
    const last = entries.at(-1);
    const key = `thread:${coordinate(first)}`;
    const rootFromHuman = isFromHumanMessage(first.message);
    const latestReplyToHuman = entries.toReversed().map((e) => humanResponseBadge(e, byTarget)).find(Boolean) || "";
    const details = element("details", `thread-disclosure${rootFromHuman ? " is-human-message" : ""}${latestReplyToHuman ? " is-human-response" : ""}`);
    details.dataset.disclosureKey = key;
    details.dataset.anchorVersion = `${entries.length}:${last.message.seq}`;
    details.open = openKeys.has(key) || entries.some((entry) => openKeys.has(`message:${coordinate(entry)}`));
    details.classList.toggle("is-selected", !details.open && entries.some((entry) => selected(entry, state)));

    const lastFromHuman = isFromHumanMessage(last.message);
    const senderColor = senderColorClass(last.message.sender, state, lastFromHuman);
    const metaRow = element("span", "message-meta",
      element("strong", `message-sender ${senderColor}`.trim(), `@${last.message.sender}`),
      ...(rootFromHuman ? [element("span", "human-pill", "User thread (", handleBadgeNode(first.message.sender, state, "", rootFromHuman, first.message.model), ")")] : []),
      ...(latestReplyToHuman ? [element("span", "human-response-pill", latestReplyToHuman)] : []),
      element("span", "message-coordinate", `Thread ${first.target}#${first.message.seq} → #${last.message.seq}`),
      element("span", "thread-count-pill", `${entries.length} messages`),
      element("time", "message-time", `${age(last.message.sent_at_ms)} ago · ${clock(last.message.sent_at_ms)}`));

    const contentCol = element("span", "row-main",
      metaRow,
      element("strong", "thread-title", formattedPreview(first.message.text)),
      element("span", "thread-latest", "Latest (", handleBadgeNode(last.message.sender, state, "", lastFromHuman, last.message.model), ` #${last.message.seq}): `, formattedPreview(last.message.text)));

    const summary = element("summary", "thread-summary", avatarNode(last.message.sender, state, last.message.model || "", lastFromHuman), contentCol);
    summary.dataset.focusKey = key;
    preparePreviewCue(summary, first, last);
    details.append(summary);
    details.addEventListener("toggle", () => {
      if (!details.open) {
        for (const child of details.querySelectorAll("details[open]")) child.open = false;
        if (entries.some((entry) => selected(entry, state))) actions.clearMessage();
        const detailsEl = document.getElementById("agent-details");
        if (detailsEl?.dataset?.returnFocusKey
          && [...details.querySelectorAll("[data-focus-key]")].some((n) => n.dataset.focusKey === detailsEl.dataset.returnFocusKey)) {
          closeAgentDrawer(detailsEl, false);
        }
      }
    });

    const body = element("div", "thread-messages");
    for (const entry of entries.toReversed()) body.append(messageDisclosure(entry, state, actions, byTarget, openKeys));
    details.append(body);
    return details;
  }

  // renderParentContext builds a clickable quoted-parent banner when a message
  // replies to a retained message in the same channel. DM reply numbers do
  // not identify the parent inbox, so those remain unlinked.
  function renderParentContext(entry, state, actions, byTarget, keyPrefix) {
    const message = entry.message;
    if (!message.reply_to) return null;
    if (entry.target.startsWith("#")) {
      const parent = byTarget?.get(entry.target)?.get(message.reply_to);
      if (parent) {
        const parentFromHuman = isFromHumanMessage(parent.message);
        const btn = element("button", "message-parent-quote",
          svgIcon("reply", "icon icon-xs"),
          element("span", "message-parent-label", "In reply to"),
          handleBadgeNode(parent.message.sender, state, "", parentFromHuman, parent.message.model),
          element("span", "message-coordinate", `#${parent.message.seq}`),
          element("span", "message-parent-excerpt", formattedPreview(parent.message.text)));
        btn.type = "button";
        btn.dataset.focusKey = `parent:${keyPrefix}`;
        btn.addEventListener("click", () => actions.revealMessage(entry.target, parent.message.seq));
        return btn;
      }
      return element("div", "message-parent-quote is-unretained",
        svgIcon("reply", "icon icon-xs"),
        `In reply to #${message.reply_to} (earlier message unavailable)`);
    }
    return element("div", "message-parent-quote is-unretained",
      svgIcon("reply", "icon icon-xs"),
      `In reply to #${message.reply_to}`);
  }

  // copyTextButton creates a compact action button that copies text to the
  // clipboard with inline confirmation or accessible failure feedback.
  function copyTextButton(text, focusKey) {
    const btn = actionButton([svgIcon("copy", "icon icon-xs"), "Copy text"], focusKey, async (ev) => {
      const target = ev.currentTarget;
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
          throw new Error("clipboard unavailable");
        }
        await navigator.clipboard.writeText(text);
        target.replaceChildren(svgIcon("check", "icon icon-xs"), "Copied");
      } catch {
        target.textContent = "Copy unavailable";
      }
      setTimeout(() => {
        if (target.isConnected) target.replaceChildren(svgIcon("copy", "icon icon-xs"), "Copy text");
      }, 2000);
    });
    btn.setAttribute("aria-live", "polite");
    return btn;
  }

  // messageDisclosure renders a single message row with a structured M3 detail
  // pane (quoted reply context, full formatted text, and Reply/Copy actions)
  // aligned to the author's content column.
  function messageDisclosure(entry, state, actions, byTarget, openKeys) {
    const message = entry.message;
    const key = coordinate(entry);
    const fromHuman = isFromHumanMessage(message);
    const toHumanBadge = humanResponseBadge(entry, byTarget);
    const details = element("details", `message-disclosure${fromHuman ? " is-human-message" : ""}${toHumanBadge ? " is-human-response" : ""}`);
    details.dataset.messageKey = key;
    details.dataset.disclosureKey = `message:${key}`;
    details.dataset.anchorVersion = `1:${message.seq}`;
    details.open = openKeys.has(`message:${key}`);
    details.classList.toggle("is-selected", selected(entry, state));

    const senderColor = senderColorClass(message.sender, state, fromHuman);
    const meta = element("span", "message-meta",
      element("strong", `message-sender ${senderColor}`.trim(), `@${message.sender}`),
      ...(fromHuman ? [element("span", "human-pill", "User")] : []),
      ...(toHumanBadge ? [element("span", "human-response-pill", toHumanBadge)] : []),
      ...(!toHumanBadge && message.reply_to > 0 ? [element("span", "message-reply-badge", `↩ #${message.reply_to}`)] : []),
      element("span", "message-coordinate", `${entry.target}#${message.seq}`),
      element("time", "message-time", `${age(message.sent_at_ms)} ago · ${clock(message.sent_at_ms)}`));

    const secondPreview = formattedPreview(message.text, 1);
    const contentCol = element("span", "row-main",
      meta,
      element("span", "message-headline", formattedPreview(message.text, 0)),
      ...(secondPreview.hasChildNodes() ? [element("span", "message-supporting", secondPreview)] : []));

    const summary = element("summary", "message-summary", avatarNode(message.sender, state, message.model || "", fromHuman), contentCol);
    summary.dataset.focusKey = `message:${key}`;
    preparePreviewCue(summary, entry);
    details.append(summary);
    details.addEventListener("toggle", () => {
      if (!details.open) {
        if (selected(entry, state)) actions.clearMessage();
        const detailsEl = document.getElementById("agent-details");
        if (detailsEl?.dataset?.returnFocusKey
          && [...details.querySelectorAll("[data-focus-key]")].some((n) => n.dataset.focusKey === detailsEl.dataset.returnFocusKey)) {
          closeAgentDrawer(detailsEl, false);
        }
      }
    });

    const detailPane = element("div", "message-detail-pane");
    const parentQuote = renderParentContext(entry, state, actions, byTarget, key);
    if (parentQuote) detailPane.append(parentQuote);
    detailPane.append(element("div", "message-body", formattedText(message.text, `msg:${key}`, actions)));

    const controls = element("div", "message-actions");
    if (entry.target.startsWith("#")) {
      controls.append(actionButton([svgIcon("reply", "icon icon-xs"), "Reply"], `reply:${key}`, () => {
        actions.setReplyTo(entry.target, message.seq, message.sender, fromHuman, message.model);
      }));
    } else {
      controls.append(actionButton(["Message ", handleBadgeNode(message.sender, state, "", fromHuman, message.model)], `dm-reply:${key}`, () => {
        actions.composeDM(message.sender);
      }));
    }
    controls.append(actionButton(["Inspect ", handleBadgeNode(message.sender, state, "", fromHuman, message.model)], `inspect:${key}`, (ev) => {
      actions.inspectAgent(message.sender, ev.currentTarget);
    }));
    controls.append(copyTextButton(message.text, `copy:${key}`));
    detailPane.append(controls);
    details.append(detailPane);
    return details;
  }

  function isFromHumanMessage(message) {
    return message?.human === true;
  }

  function humanResponseBadge(entry, byTarget) {
    const msg = entry.message;
    if (isFromHumanMessage(msg)) return "";
    if (entry.target.startsWith("#") && msg.reply_to > 0) {
      const parent = byTarget.get(entry.target)?.get(msg.reply_to);
      if (parent && isFromHumanMessage(parent.message)) {
        return `↩ Reply to @${parent.message.sender} (#${parent.message.seq})`;
      }
    }
    return "";
  }

  function avatarNode(handle, state, model = "", isHuman = false) {
    const colorClass = senderColorClass(handle, state, isHuman);
    const label = String(handle || "?").slice(0, 2);
    const node = element("span", `agent-avatar ${colorClass}`.trim());
    node.setAttribute("aria-hidden", "true");
    const identity = window.ChorusUI?.resolveIdentity ? window.ChorusUI.resolveIdentity(handle, model, isHuman) : null;
    if (identity?.model && identity.model !== "human") node.title = `@${handle} · ${identity.model}`;
    if ((identity?.iconUrl || identity?.avatarUrl) && !isHuman) {
      node.dataset.provider = identity.provider || "";
      const img = document.createElement("img");
      img.className = `agent-brand-logo provider-${identity.provider}`.trim();
      img.dataset.provider = identity.provider || "";
      img.src = identity.iconUrl || identity.avatarUrl;
      img.alt = "";
      img.addEventListener("error", () => { delete node.dataset.provider; node.textContent = label; });
      node.append(img);
    } else {
      node.textContent = label;
    }
    return node;
  }

  function handleBadgeNode(handle, state, extraClass = "", isHuman = false, model = "") {
    return window.ChorusUI?.handleBadge
      ? window.ChorusUI.handleBadge(handle, model, extraClass, isHuman)
      : element("span", extraClass, `@${handle}`);
  }

  function mentionedHandles(text) {
    const result = new Map();
    for (const match of text.matchAll(/(^|[^a-zA-Z0-9_-])@([a-zA-Z0-9][a-zA-Z0-9_-]{0,31})(?![a-zA-Z0-9_-])/g)) {
      if (!result.has(match[2].toLowerCase())) result.set(match[2].toLowerCase(), match[2]);
    }
    return [...result.values()];
  }

  // decodeEntities resolves decimal, hexadecimal, and standard case-sensitive
  // HTML5 named character references in non-code Markdown text, link URLs, and
  // link titles.
  function decodeEntities(str) {
    return String(str || "").replace(
      /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g,
      (match, dec, hex, named) => {
        if (dec !== undefined || hex !== undefined) {
          const cp = dec !== undefined ? Number.parseInt(dec, 10) : Number.parseInt(hex, 16);
          if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return "\uFFFD";
          return String.fromCodePoint(cp);
        }
        if (hasNativeEntityDecoder) {
          entityDecoder.innerHTML = match;
          const val = entityDecoder.value;
          return val === match || (named !== "semi" && val.endsWith(";")) ? match : val;
        }
        return Object.hasOwn(FALLBACK_ENTITIES, named) ? FALLBACK_ENTITIES[named] : match;
      }
    );
  }

  // lexMarkdownBlocks tokenizes text into CommonMark/GFM block and inline
  // tokens using the configured Marked lexer instance.
  function lexMarkdownBlocks(text) {
    const str = String(text || "").replace(/\r\n|\r/g, "\n");
    if (!str.trim()) return [];
    return mdEngine.lexer(str);
  }

  // formattedText renders a full message body with CommonMark/GFM blocks,
  // clickable http/https links with stable focus keys, and clickable @handle
  // mention badges.
  function formattedText(text, focusPrefix = "md", actions = null) {
    return renderMessageText(text, {
      allowLinks: true,
      focusPrefix,
      onInspect: (h, el) => (actions || window.ChorusUI?.actions)?.inspectAgent?.(h, el),
    });
  }

  // renderMessageText renders CommonMark/GFM Markdown into a DocumentFragment
  // using direct DOM construction (createElement / createTextNode) without
  // innerHTML. Raw HTML in messages stays inert text.
  function renderMessageText(text, opts = {}) {
    const allowLinks = opts.allowLinks !== false;
    const linkCtx = {
      prefix: opts.focusPrefix || "md",
      count: 0,
      onInspect: opts.onInspect || ((h, el) => window.ChorusUI?.actions?.inspectAgent?.(h, el)),
    };
    const fragment = document.createDocumentFragment();
    renderBlockTokens(fragment, lexMarkdownBlocks(text), allowLinks, linkCtx);
    return fragment;
  }

  // formattedPreview renders the lineNumber-th nonblank logical line from the
  // Markdown lexer token tree so full messages and collapsed summaries share
  // one grammar: lines inside fenced (```, ~~~, ````) or indented code blocks
  // stay literal plain text, while prose lines render inline formatting
  // (bold, italic, inline code, strikethrough, and @handle badges) without
  // nested interactive <a> links.
  function formattedPreview(text, lineNumber = 0) {
    const fragment = document.createDocumentFragment();
    const lines = [];
    collectPreviewLines(lexMarkdownBlocks(text), lines, lineNumber + 1);
    const entry = lines[lineNumber];
    if (!entry) {
      if (lineNumber === 0) {
        const fallback = String(text || "").trim();
        fragment.append(fallback || "Empty message");
      }
      return fragment;
    }
    if (entry.kind === "code") {
      fragment.append(document.createTextNode(entry.text));
    } else {
      renderInlineTokens(fragment, entry.tokens, false, null);
    }
    return fragment;
  }

  // renderBlockTokens walks CommonMark/GFM block tokens and appends DOM nodes
  // to target.
  function renderBlockTokens(target, tokens, allowLinks, linkCtx) {
    for (const tok of tokens || []) {
      if (tok.type === "space" || tok.type === "def") continue;
      switch (tok.type) {
        case "hr":
          target.append(element("hr", "md-hr"));
          break;
        case "heading": {
          const level = Math.min(4, Math.max(1, tok.depth || 1));
          const h = element("h4", `md-heading md-h${level}`);
          renderInlineTokens(h, tok.tokens || [], allowLinks, linkCtx);
          target.append(h);
          break;
        }
        case "code": {
          const codeEl = element("code", "", tok.text || "");
          if (tok.lang) codeEl.dataset.lang = tok.lang;
          target.append(element("pre", "message-code", codeEl));
          break;
        }
        case "blockquote": {
          const bq = element("blockquote", "md-quote");
          renderBlockTokens(bq, tok.tokens || [], allowLinks, linkCtx);
          target.append(bq);
          break;
        }
        case "list": {
          const listEl = element(tok.ordered ? "ol" : "ul", "md-list");
          if (tok.ordered && tok.start && tok.start !== 1) listEl.start = Number(tok.start);
          for (const item of tok.items || []) {
            listEl.append(renderListItem(item, allowLinks, linkCtx));
          }
          target.append(listEl);
          break;
        }
        case "table": {
          const wrap = element("div", "md-table-wrap");
          const table = element("table", "md-table");
          if (Array.isArray(tok.header) && tok.header.length > 0) {
            const thead = document.createElement("thead");
            const tr = document.createElement("tr");
            for (const cell of tok.header) {
              const th = document.createElement("th");
              if (cell.align) th.style.textAlign = cell.align;
              renderInlineTokens(th, cell.tokens || [], allowLinks, linkCtx);
              tr.append(th);
            }
            thead.append(tr);
            table.append(thead);
          }
          if (Array.isArray(tok.rows) && tok.rows.length > 0) {
            const tbody = document.createElement("tbody");
            for (const row of tok.rows) {
              const tr = document.createElement("tr");
              for (const cell of row) {
                const td = document.createElement("td");
                if (cell.align) td.style.textAlign = cell.align;
                renderInlineTokens(td, cell.tokens || [], allowLinks, linkCtx);
                tr.append(td);
              }
              tbody.append(tr);
            }
            table.append(tbody);
          }
          wrap.append(table);
          target.append(wrap);
          break;
        }
        case "paragraph":
        case "text":
        default: {
          const p = element("p", "md-p");
          if (Array.isArray(tok.tokens)) {
            renderInlineTokens(p, tok.tokens, allowLinks, linkCtx);
          } else {
            appendTextWithMentions(p, decodeEntities(tok.raw ?? tok.text ?? ""), allowLinks ? linkCtx : null);
          }
          target.append(p);
          break;
        }
      }
    }
  }

  // renderListItem builds a <li class="md-list-item"> from a Marked list_item
  // token, grouping tight inline text and task checkboxes into .md-li-text
  // while appending nested lists, code blocks, and loose paragraphs as blocks.
  function renderListItem(item, allowLinks, linkCtx) {
    const li = element("li", `md-list-item${item.task ? " is-task-item" : ""}`);
    let inlineSpan = null;
    for (const child of item.tokens || []) {
      if (child.type === "space" || child.type === "def") continue;
      if (child.type === "checkbox") {
        if (!inlineSpan) {
          inlineSpan = element("span", "md-li-text");
          li.append(inlineSpan);
        }
        inlineSpan.append(taskCheckboxNode(child.checked));
      } else if (child.type === "text") {
        if (!inlineSpan) {
          inlineSpan = element("span", "md-li-text");
          li.append(inlineSpan);
        } else if (inlineSpan.childNodes.length > 0 && inlineSpan.lastChild?.tagName !== "INPUT") {
          inlineSpan.append(document.createElement("br"));
        }
        if (Array.isArray(child.tokens)) {
          renderInlineTokens(inlineSpan, child.tokens, allowLinks, linkCtx);
        } else {
          appendTextWithMentions(inlineSpan, decodeEntities(child.raw ?? child.text ?? ""), allowLinks ? linkCtx : null);
        }
      } else {
        inlineSpan = null;
        renderBlockTokens(li, [child], allowLinks, linkCtx);
      }
    }
    return li;
  }

  // taskCheckboxNode creates a disabled checkbox for GFM task list items.
  function taskCheckboxNode(checked) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "md-task-check";
    input.disabled = true;
    input.checked = Boolean(checked);
    input.setAttribute("aria-label", checked ? "Completed task" : "Incomplete task");
    return input;
  }

  // renderInlineTokens walks CommonMark/GFM inline tokens and appends DOM
  // elements and text nodes to target. Non-code text, link URLs, and titles
  // decode HTML character references before URL validation and text-node creation.
  function renderInlineTokens(target, tokens, allowLinks, linkCtx) {
    for (const tok of tokens || []) {
      switch (tok.type) {
        case "codespan":
          target.append(element("code", "md-inline-code", tok.text ?? ""));
          break;
        case "strong": {
          const strong = document.createElement("strong");
          renderInlineTokens(strong, tok.tokens || [], allowLinks, linkCtx);
          target.append(strong);
          break;
        }
        case "em": {
          const em = document.createElement("em");
          renderInlineTokens(em, tok.tokens || [], allowLinks, linkCtx);
          target.append(em);
          break;
        }
        case "del": {
          const del = document.createElement("del");
          renderInlineTokens(del, tok.tokens || [], allowLinks, linkCtx);
          target.append(del);
          break;
        }
        case "br":
          target.append(document.createElement("br"));
          break;
        case "checkbox":
          target.append(taskCheckboxNode(tok.checked));
          break;
        case "escape":
          target.append(document.createTextNode(tok.text ?? ""));
          break;
        case "link": {
          const rawHref = tok.autolink ? (tok.href ?? "") : decodeEntities(tok.href ?? "");
          const href = allowLinks ? safeHttpUrl(rawHref) : "";
          if (href) {
            const idx = linkCtx ? linkCtx.count++ : 0;
            const a = element("a", "md-link");
            a.href = href;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.dataset.focusKey = `${linkCtx?.prefix || "md"}:link:${idx}`;
            if (tok.title) a.title = decodeEntities(tok.title);
            if (tok.autolink) {
              a.append(document.createTextNode(tok.text ?? href));
            } else {
              renderInlineTokens(a, tok.tokens || [], false, linkCtx);
            }
            target.append(a);
          } else if (tok.autolink) {
            target.append(document.createTextNode(tok.raw ?? tok.text ?? ""));
          } else if (Array.isArray(tok.tokens) && tok.tokens.length > 0) {
            renderInlineTokens(target, tok.tokens, false, linkCtx);
          } else {
            appendTextWithMentions(target, decodeEntities(tok.text ?? ""), allowLinks ? linkCtx : null);
          }
          break;
        }
        case "image":
          appendTextWithMentions(target, decodeEntities(tok.text || tok.raw || ""), allowLinks ? linkCtx : null);
          break;
        case "text":
        default:
          if (Array.isArray(tok.tokens) && tok.tokens.length > 0) {
            renderInlineTokens(target, tok.tokens, allowLinks, linkCtx);
          } else {
            appendTextWithMentions(target, decodeEntities(tok.raw ?? tok.text ?? ""), allowLinks ? linkCtx : null);
          }
          break;
      }
    }
  }

  // collectPreviewLines walks the block token tree and collects up to limit
  // logical preview lines, keeping fenced/indented code block lines as literal
  // code text and splitting prose inline tokens on line breaks.
  function collectPreviewLines(tokens, out, limit) {
    for (const tok of tokens || []) {
      if (out.length >= limit) return;
      switch (tok.type) {
        case "space":
        case "def":
        case "hr":
          break;
        case "code":
          for (const rawLine of String(tok.text || "").split("\n")) {
            const trimmed = rawLine.trim();
            if (!trimmed) continue;
            out.push({ kind: "code", text: trimmed });
            if (out.length >= limit) return;
          }
          break;
        case "blockquote":
          collectPreviewLines(tok.tokens || [], out, limit);
          break;
        case "list":
          for (const item of tok.items || []) {
            collectPreviewLines(item.tokens || [], out, limit);
            if (out.length >= limit) return;
          }
          break;
        case "table":
          if (Array.isArray(tok.header) && tok.header.length > 0) {
            out.push({ kind: "inline", tokens: joinTableCells(tok.header) });
            if (out.length >= limit) return;
          }
          for (const row of tok.rows || []) {
            out.push({ kind: "inline", tokens: joinTableCells(row) });
            if (out.length >= limit) return;
          }
          break;
        case "heading":
        case "paragraph":
        case "text":
        default:
          if (Array.isArray(tok.tokens)) {
            for (const lineTokens of splitInlineByLine(tok.tokens)) {
              out.push({ kind: "inline", tokens: lineTokens });
              if (out.length >= limit) return;
            }
          } else if (tok.text && tok.text.trim()) {
            out.push({ kind: "code", text: tok.text.trim() });
          }
          break;
      }
    }
  }

  // splitInlineByLine splits an array of inline tokens at { type: "br" }
  // boundaries, preserving enclosing strong/em/del/link wrappers on each line.
  function splitInlineByLine(tokens) {
    const lines = [[]];
    for (const tok of tokens || []) {
      if (tok.type === "br") {
        lines.push([]);
      } else if (tok.type === "checkbox") {
        continue;
      } else if ((tok.type === "strong" || tok.type === "em" || tok.type === "del" || tok.type === "link") && Array.isArray(tok.tokens)) {
        const subLines = splitInlineByLine(tok.tokens);
        subLines.forEach((subTokens, idx) => {
          if (idx > 0) lines.push([]);
          if (subTokens.length > 0) {
            lines.at(-1).push({ ...tok, tokens: subTokens });
          }
        });
      } else {
        lines.at(-1).push(tok);
      }
    }
    return lines.filter((line) => line.length > 0);
  }

  // joinTableCells joins table row cells with a middle-dot separator for
  // single-line collapsed previews.
  function joinTableCells(cells) {
    const out = [];
    (cells || []).forEach((cell, idx) => {
      if (idx > 0) out.push({ type: "text", raw: " · ", text: " · " });
      out.push(...(cell.tokens || []));
    });
    return out;
  }

  // safeHttpUrl returns a normalized href when rawUrl parses as http: or https:,
  // or "" for any other scheme or malformed URL.
  function safeHttpUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
    } catch {
      return "";
    }
  }

  // stripInlineMarkdown extracts plain text from the first logical line of
  // text using the Markdown lexer so collapsed pin headlines strip heading,
  // quote, list, link, emphasis, and multi-backtick code delimiters cleanly.
  function stripInlineMarkdown(text) {
    const lines = [];
    collectPreviewLines(lexMarkdownBlocks(text), lines, 1);
    if (lines.length === 0) return String(text || "").trim();
    const first = lines[0];
    return first.kind === "code" ? first.text : inlineTokensToPlainText(first.tokens).trim();
  }

  // inlineTokensToPlainText flattens inline tokens to unescaped plain text.
  function inlineTokensToPlainText(tokens) {
    let out = "";
    for (const tok of tokens || []) {
      if (tok.type === "codespan" || tok.type === "escape") {
        out += tok.text ?? "";
      } else if (tok.type === "image") {
        out += decodeEntities(tok.text ?? "");
      } else if (tok.type === "br") {
        out += " ";
      } else if (Array.isArray(tok.tokens) && tok.tokens.length > 0) {
        out += inlineTokensToPlainText(tok.tokens);
      } else if (tok.type !== "checkbox") {
        out += decodeEntities(tok.raw ?? tok.text ?? "");
      }
    }
    return out;
  }

  // appendTextWithMentions appends text with @handle badges. With linkCtx, a
  // known participant's badge becomes a button that opens its details. Each
  // button's focus key names the handle and its occurrence among every
  // @mention of that handle in this text, known or not, so a redraw after a
  // handle joins never shifts the keys of links or other mentions.
  function appendTextWithMentions(target, text, linkCtx = null) {
    const pattern = /(^|[^a-zA-Z0-9_-])@([a-zA-Z0-9][a-zA-Z0-9_-]{0,31})(?![a-zA-Z0-9_-])/g;
    let lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const prefix = match[1] || "";
      const handle = match[2];
      const matchStart = match.index + prefix.length;
      if (matchStart > lastIndex) target.append(document.createTextNode(text.slice(lastIndex, matchStart)));
      const identity = window.ChorusUI?.resolveIdentity ? window.ChorusUI.resolveIdentity(handle) : null;
      const isKnown = Boolean(identity?.iconUrl || identity?.known);
      const badge = isKnown && window.ChorusUI?.handleBadge
        ? window.ChorusUI.handleBadge(handle)
        : document.createTextNode(`@${handle}`);
      let occurrence = 0;
      if (linkCtx) {
        linkCtx.mentions ??= new Map();
        const lower = handle.toLowerCase();
        occurrence = linkCtx.mentions.get(lower) || 0;
        linkCtx.mentions.set(lower, occurrence + 1);
      }
      if (linkCtx && isKnown && handle.toLowerCase() !== "all") {
        const btn = element("button", "handle-mention-btn", badge);
        btn.type = "button";
        btn.dataset.inspectHandle = handle;
        btn.dataset.focusKey = `${linkCtx.prefix || "md"}:mention:${handle.toLowerCase()}:${occurrence}`;
        btn.setAttribute("aria-label", `Inspect @${handle}`);
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (typeof linkCtx.onInspect === "function") {
            linkCtx.onInspect(handle, ev.currentTarget);
          } else {
            window.ChorusUI?.actions?.inspectAgent?.(handle, ev.currentTarget);
          }
        });
        target.append(btn);
      } else {
        target.append(badge);
      }
      lastIndex = matchStart + 1 + handle.length;
    }
    if (lastIndex < text.length) target.append(document.createTextNode(text.slice(lastIndex)));
  }

  function headline(text) {
    return text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() || "Empty message";
  }

  function coordinate(entry) { return `${entry.target}:${entry.message.seq}`; }
  function senderColorClass(handle, state, isHuman = false) {
    return window.ChorusUI?.agentColorClass ? window.ChorusUI.agentColorClass(handle, isHuman ? "human" : "") : "";
  }
  function selected(entry, state) {
    return state.selectedMessage?.target === entry.target && state.selectedMessage.seq === entry.message.seq;
  }
  function clock(milliseconds) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(milliseconds);
  }
  function age(milliseconds) {
    const seconds = Math.max(0, Math.floor((Date.now() - milliseconds) / 1000));
    if (seconds < 60) return `${seconds}s`;
    return seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${Math.floor(seconds / 3600)}h`;
  }
  function svgIcon(name, className = "icon") {
    return window.ChorusUI?.svgIcon ? window.ChorusUI.svgIcon(name, className) : document.createElement("span");
  }
  function iconButton(iconName, label, key, action, extraClass = "") {
    const button = element("button", `icon-btn ${extraClass}`.trim(), svgIcon(iconName));
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.dataset.focusKey = key;
    button.addEventListener("click", action);
    return button;
  }
  function actionButton(label, key, action) {
    const button = element("button", "stream-action", ...(Array.isArray(label) ? label : [label]));
    button.type = "button";
    button.dataset.focusKey = key;
    button.addEventListener("click", action);
    return button;
  }
  function element(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const child of children) node.append(typeof child === "string" ? document.createTextNode(child) : child);
    return node;
  }
  function empty(title, description) {
    return element("div", "empty-state", element("h3", "", title), element("p", "", description));
  }
  function replaceKeepingFocus(root, nodes) {
    const active = document.activeElement;
    const focusKey = root && root.contains(active) ? active.dataset.focusKey : null;
    root.replaceChildren(...nodes);
    if (focusKey) [...root.querySelectorAll("[data-focus-key]")]
      .find((node) => node.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
  }
})();
