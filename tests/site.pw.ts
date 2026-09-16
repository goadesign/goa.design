import { expect, test } from '@playwright/test';

// These checks exercise the built site as a visitor does, including its mobile controls.
for (const width of [390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`${width}px ${theme}: navigate, select an example, copy docs, and switch theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((value) => {
        if (!localStorage.getItem('goa-theme')) localStorage.setItem('goa-theme', value);
      }, theme);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Let agents reason. Let Goa generate.');
      await expect(page.getByRole('link', { name: 'Build a service', exact: true })).toHaveAttribute('href', '/docs/1-goa/quickstart/');
      await expect(page.getByRole('link', { name: 'Build an AI agent', exact: true })).toHaveAttribute('href', '/docs/2-goa-ai/quickstart/');
      await page.locator('label[for="demo-agent"]').click();
      await expect(page.locator('.demo-agent')).toBeVisible();
      await expect(page.locator('.demo-agent pre')).toContainText('BindTo("lookup")');
      await expect(page.locator('.demo-service')).toBeHidden();
      await page.locator('label[for="demo-service"]').click();
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', { name: 'Copy skill install command' }).click();
      await expect(page.locator('.copy-install-status')).toHaveText('Command copied.');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npx skills add goadesign/goa --skill goa-service-designer');
      await expect(page.getByRole('link', { name: 'Build an MCP server', exact: true })).toHaveAttribute('href', '/docs/2-goa-ai/mcp-integration/');
      await expect(page.getByRole('link', { name: 'Host a tool registry', exact: true })).toHaveAttribute('href', '/docs/2-goa-ai/registry/');
      await page.locator('.support-section').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('.support-section img').evaluateAll(
        images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
      )).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `.impeccable/review/home-${width}-${theme}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      await page.getByRole('link', { name: 'Build a service', exact: true }).click();
      await expect(page.locator('.td-content h1')).toBeVisible();
      await expect(page.locator('.td-sidebar-nav a[aria-current="page"]')).toHaveCount(1);
      if (width < 801) {
        await page.locator('.docs-sidebar summary').click();
        await expect(page.locator('.docs-sidebar nav')).toBeVisible();
        await page.locator('.docs-sidebar summary').click();
      } else {
        await expect(page.locator('.docs-sidebar nav')).toBeVisible();
      }
      await page.getByRole('button', { name: 'Copy page content' }).click();
      await expect(page.getByRole('menuitem', { name: 'Copy as Markdown' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.copy-page-menu')).toBeHidden();
      await page.screenshot({ path: `.impeccable/review/docs-${width}-${theme}.png`, fullPage: false });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Toggle dark mode' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    });
  }
}

test('localized homes, documentation, and machine-readable outputs remain reachable', async ({ page, request }) => {
  for (const lang of ['', 'it/', 'ja/', 'fr/', 'es/']) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${lang}`);
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.locator('.hero-actions a').first()).toHaveAttribute('href', `/${lang}docs/1-goa/quickstart/`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${lang} at ${width}px`).toBe(true);
    }
    for (const path of ['index.md', 'docs/', 'docs/ai-development/', 'docs/2-goa-ai/', 'docs/contributing/', 'llms.txt', 'docs/ai-development/index.md']) {
      const response = await request.get(`/${lang}${path}`);
      expect(response.status(), `${lang}${path}`).toBe(200);
      if (path === 'docs/ai-development/index.md') {
        expect(await response.text()).toContain('BindTo("lookup")');
      }
      if (path === 'llms.txt') {
        expect(await response.text()).toContain(`/${lang}docs/ai-development/index.md`);
      }
    }
  }
});

test('search finds the shared coding-agent guide', async ({ page }) => {
  await page.goto('/docs/');
  const search = page.locator('.td-navbar input[type="search"]');
  await search.fill('coding agent');
  await search.press('Enter');
  await expect(page.locator('.td-offline-search-results')).toBeVisible();
  await expect(page.locator('.td-offline-search-results')).toContainText('Develop with a coding agent');
});

// Cloudflare reads these comments before serving HTML; they must survive the production minifier.
test('documentation exempts versioned commands from email obfuscation', async ({ request }) => {
  for (const lang of ['', 'it/', 'ja/', 'fr/', 'es/']) {
    const response = await request.get(`/${lang}docs/1-goa/quickstart/`);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain('<!--/email_off-->');
    const content = html.split('<!--email_off-->')[1]?.split('<!--/email_off-->')[0];
    expect(content).toBeTruthy();
    expect(content).toContain('goa.design/goa/v3/cmd/goa@v3.31.1');
    expect(content).toContain('goa.design/clue@v1.2.6');
    expect(html.indexOf('<!--/email_off-->')).toBeLessThan(html.indexOf('<footer'));
  }
});

// Fetching HTML directly verifies that readers and crawlers receive the positioning without JavaScript.
test('source HTML and Markdown expose the ecosystem and skill without client rendering', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(html).toContain('less code to write and one contract to reason from');
  expect(html).not.toContain('localhost:1313');
  expect(html).toContain('https://goa.design/');
  expect(html).toMatch(/<link rel="?canonical"? href="?https:\/\/goa.design\//);
  expect(html).toContain('hreflang=ja');
  expect(html).toContain('HTTP + gRPC + JSON-RPC');
  expect(html).toContain('npx skills add goadesign/goa --skill goa-service-designer');
  const schemaText = html.match(/<script type=["\']?application\/ld\+json["\']?>(.*?)<\/script>/s)?.[1];
  expect(schemaText).toBeTruthy();
  const schema = JSON.parse(schemaText!);
  expect(schema['@graph'].map((item: { name: string }) => item.name)).toEqual(['Goa', 'Goa-AI']);
  const markdown = await (await request.get('/index.md')).text();
  expect(markdown).toContain('Create MCP servers');
  expect(markdown).toContain('Host a registry');
  expect(markdown).toContain('less code to write');
  const manifest = await (await request.get('/favicons/manifest.json')).json();
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get('/robots.txt')).ok()).toBe(true);
});
