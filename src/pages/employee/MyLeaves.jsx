import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CalendarDays, Plane } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import DataTable from '../../components/ui/DataTable';
import { LeaveTypeBadge } from '../../components/ui/Badge';
import { CardSkeleton } from '../../components/ui/Loader';
import { leaveApi } from '../../api/leaves';
import { qk } from '../../api/queryKeys';
import { formatDate } from '../../lib/format';

/** Collapse a single-day range into one date. */
const formatRange = (start, end) => (start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`);

/** Employee leave overview: holidays, comp-off balance and granted leaves. */
export default function MyLeaves() {
  const [tab, setTab] = useState('all');

  const mineQuery = useQuery({
    queryKey: qk.leavesMine,
    queryFn: async () => (await leaveApi.mine()).data,
    staleTime: 60_000,
  });

  const upcomingQuery = useQuery({
    queryKey: qk.leavesUpcoming,
    queryFn: async () => (await leaveApi.upcoming(180)).data,
    staleTime: 60_000,
  });

  const leaves = mineQuery.data?.leaves || [];
  const compOff = mineQuery.data?.compOff || { balanceDays: 0, records: [] };
  const upcoming = upcomingQuery.data || [];
  const holidays = upcoming.filter((leave) => leave.scope === 'common');

  const rows = useMemo(
    () => (tab === 'comp-off' ? leaves.filter((leave) => leave.leaveType === 'comp-off') : leaves),
    [tab, leaves]
  );

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        strong: true,
        render: (row) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span>{row.title || '—'}</span>
            <LeaveTypeBadge type={row.leaveType} />
          </div>
        ),
      },
      { key: 'period', header: 'Period', render: (row) => formatRange(row.startDate, row.endDate) },
      { key: 'days', header: 'Days', align: 'right', render: (row) => row.days },
      { key: 'reason', header: 'Reason', render: (row) => row.reason || '—' },
      // { key: 'createdAt', header: 'Granted on', render: (row) => formatDate(row.createdAt) },
    ],
    []
  );

  return (
    <div className="page">
      <PageHead title="My Leave" subtitle="Your holidays, comp-off balance and granted leaves." />

      <div className="stat-grid">
        <StatCard
          label="Comp-off balance"
          value={`${compOff.balanceDays} day(s)`}
          icon={Plane}
          tone="success"
          loading={mineQuery.isLoading}
        />
        <StatCard
          label="Upcoming holidays"
          value={holidays.length}
          icon={CalendarDays}
          tone="info"
          loading={upcomingQuery.isLoading}
        />
        <StatCard
          label="Total leaves granted"
          value={leaves.length}
          icon={CalendarCheck}
          tone="primary"
          loading={mineQuery.isLoading}
        />
      </div>

      <Card title="Upcoming holidays" subtitle="Company holidays and your leaves over the next 180 days" flush>
        {upcomingQuery.isLoading ? (
          <div style={{ padding: 16 }}>
            <CardSkeleton height={90} />
          </div>
        ) : upcoming.length ? (
          <div>
            {upcoming.map((leave) => (
              <div className="list-item" key={leave._id}>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="fw-medium">{leave.title || 'Holiday'}</span>
                    <LeaveTypeBadge type={leave.leaveType} />
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {formatRange(leave.startDate, leave.endDate)}
                    {leave.description ? ` · ${leave.description}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming holidays"
            message="Nothing is scheduled for the coming months."
          />
        )}
      </Card>

      <Card title="Comp-off details" subtitle="Days earned from extra work">
        {mineQuery.isLoading ? (
          <CardSkeleton height={100} />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl fw-bold tabular">{compOff.balanceDays}</span>
              <span className="text-muted">day(s) available</span>
            </div>

            {compOff.records?.length ? (
              <div className="mt-4">
                {compOff.records.map((record) => (
                  <div className="list-item" key={record._id} style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="fw-medium">{formatRange(record.startDate, record.endDate)}</div>
                      {record.reason && <div className="text-xs text-muted mt-1">{record.reason}</div>}
                    </div>
                    <span className="badge badge--primary">{record.days} day(s)</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={Plane}
                  title="No comp-off records"
                  message="Extra hours you work will show up here."
                />
              </div>
            )}
          </>
        )}
      </Card>

      <Card title="Leave history" subtitle="Leaves granted to you" flush>
        <div className="toolbar">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All' },
              { value: 'comp-off', label: 'Comp-Off' },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          loading={mineQuery.isLoading}
          rowKey={(row) => row._id}
          empty={
            <EmptyState
              icon={CalendarCheck}
              title="No leaves found"
              message="Leaves granted to you will appear here."
            />
          }
        />
      </Card>
    </div>
  );
}
