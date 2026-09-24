const USER_AGENT = 'dashboard-v3/1.0 https://github.com/personal';
const TIMEOUT_MS = 10000;
// Feeds are typically < 500 KB; anything far beyond is broken or hostile (Pi has little RAM)
const MAX_BYTES = 2 * 1024 * 1024;

async function fetchWithTimeout(url, accept) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res;
}

/** Reads a response body as text, aborting once it exceeds maxBytes. */
async function readTextLimited(res, maxBytes = MAX_BYTES) {
  const tooLarge = () => new Error(`Response larger than ${maxBytes} bytes`);

  const declared = Number(res.headers?.get('content-length'));
  if (declared > maxBytes) throw tooLarge();

  // Test doubles and some runtimes have no stream; fall back to text()
  if (!res.body?.getReader) {
    const body = await res.text();
    if (Buffer.byteLength(body) > maxBytes) throw tooLarge();
    return body;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchText(url, accept, maxBytes) {
  return readTextLimited(await fetchWithTimeout(url, accept), maxBytes);
}

async function fetchJson(url, maxBytes) {
  return JSON.parse(await fetchText(url, 'application/json', maxBytes));
}

module.exports = { fetchText, fetchJson, readTextLimited, MAX_BYTES };
