import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Timer, TrendingUp } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Loader';
import { useAuth } from '../../context/AuthContext';
import { timesheetApi } from '../../api/timesheets';
import { leaveApi } from '../../api/leaves';
import { qk } from '../../api/queryKeys';
import { GRID_HOURS, LEAVE_TYPES, WEEKEND_LEAVE_TYPE, leaveHighlight, leaveTypeLabel } from '../../lib/constants';
import { expandEntries, groupSlots, isTypedEntry } from '../../lib/timesheet';
import {
  formatDateRef,
  formatHours,
  formatHoursShort,
  startOfMonthISO,
  endOfMonthISO,
  todayISO,
  eachDayISO,
  weekdayName,
} from '../../lib/format';

// Sticky header row (top) and sticky date column (left); inline so they work regardless of CSS.
const STICKY_HEAD = { position: 'sticky', top: 0, zIndex: 3 };
const STICKY_HEAD_DATE = { position: 'sticky', top: 0, left: 0, zIndex: 5 };
const SURFACE = 'var(--surface, var(--card-bg, #fff))';

const ordinal = (h) => `${h}${h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} Hour`;

/**
 * Employee history: month calendar grid for the logged-in employee.
 * Rows are dates, columns are the hourly slots (same layout as Admin Timesheet).
 */
