// config.js
const config = {
    features: { artistViewSelector: process.env.REACT_APP_ENABLE_ARTIST_VIEW_SELECTOR === 'true' },
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://spotify-banner-backend.onrender.com' 
      : 'http://localhost:5001'
  };
  
  export default config;