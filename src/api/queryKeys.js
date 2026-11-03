/**
 * Centralised query-key factory.
 * Keeping keys in one place means invalidation is reliable and typos are impossible.
 */
export const qk = {
  me: ['me'],
  settings: ['settings'],

  adminDashboard: ['dashboard', 'admin'],
  employeeDashboard: ['dashboard', 'employee'],

  employees: (params) => ['employees', 'list', params],
  employeeOptions: ['employees', 'options'],
  employee: (id) => ['employees', 'detail', id],

  timesheets: (params) => ['timesheets', 'list', params],
  timesheetSummary: (params) => ['timesheets', 'summary', params],
  timesheetToday: (employeeId) => ['timesheets', 'today', employeeId || 'me'],
  timesheetProjects: ['timesheets', 'projects'],

  leaves: (params) => ['leaves', 'list', params],
  leavesUpcoming: ['leaves', 'upcoming'],
  leavesMine: ['leaves', 'mine'],
};
