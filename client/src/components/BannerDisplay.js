// client/src/components/BannerDisplay.js
import React from 'react';
import config from '../config';
import './BannerDisplay.css';

function BannerDisplay({ data }) {
  const { artistUrl, bannerUrl, imagePath, artistId, deviceType } = data;
  
  const imageUrl = `${config.apiUrl}${imagePath}`;
  
  const handleDownload = async () => {
    try {
      // Fetch the image from the server
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `spotify-banner-${artistId}-${deviceType || 'banner'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to simple link download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `spotify-banner-${artistId}-${deviceType || 'banner'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <div className="banner-display">
      <div className="banner-container">
        <div className="banner-info">
          <h3>Banner Extracted Successfully!</h3>
          
          {deviceType && (
            <div className="info-row">
              <span className="info-label">Device Type:</span>
              <span className="device-indicator">
                {deviceType === 'mobile' ? '⌖' : '⌐'} {deviceType}
              </span>
            </div>
          )}
          
          <div className="info-row">
            <span className="info-label">Artist ID:</span>
            <span className="info-value">{artistId}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Actions:</span>
            <button 
              onClick={handleDownload}
              className="download-btn"
            >
              ↓ Download
            </button>
          </div>
        </div>
        
        <img 
          src={imageUrl}
          alt={`Artist Banner - ${deviceType || 'Default'}`}
          className="banner-image"
        />
      </div>
    </div>
  );
}

export default BannerDisplay;