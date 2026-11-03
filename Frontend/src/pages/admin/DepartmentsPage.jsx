import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Eye, Info, Plus } from 'lucide-react';
import departmentsApi from '../../api/departmentsApi.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { Badge, Button, Card, ErrorState, Field, Modal, PageHeader, Skeleton } from '../../components/ui/index.jsx';
import DataTable from '../../components/tables/DataTable.jsx';
import DepartmentForm from '../../components/forms/DepartmentForm.jsx';
import { isMockMode } from '../../api/mode';
import { MockDepartmentsPage } from '../mock/MockAdminPages';

function DepartmentStatus({ active }) {
  return <Badge tone={active === true ? 'success' : active === false ? 'neutral' : 'warning'}>{active === true ? 'Active' : active === false ? 'Deactivated' : 'Not supplied'}</Badge>;
}

export default function DepartmentsPage() {
  if (isMockMode) return <MockDepartmentsPage />;
  const queryClient = useQueryClient();
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getDepartments(), retry: false });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);
  const detail = useQuery({ queryKey: ['departments', selected?.id], queryFn: () => departmentsApi.getDepartment(selected.id), enabled: selected?.id != null, retry: false });
  const creation = useMutation({ mutationFn: (body) => departmentsApi.createDepartment(body) });
  const canCreate = departmentsApi.canCreate === true;
  const rows = (departments.data || []).filter((department) => statusFilter === 'all' || (statusFilter === 'active' ? department.is_active === true : department.is_active === false));

  async function createDepartment(body) {
    if (!canCreate || submitting.current) return;
    submitting.current = true;
    setCreateError('');
    try {
      await creation.mutateAsync(body);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      setCreateOpen(false);
      setNotice('Department created.');
    } catch (error) {
      setCreateError(getApiErrorMessage(error));
    } finally {
      submitting.current = false;
    }
  }

  const columns = [
    { key: 'name', label: 'Department', render: (department) => <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/10 p-2 text-blue-500 shrink-0"><Building2 size={18} /></span><span className="font-semibold">{department.name || 'Name not supplied'}</span></div> },
    { key: 'code', label: 'Code', render: (department) => <span className="font-mono text-sm">{department.code || '—'}</span> },
    { key: 'description', label: 'Description', render: (department) => <p className="max-w-xs text-sm text-muted truncate" title={department.description || undefined}>{department.description || '—'}</p> },
    { key: 'is_active', label: 'Status', render: (department) => <DepartmentStatus active={department.is_active} /> },
    { key: 'actions', label: 'Details', sortable: false, render: (department) => <Button variant="ghost" size="sm" disabled={department.id == null} aria-label={`View ${department.name || department.code || 'department'}`} onClick={() => setSelected(department)}><Eye size={16} />View</Button> },
  ];

  return <div className="page-stack">
    <PageHeader eyebrow="University structure" title="Departments" description="Explore the departments that organize your university’s communication." actions={<Button disabled={!canCreate} title={!canCreate ? 'Department creation is awaiting backend availability.' : undefined} onClick={() => { setCreateError(''); setNotice(''); setCreateOpen(true); }}><Plus size={17} />Create department</Button>} />
    {!canCreate && <Card className="p-4 flex gap-3 items-start"><Info size={20} className="shrink-0 text-blue-500" /><p className="text-sm text-muted">Department creation is unavailable while its backend integration is being confirmed. You can view existing departments.</p></Card>}
    {notice && <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 p-4 text-sm" role="status">{notice}</div>}
    <Card className="p-5"><div className="flex flex-wrap items-end justify-between gap-4 mb-5"><div><h2 className="font-semibold text-lg">Department directory</h2><p className="text-sm text-muted mt-1">{departments.isSuccess ? `${departments.data.length} departments returned by the university server.` : 'Department information from the university server.'}</p></div><Field label="Department status" htmlFor="department-status"><select id="department-status" className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All departments</option><option value="active">Active</option><option value="deactivated">Deactivated</option></select></Field></div>
      {departments.isPending ? <Skeleton rows={5} /> : departments.isError ? <ErrorState error={getApiErrorMessage(departments.error)} onRetry={() => departments.refetch()} /> : <DataTable columns={columns} rows={rows} searchKeys={['name', 'code', 'description']} pageSize={8} emptyTitle="No departments match this view" />}
    </Card>
    <Modal open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} title={selected?.name || 'Department details'} description="Current department information from the university server.">
      {detail.isPending ? <Skeleton rows={4} /> : detail.isError ? <ErrorState error={getApiErrorMessage(detail.error)} onRetry={() => detail.refetch()} /> : detail.data && <div className="page-stack"><div className="flex items-center justify-between gap-3"><span className="font-mono text-sm min-w-0 break-all">{detail.data.code || '—'}</span><DepartmentStatus active={detail.data.is_active} /></div><div><h3 className="font-semibold mb-2">Description</h3><p className="text-sm text-muted whitespace-pre-wrap break-words">{detail.data.description || 'No description supplied.'}</p></div><div><h3 className="font-semibold mb-2">Routing keywords</h3><div className="flex flex-wrap gap-2">{detail.data.keywords?.length ? detail.data.keywords.map((keyword, index) => <Badge key={`${keyword}-${index}`} tone="blue" className="max-w-full break-all">{keyword}</Badge>) : <p className="text-sm text-muted">No keywords supplied.</p>}</div></div></div>}
      <div className="mt-6 border-t border-current/10 pt-4"><p className="text-sm text-muted mb-3">Editing and deactivation are unavailable while these features are being connected.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled>Edit department</Button><Button variant="danger" disabled>Deactivate department</Button></div></div>
    </Modal>
    <Modal open={createOpen && canCreate} onOpenChange={(open) => { if (!submitting.current) setCreateOpen(open); }} title="Create department" description="Add a new department to the university directory.">
      <DepartmentForm onSubmit={createDepartment} onCancel={() => { if (!submitting.current) setCreateOpen(false); }} loading={creation.isPending || submitting.current} error={createError} />
    </Modal>
  </div>;
}
