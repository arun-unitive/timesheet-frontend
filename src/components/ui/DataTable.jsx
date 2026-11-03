import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableSkeleton } from './Loader';
import EmptyState from './EmptyState';

/**
 * Reusable data table.
 *
 * Sorting is server-driven: the table only reports which column was clicked
 * via `onSort`, and the page feeds `sortBy` / `order` back in. This keeps a
 * single source of truth and works with server-side pagination.
 */
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  empty,
  sortBy,
  order,
  onSort,
  rowKey = (row) => row.id || row._id,
  onRowClick,
}) {
  if (loading) {
    return <TableSkeleton cols={columns.length} />;
  }

  if (!rows.length) {
    return empty || <EmptyState />;
  }

  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const nextOrder = sortBy === col.key && order === 'desc' ? 'asc' : 'desc';
    onSort(col.key, nextOrder);
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  className={col.sortable ? 'is-sortable' : ''}
                  style={{ textAlign: col.align || 'left', width: col.width }}
                  onClick={() => handleSort(col)}
                  aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {col.sortable ? (
                    <span className={`table__sort ${active ? 'is-active' : ''}`}>
                      {col.header}
                      {active ? (
                        order === 'asc' ? (
                          <ArrowUp size={13} />
                        ) : (
                          <ArrowDown size={13} />
                        )
                      ) : (
                        <ChevronsUpDown size={13} />
                      )}
                    </span>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || 'left' }} className={col.strong ? 'cell-strong' : ''}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
