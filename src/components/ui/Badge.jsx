import { LEAVE_TYPE_META } from '../../lib/constants';

/** Generic pill badge. `tone` accepts the semantic palette. */
export default function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

/** Leave type pill. */
export function LeaveTypeBadge({ type }) {
  const meta = LEAVE_TYPE_META[type] || { label: type, tone: 'neutral' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/** Employee active / inactive indicator. */
export function ActiveBadge({ isActive }) {
  return (
    <Badge tone={isActive ? 'success' : 'neutral'} dot>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
