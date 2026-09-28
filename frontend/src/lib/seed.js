import { hoursAgo, daysAgo } from './format';

export function seed() {
  return {
    user: null,
    communityFilter: '전체',
    marketFilter: '전체',
    marketStatusFilter: '전체',
    draft: {},
    likedPosts: {},
    likedListings: {},
    users: {
      me: { id: 'me', name: '이수아', dept: '컴퓨터공학과', year: '3학년', studentNo: '21학번', verified: 'A', trades: 12, reviews: 4, reports: 0, trustScore: 87, joined: '2023.03.02', color: '#FF5E3A' },
      u1: { id: 'u1', name: '김도윤', dept: '경영학과', verified: 'A', trades: 21, trustScore: 92, color: '#2F6FED' },
      u2: { id: 'u2', name: '박서현', dept: '기계공학과', verified: 'B', trades: 5, trustScore: 41, color: '#1E9E6B', suspendedUntil: Date.now() + 2 * 86400000, suspendedPermanently: false },
      u3: { id: 'u3', name: '정하늘', dept: '디자인학과', verified: 'A', trades: 33, trustScore: 95, color: '#C97A0A' },
      u4: { id: 'u4', name: '최민재', dept: '경제학과', verified: 'B', trades: 2, trustScore: 58, color: '#8A5CF6' },
      u5: { id: 'u5', name: '한지우', dept: '심리학과', verified: 'A', trades: 8, trustScore: 80, color: '#E23D97' },
      u6: { id: 'u6', name: '오세훈', dept: '전자공학과', verified: 'B', trades: 14, trustScore: 64, color: '#0EA5A5' },
    },
    posts: [],
    listings: [],
    chats: {},
    reports: 0,
    reportRecords: [
      {
        id: 'rp1', reporterId: 'u3', targetUserId: 'u4', reason: '선입금 요구',
        listingId: 'm5', chatId: 'chat-m5', status: '대기중', action: null, time: hoursAgo(3), processedAt: null,
      },
      {
        id: 'rp2', reporterId: 'u2', targetUserId: 'u6', reason: '허위 매물/스팸',
        listingId: 'm7', chatId: null, status: '대기중', action: null, time: hoursAgo(20), processedAt: null,
      },
      {
        id: 'rp3', reporterId: 'u5', targetUserId: 'u1', reason: '외부 메신저 유도',
        listingId: 'm6', chatId: 'chat-m6', status: '처리완료', action: 'warn', time: daysAgo(2), processedAt: daysAgo(1.5),
      },
      {
        id: 'rp4', reporterId: 'u6', targetUserId: 'u2', reason: '허위 매물/스팸',
        listingId: 'm3', chatId: null, status: '처리완료', action: 'suspend_3', time: hoursAgo(30), processedAt: hoursAgo(12),
      },
    ],
  };
}
