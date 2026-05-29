import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import MembersTab from './settings/MembersTab';
import LanguagesTab from './settings/LanguagesTab';
import ApiKeysTab from './settings/ApiKeysTab';
import ImportTab from './settings/ImportTab';
import './ProjectSettingsPage.css';

const TAB_LABELS = { members: 'Membres', languages: 'Langues', apikeys: 'Clés API', import: 'Import' };

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
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
        {Object.keys(TAB_LABELS).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
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
