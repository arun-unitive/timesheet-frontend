import axios from 'axios';

const TOKEN_KEY = 'timesheet.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/**
 * Single axios instance for the whole app.
 * - attaches the JWT to every request
 * - normalises API errors into `{ message, errors, status }`
 * - broadcasts 401s so the auth layer can log the user out once
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    const normalised = new Error(
      payload?.message || error.message || 'Something went wrong. Please try again.'
    );
    normalised.status = status;
    normalised.errors = payload?.errors || null;
    return Promise.reject(normalised);
  }
);

export default api;
