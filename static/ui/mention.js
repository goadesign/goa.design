// Chorus dashboard mention suggestions. While the person types an @ and the
// start of a handle in the message box, a list of the swarm's participants
// whose handle contains what they typed opens above the box. Up and Down
// move through the list, Enter or Tab (or a click) writes the chosen handle
// into the message, and Escape closes the list.
(() => {
  "use strict";

  // MENTION_BEFORE_CARET finds, in the text before the caret, an @ that
  // starts a mention and up to 32 valid handle characters typed after it
  // (starting with a letter or digit when non-empty, matching the server). An
  // @ in the middle of a word, as in an email address, does not start one.
  const MENTION_BEFORE_CARET = /(?:^|[^A-Za-z0-9_-])@(|[A-Za-z0-9][A-Za-z0-9_-]{0,31})$/;

  // HANDLE_CHAR_AFTER_CARET matches when the caret sits before another handle
  // character, meaning it is inside an existing word or handle rather than at
  // the end of the mention being typed.
  const HANDLE_CHAR_AFTER_CARET = /^[A-Za-z0-9_-]/;

  const messageBox = document.getElementById("send-text");
  const list = document.getElementById("mention-suggestions");
  const status = document.getElementById("mention-status");
  const chatSheet = document.getElementById("chat-sheet");

  // shown is null while the list is closed. Open, it holds where the @ sits
  // in the message, the handles listed, and the index of the highlighted one.
  let shown = null;
  // dismissed records the @ offset and preceding text of a mention closed
  // with Escape so the list stays closed while the person finishes typing
  // that handle; null otherwise.
  let dismissed = null;
  // lastInputState records the message box's value and caret range last
  // processed from an input/caret event so keyup after input or Arrow keys
  // does not rebuild the list a second time.
  let lastInputState = "";
  // renderedSignature records the rows currently in list so passive swarm
  // polls (such as 15-second presence heartbeats) do not detach option nodes
  // mid-click or reset the list's scroll position when nothing visible changed.
  let renderedSignature = "";

  // refresh opens, updates, or closes the list to match the text before the
  // caret and the currently loaded swarm. When force is true (swarm poll or
  // target change), it re-evaluates even when the message text did not change.
  function refresh(force = false) {
    if (document.activeElement !== messageBox) {
      lastInputState = "";
      close();
      return;
    }
    const nextState = currentInputState();
    const inputChanged = nextState !== lastInputState;
    if (!force && !inputChanged) return;
    lastInputState = nextState;

    const caret = messageBox.selectionStart;
    const after = messageBox.value.slice(caret);
    const found = messageBox.selectionEnd === caret && !HANDLE_CHAR_AFTER_CARET.test(after)
      ? MENTION_BEFORE_CARET.exec(messageBox.value.slice(0, caret))
      : null;
    const start = found ? caret - found[1].length - 1 : -1;
    const before = start >= 0 ? messageBox.value.slice(0, start + 1) : "";
    if (!dismissed || dismissed.start !== start || dismissed.before !== before) {
      dismissed = null;
    }
    const handles = found && !dismissed ? matching(found[1]) : [];
    if (handles.length === 0) {
      close();
      return;
    }
    const wasOpen = Boolean(shown);
    const previousHandle = shown ? shown.handles[shown.active] : "";
    const kept = shown ? handles.indexOf(previousHandle) : -1;
    shown = { start, handles, active: Math.max(kept, 0) };
    draw(!wasOpen || inputChanged || shown.handles[shown.active] !== previousHandle);
  }

  // matching lists the swarm handles that contain typed, ignoring case:
  // handles that start with typed come first, participants reached by the
  // current target (channel members for #channel, or the exact recipient for
  // @agent) precede other handles within each group, and ties sort
  // alphabetically. The person's own handle is left out, "all" is reserved for
  // the channel-wide mention (placed last on bare @, and at the end of the
  // prefix group when typed starts "all"), and an unloaded swarm offers
  // nothing.
  function matching(typed) {
    const view = window.ChorusUI?.state.view;
    if (!view) return [];
    const wanted = typed.toLowerCase();
    const me = document.getElementById("send-handle").value.trim().replace(/^@/, "").toLowerCase();
    const target = document.getElementById("send-target").value.trim();
    const position = (handle) => handle.toLowerCase().indexOf(wanted);
    const handles = (view.agents || [])
      .filter((agent) => {
        const lower = agent.handle.toLowerCase();
        return lower !== me && lower !== "all" && position(agent.handle) >= 0;
      })
      .sort((a, b) => (position(a.handle) > 0) - (position(b.handle) > 0)
        || (!reachesTarget(a, target) - !reachesTarget(b, target))
        || a.handle.localeCompare(b.handle))
      .map((agent) => agent.handle);
    if (target.startsWith("#") && position("all") >= 0) {
      if (wanted !== "" && position("all") === 0) {
        const firstSubstring = handles.findIndex((handle) => position(handle) > 0);
        if (firstSubstring >= 0) handles.splice(firstSubstring, 0, "all");
        else handles.push("all");
      } else {
        handles.push("all");
      }
    }
    return handles;
  }

  // reachesTarget reports whether a message sent to target reaches agent: a
  // channel message reaches subscribed members of that channel, and a direct
  // message reaches only its exact @recipient (server DM streams are
  // case-sensitive).
  function reachesTarget(agent, target) {
    if (target.startsWith("#")) return (agent.channels || []).includes(target);
    if (target.startsWith("@")) return agent.handle === target.slice(1);
    return true;
  }

  // suggestionNote describes what choosing agent (or null for @all) means for
  // target: any wake/visibility warning ("not in #channel" or "only @recipient
  // sees this") comes first so long model ARNs never clip it, followed by the
  // declared model.
  function suggestionNote(agent, target) {
    if (!agent) return "everyone in the channel";
    const warning = reachesTarget(agent, target)
      ? ""
      : (target.startsWith("#") ? `not in ${target}` : `only ${target} sees this`);
    return [warning, agent.model || ""].filter(Boolean).join(" · ");
  }

  // draw updates the listbox rows when they changed, highlights the active
  // row, and points the message box's ARIA popup attributes at the listbox.
  function draw(revealActive) {
    const { el, handleBadge, state } = window.ChorusUI;
    const agents = state.view?.agents || [];
    const target = document.getElementById("send-target").value.trim();
    const specs = shown.handles.map((handle) => {
      const agent = handle === "all" ? null : agents.find((a) => a.handle === handle);
      return { handle, model: agent?.model || "", agent, note: suggestionNote(agent, target) };
    });
    const nextSignature = specs.map((s) => `${s.handle}\0${s.model}\0${s.note}`).join("\n");
    if (list.hidden || nextSignature !== renderedSignature) {
      renderedSignature = nextSignature;
      list.replaceChildren(...specs.map((spec, index) => el("li", {
        id: `mention-suggestion-${index}`,
        className: "mention-suggestion",
        role: "option",
        "aria-selected": String(index === shown.active),
        dataset: { handle: spec.handle },
      },
      spec.agent ? handleBadge(spec.handle, spec.model) : `@${spec.handle}`,
      ...(spec.note ? [" ", el("span", { className: "mention-suggestion-note" }, spec.note)] : []))));
    }
    list.hidden = false;
    messageBox.setAttribute("aria-autocomplete", "list");
    messageBox.setAttribute("aria-controls", "mention-suggestions");
    messageBox.setAttribute("aria-expanded", "true");
    messageBox.setAttribute("aria-keyshortcuts", "ArrowDown ArrowUp Enter Tab Escape");
    highlight(revealActive);
  }

  // highlight marks only the active option row as selected and, when
  // revealActive is true, scrolls it into view and announces it to assistive
  // technology without changing <textarea>'s native textbox role.
  function highlight(revealActive) {
    for (let i = 0; i < list.children.length; i++) {
      list.children[i].setAttribute("aria-selected", String(i === shown.active));
    }
    if (revealActive) {
      const row = list.children[shown.active];
      row.scrollIntoView({ block: "nearest" });
      if (status) {
        status.textContent = `${row.textContent} (${shown.active + 1} of ${shown.handles.length})`;
      }
    }
  }

  // close hides the list, clears the live announcement, and restores the
  // message box's ARIA attributes to describe the chat sheet.
  function close() {
    if (!shown) return;
    shown = null;
    renderedSignature = "";
    list.hidden = true;
    list.replaceChildren();
    if (status) status.textContent = "";
    messageBox.removeAttribute("aria-autocomplete");
    messageBox.setAttribute("aria-controls", "chat-sheet");
    messageBox.setAttribute("aria-expanded", String(!chatSheet.inert));
    messageBox.setAttribute("aria-keyshortcuts", "ArrowUp Escape");
  }

  // pick replaces the @ and the letters typed after it with @handle, followed
  // by a space (stepping over an existing space after the caret when present),
  // and closes the list.
  function pick(handle) {
    const caret = messageBox.selectionStart;
    const hasSpace = messageBox.value[caret] === " ";
    const inserted = `@${handle}${hasSpace ? "" : " "}`;
    messageBox.setRangeText(inserted, shown.start, caret, "end");
    if (hasSpace) {
      const afterSpace = shown.start + inserted.length + 1;
      messageBox.selectionStart = afterSpace;
      messageBox.selectionEnd = afterSpace;
    }
    lastInputState = currentInputState();
    close();
  }

  // currentInputState encodes the message box's text and caret range.
  function currentInputState() {
    return `${messageBox.value}\0${messageBox.selectionStart}\0${messageBox.selectionEnd}`;
  }

  messageBox.addEventListener("input", () => refresh());
  messageBox.addEventListener("focus", () => refresh(true));
  messageBox.addEventListener("click", () => refresh());
  messageBox.addEventListener("keyup", () => refresh());
  messageBox.addEventListener("select", () => refresh());
  messageBox.addEventListener("blur", () => {
    lastInputState = "";
    close();
  });

  // While the list is open it takes the unmodified keys that move through it,
  // choose from it, and close it. Refreshing first reconciles any caret move
  // that happened before keyup (such as key rollover after Home or ArrowLeft).
  document.querySelector(".composer-card").addEventListener("keydown", (event) => {
    if (!shown || event.target !== messageBox || event.isComposing) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    refresh();
    if (!shown) return;
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step) {
      shown.active = (shown.active + step + shown.handles.length) % shown.handles.length;
      highlight(true);
    } else if (event.key === "Enter" || event.key === "Tab") {
      pick(shown.handles[shown.active]);
    } else if (event.key === "Escape") {
      dismissed = {
        start: shown.start,
        before: messageBox.value.slice(0, shown.start + 1),
      };
      close();
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // Primary-button mousedown cancels focus transfer so the message box keeps
  // the keyboard (including while dragging the list's scrollbar); click
  // commits the chosen row so dragging off a row cancels and right-click does
  // nothing.
  list.addEventListener("mousedown", (event) => {
    if (event.button === 0) event.preventDefault();
  });
  list.addEventListener("click", (event) => {
    if (event.button !== 0 || !shown) return;
    const option = event.target.closest(".mention-suggestion");
    if (option) pick(option.dataset.handle);
  });

  window.ChorusMention = Object.freeze({ refresh: () => refresh(true) });
})();
