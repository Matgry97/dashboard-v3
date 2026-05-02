const TOKEN_URL = 'https://www.strava.com/oauth/token';
const ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities?per_page=10';

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenRefreshPromise = null;

async function getAccessToken() {
  if (cachedToken && Date.now() / 1000 < tokenExpiresAt - 60) return cachedToken;
  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
      const data = await res.json();
      cachedToken = data.access_token;
      tokenExpiresAt = data.expires_at;
      return cachedToken;
    })
    .finally(() => { tokenRefreshPromise = null; });

  return tokenRefreshPromise;
}

async function getLastRun() {
  const token = await getAccessToken();
  const res = await fetch(ACTIVITIES_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
  const activities = await res.json();
  const run = activities.find(a => a.sport_type === 'Run' || a.type === 'Run');
  return run || null;
}

function healthCheck() {
  return process.env.STRAVA_CLIENT_ID ? 'ok' : 'unavailable';
}

module.exports = { getLastRun, healthCheck };
