const MET_URL =
  'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=58.9700&lon=5.7300';

const USER_AGENT = 'dashboard-v3/1.0 https://github.com/personal';

async function getForecast() {
  const res = await fetch(MET_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`MET API error: ${res.status}`);
  return res.json();
}

function healthCheck() {
  return 'ok';
}

module.exports = { getForecast, healthCheck };
