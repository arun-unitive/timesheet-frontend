import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Clock3, X } from 'lucide-react';
import { NAV } from '../../lib/navigation';
import { useUnsavedChanges } from '../../context/UnsavedChangesContext';
import Avatar from '../ui/Avatar';
import unitiveLogo from '../../assets/Unitive Logo png.png'; // Adjust path to where you saved the image

/** Dark, fixed sidebar with role-aware navigation. */
export default function Sidebar({ role, user, open, onClose }) {
  const items = NAV[role] || [];
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useUnsavedChanges();

  // Route through the guard so unsaved edits trigger a warning first.
  const handleNavClick = (event, to) => {
    event.preventDefault();
    onClose?.();
    if (location.pathname === to) return;
    confirm(() => navigate(to));
  };

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          {/* <span className="sidebar__logo">
            <Clock3 size={18} />
          </span> */}
          <div className="flex-1" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={unitiveLogo}
              alt="Unitive Digital Transformation"
              style={{ maxHeight: '40px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <button type="button" className="icon-btn header__menu" onClick={onClose} aria-label="Close menu" style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section">Menu</div>
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`nav-link ${active ? 'is-active' : ''}`}
                onClick={(event) => handleNavClick(event, item.to)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__user">
            <Avatar name={user?.name} size="sm" />
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="sidebar__user-name truncate">{user?.name}</div>
              <div className="sidebar__user-role">{role === 'admin' ? 'Administrator' : user?.designation || 'Employee'}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}