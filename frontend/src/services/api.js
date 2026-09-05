import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token from localStorage
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('medlens_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred.';
    return Promise.reject(new Error(message));
  }
);

// API methods
export const patientAPI = {
  getAll: (search = '') => API.get(`/patients?search=${encodeURIComponent(search)}`),
  getById: (id) => API.get(`/patients/${id}`),
  create: (data) => API.post('/patients', data),
  update: (id, data) => API.put(`/patients/${id}`, data),
  delete: (id) => API.delete(`/patients/${id}`),
  getTimeline: (id) => API.get(`/patients/${id}/timeline`),
  getComparison: (id) => API.get(`/patients/${id}/compare`),
};

export const reportAPI = {
  upload: (formData, onProgress) =>
    API.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),
  extractPreview: (formData) =>
    API.post('/reports/extract-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getById: (id) => API.get(`/reports/${id}`),
  process: (id) => API.post(`/reports/${id}/process`),
  verify: (id, data) => API.post(`/reports/${id}/verify`, data),
  resolveIdentity: (id, data) => API.post(`/reports/${id}/resolve-identity`, data),
  addManualResult: (id, data) => API.post(`/reports/${id}/manual-result`, data),
};

export const dashboardAPI = {
  getStats: () => API.get('/dashboard/stats'),
  seedDemo: () => API.post('/dashboard/seed'),
};

export default API;
