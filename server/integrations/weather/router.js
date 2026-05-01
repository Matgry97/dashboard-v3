const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const { ok, err } = require('../../lib/response');
const service = require('./service');

const router = express.Router();

router.get('/current', asyncHandler(async (req, res) => {
  let data;
  try {
    data = await service.getForecast();
  } catch (e) {
    return err(res, 502, 'WEATHER_UNAVAILABLE', e.message);
  }
  ok(res, data);
}));

module.exports = router;
