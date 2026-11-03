import axios from 'axios';

let accessToken = null;
let generation = 0;
let unauthorizedHandler = null;

export function setAccessToken(token) {
  accessToken = token || null;
  generation += 1;
  return generation;
}
export function setUnauthorizedHandler(handler) { unauthorizedHandler = handler; }

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

axiosClient.interceptors.request.use(config => {
  config.sessionGeneration = generation;
  config.authenticatedRequest = Boolean(accessToken && config.auth !== false);
  if (config.authenticatedRequest) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});
axiosClient.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && error.config?.authenticatedRequest && error.config.sessionGeneration === generation) unauthorizedHandler?.();
  return Promise.reject(error);
});

export default axiosClient;
