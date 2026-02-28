require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const DATE_RANGE_DAYS = parseInt(process.env.DATE_RANGE_DAYS, 10) || 7;

const SOURCES = {
  nyt: 'the-new-york-times',
  wsj: 'the-wall-street-journal',
};

function ensureDirs() {
  for (const dir of [DATA_DIR, RAW_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DATE_RANGE_DAYS);
  return { start: formatDate(start), end: formatDate(end) };
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchFromNewsAPI(sourceId, from, to) {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not set. Get a free key at https://newsapi.org');
  }

  const url = `https://newsapi.org/v2/everything?sources=${sourceId}&from=${from}&to=${to}&language=en&sortBy=publishedAt&pageSize=100&apiKey=${NEWS_API_KEY}`;

  console.log(`  Fetching ${sourceId} articles from ${from} to ${to}...`);
  const result = await httpsGet(url);

  if (result.status !== 'ok') {
    throw new Error(`NewsAPI error: ${result.message || JSON.stringify(result)}`);
  }

  console.log(`  Got ${result.articles.length} articles from ${sourceId}`);
  return result.articles.map((a) => ({
    title: a.title || '',
    description: a.description || '',
    publishedAt: a.publishedAt,
    url: a.url,
    source: sourceId,
  }));
}

async function fetchAllSources() {
  ensureDirs();
  const { start, end } = getDateRange();
  const today = formatDate(new Date());
  const outFile = path.join(RAW_DIR, `${today}.json`);

  // Check if we already fetched today
  if (fs.existsSync(outFile)) {
    console.log(`Raw data for ${today} already exists, loading from cache.`);
    return JSON.parse(fs.readFileSync(outFile, 'utf-8'));
  }

  console.log(`Fetching news from ${start} to ${end}...`);

  const results = {};

  for (const [key, sourceId] of Object.entries(SOURCES)) {
    try {
      results[key] = await fetchFromNewsAPI(sourceId, start, end);
    } catch (err) {
      console.error(`Error fetching ${key}: ${err.message}`);
      results[key] = [];
    }
    // Rate limiting: small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  const output = {
    fetched_at: new Date().toISOString(),
    date_range: { start, end },
    nyt: results.nyt,
    wsj: results.wsj,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Raw data saved to ${outFile}`);

  return output;
}

module.exports = { fetchAllSources, getDateRange, formatDate };
