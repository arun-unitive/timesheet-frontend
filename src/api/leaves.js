import api from './client';

export const leaveApi = {
  list: (params) => api.get('/leaves', { params }),
  upcoming: (days) => api.get('/leaves/upcoming', { params: days ? { days } : {} }),
  mine: () => api.get('/leaves/mine'),
  create: (payload) => api.post('/leaves', payload),
  update: (id, payload) => api.put(`/leaves/${id}`, payload),
  remove: (id) => api.delete(`/leaves/${id}`),
};
