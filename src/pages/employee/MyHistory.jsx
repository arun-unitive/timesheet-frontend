import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  Pencil,
  Timer,
  TrendingUp,
} from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import DataTable from '../../components/ui/DataTable';
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
  formatHoursShort,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
  weekdayName,
} from '../../lib/format';
import { expandEntries, groupSlots, isTypedEntry } from '../../lib/timesheet';

const toDraftRow = (sheet) => {
  const cells = Array(8).fill('');
  if (sheet?.entries) {
    sheet.entries.forEach((entry, idx) => {
      if (idx < 8) cells[idx] = entry.description || entry.project || '';
    });
  }
  return cells;
};

/** Shared prev / next chevrons + period label used by the weekly and monthly tabs. */
function PeriodNav({ label, onPrev, onNext, nextDisabled }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={onPrev} aria-label="Previous period" />
      <span className="fw-semibold" style={{ minWidth: 200, textAlign: 'center' }}>
        {label}
      </span>
      <Button
        variant="secondary"
        size="sm"
        icon={ChevronRight}
        onClick={onNext}
        disabled={nextDisabled}
        aria-label="Next period"
      />
    </div>
  );
}

/** Read-only day breakdown table shared by the weekly and monthly tabs. */
function DayBreakdown({ title, subtitle, rows, loading, showWeekday }) {
  const columns = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        strong: true,
        render: (row) => (showWeekday ? `${weekdayName(row.date)} · ${formatDateCompact(row.date)}` : formatDateCompact(row.date)),
      },
      {
        key: 'hours',
        header: 'Hours',
        align: 'right',
        render: (row) => formatHoursShort(row.hours),
      },
    ],
    [showWeekday]
  );

  return (
    <Card title={title} subtitle={subtitle} flush>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(row) => row.date}
        empty={
          <EmptyState
            icon={History}
            title="No activity in this period"
            message="There are no timesheet entries for the selected period."
          />
        }
      />
    </Card>
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
    setDraftEntries(toDraftRow(detail));
    setEditing(true);
  };

  const updateDraft = (index, value) => {
    setDraftEntries((prev) => prev.map((cell, i) => (i === index ? value : cell)));
  };

  const saveDraft = () => {
    const cleaned = draftEntries
      .map((val) => ({
        project: val.trim() || 'General',
        description: val.trim(),
        hours: 1,
      }))
      .filter((row) => row.description);

    if (!cleaned.length) {
      toast.error('Nothing to save', 'Enter at least one task description.');
      return;
    }
    editMutation.mutate({ id: detail._id, entries: cleaned });
  };

  const draftTotal = draftEntries.filter(c => c.trim()).length;

  // ------------------------------ Daily table -----------------------------
  const dailyColumns = useMemo(
    () => [
      { key: 'date', header: 'Date', sortable: true, strong: true, render: (row) => formatDateCompact(row.date) },
      { key: 'entries', header: 'Entries', render: (row) => row.entries?.length || 0 },
      {
        key: 'totalHours',
        header: 'Total hours',
        sortable: true,
        align: 'right',
        render: (row) => formatHoursShort(row.totalHours),
      },
      {
        key: 'action',
        header: '',
        align: 'right',
        render: (row) => (
          <div className="table-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => {
                setDetail(row);
                setEditing(false);
              }}
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const handleSort = (field, nextOrder) => {
    setSortBy(field);
    setOrder(nextOrder);
    setPage(1);
  };

  const dailyRows = dailyQuery.data?.items || [];
  const dailyMeta = dailyQuery.data?.meta;

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
      <PageHead title="My History" subtitle="Review your logged hours by day, week or month." />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />

      {tab === 'daily' && (
        <Card flush>
          <div className="toolbar">
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
            <div className="toolbar__spacer" />
            <span className="text-sm text-muted">{dailyMeta?.total ?? 0} days</span>
          </div>

          <DataTable
            columns={dailyColumns}
            rows={dailyRows}
            loading={dailyQuery.isLoading}
            sortBy={sortBy}
            order={order}
            onSort={handleSort}
            empty={
              <EmptyState
                icon={History}
                title="No timesheets found"
                message="Try changing the filters, or log time from My Timesheet."
              />
            }
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
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PeriodNav
              label={`${formatDate(weekStart)} – ${formatDate(weekEnd)}`}
              onPrev={() => setWeekOf(addDaysISO(weekStart, -7))}
              onNext={() => setWeekOf(addDaysISO(weekStart, 7))}
              nextDisabled={weekEnd >= today}
            />
          </div>

          <div className="stat-grid">
            <StatCard label="Total hours" value={formatHours(weekSummary?.totalHours)} icon={Timer} tone="primary" loading={weekQuery.isLoading} />
            <StatCard label="Working days" value={weekSummary?.workingDays ?? 0} icon={CalendarDays} tone="info" loading={weekQuery.isLoading} />
            <StatCard label="Average per day" value={formatHours(averagePerDay(weekSummary))} icon={TrendingUp} tone="success" loading={weekQuery.isLoading} />
          </div>

          <Card title="Hours by day" subtitle="Selected week">
            {weekQuery.isLoading ? <CardSkeleton height={260} /> : <HoursBarChart data={weekChart} />}
          </Card>

          <DayBreakdown title="Day-by-day" subtitle="Selected week" rows={weekRows} loading={weekQuery.isLoading} showWeekday />
        </>
      )}

      {tab === 'monthly' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PeriodNav
              label={`${formatDate(monthStart)} – ${formatDate(monthEnd)}`}
              onPrev={() => setMonthOf(startOfMonthISO(addDaysISO(monthStart, -1)))}
              onNext={() => setMonthOf(startOfMonthISO(addDaysISO(monthEnd, 1)))}
              nextDisabled={monthEnd >= today}
            />
          </div>

          <div className="stat-grid">
            <StatCard label="Total hours" value={formatHours(monthSummary?.totalHours)} icon={Timer} tone="primary" loading={monthQuery.isLoading} />
            <StatCard label="Working days" value={monthSummary?.workingDays ?? 0} icon={CalendarDays} tone="info" loading={monthQuery.isLoading} />
            <StatCard label="Average per day" value={formatHours(averagePerDay(monthSummary))} icon={TrendingUp} tone="success" loading={monthQuery.isLoading} />
          </div>

          <Card title="Hours by day" subtitle="Selected month">
            {monthQuery.isLoading ? <CardSkeleton height={260} /> : <HoursBarChart data={monthChart} />}
          </Card>

          <DayBreakdown title="Day-by-day" subtitle="Selected month" rows={monthRows} loading={monthQuery.isLoading} />
        </>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => {
          setDetail(null);
          setEditing(false);
        }}
        size="lg"
        title={detail ? formatDate(detail.date) : ''}
        subtitle={detail ? `${detail.entries?.length || 0} entries · ${formatHours(detail.totalHours)}` : undefined}
        footer={detail ? modalFooter : undefined}
      >
        {detail && !editing && (
          <div className="ts-grid-container" style={{ margin: 0 }}>
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

        {detail && editing && (
          <div className="flex flex-col gap-4">
            <div className="ts-grid-container" style={{ margin: 0 }}>
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
                    {GRID_HOURS.map((h, idx) => (
                      <td key={h}>
                        <input
                          className="ts-grid__input"
                          value={draftEntries[idx]}
                          onChange={(e) => updateDraft(idx, e.target.value)}
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="ts-grid__total-cell">{formatHours(draftTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
