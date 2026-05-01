/**
 * Consistent response envelope for all API endpoints.
 *
 * Success: { ok: true, data: { ... } }
 * Error:   { ok: false, error: "ERROR_CODE", message: "Human readable message" }
 */

const ok = (res, data) => res.json({ ok: true, data });

const err = (res, status, error, message) =>
  res.status(status).json({ ok: false, error, message });

module.exports = { ok, err };
