import { useApp } from "../context/AppContext";
import "./Sidebar.css";

const Sidebar = () => {
  const { projects, currentProject, sidebarOpen, dispatch, actions } = useApp();

  const handleProjectSelect = (project) => {
    dispatch({ type: actions.SET_CURRENT_PROJECT, payload: project });
  };

  const handleCreateProject = () => {
    const name = prompt("Nom du nouveau projet :");
    if (name && name.trim()) {
      // Simple update without API call for now
      const newProjects = [...projects, name.trim()];
      dispatch({ type: actions.SET_PROJECTS, payload: newProjects });
      dispatch({ type: actions.SET_CURRENT_PROJECT, payload: name.trim() });
    }
  };

  const handleDeleteProject = async (project, e) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Supprimer le projet "${project}" et toutes ses traductions ?`,
      )
    ) {
      try {
        await fetch(`http://localhost:3001/projects/${project}`, {
          method: "DELETE",
        });
        const newProjects = projects.filter((p) => p !== project);
        dispatch({ type: actions.SET_PROJECTS, payload: newProjects });

        if (currentProject === project) {
          dispatch({ type: actions.SET_CURRENT_PROJECT, payload: "" });
          dispatch({ type: actions.SET_TRANSLATIONS, payload: [] });
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("Erreur lors de la suppression du projet");
      }
    }
  };

  if (!sidebarOpen) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🌍 Translation Tool</h2>
        <button
          className="sidebar-toggle"
          onClick={() => dispatch({ type: actions.TOGGLE_SIDEBAR })}
        >
          ✕
        </button>
      </div>

      <div className="sidebar-content">
        <div className="projects-section">
          <div className="section-header">
            <h3>Projets</h3>
            <button
              className="btn-icon"
              onClick={handleCreateProject}
              title="Nouveau projet"
            >
              ➕
            </button>
          </div>

          <div className="projects-list">
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>Aucun projet</p>
                <button onClick={handleCreateProject} className="btn-primary">
                  Créer le premier projet
                </button>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project}
                  className={`project-item ${
                    currentProject === project ? "active" : ""
                  }`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <span className="project-name">📁 {project}</span>
                  <button
                    className="btn-icon delete-btn"
                    onClick={(e) => handleDeleteProject(project, e)}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {currentProject && (
          <div className="current-project-info">
            <h4>Projet actuel</h4>
            <div className="project-badge">📁 {currentProject}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
