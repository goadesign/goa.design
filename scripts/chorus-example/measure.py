"""measure.py counts the tokens an agent actually receives from Chorus in the
recorded example conversation (wire.jsonl, written by seed.py): every
`chorus watch` wakeup and every tool result, verbatim.

Each record is one MCP tool result exactly as the agent's model sees it. The
script reports, per kind of result, the size in bytes and two deterministic
token estimates: goa.design's own rule (words x 1.3, as static/js/token-count.js
uses) and bytes / 4. Real tokenizers differ by model; these are estimates.
Waiting in `chorus watch` costs no model tokens at all and is not counted: the
watcher is a shell process, so only the text it hands back is measured.

Usage: python3 measure.py wire.jsonl > tokens.json
"""
import json, math, statistics, sys

def site_estimate(text):
    """site_estimate mirrors static/js/token-count.js: words x 1.3, rounded up."""
    return math.ceil(len(text.split()) * 1.3)

def kind(rec):
    """kind groups results by what the agent was doing when it received them:
    a `chorus watch` wakeup, a send acknowledgement (with or without unread
    messages appended), or joining the swarm."""
    tool, out = rec["tool"], rec["result"]
    if tool == "watch":
        return "wakeup"
    if tool == "send":
        return "send-with-unread" if "--- unread ---" in out else "send-ack"
    return tool

rows = []
for line in open(sys.argv[1]):
    rec = json.loads(line)
    out = rec["result"]
    rows.append({
        "kind": kind(rec),
        "agent": rec["agent"],
        "bytes": len(out.encode()),
        "tokens": site_estimate(out),
        "bytes_div_4": math.ceil(len(out.encode()) / 4),
        "messages": sum(1 for l in out.splitlines() if l.startswith(("#", "@"))),
        "result": out,
    })

# Per delivered message: tokens of each message line (header plus text).
per_message = []
for r in rows:
    if r["kind"] in ("wakeup", "send-with-unread"):
        block, cur = [], None
        for l in r["result"].splitlines():
            if l.startswith(("#", "@")) and ": " in l:
                if cur is not None:
                    block.append(cur)
                cur = l
            elif cur is not None and not l.startswith(("--- unread ---", "! watch:")):
                cur += "\n" + l
        if cur is not None:
            block.append(cur)
        per_message += [site_estimate(m) for m in block]

summary = {}
for k in sorted({r["kind"] for r in rows}):
    t = [r["tokens"] for r in rows if r["kind"] == k]
    summary[k] = {"count": len(t), "min": min(t), "median": statistics.median(t), "max": max(t)}
summary["per_delivered_message"] = {
    "count": len(per_message), "min": min(per_message),
    "median": statistics.median(per_message), "max": max(per_message),
}
json.dump({"estimate": "words x 1.3 (goa.design token-count.js); bytes_div_4 for comparison", "summary": summary, "results": rows}, sys.stdout, indent=2, ensure_ascii=False)
