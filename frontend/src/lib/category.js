export const POST_CATEGORY_META = {
  '전체': { variant: 'outline', icon: 'board' },
  '자유': { variant: 'accent', icon: 'chat' },
  '수업/학점': { variant: 'verified', icon: 'grad' },
  '학교생활': { variant: 'success', icon: 'home' },
  '시설/환경': { variant: 'warn', icon: 'shield' },
  '기숙사': { variant: 'danger', icon: 'pin' },
  '취업/진로': { variant: 'accent', icon: 'trend' },
  '기타': { variant: 'outline', icon: 'star' },
};

export const MARKET_CATEGORY_META = {
  '전체': { variant: 'outline', icon: 'tag' },
  '전공책': { variant: 'verified', icon: 'grad' },
  '전자기기': { variant: 'accent', icon: 'box' },
  '생활용품': { variant: 'success', icon: 'box' },
  '의류': { variant: 'warn', icon: 'tag' },
  '기타': { variant: 'outline', icon: 'star' },
};

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
