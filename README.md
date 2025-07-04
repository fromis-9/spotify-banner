# spotifybanner.com

**spotifybanner.com** is a simple, fast web application that extracts high-quality banner images from Spotify artist pages with a single click.

## Why spotifybanner.com?

Finding high-resolution artist banners from Spotify can be time-consuming and technical, often requiring you to inspect page elements or use developer tools. spotifybanner.com makes this process effortless:

1. Paste any Spotify artist URL
2. Click "Extract Banner"
3. Download the high-quality banner image

## Features

- **High-Quality Images**: Extracts the largest, highest resolution banner available
- **Fast Processing**: Banner extraction takes just seconds
- **Direct Download**: Save images with a single click
- **Mobile-Friendly**: Works on all devices, from desktop to mobile

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
