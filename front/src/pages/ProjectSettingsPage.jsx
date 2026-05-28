import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiJson, apiFormData, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES } from '../constants';
import './ProjectSettingsPage.css';

const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Manager', developer: 'Développeur', translator: 'Traducteur' };

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('members');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson(`/projects/${projectId}`)
      .then(setProject)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="settings-loading">Chargement...</div>;
  if (!project) return null;

  const canManage = project.my_role === 'owner' || project.my_role === 'manager';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Retour</button>
        <div>
          <h1>{project.name} — Paramètres</h1>
          <span className="org-badge">{project.org_name}</span>
        </div>
      </div>

      <div className="settings-tabs">
        {['members', 'languages', 'apikeys', 'import'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ members: 'Membres', languages: 'Langues', apikeys: 'Clés API', import: 'Import' }[t]}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {tab === 'members' && <MembersTab project={project} canManage={canManage} />}
        {tab === 'languages' && <LanguagesTab project={project} canManage={canManage} onUpdate={setProject} />}
        {tab === 'apikeys' && <ApiKeysTab project={project} canManage={canManage} />}
        {tab === 'import' && <ImportTab project={project} canManage={canManage} />}
      </div>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ project, canManage }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newInviteToken, setNewInviteToken] = useState('');

  useEffect(() => {
    apiJson(`/projects/${project.id}/members`).then(setMembers).catch(() => {});
    apiJson(`/projects/${project.id}/invites`).then(setInvites).catch(() => {});
  }, [project.id]);

  async function handleInvite(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await apiJson(`/projects/${project.id}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      setNewInviteToken(`${window.location.origin}/invite/${data.token}`);
      setSuccess(`Invitation créée pour ${email}`);
      setEmail('');
      const newInvites = await apiJson(`/projects/${project.id}/invites`);
      setInvites(newInvites);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(userId) {
    if (!confirm('Retirer ce membre ?')) return;
    await apiJson(`/projects/${project.id}/members/${userId}`, { method: 'DELETE' });
    setMembers(members.filter(m => m.id !== userId));
  }

  return (
    <div className="tab-panel">
      <h2>Membres du projet</h2>

      <div className="members-list">
        {members.map(m => (
          <div key={m.id} className="member-row">
            <div className="member-info">
              <div className="member-avatar">{m.name[0].toUpperCase()}</div>
              <div>
                <div className="member-name">{m.name}</div>
                <div className="member-email">{m.email}</div>
              </div>
            </div>
            <div className="member-right">
              <span className={`role-badge role-${m.role}`}>{ROLE_LABELS[m.role] || m.role}</span>
              {canManage && m.role !== 'owner' && (
                <button className="remove-btn" onClick={() => handleRemove(m.id)}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <div className="invite-section">
          <h3>Inviter un utilisateur</h3>
          {error && <div className="settings-error">{error}</div>}
          {success && (
            <div className="settings-success">
              {success}
              {newInviteToken && (
                <div className="invite-link">
                  <span>Lien d'invitation :</span>
                  <input readOnly value={newInviteToken} onClick={e => e.target.select()} />
                  <button onClick={() => { navigator.clipboard.writeText(newInviteToken); }}>Copier</button>
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleInvite} className="invite-form">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="translator">Traducteur</option>
              <option value="developer">Développeur</option>
              <option value="manager">Manager</option>
            </select>
            <button type="submit" className="settings-btn">Inviter</button>
          </form>

          {invites.length > 0 && (
            <div className="pending-invites">
              <h4>Invitations en attente</h4>
              {invites.filter(i => !i.used_at).map(i => (
                <div key={i.id} className="invite-row">
                  <span>{i.email}</span>
                  <span className={`role-badge role-${i.role}`}>{ROLE_LABELS[i.role]}</span>
                  <span className="invite-expires">Expire {new Date(i.expires_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Languages Tab ────────────────────────────────────────────────────────────

function LanguagesTab({ project, canManage, onUpdate }) {
  const [langs, setLangs] = useState(project.languages || []);
  const [newLang, setNewLang] = useState('');
  const [error, setError] = useState('');

  const activeCodes = langs.map(l => l.lang_code);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newLang) return;
    setError('');
    try {
      await apiJson(`/projects/${project.id}/languages`, {
        method: 'POST',
        body: JSON.stringify({ lang_code: newLang }),
      });
      const updated = await apiJson(`/projects/${project.id}/languages`);
      setLangs(updated);
      setNewLang('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetSource(langCode) {
    await apiJson(`/projects/${project.id}/languages`, {
      method: 'POST',
      body: JSON.stringify({ lang_code: langCode, is_source: 1 }),
    });
    const updated = await apiJson(`/projects/${project.id}/languages`);
    setLangs(updated);
  }

  async function handleRemove(langCode) {
    if (!confirm(`Supprimer la langue ${langCode} ? Cela supprimera toutes les traductions dans cette langue.`)) return;
    await apiJson(`/projects/${project.id}/languages/${langCode}`, { method: 'DELETE' });
    setLangs(langs.filter(l => l.lang_code !== langCode));
  }

  const unusedLangs = LANGUAGES.filter(l => !activeCodes.includes(l.code));

  return (
    <div className="tab-panel">
      <h2>Langues du projet</h2>
      {error && <div className="settings-error">{error}</div>}

      <div className="languages-grid">
        {langs.map(l => {
          const info = LANGUAGES.find(x => x.code === l.lang_code);
          return (
            <div key={l.lang_code} className={`lang-card ${l.is_source ? 'source-lang' : ''}`}>
              <span className="lang-flag">{info?.flag || '🌐'}</span>
              <div className="lang-details">
                <span className="lang-code-label">{l.lang_code.toUpperCase()}</span>
                <span className="lang-name-label">{info?.name || l.lang_code}</span>
                {l.is_source ? <span className="source-badge">Source</span> : null}
              </div>
              {canManage && (
                <div className="lang-actions">
                  {!l.is_source && (
                    <button className="set-source-btn" onClick={() => handleSetSource(l.lang_code)} title="Définir comme langue source">★</button>
                  )}
                  {!l.is_source && (
                    <button className="remove-lang-btn" onClick={() => handleRemove(l.lang_code)}>✕</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canManage && unusedLangs.length > 0 && (
        <form onSubmit={handleAdd} className="add-lang-form">
          <h3>Ajouter une langue</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={newLang} onChange={e => setNewLang(e.target.value)}>
              <option value="">Choisir une langue...</option>
              {unusedLangs.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.name} ({l.code})</option>
              ))}
            </select>
            <button type="submit" className="settings-btn" disabled={!newLang}>Ajouter</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab({ project, canManage }) {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState('read');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiJson(`/projects/${project.id}/api-keys`).then(setKeys).catch(() => {});
  }, [project.id]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setNewKey('');
    try {
      const data = await apiJson(`/projects/${project.id}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name, permissions }),
      });
      setNewKey(data.key);
      setName('');
      const updated = await apiJson(`/projects/${project.id}/api-keys`);
      setKeys(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRevoke(id) {
    if (!confirm('Révoquer cette clé API ? Toutes les intégrations l\'utilisant cesseront de fonctionner.')) return;
    await apiJson(`/api-keys/${id}`, { method: 'DELETE' });
    setKeys(keys.filter(k => k.id !== id));
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const exportUrl = `${API_BASE}/v1/export/{lang}`;

  return (
    <div className="tab-panel">
      <h2>Clés API</h2>
      <p className="tab-description">
        Utilisez une clé API pour fetcher vos traductions depuis vos apps.
        <br />
        <code className="endpoint-example">GET {exportUrl}</code>
        <br />
        <code className="endpoint-example">Header: X-API-Key: tlt_xxxx</code>
      </p>

      {newKey && (
        <div className="new-key-alert">
          <div className="new-key-header">Clé créée — copiez-la maintenant, elle ne sera plus affichée</div>
          <div className="new-key-value">
            <code>{newKey}</code>
            <button onClick={copyKey}>{copied ? '✓ Copié' : 'Copier'}</button>
          </div>
        </div>
      )}

      {error && <div className="settings-error">{error}</div>}

      <div className="keys-list">
        {keys.length === 0 ? (
          <div className="empty-state-small">Aucune clé API créée</div>
        ) : keys.map(k => (
          <div key={k.id} className="key-row">
            <div className="key-info">
              <div className="key-name">{k.name}</div>
              <div className="key-meta">
                <code className="key-prefix">{k.key_prefix}...</code>
                <span className={`perm-badge perm-${k.permissions}`}>{k.permissions}</span>
                {k.last_used_at && <span className="key-last-used">Dernière utilisation : {new Date(k.last_used_at).toLocaleDateString()}</span>}
                {k.expires_at && <span className="key-expires">Expire : {new Date(k.expires_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <button className="revoke-btn" onClick={() => handleRevoke(k.id)}>Révoquer</button>
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={handleCreate} className="create-key-form">
          <h3>Créer une nouvelle clé</h3>
          <div className="key-form-row">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom de la clé (ex: Production App)"
              required
            />
            <select value={permissions} onChange={e => setPermissions(e.target.value)}>
              <option value="read">Lecture seule</option>
              <option value="write">Lecture + Écriture</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="settings-btn">Créer</button>
          </div>
        </form>
      )}

      <div className="api-usage-example">
        <h3>Exemple d'utilisation</h3>
        <pre>{`// Fetch translations in your app
const res = await fetch('${API_BASE}/v1/export/fr', {
  headers: { 'X-API-Key': 'tlt_your_key_here' }
});
const translations = await res.json();
// { "welcome": "Bienvenue", "goodbye": "Au revoir", ... }

// All languages at once
const all = await fetch('${API_BASE}/v1/export/all', {
  headers: { 'X-API-Key': 'tlt_your_key_here' }
});
// { "fr": {...}, "en": {...}, "es": {...} }`}</pre>
      </div>
    </div>
  );
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function ImportTab({ project, canManage }) {
  const [lang, setLang] = useState('');
  const [strategy, setStrategy] = useState('merge');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const projectLangs = project.languages || [];

  async function handleImport(e) {
    e.preventDefault();
    if (!file || !lang) return;
    setError(''); setResult(null); setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lang', lang);
      formData.append('strategy', strategy);
      const data = await apiFormData(`/projects/${project.id}/import`, formData);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tab-panel">
      <h2>Importer des traductions</h2>
      <p className="tab-description">Importez un fichier JSON, YAML ou CSV pour ajouter ou mettre à jour vos traductions.</p>

      {error && <div className="settings-error">{error}</div>}
      {result && (
        <div className="settings-success">
          Import réussi : {result.created} clés créées, {result.updated} mises à jour, {result.skipped} ignorées.
        </div>
      )}

      {canManage ? (
        <form onSubmit={handleImport} className="import-form">
          <div className="field">
            <label>Langue cible</label>
            <select value={lang} onChange={e => setLang(e.target.value)} required>
              <option value="">Choisir une langue...</option>
              {projectLangs.map(l => {
                const info = LANGUAGES.find(x => x.code === l.lang_code);
                return <option key={l.lang_code} value={l.lang_code}>{info?.flag} {l.lang_code.toUpperCase()}</option>;
              })}
            </select>
          </div>

          <div className="field">
            <label>Stratégie</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)}>
              <option value="merge">Fusionner (écraser si existe)</option>
              <option value="skip">Ignorer les existantes</option>
              <option value="replace">Remplacer tout</option>
            </select>
          </div>

          <div className="field">
            <label>Fichier (JSON / YAML / CSV)</label>
            <input type="file" accept=".json,.yaml,.yml,.csv" onChange={e => setFile(e.target.files[0])} required />
          </div>

          <button type="submit" className="settings-btn" disabled={loading || !file || !lang}>
            {loading ? 'Import en cours...' : 'Importer'}
          </button>
        </form>
      ) : (
        <p style={{ color: '#94a3b8' }}>Seuls les owners et managers peuvent importer.</p>
      )}
    </div>
  );
}
