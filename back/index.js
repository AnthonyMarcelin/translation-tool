const express = require('express');
const axios = require('axios');
const cors = require('cors');
const archiver = require('archiver');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const yaml = require('js-yaml');
const db = require('./db-better');

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'translation-tool-secret-change-in-production';
const LIBRE_URL = process.env.LIBRE_URL || 'http://libretranslate:5000';

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'https://translation.drannoc.duckdns.org'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Utilities ───────────────────────────────────────────────────────────────

function slugify(text) {
  return (text || 'project')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateApiKey() {
  const raw = 'tlt_' + crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw), prefix: raw.slice(0, 12) };
}

function generateRefreshToken() {
  const raw = crypto.randomBytes(40).toString('hex');
  return { raw, hash: hashToken(raw) };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '15m' });
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

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

// ─── Role Helpers ─────────────────────────────────────────────────────────────

function getOrgRole(userId, orgId) {
  const m = db.prepare('SELECT role FROM org_members WHERE org_id=? AND user_id=?').get(orgId, userId);
  return m?.role || null;
}

function getProjectRole(userId, projectId) {
  const m = db.prepare('SELECT role FROM project_members WHERE project_id=? AND user_id=?').get(projectId, userId);
  return m?.role || null;
}

function canAccessProject(userId, projectId) {
  return !!getProjectRole(userId, projectId);
}

