import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Inbox, CheckCircle2, Clock3, Timer, ArrowUpRight, ArrowRight,
  Plus, Download, CalendarDays, Sparkles, Users, Building2,
  UserCheck, AlertTriangle, Globe, Activity,
} from 'lucide-react';
import { Card, Button, Badge, PageHeader, EmptyState, Skeleton } from '../../components/ui';
import DataTable from '../../components/tables/DataTable';
import QueryStatus, { PriorityBadge } from '../../components/common/QueryStatus';
import FeatureNotice from '../../components/common/FeatureNotice';
import { VolumeChart, StatusChart, DepartmentChart } from '../../components/charts/AnalyticsCharts';
import adminApi from '../../api/adminApi';
import axiosClient from '../../api/axiosClient';
import { pagePath } from '../../utils/navigation';
import { isMockMode } from '../../api/mode';
import MockDashboardPage from '../mock/MockDashboardPage';

const definitions = {
  ADMIN: {
    title: 'Overview', description: 'Your campus communication, at a glance.',
    values: ['1,248', '148', '1,067', '2.4 hrs'],
    labels: ['Total queries', 'Open queries', 'Resolved queries', 'Avg. resolution time'],
  },
  STUDENT: {
    title: 'Student Dashboard', description: 'Track your questions and responses.',
    values: ['12', '3', '2', '7'],
    labels: ['Submitted queries', 'Open queries', 'In progress', 'Resolved queries'],
  },
  HOD: {
    title: 'Department overview', description: 'Keep your department connected, responsive, and on track.',
    values: ['168', '22', '131', '6'],
    labels: ['Department queries', 'Pending queries', 'Resolved queries', 'Escalated queries'],
  },
  EXAM_STAFF: {
    title: 'Examination Staff Dashboard', description: 'Manage examination-related student queries.',
    values: ['0', '0', '0', '0'],
    labels: ['Assigned queries', 'Pending queries', 'Resolved queries', 'Escalated queries'],
  },
  FINANCE_STAFF: {
    title: 'Finance Staff Dashboard', description: 'Manage finance-related student queries.',
    values: ['0', '0', '0', '0'],
    labels: ['Assigned queries', 'Pending queries', 'Resolved queries', 'Escalated queries'],
  },
  IT_STAFF: {
    title: 'IT Staff Dashboard', description: 'Manage IT support queries.',
    values: ['0', '0', '0', '0'],
    labels: ['Assigned queries', 'Pending queries', 'Resolved queries', 'Escalated queries'],
  },
};

const metricIcons = [Inbox, Clock3, CheckCircle2, Timer];
const statusColors = {
  PENDING_CLASSIFICATION: '#a3b4d8', OPEN: '#4a70ed',
  IN_PROGRESS: '#f59e0b', ESCALATED: '#ef4444',
  RESOLVED: '#0fb68a', CLOSED: '#94a3b8',
};

function getErrorMessage(error) {
  return error?.response?.data?.detail || error?.message || 'Please check the backend connection.';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB');
}

export default function DashboardPage(props) {
  return isMockMode && !props.preview
    ? <MockDashboardPage />
    : <OriginalDashboardPage {...props} />;
}

