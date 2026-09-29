import Icon from '../lib/icons';

const BLOCK = 10;

/** 10개 단위 페이지 번호. page는 0부터 시작한다. */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const start = Math.floor(page / BLOCK) * BLOCK;
  const end = Math.min(start + BLOCK, totalPages);
  const pages = [];
  for (let i = start; i < end; i++) pages.push(i);

  const arrow = (icon, label, target, disabled) => (
    <button type="button" className="pager-btn pager-arrow" aria-label={label} title={label} disabled={disabled}
      onClick={() => onChange(target)}>
      <Icon name={icon} size={15} />
    </button>
  );

  return (
    <nav className="pager" aria-label="페이지">
      {arrow('chevsLeft', '이전 10페이지', start - 1, start === 0)}
      {arrow('chevLeft', '이전 페이지', page - 1, page === 0)}
      <div className="pager-pages">
        {pages.map((p) => (
          <button key={p} type="button" className={'pager-btn' + (p === page ? ' on' : '')}
            aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>
            {p + 1}
          </button>
        ))}
      </div>
      {arrow('chev', '다음 페이지', page + 1, page >= totalPages - 1)}
      {arrow('chevsRight', '다음 10페이지', end, end >= totalPages)}
    </nav>
  );
}
