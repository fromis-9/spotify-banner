import React, { useState } from 'react';
import config from '../config';
import { fetchImage, saveBlob, artworkZip, safeFilename } from '../artwork-downloads';
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
  const [copyStatus, setCopyStatus] = useState('');
  const url = `${config.apiUrl}${image.imagePath}`;
  async function download() {
    setError(''); setDownloading(true);
    try {
      saveBlob(await fetchImage(image), image.imagePath.split('/').pop());
    } catch {
      setError('Download failed. Try opening the image below, or request the artwork again.');
    } finally { setDownloading(false); }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(image.sourceUrl);
      setCopyStatus('image link copied');
    } catch {
      setCopyStatus('Could not copy automatically. Select the image link below to copy it.');
    }
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
        {image.sourceUrl && <button type="button" className="copy-link-btn" onClick={copyLink}>copy image link</button>}
      </div>
      {copyStatus && <p className="copy-status" role="status">{copyStatus}</p>}
      {copyStatus.startsWith('Could not') && <input className="copy-link-fallback" aria-label="original image link" readOnly value={image.sourceUrl} onFocus={event => event.target.select()} />}
      {error && <p className="download-error" role="alert">{error}</p>}
    </article>
  );
}
function BannerDisplay({ data }) {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  async function downloadAll() {
    setDownloadingAll(true);
    setArchiveError('');
    try {
      saveBlob(await artworkZip(images), `${safeFilename(data.title)}-artwork.zip`);
    } catch {
      setArchiveError('Could not download all images. Try downloading them individually, or request the artwork again.');
    } finally { setDownloadingAll(false); }
  }
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
      {images.length > 1 && <div className="download-all">
        <button type="button" className="download-btn" disabled={downloadingAll} onClick={downloadAll}>{downloadingAll ? 'preparing zip…' : 'download all images (.zip)'}</button>
        {archiveError && <p className="download-error" role="alert">{archiveError}</p>}
      </div>}
      <p className="artwork-support">
        finding this useful?{' '}
        <a href="https://www.buymeacoffee.com/corinthians" target="_blank" rel="noopener noreferrer">buy me a coffee</a>{' '}
        to help cover the site’s running costs.
      </p>
    </section>
  );
}
export default BannerDisplay;
