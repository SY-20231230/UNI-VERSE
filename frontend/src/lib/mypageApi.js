import { createTransport, normalizePage } from './api.js';

/** 백엔드 enum → 화면 표시. 커뮤니티/중고거래 화면 연동 시 함께 맞춘다. */
export const POST_CATEGORY_LABELS = {
  FREE: { label: '자유', variant: 'accent' },
  QNA: { label: '질문', variant: 'verified' },
  INFO: { label: '정보', variant: 'success' },
  MARKET_REVIEW: { label: '거래후기', variant: 'warn' },
};

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
