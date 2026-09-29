import { createTransport } from './api.js';

export function createChatApi(options = {}) {
  const request = createTransport(options);
  
  return {
    createRoom: async (data) => request('/chat/rooms', { method: 'POST', body: data }),
    getMyRooms: async () => request('/chat/rooms'),
    getMessages: async (roomId) => request(`/chat/rooms/${roomId}/messages`),
    deleteRoom: async (roomId) => request(`/chat/rooms/${roomId}`, { method: 'DELETE' })
  };
}
