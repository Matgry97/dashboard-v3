require('dotenv').config();
const express = require('express');
const path = require('path');

const stravaRouter = require('./integrations/strava/router');
const stravaService = require('./integrations/strava/service');
const weatherRouter = require('./integrations/weather/router');
const weatherService = require('./integrations/weather/service');
const newsRouter = require('./integrations/news/router');
const newsService = require('./integrations/news/service');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// --- Integrations ---
app.use('/api/strava', stravaRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/news', newsRouter);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({
    strava: stravaService.healthCheck(),
    weather: weatherService.healthCheck(),
    news: newsService.healthCheck(),
  });
});

// --- Serve frontend in production ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // Unknown API routes get a JSON 404, not the SPA's HTML
  app.all('/api/{*rest}', (req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND', message: `No route ${req.method} ${req.path}` });
  });
  // SPA fallback (Express 5 needs a named wildcard; bare '*' throws at startup)
  app.get('/{*splat}', (req, res) => {
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
