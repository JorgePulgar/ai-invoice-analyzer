// Express error handler — captures synchronous errors and `next(err)` from async routes.
// Async routes must wrap logic in try/catch and call `next(err)` on failure.
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({ success: false, error: message });
}

module.exports = errorHandler;