function OriginalDashboardPage({ role, user, preview = false, demoData }) {
  const [chartView, setChartView] = useState('volume');
  const config = definitions[role];

  const isLiveAdmin = role === 'ADMIN' && !preview;
  const isLiveStudent = role === 'STUDENT' && !preview;

  const isLiveStaff =
    !preview &&
    ['FINANCE_STAFF', 'EXAM_STAFF', 'IT_STAFF'].includes(role);

  const isLiveDashboard =
    isLiveAdmin || isLiveStudent || isLiveStaff;
    const href = (key) => preview ? `/preview?role=${role}&page=${key}` : pagePath(role, key);

  // Keep hooks unconditional. Non-Admin dashboards do not request Admin APIs.
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-summary', 30],
    queryFn: () => adminApi.getDashboardSummary(30),
    enabled: isLiveAdmin,
    retry: false,
  });
  const studentDashboardQuery = useQuery({
    queryKey: ['student-dashboard-summary', user?.id, 30],
    queryFn: async () => {
      const { data } = await axiosClient.get('/student/dashboard/summary', {
        params: { days: 30 },
      });
      return data;
    },
    enabled: isLiveStudent,
    retry: false,
  });

  const staffDashboardQuery = useQuery({
    queryKey: ['staff-dashboard-summary', user?.id, role, 30],
    queryFn: async () => {
      const { data } = await axiosClient.get(
        '/staff/dashboard/summary',
        {
          params: { days: 30 },
        }
      );

      return data;
    },
    enabled: isLiveStaff,
    retry: false,
  });

  const pendingQuery = useQuery({
    queryKey: ['pending-users'],
    queryFn: adminApi.getPendingUsers,
    enabled: isLiveAdmin,
    retry: false,
  });
  const recentQueriesQuery = useQuery({
    queryKey: ['admin-recent-queries', 4],
    queryFn: async () => {
      const { data } = await axiosClient.get('/admin/queries', {
        params: { page: 1, page_size: 4 },
      });
      return data.queries ?? [];
    },
    enabled: isLiveAdmin,
    retry: false,
  });

  if (!config) {
    return <EmptyState title="Dashboard unavailable" description="No dashboard configuration is available for this account role." />;
  }


  const activeDashboardQuery = isLiveStudent
  ? studentDashboardQuery
  : isLiveStaff
    ? staffDashboardQuery
    : dashboardQuery;

  const dashboard = activeDashboardQuery.data;
  const title = role === 'STUDENT' && !preview
    ? `Welcome, ${user?.full_name?.split(' ')[0] || 'student'}`
    : config.title;

