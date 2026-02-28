const fs = require('fs');
const path = require('path');
const nlp = require('compromise');

const DATA_DIR = path.join(__dirname, 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analysis.json');

// Standard English stopwords + news-specific filler words
const STOPWORDS = new Set([
  // Common English
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'it', 'its', 'he', 'she', 'they', 'we',
  'you', 'i', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'if', 'then', 'about', 'up', 'out', 'into', 'over',
  'after', 'before', 'between', 'under', 'again', 'further', 'once',
  // News-specific filler
  'said', 'new', 'also', 'would', 'could', 'one', 'two', 'first',
  'last', 'like', 'get', 'make', 'go', 'say', 'says', 'year', 'years',
  'time', 'people', 'way', 'day', 'days', 'week', 'month', 'back',
  'still', 'even', 'well', 'many', 'much', 'now', 'part', 'take',
  'come', 'made', 'long', 'know', 'thing', 'think', 'tell', 'look',
  'want', 'give', 'use', 'find', 'here', 'thing', 'things', 'see',
  'going', 'good', 'right', 'big', 'old', 'great', 'small', 'man',
  'world', 'life', 'work', 'got', 'set', 'put', 'end', 'keep',
  'let', 'began', 'seem', 'help', 'show', 'may', 'must', 'shall',
  // News source names (avoid self-reference)
  'nyt', 'wsj', 'york', 'times', 'wall', 'street', 'journal',
  'reuters', 'associated', 'press', 'ap',
]);

const TOPIC_CATEGORIES = {
  'Politics': [
    'president', 'congress', 'senate', 'democrat', 'republican', 'election',
    'vote', 'campaign', 'legislation', 'bill', 'policy', 'governor',
    'partisan', 'gop', 'democrats', 'republicans', 'biden', 'trump',
    'white house', 'lawmaker', 'bipartisan', 'house', 'political',
    'administration', 'party', 'primary', 'ballot', 'inaugural',
  ],
  'Economy': [
    'market', 'stocks', 'inflation', 'rates', 'fed', 'gdp', 'earnings',
    'investors', 'bonds', 'economy', 'deficit', 'trade', 'tariff',
    'recession', 'growth', 'economic', 'wall street', 'stock', 'dow',
    'nasdaq', 'sp500', 'treasury', 'revenue', 'profit', 'bank',
    'financial', 'spending', 'budget', 'debt', 'interest', 'dollar',
    'commodity', 'oil', 'prices', 'consumer', 'retail', 'jobs',
    'unemployment', 'wages', 'housing',
  ],
  'Military/Foreign': [
    'military', 'iran', 'strikes', 'nuclear', 'defense', 'pentagon',
    'nato', 'russia', 'china', 'war', 'troops', 'missile', 'ukraine',
    'conflict', 'sanctions', 'diplomacy', 'foreign', 'weapons', 'army',
    'navy', 'force', 'attack', 'security', 'intelligence', 'terror',
    'allies', 'treaty', 'cease', 'ceasefire', 'hostage', 'hamas',
    'israel', 'gaza', 'korea', 'taiwan',
  ],
  'Tech/AI': [
    'ai', 'tech', 'semiconductor', 'chip', 'data', 'cyber', 'software',
    'algorithm', 'startup', 'computing', 'technology', 'artificial',
    'intelligence', 'robot', 'automation', 'digital', 'internet',
    'cloud', 'apple', 'google', 'meta', 'microsoft', 'amazon', 'nvidia',
    'openai', 'chatgpt', 'machine learning', 'quantum', 'blockchain',
    'crypto', 'bitcoin', 'app', 'platform',
  ],
  'Legal': [
    'court', 'supreme', 'judge', 'indictment', 'trial', 'attorney',
    'justice', 'ruling', 'lawsuit', 'fbi', 'documents', 'legal',
    'prosecution', 'defendant', 'verdict', 'plea', 'jury', 'charges',
    'convicted', 'sentence', 'appeal', 'investigation', 'subpoena',
    'doj', 'crime', 'criminal', 'law', 'constitutional',
  ],
  'Sports/Culture': [
    'game', 'season', 'player', 'team', 'film', 'music', 'award',
    'championship', 'nfl', 'nba', 'mlb', 'soccer', 'football',
    'basketball', 'baseball', 'coach', 'score', 'match', 'tournament',
    'olympics', 'movie', 'book', 'art', 'theater', 'oscar', 'grammy',
    'celebrity', 'entertainment', 'show', 'concert', 'album',
    'museum', 'broadway',
  ],
};

function tokenize(text) {
  if (!text) return [];
  // Use compromise for lemmatization
  const doc = nlp(text.toLowerCase());
  // Get all terms, normalized
  const terms = doc.terms().out('array');

  const tokens = [];
  for (const term of terms) {
    // Split further on punctuation/whitespace
    const parts = term.split(/[^a-z'-]+/).filter(Boolean);
    for (const p of parts) {
      const cleaned = p.replace(/^['-]+|['-]+$/g, '');
      if (cleaned.length > 1 && !STOPWORDS.has(cleaned) && !/^\d+$/.test(cleaned)) {
        tokens.push(cleaned);
      }
    }
  }
  return tokens;
}

function computeFrequency(articles) {
  const freq = {};
  for (const article of articles) {
    const text = `${article.title} ${article.description}`;
    const tokens = tokenize(text);
    for (const t of tokens) {
      freq[t] = (freq[t] || 0) + 1;
    }
  }
  return freq;
}

function topN(freq, n) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function computeShared(nytFreq, wsjFreq) {
  const shared = [];
  for (const word of Object.keys(nytFreq)) {
    if (wsjFreq[word]) {
      shared.push({ word, nyt: nytFreq[word], wsj: wsjFreq[word] });
    }
  }
  shared.sort((a, b) => (b.nyt + b.wsj) - (a.nyt + a.wsj));
  return shared;
}

function computeUniqueWords(nytFreq, wsjFreq) {
  const nytOnly = [];
  const wsjOnly = [];

  for (const word of Object.keys(nytFreq)) {
    if (!wsjFreq[word]) nytOnly.push([word, nytFreq[word]]);
  }
  for (const word of Object.keys(wsjFreq)) {
    if (!nytFreq[word]) wsjOnly.push([word, wsjFreq[word]]);
  }

  nytOnly.sort((a, b) => b[1] - a[1]);
  wsjOnly.sort((a, b) => b[1] - a[1]);

  return { nytOnly, wsjOnly };
}

function computeRadar(nytFreq, wsjFreq) {
  const categories = Object.keys(TOPIC_CATEGORIES);
  const nytScores = [];
  const wsjScores = [];

  for (const cat of categories) {
    const keywords = TOPIC_CATEGORIES[cat];
    let nytSum = 0;
    let wsjSum = 0;
    for (const kw of keywords) {
      // Handle multi-word keywords
      if (kw.includes(' ')) {
        const parts = kw.split(' ');
        // Check if all parts appear (rough proxy)
        const minNyt = Math.min(...parts.map((p) => nytFreq[p] || 0));
        const minWsj = Math.min(...parts.map((p) => wsjFreq[p] || 0));
        nytSum += minNyt;
        wsjSum += minWsj;
      } else {
        nytSum += nytFreq[kw] || 0;
        wsjSum += wsjFreq[kw] || 0;
      }
    }
    nytScores.push(nytSum);
    wsjScores.push(wsjSum);
  }

  // Normalize to 0-100 scale
  const maxScore = Math.max(...nytScores, ...wsjScores, 1);
  const normalize = (scores) => scores.map((s) => Math.round((s / maxScore) * 100));

  return {
    categories,
    nyt: normalize(nytScores),
    wsj: normalize(wsjScores),
  };
}

function generateFindings(nytFreq, wsjFreq, shared, radar) {
  const findings = [];

  // #1 word across both sources
  const combined = {};
  for (const [w, c] of Object.entries(nytFreq)) combined[w] = (combined[w] || 0) + c;
  for (const [w, c] of Object.entries(wsjFreq)) combined[w] = (combined[w] || 0) + c;
  const topWord = Object.entries(combined).sort((a, b) => b[1] - a[1])[0];
  if (topWord) {
    findings.push(`"${topWord[0]}" dominates coverage across both sources with ${topWord[1]} total mentions.`);
  }

  // Compare category leanings
  const cats = radar.categories;
  const nytMaxIdx = radar.nyt.indexOf(Math.max(...radar.nyt));
  const wsjMaxIdx = radar.wsj.indexOf(Math.max(...radar.wsj));
  if (nytMaxIdx !== wsjMaxIdx) {
    findings.push(`NYT leans toward ${cats[nytMaxIdx]} coverage, while WSJ emphasizes ${cats[wsjMaxIdx]}.`);
  } else {
    findings.push(`Both sources focus heavily on ${cats[nytMaxIdx]} this period.`);
  }

  // Biggest frequency gap on shared words
  if (shared.length > 0) {
    let maxGap = 0;
    let gapWord = null;
    let gapSource = '';
    for (const s of shared) {
      const gap = Math.abs(s.nyt - s.wsj);
      if (gap > maxGap) {
        maxGap = gap;
        gapWord = s.word;
        gapSource = s.nyt > s.wsj ? 'NYT' : 'WSJ';
      }
    }
    if (gapWord && maxGap > 1) {
      const ratio = gapSource === 'NYT'
        ? (nytFreq[gapWord] / (wsjFreq[gapWord] || 1)).toFixed(1)
        : (wsjFreq[gapWord] / (nytFreq[gapWord] || 1)).toFixed(1);
      findings.push(`"${gapWord}" appears ${ratio}x more in ${gapSource} than its counterpart.`);
    }
  }

  // Total article count comparison
  const nytTotal = Object.values(nytFreq).reduce((a, b) => a + b, 0);
  const wsjTotal = Object.values(wsjFreq).reduce((a, b) => a + b, 0);
  if (nytTotal > wsjTotal * 1.2) {
    findings.push(`NYT produced ~${Math.round((nytTotal / wsjTotal - 1) * 100)}% more word volume than WSJ this period.`);
  } else if (wsjTotal > nytTotal * 1.2) {
    findings.push(`WSJ produced ~${Math.round((wsjTotal / nytTotal - 1) * 100)}% more word volume than NYT this period.`);
  }

  return findings;
}

function loadLatestRaw() {
  if (!fs.existsSync(RAW_DIR)) return null;

  const files = fs.readdirSync(RAW_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const latest = path.join(RAW_DIR, files[0]);
  return JSON.parse(fs.readFileSync(latest, 'utf-8'));
}

async function runAnalysis() {
  const rawData = loadLatestRaw();
  if (!rawData) {
    console.error('No raw data found. Run the fetcher first.');
    return null;
  }

  console.log(`Analyzing data from ${rawData.date_range.start} to ${rawData.date_range.end}...`);
  console.log(`  NYT articles: ${rawData.nyt.length}`);
  console.log(`  WSJ articles: ${rawData.wsj.length}`);

  const nytFreq = computeFrequency(rawData.nyt);
  const wsjFreq = computeFrequency(rawData.wsj);

  const nytWords = new Set(Object.keys(nytFreq));
  const wsjWords = new Set(Object.keys(wsjFreq));
  const sharedWords = new Set([...nytWords].filter((w) => wsjWords.has(w)));
  const allWords = new Set([...nytWords, ...wsjWords]);

  const shared = computeShared(nytFreq, wsjFreq);
  const { nytOnly, wsjOnly } = computeUniqueWords(nytFreq, wsjFreq);
  const radar = computeRadar(nytFreq, wsjFreq);
  const findings = generateFindings(nytFreq, wsjFreq, shared, radar);

  const analysis = {
    generated_at: new Date().toISOString(),
    date_range: rawData.date_range,
    stats: {
      nyt_unique: nytWords.size - sharedWords.size,
      wsj_unique: wsjWords.size - sharedWords.size,
      shared: sharedWords.size,
      total: allWords.size,
    },
    nyt_top25: topN(nytFreq, 25),
    wsj_top25: topN(wsjFreq, 25),
    shared_top20: shared.slice(0, 20),
    radar,
    nyt_top10: topN(nytFreq, 10),
    wsj_top10: topN(wsjFreq, 10),
    nyt_only: nytOnly.slice(0, 20).map(([w]) => w),
    wsj_only: wsjOnly.slice(0, 20).map(([w]) => w),
    findings,
  };

  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analysis, null, 2));
  console.log(`Analysis saved to ${ANALYSIS_FILE}`);

  return analysis;
}

module.exports = { runAnalysis, tokenize, computeFrequency };
