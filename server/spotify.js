const puppeteer = require('puppeteer');
const fs = require("fs").promises;
const path = require("path");

function normalizeSpotifyImageCdnUrl(imageUrl, { desiredWidth } = {}) {
  try {
    const url = new URL(imageUrl);

    // Some Spotify pages reference the image via this host, which can serve
    // a transformed/cropped variant. Prefer the direct image CDN host.
    if (url.hostname === 'image-cdn-ak.spotifycdn.com') {
      url.hostname = 'i2o.scdn.co';
    }

    // Normalize i.scdn.co to i2o.scdn.co for consistency
    if (url.hostname === 'i.scdn.co') {
      url.hostname = 'i2o.scdn.co';
    }

    // Ask for a larger width when the CDN supports it; this often yields the
    // full-resolution banner instead of a cropped/downsized variant.
    if (desiredWidth && !url.searchParams.has('imwidth')) {
      url.searchParams.set('imwidth', String(desiredWidth));
    }

    return url.toString();
  } catch {
    return imageUrl;
  }
}

function extensionFromContentType(contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/avif')) return 'avif';
  return 'jpg';
}

async function ensureImagesDir() {
  const imagesDir = path.join(__dirname, "images");
  try {
    await fs.mkdir(imagesDir, { recursive: true });
    console.log("Images directory is ready");
  } catch (err) {
    if (err.code !== "EEXIST") {
      console.error("Error creating images directory:", err);
      throw err;
    }
  }
}

/**
 * Normalizes Spotify artist URLs to a canonical web form
 * Supports inputs like:
 * - https://open.spotify.com/intl-es/artist/{id}
 * - https://open.spotify.com/artist/{id}
 * - spotify:artist:{id}
 * Returns: https://open.spotify.com/artist/{id}
 */
