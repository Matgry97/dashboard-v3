const USER_AGENT = 'dashboard-v3/1.0 https://github.com/personal';
const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, accept) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res;
}

module.exports = { fetchWithTimeout };
