// capture2.js takes the goa.design Chorus page's dashboard screenshots from
// the isolated test server (127.0.0.1:9450, Redis db 5) seeded by seed.py.
// For each theme (light, dark) and size (desktop 1440x960, mobile 390x700) it
// opens the real dashboard in headless Google Chrome, as it first opens with
// message headlines collapsed, saves a PNG, and records where each timeline
// dot is, as a percentage of the image, so the page can place numbered markers
// on the exact message they refer to. It never sends a message.
// Run: PW=<path to playwright module> node capture2.js
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PW || "playwright");

const URL = "http://127.0.0.1:9450/#swarm=auth&target=%23auth";
const OUT = __dirname;
const SIZES = { desktop: [1440, 960], mobile: [390, 700] };

// shoot opens one theme and size, saves the screenshot, and returns the dot
// positions keyed by message number.
async function shoot(browser, theme, size) {
  const [width, height] = SIZES[size];
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: theme });
  await context.addInitScript((t) => {
    // The composer's handle is the seeded human, never the dashboard default.
    try {
      localStorage.setItem("chorus_theme", t);
      localStorage.setItem("chorus_handle", "dana");
    } catch {}
  }, theme);
  const page = await context.newPage();
  await page.goto(URL);
  await page.waitForSelector("text[data-tl-lane]", { timeout: 15000 });
  await page.waitForSelector("summary[data-focus-key^='message:']", { timeout: 15000 });
  await page.mouse.move(width - 2, height - 2);
  await page.waitForTimeout(800);
  const name = `dashboard-${size}-${theme}`;
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const dots = await page.evaluate(([w, h]) => {
    const out = {};
    for (const n of document.querySelectorAll("circle[data-tl-item^='#auth ']")) {
      const seq = n.dataset.tlItem.split(" ")[1];
      const b = n.getBoundingClientRect();
      if (b.bottom < 0 || b.top > h) continue;
      out[seq] = { x: +((b.left + b.width / 2) / w * 100).toFixed(2), y: +((b.top + b.height / 2) / h * 100).toFixed(2) };
    }
    return out;
  }, [width, height]);
  await context.close();
  return { name, dots };
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const result = {};
  try {
    for (const theme of ["light", "dark"]) {
      for (const size of Object.keys(SIZES)) {
        const { name, dots } = await shoot(browser, theme, size);
        result[name] = dots;
        console.log(name, Object.keys(dots).length, "dots");
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, "dots.json"), JSON.stringify(result, null, 2));
})();
