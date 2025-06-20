// client/src/components/SearchForm.js
import React, { useState } from 'react';
import './SearchForm.css';

function SearchForm({ onSubmit, isLoading }) {
  const [artistUrl, setArtistUrl] = useState('');
  const [deviceType, setDeviceType] = useState('desktop');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (artistUrl.trim()) {
      onSubmit(artistUrl, deviceType);
    }
  };
  
  return (
    <div className="search-form-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label htmlFor="artistUrl">spotify artist url</label>
          <input
            type="text"
            id="artistUrl"
            value={artistUrl}
            onChange={(e) => setArtistUrl(e.target.value)}
            placeholder="https://open.spotify.com/artist/1McMsnEElThX1knmY4oliG"
            disabled={isLoading}
            required
          />
          <small className="form-help">
            example (Olivia Rodrigo): https://open.spotify.com/artist/1McMsnEElThX1knmY4oliG
          </small>
        </div>
        
        <div className="form-group">
          <label>device type</label>
          <div className="device-toggle">
            <button
              type="button"
              className={`toggle-option ${deviceType === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceType('desktop')}
              disabled={isLoading}
            >
              <span className="toggle-icon">🖥️</span>
              <span className="toggle-label">Desktop</span>
            </button>
            <button
              type="button"
              className={`toggle-option ${deviceType === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceType('mobile')}
              disabled={isLoading}
            >
              <span className="toggle-icon">📱</span>
              <span className="toggle-label">Mobile</span>
            </button>
          </div>
          <small className="form-help">
            Some artists have different banners for mobile vs desktop
          </small>
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading || !artistUrl.trim()}
        >
          {isLoading ? 'extracting...' : 'extract banner'}
        </button>
      </form>
    </div>
  );
}

export default SearchForm;