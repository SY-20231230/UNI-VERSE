import { createTransport, sessionApiOptions } from './api';

const request = createTransport(sessionApiOptions);

export const marketApi = {
  createItem: (data) => request('/market/items', { method: 'POST', body: data }),
  updateItem: (id, data) => request(`/market/items/${id}`, { method: 'PATCH', body: data }),
};
