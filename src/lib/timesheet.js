/**
 * Timesheet slot helpers.
 *
 * A day has one slot per hour. Every slot remembers which entry it belongs to
 * (`entryId`) so slots that were saved together are rendered in one shared column,
 * and so Permission / Leave markers always have a type even without a description.
 */
import { GRID_HOURS } from './constants';

/** Entry types a timesheet slot can hold. */
export const ENTRY_TYPES = ['Work', 'Permission', 'Leave'];

/** Permission / Leave slots are identified by type alone and carry no description. */
export const isTypedEntry = (type) => type === 'Permission' || type === 'Leave';

export const normalizeEntryType = (type) => (ENTRY_TYPES.includes(type) ? type : 'Work');

export const makeEmptySlot = () => ({ entryId: null, description: '', type: 'Work' });

export const isFilledSlot = (slot) => Boolean(slot.description.trim()) || isTypedEntry(slot.type);

/** Expand saved entries into one slot per hour, preserving entry identity. */
export const expandEntries = (entries = [], slotCount = GRID_HOURS.length) => {
  const slots = Array.from({ length: slotCount }, makeEmptySlot);
  let cursor = 0;
  entries.forEach((entry, index) => {
    const hours = Math.max(1, Math.round(entry.hours || 1));
    const entryId = entry._id || entry.id || `entry-${index}`;
    const type = normalizeEntryType(entry.type);
    const description = (entry.project && entry.project !== 'General')
      ? `${entry.project}: ${entry.description || ''}`.trim()
      : (entry.description || entry.project || '');
    for (let i = 0; i < hours && cursor < slotCount; i += 1) {
      slots[cursor] = { entryId, description, type };
      cursor += 1;
    }
  });
  return slots;
};

/** Collapse slots into contiguous groups sharing an entryId, ready for `colSpan`. */
export const groupSlots = (slots) => {
  const groups = [];
  for (let i = 0; i < slots.length; ) {
    const slot = slots[i];

    if (!slot.entryId) {
      groups.push({
        startIndex: i,
        colSpan: 1,
        entryId: null,
        indices: [i],
        description: '',
        type: 'Work',
        filled: false,
      });
      i += 1;
      continue;
    }

    let colSpan = 1;
    while (i + colSpan < slots.length && slots[i + colSpan].entryId === slot.entryId) {
      colSpan += 1;
    }

    const indices = [];
    for (let k = 0; k < colSpan; k += 1) indices.push(i + k);

    groups.push({
      startIndex: i,
      colSpan,
      entryId: slot.entryId,
      indices,
      description: slot.description.trim(),
      type: slot.type,
      filled: isFilledSlot(slot),
    });
    i += colSpan;
  }
  return groups;
};
