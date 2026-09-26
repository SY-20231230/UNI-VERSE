import { createTransport, normalizePage } from './api.js';
import { POST_CATEGORY_LABELS } from './category.js';

export { POST_CATEGORY_LABELS };

export const TRADE_STATUS_LABELS = {
  SELLING: { label: '판매중', variant: 'success' },
  TRADING: { label: '거래중', variant: 'warn' },
  COMPLETED: { label: '거래완료', variant: 'outline' },
  CANCELLED: { label: '취소', variant: 'outline' },
};

export function createMypageApi(options = {}) {
  const request = createTransport(options);

  async function list(path, query = {}, options = {}) {
    const pageQuery = { page: 0, size: 20, ...query };
    return normalizePage(await request(path, { ...options, query: pageQuery }), pageQuery.page);
  }

  return {
    summary: (options = {}) => request('/mypage', options),
    posts: (query, options) => list('/mypage/posts', query, options),
    marketItems: (query, options) => list('/mypage/market-items', query, options),
    trustHistory: (query, options) => list('/mypage/trust-history', query, options),
  };
}
