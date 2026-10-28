import { Link } from 'react-router-dom';
import { Inbox, Clock3, Timer, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pagePath } from '../../utils/navigation';
import { Card, PageHeader, Badge, EmptyState } from '../../components/ui';
import { VolumeChart, StatusChart, DepartmentChart } from '../../components/charts/AnalyticsCharts';
import DataTable from '../../components/tables/DataTable';
import QueryStatus, { PriorityBadge } from '../../components/common/QueryStatus';
import analyticsApi from '../../api/analyticsApi';
import departmentsApi from '../../api/departmentsApi';
import notificationsApi from '../../api/notificationsApi';
import { ResourceState, useDemoResource, formatTime } from './querySupport';
const titles = { EXAM_STAFF: 'Examinations workspace', FINANCE_STAFF: 'Finance workspace', IT_STAFF: 'IT Support workspace' };
export default function MockDepartmentDashboard() {
  const { user } = useAuth();
  const overview = useDemoResource('analytics', analyticsApi.getOverview);
  const departments = useDemoResource('departments', departmentsApi.getDepartments);
  const notifications = useDemoResource('notifications', notificationsApi.getNotifications);
  const data = overview.data, department = departments.data?.find(d => d.id === user.department_id);
  const href = key => pagePath(user.role, key);
  const metrics = data ? [
    ['Department queries', data.total, Inbox, 'blue'], ['Open queries', data.open, Clock3, 'amber'],
    ['In progress', data.in_progress, Timer, 'purple'], ['Resolved queries', data.resolved, CheckCircle2, 'green'],
  ] : [];
  return <div className="page-stack">
    <PageHeader title={titles[user.role]} description={`Welcome, ${user.full_name}. Handle queries for ${department?.name || 'your department'}.`} actions={<Link className="button button-secondary" to={href('queries')}>Open department queries <ArrowRight size={15} /></Link>} />
    <div className="dashboard-greeting"><p><strong>Your department workspace.</strong> Local records refresh every 10 seconds. AI and external delivery are simulated.</p><Badge tone="blue">Local demo</Badge></div>
    <ResourceState resource={overview} /><ResourceState resource={departments} />
    {data && !overview.isError && <>
      <div className="metrics-grid">{metrics.map(([label, value, Icon, tone]) => <Card className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-icon-${tone}`}><Icon size={18} /></span></div><strong className="metric-value">{value}</strong><div className="metric-bottom">Current department records</div></Card>)}</div>
      <Card className="secondary-metrics"><div><span className="secondary-metric-icon"><AlertTriangle size={17} /></span><span><small>Escalated queries</small><strong>{data.escalated}</strong></span></div><div><span className="secondary-metric-icon"><Timer size={17} /></span><span><small>Average resolution</small><strong>{data.avg_resolution_hours.toFixed(1)} hrs</strong></span></div></Card>
      <div className="dashboard-chart-grid"><Card><div className="card-heading"><div><h2>Department activity</h2><p>Actual local submissions and resolutions.</p></div></div><VolumeChart data={data.volume} local /></Card><Card><div className="card-heading"><div><h2>Query status</h2><p>Your department conversations.</p></div></div><StatusChart data={data.statuses} local resolutionRate={data.resolution_rate} /></Card></div>
      <Card><div className="card-heading"><div><h2>Recent department queries</h2><p>Review the conversation and approve each reply before sending.</p></div><Link className="text-link" to={href('queries')}>View all <ArrowRight size={14} /></Link></div><DataTable rows={[...data.queries].sort((a,b) => b.created_at.localeCompare(a.created_at))} pageSize={5} columns={[
        { key: 'subject', label: 'Query', render: q => <div className="query-subject"><Link to={`${href('queries')}/${q.id}`}>{q.subject}</Link><small>{q.reference}</small></div> },
        { key: 'student', label: 'Student' }, { key: 'assigned_instructor', label: 'Assigned staff' },
        { key: 'status', label: 'Status', render: q => <QueryStatus status={q.status} /> }, { key: 'priority', label: 'Priority', render: q => <PriorityBadge priority={q.priority} /> },
      ]} emptyTitle="No department queries yet" emptyDescription="New student queries routed to your department will appear here." /></Card>
      <div className="dashboard-chart-grid"><Card><div className="card-heading"><div><h2>Department staff workload</h2><p>Unresolved current assignments.</p></div></div><DepartmentChart data={data.staffWorkload} local staff /></Card><Card className="padded-card"><h2>Department performance</h2><div className="report-highlights"><div><small>Resolution rate</small><strong>{data.resolution_rate.toFixed(1)}%</strong></div><div><small>Average first response</small><strong>{data.avg_response_minutes.toFixed(1)} min</strong></div><div><small>Escalated</small><strong>{data.escalated}</strong></div><div><small>Closed</small><strong>{data.closed}</strong></div></div><Link className="text-link" to={href('reports')}>Open department reports <ArrowRight size={14} /></Link></Card></div>
    </>}
    <Card className="padded-card"><h2>Recent notifications</h2><ResourceState resource={notifications} />{notifications.isSuccess && !notifications.data.length && <EmptyState title="No notifications yet" description="Department updates and reviewed drafts will appear here." />}<div className="activity-feed">{notifications.data?.slice(0,3).map(n => <div key={n.id}><span className="avatar avatar-blue avatar-sm"><Inbox size={16} /></span><div><strong>{n.title}</strong><p>{n.message}</p><small>{formatTime(n.created_at)}</small></div></div>)}</div><Link className="text-link" to={href('notifications')}>Open notification center <ArrowRight size={14} /></Link></Card>
  </div>;
}
