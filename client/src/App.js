// client/src/App.js
import React, { useState } from 'react';
import './App.css';
import SearchForm from './components/SearchForm';
import BannerDisplay from './components/BannerDisplay';
import InfoSection from './components/InfoSection';
import config from './config';

function App() {
  // State to manage the app
  const [bannerData, setBannerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Function to handle the API request to extract banner
  const handleExtractBanner = async (artistUrl, deviceType = 'desktop') => {
    // Reset states
    setIsLoading(true);
    setError(null);
    setBannerData(null);
    
    try {
      // Call the backend API
      const response = await fetch(`${config.apiUrl}/api/extractbanner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistUrl, deviceType }),
      });
      
      // Parse the response
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Something went wrong');
      }
      
      // Set the banner data on success
      setBannerData(result.data);
    } catch (err) {
      console.error('Error extracting banner:', err);
      setError(err.message || 'Failed to extract banner');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="green">spotify</h1><h1 className="white">banner</h1><h3 className="title">.com</h3>
        <p className="subtitle">get an artist's spotify banner/header image</p>
      </header>
      
      <main className="app-content">
        <SearchForm 
          onSubmit={handleExtractBanner} 
          isLoading={isLoading} 
        />
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {bannerData && <BannerDisplay data={bannerData} />}
        
        <InfoSection />
      </main>
      
      <footer className="app-footer">
        <p>
          not affiliated with spotify | <a href="https://github.com/fromis-9" target="_blank" rel="noopener noreferrer">fromis-9</a>
        </p>
      </footer>
    </div>
  );
}

export default App;