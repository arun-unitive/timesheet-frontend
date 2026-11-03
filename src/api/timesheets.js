import api from './client';

export const timesheetApi = {
  list: (params) => api.get('/timesheets', { params }),
  summary: (params) => api.get('/timesheets/summary', { params }),
  getToday: (employee) => api.get('/timesheets/today', { params: { employee } }),
  getProjects: () => api.get('/timesheets/projects'),
  getById: (id) => api.get(`/timesheets/${id}`),
  saveDay: (payload) => api.post('/timesheets', payload),
  update: (id, payload) => api.put(`/timesheets/${id}`, payload),
  remove: (id) => api.delete(`/timesheets/${id}`),
};
