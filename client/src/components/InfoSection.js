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
      
      <h2 style={{marginTop: '32px'}}>how to get a url</h2>
      
      <div className="info-content">
        <p>to get a spotify artist url:</p>
        <ul>
          <li>open spotify and search for the artist you want</li>
          <li>go to the artist's profile page</li>
          <li>get the url:
            <ul>
              <li><strong>web browser:</strong> copy the url from your address bar</li>
              <li><strong>desktop app:</strong> right-click on the artist page or find the 3 dotsand select "share" → "copy link"</li>
              <li><strong>mobile app:</strong> tap the 3 dots (⋯) and select "share" → "copy link"</li>
            </ul>
          </li>
          <li>paste the url into the form above</li>
        </ul>
        <p>
          accepted url formats: <code>open.spotify.com/artist/...</code> or <code>spotify:artist:...</code>
        </p>
      </div>
    </div>
  );
}

export default InfoSection;