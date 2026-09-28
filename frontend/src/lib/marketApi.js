import { createTransport } from './api';
import { sessionApiOptions } from './session';

const request = createTransport(sessionApiOptions);

export const marketApi = {
  getItems: (params = {}) => request('/market', { method: 'GET', query: params }),
  getItem: (id) => request(`/market/${id}`, { method: 'GET' }),
  createItem: (data) => request('/market', { method: 'POST', body: data }),
  updateItem: (id, data) => request(`/market/${id}`, { method: 'PUT', body: data }),
  deleteItem: (id) => request(`/market/${id}`, { method: 'DELETE' }),
  favoriteItem: (id) => request(`/market/${id}/favorites`, { method: 'POST' }),
  unfavoriteItem: (id) => request(`/market/${id}/favorites`, { method: 'DELETE' }),
  uploadImage: (formData) => request('/images', { method: 'POST', body: formData }),
};
