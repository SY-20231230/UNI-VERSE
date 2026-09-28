import { createTransport } from './api';
import { sessionApiOptions } from './session';

// trades 컨트롤러는 /api/v1/trades 에 매핑됨
const request = createTransport(sessionApiOptions);

export const tradeApi = {
  proposeTrade: (itemId) => request('/trades', { method: 'POST', body: { itemId } }),
  getTradeByItem: (itemId) => request(`/trades/item/${itemId}`),
  getTradeDetail: (tradeId) => request(`/trades/${tradeId}`),
  acceptTrade: (tradeId) => request(`/trades/${tradeId}/accept`, { method: 'POST' }),
  confirmTrade: (tradeId) => request(`/trades/${tradeId}/confirm`, { method: 'POST' }),
  cancelTrade: (tradeId) => request(`/trades/${tradeId}/cancel`, { method: 'POST' }),
};
