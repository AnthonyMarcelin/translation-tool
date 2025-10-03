import { ENDPOINTS, handleResponse } from '../config/api.config';

export const ProjectService = {
  async fetchProjects() {
    const response = await fetch(ENDPOINTS.TRANSLATIONS.BASE);
    const data = await handleResponse(response);
    return [...new Set(data.map((t) => t.project))].filter(Boolean);
  },

  async deleteProject(projectName) {
    const response = await fetch(ENDPOINTS.PROJECTS.BY_NAME(projectName), {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async exportProject(project, languages) {
    const response = await fetch(
      `${ENDPOINTS.EXPORT(project)}?langs=${languages.join(',')}`,
    );
    return handleResponse(response);
  },
};

export default ProjectService;
