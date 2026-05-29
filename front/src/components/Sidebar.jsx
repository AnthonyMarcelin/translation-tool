import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { apiJson } from "../lib/api";
import "./ProjectActions.css";
import "./Sidebar.css";

const Sidebar = () => {
  const { orgs, projects, currentProject, currentOrg, sidebarOpen, dispatch, actions } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleProjectSelect = (project) => {
    dispatch({ type: actions.SET_CURRENT_PROJECT, payload: project });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !currentOrg) return;
    try {
      const project = await apiJson(`/orgs/${currentOrg.slug}/projects`, {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      dispatch({ type: actions.SET_PROJECTS, payload: [...projects, project] });
      dispatch({ type: actions.SET_CURRENT_PROJECT, payload: project });
      setNewName("");
      setCreating(false);
    } catch (err) {
      alert(err.message || "Erreur lors de la création du projet");
    }
  };

  const handleDeleteProject = async (project, e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer "${project.name}" et toutes ses traductions ?`)) return;
    try {
      await apiJson(`/projects/${project.id}`, { method: "DELETE" });
      const newProjects = projects.filter((p) => p.id !== project.id);
      dispatch({ type: actions.SET_PROJECTS, payload: newProjects });
      if (currentProject?.id === project.id) {
        dispatch({ type: actions.SET_CURRENT_PROJECT, payload: null });
        dispatch({ type: actions.SET_TRANSLATIONS, payload: [] });
      }
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!sidebarOpen) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🌍 Translation Tool</h2>
        <button className="sidebar-toggle" onClick={() => dispatch({ type: actions.TOGGLE_SIDEBAR })}>✕</button>
      </div>

      {/* User info */}
      {user && (
        <div className="sidebar-user">
          <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Se déconnecter">⏏</button>
        </div>
      )}

      {/* Org selector */}
      {orgs.length > 1 && (
        <div className="org-selector">
          <label>Organisation</label>
          <select value={currentOrg?.slug || ""} onChange={(e) => {
            const org = orgs.find(o => o.slug === e.target.value);
            dispatch({ type: actions.SET_CURRENT_ORG, payload: org });
          }}>
            {orgs.map(o => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          </select>
        </div>
      )}

      <div className="sidebar-content">
        <div className="projects-section">
          <div className="section-header">
            <h3>Projets {currentOrg && <span className="org-tag">{currentOrg.name}</span>}</h3>
            <button className="btn-icon" onClick={() => setCreating(true)} title="Nouveau projet">➕</button>
          </div>

          {creating && (
            <form onSubmit={handleCreateProject} className="new-project-form">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nom du projet"
                autoFocus
              />
              <div className="new-project-actions">
                <button type="submit" className="btn-create">Créer</button>
                <button type="button" className="btn-cancel" onClick={() => { setCreating(false); setNewName(""); }}>Annuler</button>
              </div>
            </form>
          )}

          <div className="projects-list">
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>Aucun projet</p>
                <button onClick={() => setCreating(true)} className="btn-primary">Créer le premier projet</button>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`project-item ${currentProject?.id === project.id ? "active" : ""}`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <span className="project-name">📁 {project.name}</span>
                  {project.key_count !== undefined && (
                    <span className="project-key-count">{project.key_count}</span>
                  )}
                  <div className="project-actions">
                    <button
                      className="btn-icon settings-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/settings`); }}
                      title="Paramètres"
                    >
                      ⚙️
                    </button>
                    {(project.my_role === "owner" || project.my_role === "manager") && (
                      <button className="btn-icon delete-btn" onClick={(e) => handleDeleteProject(project, e)} title="Supprimer">🗑️</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
