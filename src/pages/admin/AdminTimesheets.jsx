import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, CalendarDays, ChevronLeft, ChevronRight, FilterX, Timer, Users } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { MultiSelect } from '../../components/ui/Input';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Loader';
import { timesheetApi } from '../../api/timesheets';
import { employeeApi } from '../../api/employees';
import { leaveApi } from '../../api/leaves';
import { qk } from '../../api/queryKeys';
import { GRID_HOURS, LEAVE_TYPES, WEEKEND_LEAVE_TYPE, leaveHighlight, leaveTypeLabel } from '../../lib/constants';
import { expandEntries, groupSlots, isTypedEntry } from '../../lib/timesheet';
import {
  formatDateRef,
  formatHours,
  formatHoursShort,
  getInitials,
  startOfMonthISO,
  endOfMonthISO,
  todayISO,
  eachDayISO,
  weekdayName,
} from '../../lib/format';

/**
 * Admin view of all timesheets for a given month.
 * Displays a grid where rows are employees and dates are grouped.
 */
export default function AdminTimesheets() {
  const today = todayISO();
  const [monthStart, setMonthStart] = useState(() => startOfMonthISO(today));
  const [employeeIds, setEmployeeIds] = useState([]);
  const [jumpTick, setJumpTick] = useState(1);
  const gridRef = useRef(null);
  const monthEnd = endOfMonthISO(monthStart);

  // 1. Fetch all employees (to ensure we show every employee even if they have no logs)
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: qk.employees({ limit: 100, status: 'active' }),
    queryFn: async () => (await employeeApi.list({ limit: 100, status: 'active' })).data,
    staleTime: 5 * 60 * 1000,
  });
  const employees = employeesData || [];

  // 2. Fetch all timesheets for the selected month
  const { data: timesheetsData, isLoading: timesheetsLoading } = useQuery({
    queryKey: qk.timesheets({ from: monthStart, to: monthEnd, limit: 1000 }),
    queryFn: async () => (await timesheetApi.list({ from: monthStart, to: monthEnd, limit: 1000 })).data,
    staleTime: 60_000,
  });
  const timesheets = timesheetsData || [];

  // 3. Fetch leaves (common holidays + individual leaves) to highlight leave dates
  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: qk.leaves({ from: monthStart, to: monthEnd, limit: 100 }),
    queryFn: async () => (await leaveApi.list({ from: monthStart, to: monthEnd, limit: 100 })).data,
    staleTime: 5 * 60 * 1000,
  });
  const leaves = leavesData || [];

  // Index leaves so a date / employee can be resolved to a single leave quickly.
  const leaveMaps = useMemo(() => {
    const common = new Map();
    const individual = new Map();
    leaves.forEach((leave) => {
      eachDayISO(leave.startDate, leave.endDate).forEach((day) => {
        if (leave.scope === 'common') {
          if (!common.has(day)) common.set(day, leave);
        } else if (leave.employee) {
          individual.set(`${day}::${leave.employee._id || leave.employee}`, leave);
        }
      });
    });
    return { common, individual };
  }, [leaves]);

  // Distinct leave types present this month - used to build the colour legend.
  const leaveTypesInView = useMemo(() => {
    const present = new Set(leaves.map((leave) => leave.leaveType));
    return LEAVE_TYPES.filter((type) => present.has(type));
  }, [leaves]);

  const employeeOptions = useMemo(
    () => employees.map((employee) => ({
      value: employee._id,
      label: employee.name,
      hint: employee.department || '',
    })),
    [employees]
  );

  const hasFilters = employeeIds.length > 0;
  const clearFilters = () => setEmployeeIds([]);

  const visibleEmployees = useMemo(() => {
    if (!employeeIds.length) return employees;
    const selected = new Set(employeeIds);
    return employees.filter((employee) => selected.has(employee._id));
  }, [employees, employeeIds]);

  // 4. Prepare the grid data (ascending: the month's starting date sits on top)
  const dates = useMemo(() => eachDayISO(monthStart, monthEnd), [monthStart, monthEnd]);

  // Sundays are treated as non-working days and rendered like leave.
  const hasSunday = useMemo(() => dates.some((date) => weekdayName(date) === 'Sun'), [dates]);
  
  const grid = useMemo(() => {
    if (!visibleEmployees.length || !dates.length) return [];
    
    // Index timesheets by date then employeeId
    const index = new Map();
    timesheets.forEach(ts => {
      const dateStr = typeof ts.date === 'string' ? ts.date.split('T')[0] : '';
      const key = `${dateStr}-${ts.employee?._id || ts.employee}`;
      index.set(key, ts);
    });

    // Build flat list of rows: { date, employee, timesheet }
    const rows = [];
    dates.forEach(date => {
      visibleEmployees.forEach(employee => {
        const ts = index.get(`${date}-${employee._id}`);
        rows.push({
          date,
          employee,
          timesheet: ts || null
        });
      });
    });
    return rows;
  }, [visibleEmployees, dates, timesheets]);

  const summary = useMemo(() => {
    const totalHours = timesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0);
    const loggedDays = timesheets.length;
    return { totalHours, loggedDays };
  }, [timesheets]);

  const navigateMonth = (direction) => {
    const current = new Date(monthStart);
    current.setMonth(current.getMonth() + direction);
    setMonthStart(startOfMonthISO(current.toISOString().split('T')[0]));
  };

  // Switch to the current month (if needed) and scroll to today's rows.
  const goToToday = () => {
    const currentStart = startOfMonthISO(today);
    if (monthStart !== currentStart) setMonthStart(currentStart);
    setJumpTick((tick) => tick + 1);
  };

  const isLoading = employeesLoading || timesheetsLoading || leavesLoading;

  useEffect(() => {
    if (!jumpTick || isLoading) return;
    const node = gridRef.current?.querySelector(`[data-date="${today}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setJumpTick(0);
  }, [jumpTick, isLoading, today, grid]);

  return (
    <div className="page">
      <PageHead 
        title="Admin Timesheet" 
        subtitle="Full view of all employee hours and tasks."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              icon={ChevronLeft} 
              onClick={() => navigateMonth(-1)}
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
            />
          </div>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Total hours"
          value={formatHours(summary.totalHours)}
          icon={Timer}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Employees"
          value={employees.length}
          icon={Users}
          tone="info"
          loading={isLoading}
        />
        <StatCard
          label="Logged days"
          value={summary.loggedDays}
          icon={CalendarDays}
          tone="success"
          foot="Total entries this month"
          loading={isLoading}
        />
      </div>

      <Card flush>
        {isLoading ? (
          <div className="p-6">
            <CardSkeleton height={400} />
          </div>
        ) : grid.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No data to display"
            message="No active employees or dates found for the selected period."
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
              <div className="ts-grid-toolbar__filters">
                <MultiSelect
                  options={employeeOptions}
                  value={employeeIds}
                  onChange={setEmployeeIds}
                  placeholder="All employees"
                  searchPlaceholder="Search employees…"
                />
                {hasFilters && (
                  <Button variant="secondary" size="sm" icon={FilterX} onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
            <div className="ts-grid-scroll">
              <table className="ts-grid ts-grid--admin">
                <thead>
                  <tr>
                    <th className="ts-grid__th--employee">Employee</th>
                    <th className="ts-grid__th--date">Date</th>
                    {GRID_HOURS.map(h => (
                      <th key={h}>{h}{h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} Hour</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date, dateIdx) => {
                    const dateRows = grid.filter(r => r.date === date);
                    if (!dateRows.length) return null;
                    const isToday = date === today;
                    const commonLeave = leaveMaps.common.get(date);
                    // Sundays behave like leave days unless a holiday already covers them.
                    const sundayLeave =
                      !commonLeave && weekdayName(date) === 'Sun' ? { leaveType: WEEKEND_LEAVE_TYPE } : null;
                    const dayLeave = commonLeave || sundayLeave;
                    const dateTint = dayLeave ? leaveHighlight(dayLeave.leaveType) : null;

                    return dateRows.map((row, idx) => {
                      const ts = row.timesheet;
                      const slots = ts ? expandEntries(ts.entries) : [];
                      const groups = ts ? groupSlots(slots) : [];
                      // Real leave for this employee; a Sunday only tints the row (no chip).
                      const employeeLeave =
                        leaveMaps.individual.get(`${date}::${row.employee._id}`) || commonLeave;
                      const employeeTint = employeeLeave ? leaveHighlight(employeeLeave.leaveType) : null;
                      const rowLeave = employeeLeave || sundayLeave;
                      const rowTint = rowLeave ? leaveHighlight(rowLeave.leaveType) : null;
                      const rowClass = [
                        'ts-grid__row',
                        dateIdx % 2 === 1 ? 'ts-grid__row--alt' : '',
                        isToday ? 'ts-grid__row--today' : '',
                        rowLeave ? 'ts-grid__row--leave' : '',
                      ].filter(Boolean).join(' ');

                      return (
                        <tr
                          key={`${row.date}-${row.employee._id}`}
                          data-date={row.date}
                          className={rowClass}
                          style={rowTint ? { backgroundColor: rowTint.bg } : undefined}
                        >
                          <td className="ts-grid__employee-cell">
                            <div className="ts-grid__employee">
                              <span className="ts-grid__employee-avatar">{getInitials(row.employee.name)}</span>
                              <div className="ts-grid__employee-info">
                                <span className="ts-grid__employee-name">{row.employee.name}</span>
                                <span className="ts-grid__employee-dept">{row.employee.department || '—'}</span>
                                {employeeLeave && (
                                  <span
                                    className="ts-grid__leave-chip"
                                    style={{
                                      backgroundColor: employeeTint.bg,
                                      color: employeeTint.fg,
                                      borderColor: employeeTint.border,
                                    }}
                                  >
                                    {leaveTypeLabel(employeeLeave.leaveType)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {idx === 0 && (
                            <td
                              rowSpan={dateRows.length}
                              className={`ts-grid__date-cell ts-grid__date-cell--admin${isToday ? ' is-today' : ''}`}
                              style={dateTint ? { backgroundColor: dateTint.bg, boxShadow: `inset 3px 0 0 ${dateTint.border}` } : undefined}
                            >
                              <div className="ts-grid__date-info">
                                <span className="ts-grid__date-text">{formatDateRef(date)}</span>
                                <span className="ts-grid__day-text">{weekdayName(date)}</span>
                                {isToday && <span className="ts-grid__today-tag">Today</span>}
                                {dayLeave && (
                                  <span
                                    className="ts-grid__leave-chip"
                                    style={{ backgroundColor: dateTint.bg, color: dateTint.fg, borderColor: dateTint.border }}
                                  >
                                    {leaveTypeLabel(dayLeave.leaveType)}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {ts ? (
                            <>
                              {groups.map(group => {
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
                              <td className="ts-grid__total-cell">
                                {formatHoursShort(ts.totalHours)}
                              </td>
                            </>
                          ) : (
                            <>
                              {GRID_HOURS.map(h => (
                                <td key={h} className="ts-grid__slot">
                                  <span className="ts-grid__empty">—</span>
                                </td>
                              ))}
                              <td className="ts-grid__total-cell ts-grid__total-cell--empty">—</td>
                            </>
                          )}
                        </tr>
                      );
                    });
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