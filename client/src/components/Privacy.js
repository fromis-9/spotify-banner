import React from 'react';
import './Legal.css';

export function PrivacyDetails() {
  return (
    <>
      <p>submitted spotify links and extraction results are temporarily cached to avoid
        repeated requests. downloaded images are temporarily stored on our server and
        normally removed after 24 hours. your theme preference is stored in your browser.
        you do not need to provide spotify login credentials to use this tool.</p>
      <p>to limit abuse, we temporarily count extraction requests by IP address or IPv6 network.
        these rate-limit counters are kept in server memory and expire after 10 minutes.</p>
      <p>for privacy questions or to report a problem, contact <a href="mailto:me@c-o.dev">me@c-o.dev</a>.
        if an image won't load, include the public spotify link and the error you saw.
        please don't send passwords or account tokens.</p>
    </>
  );
}

export default function Privacy({ onBack }) {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <button className="back-button" onClick={onBack}>← back to site</button>
        <h1>privacy</h1>
        <PrivacyDetails />
      </div>
    </div>
  );
}
