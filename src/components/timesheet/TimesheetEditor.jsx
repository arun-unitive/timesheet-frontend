import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Info, Edit3, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import Tabs from '../ui/Tabs';
import { Textarea, Select } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useUnsavedChanges } from '../../context/UnsavedChangesContext';
import { timesheetApi } from '../../api/timesheets';
import { qk } from '../../api/queryKeys';
import { GRID_HOURS } from '../../lib/constants';
import {
  expandEntries,
  groupSlots,
  isFilledSlot,
  isTypedEntry,
  makeEmptySlot,
} from '../../lib/timesheet';
import { formatHours, formatDateCompact, weekdayName } from '../../lib/format';

const SLOT_COUNT = GRID_HOURS.length;

const EDIT_MODES = [
  { value: 'description', label: 'Task Description' },
  { value: 'typed', label: 'Permission / Leave' },
];

/**
 * Visible content of the hour slots, ignoring entry identity.
 * Comparing this against the saved slots tells us if a row has unsaved edits.
 */
const slotSignature = (slots) =>
  slots.map((slot) => (isFilledSlot(slot) ? `${slot.type}:${slot.description.trim()}` : '')).join('|');

/**
 * Excel-like grid row for a single date.
 */
function TimesheetRow({ 
  date, 
  sheet, 
  leave, 
  onSave, 
  isSaving,
  onDirtyChange,
  registerSaver
}) {
  const [cells, setCells] = useState(() => Array.from({ length: SLOT_COUNT }, makeEmptySlot));
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState('description');
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState('Permission');

  const persistedSlots = useMemo(() => expandEntries(sheet?.entries, SLOT_COUNT), [sheet?.entries]);
  const persistedSignature = useMemo(() => slotSignature(persistedSlots), [persistedSlots]);

  // Re-seed the grid only when the saved content actually changes, so a refetch
  // triggered elsewhere never wipes edits the user has not saved yet.
  useEffect(() => {
    setCells(expandEntries(sheet?.entries, SLOT_COUNT));
    setSelectedIndices([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedSignature]);

  const isDirty = useMemo(() => slotSignature(cells) !== persistedSignature, [cells, persistedSignature]);

  // Let the parent editor know this row has pending changes.
  useEffect(() => {
    onDirtyChange?.(date, isDirty);
  }, [date, isDirty, onDirtyChange]);

  // Working hours exclude Permission / Leave slots, which are tracked but not counted.
  const totalHours = cells.filter((cell) => isFilledSlot(cell) && !isTypedEntry(cell.type)).length;
  const isFuture = date > new Date().toISOString().split('T')[0];
  const locked = isFuture;

  // Group every run of slots that belong to the same entry into one shared column.
  const groupedCells = useMemo(() => groupSlots(cells), [cells]);

  const toggleGroupSelection = (indices) => {
    if (locked) return;
    const allSelected = indices.every(idx => selectedIndices.includes(idx));
    if (allSelected) {
      setSelectedIndices(prev => prev.filter(idx => !indices.includes(idx)));
    } else {
      setSelectedIndices(prev => [...new Set([...prev, ...indices])]);
    }
  };

  const handleOpenEdit = () => {
    if (selectedIndices.length === 0) return;
    // Seed the form with the values of the first selected slot.
    const firstSelected = cells[selectedIndices[0]];
    setEditValue(firstSelected.description || '');
    if (isTypedEntry(firstSelected.type)) {
      setEditMode('typed');
      setEditType(firstSelected.type);
    } else {
      setEditMode('description');
      setEditType('Permission');
    }
    setShowEditModal(true);
  };

  const handleApplyEdit = () => {
    // Everything selected becomes a single entry, so it renders in one column.
    const sharedEntryId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const typed = editMode === 'typed';
    const description = typed ? '' : editValue.trim();
    const type = typed ? editType : 'Work';

    const next = cells.map((cell) => ({ ...cell }));
    selectedIndices.forEach((idx) => {
      next[idx] = { entryId: sharedEntryId, description, type };
    });
    setCells(next);
    setShowEditModal(false);
    setSelectedIndices([]);
  };

  // Clearing the selected slots removes the task; saving then persists the day.
  const handleDeleteSelected = () => {
    if (selectedIndices.length === 0) return;
    const next = cells.map((cell, idx) =>
      selectedIndices.includes(idx) ? makeEmptySlot() : { ...cell }
    );
    setCells(next);
    setSelectedIndices([]);
  };

  const onLocalSave = () => {
    // One entry per run of consecutive slots that share an entryId.
    const entries = [];
    for (let i = 0; i < cells.length; ) {
      const cell = cells[i];
      if (!cell.entryId || !isFilledSlot(cell)) {
        i += 1;
        continue;
      }

      let hours = 1;
      while (i + 1 < cells.length && cells[i + 1].entryId === cell.entryId) {
        hours += 1;
        i += 1;
      }

      entries.push({
        project: 'General',
        description: cell.description.trim(),
        type: cell.type,
        hours,
      });
      i += 1;
    }

    onSave(date, entries, sheet?._id);
  };

  // Expose this row's save handler so the editor can bind Ctrl/Cmd + S.
  useEffect(() => {
    registerSaver?.(date, onLocalSave);
    return () => registerSaver?.(date, null);
  });

  return (
    <>
      <tr className={`ts-grid__row ${leave ? 'ts-grid__row--leave' : ''}`}>
        <td className="ts-grid__date-cell">
          <div className="ts-grid__date-info">
            <span className="ts-grid__date-text">{formatDateCompact(date)}</span>
            <span className="ts-grid__day-text">{weekdayName(date)}</span>
            {leave && (
              <div className="ts-grid__leave-indicator">
                <span className="text-xs fw-medium text-primary">
                  {leave.leaveType === 'holiday' ? 'Holiday' : 'Leave'}
                </span>
              </div>
            )}
          </div>
        </td>
        {groupedCells.map((group) => {
          const isSelected = group.indices.some(idx => selectedIndices.includes(idx));
          const typed = isTypedEntry(group.type);

          return (
            <td key={group.startIndex} colSpan={group.colSpan}>
              <div
                className={`ts-grid__cell-content ${isSelected ? 'selected' : ''} ${locked ? 'disabled' : ''} ts-grid__cell-content--${group.type.toLowerCase()}`}
                onClick={() => toggleGroupSelection(group.indices)}
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
                ) : '-'}
              </div>
            </td>
          );
        })}
        <td className="ts-grid__total-cell">
          {formatHours(totalHours)}
        </td>
        <td className="ts-grid__action-cell">
          <div className="flex gap-1 justify-center">
            {!locked && (
              <>
                {selectedIndices.length > 0 && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={Edit3}
                      onClick={handleOpenEdit}
                      title="Edit selected cells"
                    />
                    <Button 
                      variant="danger" 
                      size="sm" 
                      icon={Trash2}
                      onClick={handleDeleteSelected}
                      title="Delete selected task"
                    />
                  </>
                )}
                <Button 
                  variant={sheet ? "ghost" : "primary"} 
                  size="sm" 
                  icon={Save} 
                  onClick={onLocalSave}
                  loading={isSaving}
                  title="Save row"
                >
                  {!sheet && "Save"}
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editMode === 'typed' ? `Mark as ${editType}` : 'Update Task Description'}
        subtitle={`Applying to ${selectedIndices.length} hour slot(s) for ${formatDateCompact(date)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApplyEdit}>Apply Change</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Tabs value={editMode} onChange={setEditMode} options={EDIT_MODES} />

          {editMode === 'description' ? (
            <Field label="Task Description" hint="This description will be applied to all selected hours.">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Describe what you worked on during these hours..."
                rows={5}
                autoFocus
              />
            </Field>
          ) : (
            <>
              <Field label="Entry Type" hint="Mark these hours as Permission or Leave. No description is needed.">
                <Select 
                  value={editType} 
                  onChange={(e) => setEditType(e.target.value)}
                >
                  <option value="Permission">Permission</option>
                  <option value="Leave">Leave</option>
                </Select>
              </Field>
              <div className={`ts-entry-note ts-entry-note--${editType.toLowerCase()}`}>
                <Info size={16} />
                <span>
                  The selected hour slot(s) will be shown as {editType} in the timesheet instead of a task description.
                </span>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

export default function TimesheetEditor({
  dates,
  sheets = [],
  leaves = [],
  onSaved
}) {
  const queryClient = useQueryClient();
  const { setDirty } = useUnsavedChanges();
  const [savingDate, setSavingDate] = useState(null);
  const dirtyDatesRef = useRef(new Set());
  const rowSaversRef = useRef(new Map());

  // Any row with pending edits keeps the page "dirty" for the navigation guard.
  const handleRowDirty = useCallback(
    (date, isDirty) => {
      const dirtyDates = dirtyDatesRef.current;
      if (isDirty) dirtyDates.add(date);
      else dirtyDates.delete(date);
      setDirty(dirtyDates.size > 0);
    },
    [setDirty]
  );

  // Never leave the global flag set behind once the grid is gone.
  useEffect(() => () => setDirty(false), [setDirty]);

  // Rows publish their save handler here so the shortcut can reach them.
  const registerRowSaver = useCallback((date, saver) => {
    if (saver) rowSaversRef.current.set(date, saver);
    else rowSaversRef.current.delete(date);
  }, []);

  // Ctrl/Cmd + S saves every row that has pending changes.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        dirtyDatesRef.current.forEach((date) => rowSaversRef.current.get(date)?.());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveMutation = useMutation({
    // An empty entry list means every task for the day was deleted,
    // so we drop the record instead of sending an invalid empty payload.
    mutationFn: async ({ entries, date, sheetId }) => {
      if (!entries.length) {
        if (!sheetId) return { data: null };
        return timesheetApi.remove(sheetId);
      }
      return timesheetApi.saveDay({ date, entries });
    },
    onSuccess: (res) => {
      setSavingDate(null);
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: qk.employeeDashboard });
      onSaved?.(res?.data ?? null);
    },
    onError: () => setSavingDate(null)
  });

  const handleRowSave = (date, entries, sheetId) => {
    setSavingDate(date);
    saveMutation.mutate({ date, entries, sheetId });
  };

  return (
    <div className="ts-grid-container">
      <table className="ts-grid">
        <thead>
          <tr>
            <th>Date</th>
            {GRID_HOURS.map(h => (
              <th key={h}>{h}{h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'} Hour</th>
            ))}
            <th>Total</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {dates.map(date => {
            const sheet = sheets.find(s => s.date === date);
            const leave = leaves.find(l => date >= l.startDate && date <= l.endDate);
            return (
              <TimesheetRow
                key={date}
                date={date}
                sheet={sheet}
                leave={leave}
                onSave={handleRowSave}
                isSaving={savingDate === date}
                onDirtyChange={handleRowDirty}
                registerSaver={registerRowSaver}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
