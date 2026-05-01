/**
 * Wraps an async Express route handler and forwards any thrown errors
 * to Express's next() so they're handled by the error middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
