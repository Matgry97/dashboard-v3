require('dotenv').config();
const express = require('express');
const path = require('path');

const garminRouter = require('./integrations/garmin/router');
const garminService = require('./integrations/garmin/service');
const weatherRouter = require('./integrations/weather/router');
const weatherService = require('./integrations/weather/service');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// --- Integrations ---
app.use('/api/garmin', garminRouter);
app.use('/api/weather', weatherRouter);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({
    garmin: garminService.healthCheck(),
    weather: weatherService.healthCheck(),
  });
});

// --- Serve frontend in production ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
