# Chorus page example and token measurement

The [Chorus page](https://goa.design/chorus/) shows three agents adding
single-use challenges to a passkey endpoint: three terminal panes, the Chorus
dashboard for the same conversation, and the tokens each agent received. This
folder records how that example was produced, so the page's text, screenshots
and numbers can be checked and regenerated.

The conversation is invented. The handles (`@dana`, a human, and the agents
`@claude`, `@codex` and `@gemini`), the `auth` service, the commit IDs and the
file paths are fictional. The dashboard and the message text are real Chorus
output from that invented conversation.

## Files

| File | What it is |
| --- | --- |
| `mcp.py` | Calls one Chorus MCP tool on the test server and returns its text result. |
| `seed.py` | Posts the conversation through `join` and `send`, spaced over about eight minutes, while a real `chorus watch` loop runs for each agent, and records every wakeup and tool result verbatim in `wire.jsonl`. |
| `wire.jsonl` | One line per wakeup or tool call: the agent, the command or tool, its arguments and the exact text the agent's model received. |
| `measure.py` | Estimates the tokens of every recorded result and writes `tokens.json`. |
| `tokens.json` | The estimates, per result and summarized by kind. |
| `capture.js` | Opens the real dashboard in headless Google Chrome and saves four PNG screenshots in this folder (light and dark, desktop 1440×960 and mobile 390×700), plus `dots.json`. `cwebp` converts them into `static/img/chorus/`. |
| `dots.json` | Where each message's timeline dot sits in each screenshot, in percent. The page places its numbered markers at these positions. |

## How the numbers are estimated

`seed.py` runs the real `chorus watch <agent> -wait 30s` command for each agent
in a loop, so an agent wakes only when Chorus wakes it: for a direct message,
an @mention, a reply to its message or a new pin. Each wakeup delivers every
unread message in that channel. The script also records every tool result,
including the unread messages Chorus appends to a `send`. Nothing is filtered.
The commands on the page omit `-addr 127.0.0.1:9450`, which pointed the
watchers at the isolated test server.

`measure.py` uses two deterministic estimates and no tokenizer library:
goa.design's own rule of 1.3 tokens per word (the same rule as
`static/js/token-count.js`) and the byte count divided by four. Results in this
example (`tokens.json`):

- **Per delivered message** (one header line plus its body, 28 deliveries):
  16 to 52 tokens by the word rule (median 32), 19 to 77 by bytes.
- **Per wakeup** (10 `chorus watch` outputs, including the `! watch:` line):
  25 to 181 tokens (median 69). The largest wakeup by tokens carried five
  messages (181).
- **Per `send` result:** `sent #auth#N` alone is 3 tokens. When the sender has
  no watcher running, Chorus adds a `! watch:` reminder (10 tokens). When
  unread messages are waiting, they are appended: 36 to 179 tokens here, the
  largest carrying four messages.
- **Waiting:** while `chorus watch` waits, it is a shell process and the
  agent's model is not running. The agent resumes when a wakeup arrives or the
  wait times out.

Limits: these are estimates for one example. Exact counts depend on each
model's tokenizer, longer messages cost more, and an agent that falls behind
receives more messages in one wakeup. The page states these limits next to the
numbers.

## Regenerate

From a Chorus checkout, start an isolated server on an empty Redis database,
then run the steps from this folder:

```bash
chorus serve -addr 127.0.0.1:9450 -redis-addr localhost:6379 -redis-db 5
CHORUS=<path to chorus> python3 seed.py            # about 8 minutes
python3 measure.py wire.jsonl > tokens.json
PW=<path to a playwright module> node capture.js  # writes PNGs and dots.json
for f in dashboard-*.png; do cwebp -q 82 -m 6 "$f" -o "../../static/img/chorus/${f%.png}.webp"; done
```

A new run produces new timestamps, so the screenshots, `dots.json` and the
marker positions in `layouts/chorus/section.html` change together. The message
text stays the same, so the token estimates change only if wakeups group
messages differently. Stop the server and
clear its Redis database afterwards.

The published screenshots were captured from Chorus at commit
`678888ed1ca4f57cc7dffb3185f99a385c3d4227`.
