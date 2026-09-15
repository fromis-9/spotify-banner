# spotifybanner.com

**spotifybanner.com** retrieves Spotify artist banners and profile images, plus album, track, and playlist cover artwork.

## Artwork extraction

One input accepts public artist, album, track, and playlist links (including localized URLs and Spotify URIs).

- Album, track, and playlist covers: ordinary HTTPS requests read page metadata. These paths never launch a browser.
- Artist banners: Puppeteer/Browserless reads the desktop page by default. Banner and profile photos have distinct labels. Known artist-photo renditions are consolidated using their asset ID and actual image dimensions; the largest found is retained.
- The mobile selector is retained behind `REACT_APP_ENABLE_ARTIST_VIEW_SELECTOR=true` (off by default). Set it in the client build environment and restart/rebuild to restore the control. Both backend extraction modes remain available.
- Images download directly from allowlisted Spotify image hosts; downloading does not open another browser.
- The client displays actual dimensions after each preview loads, plus format and download controls.
- Results are cached in memory for six hours. Concurrent identical requests share one extraction. Failed or partial requests have a one-minute cooldown.
- Cached image files are cleaned up after 24 hours. Image variants are limited to those actually found; no unverified upscaling promises.

### Browser cost controls

The default limit reserves 20 units/day and 600/month, at two units per attempted browser connection. Only one browser runs at a time and sessions close after 40 seconds. Failed attempts still count. Set either `BROWSER_DAILY_UNIT_LIMIT` or `BROWSER_MONTHLY_UNIT_LIMIT` to `0` to stop browser use while leaving covers working.

The ledger defaults to `server/.cache/browser-budget.json`. **Set `ARTWORK_CACHE_DIR` to a persistent volume in production**; ephemeral storage can lose the ledger on redeployment. These controls assume one server process. Multiple replicas require a shared atomic budget store. Provider charges, connection failures, proxies, and other applications using the same account are outside this local counter: also set provider-side spending controls and monitor actual usage. No proxy or CAPTCHA services are enabled by this implementation.

See `server/.env.example`. Supply environment variables through your host or shell; `.env` files are not loaded automatically. `PUPPETEER_EXECUTABLE_PATH` can point to an installed Chrome for local tests. The production client continues to target the existing Render backend, so deploy the updated backend before releasing the frontend.

### Validation

```sh
cd server
node --test artwork.test.js
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

3. Set up environment variables
   ```
   # Create a .env file in the server directory
   BROWSERLESS_TOKEN=your_token_here  # Optional, for production use
   ```

4. Start the development servers
   ```
   # Start the backend server
   cd server
   npm start

   # In a separate terminal, start the frontend
   cd client
   npm start
   ```

5. Open your browser to `http://localhost:3000`

## Technology Stack

- **Frontend**: React, CSS
- **Backend**: Node.js, Express
- **Data extraction**: Puppeteer and Browserless.io
- **Deployment**: Render (frontend and backend)

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
