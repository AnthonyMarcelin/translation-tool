import { useState, useEffect } from 'react';
import { apiJson } from '../../lib/api';
import '../ProjectSettingsPage.css';

const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Manager', developer: 'Développeur', translator: 'Traducteur' };

export default function MembersTab({ project, canManage }) {
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
