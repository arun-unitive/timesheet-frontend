import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Clock3, Eye, EyeOff, Lock, Mail, ShieldCheck, Gauge, CalendarCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HOME_BY_ROLE } from '../lib/navigation';

/** Sign-in screen - the only public route. */
export default function Login() {
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form.
  if (user) return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const signedIn = await login(form);
      toast.success('Welcome back', `Signed in as ${signedIn.name}`);
      const target = location.state?.from || HOME_BY_ROLE[signedIn.role] || '/';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__visual">
        <div className="auth__brand">
          <span className="sidebar__logo" style={{ width: 38, height: 38 }}>
            <Clock3 size={20} />
          </span>
          <div>
            <div className="sidebar__name" style={{ fontSize: 'var(--fs-lg)' }}>Worklog</div>
            <div className="sidebar__tag">Timesheet Suite</div>
          </div>
        </div>

        <div>
          <h1 className="auth__headline">Track every hour. Ship with confidence.</h1>
          <p className="auth__sub">
            A single place for daily timesheets, project effort, leave and comp-off — with real-time
            visibility for managers and teams.
          </p>
          <div className="auth__points">
            <div className="auth__point">
              <Gauge size={18} /> Accurate 8-hour daily targets and progress tracking
            </div>
            <div className="auth__point">
              <CalendarCheck size={18} /> Holidays, leave and comp-off in one calendar
            </div>
            <div className="auth__point">
              <ShieldCheck size={18} /> Secure role-based access for admins and employees
            </div>
          </div>
        </div>

        <div className="text-xs" style={{ color: 'var(--gray-500)', position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} Worklog. All rights reserved.
        </div>
      </div>

      <div className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="auth__mobile-brand">
            <span className="sidebar__logo">
              <Clock3 size={18} />
            </span>
            <div className="sidebar__name" style={{ color: 'var(--text-primary)' }}>Worklog</div>
          </div>

          <h1 className="auth__title">Sign in</h1>
          <p className="auth__desc">Use the credentials provided by your administrator.</p>

          {error && (
            <div className="alert alert--danger mb-4" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Field label="Email address" htmlFor="email" required>
              <div className="input-group">
                <span className="input-group__icon">
                  <Mail size={16} />
                </span>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={update('email')}
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" required>
              <div className="input-group">
                <span className="input-group__icon">
                  <Lock size={16} />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  style={{ position: 'absolute', right: 2, width: 30, height: 30 }}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" size="lg" block loading={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>

          {/* <div className="auth__demo">
            <strong>Demo admin:</strong> admin@company.com / Admin@123 — employees use the credentials
            created by an administrator.
          </div> */}
        </form>
      </div>
    </div>
  );
}
