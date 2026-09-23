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
    posts: [
      {
        id: 'p1', category: '시설/환경', title: '도서관 4층 콘센트 자리 찾는 법 공유합니다',
        body: '매번 콘센트 자리 못 찾아서 헤매시는 분들 많으시죠 ㅠㅠ 4층 창가 열람실 맨 끝 라인이 전 좌석 콘센트 있어요. 다만 시험기간엔 오픈런 필수... 아침 8시반 전에 가야 자리 잡힙니다. 다들 화이팅!',
        anonymous: false, authorId: 'u3', time: hoursAgo(1), likes: 41, views: 302, tags: ['도서관', '자리', '꿀팁'],
        comments: [
          { id: 'c1', authorLabel: '익명', text: '헐 몰랐던 정보 감사합니다 내일 가볼게요', time: hoursAgo(0.9), likes: 3 },
          { id: 'c2', authorLabel: '익명', text: '거기 2층도 콘센트 은근 많아요 ㅎㅎ', time: hoursAgo(0.6), likes: 5 },
          { id: 'c3', authorLabel: '정하늘', text: '맞아요 근데 2층은 조용열람실이라 노트북 타건소리 눈치보임..', time: hoursAgo(0.4), likes: 1 },
        ],
      },
      {
        id: 'p2', category: '자유', title: '학식 vs 학교앞 분식집, 솔직 비교 후기',
        body: '이번주 내내 학식이랑 정문 분식집 다 먹어봤는데 개인적으론 학식 제육이 승... 가격도 4500원이라 혜자입니다. 다들 최애 메뉴 있으신가요?',
        anonymous: true, authorId: 'u1', time: hoursAgo(3), likes: 28, views: 410, tags: ['학식', '맛집'],
        comments: [{ id: 'c4', authorLabel: '익명', text: '저는 학교앞 돈까스집이 국룰이라고 생각합니다', time: hoursAgo(2.5), likes: 7 }],
      },
      {
        id: 'p3', category: '기숙사', title: '기숙사 3동 세탁기 또 고장났어요...',
        body: '3동 2층 세탁기 3번기 또 먹통이네요. 관리실에 신고했는데 언제 고쳐질지... 다른 동 세탁기 상황 아시는 분 계신가요?',
        anonymous: false, authorId: 'u2', time: hoursAgo(5), likes: 9, views: 150, tags: ['기숙사', '생활'], comments: [],
      },
      {
        id: 'p4', category: '수업/학점', title: '전공선택 꿀팁 - 3학년 수강신청 전에 꼭 보세요',
        body: '선배로서 팁 드리면, 전선은 학점보다 교수님 강의 스타일 먼저 보고 고르시는 걸 추천해요. 특히 팀플 비중이랑 과제량 체크 필수! 에타/강의평가 꼭 참고하세요.',
        anonymous: false, authorId: 'me', time: daysAgo(1), likes: 63, views: 588, tags: ['수강신청', '전공'],
        comments: [{ id: 'c5', authorLabel: '익명', text: '와 이거 진짜 꿀팁이네요 감사합니다 저장했어요', time: daysAgo(0.9), likes: 2 }],
      },
      {
        id: 'p5', category: '취업/진로', title: '2학기 인턴 준비하는 분들 스터디 구해요',
        body: '경영/컴공 상관없이 자소서+면접 같이 준비하실 분 3~4명 구합니다. 매주 화요일 학생회관에서 만나요. 관심있으신 분 댓글 남겨주세요!',
        anonymous: false, authorId: 'u4', time: daysAgo(2), likes: 15, views: 210, tags: ['인턴', '스터디'], comments: [],
      },
      {
        id: 'p6', category: '기타', title: '보드게임 동아리 신입 부원 모집합니다',
        body: '매주 수요일 저녁 학생회관 3층에서 모여요. 전공 무관, 초보자 대환영! 관심 있으신 분들은 링크로 신청서 작성해주세요~',
        anonymous: false, authorId: 'u3', time: daysAgo(3), likes: 22, views: 275, tags: ['동아리', '모집'], comments: [],
      },
      {
        id: 'p7', category: '학교생활', title: '축제 기간 주차 어떻게들 하세요?',
        body: '다음주 축제 기간에 캠퍼스 진입로가 통제된다고 하던데, 통학하시는 분들은 어디에 주차하시는지 궁금해요. 인근 공영주차장 정보 아시는 분?',
        anonymous: false, authorId: 'u6', time: hoursAgo(6), likes: 12, views: 190, tags: ['축제', '주차'],
        comments: [{ id: 'c6', authorLabel: '익명', text: '후문 체육관 주차장은 축제 기간에도 열어준대요', time: hoursAgo(5), likes: 4 }],
      },
      {
        id: 'p8', category: '학교생활', title: '중앙동아리 박람회 다녀온 후기 (사진 많음)',
        body: '오늘 잔디광장에서 열린 동아리 박람회 다녀왔어요. 밴드, 사진, 봉사 동아리 부스가 특히 붐볐습니다. 내년 신입생 분들도 참고하세요!',
        anonymous: false, authorId: 'u5', time: hoursAgo(10), likes: 34, views: 320, tags: ['동아리', '박람회'], comments: [],
      },
      {
        id: 'p9', category: '자유', title: '새내기 때 깔아두면 좋은 학교 관련 앱 정리',
        body: '수강신청 알리미, 학식 메뉴 확인, 셔틀버스 실시간 위치까지 한 번에 정리해봤어요. 신입생분들 필독!',
        anonymous: false, authorId: 'u1', time: daysAgo(1.5), likes: 51, views: 470, tags: ['신입생', '팁'],
        comments: [{ id: 'c7', authorLabel: '익명', text: '와 이런 글 진작 봤으면 좋았을텐데ㅜㅜ 감사해요', time: daysAgo(1.2), likes: 6 }],
      },
      {
        id: 'p10', category: '수업/학점', title: '교양 꿀강의 추천 받습니다',
        body: '이번학기 교양 학점이 너무 짜서 힘드네요. 과제 적고 학점 잘주시는 교양 강의 있으면 추천 부탁드려요!',
        anonymous: true, authorId: 'u2', time: daysAgo(2.3), likes: 19, views: 260, tags: ['교양', '추천'], comments: [],
      },
      {
        id: 'p11', category: '시설/환경', title: '학생회관 엘리베이터 언제 고쳐지나요',
        body: '벌써 2주째 학생회관 엘리베이터가 멈춰있어요. 계단으로 다니시는 분들 많이 불편하실 것 같은데 다들 어떠세요.',
        anonymous: false, authorId: 'u4', time: daysAgo(3.2), likes: 7, views: 133, tags: ['시설', '불편사항'], comments: [],
      },
      {
        id: 'p12', category: '기숙사', title: '기숙사 룸메 배정 신청 꿀팁',
        body: '희망 룸메 신청서 작성할 때 생활패턴 최대한 구체적으로 적으시는 게 좋아요. 저는 그렇게 해서 만족스러운 배정 받았습니다.',
        anonymous: false, authorId: 'u5', time: daysAgo(4.1), likes: 26, views: 300, tags: ['기숙사', '룸메이트'], comments: [],
      },
      {
        id: 'p13', category: '취업/진로', title: '대기업 서류 합격 자소서 첨삭 후기',
        body: '학교 취업지원센터에서 자소서 첨삭 받고 서류 합격했습니다. 예약 경쟁 치열하니 미리미리 신청하세요!',
        anonymous: false, authorId: 'u6', time: daysAgo(5.4), likes: 44, views: 512, tags: ['자소서', '취업지원센터'], comments: [],
      },
    ],
    listings: [
      { id: 'm1', category: '전공책', title: '컴퓨터 네트워크 전공책 팝니다', price: 10000, originalPrice: 32000, condition: '거의 새것', status: '판매중', sellerId: 'u1', desc: '한 학기만 사용했고 필기 거의 없습니다. 직거래 희망 (학교 내에서만 가능해요). 표지 살짝 눌린 것 외엔 깨끗합니다.', time: hoursAgo(2), views: 120, likes: 7, chatCount: 3, icon: 'grad', loc: '정문 / 학생회관' },
      { id: 'm2', category: '전자기기', title: '아이패드 에어 4세대 64GB', price: 300000, originalPrice: 719000, condition: '거의 새것', status: '판매중', sellerId: 'u2', desc: '케이스, 펜슬 포함입니다. 액정 스크래치 없고 배터리 성능 92%예요. 과제용으로만 썼습니다.', time: hoursAgo(0.5), views: 340, likes: 19, chatCount: 8, icon: 'box', loc: '중앙도서관' },
      { id: 'm3', category: '생활용품', title: '책상 스탠드 (밝기조절)', price: 15000, originalPrice: 39000, condition: '사용감 있음', status: '판매중', sellerId: 'u3', desc: '거의 새것급입니다. 밝기 3단계 조절 가능하고 USB 충전식이에요.', time: daysAgo(1), views: 88, likes: 4, chatCount: 1, icon: 'box', loc: '기숙사 정문' },
      { id: 'm4', category: '생활용품', title: '미니 냉장고 (기숙사용, 20L)', price: 35000, originalPrice: 89000, condition: '사용감 있음', status: '거래완료', sellerId: 'u4', desc: '졸업 때문에 급처분합니다. 작동 이상 없어요.', time: daysAgo(4), views: 210, likes: 11, chatCount: 6, icon: 'box', loc: '후문 원룸촌' },
      { id: 'm5', category: '전공책', title: '자료구조 + 알고리즘 전공서적 세트', price: 20000, originalPrice: 58000, condition: '사용감 있음', status: '판매중', sellerId: 'me', desc: '필기 조금 있지만 내용 이해하는 데 전혀 지장 없습니다. 두 권 같이 드려요.', time: daysAgo(2), views: 96, likes: 6, chatCount: 2, icon: 'grad', loc: '공학관' },
      { id: 'm6', category: '기타', title: '자전거 (삼천리, 상태 좋음)', price: 60000, originalPrice: 150000, condition: '거의 새것', status: '판매중', sellerId: 'u1', desc: '통학용으로 6개월 탔습니다. 타이어 공기압 잘 유지되고 있고 잔고장 없어요.', time: daysAgo(5), views: 180, likes: 14, chatCount: 4, icon: 'box', loc: '기숙사 자전거보관소' },
      { id: 'm7', category: '전자기기', title: '기계식 키보드 (적축, RGB)', price: 45000, originalPrice: 89000, condition: '사용감 있음', status: '판매중', sellerId: 'u6', desc: '1년 정도 사용했고 키압 좋습니다. 박스, 여분 키캡 세트 같이 드려요.', time: hoursAgo(8), views: 145, likes: 9, chatCount: 2, icon: 'box', loc: '공대 후문' },
      { id: 'm8', category: '의류', title: '학과 과잠 (L 사이즈, 새제품급)', price: 25000, originalPrice: 65000, condition: '거의 새것', status: '판매중', sellerId: 'u5', desc: '한 번만 입고 옷장에 보관했어요. 사이즈가 안맞아서 판매합니다.', time: hoursAgo(14), views: 98, likes: 5, chatCount: 1, icon: 'tag', loc: '정문' },
      { id: 'm9', category: '의류', title: '겨울 롱패딩 (블랙, M)', price: 40000, originalPrice: 189000, condition: '사용감 있음', status: '판매중', sellerId: 'u3', desc: '작년에 구매해서 한 시즌 입었습니다. 세탁 완료 상태로 드려요.', time: daysAgo(1.6), views: 132, likes: 10, chatCount: 3, icon: 'tag', loc: '기숙사 정문' },
      { id: 'm10', category: '전공책', title: '토익 정기시험 문제집 세트 (미개봉 포함)', price: 12000, originalPrice: 27000, condition: '거의 새것', status: '판매중', sellerId: 'u4', desc: 'RC 교재는 미개봉입니다. LC 교재만 앞부분 풀이 있어요.', time: daysAgo(2.8), views: 76, likes: 3, chatCount: 0, icon: 'grad', loc: '학생회관' },
      { id: 'm11', category: '기타', title: '탁상용 스탠드 조명 + 무드등 세트', price: 18000, originalPrice: 42000, condition: '사용감 있음', status: '거래완료', sellerId: 'u2', desc: '기숙사방 분위기용으로 잘 썼습니다. 정상 작동합니다.', time: daysAgo(6), views: 120, likes: 8, chatCount: 5, icon: 'box', loc: '기숙사 3동' },
      { id: 'm12', category: '생활용품', title: '접이식 빨래건조대', price: 8000, originalPrice: 22000, condition: '사용감 있음', status: '판매중', sellerId: 'u6', desc: '자취 정리하면서 판매합니다. 상태 양호해요.', time: daysAgo(3.5), views: 60, likes: 2, chatCount: 0, icon: 'box', loc: '후문 원룸촌' },
    ],
    chats: {
      'chat-m5': {
        listingId: 'm5', partnerId: 'u4', anonymous: false, showSafety: true, status: 'pending',
        messages: [
          { from: 'them', text: '안녕하세요! 자료구조 책 상태 괜찮나요? 혹시 오늘 오후에 거래 가능할까요?', time: hoursAgo(0.2) },
        ],
      },
      'chat-m2': {
        listingId: 'm2', partnerId: 'u2', anonymous: false, showSafety: true, status: 'accepted',
        messages: [
          { from: 'them', text: '안녕하세요! 아이패드 아직 판매중이에요 :)', time: hoursAgo(0.4) },
          { from: 'me', text: '네 안녕하세요! 혹시 직거래 가능할까요?', time: hoursAgo(0.35) },
          { from: 'them', text: '그럼요~ 중앙도서관 앞에서 가능하세요! 언제쯤 시간 되세요?', time: hoursAgo(0.3) },
        ],
      },
      'chat-m1': {
        listingId: 'm1', partnerId: 'u1', anonymous: false, showSafety: false, status: 'accepted',
        messages: [
          { from: 'me', text: '안녕하세요, 전공책 아직 판매중일까요?', time: hoursAgo(5) },
          { from: 'them', text: '네 아직 있어요! 학생회관 앞에서 거래 가능하세요?', time: hoursAgo(4.7) },
          { from: 'me', text: '넵 좋아요, 내일 오후 3시 어떠세요?', time: hoursAgo(4.6) },
          { from: 'them', text: '좋습니다! 그때 뵈어요~', time: hoursAgo(4.5) },
        ],
      },
      'chat-m6': {
        listingId: 'm6', partnerId: 'u1', anonymous: true, showSafety: true, status: 'accepted',
        messages: [
          { from: 'them', text: '자전거 혹시 기어 몇단인가요?', time: daysAgo(0.6) },
          { from: 'me', text: '21단이고 최근에 체인 교체했습니다!', time: daysAgo(0.55) },
        ],
      },
      'chat-m9': {
        listingId: 'm9', partnerId: 'u3', anonymous: false, showSafety: false, status: 'accepted',
        messages: [
          { from: 'them', text: '패딩 사이즈가 M 맞나요? 기장감이 어느정도인지 궁금해요', time: daysAgo(1.1) },
          { from: 'me', text: '네 M 맞고 기장은 골반 살짝 덮는 정도예요!', time: daysAgo(1.05) },
          { from: 'them', text: '오 좋네요, 내일 기숙사 정문에서 거래 가능할까요?', time: daysAgo(1) },
        ],
      },
    },
    reports: 0,
    reportRecords: [
      {
        id: 'rp1', reporterId: 'u3', targetUserId: 'u4', reason: '선입금 요구',
        listingId: 'm5', chatId: 'chat-m5', status: '대기중', action: null, time: hoursAgo(3), processedAt: null,
      },
      {
        id: 'rp2', reporterId: 'me', targetUserId: 'u6', reason: '허위 매물/스팸',
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
