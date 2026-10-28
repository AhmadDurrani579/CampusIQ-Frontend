import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import usersApi from '../../api/usersApi';
import departmentsApi from '../../api/departmentsApi';
import queriesApi from '../../api/queriesApi';
import auditApi from '../../api/auditApi';
import demoApi from '../../api/demoApi';
import { useAuth } from '../../context/AuthContext';
import { ROLES, STAFF_ROLES, isDepartmentStaff, roleLabels } from '../../utils/roles';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Field, Modal, PageHeader } from '../../components/ui';
import DataTable from '../../components/tables/DataTable';
import DepartmentForm from '../../components/forms/DepartmentForm';
import { ResourceState, useDemoResource, formatTime } from './querySupport';
import { getApiErrorMessage } from '../../utils/apiErrors';

function useAdminWrite() {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false);
  async function run(action, message) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); await Promise.all(['users', 'departments', 'queries', 'query', 'analytics', 'reports', 'audit', 'notifications', 'demo-time'].map(key => cache.invalidateQueries({ queryKey: [key] }))); setNotice(message); return true; }
    catch (failure) { setError(getApiErrorMessage(failure)); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  return { run, busy, error, notice, setError };
}
function Status({ user }) { return <Badge tone={user.approval_status === 'APPROVED' ? user.is_active ? 'success' : 'neutral' : 'warning'}>{user.approval_status === 'APPROVED' ? user.is_active ? 'Active' : 'Inactive' : user.approval_status}</Badge>; }
function Notice({ write }) { return <>{write.error && <div className="error-state" role="alert">{write.error}</div>}{write.notice && <p role="status" className="auth-note">{write.notice}</p>}</>; }

