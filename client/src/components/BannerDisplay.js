import React, { useState } from 'react';
import config from '../config';
import './BannerDisplay.css';

function ExternalLinkIcon() {
  return (
    <svg className="external-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function ArtworkImage({ image, title }) {
  const [dimensions, setDimensions] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const url = `${config.apiUrl}${image.imagePath}`;
  async function download() {
    setError(''); setDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Image unavailable');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = image.imagePath.split('/').pop();
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl),1000);
    } catch {
      setError('Download failed. Try opening the image below, or request the artwork again.');
    } finally { setDownloading(false); }
  }
  return (
    <article className="artwork-image">
      <div className="artwork-heading">
        <h3>{image.label}</h3>
        <span className="artwork-meta">{dimensions ? `${dimensions.width} × ${dimensions.height} · ` : ''}{image.format?.toUpperCase()}</span>
      </div>
      <img src={url} alt={`${title} — ${image.label}`} className={`banner-image ${image.label === 'artist banner' ? '' : 'cover-image'}`}
        onLoad={event => setDimensions({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight})}
        onError={() => setError('This preview is unavailable. Request the artwork again for a fresh image.')} />
      <div className="artwork-actions">
        <button onClick={download} className="download-btn" disabled={downloading}>{downloading ? 'downloading…' : 'download'}</button>
        <a className="artwork-external-link" href={url} target="_blank" rel="noopener noreferrer">open image <ExternalLinkIcon /></a>
      </div>
      {error && <p className="download-error" role="alert">{error}</p>}
    </article>
  );
}
function BannerDisplay({ data }) {
  const images = data.type === 'artist'
    ? [...data.images].sort((a, b) => Number(b.label === 'profile photo') - Number(a.label === 'profile photo'))
    : data.images;
  return (
    <section className="banner-display" aria-label="Artwork results">
      <div className="banner-info">
        <h2>{data.title}</h2>
        {data.description && <p className="artwork-description">{data.description}</p>}
        <a className="source-link artwork-external-link" href={data.url} target="_blank" rel="noopener noreferrer">view on spotify <ExternalLinkIcon /></a>
      </div>
      {data.notice && <p className="artwork-notice" role="status">{data.notice}</p>}
      <div className="banner-container">
        {images.map(image => <ArtworkImage key={image.imagePath} image={image} title={data.title} />)}
      </div>
      <p className="artwork-support">
        finding this useful?{' '}
        <a href="https://www.buymeacoffee.com/corinthians" target="_blank" rel="noopener noreferrer">buy me a coffee</a>{' '}
        to help cover the site’s running costs.
      </p>
    </section>
  );
}
export default BannerDisplay;
