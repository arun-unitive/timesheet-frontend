import api from './client';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.patch('/auth/password', payload),
};
