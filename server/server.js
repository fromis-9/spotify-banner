// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { processArtistUrl } = require('./spotify');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serve images statically

// requesting queue for rate limiting
const requestQueue = [];
let isProcessing = false;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// API endpoint to handle banner extraction with rate limiting
app.post('/api/extractbanner', async (req, res) => {
  try {
    const { artistUrl, deviceType = 'desktop' } = req.body;
    
    // checking if URL was provided
    if (!artistUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'No artist URL provided' 
      });
    }
    
    console.log(`Processing request for artist URL: ${artistUrl} (${deviceType})`);
    
    // promise that will be resolved when this request is processed
    const requestPromise = new Promise((resolve) => {
      requestQueue.push(() => {
        processArtistUrl(artistUrl, deviceType)
          .then(result => resolve(result))
          .catch(error => resolve({ 
            success: false, 
            error: `Error processing request: ${error.message}` 
          }));
      });
    });
    
    // Start processing the queue if it's not already being processed
    if (!isProcessing) {
      processQueue();
    }
    
    const result = await requestPromise;
    
    // Return appropriate response based on result
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error handling extraction request:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while processing your request'
    });
  }
});

// process the queue with rate limiting
async function processQueue() {
  isProcessing = true;
  
  while (requestQueue.length > 0) {
    // process next request in the queue
    const nextRequest = requestQueue.shift();
    await nextRequest();
    
    if (requestQueue.length > 0) {
      console.log(`Waiting 3 seconds before processing next request. Queue size: ${requestQueue.length}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  isProcessing = false;
  console.log('Queue is empty. Ready for new requests.');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}/api`);
});