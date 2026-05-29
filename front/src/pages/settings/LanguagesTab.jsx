import { useState } from 'react';
import { apiJson } from '../../lib/api';
import { LANGUAGES } from '../../constants';
import '../ProjectSettingsPage.css';

export default function LanguagesTab({ project, canManage, onUpdate }) {
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
