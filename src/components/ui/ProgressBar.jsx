/** Slim progress bar with semantic tones. */
export default function ProgressBar({ value = 0, max = 100, tone }) {
  const pct = Math.min(100, Math.max(0, (Number(value) / (max || 1)) * 100));
  const auto = pct >= 100 ? 'success' : pct >= 50 ? 'warning' : 'danger';
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress__bar progress__bar--${tone || auto}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
