import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarClock, CalendarDays, CalendarRange, Hourglass, Plane, Plus, Timer } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { LeaveTypeBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import ProgressBar from '../../components/ui/ProgressBar';
import { CardSkeleton } from '../../components/ui/Loader';
import { TrendAreaChart } from '../../components/charts/Charts';
import { dashboardApi } from '../../api/dashboard';
import { qk } from '../../api/queryKeys';
import {
  formatDate,
  formatDateCompact,
  formatDateShort,
  formatHours,
  formatHoursShort,
  relativeDay,
  todayISO,
} from '../../lib/format';

/** Dashboard may report `entries` as an array or a count - normalise both. */
const countEntries = (entries) => (Array.isArray(entries) ? entries.length : Number(entries) || 0);

/** Collapse a single-day range into one date. */
const formatRange = (start, end) => (start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`);

/** Employee landing page: today's progress, weekly totals and leave outlook. */
export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: qk.employeeDashboard,
    queryFn: async () => (await dashboardApi.employee()).data,
    staleTime: 60_000,
  });

  const today = data?.today;
  const compOff = data?.compOff || { balanceDays: 0, records: [] };
  const trend = (data?.dailyTrend || []).map((day) => ({
    label: formatDateCompact(day.date),
    hours: day.hours,
  }));

  const todayIso = today?.date || todayISO();
  const updated = Boolean(today?.hasEntry);
  // A holiday or personal leave covering today means no entry is expected.
  const leaveToday = useMemo(() => {
    const list = [...(data?.upcomingHolidays || []), ...(data?.upcomingLeaves || [])];
    return list.find((leave) => todayIso >= leave.startDate && todayIso <= leave.endDate) || null;
  }, [data?.upcomingHolidays, data?.upcomingLeaves, todayIso]);

  const statusBadge = leaveToday
    ? { tone: 'info', label: 'On leave' }
    : updated
      ? { tone: 'success', label: 'Updated' }
      : { tone: 'warning', label: 'Not updated' };

  return (
    <div className="page">
      <PageHead
        title="Dashboard"
        subtitle={today ? `${formatDateShort(today.date)} · Your daily Effortlog` : 'Your daily Effortlog'}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => navigate('/employee/timesheet')}>
            Update today&apos;s timesheet
          </Button>
        }
      />

      <Card
        title="Today's progress"
        subtitle={today ? formatDate(today.date) : undefined}
        action={!isLoading && <Badge tone={statusBadge.tone} dot>{statusBadge.label}</Badge>}
      >
        {isLoading ? (
          <CardSkeleton height={120} />
        ) : (
          <>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl fw-bold tabular">{formatHours(today?.hours)}</span>
              <span className="text-muted">/ {today?.target ?? 8}h target</span>
              <span className="text-sm text-muted">· {formatHours(today?.remaining)} remaining</span>
            </div>
            <div className="mt-4">
              <ProgressBar value={today?.hours} max={today?.target} />
            </div>
            {leaveToday ? (
              <div className="alert alert--success mt-4">
                <Plane size={16} />
                <span>
                  You&apos;re on {leaveToday.title || 'leave'} today — no timesheet is required.
                </span>
              </div>
            ) : !updated && (
              <div className="alert alert--warning mt-4 flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  You haven&apos;t updated today&apos;s timesheet yet. Please log your hours.
                </span>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/employee/timesheet')}>
                  Update now
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="stat-grid">
        <StatCard label="Today's hours" value={formatHours(today?.hours)} icon={Timer} tone="primary" loading={isLoading} />
        <StatCard label="Remaining hours" value={formatHours(today?.remaining)} icon={Hourglass} tone="warning" loading={isLoading} />
        <StatCard label="This week" value={formatHours(data?.weeklyHours)} icon={CalendarRange} tone="info" loading={isLoading} />
        {/* <StatCard label="This month" value={formatHours(data?.monthlyHours)} icon={CalendarClock} tone="primary" loading={isLoading} /> */}
        <StatCard
          label="Comp-off balance"
          value={`${compOff.balanceDays} day(s)`}
          icon={Plane}
          tone="success"
          loading={isLoading}
        />
      </div>

      {/* <Card title="Your working hours" subtitle="Last 14 days">
        {isLoading ? (
          <CardSkeleton height={260} />
        ) : trend.length ? (
          <TrendAreaChart data={trend} />
        ) : (
          <EmptyState
            icon={CalendarRange}
            title="No hours logged yet"
            message="Your daily hours will appear here once you start logging time."
          />
        )}
      </Card> */}

      <div className="split-2">
        <Card
          title="Recent timesheets"
          subtitle="Your last few working days"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/employee/history')}>
              View all
            </Button>
          }
          flush
        >
          {isLoading ? (
            <div style={{ padding: 16 }}>
              <CardSkeleton height={80} />
            </div>
          ) : data?.recent?.length ? (
            <div>
              {data.recent.map((row) => (
                <div
                  className="list-item"
                  key={row.id || row.date}
                  onClick={() => navigate('/employee/history')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="fw-medium">{relativeDay(row.date)}</div>
                    <div className="text-xs text-muted mt-1">{countEntries(row.entries)} entries</div>
                  </div>
                  <div className="text-right">
                    <div className="fw-semibold tabular">{formatHoursShort(row.totalHours)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No recent timesheets"
              message="Submit your first timesheet and it will show up here."
            />
          )}
        </Card>

        <Card title="Upcoming holidays" flush>
          {isLoading ? (
            <div style={{ padding: 16 }}>
              <CardSkeleton height={80} />
            </div>
          ) : data?.upcomingHolidays?.length ? (
            <div>
              {data.upcomingHolidays.map((holiday) => (
                <div className="list-item" key={holiday._id}>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="fw-medium truncate">{holiday.title}</div>
                    <div className="text-xs text-muted mt-1">{formatRange(holiday.startDate, holiday.endDate)}</div>
                  </div>
                  <LeaveTypeBadge type={holiday.leaveType} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming holidays"
              message="You're all clear for the next few weeks."
            />
          )}
        </Card>
      </div>

      <Card title="Comp-off details" subtitle="Days earned from extra work">
        {isLoading ? (
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
    </div>
  );
}
