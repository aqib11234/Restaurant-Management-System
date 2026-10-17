/**
 * Guards maintenance endpoints (/api/admin, /api/seed).
 * They are disabled unless ADMIN_KEY is set, and then require it in the x-admin-key header.
 */
const crypto = require('crypto');

module.exports = (req, res, next) => {
  const expected = process.env.ADMIN_KEY;
  if (!expected) {
    return res.status(403).json({ message: 'Maintenance endpoints are disabled' });
  }
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ message: 'Invalid admin key' });
  }
  next();
};
