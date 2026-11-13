import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CalendarDays, Save, FilterX } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import Badge, { LeaveTypeBadge } from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { leaveApi } from '../../api/leaves';
import { employeeApi } from '../../api/employees';
import { qk } from '../../api/queryKeys';
import { useToast } from '../../context/ToastContext';
import { formatDate, eachDayISO } from '../../lib/format';
import { LEAVE_TYPES, LEAVE_TYPE_META, PAGE_SIZE_OPTIONS } from '../../lib/constants';

const EMPTY_LEAVE_FORM = {
  scope: 'common',
  leaveType: 'holiday',
  title: '',
  description: '',
  reason: '',
  employee: '',
  startDate: '',
  endDate: '',
};

const SCOPE_TABS = [
  { value: 'common', label: 'Common holiday' },
  { value: 'individual', label: 'Individual employee' },
];

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'common', label: 'Common Holidays' },
  { value: 'individual', label: 'Individual' },
];

/** Inclusive day count for a leave period (0 when invalid). */
const countDays = (start, end) => (start && end && end >= start ? eachDayISO(start, end).length : 0);

/** Leave management: common holidays plus individual employee leaves. */
export default function AdminLeaves() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [params, setParams] = useState({
    scope: '',
    leaveType: '',
    employee: '',
    from: '',
    to: '',
    page: 1,
    limit: 10,
    sortBy: 'startDate',
    order: 'desc',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Any filter change resets to page 1; explicit page changes are respected.
  const setParam = (patch) => setParams((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const hasFilters = Boolean(params.scope || params.leaveType || params.employee || params.from || params.to);
  const clearFilters = () => setParam({ scope: '', leaveType: '', employee: '', from: '', to: '' });

  const { data: employees = [] } = useQuery({
    queryKey: qk.employeeOptions,
    queryFn: async () => (await employeeApi.options()).data,
    staleTime: 5 * 60 * 1000,
  });

  const queryParams = {
    ...params,
    scope: params.scope || undefined,
    leaveType: params.leaveType || undefined,
    employee: params.employee || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: qk.leaves(queryParams),
    queryFn: async () => {
      const res = await leaveApi.list(queryParams);
      return { items: res.data, meta: res.meta };
    },
    staleTime: 60_000,
  });

  const rows = data?.items || [];
  const meta = data?.meta || { page: 1, limit: params.limit, total: 0, totalPages: 1 };

  const invalidateLeaves = () => {
    queryClient.invalidateQueries({ queryKey: ['leaves'] });
    queryClient.invalidateQueries({ queryKey: qk.leavesUpcoming });
    queryClient.invalidateQueries({ queryKey: qk.leavesMine });
    queryClient.invalidateQueries({ queryKey: qk.employeeDashboard });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => leaveApi.remove(id),
    onSuccess: () => {
      toast.success('Leave deleted', 'The leave entry has been removed.');
      invalidateLeaves();
      setConfirm(null);
    },
    onError: (err) => toast.error('Could not delete leave', err.message),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((leave) => {
    setEditing(leave);
    setFormOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span className="fw-medium">{row.title}</span>
            <LeaveTypeBadge type={row.leaveType} />
          </div>
        ),
      },
      {
        key: 'scope',
        header: 'Scope',
        render: (row) => (
          <Badge tone={row.scope === 'common' ? 'primary' : 'info'}>
            {row.scope === 'common' ? 'Common' : 'Individual'}
          </Badge>
        ),
      },
      {
        key: 'employee',
        header: 'Employee',
        render: (row) =>
          row.employee ? (
            <div className="flex items-center gap-3">
              <Avatar name={row.employee.name} size="sm" />
              <span className="truncate">{row.employee.name}</span>
            </div>
          ) : (
            <span className="text-muted">All employees</span>
          ),
      },
      {
        key: 'startDate',
        header: 'Period',
        sortable: true,
        render: (row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
      },
      {
        key: 'days',
        header: 'Days',
        align: 'center',
        render: (row) => <span className="tabular">{row.days ?? countDays(row.startDate, row.endDate)}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (row) => (
          <div className="table-actions">
            <Button
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={() => openEdit(row)}
              aria-label={`Edit ${row.title}`}
            />
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              onClick={() => setConfirm(row)}
              aria-label={`Delete ${row.title}`}
            />
          </div>
        ),
      },
    ],
    [openEdit]
  );

  return (
    <div className="page">
      <PageHead title="Leave Management" subtitle="Publish common holidays and record individual employee leaves." />

      <Tabs value={params.scope} onChange={(scope) => setParam({ scope })} options={FILTER_TABS} />

      <Card flush>
  <div
    className="toolbar"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      padding: "16px",
      flexWrap: "nowrap",
      overflowX: "auto",
    }}
  >
    {/* Left side: All Filters with 10px gap between each */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
      <Select
        value={params.leaveType}
        onChange={(e) => setParam({ leaveType: e.target.value })}
        style={{ width: 160 }}
        aria-label="Filter by leave type"
      >
        <option value="">All leave types</option>
        {LEAVE_TYPES.map((type) => (
          <option key={type} value={type}>
            {LEAVE_TYPE_META[type]?.label || type}
          </option>
        ))}
      </Select>

      <Select
        value={params.employee}
        onChange={(e) => setParam({ employee: e.target.value })}
        style={{ minWidth: 100 }}
        aria-label="Filter by employee"
      >
        <option value="">All employees</option>
        {employees.map((emp) => (
          <option key={emp._id} value={emp._id}>
            {emp.name}
          </option>
        ))}
      </Select>

      <Input
        type="date"
        value={params.from}
        onChange={(e) => setParam({ from: e.target.value })}
        style={{ width: 135 }}
        aria-label="From date"
      />

      <Input
        type="date"
        value={params.to}
        onChange={(e) => setParam({ to: e.target.value })}
        style={{ width: 135 }}
        aria-label="To date"
      />

      <Select
        value={params.limit}
        onChange={(e) => setParam({ limit: Number(e.target.value) })}
        style={{ width: 125 }}
        aria-label="Rows per page"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </Select>
    </div>

    {/* Right side: Action Buttons */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
      {hasFilters && (
        <Button variant="secondary" icon={FilterX} onClick={clearFilters}>
          {/* clear filter */}
        </Button>
      )}
      <Button variant="primary" icon={Plus} onClick={openCreate}>
        Add Leave
      </Button>
    </div>
  </div>

  <DataTable
    columns={columns}
    rows={rows}
    loading={isLoading}
    sortBy={params.sortBy}
    order={params.order}
    onSort={(sortBy, order) => setParam({ sortBy, order })}
    empty={
      <EmptyState
        icon={CalendarDays}
        title="No leaves found"
        message="Try adjusting the filters or add a new leave entry."
        action={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Add Leave
          </Button>
        }
      />
    }
  />

  <Pagination
    page={meta.page}
    totalPages={meta.totalPages}
    total={meta.total}
    limit={meta.limit}
    onPageChange={(page) => setParam({ page })}
  />
</Card>

      <LeaveFormModal open={formOpen} onClose={() => setFormOpen(false)} leave={editing} employees={employees} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm._id || confirm.id)}
        title="Delete leave"
        message={confirm ? `Remove "${confirm.title}" from the leave calendar? This cannot be undone.` : ''}
        confirmLabel="Delete"
        tone="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

/** Create / edit a leave. `leave = null` means create. */
function LeaveFormModal({ open, onClose, leave, employees }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(leave);

  const [form, setForm] = useState(EMPTY_LEAVE_FORM);
  const [errors, setErrors] = useState({});
  const seededRef = useRef(false);

  // Seed the form when the dialog opens. This is form initialisation, not fetching.
  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) return;
    seededRef.current = true;
    setErrors({});
    setForm(
      leave
        ? {
            scope: leave.scope || 'common',
            leaveType: leave.leaveType || 'holiday',
            title: leave.title || '',
            description: leave.description || '',
            reason: leave.reason || '',
            employee: leave.employee?._id || leave.employee || '',
            startDate: leave.startDate || '',
            endDate: leave.endDate || '',
          }
        : EMPTY_LEAVE_FORM
    );
  }, [open, leave]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? leaveApi.update(leave._id || leave.id, payload) : leaveApi.create(payload)),
    onSuccess: () => {
      toast.success(isEdit ? 'Leave updated' : 'Leave added', 'The leave calendar has been updated.');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: qk.leavesUpcoming });
      queryClient.invalidateQueries({ queryKey: qk.leavesMine });
      queryClient.invalidateQueries({ queryKey: qk.employeeDashboard });
      onClose();
    },
    onError: (err) => {
      setErrors(err.errors || {});
      toast.error(isEdit ? 'Could not update leave' : 'Could not add leave', err.message);
    },
  });

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const previewDays = countDays(form.startDate, form.endDate || form.startDate);


  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'A title is required';
    if (!form.leaveType) next.leaveType = 'Select a leave type';
    if (form.scope === 'individual' && !form.employee) next.employee = 'Select an employee';
    if (!form.startDate) next.startDate = 'Select a start date';
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      next.endDate = 'End date must be on or after the start date';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      scope: form.scope,
      leaveType: form.leaveType,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      reason: form.reason.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
    };
    if (form.scope === 'individual') payload.employee = form.employee;
    mutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit leave' : 'Add leave'}
      subtitle={isEdit ? 'Update the leave details below.' : 'Publish a holiday or record an employee leave.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="leave-form"
            variant="primary"
            icon={Save}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add leave'}
          </Button>
        </>
      }
    >
      <form id="leave-form" onSubmit={handleSubmit} noValidate className="form-grid">
        <div className="span-2">
          <Tabs value={form.scope} onChange={(scope) => setForm((prev) => ({ ...prev, scope }))} options={SCOPE_TABS} />
        </div>

        <Field className="span-2" label="Title" htmlFor="leave-title" required error={errors.title}>
          <Input
            id="leave-title"
            value={form.title}
            onChange={update('title')}
            error={Boolean(errors.title)}
            placeholder="e.g. Diwali holiday"
          />
        </Field>

        <Field label="Leave type" htmlFor="leave-type" required error={errors.leaveType}>
          <Select
            id="leave-type"
            value={form.leaveType}
            onChange={update('leaveType')}
            error={Boolean(errors.leaveType)}
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'comp-off' ? 'Comp-Off' : LEAVE_TYPE_META[type]?.label || type}
              </option>
            ))}
          </Select>
        </Field>

        {form.scope === 'individual' && (
          <Field label="Employee" htmlFor="leave-employee" required error={errors.employee}>
            <Select
              id="leave-employee"
              value={form.employee}
              onChange={update('employee')}
              error={Boolean(errors.employee)}
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Start date" htmlFor="leave-start" required error={errors.startDate}>
          <Input
            id="leave-start"
            type="date"
            value={form.startDate}
            onChange={update('startDate')}
            error={Boolean(errors.startDate)}
          />
        </Field>

        <Field
          label="End date"
          htmlFor="leave-end"
          error={errors.endDate}
          hint="Optional — leave blank for a single-day leave."
        >
          <Input
            id="leave-end"
            type="date"
            value={form.endDate}
            onChange={update('endDate')}
            error={Boolean(errors.endDate)}
          />
        </Field>

        <div className="span-2">
          <div className={`alert ${previewDays ? 'alert--success' : 'alert--warning'}`}>
            <CalendarDays size={16} />
            <span>
              {previewDays
                ? `${previewDays} day(s) will be recorded for this leave.`
                : 'Select a start date to see the duration.'}
            </span>
          </div>
        </div>

        {/* <Field className="span-2" label="Description" htmlFor="leave-description">
          <Textarea
            id="leave-description"
            value={form.description}
            onChange={update('description')}
            placeholder="Optional details about this leave."
          />
        </Field> */}

        {/* <Field className="span-2" label="Reason" htmlFor="leave-reason">
          <Input
            id="leave-reason"
            value={form.reason}
            onChange={update('reason')}
            placeholder="Optional reason shown to employees."
          />
        </Field> */}
      </form>
    </Modal>
  );
}
