const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const DB_PATH = path.join(os.homedir(), 'HealthData', 'DBs', 'garmin_activities.db');
const CLI_PATH = process.env.GARMINDB_CLI_PATH || 'garmindb_cli.py';
const SYNC_TIMEOUT_MS = 2 * 60 * 1000;

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

function healthCheck() {
  try {
    const db = getDb();
    db.close();
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

function getLastWorkout() {
  const db = getDb();
  try {
    const row = db.prepare(`
      SELECT
        name,
        sport,
        start_time,
        elapsed_time,
        distance,
        calories,
        avg_hr
      FROM activities
      ORDER BY start_time DESC
      LIMIT 1
    `).get();

    if (!row) return null;
    return row;
  } finally {
    db.close();
  }
}

function sync() {
  return new Promise((resolve, reject) => {
    const child = execFile(CLI_PATH, ['--activities', '--download', '--import', '--analyze', '--latest'], (error, stdout, stderr) => {
      clearTimeout(timer);
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Sync timed out after 2 minutes'));
    }, SYNC_TIMEOUT_MS);
  });
}

module.exports = { healthCheck, getLastWorkout, sync };
