import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Compact server-side pagination control. */
export default function Pagination({ page = 1, totalPages = 1, total = 0, limit = 10, onPageChange }) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Show a small window of pages around the current one.
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="pagination">
      <span className="pagination__info">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__page"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        {start > 1 && <span className="pagination__info">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination__page ${p === page ? 'is-active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="pagination__info">…</span>}
        <button
          type="button"
          className="pagination__page"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
