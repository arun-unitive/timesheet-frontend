/** Inline spinner with an optional label. */
export function Spinner({ size = 18 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

export function CenterLoader({ label = 'Loading…' }) {
  return (
    <div className="center-load">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

/** Skeleton rows sized for a data table. */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}>
                  <div className="skeleton" style={{ height: 14, width: c === 0 ? '70%' : '50%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ height = 120 }) {
  return <div className="skeleton" style={{ height, borderRadius: 'var(--r-lg)' }} />;
}
