import { createTransport } from './api';
import { sessionApiOptions } from './session';

const request = createTransport(sessionApiOptions);

export const communityApi = {
  getPosts: (params = {}) => request('/community/posts', { method: 'GET', query: params, auth: false }),
  getPost: (id) => request(`/community/posts/${id}`, { method: 'GET', auth: false }),
  createPost: (data) => request('/community/posts', { method: 'POST', body: data }),
  updatePost: (id, data) => request(`/community/posts/${id}`, { method: 'PATCH', body: data }),
  deletePost: (id) => request(`/community/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => request(`/community/posts/${id}/likes`, { method: 'POST' }),
  unlikePost: (id) => request(`/community/posts/${id}/likes`, { method: 'DELETE' }),
  getComments: (id, params = {}) => request(`/community/posts/${id}/comments`, { method: 'GET', query: params, auth: false }),
  addComment: (id, data) => request(`/community/posts/${id}/comments`, { method: 'POST', body: data }),
  updateComment: (commentId, data) => request(`/community/comments/${commentId}`, { method: 'PATCH', body: data }),
  deleteComment: (commentId) => request(`/community/comments/${commentId}`, { method: 'DELETE' }),
};
