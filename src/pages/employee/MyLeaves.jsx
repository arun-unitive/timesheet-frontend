import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Plane } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import Badge, { LeaveTypeBadge } from '../../components/ui/Badge';
import { CardSkeleton } from '../../components/ui/Loader';
import { leaveApi } from '../../api/leaves';
import { qk } from '../../api/queryKeys';
import { formatDate, formatDateCompact, parseISO, todayISO } from '../../lib/format';

/** Collapse a single-day range into one date. */
const formatRange = (start, end) => (start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`);

/** Whole days between a date and today (negative = already past). */
const daysFromToday = (iso, today) =>
  Math.round((parseISO(iso).getTime() - parseISO(today).getTime()) / 86400000);

/** "Today" / "Tomorrow" / "in 5 days" */
const countdown = (iso, today) => {
  const diff = daysFromToday(iso, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} day(s) ago`;
};

const STATUS_META = {
  ongoing: { label: 'Ongoing', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  past: { label: 'Completed', tone: 'neutral' },
};

/** Past / current / upcoming, based on today's date. */
const statusOf = (leave, today) => {
  if (leave.startDate > today) return 'upcoming';
  if (leave.endDate < today) return 'past';
  return 'ongoing';
};

const GROUP_ORDER = { ongoing: 0, upcoming: 1, past: 2 };

/** Ongoing first, then the soonest upcoming, then the most recent past. */
const sortByStatus = (leaves, today) =>
  [...leaves].sort((a, b) => {
    const groupA = GROUP_ORDER[statusOf(a, today)];
    const groupB = GROUP_ORDER[statusOf(b, today)];
    if (groupA !== groupB) return groupA - groupB;
    return groupA === GROUP_ORDER.past
      ? b.startDate.localeCompare(a.startDate)
      : a.startDate.localeCompare(b.startDate);
  });

/** Date chip shared by both lists. */
function DateChip({ iso }) {
  const [day, month] = formatDateCompact(iso).split(' ');
  return (
    <div className="leave-row__date">
      <span className="leave-row__daynum">{day}</span>
      <span className="leave-row__mon">{month}</span>
    </div>
  );
}

/** One leave assigned to the employee. */
function LeaveRow({ leave, today }) {
  const status = statusOf(leave, today);
  const meta = STATUS_META[status];
  const endsIn = daysFromToday(leave.endDate, today);

  return (
    <div className={`leave-row leave-row--${status}`}>
      <DateChip iso={leave.startDate} />

      <div className="leave-row__main">
        <div className="leave-row__title">
          <span className="fw-medium">{leave.title || 'Leave'}</span>
          <LeaveTypeBadge type={leave.leaveType} />
        </div>
        <div className="leave-row__period">
          {formatRange(leave.startDate, leave.endDate)}
          {` · ${leave.days ?? 1} day(s)`}
        </div>
        {leave.reason && <div className="leave-row__reason">{leave.reason}</div>}
      </div>

      <div className="leave-row__side">
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
        {status === 'ongoing' && (
          <span className="leave-row__when">{endsIn === 0 ? 'Ends today' : `Ends in ${endsIn} day(s)`}</span>
        )}
        {status === 'upcoming' && (
          <span className="leave-row__when">{countdown(leave.startDate, today)}</span>
        )}
      </div>
    </div>
  );
}

/** One comp-off day assigned to the employee. */
function CompOffRow({ record }) {
  return (
    <div className="leave-row leave-row--compoff">
      <DateChip iso={record.startDate} />

      <div className="leave-row__main">
        <div className="leave-row__title">
          <span className="fw-medium">{record.title || 'Comp-off'}</span>
        </div>
        <div className="leave-row__period">{formatRange(record.startDate, record.endDate)}</div>
        {record.reason && <div className="leave-row__reason">{record.reason}</div>}
      </div>

      <div className="leave-row__side">
        <Badge tone="primary">{record.days ?? 1} day(s)</Badge>
      </div>
    </div>
  );
}

/** Leaves and comp-off days assigned to the signed-in employee. */
export default function MyLeaves() {
  const today = todayISO();
  const [tab, setTab] = useState('all');

  // The leaves list endpoint already applies the employee visibility filter,
  // which includes both personally-assigned leaves and company-wide (common)
  // leaves. Using it here (rather than /leaves/mine) makes sure common leaves
  // show up even against backends where /leaves/mine only returns individual
  // leaves.
  const leavesQuery = useQuery({
    queryKey: qk.leaves({ limit: 100 }),
    queryFn: async () => (await leaveApi.list({ limit: 100 })).data,
    staleTime: 60_000,
  });

  const allLeaves = leavesQuery.data?.items || leavesQuery.data || [];

  // Comp-off days have their own section; the rest go into the leaves list.
  const leaves = useMemo(
    () => allLeaves.filter((leave) => leave.leaveType !== 'comp-off'),
    [allLeaves]
  );

  const compOffRecords = useMemo(
    () => allLeaves.filter((leave) => leave.leaveType === 'comp-off'),
    [allLeaves]
  );

  // Only personally-granted comp-offs count toward the available balance.
  const compOffBalance = useMemo(
    () => compOffRecords.reduce((sum, leave) => (leave.employee ? sum + (leave.days || 0) : sum), 0),
    [compOffRecords]
  );

  const sorted = useMemo(() => sortByStatus(leaves, today), [leaves, today]);
  const compOffRows = useMemo(() => sortByStatus(compOffRecords, today), [compOffRecords, today]);

  const counts = useMemo(
    () =>
      sorted.reduce(
        (acc, leave) => {
          acc[statusOf(leave, today)] += 1;
          return acc;
        },
        { ongoing: 0, upcoming: 0, past: 0 }
      ),
    [sorted, today]
  );

  const visible = tab === 'all' ? sorted : sorted.filter((leave) => statusOf(leave, today) === tab);

  const tabOptions = [
    { value: 'all', label: `All (${sorted.length})` },
    { value: 'ongoing', label: `Ongoing (${counts.ongoing})` },
    { value: 'upcoming', label: `Upcoming (${counts.upcoming})` },
    { value: 'past', label: `Past (${counts.past})` },
  ];

  const emptyCopy = {
    all: 'Leaves assigned to you will appear here.',
    ongoing: 'You are not on leave right now.',
    upcoming: 'You have no leaves scheduled ahead.',
    past: 'You have not taken any leave yet.',
  };

  return (
    <div className="page">
      <PageHead title="My Leave" subtitle="Leaves and comp-off days assigned to you." />

      <Card
        title="My leaves"
        subtitle="Every leave assigned to you — past, current and upcoming."
        action={
          sorted.length ? (
            <span className="text-xs text-muted">
              {counts.ongoing} ongoing · {counts.upcoming} upcoming · {counts.past} past
            </span>
          ) : null
        }
        flush
      >
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} options={tabOptions} />
        </div>

        {leavesQuery.isLoading ? (
          <div style={{ padding: 'var(--sp-5)' }}>
            <CardSkeleton height={120} />
          </div>
        ) : visible.length ? (
          <div className="leave-list">
            {visible.map((leave) => (
              <LeaveRow key={leave._id} leave={leave} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title={tab === 'all' ? 'No leaves found' : `No ${STATUS_META[tab].label.toLowerCase()} leaves`}
            message={emptyCopy[tab]}
          />
        )}
      </Card>

      <Card
        title="Comp-off days"
        subtitle="Comp-off days assigned to you."
        action={<Badge tone="primary">{compOffBalance} day(s) available</Badge>}
        flush
      >
        {leavesQuery.isLoading ? (
          <div style={{ padding: 'var(--sp-5)' }}>
            <CardSkeleton height={120} />
          </div>
        ) : compOffRows.length ? (
          <div className="leave-list">
            {compOffRows.map((record) => (
              <CompOffRow key={record._id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Plane}
            title="No comp-off days"
            message="Comp-off days granted to you will appear here."
          />
        )}
      </Card>
    </div>
  );
}
