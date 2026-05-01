const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const { ok, err } = require('../../lib/response');
const service = require('./service');

const router = express.Router();

router.get('/last-workout', asyncHandler(async (req, res) => {
  let workout;
  try {
    workout = service.getLastWorkout();
  } catch (e) {
    return err(res, 503, 'DB_NOT_FOUND', `Could not open Garmin DB: ${e.message}`);
  }

  if (!workout) {
    return err(res, 404, 'NO_DATA', 'No activities found in the database.');
  }

  ok(res, workout);
}));

router.post('/sync', asyncHandler(async (req, res) => {
  try {
    await service.sync();
  } catch (e) {
    return err(res, 502, 'SYNC_FAILED', `Sync failed: ${e.message}`);
  }

  let workout;
  try {
    workout = service.getLastWorkout();
  } catch (e) {
    return err(res, 503, 'DB_NOT_FOUND', `Sync succeeded but could not read DB: ${e.message}`);
  }

  ok(res, workout);
}));

module.exports = router;
