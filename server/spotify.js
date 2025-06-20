const puppeteer = require('puppeteer');
const fs = require("fs").promises;
const path = require("path");

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
 * Extracts artist ID from the Spotify URL
 * @param {string} artistUrl - The Spotify artist URL
 * @returns {string} - The artist ID or a fallback
 */
function extractArtistId(artistUrl) {
  try {
    const urlParts = artistUrl.split('/');
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
  console.log(`Starting extraction for: ${artistUrl} (${deviceType} version)`);
  
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
    await page.goto(artistUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(2000);
    
    // Try to extract the banner from DOM
    console.log('Extracting banner from DOM...');
    const bannerUrl = await page.evaluate((deviceType) => {
      // Helper function to extract URL from background-image style
      function extractUrlFromStyle(style) {
        if (!style || !style.includes('url(')) return null;
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : null;
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
          return sortedMobile[0].src;
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
        if (img && img.src) {
          return img.src;
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
      
      return possibleBanners.length > 0 ? possibleBanners[0].src : null;
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
  try {
    await ensureImagesDir();
    
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    
    let browser;
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
    
    // Generate a valid filename - avoid using URL parts in filename
    const extension = 'jpg'; // Default to jpg since most Spotify images are jpg
    const filename = `${artistId}_${deviceType}_banner.${extension}`;
    const filePath = path.join(__dirname, 'images', filename);
    
    console.log(`Downloading image from: ${imageUrl}`);
    
    const response = await page.goto(imageUrl);
    
    const imageBuffer = await response.buffer();
    
    await fs.writeFile(filePath, imageBuffer);
    console.log(`Banner saved to: ${filePath}`);
    
    await browser.close();
    return filename;
  } catch (error) {
    console.error('Error downloading banner image:', error);
    return null;
  }
}

async function processArtistUrl(artistUrl, deviceType = 'desktop') {
  try {
    if (!artistUrl || !artistUrl.includes("open.spotify.com/artist")) {
      return {
        success: false,
        error: "Invalid Spotify artist URL"
      };
    }

    // Extract the banner URL
    const bannerUrl = await extractArtistBanner(artistUrl, deviceType);
    if (!bannerUrl) {
      return {
        success: false,
        error: "Could not find a banner image on this artist page"
      };
    }

    // Extract artist ID from URL for filename
    const artistId = extractArtistId(artistUrl);

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
        artistUrl,
        bannerUrl,
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