function normalizeArtistUrl(artistUrl) {
  try {
    if (!artistUrl) return '';

    const trimmed = String(artistUrl).trim();

    // Handle spotify:artist:{id}
    const uriMatch = trimmed.match(/^spotify:artist:([a-zA-Z0-9]+)$/);
    if (uriMatch) {
      return `https://open.spotify.com/artist/${uriMatch[1]}`;
    }

    // Attempt to parse as URL
    let url;
    try {
      url = new URL(trimmed);
    } catch (_) {
      // If it lacks protocol, try adding https://
      try {
        url = new URL(`https://${trimmed}`);
      } catch (__) {
        return '';
      }
    }

    if (!url.hostname.endsWith('spotify.com')) return '';

    // Remove any locale segment like /intl-es/ or /intl-en/
    const cleanedPath = url.pathname.replace(/^\/intl-[a-zA-Z-]+\//, '/');

    // Expect /artist/{id}
    const match = cleanedPath.match(/\/artist\/([a-zA-Z0-9]+)/);
    if (!match) return '';

    const artistId = match[1];
    return `https://open.spotify.com/artist/${artistId}`;
  } catch (err) {
    return '';
  }
}

/**
 * Extracts artist ID from the Spotify URL (normalized or raw)
 * @param {string} artistUrl - The Spotify artist URL
 * @returns {string} - The artist ID or a fallback
 */
function extractArtistId(artistUrl) {
  try {
    const normalized = normalizeArtistUrl(artistUrl) || artistUrl;
    const urlParts = normalized.split('/');
    let artistId = urlParts[urlParts.length - 1];
    artistId = artistId.split('?')[0];
    return artistId;
  } catch (error) {
    console.error('Error extracting artist ID:', error);
    // generate a timestamp-based fallback ID
    return `unknown-artist-${Date.now()}`;
  }
}

/**
 * Extracts the banner image URL from a Spotify artist page
 * @param {string} artistUrl - The Spotify artist URL
 * @param {string} deviceType - 'desktop' or 'mobile'
 * @returns {Promise<string|null>} - The banner image URL or null if not found
 */
async function extractArtistBanner(artistUrl, deviceType = 'desktop') {
  const normalizedUrl = normalizeArtistUrl(artistUrl);
  console.log(`Starting extraction for: ${normalizedUrl || artistUrl} (${deviceType} version)`);
  
  const artistIdMatch = artistUrl.match(/artist\/([a-zA-Z0-9]+)/);
  const artistId = artistIdMatch ? artistIdMatch[1] : null;
  
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  
  let browser;
  
  if (browserlessToken) {
    console.log('Using Browserless.io for extraction');
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`
    });
  } else {
    console.log('Using local Puppeteer for development');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
  }

  try {
    const page = await browser.newPage();
    
    // Set user agent based on device type
    if (deviceType === 'mobile') {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
      await page.setViewport({ width: 375, height: 812 });
    } else {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
    }
    
    console.log('Navigating to artist page...');
    await page.goto(normalizedUrl || artistUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(2000);
    
    // Try to extract the banner from DOM
    console.log('Extracting banner from DOM...');
    const bannerUrl = await page.evaluate((deviceType) => {
      // Helper function to extract URL from background-image style
      function extractUrlFromStyle(style) {
        if (!style) return null;

        // Spotify often uses image-set(...) or multiple url(...) entries.
        // Pull all url(...) occurrences and prefer the last/highest-res.
        const urlMatches = Array.from(style.matchAll(/url\(['"]?(.*?)['"]?\)/g)).map(m => m[1]).filter(Boolean);
        if (urlMatches.length > 0) return urlMatches[urlMatches.length - 1];

        return null;
      }

      // Helper: prefer highest-res candidate from an <img> (srcset if present)
      function bestImageCandidate(img) {
        if (!img) return null;

        const srcset = img.getAttribute && img.getAttribute('srcset');
        if (srcset) {
          // Example: "https://... 640w, https://... 1280w" OR "... 1x, ... 2x"
          const candidates = srcset
            .split(',')
            .map(s => s.trim())
            .map(entry => {
              const parts = entry.split(/\s+/);
              const url = parts[0];
              const descriptor = parts[1] || '';
              let score = 0;
              const w = descriptor.endsWith('w') ? parseFloat(descriptor.slice(0, -1)) : NaN;
              const x = descriptor.endsWith('x') ? parseFloat(descriptor.slice(0, -1)) : NaN;
              if (!Number.isNaN(w)) score = w;
              else if (!Number.isNaN(x)) score = x * 10000;
              return { url, score };
            })
            .filter(c => c.url);

          if (candidates.length) {
            candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
            return candidates[0].url;
          }
        }

        // currentSrc can be helpful, but it may be a lower-res choice; use it as fallback.
        return img.currentSrc || img.src || null;
      }
      
      // Mobile-specific logic
      if (deviceType === 'mobile') {
        const allImages = Array.from(document.querySelectorAll('img'));
        const mobileImages = allImages.filter(img => 
          img.src && (
            img.src.includes('ab67616100005174') || // Mobile square format
            img.src.includes('i.scdn.co') // Mobile CDN
          )
        );
        
        if (mobileImages.length > 0) {
          // Sort by size and return largest mobile image
          const sortedMobile = mobileImages.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return (rectB.width * rectB.height) - (rectA.width * rectA.height);
          });
          return bestImageCandidate(sortedMobile[0]);
        }
      }
      
      // Original desktop logic (and fallback for mobile)
      // Strategy 1: Look for background-image element
      const backgroundImage = document.querySelector('div[data-testid="background-image"]');
      if (backgroundImage) {
        const style = window.getComputedStyle(backgroundImage).backgroundImage;
        if (style && style !== 'none') {
          return extractUrlFromStyle(style);
        }
      }
      
      // Strategy 2: Look for entity image
      const entityImage = document.querySelector('div[data-testid="entity-image"]');
      if (entityImage) {
        const img = entityImage.querySelector('img');
        if (img) {
          const best = bestImageCandidate(img);
          if (best) return best;
        }
        
        const style = window.getComputedStyle(entityImage).backgroundImage;
        if (style && style !== 'none') {
          return extractUrlFromStyle(style);
        }
      }
      
      // Strategy 3: Find any image with "ab67618600000194" pattern (Spotify's artist image format)
      const allBackgroundElements = Array.from(document.querySelectorAll('*'));
      for (const el of allBackgroundElements) {
        const bgStyle = window.getComputedStyle(el).backgroundImage;
        if (bgStyle && bgStyle !== 'none' && bgStyle.includes('ab67618600000194')) {
          return extractUrlFromStyle(bgStyle);
        }
      }
      
      // Strategy 4: Look for large images
      const allImages = Array.from(document.querySelectorAll('img'));
      const possibleBanners = allImages
        .filter(img => {
          if (!img.src) return false;
          const rect = img.getBoundingClientRect();
          return rect.width > 200 && rect.height > 200;
        })
        .sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return (rectB.width * rectB.height) - (rectA.width * rectA.height);
        });
      
      return possibleBanners.length > 0 ? bestImageCandidate(possibleBanners[0]) : null;
    }, deviceType);
    
    // Close browser before returning
    await browser.close();
    console.log('Browser connection closed');
    
    if (bannerUrl) {
      console.log('Banner found:', bannerUrl);
      return bannerUrl;
    } else {
      console.log('No banner found in DOM for this artist');
      return null;
    }
  } catch (error) {
    console.error('Error extracting banner:', error);
    if (browser) await browser.close();
    return null;
  }
}

/**
 * Downloads the banner image to the server
 * Also using Browserless for downloading
 */
async function downloadBannerImage(imageUrl, artistId, deviceType = 'desktop') {
  let browser;
  try {
    await ensureImagesDir();
    
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    
    if (browserlessToken) {
      console.log('Using Browserless.io for image download');
      browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`
    });
    } else {
      console.log('Using local Puppeteer for image download');
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
    }
    
    const page = await browser.newPage();
    
    // Prefer a stable CDN host + force a JPEG response when possible to avoid
    // saving WebP bytes under a .jpg filename (causes broken/partial renders).
    const normalizedImageUrl = normalizeSpotifyImageCdnUrl(imageUrl, { desiredWidth: 2400 });
    await page.setExtraHTTPHeaders({
      // Keep this minimal; Spotify will still return an image/* response.
      accept: 'image/jpeg,image/*;q=0.8,*/*;q=0.5'
    });

    console.log(`Downloading image from: ${normalizedImageUrl}`);
    
    const response = await page.goto(normalizedImageUrl);
    if (!response) {
      throw new Error('No response received while downloading banner image');
    }
    const contentType = response?.headers?.()['content-type'];
    console.log(`Downloaded content-type: ${contentType || 'unknown'}`);
    const extension = extensionFromContentType(contentType);
    const filename = `${artistId}_${deviceType}_banner.${extension}`;
    const filePath = path.join(__dirname, 'images', filename);
    
    const imageBuffer = await response.buffer();
    
    await fs.writeFile(filePath, imageBuffer);
    console.log(`Banner saved to: ${filePath}`);
    
    return filename;
  } catch (error) {
    console.error('Error downloading banner image:', error);
    return null;
  } finally {
    try {
      if (browser) await browser.close();
    } catch (_) {
      // ignore close errors
    }
  }
}

