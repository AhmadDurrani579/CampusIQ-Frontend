import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Clock3, ShieldCheck, X } from 'lucide-react';
import adminApi from '../../api/adminApi.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Field, PageHeader, Skeleton } from '../../components/ui/index.jsx';
import DataTable from '../../components/tables/DataTable.jsx';
import { isMockMode } from '../../api/mode';
import { isDepartmentStaff, roleLabels } from '../../utils/roles';

const roleName = value => isDepartmentStaff(value) ? roleLabels[value] : value ? String(value).replaceAll('_', ' ') : 'Not supplied';
const userName = (user) => user.full_name || user.email || `User ${user.id ?? ''}`;
const requestedOn = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const pending = useQuery({ queryKey: ['pending-users'], queryFn: () => adminApi.getPendingUsers(), retry: false });
  const [roleFilter, setRoleFilter] = useState('all');
  const [action, setAction] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);
  const mutation = useMutation({ mutationFn: ({ type, user }) => type === 'approve' ? adminApi.approveUser(user.id) : adminApi.rejectUser(user.id) });
  const users = pending.data || [];
  const roles = [...new Set(['STUDENT', 'INSTRUCTOR', 'HOD', ...users.map((user) => user.requested_role).filter(Boolean)])].sort();
  const rows = roleFilter === 'all' ? users : users.filter((user) => user.requested_role === roleFilter);

  function askForConfirmation(type, user) {
    if (submitting.current || mutation.isPending || user.id == null) return;
    setNotice('');
    setError('');
    setAction({ type, user });
  }

  async function confirmAction() {
    if (!action || submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      await mutation.mutateAsync(action);
      // Cache removal follows the confirmed server response, never the click.
      queryClient.setQueryData(['pending-users'], (current) => current?.filter((user) => user.id !== action.user.id));
      await queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      if (isMockMode) await Promise.all(['users', 'analytics', 'audit', 'notifications'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      setNotice(action.type === 'approve' ? 'User approved.' : 'User rejected.');
      toast.success(action.type === 'approve' ? 'User approved.' : 'User rejected.');
      setAction(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      submitting.current = false;
    }
  }

  const columns = [
    { key: 'id', label: 'User ID' },
    { key: 'full_name', label: 'Applicant', render: (user) => <div className="min-w-0"><p className="font-semibold">{userName(user)}</p><p className="text-sm text-muted break-all">{user.email || 'Email not supplied'}</p></div> },
    { key: 'requested_role', label: 'Requested role', render: (user) => <Badge tone="blue">{roleName(user.requested_role)}</Badge> },
    { key: 'created_at', label: 'Requested on', render: (user) => requestedOn(user.created_at) },
    { key: 'approval_status', label: 'Status', render: (user) => <Badge tone="warning">{roleName(user.approval_status)}</Badge> },
    { key: 'actions', label: 'Review', sortable: false, render: (user) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={mutation.isPending || user.id == null} aria-label={`Approve ${userName(user)}`} onClick={() => askForConfirmation('approve', user)}><Check size={15} />Approve</Button><Button size="sm" variant="ghost" disabled={mutation.isPending || user.id == null} aria-label={`Reject ${userName(user)}`} onClick={() => askForConfirmation('reject', user)}><X size={15} />Reject</Button>{user.id == null && <span className="text-xs text-muted">A server user ID is required.</span>}</div> },
  ];

  return <div className="page-stack">
    <PageHeader eyebrow="Access management" title="User approvals" description="Review registration requests and confirm who can join your university workspace." actions={<Badge tone="warning"><Clock3 size={14} />{pending.isSuccess ? users.length : '—'} pending</Badge>} />
    <Card className="p-5 flex items-start gap-3"><ShieldCheck className="shrink-0 text-blue-500" size={22} /><div><h2 className="font-semibold">Every account starts with a review</h2><p className="text-sm text-muted mt-1">Approvals and rejections take effect after the university confirms your decision. Account permissions follow the university’s access rules.</p></div></Card>
    {notice && <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 p-4 text-sm" role="status">{notice}</div>}
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5"><div><h2 className="font-semibold text-lg">Pending registrations</h2><p className="text-sm text-muted mt-1">Search applicants, sort columns, or filter by requested role.</p></div><Field label="Requested role" htmlFor="approval-role"><select id="approval-role" className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option>{roles.map((role) => <option key={role} value={role}>{roleName(role)}</option>)}</select></Field></div>
      {pending.isPending ? <Skeleton rows={5} /> : pending.isError ? <ErrorState error={getApiErrorMessage(pending.error)} onRetry={() => pending.refetch()} /> : <div aria-busy={mutation.isPending}><DataTable columns={columns} rows={rows} searchKeys={['full_name', 'email', 'requested_role']} pageSize={8} emptyTitle={users.length ? 'No requests match this role' : 'All registration requests are reviewed'} /></div>}
    </Card>
    <ConfirmDialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !submitting.current) { setAction(null); setError(''); } }} title={action?.type === 'reject' ? 'Reject registration request?' : 'Approve registration request?'} description={action ? `${action.type === 'approve' ? 'Approve' : 'Reject'} ${userName(action.user)} (${roleName(action.user.requested_role)})? Your decision will update this registration request.` : ''} confirmLabel={action?.type === 'reject' ? 'Reject user' : 'Approve user'} variant={action?.type === 'reject' ? 'danger' : 'primary'} loading={mutation.isPending || submitting.current} onConfirm={confirmAction}>
      {error && <div role="alert" className="error-state">{error}</div>}
    </ConfirmDialog>
  </div>;
}