function canManageProject(userId, projectId) {
  const role = getProjectRole(userId, projectId);
  return role === 'owner' || role === 'manager';
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
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

app.post('/auth/login', async (req, res) => {
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

app.post('/auth/refresh', (req, res) => {
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

  const accessToken = signAccessToken(user);
  res.json({ access_token: accessToken });
});

app.post('/auth/logout', requireAuth, (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash=?').run(hashToken(refresh_token));
  }
  res.json({ ok: true });
});

app.get('/auth/me', requireAuth, (req, res) => {
  const orgs = db.prepare(`
    SELECT o.id, o.name, o.slug, om.role
    FROM organizations o JOIN org_members om ON om.org_id=o.id
    WHERE om.user_id=?
  `).all(req.user.id);
  res.json({ ...req.user, organizations: orgs });
});

// ─── Invitation Routes (public) ───────────────────────────────────────────────

app.get('/invites/:token', (req, res) => {
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

app.post('/invites/:token/accept', async (req, res) => {
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

// ─── v1 Public API (API Key auth) ─────────────────────────────────────────────

function getProjectFromApiKey(req, res) {
  if (!req.apiKey) return null;
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.apiKey.project_id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return null; }
  return project;
}

function buildFlatJson(projectId, lang) {
  const rows = db.prepare(`
    SELECT t.key, v.text FROM translations t
    JOIN translation_values v ON v.translation_id=t.id
    WHERE t.project_id=? AND v.lang=?
    ORDER BY t.key
  `).all(projectId, lang);
  const result = {};
  rows.forEach(r => { result[r.key] = r.text; });
  return result;
}

function buildNestedJson(flat) {
  const result = {};
  Object.entries(flat).forEach(([key, value]) => {
    const parts = key.split('.');
    let obj = result;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) { obj[part] = value; }
      else { obj[part] = obj[part] || {}; obj = obj[part]; }
    });
  });
  return result;
}

// Specific routes MUST come before /v1/export/:lang to avoid param capture
app.get('/v1/export/all', requireAuth, (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  const langs = db.prepare('SELECT lang_code FROM project_languages WHERE project_id=?').all(project.id).map(l => l.lang_code);
  const result = {};
  langs.forEach(lang => { result[lang] = buildFlatJson(project.id, lang); });
  res.json(result);
});

app.get('/v1/export/zip', requireAuth, (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  const langs = db.prepare('SELECT lang_code FROM project_languages WHERE project_id=?').all(project.id).map(l => l.lang_code);

  const archive = archiver('zip', { zlib: { level: 9 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${project.slug}-translations.zip"`);
  archive.pipe(res);

  langs.forEach(lang => {
    archive.append(JSON.stringify(buildFlatJson(project.id, lang), null, 2), { name: `${lang}.json` });
  });
  archive.finalize();
});

app.get('/v1/export/:lang', requireAuth, (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  const { format = 'flat_json' } = req.query;
  const flat = buildFlatJson(project.id, req.params.lang);
  if (format === 'nested_json') return res.json(buildNestedJson(flat));
  if (format === 'yaml') { res.setHeader('Content-Type', 'text/yaml'); return res.send(yaml.dump(flat)); }
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    const lines = ['key,value', ...Object.entries(flat).map(([k, v]) => `"${k}","${v.replace(/"/g, '""')}"`)];

    return res.send(lines.join('\n'));
  }
  res.json(flat);
});

app.post('/v1/import', requireAuth, requireApiKeyWrite, upload.single('file'), (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  handleImport(project.id, null, req, res);
});

// ─── Protected Routes ────────────────────────────────────────────────────────

app.use(requireAuth);

// ─── Organizations ────────────────────────────────────────────────────────────

app.get('/orgs', (req, res) => {
  const orgs = db.prepare(`
    SELECT o.id, o.name, o.slug, o.created_at, om.role
    FROM organizations o JOIN org_members om ON om.org_id=o.id
    WHERE om.user_id=?
    ORDER BY o.name
  `).all(req.user.id);
  res.json(orgs);
});

app.post('/orgs', (req, res) => {
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

app.get('/orgs/:slug', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  const role = getOrgRole(req.user.id, org.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  res.json({ ...org, role });
});

app.put('/orgs/:slug', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const role = getOrgRole(req.user.id, org.id);
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  db.prepare('UPDATE organizations SET name=? WHERE id=?').run(name.trim(), org.id);
  res.json(db.prepare('SELECT * FROM organizations WHERE id=?').get(org.id));
});

app.delete('/orgs/:slug', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  if (getOrgRole(req.user.id, org.id) !== 'owner') return res.status(403).json({ error: 'Only owner can delete organization' });
  db.prepare('DELETE FROM organizations WHERE id=?').run(org.id);
  res.json({ deleted: true });
});

app.get('/orgs/:slug/members', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  if (!getOrgRole(req.user.id, org.id)) return res.status(403).json({ error: 'Access denied' });
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, u.created_at, om.role, om.joined_at
    FROM users u JOIN org_members om ON om.user_id=u.id WHERE om.org_id=?
  `).all(org.id);
  res.json(members);
});

app.post('/orgs/:slug/members', (req, res) => {
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

app.put('/orgs/:slug/members/:userId', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const myRole = getOrgRole(req.user.id, org.id);
  if (myRole !== 'owner' && myRole !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  const { role } = req.body;
  if (!['owner','admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE org_members SET role=? WHERE org_id=? AND user_id=?').run(role, org.id, req.params.userId);
  res.json({ ok: true });
});

app.delete('/orgs/:slug/members/:userId', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE slug=?').get(req.params.slug);
  if (!org) return res.status(404).json({ error: 'Not found' });
  const myRole = getOrgRole(req.user.id, org.id);
  if (myRole !== 'owner' && myRole !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM org_members WHERE org_id=? AND user_id=?').run(org.id, req.params.userId);
  res.json({ deleted: true });
});

// ─── Projects ─────────────────────────────────────────────────────────────────

app.get('/orgs/:slug/projects', (req, res) => {
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

app.post('/orgs/:slug/projects', (req, res) => {
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

app.get('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT p.*, o.slug as org_slug, o.name as org_name FROM projects p JOIN organizations o ON o.id=p.org_id WHERE p.id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const myRole = getProjectRole(req.user.id, project.id);
  const langs = db.prepare('SELECT * FROM project_languages WHERE project_id=? ORDER BY is_source DESC, lang_code').all(project.id);
  const keyCount = db.prepare('SELECT COUNT(*) as c FROM translations WHERE project_id=?').get(project.id).c;
  res.json({ ...project, my_role: myRole, languages: langs, key_count: keyCount });
});

app.put('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { name, description } = req.body;
  if (name) db.prepare('UPDATE projects SET name=? WHERE id=?').run(name.trim(), project.id);
  if (description !== undefined) db.prepare('UPDATE projects SET description=? WHERE id=?').run(description, project.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(project.id));
});

app.delete('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (getProjectRole(req.user.id, project.id) !== 'owner') return res.status(403).json({ error: 'Only owner can delete project' });
  db.prepare('DELETE FROM projects WHERE id=?').run(project.id);
  res.json({ deleted: true });
});

// ─── Project Members ──────────────────────────────────────────────────────────

app.get('/projects/:id/members', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, pm.role, pm.invited_at
    FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=?
  `).all(project.id);
  res.json(members);
});

app.post('/projects/:id/members', (req, res) => {
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

app.delete('/projects/:id/members/:userId', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').run(project.id, req.params.userId);
  res.json({ deleted: true });
});

// ─── Project Invitations ──────────────────────────────────────────────────────

app.post('/projects/:id/invites', (req, res) => {
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

app.get('/projects/:id/invites', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const invites = db.prepare('SELECT * FROM project_invites WHERE project_id=? ORDER BY created_at DESC').all(project.id);
  res.json(invites);
});

// ─── Project Languages ────────────────────────────────────────────────────────

app.get('/projects/:id/languages', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const langs = db.prepare('SELECT * FROM project_languages WHERE project_id=? ORDER BY is_source DESC, lang_code').all(project.id);
  res.json(langs);
});

app.post('/projects/:id/languages', (req, res) => {
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

app.delete('/projects/:id/languages/:langCode', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM project_languages WHERE project_id=? AND lang_code=?').run(project.id, req.params.langCode);
  res.json({ deleted: true });
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

app.get('/projects/:id/api-keys', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const keys = db.prepare('SELECT id, project_id, name, key_prefix, permissions, created_at, last_used_at, expires_at FROM api_keys WHERE project_id=? ORDER BY created_at DESC').all(project.id);
  res.json(keys);
});

app.post('/projects/:id/api-keys', (req, res) => {
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

app.delete('/api-keys/:id', (req, res) => {
  const key = db.prepare('SELECT * FROM api_keys WHERE id=?').get(req.params.id);
  if (!key) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, key.project_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  db.prepare('DELETE FROM api_keys WHERE id=?').run(key.id);
  res.json({ deleted: true });
});

// ─── Translations ─────────────────────────────────────────────────────────────

app.get('/projects/:id/translations', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const { search, page = 1, limit = 100, lang, status, sort = 'key', order = 'asc' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const validSorts = { key: 't.key', created_at: 't.created_at', updated_at: 't.updated_at' };
  const sortCol = validSorts[sort] || 't.key';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  let where = 'WHERE t.project_id=?';
  const params = [project.id];

  if (search?.trim()) {
    where += ` AND (t.key LIKE ? OR EXISTS (
      SELECT 1 FROM translation_values v WHERE v.translation_id=t.id AND v.text LIKE ?
    ))`;
    const q = `%${search.trim()}%`;
    params.push(q, q);
  }

  if (lang && status) {
    where += ` AND EXISTS (SELECT 1 FROM translation_values v WHERE v.translation_id=t.id AND v.lang=? AND v.status=?)`;
    params.push(lang, status);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM translations t ${where}`).get(...params).c;
  const translations = db.prepare(`SELECT t.* FROM translations t ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

  // Load values for each translation
  const result = translations.map(t => {
    const values = db.prepare('SELECT * FROM translation_values WHERE translation_id=?').all(t.id);
    const byLang = {};
    const statusByLang = {};
    const idsByLang = {};
    values.forEach(v => {
      byLang[v.lang] = v.text;
      statusByLang[v.lang] = v.status;
      idsByLang[v.lang] = v.id;
    });
    return { ...t, values: byLang, statuses: statusByLang, value_ids: idsByLang };
  });

  res.json({ data: result, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
});

app.post('/projects/:id/translations', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const { key, description = '' } = req.body;
  if (!key?.trim()) return res.status(400).json({ error: 'key required' });

  try {
    const r = db.prepare('INSERT INTO translations (project_id, key, description) VALUES (?,?,?)').run(project.id, key.trim(), description);
    res.status(201).json(db.prepare('SELECT * FROM translations WHERE id=?').get(r.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Key already exists in this project' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/translations/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  const { key, description } = req.body;
  if (key) {
    try {
      db.prepare('UPDATE translations SET key=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(key.trim(), t.id);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Key already exists' });
      return res.status(500).json({ error: e.message });
    }
  }
  if (description !== undefined) db.prepare('UPDATE translations SET description=? WHERE id=?').run(description, t.id);
  res.json(db.prepare('SELECT * FROM translations WHERE id=?').get(t.id));
});

app.delete('/translations/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  db.prepare('DELETE FROM translations WHERE id=?').run(t.id);
  res.json({ deleted: true });
});

// ─── Translation Values ───────────────────────────────────────────────────────

app.get('/translations/:id/values', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  res.json(db.prepare('SELECT * FROM translation_values WHERE translation_id=?').all(t.id));
});

app.post('/translations/:id/values', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });

  const { lang, text } = req.body;
  if (!lang || text === undefined) return res.status(400).json({ error: 'lang and text required' });

  const existing = db.prepare('SELECT id FROM translation_values WHERE translation_id=? AND lang=?').get(t.id, lang);
  if (existing) {
    db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(text, req.user.id, existing.id);
    db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(t.id);
    res.json(db.prepare('SELECT * FROM translation_values WHERE id=?').get(existing.id));
  } else {
    const r = db.prepare('INSERT INTO translation_values (translation_id, lang, text, updated_by) VALUES (?,?,?,?)').run(t.id, lang, text, req.user.id);
    db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(t.id);
    res.status(201).json(db.prepare('SELECT * FROM translation_values WHERE id=?').get(r.lastInsertRowid));
  }
});

app.put('/values/:id', (req, res) => {
  const v = db.prepare('SELECT tv.*, t.project_id FROM translation_values tv JOIN translations t ON t.id=tv.translation_id WHERE tv.id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, v.project_id)) return res.status(403).json({ error: 'Access denied' });

  const { text, status } = req.body;
  if (text !== undefined) db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(text, req.user.id, v.id);
  if (status) {
    if (!['draft','reviewed','approved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (status === 'approved' && !canManageProject(req.user.id, v.project_id)) {
      return res.status(403).json({ error: 'Only manager+ can approve translations' });
    }
    db.prepare('UPDATE translation_values SET status=? WHERE id=?').run(status, v.id);
  }
  db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(v.translation_id);
  res.json(db.prepare('SELECT * FROM translation_values WHERE id=?').get(v.id));
});

app.delete('/values/:id', (req, res) => {
  const v = db.prepare('SELECT tv.*, t.project_id FROM translation_values tv JOIN translations t ON t.id=tv.translation_id WHERE tv.id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, v.project_id)) return res.status(403).json({ error: 'Access denied' });
  db.prepare('DELETE FROM translation_values WHERE id=?').run(v.id);
  res.json({ deleted: true });
});

// ─── Bulk Operations ──────────────────────────────────────────────────────────

app.post('/projects/:id/translations/bulk-delete', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM translations WHERE id IN (${placeholders}) AND project_id=?`).run(...ids, project.id);
  res.json({ deleted: ids.length });
});

app.post('/projects/:id/translations/bulk-status', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });

  const { ids, lang, status } = req.body;
  if (!Array.isArray(ids) || !lang || !status) return res.status(400).json({ error: 'ids, lang, status required' });
  if (!['draft','reviewed','approved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE translation_values SET status=?
    WHERE lang=? AND translation_id IN (
      SELECT id FROM translations WHERE id IN (${placeholders}) AND project_id=?
    )
  `).run(status, lang, ...ids, project.id);
  res.json({ updated: ids.length });
});

// ─── Auto Translate ───────────────────────────────────────────────────────────

app.post('/translate', async (req, res) => {
  const { text, source, target, translation_id } = req.body;
  if (!text || !source || !target) return res.status(400).json({ error: 'text, source, target required' });

  try {
    const response = await axios.post(`${LIBRE_URL}/translate`, { q: text, source, target, format: 'text' });
    const translated = response.data.translatedText;

    if (translation_id) {
      const t = db.prepare('SELECT * FROM translations WHERE id=?').get(translation_id);
      if (t && canAccessProject(req.user.id, t.project_id)) {
        const existing = db.prepare('SELECT id FROM translation_values WHERE translation_id=? AND lang=?').get(translation_id, target);
        if (existing) {
          db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(translated, req.user.id, existing.id);
        } else {
          db.prepare('INSERT INTO translation_values (translation_id, lang, text, updated_by) VALUES (?,?,?,?)').run(translation_id, target, translated, req.user.id);
        }
        db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(translation_id);
      }
    }

    res.json({ translatedText: translated, lang: target, text: translated });
  } catch (error) {
    console.error('LibreTranslate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Export (authenticated) ───────────────────────────────────────────────────

app.get('/projects/:id/export/zip', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const langs = db.prepare('SELECT lang_code FROM project_languages WHERE project_id=?').all(project.id).map(l => l.lang_code);
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${project.slug}-translations.zip"`);
  archive.pipe(res);
  langs.forEach(lang => {
    archive.append(JSON.stringify(buildFlatJson(project.id, lang), null, 2), { name: `${lang}.json` });
  });
  archive.finalize();
});

app.get('/projects/:id/export/:lang', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const { format = 'flat_json' } = req.query;
  const flat = buildFlatJson(project.id, req.params.lang);
  if (format === 'nested_json') return res.json(buildNestedJson(flat));
  if (format === 'yaml') { res.setHeader('Content-Type', 'text/yaml'); return res.send(yaml.dump(flat)); }
  res.json(flat);
});

// ─── Import ───────────────────────────────────────────────────────────────────

function handleImport(projectId, userId, req, res) {
  const { lang, strategy = 'merge' } = req.body;
  if (!lang) return res.status(400).json({ error: 'lang required' });
  if (!['merge','replace','skip'].includes(strategy)) return res.status(400).json({ error: 'Invalid strategy' });

  let data = {};

  if (req.file) {
    const content = req.file.buffer.toString('utf-8');
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    try {
      if (ext === 'yaml' || ext === 'yml') data = yaml.load(content);
      else if (ext === 'csv') {
        const lines = content.split('\n').slice(1);
        lines.forEach(line => {
          const [key, value] = line.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
          if (key && value !== undefined) data[key] = value;
        });
      } else data = JSON.parse(content);
    } catch (e) {
      return res.status(400).json({ error: `Could not parse file: ${e.message}` });
    }
  } else if (req.body.data) {
    try { data = JSON.parse(req.body.data); } catch { return res.status(400).json({ error: 'Invalid JSON in data field' }); }
  } else {
    return res.status(400).json({ error: 'file or data required' });
  }

  // Flatten nested JSON
  function flattenObj(obj, prefix = '') {
    const result = {};
    Object.entries(obj).forEach(([k, v]) => {
      const newKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        Object.assign(result, flattenObj(v, newKey));
      } else {
        result[newKey] = String(v);
      }
    });
    return result;
  }
  const flat = flattenObj(data);

  let created = 0, updated = 0, skipped = 0;

  if (strategy === 'replace') {
    db.prepare('DELETE FROM translation_values WHERE lang=? AND translation_id IN (SELECT id FROM translations WHERE project_id=?)').run(lang, projectId);
  }

  Object.entries(flat).forEach(([key, text]) => {
    let t = db.prepare('SELECT id FROM translations WHERE project_id=? AND key=?').get(projectId, key);
    if (!t) {
      const r = db.prepare('INSERT INTO translations (project_id, key) VALUES (?,?)').run(projectId, key);
      t = { id: r.lastInsertRowid };
      created++;
    }

    const existing = db.prepare('SELECT id FROM translation_values WHERE translation_id=? AND lang=?').get(t.id, lang);
    if (existing) {
      if (strategy === 'skip') { skipped++; return; }
      db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(text, userId, existing.id);
      updated++;
    } else {
      db.prepare('INSERT INTO translation_values (translation_id, lang, text, updated_by) VALUES (?,?,?,?)').run(t.id, lang, text, userId);
      updated++;
    }
  });

  // Ensure lang is in project_languages
  db.prepare('INSERT OR IGNORE INTO project_languages (project_id, lang_code) VALUES (?,?)').run(projectId, lang);

  res.json({ created, updated, skipped, total: Object.keys(flat).length });
}

app.post('/projects/:id/import', upload.single('file'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  handleImport(project.id, req.user.id, req, res);
});

// ─── Legacy Export (backward compat) ─────────────────────────────────────────

app.get('/export/key/:id', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT lang, text FROM translation_values WHERE translation_id=?').all(req.params.id);
  const result = {};
  rows.forEach(r => { result[r.lang] = r.text; });
  res.json(result);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`[Server] Translation Tool v2 running on port ${port}`);
});
