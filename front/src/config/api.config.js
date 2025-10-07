const API_BASE_URL =
  window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/api';

export const ENDPOINTS = {
  TRANSLATIONS: {
    BASE: `${API_BASE_URL}/translations`,
    BY_ID: (id) => `${API_BASE_URL}/translations/${id}`,
    VALUES: (id) => `${API_BASE_URL}/translations/${id}/values`,
    TRANSLATE: `${API_BASE_URL}/translate`,
  },
  PROJECTS: {
    BASE: `${API_BASE_URL}/projects`,
    BY_ID: (id) => `${API_BASE_URL}/projects/${id}`,
  },
};

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Something went wrong');
  }
  if (response.status === 204) {
    return { success: true };
  }
  return response.json();
};
