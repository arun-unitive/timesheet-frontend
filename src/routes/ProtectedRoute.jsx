import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HOME_BY_ROLE } from '../lib/navigation';

/** Boot screen shown while the session is being restored. */
function BootScreen() {
  return (
    <div className="app-boot">
      <span className="spinner" />
      <span>Loading your workspace…</span>
    </div>
  );
}

/**
 * Route guard.
 * - waits for the session check,
 * - redirects anonymous users to /login (remembering where they were heading),
 * - redirects users to their own home if the role does not match.
 */
export default function ProtectedRoute({ role, children }) {
  const { status, user, isAdmin } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <BootScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && !(role === 'admin' ? isAdmin : !isAdmin)) {
    return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;
  }

  return children;
}
