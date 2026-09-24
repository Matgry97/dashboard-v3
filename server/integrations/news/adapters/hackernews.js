const { fetchWithTimeout } = require('./http');

async function getJson(url) {
  const res = await fetchWithTimeout(url, 'application/json');
  return res.json();
}

/** Top stories from the official HN Firebase API. */
async function hackernews(source) {
  const ids = await getJson(`${source.url}/topstories.json`);
  const top = ids.slice(0, source.limit);
  const stories = await Promise.all(top.map((id) => getJson(`${source.url}/item/${id}.json`)));

  return stories
    .filter((s) => s && !s.deleted && !s.dead && s.title)
    .map((s) => {
      const commentsUrl = `https://news.ycombinator.com/item?id=${s.id}`;
      return {
        id: String(s.id),
        title: s.title,
        url: s.url || commentsUrl, // Ask HN / Show HN text posts have no url
        publishedAt: s.time ? new Date(s.time * 1000).toISOString() : null,
        score: s.score,
        commentsUrl,
      };
    });
}

module.exports = { hackernews };
