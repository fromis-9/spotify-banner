const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { requestBuffer, readMetadata, isSpotifyImage } = require('./artwork-network');
const { extractBannerImages } = require('./banner-browser');
const { createBrowserBudget } = require('./browser-budget');
const { imageDimensions, consolidateArtistImages } = require('./artwork-images');

const TYPES = new Set(['artist','album','track','playlist']);
function parseSpotifyUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  let value = input.trim();
  const uri = value.match(/^spotify:([a-z]+):([a-zA-Z0-9]+)$/);
  if (uri) value = `https://open.spotify.com/${uri[1]}/${uri[2]}`;
  try {
    const u = new URL(value.startsWith('open.spotify.com/') ? `https://${value}` : value);
    if (u.hostname !== 'open.spotify.com' || u.protocol !== 'https:' || u.port || u.username || u.password) return null;
    const m = u.pathname.match(/^\/(?:intl-[a-zA-Z-]+\/)?([a-z]+)\/([a-zA-Z0-9]{22})\/?$/);
    if (!m || !TYPES.has(m[1])) return null;
    return {type:m[1], id:m[2], url:`https://open.spotify.com/${m[1]}/${m[2]}`};
  } catch { return null; }
}

function createArtworkService({ request = requestBuffer, browser = extractBannerImages, budget = createBrowserBudget(), directory = path.join(__dirname,'images'), now = Date.now, ttl = 6*60*60*1000, maxCache = 200 } = {}) {
  const cache = new Map();
  const pending = new Map();
  const labels = {artist:'profile photo',album:'album cover',track:'track cover',playlist:'playlist cover'};
  async function save(candidate, resource) {
    const response = await request(candidate.url, {allow:isSpotifyImage,maxBytes:12*1024*1024,timeout:12000});
    const mime = (response.headers['content-type'] || '').split(';')[0].toLowerCase();
    const format = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'})[mime];
    if (!format || !response.body.length) throw new Error('Unsupported image response.');
    const hash = crypto.createHash('sha256').update(response.body).digest('hex').slice(0,24);
    const filename = `artwork-${resource.type}-${resource.id}-${hash}.${format}`;
    await fs.mkdir(directory,{recursive:true});
    await fs.writeFile(path.join(directory,filename),response.body);
    return {...imageDimensions(response.body),sourceUrl:candidate.url,label:candidate.label,imagePath:`/images/${filename}`,format,bytes:response.body.length};
  }
  async function extract(resource, deviceType) {
    let metadata = {title:'',description:'',image:''};
    let metadataError;
    try {
      const page = await request(resource.url);
      metadata = readMetadata(page.body.toString('utf8'));
    } catch(error) { metadataError = error; }
    const candidates = [];
    let notice = '';
    if (resource.type === 'artist') {
      try {
        candidates.push(...await budget.run(() => browser(resource.url,deviceType)));
      } catch (error) {
        notice = /usage limit|temporarily paused|extraction is busy/.test(error.message)
          ? error.message : 'The banner could not be checked right now. Available profile artwork is shown below.';
      }
    } else if (metadataError) {
      return {success:false,error:'This Spotify page could not be loaded. Check that the link is public and try again later.'};
    }
    if (isSpotifyImage(metadata.image)) candidates.push({url:metadata.image,label:labels[resource.type]});
    // Prefer the explicit profile label when the same URL also appeared as a generic artist image.
    for (const candidate of candidates) {
      if (candidate.label === 'artist image' && candidates.some(other => other.url === candidate.url && other.label === 'profile photo')) candidate.label = 'profile photo';
    }
    const unique = candidates.filter((c,i,all) => isSpotifyImage(c.url) && all.findIndex(x=>x.url===c.url)===i).slice(0,6);
    if (!unique.length) return {success:false,error:notice ? notice.replace('Available profile artwork is shown below.', 'No profile artwork could be retrieved either.') : 'No artwork was found. Check that the link opens a public Spotify page and try again.'};
    let images = [];
    let failed = 0;
    for (const candidate of unique) {
      try {
        const image = await save(candidate,resource);
        if (!images.some(i=>i.imagePath===image.imagePath)) images.push(image);
      } catch { failed++; }
    }
    if (resource.type === 'artist') images = consolidateArtistImages(images);
    images = images.map(({sourceUrl, ...image}) => image);
    if (!images.length) return {success:false,error:'Artwork was found but could not be downloaded. Please try again later.'};
    if (resource.type === 'artist' && !images.some(i=>i.label==='artist banner') && !notice) notice = 'No separate banner was found. These are the available artist images.';
    if (failed) notice += `${notice ? ' ' : ''}Some images could not be downloaded.`;
    return {success:true,data:{...resource,title:metadata.title || `${resource.type} artwork`,description:metadata.description,deviceType:resource.type==='artist'?deviceType:null,images,notice}};
  }
  async function processSpotifyUrl(input, deviceType = 'desktop') {
    const resource = parseSpotifyUrl(input);
    if (!resource) return {success:false,error:'Paste a full Spotify artist, album, track, or playlist link.'};
    if (!['desktop','mobile'].includes(deviceType)) return {success:false,error:'Choose desktop or mobile.'};
    const key = `${resource.url}:${resource.type==='artist'?deviceType:'cover'}`;
    const stored = cache.get(key);
    if (stored && stored.expires > now()) return stored.result;
    cache.delete(key);
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 10) return {success:false,error:'The service is busy. Please try again shortly.'};
    const work = extract(resource,deviceType).catch(() => ({success:false,error:'The artwork service is temporarily unavailable. Please try again.'})).then(result => {
      const duration = result.success && !result.data.notice ? ttl : 60*1000;
      if (cache.size >= maxCache) cache.delete(cache.keys().next().value);
      cache.set(key,{result,expires:now()+duration});
      return result;
    }).finally(()=>pending.delete(key));
    pending.set(key,work);
    return work;
  }
  // Only remove this extractor's expired files, never unrelated images.
  async function cleanup() {
    const files = await fs.readdir(directory).catch(()=>[]);
    for (const name of files.filter(f=>/^artwork-(artist|album|track|playlist)-[a-zA-Z0-9]{22}-[a-f0-9]{24}\.(jpg|png|webp|avif)$/.test(f))) {
      const full = path.join(directory,name);
      const stat = await fs.stat(full).catch(()=>null);
      if (stat && now()-stat.mtimeMs > 24*60*60*1000) await fs.unlink(full).catch(()=>{});
    }
  }
  return {processSpotifyUrl,cleanup};
}
const service = createArtworkService();
module.exports = {parseSpotifyUrl,createArtworkService,...service};
