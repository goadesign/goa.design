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
      const brand = page.locator('.td-navbar .navbar-brand');
      await expect(brand).toHaveAccessibleName('Goa');
      await expect(brand).toHaveAttribute('href', '/');
      await expect(brand.locator('svg')).toBeVisible();
      await expect(brand.locator('svg')).toHaveAttribute('viewBox', '0 0 82 50');
      const logo = await brand.locator('svg').boundingBox();
      expect(logo!.width / logo!.height).toBeCloseTo(82 / 50);
      expect(await brand.locator('g').first().evaluate(element => getComputedStyle(element).fill))
        .toBe(await brand.evaluate(element => getComputedStyle(element).color));
      const brandBox = await brand.boundingBox();
      expect(brandBox!.height).toBeGreaterThanOrEqual(44);
      await page.locator('.td-navbar').screenshot({ path: `.impeccable/review/header-${width}-${theme}.png` });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Let agents reason. Let Goa generate.');
      await expect(page.locator('.home-hero-full .highbay-roles dt')).toHaveText(['For coding agents', 'For AI products']);
      await expect(page.locator('.home-hero-full .highbay-playbook__head strong')).toHaveText('design/*.go');
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
      await expect(page.locator('#home-prompt-cmd')).toContainText('gen example.com/catalog/design');
      await expect(page.locator('#home-step2-copy')).toHaveAccessibleName('Copy starter prompt');
      if (width >= 1440) {
        const homeNavBox = await brand.boundingBox();
        const homeHeroBox = await page.locator('.home-hero-full').boundingBox();
        const homeCardBox = await page.locator('#designer-skill .highbay-install-card').boundingBox();
        const homeStep1Box = await page.locator('#designer-skill .highbay-setup-box').boundingBox();
        const homeStep2Box = await page.locator('#home-prompt-box').boundingBox();
        const homeDemoBox = await page.locator('.contract-demo').boundingBox();
        const homeStripBox = await page.locator('.home-benefit-strip').boundingBox();
        expect(Math.abs(homeNavBox!.x - homeHeroBox!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(homeHeroBox!.x - homeCardBox!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(homeStep1Box!.y - homeStep2Box!.y)).toBeLessThanOrEqual(1);
        expect(homeStripBox!.y - (homeDemoBox!.y + homeDemoBox!.height)).toBeGreaterThanOrEqual(24);
      }
      await page.locator('.home-prompt-btn[data-home-prompt="agent"]').click();
      await expect(page.locator('#home-prompt-cmd')).toContainText('gen example.com/catalog/design');
      await page.locator('.home-setup-btn[data-home-cmd="go"]').click();
      await expect(page.locator('#home-step1-copy')).toHaveAccessibleName('Copy Go CLI install command');
      await page.locator('#home-step1-copy').click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('go install goa.design/goa/v3/cmd/goa@latest');
      await expect(page.locator('#home-prompt-box')).toBeHidden();
      await expect(page.locator('#home-cli-agent-link')).toBeVisible();
      await expect(page.locator('#home-cli-agent-link')).toHaveAttribute('href', '/docs/2-goa-ai/');
      await page.locator('.home-prompt-btn[data-home-prompt="service"]').click();
      await expect(page.locator('#home-cli-service-link')).toBeVisible();
      await expect(page.locator('#home-cli-service-link')).toHaveAttribute('href', '/docs/1-goa/');
      await page.locator('.home-setup-btn[data-home-cmd="skill"]').click();
      await expect(page.locator('#home-step1-copy')).toHaveAccessibleName('Copy skill install command');
      await expect(page.getByRole('link', { name: 'Build an MCP server', exact: true })).toHaveAttribute('href', '/docs/2-goa-ai/mcp-integration/');
      const mcp = page.locator('#mcp');
      await expect(mcp.locator('pre')).toContainText(/Tool\("lookup",\s*"Find a product by SKU"\)/);
      await expect(mcp.locator('.mcp-results dt')).toHaveText(['HTTP server', 'Typed clients', 'Tool schemas', 'Validation and codecs']);
      await expect(mcp.locator('.mcp-benefits')).toContainText('coding agent');
      const design = await mcp.locator('.mcp-design').boundingBox();
      const outputs = await mcp.locator('.mcp-results').boundingBox();
      expect(design).not.toBeNull();
      expect(outputs).not.toBeNull();
      if (width < 801) {
        expect(outputs!.y).toBeGreaterThan(design!.y + design!.height);
      } else {
        expect(outputs!.x).toBeGreaterThan(design!.x + design!.width);
      }
      await mcp.locator('h2').click();
      await mcp.screenshot({ path: `.impeccable/review/mcp-${width}-${theme}.png` });
      await expect(page.getByRole('link', { name: 'Host a tool registry', exact: true })).toHaveAttribute('href', '/docs/2-goa-ai/registry/');
      await expect(page.locator('#compare .highbay-matrix tbody tr')).toHaveCount(4);
      await expect(page.locator('#compare').getByRole('table')).toBeVisible();
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
        const docsNavBox = await page.locator('.td-navbar .navbar-brand').boundingBox();
        const docsSidebarBox = await page.locator('.docs-sidebar').boundingBox();
        const docsTitleRowBox = await page.locator('.td-content .page-title-row').boundingBox();
        const docsProseBox = await page.locator('.td-content > p').first().boundingBox();
        expect(Math.abs(docsNavBox!.x - docsSidebarBox!.x)).toBeLessThanOrEqual(1);
        expect(docsProseBox!.width).toBeGreaterThan(800);
        expect(Math.abs(docsTitleRowBox!.width - docsProseBox!.width)).toBeLessThanOrEqual(1);
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
      await expect(page.locator('.td-navbar .navbar-brand')).toHaveAttribute('href', `/${lang}`);
      await expect(page.locator('.td-navbar .navbar-brand svg')).toBeVisible();
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.locator('.hero-actions a').first()).toHaveAttribute('href', `/${lang}docs/1-goa/quickstart/`);
      await expect(page.locator('#mcp .mcp-results dt')).toHaveCount(4);
      await expect(page.locator('#mcp .goa-button')).toHaveAttribute('href', `/${lang}docs/2-goa-ai/mcp-integration/`);
      for (const theme of ['light', 'dark']) {
        await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
        await page.locator('#mcp h2').click();
        await page.locator('#mcp').screenshot({ path: `.impeccable/review/mcp-${lang.replace('/', '') || 'en'}-${width}-${theme}.png` });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${lang} at ${width}px ${theme}`).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${lang} at ${width}px`).toBe(true);
    }
    await page.goto(`/${lang}docs/2-goa-ai/mcp-integration/`);
    for (const section of ['additional-input-and-asynchronous-tasks', 'mcp-apps', 'mcp-skills']) {
      await expect(page.locator(`[id="${section}"]`)).toHaveCount(1);
    }
    for (const path of ['index.md', 'docs/', 'docs/ai-development/', 'docs/2-goa-ai/', 'docs/contributing/', 'llms.txt', 'docs/ai-development/index.md', 'docs/2-goa-ai/mcp-integration/index.md', 'docs/2-goa-ai/toolsets/index.md']) {
      const response = await request.get(`/${lang}${path}`);
      expect(response.status(), `${lang}${path}`).toBe(200);
      if (path === 'docs/ai-development/index.md') {
        expect(await response.text()).toContain('BindTo("lookup")');
      }
      if (path === 'llms.txt') {
        expect(await response.text()).toContain(`/${lang}docs/ai-development/index.md`);
      }
      if (path === 'docs/2-goa-ai/toolsets/index.md') {
        expect(await response.text()).toContain(`/${lang}docs/2-goa-ai/registry/`);
      }
      if (path === 'docs/2-goa-ai/mcp-integration/index.md') {
        const content = await response.text();
        for (const capability of ['NewJWTResourceServer', 'InputExchange', 'TaskExchange', 'ToolUI', 'SkillCatalog', 'mcp.VerifySkillFile']) {
          expect(content).toContain(capability);
        }
        expect(content).not.toContain('mcpruntime.CallerFunc(');
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
    expect(content).toContain('goa.design/goa/v3/cmd/goa@v3.35.0');
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
  expect(html).toMatch(/id=["']?workflow-title/);
  expect(html).toContain('HTTP + gRPC + JSON-RPC');
  expect(html).toContain('npx skills add goadesign/goa --skill goa-service-designer');
  for (const [docPath, expectedIds] of [
    ['/chorus/', ['chorus-steps-title']],
    ['/docs/3-ecosystem/pulse/', ['replicated-maps', 'streaming', 'worker-pools']],
    ['/docs/3-ecosystem/clue/', ['checking-dependencies']],
    ['/it/docs/3-ecosystem/chorus/', ['coordinare-più-coding-agent', 'flusso-di-lavoro-tipico-dellagente']],
    ['/ja/docs/3-ecosystem/chorus/', ['複数のコーディングエージェントを連携させる', 'エージェントの典型的なワークフロー']],
  ] as const) {
    const docHtml = await (await request.get(docPath)).text();
    for (const id of expectedIds) {
      expect(docHtml, `${docPath}#${id}`).toContain(`id=${id}`);
    }
  }
  const schemaText = html.match(/<script type=["\']?application\/ld\+json["\']?>(.*?)<\/script>/s)?.[1];
  expect(schemaText).toBeTruthy();
  const schema = JSON.parse(schemaText!);
  expect(schema['@graph'].map((item: { name: string }) => item.name)).toEqual(['Goa', 'Goa-AI']);
  const markdown = await (await request.get('/index.md')).text();
  expect(markdown).toContain('Create MCP servers');
  expect(markdown).toContain('Host a registry');
  expect(markdown).toContain('Typed clients');
  expect(markdown).toContain('coding agent');
  expect(markdown).toContain('less code to write');
  const manifest = await (await request.get('/favicons/manifest.json')).json();
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get('/robots.txt')).ok()).toBe(true);
});

// The Chorus page shows the screenshot matching the reader's theme, keeps the
// terminal example as selectable text, and copies the exact install command.
for (const width of [390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`${width}px ${theme}: Chorus page example, markers, and install`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((value) => localStorage.setItem('goa-theme', value), theme);
      await page.goto('/chorus/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your coding agents. Working as a team.');
      await expect(page.locator('.chorus-hero .highbay-roles dt')).toHaveText(['For you', 'For your agents']);
      await expect(page.locator('.chorus-hero .hero-actions a').first()).toHaveText('Get Chorus');
      await expect(page.locator('.chorus-hero .hero-actions a').first()).toHaveAttribute('href', '#install');
      await expect(page.locator('.chorus-hero .hero-actions a').nth(1)).toHaveAttribute('href', '/docs/3-ecosystem/chorus/');
      const brand = page.locator('.td-navbar .navbar-brand');
      await expect(brand).toHaveAccessibleName('Chorus');
      await expect(brand).toHaveAttribute('href', '/chorus/');
      await expect(brand.locator('svg')).toHaveAttribute('viewBox', '0 0 512 512');
      const nav = page.locator('.td-navbar .navbar-nav');
      await expect(nav.getByRole('link', { name: 'Documentation', exact: true })).toHaveAttribute('href', '/docs/3-ecosystem/chorus/');
      await expect(nav.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/goadesign/chorus');
      await expect(nav.getByRole('link', { name: 'Goa framework', exact: true })).toHaveAttribute('href', '/');
      await expect(nav.getByRole('link', { name: 'Services', exact: true })).toHaveCount(0);
      await expect(nav.getByRole('link', { name: 'AI agents', exact: true })).toHaveCount(0);
      await expect(page.locator('.td-navbar input[type="search"]')).toHaveCount(0);
      await expect(page.locator('.td-navbar .theme-toggle')).toBeVisible();
      await expect(page.locator('.chorus-pillars dt')).toHaveText(['Project swarms', '#channels & pinned plan', '@agent direct messages', 'Live dashboard (chorus ui)']);
      await expect(page.locator('.chorus-example .section-intro p')).toContainText('Invented task, real Chorus output.');
      const terminals = page.locator('.chorus-terminal');
      await expect(terminals).toHaveCount(3);
      await expect(terminals.first().locator('pre')).toContainText('$ chorus watch claude -wait 30s');
      await expect(terminals.first().locator('pre')).toContainText('#auth#1 @dana (human): @claude lead this');
      // Markers number messages in the order they were sent, so terminal order can differ.
      expect((await page.locator('.chorus-marker').allTextContents()).sort()).toEqual(['1', '2', '3', '4']);
      await expect(page.locator('.chorus-pin')).toHaveText(['1', '2', '3', '4']);
      const shot = page.locator(`.chorus-shot--${theme} img`);
      const other = page.locator(`.chorus-shot--${theme === 'light' ? 'dark' : 'light'} img`);
      await shot.scrollIntoViewIfNeeded();
      await expect(shot).toBeVisible();
      await expect(other).toBeHidden();
      await expect.poll(() => shot.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await shot.evaluate(image => (image as HTMLImageElement).currentSrc))
        .toContain(`dashboard-${width < 601 ? 'mobile' : 'desktop'}-${theme}.webp`);
      // Every marker sits inside the screenshot it annotates.
      const frame = await page.locator('.chorus-shot').boundingBox();
      for (const pin of await page.locator('.chorus-pin').all()) {
        const box = await pin.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(frame!.x);
        expect(box!.x + box!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
        expect(box!.y).toBeGreaterThanOrEqual(frame!.y);
      }
      await expect(page.locator('.chorus-tokens dt')).toHaveText(['Waiting: model off', 'Waking up: just the news', 'Talking: a few tokens']);
      await expect(page.locator('.chorus-quote-speaker')).toHaveText('Codex, lead agent, explains the plan to the maintainer.');
      await expect(page.locator('.chorus-compare .highbay-matrix tbody tr')).toHaveCount(4);
      await expect(page.locator('.chorus-compare .highbay-matrix tbody th')).toHaveText([
        'Cross-model peers',
        'Shared task plan',
        'Waiting cost',
        'Editor & setup',
      ]);
      await expect(page.locator('.chorus-directory-badge')).toHaveAttribute(
        'href',
        'https://serverdex.io/server/io-github-goadesign-chorus?utm_source=badge',
      );
      expect(await page.locator('.chorus-directory-badge').getAttribute('rel')).toBeNull();
      await expect(page.locator(`.chorus-badge--${theme}`)).toBeVisible();
      await expect(page.locator(`.chorus-badge--${theme === 'light' ? 'dark' : 'light'}`)).toBeHidden();
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('#install').getByRole('button', { name: 'Copy setup command' }).click();
      await expect(page.locator('#install .copy-install-status')).toHaveText('Command copied.');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('brew install goadesign/tap/chorus && chorus up');
      await page.locator('.chorus-mgr-btn[data-chorus-mgr="npx"]').click();
      await page.locator('#install').getByRole('button', { name: 'Copy setup command' }).click();
      await expect(page.locator('#install .copy-install-status')).toHaveText('Command copied.');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npx @goadesign/chorus up');
      await page.locator('.chorus-mgr-btn[data-chorus-mgr="brew"]').click();
      if (width >= 1440) {
        const chorusStep1Box = await page.locator('#install .highbay-setup-box').boundingBox();
        const chorusStep2Box = await page.locator('#install .highbay-prompt-box').boundingBox();
        expect(Math.abs(chorusStep1Box!.y - chorusStep2Box!.y)).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur?.();
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.screenshot({ path: `.impeccable/review/chorus-${width}-${theme}.png`, fullPage: true });
    });
  }
}

test('localized Chorus pages, docs links, and Markdown are reachable', async ({ page, request }) => {
  for (const [lang, heading, docsLabel, goaLabel] of [
    ['es', 'Tus agentes de programación. Trabajando en equipo.', 'Documentación', 'Framework Goa'],
    ['fr', 'Vos agents de code. En équipe.', 'Documentation', 'Framework Goa'],
    ['it', 'I tuoi agenti di programmazione. Al lavoro come una squadra.', 'Documentazione', 'Framework Goa'],
    ['ja', 'あなたのコーディングエージェントが、 チームとして動く。', 'ドキュメント', 'Goa フレームワーク'],
  ] as const) {
    await page.goto(`/${lang}/chorus/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('.td-navbar .navbar-brand')).toHaveAttribute('href', `/${lang}/chorus/`);
    const nav = page.locator('.td-navbar .navbar-nav');
    await expect(nav.getByRole('link', { name: docsLabel, exact: true })).toHaveAttribute('href', `/${lang}/docs/3-ecosystem/chorus/`);
    await expect(nav.getByRole('link', { name: goaLabel, exact: true })).toHaveAttribute('href', `/${lang}/`);
    await expect(page.locator('.chorus-faq a').first()).toHaveAttribute('href', `/${lang}/docs/3-ecosystem/chorus/`);
    const docs = await request.get(`/${lang}/docs/3-ecosystem/chorus/`);
    expect(await docs.text()).toContain(`/${lang}/chorus/`);
  }
  const markdown = await request.get('/chorus/index.md');
  expect(markdown.ok()).toBe(true);
  const mdText = await markdown.text();
  expect(mdText).toContain('brew install goadesign/tap/chorus');
  expect(mdText).toContain('npx @goadesign/chorus up');
  expect(mdText).toContain('Invented task, real Chorus output.');
  expect(mdText).toContain('## How Chorus compares');
});

// Visitors can find the launcher from each translated landing page, then use
// the same deep link and commands in the rendered guide and Markdown copy.
for (const lang of ['', 'es/', 'fr/', 'it/', 'ja/']) {
  test(`${lang || 'en/'}Herdr launch and update instructions work across sizes and themes`, async ({ page, request }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['light', 'dark']) {
        await page.goto(`/${lang}chorus/`);
        if (await page.locator('html').getAttribute('data-theme') !== theme) {
          await page.locator('.theme-toggle').click();
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('#install .highbay-install-card__top')).toContainText('Herdr');
        await expect(page.locator('#install .highbay-install-card__top a')).toHaveAttribute('href', `/${lang}docs/3-ecosystem/chorus/`);
        await page.locator('#install .chorus-mgr-btn[data-chorus-mgr="npx"]').click({ trial: true });
        await expect(page.locator('.chorus-compare')).toContainText('chorus-launcher');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang} landing ${width}px ${theme}`).toBe(true);

        await page.goto(`/${lang}docs/3-ecosystem/chorus/#herdr`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('#herdr')).toBeVisible();
        await expect(page.locator('#herdr')).toBeInViewport();
        const article = page.locator('.td-content');
        await expect(article).toContainText('herdr-app do mod.open --name chorus-launcher');
        await expect(article).toContainText('Open Chorus team');
        await expect(article).toContainText('Chorus · auth-service');
        await expect(article).toContainText('Update & Restart');
        await expect(article).toContainText('Update & restart');
        await expect(article).toContainText('chorus setup -global');
        await expect(article).toContainText('REDIS_PASSWORD');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang} guide ${width}px ${theme}`).toBe(true);
        await page.screenshot({ path: `.impeccable/review/herdr-${lang.replace('/', '') || 'en'}-${width}-${theme}.png` });
      }
    }
    for (const path of ['chorus/index.md', 'docs/3-ecosystem/chorus/index.md']) {
      const response = await request.get(`/${lang}${path}`);
      expect(response.ok()).toBe(true);
      const markdown = await response.text();
      expect(markdown).toContain('Herdr');
      expect(markdown).toContain('chorus-launcher');
      if (path.startsWith('docs/')) {
        expect(markdown).toContain('herdr-app do mod.open --name chorus-launcher');
        expect(markdown).toContain('chorus update');
        expect(markdown).toContain('{#herdr}');
        expect(markdown).toContain('Update & Restart');
        expect(markdown).toContain('Update & restart');
      }
    }
  });
}

test('interactive Chorus browser demo works across mobile/desktop, light/dark, SVG export, swarm switch, and reset', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  // Mobile dark-mode check (including repeat visit with stale seenMs): chat sheet stays inert without covering timeline or prefilling reply_to.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('goa-theme', 'dark');
    localStorage.setItem('chorus_chat_seen:auth:dana', String(Date.now() - 60000));
  });
  await page.goto('/chorus/demo/');
  await expect(page.locator('#timeline-root svg')).toBeVisible();
  await expect(page.locator('#chat-sheet')).toHaveAttribute('inert', '');
  await expect(page.locator('#reply-chip-container')).toBeEmpty();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Desktop interaction: copy PR summary, export SVG, switch swarms, send message + simulated reply, and reset.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/chorus/demo/');
  await expect(page.locator('.demo-banner')).toContainText('Interactive Demo');
  await expect(page.locator('#active-title')).toHaveText('#auth');

  await page.locator('#btn-copy-pr').click();
  await expect(page.locator('#share-status')).toContainText('Copied PR summary');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('### Multi-Agent Collaboration');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export-svg').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('chorus-auth-timeline.svg');

  await page.locator('#swarm-select').selectOption('chorus');
  await expect(page.locator('#active-title')).toHaveText('#chorus');
  await page.locator('#swarm-select').selectOption('auth');
  await expect(page.locator('#active-title')).toHaveText('#auth');

  await page.locator('#send-text').fill('@codex can you verify expiry status code?\n\n| Case | Expected |\n| --- | --- |\n| Expired | 401 |');
  await page.locator('#btn-send').click();
  await expect(page.locator('#chat-sheet')).toContainText('can you verify expiry status code?');
  await expect(page.locator('#message-stream .md-table-wrap table')).toContainText('401');
  await expect(page.locator('#chat-sheet')).toContainText('Acknowledged in', { timeout: 5000 });

      await page.locator('#demo-reset').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#chat-sheet')).toHaveAttribute('inert', '');
    });


for (const width of [390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`${width}px ${theme}: Highbay page contrast, 4-view studio, capabilities, and install`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((value) => localStorage.setItem('goa-theme', value), theme);
      await page.goto('/highbay/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Ship services, MCP servers, and AI workflows with coding agents you can trust.',
      );
      await expect(page.locator('.highbay-roles dt')).toHaveText(['For you', 'For the model']);
      await expect(page.locator('.highbay-playbook__head strong')).toHaveText(/Built-in Go playbook/);
      await expect(page.locator('.highbay-hero-actions a').first()).toHaveAttribute('href', '#install');
      await expect(page.locator('.highbay-hero-actions a').nth(1)).toHaveAttribute('href', '#views');
      const brand = page.locator('.td-navbar .navbar-brand');
      await expect(brand).toHaveAccessibleName('Highbay');
      await expect(brand).toHaveAttribute('href', '/highbay/');
      await expect(brand.locator('svg')).toHaveAttribute('viewBox', '0 0 512 512');
      const nav = page.locator('.td-navbar .navbar-nav');
      await expect(nav.getByRole('link', { name: 'Documentation', exact: true })).toHaveAttribute('href', '/docs/3-ecosystem/highbay/');
      await expect(nav.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/goadesign/highbay');
      await expect(nav.getByRole('link', { name: 'Goa framework', exact: true })).toHaveAttribute('href', '/');
      await expect(nav.getByRole('link', { name: 'Services', exact: true })).toHaveCount(0);
      await expect(page.locator('.td-navbar input[type="search"]')).toHaveCount(0);
      await expect(page.locator('.td-navbar .theme-toggle')).toBeVisible();

      // Paired Freehand vs. With Highbay contrast rows (both side labels stay available in the desktop accessibility tree).
      await expect(page.locator('.highbay-sim__pair')).toHaveCount(3);
      await expect(page.locator('.highbay-sim__cell--solo')).toHaveCount(3);
      await expect(page.locator('.highbay-sim__cell--hb')).toHaveCount(3);
      await expect(page.locator('.highbay-sim__cell--solo .highbay-sim__mob-tag').first()).toHaveText('Freehand agent');
      await expect(page.locator('.highbay-sim__cell--hb .highbay-sim__mob-tag').first()).toHaveText('With Highbay');
      expect(
        await page.locator('.highbay-sim__mob-tag').first().evaluate((el) => getComputedStyle(el).display),
      ).not.toBe('none');

      // Accessible 4-stage browser Views studio (default active tab = architecture C4 diagram + 4 thumbnails).
      const shotSelector = theme === 'dark' ? '.chorus-shot--dark img' : '.chorus-shot--light img';
      await expect(page.locator('.highbay-tablist')).toHaveAttribute('aria-orientation', width <= 960 ? 'horizontal' : 'vertical');
      await expect(page.locator('.highbay-tab__thumb')).toHaveCount(4);
      const archImg = page.locator(`.highbay-stage--architecture ${shotSelector}`);
      await expect(archImg).toBeVisible();
      await expect(archImg).toHaveAttribute('fetchpriority', 'high');
      await expect.poll(() => archImg.evaluate(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(page.locator(`.highbay-stage--architecture .highbay-window__zoom.chorus-badge--${theme}`)).toBeVisible();
      await page.locator(`.highbay-stage--architecture .highbay-window__zoom.chorus-badge--${theme}`).click({ trial: true });

      for (const stage of ['agree', 'check', 'approve', 'architecture'] as const) {
        const tab = page.locator(`#highbay-tab-${stage}`);
        await expect(tab).toHaveAttribute('aria-controls', `highbay-panel-${stage}`);
        await tab.click();
        const img = page.locator(`.highbay-stage--${stage} ${shotSelector}`);
        await expect(img).toBeVisible();
        await expect.poll(() => img.evaluate(el => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0)).toBe(true);
      }

      await expect(page.locator('.highbay-lane')).toHaveCount(3);
      await expect(page.locator('.highbay-lane').first().locator('pre')).toContainText('Toolset("ops"');
      await expect(page.locator('.highbay-lane').first().locator('pre')).toContainText('Tool("rollback_production"');
      await expect(page.getByRole('group', { name: 'Install method' })).toBeVisible();
      await expect(page.locator('#capabilities dt')).toHaveCount(4);
      await expect(page.locator('.highbay-walkthrough .section-link a')).toHaveAttribute('href', '/docs/ai-development/');
      await expect(page.locator('#compare .highbay-matrix tbody tr')).toHaveCount(4);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.locator('.highbay-faq dt')).toHaveCount(4);
      const faqDocLink = page.locator('.highbay-faq a').first();
      await expect(faqDocLink).toBeVisible();
      await faqDocLink.focus();
      await expect(faqDocLink).toBeFocused();

      // Step 1 [Homebrew | npx | Go] switcher + Step 2 copyable prompt.
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('#install').getByRole('button', { name: 'Copy setup command' }).click();
      await expect(page.locator('#install .copy-install-status')).toHaveText('Command copied.');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('brew install goadesign/tap/highbay\nhighbay up');

      await page.locator('.highbay-mgr-btn[data-mgr="npx"]').click();
      await expect(page.locator('#highbay-setup-cmd')).toHaveText('npx @goadesign/highbay up');
      await page.locator('.highbay-mgr-btn[data-mgr="go"]').click();
      await expect(page.locator('#highbay-setup-cmd')).toContainText('github.com/goadesign/highbay/cmd/highbay@latest');
      await page.locator('.highbay-mgr-btn[data-mgr="brew"]').click();
      await expect(page.locator('#highbay-prompt-cmd')).toContainText('/highbay Build an incident service');
      if (width >= 1440) {
        const hbNavBox = await brand.boundingBox();
        const hbHeroBox = await page.locator('.highbay-hero-full').boundingBox();
        const hbCardBox = await page.locator('#install .highbay-install-card').boundingBox();
        const hbStep1Box = await page.locator('#install .highbay-setup-box').boundingBox();
        const hbStep2Box = await page.locator('#install .highbay-prompt-box').boundingBox();
        const hbH2Box = await page.locator('#highbay-showcase-title').boundingBox();
        const hbStudioBox = await page.locator('.highbay-studio').boundingBox();
        expect(Math.abs(hbNavBox!.x - hbHeroBox!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(hbHeroBox!.x - hbCardBox!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(hbH2Box!.x - hbStudioBox!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(hbCardBox!.width - hbStudioBox!.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(hbStep1Box!.y - hbStep2Box!.y)).toBeLessThanOrEqual(1);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur?.();
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.screenshot({ path: `.impeccable/review/highbay-${width}-${theme}.png`, fullPage: true });

      // Ecosystem guide embeds theme-matched Agree and Approve browser views without horizontal overflow.
      await page.goto('/docs/3-ecosystem/highbay/');
      const docShots = page.locator(`.highbay-doc-views ${shotSelector}`);
      await expect(docShots).toHaveCount(2);
      await expect(page.locator('.highbay-doc-views figcaption').first()).not.toBeEmpty();
      await expect(page.locator('.highbay-doc-views figcaption').nth(1)).not.toBeEmpty();
      await docShots.first().scrollIntoViewIfNeeded();
      await expect.poll(() => docShots.evaluateAll(
        imgs => imgs.every(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0),
      )).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('localized Highbay pages, ecosystem guides, and Markdown are reachable', async ({ page, request }) => {
  for (const [lang, heading, docsLabel, goaLabel] of [
    ['es', 'Publica servicios, servidores MCP y flujos de IA con agentes de código en los que puedes confiar.', 'Documentación', 'Framework Goa'],
    ['fr', 'Livrez services, serveurs MCP et workflows IA avec des agents de code fiables.', 'Documentation', 'Framework Goa'],
    ['it', 'Rilascia servizi, server MCP e workflow IA con coding agent di cui puoi fidarti.', 'Documentazione', 'Framework Goa'],
    ['ja', 'サービス・MCP サーバー・AI ワークフローを 信頼できるコーディングエージェントで出荷。', 'ドキュメント', 'Goa フレームワーク'],
  ] as const) {
    await page.goto(`/${lang}/highbay/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('.td-navbar .navbar-brand')).toHaveAttribute('href', `/${lang}/highbay/`);
    const nav = page.locator('.td-navbar .navbar-nav');
    await expect(nav.getByRole('link', { name: docsLabel, exact: true })).toHaveAttribute('href', `/${lang}/docs/3-ecosystem/highbay/`);
    await expect(nav.getByRole('link', { name: goaLabel, exact: true })).toHaveAttribute('href', `/${lang}/`);
    await expect(page.locator('.highbay-walkthrough .section-link a')).toHaveAttribute('href', `/${lang}/docs/ai-development/`);
    await expect(page.locator('.highbay-faq a').first()).toHaveAttribute('href', `/${lang}/docs/3-ecosystem/highbay/#architecture`);
    const docs = await request.get(`/${lang}/docs/3-ecosystem/highbay/`);
    expect(docs.ok()).toBe(true);
    expect(await docs.text()).toContain(`/${lang}/highbay/`);
  }
  for (const lang of ['', 'es/', 'fr/', 'it/', 'ja/']) {
    for (const path of ['highbay/index.md', 'docs/3-ecosystem/highbay/index.md']) {
      const response = await request.get(`/${lang}${path}`);
      expect(response.status(), `${lang}${path}`).toBe(200);
      const mdText = await response.text();
      expect(mdText).toContain('github.com/goadesign/highbay/cmd/highbay@latest');
      expect(mdText).toContain('1.27.3');
      expect(mdText).toContain('{#codegen}');
      expect(mdText).not.toContain('`example: true`');
      if (path.startsWith('docs/')) {
        expect(mdText).toContain('worked_example: true');
        expect(mdText).toContain('{#blank-and-example}');
        expect(mdText).toContain('{#workflow}');
        expect(mdText).toContain('{#checkpoints}');
        expect(mdText).toContain('{#herdr}');
        expect(mdText).toContain('{#architecture}');
      }
    }
  }
  const llms = await (await request.get('/llms.txt')).text();
  expect(llms).toContain('https://goa.design/highbay/');
  expect(llms).toContain('https://github.com/goadesign/highbay');
});
