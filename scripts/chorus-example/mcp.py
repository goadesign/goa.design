"""mcp.py sends one Chorus MCP tools/call to the isolated test server at
127.0.0.1:9450 and returns the tool's text result, raising on any error."""
import json, sys, urllib.request
URL = "http://127.0.0.1:9450/mcp"
VERSION = "2026-07-28"
_id = [0]
def call(tool, **args):
    _id[0] += 1
    body = {"jsonrpc": "2.0", "id": _id[0], "method": "tools/call", "params": {
        "name": tool, "arguments": args,
        "_meta": {"io.modelcontextprotocol/protocolVersion": VERSION,
                  "io.modelcontextprotocol/clientCapabilities": {}}}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method="POST", headers={
        "Content-Type": "application/json", "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": VERSION, "Mcp-Method": "tools/call", "Mcp-Name": tool})
    with urllib.request.urlopen(req) as r:
        out = json.loads(r.read())
    if "error" in out:
        raise SystemExit(f"{tool} {args.get('agent')}: {out['error']}")
    res = out["result"]
    if res.get("isError"):
        raise SystemExit(f"{tool} {args.get('agent')}: {res['content'][0]['text']}")
    return res["content"][0]["text"]
