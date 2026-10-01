import { createTransport, normalizePage, requireId } from './api.js';

export const NOTIFICATION_POLL_MS = 30000;

const detail = (base) => (id) => (/^[1-9]\d*$/.test(String(id ?? '')) ? `${base}/${id}` : null);
const fixed = (path) => () => path;

const TYPE_META = {
  COMMENT: { icon: 'board', route: detail('/community') },
  REPLY: { icon: 'board', route: detail('/community') },
  POST_LIKE: { icon: 'heart', route: detail('/community') },
  FAVORITE_ITEM_STATUS: { icon: 'tag', route: detail('/market') },
  FAVORITE_ITEM_PRICE: { icon: 'tag', route: detail('/market') },
  REPORT_PROCESSED: { icon: 'flag', route: fixed('/mypage') },
  SANCTION: { icon: 'alert', route: fixed('/mypage') },
  CHAT_REQUEST: { icon: 'chat', route: fixed('/chat') },
  CHAT_ACCEPTED: { icon: 'chat', route: detail('/chat') },
};

/** 알림 종류별 아이콘과 클릭 시 이동 경로. 이동할 곳이 없으면 path 는 null. */
export function notificationMeta(notification) {
  const meta = TYPE_META[notification.type] || { icon: 'bell', route: fixed(null) };
  return { icon: meta.icon, path: meta.route(notification.targetId) };
}

const TYPE_LABELS = {
  COMMENT: { label: '새 댓글', tone: 'verified' },
  REPLY: { label: '새 답글', tone: 'verified' },
  POST_LIKE: { label: '좋아요', tone: 'danger' },
  FAVORITE_ITEM_STATUS: { label: '찜한 상품', tone: 'success' },
  FAVORITE_ITEM_PRICE: { label: '가격 변동', tone: 'success' },
  REPORT_PROCESSED: { label: '신고 처리', tone: 'warn' },
  SANCTION: { label: '이용 제한', tone: 'danger' },
  CHAT_REQUEST: { label: '채팅 요청', tone: 'accent' },
  CHAT_ACCEPTED: { label: '채팅 수락', tone: 'accent' },
};

/** 알림 목록에 보여줄 종류 이름과 아이콘 색. */
export function notificationLabel(notification) {
  return TYPE_LABELS[notification.type] || { label: '알림', tone: 'accent' };
}

export function createNotificationApi(options = {}) {
  const request = createTransport(options);

  return {
    async list(query = {}, options = {}) {
      const pageQuery = { page: 0, size: 20, ...query };
      return normalizePage(await request('/notifications', { ...options, query: pageQuery }), pageQuery.page);
    },
    async unreadCount(options = {}) {
      const data = await request('/notifications/unread-count', options);
      return Number.isInteger(data?.unreadCount) && data.unreadCount >= 0 ? data.unreadCount : 0;
    },
    markRead: (id, options = {}) => request(`/notifications/${requireId(id)}/read`, { ...options, method: 'PATCH' }),
    markAllRead: (options = {}) => request('/notifications/read-all', { ...options, method: 'PATCH' }),
    remove: (id, options = {}) => request(`/notifications/${requireId(id)}`, { ...options, method: 'DELETE' }),
  };
}
