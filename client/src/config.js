// config.js
const config = {
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://spotimage-beta.onrender.com' 
      : 'http://localhost:5001'
  };
  
  export default config;