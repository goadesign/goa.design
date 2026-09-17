import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Use the original Goa badge and local font to render browser and social images.
const root = resolve(import.meta.dirname, '..');
const svg = await readFile(`${root}/assets/icons/logo.svg`, 'utf8');
const logo = `data:image/png;base64,${(await readFile(`${root}/static/img/goa-logo.png`)).toString('base64')}`;
const font = (await readFile(`${root}/static/fonts/manrope-latin.ttf`)).toString('base64');
const browser = await chromium.launch({ channel: 'chrome' });
const bannerPage = await browser.newPage({ deviceScaleFactor: 2 });
const banner = (await readFile(`${root}/scripts/readme-banner.html`, 'utf8'))
  .replace('{{FONT}}', `data:font/ttf;base64,${font}`)
  .replace('{{LOGO}}', logo);
// Render the same composition for each GitHub theme and screen size at twice its display resolution.
for (const [name, width, height, colorScheme] of [
  ['goa-banner', 1200, 440, 'light'],
  ['goa-banner-dark', 1200, 440, 'dark'],
  ['goa-banner-mobile', 720, 460, 'light'],
  ['goa-banner-mobile-dark', 720, 460, 'dark'],
]) {
  await bannerPage.setViewportSize({ width, height });
  await bannerPage.emulateMedia({ colorScheme });
  await bannerPage.setContent(banner);
  await bannerPage.evaluate(() => document.fonts.ready);
  await bannerPage.locator('img').evaluate(image => image.decode());
  await bannerPage.screenshot({ path: `${root}/static/img/social/${name}.png`, omitBackground: true });
}
await bannerPage.close();
if (!process.argv.includes('--readme-only')) {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const style = `<style>@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#fff;color:#172b45;font-family:Manrope,sans-serif}.brand{display:flex;align-items:center;gap:16px;color:#172b45;font-size:58px;font-weight:800;letter-spacing:-2px}.brand img{width:88px;height:88px;border-radius:50%}h1{font-size:60px;line-height:1.16;letter-spacing:-2px;margin:36px 0 24px;font-weight:750}p{font-size:25px;color:#35465c;line-height:1.6;margin:0}.frame{height:100vh;padding:64px 76px;position:relative}.foot{position:absolute;bottom:54px;left:76px;right:76px;display:flex;justify-content:space-between;border-top:1px solid #dce3ec;padding-top:24px;font-size:20px;color:#526278}.compact{padding:54px 70px}.compact h1{font-size:46px;margin:20px 0 12px}.compact .brand{font-size:42px}.compact .brand img{width:70px;height:70px}</style>`;
  for (const [name, width, height, label, headline, subline] of [
    ['goa-card', 1200, 630, 'Goa', 'Let agents reason.<br>Let Goa generate.', 'Less code to write. One contract to reason from.'],
    ['goa-ai-banner', 1200, 360, 'Goa-AI', 'Design the tools. Generate the contracts.', 'AI agents, MCP servers, and tool registries.'],
  ]) {
    await page.setViewportSize({ width, height });
    await page.setContent(`${style}<main class="frame ${height < 400 ? 'compact' : ''}"><div class="brand"><img src="${logo}" alt=""><span>${label}</span></div><h1>${headline}</h1><p>${subline}</p>${height > 400 ? '<div class="foot"><span>Go services / AI agents / MCP / Tool registries</span><span>goa.design</span></div>' : ''}</main>`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('img').evaluate(image => image.decode());
    await page.screenshot({ path: `${root}/static/img/social/${name}.png` });
  }
  for (const [name, size] of [
    ['favicon-16x16', 16], ['favicon-32x32', 32], ['android-chrome-192x192', 192],
    ['android-chrome-512x512', 512], ['apple-touch-icon', 180], ['mstile-150x150', 150],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0;background:white}img{display:block;width:100%;height:100%}</style><img src="${logo}" alt="">`);
    await page.locator('img').evaluate(image => image.decode());
    await page.screenshot({ path: `${root}/static/favicons/${name}.png` });
  }
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`<style>body{margin:0;background:white}img{display:block;width:512px;height:512px}</style><img src="${logo}" alt="">`);
  await page.locator('img').evaluate(image => image.decode());
  await page.screenshot({ path: `${root}/static/img/social/goa-square.png` });
  await writeFile(`${root}/static/img/avatar.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 540" role="img" aria-label="Goa"><image href="${logo}" width="540" height="540"/></svg>\n`);
  await writeFile(`${root}/static/favicons/safari-pinned-tab.svg`, svg.replace(/^[ \t]*<rect[^>]*fill="#ffffff"[^>]*\/>\r?\n/m, ''));
  const icon = await readFile(`${root}/static/favicons/favicon-32x32.png`);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(icon.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(`${root}/static/favicons/favicon.ico`, Buffer.concat([header, icon]));
}
await browser.close();
