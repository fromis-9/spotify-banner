// client/src/components/SearchForm.js
import React, { useState } from 'react';
import './SearchForm.css';
import config from '../config';

function SearchForm({ onSubmit, isLoading }) {
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [deviceType, setDeviceType] = useState('desktop');
  
  const isArtist = /(?:\/artist\/|^spotify:artist:)/.test(spotifyUrl.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (spotifyUrl.trim()) {
      onSubmit(spotifyUrl, config.features.artistViewSelector && isArtist ? deviceType : 'desktop');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="search-form" aria-busy={isLoading}>
      <div className="form-section">
        <label htmlFor="spotifyUrl" className="form-label">spotify link</label>
        <input
          type="text"
          id="spotifyUrl"
          className="url-input"
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          placeholder="https://open.spotify.com/artist/1McMsnEElThX1knmY4oliG"
          disabled={isLoading}
          aria-describedby="supported-links"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <p className="form-hint" id="supported-links">artist · album · track · playlist</p>
      </div>
      
      {config.features.artistViewSelector && isArtist && <div className="form-section">
        <span id="device-label" className="form-label">device type</span>
        <div className="device-selector" role="group" aria-labelledby="device-label">
          <button
            type="button"
            className={`device-toggle ${deviceType === 'desktop' ? 'active' : ''}`}
            onClick={() => setDeviceType('desktop')}
            aria-pressed={deviceType === 'desktop'}
            disabled={isLoading}
          >
            desktop
          </button>
          <button
            type="button"
            className={`device-toggle ${deviceType === 'mobile' ? 'active' : ''}`}
            onClick={() => setDeviceType('mobile')}
            aria-pressed={deviceType === 'mobile'}
            disabled={isLoading}
          >
            mobile
          </button>
        </div>
      </div>}
      
      <button 
        type="submit" 
        className="submit-btn"
        disabled={isLoading || !spotifyUrl.trim()}
      >
        {isLoading ? 'extracting...' : 'get artwork'}
      </button>
    </form>
  );
}

export default SearchForm;