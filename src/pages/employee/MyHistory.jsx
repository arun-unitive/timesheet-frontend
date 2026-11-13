import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Pencil,
  Timer,
  TrendingUp,
} from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Input';
import { CardSkeleton } from '../../components/ui/Loader';
import { HoursBarChart } from '../../components/charts/Charts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { timesheetApi } from '../../api/timesheets';
import { qk } from '../../api/queryKeys';
import { GRID_HOURS, PAGE_SIZE_OPTIONS } from '../../lib/constants';
import {
  addDaysISO,
  eachDayISO,
  endOfMonthISO,
  endOfWeekISO,
  formatDate,
  formatDateCompact,
  formatHours,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
  weekdayName,
} from '../../lib/format';
import { expandEntries, groupSlots, isFilledSlot, isTypedEntry } from '../../lib/timesheet';

/** A full day is 8 logged hours; used for the progress bars. */
const DAILY_TARGET = GRID_HOURS.length;

/** 7.5 -> "7.5", 8 -> "8" */
const formatNum = (value) => String(Math.round((Number(value) || 0) * 100) / 100);

/**
 * Expand a saved day into one editable slot per hour. Permission / Leave slots
 * keep their type (they carry no description), so editing a day never turns
 * them into normal Work entries.
 */
const toDraftSlots = (sheet) =>
  expandEntries(sheet?.entries, GRID_HOURS.length).map((slot) => ({
    entryId: slot.entryId,
    description: isTypedEntry(slot.type) ? '' : slot.description,
    type: slot.type,
  }));

const TAB_OPTIONS = [
  { value: 'daily', label: 'Daily', icon: Clock },
  { value: 'weekly', label: 'Weekly', icon: TrendingUp },
  { value: 'monthly', label: 'Monthly', icon: CalendarDays },
];

