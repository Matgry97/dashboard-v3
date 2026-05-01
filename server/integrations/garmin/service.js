const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const DB_PATH = path.join(os.homedir(), 'HealthData', 'DBs', 'garmin_activities.db');

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
        activity_id,
        name,
        sport,
        sub_sport,
        start_time,
        elapsed_time,
        moving_time,
        distance,
        calories,
        avg_hr,
        max_hr,
        avg_speed,
        ascent,
        training_effect
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
    execFile('garmindb_cli.py', ['--activities', '--download', '--import', '--analyze', '--latest'], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

module.exports = { healthCheck, getLastWorkout, sync };