async function processArtistUrl(artistUrl, deviceType = 'desktop') {
  try {
    const normalizedUrl = normalizeArtistUrl(artistUrl);
    if (!normalizedUrl) {
      return {
        success: false,
        error: "Invalid Spotify artist URL"
      };
    }

    // Extract the banner URL
    const bannerUrl = await extractArtistBanner(normalizedUrl, deviceType);
    if (!bannerUrl) {
      return {
        success: false,
        error: "Could not find a banner image on this artist page"
      };
    }

    // Extract artist ID from URL for filename
    const artistId = extractArtistId(normalizedUrl);

    // Download the banner image
    const filename = await downloadBannerImage(bannerUrl, artistId, deviceType);
    if (!filename) {
      return {
        success: false,
        error: "Failed to download the banner image"
      };
    }

    return {
      success: true,
      data: {
        artistUrl: normalizedUrl,
        bannerUrl: normalizeSpotifyImageCdnUrl(bannerUrl),
        imagePath: `/images/${filename}`,
        artistId,
        deviceType
      }
    };
  } catch (error) {
    console.error("Error processing artist URL:", error);
    return {
      success: false,
      error: `An unexpected error occurred: ${error.message}`
    };
  }
}

module.exports = {
  processArtistUrl,
  extractArtistBanner,
  downloadBannerImage
};