/** Segmented control with an icon per view. */
function HistorySwitch({ value, onChange }) {
  return (
    <div className="history-switch" role="tablist">
      {TAB_OPTIONS.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          className={`history-switch__btn ${value === option ? 'is-active' : ''}`}
          onClick={() => onChange(option)}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Rounded prev / next control with the period label in the middle. */
function PeriodNav({ label, onPrev, onNext, nextDisabled }) {
  return (
    <div className="history-nav">
      <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onPrev} aria-label="Previous period" />
      <span className="history-nav__label">{label}</span>
      <Button
        variant="ghost"
        size="sm"
        icon={ChevronRight}
        onClick={onNext}
        disabled={nextDisabled}
        aria-label="Next period"
      />
    </div>
  );
}

const fillTone = (hours) => {
  if (hours >= DAILY_TARGET) return 'is-full';
  if (hours > 0 && hours < DAILY_TARGET / 2) return 'is-low';
  return '';
};

/** Single day row: date chip, weekday, progress bar and total hours. */
function DayRow({ row, onView, compact }) {
  const [dayNum, monthLabel] = formatDateCompact(row.date).split(' ');
  const percent = Math.min(100, (row.hours / DAILY_TARGET) * 100);
  const interactive = Boolean(onView);

  return (
    <div
      className={`history-day ${compact ? 'history-day--compact' : ''} ${interactive ? 'is-interactive' : ''} ${row.hours === 0 ? 'is-empty' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onView(row) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onView(row);
              }
            }
          : undefined
      }
    >
      <div className="history-day__date">
        <span className="history-day__daynum">{dayNum}</span>
        <span className="history-day__mon">{monthLabel}</span>
      </div>

      <div className="history-day__main">
        <div className="history-day__head">
          <span className="history-day__weekday">{weekdayName(row.date)}</span>
          <span className="history-day__meta">
            {row.hours === 0
              ? 'No hours logged'
              : `${row.entries || 0} ${row.entries === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>
        <div className="history-day__track">
          <span className={`history-day__fill ${fillTone(row.hours)}`} style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="history-day__hours">
        <span className="history-day__value">{formatNum(row.hours)}</span>
        <span className="history-day__unit">hours</span>
      </div>

      {interactive && <ChevronRight size={18} className="history-day__chev" />}
    </div>
  );
}

/** Day list with loading and empty states, shared by every tab. */
function DayList({ rows, loading, onView, compact, emptyTitle, emptyMessage }) {
  if (loading) {
    return (
      <div className="history-list">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="history-day is-skeleton">
            <div className="skeleton" style={{ width: 56, height: 52, borderRadius: 'var(--r-md)' }} />
            <div className="flex-1 flex flex-col gap-2">
              <div className="skeleton" style={{ height: 12, width: '35%' }} />
              <div className="skeleton" style={{ height: 6, width: '100%' }} />
            </div>
            <div className="skeleton" style={{ width: 46, height: 20 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <EmptyState icon={History} title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="history-list">
      {rows.map((row) => (
        <DayRow key={row.date} row={row} onView={onView} compact={compact} />
      ))}
    </div>
  );
}

/** Employee history: daily / weekly / monthly views plus a day detail modal. */
export default function MyHistory() {
  const { settings } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = todayISO();

  const [tab, setTab] = useState('daily');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');

  const [weekOf, setWeekOf] = useState(() => startOfWeekISO(todayISO()));
  const [monthOf, setMonthOf] = useState(() => startOfMonthISO(todayISO()));

  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftEntries, setDraftEntries] = useState([]);

  // ------------------------------- Daily -----------------------------------
  const dailyParams = useMemo(
    () => ({ page, limit, sortBy, order }),
    [page, limit, sortBy, order]
  );

  const dailyQuery = useQuery({
    queryKey: qk.timesheets(dailyParams),
    queryFn: async () => {
      const res = await timesheetApi.list(dailyParams);
      return { items: res.data, meta: res.meta };
    },
    staleTime: 60_000,
    enabled: tab === 'daily',
  });

  // ------------------------------- Weekly ----------------------------------
  const weekStart = startOfWeekISO(weekOf);
  const weekEnd = endOfWeekISO(weekOf);

  const weekQuery = useQuery({
    queryKey: qk.timesheetSummary({ from: weekStart, to: weekEnd }),
    queryFn: async () => (await timesheetApi.summary({ from: weekStart, to: weekEnd })).data,
    staleTime: 60_000,
    enabled: tab === 'weekly',
  });

  // ------------------------------- Monthly ---------------------------------
  const monthStart = startOfMonthISO(monthOf);
  const monthEnd = endOfMonthISO(monthOf);

  const monthQuery = useQuery({
    queryKey: qk.timesheetSummary({ from: monthStart, to: monthEnd }),
    queryFn: async () => (await timesheetApi.summary({ from: monthStart, to: monthEnd })).data,
    staleTime: 60_000,
    enabled: tab === 'monthly',
  });

  const buildDayRows = (summary, from, to) => {
    const map = new Map((summary?.days || []).map((day) => [day.date, day]));
    return eachDayISO(from, to).map((iso) => ({
      date: iso,
      hours: map.get(iso)?.totalHours || 0,
      entries: map.get(iso)?.entries || 0,
    }));
  };

  const weekRows = useMemo(
    () => buildDayRows(weekQuery.data, weekStart, weekEnd),
    [weekQuery.data, weekStart, weekEnd]
  );
  const monthRows = useMemo(
    () => buildDayRows(monthQuery.data, monthStart, monthEnd),
    [monthQuery.data, monthStart, monthEnd]
  );

  const weekChart = weekRows.map((row) => ({ label: weekdayName(row.date), hours: row.hours }));
  const monthChart = monthRows.map((row) => ({ label: formatDateCompact(row.date), hours: row.hours }));

  const weekSummary = weekQuery.data;
  const monthSummary = monthQuery.data;
  const averagePerDay = (summary) =>
    summary?.workingDays ? (summary.totalHours || 0) / summary.workingDays : 0;

  // -------------------------- Detail modal edit ---------------------------
  const canEditDay = (sheet) => {
    if (!sheet) return false;
    if (sheet.date > today) return false;
    const earliest = addDaysISO(today, -(settings?.editWindowDays ?? 7));
    if (sheet.date < earliest) return false;
    return true;
  };

  const editMutation = useMutation({
    mutationFn: ({ id, entries }) => timesheetApi.update(id, { entries }),
    onSuccess: (res) => {
      const updated = res?.data ?? res ?? null;
      toast.success('Timesheet updated', 'Your entries have been saved.');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: qk.employeeDashboard });
      if (updated) setDetail(updated);
      setEditing(false);
    },
    onError: (err) => toast.error('Could not update timesheet', err.message),
  });

  const startEdit = () => {
    setDraftEntries(toDraftSlots(detail));
    setEditing(true);
  };

  // Editing a slot updates the whole entry it belongs to (matching the editor),
  // and turning a Permission / Leave slot into text makes it a Work entry again.
  const updateDraft = (index, value) => {
    setDraftEntries((prev) => {
      const target = prev[index];
      const groupId = target.entryId || `local-${index}`;
      return prev.map((cell, i) =>
        (cell.entryId && cell.entryId === target.entryId) || i === index
          ? { entryId: groupId, type: 'Work', description: value }
          : cell
      );
    });
  };

  // Collapse the edited slots back into entries, keeping each Permission / Leave
  // type and the number of hours it covers so nothing is dropped or miscounted.
  const saveDraft = () => {
    const entries = [];
    for (let i = 0; i < draftEntries.length; ) {
      const cell = draftEntries[i];
      if (!cell.entryId || !isFilledSlot(cell)) {
        i += 1;
        continue;
      }

      let hours = 1;
      while (
        i + hours < draftEntries.length &&
        draftEntries[i + hours].entryId === cell.entryId &&
        isFilledSlot(draftEntries[i + hours])
      ) {
        hours += 1;
      }

      entries.push({
        project: 'General',
        description: cell.description.trim(),
        type: cell.type,
        hours,
      });
      i += hours;
    }

    if (!entries.length) {
      toast.error('Nothing to save', 'Enter at least one task description.');
      return;
    }
    editMutation.mutate({ id: detail._id, entries });
  };

  const draftTotal = draftEntries.filter(isFilledSlot).length;

  // ------------------------------ Daily data ------------------------------
  const dailyRows = (dailyQuery.data?.items || []).map((row) => ({
    date: row.date,
    hours: row.totalHours || 0,
    entries: row.entries?.length || 0,
    source: row,
  }));
  const dailyMeta = dailyQuery.data?.meta;

  const sortValue = `${sortBy}:${order}`;
  const handleSortChange = (value) => {
    const [field, nextOrder] = value.split(':');
    setSortBy(field);
    setOrder(nextOrder);
    setPage(1);
  };

  // ---------------------------- Modal footer ------------------------------
  const modalFooter = editing ? (
    <>
      <Button variant="secondary" onClick={() => setEditing(false)} disabled={editMutation.isPending}>
        Cancel
      </Button>
      <Button variant="primary" icon={Check} onClick={saveDraft} loading={editMutation.isPending}>
        Save changes
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={() => { setDetail(null); setEditing(false); }}>
        Close
      </Button>
      {/* {detail && canEditDay(detail) && (
        <Button variant="primary" icon={Pencil} onClick={startEdit}>
          Edit entries
        </Button>
      )} */}
    </>
  );

  return (
    <div className="page">
      <PageHead
        title="My History"
        subtitle="Review your logged hours by day, week or month."
        actions={<HistorySwitch value={tab} onChange={setTab} />}
      />

      {tab === 'daily' && (
        <Card flush>
          <div className="history-bar">
            <div>
              <div className="history-bar__title">Daily log</div>
              <div className="history-bar__sub">{dailyMeta?.total ?? 0} days recorded</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={sortValue} onChange={(e) => handleSortChange(e.target.value)} style={{ width: 170 }}>
                <option value="date:desc">Newest first</option>
                <option value="date:asc">Oldest first</option>
                <option value="totalHours:desc">Most hours</option>
                <option value="totalHours:asc">Fewest hours</option>
              </Select>
              <Select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ width: 120 }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <DayList
            rows={dailyRows}
            loading={dailyQuery.isLoading}
            onView={(row) => {
              setDetail(row.source);
              setEditing(false);
            }}
            emptyTitle="No timesheets found"
            emptyMessage="Try changing the filters, or log time from My Timesheet."
          />

          <Pagination
            page={dailyMeta?.page || 1}
            totalPages={dailyMeta?.totalPages || 1}
            total={dailyMeta?.total || 0}
            limit={limit}
            onPageChange={setPage}
          />
        </Card>
      )}

      {tab === 'weekly' && (
        <div className="history-panel">
          <div className="history-bar">
            <PeriodNav
              label={`${formatDate(weekStart)} – ${formatDate(weekEnd)}`}
              onPrev={() => setWeekOf(addDaysISO(weekStart, -7))}
              onNext={() => setWeekOf(addDaysISO(weekStart, 7))}
              nextDisabled={weekEnd >= today}
            />
            <span className="history-bar__sub">Monday to Sunday</span>
          </div>

          <div className="stat-grid">
            <StatCard label="Total hours" value={formatHours(weekSummary?.totalHours)} icon={Timer} tone="primary" loading={weekQuery.isLoading} />
            <StatCard label="Working days" value={weekSummary?.workingDays ?? 0} icon={CalendarDays} tone="info" loading={weekQuery.isLoading} />
            <StatCard label="Average per day" value={formatHours(averagePerDay(weekSummary))} icon={TrendingUp} tone="success" loading={weekQuery.isLoading} />
          </div>

          <Card title="Hours by day" subtitle="Selected week">
            {weekQuery.isLoading ? <CardSkeleton height={260} /> : <HoursBarChart data={weekChart} />}
          </Card>

          <Card title="Day-by-day" subtitle="Selected week" flush>
            <DayList rows={weekRows} loading={weekQuery.isLoading} compact />
          </Card>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="history-panel">
          <div className="history-bar">
            <PeriodNav
              label={`${formatDate(monthStart)} – ${formatDate(monthEnd)}`}
              onPrev={() => setMonthOf(startOfMonthISO(addDaysISO(monthStart, -1)))}
              onNext={() => setMonthOf(startOfMonthISO(addDaysISO(monthEnd, 1)))}
              nextDisabled={monthEnd >= today}
            />
            <span className="history-bar__sub">Calendar month</span>
          </div>

          <div className="stat-grid">
            <StatCard label="Total hours" value={formatHours(monthSummary?.totalHours)} icon={Timer} tone="primary" loading={monthQuery.isLoading} />
            <StatCard label="Working days" value={monthSummary?.workingDays ?? 0} icon={CalendarDays} tone="info" loading={monthQuery.isLoading} />
            <StatCard label="Average per day" value={formatHours(averagePerDay(monthSummary))} icon={TrendingUp} tone="success" loading={monthQuery.isLoading} />
          </div>

          <Card title="Hours by day" subtitle="Selected month">
            {monthQuery.isLoading ? <CardSkeleton height={260} /> : <HoursBarChart data={monthChart} />}
          </Card>

          <Card title="Day-by-day" subtitle="Selected month" flush>
            <DayList rows={monthRows} loading={monthQuery.isLoading} compact />
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => {
          setDetail(null);
          setEditing(false);
        }}
        size="lg"
        className="history-modal"
        title={detail ? formatDate(detail.date) : ''}
        subtitle={detail ? `${detail.entries?.length || 0} entries · ${formatHours(detail.totalHours)}` : undefined}
        footer={detail ? modalFooter : undefined}
      >
        {detail && (
          <div className="history-modal__content">
            <div className="history-modal__summary">
              <div className="history-modal__metric">
                <span className="history-modal__metric-icon is-hours"><Clock size={17} /></span>
                <span className="history-modal__metric-copy">
                  <span className="history-modal__metric-label">Hours logged</span>
                  <strong>{formatHours(editing ? draftTotal : detail.totalHours)}</strong>
                </span>
              </div>
              <div className="history-modal__metric">
                <span className="history-modal__metric-icon is-entries"><History size={17} /></span>
                <span className="history-modal__metric-copy">
                  <span className="history-modal__metric-label">Entries</span>
                  <strong>{detail.entries?.length || 0}</strong>
                </span>
              </div>
              <div className="history-modal__goal">
                <div className="history-modal__goal-head">
                  <span>Daily goal</span>
                  <strong>{formatNum(editing ? draftTotal : detail.totalHours)} / {DAILY_TARGET}h</strong>
                </div>
                <div
                  className="history-modal__goal-track"
                  role="progressbar"
                  aria-label="Daily goal progress"
                  aria-valuemin={0}
                  aria-valuemax={DAILY_TARGET}
                  aria-valuenow={Math.min(DAILY_TARGET, editing ? draftTotal : detail.totalHours || 0)}
                >
                  <span
                    style={{
                      width: `${Math.min(100, ((editing ? draftTotal : detail.totalHours || 0) / DAILY_TARGET) * 100)}%`,
                    }}
                  />
                </div>
                <span className="history-modal__goal-note">
                  {Math.max(0, DAILY_TARGET - (editing ? draftTotal : detail.totalHours || 0)) > 0
                    ? `${formatHours(Math.max(0, DAILY_TARGET - (editing ? draftTotal : detail.totalHours || 0)))} to daily goal`
                    : 'Daily goal reached'}
                </span>
              </div>
            </div>

            <div className="history-modal__grid-head">
              <div>
                <h3>{editing ? 'Edit hourly entries' : 'Hourly breakdown'}</h3>
                <p>{editing ? 'Update the description for each hour.' : 'Your logged activity across the day.'}</p>
              </div>
              <span className="history-modal__scroll-hint">Scroll to view all hours</span>
            </div>

            {!editing && (
              <div className="ts-grid-container history-modal__grid" style={{ margin: 0 }}>
                <table className="ts-grid">
                  <thead>
                    <tr>
                      {GRID_HOURS.map(h => (
                        <th key={h}>{h}{h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} Hour</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {groupSlots(expandEntries(detail.entries)).map((group) => {
                        const typed = isTypedEntry(group.type);
                        return (
                          <td
                            key={group.startIndex}
                            colSpan={group.colSpan}
                            className={`ts-grid__slot ${typed ? `ts-grid__slot--${group.type.toLowerCase()}` : ''}`}
                          >
                            {group.filled ? (
                              <div className="ts-grid__cell-inner">
                                {group.description && <span className="ts-grid__cell-text">{group.description}</span>}
                                {typed && (
                                  <span className={`ts-grid__type-tag ts-grid__type-tag--${group.type.toLowerCase()}`}>
                                    {group.type}
                                  </span>
                                )}
                              </div>
                            ) : '—'}
                          </td>
                        );
                      })}
                      <td className="ts-grid__total-cell">{formatHours(detail.totalHours)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {editing && (
              <div className="ts-grid-container history-modal__grid" style={{ margin: 0 }}>
                <table className="ts-grid">
                  <thead>
                    <tr>
                      {GRID_HOURS.map(h => (
                        <th key={h}>{h}{h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} Hour</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {GRID_HOURS.map((h, idx) => {
                        const slot = draftEntries[idx] || { description: '', type: 'Work' };
                        return (
                          <td key={h}>
                            <input
                              className="ts-grid__input"
                              value={slot.description}
                              onChange={(e) => updateDraft(idx, e.target.value)}
                              placeholder={isTypedEntry(slot.type) ? slot.type : '-'}
                            />
                          </td>
                        );
                      })}
                      <td className="ts-grid__total-cell">{formatHours(draftTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
