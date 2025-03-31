// Serverless function for Vercel
import { processArtistUrl } from '../../server/spotify';
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { artistUrl } = req.body;
    
    if (!artistUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'No artist URL provided' 
      });
    }
    
    console.log(`Processing request for artist URL: ${artistUrl}`);
    
    const result = await processArtistUrl(artistUrl);
    
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
}