const mainValues = preview
  ? config.values
  : isLiveAdmin && dashboard
    ? [
        dashboard.total_queries,
        dashboard.open_queries,
        dashboard.resolved_queries,
        `${dashboard.avg_resolution_hours} hrs`,
      ]
    : isLiveStudent && dashboard
      ? [
          dashboard.submitted_queries,
          dashboard.open_queries,
          dashboard.in_progress_queries,
          dashboard.resolved_queries,
        ]
      : isLiveStaff && dashboard
        ? [
            dashboard.total_queries,
            dashboard.pending_queries,
            dashboard.resolved_queries,
            dashboard.escalated_queries,
          ]
        : ['—', '—', '—', '—'];

  const extraMetrics = role === 'ADMIN' ? [
    { label: 'Registered users', value: preview ? '8,424' : dashboard?.registered_users ?? '—', icon: Users },
    { label: 'Active departments', value: preview ? '12' : dashboard?.active_departments ?? '—', icon: Building2 },
    { label: 'Pending approvals', value: preview ? '8' : dashboard?.pending_approvals ?? '—', icon: UserCheck, link: href('approvals') },
    { label: 'Escalated queries', value: preview ? '33' : dashboard?.escalated_queries ?? '—', icon: AlertTriangle, link: href('queries') },
  ] : [];

  const activityChartData = (dashboard?.query_activity ?? []).map(item => ({
    day: new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', timeZone: 'UTC',
    }),
    queries: Number(item.volume ?? 0),
    resolved: Number(item.resolved ?? 0),
  }));

  const statusChartData = (dashboard?.query_status ?? []).map(item => ({
    name: String(item.status).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: Number(item.count ?? 0),
    color: statusColors[item.status] ?? '#64748b',
  }));
  const allQueriesCount = isLiveStudent
  ? dashboard?.submitted_queries
  : dashboard?.total_queries;

  const resolutionRate = allQueriesCount
    ? 100 * Number(dashboard.resolved_queries || 0) / Number(allQueriesCount)
    : 0;

  const studentRecentQueries = isLiveStudent ? (dashboard?.recent_queries ?? []) : [];

  const displayedRecentQueries = isLiveStudent
  ? studentRecentQueries
  : isLiveStaff
    ? (dashboard?.recent_queries ?? [])
    : (recentQueriesQuery.data ?? []);

  const recentQueryRows = displayedRecentQueries.map(q => ({
    id: q.id,
    reference: `Q-${q.id}`,
    subject: q.subject || `Query #${q.id}`,
    student: isLiveStudent
      ? 'You'
      : q.student_name || `Student #${q.student_id}`,

    initials: 'ST',
    color: 'blue',
    
    department:
    q.department_name ||
    (q.department_id == null
      ? 'Unassigned'
      : `Department #${q.department_id}`),

    status: q.status,
    priority: q.priority ?? '—',
    created_at: q.created_at,
  }));

  const recentColumns = [
    { key: 'reference', label: 'Query', render: row => <div className="query-subject"><Link to={`${href('queries')}/${row.id}`}>{row.subject}</Link><small>{row.reference}</small></div> },
    { key: 'student', label: 'Student', render: row => <div className="table-person"><span className="avatar avatar-blue avatar-sm">{row.initials}</span><span>{row.student}</span></div> },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status', render: row => <QueryStatus status={row.status} /> },
    { key: 'priority', label: 'Priority', render: row => row.priority === '—' ? '—' : <PriorityBadge priority={row.priority} /> },
  ];

  // This is a truthful feed of recently SUBMITTED queries, not a complete audit log.
  const recentSubmissions = displayedRecentQueries;
  const workload = dashboard?.department_workload;

  return <>
    <PageHeader
      title={title}
      description={config.description}
      actions={<>
        <span className="date-display"><CalendarDays size={15} />{preview ? '12 October 2026' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
        {role === 'STUDENT'
          ? <Link className="button button-primary" to={href('submit')}><Plus size={17} />Submit a query</Link>
          : <Button variant="secondary" disabled title="Report export API is not yet available"><Download size={15} />Export report</Button>}
      </>}
    />

    <div className="dashboard-greeting">
      <span className="greeting-icon"><Sparkles size={18} /></span>
      <p><strong>{preview ? 'A more connected campus starts here.' : 'Your workspace is ready.'}</strong> {preview ? 'Preview of campus communication.' : 'Your account is connected to backend services.'}</p>
      <Badge tone={preview ? 'blue' : 'green'}>{preview ? 'Demo data' : 'Live API mode'}</Badge>
    </div>

    {isLiveDashboard && activeDashboardQuery.isError && <Card className="padded-card"><strong>Dashboard statistics could not be loaded.</strong><p>{getErrorMessage(activeDashboardQuery.error)}</p></Card>}

    <div className="metrics-grid">
      {config.labels.map((label, index) => {
        const Icon = metricIcons[index];
        return <motion.section key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }} className="card metric-card">
          <div className="metric-top"><span>{label}</span><span className={`metric-icon metric-icon-${['blue', 'amber', 'green', 'purple'][index]}`}><Icon size={18} /></span></div>
          <strong className="metric-value">{mainValues[index]}<span className="mini-sparkline" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ height: `${7 + ((i * 7 + index * 3) % 22)}px` }} />)}</span></strong>
          <div className="metric-bottom"><span>{preview ? 'Demo data' : isLiveDashboard ? (dashboard ? 'Live data from CampusIQ' : activeDashboardQuery.isLoading ? 'Loading analytics...' : 'Analytics unavailable') : 'Analytics API not connected'}</span></div>
        </motion.section>;
      })}
    </div>

    {extraMetrics.length > 0 && <Card className="secondary-metrics">
      {extraMetrics.map(({ label, value, icon: Icon, link }) => <div key={label}>
        <span className="secondary-metric-icon"><Icon size={17} /></span>
        <span><small>{label}</small><strong>{value}</strong></span>
        {link && <Link to={link} aria-label={`View ${label.toLowerCase()}`}><ArrowUpRight size={15} /></Link>}
      </div>)}
    </Card>}

    <div className="dashboard-chart-grid">
      <Card className="volume-card">
        <div className="card-heading"><div><h2>Query activity {preview && <Badge tone="neutral">Demo data</Badge>}</h2><p>A little clarity on the conversations across your campus.</p></div>
          <div className="segmented-control"><button className={chartView === 'volume' ? 'selected' : ''} onClick={() => setChartView('volume')}>Volume</button><button className={chartView === 'resolution' ? 'selected' : ''} onClick={() => setChartView('resolution')}>Resolved</button></div>
        </div>
        {preview && demoData?.volume ? <VolumeChart data={demoData.volume} resolutionOnly={chartView === 'resolution'} />
          : isLiveDashboard && dashboard && activityChartData.length ? <>
            <div className="chart-summary"><strong>{activityChartData.reduce((sum, item) => sum + (chartView === 'volume' ? item.queries : item.resolved), 0)}</strong><span>{chartView === 'volume' ? 'Queries submitted in the last 30 days' : 'Queries resolved in the last 30 days'}</span></div>
            <VolumeChart data={activityChartData} resolutionOnly={chartView === 'resolution'} local />
          </>
          : <EmptyState title={activeDashboardQuery.isLoading && isLiveDashboard ? 'Loading query activity' : 'Activity will appear here'} description="Query activity requires the backend dashboard summary data." icon={Activity} />}
      </Card>

      <Card>
        <div className="card-heading"><div><h2>Query status {preview && <Badge tone="neutral">Demo data</Badge>}</h2><p>Every conversation, accounted for.</p></div></div>
        {preview && demoData?.statuses ? <StatusChart data={demoData.statuses} />
          : isLiveDashboard && dashboard && statusChartData.length ? <StatusChart data={statusChartData} local resolutionRate={resolutionRate} />
          : <EmptyState title="No status data yet" description="Status distribution will appear when data is available." icon={CheckCircle2} />}
      </Card>
    </div>

    <div className="dashboard-bottom-grid">
      <Card className="recent-queries-card">
        <div className="card-heading"><div><h2>Recent queries {preview && <Badge tone="neutral">Demo data</Badge>}</h2><p>Stay on top of the latest campus conversations.</p></div><Link className="text-link" to={href('queries')}>View all <ArrowRight size={14} /></Link></div>
      
          {(
            (isLiveAdmin && recentQueriesQuery.isLoading) ||
            ((isLiveStudent || isLiveStaff) && activeDashboardQuery.isLoading)
          ) ? (
            <Skeleton rows={4} />
          ) : (
            (isLiveAdmin && recentQueriesQuery.isError) ||
            ((isLiveStudent || isLiveStaff) && activeDashboardQuery.isError)
          ) ? (
            <EmptyState
              title="Could not load recent queries"
              description={getErrorMessage(
                isLiveAdmin
                  ? recentQueriesQuery.error
                  : activeDashboardQuery.error
              )}
            />
          ) : isLiveDashboard && recentQueryRows.length > 0 ? (
            <DataTable
              columns={recentColumns}
              rows={recentQueryRows}
              searchable={false}
              pageSize={5}
            />
          ) : preview && demoData?.queries ? (
            <DataTable
              columns={recentColumns}
              rows={demoData.queries}
              searchable={false}
              pageSize={4}
            />
          ) : (
            <EmptyState
              title="No recent queries"
              description="Department queries will appear here."
            />
          )}

      </Card>
      <Card className="activity-card">
        <div className="card-heading"><div><h2>Recent activity</h2><p>Recent query submissions, based on existing records.</p></div><span className="live-indicator">{isLiveDashboard ? 'Recent submissions' : 'Pending API'}</span></div>
        {(isLiveAdmin && recentQueriesQuery.isLoading) || (isLiveStudent && studentDashboardQuery.isLoading) ? <Skeleton rows={3} />
          : isLiveDashboard && recentSubmissions.length ? <div className="activity-feed">
            {recentSubmissions.map(q => <div key={q.id}><span className="avatar avatar-blue avatar-sm"><Inbox size={16} /></span><div><strong>Query #{q.id} submitted</strong><p>{q.subject || 'Student query'} · {isLiveStudent ? 'Your query' : q.student_name || `Student #${q.student_id}`}</p><small>{formatDate(q.created_at)}</small></div></div>)}
          </div>
          : preview && demoData?.activities?.length ? <div className="activity-feed">{demoData.activities.map((item, index) => <div key={index}><span className="avatar avatar-blue avatar-sm">{item.initials}</span><div><strong>{item.text}</strong><p>{item.detail}</p><small>{item.time}</small></div></div>)}</div>
          : <EmptyState title="No recent submissions" description="A full reply, escalation and approval audit feed will require a dedicated backend API." icon={Activity} />}
        <div className="activity-card-footer"><Link className="text-link" to={href(role === 'ADMIN' ? 'audit-logs' : 'notifications')}>Open {role === 'ADMIN' ? 'audit log' : 'notifications'} <ArrowRight size={14} /></Link></div>
      </Card>
    </div>
    

{role === 'ADMIN' && (
  <div className="dashboard-chart-grid dashboard-lower-grid">

    {/* Department Workload */}
    <Card>
      <div className="card-heading">
        <div>
          <h2>
            Department workload
            {preview && <Badge tone="neutral">Demo data</Badge>}
          </h2>
          <p>Query counts by department.</p>
        </div>
      </div>

      {preview && demoData?.departmentsChart ? (
        <DepartmentChart data={demoData.departmentsChart} />

      ) : isLiveAdmin && dashboardQuery.isLoading ? (
        <Skeleton rows={4} />

      ) : isLiveAdmin && dashboardQuery.isError ? (
        <EmptyState
          title="Department workload could not be loaded"
          description={getErrorMessage(dashboardQuery.error)}
        />

      ) : isLiveAdmin &&
        Array.isArray(dashboard?.department_workload) &&
        dashboard.department_workload.length > 0 ? (
        <DepartmentChart
          data={dashboard.department_workload}
          local
        />

      ) : (
        <EmptyState
          title="No department workload available"
          description="No department statistics are available yet."
        />
      )}
    </Card>

    {/* Pending Registrations */}
    <Card>
      <div className="card-heading">
        <div>
          <h2>
            Pending registrations
            {preview && <Badge tone="neutral">Demo data</Badge>}
          </h2>
          <p>New accounts awaiting admin approval.</p>
        </div>

        <Link
          className="text-link"
          to={href('approvals')}
        >
          Review <ArrowRight size={14} />
        </Link>
      </div>

      {isLiveAdmin && pendingQuery.isLoading ? (
        <Skeleton rows={2} />

      ) : isLiveAdmin && pendingQuery.isError ? (
        <EmptyState
          title="Approvals could not be loaded"
          description={getErrorMessage(pendingQuery.error)}
        />

      ) : (preview
          ? demoData?.approvals
          : pendingQuery.data
        )?.length > 0 ? (

        <div className="pending-mini-list">
          {(preview
            ? demoData.approvals
            : pendingQuery.data
          )
            .slice(0, 2)
            .map(account => (
              <div key={account.id}>
                <span className="avatar avatar-blue">
                  {(account.full_name || '?')
                    .split(' ')
                    .map(name => name[0])
                    .slice(0, 2)
                    .join('')}
                </span>

                <span>
                  <strong>{account.full_name}</strong>
                  <small>{account.email}</small>
                </span>

                <Badge tone="blue">
                  {account.requested_role}
                </Badge>
              </div>
            ))}
        </div>

      ) : (
        <EmptyState
          title="You're all caught up"
          description="There are no pending registrations."
        />
      )}
    </Card>

  </div>
)}


    {role === 'HOD' && <div className="dashboard-chart-grid">
      <Card><div className="card-heading"><div><h2>Staff workload</h2><p>Your department's workload.</p></div></div><EmptyState title="Staff workload API pending" /></Card>
      <Card className="padded-card"><h2>Department performance</h2><EmptyState title="Department analytics pending" /><Link className="text-link" to={href('reports')}>Open department reports <ArrowRight size={14} /></Link></Card>
    </div>}
      {!preview && role === 'HOD' && (
          <FeatureNotice compact>
            HOD-specific dashboard analytics are not connected yet.
          </FeatureNotice>
        )}
  </>;
}
