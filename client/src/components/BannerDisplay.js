// client/src/components/BannerDisplay.js
import React from 'react';
import config from '../config';
import './BannerDisplay.css';

function BannerDisplay({ data }) {
  const { artistUrl, bannerUrl, imagePath, artistId } = data;
  
  const imageUrl = `${config.apiUrl}${imagePath}`;
  
  const handleDownload = () => {
    // create a temporary link element
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `spotify-banner-${artistId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="banner-display">
      <h2>banner extracted successfully!</h2>
      
      <div className="banner-image-container">
        <img 
          src={imageUrl}
          alt="Artist Banner" 
          className="banner-image"
        />
      </div>
      
      <div className="banner-info">
        <div className="info-item">
          <strong>artist url:</strong>
          <a 
            href={artistUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="info-link"
          >
            {artistUrl}
          </a>
        </div>
        
        <div className="info-item">
          <strong>original banner url:</strong>
          <a 
            href={bannerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="info-link"
          >
            view original
          </a>
        </div>
      </div>
      
      <div className="banner-actions">
        <button 
          onClick={handleDownload}
          className="download-button"
        >
          download banner
        </button>
      </div>
    </div>
  );
}

export default BannerDisplay;