const puppeteer = require('puppeteer');
const { isSpotifyPage } = require('./artwork-network');

// Preserve the existing desktop/mobile discovery strategies, but label fallbacks honestly.
function findArtistImages() {
  const images = [];
  const add = (url, label) => { if (url && !images.some(i => i.url === url)) images.push({url, label}); };
  const background = element => {
    const style = element && window.getComputedStyle(element).backgroundImage;
    return style ? Array.from(style.matchAll(/url\(['"]?(.*?)['"]?\)/g), m => m[1]) : [];
  };
  const best = img => {
    const entries = (img?.getAttribute('srcset') || '').split(',').map(s => s.trim().split(/\s+/)).filter(([url]) => url);
    entries.sort((a,b) => (parseFloat(b[1]) || 0) - (parseFloat(a[1]) || 0));
    return entries[0]?.[0] || img?.currentSrc || img?.src;
  };
  const primary = document.querySelector('[data-testid="background-image"]');
  background(primary).forEach(url => add(url, 'artist banner'));
  if (!images.length) {
    for (const element of document.querySelectorAll('main div, [role="main"] div')) {
      background(element).filter(url => url.includes('ab67618600000194')).forEach(url => add(url, 'artist banner'));
      if (images.length) break;
    }
  }
  const entity = document.querySelector('[data-testid="entity-image"]');
  if (entity) {
    add(best(entity.matches('img') ? entity : entity.querySelector('img')), 'artist image');
    background(entity).forEach(url => add(url, 'artist image'));
  }
  add(document.querySelector('meta[property="og:image"]')?.content, 'profile photo');
  // Mobile artist portraits may be rendered separately from the entity image.
  if (!images.length) {
    const candidates = Array.from(document.querySelectorAll('main img, [role="main"] img')).filter(img => img.src.includes('ab676161')).sort((a,b) => b.width*b.height-a.width*a.height);
    add(best(candidates[0]), 'profile photo');
  }
  return images;
}
async function extractBannerImages(url, deviceType) {
  let browser; let timer;
  try {
    const options = process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {};
    browser = process.env.BROWSERLESS_TOKEN
      ? await puppeteer.connect({ browserWSEndpoint: `wss://chrome.browserless.io?token=${encodeURIComponent(process.env.BROWSERLESS_TOKEN)}` })
      : await puppeteer.launch({ headless: 'new', ...options, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
    // Close within the reserved two units; no retries or image-download browsers.
    timer = setTimeout(() => browser.close().catch(() => {}), 40000);
    const page = await browser.newPage();
    await page.setUserAgent(deviceType === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.setViewport(deviceType === 'mobile' ? {width:375,height:812} : {width:1920,height:1080});
    await page.setRequestInterception(true);
    page.on('request', req => {
      if ((req.isNavigationRequest() && req.frame() === page.mainFrame() && !isSpotifyPage(req.url())) || ['media','font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    const response = await page.goto(url, {waitUntil:'networkidle2',timeout:25000});
    if (!response || response.status() >= 400) throw new Error('Spotify artist page unavailable.');
    await page.waitForSelector('[data-testid="background-image"], [data-testid="entity-image"]', {timeout:5000}).catch(() => {});
    return await page.evaluate(findArtistImages);
  } finally {
    clearTimeout(timer);
    if (browser) await browser.close().catch(() => {});
  }
}
module.exports = { extractBannerImages, findArtistImages };
