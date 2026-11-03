import api from './client';

export const employeeApi = {
  list: (params) => api.get('/employees', { params }),
  options: () => api.get('/employees/options'),
  get: (id) => api.get(`/employees/${id}`),
  create: (payload) => api.post('/employees', payload),
  update: (id, payload) => api.put(`/employees/${id}`, payload),
  setStatus: (id, isActive) => api.patch(`/employees/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/employees/${id}`),
};
