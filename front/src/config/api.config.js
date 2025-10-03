const API_BASE_URL =
  window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/api';

export const ENDPOINTS = {
  TRANSLATIONS: {
    BASE: `${API_BASE_URL}/translations`,
    BY_ID: (id) => `${API_BASE_URL}/translations/${id}`,
    VALUES: (id) => `${API_BASE_URL}/translations/${id}/values`,
  },
  PROJECTS: {
    BY_NAME: (name) => `${API_BASE_URL}/projects/${name}`,
  },
  VALUES: {
    BY_ID: (id) => `${API_BASE_URL}/values/${id}`,
  },
  TRANSLATE: `${API_BASE_URL}/translate`,
  EXPORT: (project) => `${API_BASE_URL}/export/${project}`,
};

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Something went wrong');
  }
  return response.json();
};
