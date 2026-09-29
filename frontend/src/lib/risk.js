const RISK_RULES = [
  { cat: '외부 메신저 유도', words: ['카카오톡', '카톡', '오픈채팅', '오픈챗', '라인추가', '텔레그램', '인스타디엠', '디엠으로'] },
  { cat: '택배거래 관련 표현', words: ['택배거래', '택배 거래', '택배로만', '택배만 가능', '직거래 불가', '직거래불가'] },
  { cat: '선입금 요구 표현', words: ['선입금', '예치금', '입금 먼저', '먼저 입금', '계좌로 먼저', '보증금 먼저'] },
];

export function scanRisk(text) {
  const t = (text || '').replace(/\s/g, '');
  const hits = [];
  RISK_RULES.forEach((rule) => {
    rule.words.forEach((w) => {
      const wNorm = w.replace(/\s/g, '');
      if (t.indexOf(wNorm) !== -1) {
        const idx = (text || '').indexOf(w);
        const snippetSrc = idx >= 0 ? text : text || '';
        const start = Math.max(0, idx - 5);
        const snippet = idx >= 0 ? snippetSrc.slice(start, idx + w.length + 6) : w;
        hits.push({ cat: rule.cat, word: w, snippet: snippet.trim() });
      }
    });
  });
  const seen = {};
  const out = [];
  hits.forEach((h) => {
    if (!seen[h.cat]) {
      seen[h.cat] = h;
      out.push(h);
    }
  });
  return out;
}
