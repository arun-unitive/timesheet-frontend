import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import ToastViewport from './components/ui/ToastViewport';
import { CenterLoader } from './components/ui/Loader';
import { HOME_BY_ROLE } from './lib/navigation';

// Pages are code-split: only the bundle needed for the active route is loaded.
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const AdminTimesheets = lazy(() => import('./pages/admin/AdminTimesheets'));
const AdminLeaves = lazy(() => import('./pages/admin/AdminLeaves'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const MyTimesheet = lazy(() => import('./pages/employee/MyTimesheet'));
const MyHistory = lazy(() => import('./pages/employee/MyHistory'));
const MyLeaves = lazy(() => import('./pages/employee/MyLeaves'));

/** Sends "/" and unknown roots to the correct home for the current role. */
function RoleHome() {
  const { status, user } = useAuth();
  if (status === 'loading') return <CenterLoader />;
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <>
      <Suspense fallback={<div className="app-boot"><span className="spinner" /><span>Loading…</span></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleHome />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/profile" element={<Profile />} />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <ProtectedRoute role="admin">
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/timesheets"
              element={
                <ProtectedRoute role="admin">
                  <AdminTimesheets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leaves"
              element={
                <ProtectedRoute role="admin">
                  <AdminLeaves />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute role="admin">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute role="employee">
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/timesheet"
              element={
                <ProtectedRoute role="employee">
                  <MyTimesheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/history"
              element={
                <ProtectedRoute role="employee">
                  <MyHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/leaves"
              element={
                <ProtectedRoute role="employee">
                  <MyLeaves />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ToastViewport />
    </>
  );
}
