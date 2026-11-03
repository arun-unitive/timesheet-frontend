/** Shared constants + display metadata for enum-like values. */

export const ROLES = { ADMIN: 'admin', EMPLOYEE: 'employee' };

export const LEAVE_TYPES = ['holiday', 'casual', 'sick', 'earned', 'comp-off', 'unpaid', 'other'];

export const LEAVE_TYPE_META = {
  holiday: { label: 'Holiday', tone: 'primary' },
  casual: { label: 'Casual Leave', tone: 'info' },
  sick: { label: 'Sick Leave', tone: 'warning' },
  earned: { label: 'Earned Leave', tone: 'success' },
  'comp-off': { label: 'Comp-Off', tone: 'primary' },
  unpaid: { label: 'Unpaid Leave', tone: 'neutral' },
  other: { label: 'Other', tone: 'neutral' },
};

export const LEAVE_SCOPES = {
  COMMON: 'common',
  INDIVIDUAL: 'individual',
};

/** Pseudo leave type used to mark Sundays as non-working days in the admin grid. */
export const WEEKEND_LEAVE_TYPE = 'weekend';

/** Colours used to highlight leave dates in the admin timesheet grid (one per leave type). */
export const LEAVE_HIGHLIGHT = {
  holiday: { bg: '#e0f2fe', fg: '#0369a1', border: '#0284c7' },
  casual: { bg: '#dcfce7', fg: '#15803d', border: '#16a34a' },
  sick: { bg: '#fee2e2', fg: '#b91c1c', border: '#dc2626' },
  earned: { bg: '#eef2ff', fg: '#4338ca', border: '#4f46e5' },
  'comp-off': { bg: '#f3e8ff', fg: '#7e22ce', border: '#9333ea' },
  unpaid: { bg: '#f1f5f9', fg: '#475569', border: '#64748b' },
  other: { bg: '#f1f5f9', fg: '#475569', border: '#64748b' },
  [WEEKEND_LEAVE_TYPE]: { bg: '#f0fdfa', fg: '#0f766e', border: '#14b8a6' },
};

/** Colours for a given leave type, falling back to the neutral "other" palette. */
export const leaveHighlight = (leaveType) => LEAVE_HIGHLIGHT[leaveType] || LEAVE_HIGHLIGHT.other;

/** Human label for a leave type. */
export const leaveTypeLabel = (leaveType) => {
  if (leaveType === WEEKEND_LEAVE_TYPE) return 'Sunday';
  return LEAVE_TYPE_META[leaveType]?.label || (leaveType === 'comp-off' ? 'Comp-Off' : leaveType);
};

/** 1 -> "1 Hour", 1.5 -> "1.5 Hours" */
export const durationLabel = (hours) => {
  const value = Number(hours) || 0;
  return `${value} ${value === 1 ? 'Hour' : 'Hours'}`;
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** 8 hour columns for the grid layout */
export const GRID_HOURS = [1, 2, 3, 4, 5, 6, 7, 8];
