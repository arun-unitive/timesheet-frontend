import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  Settings,
  CalendarCheck,
  History,
  Timer,
} from 'lucide-react';

/** Sidebar navigation, keyed by role. */
export const NAV = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/employees', label: 'Employees', icon: Users },
    { to: '/admin/timesheets', label: 'Timesheets', icon: ClipboardList },
    { to: '/admin/leaves', label: 'Leave Management', icon: CalendarDays },
    // { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  employee: [
    { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/timesheet', label: 'My Timesheet', icon: Timer },
    { to: '/employee/history', label: 'My History', icon: History },
    { to: '/employee/leaves', label: 'My Leaves', icon: CalendarCheck },
  ],
};

/** Default landing route per role. */
export const HOME_BY_ROLE = { admin: '/admin/dashboard', employee: '/employee/dashboard' };
