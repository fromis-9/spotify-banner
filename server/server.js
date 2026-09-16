const express = require('express');
const cors = require('cors');
const path = require('path');
const { processSpotifyUrl, cleanup, parseSpotifyUrl } = require('./artwork');

const { createExtractionLimit } = require('./extraction-limit');

function createApp({ extract = processSpotifyUrl } = {}) {
  const app = express();
  // Trust only explicitly configured reverse-proxy addresses, never arbitrary forwarded headers.
  const proxies = (process.env.TRUSTED_PROXY_CIDRS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (proxies.length) app.set('trust proxy', proxies);
  const extractionLimit = createExtractionLimit();
  app.use(cors());
  app.use(express.json({limit:'8kb'}));
  app.use('/images', express.static(path.join(__dirname,'images')));
  app.get('/api/health', (req,res)=>res.json({status:'Server is running'}));

  // Keep the old endpoint compatible, but route every banner request through the same budget.
  app.post(['/api/extractartwork','/api/extractbanner'], extractionLimit, async (req,res)=>{
    const legacy = req.path === '/api/extractbanner';
    const input = legacy ? req.body?.artistUrl : req.body?.spotifyUrl;
    if (legacy && parseSpotifyUrl(input)?.type !== 'artist') return res.status(400).json({success:false,error:'Paste a Spotify artist link.'});
    const result = await extract(input,req.body?.deviceType ?? 'desktop');
    if (!result.success) return res.status(400).json(result);
    if (!legacy) return res.json(result);
    const data = result.data;
    const selected = data.images.find(i=>i.label==='artist banner') || data.images[0];
    res.json({success:true,data:{artistUrl:data.url,artistId:data.id,deviceType:data.deviceType,imagePath:selected.imagePath}});
  });
  app.use((error,req,res,next)=>res.status(400).json({success:false,error:'Invalid request.'}));
  return app;
}
const app = createApp();
const PORT = process.env.PORT || 5001;
if (require.main === module) {
  app.listen(PORT,()=>console.log(`Server running on http://localhost:${PORT}`));
  cleanup();
  setInterval(cleanup,60*60*1000).unref();
}
module.exports = app;

module.exports.createApp = createApp;
