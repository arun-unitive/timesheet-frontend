import { Inbox } from 'lucide-react';

/** Consistent empty state used by every table / list. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
}) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon size={24} />
      </span>
      <div className="empty__title">{title}</div>
      {message && <p className="empty__text">{message}</p>}
      {action}
    </div>
  );
}
