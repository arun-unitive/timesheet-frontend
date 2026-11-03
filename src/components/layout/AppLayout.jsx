import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { NAV } from '../../lib/navigation';

/** Shell for every authenticated page: sidebar + header + routed content. */
export default function AppLayout() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = isAdmin ? 'admin' : 'employee';

  // Derive the header title from the active nav entry (no per-page wiring).
  const { title, subtitle } = useMemo(() => {
    const items = NAV[role] || [];
    const match = items.find((item) => location.pathname.startsWith(item.to));
    if (location.pathname.startsWith('/profile')) {
      return { title: 'Profile', subtitle: 'Manage your account details and password' };
    }
    return {
      title: match?.label || 'Dashboard',
      subtitle: match?.label ? undefined : 'Overview',
    };
  }, [location.pathname, role]);

  return (
    <div className="app">
      <Sidebar role={role} user={user} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main">
        <Header title={title} subtitle={subtitle} onMenuClick={() => setMenuOpen(true)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
