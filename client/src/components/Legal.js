import React from 'react';
import './Legal.css';

function Legal({ onBack }) {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <button className="back-button" onClick={onBack}>
          ← back to site
        </button>
        <h1>legal & disclaimer</h1>
        
        <section>
          <h2>disclaimer</h2>
          <p>
            spotifybanner.com is an independent tool and is not affiliated with, endorsed by, 
            or connected to spotify ab or any of its subsidiaries. spotify is a trademark of spotify ab.
          </p>
        </section>

        <section>
          <h2>copyright</h2>
          <p>
            all artist images, banners, and related content extracted by this tool remain the 
            property of their respective artists, labels, and copyright holders. this tool is 
            intended for personal and educational use only.
          </p>
        </section>

        <section>
          <h2>privacy</h2>
          <p>
            we do not store, track, or retain any personal data. artist urls are processed 
            temporarily to extract banner images and are not saved. we do not use cookies 
            or analytics tracking.
          </p>
        </section>

        <section>
          <h2>liability</h2>
          <p>
            this tool is provided "as is" without any warranties. use at your own risk. 
            we are not responsible for any misuse of extracted content or any issues 
            arising from the use of this service.
          </p>
        </section>

        <section>
          <h2>fair use</h2>
          <p>
            the extraction of publicly available images for personal use may be considered 
            fair use under copyright law. users are responsible for ensuring their use 
            complies with applicable copyright laws.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Legal; 