// Read dimensions from common image headers without rendering or altering the image.
function imageDimensions(bytes) {
  try {
    if (bytes.length >= 24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
      return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
    }
    if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
      let offset=2;
      while (offset+4<=bytes.length) {
        if (bytes[offset++] !== 255) break;
        while (bytes[offset] === 255) offset++;
        const marker=bytes[offset++];
        if (marker===0xda || marker===0xd9) break;
        if (marker===0x01 || (marker>=0xd0 && marker<=0xd7)) continue;
        const length=bytes.readUInt16BE(offset);
        if (length<2 || offset+length>bytes.length) break;
        if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length>=7) {
          return {height:bytes.readUInt16BE(offset+3),width:bytes.readUInt16BE(offset+5)};
        }
        offset+=length;
      }
    }
    if (bytes.length>=30 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') {
      const type=bytes.toString('ascii',12,16);
      if (type==='VP8X') return {width:1+bytes.readUIntLE(24,3),height:1+bytes.readUIntLE(27,3)};
      if (type==='VP8 ') return {width:bytes.readUInt16LE(26)&0x3fff,height:bytes.readUInt16LE(28)&0x3fff};
      if (type==='VP8L' && bytes[20]===0x2f) {
        const bits=bytes.readUInt32LE(21);
        return {width:1+(bits&0x3fff),height:1+((bits>>>14)&0x3fff)};
      }
    }
  } catch { /* Unrecognized headers still render in the client's image element. */ }
  return {width:null,height:null};
}
function artistPhotoKey(source) {
  try {
    const u=new URL(source);
    // Spotify artist-photo IDs contain a rendition prefix followed by an asset ID.
    // Only collapse this known family; never merge distinct photos or banner assets.
    const photo=u.pathname.match(/\/image\/ab676161[0-9a-f]{8}([0-9a-f]{24})$/i);
    if (photo) return `portrait:${photo[1].toLowerCase()}`;
    return source;
  } catch { return source; }
}
function consolidateArtistImages(images) {
  const grouped=new Map();
  for (const image of images) {
    const portrait=image.label!=='artist banner';
    const asset=portrait ? artistPhotoKey(image.sourceUrl) : image.sourceUrl;
    const key=`${portrait?'photo':'banner'}:${asset}`;
    const existing=grouped.get(key);
    const label=portrait && (asset.startsWith('portrait:') || image.label==='profile photo' || existing?.label==='profile photo') ? 'profile photo' : image.label;
    const area=(image.width || 0)*(image.height || 0);
    const previousArea=(existing?.width || 0)*(existing?.height || 0);
    if (!existing || area>previousArea || (area===previousArea && image.label==='profile photo')) grouped.set(key,{...image,label});
    else if (existing.label!==label) grouped.set(key,{...existing,label});
  }
  return Array.from(grouped.values());
}
module.exports={imageDimensions,consolidateArtistImages};
