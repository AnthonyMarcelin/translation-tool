const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db-better');
const { slugify, signAccessToken, generateRefreshToken, hashToken } = require('../helpers/crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run(email.trim().toLowerCase(), hash, name.trim());
    const user = db.prepare('SELECT id, email, name FROM users WHERE id=?').get(result.lastInsertRowid);

    // Create personal org
    const orgSlug = slugify(name.trim()) + '-' + user.id;
    let orgId;
    try {
      const r = db.prepare('INSERT INTO organizations (name, slug) VALUES (?,?)').run(name.trim() + "'s Workspace", orgSlug);
      orgId = r.lastInsertRowid;
    } catch {
      orgId = db.prepare('SELECT id FROM organizations WHERE slug=?').get(orgSlug).id;
    }
    db.prepare('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(orgId, user.id, 'owner');

    const accessToken = signAccessToken(user);
    const rt = generateRefreshToken();
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)').run(user.id, rt.hash, exp);

    res.status(201).json({ user, access_token: accessToken, refresh_token: rt.raw });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken(user);
  const rt = generateRefreshToken();
  const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)').run(user.id, rt.hash, exp);

  res.json({ user: { id: user.id, email: user.email, name: user.name }, access_token: accessToken, refresh_token: rt.raw });
});

router.post('/auth/refresh', (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const hash = hashToken(refresh_token);
  const record = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash=?').get(hash);
  if (!record) return res.status(401).json({ error: 'Invalid refresh token' });
  if (new Date(record.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id=?').run(record.id);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const user = db.prepare('SELECT id, email, name FROM users WHERE id=?').get(record.user_id);
  if (!user) return res.status(401).json({ error: 'User not found' });

  // Rotate: delete old token, issue a new one
  db.prepare('DELETE FROM refresh_tokens WHERE id=?').run(record.id);
  const newRt = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)').run(user.id, newRt.hash, expiresAt);

  const accessToken = signAccessToken(user);
  res.json({ access_token: accessToken, refresh_token: newRt.raw });
});

router.post('/auth/logout', requireAuth, (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash=?').run(hashToken(refresh_token));
  }
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const orgs = db.prepare(`
    SELECT o.id, o.name, o.slug, om.role
    FROM organizations o JOIN org_members om ON om.org_id=o.id
    WHERE om.user_id=?
  `).all(req.user.id);
  res.json({ ...req.user, organizations: orgs });
});

module.exports = router;
