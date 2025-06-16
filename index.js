
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const NodeCache = require("node-cache");

const app = express();
app.use(cors());
app.use(express.json());

const cache = new NodeCache({ stdTTL: 60 * 60 }); 


admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const NEARBY_URL      = process.env.GOOGLE_PLACES_API_URL;
const TEXTSEARCH_URL  = process.env.GOOGLE_PLACES_TEXT_SEARCH_API_URL;
const PHOTO_URL       = process.env.GOOGLE_PLACES_PHOTO_API_URL;

//proxy endpoints:
app.get('/proxy', async (req, res) => {
  const { location, radius, keyword } = req.query;
   const cacheKey = `nearby:${location}:${radius}:${keyword}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const response = await axios.get(NEARBY_URL, {
      params: { location, radius, keyword, type: 'restaurant', key: GOOGLE_PLACES_KEY }
    });
    cache.set(cacheKey, data);
    res.json(response.data);
  } catch (e) {
    res.status(500).send('Places error');
  }
});



const PORT = process.env.PORT || 8100;
app.listen(PORT, () => console.log(`Proxy running on ${PORT}`));
