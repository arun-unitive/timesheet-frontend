import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';
import PageHead from '../components/layout/PageHead';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth';
import { qk } from '../api/queryKeys';
import { formatDate } from '../lib/format';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Account details + password change. Shared by both roles. */
export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (payload) => authApi.changePassword(payload),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setErrors({});
      toast.success('Password updated', 'Use your new password the next time you sign in.');
      queryClient.invalidateQueries({ queryKey: qk.me });
    },
    onError: (err) => {
      setErrors(err.errors || {});
      toast.error('Could not update password', err.message);
    },
  });

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 6) next.newPassword = 'Must be at least 6 characters';
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <div className="page">
      <PageHead title="Profile" subtitle="Your account details and security settings." />

      <div className="split-2">
        <Card title="Change password" subtitle="Passwords are hashed with bcrypt before storage.">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" style={{ maxWidth: 460 }}>
            <Field label="Current password" htmlFor="currentPassword" required error={errors.currentPassword}>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={update('currentPassword')}
                error={Boolean(errors.currentPassword)}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="newPassword"
              required
              error={errors.newPassword}
              hint="At least 6 characters."
            >
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={update('newPassword')}
                error={Boolean(errors.newPassword)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword}>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                error={Boolean(errors.confirmPassword)}
              />
            </Field>
            <div>
              <Button type="submit" variant="primary" icon={KeyRound} loading={mutation.isPending}>
                Update password
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Account overview">
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={user?.name} size="lg" />
            <div style={{ minWidth: 0 }}>
              <div className="fw-semibold truncate">{user?.name}</div>
              <div className="text-sm text-muted truncate">{user?.email}</div>
              <div className="mt-1">
                <Badge tone={user?.role === 'admin' ? 'primary' : 'info'}>{user?.role === 'admin' ? 'Administrator' : 'Employee'}</Badge>
              </div>
            </div>
          </div>

          <hr className="divider mb-4" />

          <div className="meta-list">
            <div className="meta-row">
              <span className="meta-row__label">Employee code</span>
              <span className="meta-row__value">{user?.employeeCode || '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-row__label">Department</span>
              <span className="meta-row__value">{user?.department || '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-row__label">Designation</span>
              <span className="meta-row__value">{user?.designation || '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-row__label">Joining date</span>
              <span className="meta-row__value">{user?.joiningDate ? formatDate(user.joiningDate) : '—'}</span>
            </div>
          </div>

          <div className="alert alert--success mt-6">
            <ShieldCheck size={16} />
            Your session is protected with JWT authentication.
          </div>
        </Card>
      </div>
    </div>
  );
}
