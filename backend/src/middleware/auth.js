const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'Unauthorized', 401);
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return fail(res, 'Unauthorized', 401);
  }
}

module.exports = { authenticate };
