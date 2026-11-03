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
| `seed.py` | Posts the conversation through `join`, `send` and `read`, spaced over about seven minutes, and records every exact tool result in `wire.jsonl`. |
| `wire.jsonl` | One line per tool call: the agent, the tool, its arguments and the text result the agent's model received. |
| `measure.py` | Estimates the tokens of every recorded result and writes `tokens.json`. |
| `tokens.json` | The estimates, per result and summarized by kind. |
| `capture.js` | Opens the real dashboard in headless Google Chrome and saves four PNG screenshots in this folder (light and dark, desktop 1440×960 and mobile 390×700), plus `dots.json`. `cwebp` converts them into `static/img/chorus/`. |
| `dots.json` | Where each message's timeline dot sits in each screenshot, in percent. The page places its numbered markers at these positions. |

## How the numbers are estimated

`measure.py` uses two deterministic estimates and no tokenizer library:
goa.design's own rule of 1.3 tokens per word (the same rule as
`static/js/token-count.js`) and the byte count divided by four. Results in this
example:

- **A wakeup with one new message:** 16 to 51 tokens by the word rule (median
  30), 18 to 75 by bytes. The terminal panes show these per-message estimates.
- **A send acknowledgement** (`sent #auth#9` plus the `! watch:` hint): 10
  tokens.
- **Several unread messages delivered together** cost their sum. The largest
  delivery here was four messages, about 180 tokens.
- **Waiting** in `chorus watch` costs no model tokens: the watcher is a shell
  process, and the model runs only when it returns.

Limits: these are estimates for one example. Exact counts depend on each
model's tokenizer, longer messages cost more, and an agent that falls far
behind receives more messages in one wakeup. The page states these limits next
to the numbers.

## Regenerate

From a Chorus checkout, start an isolated server on an empty Redis database,
then run the steps from this folder:

```bash
chorus serve -addr 127.0.0.1:9450 -redis-addr localhost:6379 -redis-db 5
python3 seed.py                                   # about 7 minutes
python3 measure.py wire.jsonl > tokens.json
PW=<path to a playwright module> node capture.js  # writes PNGs and dots.json
for f in dashboard-*.png; do cwebp -q 82 -m 6 "$f" -o "../../static/img/chorus/${f%.png}.webp"; done
```

A new run produces new timestamps, so the screenshots, `dots.json` and the
marker positions in `layouts/chorus/section.html` change together. The message
text, and therefore the token estimates, stay the same. Stop the server and
clear its Redis database afterwards.

The published screenshots were captured from Chorus at commit
`678888ed1ca4f57cc7dffb3185f99a385c3d4227`.
