const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const { ok, err } = require('../../lib/response');
const { CATEGORIES } = require('./sources');
const service = require('./service');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const category = req.query.category || 'tech';
  if (!CATEGORIES.includes(category)) {
    return err(res, 400, 'BAD_REQUEST', `category must be one of: ${CATEGORIES.join(', ')}`);
  }

  const data = await service.getNews(category);
  if (data.sections.length > 0 && data.sections.every((s) => s.error)) {
    return err(res, 502, 'NEWS_UNAVAILABLE', 'All news sources failed to load');
  }
  ok(res, data);
}));

module.exports = router;
