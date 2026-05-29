const express = require('express');
const db = require('../db-better');
const { slugify } = require('../helpers/crypto');
const { getOrgRole } = require('../helpers/roles');

const router = express.Router();

router.get('/orgs', (req, res) => {
  const orgs = db.prepare(`
    SELECT o.id, o.name, o.slug, o.created_at, om.role
    FROM organizations o JOIN org_members om ON om.org_id=o.id
    WHERE om.user_id=?
    ORDER BY o.name
  `).all(req.user.id);
  res.json(orgs);
});

router.post('/orgs', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const slug = slugify(name.trim()) + '-' + req.user.id + '-' + Date.now();
  try {
    const r = db.prepare('INSERT INTO organizations (name, slug) VALUES (?,?)').run(name.trim(), slugify(name.trim()));
    const orgId = r.lastInsertRowid;
    db.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(orgId, req.user.id, 'owner');
    res.status(201).json(db.prepare('SELECT * FROM organizations WHERE id=?').get(orgId));
  } catch {
    // Try with unique slug
    const uniqueSlug = slugify(name.trim()) + '-' + Date.now();
    const r = db.prepare('INSERT INTO organizations (name, slug) VALUES (?,?)').run(name.trim(), uniqueSlug);
    const orgId = r.lastInsertRowid;
    db.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(orgId, req.user.id, 'owner');
    res.status(201).json(db.prepare('SELECT * FROM organizations WHERE id=?').get(orgId));
  }
});

router.get('/orgs/:slug', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  const role = getOrgRole(req.user.id, org.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  res.json({ ...org, role });
});

router.put('/orgs/:slug', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const role = getOrgRole(req.user.id, org.id);
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  db.prepare('UPDATE organizations SET name=? WHERE id=?').run(name.trim(), org.id);
  res.json(db.prepare('SELECT * FROM organizations WHERE id=?').get(org.id));
});

router.delete('/orgs/:slug', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  if (getOrgRole(req.user.id, org.id) !== 'owner') return res.status(403).json({ error: 'Only owner can delete organization' });
  db.prepare('DELETE FROM organizations WHERE id=?').run(org.id);
  res.json({ deleted: true });
});

router.get('/orgs/:slug/members', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  if (!getOrgRole(req.user.id, org.id)) return res.status(403).json({ error: 'Access denied' });
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, u.created_at, om.role, om.joined_at
    FROM users u JOIN org_members om ON om.user_id=u.id WHERE om.org_id=?
  `).all(org.id);
  res.json(members);
});

router.post('/orgs/:slug/members', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const myRole = getOrgRole(req.user.id, org.id);
  if (myRole !== 'owner' && myRole !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = db.prepare('SELECT id, email, name FROM users WHERE email=?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('INSERT OR REPLACE INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(org.id, user.id, role);
  res.json({ ok: true, user });
});

router.put('/orgs/:slug/members/:userId', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const myRole = getOrgRole(req.user.id, org.id);
  if (myRole !== 'owner' && myRole !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  const { role } = req.body;
  if (!['owner','admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE org_members SET role=? WHERE org_id=? AND user_id=?').run(role, org.id, req.params.userId);
  res.json({ ok: true });
});

router.delete('/orgs/:slug/members/:userId', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const myRole = getOrgRole(req.user.id, org.id);
  if (myRole !== 'owner' && myRole !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM org_members WHERE org_id=? AND user_id=?').run(org.id, req.params.userId);
  res.json({ deleted: true });
});

router.get('/orgs/:slug/projects', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  if (!getOrgRole(req.user.id, org.id)) return res.status(403).json({ error: 'Access denied' });

  const projects = db.prepare(`
    SELECT p.*, pm.role as my_role,
      (SELECT COUNT(*) FROM translations t WHERE t.project_id=p.id) as key_count
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=?
    WHERE p.org_id=?
    ORDER BY p.name
  `).all(req.user.id, org.id);

  res.json(projects);
});

router.post('/orgs/:slug/projects', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const myRole = getOrgRole(req.user.id, org.id);
  if (!myRole) return res.status(403).json({ error: 'Access denied' });

  const { name, description = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const baseSlug = slugify(name.trim());
  let slug = baseSlug;
  let attempt = 0;
  while (db.prepare('SELECT id FROM projects WHERE org_id=? AND slug=?').get(org.id, slug)) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const r = db.prepare('INSERT INTO projects (org_id, name, slug, description) VALUES (?,?,?,?)').run(org.id, name.trim(), slug, description);
  const projectId = r.lastInsertRowid;

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(projectId, req.user.id, 'owner');

  // Default languages
  ['fr','en','es','de','it','nl','pt','ja'].forEach((lang, i) => {
    db.prepare('INSERT INTO project_languages (project_id, lang_code, is_source) VALUES (?,?,?)').run(projectId, lang, i === 0 ? 1 : 0);
  });

  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id=?').get(projectId));
});

module.exports = router;
