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
    <form onSubmit={handleSubmit} className="search-form">
      <div className="form-section">
        <label htmlFor="artistUrl" className="form-label">spotify artist url</label>
        <input
          type="text"
          id="artistUrl"
          className="url-input"
          value={artistUrl}
          onChange={(e) => setArtistUrl(e.target.value)}
          placeholder="https://open.spotify.com/artist/1McMsnEElThX1knmY4oliG"
          disabled={isLoading}
          required
        />
      </div>
      
      <div className="form-section">
        <label className="form-label">device type</label>
        <div className="device-selector">
          <button
            type="button"
            className={`device-toggle ${deviceType === 'desktop' ? 'active' : ''}`}
            onClick={() => setDeviceType('desktop')}
            disabled={isLoading}
          >
            desktop
          </button>
          <button
            type="button"
            className={`device-toggle ${deviceType === 'mobile' ? 'active' : ''}`}
            onClick={() => setDeviceType('mobile')}
            disabled={isLoading}
          >
            mobile
          </button>
        </div>
      </div>
      
      <button 
        type="submit" 
        className="submit-btn"
        disabled={isLoading || !artistUrl.trim()}
      >
        {isLoading ? 'extracting...' : 'extract banner'}
      </button>
    </form>
  );
}

export default SearchForm;