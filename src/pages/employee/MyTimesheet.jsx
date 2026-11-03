import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Button from '../../components/ui/Button';
import TimesheetEditor from '../../components/timesheet/TimesheetEditor';
import { timesheetApi } from '../../api/timesheets';
import { leaveApi } from '../../api/leaves';
import { qk } from '../../api/queryKeys';
import { 
  addDaysISO, 
  formatDateCompact, 
  startOfWeekISO, 
  endOfWeekISO, 
  eachDayISO,
  todayISO 
} from '../../lib/format';

/** 
 * Excel-like grid view showing one week of timesheet entries.
 */
export default function MyTimesheet() {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(today));
  
  const weekEnd = useMemo(() => endOfWeekISO(weekStart), [weekStart]);
  const dates = useMemo(() => eachDayISO(weekStart, weekEnd), [weekStart, weekEnd]);

  // Fetch all timesheets for the current week
  const sheetsQuery = useQuery({
    queryKey: ['timesheets', 'range', weekStart, weekEnd],
    queryFn: async () => {
      const res = await timesheetApi.list({ from: weekStart, to: weekEnd, limit: 100 });
      return res.data || [];
    },
    staleTime: 60_000,
  });

  // Fetch all leaves for the current week (holidays + personal leaves)
  const leavesQuery = useQuery({
    queryKey: qk.leaves({ from: weekStart, to: weekEnd }),
    queryFn: async () => (await leaveApi.list({ from: weekStart, to: weekEnd, limit: 100 })).data,
    staleTime: 5 * 60 * 1000,
  });

  const handlePrevWeek = () => setWeekStart(prev => addDaysISO(prev, -7));
  const handleNextWeek = () => setWeekStart(prev => addDaysISO(prev, 7));
  const handleToday = () => setWeekStart(startOfWeekISO(today));

  return (
    <div className="page">
      <PageHead
        title="My Timesheet"
        subtitle="Manage your daily tasks in a professional grid. The daily target is 8 hours."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              onClick={handlePrevWeek}
              aria-label="Previous week"
            />
            <div className="flex items-center gap-2 px-3 py-1 bg-surface border border-strong rounded-md min-w-[200px] justify-center">
              <Calendar size={14} className="text-muted" />
              <span className="fw-semibold text-sm">
                {formatDateCompact(weekStart)} – {formatDateCompact(weekEnd)}
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleToday} disabled={weekStart === startOfWeekISO(today)}>
              Current Week
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronRight}
              onClick={handleNextWeek}
              disabled={weekStart >= startOfWeekISO(today)}
              aria-label="Next week"
            />
          </div>
        }
      />

      <TimesheetEditor
        dates={dates}
        sheets={sheetsQuery.data || []}
        leaves={leavesQuery.data || []}
        onSaved={() => sheetsQuery.refetch()}
      />
      
      <div className="mt-8 flex flex-col gap-2 p-4 bg-inset rounded-lg border border-strong">
        <h4 className="fw-bold text-sm text-primary uppercase letter-spacing-wide">Quick Guide</h4>
        <ul className="text-xs text-secondary flex flex-col gap-1 list-disc ml-4">
          <li>Each row represents a single date.</li>
          <li>Enter your task details in the 8 hour columns (Hour 1 to Hour 8).</li>
          <li>Select one or more hour cells and click the edit button to update them together as a single entry.</li>
          <li>Select the hour cells of a task and click the delete button to remove it, then save the row.</li>
          <li>Each non-empty cell counts as 1 hour towards your 8-hour daily target.</li>
          <li>Mark an entry as Permission or Leave when needed — these slots are highlighted and need no description.</li>
          <li>Leave days are highlighted with an indicator, but you can still update your tasks if needed.</li>
          <li>Click the 'Save' button in each row to persist your changes.</li>
          <li>Press Ctrl + S (⌘ + S on Mac) to save every row with unsaved changes at once.</li>
        </ul>
      </div>
    </div>
  );
}
