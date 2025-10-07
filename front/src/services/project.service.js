import {
  ENDPOINTS,
  handleResponse,
  DEFAULT_HEADERS,
} from '../config/api.config';

export const ProjectService = {
  async fetchProjects() {
    const response = await fetch(ENDPOINTS.PROJECTS.BASE);
    const data = await handleResponse(response);
    return data;
  },

  async createProject(name) {
    const response = await fetch(ENDPOINTS.PROJECTS.BASE, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  },

  async renameProject(id, newName) {
    const response = await fetch(`${ENDPOINTS.PROJECTS.BY_ID(id)}`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ newName }),
    });
    return handleResponse(response);
  },

  async deleteProject(id) {
    const response = await fetch(`${ENDPOINTS.PROJECTS.BY_ID(id)}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

export default ProjectService;
