import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";

describe("Chorus interactive browser demo adapter and share serializer", () => {
  let win;

  beforeEach(() => {
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><button id="demo-reset"></button><button id="btn-copy-pr"></button><button id="btn-export-svg"></button><span id="share-status" role="status"></span><div id="timeline-root"></div></body></html>',
      {
        url: "https://goa.design/chorus/demo/",
        runScripts: "dangerously",
      }
    );
    win = dom.window;
    win.Response = globalThis.Response;
    win.DOMException = globalThis.DOMException;
    for (const rel of ["./static/chorus/demo/demo-adapter.js", "./static/ui/share.js"]) {
      const script = win.document.createElement("script");
      script.textContent = fs.readFileSync(path.resolve(rel), "utf8");
      win.document.head.appendChild(script);
    }
  });

  it("seeds chorus_chat_seen, handles ETag long-polls, DM/channel sends, and cancels pending replies on reset", async () => {
    expect(win.localStorage.getItem("chorus_chat_seen:auth:dana")).toBeTruthy();

    const swarmsRes = await win.fetch("/swarms");
    expect((await swarmsRes.json()).swarms).toEqual(["auth", "chorus"]);

    expect((await win.fetch("/update")).status).toBe(404);
    expect((await win.fetch("/healthz")).status).toBe(200);

    const viewRes1 = await win.fetch("/swarms/auth/view?wait=0");
    const etag1 = viewRes1.headers.get("ETag");
    const view1 = await viewRes1.json();
    expect(view1.channels[0].head_seq).toBe(7);

    // Aborted signal rejects immediately without waiting.
    const aborted = new AbortController();
    aborted.abort();
    await expect(
      win.fetch("/swarms/auth/view?wait=5", { headers: { "If-None-Match": etag1 }, signal: aborted.signal })
    ).rejects.toThrow();

    // Long-poll wakes immediately when an MCP send mutates state.
    const waitPromise = win.fetch("/swarms/auth/view?wait=5", {
      headers: { "If-None-Match": etag1 },
    });
    const sendRes = await win.fetch("/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 42,
        method: "tools/call",
        params: {
          name: "send",
          arguments: { agent: "dana", to: "#auth", text: "@codex looks good!" },
        },
      }),
    });
    expect((await sendRes.json()).result.content[0].text).toBe("sent #auth#8");

    const wokenRes = await waitPromise;
    expect(wokenRes.status).toBe(200);
    expect((await wokenRes.json()).channels[0].head_seq).toBe(8);

    // Direct message send populates recipient inbox.
    const dmRes = await win.fetch("/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 43,
        method: "tools/call",
        params: {
          name: "send",
          arguments: { agent: "dana", to: "@codex", text: "Quick DM test" },
        },
      }),
    });
    expect((await dmRes.json()).result.content[0].text).toBe("sent @codex#1");

    // Resetting within 650ms invalidates pending simulated replies so state stays at 7.
    win.ChorusDemoAdapter.resetDemo();
    await new Promise((r) => setTimeout(r, 720));
    const resetView = await (await win.fetch("/swarms/auth/view?wait=0")).json();
    expect(resetView.channels[0].head_seq).toBe(7);
  });

  it("serializes SVG in JSDOM without duplicate xmlns attributes and parses cleanly as XML", () => {
    const svg = win.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 960 180");
    svg.setAttribute("class", "tl-svg");
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("aria-label", "Interactive keyboard timeline");
    const lane = win.document.createElementNS("http://www.w3.org/2000/svg", "line");
    lane.setAttribute("class", "tl-lane");
    lane.setAttribute("x1", "120");
    lane.setAttribute("x2", "900");
    lane.setAttribute("y1", "90");
    lane.setAttribute("y2", "90");
    svg.appendChild(lane);

    const xml = win.ChorusShare.serializeTimelineSVG(svg, { activeSwarm: "auth" });
    const xmlnsMatches = xml.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g) || [];
    expect(xmlnsMatches.length).toBe(1);

    const parsed = new win.DOMParser().parseFromString(xml, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    expect(parsed.documentElement.getAttribute("role")).toBe("img");
    expect(parsed.documentElement.hasAttribute("tabindex")).toBe(false);
    expect(parsed.documentElement.hasAttribute("aria-label")).toBe(false);

    const md = win.ChorusShare.formatPRSummary({
      activeSwarm: "auth",
      view: {
        swarm: "auth",
        agents: [{ handle: "codex", model: "GPT-6.1-Sol", role: "A\\|B" }],
        channels: [{ name: "#auth", messages: [] }],
        inboxes: [],
      },
    });
    expect(md).toContain("| `@codex` | `GPT-6.1-Sol` | A\\\\\\|B |");
  });
});
