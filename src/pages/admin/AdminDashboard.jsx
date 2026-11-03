import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  CircleCheckBig,
  TrendingDown,
  CalendarDays,
  Timer,
  CalendarRange,
  CalendarClock,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import EmptyState from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { CardSkeleton } from '../../components/ui/Loader';
import { TrendAreaChart, HoursBarChart } from '../../components/charts/Charts';
import { dashboardApi } from '../../api/dashboard';
import { qk } from '../../api/queryKeys';
import { formatDateCompact, formatHours, formatHoursShort, todayISO } from '../../lib/format';

const CHART_HEIGHT = 260;

/** "2026-11" -> "November 2026" */
const monthLabelOf = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

/** Company-wide timesheet analytics, scoped to a selected month. */
export default function AdminDashboard() {
  const currentMonth = todayISO().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...qk.adminDashboard, month],
    queryFn: async () => (await dashboardApi.admin({ month })).data,
    staleTime: 60_000,
  });

  const cards = data?.cards || {};
  const topPerformers = data?.topPerformers || [];
  const missedUpdates = data?.missedUpdates || [];
  const monthLabel = useMemo(() => monthLabelOf(month), [month]);

  // Charts expect `{ label, hours }` shaped rows.
  const trendData = useMemo(
    () => (data?.dailyTrend || []).map((d) => ({ label: formatDateCompact(d.date), hours: d.hours })),
    [data?.dailyTrend]
  );

  const departmentData = useMemo(
    () => (data?.departmentHours || []).map((d) => ({ label: d.department, hours: d.hours })),
    [data?.departmentHours]
  );

  // Active employees who logged at least something today.
  const loggedToday = Math.max(0, (cards.activeEmployees || 0) - (cards.notUpdatedToday || 0));

  return (
    <div className="page">
      <PageHead
        title="Dashboard"
        subtitle="Company-wide timesheet analytics for today."
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              max={currentMonth}
              onChange={(e) => setMonth(e.target.value || currentMonth)}
              style={{ width: 170 }}
              aria-label="Filter by month"
            />
            <Button variant="secondary" icon={RefreshCw} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Total Employees"
          value={cards.totalEmployees ?? 0}
          icon={Users}
          tone="primary"
          foot={`${cards.activeEmployees ?? 0} active`}
          loading={isLoading}
        />
        <StatCard
          label="Active Employees"
          value={cards.activeEmployees ?? 0}
          icon={UserCheck}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          label="Not Updated Today"
          value={cards.notUpdatedToday ?? 0}
          icon={UserX}
          tone="warning"
          foot="Active employees without today's entry"
          loading={isLoading}
        />
        <StatCard
          label="Completed 8h Today"
          value={cards.completedToday ?? 0}
          icon={CircleCheckBig}
          tone="success"
          foot={`Target ${cards.dailyTargetHours ?? 0}h/day`}
          loading={isLoading}
        />
        {/* <StatCard
          label="Below 8h Today"
          value={cards.lessThanToday ?? 0}
          icon={TrendingDown}
          tone="warning"
          loading={isLoading}
        />
        <StatCard
          label="On Leave Today"
          value={cards.onLeaveToday ?? 0}
          icon={CalendarDays}
          tone="info"
          loading={isLoading}
        />
        <StatCard
          label="Today's Hours"
          value={formatHours(cards.todayHours)}
          icon={Timer}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Weekly Hours"
          value={formatHours(cards.weeklyHours)}
          icon={CalendarRange}
          tone="info"
          loading={isLoading}
        />
        <StatCard
          label="Month Hours"
          value={formatHours(cards.monthlyHours)}
          icon={CalendarClock}
          tone="primary"
          foot={monthLabel}
          loading={isLoading}
        /> */}
      </div>

      <Card title="Employees with missing updates" subtitle={`Timesheet days missed in ${monthLabel}`} flush>
        {isLoading ? (
          <div style={{ padding: 20 }}>
            <CardSkeleton height={120} />
          </div>
        ) : missedUpdates.length ? (
          <ul className="list-reset">
            {missedUpdates.map((row) => (
              <li className="list-item" key={row.id}>
                <Avatar name={row.name} size="sm" />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="fw-medium truncate">{row.name}</div>
                  <div className="text-xs text-muted truncate">{row.department || '—'}</div>
                </div>
                <Badge tone="warning">{row.missedDays} day(s) missed</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No missing updates"
            message={`Every active employee has updated their timesheet in ${monthLabel}.`}
          />
        )}
      </Card>

      {/* <div className="chart-grid chart-grid--single">
        <Card title="Daily working hours" subtitle={monthLabel}>
          {isLoading ? (
            <CardSkeleton height={CHART_HEIGHT} />
          ) : trendData.length ? (
            <TrendAreaChart data={trendData} height={CHART_HEIGHT} />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No activity yet"
              message="Daily hours will appear here once timesheets are logged."
            />
          )}
        </Card>
      </div> */}

      {/* <Card title="Today at a glance" subtitle="Employees who logged time vs those who hit the daily target">
        {isLoading ? (
          <CardSkeleton height={44} />
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1" style={{ minWidth: 220 }}>
              <ProgressBar value={cards.completedToday || 0} max={loggedToday || 1} />
            </div>
            <span className="text-sm text-secondary tabular">
              <strong>{cards.completedToday ?? 0}</strong> of {loggedToday} logged-in employees completed{' '}
              {cards.dailyTargetHours ?? 0}h
            </span>
          </div>
        )}
      </Card> */}

      {/* <div className="split-2">
        <Card title="Hours by department" subtitle={monthLabel}>
          {isLoading ? (
            <CardSkeleton height={CHART_HEIGHT} />
          ) : departmentData.length ? (
            <HoursBarChart data={departmentData} height={CHART_HEIGHT} />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No department data"
              message="Hours will be grouped by department here."
            />
          )}
        </Card>

        <Card title="Top performers" subtitle={monthLabel} flush>
          {isLoading ? (
            <div style={{ padding: 20 }}>
              <CardSkeleton height={CHART_HEIGHT} />
            </div>
          ) : topPerformers.length ? (
            <ul className="list-reset">
              {topPerformers.map((performer, index) => (
                <li className="list-item" key={`${performer.name}-${index}`}>
                  <Avatar name={performer.name} size="sm" />
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="fw-medium truncate">{performer.name}</div>
                    <div className="text-xs text-muted truncate">{performer.department || '—'}</div>
                  </div>
                  <span className="text-sm fw-semibold tabular">{formatHoursShort(performer.hours)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title="No performance data"
              message="Top hours logged this month will show up here."
            />
          )}
        </Card>
      </div> */}
    </div>
  );
}