export default function MyHistory() {
  const { user } = useAuth();
  const today = todayISO();
  const [monthStart, setMonthStart] = useState(() => startOfMonthISO(today));
  const [jumpTick, setJumpTick] = useState(0);
  const gridRef = useRef(null);
  const monthEnd = endOfMonthISO(monthStart);
  const myId = user?._id || user?.id || null;

  // 1. My timesheets for the selected month (API returns only the logged-in employee's data)
  const { data: timesheetsData, isLoading: timesheetsLoading } = useQuery({
    queryKey: qk.timesheets({ from: monthStart, to: monthEnd, limit: 1000 }),
    queryFn: async () => (await timesheetApi.list({ from: monthStart, to: monthEnd, limit: 1000 })).data,
    staleTime: 60_000,
  });
  const timesheets = timesheetsData || [];

  // 2. Leaves (common holidays + my own leaves)
  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: qk.leaves({ from: monthStart, to: monthEnd, limit: 100 }),
    queryFn: async () => (await leaveApi.list({ from: monthStart, to: monthEnd, limit: 100 })).data,
    staleTime: 5 * 60 * 1000,
  });
  const leaves = leavesData || [];

  const leaveMaps = useMemo(() => {
    const common = new Map();
    const individual = new Map();
    leaves.forEach((leave) => {
      const leaveEmployeeId = leave.employee?._id || leave.employee || null;
      // Ignore leaves of other employees if the API ever returns them.
      if (leave.scope !== 'common' && myId && leaveEmployeeId && leaveEmployeeId !== myId) return;
      eachDayISO(leave.startDate, leave.endDate).forEach((day) => {
        if (leave.scope === 'common') {
          if (!common.has(day)) common.set(day, leave);
        } else if (!individual.has(day)) {
          individual.set(day, leave);
        }
      });
    });
    return { common, individual };
  }, [leaves, myId]);

  const leaveTypesInView = useMemo(() => {
    const present = new Set(leaves.map((leave) => leave.leaveType));
    return LEAVE_TYPES.filter((type) => present.has(type));
  }, [leaves]);

  const dates = useMemo(() => eachDayISO(monthStart, monthEnd), [monthStart, monthEnd]);
  const hasSunday = useMemo(() => dates.some((date) => weekdayName(date) === 'Sun'), [dates]);

  // Index my timesheets by date
  const sheetByDate = useMemo(() => {
    const index = new Map();
    timesheets.forEach((ts) => {
      const dateStr = typeof ts.date === 'string' ? ts.date.split('T')[0] : '';
      if (dateStr) index.set(dateStr, ts);
    });
    return index;
  }, [timesheets]);

  const summary = useMemo(() => {
    const totalHours = timesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0);
    const loggedDays = timesheets.filter((ts) => (ts.totalHours || 0) > 0).length;
    const average = loggedDays ? totalHours / loggedDays : 0;
    return { totalHours, loggedDays, average };
  }, [timesheets]);

  const navigateMonth = (direction) => {
    const current = new Date(monthStart);
    current.setMonth(current.getMonth() + direction);
    setMonthStart(startOfMonthISO(current.toISOString().split('T')[0]));
  };

  // Switch to the current month (if needed) and scroll to today's row.
  const goToToday = () => {
    const currentStart = startOfMonthISO(today);
    if (monthStart !== currentStart) setMonthStart(currentStart);
    setJumpTick((tick) => tick + 1);
  };

  useEffect(() => {
    if (!jumpTick) return;
    const node = gridRef.current?.querySelector(`[data-date="${today}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setJumpTick(0);
  }, [jumpTick, today, sheetByDate]);

  const isLoading = timesheetsLoading || leavesLoading;

  return (
    <div className="page">
      <PageHead
        title="My History"
        subtitle="Review your logged hours and tasks month by month."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            />
            <span className="fw-semibold flex items-center px-2" style={{ minWidth: 140, justifyContent: 'center' }}>
              {new Date(monthStart).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronRight}
              onClick={() => navigateMonth(1)}
              disabled={monthStart >= startOfMonthISO(today)}
              aria-label="Next month"
            />
          </div>
        }
      />

      {/* <div className="stat-grid">
        <StatCard
          label="Total hours"
          value={formatHours(summary.totalHours)}
          icon={Timer}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Logged days"
          value={summary.loggedDays}
          icon={CalendarDays}
          tone="info"
          foot="Days with hours this month"
          loading={isLoading}
        />
        <StatCard
          label="Average per day"
          value={formatHours(summary.average)}
          icon={TrendingUp}
          tone="success"
          loading={isLoading}
        />
      </div> */}

      <Card flush>
        {isLoading ? (
          <div className="p-6">
            <CardSkeleton height={400} />
          </div>
        ) : dates.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No data to display"
            message="No dates found for the selected period."
          />
        ) : (
          <div className="ts-grid-container" style={{ minHeight: '400px' }} ref={gridRef}>
            <div className="ts-grid-toolbar">
              <div className="ts-legend">
                <span className="ts-legend__item">
                  <i className="ts-legend__dot ts-legend__dot--work" /> Task
                </span>
                <span className="ts-legend__item">
                  <i className="ts-legend__dot ts-legend__dot--permission" /> Permission
                </span>
                {hasSunday && (
                  <span className="ts-legend__item">
                    <i
                      className="ts-legend__dot"
                      style={{
                        background: leaveHighlight(WEEKEND_LEAVE_TYPE).bg,
                        border: `1px solid ${leaveHighlight(WEEKEND_LEAVE_TYPE).border}`,
                      }}
                    />
                    {leaveTypeLabel(WEEKEND_LEAVE_TYPE)}
                  </span>
                )}
                {leaveTypesInView.length === 0 ? (
                  <span className="ts-legend__item">
                    <i className="ts-legend__dot ts-legend__dot--leave" /> Leave
                  </span>
                ) : (
                  leaveTypesInView.map((type) => {
                    const tint = leaveHighlight(type);
                    return (
                      <span className="ts-legend__item" key={type}>
                        <i
                          className="ts-legend__dot"
                          style={{ background: tint.bg, border: `1px solid ${tint.border}` }}
                        />
                        {leaveTypeLabel(type)}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            <div className="ts-grid-scroll">
              <table className="ts-grid ts-grid--admin ts-grid--mine">
                <thead>
                  <tr>
                    <th className="ts-grid__th--date" style={STICKY_HEAD_DATE}>Date</th>
                    {GRID_HOURS.map((h) => (
                      <th key={h} style={STICKY_HEAD}>{ordinal(h)}</th>
                    ))}
                    <th style={STICKY_HEAD}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date, dateIdx) => {
                    const ts = sheetByDate.get(date) || null;
                    const slots = ts ? expandEntries(ts.entries) : [];
                    const groups = ts ? groupSlots(slots) : [];
                    const isToday = date === today;

                    // Leave resolution: my own leave > common holiday > Sunday
                    const commonLeave = leaveMaps.common.get(date);
                    const myLeave = leaveMaps.individual.get(date) || commonLeave;
                    const sundayLeave =
                      !myLeave && weekdayName(date) === 'Sun' ? { leaveType: WEEKEND_LEAVE_TYPE } : null;
                    const dayLeave = myLeave || sundayLeave;
                    const tint = dayLeave ? leaveHighlight(dayLeave.leaveType) : null;

                    const rowClass = [
                      'ts-grid__row',
                      dateIdx % 2 === 1 ? 'ts-grid__row--alt' : '',
                      isToday ? 'ts-grid__row--today' : '',
                      dayLeave ? 'ts-grid__row--leave' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <tr
                        key={date}
                        data-date={date}
                        className={rowClass}
                        style={tint ? { backgroundColor: tint.bg } : undefined}
                      >
                        <td
                          className={`ts-grid__date-cell ts-grid__date-cell--admin${isToday ? ' is-today' : ''}`}
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            backgroundColor: SURFACE,
                            ...(tint
                              ? {
                                  backgroundImage: `linear-gradient(${tint.bg}, ${tint.bg})`,
                                  boxShadow: `inset 3px 0 0 ${tint.border}`,
                                }
                              : {}),
                          }}
                        >
                          <div className="ts-grid__date-info">
                            <span className="ts-grid__date-text">{formatDateRef(date)}</span>
                            <span className="ts-grid__day-text">{weekdayName(date)}</span>
                            {isToday && <span className="ts-grid__today-tag">Today</span>}
                            {dayLeave && (
                              <span
                                className="ts-grid__leave-chip"
                                style={{ backgroundColor: tint.bg, color: tint.fg, borderColor: tint.border }}
                              >
                                {leaveTypeLabel(dayLeave.leaveType)}
                              </span>
                            )}
                          </div>
                        </td>

                        {ts ? (
                          <>
                            {groups.map((group) => {
                              const typed = isTypedEntry(group.type);
                              return (
                                <td
                                  key={group.startIndex}
                                  colSpan={group.colSpan}
                                  className={`ts-grid__slot${typed ? ` ts-grid__slot--${group.type.toLowerCase()}` : ''}`}
                                >
                                  {group.filled ? (
                                    <div className="ts-grid__cell-inner">
                                      {group.description && (
                                        <span className="ts-grid__cell-text">{group.description}</span>
                                      )}
                                      {typed && (
                                        <span className={`ts-grid__type-tag ts-grid__type-tag--${group.type.toLowerCase()}`}>
                                          {group.type}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="ts-grid__empty">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="ts-grid__total-cell">{formatHoursShort(ts.totalHours)}</td>
                          </>
                        ) : (
                          <>
                            {GRID_HOURS.map((h) => (
                              <td key={h} className="ts-grid__slot">
                                <span className="ts-grid__empty">—</span>
                              </td>
                            ))}
                            <td className="ts-grid__total-cell ts-grid__total-cell--empty">—</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {!isLoading && (
        <button
          type="button"
          className="ts-goto-today"
          onClick={goToToday}
          title="Go to today"
          aria-label="Go to today"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}