const https = require('https');
const zlib = require('zlib');

function isSpotifyImage(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.port && !u.username && !u.password &&
      ['scdn.co', 'spotifycdn.com', 'spotifycdn.net'].some(h => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch { return false; }
}
function isSpotifyPage(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'open.spotify.com' && !u.port && !u.username && !u.password;
  } catch { return false; }
}
// Validate every redirect and bound response size and total request time.
function requestBuffer(url, { allow = isSpotifyPage, maxBytes = 4 * 1024 * 1024, timeout = 12000 } = {}) {
  const deadline = Date.now() + timeout;
  function visit(target, redirects) {
    return new Promise((resolve, reject) => {
      if (!allow(target) || redirects > 3) return reject(new Error('Unsupported image or page address.'));
      const remaining = deadline - Date.now();
      if (remaining <= 0) return reject(new Error('Spotify took too long to respond.'));
      const req = https.get(target, { headers: { 'user-agent': 'Mozilla/5.0', 'accept-encoding': 'identity', accept: '*/*' } }, res => {
        if ([301,302,303,307,308].includes(res.statusCode)) {
          res.resume(); clearTimeout(timer);
          try { resolve(visit(new URL(res.headers.location, target).href, redirects + 1)); } catch (error) { reject(error); }
          return;
        }
        if (res.statusCode !== 200) {
          res.resume(); clearTimeout(timer);
          return reject(new Error(res.statusCode === 429 ? 'Spotify is busy. Please try again later.' : 'This Spotify page or image is unavailable.'));
        }
        const chunks = []; let length = 0;
        res.on('data', chunk => {
          length += chunk.length;
          if (length > maxBytes) req.destroy(new Error('The response is too large.'));
          else chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => {
          clearTimeout(timer);
          try {
            let body = Buffer.concat(chunks);
            const encoding = res.headers['content-encoding'];
            if (encoding === 'gzip') body = zlib.gunzipSync(body, { maxOutputLength: maxBytes });
            else if (encoding === 'br') body = zlib.brotliDecompressSync(body, { maxOutputLength: maxBytes });
            else if (encoding && encoding !== 'identity') throw new Error('Unsupported response encoding.');
            resolve({ body, headers: res.headers, url: target });
          } catch (error) { reject(error); }
        });
      });
      const timer = setTimeout(() => req.destroy(new Error('Spotify took too long to respond.')), remaining);
      req.on('error', error => { clearTimeout(timer); reject(error); });
    });
  }
  return visit(url, 0);
}
function decode(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (all, entity) => {
    if (entity[0] !== '#') return ({ amp:'&', quot:'"', apos:"'", lt:'<', gt:'>' })[entity.toLowerCase()];
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2),16) : parseInt(entity.slice(1),10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
  });
}
function readMetadata(html) {
  const meta = {};
  for (const tag of html.match(/<meta\b(?:[^"'>]|"[^"]*"|'[^']*')*>/gi) || []) {
    const attrs = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4]);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content && !meta[key]) meta[key] = attrs.content;
  }
  return {
    title: (meta['og:title'] || meta['twitter:title'] || '').replace(/\s*\|\s*Spotify\s*$/i, ''),
    description: meta['og:description'] || '',
    image: meta['og:image'] || meta['twitter:image'] || ''
  };
}
module.exports = { requestBuffer, readMetadata, isSpotifyImage, isSpotifyPage };
