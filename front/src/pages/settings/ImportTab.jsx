import { useState } from 'react';
import { apiFormData } from '../../lib/api';
import { LANGUAGES } from '../../constants';
import '../ProjectSettingsPage.css';

export default function ImportTab({ project, canManage }) {
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
