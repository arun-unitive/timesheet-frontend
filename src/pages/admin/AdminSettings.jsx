import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck } from 'lucide-react';
import PageHead from '../../components/layout/PageHead';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { CardSkeleton } from '../../components/ui/Loader';
import { settingsApi } from '../../api/settings';
import { qk } from '../../api/queryKeys';
import { useToast } from '../../context/ToastContext';
import { formatHours } from '../../lib/format';

const DEFAULT_FORM = { dailyTargetHours: '', editWindowDays: '' };

/** Company-wide timesheet submission rules. */
export default function AdminSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: qk.settings,
    queryFn: async () => (await settingsApi.get()).data,
  });

  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const seededRef = useRef(false);

  // Seed the form from the loaded settings once. Form initialisation, not fetching.
  useEffect(() => {
    if (!data || seededRef.current) return;
    seededRef.current = true;
    setForm({
      dailyTargetHours: data.dailyTargetHours ?? '',
      editWindowDays: data.editWindowDays ?? '',
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload) => settingsApi.update(payload),
    onSuccess: () => {
      toast.success('Settings saved', 'The timesheet submission rules have been updated.');
      queryClient.invalidateQueries({ queryKey: qk.settings });
      queryClient.invalidateQueries({ queryKey: qk.me });
    },
    onError: (err) => {
      setErrors(err.errors || {});
      toast.error('Could not save settings', err.message);
    },
  });

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const target = Number(form.dailyTargetHours);
    const window = Number(form.editWindowDays);
    const next = {};
    if (form.dailyTargetHours === '' || !Number.isFinite(target) || target < 1 || target > 24) {
      next.dailyTargetHours = 'Enter a value between 1 and 24';
    }
    if (form.editWindowDays === '' || !Number.isFinite(window) || window < 0 || window > 365) {
      next.editWindowDays = 'Enter a value between 0 and 365';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    mutation.mutate({
      dailyTargetHours: target,
      editWindowDays: window,
    });
  };

  return (
    <div className="page">
      <PageHead title="Settings" subtitle="Configure the rules employees follow when filing timesheets." />

      <div className="split-2">
        <Card title="Timesheet submission rules" subtitle="These values apply to every employee.">
          {isLoading ? (
            <CardSkeleton height={220} />
          ) : (
            <form onSubmit={handleSubmit} noValidate className="form-grid">
              <Field
                label="Daily target hours"
                htmlFor="dailyTargetHours"
                required
                error={errors.dailyTargetHours}
                hint="Each working day targets this many hours."
              >
                <Input
                  id="dailyTargetHours"
                  type="number"
                  min={1}
                  max={24}
                  step="0.5"
                  value={form.dailyTargetHours}
                  onChange={update('dailyTargetHours')}
                  error={Boolean(errors.dailyTargetHours)}
                />
              </Field>

              <Field
                label="Timesheet edit window (days)"
                htmlFor="editWindowDays"
                required
                error={errors.editWindowDays}
                hint="How far back an employee may still edit a timesheet."
              >
                <Input
                  id="editWindowDays"
                  type="number"
                  min={0}
                  max={365}
                  value={form.editWindowDays}
                  onChange={update('editWindowDays')}
                  error={Boolean(errors.editWindowDays)}
                />
              </Field>

              <div className="span-2">
                <Button type="submit" variant="primary" icon={Save} loading={mutation.isPending}>
                  Save settings
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card title="Current rules" subtitle="A plain-language summary of the active policy.">
          {isLoading ? (
            <CardSkeleton height={180} />
          ) : (
            <>
              <div className="meta-list">
                <div className="meta-row">
                  <span className="meta-row__label">Daily target</span>
                  <span className="meta-row__value">{formatHours(data?.dailyTargetHours ?? 0)} per working day</span>
                </div>
                <div className="meta-row">
                  <span className="meta-row__label">Edit window</span>
                  <span className="meta-row__value">{data?.editWindowDays ?? 0} days back</span>
                </div>
              </div>
              <div className="alert alert--success mt-6">
                <ShieldCheck size={16} />
                <span>
                  Employees may only file timesheets for the last {data?.editWindowDays ?? 0} days, targeting{' '}
                  {data?.dailyTargetHours ?? 0} hours per working day.
                </span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
