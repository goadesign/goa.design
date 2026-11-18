// Chorus Dashboard Collaboration Sharing (1-click PR Markdown summary copy and
// standalone GitHub-CSP-safe swimlane SVG export).
(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif";
  const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  let statusTimer = null;
  let activeButton = null;
  let lastAnnouncement = "";

  // escapeTableCell sanitizes arbitrary user or agent text for placement inside
  // a GitHub-Flavored Markdown table cell.
  function escapeTableCell(value) {
    return String(value ?? "")
      .replace(/\r?\n+/g, " ")
      .replace(/\|/g, "\\|")
      .trim();
  }

  // escapeCodeSpan wraps text in a Markdown inline code span using a fence one
  // backtick longer than the longest backtick run inside value.
  function escapeCodeSpan(value) {
    const clean = escapeTableCell(value);
    if (!clean) return "—";
    let maxRun = 0;
    for (const match of clean.matchAll(/`+/g)) {
      maxRun = Math.max(maxRun, match[0].length);
    }
    if (maxRun === 0) return `\`${clean}\``;
    const fence = "`".repeat(maxRun + 1);
    return `${fence} ${clean} ${fence}`;
  }

  // activeChannel picks the currently selected #channel or falls back to the
  // swarm's first channel so Copy PR Summary always summarizes the primary view.
  function activeChannel(state) {
    const channels = state?.view?.channels || [];
    if (state?.selectedTarget?.kind === "channel") {
      const match = channels.find((ch) => ch.name === state.selectedTarget.name);
      if (match) return match;
    }
    return channels[0] || null;
  }

  // formatPRSummary builds a standalone GitHub-Flavored Markdown summary of the
  // active swarm, pinned goal, participating models/roles, and message counts.
  function formatPRSummary(state) {
    const swarm = state?.activeSwarm || state?.view?.swarm || "";
    const view = state?.view;
    if (!swarm || !view) return "";

    const channel = activeChannel(state);
    const scopeLabel = channel ? `\`${channel.name}\` · swarm \`${swarm}\`` : `swarm \`${swarm}\``;
    const lines = [`### Multi-Agent Collaboration (${scopeLabel})`, ""];

    if (channel?.pin?.text) {
      const pinBody = String(channel.pin.text).trim().split(/\r?\n/).map((line) => `> ${line}`).join("\n");
      lines.push(`**Pinned Goal (\`${channel.name}#${channel.pin.seq}\` by \`@${channel.pin.sender}\`):**`);
      lines.push(pinBody, "");
    }

    const agents = [...(view.agents || [])].sort((a, b) => String(a.handle).localeCompare(String(b.handle)));
    if (agents.length > 0) {
      lines.push("| Participant | Model | Role |", "| --- | --- | --- |");
      for (const ag of agents) {
        const isHuman = ag.model === "human";
        const modelCell = isHuman ? "User" : (ag.model ? escapeCodeSpan(ag.model) : "—");
        const roleCell = escapeTableCell(ag.role) || "—";
        lines.push(`| \`@${escapeTableCell(ag.handle)}\` | ${modelCell} | ${roleCell} |`);
      }
      lines.push("");
    }

    const chanMsgs = (view.channels || []).reduce((acc, ch) => acc + ((ch.messages || []).length), 0);
    const dmMsgs = (view.inboxes || []).reduce((acc, ib) => acc + ((ib.messages || []).length), 0);
    const counts = [];
    counts.push(`${chanMsgs} channel ${chanMsgs === 1 ? "message" : "messages"}`);
    if (dmMsgs > 0) {
      counts.push(`${dmMsgs} direct ${dmMsgs === 1 ? "message" : "messages"}`);
    }
    lines.push(`*${counts.join(" · ")} — coordinated in real time with [Chorus](https://github.com/goadesign/chorus)*`);
    return lines.join("\n");
  }

  // isDarkTheme inspects the document's active theme attribute or OS preference.
  function isDarkTheme() {
    const attr = document.documentElement?.dataset?.theme || document.body?.dataset?.theme;
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // paletteFor returns explicit hex colors matching styles.css for standalone
  // SVG rendering without CSS custom properties or <style> tags.
  function paletteFor(dark) {
    return dark
      ? {
          surface: "#101827",
          elevated: "#162032",
          border: "#1E293B",
          textPrimary: "#F1F5F9",
          textSecondary: "#94A3B8",
          textMuted: "#64748B",
          accent: "#3B82F6",
          accentOpacity: "0.2",
          amber: "#F59E0B",
          teal: "#14B8A6",
          humanLane: "#4C1D2F",
        }
      : {
          surface: "#FFFFFF",
          elevated: "#F8FAFC",
          border: "#E2E8F0",
          textPrimary: "#0F172A",
          textSecondary: "#475569",
          textMuted: "#64748B",
          accent: "#2563EB",
          accentOpacity: "0.14",
          amber: "#D97706",
          teal: "#0D9488",
          humanLane: "#FECDD3",
        };
  }

  // replaceImageWithVectorGlyph swaps same-origin <image href="/ui/brands/...">
  // avatars for pure inline SVG vector marks so the exported SVG has zero
  // external URLs and passes GitHub's strict <img> Content-Security-Policy.
  function replaceImageWithVectorGlyph(imgNode, doc, dark) {
    const x = Number(imgNode.getAttribute("x") || 0);
    const y = Number(imgNode.getAttribute("y") || 0);
    const w = Number(imgNode.getAttribute("width") || 20);
    const h = Number(imgNode.getAttribute("height") || 20);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    const cls = imgNode.getAttribute("class") || "";

    const group = doc.createElementNS(SVG_NS, "g");
    if (cls.includes("provider-gemini")) {
      const star = doc.createElementNS(SVG_NS, "path");
      const s = r * 0.88;
      const k = s * 0.32;
      star.setAttribute(
        "d",
        `M ${cx} ${cy - s} Q ${cx + k} ${cy - k} ${cx + s} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + s} Q ${cx - k} ${cy + k} ${cx - s} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - s} Z`
      );
      star.setAttribute("fill", dark ? "#2DD4BF" : "#0D9488");
      group.appendChild(star);
    } else if (cls.includes("provider-claude")) {
      const disc = doc.createElementNS(SVG_NS, "circle");
      disc.setAttribute("cx", String(cx));
      disc.setAttribute("cy", String(cy));
      disc.setAttribute("r", String((r * 0.72).toFixed(2)));
      disc.setAttribute("fill", "#D97757");
      group.appendChild(disc);
    } else {
      const ring = doc.createElementNS(SVG_NS, "circle");
      ring.setAttribute("cx", String(cx));
      ring.setAttribute("cy", String(cy));
      ring.setAttribute("r", String((r * 0.68).toFixed(2)));
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", dark ? "#60A5FA" : "#2563EB");
      ring.setAttribute("stroke-width", "2.2");
      group.appendChild(ring);
    }
    imgNode.replaceWith(group);
  }

  // stripInteractiveAttributes removes live DOM interactivity and hover-preview
  // data attributes from a cloned SVG element so static exports stay clean.
  function stripInteractiveAttributes(node) {
    node.removeAttribute("class");
    node.removeAttribute("tabindex");
    node.removeAttribute("role");
    node.removeAttribute("aria-label");
    if (node.attributes) {
      const names = Array.isArray(node.attributes)
        ? Array.from(node.attributes, (a) => a.name)
        : typeof node.getAttributeNames === "function"
          ? node.getAttributeNames()
          : Object.keys(node.attributes);
      for (const attr of names) {
        if (attr.startsWith("data-")) {
          node.removeAttribute(attr);
        }
      }
    }
  }

  // serializeTimelineSVG clones svgEl and converts all class-based styling and
  // brand marks into self-contained XML attributes.
  function serializeTimelineSVG(svgEl, state) {
    if (!svgEl) return "";
    const dark = isDarkTheme();
    const pal = paletteFor(dark);
    const swarm = state?.activeSwarm || state?.view?.swarm || "chorus";
    const clone = svgEl.cloneNode(true);
    const doc = clone.ownerDocument || document;

    const viewBox = clone.getAttribute("viewBox") || "0 0 960 260";
    const parts = viewBox.trim().split(/\s+/).map(Number);
    const width = parts[2] || Number(clone.getAttribute("width")) || 960;
    const baseHeight = parts[3] || Number(clone.getAttribute("height")) || 260;
    const totalHeight = baseHeight + 24;

    stripInteractiveAttributes(clone);
    if (!clone.namespaceURI) {
      clone.setAttribute("xmlns", SVG_NS);
    }
    clone.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(totalHeight));
    clone.setAttribute("fill", "none");
    clone.setAttribute("font-family", SANS_FONT);
    clone.setAttribute("role", "img");

    const titleEl = doc.createElementNS(SVG_NS, "title");
    titleEl.textContent = `Chorus swimlane collaboration timeline for swarm ${swarm}`;

    const bg = doc.createElementNS(SVG_NS, "rect");
    bg.setAttribute("x", "0.75");
    bg.setAttribute("y", "0.75");
    bg.setAttribute("width", String(width - 1.5));
    bg.setAttribute("height", String(totalHeight - 1.5));
    bg.setAttribute("rx", "14");
    bg.setAttribute("fill", pal.surface);
    bg.setAttribute("stroke", pal.border);
    bg.setAttribute("stroke-width", "1.5");

    clone.insertBefore(bg, clone.firstChild);
    clone.insertBefore(titleEl, bg);

    for (const img of Array.from(clone.querySelectorAll("image"))) {
      replaceImageWithVectorGlyph(img, doc, dark);
    }

    for (const node of Array.from(clone.querySelectorAll("*"))) {
      const cls = node.getAttribute("class") || "";
      if (cls) {
        const tokens = new Set(cls.split(/\s+/).filter(Boolean));
        if (tokens.has("tl-overview")) {
          node.setAttribute("fill", pal.elevated);
          node.setAttribute("stroke", pal.border);
          node.setAttribute("stroke-width", "1");
        }
        if (tokens.has("tl-tick")) {
          node.setAttribute("stroke-width", "2");
          node.setAttribute("opacity", "0.8");
        }
        if (tokens.has("tl-window")) {
          node.setAttribute("fill", pal.accent);
          node.setAttribute("fill-opacity", pal.accentOpacity);
          node.setAttribute("stroke", pal.accent);
          node.setAttribute("stroke-width", "2");
        }
        if (tokens.has("tl-quiet")) {
          node.setAttribute("fill", pal.elevated);
          node.setAttribute("opacity", "0.7");
        }
        if (tokens.has("tl-quiet-label")) {
          node.setAttribute("fill", pal.textMuted);
          node.setAttribute("font-family", MONO_FONT);
          node.setAttribute("font-size", "12");
        }
        if (tokens.has("tl-label")) {
          node.setAttribute("fill", pal.textSecondary);
          node.setAttribute("font-size", "12.5");
          node.setAttribute("font-weight", "600");
        }
        if (tokens.has("tl-axis")) {
          node.setAttribute("fill", pal.textSecondary);
          node.setAttribute("font-family", MONO_FONT);
          node.setAttribute("font-size", "12");
          node.setAttribute("font-weight", "600");
        }
        if (tokens.has("tl-lane")) {
          node.setAttribute("stroke", tokens.has("is-human") ? pal.humanLane : pal.border);
          node.setAttribute("stroke-width", "1");
          if (tokens.has("is-left")) {
            node.setAttribute("stroke-dasharray", "2 3");
            node.setAttribute("opacity", "0.5");
          }
        }
        if (tokens.has("tl-lane-label")) {
          node.setAttribute("font-family", MONO_FONT);
          node.setAttribute("font-size", "13");
          node.setAttribute("font-weight", tokens.has("is-left") ? "500" : "700");
          if (tokens.has("is-left")) node.setAttribute("fill", pal.textSecondary);
        }
        if (tokens.has("tl-avatar-initial")) {
          node.setAttribute("font-family", MONO_FONT);
          node.setAttribute("font-size", "9.5");
          node.setAttribute("font-weight", "700");
          node.setAttribute("dominant-baseline", "central");
        }
        if (tokens.has("tl-pin")) {
          node.setAttribute("stroke", pal.amber);
          node.setAttribute("stroke-width", "1.75");
          node.setAttribute("stroke-dasharray", "4 3");
        }
        if (tokens.has("tl-pin-label")) {
          node.setAttribute("fill", pal.amber);
          node.setAttribute("font-family", MONO_FONT);
          node.setAttribute("font-size", "12");
          node.setAttribute("font-weight", "700");
        }
        if (tokens.has("tl-reply")) {
          node.setAttribute("fill", "none");
          node.setAttribute("stroke-width", "1.5");
          node.setAttribute("opacity", tokens.has("is-dim") ? "0.18" : "0.5");
        }
        if (tokens.has("tl-read")) {
          node.setAttribute("fill", tokens.has("is-behind") ? pal.amber : pal.teal);
          node.setAttribute("opacity", "0.92");
        }
        if (tokens.has("tl-mention")) {
          node.setAttribute("fill", "none");
          node.setAttribute("stroke-width", "1.5");
          node.setAttribute("stroke-dasharray", "4 3");
          node.setAttribute("opacity", "0.75");
        }
        if (tokens.has("tl-mention-end")) {
          node.setAttribute("fill", "none");
          node.setAttribute("stroke-width", "1.5");
        }
        if (tokens.has("tl-dot")) {
          node.setAttribute("stroke", tokens.has("is-selected") ? pal.textPrimary : pal.surface);
          node.setAttribute("stroke-width", tokens.has("is-selected") ? "2.5" : "1.5");
          node.setAttribute("opacity", tokens.has("is-dim") ? "0.25" : (tokens.has("is-selected") || tokens.has("is-target") ? "1" : "0.78"));
        }
      }
      stripInteractiveAttributes(node);
    }

    const credit = doc.createElementNS(SVG_NS, "text");
    credit.setAttribute("x", String(width - 18));
    credit.setAttribute("y", String(totalHeight - 9));
    credit.setAttribute("text-anchor", "end");
    credit.setAttribute("font-family", MONO_FONT);
    credit.setAttribute("font-size", "11");
    credit.setAttribute("fill", pal.textMuted);
    credit.textContent = `Chorus · swarm ${swarm} · github.com/goadesign/chorus`;
    clone.appendChild(credit);

    if (typeof XMLSerializer !== "undefined") {
      return new XMLSerializer().serializeToString(clone);
    }
    return clone.outerHTML || "";
  }

  // report updates the active button feedback attribute and announces message
  // via the shared role="status" bubble without disabling buttons, dropping
  // focus, or colliding across consecutive Copy / Export clicks.
  function report(button, statusEl, ok, text) {
    if (!button || !statusEl) return;
    if (statusTimer !== null) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    if (activeButton && activeButton !== button) {
      activeButton.removeAttribute("data-copied");
      activeButton.removeAttribute("data-failed");
    }
    activeButton = button;
    button.removeAttribute("data-copied");
    button.removeAttribute("data-failed");
    let message = text;
    if (message === lastAnnouncement) message += "\u00A0";
    lastAnnouncement = message;
    button.setAttribute(ok ? "data-copied" : "data-failed", "");
    statusEl.classList.add("is-visible");
    statusEl.classList.toggle("is-error", !ok);
    statusEl.textContent = message;
    statusTimer = setTimeout(() => {
      button.removeAttribute("data-copied");
      button.removeAttribute("data-failed");
      if (activeButton === button) activeButton = null;
      statusTimer = null;
      statusEl.classList.remove("is-visible", "is-error");
      statusEl.textContent = "";
    }, 2200);
  }

  // copyPRSummary copies the formatted PR collaboration summary to the clipboard.
  async function copyPRSummary(button, statusEl) {
    const summary = formatPRSummary(window.ChorusUI?.state);
    if (!summary) {
      report(button, statusEl, false, "No active swarm yet");
      return false;
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(summary);
      report(button, statusEl, true, "Copied PR summary");
      return true;
    } catch {
      report(button, statusEl, false, "Copy failed");
      return false;
    }
  }

  // exportTimelineSVG serializes and downloads the live swimlane SVG.
  function exportTimelineSVG(button, statusEl) {
    const svgEl = document.querySelector("#timeline-root svg");
    const state = window.ChorusUI?.state;
    const xml = serializeTimelineSVG(svgEl, state);
    if (!xml) {
      report(button, statusEl, false, "No timeline to export");
      return false;
    }
    const swarm = String(state?.activeSwarm || "chorus").replace(/[^a-zA-Z0-9_-]/g, "-");
    const href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    const link = document.createElement("a");
    link.setAttribute("href", href);
    link.setAttribute("download", `chorus-${swarm}-timeline.svg`);
    link.setAttribute("hidden", "");
    document.body.appendChild(link);
    link.click();
    link.remove();
    report(button, statusEl, true, "Exported SVG");
    return true;
  }

  // start wires the Copy PR Summary and Export SVG toolbar buttons.
  function start() {
    const copyBtn = document.getElementById("btn-copy-pr");
    const svgBtn = document.getElementById("btn-export-svg");
    const statusEl = document.getElementById("share-status");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        void copyPRSummary(copyBtn, statusEl);
      });
    }
    if (svgBtn) {
      svgBtn.addEventListener("click", () => {
        exportTimelineSVG(svgBtn, statusEl);
      });
    }
  }

  window.ChorusShare = {
    start,
    formatPRSummary,
    serializeTimelineSVG,
    copyPRSummary,
    exportTimelineSVG,
  };
})();
