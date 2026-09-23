import Icon from '../lib/icons';

const SCORES = { A: 96, B: 82, C: 68 };

export default function VerifiedChip({ level, light }) {
  const score = SCORES[level || 'B'];
  return (
    <span className="verified-badge" style={light ? { color: 'rgba(255,255,255,.92)' } : undefined} title={`신뢰점수 ${score}점`}>
      <Icon name="shield" size={13} />
      <span className="tnum">{score}</span>
    </span>
  );
}
