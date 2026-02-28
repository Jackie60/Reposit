require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analysis.json');

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// API: current analysis data
app.get('/api/data', (req, res) => {
  if (!fs.existsSync(ANALYSIS_FILE)) {
    return res.status(404).json({ error: 'No analysis data available yet. The pipeline may still be running.' });
  }
  try {
    const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read analysis data.' });
  }
});

// API: list past analysis files
app.get('/api/history', (req, res) => {
  const rawDir = path.join(DATA_DIR, 'raw');
  if (!fs.existsSync(rawDir)) {
    return res.json({ files: [] });
  }
  const files = fs.readdirSync(rawDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();
  res.json({ files });
});

// Start server and scheduler
app.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
  startScheduler();
});
