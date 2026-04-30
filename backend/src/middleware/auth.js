const jwt = require('jsonwebtoken');

// Verifies the JWT from the `Authorization: Bearer <token>` header.
// Sets `req.user = { id, email }` when valid.
function authenticate(req, res, next) {
  // TODO: implement
  return res.status(501).json({ success: false, error: 'Not implemented' });
}

module.exports = { authenticate };
