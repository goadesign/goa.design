// Chorus dashboard chat sheet. When an agent says something to the person
// using the dashboard, when the person sends a message, or when they click
// the message box at the bottom of the page, a chat rises out of that box. It
// shows what agents said to the person and what the person sent, oldest at
// the top and newest at the bottom. It stays up while they write and send,
// shows three dots under a message they just sent until an agent answers, and
// folds back into the plain message box when they click anywhere outside it
// or press Escape.
(() => {
  "use strict";

  // ALL_MENTION finds a written @all, which addresses everyone in a channel.
  const ALL_MENTION = /(^|[^A-Za-z0-9_-])@all(?![A-Za-z0-9_-])/i;

  // ROW_HEADROOM_PX is the space kept above the row the chat scrolls to; less
  // than the gap between rows, so the row before it stays out of view.
  const ROW_HEADROOM_PX = 10;

  // SHEET_GAP_PX is the space left between the timeline graph and a chat
  // raised to its full height.
  const SHEET_GAP_PX = 10;

  // MIN_SHEET_PX is the least room the chat is given on a very short window.
  const MIN_SHEET_PX = 160;

  // REDUCED_MOTION is the person's system setting asking for less motion.
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

  // open is whether the chat is raised.
  let open = false;
  // aimedFrom is the message box's "To" value from before the chat aimed it
  // at an agent, restored if the chat folds without a reply; null otherwise.
  let aimedFrom = null;
  // drawn lists, in order, the keys of the rows currently in the chat and
  // whose conversation they belong to, so a refresh adds only new rows.
  let drawn = { owner: "", keys: [] };
  // awaiting is set when the person sends from the message box: it holds whose
  // conversation that was and the exact target:seq key of the published
  // message. Once that message is present in the view (even if a background
  // long-poll delivered it before POST /mcp returned), it raises the chat and
  // keeps the waiting dots shown until an agent's message follows theirs, they
  // switch swarms or handles, or they fold the chat. null otherwise.
  let awaiting = null;
  // latest holds the arguments of the most recent render for redraws that
  // start here (opening, closing, returning to the page).
  let latest = null;

  // render is called on every dashboard refresh. It finds the person's
  // conversation in the loaded swarm, raises the chat when a message they just
  // sent arrives or when an agent has said something they have not seen,
  // remembers what they have seen, and puts the unseen count in the browser
  // tab title for when the page is hidden.
  function render(state, actions) {
    latest = { state, actions };
    const me = personHandle(state);
    const owner = `${state.activeSwarm}|${me}`;
    if (awaiting && awaiting.owner !== owner) awaiting = null;
    const entries = me ? conversation(state.view, me) : [];
    const sentArrived = Boolean(
      awaiting && entries.some((entry) => entry.mine && entryKey(entry) === awaiting.sentKey)
    );
    const newest = entries.at(-1) || null;
    if (sentArrived) open = true;
    if (sentArrived && !newest.mine) awaiting = null;
    const waitingOn = sentArrived && newest.mine ? newest : null;

    const incoming = entries.filter((entry) => !entry.mine);
    const newestIncoming = incoming.at(-1) || null;
    const newestIncomingMs = newestIncoming?.message.sent_at_ms || 0;
    const seenKey = `chorus_chat_seen:${state.activeSwarm}:${me}`;
    let seenMs = Number(localStorage.getItem(seenKey)) || 0;
    const pageVisible = document.visibilityState === "visible";

    // Raise the chat for something new, sized to what is new. It takes the
    // message box only when the person is not in the middle of writing or
    // working elsewhere.
    let firstNew = null;
    if (entries.length === 0) {
      open = false;
      aimedFrom = null;
    } else if (!open && pageVisible && newestIncomingMs > seenMs) {
      open = true;
      // With no record of an earlier visit, everything retained would count
      // as new, so start at the latest thing an agent said instead.
      firstNew = seenMs > 0 ? incoming.find((entry) => entry.message.sent_at_ms > seenMs) : newestIncoming;
      const box = document.getElementById("send-text");
      const idle = document.activeElement === document.body || document.activeElement === box;
      if (idle && box.value === "") aimComposer(newestIncoming, actions, true);
    }
    // A raised chat on a visible page has shown everything in it.
    if (open && pageVisible && newestIncomingMs > seenMs) {
      seenMs = newestIncomingMs;
      localStorage.setItem(seenKey, String(seenMs));
    }
    const unseen = incoming.filter((entry) => entry.message.sent_at_ms > seenMs).length;
    document.title = unseen > 0 ? `(${unseen}) Chorus` : "Chorus";

    const sheet = document.getElementById("chat-sheet");
    const wasOpen = sheet.classList.contains("is-open");
    sheet.classList.toggle("is-open", open);
    sheet.inert = !open;
    if (document.getElementById("mention-suggestions")?.hidden !== false) {
      document.getElementById("send-text").setAttribute("aria-expanded", String(open));
    }
    sheet.closest(".composer-card").classList.toggle("has-chat-open", open);
    if (open) fitSheet();
    const waiting = waitingOn ? waitingRow(state.view, waitingOn, me) : null;
    drawLog(document.getElementById("chat-log"), entries, owner, actions, open && !wasOpen, firstNew, waiting);
  }

  // sent is called after the message box publishes sentKey ("target:seq") as
  // agent in swarm. When that conversation is still active, it records the
  // sent message key and immediately redraws in case a background view poll
  // already delivered the message before POST /mcp returned.
  function sent(swarm, agent, sentKey) {
    if (!sentKey || !latest || latest.state.activeSwarm !== swarm) return;
    const me = personHandle(latest.state);
    if (!me || me !== agent) return;
    aimedFrom = null;
    awaiting = { owner: `${swarm}|${me}`, sentKey };
    render(latest.state, latest.actions);
  }

  // fitSheet lets the chat grow from the message box up to the bottom of the
  // timeline graph, or up to the top of the page area when the graph has
  // been scrolled out of view.
  function fitSheet() {
    const stageTop = document.getElementById("stage-container").getBoundingClientRect().top;
    const graphBottom = document.getElementById("timeline-root").getBoundingClientRect().bottom;
    const boxTop = document.querySelector(".composer-box").getBoundingClientRect().top;
    const room = boxTop - Math.max(stageTop, graphBottom) - SHEET_GAP_PX;
    document.getElementById("chat-sheet").style.setProperty("--chat-limit", `${Math.max(room, MIN_SHEET_PX)}px`);
  }

  // personHandle returns the handle in the message box's "As @" field, the
  // one the next send would use, or "" when it is empty or belongs to an
  // agent in the loaded swarm (the composer refuses to send as an agent).
  function personHandle(state) {
    const handle = document.getElementById("send-handle").value.trim().replace(/^@/, "");
    if (!handle || !state.view) return "";
    const registered = state.view.agents.find((agent) => agent.handle === handle);
    return registered && registered.model !== "human" ? "" : handle;
  }

  // conversation lists, oldest first, every retained message the person
  // sent and every retained message another participant addressed to them:
  // a direct message, a written @handle or @all mention, or a reply to a
  // message the person sent in the same channel.
  function conversation(view, me) {
    const mine = (message) => message.sender.toLowerCase() === me.toLowerCase();
    const entries = [];
    for (const channel of view.channels) {
      const ownSeqs = new Set();
      for (const message of channel.messages) {
        if (mine(message)) {
          ownSeqs.add(message.seq);
          entries.push({ target: channel.name, message, mine: true });
        } else if (ownSeqs.has(message.reply_to) || ALL_MENTION.test(message.text)
          || window.ChorusUI.matchesMessage(channel.name, message, me, "")) {
          entries.push({ target: channel.name, message, mine: false });
        }
      }
    }
    for (const inbox of view.inboxes) {
      const toMe = inbox.recipient.toLowerCase() === me.toLowerCase();
      for (const message of inbox.messages) {
        if (mine(message) || toMe) entries.push({ target: `@${inbox.recipient}`, message, mine: mine(message) });
      }
    }
    return entries.sort((a, b) => a.message.sent_at_ms - b.message.sent_at_ms || a.message.seq - b.message.seq);
  }

  // setOpen raises or folds the chat on the person's request and redraws.
  // Raising it shows the whole conversation and leaves the message box's
  // destination alone. Folding it keeps keyboard focus on the page and, when
  // a chat that rose for a new message had aimed the box and nothing was
  // written, puts the box's destination back.
  function setOpen(next) {
    const box = document.getElementById("send-text");
    if (!next && document.getElementById("chat-sheet").contains(document.activeElement)) box.focus();
    open = next;
    if (!latest) return;
    if (!open && aimedFrom !== null && box.value === "") {
      document.getElementById("send-target").value = aimedFrom;
      document.getElementById("pin-toggle-label")?.classList.toggle("disabled", !aimedFrom.startsWith("#"));
      latest.actions.clearReply();
      window.ChorusMention?.refresh();
    }
    if (!open) aimedFrom = null;
    if (!open) awaiting = null;
    render(latest.state, latest.actions);
  }

  // aimComposer points the message box at entry and focuses it: a reply in
  // the same channel, or a direct message back to the sender. When the chat
  // does this unasked (restorable), it remembers the previous destination.
  function aimComposer(entry, actions, restorable = false) {
    const message = entry.message;
    if (restorable && aimedFrom === null) aimedFrom = document.getElementById("send-target").value;
    if (!restorable) aimedFrom = null;
    if (entry.target.startsWith("#")) {
      actions.setReplyTo(entry.target, message.seq, message.sender, message.human === true, message.model || "");
    } else {
      actions.composeDM(message.sender);
    }
  }

  // drawLog brings the chat rows up to date with entries. When the rows on
  // screen are still the start of the same conversation it only adds the new
  // ones, so screen readers announce just those, and keyboard focus, text
  // selection, and scroll position survive; rows that arrive while the chat
  // is raised ease in. Otherwise it rebuilds the list.
  //
  // A chat raised for new messages (firstNew is the oldest of them) is only
  // as tall as those messages, up to the sheet's limit, with earlier ones a
  // scroll away. One the person raised shows as much history as fits, ending
  // at the newest message. When another row arrives, a short chat grows to
  // take it in and glides to it: to its first line when an agent said it,
  // so a long message is read from the start, and to the end when the person
  // said it.
  //
  // waiting, when given, is the row of dots shown last, under the message
  // the person is waiting on. It is not a message, so it is replaced on every
  // call and never counted among the drawn rows.
  function drawLog(log, entries, owner, actions, justOpened, firstNew, waiting) {
    const previousWaiting = log.querySelector(".chat-waiting");
    previousWaiting?.remove();
    const keys = entries.map(entryKey);
    const continues = owner === drawn.owner && drawn.keys.every((key, index) => keys[index] === key);
    const added = continues ? entries.slice(drawn.keys.length) : entries;
    const rows = added.map((entry) => {
      const row = entry.mine ? ownRow(entry) : incomingRow(entry, actions);
      row.dataset.key = entryKey(entry);
      row.classList.toggle("is-arriving", continues && open && !justOpened);
      return row;
    });
    if (continues) log.append(...rows);
    else log.replaceChildren(...rows);
    drawn = { owner, keys };
    if (waiting) log.append(waiting);
    const waitingAppeared = Boolean(waiting) && !previousWaiting;

    if (justOpened) {
      // The sheet itself is sliding up, so the list is placed, not scrolled.
      log.style.height = "";
      const first = firstNew && [...log.children].find((row) => row.dataset.key === entryKey(firstNew));
      if (first) {
        log.style.height = `${log.scrollHeight - first.offsetTop + ROW_HEADROOM_PX}px`;
        log.scrollTop = first.offsetTop - ROW_HEADROOM_PX;
      } else {
        log.scrollTop = log.scrollHeight;
      }
    } else if (added.length > 0 || waitingAppeared) {
      if (log.style.height) log.style.height = `${log.scrollHeight - log.scrollTop}px`;
      const newest = log.lastElementChild;
      const readFromStart = !newest.matches(".is-mine, .chat-waiting");
      log.scrollTo({
        top: readFromStart ? newest.offsetTop - ROW_HEADROOM_PX : log.scrollHeight,
        behavior: REDUCED_MOTION.matches ? "auto" : "smooth",
      });
    }
  }

  // entryKey identifies a message by where it was sent and its number there.
  function entryKey(entry) {
    return `${entry.target}:${entry.message.seq}`;
  }

  // incomingRow shows who spoke, where, and what they said, with one action:
  // answer it.
  function incomingRow(entry, actions) {
    const { el, handleBadge } = window.ChorusUI;
    const message = entry.message;
    return el("article", { className: "chat-row", title: sentAt(message) },
      el("header", { className: "chat-meta" },
        handleBadge(message.sender, message.model || "", "chat-sender", message.human === true),
        entry.target.startsWith("#") && el("span", {}, `in ${entry.target}`),
        el("button", { type: "button", className: "chat-reply", onClick: () => aimComposer(entry, actions) }, "Reply")),
      bubble(message));
  }

  // ownRow shows one of the person's messages and where they sent it.
  function ownRow(entry) {
    const { el, handleBadge } = window.ChorusUI;
    const to = entry.target.startsWith("#") ? entry.target : handleBadge(entry.target.slice(1));
    return el("article", { className: "chat-row is-mine", title: sentAt(entry.message) },
      el("header", { className: "chat-meta" }, "You to ", to),
      bubble(entry.message));
  }

  // waitingRow builds the row of three dots shown under entry, the message
  // the person just sent. The dots are still until an agent expected to
  // answer has read the message, then they pulse.
  //
  // The agents expected to answer are the recipient of a direct message, or
  // in a channel the author of the message it replies to and the members it
  // mentions. When exactly one is expected, the row names it. A channel
  // message that names nobody can be answered by any member.
  function waitingRow(view, entry, me) {
    const { el, handleBadge, matchesMessage } = window.ChorusUI;
    const message = entry.message;
    const notMe = (handle) => handle.toLowerCase() !== me.toLowerCase();
    let expected = [];
    let read = false;
    if (entry.target.startsWith("@")) {
      expected = [entry.target.slice(1)];
      read = view.inboxes.some((inbox) => `@${inbox.recipient}` === entry.target && inbox.read_seq >= message.seq);
    } else {
      const channel = view.channels.find((candidate) => candidate.name === entry.target);
      const members = channel.positions.filter((position) => notMe(position.handle));
      const parent = channel.messages.find((candidate) => candidate.seq === message.reply_to);
      const named = members.filter((position) => position.handle === parent?.sender
        || matchesMessage(entry.target, message, position.handle, ""));
      expected = named.map((position) => position.handle);
      read = (named.length > 0 ? named : members).some((position) => position.read_seq >= message.seq);
    }
    const who = expected.length === 1 ? `@${expected[0]}` : "an agent";
    return el("div", {
      className: `chat-row chat-waiting${read ? " is-read" : ""}`,
      role: "img",
      "aria-label": read ? `${who} has read your message; waiting for the reply` : `Waiting for ${who} to read your message`,
      title: read ? `${who} has read your message` : `${who} has not read your message yet`,
    },
      expected.length === 1 && el("div", { className: "chat-meta" }, handleBadge(expected[0], "", "chat-sender")),
      el("div", { className: "chat-bubble chat-dots" },
        el("span", { className: "chat-dot" }), el("span", { className: "chat-dot" }), el("span", { className: "chat-dot" })));
  }

  // bubble renders the full message text with the dashboard's Markdown
  // renderer, so chat text looks the same as it does in the message stream.
  function bubble(message) {
    const body = window.ChorusUI.el("div", { className: "message-body" });
    body.append(window.ChorusStream.renderMessageText(message.text, { allowLinks: true }));
    return window.ChorusUI.el("div", { className: "chat-bubble" }, body);
  }

  // sentAt formats when message was sent, for the row's tooltip.
  function sentAt(message) {
    return new Date(message.sent_at_ms).toLocaleString();
  }

  // The person raises the chat by clicking the message box, or by pressing
  // the Up arrow in it while it is empty. They fold it with Escape, or with
  // one click anywhere that is not a message in the chat or the message box:
  // the rest of the page, and also the blank space around the messages. The
  // click is read before the page's own controls can swallow it. Dragging
  // the chat's scrollbar is not such a click.
  const messageBox = document.getElementById("send-text");
  const composerCard = document.querySelector(".composer-card");
  messageBox.addEventListener("click", () => {
    if (!open) setOpen(true);
  });
  messageBox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" && messageBox.value === "" && !open) setOpen(true);
  });
  composerCard.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.isComposing && open) setOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!open || !(event.target instanceof Element)) return;
    if (event.target.closest(".chat-row, .composer-box")) return;
    const log = document.getElementById("chat-log");
    if (event.target === log && event.offsetX >= log.clientWidth) return;
    setOpen(false);
  }, true);
  // The chat follows the handle in the "As @" field as the person edits it.
  document.getElementById("send-handle").addEventListener("input", () => {
    if (latest) render(latest.state, latest.actions);
  });
  window.addEventListener("resize", () => {
    if (open) fitSheet();
  });
  // Coming back to a hidden page raises the chat for what arrived meanwhile.
  document.addEventListener("visibilitychange", () => {
    if (latest && document.visibilityState === "visible") render(latest.state, latest.actions);
  });

  window.ChorusChat = Object.freeze({ render, sent });
})();
