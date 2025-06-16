
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



//proxy endpoints:
const {
  GOOGLE_PLACES_API_KEY: KEY,
  GOOGLE_PLACES_API_URL: NEARBY_URL
} = process.env;

if (!KEY || !NEARBY_URL) {
  console.error("⚠️  Missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACES_API_URL in env");
  process.exit(1);
}

app.get('/proxy', async (req, res) => {
  const { location, radius, keyword } = req.query;
  if (!location || !radius || !keyword) {
    return res.status(400).send("Missing location, radius or keyword");
  }

  // build a cache key
  const cacheKey = `nearby:${location}:${radius}:${keyword}`;
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    const { data } = await axios.get(NEARBY_URL, {
      params: {
        location,
        radius,
        keyword,
        type: 'restaurant',
        key: KEY
      }
    });

    cache.set(cacheKey, data);
    res.json(data);

  } catch (e) {
    console.error("🛑 Proxy error:", e.response?.data || e.message);
    res.status(500).send("Places error");
  }
});

// Photo proxy reference URL

const PHOTO_URL = process.env.GOOGLE_PLACES_PHOTO_API_URL;  

app.get('/photo', async (req, res) => {
  const { photoreference, maxwidth } = req.query;
  if (!photoreference) {
    return res.status(400).send("Missing photoreference");
  }

  try {
    // Stream the binary photo back through your server
    const response = await axios.get(PHOTO_URL, {
      params: {
        photoreference,
        maxwidth: maxwidth || 400,
        key: KEY
      },
      responseType: 'stream'
    });
    // optional: cache photos for a day
    res.set('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    console.error("📸 Photo proxy error:", err.response?.data || err.message);
    res.status(500).send("Photo fetch error");
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`📡 Proxy running on port ${PORT}`));


