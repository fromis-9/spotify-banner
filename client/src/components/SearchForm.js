// client/src/components/SearchForm.js
import React, { useState } from 'react';
import './SearchForm.css';

function SearchForm({ onSubmit, isLoading }) {
  const [artistUrl, setArtistUrl] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (artistUrl.trim()) {
      onSubmit(artistUrl);
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