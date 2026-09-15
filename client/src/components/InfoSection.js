import React from 'react';
import './InfoSection.css';

function InfoSection() {
  return (
    <section className="info-section" id="about" aria-labelledby="about-title">
      <h2 id="about-title">spotify artwork, in one place</h2>
      <div className="info-content">
        <p>spotifybanner started with an image that's easy to see but awkward to save:
          the artist banner. now you can also find artist profile photos, album and track
          covers, and playlist artwork from the same input.</p>
        <p>paste a public spotify link to preview the available images and download them.
          no spotify sign-in is needed here. this tool retrieves existing artwork; it
          doesn't generate new images or download music.</p>
      </div>
      <section className="guide-section" aria-labelledby="how-title">
        <h2 id="how-title">how to get your image</h2>
        <ol className="info-content guide-steps">
          <li><strong>copy a spotify link.</strong> open the artist, album, track, or playlist.
            copy its browser address, or use the share menu in spotify to copy its link.</li>
          <li><strong>paste it above.</strong> select get artwork. artist links return the available
            banner and profile photo; album, track, and playlist links return cover artwork.</li>
          <li><strong>check and download.</strong> each result has a preview, its dimensions
            once loaded, and a download button. use open image to see it on its own.</li>
        </ol>
      </section>
      <section className="guide-section" aria-labelledby="types-title">
        <h2 id="types-title">which links work?</h2>
        <dl className="url-examples info-content">
          <div><dt><strong>artist → banner & artist images</strong></dt><dd><code>open.spotify.com/artist/…</code></dd></div>
          <div><dt><strong>album → cover artwork</strong></dt><dd><code>open.spotify.com/album/…</code></dd></div>
          <div><dt><strong>track → its release's cover artwork</strong></dt><dd><code>open.spotify.com/track/…</code></dd></div>
          <div><dt><strong>playlist → playlist cover</strong></dt><dd><code>open.spotify.com/playlist/…</code></dd></div>
        </dl>
        <p className="info-content">use the full link, including the letters and numbers after
          the type. localized links such as <code>open.spotify.com/intl-es/album/…</code>
          {' '}and spotify URIs such as <code>spotify:album:…</code> work too. if you have a
          shortened share link, open it first and copy the full spotify address.</p>
      </section>
      <section className="guide-section" aria-labelledby="versions-title">
        <h2 id="versions-title">banner or profile photo?</h2>
        <div className="version-guide info-content">
          <div><h3>banner</h3><p>the wide header at the top of an artist page. when a
            separate banner is available, it appears as its own download.</p></div>
          <div><h3>profile photo</h3><p>the portrait spotify often displays in a circle.
            the download preserves the underlying image without the circular crop.</p></div>
        </div>
        <p className="info-content">different sizes of the same artist photo are combined
          into one result, keeping the largest available version found. if a separate
          banner isn't found, the result says so instead of substituting a profile photo.</p>
      </section>
      <section className="guide-section faq" aria-labelledby="faq-title">
        <h2 id="faq-title">questions & troubleshooting</h2>
        <details><summary>why can't it find an artist banner?</summary>
          <p>the page may not expose a separate banner, or the tool may be unable to read
            it. a profile photo can still appear as a separate
            result. if the banner service is busy or paused, the result will explain that.</p></details>
        <details><summary>why is my playlist or cover unavailable?</summary>
          <p>check that the link opens a public page in your browser. private, removed,
            or restricted pages may not expose artwork. a temporary spotify response or
            page change can also prevent extraction; try again later.</p></details>
        <details><summary>why does a track return an album cover?</summary>
          <p>the tool retrieves the artwork associated with the track's page. this is
            usually the cover of its album or single, so tracks from the same release
            can return the same image.</p></details>
        <details><summary>will i get the original resolution?</summary>
          <p>you get the image available from the page, with its actual dimensions shown
            after the preview loads. that isn't necessarily the artist's original upload.
            the tool doesn't upscale images or promise a fixed resolution. for artist photos, repeated sizes of
            the same image are combined into the largest version found.</p></details>
        <details><summary>why does the image look different on spotify?</summary>
          <p>spotify may crop an image to fit its layout or place a gradient and text over
            it. the download is the underlying artwork, not a screenshot of the whole page.</p></details>
        <details><summary>the download failed. what should i do?</summary>
          <p>use open image and your browser's save-image option. if the image no longer
            loads, request the artwork again. previews and download files are temporary.</p></details>
        <details><summary>why am i seeing an older image?</summary>
          <p>recent results are reused for up to six hours to keep repeated lookups fast.
            if an artist or playlist has just changed its artwork, check again later.</p></details>
        <details><summary>does a playlist link download every song's artwork?</summary>
          <p>it retrieves the playlist's own cover. to get an individual release's artwork,
            paste its track or album link separately. batch downloads aren't included.</p></details>
      </section>
    </section>
  );
}
export default InfoSection;
