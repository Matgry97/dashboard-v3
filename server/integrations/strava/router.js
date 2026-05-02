const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const { ok, err } = require('../../lib/response');
const service = require('./service');

const router = express.Router();

router.get('/last-run', asyncHandler(async (req, res) => {
  let run;
  try {
    run = await service.getLastRun();
  } catch (e) {
    return err(res, 502, 'STRAVA_ERROR', e.message);
  }
  if (!run) return err(res, 404, 'NO_DATA', 'No runs found.');
  ok(res, run);
}));

// Same as last-run but called explicitly by the frontend sync button
// to bypass the frontend cache and get fresh data
router.post('/sync', asyncHandler(async (req, res) => {
  let run;
  try {
    run = await service.getLastRun();
  } catch (e) {
    return err(res, 502, 'STRAVA_ERROR', e.message);
  }
  if (!run) return err(res, 404, 'NO_DATA', 'No runs found.');
  ok(res, run);
}));

module.exports = router;
