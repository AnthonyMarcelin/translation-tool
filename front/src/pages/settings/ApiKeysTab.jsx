import { useState, useEffect } from 'react';
import { apiJson, API_BASE } from '../../lib/api';
import '../ProjectSettingsPage.css';

export default function ApiKeysTab({ project, canManage }) {
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
