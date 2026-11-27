// Explicit: npm run build && node scripts/tests/public-domains.cjs [--browser].
// Exercises a local standalone build. No production forms or payments are submitted.
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const HOSTS = ['defaultstackr.nl', 'defaultstackr.online'];
const PARTNERS = ['https://www.codedbydefault.com', 'https://www.cloudflare.com', 'https://stripe.com'];
async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
(async () => {
  const root = process.cwd();
  const port = await freePort();
  const child = spawn(process.execPath, ['.next/standalone/server.js'], {
    cwd: root, env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' }, stdio: 'ignore',
  });
  let browser;
  const local = async (host, path = '/') => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { Host: host, 'X-Forwarded-Host': host }, redirect: 'manual',
    });
    return { status: response.status, headers: response.headers, body: await response.text() };
  };
  try {
    let ready = false;
    for (let index = 0; index < 60; index++) {
      try { if ((await local(HOSTS[0], '/healthz')).status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'standalone starts');
    const visited = new Set();
    for (const host of HOSTS) {
      const en = host.endsWith('.online');
      const language = en ? 'en' : 'nl';
      const pages = ['/', '/prijzen', '/pricing', '/privacy', '/voorwaarden', '/terms'];
      for (const path of pages) {
        const result = await local(host, path);
        assert.equal(result.status, 200, `${host}${path}`);
        assert(result.body.includes(`<html lang="${language}"`));
        assert(result.body.includes(`<main class="${path === '/' ? 'landing' : /prijzen|pricing/.test(path) ? 'pricing-page' : 'legal-page'}" lang="${language}"`));
        assert(!result.body.includes('Your entire stack.'), 'retired English layout is absent');
        for (const partner of PARTNERS) assert(result.body.includes(`href="${partner}"`), `footer links to ${partner}`);
        if (path === '/') {
          assert(result.body.includes(en ? 'Build freely.' : 'Bouw vrij.'));
          for (const anchor of ['platform', 'werkwijze', 'voortgang', 'reviews', 'vision', 'progress', 'contact']) assert(result.body.includes(`id="${anchor}"`), `anchor ${anchor} exists`);
        }
        if (path === '/privacy') assert(result.body.includes(en ? 'Privacy policy' : 'Privacyverklaring'));
        if (path === '/terms' || path === '/voorwaarden') assert(result.body.includes(en ? 'Terms and conditions' : 'Algemene voorwaarden'));
        // Crawl all linked local content pages, including relative legacy aliases.
        for (const match of result.body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
          const href = match[1].replaceAll('&amp;', '&');
          assert(href && href !== '#' && !href.startsWith('javascript:'), `real link: ${href}`);
          const url = new URL(href, `https://${host}${path}`);
          if (url.protocol === 'mailto:') continue;
          if (!['defaultstackr.nl','defaultstackr.online','defaultstackr.cloud','www.defaultstackr.cloud'].includes(url.hostname)) continue;
          if (url.pathname.startsWith('/api/')) continue; // Auth flows are covered by the existing GitHub tests.
          const key = url.hostname + url.pathname + url.search;
          if (visited.has(key)) continue;
          visited.add(key);
          const linked = await local(url.hostname, url.pathname + url.search);
          assert(linked.status >= 200 && linked.status < 400, `${key}: ${linked.status}`);
          if (url.hash && url.hostname === host && linked.status === 200) {
            assert(linked.body.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `target exists: ${url.href}`);
          }
        }
      }
      const sitemap = await local(host, '/sitemap.xml');
      assert.equal(sitemap.status, 200);
      assert(sitemap.body.includes(`https://${host}/`));
      assert(!sitemap.body.includes(en ? 'https://defaultstackr.nl' : 'https://defaultstackr.online'));
      const robots = await local(host, '/robots.txt');
      assert(robots.body.includes(`Sitemap: https://${host}/sitemap.xml`));
      console.log('PASS: same current design, translated public pages, footer and real navigation:', host);
    }
    assert((await local('defaultstackr.online.evil.test')).body.includes('Bouw vrij.'));
    for (const host of ['defaultstackr.cloud','www.defaultstackr.cloud','app.defaultstackr.cloud']) {
      const result = await local(host);
      assert.equal(result.status, 307); assert.equal(result.headers.get('location'), '/app');
    }
    assert((await local('defaultstackr.cloud','/robots.txt')).body.includes('Disallow: /'));
    const register = await local('defaultstackr.cloud','/app/login?mode=register');
    assert.equal(register.status, 200); assert(register.body.includes('Account aanmaken'));
    console.log('PASS: administration redirect, account creation destination and domain-specific SEO');
    if (process.argv.includes('--browser')) {
      const { chromium } = require(process.env.BILLING_PLAYWRIGHT_MODULE || 'playwright');
      browser = await chromium.launch({ headless: true, executablePath: process.env.BILLING_CHROME_EXECUTABLE,
        args: ['--no-proxy-server', '--host-resolver-rules=MAP defaultstackr.online 127.0.0.1, MAP defaultstackr.nl 127.0.0.1'] });
      const page = await browser.newPage();
      await page.route('https://defaultstackr.cloud/api/reviews', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"reviews":[]}' }));
      for (const host of HOSTS) {
        const en = host.endsWith('.online');
        for (const width of [320,768,1024,1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`http://${host}:${port}`, { waitUntil: 'networkidle' });
          assert.equal(await page.locator('html').getAttribute('lang'), en ? 'en' : 'nl');
          assert.equal(await page.locator('body').evaluate(element => element.scrollWidth <= innerWidth), true, `${host} at ${width}`);
          assert.equal(await page.locator('.landing-feature').count(), 3);
          await page.getByRole('tab',{name:'Code',exact:true}).focus();
          await page.keyboard.press('ArrowRight');
          assert((await page.locator('#workbench-panel').innerText()).includes('CREATE TABLE'));
          if (width === 320) {
            await page.locator('.responsive-nav > summary').click();
            assert.equal(await page.locator('.responsive-nav nav').isVisible(), true);
            assert.equal(await page.locator('.responsive-nav select').inputValue(), en ? 'en' : 'nl');
          }
          await page.screenshot({ path: `/tmp/defaultstackr-${en ? 'en' : 'nl'}-${width}.png`, fullPage: true });
        }
      }
      await page.goto(`http://defaultstackr.online:${port}/pricing`,{waitUntil:'networkidle'});
      await page.getByRole('button',{name:/Yearly/}).click();
      assert((await page.locator('.pricing-card.pro').innerText()).includes('290'));
      await page.getByLabel('Active projects',{exact:true}).fill('12');
      await page.getByLabel('Database storage (GB)',{exact:true}).fill('6');
      assert((await page.locator('.business-calculator > strong').innerText()).includes('12'));
      console.log('PASS: real Chromium, both languages, matching layouts, mobile menus, keyboard tabs and pricing calculator');
    }
    fs.writeFileSync('/tmp/defaultstackr-public-links.json',JSON.stringify({checkedNavigation:[...visited],footer:PARTNERS},null,2));
  } finally {
    if (browser) await browser.close();
    child.kill('SIGTERM');
    await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
