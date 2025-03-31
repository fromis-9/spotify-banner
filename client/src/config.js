// config.js
const config = {
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://spotify-banner-backend.onrender.com' 
      : 'http://localhost:5001'
  };
  
  export default config;