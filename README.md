# spotifybanner.com

**spotifybanner.com** retrieves Spotify artist banners and profile images, plus album, track, and playlist cover artwork.

## Artwork extraction

One input accepts public artist, album, track, and playlist links (including localized URLs and Spotify URIs).

- Album, track, and playlist covers: ordinary HTTPS requests read page metadata. These paths never launch a browser.
- Artist banners: Puppeteer/Browserless reads the desktop page by default. Banner and profile photos have distinct labels. Known artist-photo renditions are consolidated using their asset ID and actual image dimensions; the largest found is retained.
- The mobile selector is retained behind `REACT_APP_ENABLE_ARTIST_VIEW_SELECTOR=true` (off by default). Set it in the client build environment and restart/rebuild to restore the control. Both backend extraction modes remain available.
- Images download directly from allowlisted Spotify image hosts; downloading does not open another browser.
- Artist results show the profile photo first, then the banner.
- The client displays actual dimensions after each preview loads, plus format and individual download controls.
- Copy image link copies the original Spotify image URL, with a selectable fallback if clipboard access fails. This avoids the site's temporary cache URL, but Spotify can still change or remove the source image.
- Download all images creates one ZIP from the images already returned for a single link. It does not launch another browser or accept batches of Spotify links.
- A Buy Me a Coffee link appears below results and in the footer.
- Name search and bulk-link extraction are not implemented; paste one Spotify link at a time.
- Results are cached in memory for six hours. Concurrent identical requests share one extraction. Failed or partial requests have a one-minute cooldown.
- Cached image files are cleaned up after 24 hours. Image variants are limited to those actually found; no unverified upscaling promises.

### Browser cost controls

The default limit reserves 20 units/day and 600/month, at two units per attempted browser connection. Only one browser runs at a time and sessions close after 40 seconds. Failed attempts still count. Set either `BROWSER_DAILY_UNIT_LIMIT` or `BROWSER_MONTHLY_UNIT_LIMIT` to `0` to stop browser use while leaving covers working.

The ledger defaults to `server/.cache/browser-budget.json`. The tool can run without persistent storage, but its own usage counter can reset when the host discards local files on restart, sleep, or deployment. To preserve that counter, set `ARTWORK_CACHE_DIR` to a directory on an actual persistent volume; setting a directory name alone does not make storage persistent. These controls assume one server process. Multiple replicas require a shared atomic budget store. This is an application-level allowance, not a live reading of your Browserless account balance. Monitor provider usage and plan limits separately, especially when other applications use the same account. No proxy or CAPTCHA services are enabled by this implementation.

See `server/.env.example`. Supply environment variables through your host or shell; `.env` files are not loaded automatically. `PUPPETEER_EXECUTABLE_PATH` can point to an installed Chrome for local tests. The production client continues to target the existing Render backend, so deploy the updated backend before releasing the frontend.

### Extraction rate limit

Both `/api/extractartwork` and the legacy `/api/extractbanner` share a limit of **5 requests per 10 minutes per IP** (IPv6 addresses are grouped by /56). Invalid requests reaching these handlers also count. Blocked requests receive HTTP 429, a JSON error, and `Retry-After`; they never reach the extractor. Cached image downloads and health checks are unaffected. Counters are temporary, in-memory, and reset on process restarts. This slows repeated requests; it does not replace the persistent browser budget or protect against clients using many networks.

`TRUSTED_PROXY_CIDRS` optionally accepts comma-separated addresses/CIDRs of your verified reverse proxies. By default, forwarded IP headers are not trusted. Behind an unconfigured proxy, requests can share a single limit; configure the actual hosting proxy addresses before enabling per-visitor limits in production. Do not set broad trust rules to accept user-supplied forwarded IPs. Run one instance; multiple instances need shared rate-limit and budget storage.

The browser ledger uses an exclusive lock file to prevent overlapping reservations by processes sharing that file. A process crash can leave a `.lock` file and pause banner extraction; remove that lock only after confirming the previous browser/process has stopped. A missing or corrupt storage mount is not a substitute for persistent storage, and separate replica disks do not share this lock. Daily and monthly counters use UTC calendar periods, not the provider's billing cycle.

### Validation

```sh
cd server
node --test artwork.test.js extraction-limit.test.js
cd ../client
CI=true npm test -- --watchAll=false
npm run build
```

## Examples

Here are some examples of banners extracted using SpotifyBanner:

| Artist         | Banner |
|----------------|--------|
| Olivia Rodrigo | ![Olivia Rodrigo](https://image-cdn-ak.spotifycdn.com/image/ab67618600000194b9e08cd875ff2a0f8ad0c334) |
| Taylor Swift   | ![Taylor Swift](https://image-cdn-ak.spotifycdn.com/image/ab67618600000194632d765bdc111e40acbfab19) |
| The Weeknd     | ![The Weeknd](https://image-cdn-fa.spotifycdn.com/image/ab6761860000019406f7730314d8eff6663d6918) |

## Getting Started

### Using the Live Site

Visit [spotifybanner.com](https://spotifybanner.com) to use the tool right away!

### Running Locally

If you want to run spotifybanner on your local machine:

1. Clone the repository
   ```
   git clone https://github.com/fromis-9/spotify-banner.git
   cd spotify-banner
   ```

2. Install dependencies
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Configure the backend environment in the terminal used to start it. See [server/.env.example](server/.env.example) for available settings. The server does **not** load `.env` files automatically.

   For local extraction, Puppeteer uses its installed browser. If needed, point it to your Chrome installation:
   ```sh
   export PUPPETEER_EXECUTABLE_PATH="/path/to/chrome"
   ```

   To use Browserless instead, set `BROWSERLESS_TOKEN` in that terminal or your hosting environment. Keep the actual token out of committed files. Without Browserless or a working local browser, ordinary cover requests can still work, but banner extraction cannot.

4. Open two terminals at the repository root.

   Backend (default port 5001):
   ```sh
   cd server
   npm start
   ```

   Frontend (default port 3000), in the second terminal:
   ```sh
   cd client
   npm start
   ```

5. Open your browser to `http://localhost:3000`

## Technology Stack

- **Frontend**: React, CSS
- **Backend**: Node.js, Express
- **Data extraction**: HTTPS page metadata; Puppeteer/Browserless for artist banners
- **ZIP downloads**: fflate in the browser
- **Deployment configuration**: Vercel frontend (`vercel.json`); the client targets the Render backend in `client/src/config.js`

## Usage Notes

- This tool is designed for personal use
- Please respect Spotify's terms of service
- Banner images are copyright of the respective artists and labels
- See the legal page on the site for full terms and disclaimers

## Development

spotifybanner.com was created because there was no easy way to extract these banner images without using browser developer tools. It's built to be simple and useful.

## License

This project is licensed under the GPLv3 License - see the [LICENSE](LICENSE) file for details.

Not affiliated with Spotify

---

Made with ❤️ by @corinthians
