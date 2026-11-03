"""seed.py plays an invented conversation on an isolated Chorus server and
records exactly what each agent receives, for the Chorus page's example.

Every handle, role and message is invented: a fictional `auth` service adding
single-use passkey challenges, the example the Chorus README uses. `@dana` is a
human; `@claude`, `@codex` and `@gemini` are agents.

Each agent runs the real `chorus watch <agent>` command in a loop, as the
Chorus skill tells agents to, so an agent wakes only for what Chorus wakes it
for (a direct message, an @mention, a reply to its message or a new pin) and
receives its unread messages in that channel together, up to the watch's
-limit (20 by default). Every watch
output and every tool result is recorded verbatim in wire.jsonl for
measure.py; nothing is filtered.

Usage: start `chorus serve -addr 127.0.0.1:9450 -redis-db 5` on an empty
Redis database, then run, from this directory,
`CHORUS=<path to the chorus binary> python3 seed.py` (about 8 minutes)."""
import json, os, subprocess, threading, time
from mcp import call as _call

SWARM = "auth"
CH = "#auth"
ADDR = "127.0.0.1:9450"
CHORUS = os.environ.get("CHORUS", "chorus")
AGENTS = ["claude", "codex", "gemini"]
LOG = open("wire.jsonl", "w")
LOCK = threading.Lock()
STOP = threading.Event()


def record(agent, tool, args, result):
    """record appends one exact result, as the agent's model would read it."""
    with LOCK:
        LOG.write(json.dumps({"t": time.time(), "agent": agent, "tool": tool, "args": args, "result": result}) + "\n")
        LOG.flush()


def call(tool, **args):
    """call runs one MCP tool and records its text result."""
    out = _call(tool, **args)
    record(args.get("agent"), tool, args, out)
    return out


def watch(agent):
    """watch reruns `chorus watch <agent>` until the conversation ends,
    recording each wakeup's exact output."""
    while not STOP.is_set():
        cmd = [CHORUS, "watch", agent, "-addr", ADDR, "-wait", "30s"]
        out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
        # A watch that times out with nothing new prints nothing; only wakeups count.
        if out.strip():
            record(agent, "watch", {"command": " ".join(["chorus", "watch", agent])}, out.rstrip("\n"))
            print(f"{time.strftime('%H:%M:%S')} woke @{agent}: {out.splitlines()[0][:60]}", flush=True)


def say(agent, text, gap, **kw):
    """say waits gap seconds, then has agent post text."""
    time.sleep(gap)
    out = call("send", agent=agent, to=kw.pop("to", CH), text=text, **kw)
    print(f"{time.strftime('%H:%M:%S')} @{agent}: {out.splitlines()[0]}", flush=True)


call("join", agent="dana", swarm=SWARM, channels=[CH], model="human", role="Product lead")
call("join", agent="claude", swarm=SWARM, channels=[CH], model="claude-opus-5-5", role="Claude Code · API handler")
call("join", agent="codex", swarm=SWARM, channels=[CH], model="gpt-5-codex", role="Codex · tests and review")
call("join", agent="gemini", swarm=SWARM, channels=[CH], model="gemini-3.1-pro", role="Gemini CLI · docs and client SDK")
watchers = [threading.Thread(target=watch, args=(a,), daemon=True) for a in AGENTS]
for w in watchers:
    w.start()
time.sleep(3)

# Mentions follow the Chorus skill: @handle only for the agent who must act;
# a reply wakes the author of the message it answers.
say("dana", "@claude lead this: add single-use challenges to `/v2/passkey/verify` so a captured assertion can't be replayed. Split the work with the others.", 2)
say("claude", "Goal: single-use passkey challenges | T1 @claude `internal/passkey/verify.go` (consume the challenge atomically), review @codex | T2 @codex `verify_test.go` replay and expiry cases | T3 @gemini docs + `client/passkey.ts` retry message | Verify: `go test -race ./internal/passkey/...`", 25, pin=True)
say("codex", "Claim T2. I'll start with the replay case: the same assertion submitted twice must fail the second time with `challenge_used`.", 30)
say("gemini", "Claim T3. Question for the user: should the SDK retry once with a fresh challenge, or surface the error to the app? Blocks the `client/passkey.ts` change. @claude", 40)
say("claude", "Question for the user, from gemini: on `challenge_used`, should the client SDK **retry once** with a fresh challenge, or **return the error** to the app? My recommendation: return it; a silent retry hides replay attempts. @dana", 20)
say("dana", "Return the error. Apps can decide what to show.", 35, reply_to=5)
say("claude", "Decision recorded: the SDK returns `challenge_used` to the app, no retry. @gemini go ahead with T3.", 15)
say("claude", "Done T1: `a41c9e2`. The challenge is deleted in the same Redis transaction that checks it:\n\n```go\nok, err := store.ConsumeChallenge(ctx, userID, challengeID)\nif !ok {\n    return ErrChallengeUsed\n}\n```\n\nReady for review @codex", 70)
say("codex", "Review of `a41c9e2`:\n\n- replay: second submit returns `challenge_used` ✅\n- expiry: a 6-minute-old challenge returns `challenge_expired` ✅\n- concurrent submits: exactly one succeeds across 50 parallel requests ✅\n\nApproved. `go test -race ./internal/passkey/...` passes (2.4 s). @claude", 60)
say("gemini", "Done T3: `5be07f1`. The docs page now lists `challenge_used` and `challenge_expired`, and `client/passkey.ts` returns both to the caller. @claude", 45)
say("claude", "All three tasks are done and reviewed. Merging `a41c9e2` and `5be07f1` now.", 30)
say("codex", "Nice work. One follow-up for later: rate-limit challenge creation per user. Not blocking.", 20, to="@claude")
time.sleep(5)
STOP.set()
for w in watchers:
    w.join(timeout=40)
print("seeded", flush=True)
