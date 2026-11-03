import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHome, ROLES } from '../utils/roles';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import PendingApprovalPage from '../pages/auth/PendingApprovalPage';
import ProfilePage from '../pages/shared/ProfilePage';
import AccessDeniedPage from '../pages/shared/AccessDeniedPage';
import DashboardPage from '../pages/shared/DashboardPage';
import QueriesPage from '../pages/shared/QueriesPage';
import QueryDetailsPage from '../pages/shared/QueryDetailsPage';
import ReportsPage from '../pages/shared/ReportsPage';
import NotificationsPage from '../pages/shared/NotificationsPage';
import AnnouncementsPage from '../pages/shared/AnnouncementsPage';
import SubmitQueryPage from '../pages/student/SubmitQueryPage';
import LeavePage from '../pages/instructor/LeavePage';
import ApprovalsPage from '../pages/admin/ApprovalsPage';
import DepartmentsPage from '../pages/admin/DepartmentsPage';
import UsersPage from '../pages/admin/UsersPage';
import PlannedAdminPage from '../pages/admin/PlannedAdminPage';
import PreviewPage from '../preview/PreviewPage';

function RoleDashboard({ role }) { const { user } = useAuth(); return <DashboardPage role={role} user={user} />; }
function Home() { const { user } = useAuth(); return <Navigate to={user ? getRoleHome(user.role) : '/login'} replace />; }
export default function AppRouter() {
  return <Routes><Route path="/" element={<Home />} /><Route element={<AuthLayout />}><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/pending-approval" element={<PendingApprovalPage />} /></Route><Route path="/preview" element={<PreviewPage />} /><Route path="/access-denied" element={<AccessDeniedPage />} /><Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}><Route path="/profile" element={<ProfilePage />} /><Route path="/notifications" element={<NotificationsPage />} /></Route>{ROLES.map((role) => <Route key={role} path={`/${role.toLowerCase()}`} element={<ProtectedRoute allowedRoles={[role]}><DashboardLayout /></ProtectedRoute>}><Route index element={<Navigate to="dashboard" replace />} /><Route path="dashboard" element={<RoleDashboard role={role} />} /><Route path="queries" element={<QueriesPage role={role} />} /><Route path="queries/:id" element={<QueryDetailsPage role={role} />} /><Route path="reports" element={<ReportsPage role={role} />} /><Route path="profile" element={<Navigate to="/profile" replace />} /><Route path="notifications" element={<Navigate to="/notifications" replace />} />{role === 'STUDENT' && <Route path="queries/new" element={<SubmitQueryPage />} />}{['STUDENT', 'ADMIN'].includes(role) && <Route path="announcements" element={<AnnouncementsPage role={role} />} />}{role === 'INSTRUCTOR' && <Route path="leave" element={<LeavePage />} />}{role === 'HOD' && <Route path="escalations" element={<QueriesPage role={role} escalations />} />}{role === 'ADMIN' && <><Route path="approvals" element={<ApprovalsPage />} /><Route path="users" element={<UsersPage />} /><Route path="departments" element={<DepartmentsPage />} />{['routing', 'staff-assignments', 'audit-logs'].map((module) => <Route key={module} path={module} element={<PlannedAdminPage module={module} />} />)}</>}</Route>)}<Route path="*" element={<main className="standalone-state"><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>A little off campus?</h1><p>We couldn’t find that page. Let’s get you back to your workspace.</p><Link className="button button-primary" to="/">Return home</Link></main>} /></Routes>;
}
