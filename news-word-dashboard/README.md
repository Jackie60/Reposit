# NYT vs WSJ Word Frequency Dashboard

A self-updating dashboard that fetches NYT and WSJ headlines daily, performs word frequency analysis, and serves an interactive Chart.js dashboard showing comparative coverage patterns.

## Features

- **Daily auto-fetching** of headlines from NYT and WSJ via NewsAPI
- **NLP pipeline** with tokenization, stopword removal, and lemmatization (via `compromise`)
- **Topic categorization** across Politics, Economy, Military/Foreign, Tech/AI, Legal, and Sports/Culture
- **Interactive dashboard** with 7 chart sections:
  - Stats bar (unique/shared word counts)
  - Top 25 horizontal bar charts per source
  - Side-by-side shared word comparison
  - Topic category radar chart
  - Distinctive word pills
  - Doughnut charts for top 10 words
  - Auto-generated key findings
- **Dark theme** with Playfair Display + DM Sans typography
- **Auto-refresh** every 30 minutes

## Quick Start

1. Install dependencies:
   ```bash
   cd news-word-dashboard
   npm install
   ```

2. Get a free API key from [NewsAPI.org](https://newsapi.org)

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env and add your NEWS_API_KEY
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Visit [http://localhost:3000](http://localhost:3000)

## Architecture

```
news-word-dashboard/
├── server.js         # Express server + API routes
├── fetcher.js        # NewsAPI fetching logic
├── analyzer.js       # Word frequency / NLP pipeline
├── scheduler.js      # Cron job (daily at 6 AM)
├── data/
│   ├── raw/          # Daily raw fetch JSON files
│   ├── logs/         # Pipeline run logs
│   └── analysis.json # Current analysis (served to frontend)
├── public/
│   └── index.html    # Chart.js dashboard
├── .env              # API keys (not committed)
└── .env.example      # Template for .env
```

## API Endpoints

| Route          | Description                      |
|----------------|----------------------------------|
| `GET /`        | Dashboard HTML                   |
| `GET /api/data`| Current analysis JSON            |
| `GET /api/history` | List of past raw data files  |

## How It Works

1. **Fetcher** pulls articles from NewsAPI filtered by source (NYT, WSJ) for a configurable rolling date range (default: 7 days)
2. **Analyzer** tokenizes headlines + descriptions, removes stopwords, computes per-source word frequencies, identifies shared/unique words, scores topic categories, and generates key findings
3. **Scheduler** runs the pipeline daily at 6 AM (and on startup if no data exists)
4. **Server** serves the dashboard and analysis JSON via Express

## Configuration

| Variable             | Default | Description                    |
|----------------------|---------|--------------------------------|
| `NEWS_API_KEY`       | —       | Your NewsAPI.org API key       |
| `PORT`               | 3000    | Server port                    |
| `FETCH_INTERVAL_HOURS` | 24   | Hours between fetches          |
| `DATE_RANGE_DAYS`    | 7       | Rolling window in days         |
