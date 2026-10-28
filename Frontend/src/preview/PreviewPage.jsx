import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Eye, ShieldCheck, UserRound } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardLayout';
import DashboardPage from '../pages/shared/DashboardPage';
import QueriesPage from '../pages/shared/QueriesPage';
import QueryDetailsPage from '../pages/shared/QueryDetailsPage';
import SubmitQueryPage from '../pages/student/SubmitQueryPage';
import ReportsPage from '../pages/shared/ReportsPage';
import LeavePage from '../pages/instructor/LeavePage';
import NotificationsPage from '../pages/shared/NotificationsPage';
import AnnouncementsPage from '../pages/shared/AnnouncementsPage';
import PlannedAdminPage from '../pages/admin/PlannedAdminPage';
import { LEGACY_ROLES as ROLES } from '../utils/roles';
import { navigation, personalNavigation } from '../utils/navigation';
import { Card, PageHeader, Badge, Button, Modal, Field, Input } from '../components/ui';
import DataTable from '../components/tables/DataTable';
import FeatureNotice from '../components/common/FeatureNotice';
import { previewUsers, demoQueries, demoVolume, demoStatuses, demoDepartment, demoActivities, demoApprovals, demoDepartments, demoNotifications, demoStaffWorkload, demoEscalations } from './data';

const data = { queries: demoQueries, volume: demoVolume, statuses: demoStatuses, departmentsChart: demoDepartment, staffWorkload: demoStaffWorkload, activities: demoActivities, approvals: demoApprovals, departments: demoDepartments };
function PreviewDirectory({ page, user }) {
  const [selected, setSelected] = useState(null);
  if (page === 'profile') return <><PageHeader title="My profile" description="A read-only sample account, separate from authentication." /><FeatureNotice>Sign in with your approved backend account to view and update your real profile.</FeatureNotice><div className="profile-grid"><Card className="profile-summary"><span className="avatar avatar-large avatar-blue">{user.full_name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</span><h2>{user.full_name}</h2><p>{user.email}</p><Badge tone="blue">{user.role}</Badge><Badge>Demo data</Badge></Card><Card className="padded-card"><h2>Personal information</h2><Field label="Full name" htmlFor="preview-name"><Input id="preview-name" value={user.full_name} disabled /></Field><Field label="Email address" htmlFor="preview-email"><Input id="preview-email" value={user.email} disabled /></Field><Field label="Account role" htmlFor="preview-account-role"><Input id="preview-account-role" value={user.role} disabled /></Field><Button disabled>Save changes</Button></Card></div></>;
  const departments = page === 'departments';
  const rows = departments ? demoDepartments : demoApprovals;
  const columns = departments ? [{ key: 'name', label: 'Department', render: (d) => <span className="table-channel"><Building2 size={17} />{d.name}</span> }, { key: 'code', label: 'Code' }, { key: 'description', label: 'Description' }, { key: 'is_active', label: 'Status', render: () => <Badge tone="green">Active</Badge> }, { key: 'actions', label: 'Details', sortable: false, render: (r) => <Button variant="ghost" size="sm" onClick={() => setSelected(r)}><Eye size={15} />View</Button> }] : [{ key: 'full_name', label: 'Full name' }, { key: 'email', label: 'Email' }, { key: 'requested_role', label: 'Requested role', render: (r) => <Badge tone="blue">{r.requested_role}</Badge> }, { key: 'approval_status', label: 'Status', render: () => <Badge tone="amber">Pending</Badge> }, { key: 'created_at', label: 'Registration date', render: () => '12 October 2026' }, { key: 'actions', label: 'Actions', sortable: false, render: () => <div className="button-row"><Button size="sm" disabled>Approve</Button><Button size="sm" variant="secondary" disabled>Reject</Button></div> }];
  return <><PageHeader title={departments ? 'Departments' : page === 'users' ? 'Users' : 'Approvals'} description={departments ? 'The departments that keep your university connected.' : 'Give each campus member the right start.'} actions={departments && <Button disabled>Create department</Button>} /><FeatureNotice>This public showcase contains isolated sample records. Sign in as a backend-authorised Admin to use real department and approval APIs.</FeatureNotice><Card><div className="card-heading"><h2>{departments ? 'Department directory' : 'Pending registrations'} <Badge>Demo data</Badge></h2></div><DataTable rows={rows} columns={columns} /></Card><Modal open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title={selected?.name || 'Sample department'} description="Read-only demonstration record."><Badge tone="blue">{selected?.code}</Badge><p className="query-description">{selected?.description}</p><Badge>Demo data</Badge><div className="dialog-actions"><Button disabled>Edit department</Button><Button variant="secondary" disabled>Deactivate department</Button></div></Modal></>;
}
export default function PreviewPage() {
  const [params, setParams] = useSearchParams();
  const role = ROLES.includes(params.get('role')) ? params.get('role') : 'ADMIN';
  const allowed = [...navigation[role], ...personalNavigation].map((n) => n.key);
  const requestedPage = params.get('page') || 'dashboard';
  const page = allowed.includes(requestedPage) || requestedPage === 'detail' ? requestedPage : 'dashboard';
  const user = previewUsers[role];
  const shared = { role, preview: true, demoData: data };
  let content;
  if (page === 'dashboard') content = <DashboardPage {...shared} user={user} />;
  else if (page === 'queries' || page === 'escalations') content = <QueriesPage {...shared} rows={page === 'escalations' ? demoEscalations : demoQueries} escalations={page === 'escalations'} />;
  else if (page === 'detail') { const query = demoQueries.find((q) => String(q.id) === params.get('id') && (role !== 'STUDENT' || q.student === user.full_name)); content = <QueryDetailsPage {...shared} query={query || demoQueries[0]} />; }
  else if (page === 'submit') content = <SubmitQueryPage preview />;
  else if (page === 'reports') content = <ReportsPage {...shared} />;
  else if (page === 'leave') content = <LeavePage preview />;
  else if (page === 'notifications') content = <NotificationsPage {...shared} sample={demoNotifications} />;
  else if (page === 'announcements') content = <AnnouncementsPage {...shared} />;
  else if (['routing', 'staff-assignments', 'audit-logs'].includes(page)) content = <PlannedAdminPage {...shared} module={page} />;
  else content = <PreviewDirectory page={page} user={user} />;
  return <DashboardShell role={role} user={user} preview activePage={page} onPreviewRoleChange={(newRole) => setParams({ role: newRole, page: 'dashboard' })}>{content}</DashboardShell>;
}
