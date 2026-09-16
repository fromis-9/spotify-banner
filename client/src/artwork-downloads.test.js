import { unzipSync } from 'fflate';
import { artworkZip } from './artwork-downloads';
function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
const images = [
  {imagePath:'/images/photo.jpg',label:'profile photo',format:'jpg'},
  {imagePath:'/images/banner.png',label:'artist banner',format:'png'}
];
test('archive contains both original byte sequences and readable filenames', async () => {
  const bytes = [new Uint8Array([255,216,255,1]), new Uint8Array([137,80,78,71])];
  global.fetch = jest.fn();
  for (const content of bytes) fetch.mockResolvedValueOnce({ok:true,blob:async()=>({type:'image/jpeg',size:content.length,arrayBuffer:async()=>content.buffer})});
  const zip = await artworkZip(images);
  const files = unzipSync(await readBlob(zip));
  expect(Object.keys(files)).toEqual(['1-profile-photo.jpg','2-artist-banner.png']);
  expect(files['1-profile-photo.jpg']).toEqual(bytes[0]);
  expect(files['2-artist-banner.png']).toEqual(bytes[1]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(zip.type).toBe('application/zip');
});
test('expired downloads fail instead of returning a partial archive', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok:false});
  await expect(artworkZip(images)).rejects.toThrow('Download failed');
});
