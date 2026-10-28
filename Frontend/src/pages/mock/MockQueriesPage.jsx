import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '../../components/ui';
import DataTable from '../../components/tables/DataTable';
import QueryStatus, { PriorityBadge } from '../../components/common/QueryStatus';
import queriesApi from '../../api/queriesApi';
import { useAuth } from '../../context/AuthContext';
import { pagePath } from '../../utils/navigation';
import { ResourceState, useDemoResource, queryStatuses, formatTime } from './querySupport';

export default function MockQueriesPage({ escalations = false }) {
  const { user } = useAuth(); const role = user.role;
  const [status, setStatus] = useState('ALL'); const [priority, setPriority] = useState('ALL');
  const resource = useDemoResource('queries', queriesApi.getQueries);
  const rows = (resource.data || []).filter(row => (!escalations || row.status === 'ESCALATED') && (status === 'ALL' || row.status === status) && (priority === 'ALL' || row.priority === priority));
  const detail = row => `${pagePath(role, 'queries')}/${row.id}`;
  const columns = [
    { key: 'reference', label: 'Reference', render: row => <Link className="reference-link" to={detail(row)}>{row.reference}</Link> },
    { key: 'subject', label: 'Subject', render: row => <div className="query-subject"><strong>{row.subject}</strong><small>{row.student}</small></div> },
    { key: 'department', label: 'Department' }, { key: 'assigned_instructor', label: 'Assigned staff' },
    { key: 'priority', label: 'Priority', render: row => <PriorityBadge priority={row.priority} /> },
    { key: 'status', label: 'Status', render: row => <QueryStatus status={row.status} /> },
    { key: 'created_at', label: 'Submitted', render: row => formatTime(row.created_at) },
    { key: 'updated_at', label: 'Last update', render: row => formatTime(row.updated_at) },
    { key: 'actions', label: '', sortable: false, render: row => <Link className="button button-ghost button-icon" aria-label={`View ${row.reference}`} to={detail(row)}><ArrowUpRight size={17} /></Link> },
  ];
  return <><PageHeader eyebrow="COMMUNICATION WORKSPACE" title={escalations ? 'Escalations' : { STUDENT: 'My queries', INSTRUCTOR: 'Assigned queries', HOD: 'Department queries', ADMIN: 'All queries', EXAM_STAFF: 'Department queries', FINANCE_STAFF: 'Department queries', IT_STAFF: 'Department queries' }[role]} description="Your account's conversations, stored in this browser. Local updates refresh every 10 seconds." actions={role === 'STUDENT' ? <Link className="button button-primary" to={pagePath(role, 'submit')}><Plus size={16} />Submit a query</Link> : ['HOD', 'ADMIN'].includes(role) && <Link className="button button-secondary" to={pagePath(role, 'reports')}>Open reports</Link>} /><Card><div className="card-heading"><div><h2>Query directory <Badge tone="blue">Local demo</Badge></h2><p>Simulated routing and delivery. Access follows your signed-in account.</p></div></div><div className="filter-row"><label>Status<select aria-label="Status" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{queryStatuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label><label>Priority<select aria-label="Priority" value={priority} onChange={event => setPriority(event.target.value)}><option value="ALL">All priorities</option>{['High', 'Medium', 'Low'].map(value => <option key={value}>{value}</option>)}</select></label><span>{rows.length} queries</span><Button variant="ghost" size="sm" onClick={() => { setStatus('ALL'); setPriority('ALL'); }}>Clear filters</Button></div><ResourceState resource={resource} />{resource.data && !resource.isError && <DataTable rows={rows} columns={columns} searchKeys={['reference', 'subject', 'student', 'department', 'assigned_instructor']} searchPlaceholder="Search by reference, subject or student..." emptyTitle="No queries found" />}</Card></>;
}
