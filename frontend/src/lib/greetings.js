// 홈 배너 인사 문구. 홈에 들어올 때마다 지금 시간대 문구와 공통 문구 중 하나를 고른다.
// {name} 자리에 닉네임이 들어간다.
const BY_TIME = {
  morning: [
    { title: '{name}님, 좋은 아침이에요! ☀️', sub: '오늘 수업 가기 전에 캠퍼스 소식부터 확인해보세요.' },
    { title: '{name}님, 상쾌한 하루 시작해요! 🌱', sub: '새로 올라온 글과 매물이 기다리고 있어요.' },
  ],
  afternoon: [
    { title: '{name}님, 점심은 맛있게 드셨나요? 🍱', sub: '공강 시간엔 커뮤니티에서 학우들 이야기를 들어보세요.' },
    { title: '{name}님, 오후도 힘내요! 💪', sub: '필요한 물건, 우리 학교 학우에게 먼저 찾아보세요.' },
  ],
  evening: [
    { title: '{name}님, 오늘 하루도 수고했어요! 🌇', sub: '하교 길에 교내 직거래 약속 잡아보는 건 어때요?' },
    { title: '{name}님, 편안한 저녁 보내세요! 🍀', sub: '오늘 캠퍼스에서 있었던 이야기를 나눠보세요.' },
  ],
  night: [
    { title: '{name}님, 늦은 시간까지 고생 많아요! 🌙', sub: '과제 하다 막히면 커뮤니티에 물어보세요.' },
    { title: '{name}님, 오늘도 수고 많았어요! ✨', sub: '푹 쉬고 내일 캠퍼스에서 만나요.' },
  ],
};

const COMMON = [
  { title: '{name}님, 오늘도 활기찬 캠퍼스 라이프 되세요! ✨', sub: '안전한 학생 간 중고거래와 솔직한 커뮤니티 공간. 검증된 학우들과 자유롭게 소통하세요.' },
  { title: '{name}님, 반가워요! 👋', sub: '같은 학교, 더 안전하게. 익명은 그대로, 거래는 신뢰있게.' },
  { title: '{name}님, 오늘은 어떤 이야기가 있을까요? 💬', sub: '익명으로 솔직하게, 우리 학교 학우들과 이야기해보세요.' },
  { title: '{name}님, 안 쓰는 물건 있나요? 📦', sub: '학우에게 필요한 물건일지도 몰라요. 교내 직거래로 나눠보세요.' },
];

function timeSlot(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** 지금 시간대에 맞는 인사 문구 하나를 고른다. */
export function pickGreeting(name, now = new Date(), random = Math.random) {
  const pool = [...BY_TIME[timeSlot(now.getHours())], ...COMMON];
  const g = pool[Math.floor(random() * pool.length)];
  return { title: g.title.replace('{name}', name || '회원'), sub: g.sub };
}
