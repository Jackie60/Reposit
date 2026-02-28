const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { fetchAllSources, formatDate } = require('./fetcher');
const { runAnalysis } = require('./analyzer');

const LOGS_DIR = path.join(__dirname, 'data', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function log(message) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  const logFile = path.join(LOGS_DIR, `${formatDate(new Date())}.log`);
  fs.appendFileSync(logFile, line);
  console.log(line.trim());
}

async function runPipeline() {
  log('Pipeline started');
  try {
    log('Fetching articles...');
    await fetchAllSources();
    log('Fetch complete. Running analysis...');
    const result = await runAnalysis();
    if (result) {
      log(`Analysis complete. Stats: ${JSON.stringify(result.stats)}`);
    } else {
      log('Analysis returned no results (no raw data available).');
    }
  } catch (err) {
    log(`Pipeline error: ${err.message}`);
    console.error(err);
  }
  log('Pipeline finished');
}

function checkAndRunOnStartup() {
  const analysisFile = path.join(__dirname, 'data', 'analysis.json');
  const rawFile = path.join(__dirname, 'data', 'raw', `${formatDate(new Date())}.json`);

  if (!fs.existsSync(analysisFile) || !fs.existsSync(rawFile)) {
    log('No data for today found on startup. Running pipeline now...');
    return runPipeline();
  }
  log('Data for today already exists. Skipping startup run.');
  return Promise.resolve();
}

function startScheduler() {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => {
    log('Scheduled daily run triggered');
    runPipeline();
  });

  log('Scheduler started. Daily run at 6:00 AM.');

  // Check on startup
  return checkAndRunOnStartup();
}

module.exports = { startScheduler, runPipeline };
