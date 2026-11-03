import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, UserCog, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { useUnsavedChanges } from '../../context/UnsavedChangesContext';
import { leaveApi } from '../../api/leaves';
import { qk } from '../../api/queryKeys';
import { formatDateShort } from '../../lib/format';

/** Top bar: page context, notifications and the profile menu. */
export default function Header({ title, subtitle, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useUnsavedChanges();

  // Upcoming holidays double as the notification feed (cached, fetched once).
  const { data: upcoming = [] } = useQuery({
    queryKey: qk.leavesUpcoming,
    queryFn: async () => (await leaveApi.upcoming(60)).data,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const goToProfile = () => navigate('/profile');

  return (
    <header className="header">
      <button type="button" className="icon-btn header__menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="header__title truncate">{title}</div>
        {subtitle && <div className="header__sub truncate">{subtitle}</div>}
      </div>

      <div className="header__actions">
        <Dropdown
          menuWidth={300}
          trigger={({ toggle }) => (
            <button type="button" className="icon-btn" onClick={toggle} aria-label="Notifications">
              <Bell size={19} />
              {upcoming.length > 0 && <span className="icon-btn__dot" />}
            </button>
          )}
        >
          <div className="dropdown__header">
            <div className="fw-semibold">Notifications</div>
            <div className="text-xs text-muted">Upcoming holidays &amp; leaves</div>
          </div>
          <div className="dropdown__sep" />
          {upcoming.length === 0 ? (
            <div className="dropdown__item text-muted" style={{ cursor: 'default' }}>
              <CheckCircle2 size={16} /> You are all caught up
            </div>
          ) : (
            upcoming.slice(0, 5).map((leave) => (
              <div key={leave._id} className="dropdown__item" style={{ cursor: 'default' }}>
                <CalendarDays size={16} />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="truncate fw-medium" style={{ color: 'var(--text-primary)' }}>
                    {leave.title}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateShort(leave.startDate)}
                    {leave.endDate !== leave.startDate ? ` – ${formatDateShort(leave.endDate)}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </Dropdown>

        <Dropdown
          menuWidth={230}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              style={{ border: 'none', background: 'transparent', padding: 2, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar name={user?.name} size="sm" />
              <span className="text-sm fw-medium truncate" style={{ maxWidth: 140 }}>
                {user?.name}
              </span>
            </button>
          )}
        >
          <div className="dropdown__header">
            <div className="fw-semibold truncate">{user?.name}</div>
            <div className="text-xs text-muted truncate">{user?.email}</div>
          </div>
          <div className="dropdown__sep" />
          <Link
            to="/profile"
            className="dropdown__item"
            onClick={(event) => {
              event.preventDefault();
              confirm(goToProfile);
            }}
          >
            <UserCog size={16} /> Profile &amp; Password
          </Link>
          <button type="button" className="dropdown__item dropdown__item--danger" onClick={() => confirm(handleLogout)}>
            <LogOut size={16} /> Sign out
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
