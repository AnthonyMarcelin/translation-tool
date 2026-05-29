const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db-better');
const { signAccessToken, generateRefreshToken } = require('../helpers/crypto');

const router = express.Router();

router.get('/invites/:token', (req, res) => {
  const invite = db.prepare(`
    SELECT pi.*, p.name as project_name, p.id as project_id, o.name as org_name
    FROM project_invites pi
    JOIN projects p ON p.id=pi.project_id
    JOIN organizations o ON o.id=p.org_id
    WHERE pi.token=? AND pi.used_at IS NULL
  `).get(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invite not found or already used' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'Invite expired' });
  res.json({ email: invite.email, role: invite.role, project_name: invite.project_name, org_name: invite.org_name });
});

router.post('/invites/:token/accept', async (req, res) => {
  const { name, password } = req.body;
  const invite = db.prepare('SELECT * FROM project_invites WHERE token=? AND used_at IS NULL').get(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invite not found or already used' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'Invite expired' });

  let user = db.prepare('SELECT id, email, name FROM users WHERE email=?').get(invite.email);

  if (!user) {
    if (!name || !password) return res.status(400).json({ error: 'name and password required to create account' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = await bcrypt.hash(password, 10);
    const r = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run(invite.email, hash, name.trim());
    user = db.prepare('SELECT id, email, name FROM users WHERE id=?').get(r.lastInsertRowid);
  }

  db.prepare('INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(invite.project_id, user.id, invite.role);
  db.prepare("UPDATE project_invites SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(invite.id);

  // Also add to org
  const project = db.prepare('SELECT org_id FROM projects WHERE id=?').get(invite.project_id);
  if (project) {
    db.prepare('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(project.org_id, user.id, 'member');
  }

  const accessToken = signAccessToken(user);
  const rt = generateRefreshToken();
  const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)').run(user.id, rt.hash, exp);

  res.json({ user, access_token: accessToken, refresh_token: rt.raw });
});

module.exports = router;
