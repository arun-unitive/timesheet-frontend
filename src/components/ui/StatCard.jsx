/** KPI tile used across both dashboards. */
export default function StatCard({ label, value, icon: Icon, tone = 'primary', foot, loading = false }) {
  return (
    <div className="stat">
      {Icon && (
        <span className={`stat__icon stat__icon--${tone}`}>
          <Icon size={20} />
        </span>
      )}
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="stat__label">{label}</div>
        {loading ? (
          <div className="skeleton" style={{ height: 28, width: '60%', marginTop: 4 }} />
        ) : (
          <div className="stat__value">{value}</div>
        )}
        {foot && !loading && <div className="stat__foot">{foot}</div>}
      </div>
    </div>
  );
}
