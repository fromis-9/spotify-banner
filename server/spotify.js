// Compatibility for the original banner endpoint. All entry points share the same budget.
const { parseSpotifyUrl, processSpotifyUrl } = require('./artwork');
async function processArtistUrl(artistUrl, deviceType = 'desktop') {
  if (parseSpotifyUrl(artistUrl)?.type !== 'artist') return {success:false,error:'Paste a Spotify artist link.'};
  const result = await processSpotifyUrl(artistUrl,deviceType);
  if (!result.success) return result;
  const data = result.data;
  const image = data.images.find(i=>i.label==='artist banner') || data.images[0];
  return {success:true,data:{artistUrl:data.url,artistId:data.id,deviceType:data.deviceType,imagePath:image.imagePath}};
}
module.exports = { processArtistUrl };
