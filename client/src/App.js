// client/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import SearchForm from './components/SearchForm';
import BannerDisplay from './components/BannerDisplay';
import InfoSection from './components/InfoSection';
import Legal from './components/Legal';
import Privacy from './components/Privacy';
import config from './config';

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') ||
        (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);
  const themeToggle = (
    <button className="theme-switch" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {theme === 'dark' ? <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
      </svg>
    </button>
  );
  // State to manage the app
  const [bannerData, setBannerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLegal, setShowLegal] = useState(false);

  // Function to handle the API request to extract banner
  const handleExtractArtwork = async (spotifyUrl, deviceType = 'desktop') => {
    // Reset states
    setIsLoading(true);
    setError(null);
    setBannerData(null);

    try {
      // Call the backend API
      const response = await fetch(`${config.apiUrl}/api/extractartwork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spotifyUrl, deviceType }),
      });

      // Parse the response
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Could not retrieve artwork. Please try again.');
      }

      // Set the banner data on success
      setBannerData(result.data);
    } catch (err) {
      console.error('Error extracting banner:', err);
      setError(err.message || 'failed to extract banner');
    } finally {
      setIsLoading(false);
    }
  };

  if (showLegal) {
    const InformationPage = showLegal === 'privacy' ? Privacy : Legal;
    return <>{themeToggle}<InformationPage onBack={() => setShowLegal(false)} /></>;
  }

  return (
    <div className="app">
      {themeToggle}
      <header className="app-header">
        <h1><span className="brand-accent">spotify</span>banner<span>.com</span></h1>
        <nav aria-label="Main navigation">
          <a href="#about">about</a>
          <a className="github-link" href="https://github.com/fromis-9/spotify-banner" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" title="GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </nav>
      </header>
      <p className="subtitle">spotify banners, profile photos & cover artwork</p>

      <main className="app-content">
        <SearchForm
          onSubmit={handleExtractArtwork}
          isLoading={isLoading}
        />

        {error && (
          <div className="error-message" role="alert">
            <p>{error}</p>
          </div>
        )}

        {bannerData && <BannerDisplay data={bannerData} />}

        <InfoSection />
      </main>

      <footer className="app-footer">
        <p>
          not affiliated with spotify | <a href="https://github.com/fromis-9" target="_blank" rel="noopener noreferrer">corinthians</a> | <a href="mailto:me@c-o.dev" title="Report a problem or get in touch">contact</a> | <button className="legal-link" onClick={() => setShowLegal('privacy')}>privacy</button> | <button className="legal-link" onClick={() => setShowLegal(true)}>legal</button>
        </p>
      </footer>
    </div>
  );
}

export default App;
