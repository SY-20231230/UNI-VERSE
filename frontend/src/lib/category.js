export const POST_CATEGORY_META = {
  '전체': { variant: 'outline', icon: 'board' },
  '자유': { variant: 'accent', icon: 'chat' },
  '수업/학점': { variant: 'verified', icon: 'grad' },
  '학교생활': { variant: 'success', icon: 'home' },
  '시설/환경': { variant: 'warn', icon: 'shield' },
  '기숙사': { variant: 'danger', icon: 'pin' },
  '취업/진로': { variant: 'accent', icon: 'trend' },
  '기타': { variant: 'outline', icon: 'star' },
  '질문': { variant: 'verified', icon: 'chat' },
  '정보': { variant: 'success', icon: 'star' },
  '거래후기': { variant: 'warn', icon: 'tag' },
};

export const POST_CATEGORY_API_CODES = {
  자유: 'FREE',
  '수업/학점': 'COURSE_CREDIT',
  학교생활: 'CAMPUS_LIFE',
  '시설/환경': 'FACILITY_ENVIRONMENT',
  기숙사: 'DORMITORY',
  '취업/진로': 'CAREER',
  기타: 'ETC',
};

export const POST_CATEGORY_LABELS = {
  ...Object.fromEntries(
    Object.entries(POST_CATEGORY_API_CODES).map(([label, code]) => [code, { label, variant: POST_CATEGORY_META[label].variant }]),
  ),
  QNA: { label: '질문', variant: 'verified' },
  INFO: { label: '정보', variant: 'success' },
  MARKET_REVIEW: { label: '거래후기', variant: 'warn' },
};

export function postCategoryToApi(category) {
  return POST_CATEGORY_API_CODES[category] || category;
}

export function postCategoryFromApi(category) {
  return POST_CATEGORY_LABELS[category]?.label || category;
}

export const MARKET_CATEGORY_META = {
  '전체': { variant: 'outline', icon: 'tag' },
  '전공책': { variant: 'verified', icon: 'grad' },
  '전자기기': { variant: 'accent', icon: 'box' },
  '생활용품': { variant: 'success', icon: 'box' },
  '의류': { variant: 'warn', icon: 'tag' },
  '기타': { variant: 'outline', icon: 'star' },
};

export const MARKET_CATEGORY_API_CODES = {
  전공책: 'BOOKS',
  전자기기: 'ELECTRONICS',
  생활용품: 'ETC', // Map to ETC for now since ItemCategory lacks it
  의류: 'CLOTHING',
  기타: 'ETC',
};

export const MARKET_CATEGORY_LABELS = {
  BOOKS: { label: '전공책', variant: 'verified', icon: 'grad' },
  ELECTRONICS: { label: '전자기기', variant: 'accent', icon: 'box' },
  CLOTHING: { label: '의류', variant: 'warn', icon: 'tag' },
  TICKETS: { label: '티켓/교환권', variant: 'outline', icon: 'tag' },
  ETC: { label: '기타', variant: 'outline', icon: 'star' },
};

export function marketCategoryToApi(category) {
  return MARKET_CATEGORY_API_CODES[category] || category;
}

export function marketCategoryFromApi(category) {
  return MARKET_CATEGORY_LABELS[category]?.label || category;
}

export function marketCategoryMetaFromApi(category) {
  return MARKET_CATEGORY_LABELS[category] || MARKET_CATEGORY_META['기타'];
}

const VARIANT_TINT = {
  accent: { bg: 'var(--accent-soft)', ink: 'var(--accent-soft-ink)' },
  verified: { bg: 'var(--verified-soft)', ink: 'var(--verified)' },
  success: { bg: 'var(--success-soft)', ink: 'var(--success)' },
  warn: { bg: 'var(--warn-soft)', ink: 'var(--warn)' },
  danger: { bg: 'var(--danger-soft)', ink: 'var(--danger)' },
  outline: { bg: 'var(--surface-sunken)', ink: 'var(--ink-soft)' },
};

export function categoryTint(variant) {
  return VARIANT_TINT[variant] || VARIANT_TINT.outline;
}
