/** Lightweight card container. */
export default function Card({ title, subtitle, action, children, flush = false, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card__head">
          <div>
            {title && <div className="card__title">{title}</div>}
            {subtitle && <div className="card__sub">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={`card__body ${flush ? 'card__body--flush' : ''}`}>{children}</div>
    </section>
  );
}
