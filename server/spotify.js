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
 * Using Browserless.io for browser automation
 * @param {string} artistUrl - The Spotify artist URL
 * @returns {Promise<string|null>} - The banner image URL or null if not found
 */
async function extractArtistBanner(artistUrl) {
  console.log('Starting extraction with Browserless for:', artistUrl);
  
  const artistIdMatch = artistUrl.match(/artist\/([a-zA-Z0-9]+)/);
  const artistId = artistIdMatch ? artistIdMatch[1] : null;
  
  // Get browserless token from environment variable
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  
  if (!browserlessToken) {
    console.error('Missing BROWSERLESS_TOKEN environment variable');
    return null;
  }
  
  let browser;
  try {
    // Connect to Browserless instead of launching local browser
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36');
    
    console.log('Navigating to artist page...');
    await page.goto(artistUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(2000);
    
    // Try to extract the banner from DOM
    console.log('Extracting banner from DOM...');
    const bannerUrl = await page.evaluate(() => {
      // Helper function to extract URL from background-image style
      function extractUrlFromStyle(style) {
        if (!style || !style.includes('url(')) return null;
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : null;
      }
      
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
    });
    
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
async function downloadBannerImage(imageUrl, artistId) {
  try {
    await ensureImagesDir();
    
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    
    if (!browserlessToken) {
      console.error('Missing BROWSERLESS_TOKEN environment variable');
      return null;
    }
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`
    });
    
    const page = await browser.newPage();
    
    // Generate a valid filename - avoid using URL parts in filename
    const extension = 'jpg'; // Default to jpg since most Spotify images are jpg
    const filename = `${artistId}_banner.${extension}`;
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

async function processArtistUrl(artistUrl) {
  try {
    if (!artistUrl || !artistUrl.includes("open.spotify.com/artist")) {
      return {
        success: false,
        error: "Invalid Spotify artist URL"
      };
    }

    // Extract the banner URL
    const bannerUrl = await extractArtistBanner(artistUrl);
    if (!bannerUrl) {
      return {
        success: false,
        error: "Could not find a banner image on this artist page"
      };
    }

    // Extract artist ID from URL for filename
    const artistId = extractArtistId(artistUrl);

    // Download the banner image
    const filename = await downloadBannerImage(bannerUrl, artistId);
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
        artistId
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