import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiJson(`/invites/${token}`)
      .then(setInvite)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = user ? {} : { name, password };
      const data = await apiJson(`/invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('current_user', JSON.stringify(data.user));
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="auth-page"><div className="auth-card"><p style={{color:'#94a3b8', textAlign:'center'}}>Chargement...</p></div></div>;
  if (error) return <div className="auth-page"><div className="auth-card"><div className="auth-error">{error}</div></div></div>;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌍</span>
          <h1>Invitation</h1>
          <p>Rejoindre <strong style={{color:'#f1f5f9'}}>{invite?.project_name}</strong></p>
        </div>

        <div style={{ background: '#0f172a', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          <div><strong style={{color:'#f1f5f9'}}>{invite?.email}</strong> est invité(e) comme <strong style={{color:'#818cf8'}}>{invite?.role}</strong></div>
          <div style={{ marginTop: '0.25rem' }}>Organisation : {invite?.org_name}</div>
        </div>

        <form onSubmit={handleAccept} className="auth-form">
          {!user && (
            <>
              <div className="field">
                <label>Votre nom</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
              </div>
              <div className="field">
                <label>Choisir un mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" required />
              </div>
            </>
          )}
          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Acceptation...' : 'Accepter et rejoindre'}
          </button>
        </form>
      </div>
    </div>
  );
}
