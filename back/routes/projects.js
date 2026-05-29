const express = require('express');
const crypto = require('crypto');
const db = require('../db-better');
const { getProjectRole, canAccessProject, canManageProject } = require('../helpers/roles');
const { generateApiKey } = require('../helpers/crypto');

const router = express.Router();

router.get('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT p.*, o.slug as org_slug, o.name as org_name FROM projects p JOIN organizations o ON o.id=p.org_id WHERE p.id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const myRole = getProjectRole(req.user.id, project.id);
  const langs = db.prepare('SELECT * FROM project_languages WHERE project_id=? ORDER BY is_source DESC, lang_code').all(project.id);
  const keyCount = db.prepare('SELECT COUNT(*) as c FROM translations WHERE project_id=?').get(project.id).c;
  res.json({ ...project, my_role: myRole, languages: langs, key_count: keyCount });
});

router.put('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { name, description } = req.body;
  if (name) db.prepare('UPDATE projects SET name=? WHERE id=?').run(name.trim(), project.id);
  if (description !== undefined) db.prepare('UPDATE projects SET description=? WHERE id=?').run(description, project.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(project.id));
});

router.delete('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (getProjectRole(req.user.id, project.id) !== 'owner') return res.status(403).json({ error: 'Only owner can delete project' });
  db.prepare('DELETE FROM projects WHERE id=?').run(project.id);
  res.json({ deleted: true });
});

router.get('/projects/:id/members', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, pm.role, pm.invited_at
    FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=?
  `).all(project.id);
  res.json(members);
});

router.post('/projects/:id/members', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { email, role = 'developer' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = db.prepare('SELECT id, email, name FROM users WHERE email=?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(project.id, user.id, role);
  res.json({ ok: true });
});

router.delete('/projects/:id/members/:userId', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').run(project.id, req.params.userId);
  res.json({ deleted: true });
});

router.post('/projects/:id/invites', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });

  const { email, role = 'developer' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO project_invites (project_id, email, role, token, expires_at) VALUES (?,?,?,?,?)').run(project.id, email.toLowerCase(), role, token, expires);

  // In production: send email. For now return token.
  console.log(`[Invite] Token for ${email}: ${token}`);
  res.status(201).json({ token, invite_url: `/invite/${token}`, expires_at: expires });
});

router.get('/projects/:id/invites', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const invites = db.prepare('SELECT * FROM project_invites WHERE project_id=? ORDER BY created_at DESC').all(project.id);
  res.json(invites);
});

router.get('/projects/:id/languages', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const langs = db.prepare('SELECT * FROM project_languages WHERE project_id=? ORDER BY is_source DESC, lang_code').all(project.id);
  res.json(langs);
});

router.post('/projects/:id/languages', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { lang_code, is_source = 0 } = req.body;
  if (!lang_code) return res.status(400).json({ error: 'lang_code required' });
  try {
    if (is_source) {
      db.prepare('UPDATE project_languages SET is_source=0 WHERE project_id=?').run(project.id);
    }
    db.prepare('INSERT OR REPLACE INTO project_languages (project_id, lang_code, is_source) VALUES (?,?,?)').run(project.id, lang_code, is_source ? 1 : 0);
    res.status(201).json({ project_id: project.id, lang_code, is_source });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/projects/:id/languages/:langCode', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM project_languages WHERE project_id=? AND lang_code=?').run(project.id, req.params.langCode);
  res.json({ deleted: true });
});

router.get('/projects/:id/api-keys', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const keys = db.prepare('SELECT id, project_id, name, key_prefix, permissions, created_at, last_used_at, expires_at FROM api_keys WHERE project_id=? ORDER BY created_at DESC').all(project.id);
  res.json(keys);
});

router.post('/projects/:id/api-keys', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { name, permissions = 'read', expires_at } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  if (!['read','write','admin'].includes(permissions)) return res.status(400).json({ error: 'Invalid permissions' });

  const { raw, hash, prefix } = generateApiKey();
  db.prepare('INSERT INTO api_keys (project_id, name, key_hash, key_prefix, permissions, expires_at) VALUES (?,?,?,?,?,?)').run(project.id, name.trim(), hash, prefix, permissions, expires_at || null);

  res.status(201).json({ key: raw, prefix, name: name.trim(), permissions, note: 'Store this key securely — it will not be shown again.' });
});

router.delete('/api-keys/:id', (req, res) => {
  const key = db.prepare('SELECT * FROM api_keys WHERE id=?').get(req.params.id);
  if (!key) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, key.project_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM api_keys WHERE id=?').run(key.id);
  res.json({ deleted: true });
});

module.exports = router;
