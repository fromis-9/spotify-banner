import { zipSync } from 'fflate';
import config from './config';

export function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function fetchImage(image) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${config.apiUrl}${image.imagePath}`, { signal: controller.signal });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || !blob.size || blob.size > 12 * 1024 * 1024) throw new Error('Image unavailable');
    return blob;
  } finally { clearTimeout(timer); }
}

export function safeFilename(value) {
  return String(value || 'artwork').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'artwork';
}

export async function artworkZip(images) {
  if (images.length < 2 || images.length > 6) throw new Error('Invalid image count');
  const files = {};
  for (const [index, image] of images.entries()) {
    const blob = await fetchImage(image);
    const extension = ['jpg', 'png', 'webp', 'avif'].includes(image.format) ? image.format : 'jpg';
    files[`${index + 1}-${safeFilename(image.label)}.${extension}`] = new Uint8Array(await blob.arrayBuffer());
  }
  // Artwork is already compressed. Store it unchanged to avoid extra CPU work.
  return new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' });
}
