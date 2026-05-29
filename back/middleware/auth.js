const jwt = require('jsonwebtoken');
const db = require('../db-better');
const { hashToken } = require('../helpers/crypto');
const { JWT_SECRET } = require('../config');

function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const keyHash = hashToken(apiKey);
    const key = db.prepare('SELECT * FROM api_keys WHERE key_hash=?').get(keyHash);
    if (!key) return res.status(401).json({ error: 'Invalid API key' });
    if (key.expires_at && new Date(key.expires_at) < new Date()) return res.status(401).json({ error: 'API key expired' });
    db.prepare('UPDATE api_keys SET last_used_at=CURRENT_TIMESTAMP WHERE id=?').run(key.id);
    req.apiKey = key;
    req.projectId = key.project_id;
    req.user = { id: null, role: 'api' };
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = db.prepare('SELECT id, email, name FROM users WHERE id=?').get(payload.sub);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireApiKeyWrite(req, res, next) {
  if (req.apiKey && req.apiKey.permissions === 'read') {
    return res.status(403).json({ error: 'API key has read-only permissions' });
  }
  next();
}

module.exports = { requireAuth, requireApiKeyWrite };
