import { LayoutDashboard, Inbox, Send, Users, Building2, UserCheck, GitBranch, Megaphone, ClipboardList, BarChart3, AlertTriangle, CalendarClock, Bell, UserRound, FileChartColumn, Network } from 'lucide-react';

const departmentNavigation = () => [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'queries', label: 'Department queries', icon: Inbox },
  { key: 'reports', label: 'Department reports', icon: FileChartColumn },
];
export const navigation = {
  EXAM_STAFF: departmentNavigation(), FINANCE_STAFF: departmentNavigation(), IT_STAFF: departmentNavigation(),
  STUDENT: [{ key: 'dashboard', label: 'Overview', icon: LayoutDashboard }, { key: 'queries', label: 'My queries', icon: Inbox }, { key: 'submit', label: 'Submit a query', icon: Send }, { key: 'announcements', label: 'Announcements', icon: Megaphone }],
  INSTRUCTOR: [{ key: 'dashboard', label: 'Overview', icon: LayoutDashboard }, { key: 'queries', label: 'Assigned queries', icon: Inbox }, { key: 'leave', label: 'Leave & auto-reply', icon: CalendarClock }, { key: 'reports', label: 'My workload', icon: BarChart3 }],
  HOD: [{ key: 'dashboard', label: 'Overview', icon: LayoutDashboard }, { key: 'queries', label: 'Department queries', icon: Inbox }, { key: 'escalations', label: 'Escalations', icon: AlertTriangle }, { key: 'reports', label: 'Department reports', icon: FileChartColumn }],
  ADMIN: [{ key: 'dashboard', label: 'Overview', icon: LayoutDashboard }, { key: 'queries', label: 'All queries', icon: Inbox }, { key: 'routing', label: 'AI routing', icon: GitBranch }, { key: 'reports', label: 'Analytics & reports', icon: BarChart3 }, { key: 'approvals', label: 'Approvals', icon: UserCheck, group: 'administration' }, { key: 'users', label: 'Users', icon: Users, group: 'administration' }, { key: 'departments', label: 'Departments', icon: Building2, group: 'administration' }, { key: 'staff-assignments', label: 'Staff assignments', icon: Network, group: 'administration' }, { key: 'announcements', label: 'Announcements', icon: Megaphone, group: 'administration' }, { key: 'audit-logs', label: 'Audit logs', icon: ClipboardList, group: 'administration' }],
};
export const personalNavigation = [{ key: 'notifications', label: 'Notifications', icon: Bell }, { key: 'profile', label: 'My profile', icon: UserRound }];
export function pagePath(role, key) {
  if (['profile', 'notifications'].includes(key)) return `/${key}`;
  return `/${role.toLowerCase()}/${key === 'submit' ? 'queries/new' : key}`;
}