export function MockUsersPage() {
  const { user: actor } = useAuth();
  const users = useDemoResource('users', () => usersApi.getUsers());
  const departments = useDemoResource('departments', () => departmentsApi.getDepartments());
  const write = useAdminWrite();
  const [role, setRole] = useState('all'), [status, setStatus] = useState('all'), [target, setTarget] = useState(null), [department, setDepartment] = useState('');
  const names = Object.fromEntries((departments.data || []).map(d => [d.id, d.name]));
  const rows = (users.data || []).filter(u => (role === 'all' || u.role === role) && (status === 'all' || (status === 'pending' ? u.approval_status === 'PENDING' : status === 'active' ? u.is_active : !u.is_active)));
  return <div className="page-stack"><PageHeader eyebrow="Access management" title="Users & staff" description="Local demo user directory and confirmed account updates." actions={<Link className="button button-secondary" to="/admin/approvals">Review pending users</Link>} />
    <Notice write={write} />
    <Card className="p-5"><div className="flex flex-wrap gap-4 mb-5"><Field label="Assigned role" htmlFor="users-role"><select id="users-role" className="input" value={role} onChange={e => setRole(e.target.value)}><option value="all">All roles</option>{ROLES.map(v => <option key={v} value={v}>{roleLabels[v]}</option>)}</select></Field><Field label="Account status" htmlFor="users-status"><select id="users-status" className="input" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select></Field></div>
      <ResourceState resource={users} />{users.isSuccess && <DataTable rows={rows} searchKeys={['full_name', 'email', 'requested_role', 'role']} pageSize={8} columns={[
        { key: 'full_name', label: 'User', render: u => <div><strong>{u.full_name}</strong><p className="text-sm text-muted">{u.email}</p></div> },
        { key: 'requested_role', label: 'Requested role', render: u => isDepartmentStaff(u.requested_role) ? roleLabels[u.requested_role] : u.requested_role }, { key: 'role', label: 'Assigned role', render: u => isDepartmentStaff(u.role) ? roleLabels[u.role] : u.role },
        { key: 'approval_status', label: 'Status', render: u => <Status user={u} /> },
        { key: 'department_id', label: 'Department', render: u => names[u.department_id] || 'Unassigned' },
        { key: 'actions', label: 'Actions', sortable: false, render: u => <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" disabled={write.busy} onClick={() => { setDepartment(String(u.department_id || '')); setTarget({ user: u, action: 'department' }); }}>Edit department</Button><Button variant={u.is_active ? 'danger' : 'secondary'} size="sm" disabled={write.busy || u.approval_status !== 'APPROVED' || u.id === actor.id} onClick={() => setTarget({ user: u, action: 'active' })}>{u.is_active ? 'Deactivate' : 'Activate'}</Button>{u.approval_status === 'PENDING' && <Link className="button button-ghost button-sm" to="/admin/approvals">Review request</Link>}</div> },
      ]} />}</Card>
    <Modal open={target?.action === 'department'} onOpenChange={open => !open && setTarget(null)} title="Edit department" description={target?.user.full_name || ''}><Field label="Department" htmlFor="user-department"><select id="user-department" className="input" value={department} onChange={e => setDepartment(e.target.value)}><option value="">Choose an active department</option>{(departments.data || []).filter(d => d.is_active && (!isDepartmentStaff(target?.user.approval_status === 'PENDING' ? target?.user.requested_role : target?.user.role) || d.staff_role === (target?.user.approval_status === 'PENDING' ? target?.user.requested_role : target?.user.role))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><div className="dialog-actions"><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button disabled={!department || write.busy} onClick={async () => { if (await write.run(() => usersApi.updateUser(target.user.id, { department_id: Number(department) }), 'Department updated.')) setTarget(null); }}>Save assignment</Button></div>{write.error && <p role="alert">{write.error}</p>}</Modal>
    <ConfirmDialog open={target?.action === 'active'} onOpenChange={open => !open && setTarget(null)} title={`${target?.user.is_active ? 'Deactivate' : 'Activate'} account?`} description={`Update ${target?.user.full_name || ''} after local storage confirms the change.`} confirmLabel={target?.user.is_active ? 'Deactivate account' : 'Activate account'} variant={target?.user.is_active ? 'danger' : 'primary'} loading={write.busy} onConfirm={async () => { if (await write.run(() => usersApi.updateUser(target.user.id, { is_active: !target.user.is_active }), 'Account updated.')) setTarget(null); }}>{write.error && <p role="alert">{write.error}</p>}</ConfirmDialog>
    <DemoControls />
  </div>;
}

export function MockDepartmentsPage() {
  const departments = useDemoResource('departments', () => departmentsApi.getDepartments());
  const write = useAdminWrite();
  const [filter, setFilter] = useState('all'), [edit, setEdit] = useState(null), [selected, setSelected] = useState(null), [confirm, setConfirm] = useState(null);
  const current = (departments.data || []).find(d => d.id === selected?.id) || selected;
  const rows = (departments.data || []).filter(d => filter === 'all' || (filter === 'active' ? d.is_active : !d.is_active));
  return <div className="page-stack"><PageHeader eyebrow="University structure" title="Departments" description="Local demo department directory, routing keywords and status." actions={<Button onClick={() => setEdit({})}>Create department</Button>} /><Notice write={write} />
    <Card className="p-5"><Field label="Department status" htmlFor="department-status"><select id="department-status" className="input" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All departments</option><option value="active">Active</option><option value="deactivated">Deactivated</option></select></Field><ResourceState resource={departments} />{departments.isSuccess && <DataTable rows={rows} searchKeys={['name', 'code', 'description']} pageSize={8} columns={[{ key: 'name', label: 'Department' }, { key: 'code', label: 'Code' }, { key: 'description', label: 'Description' }, { key: 'is_active', label: 'Status', render: d => <Badge tone={d.is_active ? 'success' : 'neutral'}>{d.is_active ? 'Active' : 'Deactivated'}</Badge> }, { key: 'actions', label: 'Details', sortable: false, render: d => <Button variant="ghost" size="sm" aria-label={`View ${d.name}`} onClick={() => setSelected(d)}>View</Button> }]} />}</Card>
    <Modal open={Boolean(selected) && !edit && !confirm} onOpenChange={open => !open && setSelected(null)} title={current?.name || 'Department'} description="Current local demo department details."><p>{current?.code} · {current?.description}</p><p>Routing keywords: {current?.keywords?.join(', ') || 'None'}</p><Badge tone={current?.is_active ? 'success' : 'neutral'}>{current?.is_active ? 'Active' : 'Deactivated'}</Badge><div className="dialog-actions"><Button variant="secondary" onClick={() => { setEdit(current); setSelected(null); }}>Edit department</Button><Button variant={current?.is_active ? 'danger' : 'secondary'} onClick={() => { setConfirm(current); setSelected(null); }}>{current?.is_active ? 'Deactivate department' : 'Reactivate department'}</Button></div></Modal>
    <Modal open={Boolean(edit)} onOpenChange={open => !open && setEdit(null)} title={edit?.id ? 'Edit department' : 'Create department'} description="Changes are saved to local demo records.">{edit && <DepartmentForm key={edit.id || 'new'} initialValues={edit} submitLabel={edit.id ? 'Save department' : 'Create department'} loading={write.busy} error={write.error} onCancel={() => setEdit(null)} onSubmit={async body => { if (await write.run(() => edit.id ? departmentsApi.updateDepartment(edit.id, body) : departmentsApi.createDepartment(body), edit.id ? 'Department updated.' : 'Department created.')) setEdit(null); }} />}</Modal>
    <ConfirmDialog open={Boolean(confirm)} onOpenChange={open => !open && setConfirm(null)} title={`${confirm?.is_active ? 'Deactivate' : 'Reactivate'} department?`} description={`Update ${confirm?.name || ''} after local storage confirms the change.`} confirmLabel={confirm?.is_active ? 'Deactivate department' : 'Reactivate department'} variant={confirm?.is_active ? 'danger' : 'primary'} loading={write.busy} onConfirm={async () => { if (await write.run(() => departmentsApi.updateDepartment(confirm.id, { is_active: !confirm.is_active }), 'Department status updated.')) setConfirm(null); }}>{write.error && <p role="alert">{write.error}</p>}</ConfirmDialog>
  </div>;
}

export function MockPlannedAdminPage({ module }) {
  if (module === 'staff-assignments') return <MockStaffAssignments />;
  if (module === 'audit-logs') return <MockAudit />;
  return <MockRouting />;
}
function MockStaffAssignments() {
  const users = useDemoResource('users', () => usersApi.getUsers());
  const departments = useDemoResource('departments', () => departmentsApi.getDepartments());
  const write = useAdminWrite();
  const [staff, setStaff] = useState(''), [department, setDepartment] = useState('');
  const eligible = (users.data || []).filter(u => [...STAFF_ROLES, 'HOD'].includes(u.role) && u.approval_status === 'APPROVED' && u.is_active);
  const names = Object.fromEntries((departments.data || []).map(d => [d.id, d.name]));
  return <div className="page-stack"><PageHeader title="Staff assignments" description="Assign approved staff to active departments. Exam, Finance and IT staff remain in their matching department." /><Notice write={write} /><Card className="p-5 form-stack"><Field label="Staff member" htmlFor="assignment-member"><select id="assignment-member" className="input" value={staff} onChange={e => { setStaff(e.target.value); setDepartment(''); }}><option value="">Choose approved staff</option>{eligible.map(u => <option key={u.id} value={u.id}>{u.full_name} ({isDepartmentStaff(u.role) ? roleLabels[u.role] : u.role})</option>)}</select></Field><Field label="Department" htmlFor="assignment-department"><select id="assignment-department" className="input" value={department} onChange={e => setDepartment(e.target.value)}><option value="">Choose active department</option>{(departments.data || []).filter(d => d.is_active && (!isDepartmentStaff(eligible.find(u => String(u.id) === staff)?.role) || d.staff_role === eligible.find(u => String(u.id) === staff)?.role)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><Button disabled={!staff || !department || write.busy} onClick={() => write.run(() => usersApi.updateUser(Number(staff), { department_id: Number(department) }), 'Staff assignment saved.')}>Assign staff member</Button></Card><Card className="p-5"><h2 className="font-semibold mb-3">Current directory</h2><ResourceState resource={users} />{users.isSuccess && <DataTable rows={eligible} searchKeys={['full_name', 'role']} columns={[{ key: 'full_name', label: 'Staff' }, { key: 'role', label: 'Role' }, { key: 'department_id', label: 'Department', render: u => names[u.department_id] || 'Unassigned' }]} />}</Card></div>;
}
function MockRouting() {
  const queries = useDemoResource('queries', () => queriesApi.getQueries());
  return <div className="page-stack"><PageHeader title="AI routing" description="Local demo classification and current staff assignment. AI scores are simulated." /><Card className="p-5"><ResourceState resource={queries} />{queries.isSuccess && <DataTable rows={queries.data} searchKeys={['reference', 'subject', 'department']} pageSize={8} columns={[{ key: 'reference', label: 'Query', render: q => <Link to={`/admin/queries/${q.id}`}>{q.reference}</Link> }, { key: 'classification', label: 'Intent', sortable: false, render: q => q.classification?.intent || 'Unclassified' }, { key: 'confidence', label: 'Confidence', sortable: false, render: q => q.classification?.confidence == null ? '—' : `${Math.round(q.classification.confidence * (q.classification.confidence <= 1 ? 100 : 1))}%` }, { key: 'department', label: 'Department' }, { key: 'assigned_instructor', label: 'Staff' }, { key: 'method', label: 'Method', sortable: false, render: q => q.classification?.method === 'Staff override' ? 'Staff override' : 'Simulated AI' }, { key: 'actions', label: 'Intervene', sortable: false, render: q => <Link to={`/admin/queries/${q.id}`}>Open query</Link> }]} />}</Card></div>;
}
function MockAudit() {
  const audit = useDemoResource('audit', () => auditApi.getAuditLogs());
  const rows = [...(audit.data || [])].sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
  return <div className="page-stack"><PageHeader title="Audit logs" description="Recorded local demo actions and simulated delivery events." /><Card className="p-5"><ResourceState resource={audit} />{audit.isSuccess && <DataTable rows={rows} searchKeys={['actor', 'action', 'resource', 'detail', 'details']} pageSize={10} columns={[{ key: 'actor', label: 'Actor' }, { key: 'action', label: 'Action' }, { key: 'resource', label: 'Resource' }, { key: 'created_at', label: 'Timestamp', render: a => formatTime(a.created_at || a.timestamp) }, { key: 'result', label: 'Result' }, { key: 'detail', label: 'Additional details', render: a => a.detail || a.details || '—' }]} />}</Card></div>;
}
function DemoControls() {
  const auth = useAuth();
  const cache = useQueryClient();
  const clock = useDemoResource('demo-time', () => demoApi.getDemoInfo());
  const write = useAdminWrite();
  const [confirm, setConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  async function reset() {
    if (resetting) return;
    setResetting(true); setResetError('');
    try { await demoApi.resetDemo(); cache.clear(); await auth.logout(); }
    catch (failure) { setResetError(getApiErrorMessage(failure)); setResetting(false); }
  }
  return <Card className="p-5"><h2 className="font-semibold">Local demo controls</h2><p className="text-sm text-muted">Current demo time: {clock.data?.now ? formatTime(clock.data.now) : 'Loading'}. Advancing 24 hours can escalate unresolved queries. Reset deletes only local demo accounts and queries; theme and unrelated browser data remain.</p><Notice write={write} /><div className="flex flex-wrap gap-2 mt-3"><Button variant="secondary" disabled={write.busy || resetting} onClick={() => write.run(() => demoApi.advanceClock(24), 'Demo clock advanced 24 hours.')}>Advance 24 hours</Button><Button variant="danger" disabled={write.busy || resetting} onClick={() => setConfirm(true)}>Reset local demo</Button></div><ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Reset local demo?" description="This deletes local demo accounts and queries and signs you out. Theme and unrelated browser data remain." confirmLabel="Reset demo and sign out" variant="danger" loading={resetting} onConfirm={reset}>{resetError && <p role="alert">{resetError}</p>}</ConfirmDialog></Card>;
}
