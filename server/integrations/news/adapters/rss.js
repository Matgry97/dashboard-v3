const { XMLParser } = require('fast-xml-parser');
const { fetchText } = require('./http');

const SUMMARY_MAX = 200;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // Keep ids/versions like "1.10" as strings
  parseTagValue: false,
  processEntities: true,
  htmlEntities: true,
});

const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Text content of a node that may be a string or { '#text': ... }. */
function text(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in node) return String(node['#text']);
  return '';
}

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * HTML fragment -> plain text. The XML parser has already decoded one level of
 * entities; what remains is the HTML's own escaping, decoded here exactly once.
 * `&amp;` goes last so `&amp;lt;` becomes the literal text `&lt;`, not `<`.
 */
function stripHtml(html) {
  return collapse(
    html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
  );
}

/**
 * Titles are plain text (RSS; Atom type="text") — already decoded by the parser,
 * so decoding again would corrupt e.g. "&lt;div&gt;". Only Atom html titles are HTML.
 */
function titleText(node) {
  const type = node && typeof node === 'object' ? node['@_type'] : undefined;
  return type === 'html' || type === 'xhtml' ? stripHtml(text(node)) : collapse(text(node));
}

function summarize(raw) {
  const s = stripHtml(text(raw));
  if (!s) return undefined;
  return s.length > SUMMARY_MAX ? `${s.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : s;
}

function toIso(raw) {
  const s = text(raw);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function atomLink(link) {
  const links = toArray(link);
  const alt = links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate');
  const chosen = alt || links[0];
  if (!chosen) return '';
  return typeof chosen === 'string' ? chosen : chosen['@_href'] || '';
}

function parseRssItem(item) {
  const link = text(item.link);
  return {
    id: text(item.guid) || link,
    title: titleText(item.title),
    url: link,
    publishedAt: toIso(item.pubDate || item['dc:date']),
    summary: summarize(item.description),
  };
}

function parseAtomEntry(entry) {
  const url = atomLink(entry.link);
  return {
    id: text(entry.id) || url,
    title: titleText(entry.title),
    url,
    publishedAt: toIso(entry.published || entry.updated),
    summary: summarize(entry.summary || entry.content),
  };
}

/** Parse an RSS 2.0 / RSS 1.0 (RDF) / Atom document into normalized items. */
function parseFeed(xml, limit) {
  const doc = parser.parse(xml);
  let items;
  if (doc.rss) {
    items = toArray(doc.rss.channel?.item).map(parseRssItem);
  } else if (doc.feed) {
    items = toArray(doc.feed.entry).map(parseAtomEntry);
  } else if (doc['rdf:RDF']) {
    items = toArray(doc['rdf:RDF'].item).map(parseRssItem);
  } else {
    throw new Error('Not an RSS or Atom feed');
  }

  return items
    .filter((i) => i.title && i.url)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    .slice(0, limit);
}

async function rss(source) {
  const xml = await fetchText(
    source.url,
    'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
  );
  return parseFeed(xml, source.limit);
}

module.exports = { rss, parseFeed };
