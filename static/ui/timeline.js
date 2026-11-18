// Chorus dashboard timeline.
//
// app.js owns all swarm data and calls ChorusTimeline.render(rootEl, state,
// actions) whenever state changes. This module draws one SVG from that state
// and reports what the user picks through actions; it keeps no copy of swarm
// data between renders except layout caches keyed by the view's identity.
//
// What it draws, all from fields the server returns (GET /swarms/{s}/view):
//   - an "Overview" strip of every retained message in the swarm, with a
//     draggable window that selects the time range shown below it;
//   - one lane per agent with something drawn in that range (a message, a
//     read mark, or a mention from the selected message), including senders
//     that have left, with lanes of people (declared model "human") styled
//     apart;
//   - a time axis labelled with the window's length and its start and end
//     times, on which idle stretches longer than QUIET_MS are shrunk to a
//     fixed-width "quiet" break (labelled on a row of its own) so bursts of
//     activity stay readable;
//   - for the selected channel only: the current pin (Chorus stores only the
//     current pin, so there is one landmark, placed at the pinned message
//     when it is still retained) and each member's read position;
//   - reply_to curves within the selected channel, or every channel in All Activity;
//   - highlights for messages matching the search or agent filter.
// Direct-message reply_to values are ambiguous across the two inboxes, so
// no reply curves are drawn for DMs.
//
// Viewport: the page is always live. While state.timeWindow is null the
// timeline shows the last LIVE_WINDOW_MS and moves with new messages. The
// user picks an earlier interval by dragging or clicking the overview strip,
// paging, or selecting a message outside the view; each sets
// state.timeWindow, which holds the view still (the message list applies it
// too) until "Jump to latest" (actions.jumpToLatest) returns both the
// timeline and the message list to the newest messages.
//
// Hovering: pointing at a message dot, the pin, a read mark, or a quiet
// break shows a one-line label at once (the browser's own tooltip waits
// about a second). The pointer can move onto the label to read it, and
// Escape dismisses it without moving the pointer or focus.
//
// Inspecting: clicking a message dot, the pin landmark, or a member's read
// mark selects it in place (actions.inspectMessage) and
// shows one preview card next to it; the tab, filters, and page scroll stay
// as they are. Only the card's "Show in conversation" button (or Enter)
// opens the message in the conversation. The card is rebuilt from
// state.selectedMessage on every render, so it never outlives the data it
// describes. A read-mark card names the reader it was opened for; when that
// reader's position moves, the card closes instead of describing a new spot.
// The card closes with its close button, Escape, a second click on the same
// mark, or a click on empty chart space.
//
// Keyboard: the timeline is one focusable control. Left/Right select the
// previous/next retained message (the view follows it), Home/End jump to the
// first/last, PageUp/PageDown move the view by its own duration, Enter shows
// the selected message in the conversation, and Escape closes the preview.
// Clicking the overview strip moves the view there.
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  // Idle gaps longer than this are drawn as a fixed-width quiet break.
  const QUIET_MS = 10 * 60 * 1000;
  // Axis length of one quiet break, in milliseconds of active time: a break
  // is drawn as wide as 2.5 minutes of activity, whatever its real length.
  const QUIET_UNITS = QUIET_MS / 4;
  // Default visible window when following live.
  const LIVE_WINDOW_MS = 30 * 60 * 1000;
  // Mentions are recognized exactly as the server does (chorus/wire.go
  // extractMentionedHandles): '@' not preceded by a handle character, then a
  // letter or digit, then up to 31 more letters, digits, '_' or '-'.
  const MENTION_RE = /(^|[^A-Za-z0-9_-])@([A-Za-z0-9][A-Za-z0-9_-]{0,31})(?![A-Za-z0-9_-])/g;
  // Layout constants in px.
  const OVERVIEW_H = 34;
  // The axis has three rows of text 16px apart (the measured height of a
  // rendered label), so labels never overlap at any width: the window length
  // and its edge clocks, then quiet-break labels, then the pin label just
  // above the lanes.
  const AXIS_ROW = 16;
  // Space kept between two quiet labels on their row.
  const LABEL_GAP = 6;
  const AXIS_H = AXIS_ROW * 3;
  const LANE_H = 38;
  const LABEL_W = 160;
  const PAD = 8;
  // A card that fits on neither side of its anchor goes on the side with
  // more room, shortened and scrolling, while that side has at least this
  // many pixels: a heading, a few lines, and the action row stay readable
  // and the card leaves its opener visible. With less room on both sides
  // the card uses the whole visible area instead.
  const MIN_SIDE = 200;
  // Horizontal space between the label gutter (and the right edge) and the
  // plot, so the first and last dots never touch a label or the border.
  const PLOT_PAD = 18;
  const PLOT_X0 = LABEL_W + PLOT_PAD;
  // Lane identity mark: the provider logo (or initial) drawn at this size,
  // with no circle or plate around it.
  const AVATAR = 22;
  // Dot radius, and radius of the selected dot.
  const DOT_R = 6;
  const DOT_R_SELECTED = 8;

  // Per-root swarm memory: the swarm each root last drew. When it changes, a
  // drag started on the previous swarm's chart is dropped.
  const drawnSwarm = new WeakMap();

  // Per-root drag state while the overview window is being dragged. The
  // pointer is captured on rootEl, which survives re-renders, so a drag keeps
  // working while setTimeWindow redraws the SVG on every frame.
  const drags = new WeakMap();
  // Roots whose drag listeners are installed (once per root element).
  const dragRoots = new WeakSet();
  // Per-card function that places the card again next to its point, used
  // when the scrolling message area moves under an open card.
  const cardPlacers = new WeakMap();
  // Roots whose scroll listener is installed (once per root element).
  const scrollRoots = new WeakSet();
  // Per-root last pointer position over the chart, so a hover label can be
  // shown again after a redraw replaces the mark under a still pointer.
  const pointers = new WeakMap();
  // Roots whose hover-tracking listeners are installed (once per root).
  const hoverRoots = new WeakSet();
  // Per-root hover state: the pending timer that hides the label after the
  // pointer leaves its mark, the hover key of the mark whose label is shown
  // (so a redraw can restore it on that mark even while the pointer rests on
  // the label itself), and the hover key of a mark whose label the user
  // dismissed with Escape, which stays hidden until the pointer enters
  // another mark.
  const hoverState = new WeakMap();
  // Per-mark builders of rich hover label content (see hoverable).
  const hoverBuilders = new WeakMap();
  // Popovers placed by placeAnchored and the control each is anchored to.
  // A popover is forgotten once it leaves the page.
  const anchors = new WeakMap();
  const anchored = new Set();
  // Whether the shared scroll and resize listeners for anchored popovers are
  // installed, and the function that places every open popover again (also
  // run by placePreview after the dashboard's final layout).
  let anchoredInstalled = false;
  let repositionAnchored = () => {};
  // Per-root work that must wait until the whole page has finished updating
  // after a render (placing the preview card and restoring the hover label).
  // It runs once, in the next animation frame, which comes after app.js has
  // drawn every surface and restored scroll positions but before the page is
  // painted; placePreview runs it at once when asked earlier.
  const finishers = new WeakMap();
  // Roots whose stage-resize observer is installed (once per root element).
  const resizeRoots = new WeakSet();
  // How long a hover label waits after the pointer leaves its mark before it
  // hides, so the pointer can move onto the label to read it.
  const HOVER_GRACE_MS = 150;

  /**
   * render draws the timeline into rootEl.
   * state fields read: view, selectedTarget, selectedMessage, timeWindow
   * (null while showing the latest messages), filterAgent, searchQuery.
   * selectedTarget is {kind: "channel", name: "#x"} or
   * {kind: "dm", pairKey: "a↔b", a, b} with a and b sorted.
   * selectedMessage is null or {kind: "conversation" | "message" | "read",
   * target: "#channel" | "@recipient", seq, reader?}; only read has a reader.
   * actions used: inspectMessage(target, seq, reader?) opens a chart preview,
   * revealMessage(target, seq) opens the conversation without a preview,
   * clearMessage() removes either highlight; setReplyTo(channel, seq, sender,
   * human) and composeDM(handle) for the card's Reply button;
   * setTimeWindow({startMs, endMs} | null); and jumpToLatest(), which returns
   * both the timeline and the message list to the newest messages.
   */
  function render(rootEl, state, actions) {
    const view = state && state.view;
    // Re-rendering replaces the SVG; keep keyboard focus on the timeline if
    // it had it, so arrow-key navigation survives new messages arriving.
    // Remember which control had focus (the chart or the Jump to latest
    // button) so the same one gets it back.
    const focused = document.activeElement;
    const hadFocus = rootEl.contains(focused);
    const jumpHadFocus = hadFocus && focused.classList.contains("tl-jump");
    // A focused lane handle is found again by its data-tl-lane handle.
    const laneFocus = hadFocus && focused.dataset ? focused.dataset.tlLane || "" : "";
    // A focused preview-card button is found again by its data-tl-card name.
    const cardFocus = hadFocus && focused.dataset ? focused.dataset.tlCard || "" : "";
    // A focused link inside the card's message is found again by its
    // position among the message's links; the same message always renders
    // the same links in the same order.
    const oldBody = rootEl.querySelector(".tl-card .tl-card-body");
    const linkFocus = oldBody && oldBody.contains(focused) ? [...oldBody.querySelectorAll("a[href]")].indexOf(focused) : -1;
    // How far the open card was scrolled, and which item it described, so a
    // redraw of the same card keeps showing the same part while a newly
    // picked item starts at its top.
    const oldCard = rootEl.querySelector(".tl-card");
    const cardScroll = oldCard ? oldCard.scrollTop : 0;
    const oldCardKey = oldCard ? oldCard.dataset.tlItem : "";
    clear(rootEl);
    if (!view) {
      // app.js clears the view when it switches swarms, before loading the
      // new one, or while waiting for the first swarm to appear. The old
      // chart is gone, so a drag on it ends here without applying or
      // restoring anything, and its pointer capture is released.
      const d = drags.get(rootEl);
      dropDrag(rootEl);
      if (d && rootEl.hasPointerCapture(d.pointerId)) rootEl.releasePointerCapture(d.pointerId);
      rootEl.appendChild(note(
        state.activeSwarm
          ? "Loading swarm…"
          : "No active swarm yet. Start /chorus in your coding agents to see them here."
      ));
      return;
    }
    // Record which swarm this view belongs to before anything else, so an
    // empty swarm still drops a drag started on the previous one.
    noteSwarm(rootEl, view.swarm);
    const width = Math.max(320, rootEl.clientWidth || 960);
    const sel = state.selectedTarget || null;
    const picked = state.selectedMessage || null;
    const channel = sel && sel.kind === "channel"
      ? (view.channels || []).find((c) => c.name === sel.name)
      : null;
    const isLive = !state.timeWindow;
    const events = collectEvents(view);
    if (events.length === 0) {
      const lanes = laneList(view, events, () => false, channel, null, sel, isLive);
      if (lanes.length === 0) {
        rootEl.appendChild(note("No messages yet. Agents' messages will appear here as they arrive."));
        return;
      }
      drawWaitingLanes(rootEl, view, lanes, width, laneFocus, actions);
      return;
    }

    const axis = buildAxis(events);
    const win = state.timeWindow || liveWindow(axis);
    const inWindow = (t) => t >= win.startMs && t <= win.endMs;
    const lanes = laneList(view, events, inWindow, channel, picked, sel, isLive);
    const colors = colorMap(view, events);
    const plotW = width - PLOT_X0 - PLOT_PAD;
    // A range with no activity keeps one row for its "No activity" note.
    const height = OVERVIEW_H + AXIS_H + Math.max(1, lanes.length) * LANE_H + PAD * 3;

    const svg = el("svg", {
      class: "tl",
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
      role: "application",
      tabindex: "0",
      "aria-label": `Swarm timeline, ${events.length} messages. Left and Right move between messages, Home and End jump to the first and last, Page Up and Page Down move the view, Enter opens the selected message.`,
    });

    // Scales: overview maps the whole compressed axis; the main plot maps the
    // selected window.
    const ox = (t) => PLOT_X0 + (axis.pos(t) / axis.total) * plotW;
    const w0 = axis.pos(win.startMs);
    const w1 = Math.max(w0 + 1, axis.pos(win.endMs));
    const mx = (t) => PLOT_X0 + ((axis.pos(t) - w0) / (w1 - w0)) * plotW;

    const match = (target, message) => window.ChorusUI.matchesMessage(target, message, state.filterAgent, state.searchQuery);
    const isSelected = (e) => picked != null && picked.target === e.target && picked.seq === e.seq;

    const pan = (next) => actions.setTimeWindow(next);
    // inspect selects a message, pin, or read mark in place; picking the
    // one already shown closes its preview.
    const inspect = (target, seq, reader) => {
      const same = picked != null && picked.kind !== "conversation" && picked.target === target && picked.seq === seq &&
        (picked.reader || "") === (reader || "");
      if (same) actions.clearMessage();
      else actions.inspectMessage(target, seq, reader);
    };
    installDrag(rootEl);
    installCardScroll(rootEl);
    installStageResize(rootEl);
    installHover(rootEl);
    drawOverview(svg, rootEl, events, axis, ox, win, colors, plotW, actions, pan, state);
    svg.appendChild(gutterClip(LABEL_W - PAD));
    const top = OVERVIEW_H + PAD;
    drawAxis(svg, rootEl, axis, win, w0, w1, mx, top, plotW, height);
    const laneTop = top + AXIS_H;
    const laneY = new Map();
    lanes.forEach((lane, i) => {
      const y = laneTop + i * LANE_H + LANE_H / 2;
      laneY.set(lane.handle, y);
      drawLane(svg, lane, y, width, colors, actions);
    });
    if (lanes.length === 0) {
      // Centered on the whole chart: with no lanes the label gutter is empty,
      // and the plot alone is narrower than this text on a 320px chart.
      const empty = el("text", { class: "tl-label tl-empty-range", x: (width / 2).toFixed(1), y: String(laneTop + LANE_H / 2 + 4), "text-anchor": "middle" });
      empty.textContent = "No activity in this window";
      svg.appendChild(empty);
    }

    if (channel) {
      drawPin(svg, rootEl, channel, mx, inWindow, laneTop, lanes.length, inspect);
      drawReadPositions(svg, rootEl, channel, mx, inWindow, laneY, picked, inspect);
    }

    // Channel reply numbers identify a parent in that same channel. In All
    // Activity, retain each channel's own numbering rather than joining inboxes.
    const replyChannels = channel ? [channel] : sel?.kind === "all" ? view.channels || [] : [];
    for (const source of replyChannels) drawReplies(svg, source, mx, inWindow, laneY, colors, match);

    const order = events;
    for (const e of order) {
      if (!inWindow(e.t)) continue;
      const y = laneY.get(e.sender);
      if (y == null) continue;
      const isSel = isSelected(e);
      const dim = !match(e.target, e);
      const dot = el("circle", {
        class: "tl-dot" + (isSel ? " is-selected" : "") + (dim ? " is-dim" : "") + (sel && sameTarget(sel, e) ? " is-target" : ""),
        cx: mx(e.t).toFixed(1),
        cy: String(y),
        r: String(isSel ? DOT_R_SELECTED : DOT_R),
        fill: colors.get(e.sender),
      });
      hoverable(rootEl, dot, `@${e.sender} in ${place(e)} at ${clock(e.t)}: ${firstLine(e.text, 120)}`,
        `dot ${itemKey(e.target, e.seq, "")}`, itemKey(e.target, e.seq, ""), () => {
          const meta = html("div", "tl-hover-meta");
          meta.appendChild(senderMark(e, lanes.find((l) => l.handle === e.sender)));
          if (!sel || sel.kind === "all" || !sameTarget(sel, e)) meta.appendChild(html("span", "", place(e)));
          meta.appendChild(html("span", "", clock(e.t)));
          const notes = messageNotes(e, channel, order, axis);
          if (notes.length) meta.appendChild(html("span", "", notes.join(" · ")));
          return hoverContent(meta, e.text);
        });
      dot.addEventListener("click", (ev) => {
        ev.stopPropagation();
        inspect(e.target, e.seq, "");
      });
      svg.appendChild(dot);
    }

    const chosen = order.find(isSelected);
    if (chosen && inWindow(chosen.t)) drawMentions(svg, chosen, view, mx, laneY, colors, match);

    svg.addEventListener("keydown", (ev) => onKey(ev, order, isSelected, picked, actions, axis, win, pan));
    // A click on empty plot space (below the overview strip, not on a dot or
    // mark, whose handlers stop the click) closes the preview.
    svg.addEventListener("click", (ev) => {
      if (!picked || ev.clientY - svg.getBoundingClientRect().top < OVERVIEW_H + PAD) return;
      actions.clearMessage();
    });
    rootEl.appendChild(svg);
    fitQuietLabels(svg, PLOT_X0 + plotW);

    // The preview card for the picked message or read mark.
    const found = cardAnchor(picked, order, channel, inWindow);
    let card = null;
    if (found && found.stale) {
      // The picked reader moved on: close the preview once this render ends,
      // unless something else replaced the selection first.
      queueMicrotask(() => {
        if (state.selectedMessage === picked) actions.clearMessage();
      });
    } else if (found) {
      const y = laneY.get(found.reader ? found.reader.handle : found.e.sender);
      if (y != null) {
        const lane = lanes.find((l) => l.handle === found.e.sender);
        card = buildCard(found, lane, channel, axis, sel, order, actions, svg);
        cardPlacers.set(card, () => placeCard(rootEl, svg, card, mx(found.e.t), y, width));
        // The card is added now, so focus can return to it, but stays
        // transparent until the page has finished updating and it is placed.
        card.style.opacity = "0";
        rootEl.appendChild(card);
      }
    }
    const shownCard = card;
    const sameItem = card != null && card.dataset.tlItem === oldCardKey;
    scheduleFinish(rootEl, () => {
      if (shownCard && shownCard.isConnected) {
        cardPlacers.get(shownCard)();
        if (sameItem) shownCard.scrollTop = cardScroll;
        if (shownCard.contains(document.activeElement)) revealInCard(shownCard, document.activeElement);
        shownCard.style.opacity = "";
      }
      rehover(rootEl);
    });
    // While an earlier interval is shown, one quiet button returns the whole
    // page to the latest messages; it is a real button so keyboards and
    // screen readers reach it.
    if (state.timeWindow) {
      const jump = document.createElement("button");
      jump.type = "button";
      jump.className = "tl-jump";
      jump.textContent = "Jump to latest";
      jump.addEventListener("click", () => actions.jumpToLatest());
      rootEl.appendChild(jump);
      if (jumpHadFocus) jump.focus({ preventScroll: true });
    }
    // Restoring focus must not scroll the page under the reader. A focused
    // card button, a focused link in the same card's message, or a focused
    // lane handle keeps focus when drawn again; when it is gone (the card
    // closed, or the lane left the range), focus returns to the chart.
    const sameCard = card != null && card.dataset.tlItem === oldCardKey;
    const cardTarget = !card ? null
      : cardFocus ? card.querySelector(`[data-tl-card="${cardFocus}"]`)
        : linkFocus >= 0 && sameCard ? card.querySelectorAll(".tl-card-body a[href]")[linkFocus] || null
          : null;
    const laneTarget = laneFocus
      ? [...svg.querySelectorAll("[data-tl-lane]")].find((n) => n.dataset.tlLane === laneFocus) || null
      : null;
    if (cardTarget) cardTarget.focus({ preventScroll: true });
    else if (laneTarget) laneTarget.focus({ preventScroll: true });
    else if (hadFocus && !(jumpHadFocus && state.timeWindow)) svg.focus({ preventScroll: true });
  }

  // collectEvents flattens every retained channel message and DM into one
  // list sorted by stored time, tagging each with its target ("#chan" or
  // "@recipient").
  function collectEvents(view) {
    const out = [];
    for (const ch of view.channels || []) {
      for (const m of ch.messages || []) out.push(toEvent(ch.name, m));
    }
    for (const ib of view.inboxes || []) {
      for (const m of ib.messages || []) out.push(toEvent("@" + ib.recipient, m));
    }
    out.sort((a, b) => a.t - b.t || a.seq - b.seq);
    return out;
  }

  // toEvent tags a message with where it lives: a channel name, or for a
  // direct message the recipient's inbox ("@handle") plus the conversation
  // key app.js uses to select it: the two handles exactly as registered
  // (Chorus handles are case-sensitive, so @API and @api are different
  // agents), sorted, joined by ↔.
  function toEvent(target, m) {
    const e = { target, seq: m.seq, sender: m.sender, text: m.text, t: m.sent_at_ms, replyTo: m.reply_to, human: m.human === true, model: m.model || "" };
    if (target.startsWith("@")) {
      const [a, b] = [m.sender, target.slice(1)].sort();
      e.pair = { a, b, pairKey: a + "↔" + b };
    }
    return e;
  }

  // sameTarget reports whether event e belongs to the selected view: every
  // message for "all", one channel, or one DM conversation.
  function sameTarget(sel, e) {
    if (sel.kind === "all") return true;
    return sel.kind === "channel" ? e.target === sel.name : !!e.pair && e.pair.pairKey === sel.pairKey;
  }

  // cardAnchor returns what the preview card describes: {e} for a picked
  // message, {e, reader} for a picked read mark whose reader is still at that
  // message, {stale: true} when the picked reader's position has moved or is
  // gone, or null when nothing is picked or the message is outside the view.
  function cardAnchor(picked, order, channel, inWindow) {
    if (!picked || picked.kind === "conversation") return null;
    let reader = null;
    if (picked.reader) {
      reader = channel && channel.name === picked.target
        ? (channel.positions || []).find((p) => p.handle === picked.reader && p.read_seq === picked.seq)
        : null;
      if (!reader) return { stale: true };
    }
    const e = order.find((x) => x.target === picked.target && x.seq === picked.seq);
    if (!e || !inWindow(e.t)) return null;
    return reader ? { e, reader } : { e };
  }

  // buildCard returns the preview card for found (see cardAnchor). Its
  // header shows who sent the message (the provider logo, or the handle when
  // there is no logo), where it lives when that is not the open tab, and
  // when. A note says why it matters: whose read position this is, that it
  // is pinned, whom it replies to, or the quiet break it ends. The body is
  // the whole message, formatted by the reading pane's renderer and
  // scrolling inside the card when long. Jump opens it in the conversation
  // and Respond starts a reply; Escape or the close button closes the card.
  function buildCard(found, lane, channel, axis, sel, order, actions, svg) {
    const e = found.e;
    const close = () => {
      actions.clearMessage();
      svg.focus({ preventScroll: true });
    };
    const card = html("div", "tl-card");
    // Identifies the inspected item, so a redraw can tell the same card from
    // a newly picked one.
    card.dataset.tlItem = itemKey(e.target, e.seq, found.reader ? found.reader.handle : "");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", `Message from @${e.sender} in ${place(e)} at ${clock(e.t)}`);
    card.style.touchAction = "pan-y";
    card.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      close();
    });

    const header = html("div", "tl-card-header");
    const meta = html("div", "tl-card-meta");
    meta.appendChild(senderMark(e, lane));
    if (!sel || sel.kind === "all" || !sameTarget(sel, e)) meta.appendChild(html("span", "", place(e)));
    meta.appendChild(html("span", "", clock(e.t)));
    header.appendChild(meta);
    const closeBtn = button("tl-card-close", "×", "close", close);
    closeBtn.setAttribute("aria-label", "Close preview");
    header.appendChild(closeBtn);
    card.appendChild(header);

    const notes = messageNotes(e, channel, order, axis);
    if (found.reader) {
      const p = found.reader;
      notes.unshift(`@${p.handle} · ${p.behind > 0 ? `${p.behind} behind${p.mentioned ? " · @-mentioned" : ""}` : "caught up"}`);
    }
    if (notes.length) card.appendChild(html("span", "tl-card-note", notes.join(" · ")));

    const body = html("div", "tl-card-body");
    body.appendChild(window.ChorusStream.renderMessageText(e.text, { allowLinks: true }));
    card.appendChild(body);

    const row = html("div", "tl-card-actions");
    const jump = button("", "Jump", "show", () => actions.revealMessage(e.target, e.seq));
    jump.setAttribute("aria-label", "Jump to message in conversation");
    jump.prepend(window.ChorusUI.svgIcon("jump", "icon"));
    row.appendChild(jump);
    const respond = button("", "Respond", "reply", () => {
      if (e.pair) actions.composeDM(e.sender);
      else actions.setReplyTo(e.target, e.seq, e.sender, e.human, e.model);
    });
    respond.setAttribute("aria-label", "Respond to message");
    respond.prepend(window.ChorusUI.svgIcon("reply", "icon"));
    row.appendChild(respond);
    card.appendChild(row);
    return card;
  }

  // senderMark returns who sent message e: the provider logo, titled with
  // the handle, when the sender's model has one, else the handle badge. A
  // message that saved its sender's model uses that, so it keeps its logo
  // after the sender leaves. An older message follows its own human flag:
  // the sender's current model only picks the logo for a message not sent as
  // a person, and never marks such a message as a person's when the sender
  // has since declared "human".
  function senderMark(e, lane) {
    if (e.model) return agentMark(e.sender, e.model, e.human);
    const current = lane ? lane.model : "";
    const nowHuman = current.trim().toLowerCase() === "human";
    if (!e.human && nowHuman) return html("span", "", "@" + e.sender);
    return agentMark(e.sender, e.human ? "" : current, e.human);
  }

  // agentMark returns an agent's provider logo, titled with its handle and
  // model, when its model has one, else its handle badge. An empty model
  // means the agent's current registration.
  function agentMark(handle, model, human) {
    const ui = window.ChorusUI;
    const id = ui.resolveIdentity(handle, model, human);
    if (!id.iconUrl) return ui.handleBadge(handle, model, "", human);
    const img = document.createElement("img");
    img.className = `inline-brand-logo provider-${id.provider}`;
    img.src = id.iconUrl;
    img.alt = `@${handle}`;
    img.title = `@${handle}${id.model ? " · " + id.model : ""}`;
    return img;
  }

  // hoverContent returns a hover label's content: its meta row, then the
  // start of text formatted by the reading pane's renderer, without links
  // (the label is not a place to click; the card is). The stylesheet limits
  // the text to three lines.
  function hoverContent(meta, text) {
    const frag = document.createDocumentFragment();
    frag.appendChild(meta);
    const body = html("div", "tl-hover-body");
    body.appendChild(window.ChorusStream.renderMessageText(text, { allowLinks: false }));
    frag.appendChild(body);
    return frag;
  }

  // place names where message e lives: its channel, or the two sides of a
  // direct-message conversation.
  function place(e) {
    return e.pair ? `@${e.pair.a} ↔ @${e.pair.b}` : e.target;
  }

  // messageNotes returns the short facts that make message e matter: pinned
  // in the selected channel, whom it replies to (when that message is still
  // in the view; direct-message reply numbers are ambiguous, so those say
  // only that it is a reply), and the quiet break it ends, which keyboard
  // and touch users can reach here even when the axis has no room to label
  // the break.
  function messageNotes(e, channel, order, axis) {
    const notes = [];
    if (channel && channel.name === e.target && channel.pin && channel.pin.seq === e.seq) notes.push("Pinned");
    if (e.replyTo) {
      const parent = e.pair ? null : order.find((x) => x.target === e.target && x.seq === e.replyTo);
      notes.push(parent ? `↩ Reply to @${parent.sender}` : "↩ Reply");
    }
    const quiet = axis.gaps.find((g) => g.to === e.t);
    if (quiet) notes.push(`After ${duration(quiet.to - quiet.from)} quiet`);
    return notes;
  }

  // placeCard adds card to rootEl and positions it next to the anchor at
  // (x, y) in chart coordinates, kept horizontally inside the chart. It opens
  // below the anchor, over the lanes below and the page under the chart, so
  // it hides as few other messages as possible. The space that counts is
  // the visible part of the scrolling area that holds the chart (between the
  // page header and the composer), not the browser window: the card opens
  // above when below does not fit there and above does, and otherwise uses
  // the whole visible area (see below); the card is its own (and only) scrolling
  // area, so a long message or a tight space scrolls inside the card. The
  // card always stays inside that visible area. The card floats above the
  // page, so placing it never moves layout.
  function placeCard(rootEl, svg, card, x, y, width) {
    if (!card.isConnected) rootEl.appendChild(card);
    const svgBox = svg.getBoundingClientRect();
    // The browser scales the chart to the section's width, so chart
    // coordinates are converted to the pixels actually on screen.
    const scale = svgBox.width / width;
    const ax = svgBox.left + x * scale;
    const ay = svgBox.top + y * scale;
    fitInArea(card, { left: ax, right: ax, top: ay, bottom: ay }, (DOT_R_SELECTED + 6) * scale,
      svgBox.left, svgBox.right, "center");
  }

  // fitInArea positions card (absolutely, in its offset parent) next to the
  // anchor box, given in viewport pixels, inside the visible part of the
  // scrolling message area (between the page header and the composer). It
  // opens below the anchor when it fits there, else above. When it fits on
  // neither side, it takes the side with more room, shortened to that room
  // and scrolling inside, so its opener stays visible, provided that side
  // has at least MIN_SIDE pixels. With less room on both sides it uses the
  // whole visible area, covering the anchor if it must, centred on it as far
  // as the area allows, so it is never squeezed into a thin strip. Horizontally it stays within [minX, maxX], centred on the
  // anchor or aligned with its left edge. The card always stays wholly inside
  // the visible area, even when the anchor has scrolled out of view, and it
  // keeps how far it was scrolled. The card floats above the page, so placing
  // it never moves layout.
  function fitInArea(card, box, gap, minX, maxX, align) {
    const inner = card.scrollTop;
    card.style.visibility = "hidden";
    card.style.maxHeight = "";
    const area = (document.getElementById("stage-container") || document.documentElement).getBoundingClientRect();
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    // Room counts only the visible part of the area on each side of the
    // anchor, so an anchor scrolled out of view never claims space nobody sees.
    const roomBelow = area.bottom - PAD - Math.max(box.bottom + gap, area.top + PAD);
    const roomAbove = Math.min(box.top - gap, area.bottom - PAD) - (area.top + PAD);
    const whole = area.bottom - area.top - 2 * PAD;
    const roomier = roomBelow >= roomAbove ? "below" : "above";
    const side = ch <= roomBelow ? "below" : ch <= roomAbove ? "above"
      : Math.max(roomBelow, roomAbove) >= MIN_SIDE ? roomier : "";
    const shown = side === "below" ? Math.min(ch, roomBelow)
      : side === "above" ? Math.min(ch, roomAbove)
        : Math.max(0, Math.min(ch, whole));
    if (shown < ch) {
      // max-height excludes padding and border unless the card sizes its
      // border box, so subtract them to make the drawn card exactly fit.
      const cs = getComputedStyle(card);
      const frame = cs.boxSizing === "border-box" ? 0
        : parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
          parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      card.style.maxHeight = `${Math.max(0, Math.floor(shown - frame))}px`;
    }
    const lo = Math.max(minX, area.left) + PAD;
    const hi = Math.min(maxX, area.right) - PAD;
    const preferred = align === "center" ? (box.left + box.right) / 2 - cw / 2 : box.left;
    const left = Math.max(lo, Math.min(preferred, hi - cw));
    const mid = (box.top + box.bottom) / 2;
    const wanted = side === "below" ? box.bottom + gap : side === "above" ? box.top - gap - shown : mid - shown / 2;
    const top = Math.max(area.top + PAD, Math.min(wanted, area.bottom - PAD - shown));
    // Absolute positions are measured from the offset parent's padding edge,
    // plus its own scroll when that parent is itself a scrolling area.
    const parent = card.offsetParent || document.documentElement;
    const pbox = parent.getBoundingClientRect();
    card.style.left = `${Math.round(left - pbox.left - parent.clientLeft + parent.scrollLeft)}px`;
    card.style.top = `${Math.round(top - pbox.top - parent.clientTop + parent.scrollTop)}px`;
    card.style.visibility = "";
    card.scrollTop = inner;
  }

  // placeAnchored positions card (an absolutely positioned popover, such as
  // the agent details) next to anchorEl, the control that opened it, with
  // the same rules as the timeline's preview card (see fitInArea), left
  // aligned with the anchor. It keeps the card placed while the message area
  // scrolls or changes size and after redraws replace the anchor (found again
  // by its data-tl-lane or data-focus-key), until the card leaves the page.
  // On a narrow screen (under 600px) it clears its own placement, so the
  // stylesheet can present the card as a bottom sheet instead.
  function placeAnchored(card, anchorEl) {
    anchors.set(card, anchorEl);
    trackAnchored(card);
    applyAnchored(card);
  }

  // applyAnchored places one tracked popover against its anchor's current
  // position, or clears its placement on a narrow screen.
  function applyAnchored(card) {
    if (window.matchMedia("(max-width: 599px)").matches) {
      card.style.left = card.style.top = card.style.maxHeight = "";
      return;
    }
    let anchor = anchors.get(card);
    if (!anchor.isConnected) {
      anchor = findAnchor(anchor) || anchor;
      anchors.set(card, anchor);
    }
    const area = (document.getElementById("stage-container") || document.documentElement).getBoundingClientRect();
    fitInArea(card, anchor.getBoundingClientRect(), 6, area.left, area.right, "start");
  }

  // findAnchor finds the control that replaced a removed anchor after a
  // redraw, by the stable identity both kinds of anchor carry.
  function findAnchor(old) {
    const lane = old.dataset ? old.dataset.tlLane : "";
    if (lane) return [...document.querySelectorAll("[data-tl-lane]")].find((n) => n.dataset.tlLane === lane) || null;
    const key = old.dataset ? old.dataset.focusKey : "";
    if (key) return [...document.querySelectorAll("[data-focus-key]")].find((n) => n.dataset.focusKey === key) || null;
    return null;
  }

  // trackAnchored keeps an open popover placed: it is placed again whenever
  // the message area scrolls or resizes, the window resizes, or the page
  // redraws, and forgotten once it leaves the page.
  function trackAnchored(card) {
    anchored.add(card);
    if (anchoredInstalled) return;
    anchoredInstalled = true;
    const again = () => {
      for (const c of anchored) {
        if (c.isConnected && !c.hidden) applyAnchored(c);
        else anchored.delete(c);
      }
    };
    const area = document.getElementById("stage-container");
    if (area) {
      area.addEventListener("scroll", again, { passive: true });
      if (typeof ResizeObserver === "function") new ResizeObserver(again).observe(area);
    }
    window.addEventListener("resize", again);
    repositionAnchored = again;
  }

  // fitQuietLabels sizes the quiet labels by their rendered width, left to
  // right: a label keeps its full text ("11m quiet") when it fits beside the
  // previous one and inside the plot, else shows its length alone ("11m"),
  // else shows no text. Every quiet break keeps the full text and its start
  // and end times as its hover label.
  function fitQuietLabels(svg, plotRight) {
    const labels = [...svg.querySelectorAll("text.tl-quiet-label")]
      .sort((a, b) => Number(a.getAttribute("x")) - Number(b.getAttribute("x")));
    let freeFrom = PLOT_X0;
    for (const lbl of labels) {
      const cx = Number(lbl.getAttribute("x"));
      const fits = () => {
        const half = lbl.getComputedTextLength() / 2;
        return cx - half >= freeFrom && cx + half <= plotRight;
      };
      if (!fits()) lbl.textContent = lbl.dataset.short;
      if (!fits()) {
        lbl.remove();
        continue;
      }
      freeFrom = cx + lbl.getComputedTextLength() / 2 + LABEL_GAP;
    }
  }

  // scheduleFinish records the work to run once the page has finished
  // updating after this render, replacing work from an earlier render that
  // has not run yet, and requests one animation frame for it.
  function scheduleFinish(rootEl, fn) {
    const pending = finishers.has(rootEl);
    finishers.set(rootEl, fn);
    if (!pending) requestAnimationFrame(() => runFinish(rootEl));
  }

  // runFinish runs and clears rootEl's pending finishing work, if any.
  function runFinish(rootEl) {
    const fn = finishers.get(rootEl);
    finishers.delete(rootEl);
    if (fn) fn();
  }

  // installStageResize places the open card again when the scrolling message
  // area changes size (the window is resized or the composer grows), which
  // changes the room around the card without a redraw. Installed once per
  // root.
  function installStageResize(rootEl) {
    if (resizeRoots.has(rootEl)) return;
    const area = rootEl.closest("#stage-container");
    if (!area || typeof ResizeObserver !== "function") return;
    resizeRoots.add(rootEl);
    new ResizeObserver(() => placePreview(rootEl)).observe(area);
  }

  // installCardScroll places the open card again whenever the scrolling
  // message area that holds the chart scrolls, so the card stays next to
  // its point and inside the visible area. It is installed once per root.
  function installCardScroll(rootEl) {
    if (scrollRoots.has(rootEl)) return;
    const area = rootEl.closest("#stage-container");
    if (!area) return;
    scrollRoots.add(rootEl);
    area.addEventListener("scroll", () => {
      const card = rootEl.querySelector(".tl-card");
      const place = card && cardPlacers.get(card);
      if (place) place();
    }, { passive: true });
  }

  // revealInCard scrolls only the card so that a focused control inside it
  // is fully visible; the page and the message area do not move.
  function revealInCard(card, control) {
    const view = card.getBoundingClientRect();
    const box = control.getBoundingClientRect();
    if (box.top < view.top) card.scrollTop -= view.top - box.top;
    else if (box.bottom > view.bottom) card.scrollTop += box.bottom - view.bottom;
  }

  // hoverable gives node an instant hover label with text, and the same text
  // as its accessible name. Browsers delay native SVG tooltips by about a
  // second, so the timeline draws its own label as soon as a mouse or pen
  // pointer enters the mark. key names the mark itself and stays the same
  // across redraws even when its text changes (a read mark's "3 behind"
  // becoming "4 behind"), so a label is restored or kept dismissed by mark,
  // not by wording. item names what the mark opens (see itemKey), so no
  // label covers a mark whose preview card is already open; quiet breaks
  // open nothing and pass "". build, when given, returns the label's visible
  // content (logo, place, time, and formatted text); text is then only the
  // mark's accessible name.
  function hoverable(rootEl, node, text, key, item = "", build = null) {
    node.setAttribute("aria-label", text);
    if (build) hoverBuilders.set(node, build);
    node.dataset.tlHover = text;
    node.dataset.tlHoverKey = key;
    node.dataset.tlItem = item;
    node.addEventListener("pointerenter", (ev) => {
      if (ev.pointerType === "touch") return;
      // Browsers also send pointerenter when a redraw puts a new mark under a
      // pointer that has not moved, so entering the mark whose label the user
      // dismissed keeps it dismissed; entering any other mark ends that.
      const st = hoverOf(rootEl);
      if (key === st.dismissed) return;
      st.dismissed = "";
      showHover(rootEl, node);
    });
    node.addEventListener("pointerleave", (ev) => {
      // A finger lifting off the screen also counts as leaving; a label shown
      // by a tap stays until the next tap elsewhere.
      if (ev.pointerType !== "touch") hideHoverSoon(rootEl);
    });
    // A quiet break opens no card, so on a touch screen a tap shows its
    // label instead; the next tap anywhere else hides it.
    if (!item) {
      node.addEventListener("pointerdown", (ev) => {
        if (ev.pointerType === "touch") showHover(rootEl, node);
      });
    }
  }

  // itemKey names an inspected item: its target, message number, and the
  // reader for a read mark ("" otherwise). Cards and marks share it.
  function itemKey(target, seq, reader) {
    return `${target} ${seq} ${reader}`;
  }

  // hoverOf returns rootEl's hover state, creating it on first use.
  function hoverOf(rootEl) {
    let st = hoverState.get(rootEl);
    if (!st) {
      st = { timer: 0, leaving: false, dismissed: "", shown: "" };
      hoverState.set(rootEl, st);
    }
    return st;
  }

  // installHover remembers where the pointer is over the chart, so rehover
  // can restore a hover label after a redraw, and lets Escape dismiss the
  // label without moving the pointer or focus (WCAG 1.4.13). It is installed
  // once per root.
  function installHover(rootEl) {
    if (hoverRoots.has(rootEl)) return;
    hoverRoots.add(rootEl);
    rootEl.addEventListener("pointermove", (ev) => {
      if (ev.pointerType !== "touch") pointers.set(rootEl, { x: ev.clientX, y: ev.clientY });
    });
    rootEl.addEventListener("pointerleave", (ev) => {
      // A finger lifting off counts as leaving too; a tapped label stays
      // until the next tap elsewhere.
      if (ev.pointerType === "touch") return;
      pointers.delete(rootEl);
      hideHover(rootEl);
    });
    document.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "touch" && !rootEl.contains(ev.target)) hideHover(rootEl);
    });
    rootEl.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "touch") return;
      const key = ev.target && ev.target.dataset ? ev.target.dataset.tlHoverKey || "" : "";
      if (!key.startsWith("quiet ")) hideHover(rootEl);
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      if (!rootEl.querySelector(".tl-hover")) return;
      const dismissed = hoverOf(rootEl).shown;
      hideHover(rootEl);
      hoverOf(rootEl).dismissed = dismissed;
    });
  }

  // rehover shows the hover label again when the pointer still rests on a
  // mark after a redraw replaced it (redraws happen on every live update),
  // unless the user dismissed that label.
  function rehover(rootEl) {
    const st = hoverOf(rootEl);
    // The label shown before the redraw belongs to a mark the redraw
    // replaced; show it again on that mark's replacement. This also covers a
    // pointer resting on the label, where hit-testing would find whatever
    // lies under the label instead.
    if (st.leaving) {
      // The pointer had already left the mark and its label when the redraw
      // removed them; let the label go rather than bring it back.
      hideHover(rootEl);
      return;
    }
    if (st.shown) {
      const same = [...rootEl.querySelectorAll("[data-tl-hover-key]")].find((n) => n.dataset.tlHoverKey === st.shown);
      if (same) {
        showHover(rootEl, same);
        return;
      }
    }
    const at = pointers.get(rootEl);
    if (!at) return;
    const node = document.elementFromPoint(at.x, at.y);
    if (!node || !node.dataset || !node.dataset.tlHoverKey || !rootEl.contains(node)) return;
    if (node.dataset.tlHoverKey === st.dismissed) return;
    showHover(rootEl, node);
  }

  // showHover places the single hover label above node (below it when the
  // visible message area has no room above), kept inside the chart. The
  // pointer can move onto the label and stay there to read it. A mark whose
  // preview card is already open shows no label, since the card says more.
  function showHover(rootEl, node) {
    hideHover(rootEl);
    const open = rootEl.querySelector(".tl-card");
    if (open && node.dataset.tlItem && open.dataset.tlItem === node.dataset.tlItem) return;
    hoverOf(rootEl).shown = node.dataset.tlHoverKey;
    const build = hoverBuilders.get(node);
    const label = html("div", "tl-hover", build ? null : node.dataset.tlHover);
    if (build) label.appendChild(build());
    label.setAttribute("aria-hidden", "true");
    label.style.visibility = "hidden";
    label.addEventListener("pointerenter", () => {
      const st = hoverOf(rootEl);
      clearTimeout(st.timer);
      st.leaving = false;
    });
    label.addEventListener("pointerleave", (ev) => {
      if (ev.pointerType !== "touch") hideHoverSoon(rootEl);
    });
    rootEl.appendChild(label);
    const rootBox = rootEl.getBoundingClientRect();
    const svgBox = rootEl.querySelector("svg.tl").getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const area = (rootEl.closest("#stage-container") || document.documentElement).getBoundingClientRect();
    const w = label.offsetWidth;
    const h = label.offsetHeight;
    const cx = box.left + box.width / 2;
    const left = Math.max(svgBox.left + PAD, Math.min(cx - w / 2, svgBox.right - w - PAD));
    const above = box.top - 6 - h;
    const top = above >= area.top ? above : box.bottom + 6;
    label.style.left = `${Math.round(left - rootBox.left - rootEl.clientLeft)}px`;
    label.style.top = `${Math.round(top - rootBox.top - rootEl.clientTop)}px`;
    label.style.visibility = "";
  }

  // hideHoverSoon hides the hover label after HOVER_GRACE_MS unless the
  // pointer reaches the label or another mark first.
  function hideHoverSoon(rootEl) {
    const st = hoverOf(rootEl);
    clearTimeout(st.timer);
    st.leaving = true;
    st.timer = setTimeout(() => hideHover(rootEl), HOVER_GRACE_MS);
  }

  // hideHover removes the hover label, if one is shown, and any pending
  // timer that would hide it.
  function hideHover(rootEl) {
    const st = hoverOf(rootEl);
    clearTimeout(st.timer);
    st.leaving = false;
    st.shown = "";
    const label = rootEl.querySelector(".tl-hover");
    if (label) label.remove();
  }

  // laneList returns the lanes to draw for the current range: in the live
  // view, every current participant in the selected target (each member of
  // the selected channel, the two handles of a DM tab, or every live agent in
  // the swarm for All Activity) plus any handle with activity in the range;
  // in a fixed historical window, only handles that have something drawn
  // there, namely a message in the range, a read mark in the selected channel,
  // or a mention from the selected message. Humans come first, then handles in
  // order. A sender with no current registration keeps its messages but is
  // drawn muted; the data cannot tell whether it left, expired, or
  // disconnected, so the lane makes no claim about why. The human mark
  // reflects the agent's current declared model only.
  function laneList(view, events, inWindow, channel, picked, sel, isLive) {
    const live = new Map((view.agents || []).map((a) => [a.handle, a]));
    const known = new Set([...live.keys(), ...events.map((e) => e.sender)]);
    const shown = new Set();
    for (const e of events) if (inWindow(e.t)) shown.add(e.sender);
    if (channel) {
      const bySeq = new Map((channel.messages || []).map((m) => [m.seq, m]));
      for (const p of channel.positions || []) {
        if (isLive) {
          shown.add(p.handle);
          continue;
        }
        const m = bySeq.get(p.read_seq);
        if (m && inWindow(m.sent_at_ms)) shown.add(p.handle);
      }
    } else if (isLive) {
      if (sel && sel.kind === "dm") {
        if (known.has(sel.a)) shown.add(sel.a);
        if (known.has(sel.b)) shown.add(sel.b);
      } else {
        for (const a of view.agents || []) shown.add(a.handle);
      }
    }
    const chosen = picked ? events.find((e) => e.target === picked.target && e.seq === picked.seq) : null;
    if (chosen && inWindow(chosen.t)) {
      for (const h of mentionTargets(chosen, view, known)) shown.add(h);
    }
    const lanes = [...shown].map((h) => {
      const a = live.get(h);
      return {
        handle: h,
        model: a ? a.model || "" : lastModel(events, h),
        human: !!(a && a.model === "human"),
        unregistered: !a,
      };
    });
    lanes.sort((a, b) => (b.human - a.human) || a.handle.localeCompare(b.handle));
    return lanes;
  }

  // drawWaitingLanes draws the live participant lanes before any message has
  // been sent in the swarm, so joined and watching agents are visible and
  // inspectable immediately.
  function drawWaitingLanes(rootEl, view, lanes, width, laneFocus, actions) {
    const colors = colorMap(view, []);
    const plotW = width - PLOT_X0 - PLOT_PAD;
    const laneTop = PAD + AXIS_H;
    const height = laneTop + lanes.length * LANE_H + PAD;
    const svg = el("svg", {
      class: "tl",
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
      role: "group",
      "aria-label": `Swarm participants, ${lanes.length} joined. No messages yet.`,
    });
    installStageResize(rootEl);
    svg.appendChild(gutterClip(LABEL_W - PAD));
    const headerY = PAD + AXIS_ROW - 4;
    const countLabel = el("text", { class: "tl-label", x: String(PAD), y: String(headerY) });
    countLabel.textContent = lanes.length === 1 ? "1 participant" : `${lanes.length} participants`;
    svg.appendChild(countLabel);
    const emptyLabel = el("text", { class: "tl-axis", x: String(PLOT_X0), y: String(headerY) });
    emptyLabel.textContent = plotW >= 360
      ? "No messages yet · messages will appear here as agents post"
      : "No messages yet";
    svg.appendChild(emptyLabel);
    lanes.forEach((lane, i) => {
      const y = laneTop + i * LANE_H + LANE_H / 2;
      drawLane(svg, lane, y, width, colors, actions);
    });
    rootEl.appendChild(svg);
    const laneTarget = laneFocus
      ? [...svg.querySelectorAll("[data-tl-lane]")].find((n) => n.dataset.tlLane === laneFocus) || null
      : null;
    if (laneTarget) laneTarget.focus({ preventScroll: true });
  }

  // lastModel returns the model saved on handle's most recent message, or ""
  // when none of its messages recorded one. It names a sender that is no
  // longer registered.
  function lastModel(events, handle) {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].sender === handle && events[i].model) return events[i].model;
    }
    return "";
  }

  // colorMap gives every registered agent and every retained sender a color
  // from app.js's agentColorHex, so overview ticks keep their sender's color
  // even when that sender has no lane in the current window, and colors match
  // the message list. app.js defines window.ChorusUI before it first renders.
  function colorMap(view, events) {
    const models = new Map((view.agents || []).map((a) => [a.handle, a.model || ""]));
    const handles = new Set([...models.keys(), ...events.map((e) => e.sender)]);
    return new Map([...handles].map((h) => [h, window.ChorusUI.agentColorHex(h, models.get(h) || "")]));
  }

  // buildAxis maps real time to a compressed position: time inside active
  // stretches counts fully, and each gap longer than QUIET_MS counts as
  // QUIET_UNITS. Time before the oldest retained message counts fully too
  // (negative positions), so a view longer than the retained history is
  // drawn at its true scale. pos(t) is monotonic, so ordering is kept.
  function buildAxis(events) {
    const first = events[0].t;
    const last = events[events.length - 1].t;
    const gaps = [];
    for (let i = 1; i < events.length; i++) {
      const a = events[i - 1].t;
      const b = events[i].t;
      if (b - a > QUIET_MS) gaps.push({ from: a, to: b });
    }
    function pos(t) {
      let p = t - first;
      for (const g of gaps) {
        if (t <= g.from) break;
        const covered = Math.min(t, g.to) - g.from;
        p -= covered;
        p += QUIET_UNITS * (covered / (g.to - g.from));
      }
      return p;
    }
    const total = Math.max(1, pos(last) + 60 * 1000);
    return { first, last, gaps, pos, total };
  }

  // liveWindow is the last LIVE_WINDOW_MS ending just after the newest message.
  function liveWindow(axis) {
    const endMs = axis.last + 60 * 1000;
    return { startMs: Math.max(axis.first, endMs - LIVE_WINDOW_MS), endMs };
  }

  // noteSwarm records the swarm rootEl is drawing and, when it changes,
  // drops any drag and hover label (shown or dismissed) left from the swarm
  // shown before, so neither applies to the new one.
  function noteSwarm(rootEl, swarm) {
    if (drawnSwarm.get(rootEl) === swarm) return;
    drawnSwarm.set(rootEl, swarm);
    dropDrag(rootEl);
    // Hover keys name marks within one swarm ("#room 1" exists in many), so
    // a shown or dismissed label never carries over to another swarm.
    hideHover(rootEl);
    hoverState.delete(rootEl);
  }

  // A view is a span of real time (state.timeWindow filters the message list
  // by those timestamps), so moving it never changes its duration. The
  // compressed axis only decides where things are drawn: a drag of the
  // overview moves the view's start by the dragged distance on that axis.

  // placeWindow returns a view of win's real duration starting at startMs,
  // clamped to the retained history: it never ends after the newest message
  // and never starts before the oldest one, except when the history is
  // shorter than the view (for example after old messages were trimmed),
  // where the view keeps its duration and ends at the newest message.
  function placeWindow(axis, win, startMs) {
    const dur = win.endMs - win.startMs;
    const lastEnd = axis.last + 60 * 1000;
    const start = Math.max(Math.min(axis.first, lastEnd - dur), Math.min(startMs, lastEnd - dur));
    return { startMs: start, endMs: start + dur };
  }

  // shiftWindow moves win by delta compressed-axis units, measured at its
  // start, keeping its real duration.
  function shiftWindow(axis, win, delta) {
    return placeWindow(axis, win, timeAt(axis, axis.pos(win.startMs) + delta));
  }

  // centerWindow returns a view of win's real duration centered on time t.
  function centerWindow(axis, win, t) {
    return placeWindow(axis, win, t - (win.endMs - win.startMs) / 2);
  }

  // drawOverview draws the whole-history strip and the draggable window.
  function drawOverview(svg, rootEl, events, axis, ox, win, colors, plotW, actions, pan, state) {
    const y0 = PAD;
    const strip = el("rect", { class: "tl-overview", x: String(PLOT_X0), y: String(y0), width: String(plotW), height: String(OVERVIEW_H - 8), rx: "4" });
    // Clicking the strip outside the window centers the view there.
    strip.addEventListener("click", (ev) => {
      const box = svg.getBoundingClientRect();
      const frac = (ev.clientX - box.left - PLOT_X0) / plotW;
      pan(centerWindow(axis, win, timeAt(axis, Math.min(1, Math.max(0, frac)) * axis.total)));
    });
    svg.appendChild(strip);
    for (const e of events) {
      svg.appendChild(el("line", {
        class: "tl-tick",
        x1: ox(e.t).toFixed(1), x2: ox(e.t).toFixed(1),
        y1: String(y0 + 5), y2: String(y0 + OVERVIEW_H - 13),
        stroke: colors.get(e.sender),
      }));
    }
    const label = el("text", { class: "tl-label", x: String(PAD), y: String(y0 + 17) });
    label.textContent = "Overview";
    svg.appendChild(label);

    // The window rectangle can be dragged. While it moves, the new range is
    // sent to app.js on every animation frame, so the plot and the message
    // list follow the drag live.
    // A view longer than the retained history starts before the strip; the
    // box then begins at the strip's left edge.
    const x0 = Math.max(PLOT_X0, ox(win.startMs));
    const x1 = Math.max(x0 + 6, ox(win.endMs));
    const brush = el("rect", {
      class: "tl-window",
      x: x0.toFixed(1), y: String(y0), width: (x1 - x0).toFixed(1), height: String(OVERVIEW_H - 8), rx: "4",
    });
    const t = el("title", {});
    t.textContent = "Drag, or click the strip, to look at another part of the history";
    brush.appendChild(t);
    brush.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      drags.set(rootEl, {
        pointerId: ev.pointerId,
        startX: ev.clientX,
        base: win,
        original: state.timeWindow || null,
        axis,
        plotW,
        actions,
        frame: 0,
        next: null,
      });
      // Capture after recording the drag, so pointermove and pointerup reach
      // rootEl even when the pointer leaves the timeline.
      rootEl.setPointerCapture(ev.pointerId);
    });
    svg.appendChild(brush);
  }

  // dropDrag forgets rootEl's drag, cancelling any frame update it scheduled
  // so a stale window can never be applied afterwards.
  function dropDrag(rootEl) {
    const d = drags.get(rootEl);
    if (!d) return;
    drags.delete(rootEl);
    if (d.frame) cancelAnimationFrame(d.frame);
  }

  // installDrag adds the pointer listeners for window drags to rootEl once.
  // They read the drag state stored by the brush's pointerdown.
  function installDrag(rootEl) {
    if (dragRoots.has(rootEl)) return;
    dragRoots.add(rootEl);
    // Stop the browser from scrolling or zooming while a touch drags.
    rootEl.style.touchAction = "pan-y";
    rootEl.addEventListener("pointermove", (ev) => {
      const d = drags.get(rootEl);
      if (!d || ev.pointerId !== d.pointerId) return;
      const delta = ((ev.clientX - d.startX) / d.plotW) * d.axis.total;
      d.next = shiftWindow(d.axis, d.base, delta);
      if (!d.frame) {
        d.frame = requestAnimationFrame(() => {
          d.frame = 0;
          if (drags.get(rootEl) !== d || !d.next) return;
          d.actions.setTimeWindow(d.next);
        });
      }
    });
    const end = (ev, cancelled) => {
      const d = drags.get(rootEl);
      if (!d || ev.pointerId !== d.pointerId) return;
      dropDrag(rootEl);
      if (rootEl.hasPointerCapture(ev.pointerId)) rootEl.releasePointerCapture(ev.pointerId);
      if (cancelled) {
        // An interrupted drag restores exactly the interval set before it
        // (null when the latest messages were showing).
        d.actions.setTimeWindow(d.original);
      } else if (d.next) {
        d.actions.setTimeWindow(d.next);
      }
    };
    rootEl.addEventListener("pointerup", (ev) => end(ev, false));
    rootEl.addEventListener("pointercancel", (ev) => end(ev, true));
    // Losing the capture (another element took it, or the window lost
    // focus) ends the drag the same way as a cancel. After a normal
    // pointerup the drag is already gone, so this does nothing.
    rootEl.addEventListener("lostpointercapture", (ev) => end(ev, true));
  }

  // timeAt inverts axis.pos by binary search over real time.
  function timeAt(axis, p) {
    let lo = axis.first;
    let hi = axis.last + 60 * 1000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (axis.pos(mid) < p) lo = mid;
      else hi = mid;
    }
    return Math.round(hi);
  }

  // drawAxis draws the quiet breaks and the clock labels at both window edges
  // (the view's own start and end times) on the upper line of the axis row;
  // the pin badge uses the lower line.
  // Quiet labels go on their own row; fitQuietLabels sizes them once the
  // chart is on the page and their real text widths can be measured.
  function drawAxis(svg, rootEl, axis, win, w0, w1, mx, top, plotW, height) {
    const y = top + AXIS_ROW - 4;
    const quietY = top + 2 * AXIS_ROW - 4;
    for (const g of axis.gaps) {
      if (axis.pos(g.to) < w0 || axis.pos(g.from) > w1) continue;
      const xa = mx(g.from);
      const xb = mx(g.to);
      const full = `${duration(g.to - g.from)} quiet`;
      const band = el("rect", { class: "tl-quiet", x: xa.toFixed(1), y: String(top), width: Math.max(2, xb - xa).toFixed(1), height: String(height - top - PAD) });
      hoverable(rootEl, band, `${full} · ${clock(g.from)}–${clock(g.to)}`, `quiet ${g.from}`);
      svg.appendChild(band);
      const lbl = el("text", { class: "tl-quiet-label", x: ((xa + xb) / 2).toFixed(1), y: String(quietY), "text-anchor": "middle" });
      lbl.textContent = full;
      lbl.dataset.short = duration(g.to - g.from);
      svg.appendChild(lbl);
    }
    // Clock labels at both window edges.
    const left = el("text", { class: "tl-axis", x: String(PLOT_X0), y: String(y) });
    left.textContent = clock(win.startMs);
    const right = el("text", { class: "tl-axis", x: String(PLOT_X0 + plotW), y: String(y), "text-anchor": "end" });
    right.textContent = clock(win.endMs);
    svg.appendChild(left);
    svg.appendChild(right);
    // The gutter names how much real time the plot below shows.
    const span = el("text", { class: "tl-label", x: String(PAD), y: String(y) });
    span.textContent = `${duration(win.endMs - win.startMs)} window`;
    svg.appendChild(span);
  }

  // drawLane draws a lane line and its @handle label, clipped to the label
  // gutter so a long handle never runs into the plot. Details go in the
  // label's tooltip rather than on the line, and clicking the handle or its
  // mark (or pressing Enter on the handle) opens the agent's details.
  function drawLane(svg, lane, y, width, colors, actions) {
    svg.appendChild(el("line", {
      class: "tl-lane" + (lane.human ? " is-human" : "") + (lane.unregistered ? " is-left" : ""),
      x1: String(LABEL_W), x2: String(width - PLOT_PAD), y1: String(y), y2: String(y),
    }));
    // Identity mark from app.js's shared resolver, so the lane shows the same
    // provider logo (or neutral initial) as the rest of the page, with no
    // circle around it.
    const id = window.ChorusUI.resolveIdentity(lane.handle, lane.model, lane.human);
    const cx = PAD + AVATAR / 2;
    // The lane's identity mark: its logo, or its badge disc and letters.
    const marks = [];
    if (id.iconUrl) {
      marks.push(el("image", {
        // The provider class lets one shared CSS rule size each provider's
        // mark (the OpenAI glyph fills less of its canvas than the others).
        class: "tl-avatar-icon provider-" + id.provider, href: id.iconUrl,
        x: String(cx - AVATAR / 2), y: String(y - AVATAR / 2),
        width: String(AVATAR), height: String(AVATAR),
      }));
    } else {
      // No logo (a person, or an agent without a recognized model): draw the
      // same two-letter badge the participant cards use, a soft disc in the
      // lane's color with the letters centered on the lane line.
      const color = colors.get(lane.handle);
      marks.push(el("circle", {
        class: "tl-avatar-disc", cx: String(cx), cy: String(y), r: String(AVATAR / 2),
        fill: color, "fill-opacity": "0.14",
      }));
      const initial = el("text", { class: "tl-avatar-initial", x: String(cx), y: String(y), "text-anchor": "middle" });
      initial.textContent = lane.handle.slice(0, 2).toLowerCase();
      initial.setAttribute("fill", color);
      marks.push(initial);
    }
    for (const mark of marks) svg.appendChild(mark);
    const label = el("text", {
      class: "tl-lane-label" + (lane.unregistered ? " is-left" : ""),
      x: String(PAD + AVATAR + 6), y: String(y + 4), "clip-path": "url(#tl-gutter)",
    });
    label.textContent = "@" + lane.handle;
    label.setAttribute("fill", colors.get(lane.handle));
    const title = el("title", {});
    // The exact model the agent declared on join or who, when it has one.
    title.textContent = "@" + lane.handle + (lane.model ? " · " + lane.model : "") +
      (lane.human ? " · user" : "") +
      (lane.unregistered ? " · no current registration (messages kept)" : "");
    label.appendChild(title);
    svg.appendChild(label);

    // The lane's handle and mark open that agent's details. The handle is
    // also a keyboard stop (Enter or Space), named for what it does. The
    // label is passed as the opener, so the details anchor to this lane and
    // return focus here even when a tap on the mark leaves focus elsewhere.
    const inspect = (ev) => {
      ev.stopPropagation();
      actions.inspectAgent(lane.handle, label);
    };
    for (const node of [label, ...marks]) {
      node.classList.add("tl-lane-inspect");
      node.addEventListener("click", inspect);
    }
    label.setAttribute("role", "button");
    label.setAttribute("tabindex", "0");
    // Stable across redraws: render and the details panel find the handle
    // again by it to put keyboard focus back.
    label.dataset.tlLane = lane.handle;
    label.setAttribute("aria-label", `Show details for @${lane.handle}`);
    label.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      inspect(ev);
    });
  }

  // gutterClip returns the clipPath (id tl-gutter) that keeps lane labels
  // inside the label column of the given width.
  function gutterClip(width) {
    const clip = el("clipPath", { id: "tl-gutter" });
    clip.appendChild(el("rect", { x: "0", y: "0", width: String(width), height: "100000" }));
    return clip;
  }

  // drawPin places the single current-pin landmark at the pinned message's
  // stored time when that message is still retained in the channel.
  // Clicking the line or its label inspects the pinned message.
  function drawPin(svg, rootEl, channel, mx, inWindow, laneTop, laneCount, inspect) {
    if (!channel.pin) return;
    const msg = (channel.messages || []).find((m) => m.seq === channel.pin.seq);
    if (!msg || !inWindow(msg.sent_at_ms)) return;
    const x = mx(msg.sent_at_ms).toFixed(1);
    const pick = (ev) => {
      ev.stopPropagation();
      inspect(channel.name, channel.pin.seq, "");
    };
    const pinText = `Pinned at ${clock(msg.sent_at_ms)}: ${firstLine(msg.text, 120)}`;
    const pinLabel = () => hoverContent(html("div", "tl-hover-meta", `Pinned · ${clock(msg.sent_at_ms)}`), msg.text);
    const line = el("line", { class: "tl-pin", x1: x, x2: x, y1: String(laneTop - 4), y2: String(laneTop + laneCount * LANE_H) });
    line.addEventListener("click", pick);
    hoverable(rootEl, line, pinText, `pin ${channel.name}`, itemKey(channel.name, channel.pin.seq, ""), pinLabel);
    svg.appendChild(line);
    const lbl = el("text", { class: "tl-pin-label", x: x, y: String(laneTop - 3), "text-anchor": "middle" });
    lbl.textContent = "Pin";
    lbl.addEventListener("click", pick);
    hoverable(rootEl, lbl, pinText, `pin ${channel.name}`, itemKey(channel.name, channel.pin.seq, ""), pinLabel);
    svg.appendChild(lbl);
  }

  // drawReplies draws a curve from each replied-to message to its reply,
  // using channel reply_to only (both ends in the same channel).
  function drawReplies(svg, channel, mx, inWindow, laneY, colors, match) {
    const bySeq = new Map((channel.messages || []).map((m) => [m.seq, m]));
    for (const m of channel.messages || []) {
      if (!m.reply_to) continue;
      const parent = bySeq.get(m.reply_to);
      if (!parent || !inWindow(m.sent_at_ms) || !inWindow(parent.sent_at_ms)) continue;
      const ya = laneY.get(parent.sender);
      const yb = laneY.get(m.sender);
      if (ya == null || yb == null) continue;
      const xa = mx(parent.sent_at_ms);
      const xb = mx(m.sent_at_ms);
      const bend = Math.min(40, Math.abs(xb - xa) / 2 + 10);
      svg.appendChild(el("path", {
        class: "tl-reply" + (!match(channel.name, parent) || !match(channel.name, m) ? " is-dim" : ""),
        d: `M${xa.toFixed(1)},${ya} C${xa.toFixed(1)},${(ya - bend).toFixed(1)} ${xb.toFixed(1)},${(yb - bend).toFixed(1)} ${xb.toFixed(1)},${yb}`,
        stroke: colors.get(m.sender),
      }));
    }
  }

  // drawReadPositions marks, on each member's own lane, the message that
  // member last read, sent, or joined at in this channel, when that message
  // is retained and inside the view. Positions elsewhere are not drawn; the
  // participant cards report every member's read state. Clicking a mark
  // inspects that member's position; the picked mark is drawn selected.
  function drawReadPositions(svg, rootEl, channel, mx, inWindow, laneY, picked, inspect) {
    const bySeq = new Map((channel.messages || []).map((m) => [m.seq, m]));
    for (const p of channel.positions || []) {
      const y = laneY.get(p.handle);
      const m = bySeq.get(p.read_seq);
      if (y == null || !m || !inWindow(m.sent_at_ms)) continue;
      // A short bar centered on the member's own lane line, so it cannot be
      // read as belonging to the lane above or below.
      const x = mx(m.sent_at_ms);
      const chosen = picked != null && picked.reader === p.handle && picked.target === channel.name && picked.seq === p.read_seq;
      const mark = el("rect", {
        class: "tl-read" + (p.behind > 0 ? " is-behind" : "") + (chosen ? " is-selected" : ""),
        x: (x - 1.5).toFixed(1),
        y: String(y - LANE_H / 2 + 6),
        width: "3",
        height: String(LANE_H - 12),
        rx: "1.5",
      });
      const status = p.behind > 0 ? `${p.behind} behind${p.mentioned ? " · @-mentioned" : ""}` : "caught up";
      hoverable(rootEl, mark, `@${p.handle} ${status}`, `read ${itemKey(channel.name, p.read_seq, p.handle)}`,
        itemKey(channel.name, p.read_seq, p.handle), () => {
          const meta = html("div", "tl-hover-meta");
          meta.appendChild(agentMark(p.handle, "", false));
          meta.appendChild(html("span", "", `@${p.handle} · ${status}`));
          return meta;
        });
      mark.addEventListener("click", (ev) => {
        ev.stopPropagation();
        inspect(channel.name, p.read_seq, p.handle);
      });
      svg.appendChild(mark);
    }
  }

  // drawMentions draws, for the selected message only, a dashed connector
  // from its dot to the lane of every agent it literally @-mentions. @all in
  // a channel message reaches every member of that channel, as the server
  // treats it. It shows the text's mentions, not a claim that anyone owes a
  // reply.
  function drawMentions(svg, e, view, mx, laneY, colors, match) {
    const dim = !match(e.target, e) ? " is-dim" : "";
    const x = mx(e.t).toFixed(1);
    const y0 = laneY.get(e.sender);
    for (const handle of mentionTargets(e, view, laneY.keys())) {
      const y1 = laneY.get(handle);
      svg.appendChild(el("line", { class: "tl-mention" + dim, x1: x, x2: x, y1: String(y0), y2: String(y1), stroke: colors.get(e.sender) }));
      svg.appendChild(el("circle", { class: "tl-mention-end" + dim, cx: x, cy: String(y1), r: "3", stroke: colors.get(e.sender) }));
    }
  }

  // mentionTargets returns the handles among candidates that message e
  // literally @-mentions, other than its sender. The server matches mentions
  // case-insensitively, so @api reaches both @API and @api when both exist.
  // "all" is reserved: it never matches a handle by name and expands only to
  // the members of the message's channel, as the server treats it.
  function mentionTargets(e, view, candidates) {
    const mentioned = new Set(mentionedHandles(e.text));
    const broadcast = mentioned.delete("all");
    const channel = e.pair ? null : (view.channels || []).find((c) => c.name === e.target);
    const members = new Set(broadcast && channel ? (channel.positions || []).map((p) => p.handle) : []);
    const out = [];
    for (const h of candidates) {
      if (h !== e.sender && (mentioned.has(h.toLowerCase()) || members.has(h))) out.push(h);
    }
    return out;
  }

  // mentionedHandles returns the lowercased handles @-mentioned in text, in
  // order and without repeats, matching the server's rule.
  function mentionedHandles(text) {
    const out = [];
    for (const m of String(text || "").matchAll(MENTION_RE)) {
      const h = m[2].toLowerCase();
      if (!out.includes(h)) out.push(h);
    }
    return out;
  }

  // onKey implements the keyboard contract in the file comment. order holds
  // every retained message with a lane, oldest first, so earlier history is
  // reachable; when the new selection is outside the view, the view is
  // centered on it. Moving the selection inspects in place; only Enter shows
  // the message in the conversation.
  function onKey(ev, order, isSelected, picked, actions, axis, win, pan) {
    if (ev.key === "Escape") {
      if (!picked) return;
      ev.preventDefault();
      actions.clearMessage();
      return;
    }
    if (ev.key === "PageUp" || ev.key === "PageDown") {
      ev.preventDefault();
      const dur = win.endMs - win.startMs;
      pan(placeWindow(axis, win, win.startMs + (ev.key === "PageUp" ? -dur : dur)));
      return;
    }
    if (order.length === 0) return;
    let i = order.findIndex(isSelected);
    if (ev.key === "ArrowRight") i = Math.min(order.length - 1, i + 1);
    else if (ev.key === "ArrowLeft") i = i < 0 ? order.length - 1 : Math.max(0, i - 1);
    else if (ev.key === "Home") i = 0;
    else if (ev.key === "End") i = order.length - 1;
    else if (ev.key === "Enter" && i >= 0) {
      ev.preventDefault();
      actions.revealMessage(order[i].target, order[i].seq);
      return;
    } else return;
    ev.preventDefault();
    const e = order[i];
    if (e.t < win.startMs || e.t > win.endMs) pan(centerWindow(axis, win, e.t));
    actions.inspectMessage(e.target, e.seq);
  }

  // duration writes a length of time as "45m", "2h", or "2h 15m".
  function duration(ms) {
    const min = Math.round(ms / 60000);
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    return `${h}h${min % 60 ? " " + (min % 60) + "m" : ""}`;
  }

  function clock(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function firstLine(text, max) {
    const line = String(text || "").split("\n")[0];
    return line.length > max ? line.slice(0, max - 1) + "…" : line;
  }

  // html creates an HTML element with an optional class and text.
  function html(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // button creates a card button named by data-tl-card that runs onClick.
  function button(className, text, name, onClick) {
    const b = html("button", className, text);
    b.type = "button";
    b.dataset.tlCard = name;
    b.addEventListener("click", onClick);
    return b;
  }

  function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function note(text) {
    const p = document.createElement("p");
    p.className = "tl-empty";
    p.textContent = text;
    return p;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // placePreview places the open preview card and hover label for the page
  // as it is now. A render already schedules this for the next animation
  // frame, after app.js has drawn every surface and restored scroll; app.js
  // calls placePreview directly after a change that moves the chart without
  // a render. It also places any open anchored popover (see placeAnchored)
  // again, since the final layout may have moved its anchor.
  function placePreview(rootEl) {
    repositionAnchored();
    if (finishers.has(rootEl)) {
      runFinish(rootEl);
      return;
    }
    const card = rootEl.querySelector(".tl-card");
    const place = card && cardPlacers.get(card);
    if (place) {
      place();
      if (card.contains(document.activeElement)) revealInCard(card, document.activeElement);
    }
    rehover(rootEl);
  }

  window.ChorusTimeline = {
    render,
    placePreview,
    placeAnchored,
    isDragging: (rootEl) => drags.has(rootEl),
  };
})();
