import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HOME_BY_ROLE } from '../lib/navigation';

/** 404 page. */
export default function NotFound() {
  const { user } = useAuth();
  const home = user ? HOME_BY_ROLE[user.role] : '/login';

  return (
    <div className="app-boot" style={{ flexDirection: 'column', textAlign: 'center' }}>
      <span className="empty__icon" style={{ width: 64, height: 64 }}>
        <Compass size={28} />
      </span>
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Page not found</h1>
      <p className="text-muted" style={{ maxWidth: 360 }}>
        The page you are looking for does not exist or you may not have access to it.
      </p>
      <Link to={home} className="btn btn--primary">
        Back to dashboard
      </Link>
    </div>
  );
}
