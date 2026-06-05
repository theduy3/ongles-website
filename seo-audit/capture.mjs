import { chromium, devices } from 'playwright';

const OUT = '/Users/theduy/Repo/maily-website/seo-audit/screenshots';

const targets = [
  { url: 'http://localhost:3200/fr', name: 'fr-home' },
  { url: 'http://localhost:3200/fr/services/pose-d-ongles', name: 'fr-service-pose-ongles' },
  { url: 'http://localhost:3200/fr/contact', name: 'fr-contact' },
];

// Desktop 1280 wide, mobile 390 wide (iPhone-class)
const viewports = [
  { label: 'desktop', width: 1280, height: 900, isMobile: false, dsf: 1 },
  { label: 'mobile', width: 390, height: 844, isMobile: true, dsf: 3 },
];

const results = [];

const browser = await chromium.launch();
try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      userAgent: vp.isMobile
        ? devices['iPhone 13']?.userAgent
        : undefined,
    });
    const page = await context.newPage();
    for (const t of targets) {
      const file = `${OUT}/${t.name}-${vp.label}.png`;
      const resp = await page.goto(t.url, { waitUntil: 'networkidle', timeout: 30000 });
      // give fonts/lazy assets a moment
      await page.waitForTimeout(800);
      // above-the-fold capture (clip to viewport)
      await page.screenshot({ path: file, fullPage: false });

      // collect diagnostics: horizontal overflow, broken images, h1, viewport meta
      const diag = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const imgs = Array.from(document.images);
        const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).length;
        const noDims = imgs.filter(i => !i.getAttribute('width') && !i.getAttribute('height') && !(i.style && (i.style.aspectRatio || i.closest('[style*="aspect"]')))).length;
        const h1 = document.querySelector('h1');
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;
        const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null;
        return {
          docW, winW,
          horizontalOverflow: docW > winW + 1,
          overflowBy: docW - winW,
          imgCount: imgs.length,
          brokenImgs: broken,
          imgsNoDims: noDims,
          h1Text: h1 ? h1.textContent.trim().slice(0, 120) : null,
          h1TopPx: h1Rect ? Math.round(h1Rect.top) : null,
          h1Visible: h1Rect ? (h1Rect.top < window.innerHeight && h1Rect.bottom > 0) : false,
          viewportMeta,
        };
      });
      results.push({ page: t.name, vp: vp.label, file, ...diag });
      console.log(`saved ${file}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log('\n=== DIAGNOSTICS ===');
console.log(JSON.stringify(results, null, 2));
