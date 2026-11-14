import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import Tabs from '../ui/Tabs';
import { Textarea, Select } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
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

const formatOrdinal = (h) => `${h}${h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th'}`;

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
  selectedIndices,
  onSelectIndices
}) {
  const [cells, setCells] = useState(() => Array.from({ length: SLOT_COUNT }, makeEmptySlot));
  const [showEditModal, setShowEditModal] = useState(false);
  const [warningHours, setWarningHours] = useState([]);
  const [editMode, setEditMode] = useState('description');
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState('Permission');
  const selectionSnapshotRef = useRef([]);
  const lastSavedSigRef = useRef(null);

  const persistedSlots = useMemo(() => expandEntries(sheet?.entries, SLOT_COUNT), [sheet?.entries]);
  const persistedSignature = useMemo(() => slotSignature(persistedSlots), [persistedSlots]);

  // Re-seed the grid only when the saved content actually changes, so a refetch
  // triggered elsewhere never wipes edits the user has not saved yet.
  useEffect(() => {
    if (lastSavedSigRef.current === persistedSignature) {
      return;
    }
    setCells(expandEntries(sheet?.entries, SLOT_COUNT));
    onSelectIndices([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedSignature]);

  // Every filled slot counts as one working hour, including Permission / Leave.
  const totalHours = cells.filter(isFilledSlot).length;
  const isFuture = date > new Date().toISOString().split('T')[0];
  const locked = isFuture;

  // Group every run of slots that belong to the same entry into one shared column.
  const groupedCells = useMemo(() => groupSlots(cells), [cells]);

  const getMissingPreviousHours = (candidateIndices) => {
    if (candidateIndices.length === 0) return [];
    const maxIdx = Math.max(...candidateIndices);
    const missing = [];
    for (let i = 0; i < maxIdx; i += 1) {
      if (!isFilledSlot(cells[i]) && !candidateIndices.includes(i)) {
        missing.push(GRID_HOURS[i]);
      }
    }
    return missing;
  };

  const handleCellMouseDown = (e) => {
    if (e.detail === 1) {
      selectionSnapshotRef.current = selectedIndices;
    }
  };

  const toggleGroupSelection = (indices) => {
    if (locked || isSaving) return;
    const allSelected = indices.every(idx => selectedIndices.includes(idx));
    if (allSelected) {
      onSelectIndices(selectedIndices.filter(idx => !indices.includes(idx)));
      return;
    }

    const nextIndices = [...new Set([...selectedIndices, ...indices])];
    const missing = getMissingPreviousHours(nextIndices);
    if (missing.length > 0) {
      setWarningHours(missing);
      return;
    }

    onSelectIndices(nextIndices);
  };

  const openEditFor = (indices) => {
    if (indices.length === 0) return;
    // Seed the form with the values of the first selected slot.
    const firstFilledIdx = indices.find(idx => isFilledSlot(cells[idx])) ?? indices[0];
    const firstSelected = cells[firstFilledIdx];
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

  const handleOpenEdit = () => {
    const missing = getMissingPreviousHours(selectedIndices);
    if (missing.length > 0) {
      setWarningHours(missing);
      return;
    }
    openEditFor(selectedIndices);
  };

  // Double-clicking a slot selects that entry and opens the edit popup.
  const handleGroupDoubleClick = (indices) => {
    if (locked || isSaving) return;
    const beforeDoubleClick = selectionSnapshotRef.current;
    const targetIndices =
      beforeDoubleClick.length > 0
        ? [...new Set([...beforeDoubleClick, ...indices])]
        : indices;

    const missing = getMissingPreviousHours(targetIndices);
    if (missing.length > 0) {
      setWarningHours(missing);
      return;
    }

    onSelectIndices(targetIndices);
    openEditFor(targetIndices);
  };

  const triggerAutoSave = (nextCells) => {
    // One entry per run of consecutive slots that share an entryId.
    const entries = [];
    for (let i = 0; i < nextCells.length; ) {
      const cell = nextCells[i];
      if (!cell.entryId || !isFilledSlot(cell)) {
        i += 1;
        continue;
      }

      let hours = 1;
      while (i + 1 < nextCells.length && nextCells[i + 1].entryId === cell.entryId) {
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

    lastSavedSigRef.current = slotSignature(expandEntries(entries, SLOT_COUNT));
    onSave(date, entries, sheet?._id);
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
    onSelectIndices([]);
    triggerAutoSave(next);
  };

  // Clearing the selected slots removes the task; saving then persists the day.
  const handleDeleteSelected = () => {
    if (selectedIndices.length === 0) return;
    const next = cells.map((cell, idx) =>
      selectedIndices.includes(idx) ? makeEmptySlot() : { ...cell }
    );
    setCells(next);
    onSelectIndices([]);
    triggerAutoSave(next);
  };

  return (
    <>
      <tr className={`ts-grid__row ${leave ? 'ts-grid__row--leave' : ''}`}>
        <td className="ts-grid__date-cell">
          <div className="ts-grid__date-info">
            <div className="flex items-center justify-between gap-1">
              <span className="ts-grid__date-text">{formatDateCompact(date)}</span>
              {!locked && selectedIndices.length > 0 && (
                <div className="flex items-center gap-0.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="!p-1 !h-6 !w-6"
                    icon={Edit3}
                    onClick={handleOpenEdit}
                    disabled={isSaving}
                    title="Edit selected cells"
                  />
                  <Button 
                    variant="danger" 
                    size="sm" 
                    className="!p-1 !h-6 !w-6"
                    icon={Trash2}
                    onClick={handleDeleteSelected}
                    loading={isSaving}
                    title="Delete selected task"
                  />
                </div>
              )}
            </div>
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
                onMouseDown={handleCellMouseDown}
                onClick={() => toggleGroupSelection(group.indices)}
                onDoubleClick={() => handleGroupDoubleClick(group.indices)}
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
      </tr>

      <Modal
        open={warningHours.length > 0}
        onClose={() => setWarningHours([])}
        title="Previous Hours Required"
        subtitle={formatDateCompact(date)}
        footer={
          <Button variant="primary" onClick={() => setWarningHours([])}>
            OK, Got It
          </Button>
        }
      >
        <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            Please fill the previous hour(s) (<strong>{warningHours.map(formatOrdinal).join(', ')} Hour</strong>) before updating this column.
          </span>
        </div>
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editMode === 'typed' ? `Mark as ${editType}` : 'Update Task Description'}
        subtitle={`Applying to ${selectedIndices.length} hour slot(s) for ${formatDateCompact(date)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApplyEdit} loading={isSaving}>Apply Change</Button>
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
  const [savingDate, setSavingDate] = useState(null);
  const [selection, setSelection] = useState({ date: null, indices: [] });

  const handleSelectIndices = useCallback((rowDate, indices) => {
    setSelection((prev) => {
      if (indices.length === 0) {
        return prev.date === rowDate ? { date: null, indices: [] } : prev;
      }
      return { date: rowDate, indices };
    });
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
                selectedIndices={selection.date === date ? selection.indices : []}
                onSelectIndices={(indices) => handleSelectIndices(date, indices)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}