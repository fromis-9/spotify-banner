// client/src/components/InfoSection.js
import React from 'react';
import './InfoSection.css';

function InfoSection() {
  return (
    <div className="info-section">
      <h2>what is spotifybanner.com?</h2>
      
      <div className="info-content">
        <p>
         this site was created because there was no easy known method to extract spotify artist banners 
         without having to open your browser developer tools. ensure artist page has a banner before using this site
        </p>
      </div>
    </div>
  );
}

export default InfoSection;