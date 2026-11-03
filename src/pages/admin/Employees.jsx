import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MoreVertical, Users, UserCheck, UserX, Save, UserPlus, Eye, EyeOff, FilterX } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Dropdown from '../../components/ui/Dropdown';
import Avatar from '../../components/ui/Avatar';
import { ActiveBadge } from '../../components/ui/Badge';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { employeeApi } from '../../api/employees';
import { qk } from '../../api/queryKeys';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../lib/format';
import { PAGE_SIZE_OPTIONS } from '../../lib/constants';

const EMPTY_EMPLOYEE_FORM = {
  name: '',
  email: '',
  password: '',
  employeeCode: '',
  department: '',
  designation: '',
  phone: '',
  joiningDate: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Employee directory: search, filter, sort, paginate and manage accounts. */
export default function Employees() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [params, setParams] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 10,
    sortBy: 'name',
    order: 'asc',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const debouncedSearch = useDebounce(params.search, 400);

  // Any filter change resets to page 1; explicit page changes are respected.
  const setParam = (patch) => setParams((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const hasFilters = Boolean(params.search || params.status);
  const clearFilters = () => setParam({ search: '', status: '' });

  const queryParams = { ...params, search: debouncedSearch };

  const { data, isLoading } = useQuery({
    queryKey: qk.employees(queryParams),
    queryFn: async () => {
      const res = await employeeApi.list(queryParams);
      return { items: res.data, meta: res.meta };
    },
    staleTime: 60_000,
  });

  const rows = data?.items || [];
  const meta = data?.meta || { page: 1, limit: params.limit, total: 0, totalPages: 1 };

  const invalidateDirectory = () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: qk.adminDashboard });
    queryClient.invalidateQueries({ queryKey: qk.employeeDashboard });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => employeeApi.setStatus(id, isActive),
    onSuccess: (_res, vars) => {
      toast.success(vars.isActive ? 'Employee activated' : 'Employee deactivated', 'The directory has been updated.');
      invalidateDirectory();
      setConfirm(null);
    },
    onError: (err) => toast.error('Could not update status', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => employeeApi.remove(id),
    onSuccess: () => {
      toast.success('Employee deleted', 'The employee has been removed from the directory.');
      invalidateDirectory();
      setConfirm(null);
    },
    onError: (err) => toast.error('Could not delete employee', err.message),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((employee) => {
    setEditing(employee);
    setFormOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Employee',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div className="fw-medium truncate">{row.name}</div>
              <div className="text-xs text-muted truncate">{row.email}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'employeeCode',
        header: 'Code',
        render: (row) => <span className="mono">{row.employeeCode || '—'}</span>,
      },
      {
        key: 'department',
        header: 'Department',
        sortable: true,
        render: (row) => row.department || '—',
      },
      {
        key: 'designation',
        header: 'Designation',
        sortable: true,
        render: (row) => row.designation || '—',
      },
      {
        key: 'isActive',
        header: 'Status',
        render: (row) => <ActiveBadge isActive={row.isActive} />,
      },
      {
        key: 'lastLoginAt',
        header: 'Last login',
        render: (row) => (row.lastLoginAt ? timeAgo(row.lastLoginAt) : 'Never'),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (row) => (
          <div className="table-actions" onClick={(e) => e.stopPropagation()}>
            <Dropdown
              trigger={({ toggle }) => (
                <button type="button" className="icon-btn" onClick={toggle} aria-label={`Actions for ${row.name}`}>
                  <MoreVertical size={16} />
                </button>
              )}
            >
              <button type="button" className="dropdown__item" onClick={() => openEdit(row)}>
                <Pencil size={15} /> Edit
              </button>
              <button
                type="button"
                className="dropdown__item"
                onClick={() =>
                  row.isActive
                    ? setConfirm({ type: 'deactivate', employee: row })
                    : statusMutation.mutate({ id: row._id || row.id, isActive: true })
                }
              >
                {row.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                {row.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <div className="dropdown__sep" />
              <button
                type="button"
                className="dropdown__item dropdown__item--danger"
                onClick={() => setConfirm({ type: 'delete', employee: row })}
              >
                <Trash2 size={15} /> Delete
              </button>
            </Dropdown>
          </div>
        ),
      },
    ],
    [openEdit, statusMutation.mutate]
  );

  const confirmConfig =
    confirm?.type === 'delete'
      ? {
          title: 'Delete employee',
          message: `This permanently removes ${confirm.employee.name} and cannot be undone.`,
          confirmLabel: 'Delete',
          tone: 'danger',
        }
      : confirm?.type === 'deactivate'
        ? {
            title: 'Deactivate employee',
            message: `${confirm.employee.name} will no longer be able to sign in. You can reactivate them later.`,
            confirmLabel: 'Deactivate',
            tone: 'warning',
          }
        : null;

  const handleConfirm = () => {
    if (!confirm) return;
    const id = confirm.employee._id || confirm.employee.id;
    if (confirm.type === 'delete') deleteMutation.mutate(id);
    else statusMutation.mutate({ id, isActive: false });
  };

  return (
    <div className="page">
      <PageHead title="Employees" subtitle="Manage your company directory and employee accounts." />

      <Card flush>
        <div className="toolbar">
          <div className="toolbar__search">
            <SearchInput
              value={params.search}
              onChange={(value) => setParam({ search: value })}
              placeholder="Search by name, email or code"
            />
          </div>
          <Select
            value={params.status}
            onChange={(e) => setParam({ status: e.target.value })}
            style={{ width: 150 }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select
            value={params.limit}
            onChange={(e) => setParam({ limit: Number(e.target.value) })}
            style={{ width: 120 }}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </Select>
          <span className="toolbar__spacer" />
          {hasFilters && (
            <Button variant="secondary" icon={FilterX} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Add Employee
          </Button>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          sortBy={params.sortBy}
          order={params.order}
          onSort={(sortBy, order) => setParam({ sortBy, order })}
          onRowClick={openEdit}
          empty={
            <EmptyState
              icon={Users}
              title="No employees found"
              message="Adjust your search filters or add a new employee to get started."
              action={
                <Button variant="primary" icon={Plus} onClick={openCreate}>
                  Add Employee
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

      <EmployeeFormModal open={formOpen} onClose={() => setFormOpen(false)} employee={editing} />

      <ConfirmDialog
        open={Boolean(confirmConfig)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmLabel={confirmConfig?.confirmLabel}
        tone={confirmConfig?.tone}
        loading={deleteMutation.isPending || statusMutation.isPending}
      />
    </div>
  );
}

/** Create / edit an employee. `employee = null` means create. */
function EmployeeFormModal({ open, onClose, employee }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(employee);

  const [form, setForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
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
    setShowPass(false);
    setForm(
      employee
        ? {
            name: employee.name || '',
            email: employee.email || '',
            password: employee.plainPassword || '',
            employeeCode: employee.employeeCode || '',
            department: employee.department || '',
            designation: employee.designation || '',
            phone: employee.phone || '',
            joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : '',
          }
        : EMPTY_EMPLOYEE_FORM
    );
  }, [open, employee]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? employeeApi.update(employee._id || employee.id, payload) : employeeApi.create(payload),
    onSuccess: () => {
      toast.success(
        isEdit ? 'Employee updated' : 'Employee added',
        isEdit ? 'The employee record has been saved.' : 'The new employee can now sign in.'
      );
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: qk.adminDashboard });
      onClose();
    },
    onError: (err) => {
      setErrors(err.errors || {});
      toast.error(isEdit ? 'Could not update employee' : 'Could not add employee', err.message);
    },
  });

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!isEdit && !form.password) next.password = 'A password is required for new employees';
    else if (form.password && form.password.length < 6) next.password = 'Use at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      employeeCode: form.employeeCode.trim() || undefined,
      department: form.department.trim() || undefined,
      designation: form.designation.trim() || undefined,
      phone: form.phone.trim() || undefined,
      joiningDate: form.joiningDate || undefined,
    };
    if (form.password) payload.password = form.password;
    mutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit employee' : 'Add employee'}
      subtitle={isEdit ? 'Update the employee details below.' : 'Create a new employee account.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="employee-form"
            variant="primary"
            icon={isEdit ? Save : UserPlus}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} noValidate className="form-grid">
        <Field className="span-2" label="Full name" htmlFor="emp-name" required error={errors.name}>
          <Input id="emp-name" value={form.name} onChange={update('name')} error={Boolean(errors.name)} placeholder="Jane Doe" />
        </Field>
        
        <Field label="Email" htmlFor="emp-email" required error={errors.email}>
          <Input
            id="emp-email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={update('email')}
            error={Boolean(errors.email)}
            placeholder="jane@company.com"
          />
        </Field>

        <Field
          label={isEdit ? 'Current / New password' : 'Password'}
          htmlFor="emp-password"
          required={!isEdit}
          error={errors.password}
          hint={isEdit ? 'Current password shown above. Leave as is or update.' : 'At least 6 characters.'}
        >
          <div className="input-group">
            <Input
              id="emp-password"
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              error={Boolean(errors.password)}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              className="input-group__icon"
              style={{ left: 'auto', right: '10px', pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Field label="Employee code" htmlFor="emp-code">
          <Input id="emp-code" value={form.employeeCode} onChange={update('employeeCode')} placeholder="EMP-001" />
        </Field>

        <Field label="Phone" htmlFor="emp-phone">
          <Input id="emp-phone" value={form.phone} onChange={update('phone')} placeholder="+91 90000 00000" />
        </Field>

        <Field label="Department" htmlFor="emp-dept">
          <Input id="emp-dept" value={form.department} onChange={update('department')} placeholder="Engineering" />
        </Field>

        <Field label="Designation" htmlFor="emp-desig">
          <Input id="emp-desig" value={form.designation} onChange={update('designation')} placeholder="Software Engineer" />
        </Field>

        <Field className="span-2" label="Joining date" htmlFor="emp-joining">
          <Input id="emp-joining" type="date" value={form.joiningDate} onChange={update('joiningDate')} />
        </Field>
      </form>
    </Modal>
  );
}
